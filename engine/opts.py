"""opts.py - experiment switches. BIDE_LEGATO is a JSON object; every switch defaults off, so builds are unchanged unless set.
  level: per-note loudness changes slewed over ~60 ms      pitch: legato glides, no leap kicks on short notes
  artic: vowel moves start earlier and approach targets more slowly (overlap, undershoot on short notes)
  cons:  consonant durations shrink with note length; no glottal dip at vowel-vowel word joins
  fit:   consonant gestures intrude at most 30% into neighbouring vowels   tail: line-final glide halved, long vowels prompt
  reduce: apply the connected-speech catalogue (engine/connected_speech.json): weak forms, t/d-deletion,
          degemination, place assimilation, yod coalescence, syllabic sonorants, linking glides
          (true = every rule; a list of rule ids = only those)
  color: (diagnostic) one voice colour for every line, e.g. "warm"
  release: phrase ends fade over ~0.3 s with the glottis opening, then an aspiration tail (~0.35 s)
  lipcon: (bug fix) the lip constriction counts only where the lips, not the tongue tip, narrow the tube;
          stops a relaxing F/V lip gesture inheriting a T/D release (the "soft you" click)
  burst: (bug fix) release-burst strength follows oral pressure^1.5, as frication does, not its square root;
          voiced stops (lower pressure) burst ~8 dB weaker than before (the "oh Danny" click)
  burstgain: (calibration) multiplier on the release transient, every place of articulation; default 1.0
  comma: phrase-final lengthening (x1.25) of the coda before punctuation inside a line, as at the line end
  codaasp: a coda P/T/K before a voiced sound is unaspirated: the glottis closes at the release, not ~25 ms into the next sound
  place: after a tongue-tip fricative (S Z SH ZH TH DH) the next tip place move waits until its last ~30 ms
         (the first "pipes": S drifted to a dental place mid-way, so its second half sounded like TH)"""
import json, os
LEGATO = json.loads(os.environ.get("BIDE_LEGATO", "{}") or "{}")
