"""engine.py - renders one sung line: gestures -> area function -> aerodynamics -> source -> tube -> 44.1 kHz."""
import math, os, random, sys
from array import array
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import tract as TR, tube as TB, glottis as GL, gest as GE
from tract import NSEC, L0, C0, RHO, RC, GS, S_MIN, T_D0, T_W, T_JW, T_TR, T_EP, T_FX, T_FY, LIP0
from operator import mul
SR = 44100
PI4 = math.pi * .25
CFG = dict(lev=.75, nv=.75, nu=.55, nm=.35, flut=11, ep=0.0, Kf=1.0, Ka=1.0, Ks=1.0, Kt=1.0, rd=0.0, jit=1.1, shim=1.5, hf=.19, wr=.022, gload=.45, K=1.0, jhi=1.3)

import sys as _s, os as _o; _s.path.insert(0, _o.path.join(_o.path.dirname(_o.path.dirname(_o.path.abspath(__file__))), "engine")); from opts import LEGATO
LIPCON = bool(LEGATO.get("lipcon")); BURST = bool(LEGATO.get("burst")); BURSTGAIN = float(LEGATO.get("burstgain", 1.0)); SIBGAIN = float(LEGATO.get("sibgain", 1.0)); FRLP = float(LEGATO.get("frlp", 0) or 0)
REL = bool(LEGATO.get("release"))

def smooth_noise(n, dt, fc, rnd, amp):
    """two-pole low-passed random walk, unit-ish variance * amp."""
    a = 1 - math.exp(-2 * math.pi * fc * dt); x = y = 0.0; out = []
    g = amp / math.sqrt(a / 2) / .72
    for _ in range(n):
        x += a * (rnd.gauss(0, 1) - x); y += a * (x - y); out.append(y * g)
    return out

def lerp(tab, x):
    i = int(x)
    if i < 0: return tab[0]
    if i >= len(tab) - 1: return tab[-1]
    u = x - i
    return tab[i] + (tab[i+1] - tab[i]) * u

def render_line(perf, li, cfg=None, debug=None):
    cfg = dict(CFG, **(cfg or {}))
    cr = perf["cr"]; segs = [dict(g) for g in perf["segs"] if g["line"] == li]
    br = [b for b in perf["breaths"] if b["line"] == li]
    rnd = random.Random(7000 + li * 13)
    t_on = segs[0]["t0"]; t_off = segs[-1]["t1"]
    t_fade = t_off - .20      # release: the voice starts to fade here; relcoda: not before a final consonant begins
    if LEGATO.get("relcoda") and segs[-1].get("role") == "off": t_fade = max(t_fade, segs[-1]["t0"])
    T0 = (br[0]["t0"] if br else t_on) - .10
    T1 = t_off + .42
    sc = GE.Score(segs, perf); tk = sc.T
    # glottal closing at the end of the line: breathy release
    # ------------------------------------------------ frame clock (tract length varies)
    gn = int((T1 - T0) * 1000) + 4; gt = [T0 + i * .001 for i in range(gn)]
    LPg = tk["LP"].sample(gt); LHg = tk["LH"].sample(gt)
    wob = smooth_noise(gn, .001, 1.5, rnd, .02)
    # the larynx rides a little with pitch (folk singer, untrained): +-2 mm
    lhp = []; z = None
    for tt in gt:
        f = lerp(perf["f0"], tt * cr); f = f if f > 60 else (z if z else 200.0)
        z = f if z is None else z + .02 * (f - z)
        lhp.append(max(-.22, min(.20, -.030 * 12 * math.log2(z / 196.0))))
    times = []; Ts = []; t = T0
    while t < T1:
        x = (t - T0) * 1000
        L = L0 + lerp(LPg, x) + lerp(LHg, x) + lerp(wob, x) + lerp(lhp, x)
        T = cfg["K"] * L / (NSEC * C0); times.append(t); Ts.append(T); t += TB.FRAME * T
    times.append(t); Ts.append(T); nf = len(Ts) - 1
    S = {k: array("d", tr.sample(times)) for k, tr in tk.items()}
    # living drift of every articulator
    fd = .001
    for k, amp, fc in (("J", .045, 1.6), ("X", .045, 2.0), ("Y", .045, 2.0), ("TR", .045, 1.4), ("LA", .055, 1.8), ("EP", .022, 2.2)):
        w = smooth_noise(nf + 1, fd, fc, rnd, amp); a = S[k]; S[k] = array("d", (p + q for p, q in zip(a, w)))
    # ------------------------------------------------ performance tracks at frame times
    def ptrack(name): tab = perf[name]; return [lerp(tab, t * cr) for t in times]
    f0 = ptrack("f0"); db = ptrack("db"); ten = ptrack("tension"); bre = ptrack("breath")
    # hold f0 outside the line
    first = next((x for x in f0 if x > 60), 200.0); last = first
    for i in range(nf + 1):
        if f0[i] < 60: f0[i] = last if i > nf // 2 else first
        else: last = f0[i]
    if cfg.get("xpose"): f0 = [x * 2 ** (cfg["xpose"] / 12) for x in f0]
    if cfg.get("xvib"):
        f0 = [x * 2 ** (cfg["xvib"] * math.sin(2 * math.pi * 5.3 * t) / 12) for x, t in zip(f0, times)]
    if cfg.get("flut"):
        w1 = smooth_noise(nf + 1, .001, 5.0, rnd, cfg["flut"]); f0 = [x * 2 ** (c / 1200) for x, c in zip(f0, w1)]
    if li == 7:                                           # "I love you so": the voice will not hold quite still
        w1 = smooth_noise(nf + 1, .001, 5.5, rnd, 17.0); w2 = smooth_noise(nf + 1, .001, 5.0, rnd, 1.1)
        for i, t in enumerate(times):
            u = max(0.0, min(1.0, (t - 63.8) / 1.2)); f0[i] *= 2 ** (w1[i] * u / 1200); db[i] += w2[i] * u; bre[i] = min(.95, bre[i] + .08 * u)
    if cfg.get("aflut"):
        w1 = smooth_noise(nf + 1, .001, 4.0, rnd, cfg["aflut"]); db = [x + c for x, c in zip(db, w1)]
    if cfg.get("xam"):
        db = [x + cfg["xam"] * math.sin(2 * math.pi * 1.3 * t) for x, t in zip(db, times)]
    # ------------------------------------------------ formant tuning: open the jaw so F1 stays above a high pitch (front vowels only)
    if cfg.get("ftune"):
        import tuning as TU
        Jt = S["J"]; nuc_ = [g for g in segs if g["role"] == "nuc"]
        for g in nuc_:
            if TU.MAP.get(g["ph"], g["ph"]) not in TU.table(): continue
            ra = .05
            for i in range(nf + 1):
                t_ = times[i]
                if t_ < g["t0"] - ra or t_ > g["t1"] + ra: continue
                u_ = 1.0 if g["t0"] <= t_ <= g["t1"] else 1.0 - (g["t0"] - t_ if t_ < g["t0"] else t_ - g["t1"]) / ra
                u_ = u_ * u_ * (3 - 2 * u_)
                Jt[i] += u_ * TU.dj(g["ph"], f0[i], cfg["K"], cfg["ftune"])
    # ------------------------------------------------ areas and coefficients per frame
    piri = .85
    KF = []; CF = []; Amins = []; debugA = []
    Ps = [0.0] * (nf + 1)
    for i in range(nf + 1):
        x = (db[i] + 26) / 26; Ps[i] = 6000 + 3800 * max(0, min(1, x))
    # inhalation window
    inh = [0.0] * (nf + 1)
    if br:
        b0, b1, dep = br[0]["t0"], br[0]["t1"], br[0]["depth"]
        for i, t in enumerate(times):
            if b0 < t < b1:
                u = (t - b0) / (b1 - b0); inh[i] = dep * (math.sin(math.pi * u ** .75) ** 1.2)
    Pio = 0.0; tr_env = 0.0; prevAc = 9.0
    sites = TB.FRI
    fr_mod = []        # 1 = voiced friction (modulated)
    info = dict(Ac=[], Pio=[], GA=[], fr=[]); fcs = []; fhs = []
    T_prev = None
    Agv = []           # glottal dc opening used by the source
    for i in range(nf + 1):
        T = Ts[i]; dxp = T * C0; dx = dxp / cfg["K"]; LH = S["LH"][i] + lerp(lhp, (times[i] - T0) * 1000)
        J, X, Y, TRa, TT, BP, LA, EP = S["J"][i], S["X"][i], S["Y"][i], S["TR"][i], S["TT"][i], S["BP"][i], S["LA"][i], S["EP"][i] + cfg["ep"]
        loud = max(0.0, (db[i] + 12) / 12); J = J * (1 + .10 * loud) + .03 * loud; LA *= 1 + .05 * loud
        if inh[i] > 0: J += .12 * inh[i]; LA += .15 * inh[i]
        LIPs = LIP0 - .3
        D = []; s = .5 * dx - LH
        for n in range(NSEC):
            q = int((s - S_MIN) * GS + .5)
            d = T_D0[q] + 1.15 * J * T_JW[q] - X * T_FX[q] - Y * T_FY[q] + TRa * T_TR[q] + EP * T_EP[q]
            if s > 9.0:
                if TT > 0.01:
                    u = (s - BP) / 1.15; d -= TT * math.exp(-u * u)
                if s > LIPs:
                    u = (s - LIPs) / .6
                    if u > 1.: u = 1.
                    d += (LA - d) * u * u * (3 - 2 * u)
            if d < .24: d = .12 + .12 * math.exp((d - .24) / .12)
            D.append(d); s += dx
        # constrictions
        conA = []
        sh = LH / dx - .5
        for cn, place, hw, sf, sb in ((S["cTT"][i], S["sTT"][i], S["hTT"][i], 1.5, .55), (S["cTD"][i], S["sTD"][i], S["hTD"][i], .62, .62)):
            if cn < 2.4:
                n0 = max(8, int((place - 2.6) / dx + sh)); n1 = min(NSEC - 1, int((place + 1.6) / dx + sh) + 1)
                amin = 9.0
                for n in range(n0, n1 + 1):
                    s = (n + .5) * dx - LH; e = s - place
                    a = abs(e) - hw
                    lim = cn + (a * (sf if e > 0 else sb) if a > 0 else 0.0)
                    d = D[n]; df = d - lim
                    d = .5 * (d + lim - math.sqrt(df * df + .012))
                    D[n] = d
                    if d < amin and a < .35: amin = d
                conA.append((max(.0, amin), place + LH))
            else: conA.append((9.0, place + LH))
        cl = min(S["cLI"][i], S["cLD"][i])
        if cl < 2.4:
            amin = 9.0; Lt = NSEC * dx - LH
            for n in range(NSEC - 4, NSEC):
                s = (n + .5) * dx - LH; e = s - (Lt - .45); a = abs(e) - .32
                lim = cl + (a * 2.2 if a > 0 else 0.0)
                d0 = d = D[n]; df = d - lim; d = .5 * (d + lim - math.sqrt(df * df + .012)); D[n] = d
                if d < amin and (not LIPCON or lim < d0): amin = d   # lipcon: only where the lips, not the tongue, bind
            conA.append((max(.0, amin), NSEC * dx - .3))
        else: conA.append((9.0, NSEC * dx - .3))
        A = [PI4 * d * d if d > .012 else 1.1e-4 for d in D]
        vel = S["VEL"][i]; vel = vel if vel > 0 else 0.0
        KF.append(array("d", TB.frame_coefs(A, T, vel + .004, max(0., S["LAT"][i]), piri)))
        # ---- aerodynamics (quasi-static with compliance)
        ga = max(0.0, S["GA"][i])
        lips = A[-1]
        ac = []
        for (dmin, pl) in conA: ac.append(PI4 * dmin * dmin if dmin < 8 else 9.0)
        inv = sum(1 / (a * a + 1e-7) for a in ac) + 1 / (min(lips, 3.0)**2 + 1e-7)
        Ac = 1 / math.sqrt(inv)
        Act = Ac + vel * .9
        Ag = .030 + .03 * bre[i] + ga
        PS = Ps[i]
        Pq = PS * Ag * Ag / (Ag * Ag + Act * Act)
        dUg = Ag * 1324.5 / (2 * math.sqrt(max(60.0, PS - Pio))); dUc = Act * 1324.5 / (2 * math.sqrt(max(60.0, Pio)))
        comp = 6e-3 if ga < .03 else 3.5e-4
        vst = S["VST"][i]
        if vst > 0 and Act < .02: Pq *= 1 - .42 * vst
        tau = comp / (dUg + dUc + 1e-6); dtf = TB.FRAME * T
        tau = max(.0012, min(.16, tau))
        if vst > 0 and Act < .02: tau = max(tau, .030 * vst)
        Pio += (Pq - Pio) * (1 - math.exp(-dtf / tau))
        # transient at release
        if prevAc < .006 and Act >= .006 and Pio > 600: tr_env = ((Pio / 8000.0) ** 1.5 if BURST else math.sqrt(Pio / 8000.0)) * BURSTGAIN   # burst: same pressure law as frication
        prevAc = Act
        tr_env *= math.exp(-dtf / .0030)
        gains = [0.0] * len(sites)
        fr = 0.0; fcut = 6000.0; gbest = 0.0
        for c, (a, (dm, pl)) in enumerate(zip(ac, conA)):
            if a < 1.2:
                share = (1 / (a * a + 1e-7)) / inv
                dP = Pio * share
                amp = (max(0.0, dP / (1 + 8 * vel) - 350.0) / 8000.0) ** 1.5 * math.sqrt(min(a, .35) / .1)
                if a < .0012: amp *= a / .0012
                if c == 0:      # tongue tip
                    if pl - LH > 14.8 and pl - LH < 15.12: ob, fc, trg = 2.1 * SIBGAIN, 4400., .6       # s z
                    elif pl - LH < 14.2: ob, fc, trg = 1.25, 2700., .6                          # sh
                    elif pl - LH < 14.8: ob, fc, trg = .9, 4800., 1.5                           # t d n
                    else: ob, fc, trg = .40, 6000., .3                                          # dh
                    tgt = 15.50 + LH if pl - LH > 14.2 else 15.1 + LH
                elif c == 1: ob, fc, trg = 1.3, 2600., 1.5; tgt = pl + .9
                elif S["cLD"][i] < S["cLI"][i]: ob, fc, trg = 14., 6000., .5; tgt = pl + .15
                else: ob, fc, trg = 1.2, 2000., 1.6; tgt = pl + .15
                g = amp * ob * ((2.2 if 4300 < fc < 4500 else .7) if ga < .08 else 1.0) + tr_env * trg
                if g > gbest: gbest = g; fcut = fc
                x = tgt / dx
                # spread over the two nearest sites
                best = min(range(len(sites)), key=lambda m: abs(sites[m] - x))
                gains[best] += .65 * g
                for m in (best - 1, best + 1):
                    if 0 <= m < len(sites): gains[m] += .22 * g
                fr += g
        fr_mod.append(0.0 if ga > .08 else 1.0); fcs.append(fcut); fhs.append(5000. if 4300 < fcut < 4500 else (1500. if fcut < 2750 and fcut > 2650 else 500.))
        asp_dP = max(0.0, PS - Pio)
        info["Ac"].append(Act); info["Pio"].append(Pio); info["GA"].append(ga); info["fr"].append(fr)
        Agv.append(Ag)
        # ---- per-frame constants
        q15 = 1.5 / T
        hw = q15 / (1500 + q15); Gw = 1 / (1500 + q15)
        cst = []
        for n in range(1, NSEC, 2):
            d = D[n]
            cst.append(1 - min(.06, .0021 / (d if d > .05 else .05)))
        for w in TB.WALLS:
            a = A[w-1]; b = A[w]
            if a < .25: a = .25
            if b < .25: b = .25
            cst.append(Gw * 2.0 * math.sqrt(math.pi * b) * 6.0 * dxp * RC / (a + b))
        Lq = RHO * .30 / T
        Rg = math.sqrt(2 * RHO * max(1500., PS - Pio)) * 1.15
        cst += [hw, Lq, Rg + Lq, 1.0 / T]
        KFr = 480.0 * cfg["Kf"]
        cst += [KFr * g for g in gains]
        cst += [1.0, .5]
        cst += [cfg["wr"] * Gw * 90.0, cfg["hf"]]
        CF.append(array("d", cst))
        if debug is not None and "A" in debug: debugA.append((times[i], A))
    # ------------------------------------------------ source arrays
    N = nf * TB.FRAME
    us = array("d", bytes(8 * N)); ag = array("f", bytes(4 * N)); na = array("f", bytes(4 * N)); nfz = array("f", bytes(4 * N))
    bound = [0] * (nf + 1)
    fl = TB.FRAME
    AV = S["AV"]
    # cumulative time of frame starts = times[]
    def tidx(t):                    # time -> frame index
        lo = int((t - T0) / (Ts[0] * fl * 1.08)); lo = max(0, min(nf - 1, lo))
        while lo < nf - 1 and times[lo + 1] <= t: lo += 1
        return lo
    # note-level loudness arcs: soft attack, small swell, relax toward the end of the syllable
    arc = [0.0] * (nf + 1)
    nucs = [g for g in segs if g["role"] == "nuc"]
    nk = 0
    for i, tt in enumerate(times):
        while nk + 1 < len(nucs) and tt >= nucs[nk + 1]["t0"] - .02: nk += 1
        g = nucs[nk]; d_ = max(.12, g["t1"] - g["t0"]); u = (tt - g["t0"]) / d_
        if tt >= g["t0"] - .02:
            at = min(.13, .35 * d_); z = max(0.0, min(1.0, (tt - g["t0"] + .02) / at)); z = z * z * (3 - 2 * z)
            v = -3.2 * (1 - z)
            if u > .6: w = min(1.0, (u - .6) / .4); v -= 2.2 * w * w
            if d_ > .5: v += 1.3 * math.sin(math.pi * min(1.0, max(0.0, u)) ** .8)
            if g.get("weak"): v -= .8
            else: v += .5
            if nk == len(nucs) - 1 and d_ > 2.3:          # long last notes thin out into breath
                deep = 15.0 if li == 15 else 8.0
                w = max(0.0, min(1.0, (u - .30) / .70)); w = w * w * (3 - 2 * w) * .7 + w * .3
                v -= deep * w
                if u <= 1.02: bre[i] = min(.95, bre[i] + (.50 if li == 15 else .28) * w); ten[i] = max(.05, ten[i] - .18 * w)
            arc[i] = v
    color = None
    u_c = perf.get("_color", {}).get(li, "warm")
    frybias = dict(breaking=1.0, worn=.8, rest=.6, plain=.35, hushed=.3).get(u_c, .12)
    t = T0 + .01; pn = 0; jl = 0.0; sl = 0.0; fi = 0
    endv = t_off
    fry_from = t_off - (.30 if frybias > .5 else .12)
    voiced_gate = []
    Fs = []                          # flow shape for modulating noise
    flow_shape = array("f", bytes(4 * N))
    while t < T1 - .03:
        while fi < nf - 1 and times[fi + 1] <= t: fi += 1
        base = f0[fi]
        jl += .22 * (rnd.gauss(0, 1) - jl); sl += .25 * (rnd.gauss(0, 1) - sl)
        hi = min(1.0, max(0.0, (base - 240) / 130))
        j = cfg["jit"] * (1 + cfg["jhi"] * hi) * (.0026 * rnd.gauss(0, 1) + .0052 * jl)
        sh = cfg["shim"] * (.012 * rnd.gauss(0, 1) + .030 * sl)
        fry = 0.0
        if t > fry_from and frybias > .2: fry = frybias * min(1.0, (t - fry_from) / .2)
        alt = 1 if pn % 2 else -1
        T_0 = 1.0 / base * (1 + j + fry * (.05 * alt + .10))
        # voicing strength
        ga = S["GA"][fi]; pio = info["Pio"][fi]; PS = Ps[fi]
        trans = max(0.0, (PS - pio) / PS)
        gate = 1.0
        if ga > .04: gate = max(0.0, 1 - (ga - .04) / .09); gate = gate * gate * (3 - 2 * gate)
        onset = min(1.0, max(0.0, (t - (t_on - .03)) / .07)); offs = min(1.0, max(0.0, (t_off + .05 - t) / .16))
        if t < t_on - .03 or t > t_off + .05: onset = 0.0
        if REL:
            u = min(1.0, max(0.0, (t - t_fade) / .30)); offs = 1 - u * u * (3 - 2 * u)
            onset = min(1.0, max(0.0, (t - (t_on - .03)) / .07)) if t_on - .03 <= t <= t_off + .10 else 0.0
        lev = 10 ** ((db[fi] + arc[fi]) / 20.0)
        amp = lev * gate * (trans ** 1.2) * AV[fi] * onset * offs * (1 + sh) * (1 - .38 * fry * (1 if alt > 0 else 0))
        loudn = (db[fi] + 1.6 * arc[fi] + 12) / 12
        Rd = 1.12 + .30 * max(0.0, min(1.0, (170 - base) / 45)) - .95 * (ten[fi] - .35) + .75 * (bre[fi] - .30) - .16 * loudn + cfg["rd"]
        Rd += 7.0 * max(0.0, ga - .01) + .55 * (1 - onset) + .5 * (1 - offs) + .05 * sl + .9 * (1 - trans) + .35 * (1 - AV[fi]) - .35 * fry
        Rd = max(.74, min(2.9, Rd))
        r = GL.row(Rd); a_, w_, c_, te, Fte, rk, e_, q_, Fm, tp = r
        Ee = amp * 4.0e5 * cfg["Ks"] * (base / 200.0) ** .15
        scale = Ee * T_0
        # write samples
        tend = t + T_0
        k = fi; tf = t
        n = int(math.ceil((t - times[k]) / Ts[k])) + k * fl
        ex = math.exp; si = math.sin; co = math.cos
        agm = (.045 + .05 * bre[fi] + .05 * min(1.0, lev)) / Fm * min(1.0, amp * 6)
        iT = 1.0 / T_0; iF = 1.0 / Fm
        while True:
            kk = n // fl
            if kk >= nf: break
            tn = times[kk] + (n - kk * fl) * Ts[kk]
            if tn >= tend: break
            u = (tn - t) * iT
            if u < te:
                F = c_ * (ex(a_ * u) * (a_ * si(w_ * u) - w_ * co(w_ * u)) + w_)
            else:
                v = u - te; F = Fte - rk * ((1 - ex(-e_ * v)) / e_ - v * q_)
            if F < 0: F = 0.0 if F > -1e-3 else F
            us[n] = scale * F
            ag[n] = agm * F
            flow_shape[n] = F * iF
            n += 1
        t = tend; pn += 1
    # leak area + noises
    R = rnd.random
    lp1 = lp2 = lp3 = lp4 = lp5 = lp6 = lp7 = 0.0; a4 = 1 - math.exp(-2 * math.pi * 6000 * Ts[0]); hp = 0.0
    a6 = 1 - math.exp(-2 * math.pi * FRLP * Ts[0]) if FRLP else 0.0
    Ka = 4200.0 * cfg["Ka"]; lk_p = None
    for k in range(nf):
        T = Ts[k]; n0 = k * fl; ga = S["GA"][k]; ga = ga if ga > 0 else 0.0
        i0 = inh[k]
        dP = max(0.0, Ps[k] - info["Pio"][k]) / 8000.0
        lev = 10 ** (db[k] / 20.0)
        vo = 1.0 if (t_on - .05 < times[k] < t_off + .12) else 0.0
        if REL:
            ub = min(1.0, max(0.0, (times[k] - t_off) / .35)); vo = (1 - ub * ub * (3 - 2 * ub)) if t_on - .05 < times[k] else 0.0
        dp15 = dP ** 1.5
        leak = .006 + .022 * bre[k] + ga
        # voiced breath noise (pulsing with the flow) + abduction noise
        fade = 1.0
        if times[k] > t_off - .05: fade = max(0.0, 1 - (times[k] - t_off + .05) / .22)
        if REL and times[k] > t_off - .05: fade = max(0.0, 1 - (times[k] - t_off + .05) / .35)
        nv = vo * (.15 + .50 * bre[k]) * (lev ** .55) * .34 * cfg["nv"] * fade
        nu = vo * dp15 * math.sqrt(min(ga, .35) / .2) * .14 * cfg["nu"] if ga > .004 else 0.0
        ni = .085 * i0 * i0
        fm = fr_mod[k]
        a1 = 1 - math.exp(-2 * math.pi * 3400 * T); a2 = 1 - math.exp(-2 * math.pi * fcs[k] * T); cg = .42 / a2; a3 = 1 - math.exp(-2 * math.pi * fhs[k] * T)
        lk = leak * vo + .22 * i0
        if lk_p is None: lk_p = lk
        dlk = (lk - lk_p) / fl; lkc = lk_p; lk_p = lk
        for n in range(n0, n0 + fl):
            F = flow_shape[n]
            w = R() - .5
            lp1 += a1 * (w - lp1); hp += a1 * (lp1 - hp); lp5 += a4 * (hp - lp5)
            na[n] = Ka * lp5 * (nv * (cfg["nm"] + (1-cfg["nm"]) * F) + nu + ni)
            lkc += dlk; ag[n] += lkc
            w = R() - .5
            lp2 += a2 * (w - lp2); lp3 += a2 * (lp2 - lp3); lp4 += a3 * (lp3 - lp4)
            v = cg * (lp3 - lp4) * (1.0 - fm * .65 * (1 - F))
            if FRLP: lp6 += a6 * (v - lp6); lp7 += a6 * (lp6 - lp7); v = lp7
            nfz[n] = v
    # inhaled air: turbulence also at lips/teeth handled by the same glottal/pharyngeal source
    gl = cfg["gload"]
    for i in range(N): ag[i] *= gl
    del flow_shape
    run = TB.make()
    out = array("d")
    NS = TB.nose_static(Ts[0])
    run(KF, CF[:nf], us, ag, na, nfz, NS, out)
    del KF, CF, us, ag, na, nfz
    # ------------------------------------------------ resample to 44.1 kHz on the true clock
    y = resample(out, times, Ts, nf, fl)
    if debug is not None:
        debug.update(times=times, S=S, info=info, areas=debugA, f0=f0, db=db)
    n0 = int(math.ceil(times[0] * SR))
    if cfg["lev"] > 0: y = effort(y, n0, nucs, times, db, arc, cfg["lev"], cfg.get("effhp", 260.0), cfg.get("lref", LREF))
    return n0, y

OPENV = dict(AA=1.2, AE=1.0, AO=.8, AW=1.2, AY=1.2, OY=.6, EH=.6, AH=.6, OW=.2, OH=.2, ER=-.3, EY=0, IH=-.8, UH=-.8, IY=-1.6, UW=-1.6)
LREF = 106.0
def effort(y, n0, nucs, times, db, arc, amount, hp=260.0, lref=LREF):
    """a singer aims at loudness, not at glottal amplitude: correct the vowel-to-vowel level the tract produces (linear, slow)."""
    a = math.exp(-2 * math.pi * hp / SR); px = py = 0.0; e = array("d", [0.0])
    c = 0.0
    for v in y:
        py = a * (py + v - px); px = v; c += py * py; e.append(c)
    pts = []
    T0 = times[0]
    for g in nucs:
        a0 = g["t0"] + min(.05, .25 * (g["t1"] - g["t0"])); b0 = g["t1"] - min(.05, .25 * (g["t1"] - g["t0"]))
        i = max(0, min(len(y), int(a0 * SR) - n0)); j = max(i + 1, min(len(y), int(b0 * SR) - n0))
        Lm = 10 * math.log10((e[j] - e[i]) / (j - i) + 1e-9)
        k0 = max(0, min(len(times) - 1, int((a0 - T0) * 1000 * .985))); k1 = max(k0 + 1, min(len(times) - 1, int((b0 - T0) * 1000 * .985)))
        D = sum(db[k] + arc[k] for k in range(k0, k1)) / (k1 - k0) + OPENV.get(g["ph"], 0)
        er = (D + lref) - Lm
        pts.append((a0, b0, max(-12.0, min(12.0, er)) * amount))
    # absolute offset kept: the same LREF serves every line
    out = array("d"); ap = out.append; q = 0; n = len(pts); gp = None
    for m in range(0, len(y), 64):
        t = (n0 + m) / SR
        while q + 1 < n and t > pts[q + 1][0]: q += 1
        a0, b0, gv = pts[q]
        if t <= b0 or q == n - 1: gd = gv
        else:
            a1, _, g1 = pts[q + 1]; u = (t - b0) / max(1e-3, a1 - b0); u = min(1.0, max(0.0, u)); u = u * u * (3 - 2 * u); gd = gv + (g1 - gv) * u
        lin = 10 ** (gd / 20)
        if gp is None: gp = lin
        d = (lin - gp) / 64; gg = gp
        for v in y[m:m + 64]:
            gg += d; ap(v * gg)
        gp = lin
    return out

_KER = None
HALF = 26; PH = 256
def kernel(fc=19500.0 / 95000.0 * 2):
    global _KER
    if _KER is None: _KER = {}
    fc = round(fc, 4)
    if fc not in _KER:
        out_ = []
        for p in range(PH + 1):
            fr = p / PH; row = []
            for m in range(-HALF + 1, HALF + 1):
                x = m - fr
                s = fc if abs(x) < 1e-9 else math.sin(math.pi * fc * x) / (math.pi * x)
                z = x / (HALF + .5); w = .42 + .5 * math.cos(math.pi * z) + .08 * math.cos(2 * math.pi * z) if abs(z) < 1 else 0.0
                row.append(s * w)
            g = sum(row); out_.append([v / g for v in row])
        _KER[fc] = out_
    return _KER[fc]

def resample(x, times, Ts, nf, fl):
    ker = kernel(2 * 19500.0 * Ts[0]); n0 = int(math.ceil(times[0] * SR)); n1 = int(times[nf] * SR) - 1
    pad = array("d", bytes(8 * HALF)); x = pad + x + pad
    out = array("d"); k = 0; ap = out.append
    try:
        sp = math.sumprod
    except AttributeError:
        sp = lambda a, b: sum(map(mul, a, b))
    for n in range(n0, n1 + 1):
        t = n / SR
        while k < nf - 1 and times[k + 1] <= t: k += 1
        pos = k * fl + (t - times[k]) / Ts[k]
        i = int(pos); p = int((pos - i) * PH + .5)
        seg = x[i + 1: i + 1 + 2 * HALF]
        if len(seg) < 2 * HALF: break
        ap(sp(seg, ker[p]))
    return out
