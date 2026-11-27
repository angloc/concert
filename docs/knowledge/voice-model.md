---
type: reference
title: Voice model
description: How the physical model of the singing voice turns a performance into sound, module by module, and the intelligibility evidence for it.
---

# Voice model

The voice is a simulated vocal tract: a tube of air from the glottis through the throat, mouth and nose to the lips, shaped by a jaw, a tongue, lips and a velum. Pitch, tract length and source quality are separate controls, so a voice can be re-cast (for example from baritone to female) and stay coherent, which filtering recorded audio would not.

## From performance to sound

- [src/concert/voice/gest.py](../../src/concert/voice/gest.py) turns phoneme segments into overlapping movements of the articulators, each with its own timing.
- [src/concert/voice/tract.py](../../src/concert/voice/tract.py) turns articulator positions into an area function: how wide the tract is at every point from the glottis to the lips. It also has a frequency-domain solver that predicts formants.
- [src/concert/voice/tube.py](../../src/concert/voice/tube.py) runs sound through that tube in the time domain, with losses, a nose, sinuses and radiation at the lips. The per-sample loop is generated as flat Python source.
- [src/concert/voice/glottis.py](../../src/concert/voice/glottis.py) makes the glottal flow pulses (Liljencrants-Fant, shape set by one parameter, Rd).
- [src/concert/voice/engine.py](../../src/concert/voice/engine.py) renders one sung line: gestures, area function, aerodynamics, source and tube, with jitter, shimmer and breath that pulses with the source.
- [src/concert/voice/fit.py](../../src/concert/voice/fit.py) fits a singer's shape table at build time: it searches for tongue and lip positions whose resonances match each target in `singers/<name>/targets.json` for a 16.3 cm tract, and writes `build/<name>/shapes.json`. The search starts are seeded by the sound's name, so the table is the same in every build. [src/concert/voice/shapes.py](../../src/concert/voice/shapes.py) loads the table, and the engine sings from the table of the singer it is given.
- [src/concert/voice/tuning.py](../../src/concert/voice/tuning.py) opens the jaw on high notes so that F1 stays above the pitch; this works only for the vowels whose F1 the jaw raises (AE, EH, ER, EY, IH, IY).
- [src/concert/voice/persona.py](../../src/concert/voice/persona.py) sets per-line voice settings for the Danny Boy personas (middle-aged, ageing, ghost) on top of the female singer profile, raised to the song's key.

## Intelligibility evidence

While the original voice was being built, macOS's on-device speech recogniser listened to each take. The final dry take of the original baritone voice read 95% of the words in order, and 56% with the words shuffled so the recogniser could not lean on knowing the song. A system text-to-speech voice was used only as a yardstick for that listener; none of it is in the code or the song. These figures predate the female voice and the model corrections; current listening evidence is in [listening verdicts](performance/listening-verdicts.md).
