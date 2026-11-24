"""fit.py - fit articulator settings so that the tube resonances match target formants of a 16.3 cm tract.
Writes voice/shapes.json.   python3 voice/fit.py"""
import json, math, os, random, sys
from multiprocessing import Pool
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import tract as T

# name: (targets F1..F3[,F4], prior posture)
def P(J, X, Y, LA, LP, TR=0., TT=0., BP=13.6, LH=0., EP=0.):
    return dict(J=J, X=X, Y=Y, TR=TR, TT=TT, BP=BP, LA=LA, LP=LP, LH=LH, EP=EP)
TG = {
 "IY": ((330, 2370, 3040, 3650), P(.12, .95, .20, 1.15, -.30, .35)),
 "IH": ((430, 2050, 2740, 3600), P(.25, .55, .15, 1.15, -.15, .15)),
 "EY": ((480, 2100, 2740, 3600), P(.28, .60, .10, 1.2, -.15, .15)),
 "EH": ((610, 1880, 2680, 3600), P(.45, .40, -.10, 1.4, -.05)),
 "AE": ((755, 1750, 2580, 3600), P(.70, .35, -.30, 1.7, -.15)),
 "A":  ((800, 1310, 2600, 3600), P(.75, -.30, -.30, 1.7, 0.)),
 "AA": ((790, 1180, 2600, 3600), P(.75, -.60, -.20, 1.6, 0.)),
 "AO": ((605, 930, 2560, 3500), P(.60, -.60, .10, 1.15, .30)),
 "OR": ((510, 900, 2500, 3450), P(.40, -.50, .30, .85, .45)),
 "AH": ((690, 1280, 2580, 3550), P(.50, -.30, .0, 1.35, 0.)),
 "AX": ((520, 1480, 2600, 3550), P(.30, .0, .05, 1.1, 0.)),
 "UH": ((460, 1100, 2460, 3500), P(.28, -.10, .40, .85, .25)),
 "UW": ((370, 1060, 2420, 3450), P(.15, .25, .65, .62, .60)),
 "O":  ((525, 940, 2520, 3450), P(.40, -.40, .40, .80, .50)),
 "ER": ((500, 1440, 1790, 3350), P(.25, .25, .0, .85, .40, 0., .85, 12.4)),
 "R":  ((400, 1200, 1620, 3300), P(.18, .20, .10, .70, .50, 0., .95, 12.5)),
 "L":  ((380, 1150, 2650, 3500), P(.25, -.20, .20, 1.15, 0., 0.)),
 "LD": ((460, 920, 2620, 3600), P(.35, -.50, .30, 1.1, .05, 0.)),
 "W":  ((340, 800, 2420, 3400), P(.12, -.15, .80, .45, .75)),
 "Y":  ((300, 2450, 3150, 3650), P(.08, 1.0, .20, 1.05, -.25, .35)),
}
SC = dict(J=.25, X=.35, Y=.35, TR=.35, LA=.35, LP=.30, TT=.30, BP=.8, LH=.3, EP=.10)
LIM = dict(J=(.02, 1.0), X=(-1.15, 1.25), Y=(-.7, 1.1), TR=(-.55, .8), LA=(.40, 2.8), LP=(-.45, 1.0), TT=(0, 1.35), BP=(11.2, 14.2), LH=(-.4, .5), EP=(-.18, .25))

def cost(v, keys, name):
    tg, pr = TG[name]
    a = dict(pr); pen = 0.0
    for k, x in zip(keys, v):
        lo, hi = LIM[k]
        if x < lo: pen += ((lo - x) / SC[k])**2 * 4; x = lo
        if x > hi: pen += ((x - hi) / SC[k])**2 * 4; x = hi
        a[k] = x; pen += (.05 if k == "J" else .022) * ((x - pr[k]) / SC[k])**2
    A, dx = T.areas(a)
    F = T.formants(A, dx, n=5, step=40.0, fmax=4600)
    if len(F) < 4: return 60 + pen
    w = (320, 260, 130, 22)
    c = 0.0
    for (f, b, h), t, ww in zip(F, tg, w): c += ww * math.log(f / t)**2 * 1.0
    return c * 10 + pen

def neldermead(fn, x0, step, it=420):
    n = len(x0); S = [list(x0)]
    for i in range(n):
        y = list(x0); y[i] += step[i]; S.append(y)
    V = [fn(s) for s in S]
    for _ in range(it):
        o = sorted(range(n + 1), key=lambda i: V[i]); S = [S[i] for i in o]; V = [V[i] for i in o]
        if V[-1] - V[0] < 1e-6: break
        c = [sum(s[j] for s in S[:-1]) / n for j in range(n)]
        r = [2*c[j] - S[-1][j] for j in range(n)]; vr = fn(r)
        if vr < V[0]:
            e = [3*c[j] - 2*S[-1][j] for j in range(n)]; ve = fn(e)
            if ve < vr: S[-1], V[-1] = e, ve
            else: S[-1], V[-1] = r, vr
        elif vr < V[-2]: S[-1], V[-1] = r, vr
        else:
            k = [.5*(c[j] + S[-1][j]) for j in range(n)]; vk = fn(k)
            if vk < V[-1]: S[-1], V[-1] = k, vk
            else:
                for i in range(1, n + 1):
                    S[i] = [.5*(S[i][j] + S[0][j]) for j in range(n)]; V[i] = fn(S[i])
    i = min(range(n + 1), key=lambda i: V[i]); return S[i], V[i]

def job(name):
    tg, pr = TG[name]; rnd = random.Random(hash(name) & 0xffff)
    keys = ["J", "X", "Y", "TR", "LA", "LP"]
    if name in ("ER", "R"): keys += ["TT", "BP"]
    if name in ("IY", "Y", "AO", "OR", "UW", "O", "W"): keys += ["LH"]
    best = None
    for tr in range(5):
        x0 = [pr[k] + (rnd.gauss(0, .5) * SC[k] if tr else 0) for k in keys]
        x, v = neldermead(lambda q: cost(q, keys, name), x0, [SC[k] * .6 for k in keys])
        if best is None or v < best[1]: best = (x, v)
    a = dict(pr)
    for k, x in zip(keys, best[0]): a[k] = max(LIM[k][0], min(LIM[k][1], x))
    A, dx = T.areas(a); F = T.formants(A, dx, n=5, step=20.0)
    return name, a, best[1], [(round(f), round(b), round(h, 1)) for f, b, h in F]

if __name__ == "__main__":
    names = sys.argv[1:] or list(TG)
    path = os.path.join(HERE, "shapes.json")
    out = json.load(open(path)) if os.path.exists(path) and sys.argv[1:] else {}
    with Pool(2) as p:
        for name, a, v, F in p.imap_unordered(job, names):
            out[name] = dict(art={k: round(x, 4) for k, x in a.items()}, F=F, target=TG[name][0], cost=round(v, 4))
            print("%-3s cost %.3f  tgt %s  got %s\n      %s" % (name, v, TG[name][0], [f[:2] for f in F], {k: round(x, 2) for k, x in a.items()}))
    json.dump(out, open(path, "w"), indent=1, sort_keys=True)
