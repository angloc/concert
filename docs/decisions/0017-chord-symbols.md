# 0017: The project parses chord symbols

## Status

Accepted

## Context

Date: 2026-11-26, from the score-format spike ([score format evidence](../knowledge/description/score-format.md)).

Chord symbols carry the harmony of every lead-sheet genre, and the chord line is what the score check tests the parts against. In the spike, abc2xml dropped `Ebadd9` and `F6/9`, and reduced `C7b9` and `Cmaj7#11` to plain dominant and major-seventh chords. music21's chord-symbol parser cannot read `6/9`. The policy asks for a decision record when the project writes code where an established tool exists.

## Decision

The score model keeps each chord symbol as the text written in the score. A parser of the project's own turns the text into a root, a bass and a set of pitch classes. The parser's tests cover at least `add9`, `6/9`, `7b9`, `#11`, `sus2`, `sus4`, `7sus4` and slash chords.

## Consequences

Encapsulated by the chord-symbol parser in the score module (`score`, not yet built; increment I11).
