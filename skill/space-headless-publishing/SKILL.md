---
name: space-headless-publishing
description: Configure an Accelflow Space workspace as a Headless CMS and connect its published content to a site's Node build, optionally dispatching a GitHub Actions workflow when content is published.
---

# Space Headless publishing

## Set up the workspace and build

1. Identify the Space account and workspace, the site's repository and public URL, and the intended build environment. Check which articles should be published, their existing routes, and whether each environment should use the latest saved content or an explicit publication.
2. In **Workspace settings → Publish**, select **Headless** and the required publication scope and timing. Set the **CMS URL** to the site URL that serves those articles. Select **JSON** for SDK rendering or **HTML** when required by the consumer. Preserve the existing route mapping, including nested paths. Save and read back the settings.
3. Under **Headless API tokens**, issue a dedicated token for that workspace and build environment. Use a descriptive name and track the expiry. Transfer the value directly to the CI secret store while Space displays it. Renew it before expiry and retire the old token after the replacement works.
4. Configure the Node build using the [SDK README](https://github.com/Accelflow/space-content-sdk#readme). Use the trusted Build API and download origins, stable account and workspace IDs, and the secret mapped to `SPACE_BUILD_TOKEN` for the sync step. Keep it out of browser-prefixed environment variables, workflow inputs, logs, caches, source control and static output. Run sync before the framework build. Verify article paths, metadata, asset MIME types, and image sizing against the intended publication. Fail the build on missing or invalid content when it would remove existing pages.

## Connect GitHub dispatch

- GitHub Actions can fetch content with the build token independently. Enable **GitHub publishing** when Space publication should start an Actions run.
- Verify that the **Accelflow Space Publishing** GitHub App is installed on the specific destination repository. Use selected-repository access. A Space workspace administrator and a GitHub repository administrator are required for setup.
- Prepare the destination workflow on the repository's default branch. It must accept the string inputs `target_id` and `event_id` through `workflow_dispatch`. Use the SDK integration examples below for content sync. The workflow must make duplicate dispatches safe and validate the publication before deploying. When using Space publication receipts, have the controller use GitHub OIDC and call `prepare` for the event, `validate` immediately before deployment, and `complete` after verifying the deployed snapshot. Scope `id-token: write` to the controller job. Keep hosting credentials within the deployment job.
- In **Workspace settings → Publish → GitHub publishing**, choose **Connect to GitHub**. Authorize the GitHub identity, select the verified repository, workflow and default branch, save, and read back the connection.
- Check the Actions run and its snapshot identity when testing an authorized publication. Verify the resulting site separately if deployment is part of the task. A saved connection, a GitHub run and a deployed snapshot are distinct states. If the repository is missing from the selector, check the app installation's repository access; if the workflow is missing, check the default branch and dispatch inputs.

Use the [SDK examples](https://github.com/Accelflow/space-content-sdk/blob/main/examples/README.md) for Vite or Next.js builds and packaging of generated content and assets.
