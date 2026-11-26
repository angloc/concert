"""Every worked example in engine/connected_speech.json, run through its own rule alone.
python3 -m unittest tests.test_connected_speech"""
import os, sys, unittest
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "engine"))
import connected as CS, lexicon as LX


class Catalogue(unittest.TestCase):
    def test_examples(self):
        cat = CS.load(); acc = LX.load_accent(os.path.join(ROOT, "accents", "irish", "accent.json")); bad = []
        for R in cat["rules"]:
            self.assertIn(R["id"], CS.RULES, "rule without an implementation")
            self.assertIn(R["source"].split()[0], cat["sources"])
            self.assertTrue(R["examples"], R["id"] + " has no worked examples")
            for ex in R["examples"]:
                sy = CS.parse(ex["in"], ex.get("d", .3), ex.get("words"))
                got = CS.show(CS.apply(sy, cat, acc, only=[R["id"]])[0])
                if got != ex["out"]: bad.append("%s: %s -> %s (expected %s)" % (R["id"], ex["in"], got, ex["out"]))
        self.assertEqual(bad, [], "\n" + "\n".join(bad))

    def test_show_round_trip(self):
        for t in ("M AW1 N . T IH0 N # S AY1 D", "AE0 N D # D AW1 N"):
            self.assertEqual(CS.show(CS.parse(t)), t)


if __name__ == "__main__":
    unittest.main()
