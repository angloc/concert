# Register and compromise

Status: design agreed 2026-11-26, not yet implemented.

## Idea

Register is the ideal a performance aims at, not a setting. A singer at speed does not switch to a casual register. They give ground syllable by syllable, and only where the note cannot carry the ideal form. Each departure from the ideal is a *compromise*, justified by need.

The accent, the singer and the performance can each restrict which compromises are allowed, or require some. A demand that cannot be met with the permitted compromises is reported, not quietly mangled.

This replaces the fixed gates in `engine/connected_speech.json` (for example `max_syl_d: .35`). Those gates are a crude stand-in for "the ideal is under pressure here".

## Terms

- **Ideal.** Each syllable in its careful form: citation phones from the lexicon and accent, full consonant durations, vowel targets reached, and the line's voice colour.
- **Demand.** What the score and the interpretation ask of the syllable: note length, pitch, loudness and colour.
- **Capacity.** What the singer can do. This covers the minimum duration of each gesture (set by the articulator time constants in `voice/gest.py`), the singer's range, and how far phonation can move at a given pitch and loudness.
- **Feasible.** A syllable is feasible when its realisation fits within the demand, given the singer's capacity. The test is computed from the plan (perf.json) before rendering. Candidate measures are already in use as diagnostics:
  - open time per nucleus;
  - how far each vowel and consonant target is reached;
  - consonant duration floors.
- **Compromise.** A transformation that moves a syllable away from the ideal to make it feasible. Each compromise has a cost.

## Units: time per syllable, stacking per word

Feasibility is judged per syllable. The score fixes each note's time, so each note must hold its own consonants and vowel. A shortfall on one note is not silently absorbed by another note, even within the same word.

Stacking is counted per word. Compromises on the syllables of one word add up to the word's stacking cost. Some compromises cross syllables within a word. In "mount-n", for example, the lost vowel's time passes to "moun". These are evaluated over the word.

## Borrowing time

Time borrowing comes in three kinds, and each is treated differently.

1. **Part of the ideal.** Onset consonants are sung before the beat so that the vowel lands on it. Singers always do this, and the plan already works this way (`perform.py` places onsets before the syllable's time). It is not a compromise and costs nothing.
2. **Compromise.** A neighbouring vowel can be shortened to make room for a consonant or cluster, as the `fit` clamp does. The rhythm the listener hears is unchanged. This is a cheap compromise in the inventory, and the solver may choose it.
3. **Performance decision.** The beat itself can be moved: holding back, rushing, or cutting a note short. This changes the rhythm, which is interpretation. It is never applied automatically. A shortfall warning may suggest it as a remedy.

## Consonants keep their length

People sing at speed by shrinking vowels while their consonants stay close to speech durations. The model must do the same before compromises are judged.

The plan used to do the opposite on short notes. It guaranteed the vowel 42% of the syllable and squeezed codas to as little as 35% of their table length. The `cons` switch shrank them further. The `keepcons` switch reverses this: consonants keep at least 70% of their table length, and the vowel absorbs the tempo down to a floor of 50 ms or 15% of the syllable. If `keepcons` proves itself, it becomes the default timing, and consonant shrinkage below that floor becomes an explicit compromise with a cost.

Danny Boy at 1.75× is well within human rates:

| Measure | Rate |
|---|---|
| Danny Boy at 1.75×, whole line | 2.5–2.9 syllables/s |
| Danny Boy at 1.75×, shortest syllables | 185–240 ms (about 4–5.4 syllables/s) |
| Typical English speech | about 4 syllables/s |
| Maximum repetition rate (diadochokinesis) | 5–7 syllables/s |

Failures at that tempo are therefore faults of the model, not limits of singability.

## Compromise inventory

The connected-speech catalogue supplies the segmental compromises:

- weak forms
- t/d-deletion
- degemination
- place assimilation
- yod coalescence
- syllabic sonorants
- linking glides

The inventory also includes compromises outside the catalogue:

- shortening a neighbouring vowel (the `fit` clamp; see Borrowing time);
- shortening consonants below the `keepcons` floor;
- undershooting vowel targets (`artic`);
- vowel modification at high pitch (still to do, mainly for the female voice);
- relaxing voice colour towards a clearer phonation. This stays in the inventory, but it is not the cause of the 1.75× failures: E2, with the warm colour forced on every line, was no more intelligible.

Each compromise is declared in data with an id, a source, a cost and examples, in the way catalogue rules are declared now.

## Cost and selection

Cost approximates the loss of intelligibility or style. Compromises that listeners recover without noticing are cheap, such as degemination and assimilation. Deletion costs more. A weak form of a content word costs most.

Stacking cost is superadditive and counted per word. Two compromises on one short word cost more than the sum of their costs, so the solver prefers to spread them. This stops a weak "you" from also coalescing into "it-shuh".

Selection is per line. The solver finds the cheapest set of permitted compromises that makes every syllable feasible. A greedy pass is probably good enough to start with: apply the cheapest compromise first and re-test feasibility after each one. Selection is deterministic, so builds stay reproducible.

## Permission layers

Each layer may mark a compromise as one of three things:

- **forbidden:** never applied;
- **permitted:** applied only under pressure (the default for everything in the inventory);
- **mandated:** always applied, whatever the pressure. A mandate is part of the ideal for that style, not a true compromise. Examples are the Irish monophthong GOAT, or "an'" if Wild Rover's style calls for it.

The layers are:

1. the catalogue defaults;
2. the accent (`accents/<name>/accent.json`);
3. the singer (`singers/<name>/`);
4. the performance, meaning the song interpretation, down to the line or the word. The emphasis mark for contrastive words belongs here: it forbids weak forms and stacking on that word.

**Precedence (decided):** accent over singer over performance. When layers conflict, the accent's setting stands, then the singer's. The performance decides only what the other two leave open.

## Shortfall

If the permitted compromises cannot make a syllable feasible, preflight reports four things:

- the place: line, syllable and phone;
- the size of the shortfall, for example milliseconds missing, or a target missed by a given amount;
- the compromises tried;
- the remedies, cheapest first: a forbidden compromise that would rescue the syllable, or a performance change to the beat (kind 3 under Borrowing time).

The user can then permit the compromise, change the demand (the tempo or the note), or accept the result.

**Default (decided):** warn, and render the best feasible version. A strict mode refuses instead.

## Model corrections (prerequisite)

Feasibility is only meaningful if the model renders the ideal correctly. The following corrections are on by default from 2026-11-26. Setting them false in `BIDE_LEGATO` reproduces earlier builds.

- `lipcon`: a relaxing lip gesture no longer reads a tongue-tip closure as its own constriction. This removes the "soft you" click.
- `burst` with `burstgain` 0.3: release bursts follow the same pressure law as frication, at a calibrated strength. This removes the "oh Danny" click.
- `codaasp`: coda P/T/K before a voiced sound is unaspirated. This fixes the twang in "soft you".
- `place`: a tongue-tip fricative holds its place until its last 30 ms. The first S of "pipes" no longer drifts to a TH.

Optional: `comma` adds phrase-final lengthening at punctuation. It had little audible effect.

## Calibration

Feasibility thresholds and costs are set from listening verdicts, not chosen once by eye. Each verdict is recorded with the plan measures for its line, so a threshold change can be checked against every earlier judgement.

Verdicts so far for Danny Boy:

- at 1.75×: lines 1, 2 and 7 good; lines 4, 12 and 13 unintelligible;
- at 1.0× (E1): lines 4, 12 and 13 good;
- forcing the warm colour at 1.75× (E2) did not help;
- at 1.75× with the model corrections (G1, G2): lines 4, 12 and 13 intelligible, with or without `keepcons`;
- the mountainside clipping was fixed by `fit`.

## Plan

1. **Model corrections.** Done: the five switches above, now on by default. A full Danny Boy build at 1.0× is under review.
2. **Timing.** Tested `keepcons` at 1.75× on lines 1, 4, 12 and 13 (G1 against G2). With the model corrections in place, both were intelligible and differed little, so the earlier failures came from the model faults, not the timing. `keepcons` stays optional until the feasibility measures (step 3) show where it matters.
3. **Feasibility measures.** Implement the per-syllable test over perf.json: open time, target attainment and consonant floors. Calibrate it against the verdicts above, so that it separates good lines from bad ones.
4. **Compromise inventory in data.** Merge the connected-speech catalogue and the timing and phonation compromises into one declared inventory with costs. Replace the fixed gates with the feasibility test. Add per-word stacking cost.
5. **Permission layers.** Add forbid, permit and mandate to the accent, singer and performance files, resolved with the precedence above. Add the emphasis mark to the song interpretation.
6. **Preflight.** Run the solver over the whole song. Report shortfalls as warnings with remedies, and offer a strict mode.
7. **Wild Rover.** Write the score and lexicon, choose the baritone's permissions and the style's mandates, and run preflight before the first render.
