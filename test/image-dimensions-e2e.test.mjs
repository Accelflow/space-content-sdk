import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {syncContent} from '../node.mjs';
import {renderArticleBody} from '../render.mjs';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const frame=value=>Buffer.from(JSON.stringify(value)+'\n');
const image=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=','base64');
const asset={id:'photo',hash:sha(image),filename:'photo.png',contentType:'image/png'};

for(const kind of ['json-image','json-attachment','html-attachment'])test(`SDK download to published HTML preserves independently specified image dimensions: ${kind}`,async t=>{
 const directory=await mkdtemp(join(tmpdir(),'space-image-dimensions-'));
 t.after(()=>rm(directory,{recursive:true,force:true}));
 const body=kind==='html-attachment'
  ? `<figure style="max-width:100%;width:600px"><img src="/space-assets/${asset.hash}" alt="photo" style="display:block;width:100%;height:750px;max-width:100%"></figure>`
  : {type:'doc',content:[{type:kind==='json-image'?'image':'attachment',attrs:{src:`/space-assets/${asset.hash}`,attachmentId:'photo',contentType:'image/png',width:600,height:750}}]};
 const bytes=[Buffer.from(JSON.stringify(body)),Buffer.from(JSON.stringify({locale:'ja',createdAt:'2026-11-03'})),image];
 const objects=bytes.map(value=>({hash:sha(value),size:value.length}));
 const fixed={version:1,accountId:'account',workspaceId:'blog',format:kind.startsWith('json')?'json':'html',articles:[{id:'article',slug:'manual-management',title:'Manual management',bodyHash:objects[0].hash,metadataHash:objects[1].hash}],assets:[asset],objects};
 const manifest={...fixed,snapshotId:sha(JSON.stringify(fixed))};
 // Only the external Build API/download service is a fixture. The public SDK,
 // framed transfer, checksums, snapshot files and HTML renderer are real.
 const result=await syncContent({apiUrl:'https://api.example',downloadOrigin:'https://download.example',accountId:'account',workspaceId:'blog',token:'fixture-token',cacheDir:join(directory,'cache'),outputDir:join(directory,'build'),fetch:async(url,init)=>{
  if(new URL(url).hostname==='api.example')return Response.json({session:'fixture-session',expiresAt:Date.now()+60000,downloadUrl:'https://download.example/content',manifest});
  const selected=JSON.parse(init.body).hashes.map(hash=>objects.find(object=>object.hash===hash));
  return new Response(Buffer.concat([frame({version:1,snapshotId:manifest.snapshotId,count:selected.length}),...selected.flatMap(object=>[frame(object),bytes[objects.indexOf(object)]]),frame({end:true,snapshotId:manifest.snapshotId,count:selected.length})]));
 }});
 const snapshot=JSON.parse(await readFile(join(result.snapshotDir,'content.json'),'utf8'));
 assert.deepEqual(snapshot.articles[0].body,body,'The SDK must preserve the source dimensions during download');
 assert.deepEqual(await readFile(join(result.snapshotDir,'space-assets',asset.hash)),image);
 const html=renderArticleBody(snapshot.articles[0].body,{assets:snapshot.assets});
 assert.match(html,/width:600px/,'Published HTML must retain the requested width');
 assert.match(html,/height:750px/,'Published HTML must retain the independently requested height');
});
