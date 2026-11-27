"""opts.py - experiment switches. BIDE_LEGATO is a JSON object. Switches default off except the model corrections in FIXES
(lipcon, burst, burstgain 0.3, codaasp, place), which default on.
  level: per-note loudness changes slewed over ~60 ms      pitch: legato glides, no leap kicks on short notes
  artic: vowel moves start earlier and approach targets more slowly (overlap, undershoot on short notes)
  cons:  consonant durations shrink with note length; no glottal dip at vowel-vowel word joins
  fit:   consonant gestures intrude at most 30% into neighbouring vowels   tail: long vowels prompt
  tailglide: line-final diphthong glide halved (a full glide inside 'tail' made 'bide' sound like 'bard')
  reduce: apply the connected-speech catalogue (connected_speech.json): weak forms, t/d-deletion,
          degemination, place assimilation, yod coalescence, syllabic sonorants, linking glides
          (true = every rule; a list of rule ids = only those)
  color: (diagnostic) one voice colour for every line, e.g. "warm"
  release: phrase ends fade over ~0.3 s with the glottis opening, then an aspiration tail (~0.35 s)
  relcoda: with release, a line ending in a consonant keeps the vowel (and its diphthong glide) at full voice;
           the fade starts at the final consonant, and the glottis opens for the out-breath only after it (the 'bide' heard as 'bu')
  lipcon: (correction) the lip constriction counts only where the lips, not the tongue tip, narrow the tube;
          stops a relaxing F/V lip gesture inheriting a T/D release (the "soft you" click)
  burst: (correction) release-burst strength follows oral pressure^1.5, as frication does, not its square root;
          voiced stops (lower pressure) burst ~8 dB weaker than under a square-root law (the "oh Danny" click)
  burstgain: (calibration) multiplier on the release transient, every place of articulation; default 1.0
  comma: phrase-final lengthening (x1.25) of the coda before punctuation inside a line, as at the line end
  codaasp: a coda P/T/K before a voiced sound is unaspirated: the glottis closes at the release, not ~25 ms into the next sound
  keepcons: on short notes consonants keep >=70% of their table length and the vowel absorbs the tempo
          (vowel floor 50 ms or 15% of the syllable, instead of 42% with codas squeezed to 35%)
  place: after a tongue-tip fricative (S Z SH ZH TH DH) the next tip place move waits until its last ~30 ms
         (otherwise S drifts to a dental place mid-way and its second half sounds like TH, as in "pipes");
         T/D/N after S/Z close at the S place (homorganic /st/: no broadband hiss at the end of 'must')
  diphhold: diphthong glides reach the second element and hold it ~80 ms before what follows (glide up to 0.4 s)
  pricefront: (accent calibration) PRICE onset moved this fraction from [A] toward [AE], e.g. 0.35
  finalrel: a line-final B/D/G releases at 55% of its time into a short voiced schwa ('bide-uh'); use with relcoda
  sibgain: (calibration) S/Z frication gain multiplier; default 1.0
  frlp: (calibration) 2-pole low-pass on the frication noise source at this frequency in Hz (e.g. 8000); default off
  siblip: (calibration) lip aperture in cm during S/Z (e.g. 0.7) instead of the open 0.95-1.35; lowers the sibilant peak
  fricrel: an S before a voiced sound tapers: the glottis has closed by the release and the tongue lets go along u**fricrel (1.0) instead of the stop-like u**2.2
  finalburst: extra gain on the release burst of a line-final B/D/G under finalrel (e.g. 5 = x6)
  finallen: a line-final B/D/G is this many times longer (e.g. 2.0); the time comes out of the vowel before it"""

import json
import os

# model corrections, on by default (set one false in BIDE_LEGATO to hear the model without it)
FIXES = {
    "lipcon": True,
    "burst": True,
    "burstgain": 0.3,
    "codaasp": True,
    "place": True,
}
LEGATO = dict(FIXES, **json.loads(os.environ.get("BIDE_LEGATO", "{}") or "{}"))
