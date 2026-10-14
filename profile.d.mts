export type ProfileParty = {name:string;url?:string;type?:'Person'|'Organization';id?:string;logo?:string;description?:string;organizationName?:string;organizationUrl?:string;translations?:Partial<Record<'ja'|'en',Partial<Pick<ProfileParty,'name'|'url'|'description'|'organizationName'|'organizationUrl'>>>>};
export type SiteIntroduction = {heading:string;body:string;translations?:Partial<Record<'ja'|'en',Partial<{heading:string;body:string}>>>};
export type ProfileIdentity = {author?:ProfileParty;publisher?:ProfileParty;siteIntroduction?:SiteIntroduction};
export type ProfileArticle = {id?:string;slug:string;title:string;metadata?:Record<string,unknown>;[key:string]:unknown};
export type AuthorProfile = {locale:'ja'|'en';url:string;author:ProfileParty;publisher?:ProfileParty;siteIntroduction?:{heading:string;body:string};articles:{id:string;title:string;url:string}[];jsonLd:Record<string,unknown>};
export function createAuthorProfile(articles:ProfileArticle[],options:{origin:string;locale?:'ja'|'en';identity?:ProfileIdentity;url?:string;articleHref?:(article:ProfileArticle)=>string}):AuthorProfile;
export function renderAuthorProfile(profile:AuthorProfile,options?:{labels?:Partial<Record<'about'|'company'|'articles'|'empty',string>>;includeStructuredData?:boolean}):string;
