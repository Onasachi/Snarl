# GitHub to GitLab mirror

GitHub `Onasachi/Snarl` is the source repository. The `Mirror to GitLab`
workflow copies its branches and tags to `https://gitlab.com/Otaiki1/snarl.git`
after pushes and branch/tag creation or deletion. It can also be run manually
from GitHub Actions.

## Enable the mirror

1. Sign in to GitLab as `Otaiki1` and create a personal access token with the
   `write_repository` scope. Use the legacy token option if GitLab offers a token
   type selector. This scope supports Git pushes over HTTPS; API access is not
   required. Choose an expiry date and replace the secret when the token expires.
2. Open [the GitHub repository's Actions secrets](https://github.com/Onasachi/Snarl/settings/secrets/actions).
   Select **New repository secret**, name it `GITLAB_TOKEN`, and paste the GitLab
   token as its value. The workflow uses GitHub's automatic read-only
   `GITHUB_TOKEN` to read the source repository.
3. Commit `.github/workflows/mirror-to-gitlab.yml` and this guide, then push them
   to GitHub's `master` branch. After the secret is configured, pushes trigger the
   mirror automatically. For an initial sync or retry, open **Actions > Mirror to
   GitLab > Run workflow** and select `master`.
4. Check that the workflow succeeds and that GitLab's branches and tags match
   GitHub. Set GitLab's default branch to `master` after the initial sync if needed.

## How synchronization works

Each run reads the latest branches and tags directly from GitHub, including
their complete commit history. Runs are serialized. The workflow transfers the
original Git objects, preserving commit IDs, authors, dates, and messages.

GitHub is authoritative: GitHub history rewrites are copied, GitLab-only branches
and tags are removed, and GitLab changes to mirrored branches are overwritten.
Make project changes on GitHub and use GitLab as the mirror. The push is atomic:
if GitLab rejects any ref update, none of the requested ref updates are applied.
Only branch and tag refs are sent; local backup branches reach GitLab only if
they are first pushed to GitHub.

The GitLab repository owner remains `Otaiki1`. Commits retain their recorded
`Onasachi` author identity. To link them to the `Otaiki1` GitLab profile, add and
verify `samuelonanikechisom@gmail.com` in that profile's email settings.

## If a run fails

- **Missing secret or authentication failure:** confirm that `GITLAB_TOKEN` is
  present, unexpired, and belongs to a GitLab user allowed to push to this project.
- **Protected branch or tag rejection:** in GitLab **Settings > Repository >
  Branch rules**, allow the token owner's role to push to mirrored branches.
  Enable **Allowed to force push** for branches that must accept GitHub history
  rewrites. Protected tags can also block updates or deletion. Change only the
  rules needed for this mirror, then retry the workflow.
- **Attempt to delete GitLab's default branch:** set GitLab's default branch to a
  branch that still exists on GitHub, then retry.

The mirror becomes active only after the workflow is pushed to GitHub and the
GitLab secret is added. Repository settings, issues, and pull requests are managed
separately on each service.

## Frontend deployment

Connect Cloudflare Pages to the GitLab mirror to deploy after each mirrored push
to `master`. Follow [the Cloudflare Pages setup](cloudflare-pages.md) for the
exact build settings and frontend environment. Continue committing source changes
and pushing to GitHub; GitLab supplies Cloudflare's deployment source.

## References

- [GitLab personal access tokens](https://docs.gitlab.com/user/profile/personal_access_tokens/)
- [GitHub Actions secrets](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets)
- [GitLab protected branches](https://docs.gitlab.com/user/project/repository/branches/protected/)
