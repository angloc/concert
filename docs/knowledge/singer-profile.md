---
type: design
title: Singer profile
description: Who is singing, independent of any song - the profile fields that exist, the fields designed but not yet built, personas as overlays, and calibration limits; read before adding a singer or a profile field.
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
- `female`: the Danny Boy re-casting, a uniformly scaled male tract (K 0.84), a lighter source and front-vowel formant tuning (`ftune` 1.2). It is not female anatomy.

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
| `ftune`, `lev` | formant tuning (front vowels only) and level-correction strength |

## Proposed profile fields (not yet built)

| Group | Fields | Exists today? |
|---|---|---|
| Identity | name, voice type, notes | name and description |
| Tract | K or length range, larynx-lowering capacity in cm, a vowel table refitted for that tract; later the pharynx-to-mouth proportion | K, `LH` and `fit.py` exist; no range |
| Registers | per register: pitch range, width of the transition zone, Rd range and mapping, spectral tilt, noise, default vibrato | no; a single Rd mapping |
| Range | comfortable range, extended range with a cost, absolute limit | no |
| Tuning skill | which vowels can have F1 tuned to pitch, maximum jaw opening, vowel-modification tolerance per vowel | partly: `ftune` and `MAXJ` in `voice/tuning.py` |
| Dynamics | soft floor and loud ceiling by pitch and register | partly: `lev` and the per-vowel level offsets |
| Breath | phrase length at a medium level, breath noise | breaths are placed by the performance layer, not limited by lung capacity |
| Agility | fastest pitch change and articulation rate; minimum gesture durations | implicit in the articulator time constants of `voice/gest.py` (see below) |
| Extended regimes | fry, breathy, whisper, pressed, falsetto, each with availability and range | partly: breath, noise and fry |
| Permissions | forbid, permit or mandate per compromise id, for example `final-stop-release` mandated for a classical or folk singer | no; see [feasibility](performance/feasibility.md) |

**Agility.** Articulator approach speed is set per gesture by a stiffness (`dv`) and release curves (the `u**2.2` stop release, `fricrel`), and consonant durations by `music/perform.py`. These are the numbers an agility field would bound. They are not yet per singer.

## Personas

Personas (middle-aged, ageing, ghost) stay separate from the profile. Each is an overlay that modifies it, for example adding irregularity and narrowing the range for ageing.

Open item: the Danny Boy overlays are global colours applied by line (the ghost raises formants a further 9% with K 0.77, sets Rd to 1.0 and raises breath noise), with no awareness of which words are at the margin. The full 1.0× female build lost intelligibility verse by verse, and these overlays are a plausible part of the cause, alongside the `burstgain` question (see [open questions](open-questions.md)). A singer protects the consonants and the vowels in trouble while keeping the colour elsewhere; an overlay should be subject to the same feasibility test as everything else.

## Feasibility and repairs

The per-syllable test and the compromise solver are specified in [feasibility](performance/feasibility.md); neither is built yet. From the profile's side, the repairs a singer can make, cheapest first, are:

1. vowel modification within its tolerance;
2. a per-note tract adjustment within the profile's range;
3. a phonation or level change;
4. stronger consonants;
5. a mix change;
6. last, a melody change, which needs the user's consent.

## Example profiles (unvalidated sketches)

| Profile | Sketch |
|---|---|
| Current female voice | K 0.84, a light source, formant tuning on front vowels only |
| Original baritone | K 1.0, the source calibrated for male pitch |
| Castrato-like | as understood from accounts, a boy's light larynx in an adult-sized body: K near 1 with a high pitch, a light source and strong formant tuning. The octave-up test is the nearest existing case and it failed without tuning |
| Extended-technique vocalist | a wide range and many source regimes (breathy, pressed, noisy, speech-like) with a flexible tract. The engine has breath, noise and fry, not the full set |

## Calibration and limits

The tract side can be calibrated by sweeping the model, as `voice/tuning.py` does for jaw opening. Register and source behaviour would have to come from published voice research or from listening verdicts; none of it is checked against real voices. The model is a simplified acoustic synthesis, so whether a profile sounds like, say, a castrato cannot be validated by measurement.

Values tuned on one profile do not automatically hold for another. The line 4 model-correction candidates ([model corrections](performance/model-corrections.md)) were set on the baritone; `siblip` in particular depends on tract length and must be checked on the female profile.
