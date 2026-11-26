"""persona.py - who is singing.  Per-line voice settings for a female singer who is middle-aged in verse one,
ageing through the first half of verse two, and a ghost from "And I shall hear" (line 12) to the end.

  K      tract scale: the physical section time is multiplied by K, so every formant moves by 1/K (0.86 = +16%).
  rd     glottal pulse shape offset (higher = breathier, softer closure)
  jit/shim/jhi/flut/aflut/xam   pitch and loudness irregularity (age shows here)
  nv/nu  voiced / unvoiced breath noise
Nothing here touches the performance, so the film timeline does not depend on the persona.
"""

import json
import os
from pathlib import Path

from concert import ROOT
from concert.diction import singer as SG

AGE_FROM, GHOST_FROM = 8, 12
SHIFT = int(
    os.environ.get(
        "BIDE_SHIFT",
        json.loads(Path(os.path.join(ROOT, "key.json")).read_text())["shift"],
    )
)  # semitones above the original key; the band reads the same file            # first line of the ageing section / of the posthumous section

SINGER = "female"
FEM = dict(SG.load(SINGER), xpose=SHIFT)  # the singer profile, raised to the song's key


def phase(li):
    """The singer's phase on line `li`: mid, age or ghost (BIDE_PHASE forces one for every line)."""
    f = os.environ.get("BIDE_PHASE")  # test hook: force one phase for every line
    if f in ("mid", "age", "ghost"):
        return f
    return "mid" if li < AGE_FROM else ("age" if li < GHOST_FROM else "ghost")


def line_cfg(li: int, user: dict | None = None) -> dict:
    """Engine settings for line `li` under the persona of its phase, with `user` settings on top."""
    c = dict(FEM)
    if phase(li) == "age":
        u = max(
            0.25, min(1.0, (li - AGE_FROM + 1) / float(GHOST_FROM - AGE_FROM))
        )  # .25 .5 .75 1.0
        c.update(
            K=0.84 + 0.02 * u,
            rd=0.30 + 0.35 * u,
            jit=0.9 + 1.5 * u,
            shim=1.2 + 1.6 * u,
            flut=9 + 26 * u,
            aflut=1.3 * u,
            nv=0.80 + 0.25 * u,
            xam=0.6 * u,
            xvib=0.11 * u,
        )
    elif phase(li) == "ghost":
        c.update(K=0.77, rd=1.0, jit=0.5, shim=0.7, flut=5, nv=1.35, nu=0.70, aflut=0.4)
    c.update(user or {})
    return c


def shape_perf(perf: dict, user: dict | None = None) -> dict:
    """breath and tension tracks (200 Hz) and level, per phase."""
    sc = json.loads(Path(os.path.join(ROOT, "build", "score.json")).read_text())
    cr = perf["cr"]
    for L in sc["lines"]:
        li = L["i"]
        ph = phase(li)
        if ph == "mid":
            continue
        if ph == "age":
            u = max(0.25, min(1.0, (li - AGE_FROM + 1) / float(GHOST_FROM - AGE_FROM)))
            db, br, tn = -0.4 * u, 0.10 * u, -0.05 * u
        else:
            db, br, tn = -2.0, 0.30, -0.18
        i0 = max(0, int((L["t0"] - 0.6) * cr))
        i1 = min(len(perf["db"]) - 1, int((L["t1"] + 0.6) * cr))
        for i in range(i0, i1 + 1):
            if perf["db"][i] > -50:
                perf["db"][i] += db
            perf["breath"][i] = (
                min(0.95, perf["breath"][i] + br)
                if perf["f0"][i] > 60
                else perf["breath"][i]
            )
            perf["tension"][i] = max(0.05, perf["tension"][i] + tn)
    return perf
