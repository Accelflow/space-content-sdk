import {readFile} from 'node:fs/promises';
export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function segments(slug) {
 const parts=slug.split('/');
 if(parts.some(s=>!s||s==='.'||s==='..'||!/^[-_\p{L}\p{N}]+$/u.test(s)))throw Error('Example requires plain slug segments: '+slug);
 return parts;
}
export const articlePath = article => '/articles/'+segments(article.slug).map(encodeURIComponent).join('/')+'/';
export async function readContent() {
 const value=JSON.parse(await readFile('.generated/space-content.json','utf8'));
 if(value.format!=='html')throw Error('This sample renders HTML; choose HTML in Workspace settings or implement a JSON renderer.');
 const paths=new Set();
 for(const article of value.articles){const path=articlePath(article);if(paths.has(path)||typeof article.body!=='string')throw Error('Invalid or duplicate article path');paths.add(path);}
 return value;
}
