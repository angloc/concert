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

### Singing habits found on Danny Boy line 4 (2026-11-26)

Three habits came out of the line 4 work. Each is general as a mechanism, but none is universal: a style, a singer or a performance may want it, allow it or rule it out. They therefore enter the inventory with permissions, not as model defaults. Two of them are not time-saving compromises but emphases that spend time; the inventory holds both kinds, because the solver has to account for time in either direction.

| id | does | kind | gate | default permission | switch now |
|---|---|---|---|---|---|
| `final-stop-release` | a line-final B, D or G is released into a short voiced schwa ("bide-uh") | diction style | line-final voiced stop | mandated by a classical or folk singer; permitted otherwise | `finalrel` |
| `final-stop-hold` | a line-final stop is held (about 110 ms at 1.75×), the time taken from the vowel before it | emphasis, paid for by borrowing kind 2 | line-final stop after a long vowel | permitted; the performance sets the amount | `finallen` (2.2) |
| `td-prevocalic` | a word-final D or T after N or L drops before a vowel-initial word ("an' I") | elision under time pressure | note shorter than 0.35 s | permitted; forbidden under the emphasis mark | `reduce: ["td-prevocalic"]` |

Draft declarations, in the catalogue's format:

```json
{"id": "final-stop-release", "family": "diction", "source": "USR (singers' practice, Danny Boy 'bide')",
 "does": "a line-final voiced stop is released at 55% of its time into a short voiced schwa",
 "gate": {"line_final": true, "phones": ["B", "D", "G"]}, "cost": "time: none; style: marked in pop and crooning",
 "examples": [{"in": "B PRICE1 D |", "out": "B PRICE1 D(ax) |"}]}
{"id": "final-stop-hold", "family": "emphasis", "source": "USR (a singer sacrifices 'and' and emphasises 'bide')",
 "does": "a line-final stop is lengthened by a factor; the time comes out of the vowel before it",
 "gate": {"line_final": true, "min_prev_vowel_d": 0.4}, "params": {"factor": 2.2},
 "cost": "time: borrowed from the preceding vowel", "examples": [{"in": "AY 0.93 + D 0.077", "out": "AY 0.84 + D 0.17"}]}
{"id": "td-prevocalic", "family": "elision", "source": "USR (C14/R09 keep the stop before a vowel)",
 "gate": {"max_syl_d": 0.35}, "params": {"after": ["N", "L"]}, "cost": "low on a function word, high on a content word",
 "examples": [{"in": "AE0 N D # AY1", "out": "AE0 N # AY1", "d": 0.25}]}
```

`td-prevocalic` is already in `engine/connected_speech.json`. The other two are switches in `gest.py` and `perform.py` until step 4 gives them declared homes. The gate values (0.35 s, factor 2.2, the 0.4 s vowel floor) are first judgements from one line and are to be calibrated with the rest.

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

The homorganic /st/ rule (an S followed by T stays at the S place, "must") was added to `place` on 2026-11-26 and is therefore also on by default.

**Open question on `burstgain`.** At 1.75× on the default voice, 0.3 removed a click. In the full female build the ghost verse lost intelligibility, and weaker stop releases under the ghost's extra breath noise are the first suspect. To test: compare the ghost lines with the five corrections on and off, and against the `dboh` build, which predates them.

### Candidates from the line 4 work (2026-11-26)

These correct the physics or timing of the model, so once confirmed they apply to every song and voice without a decision per song. All are off by default until checked on the female singer at 1.0×, including the ageing and ghost stages; every value below was set on line 4 at 1.75× with the default male voice.

- `relcoda`: the end-of-line breath opens the glottis only after a final consonant. Before, it opened 120 ms before the line end and devoiced the D of "bide" into "hhh".
- `fricrel`: an S before a voiced sound tapers over its last 15–20 ms. The glottis closes by the release and the tongue lets go along u^1.0 instead of the stop-like u^2.2. Before, the S fell about 12 dB in 4–6 ms and was heard as a hiss-click.
- `siblip`: the lip opening during S and Z is set (0.5 cm) instead of the open 0.95–1.35 cm. The S peaked at 8.5–8.9 kHz against about 6.8 kHz in Jongman et al. (2000); low-pass filtering moved the level but not the peak, which is a front-cavity resonance. The value needs checking on the shorter female tract.
- `diphhold`, with its refinements: a diphthong reaches its second element before a following consonant and holds it (up to 80 ms); the first element keeps at least 40% of the note and is approached at the default stiffness; a diphthong shorter than 250 ms glides on into the next consonant instead of holding. Together these fixed "bide" heard as "bard", "I" heard as "Ar", and the clipped "I must". The 40% and 250 ms thresholds are judgements from one line.

### Not adopted

- `frlp` (low-pass on the frication source, 11 kHz in the line 4 tests): probably redundant, since the build's microphone stage already low-passes at 11 kHz and the test renders lacked that stage. Check before adopting.
- `sibgain`: left at 1.0; the S was too high in pitch, not too weak.
- `finalburst`: six times the release gain on the final D added only about 2 dB, because a voiced stop has little oral pressure behind it. Holding the stop (`final-stop-hold`) is what made the D audible. Candidate for removal.
- `pricefront`: a fronter onset for PRICE. An accent option, not used for Danny Boy.
- `tailglide`: only preserves the earlier halving of a line-final diphthong, for comparison.

### Song data

"It's you, it's you" and "It's I'll be here" had been in the Danny Boy score since the first commit; Weatherly's text is "'Tis". Corrected on 2026-11-26 and sung T IH Z. This is song-specific, but it suggests one general step at song intake: check the lyric text against the published source before anything is tuned to it.

## Calibration

Feasibility thresholds and costs are set from listening verdicts, not chosen once by eye. Each verdict is recorded with the plan measures for its line, so a threshold change can be checked against every earlier judgement.

Verdicts so far for Danny Boy:

- at 1.75×: lines 1, 2 and 7 good; lines 4, 12 and 13 unintelligible;
- at 1.0× (E1): lines 4, 12 and 13 good;
- forcing the warm colour at 1.75× (E2) did not help;
- at 1.75× with the model corrections (G1, G2): lines 4, 12 and 13 intelligible, with or without `keepcons`;
- the mountainside clipping was fixed by `fit`;
- line 4 at 1.75×, default voice, 2026-11-26: "bide" lacked its D until `relcoda` and `finallen`; "I" sounded "Ar" until the diphthong onset rule; "'tis you" had a hiss-click until `siblip` (0.5 better than 0.7) and `fricrel`; "and I" sounded hurried until `td-prevocalic`; "I must" sounded clipped until short diphthongs glided on (V1, judged fine);
- full build at 1.0× with the five corrections (dbfix): intelligibility fell verse by verse and the last verse was hardly intelligible. The original female build was acceptable. Cause not yet isolated (see the `burstgain` question).

## Plan

1. **Model corrections.** The five switches above are on by default; the full 1.0× build lost intelligibility in the later verses, so the `burstgain` question comes first. Then confirm the line 4 candidates on the female singer at 1.0× and make them defaults.
2. **Timing.** Tested `keepcons` at 1.75× on lines 1, 4, 12 and 13 (G1 against G2). With the model corrections in place, both were intelligible and differed little, so the earlier failures came from the model faults, not the timing. `keepcons` stays optional until the feasibility measures (step 3) show where it matters.
3. **Feasibility measures.** Implement the per-syllable test over perf.json: open time, target attainment and consonant floors. Calibrate it against the verdicts above, so that it separates good lines from bad ones.
4. **Compromise inventory in data.** Merge the connected-speech catalogue, the timing and phonation compromises and the singing habits above into one declared inventory with costs. Replace the fixed gates with the feasibility test. Add per-word stacking cost.
5. **Permission layers.** Add forbid, permit and mandate to the accent, singer and performance files, resolved with the precedence above. Add the emphasis mark to the song interpretation.
6. **Preflight.** Run the solver over the whole song. Report shortfalls as warnings with remedies, and offer a strict mode.
7. **Wild Rover.** Write the score and lexicon, choose the baritone's permissions and the style's mandates, and run preflight before the first render.
