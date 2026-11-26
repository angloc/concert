# Register and compromise

Status: design note, not implemented. Proposed 2026-11-26.

## Idea

Register is the ideal a performance aims at, not a setting. A singer at speed does not switch to a casual register; they give ground syllable by syllable, only where the note cannot carry the ideal form. Each departure from the ideal is a *compromise*, justified by need. The accent, singer and performance can restrict which compromises are allowed or require some. A demand that cannot be met with the permitted compromises is reported, not quietly mangled.

This replaces the fixed gates in `engine/connected_speech.json` (for example `max_syl_d: .35`), which are a crude stand-in for "the ideal is under pressure here".

## Terms

- **Ideal.** Each syllable in its careful form: citation phones from the lexicon and accent, full durations for the consonants, vowel targets reached, and the line's voice colour.
- **Demand.** What the score and interpretation ask of the syllable: note length, pitch, loudness and colour.
- **Capacity.** What the singer can do: minimum durations for gestures, which follow from articulator time constants in `voice/gest.py`; range; and how far phonation can move at a given pitch and loudness.
- **Feasible.** A syllable is feasible when its realisation fits within the demand, given the singer's capacity. The test is computed from the plan (perf.json) before rendering. Candidate measures are already in use as diagnostics: open time per nucleus, how far each vowel and consonant target is reached, and consonant duration floors.
- **Compromise.** A transformation that moves a syllable away from the ideal to make it feasible. Each one has a cost.

## Compromise inventory

The connected-speech catalogue supplies the segmental compromises:

- weak forms
- t/d-deletion
- degemination
- place assimilation
- yod coalescence
- syllabic sonorants
- linking glides

The inventory also includes compromises outside the catalogue, some of which already exist as experiment switches:

- borrowing time from a neighbouring long note (the `fit` clamp);
- shortening consonants (`cons`);
- undershooting vowel targets (`artic`);
- vowel modification at high pitch (to be done, mainly for the female voice);
- relaxing voice colour towards a clearer phonation. Lines 4, 12 and 13 failed at 1.75× with no segmental reductions, and their breathy or soft colours correlate with the failures; the E2 experiment tests this.

Each compromise is declared in data with an id, a source, a cost and examples, in the way catalogue rules are now.

## Cost and selection

Cost approximates the loss of intelligibility or style. Compromises that listeners recover without noticing are cheap, such as degemination and assimilation. Deletion costs more. A weak form of a content word costs most.

The cost of stacking is superadditive. Two compromises on one short word cost more than the sum of their costs, so the solver prefers to spread them out. This is what stops a weak "you" from coalescing into "it-shuh".

Selection is per line: find the cheapest set of permitted compromises that makes every syllable feasible. A greedy pass, cheapest compromise first with feasibility re-tested after each one, is probably good enough to start with. Selection is deterministic, so builds stay reproducible.

## Permission layers

Each layer may mark a compromise as one of three things:

- **forbidden:** never applied.
- **permitted:** applied only under pressure. This is the default for everything in the inventory.
- **mandated:** always applied, whatever the pressure. A mandate is part of the ideal for that style, not a true compromise. Examples are the Irish monophthong GOAT, or "an'" if Wild Rover's style calls for it.

The layers run from general to specific:

1. the catalogue defaults;
2. the accent (`accents/<name>/accent.json`);
3. the singer (`singers/<name>/`);
4. the performance, meaning the song interpretation, down to the line or word. The emphasis mark for contrastive words belongs here: it forbids weak forms and stacking on that word.

**Proposed precedence (open):** the more specific layer wins. The exception is that an accent mandate can only be overridden by an explicit mention, so a careful singer cannot quietly strip the accent.

## Shortfall

If the permitted compromises cannot make a syllable feasible, preflight reports four things:

- the place: line, syllable and phone;
- the size of the shortfall, for example milliseconds missing or a target missed by a given amount;
- the compromises tried;
- the cheapest forbidden compromise that would rescue it.

The user can then permit that compromise, change the demand (the tempo or the note), or accept the result.

**Proposed default (open):** warn and render the best feasible version. A strict mode refuses.

## Calibration

The feasibility thresholds and costs should be set from listening verdicts, not chosen once by eye. The verdicts so far for Danny Boy at 1.75× are a start:

- lines 1, 2 and 7: good;
- lines 4, 12 and 13: unintelligible;
- the mountainside clipping: fixed by `fit`.

Each verdict is recorded with the plan measures for the line, so that changes to a threshold can be checked against every earlier judgement.

## Relation to current code

- `engine/connected.py` already applies rules in order with a log. Each rule's gate becomes a call to the feasibility test, and the log gains the cost and the reason for each compromise.
- The `BIDE_LEGATO` switches are experiments. Those that prove themselves become compromises in the inventory and stop being global switches.
- The plan-check half of preflight is the feasibility test run over the whole song.

## Open questions

1. Precedence between layers, and how the accent-mandate exception is written (see above).
2. The default for shortfall: warn or refuse.
3. Whether feasibility is judged per syllable or per word. Stacking suggests per word.
4. Whether tempo flexibility counts as a compromise, as with rubato or a held note borrowing time across a bar line, or is always a decision of the performance.
