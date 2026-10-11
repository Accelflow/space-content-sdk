import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sanitizeArticleHtml as clean} from '../examples/shared/sanitize.mjs';

test('removes executable HTML, URL obfuscation, embeds and inline styles',()=>{
 for(const input of [
  '<script>alert(1)</script>', '<img src="x" onerror="alert(1)">',
  '<a href="java&#x73;cript:alert(1)">x</a>', '<a href="java\nscript:alert(1)">x</a>',
  '<iframe src="https://evil.test"></iframe><object data="x"></object>',
  '<svg onload="alert(1)"><a href="javascript:alert(1)">x</a></svg>',
  '<math><mtext><img src="x" onerror="alert(1)"></mtext></math>',
  '<p style="background:url(https://evil.test)">ok</p>',
  '<img src="data:image/svg+xml,bad"><img src="//evil.test/x">',
  '<form action="https://evil.test"><input name="password"></form>',
 ]) assert.doesNotMatch(clean(input), /<script|onerror|onload|javascript:|<iframe|<object|<svg|<math|style=|data:image|src="\/\/|<form|<input/i);
});
test('retains headings, TOC markers, attachment images and ordinary formatting',()=>{
 const html='<nav data-table-of-contents data-max-level="2"><a href="#intro" data-level="2">Intro</a></nav><h2 id="intro">Intro</h2><p><strong>text</strong></p><img src="/space-assets/abc" alt="image" width="120"><pre><code class="language-js">const x = 1;</code></pre>';
 const result=clean(html);
 for(const fragment of ['data-table-of-contents','data-max-level="2"','data-level="2"','href="#intro"','id="intro"','<strong>text</strong>','src="/space-assets/abc"','alt="image"','class="language-js"'])assert(result.includes(fragment),fragment);
 assert.equal(clean(result),result);
});
