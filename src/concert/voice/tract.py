"""tract.py - the vocal tract of the singer: articulators -> area function, and a frequency-domain solver.
Pure standard library.  CGS units (cm, g, s).

Coordinates: s = distance from the glottis in cm for a NEUTRAL 16.3 cm tract.
Landmarks: larynx tube 0-2.1, pharynx 2.1-7.6, velum port 7.9, velar 8.6-10.3, palatal 10.5-12.8,
post-alveolar 13.3, alveolar ridge 14.6, teeth 15.35, lips 15.5-16.3 (+protrusion).

Articulator vector (dict / tuple order in ART):
  J   jaw opening 0..1            X,Y  tongue body position (front+ / back-, up+ / down-)
  TR  tongue root advance (+ widens the lower pharynx)
  TT  tongue blade/tip lift 0..1 (narrow front cavity roof)  BP  blade place
  LA  lip aperture (cm of diameter)    LP  lip protrusion cm    LH  larynx lowering cm   EP epilarynx diam offset
"""

import cmath
import itertools
import math
from collections.abc import Sequence

RHO = 0.00114
C0 = 35200.0
L0 = 16.3
NSEC = 44
VSEC = 21  # nasal port sits between section VSEC-1 and VSEC
PIRI_SEC = 5  # piriform shunt between PIRI_SEC-1 and PIRI_SEC
LAT_SEC = 34  # lateral / sublingual pocket
PIRI_LEN = 5  # sections
LAT_LEN = 6
LIP0 = 15.45


def _interp(pts, x):
    if x <= pts[0][0]:
        return pts[0][1]
    for (x0, y0), (x1, y1) in itertools.pairwise(pts):
        if x <= x1:
            u = (x - x0) / (x1 - x0)
            u = u * u * (3 - 2 * u) * 0.5 + u * 0.5
            return y0 + (y1 - y0) * u
    return pts[-1][1]


# neutral mid-sagittal "diameter" (cm) : area = pi/4 d^2
_D0 = [
    (-2, 0.80),
    (0, 0.80),
    (0.7, 0.76),
    (1.5, 0.80),
    (2.0, 0.98),
    (2.5, 1.34),
    (3.2, 1.58),
    (4.5, 1.64),
    (6.2, 1.60),
    (7.6, 1.56),
    (9, 1.58),
    (10.5, 1.66),
    (12, 1.70),
    (13.4, 1.66),
    (14.4, 1.54),
    (15.1, 1.34),
    (15.5, 1.24),
    (19, 1.24),
]
_W = [
    (-2, 0),
    (1.8, 0),
    (2.6, 0.55),
    (3.8, 1.0),
    (12.6, 1.0),
    (14.0, 0.78),
    (14.9, 0.45),
    (15.5, 0.12),
    (16, 0),
    (19, 0),
]
_JW = [(-2, 0), (7.5, 0), (9.5, 0.22), (12, 0.62), (14, 0.92), (15.4, 1.0), (19, 1.0)]
_TRW = [
    (-2, 0),
    (2.0, 0),
    (3.2, 0.8),
    (4.4, 1.0),
    (6.0, 0.7),
    (7.8, 0.1),
    (8.5, 0),
    (19, 0),
]
_EPW = [(-2, 1), (1.2, 1), (2.0, 0.7), (2.8, 0), (19, 0)]
GS = 40  # table points per cm
S_MIN = -1.5
S_MAX = 18.5
_n = int((S_MAX - S_MIN) * GS) + 2
PX = 11.75
LAM = 13.7  # place of the fully-front constriction, spatial wavelength


def _tab(fn):
    return [fn(S_MIN + i / GS) for i in range(_n)]


T_D0 = _tab(lambda s: _interp(_D0, s))
T_W = _tab(lambda s: _interp(_W, s))
T_JW = _tab(lambda s: _interp(_JW, s))
T_TR = _tab(lambda s: _interp(_TRW, s))
T_EP = _tab(lambda s: _interp(_EPW, s))
T_FX = _tab(lambda s: _interp(_W, s) * math.cos(2 * math.pi * (s - PX) / LAM))
T_FY = _tab(
    lambda s: _interp(_W, s) * math.cos(2 * math.pi * (s - (PX - LAM / 4)) / LAM)
)
LEN_T = len(T_D0)

NEUTRAL = {
    "J": 0.30,
    "X": 0.0,
    "Y": 0.0,
    "TR": 0.0,
    "TT": 0.0,
    "BP": 13.6,
    "LA": 1.15,
    "LP": 0.0,
    "LH": 0.0,
    "EP": 0.0,
}
ART = ["J", "X", "Y", "TR", "TT", "BP", "LA", "LP", "LH", "EP"]


def tract_length(LP, LH):
    """Vocal tract length in cm for lip protrusion `LP` and larynx height `LH`."""
    return L0 + LP + LH


def diameters(a, n=NSEC):
    """articulators -> (list of section diameters, dx). No consonant constrictions."""
    L = L0 + a["LP"] + a["LH"]
    dx = L / n
    J, X, Y, TR, TT, BP, LA, EP, LH = (
        a["J"],
        a["X"],
        a["Y"],
        a["TR"],
        a["TT"],
        a["BP"],
        a["LA"],
        a["EP"],
        a["LH"],
    )
    out = []
    for i in range(n):
        s = (i + 0.5) * dx - LH
        q = int((s - S_MIN) * GS + 0.5)
        d = (
            T_D0[q]
            + 1.15 * J * T_JW[q]
            - X * T_FX[q]
            - Y * T_FY[q]
            + TR * T_TR[q]
            + EP * T_EP[q]
        )
        if TT > 0.001:
            u = (s - BP) / 1.15
            d -= TT * math.exp(-u * u)
        if s > LIP0 - 0.3:
            u = (s - LIP0 + 0.3) / 0.6
            if u > 1:
                u = 1.0
            u = u * u * (3 - 2 * u)
            d = d + (LA - d) * u
        if d < 0.24:
            d = 0.24 + 0.12 * (math.exp((d - 0.24) / 0.12) - 1) if d > -1 else 0.12
        out.append(d)
    return out, dx


def areas(a: dict[str, float], n: int = NSEC) -> tuple[list[float], float]:
    """Cross-section areas of `n` sections for articulator settings `a`, and the section length."""
    d, dx = diameters(a, n)
    return [math.pi * 0.25 * x * x for x in d], dx


# ---------------------------------------------------------------- frequency-domain solver
RC = RHO * C0


def transfer(A, dx, freqs, piri=True, lossy=True, piri_area=0.9, lat_area=0.0):
    """|U_lips / U_glottis| list for area function A (glottis first)."""
    out = []
    N = len(A)
    per = [2.0 * math.sqrt(math.pi * a) * 1.35 for a in A]
    for f in freqs:
        w = 2 * math.pi * f
        Al = A[-1]
        Rr = 128 / (9 * math.pi**2) * RC / Al
        Lr = 8 * RHO / (3 * math.pi * math.sqrt(math.pi * Al))
        Zr = 1j * w * Lr * Rr / (Rr + 1j * w * Lr)
        # walk from lips to glottis with p,u
        p = Zr
        u = 1.0 + 0j
        for i in range(N - 1, -1, -1):
            a = A[i]
            if lossy:
                Rv = per[i] / (a * a) * math.sqrt(w * RHO * 1.86e-4 / 2)
                G = (
                    per[i]
                    * 0.4
                    / (RHO * C0 * C0)
                    * math.sqrt(5.5e-5 * w / (2 * 0.24 * RHO))
                    if w > 0
                    else 0
                )
                Yw = per[i] / complex(1500.0, w * 1.5)
                Z = complex(Rv, w * RHO / a)
                Y = complex(G, w * a / (RHO * C0 * C0)) + Yw
            else:
                Z = complex(0, w * RHO / a)
                Y = complex(0, w * a / (RHO * C0 * C0))
            g = cmath.sqrt(Z * Y)
            z0 = cmath.sqrt(Z / Y)
            gx = g * dx
            ch = cmath.cosh(gx)
            sh = cmath.sinh(gx)
            p, u = ch * p + z0 * sh * u, sh / z0 * p + ch * u
            if piri and i == PIRI_SEC:
                kl = w / C0 * PIRI_LEN * dx
                t = cmath.tan(complex(kl, -0.02))
                u += p * 1j * piri_area / RC * t
            if lat_area > 0 and i == LAT_SEC:
                kl = w / C0 * LAT_LEN * dx
                u += p * 1j * lat_area / RC * cmath.tan(complex(kl, -0.02))
        out.append(1.0 / abs(u))
    return out


def formants(
    A: Sequence[float],
    dx: float,
    n: int = 5,
    step: float = 25.0,
    fmax: float = 5200.0,
    **kw: float,
) -> list[tuple[float, float, float]]:
    """Resonances of the area function: list of (frequency, bandwidth, peak dB)."""
    fr = [step * (i + 4) for i in range(int(fmax / step) - 3)]
    H = transfer(A, dx, fr, **kw)
    lh = [math.log(h) for h in H]
    res = []
    for i in range(1, len(H) - 1):
        if lh[i] > lh[i - 1] and lh[i] >= lh[i + 1]:
            den = lh[i - 1] - 2 * lh[i] + lh[i + 1]
            off = 0.5 * (lh[i - 1] - lh[i + 1]) / den if den else 0
            # 3 dB bandwidth (log parabola estimate from local curvature)
            pk = lh[i] - 0.25 * (lh[i - 1] - lh[i + 1]) * off
            j = i
            while j > 0 and lh[j] > pk - 0.3466:
                j -= 1
            k = i
            while k < len(lh) - 1 and lh[k] > pk - 0.3466:
                k += 1
            res.append((fr[i] + off * step, (k - j) * step, pk * 8.686))
    return res[:n]


if __name__ == "__main__":
    import time

    t = time.time()
    A, dx = areas(NEUTRAL)
    print([f"{a:.2f}" for a in A], dx)
    for r in formants(A, dx):
        print("F {:.0f}  B~{:.0f}  {:.1f} dB".format(*r))
    print(time.time() - t)
