"""The Baseline 2025 check of a built page."""

from pathlib import Path

import pytest

from repochecks import baseline

CONFIG = Path(__file__).resolve().parents[2] / "baseline"
SHELL = '<!doctype html><html lang="en"><head><title>t</title><style>{css}</style></head><body>{body}<script type="text/plain" id="song">QUJD</script><script>{js}</script></body></html>'


def page(
    tmp_path, css="p{color:red}", body="<p>Hello</p>", js="const a = [1, 2].at(-1);"
):
    """A small page with one style block and one script, written to a temporary file."""
    path = tmp_path / "page.html"
    path.write_text(SHELL.format(css=css, body=body, js=js))
    return path


def check(path):
    """The exit status of the check run on `path`."""
    with pytest.raises(SystemExit) as e:
        baseline.main([str(path), "--config", str(CONFIG)])
    return e.value.code


def test_page_of_baseline_features_passes(tmp_path):
    """Markup, styles and scripts that are all Baseline 2025 pass."""
    assert check(page(tmp_path)) == 0


@pytest.mark.parametrize(
    "part",
    [
        {"css": "p{field-sizing:content}"},
        {"body": '<input autocorrect="on">'},
        {"js": "navigator.getBattery();"},
    ],
    ids=["css", "html", "js"],
)
def test_feature_beyond_baseline_2025_fails(tmp_path, part, capsys):
    """One feature beyond Baseline 2025, in styles, markup or a script, fails the check and is named."""
    assert check(page(tmp_path, **part)) != 0
    assert "baseline" in capsys.readouterr().out


def test_exceptions_of_decision_0022_pass(tmp_path):
    """The four features that decision 0022 accepts beyond Baseline 2025 pass."""
    css = "html{overscroll-behavior:none}p{user-select:none}"
    js = "navigator.audioSession.type = 'playback'; const r = window.devicePixelRatio;"
    assert check(page(tmp_path, css=css, js=js)) == 0
