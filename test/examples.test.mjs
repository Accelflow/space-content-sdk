import {test} from 'node:test';
import assert from 'node:assert/strict';
import {segments,articlePath,escapeHtml} from '../examples/shared/content.mjs';
test('sample routes reject traversal and query injection and encode Unicode segments',()=>{
 for(const slug of ['../private','a/../b','a//b','/abs','a?x=y','%2fhidden','a\\b'])assert.throws(()=>segments(slug));
 assert.equal(articlePath({slug:'入門/概要'}),'/articles/%E5%85%A5%E9%96%80/%E6%A6%82%E8%A6%81/');
 assert.equal(escapeHtml('<script>"&\''),'&lt;script&gt;&quot;&amp;&#39;');
});

test('Vite generator writes Unicode paths and removes withdrawn output',async()=>{
 const {mkdtemp,mkdir,writeFile,readFile,rm}=await import('node:fs/promises');
 const {tmpdir}=await import('node:os');
 const {join}=await import('node:path');
 const {execFileSync}=await import('node:child_process');
 const cwd=await mkdtemp(join(tmpdir(),'space-example-'));
 const generate=()=>execFileSync(process.execPath,[new URL('../examples/vite-site/generate.mjs',import.meta.url).pathname],{cwd});
 try {
  await mkdir(join(cwd,'.generated'));
  const input=join(cwd,'.generated/space-content.json');
  await writeFile(input,JSON.stringify({format:'html',articles:[{slug:'入門/概要',title:'<Title>',metadata:{description:'"Description"'},body:'<p>Body</p>'}]}));
  generate();
  const html=await readFile(join(cwd,'.generated/site/articles/入門/概要/index.html'),'utf8');
  assert(html.includes('<title>&lt;Title&gt;</title>'));
  assert(html.includes('<p>Body</p>'));
  assert((await readFile(join(cwd,'.generated/site/index.html'),'utf8')).includes(articlePath({slug:'入門/概要'})));
  await writeFile(input,JSON.stringify({format:'html',articles:[]}));generate();
  await assert.rejects(readFile(join(cwd,'.generated/site/articles/入門/概要/index.html')),{code:'ENOENT'});
 } finally {await rm(cwd,{recursive:true,force:true});}
});
