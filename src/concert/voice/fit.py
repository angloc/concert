"""fit.py - fit articulator settings so that the tube resonances match a singer's target formants (16.3 cm tract).
Reads singers/<name>/targets.json and writes build/<name>/shapes.json.   concert-fit --singer <name> [sound ...]"""

import argparse
import json
import math
import os
import random
import zlib
from multiprocessing import Pool
from pathlib import Path

from concert.voice import shapes as SH
from concert.voice import tract as T

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


def cost(v, keys, tg, pr):
    """Fit cost of parameter vector `v` for targets `tg` from prior `pr`: formant error plus penalties for leaving the limits."""
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


def job(a):
    """Fit one vowel or consonant `name` to targets `tg` from prior `pr`, for `a` = (name, tg, pr): (name, posture, cost, formants)."""
    name, tg, pr = a
    rnd = random.Random(zlib.crc32(name.encode()) & 0xFFFF)
    keys = ["J", "X", "Y", "TR", "LA", "LP"]
    if name in ("ER", "R"):
        keys += ["TT", "BP"]
    if name in ("IY", "Y", "AO", "OR", "UW", "O", "W"):
        keys += ["LH"]
    best = None
    for tr in range(5):
        x0 = [pr[k] + (rnd.gauss(0, 0.5) * SC[k] if tr else 0) for k in keys]
        x, v = neldermead(
            lambda q: cost(q, keys, tg, pr), x0, [SC[k] * 0.6 for k in keys]
        )
        if best is None or v < best[1]:
            best = (x, v)
    a = dict(pr)
    for k, x in zip(keys, best[0]):
        a[k] = max(LIM[k][0], min(LIM[k][1], x))
    A, dx = T.areas(a)
    F = T.formants(A, dx, n=5, step=20.0)
    return name, a, best[1], [(round(f), round(b), round(h, 1)) for f, b, h in F]


def main(argv: list[str] | None = None) -> None:
    """Command line: concert-fit --singer <name> [--out file] [sound ...]; refits the named sounds (all by default)."""
    ap = argparse.ArgumentParser(prog="concert-fit")
    ap.add_argument("--singer", required=True)
    ap.add_argument("--out")
    ap.add_argument("sounds", nargs="*")
    a = ap.parse_args(argv)
    TG = SH.targets(a.singer)
    names = a.sounds or list(TG)
    path = a.out or SH.path(a.singer)
    out = (
        json.loads(Path(path).read_text()) if os.path.exists(path) and a.sounds else {}
    )
    with Pool(2) as p:
        jobs = [(n, TG[n]["formants"], TG[n]["prior"]) for n in names]
        for name, art, v, F in p.imap_unordered(job, jobs):
            out[name] = {
                "art": {k: round(x, 4) for k, x in art.items()},
                "F": F,
                "target": TG[name]["formants"],
                "cost": round(v, 4),
            }
            print(
                f"{name!s:<3} cost {v:.3f}  tgt {TG[name]['formants']}  got {[f[:2] for f in F]}\n      { ({k: round(x, 2) for k, x in art.items()}) }"
            )
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    Path(path).write_text(json.dumps(out, indent=1, sort_keys=True))
