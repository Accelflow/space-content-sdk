import {readContent} from '../../../../../../shared/content.mjs';
import {profilePages,renderAuthorProfile} from '../../../../../../shared/profiles.mjs';
export const dynamicParams=false;
export async function generateStaticParams(){return profilePages(await readContent()).map(({locale})=>({locale}));}
async function getProfile(params){const {locale}=await params;const item=profilePages(await readContent()).find(p=>p.locale===locale);if(!item)throw Error('Profile not found');return item.profile;}
export async function generateMetadata({params}){const p=await getProfile(params);return {title:p.author.name,description:p.author.description,alternates:{canonical:p.url}};}
export default async function ProfilePage({params}){const p=await getProfile(params);return <main dangerouslySetInnerHTML={{__html:renderAuthorProfile(p)}}/>;}
