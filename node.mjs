import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, rename, rm, lstat } from 'node:fs/promises';
import { resolve, join } from 'node:path';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const hashPattern = /^[a-f0-9]{64}$/;
function validateManifest(m, accountId, workspaceId) {
    if (m.version !== 1 || m.accountId !== accountId || m.workspaceId !== workspaceId || !['html', 'json'].includes(m.format) || !hashPattern.test(m.snapshotId) || !Array.isArray(m.objects) || m.objects.length > 4096 || !Array.isArray(m.articles) || !Array.isArray(m.assets))
        throw Error('invalid_manifest');
    const { snapshotId, ...fixed } = m;
    if (sha(JSON.stringify(fixed)) !== snapshotId)
        throw Error('manifest_checksum_mismatch');
    const objects = new Map();
    let total = 0;
    for (const o of m.objects) {
        if (!hashPattern.test(o.hash) || !Number.isSafeInteger(o.size) || o.size < 0 || o.size > 64 * 1024 * 1024 || objects.has(o.hash))
            throw Error('invalid_manifest');
        objects.set(o.hash, o);
        total += o.size;
    }
    if (total > 1024 * 1024 * 1024)
        throw Error('manifest_too_large');
    for (const a of m.articles)
        if (typeof a.id !== 'string' || typeof a.slug !== 'string' || typeof a.title !== 'string' || !objects.has(a.bodyHash) || !objects.has(a.metadataHash))
            throw Error('invalid_manifest');
    for (const a of m.assets)
        if (typeof a.id !== 'string' || typeof a.contentType !== 'string' || typeof a.filename !== 'string' || !objects.has(a.hash))
            throw Error('invalid_manifest');
    return objects;
}
async function limitedText(response, max) {
    const reader = response.body?.getReader();
    if (!reader)
        throw Error('missing_response');
    const chunks = [];
    let size = 0;
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
            size += value.length;
            if (size > max)
                throw Error('manifest_too_large');
            chunks.push(Buffer.from(value));
        }
        return Buffer.concat(chunks).toString();
    }
    finally {
        await reader.cancel().catch(() => { });
    }
}
class Reader {
    constructor(stream) { if (!stream)
        throw Error('missing_stream'); this.reader = stream.getReader(); this.buffer = new Uint8Array(); }
    async take(max) { if (!this.buffer.length) {
        const r = await this.reader.read();
        if (r.done)
            return null;
        this.buffer = r.value;
    } const n = Math.min(max, this.buffer.length), v = this.buffer.subarray(0, n); this.buffer = this.buffer.subarray(n); return v; }
    async line() { const chunks = []; for (let n = 0; n < 4096; n++) {
        const b = await this.take(1);
        if (!b)
            throw Error('truncated_stream');
        if (b[0] === 10)
            return JSON.parse(Buffer.from(chunks).toString());
        chunks.push(b[0]);
    } throw Error('frame_too_large'); }
}
async function cacheRead(path, o) { try {
    if (!(await lstat(path)).isFile() || (await lstat(path)).isSymbolicLink())
        return null;
    const b = await readFile(path);
    return b.length === o.size && sha(b) === o.hash ? b : null;
}
catch (e) {
    if (e.code === 'ENOENT')
        return null;
    throw e;
} }
async function save(path, data) { const temp = path + '.' + randomUUID() + '.partial'; try {
    await writeFile(temp, data, { flag: 'wx', mode: 0o600 });
    await rename(temp, path);
}
finally {
    await rm(temp, { force: true });
} }
async function safeDirectory(path) { await mkdir(path, { recursive: true, mode: 0o700 }); const s = await lstat(path); if (s.isSymbolicLink() || !s.isDirectory())
    throw Error('unsafe_cache_directory'); }
/** Build-time only. cacheDir must be a private, trusted directory; never expose it to untrusted PRs. */
export async function syncContent({ apiUrl, downloadOrigin, accountId, workspaceId, token, cacheDir, outputDir, fetch: fetcher = globalThis.fetch, maxRetries = 2 }) {
    const api = new URL(apiUrl), allowed = new URL(downloadOrigin);
    if (api.protocol !== 'https:' || allowed.protocol !== 'https:' || api.username || api.password || allowed.username || allowed.password)
        throw Error('https_required');
    if (!Number.isInteger(maxRetries) || maxRetries < 0 || maxRetries > 3)
        throw Error('invalid_retry_limit');
    const start = await fetcher(new URL(`/v1/build/accounts/${encodeURIComponent(accountId)}/workspaces/${encodeURIComponent(workspaceId)}/sessions`, api), { method: 'POST', headers: { Authorization: `Bearer ${token}` }, redirect: 'error', signal: AbortSignal.timeout(120000) });
    if (!start.ok)
        throw Error(`headless_session_${start.status}`);
    const raw = await limitedText(start, 1100000);
    const { session, manifest, downloadUrl, expiresAt } = JSON.parse(raw);
    if (typeof session !== 'string' || session.length > 4096 || !Number.isFinite(expiresAt) || expiresAt <= Date.now())
        throw Error('invalid_session');
    const objects = validateManifest(manifest, accountId, workspaceId), url = new URL(downloadUrl);
    if (url.origin !== allowed.origin || url.protocol !== 'https:' || url.username || url.password)
        throw Error('untrusted_download_url');
    const cache = resolve(cacheDir), output = resolve(outputDir);
    if (output === cache || output.startsWith(cache + '/') || cache.startsWith(output + '/'))
        throw Error('overlapping_directories');
    await safeDirectory(cache);
    const namespace = join(cache, sha(JSON.stringify([accountId, workspaceId, manifest.format, manifest.version])));
    await safeDirectory(namespace);
    const missing = [];
    for (const o of objects.values())
        if (!await cacheRead(join(namespace, o.hash), o))
            missing.push(o.hash);
    let pending = missing, downloads = 0;
    for (let attempt = 0; pending.length; attempt++) {
        if (attempt > maxRetries || Date.now() >= expiresAt)
            throw Error('headless_transfer_incomplete');
        let response;
        try {
            response = await fetcher(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session, hashes: pending }), redirect: 'error', signal: AbortSignal.timeout(Math.max(1, Math.min(1800000, expiresAt - Date.now()))) });
        }
        catch (error) {
            if (attempt >= maxRetries)
                throw error;
            continue;
        }
        if ([429, 502, 503, 504].includes(response.status) && attempt < maxRetries) {
            await response.body?.cancel();
            await new Promise(resolve => setTimeout(resolve, Math.min(1000 * 2 ** attempt, 5000)));
            continue;
        }
        if (!response.ok)
            throw Error(`headless_download_${response.status}`);
        const reader = new Reader(response.body);
        let complete = false;
        try {
            const header = await reader.line();
            if (header.version !== 1 || header.snapshotId !== manifest.snapshotId || header.count !== pending.length)
                throw Error('invalid_stream_header');
            const remaining = new Set(pending);
            for (let i = 0; i < header.count; i++) {
                const item = await reader.line(), expected = objects.get(item.hash);
                if (!remaining.has(item.hash) || !expected || item.size !== expected.size)
                    throw Error('unexpected_object');
                const data = Buffer.alloc(item.size);
                let offset = 0;
                while (offset < data.length) {
                    const chunk = await reader.take(data.length - offset);
                    if (!chunk)
                        throw Error('truncated_stream');
                    data.set(chunk, offset);
                    offset += chunk.length;
                }
                if (sha(data) !== item.hash)
                    throw Error('object_checksum_mismatch');
                await save(join(namespace, item.hash), data);
                remaining.delete(item.hash);
                downloads++;
            }
            const end = await reader.line();
            if (end.end !== true || end.snapshotId !== manifest.snapshotId || end.count !== header.count || await reader.take(1) !== null)
                throw Error('invalid_stream_end');
            complete = true;
        }
        catch (error) {
            if (error.message !== 'truncated_stream' && !['TypeError', 'AbortError', 'TimeoutError'].includes(error.name) && error.message !== 'transfer_failed')
                throw error;
        }
        finally {
            await reader.reader.cancel().catch(() => { });
        }
        pending = [];
        for (const o of missing.map(h => objects.get(h)))
            if (!await cacheRead(join(namespace, o.hash), o))
                pending.push(o.hash);
        // A missing terminal marker is never accepted even when every object arrived.
        if (!complete && !pending.length)
            throw Error('missing_stream_end');
    }
    // Fresh generation, never merge with previous output (deleted articles/assets stay excluded).
    await safeDirectory(output);
    const generation = join(output, randomUUID());
    await safeDirectory(generation);
    try {
        const articles = [];
        for (const a of manifest.articles) {
            const body = await cacheRead(join(namespace, a.bodyHash), objects.get(a.bodyHash)), metadata = await cacheRead(join(namespace, a.metadataHash), objects.get(a.metadataHash));
            if (!body || !metadata)
                throw Error('cache_corrupt');
            articles.push({ ...a, metadata: JSON.parse(metadata), body: JSON.parse(body) });
        }
        await safeDirectory(join(generation, 'space-assets'));
        for (const a of manifest.assets) {
            const data = await cacheRead(join(namespace, a.hash), objects.get(a.hash));
            if (!data)
                throw Error('cache_corrupt');
            await writeFile(join(generation, 'space-assets', a.hash), data);
        }
        await writeFile(join(generation, 'content.json'), JSON.stringify({ snapshotId: manifest.snapshotId, format: manifest.format, articles, assets: manifest.assets }));
        return { snapshotDir: generation, manifest, diagnostics: { downloadedObjects: downloads, cacheHits: objects.size - missing.length } };
    }
    catch (e) {
        await rm(generation, { recursive: true, force: true });
        throw e;
    }
}
