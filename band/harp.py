"""harp.py - small Irish lever harp.
Each note: plucked waveguide string (two polarisations), loop = delay + one-pole loss + two dispersion allpasses + tuning allpass,
loaded with the bridge-force wave of a string pulled aside at the pluck point and let go by a fingertip.
The force drives a soundboard (modal bank); a set of undamped strings rings in sympathy."""
import cmath, math, random
from dsp import *

T60 = [(36, 8.2), (39, 7.8), (51, 6.0), (58, 5.0), (63, 4.2), (70, 3.2), (75, 2.5), (82, 1.75), (87, 1.35), (94, .95)]
T60HI = [(36, .50), (51, .52), (63, .50), (75, .42), (87, .34), (94, .28)]   # T60 at 3 kHz
STIFF = [(36, -.26), (45, -.21), (55, -.15), (67, -.08), (79, -.04), (94, -.02)]

def _pd(num, den, w):
    z = cmath.exp(-1j * w); H = sum(c * z**k for k, c in enumerate(num)) / sum(c * z**k for k, c in enumerate(den))
    return -cmath.phase(H) / w
def design(f0, t0, thi, st, fhi=3000.0):
    fhi = max(fhi, 3.2 * f0); w0 = TAU * f0 / SR; wh = TAU * fhi / SR
    g0 = 10 ** (-3 / (f0 * t0)); gh = 10 ** (-3 / (f0 * thi))
    lo, hi = 0.0, .97                                    # one-pole p so that |H(fhi)|/|H(f0)| = gh/g0
    mag = lambda p, w: (1 - p) / math.sqrt(1 - 2*p*math.cos(w) + p*p)
    for _ in range(50):
        p = (lo + hi) / 2
        if mag(p, wh) / mag(p, w0) > gh / g0: lo = p
        else: hi = p
    p = (lo + hi) / 2; b = (1 - p) * g0 / mag(p, w0)
    pdl = math.atan2(p * math.sin(w0), 1 - p * math.cos(w0)) / w0
    pdd = 2 * _pd((st, 1.0), (1.0, st), w0)
    rest = SR / f0 - pdl - pdd
    n = int(rest - .5); fr = rest - n
    a = (1 - fr) / (1 + fr)
    for _ in range(12):                                  # exact phase delay at f0
        e = _pd((a, 1.0), (1.0, a), w0) - fr; a += e * .35
    return n, b, p, st, a

def run_string(n, b, p, st, a, init, N, dead_at, dead_g):
    """init: list of n samples (one period). returns N samples of bridge force"""
    buf = init[:]; out = []; ap = out.append; i = 0
    lp = d1x = d1y = d2x = d2y = tx = ty = 0.0; g = 1.0
    cut = min(N, dead_at)
    for k in range(2):
        for _ in range(cut if k == 0 else N - cut):
            x = buf[i]; ap(x)
            lp = b * x + p * lp
            y = st * lp + d1x - st * d1y; d1x = lp; d1y = y
            z = st * y + d2x - st * d2y; d2x = y; d2y = z
            v = a * z + tx - a * ty; tx = z; ty = v
            buf[i] = v
            i += 1
            if i == n: i = 0
        if k == 0:                                       # finger back on the string: stronger, darker loss
            q = p + .25 * (1 - p); b *= dead_g * (1 - q) / (1 - p); p = q
    return out

def pluck(midi, vel, dur, seed, kind="pluck", beta=None, tune=0.0):
    """-> (pre, samples): bridge force, starting `pre` samples before the release. vel 0..1"""
    r = random.Random(seed); f0 = mtof(midi) * 2 ** ((tune + r.gauss(0, .6)) / 1200)
    harm = kind == "harm"
    if harm: midi_s = midi - 12
    t0 = interp(T60, midi); thi = interp(T60HI, midi); st = interp(STIFF, midi)
    if harm: t0 *= .62; thi *= .55
    if beta is None: beta = r.gauss(.452, .018)
    beta = min(.48, max(.22, beta))
    # fingertip release time: soft = slower
    soft = 1 - vel
    wid = (.00016 + .00070 * soft ** 1.5) * (1.0 if midi < 58 else 2 ** (-(midi - 58) / 22.0))
    if harm: wid *= 1.7
    if kind == "nail": wid *= .45
    n, b, p, s, a = design(f0, t0, thi, st)
    T = SR / f0; amp = 10 ** ((-27 + 27 * vel) / 20) * (1.0 if midi < 63 else 2 ** (-(midi - 63) / 60.0)) * 2 ** ((39 - min(midi, 63)) / 90.0)
    def wave(T, ph0=0.0):
        hi, lo = 1.0, -beta / (1 - beta); m = max(1, int(wid * SR)); ov = 4
        # analytic smoothed rectangular pulse: raised-cosine edges of width wid
        W = max(1.2, wid * SR)
        def edge(x): return smooth(x / W + .5)
        half = beta * T / 2; o = []
        for k in range(n):
            x = (k + ph0) % T
            if x > T / 2: x -= T
            o.append(lo + (hi - lo) * edge(half - abs(x)))
        return o
    det = r.uniform(.2, .45)
    N = int((dur + .55) * SR); dead = int(dur * SR)
    rel = .10 + .10 * max(0, (63 - midi) / 24.0)
    dg = 10 ** (-3 / (f0 * rel)) / 10 ** (-3 / (f0 * t0))
    dg = max(.45, min(1.0, dg))
    A = run_string(n, b, p, s, a, [amp * v for v in wave(T)], N, dead, dg)
    f1 = f0 * 2 ** (det / 1200); n1, b1, p1, s1, a1 = design(f1, t0 * 1.35, thi * 1.1, st)
    n_save = n; n = n1
    B = run_string(n1, b1, p1, s1, a1, [amp * .42 * v for v in wave(SR / f1, .18 * T)], N, dead, dg)
    n = n_save
    force = [x + y for x, y in zip(A, B)]
    pre = int(.016 * SR); s0 = force[0]; ramp = [s0 * smooth(k / pre) ** 2 for k in range(pre)]
    # skin noise while the fingertip slides off
    nz = []; y1 = y2 = 0.0; c = biquad_coefs("bp", r.uniform(1700, 2600), .8); x1 = x2 = 0.0; z1 = z2 = 0.0
    L = int(.030 * SR); ng = amp * (.018 + .02 * (1 - soft)) * (1.0 if midi > 50 else 1.35)
    for k in range(L):
        e = smooth(k / (pre * .95)) * smooth((L - k) / (L - pre * .8))
        v = r.gauss(0, 1); o = c[0]*v + z1; z1 = c[1]*v - c[3]*o + z2; z2 = c[2]*v - c[4]*o; nz.append(o * e * ng * 3)
    sig = ramp + force
    for k in range(min(L, len(sig))): sig[k] += nz[k]
    return pre, sig

# ---- soundboard ---------------------------------------------------------------------------------
def board(seed=5, lo=250.0, hi=6200.0, sp0=33.0, sp1=125.0, sd=2.8, bw=15.0):
    """sound box: air mode and the first board modes, then a dense random-phase modal field; stereo because each mode radiates its own pattern"""
    r = random.Random(seed); m = []
    env = [(250, 1.0), (500, 1.0), (900, .9), (1400, .78), (2100, .64), (3000, .48), (4200, .30), (6200, .13)]
    for f, q, g in ((112, 8, .35), (152, 11, .85), (193, 12, 1.0), (228, 13, .9)):
        m.append((f * r.uniform(.97, 1.03), q, g, g * r.uniform(.8, 1.1)))
    f = lo
    while f < hi:
        sp = sp0 + (sp1 - sp0) * min(1.0, (f - lo) / 3600.0)
        q = f / (bw + f * .026) * r.uniform(.8, 1.25); g = interp(env, f) * 10 ** (r.gauss(0, sd) / 20) * r.choice((-1, 1)); p = r.gauss(0, .33)
        m.append((f, q, g * (1 + p), g * (1 - p))); f += sp * r.uniform(.6, 1.4)
    return m
BOARD = board()
def radiate(x, direct=.20):
    """force -> stereo radiated sound. direct path is high-passed (small board, weak below 110 Hz)"""
    run = make_bank(BOARD)
    x = biquad(x, biquad_coefs("hp", 165.0, .62))        # a small box cannot move much air below its first board mode
    L, R = run(x)
    h = eq(x, ("hp", 125.0, .6), ("lp", 5200.0, .6))
    return [a * .78 + direct * d for a, d in zip(L, h)], [a * .78 + direct * d for a, d in zip(R, h)]

# ---- sympathetic strings -------------------------------------------------------------------------
SYM = [39, 41, 43, 44, 46, 48, 50, 51, 53, 55, 56, 58, 60, 62, 63, 65, 67, 68, 70, 72, 74, 75]
def sympathetic(x, g=.0055):
    """each undamped string is a long comb loop fed by the board; stereo by string position"""
    L = [0.0] * len(x); R = [0.0] * len(x)
    r = random.Random(3)
    for k, m in enumerate(SYM):
        f = mtof(m) * 2 ** (r.gauss(0, 1.2) / 1200); n, b, p, s, a = design(f, interp(T60, m) * .6, interp(T60HI, m) * .7, interp(STIFF, m))
        buf = [0.0] * n; i = 0; lp = d1x = d1y = d2x = d2y = tx = ty = 0.0; out = []; ap = out.append
        gg = g * (f / 220.0) ** .3
        for v in x:
            q = buf[i]; ap(q)
            lp = b * q + p * lp
            y = s * lp + d1x - s * d1y; d1x = lp; d1y = y
            z = s * y + d2x - s * d2y; d2x = y; d2y = z
            w = a * z + tx - a * ty; tx = z; ty = w
            buf[i] = w + gg * v
            i += 1
            if i == n: i = 0
        pan = -.7 + 1.4 * k / (len(SYM) - 1)
        gl = math.sqrt(.5 * (1 - pan)); gr = math.sqrt(.5 * (1 + pan))
        L = [c + gl * d for c, d in zip(L, out)]; R = [c + gr * d for c, d in zip(R, out)]
    return L, R
