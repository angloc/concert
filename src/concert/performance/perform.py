"""perform.py - turns score.json into a human performance (pure stdlib).
Writes build/perf.json  (control tracks @200 Hz + phoneme segments + breaths) and build/timeline.json (for the film).
the voice and the film both read it.
"""

import copy
import itertools
import json
import math
import os
import random
from pathlib import Path

from concert import ROOT
from concert.diction import connected as CS
from concert.diction import lexicon as LX
from concert.diction.opts import LEGATO
from concert.performance import score as SC

REDLOG = []


def reduce_line(L):
    """connected-speech catalogue on one line (song lexicon gives stress; accent maps weak forms)"""
    g = reduce_line.__dict__
    if "cat" not in g:
        g["cat"] = CS.load()
        g["acc"] = LX.load_accent(os.path.join(ROOT, "accents", "irish", "accent.json"))
        g["lex"] = LX.load_lexicon(
            os.path.join(ROOT, "songs", "danny-boy", "lexicon.txt")
        )
    sy, log = CS.apply(
        CS.from_score(L["syl"], g["lex"], g["acc"], L.get("text")),
        g["cat"],
        g["acc"],
        line=L["i"],
        only=LEGATO["reduce"] if isinstance(LEGATO["reduce"], list) else None,
    )
    REDLOG.extend(log)
    return sy


CR = 200
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
ON = {
    "P": 0.115,
    "B": 0.085,
    "T": 0.100,
    "D": 0.070,
    "K": 0.110,
    "G": 0.085,
    "S": 0.125,
    "Z": 0.090,
    "SH": 0.125,
    "ZH": 0.095,
    "CH": 0.130,
    "JH": 0.100,
    "F": 0.105,
    "V": 0.075,
    "TH": 0.10,
    "DH": 0.060,
    "HH": 0.070,
    "M": 0.085,
    "N": 0.078,
    "NG": 0.085,
    "L": 0.080,
    "R": 0.085,
    "W": 0.085,
    "Y": 0.075,
}
OFF = {
    "P": 0.085,
    "B": 0.07,
    "T": 0.075,
    "D": 0.065,
    "K": 0.085,
    "G": 0.07,
    "S": 0.115,
    "Z": 0.095,
    "SH": 0.12,
    "ZH": 0.100,
    "CH": 0.120,
    "JH": 0.095,
    "F": 0.095,
    "V": 0.080,
    "TH": 0.09,
    "DH": 0.07,
    "HH": 0.06,
    "M": 0.100,
    "N": 0.095,
    "NG": 0.150,
    "L": 0.105,
    "R": 0.110,
    "W": 0.07,
    "Y": 0.07,
}
VOICED_OBS = {"B", "D", "G", "V", "Z", "DH", "ZH", "JH"}
WEAK = {
    "the",
    "and",
    "are",
    "in",
    "or",
    "as",
    "to",
    "am",
    "a-",
    "an",
    "at",
    "for",
    "that",
    "it's",
    "with",
}
COL = {
    "warm": (0.45, 0.30),
    "open": (0.50, 0.24),
    "soft": (0.36, 0.42),
    "plain": (0.42, 0.32),
    "bright": (0.56, 0.20),
    "hushed": (0.16, 0.80),
    "full": (0.72, 0.12),
    "breaking": (0.40, 0.46),
    "worn": (0.26, 0.58),
    "wonder": (0.42, 0.44),
    "rest": (0.32, 0.52),
}
# per line: loudness start, peak, end, where the peak sits (0..1), scoop into the phrase (st), fall at the end (st)
ARC = {
    0: (0.42, 0.55, 0.46, 0.45, 0.9, 0.5),
    1: (0.44, 0.60, 0.48, 0.40, 0.6, 0.45),
    2: (0.38, 0.46, 0.32, 0.35, 0.8, 0.6),
    3: (0.46, 0.50, 0.30, 0.38, 0.4, 0.9),
    4: (0.50, 0.68, 0.56, 0.42, 0.5, 0),
    5: (0.34, 0.37, 0.16, 0.22, 0.8, 0.5),
    6: (0.55, 1.0, 0.55, 0.40, 0.3, 0),
    7: (0.56, 0.60, 0.24, 0.18, 1.6, 0.9),
    8: (0.26, 0.34, 0.28, 0.42, 1.0, 0.6),
    9: (0.34, 0.38, 0.28, 0.36, 0.4, 0.35),
    10: (0.46, 0.55, 0.46, 0.42, 0.7, 0.45),
    11: (0.28, 0.31, 0.16, 0.30, 0.8, 0.5),
    12: (0.42, 0.58, 0.48, 0.40, 0.8, 0),
    13: (0.52, 0.72, 0.60, 0.36, 0.5, 0.3),
    14: (0.58, 1.1, 0.55, 0.30, 0.3, 0),
    15: (0.46, 0.47, 0.13, 0.14, 0.9, 0.2),
}
# (line, word, nth time in the line): seconds the singer lingers before it (the band stays in time)
LATE = {
    (0, "boy", 0): 0.04,
    (1, "side", 0): 0.05,
    (2, "gone", 0): 0.05,
    (3, "go", 0): 0.08,
    (3, "bide", 0): 0.10,
    (4, "back", 0): 0.04,
    (5, "hushed", 0): 0.05,
    (5, "snow", 0): 0.09,
    (6, "here", 0): 0.10,
    (6, "sun-", 0): 0.03,
    (7, "boy", 0): 0.06,
    (7, "boy", 1): 0.10,
    (7, "I", 0): 0.06,
    (7, "love", 0): 0.12,
    (7, "you", 0): 0.16,
    (7, "so", 0): 0.20,
    (8, "dy-", 0): 0.06,
    (9, "dead", 0): 0.05,
    (9, "well", 0): 0.05,
    (9, "be", 0): 0.06,
    (10, "ly-", 0): 0.05,
    (11, "me", 0): 0.09,
    (12, "hear", 0): 0.08,
    (12, "soft", 0): 0.05,
    (13, "sweet-", 0): 0.04,
    (13, "be", 0): 0.04,
    (14, "bend", 0): 0.14,
    (14, "love", 0): 0.07,
    (15, "sleep", 0): 0.05,
    (15, "peace", 0): 0.05,
    (15, "come", 0): 0.08,
    (15, "to", 0): 0.14,
    (15, "me", 0): 0.25,
}
# (line, syllable index): seconds cut off its end to leave room for a breath
CUT = {
    (5, "snow", 0): 0.14,
    (7, "boy", 1): 0.26,
    (13, "be", 0): 0.25,
    (15, "peace", 0): 0.24,
}
VIB = {
    (6, "here", 0): (0.60, 0.12),
    (14, "bend", 0): (0.60, 0.12),
    (7, "so", 0): (0.20, 1.1),
    (3, "bide", 0): (0, 1),
    (11, "me", 0): (0, 1),
    (15, "me", 0): (0.20, 0.9),
    (6, "sha-", 0): (0.42, 0.2),
    (14, "love", 0): (0.46, 0.2),
}


def key(L, si):
    """Identity of syllable `si` of line `L` for the interpretation tables: (line, word, occurrence)."""
    w = L["syl"][si]["word"]
    return (L["i"], w, sum(1 for x in L["syl"][:si] if x["word"] == w))


def linger(sc):
    """rubato on a copy: the singer leans back on the words that matter; every other syllable breathes a little"""
    sc = copy.deepcopy(sc)
    rnd = random.Random(23)
    for L in sc["lines"]:
        syl = L["syl"]
        for si in range(len(syl)):
            d = LATE.get(key(L, si), 0.0)
            if si > 0 and d == 0:
                d = max(-0.03, min(0.035, rnd.gauss(0.004, 0.016)))
            if si == 0:
                d = 0
            a = syl[si]
            d = min(d, a["notes"][0]["d"] * 0.45)
            a["t"] += d
            a["d"] -= d
            a["notes"][0]["t"] += d
            a["notes"][0]["d"] -= d
            if si > 0:
                b = syl[si - 1]
                b["d"] += d
                b["notes"][-1]["d"] += d
    return sc


def sstep(x):
    """Smootherstep of `x`, clamped to 0..1."""
    x = max(0.0, min(1.0, x))
    return x * x * x * (x * (6 * x - 15) + 10)


def segments(sc):
    """Phoneme segments with times for every line of score `sc`."""
    segs = []
    rnd = random.Random(11)
    for L in sc["lines"]:
        syl = L["syl"]
        info = []
        RS = reduce_line(L) if LEGATO.get("reduce") else None
        BRK = (
            [x["brk"] for x in CS.from_score(syl, None, None, L.get("text"))]
            if LEGATO.get("comma")
            else None
        )
        for s in syl:
            ph = s["ph"]
            vi = next(i for i, p in enumerate(ph) if p in VOW)
            info.append((ph[:vi], ph[vi], ph[vi + 1 :]))
        if RS:
            info = [(r["on"], r["nuc"], r["off"]) for r in RS]
        n = len(syl)
        onset_d = [
            [ON[p] * rnd.uniform(0.94, 1.08) for p in info[i][0]] for i in range(n)
        ]
        if RS:
            onset_d = [
                [d * m for d, m in zip(onset_d[i], RS[i]["on_mult"])] for i in range(n)
            ]
        if LEGATO.get("cons"):
            cf = [max(0.6, min(1.0, syl[i]["d"] / 0.35)) for i in range(n)]
            onset_d = [[d * cf[i] for d in onset_d[i]] for i in range(n)]
        for i in range(n):  # clusters are shorter than the sum of parts
            k = len(onset_d[i])
            f = {0: 1, 1: 1, 2: 0.80, 3: 0.70}[min(3, k)]
            onset_d[i] = [d * f for d in onset_d[i]]
        for i in range(n):
            s = syl[i]
            on, nuc, off = info[i]
            t = s["t"]
            end = (
                s["t"] + s["d"] if i == n - 1 else syl[i + 1]["t"] - sum(onset_d[i + 1])
            )
            end -= CUT.get(key(L, i), 0.0)
            offd = [OFF[p] * rnd.uniform(0.94, 1.08) for p in off]
            if LEGATO.get("cons"):
                offd = [d * max(0.6, min(1.0, s["d"] / 0.35)) for d in offd]
            if RS:
                offd = [d * m for d, m in zip(offd, RS[i]["off_mult"])]
            if i == n - 1:
                offd = [d * 1.25 for d in offd]
            if (
                i == n - 1
                and LEGATO.get("finallen")
                and off
                and off[-1] in ("B", "D", "G")
            ):
                offd[-1] *= float(
                    LEGATO["finallen"]
                )  # a sung final stop: held, then released
            elif LEGATO.get("comma") and BRK[i]:
                offd = [
                    d * 1.25 for d in offd
                ]  # phrase-final lengthening at punctuation
            k = len(offd)
            f = {0: 1, 1: 1, 2: 0.78, 3: 0.66}[min(3, k)]
            offd = [d * f for d in offd]
            avail = end - t
            vmin = (
                max(0.05, 0.15 * avail)
                if LEGATO.get("keepcons")
                else max(0.10, 0.42 * avail)
            )
            if avail - sum(offd) < vmin and offd:
                q = max(
                    0.70 if LEGATO.get("keepcons") else 0.35, (avail - vmin) / sum(offd)
                )
                offd = [d * q for d in offd]
            x = t - sum(onset_d[i])
            for p, d in zip(on, onset_d[i]):
                segs.append(
                    {
                        "ph": p,
                        "t0": x,
                        "t1": x + d,
                        "line": L["i"],
                        "syl": i,
                        "role": "on",
                    }
                )
                x += d
            vend = end - sum(offd)
            # syllabic sonorant (connected-speech catalogue): the vowel shrinks to 20 ms and the sonorant carries the note
            el = bool(RS and RS[i]["syllabic"])
            if el:
                offd = [offd[0] + vend - (t + 0.02)] + offd[1:]
                vend = t + 0.02
            segs.append(
                {
                    "ph": nuc,
                    "t0": t,
                    "t1": vend,
                    "line": L["i"],
                    "syl": i,
                    "role": "nuc",
                    "d": s["d"],
                    "weak": bool(el) or s["word"].strip("-").lower() in WEAK,
                    "last": i == n - 1,
                }
            )
            x = vend
            for p, d in zip(off, offd):
                segs.append(
                    {
                        "ph": p,
                        "t0": x,
                        "t1": x + d,
                        "line": L["i"],
                        "syl": i,
                        "role": "off",
                    }
                )
                x += d
    segs.sort(key=lambda g: g["t0"])
    for a, b in itertools.pairwise(segs):  # no overlaps inside a line
        if a["line"] == b["line"] and a["t1"] > b["t0"]:
            a["t1"] = b["t0"]
    for g in segs:
        g["t0"] = round(g["t0"], 4)
        g["t1"] = round(g["t1"], 4)
    return segs


def tracks(sc, segs):
    """Control tracks at CR Hz for the whole song: pitch, level, tension and breath."""
    n = int(sc["total"] * CR) + 1
    rnd = random.Random(5)
    f0 = [0.0] * n
    db = [-60.0] * n
    ten = [0.4] * n
    bre = [0.4] * n
    # slow human drift: filtered random walk, semitones
    drift = [0.0] * n
    a = b = 0.0
    for i in range(n):
        a += (rnd.gauss(0, 1) - a) * 0.012
        b += (a - b) * 0.03
        drift[i] = b * 1.6
    amwob = [0.0] * n
    a = b = 0.0
    for i in range(n):
        a += (rnd.gauss(0, 1) - a) * 0.03
        b += (a - b) * 0.06
        amwob[i] = b * 2.2
    for L in sc["lines"]:
        ls = [g for g in segs if g["line"] == L["i"]]
        t0 = ls[0]["t0"] - 0.02
        t1 = ls[-1]["t1"] + 0.03
        notes = []
        for si, s in enumerate(L["syl"]):
            for k, nn in enumerate(s["notes"]):
                notes.append(
                    {
                        "m": nn["midi"],
                        "t": nn["t"],
                        "d": nn["d"],
                        "syl": si,
                        "mel": k > 0,
                        "word": s["word"],
                    }
                )
        for k, nt in enumerate(notes):
            nxt = notes[k + 1]["t"] if k + 1 < len(notes) else nt["t"] + nt["d"]
            nt["dur"] = nxt - nt["t"]
            nt["rate"] = rnd.uniform(4.9, 5.5)
            nt["ph"] = rnd.uniform(0, 6.28)
            nt["ext"] = (
                (0.10 + 0.32 * ARC[L["i"]][1]) * rnd.uniform(0.75, 1.2)
                if nt["dur"] > 0.62
                else 0.0
            )
            nt["von"] = rnd.uniform(0.16, 0.46)
            nt["spec"] = False
            nt["rate"] = rnd.uniform(4.7, 5.8)
            if L["i"] in (8, 9):
                nt["ext"] = min(nt["ext"], 0.12)
                nt["von"] = 0.55
            kk = key(L, nt["syl"])
            if kk in VIB and nt["dur"] > 0.4:
                nt["ext"], nt["von"] = VIB[kk]
                nt["spec"] = True
            nt["apex"] = False
        top = max(x["m"] for x in notes)
        for x in notes:
            x["apex"] = x["m"] == top
        ten0, bre0 = COL[
            LEGATO.get("color") or L["color"]
        ]  # "color": diagnostic override for every line
        i0, i1 = int(t0 * CR), min(n - 1, int(t1 * CR))
        for i in range(i0, i1 + 1):
            t = i / CR
            k = 0
            while k + 1 < len(notes) and t >= notes[k + 1]["t"] - 0.10:
                k += 1
            nt = notes[k]
            m = nt["m"]

            def glide(a, bn, t=t):  # a -> note bn
                iv = abs(bn["m"] - a)
                w = min(0.16, 0.080 + 0.011 * iv)
                if bn["mel"]:
                    w *= 1.15
                return a + (bn["m"] - a) * sstep((t - (bn["t"] - 0.62 * w)) / w)

            if LEGATO.get("pitch"):

                def glide(a, bn, _k=k, t=t, notes=notes):
                    iv = abs(bn["m"] - a)
                    w = min(0.16, 0.080 + 0.011 * iv)
                    if bn["mel"]:
                        w *= 1.15
                    pd = notes[_k - 1]["dur"] if _k > 0 else bn["dur"]
                    w = max(
                        w, min(0.25, 0.45 * min(pd, bn["dur"]))
                    )  # glide grows with the notes, centred on the change
                    return a + (bn["m"] - a) * sstep((t - (bn["t"] - 0.5 * w)) / w)

            if k > 0:
                m = glide(notes[k - 1]["m"], nt)
            else:
                m = nt["m"] - ARC[L["i"]][4] * (
                    1 - sstep((t - (nt["t"] - 0.10)) / 0.22)
                )  # scoop into the phrase
            iv = nt["m"] - (notes[k - 1]["m"] if k > 0 else nt["m"])
            kick = not (LEGATO.get("pitch") and nt["dur"] < 0.4)
            if kick and iv >= 3:
                m += 0.26 * math.exp(-(((t - nt["t"] - 0.085) / 0.045) ** 2))
            if kick and iv <= -3:
                m -= 0.16 * math.exp(-(((t - nt["t"] - 0.085) / 0.05) ** 2))
            if nt["ext"] > 0:
                x = t - nt["t"]
                tail = 0.15 if nt["spec"] and nt["ext"] > 0.4 else 0.30
                e = (
                    nt["ext"]
                    * sstep((x - nt["von"]) / 0.50)
                    * (1 - 0.75 * sstep((x - nt["dur"] + tail) / (tail - 0.02)))
                )
                if L["i"] == 15 and nt["word"] == "me":
                    e *= 1 - sstep((t - 136.0) / 1.2)
                r = nt["rate"] * (
                    1 - 0.06 * sstep((x - nt["dur"] * 0.6) / (nt["dur"] * 0.4 + 0.01))
                )
                m += e * math.sin(nt["ph"] + 6.2832 * r * x)
            te = ls[-1]["t1"]
            m -= ARC[L["i"]][5] * sstep((t - (te - 0.16)) / 0.18)
            m += drift[i] * (0.35 if (L["i"] == 15 and nt["word"] == "me") else 1.0)
            if L["i"] == 7 and nt["word"] == "love":
                m += 1.1 * math.exp(
                    -(((t - nt["t"] - 0.055) / 0.028) ** 2)
                )  # the voice gives way
            f0[i] = 440 * 2 ** ((m - 69) / 12)
            u = max(0, min(1, (t - L["t0"]) / (L["t1"] - L["t0"])))
            A = ARC[L["i"]]
            pk = A[3]
            dy = (
                (A[0] + (A[1] - A[0]) * sstep(u / pk))
                if u < pk
                else (A[1] + (A[2] - A[1]) * sstep((u - pk) / (1 - pk)))
            )
            lev = -13.5 * (1 - dy)
            lev += 0.18 * (nt["m"] - 57)
            x = (t - nt["t"]) / max(0.1, nt["dur"])
            if nt["dur"] > 0.8:
                pos = (
                    0.65
                    if L["color"] in ("full", "bright")
                    else 0.25
                    if L["color"] in ("hushed", "rest", "soft")
                    else 0.45
                )
                xx = max(0, min(1, x))
                sw = (
                    math.sin(math.pi / 2 * xx / pos)
                    if xx < pos
                    else math.cos(math.pi / 2 * (xx - pos) / (1 - pos))
                )
                lev += 3.0 * sw - 1.5
            if nt["word"].strip("-").lower() in WEAK:
                lev += 1.5 if nt["apex"] else -2.0
            lev += amwob[i]
            lev -= 10 * sstep((t - (te - 0.22)) / 0.22) + 14 * (
                1 - sstep((t - t0) / 0.10)
            )
            db[i] = lev
            q = (dy - 0.45) * 0.55
            ten[i] = max(0.05, min(0.95, ten0 + q * 0.6 + amwob[i] * 0.02))
            bre[i] = max(
                0.03, min(0.95, bre0 - q * 0.5 + 0.25 * sstep((t - (te - 0.35)) / 0.35))
            )
    if LEGATO.get("level"):
        h = 6
        for L in sc["lines"]:
            ls = [g for g in segs if g["line"] == L["i"]]
            a = int((ls[0]["t0"] + 0.12) * CR)
            b = int((ls[-1]["t1"] - 0.25) * CR)
            src = db[a - h : b + h + 1]
            for i in range(a, b + 1):
                db[i] = sum(src[i - a : i - a + 2 * h + 1]) / (2 * h + 1)
    for g in segs:  # consonant microprosody
        if g["ph"] in VOICED_OBS:
            c = (g["t0"] + g["t1"]) / 2
            w = (g["t1"] - g["t0"]) * 0.6 + 0.02
            for i in range(int((c - 3 * w) * CR), int((c + 3 * w) * CR)):
                if 0 <= i < n and f0[i] > 0:
                    f0[i] *= 2 ** (-0.30 * math.exp(-(((i / CR - c) / w) ** 2)) / 12)
    return {"f0": f0, "db": db, "tension": ten, "breath": bre}


def breaths(sc, segs):
    """Breaths between lines: where each starts, how long and how deep."""
    out = []
    WANT = {0: 0.46, 6: 0.50, 7: 0.40, 8: 0.46, 14: 0.52, 15: 0.40, 4: 0.40}
    DEP = {5: 0.45, 6: 0.95, 7: 0.6, 14: 1.0, 8: 0.5, 11: 0.4, 15: 0.5}
    for L in sc["lines"]:
        a = next(g for g in segs if g["line"] == L["i"])["t0"]
        prev = [g for g in segs if g["line"] == L["i"] - 1]
        room = a - (prev[-1]["t1"] if prev else a - 1.2)
        d = min(WANT.get(L["i"], 0.36), max(0.18, room - 0.06))
        out.append(
            {
                "t0": round(a - 0.045 - d, 4),
                "t1": round(a - 0.045, 4),
                "depth": DEP.get(L["i"], round(0.42 + 0.45 * ARC[L["i"]][1], 3)),
                "line": L["i"],
            }
        )
    for li, w, nth in (
        (7, "boy", 1),
        (15, "peace", 0),
    ):  # small catch breaths inside the long lines
        L = sc["lines"][li]
        si = next(k for k in range(len(L["syl"])) if key(L, k) == (li, w, nth))
        e = max(g["t1"] for g in segs if g["line"] == li and g["syl"] == si)
        nx = min(g["t0"] for g in segs if g["line"] == li and g["syl"] == si + 1)
        if nx - e > 0.14:
            out.append(
                {
                    "t0": round(e + 0.03, 4),
                    "t1": round(nx - 0.03, 4),
                    "depth": 0.45,
                    "line": li,
                }
            )
    out.sort(key=lambda b: b["t0"])
    return out


def timeline(sc, segs, tr):
    """The film's timeline: lines, words, bars, mouth shape, level and pitch per film frame."""
    words = []
    for L in sc["lines"]:
        cur = None
        for i, s in enumerate(L["syl"]):
            g = [x for x in segs if x["line"] == L["i"] and x["syl"] == i]
            w = s["word"]
            cont = w.endswith("-")
            if cur is None:
                cur = {
                    "line": L["i"],
                    "w": w.rstrip("-"),
                    "t0": g[0]["t0"],
                    "t1": g[-1]["t1"],
                }
            else:
                cur["w"] += w.rstrip("-")
                cur["t1"] = g[-1]["t1"]
            if not cont:
                words.append(cur)
                cur = None
    fps = 24
    n = int(sc["total"] * fps) + 1
    OPEN = {
        "AA": 0.95,
        "AE": 0.9,
        "AH": 0.6,
        "AO": 0.75,
        "AW": 0.85,
        "AY": 0.9,
        "EH": 0.65,
        "ER": 0.4,
        "EY": 0.55,
        "IH": 0.35,
        "IY": 0.25,
        "OW": 0.6,
        "OH": 0.6,
        "OY": 0.65,
        "UH": 0.35,
        "UW": 0.22,
    }
    RND = {
        "AO": 0.6,
        "OW": 0.8,
        "OH": 0.8,
        "OY": 0.5,
        "UW": 1,
        "UH": 0.7,
        "W": 1,
        "R": 0.4,
        "SH": 0.6,
        "ZH": 0.6,
        "CH": 0.6,
        "JH": 0.6,
        "AW": 0.4,
    }
    mo = [0.0] * n
    mr = [0.0] * n
    for g in segs:
        o = OPEN.get(
            g["ph"], {"M": 0, "B": 0, "P": 0, "F": 0.08, "V": 0.08}.get(g["ph"], 0.18)
        )
        r = RND.get(g["ph"], 0)
        for i in range(max(0, int(g["t0"] * fps)), min(n, int(g["t1"] * fps) + 1)):
            mo[i] = o
            mr[i] = r

    def smooth(a):
        return [
            (a[max(0, i - 1)] + 2 * a[i] + a[min(n - 1, i + 1)]) / 4 for i in range(n)
        ]

    mo = smooth(mo)
    mr = smooth(mr)
    lev = []
    f = []
    for i in range(n):
        j = min(len(tr["db"]) - 1, int(i / fps * CR))
        lev.append(round(max(0, min(1, (tr["db"][j] + 24) / 24)), 3))
        f.append(round(tr["f0"][j], 1))
    return {
        "total": sc["total"],
        "fps": fps,
        "lines": [
            {
                "i": L["i"],
                "verse": L["verse"],
                "t0": L["t0"],
                "t1": L["t1"],
                "text": L["text"],
                "mood": L["mood"],
            }
            for L in sc["lines"]
        ],
        "words": [
            {
                "line": w["line"],
                "w": w["w"],
                "t0": round(w["t0"], 3),
                "t1": round(w["t1"], 3),
            }
            for w in words
        ],
        "bars": sc["bars"],
        "mouth": [round(x, 2) for x in mo],
        "round": [round(x, 2) for x in mr],
        "level": lev,
        "f0": f,
    }


def main() -> None:
    """Command line: perform the score; write build/score.json, perf.json and timeline.json."""
    sc0 = SC.build()
    sc = linger(sc0)
    segs = segments(sc)
    tr = tracks(sc, segs)
    br = breaths(sc, segs)
    os.makedirs(os.path.join(ROOT, "build"), exist_ok=True)
    Path(os.path.join(ROOT, "build", "score.json")).write_text(
        json.dumps(sc0, indent=1)
    )
    Path(os.path.join(ROOT, "build", "perf.json")).write_text(
        json.dumps(
            {
                "cr": CR,
                "total": sc["total"],
                "segs": segs,
                "breaths": br,
                "f0": [round(x, 3) for x in tr["f0"]],
                "db": [round(x, 2) for x in tr["db"]],
                "tension": [round(x, 3) for x in tr["tension"]],
                "breath": [round(x, 3) for x in tr["breath"]],
            }
        )
    )
    Path(os.path.join(ROOT, "build", "timeline.json")).write_text(
        json.dumps(timeline(sc, segs, tr))
    )
    if LEGATO.get("reduce"):
        Path(os.path.join(ROOT, "build", "reductions.json")).write_text(
            json.dumps(REDLOG, indent=1)
        )
    mn = min((g["t1"] - g["t0"], g["ph"], g["line"]) for g in segs)
    print("segs", len(segs), "shortest", mn, "total", sc["total"])
    for g in [g for g in segs if g["line"] == 0]:
        print(
            "{!s:<3} {!s:<3} {:.3f}-{:.3f} {:4.0f}ms".format(
                g["ph"], g["role"], g["t0"], g["t1"], 1000 * (g["t1"] - g["t0"])
            )
        )
