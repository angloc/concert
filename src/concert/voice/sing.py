"""sing.py - a singing voice from a physical model of the vocal tract. Pure standard library.
concert-sing --lines 0,1,6 --out build/ex.wav
concert-sing --all --out build/voice.wav
"""

import argparse
import array
import contextlib
import json
import math
import os
import time
import wave
from multiprocessing import Pool
from pathlib import Path

from concert import ROOT
from concert.diction import singer as SG
from concert.performance import perform as PF
from concert.voice import engine as EN
from concert.voice import persona as PS

SR = EN.SR


def load(persona=False):
    """The performance from build/, with its tracks as arrays; shaped by the personas when `persona` is set."""
    p = os.path.join(ROOT, "build", "perf.json")
    if not os.path.exists(p):
        PF.main()
    perf = json.loads(Path(p).read_text())
    sc = json.loads(Path(os.path.join(ROOT, "build", "score.json")).read_text())
    for k in ("f0", "db", "tension", "breath"):
        perf[k] = array.array("d", perf[k])
    if persona:
        PS.shape_perf(perf)
    perf["_color"] = {L["i"]: L["color"] for L in sc["lines"]}
    perf["_dyn"] = {L["i"]: L["dyn"] for L in sc["lines"]}
    return perf


_P = None


def job(a):
    """Render one line in a worker process: (line, first sample, samples, seconds taken)."""
    global _P
    li, cfg = a
    if _P is None:
        _P = load(bool(cfg.get("persona")))
    if cfg.get("persona"):
        user = {k: v for k, v in cfg.items() if k != "persona"}
        cfg = PS.line_cfg(li, user)
    with contextlib.suppress(OSError):
        os.nice(10)
    t = time.time()
    n0, y = EN.render_line(_P, li, cfg)
    y = EN_post(y, (cfg or {}).get("mic", 0))
    return li, n0, y, time.time() - t


def EN_post(y, fem=0):
    """microphone: 2nd-order high-pass at 70 Hz, a light close-mic shelf, gentle top softening."""

    def biq(x, b0, b1, b2, a1, a2):
        x1 = x2 = y1 = y2 = 0.0
        o = array.array("d")
        for v in x:
            z = b0 * v + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
            x2 = x1
            x1 = v
            y2 = y1
            y1 = z
            o.append(z)
        return o

    def hp(f, q):
        w = 2 * math.pi * f / SR
        c = math.cos(w)
        al = math.sin(w) / (2 * q)
        a0 = 1 + al
        return (
            (1 + c) / 2 / a0,
            -(1 + c) / a0,
            (1 + c) / 2 / a0,
            -2 * c / a0,
            (1 - al) / a0,
        )

    def shelf(f, g, low):
        A = 10 ** (g / 40)
        w = 2 * math.pi * f / SR
        c = math.cos(w)
        s = math.sin(w)
        al = s / 2 * math.sqrt(2)
        r = 2 * math.sqrt(A) * al
        if low:
            a0 = (A + 1) + (A - 1) * c + r
            return (
                A * ((A + 1) - (A - 1) * c + r) / a0,
                2 * A * ((A - 1) - (A + 1) * c) / a0,
                A * ((A + 1) - (A - 1) * c - r) / a0,
                -2 * ((A - 1) + (A + 1) * c) / a0,
                ((A + 1) + (A - 1) * c - r) / a0,
            )
        a0 = (A + 1) - (A - 1) * c + r
        return (
            A * ((A + 1) + (A - 1) * c + r) / a0,
            -2 * A * ((A - 1) + (A + 1) * c) / a0,
            A * ((A + 1) + (A - 1) * c - r) / a0,
            2 * ((A - 1) - (A + 1) * c) / a0,
            ((A + 1) - (A - 1) * c - r) / a0,
        )

    def lp(f, q):
        w = 2 * math.pi * f / SR
        c = math.cos(w)
        al = math.sin(w) / (2 * q)
        a0 = 1 + al
        return (
            (1 - c) / 2 / a0,
            (1 - c) / a0,
            (1 - c) / 2 / a0,
            -2 * c / a0,
            (1 - al) / a0,
        )

    y = biq(y, *lp(11000, 0.62))
    y = biq(y, *hp(75, 0.7))
    y = biq(y, *(shelf(330, 1.4, True) if fem else shelf(260, 3.2, True)))
    return y


def render(lines, cfg=None, workers=2):
    """Render `lines` with settings `cfg`, in up to two processes; returns line -> job result."""
    if len(lines) == 1 or workers == 1:
        res = [job((l, cfg)) for l in lines]
    else:
        with Pool(min(workers, len(lines), 2)) as p:
            res = list(p.imap_unordered(job, [(l, cfg) for l in lines]))
    return {r[0]: r for r in res}


def write(path, y, peak_db=-3.0):
    """Write `y` to a 16-bit mono WAV at `path`, normalised to `peak_db`."""
    pk = max(max(y), -min(y)) or 1.0
    g = 10 ** (peak_db / 20) / pk
    d = os.path.dirname(os.path.abspath(path))
    os.makedirs(d, exist_ok=True)
    a = array.array("h", (int(max(-1, min(1, v * g)) * 32767) for v in y))
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(a.tobytes())


def main() -> None:
    """Command line: concert-sing (--lines L,... | --all) --out file.wav [options]."""
    ap = argparse.ArgumentParser()
    ap.add_argument("--lines")
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--out", required=True)
    ap.add_argument("--cfg", default="{}")
    ap.add_argument("--persona", action="store_true")
    ap.add_argument("--singer")
    ap.add_argument("--xpose", type=float)
    ap.add_argument("--workers", type=int, default=2)
    a = ap.parse_args()
    t = time.time()
    cfg = json.loads(a.cfg)
    if a.persona:
        cfg["persona"] = 1
    if a.singer and not a.persona:
        cfg = dict(SG.load(a.singer), **cfg)
    if a.xpose is not None:
        cfg["xpose"] = a.xpose
    perf = load(a.persona)
    if a.all:
        R = render(list(range(16)), cfg, a.workers)
        y = array.array("d", bytes(8 * math.ceil(perf["total"] * SR)))
        for li, n0, s, dt in R.values():
            for i, v in enumerate(s):
                k = n0 + i
                if 0 <= k < len(y):
                    y[k] += v
    else:
        ls = [int(x) for x in a.lines.split(",")]
        R = render(sorted(set(ls)), cfg, a.workers)
        y = array.array("d")
        i = 0
        while i < len(ls):
            j = i
            while j + 1 < len(ls) and ls[j + 1] == ls[j] + 1:
                j += 1
            n0 = min(R[l][1] for l in ls[i : j + 1])
            n1 = max(R[l][1] + len(R[l][2]) for l in ls[i : j + 1])
            blk = array.array("d", bytes(8 * (n1 - n0)))
            for l in ls[i : j + 1]:
                o = R[l][1] - n0
                for k, v in enumerate(R[l][2]):
                    blk[o + k] += v
            y += blk
            if j + 1 < len(ls):
                y += array.array("d", bytes(8 * int(0.25 * SR)))
            i = j + 1
    write(a.out, y)
    print(f"wrote {a.out}  {len(y) / SR:.2f} s  in {time.time() - t:.1f} s")
