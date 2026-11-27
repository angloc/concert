"""shapes.py - where a singer's targets and fitted shape table live, and how they are loaded.

A singer's formant targets and starting postures are source data in singers/<name>/targets.json. The shape table is
derived from them by concert-fit and written to build/<name>/shapes.json, so the table always matches the tract model.
"""

import json
import os
from functools import cache
from pathlib import Path

from concert import ROOT


def targets(singer: str) -> dict:
    """Sound -> {"formants": target F1..F4 in Hz, "prior": starting posture} for `singer`."""
    return json.loads(Path(ROOT, "singers", singer, "targets.json").read_text())


def path(singer: str) -> str:
    """Where the fitted shape table of `singer` is written."""
    return os.path.join(ROOT, "build", singer, "shapes.json")


@cache
def load(singer: str) -> dict:
    """The fitted shape table of `singer`: sound -> {"art": posture, "F": formants, "target", "cost"}."""
    p = path(singer)
    if not os.path.exists(p):
        raise SystemExit(
            f"no shape table for {singer}: run concert-fit --singer {singer}"
        )
    return json.loads(Path(p).read_text())
