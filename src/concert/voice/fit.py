"""fit.py - fit articulator settings so that the tube resonances match target formants of a 16.3 cm tract.
Writes shapes.json beside this module.   concert-fit [vowel ...]"""

import json
import math
import os
import random
import sys
from multiprocessing import Pool
from pathlib import Path

from concert.voice import tract as T

HERE = os.path.dirname(os.path.abspath(__file__))


# name: (targets F1..F3[,F4], prior posture)
def P(J, X, Y, LA, LP, TR=0.0, TT=0.0, BP=13.6, LH=0.0, EP=0.0):
    """An articulator posture with the given settings."""
    return {
        "J": J,
        "X": X,
        "Y": Y,
        "TR": TR,
        "TT": TT,
        "BP": BP,
        "LA": LA,
        "LP": LP,
        "LH": LH,
        "EP": EP,
    }


TG = {
    "IY": ((330, 2370, 3040, 3650), P(0.12, 0.95, 0.20, 1.15, -0.30, 0.35)),
    "IH": ((430, 2050, 2740, 3600), P(0.25, 0.55, 0.15, 1.15, -0.15, 0.15)),
    "EY": ((480, 2100, 2740, 3600), P(0.28, 0.60, 0.10, 1.2, -0.15, 0.15)),
    "EH": ((610, 1880, 2680, 3600), P(0.45, 0.40, -0.10, 1.4, -0.05)),
    "AE": ((755, 1750, 2580, 3600), P(0.70, 0.35, -0.30, 1.7, -0.15)),
    "A": ((800, 1310, 2600, 3600), P(0.75, -0.30, -0.30, 1.7, 0.0)),
    "AA": ((790, 1180, 2600, 3600), P(0.75, -0.60, -0.20, 1.6, 0.0)),
    "AO": ((605, 930, 2560, 3500), P(0.60, -0.60, 0.10, 1.15, 0.30)),
    "OR": ((510, 900, 2500, 3450), P(0.40, -0.50, 0.30, 0.85, 0.45)),
    "AH": ((690, 1280, 2580, 3550), P(0.50, -0.30, 0.0, 1.35, 0.0)),
    "AX": ((520, 1480, 2600, 3550), P(0.30, 0.0, 0.05, 1.1, 0.0)),
    "UH": ((460, 1100, 2460, 3500), P(0.28, -0.10, 0.40, 0.85, 0.25)),
    "UW": ((370, 1060, 2420, 3450), P(0.15, 0.25, 0.65, 0.62, 0.60)),
    "O": ((525, 940, 2520, 3450), P(0.40, -0.40, 0.40, 0.80, 0.50)),
    "ER": ((500, 1440, 1790, 3350), P(0.25, 0.25, 0.0, 0.85, 0.40, 0.0, 0.85, 12.4)),
    "R": ((400, 1200, 1620, 3300), P(0.18, 0.20, 0.10, 0.70, 0.50, 0.0, 0.95, 12.5)),
    "L": ((380, 1150, 2650, 3500), P(0.25, -0.20, 0.20, 1.15, 0.0, 0.0)),
    "LD": ((460, 920, 2620, 3600), P(0.35, -0.50, 0.30, 1.1, 0.05, 0.0)),
    "W": ((340, 800, 2420, 3400), P(0.12, -0.15, 0.80, 0.45, 0.75)),
    "Y": ((300, 2450, 3150, 3650), P(0.08, 1.0, 0.20, 1.05, -0.25, 0.35)),
}
SC = {
    "J": 0.25,
    "X": 0.35,
    "Y": 0.35,
    "TR": 0.35,
    "LA": 0.35,
    "LP": 0.30,
    "TT": 0.30,
    "BP": 0.8,
    "LH": 0.3,
    "EP": 0.10,
}
LIM = {
    "J": (0.02, 1.0),
    "X": (-1.15, 1.25),
    "Y": (-0.7, 1.1),
    "TR": (-0.55, 0.8),
    "LA": (0.40, 2.8),
    "LP": (-0.45, 1.0),
    "TT": (0, 1.35),
    "BP": (11.2, 14.2),
    "LH": (-0.4, 0.5),
    "EP": (-0.18, 0.25),
}


def cost(v, keys, name):
    """Fit cost of parameter vector `v` for target `name`: formant error plus penalties for leaving the limits."""
    tg, pr = TG[name]
    a = dict(pr)
    pen = 0.0
    for k, x in zip(keys, v):
        lo, hi = LIM[k]
        if x < lo:
            pen += ((lo - x) / SC[k]) ** 2 * 4
            x = lo
        if x > hi:
            pen += ((x - hi) / SC[k]) ** 2 * 4
            x = hi
        a[k] = x
        pen += (0.05 if k == "J" else 0.022) * ((x - pr[k]) / SC[k]) ** 2
    A, dx = T.areas(a)
    F = T.formants(A, dx, n=5, step=40.0, fmax=4600)
    if len(F) < 4:
        return 60 + pen
    w = (320, 260, 130, 22)
    c = 0.0
    for (f, b, h), t, ww in zip(F, tg, w):
        c += ww * math.log(f / t) ** 2 * 1.0
    return c * 10 + pen


def neldermead(fn, x0, step, it=420):
    """Minimise `fn` from `x0` by the Nelder-Mead simplex method; returns (best point, best value)."""
    n = len(x0)
    S = [list(x0)]
    for i in range(n):
        y = list(x0)
        y[i] += step[i]
        S.append(y)
    V = [fn(s) for s in S]
    for _ in range(it):
        o = sorted(range(n + 1), key=lambda i: V[i])
        S = [S[i] for i in o]
        V = [V[i] for i in o]
        if V[-1] - V[0] < 1e-6:
            break
        c = [sum(s[j] for s in S[:-1]) / n for j in range(n)]
        r = [2 * c[j] - S[-1][j] for j in range(n)]
        vr = fn(r)
        if vr < V[0]:
            e = [3 * c[j] - 2 * S[-1][j] for j in range(n)]
            ve = fn(e)
            if ve < vr:
                S[-1], V[-1] = e, ve
            else:
                S[-1], V[-1] = r, vr
        elif vr < V[-2]:
            S[-1], V[-1] = r, vr
        else:
            k = [0.5 * (c[j] + S[-1][j]) for j in range(n)]
            vk = fn(k)
            if vk < V[-1]:
                S[-1], V[-1] = k, vk
            else:
                for i in range(1, n + 1):
                    S[i] = [0.5 * (S[i][j] + S[0][j]) for j in range(n)]
                    V[i] = fn(S[i])
    i = min(range(n + 1), key=lambda i: V[i])
    return S[i], V[i]


def job(name):
    """Fit one vowel or consonant target `name`: (name, posture, cost, formants)."""
    _tg, pr = TG[name]
    rnd = random.Random(hash(name) & 0xFFFF)
    keys = ["J", "X", "Y", "TR", "LA", "LP"]
    if name in ("ER", "R"):
        keys += ["TT", "BP"]
    if name in ("IY", "Y", "AO", "OR", "UW", "O", "W"):
        keys += ["LH"]
    best = None
    for tr in range(5):
        x0 = [pr[k] + (rnd.gauss(0, 0.5) * SC[k] if tr else 0) for k in keys]
        x, v = neldermead(
            lambda q: cost(q, keys, name), x0, [SC[k] * 0.6 for k in keys]
        )
        if best is None or v < best[1]:
            best = (x, v)
    a = dict(pr)
    for k, x in zip(keys, best[0]):
        a[k] = max(LIM[k][0], min(LIM[k][1], x))
    A, dx = T.areas(a)
    F = T.formants(A, dx, n=5, step=20.0)
    return name, a, best[1], [(round(f), round(b), round(h, 1)) for f, b, h in F]


def main() -> None:
    """Command line: concert-fit [name ...]; refits the named shapes (all by default) into shapes.json."""
    names = sys.argv[1:] or list(TG)
    path = os.path.join(HERE, "shapes.json")
    out = (
        json.loads(Path(path).read_text())
        if os.path.exists(path) and sys.argv[1:]
        else {}
    )
    with Pool(2) as p:
        for name, a, v, F in p.imap_unordered(job, names):
            out[name] = {
                "art": {k: round(x, 4) for k, x in a.items()},
                "F": F,
                "target": TG[name][0],
                "cost": round(v, 4),
            }
            print(
                f"{name!s:<3} cost {v:.3f}  tgt {TG[name][0]}  got {[f[:2] for f in F]}\n      { ({k: round(x, 2) for k, x in a.items()}) }"
            )
    Path(path).write_text(json.dumps(out, indent=1, sort_keys=True))
