# 0023: Vowel shapes fitted per singer at build time

## Status

Accepted

## Context

Date: 2026-11-27, approved by the owner.

The voice sang every singer from one table of vowel and approximant postures, `src/concert/voice/shapes.json`. The table is derived data: `fit.py` finds the postures whose tract resonances match target formants, and the targets were written in `fit.py`. The table was committed and the build never refitted it, so a change to the tract model left the table stale. The fit seeded its random starts with Python's `hash` of the sound's name, which changes from process to process, so a refit could not reproduce the committed table. The singer profile design calls for a vowel table refitted for each singer's tract ([decision 0020](0020-measurable-singer-profiles.md)), and song-neutral voice data belongs in the singer's folder ([decision 0007](0007-songs-and-singers-in-folders.md)).

## Decision

Each singer's target formants and starting postures are source data in `singers/<name>/targets.json`. `make package` runs `concert-fit --singer <name>` for the song's singer and writes `build/<name>/shapes.json`, about three minutes on two cores. The fit seeds each sound's starts with a CRC of the sound's name. The engine sings from the table of the singer it renders. No shape table is committed. Both singers hold the same typical male targets; female targets are a separate change to the sound.

## Consequences

Encapsulated by `src/concert/voice/shapes.py` (where targets and tables live) and `src/concert/voice/fit.py` (the fit). A change to the tract model reaches every singer's postures in the next build, as the model-correction mandate requires. The fit is under-determined: postures that differ give the same formants, so a refit can move the transitions between sounds while the steady vowels keep their formants. A render outside `make package` needs the singer's table fitted first.
