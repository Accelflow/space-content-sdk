import {cp,mkdir,writeFile} from 'node:fs/promises';
export async function preparePresentation() {
 await mkdir('public',{recursive:true});
 await cp(new URL(import.meta.resolve('@accelflow/space-content/toc')),'public/space-toc.mjs');
 await cp(new URL(import.meta.resolve('@accelflow/space-content/toc.css')),'public/space-toc.css');
 await writeFile('public/space-toc-client.js',"import {mountTableOfContents} from './space-toc.mjs'; mountTableOfContents(document.body);\n");
}
