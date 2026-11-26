---
type: open-questions
title: Open questions
description: Unresolved questions and known risks in the voice model, the performance design, song neutrality and delivery; read before planning work.
---

# Open questions

## Voice model

- **Ghost verse intelligibility and `burstgain`.** The full female build at 1.0× with the five model corrections lost intelligibility verse by verse, and the last verse was hardly intelligible; the original female build was acceptable. The first suspect is weaker stop releases (`burstgain` 0.3) under the ghost persona's extra breath noise. Test: compare the ghost lines with the corrections on and off, and against the `dboh` build that predates them. See [model corrections](performance/model-corrections.md). A second candidate is the persona overlays themselves: the ghost raises formants a further 9% (K 0.77), sets Rd to 1.0 and raises breath noise on every word, with no awareness of which words are at the margin ([singer profile](singer-profile.md)).
- **Line 4 candidates on the female singer.** `relcoda`, `fricrel`, `siblip` and `diphhold` were set on line 4 at 1.75× with the default male voice. They are off by default until confirmed on the female singer at 1.0×, including the ageing and ghost personas. The `siblip` value needs checking on the shorter female tract; the 40% and 250 ms `diphhold` thresholds are judgements from one line.
- **Switches not adopted.** `frlp` may be redundant with the microphone stage's 11 kHz low-pass; check before adopting. `finalburst` is a candidate for removal. `tailglide` exists only for comparison.
- **`keepcons` as default timing.** Optional until the feasibility measures show where it matters. See [consonant timing](performance/consonant-timing.md).

## Song neutrality

- Song-specific material still sits outside `songs/<name>/`: the Danny Boy tune, syllables and moods in `music/score.py`; the Danny Boy personas in `voice/persona.py`; and the song and accent paths hard-coded in `music/perform.py`. The project mandate keeps song data in `songs/<name>/`. Which increment moves them is not yet decided; Wild Rover (increment I10) cannot start cleanly until it is done.

## Delivery

- **Video as a deliverable.** Whether the MP4 export (increment I1) should be a release deliverable, or stay a developer tool.
- **Safari and mobile coverage.** CI runs Playwright's WebKit build, which is not Safari. Real Safari on macOS and iOS, and other mobile browsers, are tested by hand. Autoplay unlocking, element fullscreen on iPhone and the size of the page (about 12 MB) are the known risks there.
