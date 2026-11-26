---
type: reference
title: Voice model
description: How the physical model of the singing voice turns a performance into sound, module by module, and the intelligibility evidence for it.
---

# Voice model

The voice is a simulated vocal tract: a tube of air from the glottis through the throat, mouth and nose to the lips, shaped by a jaw, a tongue, lips and a velum. Pitch, tract length and source quality are separate controls, so a voice can be re-cast (for example from baritone to female) and stay coherent, which filtering recorded audio would not.

## From performance to sound

- [voice/gest.py](../../voice/gest.py) turns phoneme segments into overlapping movements of the articulators, each with its own timing.
- [voice/tract.py](../../voice/tract.py) turns articulator positions into an area function: how wide the tract is at every point from the glottis to the lips. It also has a frequency-domain solver that predicts formants.
- [voice/tube.py](../../voice/tube.py) runs sound through that tube in the time domain, with losses, a nose, sinuses and radiation at the lips. The per-sample loop is generated as flat Python source.
- [voice/glottis.py](../../voice/glottis.py) makes the glottal flow pulses (Liljencrants-Fant, shape set by one parameter, Rd).
- [voice/engine.py](../../voice/engine.py) renders one sung line: gestures, area function, aerodynamics, source and tube, with jitter, shimmer and breath that pulses with the source.
- [voice/fit.py](../../voice/fit.py) found the vowel shapes in `voice/shapes.json` by searching for tongue and lip positions whose resonances match each vowel's target formants for a 16.3 cm tract.
- [voice/tuning.py](../../voice/tuning.py) opens the jaw on high notes so that F1 stays above the pitch; this works only for the vowels whose F1 the jaw raises (AE, EH, ER, EY, IH, IY).
- [voice/persona.py](../../voice/persona.py) sets per-line voice settings for the Danny Boy personas (middle-aged, ageing, ghost) on top of the female singer profile, raised to the song's key.

## Intelligibility evidence

While the original voice was being built, macOS's on-device speech recogniser listened to each take. The final dry take of the original baritone voice read 95% of the words in order, and 56% with the words shuffled so the recogniser could not lean on knowing the song. A system text-to-speech voice was used only as a yardstick for that listener; none of it is in the code or the song. These figures predate the female voice and the model corrections; current listening evidence is in [listening verdicts](performance/listening-verdicts.md).
