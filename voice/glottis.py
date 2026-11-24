"""glottis.py - LF flow pulses (closed form, sub-sample timing) for the interactive glottal end of the tube."""
import math
def _lf_row(Rd):
    Ra = max(.004, (-1 + 4.8 * Rd) / 100.0); Rk = (22.4 + 11.8 * Rd) / 100.0
    Rg = 1.0 / (4 * ((0.11 * Rd / (0.5 + 1.2 * Rk)) - Ra) / Rk)
    tp = 1 / (2 * Rg); te = tp * (1 + Rk)
    if te > .96: s = .96 / te; tp *= s; te = .96
    ta = min(Ra, (1 - te) * .85); w = math.pi / tp
    # epsilon
    e = 1 / ta
    for _ in range(60):
        g = 1 - math.exp(-e * (1 - te)) - e * ta
        dg = (1 - te) * math.exp(-e * (1 - te)) - ta
        e2 = e - g / dg
        if abs(e2 - e) < 1e-9: e = e2; break
        e = e2
    q = math.exp(-e * (1 - te))
    ret = -(1 / (e * ta)) * ((1 - q) / e - (1 - te) * q)
    def opn(a):
        E0 = -1.0 / (math.exp(a * te) * math.sin(w * te))
        return E0 / (a*a + w*w) * (math.exp(a*te) * (a * math.sin(w*te) - w * math.cos(w*te)) + w), E0
    lo, hi = -40.0, 60.0
    flo = opn(lo)[0] + ret
    for _ in range(80):
        m = .5 * (lo + hi); fm = opn(m)[0] + ret
        if (fm > 0) == (flo > 0): lo = m; flo = fm
        else: hi = m
    a = .5 * (lo + hi); Fte, E0 = opn(a)
    c = E0 / (a*a + w*w)
    Fm = c * (math.exp(a*tp) * (a * math.sin(w*tp) - w * math.cos(w*tp)) + w)
    return (a, w, c, te, Fte, 1 / (e * ta), e, q, Fm, tp)
RD0, RD1, RDS = .35, 3.2, .01
TABLE = [_lf_row(RD0 + i * RDS) for i in range(int((RD1 - RD0) / RDS) + 1)]
def row(Rd):
    i = int((Rd - RD0) / RDS + .5)
    return TABLE[0 if i < 0 else (len(TABLE) - 1 if i >= len(TABLE) else i)]

if __name__ == "__main__":
    for rd in (.5, .8, 1., 1.5, 2., 2.7):
        r = row(rd); print(rd, ["%.4f" % x for x in r])
