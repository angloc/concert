# 0019: A performance is rule weights, presets and overrides

## Status

Accepted

## Context

Date: 2026-11-26, from the owner's review of the description model and of prior work.

Notation leaves most of a performance open. In Danny Boy the gap is filled by hand-tuned tables keyed by line and word (`ARC`, `FEEL`, `LATE`, `CUT`, `VIB`, `COL`). Moving those tables into a file would make the song light but leave the performance as heavy as before.

The KTH rule system (Friberg, Bresin and Sundberg) turns a score into a performance through published rules, each scaled by a quantity k. Sets of rule quantities have been shown to convey emotions, and KTH applied rules to sung performance as well. NotePerformer shows that rule-based interpretation of ordinary score marks works in practice.

## Decision

- A performance holds casting (singer, accent, instruments), personas over spans of the song, the tempo map, rule weights, mood presets and explicit overrides.
- The rules start from a subset of the KTH rules: phrase arch, final ritard, punctuation, duration contrast, high-loud and melodic charge.
- An override is written as a performing-edition mark in the score where notation has a mark for it, and in the performance file otherwise. Overrides are anchored to score positions, never to times.
- Each mood label is a preset of rule weights and voice colour.
- Instrumental parts are played by a player model for each instrument family, whose parameters (lay-back, timing spread, roll spread, velocity, ring) belong to the performance.
- Represent first, generalise second. Danny Boy is migrated with its current values as overrides, and the page stays byte-identical. Rules then replace overrides, one listening verdict at a time.

## Consequences

Encapsulated by the performance module (`music/perform.py` now; the rule layer is not yet built, increment I16) and the player model in the band module (not yet built, increment I15).
