import {cp,mkdir,rm,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {articleRoute,readContent,escapeHtml,articlePath,segments} from '../shared/content.mjs';
const content=await readContent();
await mkdir('public',{recursive:true});await cp(new URL('../shared/language.js',import.meta.url),'public/space-language.js');
await rm('.generated/site',{recursive:true,force:true});
await mkdir('.generated/site',{recursive:true});
const page=(title,description,body)=>`<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(description)}"><style>body{max-width:760px;margin:48px auto;padding:0 24px;font:18px/1.75 system-ui}a{color:#2459a5}article img{max-width:100%}</style></head><body><header><button type="button" data-space-language="ja">日本語</button> <button type="button" data-space-language="en">English</button></header>${body}<script type="module" src="/space-language.js"></script></body></html>`;
await writeFile('.generated/site/index.html',page('Space articles','Published articles',`<main><h1 data-space-label="home">記事一覧</h1><ul>${content.articles.map(a=>`<li><a href="${articlePath(a)}">${escapeHtml(a.title)}</a></li>`).join('')}</ul></main>`));
for(const article of content.articles){
 const dir=join('.generated/site/articles',...segments(articleRoute(article)));await mkdir(dir,{recursive:true});
 await writeFile(join(dir,'index.html'),page(article.title,article.metadata.description??article.metadata.excerpt??'',`<nav><a href="/" data-space-label="home">記事一覧</a></nav><main><h1>${escapeHtml(article.title)}</h1><article>${article.body}</article></main>`));
}
