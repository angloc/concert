---
type: open-questions
title: Open questions
description: Unresolved questions and known risks in the voice model, the singer profile, the performance design, song neutrality and delivery; read before planning work.
---

# Open questions

## Voice model

- **Ghost verse intelligibility and `burstgain`.** The full female build at 1.0× with the five model corrections lost intelligibility verse by verse, and the last verse was hardly intelligible; the original female build was acceptable. The first suspect is weaker stop releases (`burstgain` 0.3) under the ghost persona's extra breath noise. Test: compare the ghost lines with the corrections on and off, and against the `dboh` build that predates them. See [model corrections](performance/model-corrections.md). A second candidate is the persona overlays themselves: the ghost raises formants a further 9% (K 0.77), raises Rd by 1.0 (the female profile adds 0.3) and raises breath noise on every word, with no awareness of which words are at the margin. A singer protects the consonants and the vowels in trouble while keeping the colour elsewhere; an overlay should perhaps face the same feasibility test as everything else. See [singer profile](singer-profile.md).
- **Line 4 candidates on the female singer.** `relcoda`, `fricrel`, `siblip` and `diphhold` were set on line 4 at 1.75× with the default male voice. They are off by default until confirmed on the female singer at 1.0×, including the ageing and ghost personas. The `siblip` value needs checking on the shorter female tract; the 40% and 250 ms `diphhold` thresholds are judgements from one line.
- **Switches not adopted.** `frlp` may be redundant with the microphone stage's 11 kHz low-pass; check before adopting. `finalburst` is a candidate for removal. `tailglide` exists only for comparison.
- **`keepcons` as default timing.** Optional until the feasibility measures show where it matters. See [consonant timing](performance/consonant-timing.md).

## Singer profile

- **Profile fields.** Capacity is not yet per singer ([singer profile](singer-profile.md)). These fields could make it so:

  | Group | Fields | Exists today? |
  |---|---|---|
  | Identity | name, voice type, notes | name and description |
  | Tract | K or length range, larynx-lowering capacity in cm, a vowel table refitted for that tract; later the pharynx-to-mouth proportion | K, `LH` and `fit.py` exist; no range |
  | Registers | per register: pitch range, width of the transition zone, Rd range and mapping, spectral tilt, noise, default vibrato | no; a single Rd mapping |
  | Range | comfortable range, extended range with a cost, absolute limit | no |
  | Tuning skill | which vowels can have F1 tuned to pitch, maximum jaw opening, vowel-modification tolerance per vowel | partly: `ftune` and `MAXJ` in `src/concert/voice/tuning.py` |
  | Dynamics | soft floor and loud ceiling by pitch and register | partly: `lev` and the per-vowel level offsets |
  | Breath | phrase length at a medium level, breath noise | breaths are placed by the performance layer, not limited by lung capacity |
  | Agility | fastest pitch change and articulation rate; minimum gesture durations | implicit in the articulator time constants of `src/concert/voice/gest.py` |
  | Extended regimes | fry, breathy, whisper, pressed, falsetto, each with availability and range | partly: breath, noise and fry |
  | Permissions | forbid, permit or mandate per compromise id | no; increment I8 |

- **Example profiles.** Sketches beyond the two existing singers: a castrato-like voice (as understood from accounts, a boy's light larynx in an adult-sized body: K near 1 with a high pitch, a light source and strong formant tuning); an extended-technique vocalist (a wide range and many source regimes with a flexible tract; the engine has breath, noise and fry, not the full set).
- **Calibration of registers and source.** The tract side can be calibrated by sweeping the model, as `src/concert/voice/tuning.py` does for jaw opening. Register and source behaviour would have to come from published voice research or from listening verdicts; none of it is checked against real voices. The model is a simplified acoustic synthesis, so whether a profile sounds like, say, a castrato cannot be validated by measurement.

## Performance

- **Order of repairs.** When a syllable is infeasible, a candidate order of repairs, cheapest first: vowel modification within tolerance; a per-note tract adjustment within range; a phonation or level change; stronger consonants; a mix change; last, a melody change, which would need the user's consent. The mix and melody changes are not in the [compromise inventory](performance/compromise-inventory.md), and consent for a melody change is not covered by [decision 0004](../decisions/0004-shortfall-default.md).

## Song neutrality

- Song-specific material still sits outside `songs/<name>/`: the Danny Boy tune, syllables and moods in `src/concert/performance/score.py`; the interpretation tables in `src/concert/performance/perform.py`; the Danny Boy personas in `src/concert/voice/persona.py`; the arrangement in `src/concert/band/arrange.py`; and the song and accent paths hard-coded in `src/concert/performance/perform.py`. The project mandate keeps song data in `songs/<name>/`. Increments I14 and I15 move them, in the form set out in the [description model](description/model.md); Wild Rover (increment I10) waits for them.

## Description model

- **Rubato written into the notes.** The last line of each verse has rubato written into its note lengths: dotted sixteenths, and notes that cross the barline. Either the song keeps these lengths as written, as an editor's transcription might, or the song gets the plain tune and the rubato moves into the tempo map. The owner decides before the Danny Boy score is final (increment I14).
- **Two chord tables.** The chord table in `src/concert/performance/score.py` and the arrangement's own comments disagree in places; line 1 is `Eb/G … Fm7 Bb7` in one and `Eb/Bb … Fm9 Bb7sus` in the other. The owner decides which is right before the chord line becomes the one source (increment I14).
- **abc2xml as a dependency.** abc2xml is licensed under the LGPL. Its PyPI wrapper, `abc-xml-converter`, has one maintainer. Whether to pin the wrapper or vendor abc2xml from upstream is settled in increment I11.
- **Score model library.** partitura reads MusicXML and was built for performance modelling; it is an alternative to music21 for the score model. Its licence and fit with the dependency rules are not yet checked (increment I11).
- **Harp residual.** The harp's timings in `src/concert/band/arrange.py` are not on a sixteenth grid. A byte-identical migration therefore needs per-note offsets as overrides, and how many the player model leaves is not known until increment I15.
- **Breadth across genres.** Only Western tonal folk song has been round-tripped. Drum kit and other unpitched percussion, guitar tablature, microtonal pitch, swing feel and chart-only music are untested (deferred increment I19).
- **Vocal techniques.** Belting, growl, rap delivery and throat singing are outside what the tract and glottis models can do; songs in genres that need them are limited by the voice model, not by the score format.
- **Recordings for calibration.** Measuring a profile from recordings needs recordings with the singer's consent and clear rights. A profile measured from a named person's voice is a question of likeness as well as of technique (deferred increment I18).

## Delivery

- **Video as a deliverable.** Whether the MP4 export (increment I1) should be a release deliverable, or stay a developer tool.
- **Safari and mobile coverage.** CI runs Playwright's WebKit build, which is not Safari. Real Safari on macOS and iOS, and other mobile browsers, are tested by hand. Autoplay unlocking, element fullscreen on iPhone and the size of the page (about 12 MB) are the known risks there.
