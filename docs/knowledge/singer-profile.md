---
type: architecture
title: Singer profile
description: Who is singing, independent of any song - the profile fields that exist, what the model fixes and what is configurable, and personas as overlays; read before adding a singer or a profile field.
---

# Singer profile

## Idea

A singer profile states who is singing, independently of any song: what the voice sounds like, and what it can and cannot do. Feasibility is then judged against a particular singer, so the same score can be comfortable for one profile and impossible for another. Choosing the profile is a casting step, much as a singer recognises a song their voice cannot sing.

The profile supplies two things to the design for planning a performance within its limits:

- the **capacity** that a syllable's demand is tested against ([feasibility](performance/feasibility.md));
- the **singer layer** of permissions over the [compromise inventory](performance/compromise-inventory.md): which compromises this singer forbids, permits or mandates. In conflicts the accent outranks the singer, and the singer outranks the performance ([decision 0003](../decisions/0003-permission-precedence.md)).

## What is built

[`singers/<name>/profile.json`](../../singers/) holds a name, a description, the voice settings and the microphone colouring. [engine/singer.py](../../engine/singer.py) loads it. Two profiles exist:

- `baritone`: the original bide singer, a 16.3 cm male tract (K 1.0) with the source calibrated for male pitch;
- `female`: the Danny Boy re-casting, a uniformly scaled male tract (K 0.84), a lighter source and formant tuning (`ftune` 1.2). It is not female anatomy.

Transposition is not a singer property; it stays with the song key (`key.json`). Personas are overlays on a profile: [voice/persona.py](../../voice/persona.py) builds the Danny Boy singer from `singers/female` and changes it by line for the middle-aged, ageing and ghost sections.

## What the model fixes today

- **Tract.** A 44-section area-function tube with a nasal port, side cavities, wall loss and lip radiation, 16.3 cm long in its neutral state. The vowel shapes were fitted to typical male formant targets. Other voices are uniform scalings of this tract (K).
- **Source.** A glottal flow waveform with one shape parameter, Rd, from breathy to pressed. Rd comes from tension, breath, loudness and pitch through hand-tuned formulas, one of which assumes a male pitch near 170 Hz.
- **No fold mechanics.** Pitch is prescribed by the score. There are no registers or breaks between them, no breath capacity, and nothing that knows a note is out of range. Only the tract acoustics and the heuristics limit the output.

## What is configurable today

| Setting | Controls |
|---|---|
| `K` | tract length: formants scale by 1/K |
| `voice/shapes.json`, refitted by `voice/fit.py` | vowel postures for any set of formant targets |
| `LH`, `EP` articulators | larynx lowering and epilarynx width |
| `rd`, `nv`, `nu`, `nm`, `jit`, `shim`, `flut`, `jhi` | source shape, noise and irregularity |
| `xpose`, `xvib`, `xam`, `aflut` | transposition, vibrato and amplitude modulation (song or persona, not singer) |
| `ftune`, `lev` | formant tuning (the vowels whose F1 the jaw raises: AE, EH, ER, EY, IH, IY) and level-correction strength |

## Capacity today

Capacity is not yet per singer. Every singer shares the same gesture time constants, and no profile states a range, registers or breath. Articulator approach speed is set per gesture by a stiffness (`dv`) and release curves (the `u**2.2` stop release, `fricrel`), and consonant durations by `music/perform.py`. These are the numbers an agility field would bound. The profile fields that could make capacity per singer are listed in [open questions](open-questions.md).

## Measurable profile

Not yet built (increment I17). A profile is to state measurable quantities: a formant table per vowel, pitch range, register transitions, vibrato rate and extent, breathiness and agility. Engine settings are derived from those quantities by fitting, as `voice/fit.py` derives vowel shapes from formant targets. A persona becomes a preset of a few named perceptual controls, such as tension, breathiness and age. A profile stated this way can later be measured from recordings of a consenting singer (deferred increment I18). Decision: [0020](../decisions/0020-measurable-singer-profiles.md).

## Personas

Personas (middle-aged, ageing, ghost) stay separate from the profile. Each is an overlay that modifies it, for example adding irregularity for ageing. Whether overlays should face the feasibility test is an [open question](open-questions.md).

## Calibration

Values tuned on one profile do not automatically hold for another. The line 4 model-correction candidates ([model corrections](performance/model-corrections.md)) were set on the baritone; `siblip` in particular depends on tract length and must be checked on the female profile.
