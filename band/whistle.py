"""whistle.py - low wooden whistle. A breath-driven pipe: the tone is the pipe's locked modes (each mode has its own onset lag and grows with
breath pressure), the breath itself is turbulence ringing in the same pipe modes (narrow resonators that follow the pitch), and every attack
starts as chiff: turbulence hits the upper modes before the fundamental has locked."""
import math, random
from dsp import *
CR = 441; BLK = 100
K2, K3, NZ, AIR = .07, .14, .55, .05

def controls(notes, t0, t1, seed):
    """notes: t,d,m, b (breath 0..1) or (b0,b1,b2), tongue(bool), slide(cents from), st(slide time), cut(semitones), vib"""
    r = random.Random(seed); n = int((t1 - t0) * CR); ctl = []; k = 0; ph = r.uniform(0, TAU); j1 = j2 = 0.0; wob = 0.0; pw = 0.0
    ns = [dict(e) for e in notes]
    for e in ns:
        for q, v in (("tongue", True), ("slide", 0), ("st", .12), ("cut", 0), ("vib", 1.8), ("rel", .12)): e.setdefault(q, v)
        if not isinstance(e["b"], tuple): e["b"] = (e["b"],) * 3
        e["vr"] = r.uniform(4.5, 5.2); e["cent"] = r.gauss(0, 2.2)
    for i in range(n):
        t = t0 + i / CR
        while k + 1 < len(ns) and t >= ns[k+1]["t"]: k += 1
        e = ns[k]; x = t - e["t"]; d = e["d"]; nx = ns[k+1] if k + 1 < len(ns) else None
        legato = nx is not None and nx["t"] - (e["t"] + d) < .02 and not nx["tongue"]
        m = e["m"]
        if not e["tongue"] and k: pm = ns[k-1]["m"]; m = pm + (m - pm) * smooth((x + .004) / .022)      # fingers: fast but not instant
        j1 += .10 * (r.gauss(0, 1) - j1); j2 += .015 * (r.gauss(0, 1) - j2)
        cent = e["cent"] + 5.0 * j2 * 3 + 2.0 * j1
        if e["slide"]: cent += e["slide"] * (1 - smooth(x / e["st"]))
        if e["tongue"] and x >= 0: cent += -32 * math.exp(-x / .035)
        if e["cut"] and 0 <= x < .042: m += e["cut"]
        u = max(0, min(1, x / d)); b0, b1, b2 = e["b"]
        b = b0 + (b1 - b0) * smooth(2 * u) if u < .5 else b1 + (b2 - b1) * smooth(2 * u - 1)
        if e["tongue"]: b *= smooth((x + .012) / .06) if x > -.012 else 0.0
        if not legato: f = smooth((d - x) / e["rel"]); b *= f; cent -= 34 * (1 - f) ** 2
        ph += TAU * e["vr"] / CR * (1 + .06 * j2)
        va = e["vib"] * smooth((x - .38) / .55) * smooth((d - x + .05) / .25)
        b *= 1 + .10 * va * math.sin(ph) + .035 * j1 * 1.4 + .05 * j2 * 2
        cent += 9.5 * va * math.sin(ph - .5)
        on = max(0.0, x) if e["tongue"] else 9.0
        ctl.append((mtof(m) * 2 ** (cent / 1200), max(0.0, b), on))
    return ctl

def play(ctl, seed):
    r = random.Random(seed); g = r.gauss; u = r.random
    H = 8; lag = [.030, .016, .020, .012, .012, .010, .010, .010]     # upper modes speak first
    lv = [1.0, K2, K3, K3 * .4, .028, .012, .008, .005]; pw = [.85, 1.7, 2.0, 2.4, 2.6, 2.8, 3, 3]
    A = [0.0] * H; ph = 0.0; out = []; ap = out.append
    # turbulence resonators (state)
    R = 5; z1 = [0.0] * R; z2 = [0.0] * R; hp = 0.0; n1 = n2 = 0.0; w1 = w2 = 0.0
    cb = biquad_coefs("bp", 3100, .6); c1 = c2 = 0.0
    prevb = 0.0; pf = ctl[0][0]; sin = math.sin
    Alast = A[:]
    for f, b, on in ctl:
        tgt = []
        for h in range(H):
            a = lv[h] * b ** pw[h]
            if on < .05 and h: a *= 1 + 1.6 * math.exp(-on / .02) * (1 if h < 3 else .6)
            if on < .07 and h == 0: a *= smooth(on / .05) * .85 + .15
            tgt.append(a)
        rates = [1 - math.exp(-BLK / SR / l) for l in lag]
        newA = [a + (t - a) * q for a, t, q in zip(A, tgt, rates)]
        dA = [(q - a) / BLK for a, q in zip(A, newA)]
        co = []
        for h in range(R):
            fr = f * (h + 1) * (1 + .002 * h); w = TAU * fr / SR; q = (14, 18, 20, 20, 20)[h]; al = math.sin(w) / (2 * q); a0 = 1 + al
            co.append((al / a0, 2 * math.cos(w) / a0, (1 - al) / a0))
        chiff = math.exp(-on / .028) if on < .25 else 0.0
        turb = NZ * (b ** 1.35) * (1 + 2.2 * chiff)
        rg = (.60, .85, .62 * (1 + 1.5 * chiff), .42 * (1 + 2 * chiff), .30 * (1 + 2 * chiff))
        df = (f - pf) / BLK; ff = pf; db_ = (turb - prevb) / BLK; tb = prevb
        for _ in range(BLK):
            ff += df; ph += TAU * ff / SR
            if ph > TAU: ph -= TAU
            s = sin(ph); y = A[0] * s
            A[0] += dA[0]
            for h in range(1, H):
                a = A[h] = A[h] + dA[h]
                if a > 1e-5: y += a * sin(ph * (h + 1) + h * .7)
            tb += db_
            nz = (u() + u() - 1.0) * 1.7 * tb * (1 + .45 * s)
            d = nz - n2; n2 = n1; n1 = nz
            for h in range(R):
                k0, k1, k2 = co[h]
                v = k0 * d + k1 * z1[h] - k2 * z2[h]; z2[h] = z1[h]; z1[h] = v
                y += rg[h] * v
            o = cb[0] * nz + c1; c1 = cb[1] * nz - cb[3] * o + c2; c2 = cb[2] * nz - cb[4] * o
            ap(y + AIR * o * (1 + 1.5 * chiff))
        A = newA[:]; pf = f; prevb = turb
    return eq(out, ("peak", 1150, 1.1, 2.0), ("lp", 5200.0, .6), ("hp", 180.0, .7))
