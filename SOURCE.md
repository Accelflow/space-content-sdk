# Source extraction

Extracted from the Space Headless SDK at commit `1a825865bc69e82d9c5240abbaede01cbf5c9ed2`.
The SDK runtime, type declarations and example application source were copied
without behavior changes. Worker/storage tests remain with the server; client
protocol tests here use synthetic fixtures and have no server-source imports.

This repository is the source of truth for future SDK changes. During the npm
release transition, Space retains its original SDK copy for existing integration
tests. Do not independently develop both copies; update the service consumer
through an explicit, reviewed source import until a versioned package is available.

No service infrastructure, deployment credentials, real content, generated build
output or source-repository Git history is included. The initial npm package is prepared as `0.1.0-beta.1` under MIT; it has not yet been published.

TOC presentation, declarations, CSS and tests were imported from Space commit
`b7a8b3f2608f0806b82374fc2e284eb8a5a01247`. Node runtime and declarations remain
byte-identical to that revision. This explicit import reconciles changes made
in Space during the extraction transition. Future SDK changes belong here.
