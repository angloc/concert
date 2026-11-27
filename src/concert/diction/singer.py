"""singer.py - load a singer profile (singers/<name>/profile.json). Song-neutral.
A profile is who is singing: tract scale and source settings now; range, registers and breath later (see
docs/knowledge/singer-profile.md). Personas in a song are overlays on a profile."""

import json
import os

from concert import ROOT

DEFAULT = "baritone"  # the profile whose settings are the engine defaults


def load(name: str) -> dict:
    """Engine settings for singer `name`, from singers/<name>/profile.json, with the microphone setting as `mic`."""
    with open(os.path.join(ROOT, "singers", name, "profile.json")) as f:
        p = json.load(f)
    cfg = dict(p["voice"])
    cfg["mic"] = p.get("mic", 0)
    return cfg
