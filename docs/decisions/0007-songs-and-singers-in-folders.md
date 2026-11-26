# 0007: Songs and singers in their own folders

## Status

Accepted

## Context

Date: 2026-11-25, commit `1e46cf4`, and the owner's plan for a second song.

The upstream code mixed the song, the singer and the engine. A second song (Wild Rover) needs as much of the pipeline as possible to be song-neutral.

## Decision

Each song lives in its own folder under `songs/<name>/`. Singers live in their own folders under `singers/<name>/`, like instruments. Transposition is not a singer property: it stays with the song's key. Personas in a song are overlays on a singer profile.

## Consequences

Project-wide: the engine, voice, band and mix stay song-neutral. Singer loading is encapsulated by `engine/singer.py`.
