# Deploy the frontend from the GitLab mirror

The deployment flow is:

```text
Commit locally and push to GitHub Onasachi/Snarl (master)
  -> GitHub Actions mirrors branches and tags to GitLab Otaiki1/snarl
  -> Cloudflare Pages builds the GitLab master branch
  -> Cloudflare publishes dist/ after all frontend checks pass
```

Connect Cloudflare Pages to the **GitLab** repository. Its native Git integration
receives the mirror's GitLab pushes and deploys automatically. Keep editing and
pushing through GitHub; make source changes in this repository so the mirror
preserves them.

## One-time Cloudflare setup

After the current changes are committed, push `master` to GitHub and wait for
**Actions > Mirror to GitLab** to succeed.

In the [Cloudflare dashboard](https://dash.cloudflare.com/), open **Workers &
Pages > Create application > Pages > Connect to Git**. Connect the GitLab account
that owns `Otaiki1/snarl` and select that repository. The account needs Maintainer
or Owner access. If a Pages project already uses this GitLab repository, update
its build settings instead of creating another project.

Use these settings:

| Setting | Value |
| --- | --- |
| Framework preset | Vite |
| Production branch | `master` |
| Root directory | Leave blank (repository root) |
| Build command | `pnpm install --frozen-lockfile && pnpm run build:cloudflare` |
| Build output directory | `dist` |
| Build system | v3 |
| Build variable `PNPM_VERSION` | `10.33.0` |
| Build variable `SKIP_DEPENDENCY_INSTALL` | `1` |

The root `.node-version` pins Node.js to `24.11.1`; `package.json` pins pnpm to
`10.33.0`. Set `PNPM_VERSION` explicitly because Pages does not infer pnpm's
version from the lockfile. Automatic dependency installation is skipped so the
build command installs exactly the versions in `pnpm-lock.yaml` once, using the
frozen lockfile. Keep development dependencies enabled: TypeScript, Vite and the
checks are build dependencies.

`build:cloudflare` runs lint, the frontend test suite, the TypeScript check and the
Vite production build. A failed check stops the new deployment. Contract scripts
are not run by the frontend build.

Enable automatic production deployments for `master`. Preview deployments on
other branches are optional; disable them if only the production site is needed.
Select **Save and Deploy** after confirming these settings. Use the HTTPS URL
Cloudflare assigns to the project, or attach the project's custom domain.

## Frontend environment

The committed root `.env` contains public Vite build settings, including the
deployed Celo contract addresses and Web3Auth's public client ID. Cloudflare's
build reads this file. The current production values include:

```dotenv
VITE_GOODDOLLAR_ENV=production
VITE_SNARL_TRAILS=0xF55E8f7330B89659c7B835eA1043657A45393bdA
```

Cloudflare build variables override `.env`. If an existing Pages project already
has `VITE_` variables, check that they match this release, especially the two
values above. The other existing contract addresses remain configured in `.env`.

The existing Web3Auth client ID is paired with `VITE_WEB3AUTH_NETWORK=sapphire_devnet`.
The hosting setup preserves that pair. To use Sapphire Mainnet, create/select the
matching Web3Auth project and change **both** the client ID and network before
rebuilding. Add the final Pages/custom-domain origin to that Web3Auth project's
allowed origins before testing email or social login. Preview origins need their
own allowance if social login is tested on previews.

`VITE_` values are embedded into browser JavaScript. Deployment private keys,
GitLab tokens and Cloudflare API tokens do not belong in these settings. The native
Cloudflare/GitLab connection handles deployment authentication; the existing
`GITLAB_TOKEN` GitHub secret is still used only by the mirror workflow.

## Verify the first deployment

1. Confirm the GitHub mirror job succeeds for the pushed commit.
2. Confirm that commit appears on GitLab's `master` branch.
3. In Cloudflare Pages, confirm the deployment for the same commit succeeds and
   publishes the `dist` output. Check the build log for completed checks.
4. Open the HTTPS deployment URL and check guest play, the pond, a page refresh,
   and mobile layout. Test the wallet and social login from the real deployment
   origin with the configured Web3Auth project.

Cloudflare Pages serves this React app with its default SPA fallback; no custom
redirect or Worker is needed. The production wallet and marketplace acceptance
steps are in [the mainnet deployment guide](MAINNET_DEPLOY.md#5-test-the-production-url-with-real-wallets).

## Changes that still appear in git status

Pushing sends commits, not uncommitted edits or untracked files. Review and commit
the files that belong to a release before pushing. `git status --short` should
then be empty, apart from any deliberate local work. `dist/`, dependencies, local
environment overrides and contract build artifacts remain ignored.

## References

- [Cloudflare Pages Git integration](https://developers.cloudflare.com/pages/get-started/git-integration/)
- [GitLab integration and automatic deployments](https://developers.cloudflare.com/pages/configuration/git-integration/gitlab-integration/)
- [Build tools and version overrides](https://developers.cloudflare.com/pages/configuration/build-image/)
- [SPA routing](https://developers.cloudflare.com/pages/configuration/serving-pages/#single-page-application-spa-rendering)
