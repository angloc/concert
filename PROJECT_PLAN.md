# Project plan

## I1: Video export with ffmpeg
Benefit: the film can be exported as an MP4 on any Linux machine and in CI, not only on a Mac.
Deliver:
- `tools/record.mjs` streams frames to ffmpeg, which encodes 1920×1080 H.264 at 24 fps and muxes the build's FLAC song as AAC.
- A Make target for the export.
- `tools/enc.swift` removed.
- `tools/shot.mjs` and `tools/record.mjs` brought under the JavaScript profile, and their exemption removed from decision 0015.
Docs: change README.md
Publishes: none
Acceptance:
- The export target writes an MP4 of the whole film with the song, on Linux, in a dedicated environment.
- No Swift remains in the repository.
- `tools/*.mjs` pass the JavaScript profile's checks, coverage included.
- `make verify` passes.
Read first: [architecture](docs/knowledge/architecture.md), [decision 0011](docs/decisions/0011-ffmpeg-video-export.md), [open questions](docs/knowledge/open-questions.md)

## I2: Version on the page and browser tests
Benefit: a viewer can see which release they are watching, and every release is proven to play in Chromium, Firefox and WebKit.
Deliver:
- `make package` injects the version from `VERSION_TAG` as visible text in the page shell.
- End-to-end tests with pytest and Playwright against `dist/bide_<version>.html` in Chromium, Firefox and WebKit: no network requests; no console errors; the song decodes to the sample-accurate clock with the right duration; the film draws and changes over time; space, arrows, R, F and M work, observed through the live region; the version is shown.
- A Baseline 2025 check of the built page's HTML, CSS and JavaScript in `make verify`.
- The `Tested by:` line of `platforms` updated, and this increment's exemption removed from decision 0015.
Docs: change README.md
Publishes: change `bide_<version>.html`
Acceptance:
- A page built with `VERSION_TAG=v1.2.3-rc.1` shows `1.2.3-rc.1`, and a test asserts it.
- The end-to-end tests pass in all three engines in CI.
- A non-Baseline 2025 feature in the page fails `make verify`.
Read first: [platforms](docs/knowledge/platforms.md), [decision 0013](docs/decisions/0013-browser-target.md), [decision 0014](docs/decisions/0014-version-on-page.md)

## I3: Python layout and formatting
Benefit: developers and agents find each module under `src/` in one style, with no change to what listeners hear or see.
Deliver:
- The Python modules moved to `src/<package>/`, one subpackage per module, named for the decision each hides; thin entry points as console scripts; no `sys.path` manipulation.
- `ruff format` and `ruff check` clean; docstrings on public interfaces.
- Comments that narrate history rewritten as current purpose.
- This increment's exemption removed from decision 0015.
Docs: change README.md
Publishes: none
Acceptance:
- `dist/bide_<version>.html` is byte-identical to the build before the move, at the same `VERSION_TAG`.
- `make verify` passes with ruff applied to all Python.
Read first: [architecture](docs/knowledge/architecture.md), [decision 0015](docs/decisions/0015-transitional-compliance.md)

## I4: Test coverage of the Python code
Benefit: a regression in the voice, band, mix or page assembly is caught by a test before anyone has to listen for it.
Deliver:
- Tests through module interfaces on short excerpts (a line, a few notes), each within the 60-second limit.
- The coverage floor applied to all Python; decision 0015 superseded once I1 to I3 have landed.
Docs: none
Publishes: none
Acceptance:
- Statement coverage of all Python is at least 95%.
- `make verify` passes.
Read first: [architecture](docs/knowledge/architecture.md), [decision 0015](docs/decisions/0015-transitional-compliance.md)

## I5: Model corrections settled
Benefit: the female Danny Boy stays intelligible through the ghost verse at normal speed.
Deliver:
- Isolate the cause of the later-verse intelligibility loss (`burstgain` first): ghost lines with the five corrections on and off, and against the `dboh` build.
- Check `relcoda`, `fricrel`, `siblip` and `diphhold` on the female singer at 1.0×, through the ageing and ghost personas; make each a default or remove it.
- Remove switches not adopted.
- Record the verdicts in `listening-verdicts`.
Docs: none
Publishes: change `bide_<version>.html`
Acceptance:
- The owner judges every verse of the full build intelligible at 1.0×.
- Every remaining correction is on by default; unadopted switches are gone.
Read first: [model corrections](docs/knowledge/performance/model-corrections.md), [listening verdicts](docs/knowledge/performance/listening-verdicts.md), [open questions](docs/knowledge/open-questions.md)

## I6: Feasibility measures
Benefit: problems a listener would hear are predicted from the plan before anything is rendered.
Deliver:
- The per-syllable feasibility test over `build/perf.json`: open time, target attainment and consonant floors.
- Plan measures recorded beside each listening verdict.
- Calibration so that the test separates the lines judged good from those judged bad.
Docs: none
Publishes: none
Acceptance:
- On the recorded Danny Boy verdicts, the test marks every line judged bad as infeasible and every line judged good as feasible.
- Whether `keepcons` becomes the default timing is decided from the measures.
Read first: [performance feasibility](docs/knowledge/performance/feasibility.md), [consonant timing](docs/knowledge/performance/consonant-timing.md), [listening verdicts](docs/knowledge/performance/listening-verdicts.md)

## I7: Compromise inventory in data
Benefit: every reduction the singer makes is chosen by cost and explained, instead of firing at fixed gates.
Deliver:
- One declared inventory merging the connected-speech catalogue, the timing and phonation compromises and the singing habits, each with id, source, cost and examples.
- The fixed gates replaced by the feasibility test; per-word stacking cost; the greedy deterministic solver.
Docs: none
Publishes: change `bide_<version>.html`
Acceptance:
- No fixed gate remains in `engine/connected_speech.json`.
- Every compromise applied in a build is logged with its cost and reason.
- The build is reproducible byte for byte.
Read first: [compromise inventory](docs/knowledge/performance/compromise-inventory.md), [performance feasibility](docs/knowledge/performance/feasibility.md), [decision 0001](docs/decisions/0001-feasibility-units.md), [decision 0002](docs/decisions/0002-time-borrowing.md)

## I8: Permission layers
Benefit: an accent, a singer or a performance can forbid, permit or require a compromise, and the result is predictable.
Deliver:
- Forbid, permit and mandate in the accent, singer and performance files, resolved accent over singer over performance.
- The emphasis mark in the song interpretation.
Docs: none
Publishes: none
Acceptance:
- Tests show each precedence case resolving as decision 0003 states.
- A word under the emphasis mark gets no weak form and no stacking.
Read first: [performance feasibility](docs/knowledge/performance/feasibility.md), [decision 0003](docs/decisions/0003-permission-precedence.md)

## I9: Preflight plan check
Benefit: before a render, the user sees every syllable the singer cannot manage, with the cheapest remedies.
Deliver:
- The solver run over the whole song, reporting each shortfall's place, size, the compromises tried and the remedies, cheapest first.
- Warn by default; a strict mode that refuses.
Docs: none
Publishes: none
Acceptance:
- A deliberately infeasible test score produces a shortfall report with a remedy; strict mode exits with failure on it.
- The Danny Boy build passes preflight, or its warnings are accepted by the owner.
Read first: [performance feasibility](docs/knowledge/performance/feasibility.md), [decision 0004](docs/decisions/0004-shortfall-default.md), [decision 0005](docs/decisions/0005-plan-check-listen.md)

## I10: Wild Rover
Benefit: a second song, sung by the baritone in the Irish accent, built by the same song-neutral pipeline.
Deliver:
- Wild Rover's score and lexicon in `songs/wild-rover/`.
- The baritone's permissions and the style's mandates.
- Preflight run before the first render.
Docs: change README.md
Publishes: none
Acceptance:
- Wild Rover builds with no song-specific code outside `songs/wild-rover/`.
- Preflight passes, or its warnings are accepted, before the first render.
Read first: [open questions](docs/knowledge/open-questions.md), [decision 0007](docs/decisions/0007-songs-and-singers-in-folders.md), [performance feasibility](docs/knowledge/performance/feasibility.md)

## Deferred

Nothing is deferred.
