# 0018: Metric time and one tempo map

## Status

Accepted

## Context

Date: 2026-11-26, from the owner's review of the description model.

Each stage handles time its own way. `music/score.py` applies the per-line stretches (`FEEL`) as it builds, so `build/score.json` already holds seconds with rubato in them. `music/perform.py` adds lingering on top. `band/arrange.py` places the band on the singer's clock through its own line-and-eighth function. The intro, interlude and outro, some string gains and one mix window are given in absolute seconds. A change of tempo or rubato therefore moves things that should stay with the music.

## Decision

Scores are in metric time: bars and beats. The performance produces one tempo map from metric time to seconds. The voice, the band, the mix and the film timeline take every position through the tempo map. No song data is given in absolute seconds.

## Consequences

Encapsulated by the tempo-map module (`tempo`, not yet built; increment I13).
