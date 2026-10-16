# GitHub Pages release preparation

This is a static React + TypeScript + Vite build. It needs no server, API, database, application environment variables, secrets or runtime services. GitHub Actions builds the app and uploads only `dist/` as the Pages artifact. Session data stays in browser memory and is lost on reload.

## Prepared workflow

[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) follows Vite's current [GitHub Pages guidance](https://vite.dev/guide/static-deploy.html): it runs on pushes to `main` and manual dispatch, uses `npm ci`, builds with the Node version pinned in `.node-version` (`22.23.3`), uploads `./dist`, then deploys with GitHub's Pages actions. Its only token permissions are `contents: read`, `pages: write` and `id-token: write`; it stores no credentials in this repository.

Before its first run, set the repository's Settings → Pages → Build and deployment source to **GitHub Actions**. A push to `main` will then publish automatically, so both enabling Pages and pushing this workflow are deployment actions that require explicit approval.

## Base path

Vite must build asset paths for the final Pages URL:

| Hosting URL | Required Vite base |
| --- | --- |
| `https://<owner>.github.io/<repository>/` | `/<repository>/` |
| `https://<owner>.github.io/` from an `<owner>.github.io` repository | `/` |
| A verified custom domain | `/` |

The workflow derives that path from GitHub's repository name at build time and supplies it as `VITE_BASE_PATH`. `vite.config.ts` defaults to `/` when the variable is absent, preserving local development, Vite preview and LAN HTTP testing. The repository owner and final repository name are not known yet, so no URL is hard-coded in source. For a custom-domain deployment, change the workflow's base-path step to write `VITE_BASE_PATH=/` before the first publish.

## GitHub Pages limitations

GitHub Pages serves this static site but does not interpret Cloudflare's `public/_headers` format. That file has been removed rather than shipped as an ineffective response-header configuration. GitHub Pages does not provide project-level configuration for the CSP, Permissions-Policy, `X-Frame-Options`, `X-Content-Type-Options` or `Referrer-Policy` headers previously prepared for Cloudflare. Do not claim those headers are active on the Pages site or add meta-tag substitutes as equivalent protections. HTTPS is provided for the default `github.io` URL; review custom-domain HTTPS separately if one is chosen.

The app has no URL-based client routes, so it needs no redirect, 404 fallback, service worker, serverless function or API route. The private reveal UI prevents casual on-screen exposure during play; it does not hide browser memory or the offline word library from someone using developer tools. There are no application credentials in the bundle. Dependency audits are point-in-time checks, not guarantees against unknown vulnerabilities.

## Steps after approval

1. Review and commit the approved V1, audit and GitHub Pages preparation changes. No release commit has been created by this task.
2. Choose/create the GitHub repository and its visibility, then provide or authorize its remote. Do not substitute an unknown owner, repository name or custom domain.
3. If the repository will be a project site, confirm its name; the workflow will build `/<repository>/`. If it will be an `<owner>.github.io` site or custom domain, confirm that so the base-path rule can be reviewed before publishing.
4. Add the authorized remote and push `main` only with explicit approval. In GitHub Settings → Pages, select **GitHub Actions** as the source. This enables the workflow and publishing.
5. After an authorized deployment, verify the HTTPS URL, asset paths under the selected base, console, full three-player Quick session and a Double Trouble session. Repeat on physical iOS Safari and Android, and verify keyboard and screen-reader use.

No GitHub remote, owner, repository, Pages configuration, custom domain, commit, push or deployment exists at the time of this preparation.
