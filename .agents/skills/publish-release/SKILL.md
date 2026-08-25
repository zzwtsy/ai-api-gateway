---
name: publish-release
description: Publish a prepared ai-api-gateway version by executing separately authorized push, merge, or release-workflow dispatch boundaries and verifying the tag, GHCR image, and GitHub Release. Use only after version files and the Release Commit exist; do not choose a version, edit source, or prepare or create commits.
---

# Publish a release

A release is a remote transaction bound to one explicit SemVer and one explicit commit. The root version, projections, CHANGELOG, Release Commit subject, Git tag, GHCR image, and GitHub Release must identify the same release.

## Sources of truth

- [Versioning and release convention](../../../docs/conventions/versioning-and-release.md)
- [Release Workflow](../../../.github/workflows/release.yml)
- [Release transaction](references/release-transaction.md)

## Boundary

Do not choose the target version, edit version files or CHANGELOG, create or repair commits, change source, or resolve merge conflicts automatically. Version selection, push, merge, and workflow dispatch are separate authorization boundaries; execute only the specific boundary the user has authorized.

## Workflow

1. Read [Release transaction](references/release-transaction.md); confirm the target SemVer, exact commit, current branch, and authorization for this step.
2. Verify the release identity, target `main` head, Primary CI for that SHA, existing tag, and both GHCR tags from current GitHub and Registry state.
3. Fail closed on any identity conflict, uncertain lookup, non-successful CI, uncommitted release changes, or a commit that is not the target `main` identity.
4. Execute only the authorized push, merge, or manual dispatch. Re-read remote state after every external mutation.
5. After dispatch, monitor that exact workflow run and verify the image, annotated tag, GitHub Release, and deterministic assets.
6. After partial success, retry only the same version and SHA. Never delete, move, overwrite, or rewrite a published identity automatically.

## Completion report

List the target version, full SHA, each authorization boundary, actual remote commands or workflow run, Primary CI, GHCR manifest, tag, Release, asset state, and every Partial, Failed, or Pending condition. Never report an unverified surface as successful.
