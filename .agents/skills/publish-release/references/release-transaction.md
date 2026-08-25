# Release transaction

The release workflow accepts an unprefixed SemVer such as `0.1.0-alpha.4` and publishes `v<version>` only after the image succeeds.

Before any remote mutation, verify from current GitHub and Registry state that:

- the selected commit is the exact target `main` head;
- the root version, generated projections, CHANGELOG heading, and Release Commit subject `chore(release): v<version>` agree;
- the primary CI workflow succeeded for that exact SHA;
- `v<version>` is absent or resolves to the same commit;
- GHCR `<version>` and `sha-<commit>` are both absent or resolve to the same manifest digest;
- the user explicitly authorized the specific Push, Merge, or Manual Dispatch about to occur.

The workflow publishes `linux/amd64` and `linux/arm64` images to GHCR with `<version>` and `sha-<commit>` tags. Only stable SemVer releases update `latest`. It then creates an annotated tag and a GitHub Release with deterministic source and specification assets.

Remote steps are not atomic. If the image exists but tag or release creation failed, retry only for the same version and SHA. One missing GHCR tag, different manifest digests, an existing Git tag pointing elsewhere, or any lookup result other than an explicit not-found response must stop the release. Never delete an image, move a tag, overwrite another commit's version, broaden permissions, or dispatch from a replacement commit as automatic recovery.
