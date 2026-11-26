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

## I11: Score reading
Benefit: a song or arrangement written as ordinary notation, in ABC or MusicXML, is read into one score model with nothing lost.
Deliver:
- A `score` module under `src/` that reads ABC through abc2xml, and MusicXML through music21, into one score model in metric time: parts, notes, ties, words and their syllables, dynamics, hairpins, articulations, breath marks, fermatas, harmonics, tempo, key, metre and chord symbols.
- The project's own chord-symbol parser, which turns chord text into a root, a bass and a set of pitch classes.
- MusicXML export of a score model.
- The Danny Boy melody, words, chords and harp part in ABC as a test fixture.
Docs: none
Publishes: none
Acceptance:
- The Danny Boy fixture reads back with every note's pitch, onset and duration, every syllable on its note, and every dynamic, hairpin, breath mark, fermata, harmonic and chord symbol, both from ABC and after a round trip through MusicXML.
- The chord parser's tests pass for `add9`, `6/9`, `7b9`, `#11`, `sus2`, `sus4`, `7sus4` and slash chords.
- music21's ABC reader is not called anywhere.
- The pull request records the licence, packaging and maintenance state of abc2xml, and the alternatives considered, partitura among them.
- `make verify` passes.
Read first: [description model](docs/knowledge/description/model.md), [score format evidence](docs/knowledge/description/score-format.md), [decision 0016](docs/decisions/0016-score-format.md), [decision 0017](docs/decisions/0017-chord-symbols.md)

## I12: Score check
Benefit: a mistake in a written score, such as a bar of the wrong length or an accidental that carries too far, is reported before anything is rendered.
Deliver:
- A check over the score model, run before rendering: bar lengths against the metre; notes outside the key and outside the sounding chord, flagged; syllables per word against the lexicon; each part against the chord line.
- Warn by default; a strict mode that refuses, as preflight does.
Docs: none
Publishes: none
Acceptance:
- Test scores with a short bar, an accidental carried through a bar, a word with the wrong number of syllables and a part that clashes with the chord line each produce a report that names the place; strict mode exits with failure on each.
- The Danny Boy fixture passes, or its warnings are accepted by the owner.
- `make verify` passes.
Read first: [description model](docs/knowledge/description/model.md), [score format evidence](docs/knowledge/description/score-format.md), [decision 0004](docs/decisions/0004-shortfall-default.md)

## I13: Tempo map
Benefit: tempo and rubato can change without moving anything that belongs to the music, because every stage finds its time in one place.
Deliver:
- A `tempo` module under `src/`: one map from metric time to seconds, produced by the performance.
- The voice, band, mix and film timeline take every position through the tempo map. The intro, interlude and outro become bars.
- The band's own line-and-eighth clock replaced by the tempo map.
Docs: none
Publishes: none
Acceptance:
- `dist/bide_<version>.html` is byte-identical to the build before the change, at the same `VERSION_TAG`.
- No time in seconds remains in the score, performance, band or mix code for Danny Boy, apart from the tempo map's own data.
- `make verify` passes.
Read first: [description model](docs/knowledge/description/model.md), [architecture](docs/knowledge/architecture.md), [decision 0018](docs/decisions/0018-metric-clock.md)

## I14: Danny Boy as score and performance data
Benefit: Danny Boy is described by a score and a performance file, so the next song needs data, not code.
Deliver:
- `songs/danny-boy/` holds the song as a score (melody, words and chord line) and a performance file: casting, personas over spans, the tempo map's data, and the current interpretation tables (`FEEL`, `LATE`, `CUT`, `VIB`, `ARC`, `COL`) as overrides anchored to score positions.
- Words take their phones from the lexicon and accent only; the phones and the `CH` table leave the score code.
- The Danny Boy tables, personas, line-specific code and paths removed from the music, voice and mix code.
Docs: change README.md
Publishes: none
Acceptance:
- `dist/bide_<version>.html` is byte-identical to the build before the change, at the same `VERSION_TAG`, except where the lexicon and the old score disagree on a phone; the pull request lists each such difference and the owner accepts it by listening.
- No Danny Boy data remains outside `songs/danny-boy/`.
- The owner has settled the written-rubato and chord-table questions, and both are removed from open questions.
- `make verify` passes.
Read first: [description model](docs/knowledge/description/model.md), [open questions](docs/knowledge/open-questions.md), [decision 0019](docs/decisions/0019-performance-rules.md), [decision 0007](docs/decisions/0007-songs-and-singers-in-folders.md)

## I15: Arrangement as scores and a player model
Benefit: the band's parts are ordinary instrumental scores, so an arrangement can be written and changed like the song.
Deliver:
- The harp, strings, whistle and pipes parts of Danny Boy as scores in `songs/danny-boy/`.
- A player model for each instrument family that turns a part into events: lay-back, timing spread, roll spread, velocity from dynamics, ring and damping. The player parameters live in the performance file.
- Instrument instances as data in `instruments/<name>/`, like singers; each instrument family stays code.
- What the player model does not produce, held as per-note overrides in the performance file; the build reports how many there are for each part.
- The arrangement code removed from the band.
Docs: none
Publishes: none
Acceptance:
- `dist/bide_<version>.html` is byte-identical to the build before the change, at the same `VERSION_TAG`.
- No Danny Boy data remains in the band code.
- The build reports the number of per-note overrides for each part.
- `make verify` passes.
Read first: [description model](docs/knowledge/description/model.md), [score format evidence](docs/knowledge/description/score-format.md), [decision 0019](docs/decisions/0019-performance-rules.md)

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

## I16: Performance rules
Benefit: a performance comes from a few rule weights and the score's own marks, so a new song sounds performed without hand-tuned tables.
Deliver:
- A rule layer in the performance: phrase arch, final ritard, punctuation, duration contrast, high-loud and melodic charge, each scaled by a weight.
- Weights fitted to the Danny Boy overrides. What the rules cannot reproduce stays as overrides, and the build reports how many remain against the number they replace.
- Mood presets: each mood label maps to rule weights and voice colour.
- A listening aid that renders a line with one rule at zero, at its weight and exaggerated.
Docs: none
Publishes: change `bide_<version>.html`
Acceptance:
- The owner judges the rule-driven Danny Boy at least as good as the previous release at 1.0×, and the verdict is recorded in listening verdicts.
- The build's report shows fewer override values than the tables they replace.
- The build is reproducible byte for byte.
- `make verify` passes.
Read first: [description model](docs/knowledge/description/model.md), [listening verdicts](docs/knowledge/performance/listening-verdicts.md), [decision 0019](docs/decisions/0019-performance-rules.md)

## I17: Singer profiles in measurable quantities
Benefit: a singer is described by quantities that can be measured from a real voice, and the description stays valid when the engine changes.
Deliver:
- Singer profiles state a formant table per vowel, pitch range, register transitions, vibrato rate and extent, breathiness and agility.
- Engine settings derived from the profile by fitting, extending the vowel-shape fit.
- Personas as presets of named perceptual controls, such as tension, breathiness and age, over a profile.
- The score check tests each part's range against its singer or instrument.
Docs: none
Publishes: none
Acceptance:
- The baritone and female profiles regenerate today's engine settings, and `dist/bide_<version>.html` is byte-identical at the same `VERSION_TAG`.
- A test score with a note outside the singer's range gets a range report from the score check.
- `make verify` passes.
Read first: [singer profile](docs/knowledge/singer-profile.md), [description model](docs/knowledge/description/model.md), [decision 0020](docs/decisions/0020-measurable-singer-profiles.md)

## I10: Wild Rover
Benefit: a second song, sung by the baritone in the Irish accent, built by the same song-neutral pipeline.
Deliver:
- Wild Rover's score, arrangement and performance in `songs/wild-rover/`, the score and arrangement written in ABC by an AI.
- The baritone's permissions and the style's mandates.
- Preflight run before the first render.
Docs: change README.md
Publishes: none
Acceptance:
- Wild Rover builds with no song-specific code outside `songs/wild-rover/`.
- Preflight passes, or its warnings are accepted, before the first render.
- The score check passes, or its warnings are accepted, before the first render.
Read first: [description model](docs/knowledge/description/model.md), [open questions](docs/knowledge/open-questions.md), [decision 0007](docs/decisions/0007-songs-and-singers-in-folders.md), [performance feasibility](docs/knowledge/performance/feasibility.md)

## Deferred

### I18: Singer profiles measured from recordings
Benefit: a singer profile, and the voice model behind it, can be checked against real singing and calibrated from it.
Deliver:
- A measurement pipeline over recordings, using established analysis tools: pitch, formants per vowel, vibrato and source estimates.
- Profiles measured from recordings.
- A comparison that measures a render and a recording on the same quantities.
Docs: none
Publishes: none
Acceptance:
- For one consenting singer: a profile measured from recordings, a render from that profile, and a report of the measured differences between the render and the recordings.
- The singer's written consent and the rights to the recordings are recorded.
Read first: [singer profile](docs/knowledge/singer-profile.md), [voice model](docs/knowledge/voice-model.md), [decision 0020](docs/decisions/0020-measurable-singer-profiles.md), [open questions](docs/knowledge/open-questions.md)

### I19: Notation breadth across genres
Benefit: songs in other genres can be written and read without loss.
Deliver:
- Round trips like the score format evidence for drum kit and other unpitched percussion, guitar tablature, microtonal pitch, swing feel and chart-only music.
- A fix or a decision record for each loss.
Docs: none
Publishes: none
Acceptance:
- For each case, a fixture reads into the score model and back to MusicXML, and the losses are listed.
- Each loss is fixed or recorded in a decision.
Read first: [score format evidence](docs/knowledge/description/score-format.md), [decision 0016](docs/decisions/0016-score-format.md)
