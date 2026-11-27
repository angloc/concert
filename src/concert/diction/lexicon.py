"""lexicon.py - words to sung syllables, song- and accent-neutral.

A song's lexicon writes each word as lexical-set vowels (Wells: FLEECE, GOAT, NORTH ...) and ARPAbet consonants.
Every lexical set carries a stress digit (CMUdict style): 1 primary, 2 secondary, 0 unstressed, e.g.
`calling  K THOUGHT1 L KIT0 NG`. `(r)` marks an R that only rhotic accents pronounce. An accent (accents/<name>/accent.json) maps lexical sets to
the phones the voice engine knows, and may rewrite consonants. Syllables for singing are found by maximal onset:
each vowel takes as many preceding consonants as form a legal English onset, the rest stay in the coda before it.
Standard library only."""

import itertools
import json

VOWEL_PHONES = {
    "AA",
    "AE",
    "AH",
    "AO",
    "AW",
    "AY",
    "EH",
    "ER",
    "EY",
    "IH",
    "IY",
    "OW",
    "OH",
    "OY",
    "UH",
    "UW",
}

# legal English onsets (ARPAbet). Single consonants are legal except NG.
ONSETS = {
    tuple(o.split())
    for o in """
P L|P R|B L|B R|T R|D R|K L|K R|G L|G R|F L|F R|TH R|SH R|T W|D W|K W|G W|TH W|S W|
S P|S T|S K|S M|S N|S L|S F|S P L|S P R|S T R|S K R|S K W|S P Y|S K Y|
P Y|B Y|F Y|V Y|M Y|K Y|G Y|HH Y""".replace("\n", "").split("|")
    if o.strip()
}


def load_accent(path: str) -> dict:
    """Load an accent file (accents/<name>/accent.json)."""
    with open(path) as f:
        return json.load(f)


def load_lexicon(path: str) -> dict[str, list[str]]:
    """Load a song lexicon: word -> lexical-set notation, '#' starting a comment."""
    lex = {}
    with open(path) as f:
        for line in f:
            line = line.split("#", 1)[0].strip()
            if not line:
                continue
            word, *ph = line.split()
            if word in lex:
                raise ValueError(f"duplicate lexicon entry: {word}")
            lex[word] = ph
    return lex


def split_stress(tok, accent):
    """'THOUGHT1' -> ('THOUGHT', 1) for a lexical set of this accent; (tok, None) for anything else"""
    if tok[-1:].isdigit() and tok[:-1] in accent["vowels"]:
        d = int(tok[-1])
        if d not in (0, 1, 2):
            raise ValueError(f"stress must be 0, 1 or 2: {tok!r}")
        return tok[:-1], d
    if tok in accent["vowels"]:
        raise ValueError(f"lexical set without a stress digit: {tok!r}")
    return tok, None


def stresses(word_ph: list[str], accent: dict) -> list[int]:
    """one stress digit per syllable (per lexical set), in order"""
    return [d for d in (split_stress(t, accent)[1] for t in word_ph) if d is not None]


def phones(word_ph: list[str], accent: dict) -> list[str]:
    """lexicon transcription -> ARPAbet phones for this accent"""
    out = []
    for p in word_ph:
        p, _ = split_stress(p, accent)
        if p == "(r)":
            if accent.get("rhotic"):
                out.append(accent.get("r_optional", "R"))
        elif p in accent["vowels"]:
            out += accent["vowels"][p]
        elif p.isupper() and p not in VOWEL_PHONES:
            out += accent.get("consonants", {}).get(p, [p])
        else:
            raise ValueError(
                f"unknown symbol {p!r} (lexical sets must be accent vowels; bare vowel phones are not allowed)"
            )
    return out


def legal_onset(cs):
    """Whether consonants `cs` may begin an English syllable."""
    return len(cs) == 0 or (len(cs) == 1 and cs[0] != "NG") or tuple(cs) in ONSETS


def syllabify(ph):
    """phones -> list of syllables (lists of phones), maximal onset. A rhotic R straight after a vowel stays in its coda."""
    nuc = [i for i, p in enumerate(ph) if p in VOWEL_PHONES]
    if not nuc:
        raise ValueError(f"no vowel in {ph!r}")
    cuts = [0]
    for a, b in itertools.pairwise(nuc):
        cl = ph[a + 1 : b]
        k = 0  # k = consonants left in the coda of syllable a
        while not legal_onset(cl[k:]):
            k += 1
        cuts.append(a + 1 + k)
    cuts.append(len(ph))
    return [ph[x:y] for x, y in itertools.pairwise(cuts)]


def sung(word: str, lex: dict[str, list[str]], accent: dict) -> list[list[str]]:
    """word as written in the song (case-insensitive) -> its sung syllables"""
    key = word.lower()
    if key not in lex:
        raise KeyError(f"word not in lexicon: {word!r}")
    return syllabify(phones(lex[key], accent))


def sung_stress(
    word: str, lex: dict[str, list[str]], accent: dict
) -> list[tuple[list[str], int]]:
    """word -> [(syllable phones, stress digit)]"""
    syl = sung(word, lex, accent)
    st = stresses(lex[word.lower()], accent)
    if len(st) != len(syl):
        raise ValueError(
            f"{word!r}: {len(syl):d} syllables but {len(st):d} stress digits"
        )
    return list(zip(syl, st))
