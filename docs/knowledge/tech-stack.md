---
type: reference
title: Tech stack
description: The language, runtime and tools chosen for each component of bide, with one line on why.
---

# Tech stack

| Component | Choice | Why |
| --- | --- | --- |
| Score, performance, voice, band, mix, page assembly | Python 3.13, standard library only, one package (`concert`) with console scripts | The models are written from first principles; nothing sampled, no text-to-speech, no machine-learning model, so every sound can be traced to code |
| Scores (not yet built) | ABC 2.1 written by an AI, or MusicXML from a notation program; abc2xml reads ABC, music21 reads MusicXML | Breadth and familiarity to AI models; ABC is about 44 times smaller than MusicXML ([decision 0016](../decisions/0016-score-format.md)) |
| Review tooling (`concert-preflight`) | Python with numpy and scipy | Spectral measures over whole renders; review only, never part of the build |
| Film and player | Plain JavaScript, WebGL2 and Canvas2D, in one HTML file | Runs offline in any current browser with nothing fetched |
| Song inside the page | FLAC, base64 in the HTML | Lossless, decodable by browsers, and the encoder is small enough to write in Python |
| Capture tools (`concert-shot`, `concert-record`) | Python with Playwright driving headless Chromium | Draws the film frame by frame for stills and video, in the same language as the rest of the tooling ([decision 0021](../decisions/0021-capture-in-python.md)) |
| Video encoding | ffmpeg 7.0.2, the static build that `imageio-ffmpeg` ships and the lock file pins | Runs on Linux and in CI, with libx264 and AAC ([decision 0011](../decisions/0011-ffmpeg-video-export.md)) |
| Python environment | uv with a committed lock file | Python profile |
| Browser end-to-end tests | pytest and Playwright in Chromium, Firefox and WebKit, with a private PulseAudio null sink so that headless Firefox can play | One test suite drives the three engines that stand for the evergreen browsers ([decision 0013](../decisions/0013-browser-target.md)) |
| Baseline check of the page | ESLint with eslint-plugin-baseline-js, @eslint/css and @html-eslint, on Node pinned by `.node-version` and `baseline/package-lock.json` | Each plugin's `use-baseline` rule reads web-features, the data behind Baseline, for its language |
| Repository checks | Python: PyYAML, markdown-it-py, packaging | Established parsers for frontmatter, Markdown and version strings |
| Build interface | Make | Policy |
