"""tube.py - time-domain travelling-wave model of the vocal tract, nose, sinuses, piriform and lateral pocket.
Pure standard library.  The per-sample loop is GENERATED as flat Python source and exec'd.

Scattering junctions on pressure waves, one sample of delay per section, so the simulation rate is
fs = NSEC*c/L (about 95 kHz) and follows the changing tract length exactly; the result is resampled afterwards.

make() -> run(frames, us, ag, na, nf, state) ; see COEF / CONST for what each frame must supply.
"""

import itertools
import math
from collections.abc import Callable, Sequence

from concert.voice.tract import (
    LAT_LEN,
    LAT_SEC,
    NSEC,
    PIRI_LEN,
    PIRI_SEC,
    RC,
    RHO,
    VSEC,
)

NN = 30  # nasal sections
SUB = 4
BLK = 24
FRAME = SUB * BLK  # samples per control frame
WALLS = [
    3,
    8,
    12,
    16,
    19,
    24,
    28,
    32,
    36,
    39,
]  # junctions carrying yielding-wall shunts
HFL = [7, 15, 27, 36, 41]  # junctions with an extra high-frequency loss
ASP = [2, 9]  # aspiration pressure sources
FRI = [
    26,
    29,
    31,
    35,
    37,
    38,
    39,
    40,
    41,
    42,
    43,
]  # frication pressure sources (junctions)
SIN = [(12, 0), (18, 1)]  # nasal junction, sinus id
WRAD = [8, 12, 36]  # walls heard through the neck / cheeks
NHF = [
    4,
    9,
    15,
    21,
    26,
]  # nasal junctions with strong high-frequency wall loss (folded, narrow passages)
NVAR = 6  # nasal junctions that move with the velum

# interpolated coefficients (one list per frame boundary)
COEF = (
    [f"k{i:d}" for i in range(1, NSEC) if i not in (VSEC, PIRI_SEC, LAT_SEC)]
    + ["v1", "v2", "v3", "q1", "q2", "q3", "t1", "t2", "t3"]
    + [f"m{j:d}" for j in range(1, NVAR + 1)]
    + ["ql", "yl", "z0"]
)
# per-frame constants
CONST = (
    [f"g{i:d}" for i in range(1, NSEC, 2)]
    + [f"w{i:d}" for i in WALLS]
    + ["hw", "lq", "rlq", "dT"]
    + [f"n{i:d}" for i in FRI]
    + [f"a{i:d}" for i in ASP]
    + ["wr", "hf"]
)


def build_source(with_nose=True):
    """Python source of the waveguide loop for the current section layout."""
    o = []
    P = o.append
    P("def run(KF, CF, us_, ag_, na_, nf_, NS, out):")
    ind = "    "
    for i in range(NSEC):
        P(ind + f"f{i:d}=b{i:d}=0.0")
    for j in range(NN):
        P(ind + f"nf{j:d}=nb{j:d}=0.0")
    for i in WALLS:
        P(ind + f"u{i:d}=0.0")
    for i in HFL:
        P(ind + f"lf{i:d}=lb{i:d}=0.0")
    for i in range(2 * PIRI_LEN):
        P(ind + f"pq{i:d}=0.0")
    for i in range(2 * LAT_LEN):
        P(ind + f"lq{i:d}_=0.0")
    for j in NHF:
        P(ind + f"nlf{j:d}=nlb{j:d}=0.0")
    P(ind + "su0=su1=sp0=sp1=0.0")
    P(ind + "vg=uL=uN=Up=nl1=nl2=0.0")
    P(
        ind
        + "mk=NS['mk']; gn=NS['gn']; rn1,rn2,qn,yn=NS['rad']; s0L,s0R,s0C,s0z=NS['s0']; s1L,s1R,s1C,s1z=NS['s1']; hn=NS['hn']; hc=NS['hc']; hb=NS['hb']; ha=NS['ha']"
    )
    for j in range(NVAR + 1, NN):
        P(ind + f"m{j:d}=mk[{j:d}]")
    P(ind + "ap=out.append")
    P(ind + "pos=0")
    P(ind + "for fr in range(len(CF)):")
    ind = "        "
    P(ind + "A=KF[fr]; B=KF[fr+1]")
    P(ind + ",".join(COEF) + "=A")
    P(
        ind
        + ",".join("d_" + c for c in COEF)
        + f"=[(y-x)*{1.0 / BLK!r} for x,y in zip(A,B)]"
    )
    P(ind + ",".join(CONST) + "=CF[fr]")
    P(ind + f"for sb in range({BLK:d}):")
    ind = "            "
    P(ind + "rl2=1.0/(1.694*yl+ql); rl1=(0.306*yl-ql)*rl2; rl3=rl2*ql")
    P(
        ind
        + f"for us,ag,na,nf in zip(us_[pos:pos+{SUB:d}],ag_[pos:pos+{SUB:d}],na_[pos:pos+{SUB:d}],nf_[pos:pos+{SUB:d}]):"
    )
    ind = "                "
    # glottal end (Norton source with glottal resistance and inertance, normalised by area)
    P(ind + "vg=(2.0*b0+us*z0+lq*vg)/(rlq+ag*z0)")
    P(ind + "x=f0; f0=b0+(us-ag*vg)*z0")
    cur, nxt = "x", "y"
    for i in range(1, NSEC):
        # junction between section i-1 (incoming forward wave 'cur') and section i (incoming backward wave b_i)
        g = f"g{i:d}" if i % 2 == 1 else None
        P(ind + f"{nxt}=f{i:d}")
        if i == VSEC:
            P(ind + f"p=v1*{cur}+v2*b{i:d}+v3*nb0")
            P(ind + f"f{i:d}=p-b{i:d}; b{i - 1:d}=p-{cur}; nin=p-nb0")
        elif i == PIRI_SEC:
            P(ind + f"r=pq{2 * PIRI_LEN - 1:d}*0.97")
            P(ind + f"p=q1*{cur}+q2*b{i:d}+q3*r")
            P(ind + f"f{i:d}=p-b{i:d}; b{i - 1:d}=p-{cur}")
            for q in range(2 * PIRI_LEN - 1, 0, -1):
                P(ind + f"pq{q:d}=pq{q - 1:d}")
            P(ind + "pq0=p-r")
        elif i == LAT_SEC:
            P(ind + f"r=lq{2 * LAT_LEN - 1:d}_*0.95")
            P(ind + f"p=t1*{cur}+t2*b{i:d}+t3*r")
            P(ind + f"f{i:d}=p-b{i:d}; b{i - 1:d}=p-{cur}")
            for q in range(2 * LAT_LEN - 1, 0, -1):
                P(ind + f"lq{q:d}_=lq{q - 1:d}_")
            P(ind + "lq0_=p-r")
        else:
            P(ind + f"w=k{i:d}*({cur}-b{i:d})")
            if i in WALLS:
                P(ind + f"u{i:d}=hw*u{i:d}+{cur}+w+b{i:d}")
                P(ind + f"w-=u{i:d}*w{i:d}")
            fo = f"{cur}+w"
            bo = f"b{i:d}+w"
            if i in ASP:
                P(ind + f"e=na*a{i:d}")
                fo += "+e"
                bo += "-e"
            if i in FRI:
                P(ind + f"e=nf*n{i:d}")
                fo += "+e"
                bo += "-e"
            if i in HFL:
                P(ind + f"p={fo}; lf{i:d}+=ha*(p-lf{i:d}); f{i:d}=p-hf*(p-lf{i:d})")
                P(ind + f"p={bo}; lb{i:d}+=ha*(p-lb{i:d}); b{i - 1:d}=p-hf*(p-lb{i:d})")
            elif g:
                P(ind + f"f{i:d}=({fo})*{g}; b{i - 1:d}=({bo})*{g}")
            else:
                P(ind + f"f{i:d}={fo}; b{i - 1:d}={bo}")
        cur, nxt = nxt, cur
    # lips
    P(ind + f"r=rl1*{cur}-rl3*uL")
    P(ind + f"b{NSEC - 1:d}=r; uL+={cur}+r; U=yl*({cur}-r)")
    # nose
    P(ind + "x=nf0; nf0=nin")
    cur, nxt = "x", "y"
    for j in range(1, NN):
        P(ind + f"{nxt}=nf{j:d}")
        P(ind + f"w=m{j:d}*({cur}-nb{j:d})")
        for sj, sid in SIN:
            if sj == j:
                P(
                    ind
                    + f"su{sid:d}+=s{sid:d}L*({cur}+w+nb{j:d}-sp{sid:d}-s{sid:d}R*su{sid:d}); sp{sid:d}+=s{sid:d}C*su{sid:d}; w-=su{sid:d}*s{sid:d}z"
                )
        if j in NHF:
            P(ind + f"p={cur}+w; nlf{j:d}+=hb*(p-nlf{j:d}); nf{j:d}=p-hn*(p-nlf{j:d})")
            P(
                ind
                + f"p=nb{j:d}+w; nlb{j:d}+=hb*(p-nlb{j:d}); nb{j - 1:d}=p-hn*(p-nlb{j:d})"
            )
        elif j % 2 == 0:
            P(ind + f"nf{j:d}=({cur}+w)*gn; nb{j - 1:d}=(nb{j:d}+w)*gn")
        else:
            P(ind + f"nf{j:d}={cur}+w; nb{j - 1:d}=nb{j:d}+w")
        cur, nxt = nxt, cur
    P(ind + f"r=rn1*{cur}-rn2*uN")
    P(
        ind
        + f"nb{NN - 1:d}=r*0.985; uN+=qn*({cur}+r); nl1+=hc*(yn*({cur}-r)-nl1); nl2+=hc*(nl1-nl2); U+=nl2"
    )
    P(ind + "U+=wr*({})".format("+".join(f"u{i:d}" for i in WRAD)))
    P(ind + "ap((U-Up)*dT); Up=U")
    ind = "            "
    P(ind + f"pos+={SUB:d}")
    P(ind + "; ".join(f"{c}+=d_{c}" for c in COEF))
    P("    return out")
    return "\n".join(o)


_cache = {}


def make() -> Callable:
    """The compiled waveguide loop, built once."""
    if "run" not in _cache:
        ns = {}
        exec(compile(build_source(), "<tube>", "exec"), ns)  # noqa: S102 - the waveguide is generated as straight-line code for speed
        _cache["run"] = ns["run"]
    return _cache["run"]


# --------------------------------------------------------------------- nasal tract constants
_NA = [
    (0, 0.9),
    (2, 1.7),
    (4, 2.8),
    (8, 4.0),
    (12, 4.8),
    (16, 5.0),
    (20, 4.2),
    (24, 2.4),
    (26, 1.3),
    (27, 0.95),
    (29, 1.0),
]


def nasal_rest():
    """Nasal tract areas at rest, interpolated from the anatomical table."""
    out = []
    for j in range(NN):
        for (x0, y0), (x1, y1) in itertools.pairwise(_NA):
            if x0 <= j <= x1:
                out.append(y0 + (y1 - y0) * (j - x0) / (x1 - x0))
                break
    return out


NAREA = nasal_rest()


def radiation(A, T):
    """Lip radiation filter coefficients for mouth area `A` and frame time `T`."""
    Y = A / RC
    G = Y * 0.694
    q = T * 3 * math.pi * math.sqrt(math.pi * A) / (8 * RHO)
    d = 1.0 / (Y + G + q)
    return (Y - G - q) * d, d, q, Y


def nose_static(T: float) -> dict:
    """Per-frame constants of the nasal tract and its sinuses for frame time `T`."""
    mk = [0.0] * NN
    for j in range(1, NN):
        mk[j] = (NAREA[j - 1] - NAREA[j]) / (NAREA[j - 1] + NAREA[j])

    def sinus(f, R, L, A):
        C = 1 / ((2 * math.pi * f) ** 2 * L)
        return (T / L, R, T / C, RC / (2 * A))

    return {
        "mk": mk,
        "gn": 0.9925,
        "rad": radiation(NAREA[-1], T),
        "s0": sinus(480.0, 3.0, 0.006, NAREA[12]),
        "s1": sinus(1150.0, 8.0, 0.009, NAREA[18]),
        "hn": 0.15,
        "hc": 1 - math.exp(-2 * math.pi * 3600 * T),
        "hb": 1 - math.exp(-2 * math.pi * 700 * T),
        "ha": 1 - math.exp(-2 * math.pi * 5500 * T),
    }


ORAL_IDX = [i for i in range(1, NSEC) if i not in (VSEC, PIRI_SEC, LAT_SEC)]


def frame_coefs(
    A: Sequence[float], T: float, vel: float, lat: float, piri: float = 0.9
) -> list[float]:
    """interpolated coefficient vector for area function A."""
    k = [(A[i - 1] - A[i]) / (A[i - 1] + A[i]) for i in ORAL_IDX]
    a, b = A[VSEC - 1], A[VSEC]
    n0 = max(1e-05, vel)
    s = 2.0 / (a + b + n0)
    k += [a * s, b * s, n0 * s]
    a, b = A[PIRI_SEC - 1], A[PIRI_SEC]
    s = 2.0 / (a + b + piri)
    k += [a * s, b * s, piri * s]
    a, b = A[LAT_SEC - 1], A[LAT_SEC]
    l0 = max(1e-06, lat)
    s = 2.0 / (a + b + l0)
    k += [a * s, b * s, l0 * s]
    # velar end of the nasal tract opens with the port
    pn = n0
    for j in range(1, NVAR + 1):
        u = j / (NVAR + 0.0)
        an = min(NAREA[j], n0 * (1 - u) + NAREA[j] * u + 0.05)
        k.append((pn - an) / (pn + an))
        pn = an
    r = radiation(A[-1], T)
    k.append(r[2])
    k.append(r[3])
    k.append(RC / A[0])
    return k
