export interface ContentNode { type: string; text?: string; attrs?: Record<string, unknown>; marks?: Array<{type:string;attrs?:Record<string,unknown>}>; content?: ContentNode[]; }
export interface ContentAsset {id:string;hash:string;contentType:string;filename:string;}
export interface RenderOptions {
 assets?: ContentAsset[]; locale?: 'ja'|'en'; pdfMode?: 'link'|'embed';
 renderers?: Record<string,(context:{node:ContentNode;children:string;defaultHtml:string;escapeHtml:typeof escapeHtml})=>string>;
 resolveArticle?: (attrs:Record<string,unknown>)=>{href:string;title?:string}|undefined;
 resolveSubArticles?: (attrs:Record<string,unknown>)=>Array<{href:string;title:string}>;
}
export function escapeHtml(value:unknown):string;
export function sanitizeArticleHtml(html:string, options?:RenderOptions):string;
export function renderArticleBody(body:ContentNode|string, options?:RenderOptions):string;
