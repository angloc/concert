"""tuning.py - formant tuning for high notes.

A singer whose pitch climbs towards a vowel's first formant opens the jaw so that F1 stays a little above the pitch: the vowel stays
readable and the note does not swell and dip as vibrato sweeps the pitch across the resonance.  The tract's own frequency-domain
solver tells us how much a given jaw opening moves F1 for each vowel, so the amount of opening is computed, not guessed.

    table()                       vowel -> (F1 of the fitted shape, Hz of F1 per unit of jaw opening, room left to open)
    dj(vowel, f0, K, factor)      extra jaw opening (0..MAXJ) that puts the sounded F1 at factor * f0 when it would otherwise be lower
"""

import json
import os
from pathlib import Path

HERE = os.path.dirname(os.path.abspath(__file__))
from concert.voice import tract as TR

MAP = {
    "AY": "A",
    "OW": "O",
    "OH": "O",
    "OY": "AO",
    "AW": "A",
    "AA": "AA",
    "AE": "AE",
    "AH": "AH",
    "AO": "AO",
    "EH": "EH",
    "EY": "EY",
    "IH": "IH",
    "IY": "IY",
    "UW": "UW",
    "UH": "UH",
    "ER": "ER",
}
MAXJ = 0.50
_T = None


def _f1(art):
    A, dx = TR.areas(art)
    f = TR.formants(A, dx, n=2)
    return f[0][0] if f else None


def table() -> dict[str, tuple[float, float, float]]:
    """Vowel -> (F1 of the fitted shape, Hz of F1 per unit of jaw opening, room left to open), cached."""
    global _T
    if _T is None:
        sh = json.loads(Path(os.path.join(HERE, "shapes.json")).read_text())
        _T = {}
        for v in set(MAP.values()):
            if v not in sh:
                continue
            art = dict(sh[v]["art"])
            f0 = _f1(art)
            J = art["J"]
            if f0 is None:
                continue
            d = 0.12 if J + 0.12 <= 1.0 else -0.12
            a2 = dict(art)
            a2["J"] = J + d
            f1 = _f1(a2)
            sens = (f1 - f0) / d if f1 else 0.0
            if sens < 80:
                continue  # rounded/back vowels: the jaw does not raise F1 here (the lips decide), so no jaw tuning
            _T[v] = (f0, sens, max(0.0, min(MAXJ, 1.0 - J)))
    return _T


def dj(vowel: str, f0: float, K: float, factor: float = 1.20) -> float:
    """vowel: ARPAbet nucleus; f0: sounded pitch (Hz); K: tract scale (sounded formants = tract formants / K)."""
    t = table().get(MAP.get(vowel, vowel))
    if not t:
        return 0.0
    F1m, sens, room = t  # tract-coordinate F1 and its sensitivity to jaw opening
    need = factor * f0 * K  # tract-coordinate F1 that sounds at factor * f0
    if need <= F1m:
        return 0.0
    return min(room, MAXJ, (need - F1m) / sens)


if __name__ == "__main__":
    K = 0.84
    print("vowel  F1 sounded  Hz per J  room   extra jaw at f0 = 400 / 520 / 650 Hz")
    for v, (f1, s, room) in sorted(table().items()):
        print(
            f"{v!s:<4} {f1 / K:7.0f} {s / K:9.0f} {room:6.2f}   {dj(v, 400, K):.2f} / {dj(v, 520, K):.2f} / {dj(v, 650, K):.2f}"
        )
