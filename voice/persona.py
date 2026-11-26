"""persona.py - who is singing.  Per-line voice settings for a female singer who is middle-aged in verse one,
ageing through the first half of verse two, and a ghost from "And I shall hear" (line 12) to the end.

  K      tract scale: the physical section time is multiplied by K, so every formant moves by 1/K (0.86 = +16%).
  rd     glottal pulse shape offset (higher = breathier, softer closure)
  jit/shim/jhi/flut/aflut/xam   pitch and loudness irregularity (age shows here)
  nv/nu  voiced / unvoiced breath noise
Nothing here touches music/perform.py, so the film timeline is unchanged.
"""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)

AGE_FROM, GHOST_FROM = 8, 12
SHIFT = int(os.environ.get("BIDE_SHIFT", json.load(open(os.path.join(ROOT, "key.json")))["shift"]))   # semitones above the original key; the band reads the same file            # first line of the ageing section / of the posthumous section

import sys; sys.path.insert(0, os.path.join(ROOT, "engine")); import singer as SG
SINGER = "female"
FEM = dict(SG.load(SINGER), xpose=SHIFT)                 # the singer profile, raised to the song's key

def phase(li):
    f = os.environ.get("BIDE_PHASE")                      # test hook: force one phase for every line
    if f in ("mid", "age", "ghost"): return f
    return "mid" if li < AGE_FROM else ("age" if li < GHOST_FROM else "ghost")

def line_cfg(li, user=None):
    c = dict(FEM)
    if phase(li) == "age":
        u = max(.25, min(1.0, (li - AGE_FROM + 1) / float(GHOST_FROM - AGE_FROM)))   # .25 .5 .75 1.0
        c.update(K=.84 + .02 * u, rd=.30 + .35 * u, jit=.9 + 1.5 * u, shim=1.2 + 1.6 * u, flut=9 + 26 * u,
                 aflut=1.3 * u, nv=.80 + .25 * u, xam=.6 * u, xvib=.11 * u)
    elif phase(li) == "ghost":
        c.update(K=.77, rd=1.0, jit=.5, shim=.7, flut=5, nv=1.35, nu=.70, aflut=.4)
    c.update(user or {})
    return c

def shape_perf(perf, user=None):
    """breath and tension tracks (200 Hz) and level, per phase."""
    sc = json.load(open(os.path.join(ROOT, "build", "score.json"))); cr = perf["cr"]
    for L in sc["lines"]:
        li = L["i"]; ph = phase(li)
        if ph == "mid": continue
        if ph == "age": u = max(.25, min(1.0, (li - AGE_FROM + 1) / float(GHOST_FROM - AGE_FROM))); db, br, tn = -.4 * u, .10 * u, -.05 * u
        else: db, br, tn = -2.0, .30, -.18
        i0 = max(0, int((L["t0"] - .6) * cr)); i1 = min(len(perf["db"]) - 1, int((L["t1"] + .6) * cr))
        for i in range(i0, i1 + 1):
            if perf["db"][i] > -50:
                perf["db"][i] += db
            perf["breath"][i] = min(.95, perf["breath"][i] + br) if perf["f0"][i] > 60 else perf["breath"][i]
            perf["tension"][i] = max(.05, perf["tension"][i] + tn)
    return perf
