# 0008: Accent as a plug-in for a voice

## Status

Accepted

## Context

Date: 2026-11-25, commit `33b15df`.

The same singer may sing in different accents, and the same accent may be sung by different singers.

## Decision

An accent is a separate file, `accents/<name>/accent.json`, mapping lexical sets to the phones the voice knows, with optional consonant rewrites. Any voice can sing in any accent.

## Consequences

Encapsulated by `engine/lexicon.py` (accent loading) and the accent files.
