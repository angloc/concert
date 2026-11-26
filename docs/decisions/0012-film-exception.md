# 0012: Exception: film code outside the JavaScript profile

## Status

Accepted

## Context

Date: 2026-11-26, approved by the owner.

`film/` holds about 1.3 MB of hand-written plain JavaScript (drawing engine, cast, world, handwriting, scenes, player) with no tests. Applying the JavaScript profile (formatter, linter, type check, Vitest, 95% coverage, `src/<module>/index` layout) would cost more than everything else in the project together, and coverage of drawing code would prove little.

## Decision

`film/` is outside the JavaScript profile entirely.

## Consequences

Policy rule: section 7 (follow the language profile) and the coverage floor of section 5, for the JavaScript profile. Scope: every file under `film/`. Not in scope: `tools/*.mjs`, which follow the JavaScript profile; and the product rules on the built page, which still apply to the film's code through the page ([decision 0013](0013-browser-target.md)): Baseline compatibility and the browser end-to-end tests.
