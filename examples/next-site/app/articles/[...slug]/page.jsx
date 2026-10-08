import {notFound} from 'next/navigation';
import {articleRoute,readContent,segments} from '../../../../shared/content.mjs';
export const dynamicParams=false;
// Next static export requires a parameter even for an empty publication.
// The sentinel resolves through notFound(), never to content or a list entry.
export async function generateStaticParams(){const articles=(await readContent()).articles;return articles.length?articles.map(a=>({slug:segments(articleRoute(a))})):[{slug:['__space_empty__']}];}
async function find(params){const slug=(await params).slug.join('/');return (await readContent()).articles.find(a=>articleRoute(a)===slug);}
export async function generateMetadata({params}){const a=await find(params);return a?{title:a.title,description:a.metadata.description??a.metadata.excerpt??''}:{};}
export default async function Page({params}){const a=await find(params);if(!a)notFound();return <><nav><a href="/" data-space-label="home">記事一覧</a></nav><main><h1>{a.title}</h1><article dangerouslySetInnerHTML={{__html:a.body}}/></main></>;}
