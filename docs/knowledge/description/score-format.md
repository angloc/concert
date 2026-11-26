---
type: evidence
title: Score format evidence
description: The ABC and MusicXML round trip of Danny Boy - method, what survived, what was lost and why; read before changing how scores are read or written.
---

# Score format evidence

## Method

Danny Boy was written out as ABC 2.1 from the current data: the melody, syllables and chord table from `music/score.py`, and the harp part from `band/arrange.py`. The harp's times in seconds were mapped back to metric time through the singer's own clock and rounded to sixteenths. Dynamics and hairpins came from each line's loudness range, breath marks from each line's breath, and a fermata on the last note. The file had four voices: voice with words, harp on two staves, and a chord line on invisible rests. It held 180 sung notes, 401 harp notes, 14 harp harmonics and 64 chord symbols, and was 5.5 KB.

Each reading was compared with the source data note by note.

## Results

| Path | Outcome |
| --- | --- |
| music21's ABC reader | pitches and timings exact; every lyric dropped, even in a one-voice test; dynamics, breath marks, fermatas and harmonics dropped; voices with names merged silently into one part; the invisible rest `x` read as the note C |
| abc2xml to MusicXML, read by music21 | all 180 notes exact in pitch, onset and duration; every syllable on its note, with punctuation; all 16 dynamics, 13 hairpins, 14 breath marks and the fermata; all 401 harp notes and 14 harmonics; tempo, key and metre; 62 of 64 chord symbols |
| then MusicXML to ABC to MusicXML | the same result again |

The MusicXML file was 242 KB, about 44 times the ABC.

## What was lost

- **Chord qualities.** abc2xml dropped `Ebadd9` and `F6/9`, and reduced `C7b9` and `Cmaj7#11` to plain dominant and major-seventh chords. music21's chord-symbol parser cannot read `6/9`. See [decision 0017](../../decisions/0017-chord-symbols.md).
- **Performance detail in the harp.** Rounding to sixteenths removed the harp's lay-back, random timing spread and roll spreads, and notation has no place for its per-note velocities or ring limits. These belong to a player model, not to the score.

## Errors a writer makes

Two errors in the generated ABC were caught by the comparison, and both are errors an AI writer will make:

- An accidental lasts to the end of the bar. After a natural, a later note in the same bar needed its flat restated.
- Under abc2xml a tied note takes a syllable of its own, so the tie's continuation needs `_` in the words.

The score check is meant to catch errors of this kind.

## Other findings

- The chord table in `music/score.py` and the arrangement's own comments disagree in places: line 1 is `Eb/G … Fm7 Bb7` in one and `Eb/Bb … Fm9 Bb7sus` in the other. See [open questions](../open-questions.md).
- Lines 7 and 15 have rubato written into the note lengths: dotted sixteenths, and notes that cross the barline. See [open questions](../open-questions.md).
- Research on language models and music mostly uses ABC, and also reports that models make rhythm and format errors in it.
