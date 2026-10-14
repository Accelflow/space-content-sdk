import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createAuthorProfile,renderAuthorProfile} from '../profile.mjs';
const identity={author:{name:'編集部',type:'Organization',url:'https://space.example/ja/blog/authors/editorial-team/',id:'https://space.example/#team',description:'紹介\n二段落',organizationName:'会社',organizationUrl:'https://company.example/',translations:{en:{name:'Editorial Team',url:'https://space.example/en/blog/authors/editorial-team/'}}},publisher:{name:'会社',url:'https://company.example/',id:'https://company.example/#org',logo:'https://company.example/logo.svg'},siteIntroduction:{heading:'このブログでお届けすること',body:'紹介本文',translations:{en:{heading:'What we cover',body:'Our topics'}}}};
const article={id:'a',slug:'one',title:'記事1',metadata:{...identity,locale:'ja',path:'/guide/one'}};
const options={origin:'https://space.example'};
test('creates full Organization profile, parent identity and nested article routes',()=>{
 const p=createAuthorProfile([article],options);assert.equal(p.author.name,'編集部');assert.equal(p.articles[0].url,'https://space.example/articles/guide/one/');assert.equal(p.jsonLd.mainEntity.parentOrganization['@id'],identity.publisher.id);assert.equal(p.jsonLd['@type'],'ProfilePage');
 const html=renderAuthorProfile(p);for(const text of ['このブログでお届けすること','紹介本文','紹介\n二段落','運営会社','記事1','application/ld+json'])assert(html.includes(text));
});
test('selects locale, excludes drafts/other authors and supports empty explicit identity',()=>{
 const p=createAuthorProfile([{...article,metadata:{...article.metadata,locale:'en'}},{...article,metadata:{...article.metadata,locale:'en',draft:true}},{...article,metadata:{...article.metadata,locale:'en',author:{name:'Other',id:'https://other.example/#author'}}}],{...options,locale:'en'});
 assert.equal(p.articles.length,1);assert.equal(p.author.name,'Editorial Team');assert.equal(p.author.description,'紹介\n二段落');assert.equal(p.siteIntroduction.heading,'What we cover');
 assert.match(renderAuthorProfile(createAuthorProfile([],{...options,identity})),/公開中の記事はまだありません/);
});
test('supports custom routes, labels, own rendering and Person affiliation',()=>{
 const p=createAuthorProfile([article],{...options,identity:{...identity,author:{...identity.author,type:'Person'}},articleHref:()=>'/ja/blog/one/',url:'/about/'});
 assert(p.jsonLd.mainEntity.affiliation);assert.equal(p.url,'https://space.example/about/');assert.equal(p.articles[0].url,'https://space.example/ja/blog/one/');assert(!renderAuthorProfile(p,{includeStructuredData:false,labels:{articles:'編集部の記事'}}).includes('<script'));assert(renderAuthorProfile(p,{labels:{articles:'編集部の記事'}}).includes('編集部の記事'));
});
test('escapes text and rejects unsafe navigation, malformed slugs and invalid config',()=>{
 const p=createAuthorProfile([{...article,title:'<img src=x onerror=attack>'}],{...options,identity:{...identity,author:{...identity.author,name:'</script><script>attack</script>'},siteIntroduction:{heading:'<script>attack</script>',body:'<img src=x onerror=attack>'}}});
 const html=renderAuthorProfile(p);assert(!html.includes('<script>attack'));assert(!html.includes('<img src=x'));assert(html.includes('&lt;script&gt;'));
 for(const origin of ['javascript:x','//evil','https://user:pass@example.com'])assert.throws(()=>createAuthorProfile([article],{origin}));
 for(const href of ['javascript:attack','//evil','https://example.com\\@evil/'])assert.throws(()=>createAuthorProfile([article],{...options,articleHref:()=>href}));
 for(const path of ['/../x','//evil','/a/%2e%2e'])assert.throws(()=>createAuthorProfile([{...article,metadata:{...article.metadata,path}}],options));
 assert.throws(()=>createAuthorProfile([],{...options}));assert.throws(()=>createAuthorProfile([article],{...options,locale:'xx'}));
});
