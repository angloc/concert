"""build.py - put the whole film into one file: dist/bide.html (picture + song, nothing fetched). Standard library only.

concert-page            full build (build/song.flac inside; a silent WAV of the right length if it is not there yet)
concert-page --light    no song inside (the player runs on a silent clock)
concert-page --song X   use another file;  --out Y  write elsewhere;  --version V  the version the page shows
"""

import argparse
import base64
import html as markup
import json
import os
import re
import struct
import sys
import zlib

from concert import ROOT

P = lambda *a: os.path.join(ROOT, *a)


def read(path):
    """Text of the UTF-8 file at `path`."""
    with open(path, encoding="utf-8") as f:
        return f.read()


def safe(js):
    """Nothing inside a script may close it or open a comment state."""
    js = re.sub(r"</(script)", r"<\\/\1", js, flags=re.IGNORECASE)
    return js.replace("<!--", "<\\!--")


def silent_wav(seconds, rate=8000):
    """A silent 8-bit mono WAV file of `seconds`, as bytes."""
    n = round(seconds * rate)
    head = (
        b"RIFF"
        + struct.pack("<I", 36 + n)
        + b"WAVEfmt "
        + struct.pack("<IHHIIHH", 16, 1, 1, rate, rate, 1, 8)
        + b"data"
        + struct.pack("<I", n)
    )
    return head + b"\x80" * n


def kb(n):
    """Byte count `n` as KB or MB for the size report."""
    return f"{n / 1024:,.1f} KB" if n < 1 << 20 else f"{n / 1048576:,.2f} MB"


def main(argv: list[str] | None = None) -> None:
    """Command line: assemble the page and print a size report (also written to SIZES.txt beside it)."""
    ap = argparse.ArgumentParser()
    ap.add_argument("--light", action="store_true")
    ap.add_argument("--song", default=P("build", "song.flac"))
    ap.add_argument("--out", default=P("dist", "bide.html"))
    ap.add_argument(
        "--version", default="0.0.0", help="application version shown on the page"
    )
    a = ap.parse_args(argv)

    files = [
        "build/timeline.js",
        "film/anim.js",
        "film/stub.js",
        "film/engine.js",
        "film/cast.js",
        "film/world.js",
        "film/hand.js",
    ]
    files += [f"film/scenes/s{i:02d}.js" for i in range(19)]
    files += ["film/main.js", "film/shell.js"]
    tags, rows, missing = [], [], []
    for rel in files:
        path = P(*rel.split("/"))
        if not os.path.exists(path):
            missing.append(rel)
            continue
        src = safe(read(path))
        rows.append((rel, len(src.encode())))
        # one tag per file: a mistake in one scene cannot take the others down
        tags.append(f"<script>/* {rel} */\n{src}\n</script>")
    if not os.path.exists(P("build", "timeline.js")) and os.path.exists(
        P("build", "timeline.json")
    ):
        tags.insert(
            0,
            "<script>window.BIDE=window.BIDE||{};BIDE.timeline="
            + safe(read(P("build", "timeline.json")))
            + ";</script>",
        )
        missing.remove("build/timeline.js")
    for m in missing:
        print("warning: missing, skipped:", m, file=sys.stderr)

    song, song_note = b"", "left out (--light)"
    if not a.light:
        if os.path.exists(a.song):
            with open(a.song, "rb") as f:
                song = f.read()
            song_note = os.path.relpath(a.song, ROOT)
        else:
            total = json.loads(read(P("build", "timeline.json")))["total"]
            song = silent_wav(total)
            song_note = f"PLACEHOLDER: {total:.2f} s of silence ({os.path.relpath(a.song, ROOT)} not found)"
            print("warning: no song yet, using a silent placeholder", file=sys.stderr)

    html = read(P("film", "index.src.html"))
    html = html.replace("<!--SONG-->", base64.b64encode(song).decode())
    html = html.replace("<!--FILM-->", "\n".join(tags))
    html = html.replace("<!--VERSION-->", markup.escape(a.version))
    for bad in re.findall(r"""(?:src|href)\s*=\s*["'](https?:)?//[^"']+""", html):
        print("warning: external reference in page:", bad, file=sys.stderr)
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    data = html.encode()
    tmp = a.out + ".part"
    with open(tmp, "wb") as f:
        f.write(data)
    os.replace(tmp, a.out)

    code = sum(n for _, n in rows)
    lines = [
        f"{os.path.relpath(a.out, ROOT)}  {kb(len(data))}",
        f"  song   {kb(len(song)):>12}  ({kb(len(base64.b64encode(song)))} as text)  {song_note}",
        f"  code   {kb(code):>12}  ({kb(len(zlib.compress(chr(10).join(tags).encode(), 9)))} compressed)",
    ]
    lines += [f"    {kb(n):>12}  {rel}" for rel, n in rows]
    if missing:
        lines.append("  missing: " + ", ".join(missing))
    text = "\n".join(lines) + "\n"
    with open(
        os.path.join(os.path.dirname(os.path.abspath(a.out)), "SIZES.txt"), "w"
    ) as f:
        f.write(text)
    print(text, end="")
