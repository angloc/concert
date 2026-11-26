# 0006: Lexicon in Wells lexical sets

## Status

Accepted

## Context

Date: 2026-11-25, commit `33b15df`.

The original score wrote phones by hand per song, which ties every song to one accent.

## Decision

A song's lexicon writes vowels as Wells lexical sets (FLEECE, GOAT, NORTH ...) with a CMUdict-style stress digit, and consonants in ARPAbet, with `(r)` for an R that only rhotic accents pronounce. Syllables for singing are found by maximal onset.

## Consequences

Encapsulated by `engine/lexicon.py` and the song lexicons in `songs/<name>/lexicon.txt`.
