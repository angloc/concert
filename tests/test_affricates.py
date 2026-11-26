"""CH/JH/ZH articulation: closure then postalveolar friction for the affricates; voicing as expected.
python3 -m unittest tests.test_affricates"""
import os, sys, unittest
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "voice"))
import gest as GE


def build(cons):
    t = .30; segs = []
    for ph, role, d in (("AH", "nuc", .25), (cons, "on", .14), ("IH", "nuc", .25)):
        segs.append(dict(ph=ph, t0=t, t1=t + d, line=0, syl=0 if role == "nuc" and not segs else 1, role=role, d=d)); t += d
    perf = dict(cr=200, f0=[150.0] * 400)
    return GE.Score(segs, perf), segs[1]


class Affricates(unittest.TestCase):
    def at(self, sc, k, t): return sc.T[k].sample([t])[0]

    def test_ch_closure_then_friction(self):
        sc, g = build("CH"); t0, t1 = g["t0"], g["t1"]
        self.assertLess(self.at(sc, "cTT", t0 + .25 * (t1 - t0)), 0.0)                 # closed
        self.assertAlmostEqual(self.at(sc, "cTT", t0 + .80 * (t1 - t0)), .40, delta=.03)  # SH channel
        self.assertGreater(self.at(sc, "GA", t0 + .6 * (t1 - t0)), .15)                 # voiceless

    def test_jh_voiced(self):
        sc, g = build("JH"); t0, t1 = g["t0"], g["t1"]
        self.assertLess(self.at(sc, "cTT", t0 + .25 * (t1 - t0)), 0.0)
        self.assertAlmostEqual(self.at(sc, "cTT", t0 + .85 * (t1 - t0)), .43, delta=.03)
        self.assertLess(self.at(sc, "GA", t0 + .8 * (t1 - t0)), .07)

    def test_zh_voiced_fricative(self):
        sc, g = build("ZH"); t0, t1 = g["t0"], g["t1"]
        self.assertAlmostEqual(self.at(sc, "cTT", (t0 + t1) / 2), .43, delta=.03)
        self.assertLess(self.at(sc, "GA", (t0 + t1) / 2), .07)


if __name__ == "__main__":
    unittest.main()
