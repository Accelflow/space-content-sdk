# Vite / Next.js static sites

These two examples fetch published Space content during a Node build, then export
static pages. The browser never receives the Build token or calls the Build API.
They use the repository SDK directly; `@accelflow/space-content` is not published
on npm yet. Node 24 or later is required. Each example is a standalone npm project
with a committed lockfile, independent of the root package.

## Build

Enable Headless with **HTML** in the workspace, then issue a read-only Build token.
Configure these values in your CI secret/environment settings:

| Variable | Meaning |
| --- | --- |
| `SPACE_API_URL` | Build API origin |
| `SPACE_DOWNLOAD_ORIGIN` | Allowed HTTPS download Worker origin |
| `SPACE_ACCOUNT_ID` | Account identifier |
| `SPACE_WORKSPACE_ID` | Workspace identifier |
| `SPACE_BUILD_TOKEN` | Secret Bearer token; never use a `VITE_` or `NEXT_PUBLIC_` prefix |
| `SPACE_CACHE_DIR` | Optional persistent SDK cache path; defaults to `.space-cache` in the sample |

From `vite-site` or `next-site`:

```sh
npm ci --workspaces=false --ignore-scripts --include=dev
npm run build
```

Publish only `vite-site/dist` or `next-site/out` with the static host's directory
index and 404 handling. Do not publish `.env`, `.generated`, `.space-cache`,
`.space-build`, `.next`, or the repository root. The examples render `/` and
`/articles/<slug>/`, title and description, HTML body, and copied attachments.
Navigation labels can be switched between Japanese and English; the selection
persists locally. Article text is preserved as authored.

`shared/sync.mjs` runs before the framework build. A failed download or invalid
snapshot stops the build; previous generated content is never silently deployed.
Next uses `output: 'export'` and `generateStaticParams`; Vite generates HTML inputs
before its multi-page build. See [Next static exports](https://nextjs.org/docs/app/guides/static-exports)
and [Vite production builds](https://vite.dev/guide/build).

## Differential builds

Restore `.space-cache` before building and save it after a successful build.
Partition CI cache keys by account, workspace and SDK/cache format version; allow
fallback to the latest successful cache in that same partition. A key containing
only the current commit without a restore prefix forces cold downloads. Cache
access must be restricted to trusted builds because it contains published content.
Never put the token in a cache key or persist `.env` alongside the cache.

A persistent build server is optional: restoring this cache on an ephemeral runner
has the same differential behavior. The manifest is fetched each time; verified
cached objects are reused. Unchanged content downloads zero objects. Local file
corruption is checked by hash and repaired. A fresh generated output replaces the
previous published pages and attachment directory, so deleted/unpublished articles
and old slugs do not survive in the output. Upload deployments atomically or use a
host that removes files absent from the new artifact; an additive upload alone
would retain removed pages on the host.

## Rendering boundaries

- The core SDK supports HTML and JSON. These examples render HTML only and stop
  with a clear error for a JSON workspace; add a document JSON renderer for that mode.
- Slugs accept letters, numbers, hyphens and underscores, including Unicode and
  nested path segments. Empty, dot, traversal and query segments are rejected.
  Duplicate routes are rejected before rendering.
- Body HTML comes from the Space publication renderer. Article-to-article links
  are preserved as authored; configure them for the target site's route scheme.
- Asset paths use content hashes. Generated `_headers` supplies MIME types and
  `nosniff` for Cloudflare Pages. Other static hosts need equivalent header rules,
  especially for extensionless asset paths.
- Next 16 static export needs a parameter even when no articles are published.
  The empty publication emits a `__space_empty__` route through `notFound()`;
  it is never linked from the index and contains no withdrawn article content.
- These are integration examples, not a hosted customer site or a published SDK.
  Cloud acceptance and production activation are separate release gates.
