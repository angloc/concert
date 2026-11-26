"""gest.py - phoneme segments -> articulator trajectories (gestural score with per-articulator timing)."""

import json
import math
import os
from pathlib import Path

HERE = os.path.dirname(os.path.abspath(__file__))
from concert.diction.opts import LEGATO

BODY = ["J", "X", "Y", "TR", "TT", "BP", "LA", "LP", "LH", "EP"]
_SJ = json.loads(Path(os.path.join(HERE, "shapes.json")).read_text())
SHAPES = {k: v["art"] for k, v in _SJ.items()}
F1OF = {k: v["F"][0][0] for k, v in _SJ.items()}
OPENTO = {
    "IY": "IH",
    "Y": "IH",
    "IH": "EH",
    "EY": "EH",
    "UW": "UH",
    "UH": "AH",
    "O": "AH",
    "OR": "AH",
    "ER": "AH",
    "AX": "AH",
}


def opened(name, f0):
    """on high notes the mouth opens so that the first formant stays above the pitch."""
    s = dict(SHAPES[name])
    if f0 and name in OPENTO:
        need = 1.20 * f0 - F1OF[name]
        if need > 0:
            b = SHAPES[OPENTO[name]]
            u = min(0.75, need / max(60.0, F1OF[OPENTO[name]] - F1OF[name]))
            s = {k: s[k] + (b[k] - s[k]) * u for k in BODY}
    return s


VOW = {
    "AA",
    "AE",
    "AH",
    "AO",
    "AW",
    "AY",
    "EH",
    "ER",
    "EY",
    "IH",
    "IY",
    "OW",
    "OH",
    "OY",
    "UH",
    "UW",
}
# per-articulator lead (s before the syllable's first consonant) and settle (s after vowel onset)
LEAD = {
    "J": 0.050,
    "X": 0.055,
    "Y": 0.055,
    "TR": 0.050,
    "TT": 0.045,
    "BP": 0.04,
    "LA": 0.060,
    "LP": 0.110,
    "LH": 0.06,
    "EP": 0.06,
}
SETT = {
    "J": 0.11,
    "X": 0.130,
    "Y": 0.130,
    "TR": 0.130,
    "TT": 0.09,
    "BP": 0.08,
    "LA": 0.09,
    "LP": 0.09,
    "LH": 0.15,
    "EP": 0.14,
}
OPEN = 2.6
DIPH = {
    "AY": ("A", "IH", 1.0),
    "OY": ("AO", "IH", 1.0),
    "AW": ("A", "UH", 1.1),
    "EY": ("EY", "IY", 0.75),
    "OW": ("O", "UW", 0.62),
}

# vowel-inherent movement: (toward, how far)
OFFG = {
    "AE": ("AX", 0.22),
    "EH": ("AX", 0.22),
    "IH": ("AX", 0.18),
    "AH": ("AX", 0.12),
    "AO": ("AH", 0.16),
    "AA": ("AH", 0.16),
    "IY": ("Y", 0.30),
    "UW": ("W", 0.16),
    "ER": ("R", 0.18),
    "UH": ("AX", 0.2),
}


class Track:
    """One articulator's trajectory: targets reached by critically damped moves."""

    __slots__ = ("tr", "v0")

    def __init__(self, v0):
        self.v0 = v0
        self.tr = []

    def to(self, ts, te, v, div=4.3):
        te = max(te, ts + 0.004)
        self.tr.append((ts, te, v, div))

    def sample(self, times):
        """critically damped approach to each target (task dynamics); overlapping moves blend."""
        ex = math.exp
        tr = sorted((ts, te, v, (te - ts) / dv) for ts, te, v, dv in self.tr)
        n = len(tr)
        i = 0
        base = self.v0
        act = []
        out = []
        for t in times:
            while i < n and tr[i][0] <= t:
                act.append(tr[i])
                i += 1
            while act and t - act[0][0] > 11 * act[0][3]:
                base = act.pop(0)[2]
            v = base
            for ts, te, x, tau in act:
                u = (t - ts) / tau
                v += (x - v) * (1.0 - (1.0 + u) * ex(-u))
            out.append(v)
        return out


class Bumps:
    """max / min envelope over independent rise-hold-fall gestures."""

    __slots__ = ("b", "mode", "rest")

    def __init__(self, rest, mode):
        self.rest = rest
        self.b = []
        self.mode = mode

    def add(self, r0, r1, f0, f1, v, pw=2.2):
        r1 = max(r1, r0 + 0.004)
        f0 = max(f0, r1)
        f1 = max(f1, f0 + 0.004)
        self.b.append((r0, r1, f0, f1, v, pw))

    def sample(self, times):
        bs = sorted(self.b)
        out = []
        R = self.rest
        n = len(bs)
        i = 0
        act = []
        mx = self.mode == "max"
        mul = self.mode == "mul"
        fast = self.mode == "min"
        for t in times:
            while i < n and bs[i][0] <= t:
                act.append(bs[i])
                i += 1
            if act:
                act = [b for b in act if b[3] > t]
            v = R
            for r0, r1, f0, f1, x, pw in act:
                if t < r1:
                    u = (t - r0) / (r1 - r0)
                elif t < f0:
                    u = 1.0
                else:
                    u = (f1 - t) / (f1 - f0)
                    if fast:
                        u = u**pw
                        v = min(v, R + (x - R) * u)
                        continue
                u = u * u * u * (10 - u * (15 - 6 * u))
                y = R + (x - R) * u
                if mx:
                    v = max(v, y)
                elif mul:
                    v *= y
                elif y < v:
                    v = y
            out.append(v)
        return out


class _Clamp:
    """legato 'fit': keep a consonant's gesture times inside [lo, hi] so neighbouring vowels keep an open stretch."""

    def __init__(self, T, lo, hi):
        self.T = T
        self.lo = lo
        self.hi = hi

    def __getitem__(self, k):
        return _ClampTrack(self.T[k], self.lo, self.hi)


class _ClampTrack:
    def __init__(self, tr, lo, hi):
        self.tr = tr
        self.c = lambda x: min(hi, max(lo, x))

    def to(self, ts, te, v, *a):
        self.tr.to(self.c(ts), self.c(te), v, *a)

    def add(self, r0, r1, f0, f1, v, *a):
        self.tr.add(self.c(r0), self.c(r1), self.c(f0), self.c(f1), v, *a)


def shape(name):
    """A copy of the fitted articulator posture `name`."""
    return dict(SHAPES[name])


def mix(a, b, u):
    """Posture between `a` and `b` at fraction `u`."""
    return {k: a[k] + (b[k] - a[k]) * u for k in BODY}


def vowel_targets(g, nxt, line):
    """list of (name_or_shape, fraction) for the nucleus."""
    p = g["ph"]
    fz = g.get("f0", 0)
    if p in DIPH:
        a, b, u = DIPH[p]
        A = opened(a, fz)
        if p == "AY" and LEGATO.get("pricefront"):
            A = mix(A, opened("AE", fz), float(LEGATO["pricefront"]))
        return A, mix(A, opened(b, fz), u)
    if p == "AH":
        s = opened("AX" if g.get("weak") else "AH", fz)
    elif p == "OH":
        s = opened("O", fz)  # pure [o:] (Irish GOAT)
    elif p == "AO" and nxt and nxt["ph"] == "R":
        s = opened("OR", fz)
    elif p in SHAPES:
        s = opened(p, fz)
    else:
        s = opened("AX", fz)
    if g.get("weak") and p not in ("AH",):
        s = mix(s, shape("AX"), 0.18)
    return s, None


class Score:
    """builds all tracks for one line."""

    def __init__(self, segs, perf, seed=0):
        self.segs = segs
        # a final -ing is sung ON the ng: the tongue closes early and the note hums
        a, b = segs[-2], segs[-1]
        if b["ph"] == "NG" and a["ph"] == "IH":
            tot = b["t1"] - a["t0"]
            m = a["t0"] + max(0.24, 0.46 * tot)
            a["t1"] = m
            b["t0"] = m
        for g in segs:
            if g["role"] == "nuc":
                cr = perf["cr"]
                q = [
                    x
                    for x in perf["f0"][int((g["t0"] + 0.05) * cr) : int(g["t1"] * cr)]
                    if x > 60
                ]
                g["f0"] = sorted(q)[int(len(q) * 0.6)] if q else 0
        first = next(g for g in segs if g["role"] == "nuc")
        s0, _ = vowel_targets(first, None, None)
        self.T = {k: Track(s0[k]) for k in BODY}
        for k, v in {"sTT": 14.6, "hTT": 0.25, "sTD": 9.4, "hTD": 0.45}.items():
            self.T[k] = Track(v)
        for k in ("cTT", "cTD", "cLI", "cLD"):
            self.T[k] = Bumps(OPEN, "min")
        for k in ("GA", "VEL", "LAT", "VST", "BG"):
            self.T[k] = Bumps(0.0, "max")  # BG: extra release-burst gain
        self.T["AV"] = Bumps(1.0, "mul")
        self.build()

    def build(self):
        S = self.segs
        T = self.T
        n = len(S)
        nuc = [i for i, g in enumerate(S) if g["role"] == "nuc"]
        # ---- consonants first: each one claims the body articulators it needs, vowels move in afterwards
        self.claim = {}
        for i, g in enumerate(S):
            if g["role"] != "nuc":
                self.cons(i, g)
        # ---- vowels
        for a, i in enumerate(nuc):
            g = S[i]
            nx = S[i + 1] if i + 1 < n else None
            v1, v2 = vowel_targets(g, nx, None)
            if v2 is not None and LEGATO.get("tailglide") and a == len(nuc) - 1:
                v2 = mix(v1, v2, 0.5)
            j = i
            while (
                j - 1 >= 0 and S[j - 1]["role"] == "on" and S[j - 1]["syl"] == g["syl"]
            ):
                j -= 1
            c0 = S[j]["t0"]
            hi = j == i  # vowel-initial syllable
            for k in BODY:
                ld, se = LEAD[k], SETT[k]
                if a == 0 and hi:
                    ld += 0.25
                ts = c0 - ld - (0.045 if hi else 0)
                te = g["t0"] + se
                for q in range(j - 2, i):
                    if q >= 0:
                        ts = max(ts, self.claim.get((q, k), -1))
                # do not steal more than 35% of the previous nucleus
                if a > 0:
                    pg = S[nuc[a - 1]]
                    ts = max(
                        ts,
                        pg["t0"]
                        + (0.15 if LEGATO.get("artic") else 0.45)
                        * (pg["t1"] - pg["t0"]),
                    )
                if LEGATO.get("artic"):
                    dv = 2.5
                    if LEGATO.get("tail"):
                        dv = 2.5 + 1.8 * min(
                            1, max(0, (g["t1"] - g["t0"] - 0.15) / 0.25)
                        )
                    if v2 is not None and LEGATO.get("diphhold"):
                        dv = max(
                            dv, 4.3
                        )  # a diphthong must reach its first element before gliding
                    T[k].to(ts, te, v1[k], dv)
                else:
                    T[k].to(ts, te, v1[k])
            if v2 is None:
                # a held vowel is never parked: it has its own slow off-glide and leans toward the next vowel
                d = g["t1"] - g["t0"]
                nv = None
                if a + 1 < len(nuc):
                    nv = vowel_targets(S[nuc[a + 1]], None, None)[0]
                og = OFFG.get(g["ph"])
                o = shape(og[0]) if og else v1
                ou = og[1] if og else 0
                if d > 0.16:
                    for k in ("X", "Y", "J", "TR", "LA"):
                        z = v1[k] + ou * (o[k] - v1[k])
                        if nv is not None:
                            z += 0.14 * (nv[k] - v1[k])
                        T[k].to(g["t0"] + 0.28 * d, g["t1"] + 0.05, z)
            if v2 is not None:
                d = g["t1"] - g["t0"]
                w = min(0.30, max(0.12, d * 0.52))
                # diphthong glide late, ending just into the next consonant
                last = i + 1 >= n
                te = g["t1"] + (0.02 if not last else -0.05)
                if LEGATO.get(
                    "diphhold"
                ):  # reach the second element and hold it ~80 ms before what follows
                    w = min(0.40, max(0.12, d * 0.52))
                    te = g["t1"] - min(0.08, 0.25 * d)
                    if d < 0.25 and not last:
                        te = (
                            g["t1"] + 0.02
                        )  # a short note has no time to hold: the glide runs on into the next consonant
                    w = min(
                        w if d >= 0.25 else 1.0, te - (g["t0"] + 0.40 * d)
                    )  # ...but the first element keeps at least 40% of the note
                for k in BODY:
                    T[k].to(te - w * (1.0 if k not in ("LP",) else 1.15), te, v2[k])
        if LEGATO.get(
            "release"
        ):  # phrase end: the glottis opens as the breath is let go
            te = S[-1]["t1"]
            if (
                LEGATO.get("relcoda") and S[-1]["role"] == "off"
            ):  # a final consonant is sung first; the breath goes after it
                T["GA"].add(te - 0.01, te + 0.12, te + 0.30, te + 0.40, 0.16)
            else:
                T["GA"].add(te - 0.12, te + 0.10, te + 0.30, te + 0.40, 0.16)
        # legato vowel-vowel joins at word boundaries: tiny glottal dip so words stay separate
        for a in range(1, len(nuc)):
            i = nuc[a]
            if S[i - 1]["role"] == "nuc" and not LEGATO.get("cons"):
                t = S[i]["t0"]
                T["AV"].add(t - 0.075, t - 0.015, t - 0.012, t + 0.06, 0.62)

    def cons(self, i, g):
        S = self.segs
        T = self.T
        n = len(S)
        p = g["ph"]
        t0, t1 = g["t0"], g["t1"]
        d = t1 - t0
        if LEGATO.get("fit"):
            q = 0.30
            pv = (
                next((h for h in S[i - 1 :: -1] if h["role"] == "nuc"), None)
                if i > 0
                else None
            )
            nv = next((h for h in S[i + 1 :] if h["role"] == "nuc"), None)
            lo = min(t0 - 0.015, pv["t1"] - q * (pv["t1"] - pv["t0"])) if pv else -1e9
            hi = max(t1 + 0.015, nv["t0"] + q * (nv["t1"] - nv["t0"])) if nv else 1e9
            T = _Clamp(T, lo, hi)
        prev = S[i - 1] if i > 0 else None
        nxt = S[i + 1] if i + 1 < n else None
        on = g["role"] == "on"
        # neighbouring vowel shape, used to place dorsal closures
        vi = next(
            (h for h in (S[i + 1 :] if on else S[i::-1]) if h["role"] == "nuc"), None
        )
        vs = vowel_targets(vi, None, None) if vi else None
        vsh = (vs[0] if on else (vs[1] or vs[0])) if vs else shape("AX")
        nextvoiced = nxt is not None and nxt["role"] == "nuc"

        def W(tgt, w):
            return {k: vsh[k] + (tgt[k] - vsh[k]) * w for k in tgt}

        def body(tgt, lead=0.045, at=0.35, keys=None):
            for k in keys or tgt:
                T[k].to(t0 - lead, t0 + at * d, tgt[k])
                self.claim[(i, k)] = t0 + min(0.8, at + 0.22) * d

        def ttp(a, b, place, width):
            # place: a tongue-tip fricative keeps its place until its last ~30 ms; the next tip target waits
            if (
                LEGATO.get("place")
                and prev is not None
                and prev["ph"] in ("S", "Z", "SH", "ZH", "TH", "DH")
            ):
                if p in ("T", "D", "N") and prev["ph"] in ("S", "Z"):
                    return  # /st/ is homorganic: close at the S place
                a = max(a, prev["t1"] - 0.03)
                b = max(b, a + 0.03)
            T["sTT"].to(a, b, place)
            T["hTT"].to(a, b, width)

        cl = d
        # finalrel: a line-final voiced stop is released into a short schwa, as singers do ("bide-uh")
        fin = (
            bool(LEGATO.get("finalrel"))
            and nxt is None
            and not on
            and p in ("B", "D", "G")
        )
        uv = ("P", "T", "K", "S", "SH", "CH", "F", "HH", "TH")
        nuv = nxt is not None and nxt["ph"] in uv
        puv = prev is not None and prev["ph"] in uv

        def AV(v, l=0.04, e=0.03):
            T["AV"].add(t0 - l, t0 + 0.02, t1 - 0.02, t1 + e, v)

        if p in ("P", "B", "M"):
            if p == "P":
                cl = d * (0.50 if on else (0.80 if nextvoiced else 0.92))
                if on and puv:
                    cl = d * 0.85
            elif p == "B":
                cl = d * (0.55 if fin else 0.88)
            else:
                cl = d * 0.96
            T["cLI"].add(
                t0 - 0.080, t0 + 0.012, t0 + cl - 0.003, t0 + cl + 0.080, -0.20
            )
            body({"J": vsh["J"] * 0.55}, lead=0.05, at=0.2)
        if p in ("T", "D", "N"):
            if p == "T":
                cl = d * (0.50 if on else (0.75 if nextvoiced else 0.9))
                if nuv:
                    cl = d * 0.8
            elif p == "D":
                cl = d * (0.55 if fin else 0.86)
            else:
                cl = d * 0.95
            ttp(t0 - 0.11, t0 - 0.05, 14.75, 0.28)
            T["cTT"].add(
                t0 - 0.080, t0 + 0.012, t0 + cl - 0.003, t0 + cl + 0.070, -0.18
            )
            body({"J": min(vsh["J"], 0.22) * 0.8 + 0.02}, lead=0.05, at=0.25)
            body(W({"X": 0.74, "Y": 0.02, "TR": 0.05}, 0.68), lead=0.08, at=0.45)
        if p in ("K", "G", "NG"):
            pl = 9.5 + max(-0.3, min(1.0, vsh["X"])) * 1.3
            cl = (
                d * (0.46 if on else 0.8)
                if p == "K"
                else (d * (0.55 if fin else 0.84) if p == "G" else d)
            )
            T["sTD"].to(t0 - 0.12, t0 - 0.04, pl)
            T["hTD"].to(t0 - 0.12, t0 - 0.04, 0.55)
            if p == "NG" and nxt is None:
                T["cTD"].add(t0 - 0.09, t0 + 0.014, t1 + 0.20, t1 + 0.30, -0.14)
            else:
                T["cTD"].add(
                    t0 - 0.095, t0 + 0.014, t0 + cl - 0.003, t0 + cl + 0.150, -0.14
                )
            body({"J": vsh["J"] * 0.7, "Y": vsh["Y"] * 0.6 + 0.22}, lead=0.07, at=0.3)
        if p in ("M", "N", "NG"):
            fin = p == "NG" and nxt is None
            T["VEL"].add(
                t0 - (0.075 if on else 0.11),
                t0 + (0.0 if on else 0.008),
                t1 - 0.012 + (0.4 if fin else 0),
                t1 + 0.065 + (0.4 if fin else 0),
                0.95 if p == "NG" else 0.75,
            )
            AV(0.92)
        # ---- glottal abduction for voiceless sounds (peak at the release, closed again as the vowel starts)
        if p in ("P", "T", "K"):
            pk = (
                (
                    0.10
                    if (prev is not None and prev["ph"] == "S" and prev["role"] == "on")
                    else 0.20
                )
                if on
                else 0.12
            )
            f1 = t1 + (0.036 if on else 0.022) if not nuv else t1 + 0.06
            f0 = (
                (max(t0 + cl, t1 - 0.024) if on else max(t0 + cl, t1 - 0.045))
                if not nuv
                else t1
            )
            if LEGATO.get("codaasp") and not on and not nuv:
                f0 = t0 + cl - 0.01
                f1 = t0 + cl + 0.012  # coda stop: glottis closes at the release
            T["GA"].add(t0 - 0.012, t0 + max(0.03, cl * 0.9), f0, f1, pk)
        if p in ("B", "D", "G"):
            T["VST"].add(t0 - 0.02, t0 + 0.01, t0 + cl, t0 + cl + 0.02, 1.0)
            if fin:
                for k, v in shape("AX").items():
                    if k in ("J", "X", "Y", "TR"):
                        T[k].to(t0 + cl, t0 + cl + 0.05, v)
                if LEGATO.get("finalburst"):
                    T["BG"].add(
                        t0 + cl - 0.03,
                        t0 + cl - 0.02,
                        t0 + cl + 0.03,
                        t0 + cl + 0.04,
                        float(LEGATO["finalburst"]),
                    )
            T["AV"].add(t0 - 0.01, t0 + 0.03, t0 + cl - 0.006, t0 + cl + 0.016, 0.55)
        # ---- fricatives
        if p in ("S", "Z"):
            ttp(t0 - 0.12, t0 - 0.03, 14.92, 0.42)
            T["cTT"].add(
                t0 - 0.080,
                t0 + 0.020,
                t1 - 0.012,
                t1 + 0.100,
                0.30 if p == "S" else 0.33,
                float(LEGATO.get("fricrel") or 2.2),
            )
            body(
                {
                    "J": 0.10,
                    "LA": float(LEGATO["siblip"])
                    if LEGATO.get("siblip")
                    else min(1.35, max(0.95, vsh["LA"])),
                    "X": max(vsh["X"], 0.35) if vsh["X"] > 0 else vsh["X"] * 0.5 + 0.15,
                },
                lead=0.06,
                at=0.3,
            )
            if p == "S" and LEGATO.get("fricrel") and not nuv:
                T["GA"].add(
                    t0 - 0.035, t0 + 0.35 * d, t1 - 0.055, t1 - 0.005, 0.24
                )  # voicing returns as the tongue lets go: the hiss tapers
            elif p == "S":
                T["GA"].add(
                    t0 - 0.035,
                    t0 + 0.35 * d,
                    t1 - (0.055 if not nuv else 0),
                    t1 + (0.018 if not nuv else 0.05),
                    0.24,
                )
            else:
                T["GA"].add(t0 - 0.03, t0 + 0.4 * d, t1 - 0.04, t1 + 0.02, 0.055)
        if p in ("CH", "JH"):
            # affricate: postalveolar closure released into an SH-like channel for the rest of the segment
            cl = d * (0.55 if p == "CH" else 0.60)
            ttp(t0 - 0.12, t0 - 0.04, 13.6, 0.48)
            T["cTT"].add(
                t0 - 0.080, t0 + 0.012, t0 + cl - 0.003, t0 + cl + 0.012, -0.18
            )
            T["cTT"].add(
                t0 + cl - 0.010,
                t0 + cl,
                t1 - 0.012,
                t1 + 0.110,
                0.40 if p == "CH" else 0.43,
            )
            body(
                {"J": 0.12, "LA": 0.95, "LP": 0.40, "X": 0.45, "Y": 0.10},
                lead=0.07,
                at=0.35,
            )
            if p == "CH":
                T["GA"].add(
                    t0 - 0.012, t0 + max(0.03, cl * 0.9), t1 - 0.055, t1 + 0.018, 0.24
                )
            else:
                T["VST"].add(t0 - 0.02, t0 + 0.01, t0 + cl, t0 + cl + 0.02, 1.0)
                T["AV"].add(
                    t0 - 0.01, t0 + 0.03, t0 + cl - 0.006, t0 + cl + 0.016, 0.55
                )
                T["GA"].add(t0 + cl - 0.01, t0 + cl + 0.02, t1 - 0.04, t1 + 0.02, 0.055)
        if p == "ZH":
            ttp(t0 - 0.12, t0 - 0.03, 13.5, 0.5)
            T["cTT"].add(t0 - 0.085, t0 + 0.022, t1 - 0.012, t1 + 0.120, 0.43)
            body(
                {"J": 0.12, "LA": 0.95, "LP": 0.40, "X": 0.45, "Y": 0.10},
                lead=0.07,
                at=0.35,
            )
            T["GA"].add(t0 - 0.03, t0 + 0.4 * d, t1 - 0.04, t1 + 0.02, 0.055)
            AV(0.85)
        if p == "SH":
            ttp(t0 - 0.12, t0 - 0.03, 13.5, 0.5)
            T["cTT"].add(t0 - 0.085, t0 + 0.022, t1 - 0.012, t1 + 0.120, 0.40)
            body(
                {"J": 0.12, "LA": 0.95, "LP": 0.40, "X": 0.45, "Y": 0.10},
                lead=0.07,
                at=0.35,
            )
            T["GA"].add(t0 - 0.035, t0 + 0.35 * d, t1 - 0.055, t1 + 0.018, 0.24)
        if p in ("F", "V"):
            T["cLD"].add(
                t0 - 0.075,
                t0 + 0.016,
                t1 - 0.012,
                t1 + 0.10,
                0.27 if p == "F" else 0.40,
            )
            body({"J": 0.12}, lead=0.05, at=0.3)
            if p == "F":
                T["GA"].add(t0 - 0.035, t0 + 0.35 * d, t1 - 0.05, t1 + 0.018, 0.22)
            else:
                T["GA"].add(t0 - 0.03, t0 + 0.4 * d, t1 - 0.04, t1 + 0.02, 0.035)
                AV(0.85)
        if p in ("DH", "TH"):
            ttp(t0 - 0.10, t0 - 0.03, 15.25, 0.2)
            T["cTT"].add(t0 - 0.075, t0 + 0.012, t1 - 0.010, t1 + 0.10, 0.38)
            body({"J": 0.14, "X": max(vsh["X"], 0.2)}, lead=0.05, at=0.3)
            T["GA"].add(t0 - 0.03, t0 + 0.4 * d, t1 - 0.035, t1 + 0.02, 0.03)
            AV(0.60)
        if p == "HH":
            T["GA"].add(t0 - 0.05, t0 + 0.45 * d, t1 - 0.03, t1 + 0.035, 0.13)
        # ---- sonorants
        if p == "L":
            if not on:
                tgt = shape("LD")
                body({k: tgt[k] for k in ("X", "Y", "TR", "J")}, lead=0.09, at=0.45)
            else:
                body(
                    {
                        "X": vsh["X"] * 0.35 - 0.05,
                        "Y": vsh["Y"] * 0.4 + 0.12,
                        "J": min(0.30, vsh["J"]),
                    },
                    lead=0.05,
                    at=0.4,
                )
            ttp(t0 - 0.12, t0 - 0.03, 14.5, 0.35)
            T["cTT"].add(
                t0 - 0.085,
                t0 + (0.015 if on else 0.045),
                t1 - 0.008,
                t1 + 0.11,
                0.45 if on else 0.55,
            )
            T["LAT"].add(t0 - 0.05, t0 + 0.02, t1 - 0.02, t1 + 0.04, 0.6)
        if p == "R":
            tgt = shape("R" if on else "ER")
            body(
                {k: tgt[k] for k in (BODY if on else [k for k in BODY if k != "LA"])},
                lead=0.07 if on else 0.12,
                at=0.4 if on else 0.6,
            )

        if p == "W":
            body(shape("W"), lead=0.07, at=0.40)
        if p == "Y":
            body(shape("Y"), lead=0.06, at=0.40)
