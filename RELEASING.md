# npm release

The current update is `@accelflow/space-content@0.1.0-beta.2`, MIT, Node 24+.
Beta.1 was published and registry-verified. `publishConfig.tag` is intentionally `beta`.

1. Run `npm test` and `npm run verify:package`. The latter installs the actual
   tarball into an isolated consumer, runs protocol/TOC tests against package
   exports and builds both framework examples with synthetic JSON content and HTML sanitizer fixtures.
   This is packaging acceptance, not a new live API acceptance run.
2. Review the allowlisted npm allowlist, license, README and source commit.
3. Authenticate an npm maintainer interactively and verify ownership of the
   `@accelflow` scope. Recheck `npm whoami`; CLI sessions can expire. A registry 404
   does not establish ownership or permission to publish the proposed name.
4. For initial package registration, publish the reviewed beta from the exact
   release commit with `npm publish --access public --tag beta`. Complete any
   npm authentication/2FA prompts as the account owner.
5. In npm package settings, configure GitHub Actions Trusted Publishing for
   `Accelflow/space-content-sdk`, workflow `publish.yml`, environment `npm`,
   with direct publish permission. Configure the GitHub environment's release
   gate before enabling it. Do not store a long-lived npm publish token.
6. For subsequent releases, update the version, verify, merge and create the
   matching Git tag. Dispatch the publish workflow with that reviewed tag.
   It verifies package/version and tests before OIDC publication.
7. Verify the registry version, integrity and provenance; install it in a clean
   Vite/Next consumer and run the content build. For a stable release, remove
   the prerelease version and explicitly change `publishConfig.tag` to `latest`.

Workspace Bearer tokens authenticate content retrieval, not npm publication.
They do not belong in this repository, npm package, or browser bundles.

Reference: https://docs.npmjs.com/trusted-publishers/
