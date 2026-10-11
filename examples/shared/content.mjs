import {renderArticleBody} from '../../render.mjs';
import {readFile} from 'node:fs/promises';
export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function segments(slug) {
 const parts=slug.split('/');
 if(parts.some(s=>!s||s==='.'||s==='..'||!/^[-_\p{L}\p{N}]+$/u.test(s)))throw Error('Example requires plain slug segments: '+slug);
 return parts;
}
export const articleRoute = article => {
 const path=article.metadata?.path;
 if(path!==undefined&&(typeof path!=='string'||!path.startsWith('/')||path.startsWith('//')))throw Error('Invalid article path');
 return segments(path===undefined?article.slug:path.slice(1)).join('/');
};
export const articlePath = article => '/articles/'+segments(articleRoute(article)).map(encodeURIComponent).join('/')+'/';
export async function readContent() {
 const value=JSON.parse(await readFile('.generated/space-content.json','utf8'));
 if(!['html','json'].includes(value.format))throw Error('Unknown body format');
 const paths=new Set();
 for(const article of value.articles){const path=articlePath(article);if(paths.has(path))throw Error('Invalid or duplicate article path');paths.add(path);}
 return {...value, articles:value.articles.map(article=>({...article,body:renderArticleBody(article.body,{assets:value.assets??[],locale:article.metadata?.locale??'ja',resolveArticle:attrs=>{const target=value.articles.find(a=>a.id===(attrs.targetArticleId??attrs.articleId));return target?{href:articlePath(target),title:target.title}:undefined;}})}))};
}
