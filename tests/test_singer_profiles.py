"""Moving the singers into singers/<name>/profile.json must not change a single setting the engine receives.
The fixture was captured from commit 4cd85f6 (danny-boy-female) before the move.
python3 -m unittest tests.test_singer_profiles"""
import json, os, sys, unittest
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "voice")); sys.path.insert(0, os.path.join(ROOT, "engine"))
import engine as EN, persona as PS, singer as SG

SNAP = json.load(open(os.path.join(ROOT, "tests", "fixtures", "voice_cfg_snapshot.json")))


class SingerProfiles(unittest.TestCase):
    def test_engine_defaults_unchanged(self):
        self.assertEqual(EN.CFG, SNAP["engine_CFG"])

    def test_baritone_profile_is_engine_default(self):
        b = SG.load("baritone"); mic = b.pop("mic")
        self.assertEqual(mic, 0); self.assertEqual(dict(EN.CFG, **b), SNAP["engine_CFG"])

    def test_persona_lines_unchanged(self):
        for li in range(16):
            got = dict(EN.CFG, **PS.line_cfg(li))
            self.assertEqual(got, SNAP["persona_line_cfg"][str(li)], "line %d" % (li + 1))
            for k, v in got.items():                       # same values and same types (an int must stay an int)
                self.assertIs(type(v), type(SNAP["persona_line_cfg"][str(li)][k]), "line %d %s" % (li + 1, k))


if __name__ == "__main__":
    unittest.main()
