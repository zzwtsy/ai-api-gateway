---
name: version-release
description: Prepare synchronized project versions, release commits, assets, tags, GHCR images, or GitHub Releases for ai-api-gateway. Use for version or release requests; require separate explicit authorization for the target version, push, merge, and remote dispatch.
---

# Version Release

Treat a release as a verified transaction over one project version and one commit. The root `package.json` owns the version; Git tag `v<version>` identifies the released commit.

## Sources of truth

- [Versioning and release convention](../../../docs/conventions/versioning-and-release.md)
- [Quality gates and evidence](../../../docs/conventions/quality-gates-and-evidence.md)
- [Repository activation checklist](../../../docs/checklists/repository-activation.md)
- [Release workflow](../../../.github/workflows/release.yml)

Do not infer a version from commit types. The user must explicitly confirm the target SemVer. Preparing a version or Release Commit does not authorize push, merge, tag creation, workflow dispatch, image publication, or GitHub Release creation.

## Modes

### Prepare a version

1. Confirm the explicit target and ensure it is greater than the current root version.
2. Run `pnpm version:set -- <version>`.
3. Write the Chinese CHANGELOG entry manually with current semantic groups; do not generate it from Git history.
4. Run `pnpm verify:project-version` and the relevant source checks.
5. Review the complete version projection diff. Do not commit unless asked.

### Prepare a Release Commit

Use `$git-commit` after version preparation. The exact subject must be `chore(release): v<version>`. Then run `pnpm release:assets -- <version> --check` against that committed identity. A Release Commit still carries no remote authorization.

### Publish remotely

Read [release transaction](references/release-transaction.md) before any push, merge, or manual workflow dispatch. Require separate user authorization at each externally mutating boundary. Dispatch only from the exact `main` commit whose primary CI succeeded. Never create or move a local/remote tag to work around the workflow.

If a release partially succeeds, retry only the same version and commit. The GHCR `<version>` and `sha-<commit>` tags must both be absent or resolve to the same manifest before an image push; an asymmetric result, conflicting digest, or lookup error fails closed. Also fail closed when an existing Git tag resolves to another commit. Never delete or rewrite a published version automatically.
