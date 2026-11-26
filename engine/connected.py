"""connected.py - connected-speech processes (elision, assimilation, linking, weak forms), song-neutral.

The rules are data in connected_speech.json (catalogue order = application order); this module holds one function
per rule id and applies them to a line of sung syllables once note durations are known. Every firing is logged, so
the plan check and the listener can see what was reduced and where. Standard library only.

A syllable is a dict: w (word index in the line), word (text or None), winit/wfin (first/last syllable of its word),
on/nuc/off (phones), st (stress 0/1/2), d (note duration, s), on_mult/off_mult (duration factors per consonant),
syllabic (vowel lost, the first coda sonorant carries the note), brk (a phrase break - punctuation - follows this
syllable's word: no rule acts across it)."""
import copy, json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import lexicon as LX

VOWELS = LX.VOWEL_PHONES


def load(path=None):
    with open(path or os.path.join(HERE, "connected_speech.json")) as f: return json.load(f)


def syllable(w, word, winit, wfin, ph, st, d):
    vi = [i for i, p in enumerate(ph) if p in VOWELS]
    if len(vi) != 1: raise ValueError("a syllable needs exactly one vowel: %r" % (ph,))
    v = vi[0]; on, off = list(ph[:v]), list(ph[v + 1:])
    return dict(w=w, word=word, winit=winit, wfin=wfin, on=on, nuc=ph[v], off=off, st=st, d=d,
                on_mult=[1.0] * len(on), off_mult=[1.0] * len(off), syllabic=False, brk=False)


PUNCT = ",.;:!?"


def from_score(line_syl, lex=None, accent=None, text_line=None):
    """score syllables (word pieces ending '-' continue the word) -> syllables with stress from the lexicon (default 1).
    With the line's text, punctuation after a word marks a phrase break (only if the text's words match the score's)."""
    words = []; cur = []
    for s in line_syl:
        cur.append(s)
        if not s["word"].endswith("-"): words.append(cur); cur = []
    if cur: words.append(cur)
    out = []
    for w, pieces in enumerate(words):
        text = "".join(p["word"].rstrip("-") for p in pieces).strip(",.;:!?'\"").lower()
        st = [1] * len(pieces)
        if lex is not None and text in lex:
            ls = LX.stresses(lex[text], accent)
            if len(ls) == len(pieces): st = ls
        for k, p in enumerate(pieces):
            out.append(syllable(w, text, k == 0, k == len(pieces) - 1, list(p["ph"]), st[k], p["d"]))
    if text_line is not None:
        toks = text_line.split()
        names = [x.strip(PUNCT + "'\"").lower() for x in toks]
        if names == [s["word"].strip("'\"") for s in out if s["winit"]]:
            ends = [x[-1] in PUNCT for x in toks]
            for s in out:
                if s["wfin"]: s["brk"] = ends[s["w"]]
    return out


def parse(text, d=0.3, words=None):
    """'M AW1 N . T IH0 N # S AY1 D' -> syllables (for the catalogue's worked examples)"""
    wl = (words or "").split(); out = []
    parts = text.replace("|", "#|").split("#")
    for w, wt in enumerate(parts):
        if wt.startswith("|"): out[-1]["brk"] = True; wt = wt[1:]
        sy = [x.split() for x in wt.split(".")]
        for k, toks in enumerate(sy):
            ph = []; st = 1
            for t in toks:
                if t[-1].isdigit() and t[:-1] in VOWELS: ph.append(t[:-1]); st = int(t[-1])
                else: ph.append(t)
            out.append(syllable(w, wl[w] if w < len(wl) else None, k == 0, k == len(sy) - 1, ph, st, d))
    return out


def show(sylls):
    words = []
    for s in sylls:
        if s["winit"] or not words: words.append([])
        t = [p + (":" if m != 1.0 else "") for p, m in zip(s["on"], s["on_mult"])]
        if s["syllabic"]: t += ["=" + s["off"][0]] + s["off"][1:]
        else: t += ["%s%d" % (s["nuc"], s["st"])] + [p + (":" if m != 1.0 else "") for p, m in zip(s["off"], s["off_mult"])]
        words[-1].append(" ".join(t))
    return " # ".join(" . ".join(w) for w in words) if not any(s["brk"] for s in sylls) else _join(sylls, words)


def _join(sylls, words):
    seps = [s["brk"] for s in sylls if s["wfin"]]
    out = " . ".join(words[0])
    for k in range(1, len(words)): out += (" | " if seps[k - 1] else " # ") + " . ".join(words[k])
    return out


def _gate(rule, s):
    g = rule.get("gate") or {}
    if "max_syl_d" in g and not s["d"] < g["max_syl_d"]: return False
    if "stress" in g and s["st"] not in g["stress"]: return False
    return True


def _next_word_start(sy, i):
    """the next syllable if syllable i ends its word and the next word follows in this line"""
    return sy[i + 1] if sy[i]["wfin"] and not sy[i]["brk"] and i + 1 < len(sy) and sy[i + 1]["winit"] else None


# ---- one function per rule id: (syllables, index, rule, accent) -> description of the change, or None
def weak_forms(sy, i, R, accent):
    s = sy[i]
    if not (s["winit"] and s["wfin"]) or s["word"] not in R["params"]["forms"] or accent is None: return None
    ph = LX.phones(R["params"]["forms"][s["word"]].split(), accent)
    n = syllable(s["w"], s["word"], True, True, ph, s["st"], s["d"])
    if (n["on"], n["nuc"], n["off"]) == (s["on"], s["nuc"], s["off"]): return None
    sy[i] = n; return "%s -> weak form %s" % (s["word"], " ".join(ph))


def td_deletion(sy, i, R, accent):
    s = sy[i]; nx = _next_word_start(sy, i); P = R["params"]
    if nx is None or len(s["off"]) < 2 or s["off"][-1] not in ("T", "D") or not nx["on"] or nx["on"][0] in P["not_before"]: return None
    if (s["off"][-2] in P["voiced"]) != (s["off"][-1] == "D"): return None
    p = s["off"].pop(); s["off_mult"].pop(); return "%s loses final %s" % (s["word"], p)


def degemination(sy, i, R, accent):
    s = sy[i]; nx = _next_word_start(sy, i)
    if nx is None or not s["off"] or not nx["on"] or s["off"][-1] != nx["on"][0]: return None
    p = s["off"].pop(); s["off_mult"].pop(); nx["on_mult"][0] *= R["params"]["lengthen"]
    return "%s %s + %s %s -> one long %s" % (s["word"], p, nx["word"], p, p)


def place_assimilation(sy, i, R, accent):
    s = sy[i]; nx = _next_word_start(sy, i); M = R["params"]["map"]
    if nx is None or not s["off"] or s["off"][-1] not in M or not nx["on"] or nx["on"][0] not in M[s["off"][-1]]: return None
    a = s["off"][-1]; s["off"][-1] = M[a][nx["on"][0]]; return "%s final %s -> %s before %s" % (s["word"], a, s["off"][-1], nx["on"][0])


def yod_coalescence(sy, i, R, accent):
    s = sy[i]; nx = _next_word_start(sy, i); M = R["params"]["map"]
    if nx is None or not s["off"] or s["off"][-1] not in M or nx["on"][:1] != ["Y"]: return None
    a = s["off"].pop(); s["off_mult"].pop(); nx["on"][0] = M[a]; return "%s %s + Y -> %s" % (s["word"], a, M[a])


def syllabic_sonorant(sy, i, R, accent):
    s = sy[i]; P = R["params"]
    if s["winit"] or s["nuc"] not in P["vowels"] or not s["on"] or s["on"][-1] not in P["after"] or not s["off"] or s["off"][0] not in P["before"]: return None
    s["syllabic"] = True; return "%s: %s lost, syllabic %s" % (s["word"], s["nuc"], s["off"][0])


def linking_glide(sy, i, R, accent):
    s = sy[i]; nx = _next_word_start(sy, i); P = R["params"]
    if nx is None or s["off"] or nx["on"]: return None
    g = "Y" if s["nuc"] in P["Y"] else "W" if s["nuc"] in P["W"] else None
    if g is None: return None
    nx["on"] = [g]; nx["on_mult"] = [P["shorten"]]; return "%s + %s linked by %s" % (s["word"], nx["word"], g)


RULES = {"weak-forms": weak_forms, "td-deletion": td_deletion, "degemination": degemination,
         "place-assimilation": place_assimilation, "yod-coalescence": yod_coalescence,
         "syllabic-sonorant": syllabic_sonorant, "linking-glide": linking_glide}


def apply(sylls, catalogue, accent=None, only=None, line=None):
    """apply the catalogue's rules in order; returns (new syllables, log of firings)"""
    sy = copy.deepcopy(sylls); log = []
    for R in catalogue["rules"]:
        if only is not None and R["id"] not in only: continue
        fn = RULES[R["id"]]
        for i in range(len(sy)):
            if not _gate(R, sy[i]): continue
            what = fn(sy, i, R, accent)
            if what: log.append(dict(rule=R["id"], line=line, syl=i, what=what))
    return sy, log
