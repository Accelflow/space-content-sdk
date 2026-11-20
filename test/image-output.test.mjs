import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp, readFile, rm, writeFile, mkdir, symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {test} from 'node:test';
import {syncContent} from '../node.mjs';
import {renderArticleBody} from '../render.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const frame = value => Buffer.from(JSON.stringify(value) + '\n');
const config = '[images]\noutput_dir = "public/images/space"\nurl_prefix = "/images/space/"\n';

async function fixture(t, format = 'json') {
 const dir = await mkdtemp(join(tmpdir(), 'space-sdk-image-output-'));
 t.after(() => rm(dir, {recursive: true, force: true}));
 const configPath = join(dir, 'space-content.toml');
 const image = Buffer.from('image fixture'), pdf = Buffer.from('pdf fixture');
 const imageHash = hash(image), pdfHash = hash(pdf);
 const original = '/space-assets/' + imageHash, newUrl = '/images/space/' + imageHash;
 const metadata = {coverImageUrl: original, ogpImageUrl: original, excerpt: original};
 const body = format === 'html'
  ? `<img src="${original}" alt="GraphRAG"><a href="/space-assets/${pdfHash}">PDF</a><p>${original}</p>`
  : {type: 'doc', content: [
    {type: 'attachment', attrs: {attachmentId: 'image', alt: 'GraphRAG'}},
    {type: 'image', attrs: {src: original, alt: 'Inline'}},
    {type: 'attachment', attrs: {attachmentId: 'pdf'}},
    {type: 'paragraph', content: [{type: 'text', text: original}]},
   ]};
 const bytes = [image, pdf, Buffer.from(JSON.stringify(body)), Buffer.from(JSON.stringify(metadata))];
 const objects = bytes.map(data => ({hash: hash(data), size: data.length}));
 const fixed = {
  version: 1, accountId: 'a', workspaceId: 'w', format, objects,
  articles: [{id: 'a', slug: 'a', title: 'A', bodyHash: objects[2].hash, metadataHash: objects[3].hash}],
  assets: [
   {id: 'image', hash: imageHash, contentType: 'image/png', filename: 'image.png'},
   {id: 'pdf', hash: pdfHash, contentType: 'application/pdf', filename: 'file.pdf'},
  ],
 };
 const manifest = {...fixed, snapshotId: hash(JSON.stringify(fixed))};
 const options = {
  apiUrl: 'https://api.test', downloadOrigin: 'https://download.test', accountId: 'a', workspaceId: 'w',
  token: 'test-only', cacheDir: join(dir, 'cache'), outputDir: join(dir, 'build'), configPath,
  fetch: async (url, init) => {
   if (url.hostname === 'api.test') return Response.json({
    session: 'test', manifest, downloadUrl: 'https://download.test/session', expiresAt: Date.now() + 60_000,
   });
   const selected = JSON.parse(init.body).hashes.map(digest => objects.findIndex(object => object.hash === digest));
   const count = selected.length, snapshotId = manifest.snapshotId;
   return new Response(Buffer.concat([
    frame({version: 1, count, snapshotId}),
    ...selected.flatMap(i => [frame(objects[i]), bytes[i]]),
    frame({end: true, count, snapshotId}),
   ]));
  },
 };
 return {dir, configPath, options, manifest, image, original, newUrl, imageHash, pdfHash, body};
}

for (const format of ['html', 'json']) {
 test(`TOML image output updates the ${format} body, listing cover and social image`, async t => {
  const f = await fixture(t, format);
  await writeFile(f.configPath, config);
  const result = await syncContent(f.options);
  const content = JSON.parse(await readFile(join(result.snapshotDir, 'content.json')));
  const [article] = content.articles;
  assert.deepEqual(result.manifest, f.manifest);
  assert.deepEqual(await readFile(join(f.dir, 'public/images/space', f.imageHash)), f.image);
  assert.deepEqual(article.metadata, {coverImageUrl: f.newUrl, ogpImageUrl: f.newUrl, excerpt: f.original});
  const html = renderArticleBody(article.body, {assets: content.assets});
  assert.ok(html.includes(`src="${f.newUrl}" alt="GraphRAG"`));
  if (format === 'json') assert.ok(html.includes(`src="${f.newUrl}" alt="Inline"`));
  assert.ok(html.includes(`href="/space-assets/${f.pdfHash}"`));
  assert.ok(html.includes(`<p>${f.original}</p>`));
  await assert.rejects(readFile(join(f.dir, 'public/images/space', f.pdfHash)), {code: 'ENOENT'});
  const repeated = await syncContent(f.options);
  assert.equal(repeated.diagnostics.downloadedObjects, 0);
 });
}

test('a missing default config preserves the original snapshot and render URLs', async t => {
 const f = await fixture(t);
 const {configPath, ...options} = f.options;
 const result = await syncContent(options);
 const content = JSON.parse(await readFile(join(result.snapshotDir, 'content.json')));
 assert.deepEqual(content.assets, f.manifest.assets);
 assert.deepEqual(content.articles[0].body, f.body);
 assert.equal(content.articles[0].metadata.ogpImageUrl, f.original);
 assert.deepEqual(await readFile(join(result.snapshotDir, 'space-assets', f.imageHash)), f.image);
 assert.ok(renderArticleBody(f.body, {assets: content.assets}).includes(`src="${f.original}"`));
});

test('invalid configuration rejects before fetching and symlinked publication paths are rejected', async t => {
 const f = await fixture(t);
 for (const invalid of [
  config.replace('/images/space/', '//example.com/'),
  config.replace('public/images/space', '../outside'),
  config.replace('url_prefix', 'url_prefx'),
  '[images]\noutput_dir = "public/images/space"\n',
 ]) {
  await writeFile(f.configPath, invalid);
  await assert.rejects(syncContent({...f.options, fetch: () => assert.fail('config should fail before fetch')}), /images/);
 }
 await writeFile(f.configPath, config);
 await mkdir(join(f.dir, 'target'));
 await symlink(join(f.dir, 'target'), join(f.dir, 'public'));
 await assert.rejects(syncContent(f.options), /unsafe_image_output_directory/);
});
