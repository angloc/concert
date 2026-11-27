"""Fitting a singer's shapes: the fit reads the singer's targets and gives the same table in every process."""

import json
import os
import shutil
import subprocess
from pathlib import Path

from concert import ROOT


def fit(tmp_path, out, seed):
    """Start `concert-fit --singer female --out <out> W` with string hashing seeded by `seed`."""
    env = dict(os.environ, PYTHONHASHSEED=str(seed))
    return subprocess.Popen(
        [shutil.which("concert-fit"), "--singer", "female", "--out", str(out), "W"],
        cwd=tmp_path,
        env=env,
        stdout=subprocess.DEVNULL,
    )


def test_fit_is_reproducible_and_reads_the_singers_targets(tmp_path):
    """Two processes with different string hashing fit the same posture; a refit keeps the other entries."""
    a, b = tmp_path / "a.json", tmp_path / "b.json"
    b.write_text(json.dumps({"Q": {"art": {}, "F": [], "target": [], "cost": 0}}))
    runs = [fit(tmp_path, a, 1), fit(tmp_path, b, 2)]
    assert [r.wait() for r in runs] == [0, 0]
    A, B = json.loads(a.read_text()), json.loads(b.read_text())
    assert A["W"] == B["W"]
    assert "Q" in B
    targets = json.loads(Path(ROOT, "singers", "female", "targets.json").read_text())
    assert A["W"]["target"] == targets["W"]["formants"]
