# Space build content SDK

Node 24+ build-time content synchronization for Space Headless CMS, with optional browser-safe table-of-contents presentation. Licensed under MIT.

The beta package is available on npm.

```sh
npm install @accelflow/space-content@beta
```

```js
import { syncContent } from '@accelflow/space-content/node';
```

Run content synchronization before your site's build. The `/node` entry is server-only; never include it or a Workspace token in a browser bundle.

Use `SPACE_API_URL`, `SPACE_DOWNLOAD_ORIGIN`, `SPACE_ACCOUNT_ID`,
`SPACE_WORKSPACE_ID`, `SPACE_BUILD_TOKEN` as server-only environment variables.
IDs are stable account/workspace IDs, not slugs. `.space-cache`, `.space-build`,
`.generated` must be ignored by Git and excluded from public deployment except
for the intentionally generated content consumed by the site.

`syncContent()` returns a fresh `snapshotDir` with `content.json` and
`space-assets/<sha256>`. `content.json` contains selected HTML **or** structured
JSON, title, slug, article metadata and an attachment ID/hash/MIME mapping.
HTML attachment references use `/space-assets/<sha256>`; serve these files with
the indicated MIME types. JSON rendering must resolve attachment IDs through
that mapping. Internal article links retain published paths; the site's route
mapping must match or transform them. Place static assets at the domain root,
or rewrite those URLs for a subpath deployment.

Vite integration: run sync as the first build script, import the generated JSON,
and render it using the site's SSG/prerender tool. Vite alone does not create
article HTML pages. Next.js integration: import generated JSON in server build
code, use its article slugs in `generateStaticParams`, metadata in
`generateMetadata`, and render the chosen body format. Plain Node integration
keeps both frameworks independent of SDK-specific runtime plugins.

The cache directory must be private and trusted, with no untrusted ancestor
symlinks. Share it only among trusted builds for this environment. Content is
hash-verified on every reuse and namespaced by account/workspace/format/schema.
Each build gets a new output generation; removed articles/assets are excluded.
Do not glob the cache as public content. Cache/output cleanup is the CI owner's
responsibility and must not remove running jobs' files.

A build and each new batch connection are authorized. An admitted stream may
finish after token deletion, up to its deadline. Reconnecting requires current
authorization. Verified complete objects survive a transport retry; partial
objects restart. Missing terminal markers, checksum failures, foreign objects,
or schema errors fail the build. No stale/offline fallback is used.

Transport limits: 4,096 unique objects per snapshot, 250,000,000 bytes per object,
1 GiB per snapshot. Space applies the effective plan at upload (Free 10 MB, Team
50 MB, Enterprise 250 MB, decimal bytes). Delivery accepts those admitted files;
it does not re-count them as new storage usage or apply a lower per-file quota.
The snapshot budget is a separate operational limit. Large objects stream to disk;
complete objects are hash-verified before cache reuse. Partial objects restart on
retry (default 2 retries). Cache GC and snapshot sharding remain host responsibilities.
Large attachments require the matching Space delivery service update.

Tests: `npm ci --ignore-scripts` then `npm test` from this repository root.
Server, Worker and real-cloud integration tests remain in the Space service
repository; the tests here exercise the client with synthetic protocol fixtures.

## Full framework examples

See [Vite and Next.js examples](examples/README.md) for complete static builds,
CI cache handling, HTML rendering, asset headers and deployment boundaries.

## Table of contents

The browser-safe entry is separate from the authenticated Node client:

```js
import { mountTableOfContents } from '@accelflow/space-content/toc';
import '@accelflow/space-content/toc.css';

const cleanup = mountTableOfContents(articleElement, { locale: 'ja' });
// Call cleanup when replacing the article or unmounting the component.
```

The default presentation is expanded on desktop and collapsed on mobile. Clicking a mobile link closes it. Titles are localized and omitted from their own entries. Use `title`, `maxLevel`, `desktopOpen`, `mobileOpen`, `mobileQuery`, or `render` to customize it. Styles are optional; see `toc.d.mts` for the complete interface.

In Next.js, use this browser entry in a client component effect and return the cleanup function. Keep `syncContent` in build/server code. Both Vite and Next.js use the same package.

## Release preparation

See [RELEASING.md](RELEASING.md) for packaging checks, initial publication and OIDC setup.

## JSON and HTML rendering

```js
import {renderArticleBody} from '@accelflow/space-content/render';
const html = renderArticleBody(article.body, {
  assets: content.assets, locale: 'ja', pdfMode: 'link',
  renderers: {paragraph: ({children}) => `<p>${children}</p>`},
});
```

Use this Node/build-time entry for both JSON (default) and legacy HTML. It renders
headings, TOC, formatting, lists, tables, columns, links, images and attachment
IDs, then sanitizes all output, including custom renderer output. Callbacks are
trusted application code, never stored executable templates. Unknown nodes retain
safe children. Dynamic smart links fall back to their label; supply a custom
renderer for application-specific behavior. Use `resolveArticle` and
`resolveSubArticles` for routes and child navigation.

PDFs default to download links. `pdfMode: 'embed'` permits only local PDF paths
listed in the manifest, with an empty sandbox and no referrer, plus a download
link. Browser PDF viewers may not work in a sandbox; the link remains available.
Arbitrary iframes, scripts, event handlers, inline styles, SVG and unsafe URLs
are removed. JSON is not inherently trusted. The browser-only TOC module and its
responsive CSS can be used unchanged with rendered JSON.

Serve copied assets with their manifest MIME and `X-Content-Type-Options: nosniff`.
Force Content-Disposition attachment for non-raster, non-PDF types (especially
HTML/SVG); they must never execute at the site's origin. The examples emit those
headers for Cloudflare-style hosts; configure equivalent rules on other hosts.
