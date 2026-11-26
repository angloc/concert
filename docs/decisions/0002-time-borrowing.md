# 0002: Three kinds of time borrowing

## Status

Accepted

## Context

Date: 2026-11-26, from the register-and-compromise design note.

Time can be found for a syllable in different ways. Some are part of normal singing, some are cheap compromises, and some change the rhythm the listener hears. The earlier note left open whether tempo flexibility counts as a compromise.

## Decision

Three kinds:

1. Onset consonants sung before the beat are part of the ideal and cost nothing.
2. Shortening a neighbouring vowel to make room for a consonant (the `fit` clamp) is a cheap compromise that the solver may choose.
3. Moving the beat (holding back, rushing, cutting a note short) is a performance decision. It is never applied automatically; a shortfall warning may suggest it.

## Consequences

Encapsulated by the compromise solver and the performance layer of `music/` (not yet built; see [performance feasibility](../knowledge/performance/feasibility.md)).
