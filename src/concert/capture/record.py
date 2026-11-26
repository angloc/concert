"""Exports the film as an MP4: every drawing in order, encoded by ffmpeg with the song.

concert-record out.mp4 song.flac [--from seconds] [--to seconds]
"""

import argparse
import base64
import math
import subprocess
from pathlib import Path

import imageio_ffmpeg

from concert.capture.browser import DEV_PAGE, open_page

FPS = 12
"""Drawings per second; the video runs at twice this, each drawing held for two frames."""

SETUP = """(()=>{window.__E=BIDE.init(document.getElementById('film'),{capture:true});
window.__g=async n=>{BIDE.renderAt(n/12);if(BIDE.E.finish)BIDE.E.finish();
const b=await new Promise(r=>document.getElementById('film').toBlob(r,'image/jpeg',1));
const u=new Uint8Array(await b.arrayBuffer());let s='';
for(let i=0;i<u.length;i+=32768)s+=String.fromCharCode.apply(null,u.subarray(i,i+32768));return btoa(s)};
return BIDE.timeline.total})()"""


def encoder(out: Path, song: Path, start: float, seconds: float) -> list[str]:
    """The ffmpeg command that reads JPEG drawings on stdin and writes 1920x1080 H.264 at 24 fps with the song as AAC."""
    return [
        imageio_ffmpeg.get_ffmpeg_exe(),
        "-y", "-loglevel", "error",
        "-f", "image2pipe", "-c:v", "mjpeg", "-framerate", str(FPS), "-i", "pipe:0",
        "-ss", str(start), "-i", str(song),
        "-map", "0:v", "-map", "1:a", "-t", str(seconds),
        "-vf", f"fps={2 * FPS},scale=1920:1080:out_color_matrix=bt709:out_range=tv,format=yuv420p",
        "-c:v", "libx264", "-profile:v", "high", "-b:v", "18M", "-g", "48",
        "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
        "-c:a", "aac", "-b:a", "256k", "-movflags", "+faststart",
        str(out),
    ]  # fmt: skip


def main(argv: list[str] | None = None) -> None:
    """Draw the film from --from to --to (the whole film by default) and write it with the song to an MP4."""
    ap = argparse.ArgumentParser(
        prog="concert-record", description=__doc__.splitlines()[0]
    )
    ap.add_argument("out", type=Path, help="MP4 file to write")
    ap.add_argument(
        "song", type=Path, help="the song to mux, for example build/song.flac"
    )
    ap.add_argument(
        "--from", dest="start", type=float, default=0.0, help="start, in seconds"
    )
    ap.add_argument(
        "--to",
        dest="end",
        type=float,
        default=0.0,
        help="end, in seconds; 0 for the end of the film",
    )
    ap.add_argument("--page", type=Path, default=DEV_PAGE, help="film page to draw")
    a = ap.parse_args(argv)
    with open_page(a.page) as (page, logs):
        total = page.evaluate(SETUP)
        n0 = math.floor(a.start * FPS + 0.5)
        n1 = math.floor(a.end * FPS + 0.5) if a.end else math.ceil(total * FPS)
        a.out.parent.mkdir(parents=True, exist_ok=True)
        with subprocess.Popen(
            encoder(a.out, a.song, n0 / FPS, (n1 - n0) / FPS), stdin=subprocess.PIPE
        ) as enc:
            try:
                for n in range(n0, n1):
                    b64 = page.evaluate(f"__g({n})") or page.evaluate(f"__g({n})")
                    enc.stdin.write(base64.b64decode(b64))
                    if n % 240 == 0:
                        print("drawing", n, "of", n1, flush=True)
                enc.stdin.close()
            except BrokenPipeError:
                pass  # ffmpeg has exited; its exit status is reported below
        for line in logs[:12]:
            print(line)
    if enc.returncode:
        raise SystemExit(f"ffmpeg failed with exit status {enc.returncode}")
