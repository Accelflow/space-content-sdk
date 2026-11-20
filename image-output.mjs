import {chmod, copyFile, lstat, mkdir, mkdtemp, readFile, realpath, rename, rm} from 'node:fs/promises';
import {dirname, join, resolve} from 'node:path';
import {parse} from 'smol-toml';

export const rasterImageTypes = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/avif']);
const relativeDirectory = /^[a-zA-Z0-9_-][a-zA-Z0-9_.-]*(?:\/[a-zA-Z0-9_-][a-zA-Z0-9_.-]*)*$/;

export async function readImageOutput(configPath) {
 const path = resolve(configPath ?? 'space-content.toml');
 let source;
 try {
  source = await readFile(path, 'utf8');
 } catch (error) {
  if (configPath === undefined && error.code === 'ENOENT') return;
  throw error;
 }
 const config = parse(source);
 if (!Object.hasOwn(config, 'images')) return;
 const images = config.images;
 if (!images || typeof images !== 'object' || Array.isArray(images)
     || Object.keys(images).some(key => !['output_dir', 'url_prefix'].includes(key))) {
  throw Error('Invalid [images] configuration');
 }
 const {output_dir: directory, url_prefix: prefix} = images;
 if (typeof directory !== 'string' || !relativeDirectory.test(directory.replace(/\/$/, ''))) {
  throw Error('[images].output_dir must be a project-relative directory');
 }
 if (typeof prefix !== 'string' || !prefix.startsWith('/') || !relativeDirectory.test(prefix.slice(1).replace(/\/$/, ''))) {
  throw Error('[images].url_prefix must be a root-relative URL directory');
 }
 const root = await realpath(dirname(path));
 return {root, segments: directory.replace(/\/$/, '').split('/'), prefix: prefix.replace(/\/$/, '') + '/'};
}

export async function publishImages(config, generation, articles, assets) {
 let directory = config.root;
 for (const segment of config.segments) {
  directory = join(directory, segment);
  await mkdir(directory, {mode: 0o755}).catch(error => {
   if (error.code !== 'EEXIST') throw error;
  });
  if (!(await lstat(directory)).isDirectory()) throw Error('unsafe_image_output_directory');
 }

 const paths = new Map();
 const published = assets.map(asset => {
  if (!rasterImageTypes.has(asset.contentType)) return asset;
  const publicUrl = config.prefix + asset.hash;
  paths.set('/space-assets/' + asset.hash, publicUrl);
  return {...asset, publicUrl};
 });

 // Stage files on the same filesystem, then rename each complete image into place.
 const stage = await mkdtemp(join(directory, '.space-images-'));
 try {
  for (const [source] of paths) {
   const hash = source.slice('/space-assets/'.length);
   const staged = join(stage, hash);
   await copyFile(join(generation, 'space-assets', hash), staged);
   await chmod(staged, 0o644);
   await rename(staged, join(directory, hash));
  }
 } finally {
  await rm(stage, {recursive: true, force: true});
 }

 for (const article of articles) {
  for (const key of ['coverImageUrl', 'ogpImageUrl']) {
   const path = paths.get(article.metadata?.[key]);
   if (path) article.metadata[key] = path;
  }
 }
 return published;
}
