---
type: reference
title: Platforms
description: The files a release delivers and the platforms they target, with how each platform is tested.
---

# Platforms

## All platforms

* `bide_<version>.html` - the film and the song in one self-contained page; open it in a browser, press the ball of red wool, sound on

## Evergreen browsers

Current Chrome, Edge, Firefox and Safari, desktop and mobile, using only features at Baseline 2025 ([decision 0013](../decisions/0013-browser-target.md)).

Tested by: not yet tested automatically; the browser end-to-end tests (Chromium, Firefox and WebKit through Playwright in CI, and real Safari on macOS and iOS by hand) arrive with increment I2.
