---
name: prepare-version
description: Prepare an explicitly selected ai-api-gateway SemVer by synchronizing the local root version, version projections, and Chinese CHANGELOG, then verify the preparation diff. Do not commit, push, merge, create tags, dispatch workflows, or publish assets.
---

# Prepare a project version

The root `package.json` owns the project version. Version preparation produces verified, uncommitted local changes; authorization to prepare does not authorize Git history changes or remote publication.

## Sources of truth

- [Versioning and release convention](../../../docs/conventions/versioning-and-release.md)
- [Quality gates and evidence](../../../docs/conventions/quality-gates-and-evidence.md)
- [Repository activation checklist](../../../docs/checklists/repository-activation.md)

## Workflow

1. Require an explicit target SemVer; never infer it from commit types, branch names, or change size.
2. Read the current root version, CHANGELOG, worktree, and version projections. Confirm that the target is greater and will not overwrite unrelated work.
3. Run the project-owned version writer:

```bash
pnpm version:set -- <version>
```

4. Write the Simplified Chinese CHANGELOG entry manually from current delivered behavior, grouped semantically. Do not generate it mechanically from Git history or claim undelivered capabilities.
5. Verify version consistency and affected source:

```bash
pnpm verify:project-version
```

6. Run the required scope-selected Gates and inspect the complete version-projection and CHANGELOG diff.
7. Report changed files, actual commands, results, and unverified items, then stop.

## Prohibited actions

- Do not create a Release Commit, even when the worktree contains only version files.
- Do not push, merge, tag, dispatch a release workflow, publish to GHCR, or create a GitHub Release.
- Do not substitute a prerelease, date, or `latest` for the user's explicit SemVer.
- Do not edit generated projections manually to bypass the version writer.
- Do not describe a prepared version as published.
