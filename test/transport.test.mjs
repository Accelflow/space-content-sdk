import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { syncContent } from '../node.mjs';
const sha = b => createHash('sha256').update(b).digest('hex');
const frame = v => Buffer.from(JSON.stringify(v) + '\n');
function fixture() {
    const body = Buffer.from('"hello"'), metadata = Buffer.from('{}');
    const objects = [body, metadata].map(b => ({ hash: sha(b), size: b.length }));
    const fixed = { version: 1, accountId: 'a', workspaceId: 'w', format: 'html', articles: [{ id: 'a', slug: 'a', title: 'A', bodyHash: objects[0].hash, metadataHash: objects[1].hash }], assets: [], objects };
    const manifest = { ...fixed, snapshotId: sha(JSON.stringify(fixed)) };
    return { body, metadata, objects, manifest };
}
test('SDK retries only verified-missing objects after a truncated stream', async () => {
    const { body, metadata, objects, manifest } = fixture();
    const dir = await mkdtemp(join(tmpdir(), 'headless-resume-'));
    let downloads = 0;
    let selections = [];
    try {
        const result = await syncContent({ apiUrl: 'https://api.test', downloadOrigin: 'https://download.test', accountId: 'a', workspaceId: 'w', token: 'secret', cacheDir: join(dir, 'cache'), outputDir: join(dir, 'out'), fetch: async (url, init) => {
                if (new URL(url).hostname === 'api.test')
                    return Response.json({ session: 'ticket', expiresAt: Date.now() + 60000, downloadUrl: 'https://download.test/download', manifest });
                const hashes = JSON.parse(init.body).hashes;
                selections.push(hashes);
                downloads++;
                const selected = hashes.map(h => objects.find(o => o.hash === h));
                const chunks = [frame({ version: 1, snapshotId: manifest.snapshotId, count: selected.length })];
                for (const o of selected) {
                    chunks.push(frame(o), o.hash === objects[0].hash ? body : metadata);
                    if (downloads === 1)
                        break;
                }
                if (downloads > 1)
                    chunks.push(frame({ end: true, snapshotId: manifest.snapshotId, count: selected.length }));
                return new Response(Buffer.concat(chunks));
            } });
        assert.equal(downloads, 2);
        assert.deepEqual(selections[1], [objects[1].hash]);
        assert.equal(result.diagnostics.downloadedObjects, 2);
    }
    finally {
        await rm(dir, { recursive: true, force: true });
    }
});
for (const mode of ['hash', 'end', 'origin'])
    test(`SDK rejects ${mode} corruption without publishing output`, async () => {
        const { body, metadata, objects, manifest } = fixture();
        const dir = await mkdtemp(join(tmpdir(), 'headless-invalid-'));
        try {
            await assert.rejects(syncContent({ apiUrl: 'https://api.test', downloadOrigin: 'https://download.test', accountId: 'a', workspaceId: 'w', token: 'secret', cacheDir: join(dir, 'cache'), outputDir: join(dir, 'out'), fetch: async (url) => {
                    if (new URL(url).hostname === 'api.test')
                        return Response.json({ session: 'ticket', expiresAt: Date.now() + 60000, downloadUrl: mode === 'origin' ? 'https://evil.test/download' : 'https://download.test/download', manifest });
                    const chunks = [frame({ version: 1, snapshotId: manifest.snapshotId, count: 2 }), frame(objects[0]), mode === 'hash' ? Buffer.from('"xxxxx"') : body, frame(objects[1]), metadata];
                    if (mode !== 'end')
                        chunks.push(frame({ end: true, count: 2, snapshotId: manifest.snapshotId }));
                    return new Response(Buffer.concat(chunks));
                } }), new RegExp(mode === 'origin' ? 'untrusted_download_url' : mode === 'hash' ? 'object_checksum_mismatch' : 'missing_stream_end'));
        }
        finally {
            await rm(dir, { recursive: true, force: true });
        }
    });
