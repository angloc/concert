---
type: architecture
title: Performance feasibility
description: The approved design for judging whether a planned performance can be sung, choosing compromises by cost under permission layers, and reporting shortfalls; not yet built.
---

# Performance feasibility

Not yet built. This is the approved design; the build plan is increments I6 to I9 in [PROJECT_PLAN.md](../../../PROJECT_PLAN.md).

## Idea

Register is the ideal a performance aims at, not a setting. A singer at speed does not switch to a casual register. They give ground syllable by syllable, and only where the note cannot carry the ideal form. Each departure from the ideal is a *compromise*, justified by need.

The accent, the singer and the performance can each restrict which compromises are allowed, or require some. A demand that cannot be met with the permitted compromises is reported, not quietly mangled.

This replaces the fixed gates in `src/concert/diction/connected_speech.json` (for example `max_syl_d: .35`), which are a crude stand-in for "the ideal is under pressure here".

## Terms

- **Ideal.** Each syllable in its careful form: citation phones from the lexicon and accent, full consonant durations, vowel targets reached, and the line's voice colour.
- **Demand.** What the score and the interpretation ask of the syllable: note length, pitch, loudness and colour.
- **Capacity.** What the singer can do: the minimum duration of each gesture (set by the articulator time constants in `src/concert/voice/gest.py`), the singer's range, and how far phonation can move at a given pitch and loudness. It is to come from the [singer profile](../singer-profile.md); capacity is not yet per singer.
- **Feasible.** A syllable is feasible when its realisation fits within the demand, given the singer's capacity. The test is computed from the plan (`build/perf.json`) before rendering. Candidate measures already exist as diagnostics: open time per nucleus; how far each vowel and consonant target is reached; consonant duration floors.
- **Compromise.** A transformation that moves a syllable away from the ideal to make it feasible. Each compromise has a cost. The inventory is in [compromise inventory](compromise-inventory.md).

## Units

Feasibility is judged per syllable; stacking cost is counted per word ([decision 0001](../../decisions/0001-feasibility-units.md)). The score fixes each note's time, so each note must hold its own consonants and vowel, and a shortfall on one note is not absorbed by another. Compromises that cross syllables within a word, such as "mount-n" passing the lost vowel's time to "moun", are evaluated over the word.

## Borrowing time

Three kinds, treated differently ([decision 0002](../../decisions/0002-time-borrowing.md)):

1. **Part of the ideal.** Onset consonants are sung before the beat so that the vowel lands on it. `src/concert/performance/perform.py` already places onsets before the syllable's time. Not a compromise; no cost.
2. **Compromise.** A neighbouring vowel is shortened to make room for a consonant or cluster, as the `fit` clamp does. The rhythm the listener hears is unchanged. Cheap; the solver may choose it.
3. **Performance decision.** The beat itself moves: holding back, rushing, cutting a note short. This changes the rhythm, which is interpretation, so it is never applied automatically. A shortfall warning may suggest it.

## Cost and selection

Cost approximates the loss of intelligibility or style. Compromises that listeners recover without noticing are cheap, such as degemination and assimilation. Deletion costs more. A weak form of a content word costs most.

Stacking cost is superadditive and counted per word: two compromises on one short word cost more than the sum of their costs, so the solver prefers to spread them. This stops a weak "you" from also coalescing into "it-shuh".

Selection is per line: the cheapest set of permitted compromises that makes every syllable feasible. A greedy pass is the starting point: apply the cheapest compromise first and re-test feasibility after each one. Selection is deterministic, so builds stay reproducible.

## Permission layers

Each layer may mark a compromise as:

- **forbidden:** never applied;
- **permitted:** applied only under pressure (the default for everything in the inventory);
- **mandated:** always applied, whatever the pressure. A mandate is part of the ideal for that style, not a true compromise: for example the Irish monophthong GOAT, or "an'" if a song's style calls for it.

The layers are the catalogue defaults; the accent (`accents/<name>/accent.json`); the singer (`singers/<name>/`); and the performance, meaning the song interpretation, down to the line or the word. The emphasis mark for contrastive words belongs to the performance: it forbids weak forms and stacking on that word.

Precedence: accent over singer over performance ([decision 0003](../../decisions/0003-permission-precedence.md)). The performance decides only what the other two leave open.

## Shortfall

If the permitted compromises cannot make a syllable feasible, preflight reports:

- the place: line, syllable and phone;
- the size of the shortfall, for example milliseconds missing, or a target missed by a given amount;
- the compromises tried;
- the remedies, cheapest first: a forbidden compromise that would rescue the syllable, or a performance change to the beat.

The user can then permit the compromise, change the demand (the tempo or the note), or accept the result. By default preflight warns and renders the best feasible version; a strict mode refuses ([decision 0004](../../decisions/0004-shortfall-default.md)).

## Prerequisites

Feasibility is only meaningful if the model renders the ideal correctly; see [model corrections](model-corrections.md). Thresholds and costs are calibrated against [listening verdicts](listening-verdicts.md).

## Relation to current code

- `src/concert/diction/connected.py` applies catalogue rules in order with a log. Each rule's gate becomes a call to the feasibility test, and the log gains the cost and the reason for each compromise.
- The `BIDE_LEGATO` switches are experiments. Those that prove themselves become compromises in the inventory or model defaults, and stop being global switches.
- The plan-check half of preflight is the feasibility test run over the whole song. The existing `concert-preflight` reviews a finished render, not a plan.
