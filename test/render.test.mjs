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

test('preserves API external link targets in HTML and JSON, forcing safe rel',()=>{
 const html=render({type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'External',marks:[{type:'link',attrs:{href:'https://other.example/',target:'_blank',rel:'opener'}}]},{type:'text',text:'Internal',marks:[{type:'link',attrs:{href:'/local',target:'_blank'}}]}]}]});
 assert(html.includes('target="_blank" rel="noopener noreferrer"'));assert(!html.includes('href="/local" target='));
 const sanitized=sanitizeArticleHtml('<a href="https://other.example/" target="_blank" rel="opener">X</a>');assert(sanitized.includes('rel="noopener noreferrer"'));assert(!sanitized.includes('rel="opener"'));
});

test('body CSS integration keeps multiple paragraphs, empty lines and hard breaks in cells and lists',()=>{
 const paragraphs=[{type:'paragraph',content:[t('First')]},{type:'paragraph'},{type:'paragraph',content:[t('Second'),{type:'hardBreak'},t('Third')]}];
 const html=render(doc({type:'table',content:[{type:'tableRow',content:[{type:'tableCell',content:paragraphs}]}]},{type:'bulletList',content:[{type:'listItem',content:paragraphs}]}));
 assert.equal((html.match(/<p><\/p>/g)||[]).length,2);
 assert.equal((html.match(/Second<br\s*\/?>(?:Third)/g)||[]).length,2);
 assert.match(html,/<li><p>First<\/p><p><\/p>/);
});

test('legacy heading IDs and percent-encoded TOC links use a single mapping',()=>{
 const headingId=s=>s.trim().toLowerCase().replace(/[\s/]+/g,'-').replace(/[^\p{Letter}\p{Number}-]/gu,'').replace(/-{2,}/g,'-')||'heading';
 const name='代理店管理システム・ツールおすすめ10選';
 const html=render(doc({type:'tableOfContents'},h(name),h('まとめ')),{headingId});
 const id='代理店管理システムツールおすすめ10選';
 assert(html.includes(`id="${id}"`));assert(html.includes(`href="#${encodeURIComponent(id)}"`));
 assert(html.includes(`href="#${encodeURIComponent('まとめ')}"`));assert(!html.includes('%25E3'));
});
test('generated headings cannot steal later explicit IDs, including duplicate suffixes',()=>{
 const html=render(doc(h('Intro'),{...h('Renamed'),attrs:{level:2,id:'intro'}},{...h('Other'),attrs:{level:2,id:'intro-2'}},h('Intro')));
 assert.match(html,/<h2 id="intro-3">Intro/);assert.match(html,/<h2 id="intro">Renamed/);assert.match(html,/<h2 id="intro-2">Other/);assert.match(html,/<h2 id="intro-4">Intro/);
 assert.throws(()=>render(doc(h('Hi')),{headingId:()=>'<unsafe>'}),/invalid_heading_id/);
});
