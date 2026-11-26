"""render.py - plays arrange.py. `nice -n 10 python3 band/render.py [harp strings whistle other]`
writes build/stem_harp.wav stem_strings.wav stem_whistle.wav stem_other.wav (dry, placed, all at the same scale) and build/band.wav (stems + chapel)."""
import array, json, math, multiprocessing as mp, os, random, sys, time
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE); sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(ROOT, "mix"))
from dsp import *
import arrange as A, harp, bowed, whistle, other
N = int(A.TOTAL * SR)
# the whole piece is raised SHIFT semitones from the original key (key.json). Decisions that depend on the key (which notes rub, which are bass)
# are taken in the original key; only the sound is made at the new pitch.
SHIFT = int(os.environ.get("BIDE_SHIFT", json.load(open(os.path.join(ROOT, "key.json")))["shift"]))
harp.SYM = [m + SHIFT for m in harp.SYM]
DRONE_NOTES = tuple((m + SHIFT, lev) for m, lev in ((51, 1.0), (51.035, .8), (39, .55), (46.02, .22)))
BUILD = os.path.join(ROOT, "build")
# relative stem levels (linear)
LEVEL = dict(harp=.30, strings=.30, whistle=.11, other=.10)

def zeros(n): return array.array("d", bytes(8 * n))
def add(dst, src, at, g):
    if at < 0: src = src[-at:]; at = 0
    n = min(len(src), len(dst) - at)
    if n > 0: dst[at:at+n] = array.array("d", [a + g * b for a, b in zip(dst[at:at+n], src)])
def f32(x): return array.array("f", x)

# ------------------------------------------------------------------ harp
def harp_notes():
    ev = sorted(A.harp); out = []
    damp = [(t, m % 12) for t, m, v, k, r in ev if m <= 50] + [(n["t"], n["midi"] % 12) for L in A.sc["lines"] for s in L["syl"] for n in s["notes"] if n["d"] >= .7]
    damp += [(n["t"], n["m"] % 12) for p in A.strings for n in p["notes"] if n["d"] > .8]; damp.sort()
    chrom = {1, 6, 9, 11}                                   # Db Gb A Cb(B): not in the scale
    for i, (t, m, v, kind, ring) in enumerate(ev):
        d = 6.0 if kind == "harm" else 5.5 if m < 63 else 5.0
        if ring: d = ring
        for t2, m2, v2, k2, r2 in ev[i+1:]:
            x = t2 - t
            if x > d: break
            if x < .10: continue
            pc = abs((m - m2) % 12); pc = min(pc, 12 - pc)
            if m2 == m: d = x - .012; break
            if m <= 50 and m2 <= 50: d = x + .05; break      # one bass at a time
            if x > .28 and abs(m - m2) == 1: d = x + .03; break
            if x > .28 and pc == 1 and ((m % 12) in chrom or (m2 % 12) in chrom): d = x + .03; break
            if x > 2.2 and abs(m - m2) <= 2 and m < 72: d = x + .10; break
        if m >= 51 and kind != "harm":                        # the hand lies flat on whatever would rub against the new harmony
            for t2, pc2 in damp:
                if t + .12 < t2 < t + d and (m - pc2) % 12 in (1, 11): d = t2 - t + .06; break
        out.append((t, m, v, max(.10, d), kind, 100 + i))
    return out
def _harp_note(a):
    t, m, v, d, kind, seed = a
    pre, x = harp.pluck(m + SHIFT, v, d, seed, kind)
    return t, m, pre, f32(x)
def _harp_body(a):
    i, force, weight = a
    x = list(force); L, R = harp.radiate(x); sL, sR = harp.sympathetic(x)
    k = .9
    return i, f32([p + k * q for p, q in zip(L, sL)]), f32([p + k * q for p, q in zip(R, sR)])
def do_harp(pool):
    bus = [zeros(N), zeros(N)]                              # low hand / high hand
    for t, m, pre, x in pool.imap_unordered(_harp_note, harp_notes(), 4):
        w = min(1.0, max(0.0, (m - 46) / 26.0)); at = int(t * SR) - pre
        add(bus[0], x, at, math.cos(w * math.pi / 2)); add(bus[1], x, at, math.sin(w * math.pi / 2))
    L = zeros(N); R = zeros(N); seg = 15 * SR; tail = 5 * SR; jobs = []
    for b in (0, 1):
        for s in range(0, N, seg): jobs.append(((b, s), f32(list(bus[b][s:s+seg]) + [0.0] * tail), 0))
    for (b, s), l, r in pool.imap_unordered(_harp_body, jobs):
        p = (-.30, .12)[b]; gl = math.cos((p + 1) * math.pi / 4) * 1.35; gr = math.sin((p + 1) * math.pi / 4) * 1.35
        add(L, l, s, gl); add(R, r, s, gr)
    return L, R

# ------------------------------------------------------------------ strings
SEAT = dict(B=.42, T=.16, A=-.20, S=-.46)
def _bow(a):
    pi, pl, ph = a
    ph = dict(ph, notes=[dict(n, m=n["m"] + SHIFT) for n in ph["notes"]])
    seed = 1000 + 37 * pi + 7 * pl; solo = ph["players"] == 1
    t0 = ph["notes"][0]["t"] - .30; t1 = max(n["t"] + n["d"] for n in ph["notes"]) + .25
    ctl = bowed.controls(ph["notes"], t0, t1, seed, ph["kind"], 1.2 if not solo else .75)
    x = bowed.bow_string(ctl, seed=seed, noise=.03 if solo else .052)
    x = bowed.bow_light(x, ctl, seed)
    x += [0.0] * int(.4 * SR)
    # the player's seat (and instrument) is fixed for the whole song
    y = bowed.radiate(x, ph["kind"], 50 + 10 * "BTAS".index(ph["part"]) + pl)
    g = ph["gain"] * (1.0 if solo else .80 if ph["players"] == 2 else .66)
    n = int(.02 * SR); e = len(y)
    for k in range(n): y[k] *= k / n; y[e-1-k] *= k / n
    return pi, pl, t0, f32([v * g for v in y])
def do_strings(pool):
    L = zeros(N); R = zeros(N); jobs = [(i, p, ph) for i, ph in enumerate(A.strings) for p in range(ph["players"])]
    jobs.sort(key=lambda j: -(j[2]["notes"][-1]["t"] - j[2]["notes"][0]["t"]))
    for pi, pl, t0, y in pool.imap_unordered(_bow, jobs):
        ph = A.strings[pi]; pan = SEAT[ph["part"]] + (pl - (ph["players"] - 1) / 2) * .13
        a = (pan + 1) * math.pi / 4; at = int(t0 * SR); d = int(pan * 13)      # seat: level + a few samples of time
        add(L, y, at + max(0, d), math.cos(a)); add(R, y, at + max(0, -d), math.sin(a))
    return L, R

# ------------------------------------------------------------------ whistle / other
def _whis(a):
    i, ph = a; ph = [dict(n, m=n["m"] + SHIFT) for n in ph]; t0 = ph[0]["t"] - .25; t1 = ph[-1]["t"] + ph[-1]["d"] + .2
    c = whistle.controls(ph, t0, t1, 70 + i); y = whistle.play(c, 70 + i); n = 800
    for k in range(n): y[k] *= k / n; y[-1-k] *= k / n
    return t0, f32(y)
def do_whistle(pool):
    L = zeros(N); R = zeros(N)
    for t0, y in pool.imap(_whis, list(enumerate(A.whistle))):
        add(L, y, int(t0 * SR), math.cos(.56 * math.pi / 2 * 1.0)); add(R, y, int(t0 * SR) + 4, math.sin(.56 * math.pi / 2))
    return L, R
def _drone(d):
    sh = d["shape"]; return d["t0"], f32(other.drone(d["t1"] - d["t0"], d["seed"], notes=DRONE_NOTES, env=lambda t: interp(sh, t) * d["peak"]))
def do_other(pool):
    L = zeros(N); R = zeros(N)
    for t0, y in pool.imap(_drone, A.drones):
        add(L, y, int(t0 * SR), .40 * A.DRONE); add(R, y, int(t0 * SR) + 330, .62 * A.DRONE)        # from over the hill, off to the right
    for k, (t, w) in enumerate(A.feet):
        y = other.footfall(w, 900 + k); at = int((t - .012) * SR)
        add(L, y, at, 1.35 * (1.04 if k % 2 else .96)); add(R, y, at, 1.35 * (.96 if k % 2 else 1.04))
    return L, R

if __name__ == "__main__":
    which = sys.argv[1:] or ["harp", "strings", "whistle", "other"]
    t00 = time.time()
    with mp.Pool(2) as pool:
        for w in which:
            t = time.time(); L, R = dict(harp=do_harp, strings=do_strings, whistle=do_whistle, other=do_other)[w](pool)
            pk = max(max(L), -min(L), max(R), -min(R)); g = LEVEL[w]
            cl = write_wav(os.path.join(BUILD, "stem_%s.wav" % w), [L, R], g)
            print("%-8s %.1fs raw peak %.3f -> %.3f clipped %d" % (w, time.time() - t, pk, pk * g, cl), flush=True)
    json.dump(dict(footfalls=[round(t, 3) for t, _ in A.feet], whistle=[[round(n["t"], 3), round(n["d"], 3), n["m"]] for p in A.whistle for n in p],
                   harp=[[round(x[0], 3), x[1], round(x[2], 2), x[4]] for x in harp_notes()]), open(os.path.join(HERE, "events.json"), "w"))
    print("total %.1fs" % (time.time() - t00))
