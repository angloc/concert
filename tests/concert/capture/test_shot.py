"""Stills: a contact sheet of drawings at chosen times."""

import struct

from concert.capture import shot


def png_size(path):
    """Width and height from a PNG header."""
    return struct.unpack(">II", path.read_bytes()[16:24])


def test_shot_writes_a_contact_sheet_of_the_chosen_times(tmp_path, capsys):
    """Two drawings at 320 px wide sit side by side, each with an 18 px caption strip."""
    out = tmp_path / "sheet.png"
    shot.main(["--at", "0,1", "--w", "320", "--out", str(out)])
    assert png_size(out) == (640, 198)
    assert f"{out} 640x198" in capsys.readouterr().out


def test_shot_only_evaluates_an_expression_and_prints_the_result(capsys):
    """With --eval and --only, the page is loaded and the expression's value printed as JSON."""
    shot.main(["--eval", "BIDE.timeline.total > 60", "--only"])
    assert capsys.readouterr().out.strip().splitlines()[0] == "true"


def test_shot_draws_test_sheets_as_jpeg(tmp_path, capsys):
    """--fn draws a test sheet once for each parameter in --k."""
    out = tmp_path / "hands.jpg"
    shot.main(["--fn", "handSheet", "--k", "0,1", "--w", "160", "--out", str(out)])
    assert out.read_bytes()[:2] == b"\xff\xd8"
    assert f"{out} 320x108" in capsys.readouterr().out


def test_shot_strip_reports_a_failing_expression(tmp_path, capsys):
    """--strip draws every drawing between two times; an expression that throws is reported, not fatal."""
    out = tmp_path / "strip.png"
    shot.main(
        [
            "--strip",
            "0:0.09",
            "--cols",
            "1",
            "--w",
            "160",
            "--eval",
            "nope()",
            "--out",
            str(out),
        ]
    )
    assert png_size(out) == (160, 216)
    assert "EXC" in capsys.readouterr().out
