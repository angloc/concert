# 0021: Film capture in Python on Playwright

## Status

Accepted

## Context

Date: 2026-11-26, approved by the owner.

The capture tools (`tools/shot.mjs` and `tools/record.mjs`) drove a macOS Chrome binary over the DevTools protocol by hand in Node.js, and the plan was to bring them under the JavaScript profile. They were the only JavaScript outside `film/`, so the profile would have added a Node toolchain, a second test runner and a second coverage tool for about 50 lines. Every other tool in the repository is Python. Hand-written DevTools code is custom code where established libraries exist: Playwright, pyppeteer and pycdp were considered. Playwright is maintained by Microsoft, installs pinned browser builds for Chromium, Firefox and WebKit, and the browser tests of the page need all three engines ([decision 0013](0013-browser-target.md)). pyppeteer is unmaintained, and pycdp leaves the browser's lifecycle and the waiting to the caller.

## Decision

Stills and video are captured by a Python module on Playwright's Chromium. ffmpeg comes from `imageio-ffmpeg`, which ships a static build with libx264 and AAC, so the lock file pins ffmpeg and no system package is needed.

## Consequences

Encapsulated by the capture module (`src/concert/capture/`). Replaces `tools/shot.mjs` and `tools/record.mjs`. The capture tools follow the Python profile, including the coverage floor. Leaves no JavaScript outside `film/` until the browser compatibility check needs one.
