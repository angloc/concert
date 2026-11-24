"""tube.py - time-domain travelling-wave model of the vocal tract, nose, sinuses, piriform and lateral pocket.
Pure standard library.  The per-sample loop is GENERATED as flat Python source and exec'd.

Scattering junctions on pressure waves, one sample of delay per section, so the simulation rate is
fs = NSEC*c/L (about 95 kHz) and follows the changing tract length exactly; the result is resampled afterwards.

make() -> run(frames, us, ag, na, nf, state) ; see COEF / CONST for what each frame must supply.
"""
import math
from tract import NSEC, VSEC, PIRI_SEC, LAT_SEC, PIRI_LEN, LAT_LEN, RHO, C0, RC
NN = 30                       # nasal sections
SUB = 4; BLK = 24; FRAME = SUB * BLK      # samples per control frame
WALLS = [3, 8, 12, 16, 19, 24, 28, 32, 36, 39]        # junctions carrying yielding-wall shunts
HFL = [7, 15, 27, 36, 41]                        # junctions with an extra high-frequency loss
ASP = [2, 9]                                  # aspiration pressure sources
FRI = [26, 29, 31, 35, 37, 38, 39, 40, 41, 42, 43]    # frication pressure sources (junctions)
SIN = [(12, 0), (18, 1)]                      # nasal junction, sinus id
WRAD = [8, 12, 36]                          # walls heard through the neck / cheeks
NHF = [4, 9, 15, 21, 26]                      # nasal junctions with strong high-frequency wall loss (folded, narrow passages)
NVAR = 6                                      # nasal junctions that move with the velum

# interpolated coefficients (one list per frame boundary)
COEF = ["k%d" % i for i in range(1, NSEC) if i not in (VSEC, PIRI_SEC, LAT_SEC)] \
     + ["v1", "v2", "v3", "q1", "q2", "q3", "t1", "t2", "t3"] + ["m%d" % j for j in range(1, NVAR + 1)] \
     + ["ql", "yl", "z0"]
# per-frame constants
CONST = ["g%d" % i for i in range(1, NSEC, 2)] + ["w%d" % i for i in WALLS] + ["hw", "lq", "rlq", "dT"] \
      + ["n%d" % i for i in FRI] + ["a%d" % i for i in ASP] + ["wr", "hf"]

def build_source(with_nose=True):
    o = []; P = o.append
    P("def run(KF, CF, us_, ag_, na_, nf_, NS, out):")
    ind = "    "
    for i in range(NSEC): P(ind + "f%d=b%d=0.0" % (i, i))
    for j in range(NN): P(ind + "nf%d=nb%d=0.0" % (j, j))
    for i in WALLS: P(ind + "u%d=0.0" % i)
    for i in HFL: P(ind + "lf%d=lb%d=0.0" % (i, i))
    for i in range(2 * PIRI_LEN): P(ind + "pq%d=0.0" % i)
    for i in range(2 * LAT_LEN): P(ind + "lq%d_=0.0" % i)
    for j in NHF: P(ind + "nlf%d=nlb%d=0.0" % (j, j))
    P(ind + "su0=su1=sp0=sp1=0.0")
    P(ind + "vg=uL=uN=Up=nl1=nl2=0.0")
    P(ind + "mk=NS['mk']; gn=NS['gn']; rn1,rn2,qn,yn=NS['rad']; s0L,s0R,s0C,s0z=NS['s0']; s1L,s1R,s1C,s1z=NS['s1']; hn=NS['hn']; hc=NS['hc']; hb=NS['hb']; ha=NS['ha']")
    for j in range(NVAR + 1, NN): P(ind + "m%d=mk[%d]" % (j, j))
    P(ind + "ap=out.append")
    P(ind + "pos=0")
    P(ind + "for fr in range(len(CF)):")
    ind = "        "
    P(ind + "A=KF[fr]; B=KF[fr+1]")
    P(ind + ",".join(COEF) + "=A")
    P(ind + ",".join("d_" + c for c in COEF) + "=[(y-x)*%r for x,y in zip(A,B)]" % (1.0 / BLK))
    P(ind + ",".join(CONST) + "=CF[fr]")
    P(ind + "for sb in range(%d):" % BLK)
    ind = "            "
    P(ind + "rl2=1.0/(1.694*yl+ql); rl1=(0.306*yl-ql)*rl2; rl3=rl2*ql")
    P(ind + "for us,ag,na,nf in zip(us_[pos:pos+%d],ag_[pos:pos+%d],na_[pos:pos+%d],nf_[pos:pos+%d]):" % ((SUB,) * 4))
    ind = "                "
    # glottal end (Norton source with glottal resistance and inertance, normalised by area)
    P(ind + "vg=(2.0*b0+us*z0+lq*vg)/(rlq+ag*z0)")
    P(ind + "x=f0; f0=b0+(us-ag*vg)*z0")
    cur, nxt = "x", "y"
    for i in range(1, NSEC):
        # junction between section i-1 (incoming forward wave 'cur') and section i (incoming backward wave b_i)
        g = "g%d" % i if i % 2 == 1 else None
        P(ind + "%s=f%d" % (nxt, i))
        if i == VSEC:
            P(ind + "p=v1*%s+v2*b%d+v3*nb0" % (cur, i))
            P(ind + "f%d=p-b%d; b%d=p-%s; nin=p-nb0" % (i, i, i - 1, cur))
        elif i == PIRI_SEC:
            P(ind + "r=pq%d*0.97" % (2 * PIRI_LEN - 1))
            P(ind + "p=q1*%s+q2*b%d+q3*r" % (cur, i))
            P(ind + "f%d=p-b%d; b%d=p-%s" % (i, i, i - 1, cur))
            for q in range(2 * PIRI_LEN - 1, 0, -1): P(ind + "pq%d=pq%d" % (q, q - 1))
            P(ind + "pq0=p-r")
        elif i == LAT_SEC:
            P(ind + "r=lq%d_*0.95" % (2 * LAT_LEN - 1))
            P(ind + "p=t1*%s+t2*b%d+t3*r" % (cur, i))
            P(ind + "f%d=p-b%d; b%d=p-%s" % (i, i, i - 1, cur))
            for q in range(2 * LAT_LEN - 1, 0, -1): P(ind + "lq%d_=lq%d_" % (q, q - 1))
            P(ind + "lq0_=p-r")
        else:
            e = ""
            P(ind + "w=k%d*(%s-b%d)" % (i, cur, i))
            if i in WALLS:
                P(ind + "u%d=hw*u%d+%s+w+b%d" % (i, i, cur, i))
                P(ind + "w-=u%d*w%d" % (i, i))
            fo = "%s+w" % cur; bo = "b%d+w" % i
            if i in ASP: P(ind + "e=na*a%d" % i); fo += "+e"; bo += "-e"
            if i in FRI: P(ind + "e=nf*n%d" % i); fo += "+e"; bo += "-e"
            if i in HFL:
                P(ind + "p=%s; lf%d+=ha*(p-lf%d); f%d=p-hf*(p-lf%d)" % (fo, i, i, i, i))
                P(ind + "p=%s; lb%d+=ha*(p-lb%d); b%d=p-hf*(p-lb%d)" % (bo, i, i, i - 1, i))
            elif g:
                P(ind + "f%d=(%s)*%s; b%d=(%s)*%s" % (i, fo, g, i - 1, bo, g))
            else:
                P(ind + "f%d=%s; b%d=%s" % (i, fo, i - 1, bo))
        cur, nxt = nxt, cur
    # lips
    P(ind + "r=rl1*%s-rl3*uL" % cur)
    P(ind + "b%d=r; uL+=%s+r; U=yl*(%s-r)" % (NSEC - 1, cur, cur))
    # nose
    P(ind + "x=nf0; nf0=nin")
    cur, nxt = "x", "y"
    for j in range(1, NN):
        P(ind + "%s=nf%d" % (nxt, j))
        P(ind + "w=m%d*(%s-nb%d)" % (j, cur, j))
        for (sj, sid) in SIN:
            if sj == j:
                P(ind + "su%d+=s%dL*(%s+w+nb%d-sp%d-s%dR*su%d); sp%d+=s%dC*su%d; w-=su%d*s%dz" % (sid, sid, cur, j, sid, sid, sid, sid, sid, sid, sid, sid))
        if j in NHF:
            P(ind + "p=%s+w; nlf%d+=hb*(p-nlf%d); nf%d=p-hn*(p-nlf%d)" % (cur, j, j, j, j))
            P(ind + "p=nb%d+w; nlb%d+=hb*(p-nlb%d); nb%d=p-hn*(p-nlb%d)" % (j, j, j, j - 1, j))
        elif j % 2 == 0:
            P(ind + "nf%d=(%s+w)*gn; nb%d=(nb%d+w)*gn" % (j, cur, j - 1, j))
        else:
            P(ind + "nf%d=%s+w; nb%d=nb%d+w" % (j, cur, j - 1, j))
        cur, nxt = nxt, cur
    P(ind + "r=rn1*%s-rn2*uN" % cur)
    P(ind + "nb%d=r*0.985; uN+=qn*(%s+r); nl1+=hc*(yn*(%s-r)-nl1); nl2+=hc*(nl1-nl2); U+=nl2" % (NN - 1, cur, cur))
    P(ind + "U+=wr*(%s)" % "+".join("u%d" % i for i in WRAD))
    P(ind + "ap((U-Up)*dT); Up=U")
    ind = "            "
    P(ind + "pos+=%d" % SUB)
    P(ind + "; ".join("%s+=d_%s" % (c, c) for c in COEF))
    P("    return out")
    return "\n".join(o)

_cache = {}
def make():
    if "run" not in _cache:
        ns = {}
        exec(compile(build_source(), "<tube>", "exec"), ns)
        _cache["run"] = ns["run"]
    return _cache["run"]

# --------------------------------------------------------------------- nasal tract constants
_NA = [(0, .9), (2, 1.7), (4, 2.8), (8, 4.0), (12, 4.8), (16, 5.0), (20, 4.2), (24, 2.4), (26, 1.3), (27, .95), (29, 1.0)]
def nasal_rest():
    out = []
    for j in range(NN):
        for (x0, y0), (x1, y1) in zip(_NA, _NA[1:]):
            if x0 <= j <= x1: out.append(y0 + (y1 - y0) * (j - x0) / (x1 - x0)); break
    return out
NAREA = nasal_rest()

def radiation(A, T):
    Y = A / RC
    G = Y * 0.694
    q = T * 3 * math.pi * math.sqrt(math.pi * A) / (8 * RHO)
    d = 1.0 / (Y + G + q)
    return (Y - G - q) * d, d, q, Y

def nose_static(T):
    mk = [0.0] * NN
    for j in range(1, NN): mk[j] = (NAREA[j-1] - NAREA[j]) / (NAREA[j-1] + NAREA[j])
    def sinus(f, R, L, A):
        C = 1 / ((2 * math.pi * f)**2 * L)
        return (T / L, R, T / C, RC / (2 * A))
    return dict(mk=mk, gn=.9925, rad=radiation(NAREA[-1], T), s0=sinus(480., 3.0, 0.006, NAREA[12]), s1=sinus(1150., 8.0, 0.009, NAREA[18]),
                hn=.15, hc=1 - math.exp(-2 * math.pi * 3600 * T), hb=1 - math.exp(-2 * math.pi * 700 * T), ha=1 - math.exp(-2 * math.pi * 5500 * T))

ORAL_IDX = [i for i in range(1, NSEC) if i not in (VSEC, PIRI_SEC, LAT_SEC)]
def frame_coefs(A, T, vel, lat, piri=.9):
    """interpolated coefficient vector for area function A."""
    k = [(A[i-1] - A[i]) / (A[i-1] + A[i]) for i in ORAL_IDX]
    a, b = A[VSEC-1], A[VSEC]; n0 = vel if vel > 1e-5 else 1e-5; s = 2.0 / (a + b + n0)
    k += [a * s, b * s, n0 * s]
    a, b = A[PIRI_SEC-1], A[PIRI_SEC]; s = 2.0 / (a + b + piri); k += [a * s, b * s, piri * s]
    a, b = A[LAT_SEC-1], A[LAT_SEC]; l0 = lat if lat > 1e-6 else 1e-6; s = 2.0 / (a + b + l0); k += [a * s, b * s, l0 * s]
    # velar end of the nasal tract opens with the port
    pn = n0
    for j in range(1, NVAR + 1):
        u = j / (NVAR + .0)
        an = min(NAREA[j], n0 * (1 - u) + NAREA[j] * u + .05)
        k.append((pn - an) / (pn + an)); pn = an
    r = radiation(A[-1], T); k.append(r[2]); k.append(r[3])
    k.append(RC / A[0])
    return k
