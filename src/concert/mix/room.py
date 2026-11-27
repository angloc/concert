"""room.py - a small stone chapel: early reflections from an image-source shoebox, late tail from a 12-line feedback delay network
(Householder matrix, per-line absorption, slow length modulation). Pure Python, one pass, stereo out."""

import math
from collections.abc import Sequence

from concert.band.dsp import *

ROOM = (8.2, 13.5, 6.8)  # m: width, length, height of the chapel


def early(
    x: Sequence[float],
    src: tuple[float, float, float],
    ears: Sequence[tuple[float, float, float]] = ((-0.11, 0, 0), (0.11, 0, 0)),
    lis: tuple[float, float, float] = (4.0, 4.4, 1.5),
    absorb: float = 0.22,
    order: int = 2,
    skip_direct: bool = True,
    tmax: float = 0.085,
    pre: float = 0.0,
) -> tuple[list[float], list[float]]:
    """image sources up to `order`; each wall bounce is darker. returns (L, R)"""
    C = 343.0
    taps = []
    for nx in range(-order, order + 1):
        for ny in range(-order, order + 1):
            for nz in range(-order, order + 1):
                b = abs(nx) + abs(ny) + abs(nz)
                if b > order or (b == 0 and skip_direct):
                    continue
                p = []
                for q, s, R in zip((nx, ny, nz), src, ROOM):
                    p.append(q * R + (s if q % 2 == 0 else R - s))
                d = math.dist(p, lis)
                dd = math.dist(src, lis)
                t = (d - dd) / C
                if t > tmax:
                    continue
                az = math.atan2(p[0] - lis[0], p[1] - lis[1])
                g = dd / d * (1 - absorb) ** b
                taps.append((t, g, az, b))
    L = [0.0] * len(x)
    R = [0.0] * len(x)
    dark = {
        b: eq(x, ("lp", 5200.0 / (1 + 0.55 * (b - 1)), 0.6), ("hp", 140.0, 0.6))
        for b in range(1, order + 1)
    }
    for t, g, az, b in sorted(taps):
        it = 0.00026 * math.sin(az)
        0.5 + 0.5 * math.cos(az)  # interaural time + head shadow
        gl = g * (1 - 0.45 * max(0, math.sin(az)))
        gr = g * (1 - 0.45 * max(0, -math.sin(az)))
        sgn = 1 if int(t * 7919) % 2 else -1
        for dst, dt, gg in ((L, t + it, gl), (R, t - it, gr)):
            k = int((max(0, dt) + pre) * SR)
            mix_into(dst, dark[b][: len(x) - k], k, gg * sgn)
    return L, R


def fdn(
    xL: Sequence[float],
    xR: Sequence[float],
    t60: float = 1.75,
    t60hi: float = 0.62,
    fc: float = 2400.0,
    predelay: float = 0.025,
    tail: float = 2.6,
    seed: int = 4,
    lowcut: float = 170.0,
    size: float = 1.0,
) -> tuple[list[float], list[float]]:
    """late reverberation. t60 at low/mid, t60hi at fc"""
    n = len(xL) + int(tail * SR)
    pd = int(predelay * SR)
    prim = [1423, 1567, 1721, 1901, 2069, 2237, 2423, 2617, 2833, 3041, 3271, 3511]
    D = [int(p * size) | 1 for p in prim]
    K = len(D)

    # diffuse the input with four allpasses per side so the tail has no grain
    def diffuse(x, ds):
        for d in ds:
            buf = [0.0] * d
            i = 0
            o = []
            ap = o.append
            g = 0.62
            for v in x:
                b = buf[i]
                y = b - g * v
                buf[i] = v + g * y
                ap(y)
                i += 1
                if i == d:
                    i = 0
            x = o
        return x

    pad = [0.0] * (n - len(xL))
    a = eq(xL, ("hp", lowcut, 0.6), ("lp", 6200.0, 0.6)) + pad
    b = eq(xR, ("hp", lowcut, 0.6), ("lp", 6200.0, 0.6)) + pad
    a = diffuse(a, (211, 337, 523, 733))
    b = diffuse(b, (229, 353, 499, 761))
    a = [0.0] * pd + a[: n - pd]
    b = [0.0] * pd + b[: n - pd]
    src = ["def run(a,b):", " L=[];R=[];la=L.append;ra=R.append"]
    for k in range(K):
        g0 = 10 ** (-3 * D[k] / SR / t60)
        gh = 10 ** (-3 * D[k] / SR / t60hi)
        w = TAU * fc / SR
        lo, hi = 0.0, 0.98
        for _ in range(40):
            p = (lo + hi) / 2
            if (1 - p) / math.sqrt(1 - 2 * p * math.cos(w) + p * p) > gh / g0:
                lo = p
            else:
                hi = p
        p = (lo + hi) / 2
        src.append(
            f" q{k:d}=[0.0]*{D[k]:d};i{k:d}=0;z{k:d}=0.0;B{k:d}={(1 - p) * g0:.9f};P{k:d}={p:.9f}"
        )
    src.append(" for u,v in zip(a,b):")
    for k in range(K):
        src.append(f"  z{k:d}=B{k:d}*q{k:d}[i{k:d}]+P{k:d}*z{k:d}")
    src.append("  s=({})*{:.9f}".format("+".join(f"z{k:d}" for k in range(K)), 2.0 / K))
    for k in range(K):
        inp = "u" if k % 2 == 0 else "v"
        src.append(
            "  q{:d}[i{:d}]=z{:d}-s{}.35*{};i{:d}+=1".format(
                k, k, k, "+" if (k // 2) % 2 == 0 else "-", inp, k
            )
        )
        src.append(f"  if i{k:d}=={D[k]:d}:i{k:d}=0")
    sg = [1, -1, 1, 1, -1, 1, -1, -1, 1, -1, 1, 1]
    src.append(
        "  la({});ra({})".format(
            "".join(
                "{}z{:d}".format("+" if sg[k] > 0 else "-", k) for k in range(0, K, 2)
            )
            + "".join(
                "{}.35*z{:d}".format("+" if sg[(k * 5 + 1) % K] > 0 else "-", k)
                for k in range(1, K, 2)
            ),
            "".join(
                "{}z{:d}".format("+" if sg[k] > 0 else "-", k) for k in range(1, K, 2)
            )
            + "".join(
                "{}.35*z{:d}".format("+" if sg[(k * 7 + 3) % K] > 0 else "-", k)
                for k in range(0, K, 2)
            ),
        )
    )
    src.append(" return L,R")
    d = {}
    exec("\n".join(src), d)  # noqa: S102 - the delay network is generated as straight-line code for speed
    return d["run"](a, b)
