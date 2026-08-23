# Release transaction

The release workflow accepts an unprefixed SemVer such as `0.1.0-alpha.4` and publishes `v<version>` only after the image succeeds.

Before dispatch, verify all of the following from current GitHub state:

- the selected commit is the exact `main` head;
- the root version, projections, CHANGELOG heading, and Release Commit subject agree;
- the primary CI workflow succeeded for that exact SHA;
- `v<version>` is absent or ultimately resolves to the same commit;
- the GHCR `<version>` and `sha-<commit>` tags are both absent or have the same manifest digest;
- the user explicitly authorized the manual dispatch.

The workflow publishes `linux/amd64` and `linux/arm64` images to GHCR with `<version>` and `sha-<commit>` tags. Only stable SemVer releases update `latest`. It then creates an annotated tag and a GitHub Release with deterministic source and specification assets.

Remote steps are not atomic. If the image exists but tag or release creation failed, rerun only for the same version and SHA. One missing GHCR tag, different manifest digests, or any lookup result other than an explicit Registry not-found error must stop the release. Never delete an image, move a tag, overwrite another commit's version, or broaden permissions as an automatic recovery step.
