"""The lexical-set lexicon and accent v0 must reproduce every phone of the original Danny Boy score exactly.
python3 -m unittest tests.test_lexicon_danny_boy"""
import os, sys, unittest
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "engine")); sys.path.insert(0, os.path.join(ROOT, "music"))
import lexicon as LX
import score as SC


def score_words():
    """(line, word, [syllable phones]) from the hand-written score; a trailing '-' continues the word"""
    out = []; li = 0
    for V in (SC.V1, SC.V2):
        for L in V:
            cur = None
            for s in L["syl"]:
                piece = s["word"]
                if cur is None: cur = ["", []]
                cur[0] += piece.rstrip("-"); cur[1].append(list(s["ph"]))
                if not piece.endswith("-"): out.append((li, cur[0], cur[1])); cur = None
            li += 1
    return out


class DannyBoyRoundTrip(unittest.TestCase):
    def test_every_word(self):
        lex = LX.load_lexicon(os.path.join(ROOT, "songs", "danny-boy", "lexicon.txt"))
        acc = LX.load_accent(os.path.join(ROOT, "accents", "irish", "accent.json"))
        bad = []
        for li, w, syl in score_words():
            got = LX.sung(w, lex, acc)
            if got != syl: bad.append("L%d %s: score %s, lexicon %s" % (li + 1, w, syl, got))
        self.assertEqual(bad, [], "\n" + "\n".join(bad))

    def test_stress(self):
        """every word: one stress digit per syllable; content words of two or more syllables have exactly one primary"""
        lex = LX.load_lexicon(os.path.join(ROOT, "songs", "danny-boy", "lexicon.txt"))
        acc = LX.load_accent(os.path.join(ROOT, "accents", "irish", "accent.json"))
        bad = []
        for w in lex:
            st = [d for _, d in LX.sung_stress(w, lex, acc)]
            if len(st) > 1 and st.count(1) != 1: bad.append("%s %s" % (w, st))
        self.assertEqual(bad, [])

    def test_no_unused_entries(self):
        lex = LX.load_lexicon(os.path.join(ROOT, "songs", "danny-boy", "lexicon.txt"))
        used = {w.lower() for _, w, _ in score_words()}
        self.assertEqual(sorted(set(lex) - used), [])


if __name__ == "__main__":
    unittest.main()
