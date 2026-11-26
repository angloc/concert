# 0001: Feasibility per syllable, stacking per word

## Status

Accepted

## Context

Date: 2026-11-26, from the register-and-compromise design note.

The feasibility test needs a unit. A note's time is fixed by the score, but some compromises, such as the lost vowel in "mount-n" passing its time to "moun", cross syllables within a word, and stacking several compromises on one short word harms it more than spreading them.

## Decision

Feasibility is judged per syllable: each note holds its own consonants and vowel, and a shortfall on one note is not absorbed by another, even within the same word. Stacking cost is counted per word, and compromises that cross syllables within a word are evaluated over the word.

## Consequences

Encapsulated by the feasibility test and the compromise solver (not yet built; see [performance feasibility](../knowledge/performance/feasibility.md)).
