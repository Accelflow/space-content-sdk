import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renderArticleBody as render,sanitizeArticleHtml} from '../render.mjs';
const t=text=>({type:'text',text});
const h=text=>({type:'heading',attrs:{level:2},content:[t(text)]});
const doc=(...content)=>({type:'doc',content});
const asset={id:'pdf',hash:'a'.repeat(64),filename:'guide.pdf',contentType:'application/pdf'};
test('JSON headings, unique anchors, localized TOC and escaped text',()=>{
 const html=render(doc({type:'tableOfContents'},h('目次'),h('Intro'),h('Intro'),{type:'paragraph',content:[t('<script>x</script>')]}));
 assert.match(html,/<summary>目次<\/summary>/);assert.match(html,/id="intro-2"/);assert.doesNotMatch(html,/<a[^>]*>目次<\/a>/);assert.match(html,/&lt;script&gt;/);
 assert.match(render(doc({type:'tableOfContents'},h('Start')),{locale:'en'}),/<summary>Table of contents/);
});
test('untrusted URLs, attrs and custom renderer output cannot inject executable HTML',()=>{
 const html=render(doc({type:'paragraph',content:[{...t('link'),marks:[{type:'link',attrs:{href:'javascript:alert(1)'}}]}]},{type:'image',attrs:{src:'data:image/svg+xml,x',onerror:'bad'}}),{renderers:{paragraph:()=>'<script>x</script><p onclick="x()">safe</p>'}});
 assert.equal(html,'<p>safe</p>');
});
test('PDF embeds require an asset in the manifest and opt-in; always preserve a link',()=>{
 const body=doc({type:'attachment',attrs:{attachmentId:'pdf',contentType:'text/html',src:'https://evil.test'}});
 assert.throws(()=>render(body),/attachment_not_in_manifest/);
 assert.doesNotMatch(render(body,{assets:[asset]}),/<iframe/);
 const html=render(body,{assets:[asset],pdfMode:'embed'});assert.match(html,/<iframe/);assert.match(html,/ sandbox(?:="")? /);assert.match(html,/<a .*download="guide.pdf"/);
 assert.doesNotMatch(sanitizeArticleHtml('<iframe src="https://evil.test" srcdoc="bad"></iframe>',{assets:[asset],pdfMode:'embed'}),/<iframe/);
 assert.doesNotMatch(sanitizeArticleHtml(`<iframe src="/space-assets/${asset.hash}" srcdoc="bad" sandbox="allow-scripts"></iframe>`,{assets:[asset],pdfMode:'embed'}),/srcdoc|allow-scripts/);
});
test('supports table spans, code, task lists, safe custom rendering and limits',()=>{
 const html=render(doc({type:'table',content:[{type:'tableRow',content:[{type:'tableCell',attrs:{colspan:2},content:[t('cell')]}]}]},{type:'codeBlock',content:[t('<unsafe>')]}));
 assert.match(html,/<td colspan="2">cell<\/td>/);assert.match(html,/&lt;unsafe&gt;/);
 let deep=t('x');for(let i=0;i<70;i++)deep={type:'paragraph',content:[deep]};assert.throws(()=>render(doc(deep)),/invalid_document/);
});
