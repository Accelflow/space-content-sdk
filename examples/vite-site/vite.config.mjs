import {defineConfig} from 'vite';
import {resolve} from 'node:path';
import {articleRoute,readContent,segments} from '../shared/content.mjs';
const content=await readContent(),root=resolve('.generated/site');
export default defineConfig({root,publicDir:resolve('public'),build:{outDir:resolve('dist'),emptyOutDir:true,rolldownOptions:{input:[resolve(root,'index.html'),...content.articles.map(a=>resolve(root,'articles',...segments(articleRoute(a)),'index.html'))]}}});
