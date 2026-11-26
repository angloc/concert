# 0020: Singer profiles state measurable quantities

## Status

Accepted

## Context

Date: 2026-11-26, from the owner's review of the description model.

A singer profile today holds engine settings (`nv`, `gload`, `jhi` and others). The settings are tied to the current engine and cannot be measured from a real singer. The owner wants the physical model to be improved from real voices later. Recent research fits physical tract models to recorded singing, so a profile stated in measurable terms could later be calibrated rather than tuned by ear.

## Decision

- A singer profile states measurable quantities: a formant table per vowel, pitch range, register transitions, vibrato rate and extent, breathiness and agility.
- Engine settings are derived from the profile by fitting, as `voice/fit.py` already derives vowel shapes from formant targets.
- A persona is a preset of a few named perceptual controls (for example tension, breathiness and age) over a profile.
- A profile may later be measured from recordings of a singer who has given consent.

## Consequences

Encapsulated by the singer module (`engine/singer.py`, with `voice/fit.py`; increment I17). Measurement from recordings is deferred (increment I18).
