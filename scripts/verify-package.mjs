import {execFileSync} from 'node:child_process';
import {mkdtempSync, mkdirSync, readFileSync, writeFileSync, cpSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const root=process.cwd();
const temp=mkdtempSync(join(tmpdir(),'space-sdk-package-'));
const run=(cmd,args,cwd=temp)=>execFileSync(cmd,args,{cwd,stdio:'inherit',env:{...process.env,NEXT_TELEMETRY_DISABLED:'1'}});
try {
 run('npm',['test'],root);
 const packed=JSON.parse(execFileSync('npm',['pack','--ignore-scripts','--json','--pack-destination',temp],{cwd:root,encoding:'utf8'}))[0];
 const allowed=['LICENSE','README.md','package.json','node.mjs','node.d.mts','toc.mjs','toc.d.mts','toc.css'].sort();
 if(JSON.stringify(packed.files.map(f=>f.path).sort())!==JSON.stringify(allowed))throw Error('Unexpected package contents');
 writeFileSync(join(temp,'package.json'),JSON.stringify({name:'sdk-consumer-verification',private:true,type:'module'}));
 run('npm',['install','--ignore-scripts','--no-audit','--no-fund',join(temp,packed.filename)]);
 mkdirSync(join(temp,'test'));
 for(const name of ['transport.test.mjs','toc.test.mjs']) {
  const source=readFileSync(join(root,'test',name),'utf8').replaceAll('../node.mjs','@accelflow/space-content/node').replaceAll('../toc.mjs','@accelflow/space-content/toc');
  writeFileSync(join(temp,'test',name),source);
 }
 run(process.execPath,['--test','test/transport.test.mjs','test/toc.test.mjs']);
 cpSync(join(root,'examples'),join(temp,'examples'),{recursive:true,filter:p=>!/(?:^|\/)(?:node_modules|\.next|\.generated|dist|out)(?:\/|$)/.test(p)});
 const fixture={format:'html',articles:[{slug:'intro',title:'Package acceptance',metadata:{path:'/guide/intro',description:'Synthetic content'},body:'<h2 id="start">Start</h2><p>SDK package fixture</p>'}]};
 for(const framework of ['vite-site','next-site']) {
  const cwd=join(temp,'examples',framework);
  mkdirSync(join(cwd,'.generated'),{recursive:true});writeFileSync(join(cwd,'.generated/space-content.json'),JSON.stringify(fixture));
  run('npm',['ci','--ignore-scripts','--no-audit','--no-fund'],cwd);
  if(framework==='vite-site') {
   run(process.execPath,['generate.mjs'],cwd);
   writeFileSync(join(cwd,'.generated/site/toc-client.js'),"import {mountTableOfContents} from '@accelflow/space-content/toc'; import '@accelflow/space-content/toc.css'; mountTableOfContents(document.body);");
   const index=join(cwd,'.generated/site/index.html');
   writeFileSync(index,readFileSync(index,'utf8').replace('</body>','<script type="module" src="/toc-client.js"></script></body>'));
   run('npx',['--no-install','vite','build'],cwd);
  }
  else {
   writeFileSync(join(cwd,'app/toc-client.jsx'),"'use client';\nimport {useEffect} from 'react'; import {mountTableOfContents} from '@accelflow/space-content/toc'; import '@accelflow/space-content/toc.css'; export default function Toc(){useEffect(()=>mountTableOfContents(document.body),[]);return null;}");
   const layout=join(cwd,'app/layout.jsx');
   writeFileSync(layout,"import Toc from './toc-client.jsx';\n"+readFileSync(layout,'utf8').replace('</header>{children}', '</header>{children}<Toc/>'));
   run('npx',['--no-install','next','build','--webpack'],cwd);
  }
  const out=join(cwd,framework==='vite-site'?'dist':'out','articles','guide','intro','index.html');
  if(!readFileSync(out,'utf8').includes('SDK package fixture'))throw Error('Missing rendered fixture');
 }
 console.log('Packed exports, transport tests, and Vite/Next static builds passed.');
} finally {rmSync(temp,{recursive:true,force:true});}
