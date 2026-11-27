# Agent rules

Read POLICY.md.

## Project
bide renders a song from nothing: a physical model of a singing voice, modelled instruments, a mix and a hand-drawn film, assembled into one HTML page that plays offline. The current song is Danny Boy, sung by a female singer whose voice ages through the song. A second song, Wild Rover, is planned.

## Mandates
- **Deterministic builds.** Seed every random choice. The same source and `VERSION_TAG` must build a byte-identical page. Rationale: [architecture](docs/knowledge/architecture.md).
- **General model corrections.** A correction to the voice model's physics or timing applies to every song and every voice. Never add a per-song or per-singer exception to the model. Rationale: [model corrections](docs/knowledge/performance/model-corrections.md).
- **Song data in song folders.** Put song-specific data (words, tune, interpretation, personas) only in `songs/<name>/`. Keep the engine, voice, band and mix song-neutral. Rationale: [decision 0007](docs/decisions/0007-songs-and-singers-in-folders.md).

## Exceptions
- [Decision 0012](docs/decisions/0012-film-exception.md): `film/` is outside the JavaScript profile.
- [Decision 0015](docs/decisions/0015-transitional-compliance.md): existing code is exempt from listed rules until named increments land.
- [Decision 0022](docs/decisions/0022-baseline-exceptions.md): four features beyond Baseline 2025 stay in the page.

## Commands
- Render one line of the raw voice: `uv run concert-sing --lines 6 --out build/line6.wav`. Add `--persona` for the Danny Boy personas.
- Experiment switches: set `BIDE_LEGATO` to a JSON object, for example `BIDE_LEGATO='{"keepcons": true}'`. See `src/concert/diction/opts.py`.
- Stage commands are console scripts: `concert-perform`, `concert-timeline`, `concert-fit`, `concert-sing`, `concert-band`, `concert-mix`, `concert-flac`, `concert-page`. Run each through `uv run`. `make package` runs them in order.
- Fit a singer's vowel shapes: `uv run concert-fit --singer <name> [sound ...]`. `make package` fits `female`. Fit `baritone` before a render without `--persona` or `--singer`.
- Review a render: `uv run concert-preflight build`.
- Capture stills: `uv run concert-shot --at 10,40 --out build/x.jpg`. Draw a test sheet: `--fn worldSheet --k 5`.
- Export a video excerpt: `uv run concert-record build/x.mp4 build/song.flac --from 10 --to 20`. `make export` exports the whole film.
- Transpose for a test render: `BIDE_SHIFT=<semitones>` overrides `key.json`.
