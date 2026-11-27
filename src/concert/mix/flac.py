"""flac.py - FLAC encoder in pure Python.
`nice -n 10 concert-flac in.wav out.flac [--lossless | --requant] [--max-bytes 9000000] [--quiet-db 52] [--floor-db -82]`
Default: bit-exact lossless if it fits in --max-bytes, otherwise the mildest requantisation that fits.
Optional requantiser: per 4096-frame it drops 0..4 low bits (FLAC "wasted bits"), chosen so that the shaped error stays `quiet-db` below the
quietest 12 ms of the frame and below the `floor-db` ceiling; error feedback moves the error out of the ear's sensitive band.
Output is a fully standard lossless stream of the requantised samples."""

import array
import hashlib
import itertools
import math
import multiprocessing as mp
import os
import struct
import sys
import time
import wave
from operator import mul

BS = 4096


# ---------------------------------------------------------------- crc
def _tab(poly, bits):
    t = []
    top = 1 << (bits - 1)
    mask = (1 << bits) - 1
    for i in range(256):
        c = i << (bits - 8)
        for _ in range(8):
            c = ((c << 1) ^ poly) & mask if c & top else (c << 1) & mask
        t.append(c)
    return t


C8 = _tab(0x07, 8)
C16 = _tab(0x8005, 16)


def crc8(b):
    """FLAC frame-header CRC-8 of bytes `b`."""
    c = 0
    for x in b:
        c = C8[c ^ x]
    return c


def crc16(b):
    """FLAC frame CRC-16 of bytes `b`."""
    c = 0
    for x in b:
        c = ((c << 8) & 0xFFFF) ^ C16[(c >> 8) ^ x]
    return c


# ---------------------------------------------------------------- rice tables (bit strings)
_RT = {}


def rtab(k):
    """Rice codes with parameter `k` for small values, as bit strings, cached."""
    if k not in _RT:
        m = (1 << k) - 1
        fmt = f"0{k:d}b"
        _RT[k] = [
            "0" * (u >> k) + "1" + (format(u & m, fmt) if k else "")
            for u in range(min(1 << 13, 48 << k))
        ]
    return _RT[k]


def rice(us, k):
    """Rice code with parameter `k` of the unsigned values `us`, as a bit string."""
    t = rtab(k)
    n = len(t)
    try:
        return "".join(map(t.__getitem__, us))
    except IndexError:
        m = (1 << k) - 1
        fmt = f"0{k:d}b"
        return "".join(
            t[u] if u < n else "0" * (u >> k) + "1" + (format(u & m, fmt) if k else "")
            for u in us
        )


def sbits(v, n):
    """`v` as an `n`-bit two's-complement bit string."""
    return format(v & ((1 << n) - 1), f"0{n:d}b")


def best_k(s, n):
    """(bits, k): the cheapest Rice parameter for `n` values summing to `s`."""
    if n == 0:
        return 0, 0
    k = 0
    mean = s / n
    if mean > 1:
        k = max(0, int(math.log2(mean)) - 1)
    best = None
    for q in range(max(0, k - 1), min(14, k + 3) + 1):
        c = n * (q + 1) + int(max(0.0, (s - n * ((1 << q) - 1) * 0.5)) / (1 << q))
        if best is None or c < best[1]:
            best = (q, c)
    return best


def residual_bits(res, order, n):
    """-> bit string of the residual section with the best partitioning"""
    us = [2 * r if r >= 0 else -2 * r - 1 for r in res]
    pmax = 0
    while (
        pmax < 6
        and (n >> (pmax + 1)) << (pmax + 1) == n
        and (n >> (pmax + 1)) > order + 8
    ):
        pmax += 1
    size = n >> pmax
    sums = []
    cnt = []
    pos = 0
    for p in range(1 << pmax):
        c = size - (order if p == 0 else 0)
        sums.append(sum(us[pos : pos + c]))
        cnt.append(c)
        pos += c
    best = None
    S, C = sums, cnt
    for po in range(pmax, -1, -1):
        ks = [best_k(s, c) for s, c in zip(S, C)]
        cost = sum(k[1] for k in ks) + 4 * len(ks)
        if best is None or cost < best[0]:
            best = (cost, po, [k[0] for k in ks], C)
        S = [a + b for a, b in zip(S[0::2], S[1::2])]
        C = [a + b for a, b in zip(C[0::2], C[1::2])]
    cost, po, ks, C = best
    five = max(ks) > 14
    w = 5 if five else 4
    out = ["01" if five else "00", sbits(po, 4)]
    pos = 0
    for k, c in zip(ks, C):
        out.append(sbits(k, w))
        out.append(rice(us[pos : pos + c], k))
        pos += c
    return "".join(out)


# ---------------------------------------------------------------- prediction
_WIN = {}


def window(n):
    """Tukey window of length `n` for LPC analysis, cached."""
    if n not in _WIN:
        t = max(1, n // 4)
        w = [1.0] * n
        for i in range(t):
            w[i] = w[n - 1 - i] = 0.5 - 0.5 * math.cos(math.pi * (i + 0.5) / t)
        _WIN[n] = w
    return _WIN[n]


def lpc(x, maxord):
    """Levinson-Durbin -> {order: (coefs, err)}"""
    n = len(x)
    w = list(map(mul, x, window(n)))
    r = [
        sum(map(mul, w, w[l:])) if l else sum(map(mul, w, w)) for l in range(maxord + 1)
    ]
    if r[0] <= 0:
        return {}
    r[0] *= 1 + 1e-9
    a = []
    e = r[0]
    out = {}
    for i in range(maxord):
        k = (r[i + 1] - sum(a[j] * r[i - j] for j in range(i))) / e
        a = [a[j] - k * a[i - 1 - j] for j in range(i)] + [k]
        e *= 1 - k * k
        if e <= 0:
            break
        out[i + 1] = (a[:], e)
    return out


def quant(co, prec=14):
    """LPC coefficients `co` quantised to `prec` bits: (integers, shift), or None when all are zero."""
    m = max(abs(c) for c in co)
    if m <= 0:
        return None
    sh = prec - 1 - (math.floor(math.log2(m)) + 1)
    sh = min(15, max(0, sh))
    lim = (1 << (prec - 1)) - 1
    q = []
    err = 0.0
    for c in co:
        v = c * (1 << sh) + err
        i = math.floor(v + 0.5)
        i = max(-lim - 1, min(lim, i))
        err = v - i
        q.append(i)
    return q, sh


_PF = {}


def predictor(order):
    """A compiled residual function for a fixed-order LPC predictor."""
    if order not in _PF:
        src = "def f(x,c,sh):\n ({},)=c\n return [x0-(({})>>sh) for {} in zip(x[{:d}:],{})]".format(
            ",".join(f"c{i:d}" for i in range(1, order + 1)),
            "+".join(f"c{i:d}*x{i:d}" for i in range(1, order + 1)),
            ",".join(f"x{i:d}" for i in range(order + 1)),
            order,
            ",".join(f"x[{order - i:d}:]" for i in range(1, order + 1)),
        )
        d = {}
        exec(src, d)  # noqa: S102 - the fixed predictor is generated as straight-line code for speed
        _PF[order] = d["f"]
    return _PF[order]


def analyse(x, bps, maxord):
    """choose a model: -> (estimated bits, plan)"""
    n = len(x)
    lo, hi = min(x), max(x)
    if lo == hi:
        return bps + 8, ("const", x[0])
    best = (n * bps + 8, ("verb",))
    d = x
    for o in range(5):  # fixed predictors
        s = sum(map(abs, d))
        c = (
            n * (1.0 + max(0.0, math.log2(max(0.5, 2 * s / max(1, len(d))))) + 0.55)
            + o * bps
        )
        if c < best[0]:
            best = (c, ("fixed", o))
        d = [b - a for a, b in itertools.pairwise(d)]
        if not d:
            break
    if n > 64:
        L = lpc(x, maxord)
        for o, (co, e) in L.items():
            sd = math.sqrt(max(e, 1e-9) / (n * 0.78))
            h = max(1.0, math.log2(max(sd, 0.25)) + 2.05)
            c = n * h + o * (14 + bps) + 9
            if c < best[0] - 1:
                q = quant(co)
                if q:
                    best = (c, ("lpc", o, q[0], q[1]))
    return best


def encode_sub(x, bps, plan, wasted):
    """One subframe of `x` encoded as a bit string, following `plan`."""
    n = len(x)
    bps -= wasted
    wb = "0" if not wasted else "1" + "0" * (wasted - 1) + "1"
    if wasted:
        x = [v >> wasted for v in x]
    k = plan[0]
    if k == "const":
        return "0000000" + wb + sbits(x[0], bps)
    if k == "verb":
        return "0000001" + wb + "".join(sbits(v, bps) for v in x)
    if k == "fixed":
        o = plan[1]
        d = x
        for _ in range(o):
            d = [b - a for a, b in itertools.pairwise(d)]
        return (
            "0"
            + format(8 + o, "06b")
            + wb
            + "".join(sbits(v, bps) for v in x[:o])
            + residual_bits(d, o, n)
        )
    _, o, q, sh = plan
    r = predictor(o)(x, q, sh)
    return (
        "0"
        + format(31 + o, "06b")
        + wb
        + "".join(sbits(v, bps) for v in x[:o])
        + sbits(14 - 1, 4)
        + sbits(sh, 5)
        + "".join(sbits(c, 14) for c in q)
        + residual_bits(r, o, n)
    )


def waste(x):
    """Number of trailing zero bits shared by every sample of `x`."""
    m = 0
    for v in x:
        m |= v
    if m == 0:
        return 0
    w = 0
    while not (m >> w) & 1:
        w += 1
    return w


def utf8num(v):
    """`v` in FLAC's UTF-8-like frame-number coding."""
    if v < 0x80:
        return bytes([v])
    if v < 0x800:
        return bytes([0xC0 | v >> 6, 0x80 | v & 63])
    if v < 0x10000:
        return bytes([0xE0 | v >> 12, 0x80 | v >> 6 & 63, 0x80 | v & 63])
    return bytes(
        [0xF0 | v >> 18, 0x80 | v >> 12 & 63, 0x80 | v >> 6 & 63, 0x80 | v & 63]
    )


def frame(a):
    """Encode one stereo frame, choosing the cheapest channel decorrelation; returns the bytes and the choice."""
    fn, L, R, maxord = a
    L = list(L)
    R = list(R)
    n = len(L)
    M = [(p + q) >> 1 for p, q in zip(L, R)]
    S = [p - q for p, q in zip(L, R)]
    cand = {}
    for nm, x, b in (("L", L, 16), ("R", R, 16), ("M", M, 16), ("S", S, 17)):
        w = waste(x)
        y = [v >> w for v in x] if w else x
        cand[nm] = analyse(y, b - w, maxord) + (w,)
    modes = {1: ("L", "R"), 8: ("L", "S"), 9: ("S", "R"), 10: ("M", "S")}
    ca = min(modes, key=lambda m: cand[modes[m][0]][0] + cand[modes[m][1]][0])
    bits = "".join(
        encode_sub(
            {"L": L, "R": R, "M": M, "S": S}[c],
            17 if c == "S" else 16,
            cand[c][1],
            cand[c][2],
        )
        for c in modes[ca]
    )
    bits += "0" * (-len(bits) % 8)
    bc = 12 if n == 4096 else 7
    h = bytes([0xFF, 0xF8, bc << 4 | 9, ca << 4 | 4 << 1]) + utf8num(fn)
    if bc == 7:
        h += struct.pack(">H", n - 1)
    h += bytes([crc8(h)])
    body = h + int(bits, 2).to_bytes(len(bits) // 8, "big")
    return (
        body + struct.pack(">H", crc16(body)),
        ca,
        [cand[c][2] for c in modes[ca]],
        [cand[c][1][0] for c in modes[ca]],
    )


# ---------------------------------------------------------------- requantiser
def plan_bits(L, R, quiet_db, floor_db):
    """wasted bits per frame"""
    out = []
    sub = 512
    for i in range(0, len(L), BS):
        q = 1e9
        for j in range(i, min(i + BS, len(L)), sub):
            a, b = L[j : j + sub], R[j : j + sub]
            e = (sum(map(mul, a, a)) + sum(map(mul, b, b))) / (2 * len(a))
            q = min(q, e)
        rms = math.sqrt(q) / 32768
        target = min(10 ** (floor_db / 20), rms * 10 ** (-quiet_db / 20))
        w = (
            math.floor(
                math.log2(max(1e-9, target * 32768 * math.sqrt(12 / NOISE_GAIN)))
            )
            if target > 0
            else 0
        )
        out.append(max(0, min(4, w)))
    # never jump by more than one step, and let the quieter neighbour win
    for i in range(1, len(out)):
        out[i] = min(out[i], out[i - 1] + 1)
    for i in range(len(out) - 2, -1, -1):
        out[i] = min(out[i], out[i + 1] + 1)
    return out


SHAPE = (
    1.15,
    -0.42,
)  # error feedback: N(z) = 1 - 1.15 z^-1 + .42 z^-2 : less error at 1-6 kHz, more above 12 kHz
NOISE_GAIN = 1 + SHAPE[0] ** 2 + SHAPE[1] ** 2


def requant(x, plan):
    """Requantise quiet blocks of `x` to fewer bits with noise shaping, as `plan` says per block."""
    out = array.array("h")
    e1 = e2 = 0.0
    c1, c2 = SHAPE
    ap = out.append
    for f, w in enumerate(plan):
        seg = x[f * BS : (f + 1) * BS]
        if w == 0:
            out.extend(seg)
            e1 *= 0.5
            e2 *= 0.5
            continue
        st = 1 << w
        half = st >> 1
        lim = 32767 - 32767 % st
        for v in seg:
            t = v - c1 * e1 - c2 * e2
            q = math.floor((t + half) / st) * st
            if q > lim:
                q = lim
            elif q < -32768:
                q = -32768
            e2 = e1
            e1 = q - t
            if e1 > st:
                e1 = st
            elif e1 < -st:
                e1 = -st
            ap(q)
    return out


# ---------------------------------------------------------------- file
def encode(
    inp,
    outp,
    lossy="auto",
    max_bytes=9_000_000,
    quiet_db=52.0,
    floor_db=-82.0,
    maxord=8,
    title="Danny Boy",
):
    """Encode a 16-bit stereo 44.1 kHz WAV `inp` to FLAC `outp`, requantising gently only if needed to fit `max_bytes`."""
    t0 = time.time()
    with wave.open(inp, "rb") as w:
        assert (
            w.getnchannels() == 2
            and w.getsampwidth() == 2
            and w.getframerate() == 44100
        ), "need 16-bit stereo 44.1k"
        n = w.getnframes()
        raw = array.array("h")
        raw.frombytes(w.readframes(n))
    if sys.byteorder == "big":
        raw.byteswap()
    L0 = raw[0::2]
    R0 = raw[1::2]
    del raw
    with mp.Pool(2) as pool:
        tries = (
            [] if lossy is True else [None]
        )  # auto: true lossless first; only if it will not fit, the mildest requantisation that does
        if lossy:
            tries += (
                [(floor_db + 2 * k, quiet_db - 2 * k) for k in range(-4, 8)]
                if lossy == "auto"
                else [(floor_db + 2 * k, quiet_db - 2 * k) for k in range(8)]
            )
        for tr in tries:
            if tr:
                floor_db, quiet_db = tr
                pl = plan_bits(L0, R0, quiet_db, floor_db)
                L, R = pool.starmap(requant, [(L0, pl), (R0, pl)])
            else:
                pl = [0] * ((n + BS - 1) // BS)
                L, R = L0, R0
            fr = list(
                pool.imap(
                    frame,
                    (
                        (i, L[i * BS : (i + 1) * BS], R[i * BS : (i + 1) * BS], maxord)
                        for i in range((n + BS - 1) // BS)
                    ),
                    8,
                )
            )
            size = sum(len(f[0]) for f in fr)
            if size <= max_bytes - 2000:
                break
    pcm = array.array("h", bytes(4 * n))
    pcm[0::2] = L
    pcm[1::2] = R
    if sys.byteorder == "big":
        pcm.byteswap()
    md5 = hashlib.md5(pcm.tobytes()).digest()
    lens = [len(f[0]) for f in fr]
    si = (
        struct.pack(">HH", BS, BS)
        + min(lens).to_bytes(3, "big")
        + max(lens).to_bytes(3, "big")
        + ((44100 << 44) | (1 << 41) | (15 << 36) | n).to_bytes(8, "big")
        + md5
    )
    ven = b"bide pure-python flac"
    com = [("TITLE=" + title).encode()]
    vc = (
        struct.pack("<I", len(ven))
        + ven
        + struct.pack("<I", len(com))
        + b"".join(struct.pack("<I", len(c)) + c for c in com)
    )
    # seek table, one point about every 5 s
    pts = []
    off = 0
    for i, l in enumerate(lens):
        if i % 54 == 0:
            pts.append(struct.pack(">QQH", i * BS, off, min(BS, n - i * BS)))
        off += l
    st = b"".join(pts)
    blk = lambda t, d, last=0: bytes([last << 7 | t]) + len(d).to_bytes(3, "big") + d
    with open(outp, "wb") as f:
        f.write(b"fLaC" + blk(0, si) + blk(3, st) + blk(4, vc, 1))
        f.writelines(x[0] for x in fr)
    size = os.path.getsize(outp)
    cnt = {}
    md = {}
    for x in fr:
        md[x[1]] = md.get(x[1], 0) + 1
        for k in x[3]:
            cnt[k] = cnt.get(k, 0) + 1
    err = None
    if tr:
        e = sum((a - b) ** 2 for a, b in zip(L, L0))
        err = round(10 * math.log10(e / n / 32768**2 + 1e-15), 1)
    return (
        {
            "bytes": size,
            "kbps": round(size * 8 / (n / 44100) / 1000),
            "bits_per_sample": round(size * 8 / (2 * n), 2),
            "seconds": round(time.time() - t0, 1),
            "models": cnt,
            "stereo": md,
            "wasted": {k: pl.count(k) for k in sorted(set(pl))},
            "quiet_db": quiet_db,
            "floor_db": floor_db,
            "noise_dbfs": err,
            "md5": md5.hex(),
        },
        L,
        R,
    )


def main() -> None:
    """Command line: concert-flac in.wav out.flac [options]; prints the encoding report."""
    av = sys.argv[1:]
    kw = {}
    if "--lossless" in av:
        av.remove("--lossless")
        kw["lossy"] = False
    if "--requant" in av:
        av.remove("--requant")
        kw["lossy"] = True
    for o, k, f in (
        ("--max-bytes", "max_bytes", int),
        ("--quiet-db", "quiet_db", float),
        ("--floor-db", "floor_db", float),
        ("--order", "maxord", int),
    ):
        if o in av:
            i = av.index(o)
            kw[k] = f(av[i + 1])
            del av[i : i + 2]
    print(encode(av[0], av[1], **kw)[0])
