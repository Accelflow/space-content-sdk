// Run before `vite build` or `next build`. Never prefix these secrets with VITE_ / NEXT_PUBLIC_.
import {syncContent} from '../node.mjs';
import {cp, mkdir, writeFile, rm} from 'node:fs/promises';
const required=name=>{if(!process.env[name])throw Error(`Missing ${name}`);return process.env[name];};
const result=await syncContent({
 apiUrl:required('SPACE_API_URL'),downloadOrigin:required('SPACE_DOWNLOAD_ORIGIN'),
 accountId:required('SPACE_ACCOUNT_ID'),workspaceId:required('SPACE_WORKSPACE_ID'),token:required('SPACE_BUILD_TOKEN'),
 cacheDir:'.space-cache',outputDir:'.space-build',
});
await mkdir('.generated',{recursive:true});
await cp(`${result.snapshotDir}/content.json`,'.generated/space-content.json');
// This dedicated output subdirectory belongs to this script; discard old assets.
await rm('public/space-assets',{recursive:true,force:true});
await cp(`${result.snapshotDir}/space-assets`,'public/space-assets',{recursive:true});
// Hosts must serve content-addressed assets with the manifest's MIME type.
await writeFile('.generated/space-assets.json',JSON.stringify(result.manifest.assets));
console.log(`Space sync: ${result.diagnostics.downloadedObjects} downloaded, ${result.diagnostics.cacheHits} cached`);
