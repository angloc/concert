"""Shared fixtures for the end-to-end tests of the built page in three browser engines."""

import os
import shutil
import subprocess
import time
from pathlib import Path

import pytest
from playwright.sync_api import sync_playwright

from concert import ROOT

ENGINES = [
    pytest.param(name, marks=getattr(pytest.mark, name))
    for name in ("chromium", "firefox", "webkit")
]
LOCAL = ("file:", "data:", "blob:", "about:")


@pytest.fixture(scope="session")
def built():
    """The one page in dist/ and the version in its file name."""
    pages = sorted(Path(ROOT, "dist").glob("bide_*.html"))
    assert len(pages) == 1, f"expected one built page in dist/, found {pages}"
    return pages[0], pages[0].name[len("bide_") : -len(".html")]


@pytest.fixture(scope="session")
def null_audio(tmp_path_factory):
    """A private PulseAudio server with a null sink, so that a browser without a sound card can play."""
    exe = shutil.which("pulseaudio")
    assert exe, "pulseaudio is missing; make install provides it"
    home = tmp_path_factory.mktemp("pulse")
    sock = home / "sock"
    env = {
        "PATH": os.environ.get("PATH", ""),
        "HOME": str(home),
        "XDG_RUNTIME_DIR": str(home),
    }
    args = [exe, "--daemonize=no", "-n", "--exit-idle-time=-1", "--disable-shm=yes"]
    args += [
        "--load=module-null-sink sink_name=null",
        f"--load=module-native-protocol-unix auth-anonymous=1 socket={sock}",
    ]
    server = subprocess.Popen(
        args, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
    )
    for _ in range(100):
        if sock.exists():
            break
        time.sleep(0.05)
    assert sock.exists(), "the private PulseAudio server did not start"
    yield f"unix:{sock}"
    server.terminate()
    server.wait()


@pytest.fixture(scope="session")
def playwright():
    """One Playwright driver for the session."""
    with sync_playwright() as pw:
        yield pw


@pytest.fixture(scope="session")
def browsers(playwright, null_audio):
    """Each engine, launched once when first asked for."""
    open_ = {}

    def get(name):
        if name not in open_:
            env = {**os.environ, "PULSE_SERVER": null_audio}
            args = ["--enable-unsafe-swiftshader"] if name == "chromium" else []
            open_[name] = getattr(playwright, name).launch(args=args, env=env)
        return open_[name]

    yield get
    for b in open_.values():
        b.close()


class Visit:
    """The built page open in one engine, with every request, console error and uncaught exception it made."""

    def __init__(self, page):
        self.page = page
        self.requests: list[str] = []
        self.errors: list[str] = []
        page.on("request", lambda r: self.requests.append(r.url))
        page.on("console", lambda m: m.type == "error" and self.errors.append(m.text))
        page.on("pageerror", lambda e: self.errors.append(str(e)))

    def ev(self, expr):
        """The value of a JavaScript expression in the page."""
        return self.page.evaluate(expr)

    def live(self, text):
        """Wait until the live region says `text`."""
        self.page.wait_for_function(
            "t => document.getElementById('live').textContent === t",
            arg=text,
            timeout=20000,
        )

    def play(self):
        """Press the ball of wool and wait until the song is playing."""
        self.page.click("#ball")
        self.page.wait_for_function("BIDE.player.state === 'playing'", timeout=20000)

    def remote(self):
        """Requests that left the file: the page should make none."""
        return [u for u in self.requests if not u.startswith(LOCAL)]


@pytest.fixture(params=ENGINES)
def visit(request, browsers, built):
    """The built page loaded in one engine, its song decoded."""
    context = browsers(request.param).new_context(
        viewport={"width": 1280, "height": 720}
    )
    v = Visit(context.new_page())
    v.page.goto(built[0].as_uri())
    v.page.wait_for_function(
        "window.BIDE && BIDE.player && BIDE.player.ready", timeout=40000
    )
    yield v
    context.close()
