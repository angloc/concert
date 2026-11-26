"""dsp.py - small signal toolbox. Pure standard library, nothing sampled."""

import array
import cmath
import itertools
import math
import random
import struct
import sys
import wave
import zlib
from collections.abc import Callable, Iterable, MutableSequence, Sequence

SR = 44100
TAU = 2 * math.pi


# ------------------------------------------------------------------ wav
def read_wav(path: str) -> tuple[int, list[list[float]]]:
    """Read a 16-, 24- or 32-bit WAV file as (sample rate, list of channels of floats in -1..1)."""
    with wave.open(path, "rb") as w:
        nc = w.getnchannels()
        sw = w.getsampwidth()
        sr = w.getframerate()
        n = w.getnframes()
        raw = w.readframes(n)
    if sw == 2:
        a = array.array("h")
        a.frombytes(raw)
        if sys.byteorder == "big":
            a.byteswap()
        k = 1 / 32768.0
        vals = [v * k for v in a]
    elif sw == 3:
        k = 1 / 8388608.0
        vals = [0.0] * (len(raw) // 3)
        for i in range(len(vals)):
            vals[i] = int.from_bytes(raw[3 * i : 3 * i + 3], "little", signed=True) * k
    elif sw == 4:
        a = array.array("i")
        a.frombytes(raw)
        k = 1 / 2147483648.0
        vals = [v * k for v in a]
    else:
        raise ValueError(f"sample width {sw:d}")
    return sr, [vals[c::nc] for c in range(nc)]


def write_wav(
    path: str,
    chans: Sequence[Sequence[float]],
    gain: float = 1.0,
    dither: bool = True,
    seed: int = 1,
) -> int:
    """16-bit, TPDF dither (digital silence stays silent); works in blocks so long songs do not need gigabytes"""
    n = len(chans[0])
    nc = len(chans)
    r = random.Random(seed).random
    g = gain * 32767.0
    clipped = 0
    BL = 1 << 18
    with wave.open(path, "wb") as w:
        w.setnchannels(nc)
        w.setsampwidth(2)
        w.setframerate(SR)
        for i in range(0, n, BL):
            m = min(BL, n - i)
            out = array.array("h", bytes(2 * m * nc))
            for c, x in enumerate(chans):
                seg = x[i : i + m]
                y = (
                    [
                        math.floor(v * g + (r() - r()) * 0.5 + 0.5) if v else 0
                        for v in seg
                    ]
                    if dither
                    else [math.floor(v * g + 0.5) for v in seg]
                )
                if max(y) > 32767 or min(y) < -32768:
                    clipped += sum(1 for v in y if v > 32767 or v < -32768)
                    y = [min(32767, max(-32768, v)) for v in y]
                out[c::nc] = array.array("h", y)
            if sys.byteorder == "big":
                out.byteswap()
            w.writeframes(out.tobytes())
    return clipped


def read_pcm(path):
    """-> (sr, channels, array('h') interleaved), compact"""
    with wave.open(path, "rb") as w:
        nc, sw, sr, n = (
            w.getnchannels(),
            w.getsampwidth(),
            w.getframerate(),
            w.getnframes(),
        )
        if sw != 2:
            raise ValueError("expected 16-bit")
        a = array.array("h")
        a.frombytes(w.readframes(n))
    if sys.byteorder == "big":
        a.byteswap()
    return sr, nc, a


def save_f32(path, x):
    """Write samples to `path` as raw 32-bit floats."""
    with open(path, "wb") as f:
        array.array("f", x).tofile(f)


def load_f32(path):
    """Read raw 32-bit floats written by save_f32."""
    a = array.array("f")
    with open(path, "rb") as f:
        a.frombytes(f.read())
    return a


# ------------------------------------------------------------------ fft
_tw = {}


def fft(x):
    """iterative radix-2 on a list of numbers, length power of two -> list of complex"""
    n = len(x)
    if n == 1:
        return [complex(x[0])]
    key = n
    if key not in _tw:
        bits = n.bit_length() - 1
        rev = [0] * n
        for i in range(n):
            rev[i] = (rev[i >> 1] >> 1) | ((i & 1) << (bits - 1))
        st = []
        m = 2
        while m <= n:
            st.append([cmath.exp(-2j * math.pi * k / m) for k in range(m // 2)])
            m *= 2
        _tw[key] = (rev, st)
    rev, st = _tw[key]
    a = [x[i] for i in rev]
    m = 2
    for w in st:
        h = m // 2
        if h == 1:
            e = a[0::2]
            o = a[1::2]
            a[0::2] = [p + q for p, q in zip(e, o)]
            a[1::2] = [p - q for p, q in zip(e, o)]
        else:
            for s in range(0, n, m):
                e = a[s : s + h]
                o = [q * t for q, t in zip(a[s + h : s + m], w)]
                a[s : s + h] = [p + q for p, q in zip(e, o)]
                a[s + h : s + m] = [p - q for p, q in zip(e, o)]
        m *= 2
    return a


def ifft(X):
    """Inverse FFT of a power-of-two length list of complex numbers."""
    n = len(X)
    y = fft([z.conjugate() for z in X])
    k = 1.0 / n
    return [z.conjugate() * k for z in y]


_hann = {}


def hann(n):
    """Hann window of length `n`, cached."""
    if n not in _hann:
        _hann[n] = [0.5 - 0.5 * math.cos(TAU * i / n) for i in range(n)]
    return _hann[n]


def power_spectrum(x, at, n):
    """Power spectrum of `n` samples of `x` from `at`, Hann windowed and zero padded."""
    seg = x[max(0, at) : at + n]
    if len(seg) < n:
        seg = list(seg) + [0.0] * (n - len(seg))
    X = fft([a * b for a, b in zip(seg, hann(n))])
    return [z.real * z.real + z.imag * z.imag for z in X[: n // 2 + 1]]


# ------------------------------------------------------------------ filters (whole-signal)
def biquad_coefs(
    kind: str, f: float, q: float = 0.7071, gdb: float = 0.0, sr: int = SR
) -> tuple[float, ...]:
    """Normalised biquad coefficients (b0, b1, b2, a1, a2) for a filter `kind` at `f` Hz (RBJ cookbook)."""
    w = TAU * f / sr
    c = math.cos(w)
    s = math.sin(w)
    al = s / (2 * q)
    A = 10 ** (gdb / 40)
    if kind == "lp":
        b = ((1 - c) / 2, 1 - c, (1 - c) / 2)
        a = (1 + al, -2 * c, 1 - al)
    elif kind == "hp":
        b = ((1 + c) / 2, -(1 + c), (1 + c) / 2)
        a = (1 + al, -2 * c, 1 - al)
    elif kind == "bp":
        b = (al, 0.0, -al)
        a = (1 + al, -2 * c, 1 - al)
    elif kind == "peak":
        b = (1 + al * A, -2 * c, 1 - al * A)
        a = (1 + al / A, -2 * c, 1 - al / A)
    elif kind in ("ls", "hs"):
        sq = 2 * math.sqrt(A) * al
        if kind == "ls":
            b = (
                A * ((A + 1) - (A - 1) * c + sq),
                2 * A * ((A - 1) - (A + 1) * c),
                A * ((A + 1) - (A - 1) * c - sq),
            )
            a = (
                (A + 1) + (A - 1) * c + sq,
                -2 * ((A - 1) + (A + 1) * c),
                (A + 1) + (A - 1) * c - sq,
            )
        else:
            b = (
                A * ((A + 1) + (A - 1) * c + sq),
                -2 * A * ((A - 1) + (A + 1) * c),
                A * ((A + 1) + (A - 1) * c - sq),
            )
            a = (
                (A + 1) - (A - 1) * c + sq,
                2 * ((A - 1) - (A + 1) * c),
                (A + 1) - (A - 1) * c - sq,
            )
    else:
        raise ValueError(kind)
    return tuple(v / a[0] for v in b) + (a[1] / a[0], a[2] / a[0])


def biquad(x: Iterable[float], coefs: Sequence[float]) -> list[float]:
    """Run `x` through one biquad section (transposed direct form II)."""
    b0, b1, b2, a1, a2 = coefs
    z1 = z2 = 0.0
    out = []
    ap = out.append
    for v in x:
        y = b0 * v + z1
        z1 = b1 * v - a1 * y + z2
        z2 = b2 * v - a2 * y
        ap(y)
    return out


class BQ:
    """biquad with memory, for block-by-block work"""

    def __init__(self, *specs):
        self.c = [biquad_coefs(*q) if isinstance(q[0], str) else q for q in specs]
        self.z = [[0.0, 0.0] for _ in self.c]

    def __call__(self, x):
        for (b0, b1, b2, a1, a2), z in zip(self.c, self.z):
            z1, z2 = z
            out = []
            ap = out.append
            for v in x:
                y = b0 * v + z1
                z1 = b1 * v - a1 * y + z2
                z2 = b2 * v - a2 * y
                ap(y)
            z[0], z[1] = z1, z2
            x = out
        return x


def eq(x: Sequence[float], *specs: tuple) -> Sequence[float]:
    """Run `x` through biquad sections in series; each spec is the argument tuple of biquad_coefs."""
    for s in specs:
        x = biquad(x, biquad_coefs(*s))
    return x


def mag_db(coefs, f, sr=SR):
    """Magnitude response in dB of one biquad at `f` Hz."""
    z = cmath.exp(-1j * TAU * f / sr)
    b0, b1, b2, a1, a2 = coefs
    return 20 * math.log10(
        max(1e-12, abs((b0 + b1 * z + b2 * z * z) / (1 + a1 * z + a2 * z * z)))
    )


def make_bank(
    modes: Sequence[tuple[float, float, float, float]], sr: int = SR
) -> Callable:
    """modes: [(f, q, gL, gR)] -> function(x)->(L,R). Parallel two-pole resonators, zeros at DC/Nyquist (band-pass), unrolled."""
    src = ["def run(x):", " L=[];R=[];la=L.append;ra=R.append;x1=x2=0.0"]
    for k in range(len(modes)):
        src.append(f" a{k:d}=b{k:d}=0.0")
    src.append(" for s in x:")
    src.append("  d=s-x2;x2=x1;x1=s")
    tl = []
    tr = []
    for k, (f, q, gl, gr) in enumerate(modes):
        w = TAU * f / sr
        al = math.sin(w) / (2 * q)
        a0 = 1 + al
        src.append(
            f"  c={al / a0:.9g}*d+{2 * math.cos(w) / a0:.12g}*a{k:d}-{(1 - al) / a0:.12g}*b{k:d};b{k:d}=a{k:d};a{k:d}=c"
        )
        if gl:
            tl.append(f"{gl:.6g}*a{k:d}")
        if gr:
            tr.append(f"{gr:.6g}*a{k:d}")
    src.append(
        "  la({});ra({})".format(
            "+".join(tl).replace("+-", "-") or "0.0",
            "+".join(tr).replace("+-", "-") or "0.0",
        )
    )
    src.append(" return L,R")
    d = {}
    exec("\n".join(src), d)  # noqa: S102 - the filter bank is generated as straight-line code for speed
    return d["run"]


def bank_response(modes, f, ch=0, sr=SR):
    """Complex response of a resonator bank at `f` Hz on channel `ch`."""
    z = cmath.exp(-1j * TAU * f / sr)
    h = 0
    for fm, q, gl, gr in modes:
        w = TAU * fm / sr
        al = math.sin(w) / (2 * q)
        g = gl if ch == 0 else gr
        h += g * al * (1 - z * z) / ((1 + al) - 2 * math.cos(w) * z + (1 - al) * z * z)
    return h


# ------------------------------------------------------------------ misc
def smooth(x: float) -> float:
    """Smoothstep of `x`, clamped to 0..1."""
    x = 0.0 if x < 0 else 1.0 if x > 1 else x
    return x * x * (3 - 2 * x)


def mtof(m: float) -> float:
    """Frequency in Hz of MIDI note `m` (A4 = 440 Hz)."""
    return 440.0 * 2 ** ((m - 69) / 12)


def db(x: float) -> float:
    """Level in dB of linear amplitude `x`, floored at -180 dB."""
    return 20 * math.log10(max(1e-9, x))


def rms(x):
    """Root mean square of `x`."""
    return math.sqrt(sum(v * v for v in x) / max(1, len(x)))


def interp(tab: Sequence[tuple[float, float]], x: float) -> float:
    """piecewise linear table [(x,y)...]"""
    if x <= tab[0][0]:
        return tab[0][1]
    for (a, ya), (b, yb) in itertools.pairwise(tab):
        if x <= b:
            return ya + (yb - ya) * (x - a) / (b - a)
    return tab[-1][1]


def mix_into(
    dst: MutableSequence[float], src: Sequence[float], at: int, g: float = 1.0
) -> None:
    """Add `src`, scaled by `g`, into `dst` from sample `at`, clipping at both ends."""
    if at < 0:
        src = src[-at:]
        at = 0
    n = min(len(src), len(dst) - at)
    if n <= 0:
        return
    if g == 1.0:
        dst[at : at + n] = [a + b for a, b in zip(dst[at : at + n], src)]
    else:
        dst[at : at + n] = [a + g * b for a, b in zip(dst[at : at + n], src)]


# ------------------------------------------------------------------ pitch (for QA and calibration)
def f0_estimate(x, guess, sr=SR, span=0.06):
    """fundamental near guess by phase-vocoder refinement of the first strong harmonics (least squares, amplitude weighted)"""
    n = 1
    while n < sr / guess * 14:
        n *= 2
    n = min(n, 1 << 15)
    hop = n // 8
    if len(x) < n + hop:
        n //= 2
        hop = n // 8
    mid = max(0, (len(x) - n - hop) // 2)
    w = hann(n)
    A = fft([a * b for a, b in zip(x[mid : mid + n], w)])
    B = fft([a * b for a, b in zip(x[mid + hop : mid + hop + n], w)])
    num = den = 0.0
    for h in range(1, 9):
        f = guess * h
        if f > sr * 0.3:
            break
        lo = max(1, int(f * (1 - span) * n / sr))
        hi = min(n // 2 - 1, int(f * (1 + span) * n / sr) + 1)
        k = max(range(lo, hi + 1), key=lambda i: abs(A[i]))
        dphi = cmath.phase(B[k] * A[k].conjugate()) if abs(A[k]) else 0
        exp = TAU * k * hop / n
        d = dphi - exp
        d -= TAU * round(d / TAU)
        fk = (k + d * n / (TAU * hop)) * sr / n
        wt = abs(A[k]) ** 2 / (1 + 0.4 * (h - 1))
        num += wt * fk / h
        den += wt
    return num / den if den else guess


def cents(f, g):
    """Interval from `g` to `f` in cents."""
    return 1200 * math.log2(f / g)


# ------------------------------------------------------------------ pictures
FONT = {}


def png(path, w, h, rgb):
    """Write an 8-bit RGB image to `path` as PNG."""
    raw = b"".join(b"\0" + bytes(rgb[y * w * 3 : (y + 1) * w * 3]) for y in range(h))

    def ch(t, d):
        return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d))

    with open(path, "wb") as f:
        f.write(
            b"\x89PNG\r\n\x1a\n"
            + ch(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
            + ch(b"IDAT", zlib.compress(raw, 6))
            + ch(b"IEND", b"")
        )


def _ramp(v):
    v = 0 if v < 0 else min(v, 1)
    st = [
        (0, (8, 10, 20)),
        (0.25, (40, 25, 90)),
        (0.5, (140, 40, 110)),
        (0.75, (235, 110, 60)),
        (1, (255, 245, 190)),
    ]
    for (a, ca), (b, cb) in itertools.pairwise(st):
        if v <= b:
            u = (v - a) / (b - a)
            return tuple(int(p + (q - p) * u) for p, q in zip(ca, cb))
    return st[-1][1]


def spectrogram(
    x,
    path,
    t0=0.0,
    t1=None,
    w=1200,
    h=420,
    fmin=40,
    fmax=10000,
    n=4096,
    floor=-95,
    log=True,
    marks=(),
):
    """Write a spectrogram of `x` to `path` as PNG, for listening reviews."""
    t1 = t1 or len(x) / SR
    lut = [_ramp(i / 255) for i in range(256)]
    img = bytearray(w * h * 3)
    win = sum(hann(n)) / 2
    rows = []
    for y in range(h):
        u = 1 - y / (h - 1)
        f = fmin * (fmax / fmin) ** u if log else fmin + (fmax - fmin) * u
        rows.append(f * n / SR)
    for px in range(w):
        at = int((t0 + (t1 - t0) * px / w) * SR) - n // 2
        P = power_spectrum(x, max(0, at), n)
        for y, r in enumerate(rows):
            k = int(r)
            fr = r - k
            p = P[k] * (1 - fr) + P[min(k + 1, n // 2)] * fr if k >= 1 else P[k]
            if y + 1 < h:
                k2 = int(rows[y - 1]) if y else k
                if k2 > k + 1:
                    p = max(P[k : k2 + 1])
            d = 10 * math.log10(p / (win * win) + 1e-13)
            v = int(255 * (d - floor) / (-floor - 10))
            v = 0 if v < 0 else min(v, 255)
            o = (y * w + px) * 3
            img[o : o + 3] = bytes(lut[v])
    for m in marks:
        px = int((m - t0) / (t1 - t0) * w)
        if 0 <= px < w:
            for y in range(10):
                img[(y * w + px) * 3 : (y * w + px) * 3 + 3] = b"\x40\xff\x80"
    for f in (100, 200, 500, 1000, 2000, 5000, 10000):
        if fmin < f < fmax:
            u = (
                math.log(f / fmin) / math.log(fmax / fmin)
                if log
                else (f - fmin) / (fmax - fmin)
            )
            y = int((1 - u) * (h - 1))
            for px in range(0, w, 8):
                img[(y * w + px) * 3 : (y * w + px) * 3 + 3] = b"\x60\x90\xa0"
    png(path, w, h, img)
