"""render.py - plays arrange.py. `nice -n 10 concert-band [harp strings whistle other]`
writes build/stem_harp.wav stem_strings.wav stem_whistle.wav stem_other.wav (dry, placed, all at the same scale) and build/band.wav (stems + chapel)."""

import array
import json
import math
import multiprocessing as mp
import os
import sys
import time
from pathlib import Path

from concert import ROOT
from concert.band import arrange as A
from concert.band import bowed, harp, other, whistle
from concert.band.dsp import *

N = int(A.TOTAL * SR)
# the whole piece is raised SHIFT semitones from the original key (key.json). Decisions that depend on the key (which notes rub, which are bass)
# are taken in the original key; only the sound is made at the new pitch.
SHIFT = int(
    os.environ.get(
        "BIDE_SHIFT",
        json.loads(Path(os.path.join(ROOT, "key.json")).read_text())["shift"],
    )
)
harp.SYM = [m + SHIFT for m in harp.SYM]
DRONE_NOTES = tuple(
    (m + SHIFT, lev) for m, lev in ((51, 1.0), (51.035, 0.8), (39, 0.55), (46.02, 0.22))
)
BUILD = os.path.join(ROOT, "build")
# relative stem levels (linear)
LEVEL = {"harp": 0.30, "strings": 0.30, "whistle": 0.11, "other": 0.10}


def zeros(n):
    """A silent buffer of `n` float samples."""
    return array.array("d", bytes(8 * n))


def add(dst, src, at, g):
    """Add `src`, scaled by `g`, into `dst` from sample `at`, clipping at both ends."""
    if at < 0:
        src = src[-at:]
        at = 0
    n = min(len(src), len(dst) - at)
    if n > 0:
        dst[at : at + n] = array.array(
            "d", [a + g * b for a, b in zip(dst[at : at + n], src)]
        )


def f32(x):
    """`x` as an array of 32-bit floats."""
    return array.array("f", x)


# ------------------------------------------------------------------ harp
def harp_notes():
    """The harp notes of the arrangement as synthesis jobs, with damping where the next bass note falls."""
    ev = sorted(A.harp)
    out = []
    damp = [(t, m % 12) for t, m, v, k, r in ev if m <= 50] + [
        (n["t"], n["midi"] % 12)
        for L in A.sc["lines"]
        for s in L["syl"]
        for n in s["notes"]
        if n["d"] >= 0.7
    ]
    damp += [
        (n["t"], n["m"] % 12) for p in A.strings for n in p["notes"] if n["d"] > 0.8
    ]
    damp.sort()
    chrom = {1, 6, 9, 11}  # Db Gb A Cb(B): not in the scale
    for i, (t, m, v, kind, ring) in enumerate(ev):
        d = 6.0 if kind == "harm" else 5.5 if m < 63 else 5.0
        if ring:
            d = ring
        for t2, m2, v2, k2, r2 in ev[i + 1 :]:
            x = t2 - t
            if x > d:
                break
            if x < 0.10:
                continue
            pc = abs((m - m2) % 12)
            pc = min(pc, 12 - pc)
            if m2 == m:
                d = x - 0.012
                break
            if m <= 50 and m2 <= 50:
                d = x + 0.05
                break  # one bass at a time
            if x > 0.28 and abs(m - m2) == 1:
                d = x + 0.03
                break
            if x > 0.28 and pc == 1 and ((m % 12) in chrom or (m2 % 12) in chrom):
                d = x + 0.03
                break
            if x > 2.2 and abs(m - m2) <= 2 and m < 72:
                d = x + 0.10
                break
        if (
            m >= 51 and kind != "harm"
        ):  # the hand lies flat on whatever would rub against the new harmony
            for t2, pc2 in damp:
                if t + 0.12 < t2 < t + d and (m - pc2) % 12 in (1, 11):
                    d = t2 - t + 0.06
                    break
        out.append((t, m, v, max(0.10, d), kind, 100 + i))
    return out


def _harp_note(a):
    t, m, v, d, kind, seed = a
    pre, x = harp.pluck(m + SHIFT, v, d, seed, kind)
    return t, m, pre, f32(x)


def _harp_body(a):
    i, force, _weight = a
    x = list(force)
    L, R = harp.radiate(x)
    sL, sR = harp.sympathetic(x)
    k = 0.9
    return (
        i,
        f32([p + k * q for p, q in zip(L, sL)]),
        f32([p + k * q for p, q in zip(R, sR)]),
    )


def do_harp(pool):
    """Render the harp stem as (left, right)."""
    bus = [zeros(N), zeros(N)]  # low hand / high hand
    for t, m, pre, x in pool.imap_unordered(_harp_note, harp_notes(), 4):
        w = min(1.0, max(0.0, (m - 46) / 26.0))
        at = int(t * SR) - pre
        add(bus[0], x, at, math.cos(w * math.pi / 2))
        add(bus[1], x, at, math.sin(w * math.pi / 2))
    L = zeros(N)
    R = zeros(N)
    seg = 15 * SR
    tail = 5 * SR
    jobs = []
    for b in (0, 1):
        for s in range(0, N, seg):
            jobs.append(((b, s), f32(list(bus[b][s : s + seg]) + [0.0] * tail), 0))
    for (b, s), l, r in pool.imap_unordered(_harp_body, jobs):
        p = (-0.30, 0.12)[b]
        gl = math.cos((p + 1) * math.pi / 4) * 1.35
        gr = math.sin((p + 1) * math.pi / 4) * 1.35
        add(L, l, s, gl)
        add(R, r, s, gr)
    return L, R


# ------------------------------------------------------------------ strings
SEAT = {"B": 0.42, "T": 0.16, "A": -0.20, "S": -0.46}


def _bow(a):
    pi, pl, ph = a
    ph = dict(ph, notes=[dict(n, m=n["m"] + SHIFT) for n in ph["notes"]])
    seed = 1000 + 37 * pi + 7 * pl
    solo = ph["players"] == 1
    t0 = ph["notes"][0]["t"] - 0.30
    t1 = max(n["t"] + n["d"] for n in ph["notes"]) + 0.25
    ctl = bowed.controls(
        ph["notes"], t0, t1, seed, ph["kind"], 1.2 if not solo else 0.75
    )
    x = bowed.bow_string(ctl, seed=seed, noise=0.03 if solo else 0.052)
    x = bowed.bow_light(x, ctl, seed)
    x += [0.0] * int(0.4 * SR)
    # the player's seat (and instrument) is fixed for the whole song
    y = bowed.radiate(x, ph["kind"], 50 + 10 * "BTAS".index(ph["part"]) + pl)
    g = ph["gain"] * (1.0 if solo else 0.80 if ph["players"] == 2 else 0.66)
    n = int(0.02 * SR)
    e = len(y)
    for k in range(n):
        y[k] *= k / n
        y[e - 1 - k] *= k / n
    return pi, pl, t0, f32([v * g for v in y])


def do_strings(pool):
    """Render the strings stem as (left, right), each player seated across the stage."""
    L = zeros(N)
    R = zeros(N)
    jobs = [(i, p, ph) for i, ph in enumerate(A.strings) for p in range(ph["players"])]
    jobs.sort(key=lambda j: -(j[2]["notes"][-1]["t"] - j[2]["notes"][0]["t"]))
    for pi, pl, t0, y in pool.imap_unordered(_bow, jobs):
        ph = A.strings[pi]
        pan = SEAT[ph["part"]] + (pl - (ph["players"] - 1) / 2) * 0.13
        a = (pan + 1) * math.pi / 4
        at = int(t0 * SR)
        d = int(pan * 13)  # seat: level + a few samples of time
        add(L, y, at + max(0, d), math.cos(a))
        add(R, y, at + max(0, -d), math.sin(a))
    return L, R


# ------------------------------------------------------------------ whistle / other
def _whis(a):
    i, ph = a
    ph = [dict(n, m=n["m"] + SHIFT) for n in ph]
    t0 = ph[0]["t"] - 0.25
    t1 = ph[-1]["t"] + ph[-1]["d"] + 0.2
    c = whistle.controls(ph, t0, t1, 70 + i)
    y = whistle.play(c, 70 + i)
    n = 800
    for k in range(n):
        y[k] *= k / n
        y[-1 - k] *= k / n
    return t0, f32(y)


def do_whistle(pool):
    """Render the whistle stem as (left, right)."""
    L = zeros(N)
    R = zeros(N)
    for t0, y in pool.imap(_whis, list(enumerate(A.whistle))):
        add(L, y, int(t0 * SR), math.cos(0.56 * math.pi / 2 * 1.0))
        add(R, y, int(t0 * SR) + 4, math.sin(0.56 * math.pi / 2))
    return L, R


def _drone(d):
    sh = d["shape"]
    return d["t0"], f32(
        other.drone(
            d["t1"] - d["t0"],
            d["seed"],
            notes=DRONE_NOTES,
            env=lambda t: interp(sh, t) * d["peak"],
        )
    )


def do_other(pool):
    """Render the far-off pipes and footfalls as (left, right)."""
    L = zeros(N)
    R = zeros(N)
    for t0, y in pool.imap(_drone, A.drones):
        add(L, y, int(t0 * SR), 0.40 * A.DRONE)
        add(
            R, y, int(t0 * SR) + 330, 0.62 * A.DRONE
        )  # from over the hill, off to the right
    for k, (t, w) in enumerate(A.feet):
        y = other.footfall(w, 900 + k)
        at = int((t - 0.012) * SR)
        add(L, y, at, 1.35 * (1.04 if k % 2 else 0.96))
        add(R, y, at, 1.35 * (0.96 if k % 2 else 1.04))
    return L, R


def main() -> None:
    """Render the named stems (all by default) to build/stem_<name>.wav and their events to build/events.json."""
    which = sys.argv[1:] or ["harp", "strings", "whistle", "other"]
    t00 = time.time()
    with mp.Pool(2) as pool:
        for w in which:
            t = time.time()
            L, R = {
                "harp": do_harp,
                "strings": do_strings,
                "whistle": do_whistle,
                "other": do_other,
            }[w](pool)
            pk = max(max(L), -min(L), max(R), -min(R))
            g = LEVEL[w]
            cl = write_wav(os.path.join(BUILD, f"stem_{w}.wav"), [L, R], g)
            print(
                f"{w!s:<8} {time.time() - t:.1f}s raw peak {pk:.3f} -> {pk * g:.3f} clipped {cl:d}",
                flush=True,
            )
    Path(os.path.join(BUILD, "events.json")).write_text(
        json.dumps(
            {
                "footfalls": [round(t, 3) for t, _ in A.feet],
                "whistle": [
                    [round(n["t"], 3), round(n["d"], 3), n["m"]]
                    for p in A.whistle
                    for n in p
                ],
                "harp": [
                    [round(x[0], 3), x[1], round(x[2], 2), x[4]] for x in harp_notes()
                ],
            }
        )
    )
    print(f"total {time.time() - t00:.1f}s")
