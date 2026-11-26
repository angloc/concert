"""bowed.py - bowed strings. Every player is a separate waveguide string with a stick-slip bow, own bow arm, own left hand, own body.
String: nut-side delay + bridge-side delay, bow at fraction beta; friction = memoryless stick/slip curve; bridge reflection is a lossy low-pass.
Body: modal bank (air mode, corpus modes, dense upper modes, bridge hill)."""

import itertools
import math
import random
from collections.abc import Sequence

from concert.band.dsp import *

CR = 441  # control rate (every 100 samples)
BLK = SR // CR


def _lp_delay(p, w):
    return math.atan2(p * math.sin(w), 1 - p * math.cos(w)) / w


BETA = 0.092
RATIO = 0.52
FLOOR = 0.0025
BITE = 0.0
VIB = 1.45
LOOSE = 1.9
VFLOOR = 0.25
NOISE = 0.035
SCR = 0.10
LO = 1200.0
HI = 2800.0
HISS = 0.15


def bow_string(
    ctl: list[tuple],
    p: float = 0.55,
    g: float = 0.955,
    beta: float = BETA,
    seed: int = 1,
    noise: float | None = None,
    tune: Sequence[float] | None = None,
    stats: dict | None = None,
) -> list[float]:
    """ctl: list of (f0, vbow, force, beta_mul) at CR. returns bridge velocity samples"""
    if noise is None:
        noise = NOISE
    SZ = 2048
    M = SZ - 1
    nk = [0.0] * SZ
    br = [0.0] * SZ
    wp = 0
    lp = 0.0
    stick = True
    nslip = 0
    out = []
    ap = out.append
    q = 1 - p
    hs = 0.0
    f, v0, F0, bm = ctl[0][:4]

    def lens(f, bm):
        w = TAU * f / SR
        tot = SR / f - _lp_delay(p, w) - 1.75
        if tune:
            tot *= 2 ** (tune(f) / 1200)  # measured correction, cents flat -> shorter
        b = beta * bm * SR / f
        return tot - b, b

    dn, db_ = lens(f, bm)
    prev = (dn, db_, v0, F0)
    nrm = random.Random(seed + 9).random
    inv = 1.0 / BLK
    for c in ctl:
        f, v1, F1, bm = c[:4]
        dn1, db1 = lens(f, bm)
        if (
            len(c) > 5 and c[5]
        ):  # a new stroke: the player's arm sets the string into one clean corner
            P = dn1 + db1
            A = c[5] * P / (2 * db1)
            for j in range(
                SZ
            ):  # u(t) = rising ramp with one fall per period (Helmholtz); br holds u, nk holds -u(t-db)
                br[(wp - j) & M] = A * (2 * ((-j / P + 0.5) % 1.0) - 1)
                nk[(wp - j) & M] = -A * (2 * (((-j - db1) / P + 0.5) % 1.0) - 1)
            lp = 0.0
            stick = True
        dn, db_, v, F = prev
        sdn = (dn1 - dn) * inv
        sdb = (db1 - db_) * inv
        sv = (v1 - v) * inv
        sF = (F1 - F) * inv
        for _ in range(BLK):
            dn += sdn
            db_ += sdb
            v += sv
            F += sF
            # nut side read, 4-point Lagrange
            i = int(dn)
            x = dn - i
            k = wp - i
            a = nk[(k + 1) & M]
            b = nk[k & M]
            c0 = nk[(k - 1) & M]
            d = nk[(k - 2) & M]
            xm = x - 1
            xm2 = x - 2
            xp = x + 1
            nr = -(
                -x * xm * xm2 * a * 0.16666667
                + xp * xm * xm2 * b * 0.5
                - xp * x * xm2 * c0 * 0.5
                + xp * x * xm * d * 0.16666667
            )
            # bridge side read, linear
            i = int(db_)
            x = db_ - i
            k = wp - i
            o = br[k & M]
            o += x * (br[(k - 1) & M] - o)
            lp = q * o + p * lp
            brf = -g * lp
            ap(o)
            dv = v - nr - brf
            hs += 0.35 * (nrm() - 0.5 - hs)
            N = F * (1.0 + noise * hs * 8)
            ad = dv if dv >= 0 else -dv
            if stick and ad > N * 0.8:
                stick = False
                nslip += 1
            if not stick:
                # sliding: |dv| - s = N*(mu_d + dmu*v0/(v0+s)) -> quadratic in slip speed s
                c_ = ad - N * 0.3 - 0.08
                dq = c_ * c_ + 0.32 * (c_ + 0.08 - N * 0.5)
                if dq <= 0:
                    stick = True
                else:
                    s = (c_ + dq**0.5) * 0.5
                    if s <= 0:
                        stick = True
            if stick:
                nv = dv
            else:
                nv = (ad - s) * (1.0 + noise * hs * 10)
                if dv < 0:
                    nv = -nv
            wp = (wp + 1) & M
            nk[wp] = brf + nv
            br[wp] = nr + nv
        prev = (dn1, db1, v1, F1)
        if stats is not None:
            stats.append(nslip / (BLK * f / SR))
            nslip = 0
    return out


# ---- bodies --------------------------------------------------------------------------------------
def body(kind, seed):
    """signature modes + a dense, random-phase modal field (every instrument different): this is what makes vibrato shimmer instead of wobble"""
    r = random.Random(seed)
    m = []
    if kind == "cello":
        sig = [
            (97, 12, 0.75),
            (148, 15, 1.0),
            (176, 17, 1.35),
            (203, 18, 1.3),
            (234, 18, 1.1),
        ]
        lo, hi = 262.0, 4600.0
        sp0, sp1 = 37.0, 120.0
        env = [
            (200, 1.3),
            (330, 1.2),
            (480, 0.95),
            (700, 0.62),
            (950, 0.5),
            (1300, 0.5),
            (1800, 0.54),
            (2300, 0.48),
            (3000, 0.34),
            (3800, 0.20),
            (4600, 0.10),
        ]
    else:
        sig = [
            (222, 13, 1.0),
            (274, 16, 0.8),
            (338, 17, 1.2),
            (402, 18, 1.25),
            (456, 18, 1.1),
        ]
        lo, hi = 505.0, 5200.0
        sp0, sp1 = 48.0, 150.0
        env = [
            (400, 1.15),
            (560, 0.9),
            (750, 0.66),
            (1050, 0.52),
            (1500, 0.5),
            (2000, 0.56),
            (2600, 0.5),
            (3300, 0.35),
            (4200, 0.2),
            (5200, 0.09),
        ]
    for f, q, g in sig:
        m.append(
            (
                f * r.uniform(0.965, 1.035),
                q * r.uniform(0.85, 1.2),
                g * r.uniform(0.75, 1.25),
                0,
            )
        )
    f = lo
    while f < hi:
        sp = sp0 + (sp1 - sp0) * min(1.0, (f - lo) / 2600.0)
        q = (
            f / (22.0 + f * 0.022) * r.uniform(0.8, 1.25)
        )  # bandwidth grows slowly with frequency
        g = interp(env, f) * 10 ** (r.gauss(0, 3.2) / 20) * r.choice((-1, 1)) * 0.95
        m.append((f, q, g, 0))
        f += sp * r.uniform(0.6, 1.4)
    return m


def bow_light(x: Sequence[float], ctl: list[tuple], seed: int = 0) -> list[float]:
    """soft bowing is rounder: a one-pole whose corner follows the bow's effort; the arm's lift/press; hair catching the string at each new stroke"""
    lo, hi, scratch = LO, HI, SCR
    out = []
    ap = out.append
    y = 0.0
    i = 0
    a0 = None
    g0 = 0.0
    sc = 0.0
    r = random.Random(seed + 5).random
    n1 = n2 = 0.0
    for c in ctl:
        fc = min(
            6500.0,
            lo * (hi / lo) ** min(1.0, max(0.0, c[4])) * max(1.0, c[0] / 190.0) ** 0.6,
        )
        a1 = 1 - math.exp(-TAU * fc / SR)
        if a0 is None:
            a0 = a1
        if c[5]:
            sc = scratch * (0.25 + 3.2 * abs(c[1]))
        da = (a1 - a0) / BLK
        g1 = c[6]
        dg = (g1 - g0) / BLK
        for v in x[i : i + BLK]:
            a0 += da
            g0 += dg
            sc *= 0.99955
            w = r() - 0.5
            n1 += 0.22 * (w - n1)
            n2 += 0.03 * (w - n2)  # band of noise around 400 Hz - 2 kHz
            y += a0 * (v * g0 + (n1 - n2) * (sc * (0.15 + g0) + HISS * c[4]) - y)
            ap(y)
        a0 = a1
        g0 = g1
        i += BLK
    return out


def radiate(x: Sequence[float], kind: str, seed: int) -> Sequence[float]:
    """Radiate a bowed string's bridge signal through the body resonances of `kind` (cello or viola)."""
    run = make_bank(body(kind, seed))
    L, _ = run(x)
    d = eq(
        x,
        ("hp", 180.0 if kind == "cello" else 260.0, 0.6),
        ("lp", 3200.0 if kind == "cello" else 3800.0, 0.6),
    )
    y = [a + 0.16 * b for a, b in zip(L, d)]
    return eq(
        y,
        ("hp", 58.0 if kind == "cello" else 120.0, 0.7),
        ("ls", 250.0, 0.6, 3.0),
        ("peak", 350.0, 0.8, 1.2),
        ("peak", 1000.0, 0.7, -2.8),
    )


# ---- the player ----------------------------------------------------------------------------------
def controls(
    notes: list[dict],
    t0: float,
    t1: float,
    seed: int,
    kind: str = "cello",
    loose: float = 1.0,
) -> list[tuple]:
    """notes: dicts t,d,m, dyn=(a,b,c) 0..1 start/middle/end, slur (joined to previous bow), vib (cents), port (s), att (s), rel (s)
    returns control list at CR for [t0,t1)"""
    r = random.Random(seed)
    n = int((t1 - t0) * CR)
    loose *= LOOSE
    detune = r.gauss(0, 3.2) * loose
    vr = r.uniform(4.7, 5.5)
    vph = r.uniform(0, TAU)
    bowsign = r.choice((-1, 1))
    ns = []
    for k, e in enumerate(notes):
        e = dict(e)
        j = r.gauss(0, 0.012) * loose
        e["t"] = (
            e["t"]
            + j
            + r.uniform(-0.004, 0.014) * loose
            - (0.030 if e.get("slur") else 0.055)
        )
        e["e"] = e["t"] + e["d"] + r.gauss(0, 0.02) * loose
        e.setdefault("slur", False)
        e.setdefault("vib", 22)
        e.setdefault("port", 0)
        e.setdefault("att", 0.17)
        e.setdefault("rel", 0.22)
        e["cent"] = detune + r.gauss(0, 2.0) * loose
        e["vibx"] = r.uniform(0.8, 1.2)
        e["vd"] = r.uniform(0.28, 0.6)
        e["vr"] = vr * r.uniform(0.96, 1.04)
        ns.append(e)
    for a, b in itertools.pairwise(ns):
        if b["slur"] or b["t"] < a["e"]:
            a["e"] = b["t"]
    ctl = []
    pv = 0.0
    k = 0
    ph = vph
    wob = 0.0
    pw = 0.0
    fw = 0.0
    sign = bowsign
    for i in range(n):
        t = t0 + i / CR
        while k + 1 < len(ns) and t >= ns[k + 1]["t"]:
            k += 1
            if not ns[k]["slur"]:
                sign = -sign
        e = ns[k]
        x = t - e["t"]
        d = e["e"] - e["t"]
        # pitch
        m = e["m"]
        prevm = ns[k - 1]["m"] if k and e["t"] - ns[k - 1]["e"] < 0.25 else m
        if k and prevm != m:
            w = max(0.035, e["port"])
            u = smooth((x + w * 0.35) / w)
            m = prevm + (m - prevm) * u
        if (
            k + 1 < len(ns) and ns[k + 1]["t"] - e["e"] < 0.25
        ):  # the finger is already moving
            w = max(0.035, ns[k + 1]["port"])
            y = (t - ns[k + 1]["t"] + w * 0.35) / w
            if y > 0:
                m = e["m"] + (ns[k + 1]["m"] - e["m"]) * smooth(y)
        pw += 0.02 * (r.gauss(0, 1) - pw)
        ph += TAU * e["vr"] / CR * (1 + 0.05 * pw)
        vamt = (
            VIB
            * e["vib"]
            * e["vibx"]
            * smooth((x - e["vd"]) / 0.6)
            * (1 - 0.6 * smooth((x - d + 0.35) / 0.35))
            * loose**0.3
        )
        cent = e["cent"] + vamt * math.sin(ph) + 9 * pw * loose
        # dynamics
        a, b, c = e["dyn"]
        u = max(0, min(1, x / max(0.05, d)))
        dy = a + (b - a) * smooth(u * 2) if u < 0.5 else b + (c - b) * smooth(u * 2 - 1)
        wob += 0.03 * (r.gauss(0, 1) - wob)
        dy *= 1 + 0.16 * wob
        env = 1.0
        if not e["slur"]:
            env *= smooth(x / e["att"])
        if not (k + 1 < len(ns) and ns[k + 1]["slur"]):
            env *= smooth((d - x) / min(e["rel"], d * 0.6))
        fw += 0.04 * (r.gauss(0, 1) - fw)
        # The string is kept in one clean corner; how much of it we hear through the arm's pressure/lift is `gain`.
        act = env > 0 and (x >= 0 or k > 0)
        v = (
            sign * (0.016 + 0.125 * dy**1.25) * (VFLOOR + (1 - VFLOOR) * env)
            if act
            else 0.0
        )
        gain = env**0.85 if act else 0.0
        # force: a share of the Schelleng maximum for this speed, a little more bite in the attack
        ratio = (
            RATIO
            + 0.07 * dy
            + 0.02 * fw
            + BITE * math.exp(-max(0, x) / 0.09) * (0 if e["slur"] else 1)
        )
        F = ratio * (FLOOR + abs(v)) / (BETA * 0.5)
        bm = 1.0 + 0.10 * (1 - dy) + 0.05 * fw
        st = 0.0
        if v and (pv == 0.0 or (v > 0) != (pv > 0)):
            st = v
        pv = v
        ctl.append((mtof(m) * 2 ** (cent / 1200), v, F, bm, dy * env, st, gain))
    return ctl
