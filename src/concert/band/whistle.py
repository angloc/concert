"""whistle.py - low wooden whistle. A breath-driven pipe: the tone is the pipe's locked modes (each mode has its own onset lag and grows with
breath pressure), the breath itself is turbulence ringing in the same pipe modes (narrow resonators that follow the pitch), and every attack
starts as chiff: turbulence hits the upper modes before the fundamental has locked."""

import math
import random

from concert.band.dsp import *

CR = 441
BLK = 100
K2, K3, NZ, AIR = 0.07, 0.14, 0.55, 0.05


def controls(notes: list[dict], t0: float, t1: float, seed: int) -> list[tuple]:
    """notes: t,d,m, b (breath 0..1) or (b0,b1,b2), tongue(bool), slide(cents from), st(slide time), cut(semitones), vib"""
    r = random.Random(seed)
    n = int((t1 - t0) * CR)
    ctl = []
    k = 0
    ph = r.uniform(0, TAU)
    j1 = j2 = 0.0
    ns = [dict(e) for e in notes]
    for e in ns:
        for q, v in (
            ("tongue", True),
            ("slide", 0),
            ("st", 0.12),
            ("cut", 0),
            ("vib", 1.8),
            ("rel", 0.12),
        ):
            e.setdefault(q, v)
        if not isinstance(e["b"], tuple):
            e["b"] = (e["b"],) * 3
        e["vr"] = r.uniform(4.5, 5.2)
        e["cent"] = r.gauss(0, 2.2)
    for i in range(n):
        t = t0 + i / CR
        while k + 1 < len(ns) and t >= ns[k + 1]["t"]:
            k += 1
        e = ns[k]
        x = t - e["t"]
        d = e["d"]
        nx = ns[k + 1] if k + 1 < len(ns) else None
        legato = nx is not None and nx["t"] - (e["t"] + d) < 0.02 and not nx["tongue"]
        m = e["m"]
        if not e["tongue"] and k:
            pm = ns[k - 1]["m"]
            m = pm + (m - pm) * smooth(
                (x + 0.004) / 0.022
            )  # fingers: fast but not instant
        j1 += 0.10 * (r.gauss(0, 1) - j1)
        j2 += 0.015 * (r.gauss(0, 1) - j2)
        cent = e["cent"] + 5.0 * j2 * 3 + 2.0 * j1
        if e["slide"]:
            cent += e["slide"] * (1 - smooth(x / e["st"]))
        if e["tongue"] and x >= 0:
            cent += -32 * math.exp(-x / 0.035)
        if e["cut"] and 0 <= x < 0.042:
            m += e["cut"]
        u = max(0, min(1, x / d))
        b0, b1, b2 = e["b"]
        b = (
            b0 + (b1 - b0) * smooth(2 * u)
            if u < 0.5
            else b1 + (b2 - b1) * smooth(2 * u - 1)
        )
        if e["tongue"]:
            b *= smooth((x + 0.012) / 0.06) if x > -0.012 else 0.0
        if not legato:
            f = smooth((d - x) / e["rel"])
            b *= f
            cent -= 34 * (1 - f) ** 2
        ph += TAU * e["vr"] / CR * (1 + 0.06 * j2)
        va = e["vib"] * smooth((x - 0.38) / 0.55) * smooth((d - x + 0.05) / 0.25)
        b *= 1 + 0.10 * va * math.sin(ph) + 0.035 * j1 * 1.4 + 0.05 * j2 * 2
        cent += 9.5 * va * math.sin(ph - 0.5)
        on = max(0.0, x) if e["tongue"] else 9.0
        ctl.append((mtof(m) * 2 ** (cent / 1200), max(0.0, b), on))
    return ctl


def play(ctl: list[tuple], seed: int) -> list[float]:
    """Synthesise one low-whistle phrase from control rows `ctl`; returns samples."""
    r = random.Random(seed)
    u = r.random
    H = 8
    lag = [
        0.030,
        0.016,
        0.020,
        0.012,
        0.012,
        0.010,
        0.010,
        0.010,
    ]  # upper modes speak first
    lv = [1.0, K2, K3, K3 * 0.4, 0.028, 0.012, 0.008, 0.005]
    pw = [0.85, 1.7, 2.0, 2.4, 2.6, 2.8, 3, 3]
    A = [0.0] * H
    ph = 0.0
    out = []
    ap = out.append
    # turbulence resonators (state)
    R = 5
    z1 = [0.0] * R
    z2 = [0.0] * R
    n1 = n2 = 0.0
    cb = biquad_coefs("bp", 3100, 0.6)
    c1 = c2 = 0.0
    prevb = 0.0
    pf = ctl[0][0]
    sin = math.sin
    for f, b, on in ctl:
        tgt = []
        for h in range(H):
            a = lv[h] * b ** pw[h]
            if on < 0.05 and h:
                a *= 1 + 1.6 * math.exp(-on / 0.02) * (1 if h < 3 else 0.6)
            if on < 0.07 and h == 0:
                a *= smooth(on / 0.05) * 0.85 + 0.15
            tgt.append(a)
        rates = [1 - math.exp(-BLK / SR / l) for l in lag]
        newA = [a + (t - a) * q for a, t, q in zip(A, tgt, rates)]
        dA = [(q - a) / BLK for a, q in zip(A, newA)]
        co = []
        for h in range(R):
            fr = f * (h + 1) * (1 + 0.002 * h)
            w = TAU * fr / SR
            q = (14, 18, 20, 20, 20)[h]
            al = math.sin(w) / (2 * q)
            a0 = 1 + al
            co.append((al / a0, 2 * math.cos(w) / a0, (1 - al) / a0))
        chiff = math.exp(-on / 0.028) if on < 0.25 else 0.0
        turb = NZ * (b**1.35) * (1 + 2.2 * chiff)
        rg = (
            0.60,
            0.85,
            0.62 * (1 + 1.5 * chiff),
            0.42 * (1 + 2 * chiff),
            0.30 * (1 + 2 * chiff),
        )
        df = (f - pf) / BLK
        ff = pf
        db_ = (turb - prevb) / BLK
        tb = prevb
        for _ in range(BLK):
            ff += df
            ph += TAU * ff / SR
            if ph > TAU:
                ph -= TAU
            s = sin(ph)
            y = A[0] * s
            A[0] += dA[0]
            for h in range(1, H):
                a = A[h] = A[h] + dA[h]
                if a > 1e-5:
                    y += a * sin(ph * (h + 1) + h * 0.7)
            tb += db_
            nz = (u() + u() - 1.0) * 1.7 * tb * (1 + 0.45 * s)
            d = nz - n2
            n2 = n1
            n1 = nz
            for h in range(R):
                k0, k1, k2 = co[h]
                v = k0 * d + k1 * z1[h] - k2 * z2[h]
                z2[h] = z1[h]
                z1[h] = v
                y += rg[h] * v
            o = cb[0] * nz + c1
            c1 = cb[1] * nz - cb[3] * o + c2
            c2 = cb[2] * nz - cb[4] * o
            ap(y + AIR * o * (1 + 1.5 * chiff))
        A = newA[:]
        pf = f
        prevb = turb
    return eq(out, ("peak", 1150, 1.1, 2.0), ("lp", 5200.0, 0.6), ("hp", 180.0, 0.7))
