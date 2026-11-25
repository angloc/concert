"""lexicon.py - words to sung syllables, song- and accent-neutral.

A song's lexicon writes each word as lexical-set vowels (Wells: FLEECE, GOAT, NORTH ...) and ARPAbet consonants.
`(r)` marks an R that only rhotic accents pronounce. An accent (accents/<name>/accent.json) maps lexical sets to
the phones the voice engine knows, and may rewrite consonants. Syllables for singing are found by maximal onset:
each vowel takes as many preceding consonants as form a legal English onset, the rest stay in the coda before it.
Standard library only."""
import json, os

VOWEL_PHONES = {"AA", "AE", "AH", "AO", "AW", "AY", "EH", "ER", "EY", "IH", "IY", "OW", "OY", "UH", "UW"}

# legal English onsets (ARPAbet). Single consonants are legal except NG.
ONSETS = {tuple(o.split()) for o in """
P L|P R|B L|B R|T R|D R|K L|K R|G L|G R|F L|F R|TH R|SH R|T W|D W|K W|G W|TH W|S W|
S P|S T|S K|S M|S N|S L|S F|S P L|S P R|S T R|S K R|S K W|S P Y|S K Y|
P Y|B Y|F Y|V Y|M Y|K Y|G Y|HH Y""".replace("\n", "").split("|") if o.strip()}


def load_accent(path):
    with open(path) as f: return json.load(f)


def load_lexicon(path):
    lex = {}
    with open(path) as f:
        for line in f:
            line = line.split("#", 1)[0].strip()
            if not line: continue
            word, *ph = line.split()
            if word in lex: raise ValueError("duplicate lexicon entry: %s" % word)
            lex[word] = ph
    return lex


def phones(word_ph, accent):
    """lexicon transcription -> ARPAbet phones for this accent"""
    out = []
    for p in word_ph:
        if p == "(r)":
            if accent.get("rhotic"): out.append(accent.get("r_optional", "R"))
        elif p in accent["vowels"]: out += accent["vowels"][p]
        elif p.isupper() and p not in VOWEL_PHONES: out += accent.get("consonants", {}).get(p, [p])
        else: raise ValueError("unknown symbol %r (lexical sets must be accent vowels; bare vowel phones are not allowed)" % p)
    return out


def legal_onset(cs):
    return len(cs) == 0 or (len(cs) == 1 and cs[0] != "NG") or tuple(cs) in ONSETS


def syllabify(ph):
    """phones -> list of syllables (lists of phones), maximal onset. A rhotic R straight after a vowel stays in its coda."""
    nuc = [i for i, p in enumerate(ph) if p in VOWEL_PHONES]
    if not nuc: raise ValueError("no vowel in %r" % ph)
    cuts = [0]
    for a, b in zip(nuc, nuc[1:]):
        cl = ph[a + 1:b]; k = 0                     # k = consonants left in the coda of syllable a
        while not legal_onset(cl[k:]): k += 1
        cuts.append(a + 1 + k)
    cuts.append(len(ph))
    return [ph[x:y] for x, y in zip(cuts, cuts[1:])]


def sung(word, lex, accent):
    """word as written in the song (case-insensitive) -> its sung syllables"""
    key = word.lower()
    if key not in lex: raise KeyError("word not in lexicon: %r" % word)
    return syllabify(phones(lex[key], accent))
