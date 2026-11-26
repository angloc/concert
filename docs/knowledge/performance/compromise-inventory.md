---
type: reference
title: Compromise inventory
description: The compromises a singer may make under time or pitch pressure, which exist today as rules or switches, and the draft data declarations; read before adding a rule or switch.
---

# Compromise inventory

The declared inventory, with costs, is not yet built (increment I7). Today the compromises exist as connected-speech rules in `engine/connected_speech.json` and as `BIDE_LEGATO` switches.

## Segmental compromises

The connected-speech catalogue supplies:

- weak forms
- t/d-deletion
- degemination
- place assimilation
- yod coalescence
- syllabic sonorants
- linking glides

## Other compromises

- shortening a neighbouring vowel (the `fit` clamp; borrowing of the second kind in [feasibility](feasibility.md));
- shortening consonants below the `keepcons` floor ([consonant timing](consonant-timing.md));
- undershooting vowel targets (`artic`);
- vowel modification at high pitch, mainly for the female voice (not yet built);
- relaxing voice colour towards a clearer phonation. This stays in the inventory, but it did not cause the 1.75× failures: experiment E2, with the warm colour forced on every line, was no more intelligible.

Each compromise is to be declared in data with an id, a source, a cost and examples, as catalogue rules are now.

## Singing habits

Three habits from the line 4 work. Each is general as a mechanism but not universal: a style, a singer or a performance may want it, allow it or rule it out. They therefore enter the inventory with permissions, not as model defaults. Two are not time-saving compromises but emphases that spend time; the inventory holds both kinds, because the solver accounts for time in either direction.

| id | does | kind | gate | default permission | switch now |
|---|---|---|---|---|---|
| `final-stop-release` | a line-final B, D or G is released into a short voiced schwa ("bide-uh") | diction style | line-final voiced stop | mandated by a classical or folk singer; permitted otherwise | `finalrel` |
| `final-stop-hold` | a line-final stop is held (about 110 ms at 1.75×), the time taken from the vowel before it | emphasis, paid for by borrowing of the second kind | line-final stop after a long vowel | permitted; the performance sets the amount | `finallen` (2.2) |
| `td-prevocalic` | a word-final D or T after N or L drops before a vowel-initial word ("an' I") | elision under time pressure | note shorter than 0.35 s | permitted; forbidden under the emphasis mark | `reduce: ["td-prevocalic"]` |

`td-prevocalic` is in `engine/connected_speech.json`. The other two are switches in `voice/gest.py` and `music/perform.py` until the inventory gives them declared homes. The gate values (0.35 s, factor 2.2, the 0.4 s vowel floor) are first judgements from one line, to be calibrated with the rest.

## Draft declarations

In the catalogue's format:

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
