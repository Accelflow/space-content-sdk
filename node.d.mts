export interface BuildManifest {
 version: 1; accountId: string; workspaceId: string; format: 'html'|'json'; snapshotId: string;
 objects: Array<{hash:string;size:number}>;
 articles: Array<{id:string;slug:string;title:string;metadataHash:string;bodyHash:string}>;
 assets: Array<{id:string;hash:string;contentType:string;filename:string}>;
}
export interface SyncOptions {
 apiUrl: string; downloadOrigin: string; accountId: string; workspaceId: string; token: string;
 cacheDir: string; outputDir: string; fetch?: typeof globalThis.fetch; maxRetries?: number;
}
export function syncContent(options: SyncOptions): Promise<{
 snapshotDir:string; manifest:BuildManifest;
 diagnostics:{downloadedObjects:number;cacheHits:number};
}>;
