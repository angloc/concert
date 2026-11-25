"""opts.py - experiment switches. BIDE_LEGATO is a JSON object; every switch defaults off, so builds are unchanged unless set.
  level: per-note loudness changes slewed over ~60 ms      pitch: legato glides, no leap kicks on short notes
  artic: vowel moves start earlier and approach targets more slowly (overlap, undershoot on short notes)
  cons:  consonant durations shrink with note length; no glottal dip at vowel-vowel word joins"""
import json, os
LEGATO = json.loads(os.environ.get("BIDE_LEGATO", "{}") or "{}")
