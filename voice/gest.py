"""gest.py - phoneme segments -> articulator trajectories (gestural score with per-articulator timing)."""
import json, math, os, random
HERE = os.path.dirname(os.path.abspath(__file__))
import sys; sys.path.insert(0, os.path.join(os.path.dirname(HERE), "engine")); from opts import LEGATO
BODY = ["J", "X", "Y", "TR", "TT", "BP", "LA", "LP", "LH", "EP"]
_SJ = json.load(open(os.path.join(HERE, "shapes.json")))
SHAPES = {k: v["art"] for k, v in _SJ.items()}
F1OF = {k: v["F"][0][0] for k, v in _SJ.items()}
OPENTO = dict(IY="IH", Y="IH", IH="EH", EY="EH", UW="UH", UH="AH", O="AH", OR="AH", ER="AH", AX="AH")
def opened(name, f0):
    """on high notes the mouth opens so that the first formant stays above the pitch."""
    s = dict(SHAPES[name])
    if f0 and name in OPENTO:
        need = 1.20 * f0 - F1OF[name]
        if need > 0:
            b = SHAPES[OPENTO[name]]; u = min(.75, need / max(60.0, F1OF[OPENTO[name]] - F1OF[name]))
            s = {k: s[k] + (b[k] - s[k]) * u for k in BODY}
    return s
VOW = {"AA","AE","AH","AO","AW","AY","EH","ER","EY","IH","IY","OW","OH","OY","UH","UW"}
# per-articulator lead (s before the syllable's first consonant) and settle (s after vowel onset)
LEAD = dict(J=.050, X=.055, Y=.055, TR=.050, TT=.045, BP=.04, LA=.060, LP=.110, LH=.06, EP=.06)
SETT = dict(J=.11, X=.130, Y=.130, TR=.130, TT=.09, BP=.08, LA=.09, LP=.09, LH=.15, EP=.14)
OPEN = 2.6
DIPH = {"AY": ("A", "IH", 1.0), "OY": ("AO", "IH", 1.0), "AW": ("A", "UH", 1.1), "EY": ("EY", "IY", .75), "OW": ("O", "UW", .62)}

# vowel-inherent movement: (toward, how far)
OFFG = {"AE": ("AX", .22), "EH": ("AX", .22), "IH": ("AX", .18), "AH": ("AX", .12), "AO": ("AH", .16), "AA": ("AH", .16),
        "IY": ("Y", .30), "UW": ("W", .16), "ER": ("R", .18), "UH": ("AX", .2)}

class Track:
    __slots__ = ("v0", "tr")
    def __init__(self, v0): self.v0 = v0; self.tr = []
    def to(self, ts, te, v, div=4.3):
        if te < ts + .004: te = ts + .004
        self.tr.append((ts, te, v, div))
    def sample(self, times):
        """critically damped approach to each target (task dynamics); overlapping moves blend."""
        ex = math.exp
        tr = sorted((ts, te, v, (te - ts) / dv) for ts, te, v, dv in self.tr); n = len(tr); i = 0; base = self.v0; act = []; out = []
        for t in times:
            while i < n and tr[i][0] <= t: act.append(tr[i]); i += 1
            while act and t - act[0][0] > 11 * act[0][3]: base = act.pop(0)[2]
            v = base
            for ts, te, x, tau in act:
                u = (t - ts) / tau
                v += (x - v) * (1.0 - (1.0 + u) * ex(-u))
            out.append(v)
        return out

class Bumps:
    """max / min envelope over independent rise-hold-fall gestures."""
    __slots__ = ("rest", "b", "mode")
    def __init__(self, rest, mode): self.rest = rest; self.b = []; self.mode = mode
    def add(self, r0, r1, f0, f1, v):
        if r1 < r0 + .004: r1 = r0 + .004
        if f0 < r1: f0 = r1
        if f1 < f0 + .004: f1 = f0 + .004
        self.b.append((r0, r1, f0, f1, v))
    def sample(self, times):
        bs = sorted(self.b); out = []; R = self.rest; n = len(bs); i = 0; act = []; mx = self.mode == "max"; mul = self.mode == "mul"; fast = self.mode == "min"
        for t in times:
            while i < n and bs[i][0] <= t: act.append(bs[i]); i += 1
            if act: act = [b for b in act if b[3] > t]
            v = R
            for r0, r1, f0, f1, x in act:
                if t < r1: u = (t - r0) / (r1 - r0)
                elif t < f0: u = 1.0
                else:
                    u = (f1 - t) / (f1 - f0)
                    if fast: u = u ** 2.2; v = min(v, R + (x - R) * u); continue
                u = u * u * u * (10 - u * (15 - 6 * u)); y = R + (x - R) * u
                if mx:
                    if y > v: v = y
                elif mul: v *= y
                elif y < v: v = y
            out.append(v)
        return out

class _Clamp:
    """legato 'fit': keep a consonant's gesture times inside [lo, hi] so neighbouring vowels keep an open stretch."""
    def __init__(self, T, lo, hi): self.T = T; self.lo = lo; self.hi = hi
    def __getitem__(self, k): return _ClampTrack(self.T[k], self.lo, self.hi)
class _ClampTrack:
    def __init__(self, tr, lo, hi): self.tr = tr; self.c = lambda x: min(hi, max(lo, x))
    def to(self, ts, te, v, *a): self.tr.to(self.c(ts), self.c(te), v, *a)
    def add(self, r0, r1, f0, f1, v): self.tr.add(self.c(r0), self.c(r1), self.c(f0), self.c(f1), v)

def shape(name): return dict(SHAPES[name])
def mix(a, b, u): return {k: a[k] + (b[k] - a[k]) * u for k in BODY}

def vowel_targets(g, nxt, line):
    """list of (name_or_shape, fraction) for the nucleus."""
    p = g["ph"]; fz = g.get("f0", 0)
    if p in DIPH:
        a, b, u = DIPH[p]; A = opened(a, fz)
        if p == "AY" and LEGATO.get("pricefront"): A = mix(A, opened("AE", fz), float(LEGATO["pricefront"]))
        return A, mix(A, opened(b, fz), u)
    if p == "AH": s = opened("AX" if g.get("weak") else "AH", fz)
    elif p == "OH": s = opened("O", fz)                      # pure [o:] (Irish GOAT)
    elif p == "AO" and nxt and nxt["ph"] == "R": s = opened("OR", fz)
    elif p in SHAPES: s = opened(p, fz)
    else: s = opened("AX", fz)
    if g.get("weak") and p not in ("AH",): s = mix(s, shape("AX"), .18)
    return s, None

class Score:
    """builds all tracks for one line."""
    def __init__(self, segs, perf, seed=0):
        self.segs = segs
        # a final -ing is sung ON the ng: the tongue closes early and the note hums
        a, b = segs[-2], segs[-1]
        if b["ph"] == "NG" and a["ph"] == "IH":
            tot = b["t1"] - a["t0"]; m = a["t0"] + max(.24, .46 * tot); a["t1"] = m; b["t0"] = m
        for g in segs:
            if g["role"] == "nuc":
                cr = perf["cr"]; q = [x for x in perf["f0"][int((g["t0"] + .05) * cr): int(g["t1"] * cr)] if x > 60]
                g["f0"] = sorted(q)[int(len(q) * .6)] if q else 0
        first = [g for g in segs if g["role"] == "nuc"][0]
        s0, _ = vowel_targets(first, None, None)
        self.T = {k: Track(s0[k]) for k in BODY}
        for k, v in dict(sTT=14.6, hTT=.25, sTD=9.4, hTD=.45).items(): self.T[k] = Track(v)
        for k in ("cTT", "cTD", "cLI", "cLD"): self.T[k] = Bumps(OPEN, "min")
        for k in ("GA", "VEL", "LAT", "VST"): self.T[k] = Bumps(0.0, "max")
        self.T["AV"] = Bumps(1.0, "mul")
        self.build()

    def build(self):
        S = self.segs; T = self.T; n = len(S)
        nuc = [i for i, g in enumerate(S) if g["role"] == "nuc"]
        # ---- consonants first: each one claims the body articulators it needs, vowels move in afterwards
        self.claim = {}
        for i, g in enumerate(S):
            if g["role"] != "nuc": self.cons(i, g)
        # ---- vowels
        prev_end = None
        for a, i in enumerate(nuc):
            g = S[i]; nx = S[i+1] if i + 1 < n else None
            v1, v2 = vowel_targets(g, nx, None)
            if v2 is not None and LEGATO.get("tailglide") and a == len(nuc) - 1: v2 = mix(v1, v2, .5)
            j = i
            while j - 1 >= 0 and S[j-1]["role"] == "on" and S[j-1]["syl"] == g["syl"]: j -= 1
            c0 = S[j]["t0"]; hi = (j == i)          # vowel-initial syllable
            for k in BODY:
                ld, se = LEAD[k], SETT[k]
                if a == 0 and hi: ld += .25
                ts = c0 - ld - (.045 if hi else 0); te = g["t0"] + se
                for q in range(j - 2, i):
                    if q >= 0: ts = max(ts, self.claim.get((q, k), -1))
                # do not steal more than 35% of the previous nucleus
                if a > 0:
                    pg = S[nuc[a-1]]; ts = max(ts, pg["t0"] + (.15 if LEGATO.get("artic") else .45) * (pg["t1"] - pg["t0"]))
                if LEGATO.get("artic"):
                    dv = 2.5
                    if LEGATO.get("tail"): dv = 2.5 + 1.8 * min(1, max(0, (g["t1"] - g["t0"] - .15) / .25))
                    T[k].to(ts, te, v1[k], dv)
                else: T[k].to(ts, te, v1[k])
            if v2 is None:
                # a held vowel is never parked: it has its own slow off-glide and leans toward the next vowel
                d = g["t1"] - g["t0"]; nv = None
                if a + 1 < len(nuc): nv = vowel_targets(S[nuc[a+1]], None, None)[0]
                og = OFFG.get(g["ph"]); o = shape(og[0]) if og else v1; ou = og[1] if og else 0
                if d > .16:
                    for k in ("X", "Y", "J", "TR", "LA"):
                        z = v1[k] + ou * (o[k] - v1[k])
                        if nv is not None: z += .14 * (nv[k] - v1[k])
                        T[k].to(g["t0"] + .28 * d, g["t1"] + .05, z)
            if v2 is not None:
                d = g["t1"] - g["t0"]; w = min(.30, max(.12, d * .52))
                # diphthong glide late, ending just into the next consonant
                last = (i + 1 >= n)
                te = g["t1"] + (.02 if not last else -.05)
                if LEGATO.get("diphhold"):           # reach the second element and hold it ~80 ms before what follows
                    w = min(.40, max(.12, d * .52)); te = g["t1"] - min(.08, .25 * d)
                for k in BODY: T[k].to(te - w * (1.0 if k not in ("LP",) else 1.15), te, v2[k])
        if LEGATO.get("release"):                 # phrase end: the glottis opens as the breath is let go
            te = S[-1]["t1"]; T["GA"].add(te - .12, te + .10, te + .30, te + .40, .16)
        # legato vowel-vowel joins at word boundaries: tiny glottal dip so words stay separate
        for a in range(1, len(nuc)):
            i = nuc[a]
            if S[i-1]["role"] == "nuc" and not LEGATO.get("cons"):
                t = S[i]["t0"]
                T["AV"].add(t - .075, t - .015, t - .012, t + .06, .62)

    def cons(self, i, g):
        S = self.segs; T = self.T; n = len(S); p = g["ph"]; t0, t1 = g["t0"], g["t1"]; d = t1 - t0
        if LEGATO.get("fit"):
            q = .30; pv = next((h for h in S[i-1::-1] if h["role"] == "nuc"), None) if i > 0 else None
            nv = next((h for h in S[i+1:] if h["role"] == "nuc"), None)
            lo = min(t0 - .015, pv["t1"] - q * (pv["t1"] - pv["t0"])) if pv else -1e9
            hi = max(t1 + .015, nv["t0"] + q * (nv["t1"] - nv["t0"])) if nv else 1e9
            T = _Clamp(T, lo, hi)
        prev = S[i-1] if i > 0 else None; nxt = S[i+1] if i + 1 < n else None
        on = g["role"] == "on"
        # neighbouring vowel shape, used to place dorsal closures
        vi = next((h for h in (S[i+1:] if on else S[i::-1]) if h["role"] == "nuc"), None)
        vs = vowel_targets(vi, None, None) if vi else None
        vsh = (vs[0] if on else (vs[1] or vs[0])) if vs else shape("AX")
        nextvoiced = nxt is not None and nxt["role"] == "nuc"
        def W(tgt, w):
            return {k: vsh[k] + (tgt[k] - vsh[k]) * w for k in tgt}
        def body(tgt, lead=.045, at=.35, keys=None):
            for k in (keys or tgt):
                T[k].to(t0 - lead, t0 + at * d, tgt[k]); self.claim[(i, k)] = t0 + min(.8, at + .22) * d
        def ttp(a, b, place, width):
            # place: a tongue-tip fricative keeps its place until its last ~30 ms; the next tip target waits
            if LEGATO.get("place") and prev is not None and prev["ph"] in ("S", "Z", "SH", "ZH", "TH", "DH"):
                if p in ("T", "D", "N") and prev["ph"] in ("S", "Z"): return     # /st/ is homorganic: close at the S place
                a = max(a, prev["t1"] - .03); b = max(b, a + .03)
            T["sTT"].to(a, b, place); T["hTT"].to(a, b, width)
        rel = t1; cl = d
        uv = ("P", "T", "K", "S", "SH", "CH", "F", "HH", "TH")
        nuv = nxt is not None and nxt["ph"] in uv; puv = prev is not None and prev["ph"] in uv
        def AV(v, l=.04, e=.03): T["AV"].add(t0 - l, t0 + .02, t1 - .02, t1 + e, v)
        if p in ("P", "B", "M"):
            if p == "P":
                cl = d * (.50 if on else (.80 if nextvoiced else .92))
                if on and puv: cl = d * .85
            elif p == "B": cl = d * .88
            else: cl = d * .96
            T["cLI"].add(t0 - .080, t0 + .012, t0 + cl - .003, t0 + cl + .080, -.20)
            body({"J": vsh["J"] * .55}, lead=.05, at=.2)
        if p in ("T", "D", "N"):
            if p == "T":
                cl = d * (.50 if on else (.75 if nextvoiced else .9))
                if nuv: cl = d * .8
            elif p == "D": cl = d * .86
            else: cl = d * .95
            ttp(t0 - .11, t0 - .05, 14.75, .28)
            T["cTT"].add(t0 - .080, t0 + .012, t0 + cl - .003, t0 + cl + .070, -.18)
            body({"J": min(vsh["J"], .22) * .8 + .02}, lead=.05, at=.25)
            body(W({"X": .74, "Y": .02, "TR": .05}, .68), lead=.08, at=.45)
        if p in ("K", "G", "NG"):
            pl = 9.5 + max(-.3, min(1.0, vsh["X"])) * 1.3
            cl = d * (.46 if on else .8) if p == "K" else (d * .84 if p == "G" else d)
            T["sTD"].to(t0 - .12, t0 - .04, pl); T["hTD"].to(t0 - .12, t0 - .04, .55)
            if p == "NG" and nxt is None: T["cTD"].add(t0 - .09, t0 + .014, t1 + .20, t1 + .30, -.14)
            else: T["cTD"].add(t0 - .095, t0 + .014, t0 + cl - .003, t0 + cl + .150, -.14)
            body({"J": vsh["J"] * .7, "Y": vsh["Y"] * .6 + .22}, lead=.07, at=.3)
        if p in ("M", "N", "NG"):
            fin = p == "NG" and nxt is None
            T["VEL"].add(t0 - (.075 if on else .11), t0 + (.0 if on else .008), t1 - .012 + (.4 if fin else 0), t1 + .065 + (.4 if fin else 0), .95 if p == "NG" else .75)
            AV(.92)
        # ---- glottal abduction for voiceless sounds (peak at the release, closed again as the vowel starts)
        if p in ("P", "T", "K"):
            pk = (.10 if (prev is not None and prev["ph"] == "S" and prev["role"] == "on") else .20) if on else .12
            f1 = t1 + (.036 if on else .022) if not nuv else t1 + .06
            f0 = (max(t0 + cl, t1 - .024) if on else max(t0 + cl, t1 - .045)) if not nuv else t1
            if LEGATO.get("codaasp") and not on and not nuv: f0 = t0 + cl - .01; f1 = t0 + cl + .012   # coda stop: glottis closes at the release
            T["GA"].add(t0 - .012, t0 + max(.03, cl * .9), f0, f1, pk)
        if p in ("B", "D", "G"):
            T["VST"].add(t0 - .02, t0 + .01, t0 + cl, t0 + cl + .02, 1.0)
            T["AV"].add(t0 - .01, t0 + .03, t0 + cl - .006, t0 + cl + .016, .55)
        # ---- fricatives
        if p in ("S", "Z"):
            ttp(t0 - .12, t0 - .03, 14.92, .42)
            T["cTT"].add(t0 - .080, t0 + .020, t1 - .012, t1 + .100, .30 if p == "S" else .33)
            body({"J": .10, "LA": min(1.35, max(.95, vsh["LA"])), "X": max(vsh["X"], .35) if vsh["X"] > 0 else vsh["X"] * .5 + .15}, lead=.06, at=.3)
            if p == "S": T["GA"].add(t0 - .035, t0 + .35 * d, t1 - (.055 if not nuv else 0), t1 + (.018 if not nuv else .05), .24)
            else: T["GA"].add(t0 - .03, t0 + .4 * d, t1 - .04, t1 + .02, .055)
        if p in ("CH", "JH"):
            # affricate: postalveolar closure released into an SH-like channel for the rest of the segment
            cl = d * (.55 if p == "CH" else .60)
            ttp(t0 - .12, t0 - .04, 13.6, .48)
            T["cTT"].add(t0 - .080, t0 + .012, t0 + cl - .003, t0 + cl + .012, -.18)
            T["cTT"].add(t0 + cl - .010, t0 + cl, t1 - .012, t1 + .110, .40 if p == "CH" else .43)
            body({"J": .12, "LA": .95, "LP": .40, "X": .45, "Y": .10}, lead=.07, at=.35)
            if p == "CH": T["GA"].add(t0 - .012, t0 + max(.03, cl * .9), t1 - .055, t1 + .018, .24)
            else:
                T["VST"].add(t0 - .02, t0 + .01, t0 + cl, t0 + cl + .02, 1.0)
                T["AV"].add(t0 - .01, t0 + .03, t0 + cl - .006, t0 + cl + .016, .55)
                T["GA"].add(t0 + cl - .01, t0 + cl + .02, t1 - .04, t1 + .02, .055)
        if p == "ZH":
            ttp(t0 - .12, t0 - .03, 13.5, .5)
            T["cTT"].add(t0 - .085, t0 + .022, t1 - .012, t1 + .120, .43)
            body({"J": .12, "LA": .95, "LP": .40, "X": .45, "Y": .10}, lead=.07, at=.35)
            T["GA"].add(t0 - .03, t0 + .4 * d, t1 - .04, t1 + .02, .055); AV(.85)
        if p == "SH":
            ttp(t0 - .12, t0 - .03, 13.5, .5)
            T["cTT"].add(t0 - .085, t0 + .022, t1 - .012, t1 + .120, .40)
            body({"J": .12, "LA": .95, "LP": .40, "X": .45, "Y": .10}, lead=.07, at=.35)
            T["GA"].add(t0 - .035, t0 + .35 * d, t1 - .055, t1 + .018, .24)
        if p in ("F", "V"):
            T["cLD"].add(t0 - .075, t0 + .016, t1 - .012, t1 + .10, .27 if p == "F" else .40)
            body({"J": .12}, lead=.05, at=.3)
            if p == "F": T["GA"].add(t0 - .035, t0 + .35 * d, t1 - .05, t1 + .018, .22)
            else: T["GA"].add(t0 - .03, t0 + .4 * d, t1 - .04, t1 + .02, .035); AV(.85)
        if p in ("DH", "TH"):
            ttp(t0 - .10, t0 - .03, 15.25, .2)
            T["cTT"].add(t0 - .075, t0 + .012, t1 - .010, t1 + .10, .38)
            body({"J": .14, "X": max(vsh["X"], .2)}, lead=.05, at=.3)
            T["GA"].add(t0 - .03, t0 + .4 * d, t1 - .035, t1 + .02, .03); AV(.60)
        if p == "HH": T["GA"].add(t0 - .05, t0 + .45 * d, t1 - .03, t1 + .035, .13)
        # ---- sonorants
        if p == "L":
            if not on:
                tgt = shape("LD"); body({k: tgt[k] for k in ("X", "Y", "TR", "J")}, lead=.09, at=.45)
            else:
                body({"X": vsh["X"] * .35 - .05, "Y": vsh["Y"] * .4 + .12, "J": min(.30, vsh["J"])}, lead=.05, at=.4)
            ttp(t0 - .12, t0 - .03, 14.5, .35)
            T["cTT"].add(t0 - .085, t0 + (.015 if on else .045), t1 - .008, t1 + .11, .45 if on else .55)
            T["LAT"].add(t0 - .05, t0 + .02, t1 - .02, t1 + .04, .6)
        if p == "R":
            tgt = shape("R" if on else "ER")
            body({k: tgt[k] for k in (BODY if on else [k for k in BODY if k != "LA"])}, lead=.07 if on else .12, at=.4 if on else .6)
            
        if p == "W": body(shape("W"), lead=.07, at=.40)
        if p == "Y": body(shape("Y"), lead=.06, at=.40)
