"""The film page, open in headless Chromium for drawing one sheet at a time."""

import contextlib
import re
from collections.abc import Iterator
from pathlib import Path

from playwright.sync_api import Page, sync_playwright

from concert import ROOT

DEV_PAGE = Path(ROOT, "film", "dev.html")
"""The film's development page: the film code and build/timeline.js, without the song."""

# SwiftShader stands in for a GPU where there is none, as in CI.
ARGS = ["--enable-unsafe-swiftshader", "--allow-file-access-from-files", "--mute-audio"]
NOISE = re.compile(r"ERR_FILE_NOT_FOUND|404|GL Driver Message")


@contextlib.contextmanager
def open_page(path: Path = DEV_PAGE) -> Iterator[tuple[Page, list[str]]]:
    """Open a film page at 1920x1080 and yield it with the list that collects its errors and console output."""
    logs: list[str] = []

    def keep(text: str) -> None:
        if not NOISE.search(text):
            logs.append(text)

    with sync_playwright() as pw:
        browser = pw.chromium.launch(args=ARGS)
        try:
            page = browser.new_page(viewport={"width": 1920, "height": 1080})
            page.on("console", lambda m: keep(f"{m.type}: {m.text}"[:400]))
            page.on("pageerror", lambda e: keep(f"EXC {e}"[:600]))
            page.goto(Path(path).resolve().as_uri())
            yield page, logs
        finally:
            browser.close()
