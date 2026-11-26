"""mix.py - `nice -n 10 concert-mix [voice.wav] [-o build/mix.wav] [--band-only] [--band dB] [--wet dB] [--lufs -16]`
voice (mono, dry) + build/stem_*.wav -> build/mix.wav. Linear throughout: filters, gains that move slowly, one room. No waveshaping anywhere.
Works in 16 s segments with overlap-add; each worker reads its own slice from disk, so the whole job stays under about 200 MB. At most 2 workers."""

import array
import json
import math
import multiprocessing as mp
import os
import sys
import time
import wave
from pathlib import Path

from concert import ROOT
from concert.band.dsp import *
from concert.mix import room

BUILD = os.path.join(ROOT, "build")
sc = json.loads(Path(os.path.join(BUILD, "score.json")).read_text())
TOTAL = sc["total"]
N = int(TOTAL * SR)
B = 64
BR = SR / B
NB = N // B + 1
SEG = 256 * 2756
PRE = B * 280
TAIL = int(5.0 * SR)  # about 16 s, 0.4 s filter pre-roll
STEMS = ("harp", "strings", "whistle", "other")
# stage plan: gain, early-reflection send, late send, position (x,y,z in m; the listener sits at 4.0,4.4)
STAGE = {
    "voice": (1.0, 0.42, 0.40, (4.0, 6.0, 1.6)),
    "harp": (0.50, 0.55, 0.48, (2.4, 7.4, 1.1)),
    "strings": (0.46, 0.90, 0.78, (5.0, 9.6, 1.2)),
    "whistle": (0.86, 0.80, 0.85, (5.6, 9.0, 1.6)),
    "other": (0.55, 0.30, 0.80, (6.6, 12.0, 1.5)),
}
WIDTH = {"harp": 1.15, "strings": 1.18, "whistle": 1.0, "other": 1.1}
# the posthumous section (from "And I shall hear", line 12 to the end): she is further away, in a longer, darker room, and doubled by two slowly
# moving, slightly detuned copies spread wide.  Linear and time-varying only through a smooth envelope.
GHOST_LINE = 12
GHOST_RAMP = 1.5
GHOST_ON = sc["lines"][GHOST_LINE]["t0"] - 0.5
GHOST = {
    "dry": 0.30,
    "rev": 0.55,
    "t60": 4.6,
    "t60hi": 2.0,
    "fc": 2900.0,
    "pre": 0.045,
    "dub": 0.50,
    "d1": (0.0125, 0.0011, 0.31, 0.0),
    "d2": (0.0178, 0.0014, 0.23, 2.1),
}


def ghost_env(s, n):
    """Envelope 0..1 of the ghost verse's room change for `n` samples from `s`, per block."""
    e = []
    hi = 0.0
    for i in range(0, n, 64):
        u = ((s + i) / SR - GHOST_ON) / GHOST_RAMP
        u = 0.0 if u < 0 else 1.0 if u > 1 else u * u * (3 - 2 * u)
        e.append(u)
        hi = max(hi, u)
    if hi == 0.0:
        return None
    return [e[min(len(e) - 1, i // 64)] for i in range(n)]


def mod_delay(vx, off, n, s, base, depth, rate, ph):
    """vx: voice with `off` samples of history in front; returns n samples delayed by base seconds, moved by a slow LFO (fractional, linear interpolation)"""
    out = []
    ap = out.append
    b = base * SR
    dp = depth * SR
    w = 2 * math.pi * rate / SR
    sn = math.sin
    m = len(vx) - 2
    for i in range(n):
        q = off + i - (b + dp * sn(w * (s + i) + ph))
        j = int(q)
        if j < 0:
            ap(0.0)
            continue
        f = q - j
        ap(vx[j] * (1 - f) + vx[j + 1] * f if j < m else 0.0)
    return out


VOICE_LUFS = -18.0
TARGET = -16.0
WORKERS = 2
V_HP = (("hp", 78.0, 0.7), ("hp", 60.0, 0.6))
V_EQ = (("ls", 210.0, 0.7, 1.0), ("peak", 3300.0, 1.0, -1.0), ("hs", 9000.0, 0.7, -1.5))
V_ESS = (("hp", 4600.0, 0.75),)
PRES = (("hp", 300.0, 0.7), ("lp", 4000.0, 0.7))  # 300-4000 Hz: where words live
BAND_EQ = (("hs", 4500.0, 0.6, -1.5),)  # the band stands further away


# ------------------------------------------------------------------ meters
def _k_coefs():
    """ITU-R BS.1770 pre-filter and RLB filter, re-derived for this sample rate"""
    K = math.tan(math.pi * 1681.974450955533 / SR)
    Q = 0.7071752369554196
    Vh = 10 ** (3.999843853973347 / 20)
    Vb = Vh**0.4996667741545416
    a0 = 1 + K / Q + K * K
    s1 = (
        (Vh + Vb * K / Q + K * K) / a0,
        2 * (K * K - Vh) / a0,
        (Vh - Vb * K / Q + K * K) / a0,
        2 * (K * K - 1) / a0,
        (1 - K / Q + K * K) / a0,
    )
    K = math.tan(math.pi * 38.13547087602444 / SR)
    Q = 0.5003270373238773
    a0 = 1 + K / Q + K * K
    return s1, (1.0, -2.0, 1.0, 2 * (K * K - 1) / a0, (1 - K / Q + K * K) / a0)


KC = _k_coefs()
HOP = 4410


def kweight(x):
    """K-weighting filter (ITU-R BS.1770) applied to `x`."""
    return BQ(*KC)(x)


def k_energy(chans):
    """K-weighted energy per 100 ms, summed over channels (streaming)"""
    out = []
    for c in chans:
        f = BQ(*KC)
        e = []
        for i in range(0, len(c), HOP * 40):
            y = f(c[i : i + HOP * 40])
            e += [
                sum(v * v for v in y[j : j + HOP]) / HOP
                for j in range(0, len(y) - HOP + 1, HOP)
            ]
        out.append(e)
    return [sum(t) for t in zip(*out)]


def Lk(z):
    """Loudness in LUFS of mean-square energy `z`."""
    return -0.691 + 10 * math.log10(z + 1e-12)


def slide(sub, block):
    """Mean energies over sliding windows of `block` seconds, from 100 ms sub-blocks."""
    m = int(block * 10 + 0.5)
    return [sum(sub[i : i + m]) / m for i in range(max(1, len(sub) - m + 1))]


def integrate(sub):
    """Gated integrated loudness (ITU-R BS.1770) from 100 ms sub-block energies."""
    g = [z for z in slide(sub, 0.4) if Lk(z) > -70]
    if not g:
        return -99.0
    th = Lk(sum(g) / len(g)) - 10
    g = [z for z in g if Lk(z) > th]
    return Lk(sum(g) / len(g))


def loudness(chans):
    """(integrated loudness, sub-block energies) of a stereo signal."""
    s = k_energy(chans)
    return integrate(s), s


_OS = []


def true_peak(x):
    """4x oversampled peak, evaluated around every sample above 60 % of the sample peak"""
    if not _OS:
        for ph in range(1, 4):
            t = ph / 4
            c = []
            for k in range(-11, 13):
                u = t - k
                c.append(
                    (math.sin(math.pi * u) / (math.pi * u))
                    * (0.5 + 0.5 * math.cos(math.pi * u / 12.5))
                )
            _OS.append(c)
    pk = max(max(x), -min(x))
    th = 0.6 * pk
    best = pk
    n = len(x)
    for b in range(0, n, 1 << 18):
        for k, v in enumerate(x[b : b + (1 << 18)]):
            if v > th or v < -th:
                i = b + k
                if 12 <= i < n - 13:
                    seg = x[i - 11 : i + 13]
                    for c in _OS:
                        w = sum(map(lambda p, q: p * q, seg, c))
                        w = w if w > 0 else -w
                        best = max(best, w)
    return best


# ------------------------------------------------------------------ control-rate helpers
def env_blocks(x):
    """RMS envelope of `x` per block of B samples."""
    return [
        math.sqrt(sum(v * v for v in x[i : i + B]) / B)
        for i in range(0, len(x) - B + 1, B)
    ]


def one_pole(x, up_s, down_s):
    """A one-pole follower over `x` with separate rise and fall times in seconds."""
    au = 1 - math.exp(-1 / (up_s * BR))
    ad = 1 - math.exp(-1 / (down_s * BR))
    y = x[0]
    o = []
    for v in x:
        y += (au if v > y else ad) * (v - y)
        o.append(y)
    return o


def apply_gain(x, g, gp=None):
    """g: one value per block of B samples, linearly interpolated from the previous one"""
    o = []
    gp = g[0] if gp is None else gp
    for i, gn in enumerate(g):
        seg = x[i * B : (i + 1) * B]
        if not len(seg):
            break
        s = (gn - gp) / B
        k = gp
        o += [v * (k + s * j) for j, v in enumerate(seg)]
        gp = gn
    if len(o) < len(x):
        o += [v * gp for v in x[len(o) :]]
    return o


def resample(x, sr):
    """`x` resampled from `sr` to the mix rate by windowed-sinc interpolation."""
    if sr == SR:
        return x
    r = sr / SR
    n = int(len(x) / r)
    fc = min(1.0, 1 / r) * 0.96
    o = []
    for i in range(n):
        p = i * r
        k = int(p)
        f = p - k
        s = 0.0
        for j in range(-11, 13):
            if 0 <= k + j < len(x):
                u = f - j
                s += (
                    x[k + j]
                    * (fc if u == 0 else math.sin(math.pi * fc * u) / (math.pi * u))
                    * (0.5 + 0.5 * math.cos(math.pi * u / 13))
                )
        o.append(s)
    return o


def slab(path, s, n, pre):
    """interleaved 16-bit slice [s-pre, s+n) read straight from the file, zero padded -> array('h')"""
    with wave.open(path, "rb") as w:
        nc = w.getnchannels()
        tot = w.getnframes()
        i = s - pre
        head = max(0, -i)
        i = max(0, i)
        a = array.array("h", bytes(2 * nc * head))
        if i < tot:
            w.setpos(i)
            a.frombytes(w.readframes(min(tot - i, s + n - i)))
    a.extend(array.array("h", bytes(2 * (nc * (n + pre) - len(a)))))
    return a


def stem(k):
    """Path of the band stem `k` in build/."""
    return os.path.join(BUILD, f"stem_{k}.wav")


# ------------------------------------------------------------------ pass A: listen
def _listen(a):
    s, n, vp, gains = a
    v = [p / 32768.0 for p in slab(vp, s, n, PRE)]
    band = [0.0] * (n + PRE)
    for k, g in gains.items():
        pcm = slab(stem(k), s, n, PRE)
        g *= 0.7071 / 32768
        band = [b + g * (p + q) for b, p, q in zip(band, pcm[0::2], pcm[1::2])]
    h = BQ(*V_HP)(v)
    k = BQ(*KC)(h)
    x = BQ(*V_EQ)(h)
    hb = BQ(*V_ESS)(x)
    p = BQ(*PRES)(x)
    pb = BQ(*PRES)(band)
    return (
        s,
        [sum(q * q for q in k[j : j + B]) / B for j in range(PRE, len(k) - B + 1, B)],
        env_blocks(x[PRE:]),
        env_blocks(hb[PRE:]),
        env_blocks(p[PRE:]),
        env_blocks(pb[PRE:]),
    )


def plan(vp, pool, rep):
    """decide every gain of the song from what the voice and the band do"""
    jobs = [
        (s, min(SEG, N - s), vp, {k: STAGE[k][0] for k in ("harp", "strings")})
        for s in range(0, N, SEG)
    ]
    K, EX, EH, EP, EB = [], [], [], [], []
    for s, k, ex, eh, ep, eb in pool.imap(_listen, jobs):
        K += k
        EX += ex
        EH += eh
        EP += ep
        EB += eb
    r = round(HOP / B)
    sub = [sum(K[i : i + r]) / r for i in range(0, len(K) - r + 1, r)]
    lv = integrate(sub)
    g = 10 ** ((VOICE_LUFS - lv) / 20)
    rep["voice_in_lufs"] = round(lv, 2)
    # de-ess: 4.6 kHz and up is pulled back only while it is out of proportion with the rest of the voice
    eh = one_pole([v * g for v in EH], 0.002, 0.035)
    ef = one_pole([v * g for v in EX], 0.004, 0.09)
    gd = []
    for h, f in zip(eh, ef):
        over = 20 * math.log10((h + 1e-7) / (f + 2e-4)) + 13.0
        ab = 20 * math.log10(h + 1e-7) + 38.0
        gd.append(10 ** (-min(8.0, 0.62 * max(0.0, min(over, ab))) / 20))
    gd = one_pole(gd, 0.030, 0.0025)
    rep["deess_max_db"] = round(20 * math.log10(min(gd)), 1)
    # 2:1, wide knee, RMS detector, program-length release: keeps the performance, only leans on the top
    lev = [
        10 * math.log10(v + 1e-10)
        for v in one_pole([(v * g) ** 2 for v in EX], 0.012, 0.060)
    ]
    th, kn, ra = -21.0, 12.0, 2.0
    red = []
    for l in lev:
        d = l - th
        red.append(
            0.0
            if d <= -kn / 2
            else (1 - 1 / ra) * (d + kn / 2) ** 2 / (2 * kn)
            if d < kn / 2
            else (1 - 1 / ra) * d
        )
    red = [-v for v in one_pole(red, 0.018, 0.22)]
    la = int(0.006 * BR)
    red = red[la:] + [red[-1]] * la
    act_ = [r for r, l in zip(red, lev) if l > -45]
    rep["comp_max_db"] = round(min(red), 1)
    rep["comp_mean_active_db"] = round(sum(act_) / max(1, len(act_)), 1)
    gc = [g * 10 ** ((r + 1.6) / 20) for r in red]
    # ride + duck
    eb = one_pole(EB, 0.10, 0.35)
    ev = one_pole([p * c for p, c in zip(EP, gc)], 0.04, 0.22)
    act = one_pole(
        [1.0 if 20 * math.log10(v + 1e-8) > -46 else 0.0 for v in ev], 0.10, 0.55
    )
    need = []
    for v, b, a in zip(ev, eb, act):
        need.append(
            min(1.0, max(0.0, (9.0 - 20 * math.log10((v + 1e-6) / (b + 1e-6))) / 7.0))
            * a
        )
    need = one_pole(need, 0.30, 0.80)
    lag = int(0.22 * BR)
    need = need[lag:] + [need[-1]] * lag
    lag = int(0.10 * BR)
    act = act[lag:] + [act[-1]] * lag
    gv = [c * 10 ** (1.5 * n / 20) for c, n in zip(gc, need)]
    gb = [10 ** (-(1.4 * a + 2.0 * n) / 20) for a, n in zip(act, need)]
    rep["ride_voice_max_db"] = round(1.5 * max(need), 2)
    rep["duck_max_db"] = round(20 * math.log10(min(gb)), 2)
    return gv, gd, gb


# ------------------------------------------------------------------ pass B: place everything in the chapel
def _seg(a):
    s, n, vp, gv, gd, gb, stage = a
    L = [0.0] * (n + TAIL)
    R = [0.0] * (n + TAIL)
    lateL = [0.0] * n
    lateR = [0.0] * n
    any_ = False
    if vp:
        x = BQ(*V_HP, *V_EQ)([p / 32768.0 for p in slab(vp, s, n, PRE)])
        hb = BQ(*V_ESS)(x)
        xh, hbh = x[PRE - 512 : PRE], hb[PRE - 512 : PRE]
        x, hb = x[PRE:], hb[PRE:]
        hist = [
            (p - q * gd[0]) * gv[0] for p, q in zip(xh, hbh)
        ]  # the 512 samples before this segment, for the doubles
        hb = apply_gain(hb, [1 - v for v in gd[1:]], 1 - gd[0])
        v = apply_gain([p - q for p, q in zip(x, hb)], gv[1:], gv[0])
        _, es, ls, pos = stage["voice"]
        any_ = True
        ge = ghost_env(s, n)
        if ge is not None:
            vx = hist + list(v)
            for (b_, dp_, rt_, ph_), pl, pr in (
                (GHOST["d1"], 0.85, 0.35),
                (GHOST["d2"], 0.35, 0.85),
            ):
                dd = mod_delay(vx, 512, n, s, b_, dp_, rt_, ph_)
                dd = [q * e * GHOST["dub"] for q, e in zip(dd, ge)]
                mix_into(L, dd, 0, pl)
                mix_into(R, dd, 0, pr)
            gi = [q * e * GHOST["rev"] for q, e in zip(v, ge)]
            g1, g2 = room.fdn(
                gi,
                gi,
                t60=GHOST["t60"],
                t60hi=GHOST["t60hi"],
                fc=GHOST["fc"],
                predelay=GHOST["pre"],
                tail=TAIL / SR,
                seed=11,
                size=1.15,
            )
            mix_into(L, g1, 0, 0.7071)
            mix_into(R, g2, 0, 0.7071)
            v = [q * (1 - GHOST["dry"] * e) for q, e in zip(v, ge)]
        mix_into(L, v, 0, 0.7071)
        mix_into(R, v, 0, 0.7071)
        el, er = room.early(v + [0.0] * 4800, pos, order=2, pre=0.014)
        mix_into(L, el, 0, es * 0.7071)
        mix_into(R, er, 0, es * 0.7071)
        mix_into(lateL, v, 0, ls * 0.7071)
        mix_into(lateR, v, 0, ls * 0.7071)
    for k in STEMS:
        pcm = slab(stem(k), s, n, PRE)
        if max(pcm) == 0 and min(pcm) == 0:
            continue
        g, es, ls, pos = stage[k]
        g /= 32768.0
        w = WIDTH[k]
        l = [p * g for p in pcm[0::2]]
        r = [p * g for p in pcm[1::2]]
        l, r = (
            [0.5 * ((p + q) + w * (p - q)) for p, q in zip(l, r)],
            [0.5 * ((p + q) - w * (p - q)) for p, q in zip(l, r)],
        )
        l = BQ(*BAND_EQ)(l)[PRE:]
        r = BQ(*BAND_EQ)(r)[PRE:]
        any_ = True
        if gb is not None:
            l = apply_gain(l, gb[1:], gb[0])
            r = apply_gain(r, gb[1:], gb[0])
        dry = 0.30 if k == "other" else 1.0
        mix_into(L, l, 0, dry)
        mix_into(R, r, 0, dry)
        el, er = room.early(
            [0.5 * (p + q) for p, q in zip(l, r)] + [0.0] * 4800,
            pos,
            order=1 if k == "other" else 2,
        )
        mix_into(L, el, 0, es)
        mix_into(R, er, 0, es)
        mix_into(lateL, l, 0, ls)
        mix_into(lateR, r, 0, ls)
    if any_:
        fl, fr = room.fdn(
            lateL,
            lateR,
            t60=1.95,
            t60hi=0.80,
            fc=2600.0,
            predelay=0.025,
            tail=TAIL / SR,
        )
        mix_into(L, fl, 0)
        mix_into(R, fr, 0)
    return s, array.array("f", L), array.array("f", R)


def run(vpath, out, band_only=False):
    """Mix the voice at `vpath` with the band stems into `out`; returns the mix report."""
    rep = {}
    t0 = time.time()
    vp = None
    tmp = None
    if not band_only:
        with wave.open(vpath, "rb") as w:
            ok = (w.getnchannels(), w.getsampwidth(), w.getframerate()) == (1, 2, SR)
        vp = vpath
        if not ok:  # anything that is not 16-bit mono 44.1k is converted once
            sr, c = read_wav(vpath)
            v = resample(
                c[0] if len(c) == 1 else [0.5 * (p + q) for p, q in zip(*c[:2])], sr
            )
            del c
            tmp = vp = out + ".voice.wav"
            pk = max(max(v), -min(v), 1e-9)
            write_wav(tmp, [v], min(1.0, 0.98 / pk))
            del v
    L = array.array("f", bytes(4 * N))
    R = array.array("f", bytes(4 * N))
    with mp.Pool(WORKERS) as pool:
        gv = gd = gb = None
        if vp:
            gv, gd, gb = plan(vp, pool, rep)
        rep["t_plan"] = round(time.time() - t0, 1)
        jobs = []
        for s in range(0, N, SEG):
            n = min(SEG, N - s)
            b = s // B
            q = lambda x, b=b, n=n: (
                None
                if x is None
                else array.array(
                    "f",
                    [
                        x[min(len(x) - 1, max(0, j))]
                        for j in range(b - 1, b + n // B + 2)
                    ],
                )
            )
            jobs.append((s, n, vp, q(gv), q(gd), q(gb), STAGE))
        for s, l, r in pool.imap_unordered(_seg, jobs):
            for dst, x in ((L, l), (R, r)):
                n = min(len(x), N - s)
                dst[s : s + n] = array.array(
                    "f", [p + q for p, q in zip(dst[s : s + n], x[:n])]
                )
            print(
                f"segment {s / SR:.0f} s placed, {time.time() - t0:.0f} s elapsed",
                file=sys.stderr,
                flush=True,
            )
    if tmp:
        os.remove(tmp)
    rep["t_room"] = round(time.time() - t0, 1)
    if band_only:
        fade_out(L, R)
    else:
        master(L, R, rep)
    rep["clipped"] = write_wav(out, [L, R])
    rep["t_total"] = round(time.time() - t0, 1)
    return rep


# ------------------------------------------------------------------ master
def scale(x, k):
    """Multiply `x` by `k` in place."""
    for i in range(0, N, 1 << 18):
        x[i : i + (1 << 18)] = array.array("f", [v * k for v in x[i : i + (1 << 18)]])


def gain_all(x, g):
    """Apply the per-block gain curve `g` to `x` in place, interpolated within each block."""
    m = 4096
    gp = g[0]
    for b in range(0, len(g), m):
        seg = x[b * B : (b + m) * B]
        if not len(seg):
            break
        x[b * B : b * B + len(seg)] = array.array(
            "f", apply_gain(seg, g[b : b + m], gp)
        )
        gp = g[min(b + m, len(g)) - 1]


def fade_out(L, R):
    """Fade the end of the song out in place."""
    a, b = int(149.4 * SR), int(151.35 * SR)
    for x in (L, R):
        for i in range(a, b):
            u = (b - i) / (b - a)
            x[i] *= u * u * (3 - 2 * u)
        for i in range(b, len(x)):
            x[i] = 0.0


def master(L, R, rep, ceiling=-1.2):
    """Master the stereo mix in place: tone, fade, loudness to the target and a true-peak ceiling."""
    target = TARGET
    for x in (L, R):  # night-time top end
        f = BQ(("hs", 6500.0, 0.6, -1.5), ("hp", 28.0, 0.6))
        for i in range(0, N, 1 << 18):
            x[i : i + (1 << 18)] = array.array("f", f(x[i : i + (1 << 18)]))
    fade_out(L, R)
    sub = k_energy([L, R])
    d0 = target - integrate(sub)
    # macro level: the two climaxes stay climaxes, but they lean in instead of leaping out (gain follows 1.2 s loudness, very slowly)
    gs = []
    for z in slide(sub, 1.2):
        d = Lk(z) + d0 - (target - 0.5)
        gs.append(-0.48 * (d if d > 3 else (d + 3) ** 2 / 12 if d > -3 else 0.0))
    w = 9
    gs = [
        sum(gs[max(0, i - w) : i + w + 1]) / len(gs[max(0, i - w) : i + w + 1])
        for i in range(len(gs))
    ]
    gs = [gs[0]] * 6 + gs + [gs[-1]] * 12
    gg = []
    for i in range(NB):
        x = i / BR * 10
        k = min(len(gs) - 2, int(x))
        gg.append(10 ** ((gs[k] + (gs[k + 1] - gs[k]) * (x - k)) / 20))
    for x in (L, R):
        gain_all(x, gg)
    rep["macro_max_db"] = round(min(gs), 2)
    k = 10 ** ((target - integrate(k_energy([L, R]))) / 20)
    for x in (L, R):
        scale(x, k)
    tp = max(true_peak(L), true_peak(R))
    rep["peak_before_dbtp"] = round(db(tp), 2)
    lim = 10 ** (ceiling / 20)
    if tp > lim:  # look-ahead gain (no clipping): 8 ms ahead, 160 ms back
        pk = []
        for i in range(0, N, B):
            p, q = L[i : i + B], R[i : i + B]
            pk.append(max(max(p), -min(p), max(q), -min(q)) * 1.03)
        need = [min(1.0, lim / p) if p > 0 else 1.0 for p in pk]
        w = int(0.008 * BR) + 1
        m = [min(need[max(0, i - 1) : i + w + 1]) for i in range(len(need))]
        o = []
        y = 1.0
        ar = 1 - math.exp(-1 / (0.16 * BR))
        aa = 1 - math.exp(-1 / (0.0022 * BR))
        for v in m:
            y += (aa if v < y else ar) * (v - y)
            o.append(y)
        for x in (L, R):
            gain_all(x, o)
        rep["limiter_max_db"] = round(db(min(o)), 2)
        rep["limiter_active_s"] = round(sum(1 for v in o if v < 0.98) / BR, 2)
        tp = max(true_peak(L), true_peak(R))
        if tp > 10 ** (-1.02 / 20):
            k = 10 ** (-1.05 / 20) / tp
            for x in (L, R):
                scale(x, k)
            tp *= k
    rep["lufs"] = round(integrate(k_energy([L, R])), 2)
    rep["true_peak_dbtp"] = round(db(tp), 2)


def main() -> None:
    """Command line: concert-mix [voice.wav] [-o out.wav] [options]; writes the mix and build/report.json."""
    global TARGET
    av = sys.argv[1:]
    out = os.path.join(BUILD, "mix.wav")
    bo = "--band-only" in av
    trim = {}
    if bo:
        av.remove("--band-only")
    if "-o" in av:
        i = av.index("-o")
        out = av[i + 1]
        del av[i : i + 2]
    for o in ("--band", "--wet", "--lufs"):
        if o in av:
            i = av.index(o)
            trim[o] = float(av[i + 1])
            del av[i : i + 2]
    kb, kw = 10 ** (trim.get("--band", 0) / 20), 10 ** (trim.get("--wet", 0) / 20)
    for k, (g, e, l, p) in list(STAGE.items()):
        STAGE[k] = (g if k == "voice" else g * kb, e * kw, l * kw, p)
    TARGET = trim.get("--lufs", TARGET)
    rep = run(av[0] if av else os.path.join(BUILD, "voice.wav"), out, bo)
    print(json.dumps(rep))
    Path(os.path.join(BUILD, "report_band.json" if bo else "report.json")).write_text(
        json.dumps(rep, indent=1)
    )
