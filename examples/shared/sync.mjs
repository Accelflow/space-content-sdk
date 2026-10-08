// This script runs only in Node before the framework build, never in the browser.
import {syncContent} from '../../node.mjs';
import {cp,mkdir,rm,writeFile} from 'node:fs/promises';
const required=name=>{const v=process.env[name];if(!v)throw Error('Missing '+name);return v;};
const result=await syncContent({apiUrl:required('SPACE_API_URL'),downloadOrigin:required('SPACE_DOWNLOAD_ORIGIN'),accountId:required('SPACE_ACCOUNT_ID'),workspaceId:required('SPACE_WORKSPACE_ID'),token:required('SPACE_BUILD_TOKEN'),cacheDir:process.env.SPACE_CACHE_DIR??'.space-cache',outputDir:'.space-build'});
await mkdir('.generated',{recursive:true});
await cp(result.snapshotDir+'/content.json','.generated/space-content.json');
await rm('public/space-assets',{recursive:true,force:true});
await mkdir('public',{recursive:true});
await cp(result.snapshotDir+'/space-assets','public/space-assets',{recursive:true});
await cp(new URL('./language.js',import.meta.url),'public/space-language.js');
await rm(result.snapshotDir,{recursive:true,force:true});
await writeFile('.generated/sync-result.json',JSON.stringify(result.diagnostics));
// Cloudflare Pages-style MIME declarations. Other hosts should implement equivalent headers.
await writeFile('public/_headers',result.manifest.assets.map(a=>`/space-assets/${a.hash}\n  Content-Type: ${a.contentType}\n  X-Content-Type-Options: nosniff`).join('\n'));
console.log('Space sync: '+JSON.stringify(result.diagnostics));
