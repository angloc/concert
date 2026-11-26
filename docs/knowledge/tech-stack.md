---
type: reference
title: Tech stack
description: The language, runtime and tools chosen for each component of bide, with one line on why.
---

# Tech stack

| Component | Choice | Why |
| --- | --- | --- |
| Score, performance, voice, band, mix, page assembly | Python 3.13, standard library only | The models are written from first principles; nothing sampled, no text-to-speech, no machine-learning model, so every sound can be traced to code |
| Review tooling (`tools/preflight.py`) | Python with numpy and scipy | Spectral measures over whole renders; review only, never part of the build |
| Film and player | Plain JavaScript, WebGL2 and Canvas2D, in one HTML file | Runs offline in any current browser with nothing fetched |
| Song inside the page | FLAC, base64 in the HTML | Lossless, decodable by browsers, and the encoder is small enough to write in Python |
| Capture tools (`tools/*.mjs`) | Node.js driving headless Chrome | Draws the film frame by frame for stills and video |
| Video encoding | macOS AVFoundation through Swift (`tools/enc.swift`) | Being replaced by ffmpeg, which runs on Linux and in CI ([decision 0011](../decisions/0011-ffmpeg-video-export.md)) |
| Python environment | uv with a committed lock file | Python profile |
| Repository checks | Python: PyYAML, markdown-it-py, packaging | Established parsers for frontmatter, Markdown and version strings |
| Build interface | Make | Policy |
