# 0022: Exception: four features beyond Baseline 2025 in the page

## Status

Accepted

## Context

Date: 2026-11-26, approved by the owner.

The Baseline 2025 check of the built page ([decision 0013](0013-browser-target.md)) finds four features that are not Baseline 2025. `navigator.audioSession` exists only in Safari; it lets the song play on iOS with the mute switch on, and the shell sets it inside a `try`. `window.devicePixelRatio` is in every engine, but web-features rates it Limited; the canvas is sized from it and has no Baseline substitute. `overscroll-behavior` and unprefixed `user-select` stop the page bouncing and text being selected on touch. A browser without any of the four ignores it, and the page still plays.

## Decision

The page keeps the four features. The Baseline check ignores exactly these web-features: `audio-session`, `devicepixelratio`, and the CSS properties `overscroll-behavior` and `user-select`. Any other feature beyond Baseline 2025 fails the check.

## Consequences

Policy rule: the Baseline 2025 product rule of [decision 0013](0013-browser-target.md). Scope: the four features named above, in the built page. Encapsulated by the Baseline check configuration (`baseline/eslint.config.js`).
