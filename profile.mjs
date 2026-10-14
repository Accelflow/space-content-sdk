const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function url(value, origin) {
 if (typeof value !== 'string' || /[\u0000-\u0020\u007f\\]/.test(value) || value.startsWith('//')) return '';
 try {const u=new URL(value,origin);return ['http:','https:'].includes(u.protocol)&&!u.username&&!u.password ? u.href : '';} catch {return '';}
}
function party(value, locale) {
 if (!value || typeof value!=='object') return undefined;
 const p={...value};
 for(const key of ['name','url','description','organizationName','organizationUrl']) if(typeof value.translations?.[locale]?.[key]==='string')p[key]=value.translations[locale][key];
 if(typeof p.name!=='string'||!p.name.trim())return undefined;
 return {name:p.name,type:p.type==='Person'?'Person':'Organization',url:url(p.url),id:url(p.id),logo:url(p.logo),description:typeof p.description==='string'?p.description:'',organizationName:typeof p.organizationName==='string'?p.organizationName:'',organizationUrl:url(p.organizationUrl)};
}
function schemaParty(p) {
 return {'@type':p.type,name:p.name,...(p.url?{url:p.url}:{}),...(p.id?{'@id':p.id}:{}),...(p.logo?{logo:p.logo}:{}),...(p.description?{description:p.description}:{})};
}
const sameAuthor=(a,b)=> (a.id&&b.id)?a.id===b.id:(a.url&&b.url)?a.url===b.url:a.name===b.name;
/** Build a profile view model from published SDK articles. Does not fetch or access tokens. */
export function createAuthorProfile(articles, options) {
 const {origin,locale='ja',identity,articleHref}=options??{};
 if(!['ja','en'].includes(locale))throw Error('invalid_profile_locale');
 const base=url(origin);if(!base)throw Error('invalid_profile_origin');
 const candidates=articles.filter(a=>(a.metadata?.locale??a.locale??'ja')===locale && (a.metadata??a).draft!==true);
 const metadata=identity??candidates.find(a=>(a.metadata??a).author)?.metadata??candidates.find(a=>a.author)??{};
 const author=party(metadata.author,locale);if(!author)throw Error('profile_author_required');
 const publisher=party(metadata.publisher,locale);
 const source=metadata.siteIntroduction;
 const intro=source?{...source,...source.translations?.[locale]}:undefined;
 const siteIntroduction=intro&&typeof intro.heading==='string'&&typeof intro.body==='string'?{heading:intro.heading,body:intro.body}:undefined;
 const canonicalUrl=url(options.url??author.url,base);if(!canonicalUrl)throw Error('invalid_profile_url');
 const list=candidates.filter(a=>{const p=party((a.metadata??a).author,locale);return !p||sameAuthor(p,author);}).map(a=>{
  let href;
  if(articleHref)href=url(articleHref(a),base);
  else {
   const raw=(a.metadata??a).path??'/'+a.slug;
   if(typeof raw!=='string'||!/^\/(?!\/)/.test(raw)||raw.slice(1).split('/').some(s=>!/^[-_\p{L}\p{N}]+$/u.test(s)))throw Error('invalid_profile_article_path');
   href=url('/articles/'+raw.slice(1).split('/').map(encodeURIComponent).join('/')+'/',base);
  }
  if(!href)throw Error('invalid_profile_article_url');
  return {id:a.id??a.slug,title:String(a.title??''),url:href};
 });
 const entity=schemaParty(author);
 if(author.organizationName)entity[author.type==='Person'?'affiliation':'parentOrganization']={...(publisher&&publisher.url===author.organizationUrl?schemaParty(publisher):{'@type':'Organization'}),name:author.organizationName,...(author.organizationUrl?{url:author.organizationUrl}:{})};
 const jsonLd={'@context':'https://schema.org','@type':'ProfilePage','@id':canonicalUrl+'#profile',url:canonicalUrl,name:author.name,description:author.description,inLanguage:locale==='ja'?'ja-JP':'en-US',mainEntity:entity,...(publisher?{publisher:schemaParty(publisher)}:{})};
 return {locale,url:canonicalUrl,author,publisher,siteIntroduction,articles:list,jsonLd};
}
/** Safe default HTML. Customize labels/CSS or render the view model in React instead. */
export function renderAuthorProfile(profile,{labels={},includeStructuredData=true}={}) {
 const ja=profile.locale==='ja';
 const text={about:ja?'プロフィール':'Profile',company:ja?'運営会社':'Published by',articles:ja?'記事一覧':'Articles',empty:ja?'公開中の記事はまだありません。':'There are no published articles yet.',...labels};
 const a=profile.author,p=profile.publisher;
 const link=(href,label)=>url(href)?`<a href="${escape(url(href))}">${escape(label)}</a>`:escape(label);
 const logo=p?.logo&&url(p.logo)?`<img class="space-profile-logo" src="${escape(url(p.logo))}" alt="${escape(p.name)}" loading="lazy" referrerpolicy="no-referrer">`:'';
 const company=a.organizationName||p?.name;
 const data=includeStructuredData?`<script type="application/ld+json">${JSON.stringify(profile.jsonLd).replaceAll('<','\\u003c')}</script>`:'';
 return `${data}<article class="space-profile" lang="${ja?'ja':'en'}"><header><p class="space-profile-eyebrow">${escape(text.about)}</p><h1>${escape(a.name)}</h1><p class="space-profile-text">${escape(a.description)}</p></header>${profile.siteIntroduction?`<section><h2>${escape(profile.siteIntroduction.heading)}</h2><p class="space-profile-text">${escape(profile.siteIntroduction.body)}</p></section>`:''}${company?`<section><h2>${escape(text.company)}</h2>${logo}<p>${link(a.organizationUrl||p?.url,company)}</p></section>`:''}<section><h2>${escape(text.articles)}</h2>${profile.articles.length?`<ul>${profile.articles.map(item=>`<li>${link(item.url,item.title)}</li>`).join('')}</ul>`:`<p>${escape(text.empty)}</p>`}</section></article>`;
}
