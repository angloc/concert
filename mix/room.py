"""room.py - a small stone chapel: early reflections from an image-source shoebox, late tail from a 12-line feedback delay network
(Householder matrix, per-line absorption, slow length modulation). Pure Python, one pass, stereo out."""
import math, random, sys, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "band"))
from dsp import *

ROOM = (8.2, 13.5, 6.8)                # m: width, length, height of the chapel
def early(x, src, ears=((-.11, 0, 0), (.11, 0, 0)), lis=(4.0, 4.4, 1.5), absorb=.22, order=2, skip_direct=True, tmax=.085, pre=0.0):
    """image sources up to `order`; each wall bounce is darker. returns (L, R)"""
    C = 343.0; taps = []
    for nx in range(-order, order + 1):
        for ny in range(-order, order + 1):
            for nz in range(-order, order + 1):
                b = abs(nx) + abs(ny) + abs(nz)
                if b > order or (b == 0 and skip_direct): continue
                p = []
                for q, s, R in zip((nx, ny, nz), src, ROOM): p.append(q * R + (s if q % 2 == 0 else R - s))
                d = math.dist(p, lis); dd = math.dist(src, lis); t = (d - dd) / C
                if t > tmax: continue
                az = math.atan2(p[0] - lis[0], p[1] - lis[1]); g = dd / d * (1 - absorb) ** b
                taps.append((t, g, az, b))
    L = [0.0] * len(x); R = [0.0] * len(x)
    dark = {b: eq(x, ("lp", 5200.0 / (1 + .55 * (b - 1)), .6), ("hp", 140.0, .6)) for b in range(1, order + 1)}
    for t, g, az, b in sorted(taps):
        it = .00026 * math.sin(az); sh = .5 + .5 * math.cos(az)            # interaural time + head shadow
        gl = g * (1 - .45 * max(0, math.sin(az))); gr = g * (1 - .45 * max(0, -math.sin(az)))
        sgn = 1 if int(t * 7919) % 2 else -1
        for dst, dt, gg in ((L, t + it, gl), (R, t - it, gr)):
            k = int((max(0, dt) + pre) * SR); mix_into(dst, dark[b][:len(x) - k], k, gg * sgn)
    return L, R

def fdn(xL, xR, t60=1.75, t60hi=.62, fc=2400.0, predelay=.025, tail=2.6, seed=4, lowcut=170.0, size=1.0):
    """late reverberation. t60 at low/mid, t60hi at fc"""
    n = len(xL) + int(tail * SR); pd = int(predelay * SR)
    r = random.Random(seed)
    prim = [1423, 1567, 1721, 1901, 2069, 2237, 2423, 2617, 2833, 3041, 3271, 3511]
    D = [int(p * size) | 1 for p in prim]; K = len(D)
    # diffuse the input with four allpasses per side so the tail has no grain
    def diffuse(x, ds):
        for d in ds:
            buf = [0.0] * d; i = 0; o = []; ap = o.append; g = .62
            for v in x:
                b = buf[i]; y = b - g * v; buf[i] = v + g * y; ap(y); i += 1
                if i == d: i = 0
            x = o
        return x
    pad = [0.0] * (n - len(xL))
    a = eq(xL, ("hp", lowcut, .6), ("lp", 6200.0, .6)) + pad; b = eq(xR, ("hp", lowcut, .6), ("lp", 6200.0, .6)) + pad
    a = diffuse(a, (211, 337, 523, 733)); b = diffuse(b, (229, 353, 499, 761))
    a = [0.0] * pd + a[:n - pd]; b = [0.0] * pd + b[:n - pd]
    src = ["def run(a,b):", " L=[];R=[];la=L.append;ra=R.append"]
    for k in range(K):
        g0 = 10 ** (-3 * D[k] / SR / t60); gh = 10 ** (-3 * D[k] / SR / t60hi); w = TAU * fc / SR
        lo, hi = 0.0, .98
        for _ in range(40):
            p = (lo + hi) / 2
            if (1 - p) / math.sqrt(1 - 2*p*math.cos(w) + p*p) > gh / g0: lo = p
            else: hi = p
        p = (lo + hi) / 2
        src.append(" q%d=[0.0]*%d;i%d=0;z%d=0.0;B%d=%.9f;P%d=%.9f" % (k, D[k], k, k, k, (1 - p) * g0, k, p))
    src.append(" for u,v in zip(a,b):")
    for k in range(K): src.append("  z%d=B%d*q%d[i%d]+P%d*z%d" % (k, k, k, k, k, k))
    src.append("  s=(%s)*%.9f" % ("+".join("z%d" % k for k in range(K)), 2.0 / K))
    for k in range(K):
        inp = ("u" if k % 2 == 0 else "v")
        src.append("  q%d[i%d]=z%d-s%s.35*%s;i%d+=1" % (k, k, k, "+" if (k // 2) % 2 == 0 else "-", inp, k))
        src.append("  if i%d==%d:i%d=0" % (k, D[k], k))
    sg = [1, -1, 1, 1, -1, 1, -1, -1, 1, -1, 1, 1]
    src.append("  la(%s);ra(%s)" % ("".join("%sz%d" % ("+" if sg[k] > 0 else "-", k) for k in range(0, K, 2)) + "".join("%s.35*z%d" % ("+" if sg[(k*5+1) % K] > 0 else "-", k) for k in range(1, K, 2)),
                                    "".join("%sz%d" % ("+" if sg[k] > 0 else "-", k) for k in range(1, K, 2)) + "".join("%s.35*z%d" % ("+" if sg[(k*7+3) % K] > 0 else "-", k) for k in range(0, K, 2))))
    src.append(" return L,R"); d = {}; exec("\n".join(src), d)
    return d["run"](a, b)
