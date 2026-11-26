---
type: reference
title: Model corrections
description: Corrections to the physics and timing of the voice model, which are on by default, which are candidates, and which were not adopted; read before changing BIDE_LEGATO defaults.
---

# Model corrections

A model correction fixes the physics or timing of the voice, so it applies to every song and every voice without a decision per song (see the mandates in [AGENTS.md](../../../AGENTS.md)). Corrections are switches in `BIDE_LEGATO`, read by [engine/opts.py](../../../engine/opts.py). Setting a default-on correction to false reproduces builds made before it.

## On by default

- `lipcon`: a relaxing lip gesture does not read a tongue-tip closure as its own constriction. Removes the "soft you" click.
- `burst` with `burstgain` 0.3: release bursts follow the same pressure law as frication (pressure to the power 1.5), at a calibrated strength. Removes the "oh Danny" click.
- `codaasp`: a coda P, T or K before a voiced sound is unaspirated. Removes the twang in "soft you".
- `place`: a tongue-tip fricative holds its place until its last 30 ms, so the first S of "pipes" does not drift to a TH. An S followed by T stays at the S place ("must").

Optional: `comma` adds phrase-final lengthening at punctuation. It had little audible effect.

The full female build at 1.0× lost intelligibility in the later verses with these corrections on; see [open questions](../open-questions.md).

## Candidates

These correct the model's physics or timing, so once confirmed they apply to every song and voice. All are off by default until checked on the female singer at 1.0×, including the ageing and ghost personas. Every value below was set on line 4 at 1.75× with the default male voice.

- `relcoda`: the end-of-line breath opens the glottis only after a final consonant. Without it the glottis opens 120 ms before the line end and devoices the D of "bide" into "hhh".
- `fricrel`: an S before a voiced sound tapers over its last 15–20 ms. The glottis closes by the release and the tongue lets go along u^1.0 instead of the stop-like u^2.2. Without it the S falls about 12 dB in 4–6 ms and is heard as a hiss-click.
- `siblip`: the lip opening during S and Z is set to 0.5 cm instead of the open 0.95–1.35 cm. Without it the S peaks at 8.5–8.9 kHz against about 6.8 kHz in Jongman et al. (2000); low-pass filtering moved the level but not the peak, which is a front-cavity resonance.
- `diphhold`: a diphthong reaches its second element before a following consonant and holds it (up to 80 ms); the first element keeps at least 40% of the note and is approached at the default stiffness; a diphthong shorter than 250 ms glides on into the next consonant instead of holding. Together these fixed "bide" heard as "bard", "I" heard as "Ar", and the clipped "I must".

## Not adopted

- `frlp` (low-pass on the frication source, 11 kHz in the line 4 tests): probably redundant, since the microphone stage already low-passes at 11 kHz and the test renders lacked that stage.
- `sibgain`: left at 1.0; the S was too high in pitch, not too weak.
- `finalburst`: six times the release gain on the final D added only about 2 dB, because a voiced stop has little oral pressure behind it. Holding the stop (`final-stop-hold`) is what made the D audible.
- `pricefront`: a fronter onset for PRICE. An accent option, not used for Danny Boy.
- `tailglide`: preserves the halving of a line-final diphthong, for comparison only.
