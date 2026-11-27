"""A singer's shape table: the gestural score sings from the table it is given, and a missing table says how to build it."""

import pytest

from concert.voice import gest as GE
from concert.voice import shapes as SH


def table(jaw):
    """A shape table in which every sound has the same posture, with jaw opening `jaw`."""
    art = {k: 0.0 for k in GE.BODY}
    art.update(J=jaw, LA=1.2, BP=13.6)
    names = ["A", "AA", "AE", "AH", "AO", "AX", "EH", "ER", "EY", "IH", "IY"]
    names += ["L", "LD", "O", "OR", "R", "UH", "UW", "W", "Y"]
    return {n: {"art": dict(art), "F": [[500, 80, 0.0]]} for n in names}


def first_jaw(shapes):
    """The jaw opening at the start of a sung AH-IH line under `shapes`."""
    segs = [
        {"ph": "AH", "t0": 0.3, "t1": 0.55, "line": 0, "syl": 0, "role": "nuc"},
        {"ph": "IH", "t0": 0.55, "t1": 0.8, "line": 0, "syl": 1, "role": "nuc"},
    ]
    sc = GE.Score(segs, {"cr": 200, "f0": [150.0] * 400}, shapes)
    return sc.T["J"].sample([0.0])[0]


def test_score_sings_from_the_table_it_is_given():
    """The same line starts from a different jaw opening under a different table."""
    assert first_jaw(table(0.3)) == pytest.approx(0.3)
    assert first_jaw(table(0.6)) == pytest.approx(0.6)


def test_missing_table_names_the_command_that_builds_it():
    """Loading a table that has not been fitted fails with the fit command."""
    with pytest.raises(SystemExit, match="concert-fit --singer nobody"):
        SH.load("nobody")
