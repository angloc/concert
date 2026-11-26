"""The Baseline check of a built page: its markup, styles and scripts against a Baseline year.

The page is split into one HTML file, one CSS file per style block and one JavaScript file per script,
and ESLint checks each with the Baseline rule for its language. The year and the rules live in the
ESLint configuration (baseline/eslint.config.js), run through its pinned Node toolchain.
"""

import argparse
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

STYLE = re.compile(r"(<style\b[^>]*>)(.*?)(</style>)", re.IGNORECASE | re.DOTALL)
SCRIPT = re.compile(r"(<script\b([^>]*)>)(.*?)(</script>)", re.IGNORECASE | re.DOTALL)
TYPE = re.compile(r"""\btype\s*=\s*["']?([^"'\s>]+)""", re.IGNORECASE)
CODE = {"", "text/javascript", "module"}


def split(html: str, into: Path) -> None:
    """Write the page's styles and scripts as separate files, and the markup without them, into `into`."""
    for i, m in enumerate(STYLE.finditer(html)):
        (into / f"style{i:03d}.css").write_text(m.group(2))
    n = 0
    for m in SCRIPT.finditer(html):
        kind = TYPE.search(m.group(2))
        if (kind.group(1).lower() if kind else "") in CODE:
            (into / f"script{n:03d}.js").write_text(m.group(3))
            n += 1
    markup = SCRIPT.sub(
        lambda m: m.group(1) + m.group(4),
        STYLE.sub(lambda m: m.group(1) + m.group(3), html),
    )
    (into / "page.html").write_text(markup)


def main(argv: list[str] | None = None) -> None:
    """Check one page and exit with ESLint's status: 0 when every feature is within the Baseline year."""
    ap = argparse.ArgumentParser(
        prog="baselinecheck", description=__doc__.splitlines()[0]
    )
    ap.add_argument("page", type=Path, help="the built page")
    ap.add_argument(
        "--config",
        type=Path,
        default=Path("baseline"),
        help="directory of the Node toolchain and ESLint configuration",
    )
    a = ap.parse_args(argv)
    npm = shutil.which("npm")
    if not npm:
        sys.exit("baselinecheck: npm is missing; make install provides Node")
    config = a.config.resolve()
    with tempfile.TemporaryDirectory(prefix="baseline-") as tmp:
        split(a.page.read_text(encoding="utf-8"), Path(tmp))
        cmd = [
            npm,
            "exec",
            "--prefix",
            str(config),
            "--no",
            "--",
            "eslint",
            "--config",
            str(config / "eslint.config.js"),
        ]
        result = subprocess.run(
            [*cmd, "--max-warnings", "0", "."],
            cwd=tmp,
            capture_output=True,
            text=True,
            check=False,
        )
    print(result.stdout, end="")
    print(result.stderr, end="", file=sys.stderr)
    sys.exit(result.returncode)
