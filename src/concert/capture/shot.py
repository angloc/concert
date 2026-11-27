"""Captures stills of the film: drawings at chosen times, or test sheets, laid out as one contact sheet.

concert-shot [--at t,t,...] [--strip a:b] [--fn name --k k,k,...] [--out build/shot.jpg]
"""

import argparse
import base64
import json
import time
from pathlib import Path

from playwright.sync_api import Error

from concert.capture.browser import DEV_PAGE, open_page


def items(a: argparse.Namespace) -> list[float]:
    """The times, or test-sheet parameters, to draw."""
    if a.strip:
        lo, hi = (float(x) for x in a.strip.split(":"))
        return [n / 12 for n in range(round(lo * 12), round(hi * 12) + 1, a.step)]
    if a.at:
        return [float(x) for x in a.at.split(",")]
    if a.fn:
        return [float(x) for x in a.k.split(",")]
    return []


def main(argv: list[str] | None = None) -> None:
    """Draw each chosen item into a grid of captioned tiles and write the grid as a JPEG or PNG."""
    ap = argparse.ArgumentParser(
        prog="concert-shot", description=__doc__.splitlines()[0]
    )
    ap.add_argument("--page", type=Path, default=DEV_PAGE, help="film page to draw")
    ap.add_argument("--stub", action="store_true", help="draw with the stub cast")
    ap.add_argument("--at", help="comma-separated times in seconds")
    ap.add_argument("--strip", help="every drawing from a to b seconds, as a:b")
    ap.add_argument(
        "--step",
        type=int,
        default=1,
        help="drawings to advance between tiles of a strip",
    )
    ap.add_argument("--fn", help="a test sheet drawn by BIDE.drawFn")
    ap.add_argument("--k", default="0", help="comma-separated parameters for --fn")
    ap.add_argument(
        "--warm",
        type=int,
        default=0,
        help="drawings to draw before each time, for state carried over",
    )
    ap.add_argument(
        "--crop", default="0,0,1920,1080", help="x,y,w,h of the 1920x1080 sheet to keep"
    )
    ap.add_argument("--w", type=int, default=640, help="tile width in pixels")
    ap.add_argument("--cols", type=int, help="tiles per row; up to 3 by default")
    ap.add_argument("--eval", help="an expression to evaluate after setup")
    ap.add_argument(
        "--only",
        action="store_true",
        help="with --eval: print its value and draw nothing",
    )
    ap.add_argument("--q", type=float, default=0.86, help="JPEG quality")
    ap.add_argument(
        "--out",
        type=Path,
        default=Path("build/shot.jpg"),
        help="image to write (.jpg or .png)",
    )
    a = ap.parse_args(argv)
    with open_page(a.page) as (page, logs):

        def ev(expr: str) -> object:
            try:
                return page.evaluate(expr)
            except Error as e:
                logs.append(f"EXC {e.message}"[:900])
                return None

        if a.eval and a.only:
            print(json.dumps(ev(a.eval)))
        else:
            ks = items(a)
            cx, cy, cw, ch = (float(x) for x in a.crop.split(","))
            w = a.w
            h = round(w * ch / cw)
            cols = a.cols or min(3, len(ks))
            rows = -(-len(ks) // cols)
            ev(
                f"(()=>{{window.__E=BIDE.init(document.getElementById('film'),{{stub:{json.dumps(a.stub)},capture:true}});"
                f"window.__M=document.createElement('canvas');__M.width={cols * w};__M.height={rows * (h + 18)};"
                "const c=__M.getContext('2d');c.fillStyle='#111';c.fillRect(0,0,__M.width,__M.height);"
                "c.font='13px monospace';return 1})()"
            )
            if a.eval:
                ev(a.eval)
            for i, k in enumerate(ks):
                t0 = time.monotonic()
                if a.fn:
                    ev(
                        f"(async()=>{{BIDE.drawFn({json.dumps(a.fn)},{k!r});if(BIDE.E.finish)BIDE.E.finish();}})()"
                    )
                    label = f"{a.fn} k={k:.3f}"
                else:
                    ev(
                        f"(async()=>{{for(let j={a.warm};j>0;j--)BIDE.renderAt({k!r}-j/12);"
                        f"BIDE.renderAt({k!r});if(BIDE.E.finish)BIDE.E.finish();}})()"
                    )
                    label = f"t={k:.3f}"
                label += f"  {round((time.monotonic() - t0) * 1000)}ms"
                x, y = (i % cols) * w, (i // cols) * (h + 18)
                ev(
                    "(()=>{const c=__M.getContext('2d'),f=document.getElementById('film');"
                    "c.imageSmoothingQuality='high';"
                    f"c.drawImage(f,{cx}*f.width/1920,{cy}*f.height/1080,{cw}*f.width/1920,{ch}*f.height/1080,{x},{y},{w},{h});"
                    f"c.fillStyle='#ddd';c.fillText({json.dumps(label)},{x + 4},{y + h + 13});}})()"
                )
            kind = "image/png" if a.out.suffix == ".png" else "image/jpeg"
            data = ev(f"__M.toDataURL('{kind}',{a.q})")
            if data:
                a.out.parent.mkdir(parents=True, exist_ok=True)
                a.out.write_bytes(base64.b64decode(data.split(",", 1)[1]))
                print(a.out, f"{cols * w}x{rows * (h + 18)}")
        for line in dict.fromkeys(logs):
            print(line)
