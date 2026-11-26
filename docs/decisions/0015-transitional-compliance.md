# 0015: Exception: transitional compliance of existing code

## Status

Accepted

## Context

Date: 2026-11-26, approved by the owner.

The policy was adopted on a working codebase that predates it. Making every existing file comply before the first push would be one very large change with no point at which the build can be checked as unchanged. The deterministic build allows each step to be checked as byte-identical.

## Decision

Existing code is brought into compliance by named increments in `PROJECT_PLAN.md`. Until each increment lands, the listed code is exempt from the listed rules. New code complies fully. This record is superseded when the last increment lands.

## Consequences

Policy rules and scope:

- Python profile formatting and linting (`ruff format`, `ruff check`), layout (`src/<package>/`) and docstrings: the existing Python under `music/`, `voice/`, `engine/`, `band/`, `mix/`, `tools/` and `tests/`, until increment I3.
- Coverage floor (section 5): the same Python code, until increment I4.
- JavaScript profile: `tools/shot.mjs` and `tools/record.mjs`, until increment I1.
- Swift without a profile: `tools/enc.swift`, until increment I1 removes it.
- Section 5 and section 7 (end-to-end tests of the deliverable, application version reporting) and the `Tested by:` line of `platforms`: until increment I2.

Project-wide; the Makefile and the coverage and ruff configuration encode the exemptions, and each increment removes its own.
