import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renderTableOfContents} from '../toc.mjs';
test('TOC excludes title, filters depth and escapes heading text',()=>{
 const html=renderTableOfContents([{id:'a',text:'【目次】',level:2},{id:'b',text:'Table of contents',level:2},{id:'安全',text:'<script>x</script>',level:2},{id:'c',text:'Child',level:3}],{maxLevel:2});
 assert(!html.includes('href="#a"'));assert(!html.includes('href="#b"'));assert(!html.includes('Child'));
 assert(html.includes('&lt;script&gt;'));assert(html.includes('href="#%E5%AE%89%E5%85%A8"'));assert(html.includes('<summary>目次</summary>'));
});
test('custom renderer receives filtered entries and localized title',()=>{
 const html=renderTableOfContents([{id:'x',text:'Chapter',level:2}],{locale:'en',render:({title,entries})=>JSON.stringify({title,entries})});
 assert.equal(JSON.parse(html).title,'Table of contents');assert.equal(JSON.parse(html).entries[0].href,'#x');
});
