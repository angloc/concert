# Delivery and releases

Read before changing CI, the `package` target, `dist/`, a tag or a release.

## Deliverables

`package` builds every deliverable once, into `dist/`, with a `SHA256SUMS` file when `dist/` holds files. `SHA256SUMS` lists the SHA-256 of every regular file beneath `dist/`, except `SHA256SUMS` itself, with paths relative to `dist/`. `VERSION_TAG` supplies the version; without `VERSION_TAG`, the version is `v0.0.0`. A site is a directory in `dist/`. A container image is an OCI archive in `dist/`. File names of deliverables carry the version of the tag without the leading `v`, verbatim (`maggie_1.2.3_linux_amd64.tar.gz`), except where the ecosystem requires a normalised name.

The deliverables are whatever `make package` and the `platforms` concept define. An increment that adds or retires a deliverable changes both in the same pull request. The `platforms` concept exists where the set of deliverables is not empty. Under the heading `All platforms`, then under one heading per target platform, the concept lists one bullet per delivered file, written `` * `<file name>` - description ``, with `<version>` standing for the version. A directory deliverable is listed once, as `<name>/`, and the entry stands for all files beneath the directory. Each platform heading is followed by a line `Tested by: <CI job, or external tester and method>.`

CI builds every target. Where CI cannot run a target platform (for example a Windows target that needs hardware virtualisation), CI does not claim to test the platform. The test selection mechanism of the profile leaves the tests for that platform out of the CI run; the tests are never skipped at run time.

## CI

`.github/workflows/ci.yml` keeps these invariants:

- CI triggers on `pull_request` and on `push` to the default branch, sets `permissions: contents: read`, and never uses `pull_request_target`.
- CI pins every action to a full commit SHA, with the tag in a comment. The updater keeps the SHA and the comment together.
- Each job that runs a Make target other than `install` runs `make install` first. A `verify` job runs `make verify`. Further tiers are separate jobs.
- A final `ci` job needs every other job, runs with `if: always()`, and fails unless every needed job succeeded. A skipped, cancelled or failed dependency is a failure.
- A branch ruleset, where the repository uses one, requires `ci`.

Dependabot or Renovate proposes updates to the GitHub Actions pins and to the dependencies of each language profile, lock file included.

## Tags

Tags are a restricted subset of Semantic Versioning 2.0.0: `vMAJOR.MINOR.PATCH`, with an optional release-candidate suffix `-rc.N`, and no build metadata. Leading zeros are not allowed. The regular expression is `^v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(-rc\.[1-9][0-9]*)?$`. Increment MAJOR for a change that breaks the delivered interface, MINOR for a backward-compatible addition, PATCH for a backward-compatible fix. List tags in version order with `git -c versionsort.suffix=-rc tag --sort=version:refname`.

One script validates a tag: the format, plus the version mapping of the language profile. The release workflow and the tests both call the tag script.

## Releases

Every repository has the release workflow, the tag script and the `package` target from the outset, even when the set of deliverables is empty. With an empty set, a release holds only the generated notes, and the workflow skips checksums, artifact transfer and attestation.

A tag starts release work. `.github/workflows/release.yml` is separate from CI. The workflow triggers on `push` of tags `v*`, sets `permissions: {}` at the top level, and grants each job only the permissions listed here:

1. `validate` (`contents: read`, `pull-requests: read`, `checks: read`, `fetch-depth: 0`): the tag script passes, and no release exists for the tag. A final tag is on a commit that is an ancestor of the default branch. A release candidate may instead tag the head commit of an open pull request whose `ci` check succeeded.
2. `build` (`contents: read`): set `VERSION_TAG` from the tag, run `make install`, run `make verify`, which packages once and tests `dist/`, and upload `dist/` as a workflow artifact.
3. `publish`: one job for each destination. Each job downloads the workflow artifact, publishes those bytes, and holds only the permissions and secrets that the destination needs. The GitHub release job (`contents: write`, `id-token: write`, `attestations: write`) attests provenance with GitHub artifact attestations (action pinned by SHA) where the account supports attestations, and runs `gh release create <tag> <files> --generate-notes`, adding `--prerelease` for a release candidate. Any other destination gets a separate job. A container image is attested by digest.

A release candidate never changes what users of a final release receive. A release candidate publishes to a GitHub pre-release. At any other destination, a release candidate publishes to a separate place: an image under the `-rc.N` tag and never `latest`, a site as a preview and never production.

Publish exactly the bytes that `build` tested. Never rebuild between testing and publishing. Never move a published tag, replace a published asset or push a registry version tag again. A floating alias such as `latest` may move, only to the newest final release. A fix gets a new version.
