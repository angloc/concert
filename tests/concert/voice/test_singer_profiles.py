"""Moving the singers into singers/<name>/profile.json must not change a single setting the engine receives.
The fixture was captured from commit 4cd85f6 (danny-boy-female) before the move."""

import json
import unittest
from pathlib import Path

from concert import ROOT
from concert.diction import singer as SG
from concert.voice import engine as EN
from concert.voice import persona as PS

SNAP = json.loads(
    Path(ROOT, "tests", "fixtures", "voice_cfg_snapshot.json").read_text()
)


class SingerProfiles(unittest.TestCase):
    def test_engine_defaults_unchanged(self):
        self.assertEqual(EN.CFG, SNAP["engine_CFG"])

    def test_baritone_profile_is_engine_default(self):
        b = SG.load("baritone")
        mic = b.pop("mic")
        self.assertEqual(mic, 0)
        self.assertEqual(dict(EN.CFG, **b), SNAP["engine_CFG"])

    def test_persona_lines_unchanged(self):
        for li in range(16):
            got = dict(EN.CFG, **PS.line_cfg(li))
            self.assertEqual(got, SNAP["persona_line_cfg"][str(li)], f"line {li + 1:d}")
            for (
                k,
                v,
            ) in got.items():  # same values and same types (an int must stay an int)
                self.assertIs(
                    type(v),
                    type(SNAP["persona_line_cfg"][str(li)][k]),
                    f"line {li + 1:d} {k}",
                )


if __name__ == "__main__":
    unittest.main()
