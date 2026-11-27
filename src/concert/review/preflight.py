"""preflight.py - read-only singability review of a render against the voice's own physical constraints.
usage: concert-preflight <build dir> [--csv out.csv]   (writes preflight_rows.json in the build dir)
Per vowel nucleus (from perf.json segs) it reports:
  f0       sounded pitch (Hz), perf f0 track x 2^(shift/12)
  K        tract scale of the line's persona phase
  F1,F2    predicted by the tract solver for the vowel's fitted shape, / K  (diphthongs: base vowel)
  f0/F1    ring-zone indicator: 0.8..1.25 means one harmonic sits on the resonance
  open     F1 predicted for the vowel is below f0 (vowel collapses: F1 under the pitch)
  dF       distance from F1 to the nearest harmonic, in units of f0 (0 = on a harmonic, .5 = between two)
  pres     1.5-4 kHz minus 0.1-1 kHz energy in the nucleus window of the dry voice (dB): where words live
  lvl      nucleus RMS of the dry voice, 500-4000 Hz (dB)
  mask     lvl + stage gain  minus  weighted band stems in the same window and band (dB): voice margin over the band
  cons     onset consonant energy (500-8000 Hz) relative to the nucleus (dB), if the syllable has an onset
Nothing here writes audio."""

import csv
import json
import math
import os
import sys
import wave
from pathlib import Path

import numpy as np
import scipy.signal as ss

from concert.voice import persona as PS
from concert.voice import tract as TR
from concert.voice import tuning as TU

SR = 44100


def rd(p):
    """A WAV file as (mono float samples, sample rate)."""
    with wave.open(p) as w:
        a = (
            np.frombuffer(w.readframes(w.getnframes()), dtype="<i2").astype(float)
            / 32768
        )
        ch = w.getnchannels()
    return (a.reshape(-1, ch).mean(1) if ch > 1 else a), w.getframerate()


def band_db(x, lo, hi):
    """Energy in dB of `x` in the band `lo`..`hi` Hz."""
    if len(x) < 256:
        return -99.0
    sos = ss.butter(4, [lo, min(hi, SR / 2 - 100)], btype="band", fs=SR, output="sos")
    y = ss.sosfiltfilt(sos, np.pad(x, 256, mode="reflect"))[256:-256]
    return 10 * math.log10(float((y * y).mean()) + 1e-12)


def seg(x, t0, t1):
    """Samples of `x` from `t0` to `t1` seconds."""
    return x[int(t0 * SR) : int(t1 * SR)]


def flag(r):
    """Flags for one nucleus row: RING when a harmonic sits on F1, COLLAPSE when F1 is below the pitch."""
    f = []
    if 0.80 <= r["ratio"] <= 1.25:
        f.append("RING")
    elif r["ratio"] > 1.25:
        f.append("COLLAPSE")
    return f


def main(argv: list[str] | None = None) -> None:
    """Command line: concert-preflight <build dir> [--csv out.csv]; prints one row per vowel nucleus."""
    argv = sys.argv[1:] if argv is None else argv
    BUILD = argv[0]
    voice, _ = rd(os.path.join(BUILD, "voice.wav"))
    GAIN = {"harp": 0.50, "strings": 0.46, "whistle": 0.86, "other": 0.55}
    band = None
    for k, g in GAIN.items():
        s, _ = rd(os.path.join(BUILD, f"stem_{k}.wav"))
        band = s * g if band is None else band[: len(s)] + s[: len(band)] * g
    P = json.loads(Path(os.path.join(BUILD, "perf.json")).read_text())
    SC = json.loads(Path(os.path.join(BUILD, "score.json")).read_text())
    SHIFT = PS.SHIFT
    VOICE_GAIN_DB = 3.0  # mix.py raises the dry voice to -18 LUFS (measured +3.03 dB on this render)

    # predicted formants per vowel (tract coordinates), via the same solver the tuning uses
    SH = json.loads(
        Path(os.path.join(os.path.dirname(TU.__file__), "shapes.json")).read_text()
    )
    FM = {}
    for v in set(TU.MAP.values()):
        if v not in SH:
            continue
        A, dx = TR.areas(dict(SH[v]["art"]))
        f = TR.formants(A, dx, n=3)
        if f and len(f) >= 2:
            FM[v] = (f[0][0], f[1][0])

    rows = []
    segs = P["segs"]
    for si, g in enumerate(segs):
        if g["role"] != "nuc":
            continue
        li, ph = g["line"], g["ph"]
        L = SC["lines"][li]
        syl = L["syl"][g["syl"]]
        t0, t1 = g["t0"], g["t1"]
        i0, i1 = int(t0 * P["cr"]), max(int(t0 * P["cr"]) + 1, int(t1 * P["cr"]))
        fv = [v for v in P["f0"][i0:i1] if v > 0]
        if not fv:
            continue
        f0 = float(np.median(fv)) * 2 ** (SHIFT / 12.0)
        K = PS.line_cfg(li)["K"]
        base = TU.MAP.get(ph, ph)
        fm = FM.get(base)
        if fm is None:
            continue
        F1, F2 = fm[0] / K, fm[1] / K
        ratio = f0 / F1
        dF = abs(F1 / f0 - round(F1 / f0))
        # measurement window: central 60 % of the nucleus
        a, b = t0 + 0.2 * (t1 - t0), t1 - 0.2 * (t1 - t0)
        v = seg(voice, a, b)
        bd = seg(band, a, b)
        lvl = band_db(v, 500, 4000)
        pres = band_db(v, 1500, 4000) - band_db(v, 100, 1000)
        mask = (lvl + VOICE_GAIN_DB) - band_db(bd, 500, 4000)
        # onset consonant(s) in the same syllable, immediately before the nucleus
        cons = None
        j = si - 1
        cs = []
        while (
            j >= 0
            and segs[j]["line"] == li
            and segs[j]["syl"] == g["syl"]
            and segs[j]["role"] != "nuc"
        ):
            cs.append(segs[j])
            j -= 1
        if cs:
            c0, c1 = min(c["t0"] for c in cs), max(c["t1"] for c in cs)
            if c1 - c0 > 0.01:
                cons = band_db(seg(voice, c0, c1), 500, 8000) - band_db(v, 500, 8000)
        rows.append(
            {
                "li": li + 1,
                "word": syl["word"],
                "ph": ph,
                "t": t0,
                "d": t1 - t0,
                "f0": f0,
                "K": K,
                "F1": F1,
                "F2": F2,
                "ratio": ratio,
                "dF": dF,
                "pres": pres,
                "lvl": lvl,
                "mask": mask,
                "cons": cons,
            }
        )

    print(
        "{!s:<4} {!s:<8} {!s:<3} {!s:6} {!s:5} {!s:5} {!s:5} {!s:5} {!s:5} {!s:6} {!s:6} {!s:6} {!s:6}  flags".format(
            "line",
            "word",
            "ph",
            "t",
            "f0",
            "K",
            "F1",
            "F2",
            "f0/F1",
            "dF",
            "pres",
            "lvl",
            "mask",
        )
    )
    for r in rows:
        print(
            "L{:<3d} {!s:<8} {!s:<3} {:6.1f} {:5.0f} {:5.2f} {:5.0f} {:5.0f} {:5.2f} {:6.2f} {:6.1f} {:6.1f} {:6.1f}  {}{}".format(
                r["li"],
                r["word"],
                r["ph"],
                r["t"],
                r["f0"],
                r["K"],
                r["F1"],
                r["F2"],
                r["ratio"],
                r["dF"],
                r["pres"],
                r["lvl"],
                r["mask"],
                " ".join(flag(r)),
                "" if r["cons"] is None else "  cons {:.1f}".format(r["cons"]),
            )
        )
    if "--csv" in argv:
        p = argv[argv.index("--csv") + 1]
        with open(p, "w", newline="") as fh:
            w = csv.DictWriter(fh, fieldnames=list(rows[0].keys()))
            w.writeheader()
            w.writerows(rows)
    Path(os.path.join(BUILD, "preflight_rows.json")).write_text(json.dumps(rows))
