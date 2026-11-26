---
type: reference
title: Consonant timing
description: How the plan shares a short note between consonants and vowel, the keepcons switch, and the evidence that fast Danny Boy is within human rates.
---

# Consonant timing

People sing at speed by shrinking vowels while their consonants stay close to speech durations. The model must do the same before compromises are judged.

By default the plan does the opposite on short notes: it guarantees the vowel 42% of the syllable and squeezes codas to as little as 35% of their table length. The `cons` switch shrinks them further.

The `keepcons` switch reverses this: consonants keep at least 70% of their table length, and the vowel absorbs the tempo down to a floor of 50 ms or 15% of the syllable. If `keepcons` proves itself it becomes the default timing, and consonant shrinkage below that floor becomes an explicit compromise with a cost ([compromise inventory](compromise-inventory.md)). With the model corrections in place, experiments G1 and G2 (with and without `keepcons`) were both intelligible at 1.75× and differed little; `keepcons` stays optional until the feasibility measures show where it matters.

## Rates

Danny Boy at 1.75× is well within human rates:

| Measure | Rate |
|---|---|
| Danny Boy at 1.75×, whole line | 2.5–2.9 syllables/s |
| Danny Boy at 1.75×, shortest syllables | 185–240 ms (about 4–5.4 syllables/s) |
| Typical English speech | about 4 syllables/s |
| Maximum repetition rate (diadochokinesis) | 5–7 syllables/s |

Failures at that tempo are therefore faults of the model, not limits of singability.
