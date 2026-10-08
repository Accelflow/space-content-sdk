import {readContent,articlePath} from '../../shared/content.mjs';
export const metadata={title:'Space articles',description:'Published articles'};
export default async function Page(){const content=await readContent();return <main><h1 data-space-label="home">記事一覧</h1><ul>{content.articles.map(a=><li key={a.id}><a href={articlePath(a)}>{a.title}</a></li>)}</ul></main>;}
