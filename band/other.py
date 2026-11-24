"""other.py - far-off pipe drones (reed pulses through a bore, carried by wind) and footfalls on turf heard from below."""
import math, random
from dsp import *

LP, HPF, TILT = 2000.0, 190.0, -.30
def drone(dur, seed, notes=((51, 1.0), (51.035, .8), (39, .55), (46.02, .22)), env=None):
    """env(t)->0..1. mono"""
    r = random.Random(seed); n = int(dur * SR); out = [0.0] * n
    form = [(430, 5, 1.0), (760, 5, .9), (1150, 5, .55), (1900, 4, .25)]
    for mi, lev in notes:
        f0 = mtof(mi) * 2 ** (r.gauss(0, 1.0) / 1200); H = min(40, int(3600 / f0)); st = []
        for h in range(1, H + 1):
            f = f0 * h; a = h ** TILT * sum(g / math.sqrt(1 + (q * (f / fc - fc / f)) ** 2) for fc, q, g in form)
            st.append([f, a * lev, r.uniform(0, TAU)])
        # slow bag-pressure drift, shared by all partials of a reed, applied in 100 ms blocks through rotation of each oscillator
        B = 2205; dr = 0.0; osc = [[math.cos(p), math.sin(p), f, a] for f, a, p in st]; seg = []
        for b in range(0, n, B):
            dr += .25 * (r.gauss(0, 1) - dr); k = 2 ** (dr * 2.2 / 1200); m = min(B, n - b); acc = [0.0] * m
            for o in osc:
                w = TAU * o[2] * k / SR; c = math.cos(w); s = math.sin(w); x, y = o[0], o[1]; a = o[3]; L = []; ap = L.append
                for _ in range(m):
                    x, y = x * c - y * s, x * s + y * c; ap(a * y)
                q = 1 / math.sqrt(x*x + y*y); o[0], o[1] = x * q, y * q
                acc = [p + t for p, t in zip(acc, L)]
            seg += acc
        out = [p + t for p, t in zip(out, seg)]
    # wind: slow gusts change loudness and, because distance eats treble, brightness
    g1 = g2 = g3 = 0.0; y = 0.0; z = 0.0; res = []; ap = res.append; gust = []
    for i in range(0, n, 441):
        g1 += .012 * (r.gauss(0, 1) - g1); g2 += .02 * (g1 - g2); g3 += .02 * (g2 - g3); gust.append(g3)
    s = max(1e-9, max(abs(v) for v in gust)); gust = [v / s for v in gust]
    for j, gv in enumerate(gust):
        e = (env(j * .01) if env else 1.0) * 10 ** (5.0 * gv / 20); a = 1 - math.exp(-TAU * (LP * (1 + .4 * gv)) / SR)
        for v in out[j*441:(j+1)*441]:
            y += a * (v * e - y); z += a * (y - z); ap(z)
    return eq(res, ("hp", HPF, .7))

def footfall(weight, seed):
    """heel, then ball of the foot, through a yard of soil: damped low modes with a little downward glide, and a breath of grass"""
    r = random.Random(seed); n = int(.75 * SR); out = [0.0] * n
    for at, f0, f1, dec, a in ((0.0, 64, 47, .115, 1.0), (.012, 93, 80, .060, .40), (.175, 58, 46, .095, .42), (.185, 120, 105, .04, .10)):
        f0 *= r.uniform(.95, 1.05); at += r.uniform(0, .012); ph = 0.0
        for i in range(int(at * SR), n):
            t = i / SR - at; f = f1 + (f0 - f1) * math.exp(-t / .05); ph += TAU * f / SR
            out[i] += a * weight * math.sin(ph) * math.exp(-t / dec) * smooth(t / .024)
    nz = eq([r.gauss(0, 1) for _ in range(n)], ("bp", 420, .7), ("lp", 900, .7))
    for i in range(n):
        t = i / SR; out[i] += nz[i] * .05 * weight * (smooth(t / .02) * math.exp(-t / .05) + .7 * smooth((t - .17) / .03) * math.exp(-max(0, t - .17) / .07))
    return eq(out, ("lp", 240, .6), ("hp", 30, .7))
