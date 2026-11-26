"""Turns the performance timeline into the film's data script."""

from pathlib import Path

from concert import ROOT


def main() -> None:
    """Write build/timeline.js, which sets BIDE.timeline, from build/timeline.json."""
    build = Path(ROOT, "build")
    (build / "timeline.js").write_text(
        "window.BIDE=window.BIDE||{};BIDE.timeline="
        + (build / "timeline.json").read_text()
        + ";"
    )
