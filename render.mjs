import sanitizeHtml from 'sanitize-html';
import {renderTableOfContents} from './toc.mjs';
export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const hash = /^[a-f0-9]{64}$/;
const raster = new Set(['image/png','image/jpeg','image/gif','image/webp','image/avif']);
function assetsIndex(assets = []) {
 const ids = new Map(), paths = new Map();
 for (const a of assets) {
  if (!a || typeof a.id !== 'string' || !hash.test(a.hash) || typeof a.contentType !== 'string' || typeof a.filename !== 'string' || ids.has(a.id)) throw Error('invalid_render_asset');
  ids.set(a.id,a); paths.set('/space-assets/'+a.hash,a);
 }
 return {ids,paths};
}
function safeUrl(value, image = false) {
 if (typeof value !== 'string' || /[\u0000-\u0020\u007f\\]/.test(value)) return '';
 if (/^(?:\/(?!\/)|#)/.test(value)) return value;
 try {const u=new URL(value);return !u.username && !u.password && (image ? u.protocol==='https:' : ['https:','http:','mailto:','tel:'].includes(u.protocol)) ? value : '';} catch {return '';}
}
/** Build-time HTML sanitizer. Only known local PDF assets may be embedded, opt-in. */
export function sanitizeArticleHtml(html, {assets = [], pdfMode = 'link'} = {}) {
 if (typeof html !== 'string') throw Error('invalid_html_body');
 const {paths}=assetsIndex(assets);
 return sanitizeHtml(html, {
  nonBooleanAttributes: sanitizeHtml.defaults.nonBooleanAttributes.filter(a=>a!=='sandbox'),
  allowedTags: [...sanitizeHtml.defaults.allowedTags,'img','details','summary','nav',...(pdfMode==='embed'?['iframe']:[])],
  allowedAttributes: {
   '*':['id','class'], a:['href','title','data-level','download'],
   img:['src','alt','title','width','height','loading','referrerpolicy'],
   nav:['data-table-of-contents','data-max-level','aria-label'], details:['open','data-space-toc'],
   li:['data-level','data-checked'], ol:['start'], td:['colspan','rowspan'], th:['colspan','rowspan','scope'],
   iframe:['src','title','sandbox','loading','referrerpolicy'],
  },
  allowedClasses:{'*':['*']},
  allowedSchemes:['https','http','mailto','tel'], allowedSchemesByTag:{img:['https'],iframe:[]}, allowProtocolRelative:false,
  transformTags: {
   iframe: (tagName, attrs) => ({tagName,attribs:{src:attrs.src??'',title:attrs.title??'PDF',sandbox:'',loading:'lazy',referrerpolicy:'no-referrer'}}),
  },
  exclusiveFilter: frame => frame.tag==='iframe' && !(pdfMode==='embed' && paths.get(frame.attribs.src)?.contentType==='application/pdf'),
 });
}
/** Render Space's Tiptap JSON document. Custom callbacks are trusted code; their HTML is still sanitized. */
export function renderArticleBody(body, options = {}) {
 if (typeof body==='string') return sanitizeArticleHtml(body,options);
 if (!body || body.type!=='doc' || !Array.isArray(body.content)) throw Error('invalid_document');
 const {ids}=assetsIndex(options.assets), headings=[], anchors=new Map(), used=new Set();let count=0;
 const text=n=>n.type==='text'?String(n.text??''):(n.content??[]).map(text).join('');
 function inspect(n,depth=0) {
  if (!n || typeof n!=='object' || typeof n.type!=='string' || ++count>100000 || depth>64 || (n.content!==undefined&&!Array.isArray(n.content))) throw Error('invalid_document');
  for(const child of n.content??[])inspect(child,depth+1);
 }
 inspect(body);
 function collect(n) {
  if(n.type==='tableOfContents')return;
  if(n.type==='heading') {const level=Number.isInteger(n.attrs?.level)&&n.attrs.level>=1&&n.attrs.level<=6?n.attrs.level:2;const title=text(n);let id=typeof n.attrs?.id==='string'&&/^[\p{L}\p{N}_-]+$/u.test(n.attrs.id)?n.attrs.id:title.toLowerCase().replace(/[^\p{L}\p{N}_-]+/gu,'-').replace(/^-|-$/g,'')||'heading';const base=id;let index=2;while(used.has(id))id=base+'-'+index++;used.add(id);anchors.set(n,id);headings.push({id,level,text:title});}
  for(const child of n.content??[])collect(child);
 }
 collect(body);
 const e=escapeHtml;
 const wrap=(tag,children,attrs='')=>`<${tag}${attrs}>${children}</${tag}>`;
 function render(n) {
  const a=n.attrs??{}, children=(n.content??[]).map(render).join('');
  let html='';
  if(n.type==='text') {
   html=e(n.text);
   for(const mark of Array.isArray(n.marks)?n.marks:[]) {const tag={bold:'strong',italic:'em',underline:'u',strike:'s',code:'code'}[mark?.type];if(tag)html=wrap(tag,html);else if(mark?.type==='link'){const href=safeUrl(mark.attrs?.href);if(href)html=wrap('a',html,` href="${e(href)}"`);}}
  } else if(n.type==='heading') html=wrap('h'+(Number.isInteger(a.level)&&a.level>=1&&a.level<=6?a.level:2),children,` id="${e(anchors.get(n))}"`);
  else if(n.type==='tableOfContents') html=renderTableOfContents(headings,{locale:options.locale??'ja',maxLevel:a.maxLevel===2?2:3});
  else if(n.type==='image') {const src=safeUrl(a.src,true);html=src?`<img src="${e(src)}" alt="${e(a.alt)}" loading="lazy" referrerpolicy="no-referrer">`:'';}
  else if(n.type==='attachment') {
   const asset=ids.get(a.attachmentId);if(!asset)throw Error('attachment_not_in_manifest');
   const src='/space-assets/'+asset.hash, label=e(asset.filename);
   html=raster.has(asset.contentType)?`<img src="${src}" alt="${label}" loading="lazy">`:`<a href="${src}" download="${label}">${label}</a>`;
   if(asset.contentType==='application/pdf'&&options.pdfMode==='embed')html=`<iframe class="space-pdf" src="${src}" title="${label}" sandbox="" loading="lazy" referrerpolicy="no-referrer"></iframe>`+html;
  } else if(n.type==='externalLinkCard') {const href=safeUrl(a.href);html=href?wrap('a',e(a.title||href),` href="${e(href)}"`):e(a.title);}
  else if(n.type==='articleReference') {const target=options.resolveArticle?.(a);const href=safeUrl(target?.href);const label=e(a.labelMode==='custom'?a.customLabel:target?.title??a.fallbackTitle??a.title??'');html=href?wrap('a',label,` href="${e(href)}"`):label;}
  else if(n.type==='smartLink') html=e(a.label??a.categoryLabel??'');
  else if(n.type==='subArticleList') html=wrap('nav',wrap('ol',(options.resolveSubArticles?.(a)??[]).map(x=>{const href=safeUrl(x.href);return href?wrap('li',wrap('a',e(x.title),` href="${e(href)}"`)):'';}).join('')));
  else if(n.type==='hardBreak')html='<br>';
  else if(n.type==='horizontalRule')html='<hr>';
  else if(n.type==='codeBlock')html=wrap('pre',wrap('code',e(text(n)),` class="language-${e(String(a.language??'text').replace(/[^\w-]/g,''))}"`));
  else if(n.type==='columnLayout')html=wrap('div',children,' class="space-columns"');
  else if(n.type==='column')html=wrap('div',children,' class="space-column"');
  else {
   const tag={doc:null,paragraph:'p',bulletList:'ul',orderedList:'ol',listItem:'li',taskList:'ul',taskItem:'li',blockquote:'blockquote',table:'table',tableRow:'tr',tableCell:'td',tableHeader:'th'}[n.type];
   let attrs='';
   if(n.type==='orderedList'&&Number.isSafeInteger(a.start)&&a.start>0)attrs=` start="${a.start}"`;
   if(n.type==='taskItem')attrs=` class="space-task" data-checked="${a.checked===true}"`;
   if(['tableCell','tableHeader'].includes(n.type))for(const key of ['colspan','rowspan'])if(Number.isInteger(a[key])&&a[key]>0&&a[key]<=100)attrs+=` ${key}="${a[key]}"`;
   html=tag?wrap(tag,children,attrs):children;
  }
  const custom=Object.hasOwn(options.renderers??{},n.type)?options.renderers[n.type]:null;
  return custom?custom({node:n,children,defaultHtml:html,escapeHtml:e}):html;
 }
 return sanitizeArticleHtml(render(body),options);
}
