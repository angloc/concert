# 0013: Evergreen browsers at Baseline 2025

## Status

Accepted

## Context

Date: 2026-11-26.

The page is written in plain HTML, CSS and JavaScript with feature detection and fallbacks, and is meant to play on phones as well as computers. The README recommended Chrome.

## Decision

The page targets evergreen browsers, desktop and mobile, as one platform. It uses only web features at Baseline 2025, in semantic, vanilla HTML, CSS and JavaScript. Browser compatibility is a product rule, checked on the built page whatever the source's language profile. CI tests the built page end to end in Chromium, Firefox and WebKit through Playwright; real Safari on macOS and iOS is tested by hand.

## Consequences

Project-wide for the page; tests live with the browser end-to-end tests (increment I2). See [platforms](../knowledge/platforms.md).
