import {createAuthorProfile,renderAuthorProfile} from '@accelflow/space-content/profile';
import {articlePath} from './content.mjs';
export {renderAuthorProfile};
export function profilePages(content) {
 return ['ja','en'].filter(locale=>content.articles.some(a=>(a.metadata?.locale??'ja')===locale&&a.metadata?.author)).map(locale=>({
  locale,path:`/${locale}/blog/authors/editorial-team/`,
  profile:createAuthorProfile(content.articles,{origin:process.env.SITE_ORIGIN||'https://example.com',locale,url:`/${locale}/blog/authors/editorial-team/`,articleHref:articlePath})
 }));
}
