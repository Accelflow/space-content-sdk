# Space build content SDK (unpublished)

Node 24 build-time client for the Headless batch stream. This standalone repository contains the SDK source and examples. The npm
package is not published; package versioning, license selection and release
automation are deferred. Do not import this SDK into browser bundles.

Run `examples/sync.mjs` from your site's root before `vite build` or `next build`.
Copy the example and change its SDK import to `@accelflow/space-content/node` after
installing a published package (or link this local package during development).
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

Current limits: 4,096 unique objects per batch, 64 MiB per object, 1 GiB total;
API publication adapter additionally limits assets to 16 MiB each. Retry count
is bounded (default 2). Larger manifest sharding, partial-object resume,
framework-specific adapters, cache GC and npm publication are follow-up work.

Tests: `npm test` from this repository root (no dependencies required).
Server, Worker and real-cloud integration tests remain in the Space service
repository; the tests here exercise the client with synthetic protocol fixtures.

## Full framework examples

See [Vite and Next.js examples](examples/README.md) for complete static builds,
CI cache handling, HTML rendering, asset headers and deployment boundaries.
