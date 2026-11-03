import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renderArticleBody,sanitizeArticleHtml} from '../render.mjs';
const render=attrs=>renderArticleBody({type:'doc',content:[{type:'image',attrs:{src:'https://example.com/photo.png',...attrs}}]});
test('image dimensions accept only integer pixels from 1 through 10000 independently',()=>{
 assert.match(render({width:1,height:10000}),/width:1px;height:10000px/);
 assert.match(render({width:600,height:-1}),/width:600px/);
 assert.match(render({height:750,width:10001}),/height:750px/);
 for(const value of [0,-1,10001,1.5,'600',Infinity,NaN,'600;position:fixed'])assert.doesNotMatch(render({width:value,height:value}),/style=/);
 assert.doesNotMatch(render({}),/style=/);
});
test('HTML image styles preserve only bounded dimensions, not arbitrary CSS or executable attributes',()=>{
 const html=sanitizeArticleHtml('<figure style="width:600px;max-width:100%;position:fixed;background:url(https://evil.test)"><img src="https://example.com/photo.png" onerror="alert(1)" style="width:100%;height:750px;max-width:100%;position:fixed;background:url(https://evil.test)"></figure><p style="width:600px">text</p>');
 assert.match(html,/<figure style="width:600px;max-width:100%">/);
 assert.match(html,/height:750px/);
 assert.doesNotMatch(html,/position|background|evil|onerror|<p style/);
 for(const value of ['0px','-1px','10001px','1.5px','calc(1px)','expression(alert(1))'])assert.doesNotMatch(sanitizeArticleHtml(`<img src="https://example.com/photo.png" style="width:${value};height:${value}">`),/style=/);
});
