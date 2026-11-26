"""CH/JH/ZH articulation: closure then postalveolar friction for the affricates; voicing as expected."""

import unittest

from concert.voice import gest as GE


def build(cons):
    t = 0.30
    segs = []
    for ph, role, d in (("AH", "nuc", 0.25), (cons, "on", 0.14), ("IH", "nuc", 0.25)):
        segs.append(
            {
                "ph": ph,
                "t0": t,
                "t1": t + d,
                "line": 0,
                "syl": 0 if role == "nuc" and not segs else 1,
                "role": role,
                "d": d,
            }
        )
        t += d
    perf = {"cr": 200, "f0": [150.0] * 400}
    return GE.Score(segs, perf), segs[1]


class Affricates(unittest.TestCase):
    def at(self, sc, k, t):
        return sc.T[k].sample([t])[0]

    def test_ch_closure_then_friction(self):
        sc, g = build("CH")
        t0, t1 = g["t0"], g["t1"]
        self.assertLess(self.at(sc, "cTT", t0 + 0.25 * (t1 - t0)), 0.0)  # closed
        self.assertAlmostEqual(
            self.at(sc, "cTT", t0 + 0.80 * (t1 - t0)), 0.40, delta=0.03
        )  # SH channel
        self.assertGreater(self.at(sc, "GA", t0 + 0.6 * (t1 - t0)), 0.15)  # voiceless

    def test_jh_voiced(self):
        sc, g = build("JH")
        t0, t1 = g["t0"], g["t1"]
        self.assertLess(self.at(sc, "cTT", t0 + 0.25 * (t1 - t0)), 0.0)
        self.assertAlmostEqual(
            self.at(sc, "cTT", t0 + 0.85 * (t1 - t0)), 0.43, delta=0.03
        )
        self.assertLess(self.at(sc, "GA", t0 + 0.8 * (t1 - t0)), 0.07)

    def test_zh_voiced_fricative(self):
        sc, g = build("ZH")
        t0, t1 = g["t0"], g["t1"]
        self.assertAlmostEqual(self.at(sc, "cTT", (t0 + t1) / 2), 0.43, delta=0.03)
        self.assertLess(self.at(sc, "GA", (t0 + t1) / 2), 0.07)


if __name__ == "__main__":
    unittest.main()
