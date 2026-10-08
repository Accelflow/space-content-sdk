import {test} from 'node:test';
import assert from 'node:assert/strict';
import {articleRoute,articlePath} from '../examples/shared/content.mjs';
test('page tree preserves canonical nested paths and legacy slug fallback',()=>{
 assert.equal(articleRoute({slug:'setup',metadata:{path:'/guide/setup'}}),'guide/setup');
 assert.equal(articlePath({slug:'setup',metadata:{path:'/別/設定'}}),'/articles/%E5%88%A5/%E8%A8%AD%E5%AE%9A/');
 assert.equal(articleRoute({slug:'old'}),'old');
 assert.notEqual(articlePath({slug:'setup',metadata:{path:'/a/setup'}}),articlePath({slug:'setup',metadata:{path:'/b/setup'}}));
});
test('page tree rejects traversal, empty and ambiguous encoded paths',()=>{
 for(const path of ['/a/../x','//host','/a/%2e%2e','/a/','/a?x','relative','/'])assert.throws(()=>articleRoute({slug:'safe',metadata:{path}}));
});
