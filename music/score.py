"""score.py - Danny Boy (Weatherly 1913 / Londonderry Air, public domain).
Pure standard library. Defines tempo, melody, syllables, phonemes, harmony and emotion.
`python3 music/score.py` writes build/score.json.
Times are seconds. Beat unit = one EIGHTH note. Key: E flat major (tonic Eb3 = MIDI 51).
"""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

BPM_Q = 69.0                 # base quarter tempo
E8 = 60.0 / BPM_Q / 2.0      # base eighth
N = {"B,":48,"C":50,"D":51,"E":53,"F":55,"G":56,"A":58,"B":60,"c":62,"d":63,"e":65,"f":67}

# ---- melody, 16 bars per verse. Each item: (notes, eighths) consumed by syllables in order.
# A syllable = word piece, phonemes (ARPAbet), list of (note, eighths). "|" only for reading.
def S(word, ph, *notes): return dict(word=word, ph=ph.split(), notes=list(notes))
# word: trailing "-" = continues into next syllable

V1 = [
 # line 1
 dict(text="Oh Danny boy, the pipes, the pipes are calling", mood="tender, a little held breath; she hears it before he does", dyn=(0.42,0.50), color="warm", syl=[
  S("Oh","OH",("C",1)), S("Dan-","D AE",("D",1)), S("ny","N IY",("E",1)),
  S("boy","B OY",("F",3)), S("the","DH AH",("E",1)), S("pipes","P AY P S",("F",1)), S("the","DH AH",("B",1)), S("pipes","P AY P S",("A",1)), S("are","AA R",("F",1)),
  S("call-","K AO",("E",1),("D",1)), S("ing","L IH NG",("B,",2)) ]),
 dict(text="From glen to glen, and down the mountain side", mood="the sound travelling; wide, looking far away", dyn=(0.44,0.52), color="open", syl=[
  S("From","F R AH M",("D",1)), S("glen","G L EH N",("F",1)), S("to","T UW",("G",1)),
  S("glen","G L EH N",("A",3)), S("and","AE N D",("B",1)), S("down","D AW N",("A",1)), S("the","DH AH",("F",1)), S("moun-","M AW N",("D",1)), S("tain","T IH N",("F",1)),
  S("side","S AY D",("E",4)) ]),
 dict(text="The summer's gone, and all the roses falling", mood="regret, softer, head down", dyn=(0.40,0.46), color="soft", syl=[
  S("The","DH AH",("C",1)), S("sum-","S AH",("D",1)), S("mer's","M ER Z",("E",1)),
  S("gone","G AO N",("F",3)), S("and","AE N D",("E",1)), S("all","AO L",("F",1)), S("the","DH AH",("B",1)), S("ro-","R OH",("A",1)), S("ses","Z IH Z",("F",1)),
  S("fall-","F AO",("E",1),("D",1)), S("ing","L IH NG",("B,",2)) ]),
 dict(text="'Tis you, 'tis you must go and I must bide", mood="plain truth, almost spoken, 'I must bide' swallowed", dyn=(0.46,0.36), color="plain", syl=[
  S("'Tis","T IH Z",("C",1)), S("you","Y UW",("D",1)), S("'tis","T IH Z",("E",1)),
  S("you","Y UW",("F",3)), S("must","M AH S T",("G",1)), S("go","G OH",("F",1)), S("and","AE N D",("E",1)), S("I","AY",("D",1)), S("must","M AH S T",("E",1)),
  S("bide","B AY D",("D",4)) ]),
 dict(text="But come ye back when summer's in the meadow", mood="hope opening, brighter, forward", dyn=(0.54,0.62), color="bright", syl=[
  S("But","B AH T",("A",1)), S("come","K AH M",("B",1)), S("ye","Y IY",("c",1)),
  S("back","B AE K",("d",3)), S("when","W EH N",("c",1)), S("sum-","S AH",("c",1)), S("mer's","M ER Z",("B",1)), S("in","IH N",("A",1)), S("the","DH AH",("B",1)),
  S("mea-","M EH",("A",1),("F",1)), S("dow","D OH",("D",2)) ]),
 dict(text="Or when the valley's hushed and white with snow", mood="hushed, breathy, a whisper of snow", dyn=(0.52,0.34), color="hushed", syl=[
  S("Or","AO R",("A",1)), S("when","W EH N",("B",1)), S("the","DH AH",("c",1)),
  S("val-","V AE",("d",3)), S("ley's","L IY Z",("c",1)), S("hushed","HH AH SH T",("c",1)), S("and","AE N D",("B",1)), S("white","W AY T",("A",1)), S("with","W IH DH",("F",1)),
  S("snow","S N OH",("E",4)) ]),
 dict(text="'Tis I'll be here in sunshine or in shadow", mood="CLIMAX: the vow, full voice, unguarded", dyn=(0.66,0.90), color="full", syl=[
  S("'Tis","T IH Z",("A",1)), S("I'll","AY L",("A",1)), S("be","B IY",("A",1)),
  S("here","HH IH R",("f",3)), S("in","IH N",("e",1)), S("sun-","S AH N",("e",1)), S("shine","SH AY N",("d",1)), S("or","AO R",("B",1)), S("in","IH N",("d",1)),
  S("sha-","SH AE",("A",1),("F",1)), S("dow","D OH",("D",2)) ]),
 dict(text="Oh Danny boy, oh Danny boy, I love you so", mood="coming down from the vow; 'I love you so' nearly breaks", dyn=(0.58,0.34), color="breaking", syl=[
  S("Oh","OH",("C",1)), S("Dan-","D AE",("D",1)), S("ny","N IY",("E",1)),
  S("boy","B OY",("F",1.5)), S("oh","OH",("B",1.5)), S("Dan-","D AE",("A",1)), S("ny","N IY",("F",1)), S("boy","B OY",("E",1.5)), S("I","AY",("D",0.75)), S("love","L AH V",("B,",1)), S("you","Y UW",("C",1)),
  S("so","S OH",("D",5)) ]),
]
V2 = [
 dict(text="But when ye come, and all the flowers are dying", mood="older, emptier, very close to the ear", dyn=(0.36,0.42), color="worn", syl=[
  S("But","B AH T",("C",1)), S("when","W EH N",("D",1)), S("ye","Y IY",("E",1)),
  S("come","K AH M",("F",3)), S("and","AE N D",("E",1)), S("all","AO L",("F",1)), S("the","DH AH",("B",1)), S("flow'rs","F L AW R",("A",1)), S("are","AA R",("F",1)),
  S("dy-","D AY",("E",1),("D",1)), S("ing","IH NG",("B,",2)) ]),
 dict(text="If I am dead, as dead I well may be", mood="said simply, no self pity, a small dry smile", dyn=(0.40,0.38), color="plain", syl=[
  S("If","IH F",("D",1)), S("I","AY",("F",1)), S("am","AE M",("G",1)),
  S("dead","D EH D",("A",3)), S("as","AE Z",("B",1)), S("dead","D EH D",("A",1)), S("I","AY",("F",1)), S("well","W EH L",("D",1)), S("may","M EY",("F",1)),
  S("be","B IY",("E",4)) ]),
 dict(text="Ye'll come and find the place where I am lying", mood="leading him by the hand", dyn=(0.42,0.46), color="warm", syl=[
  S("Ye'll","Y IY L",("C",1)), S("come","K AH M",("D",1)), S("and","AE N D",("E",1)),
  S("find","F AY N D",("F",3)), S("the","DH AH",("E",1)), S("place","P L EY S",("F",1)), S("where","W EH R",("B",1)), S("I","AY",("A",1)), S("am","AE M",("F",1)),
  S("ly-","L AY",("E",1),("D",1)), S("ing","IH NG",("B,",2)) ]),
 dict(text="And kneel and say an Ave there for me", mood="reverent, still", dyn=(0.40,0.36), color="soft", syl=[
  S("And","AE N D",("C",1)), S("kneel","N IY L",("D",1)), S("and","AE N D",("E",1)),
  S("say","S EY",("F",3)), S("an","AE N",("G",1)), S("A-","AA",("F",1)), S("ve","V EY",("E",1)), S("there","DH EH R",("D",1)), S("for","F AO R",("E",1)),
  S("me","M IY",("D",4)) ]),
 dict(text="And I shall hear, though soft you tread above me", mood="waking under the earth, wonder, hushed but lit", dyn=(0.46,0.54), color="wonder", syl=[
  S("And","AE N D",("A",1)), S("I","AY",("B",1)), S("shall","SH AE L",("c",1)),
  S("hear","HH IH R",("d",3)), S("though","DH OH",("c",1)), S("soft","S AO F T",("c",1)), S("you","Y UW",("B",1)), S("tread","T R EH D",("A",1)), S("a-","AH",("B",1)),
  S("bove","B AH V",("A",1),("F",1)), S("me","M IY",("D",2)) ]),
 dict(text="And all my grave will warmer, sweeter be", mood="warmth rising, growing", dyn=(0.54,0.62), color="warm", syl=[
  S("And","AE N D",("A",1)), S("all","AO L",("B",1)), S("my","M AY",("c",1)),
  S("grave","G R EY V",("d",3)), S("will","W IH L",("c",1)), S("warm-","W AO R",("c",1)), S("er","M ER",("B",1)), S("sweet-","S W IY",("A",1)), S("er","T ER",("F",1)),
  S("be","B IY",("E",4)) ]),
 dict(text="For you will bend and tell me that you love me", mood="CLIMAX: the answer comes; joy and grief at once", dyn=(0.70,0.94), color="full", syl=[
  S("For","F AO R",("A",1)), S("you","Y UW",("A",1)), S("will","W IH L",("A",1)),
  S("bend","B EH N D",("f",3)), S("and","AE N D",("e",1)), S("tell","T EH L",("e",1)), S("me","M IY",("d",1)), S("that","DH AE T",("B",1)), S("you","Y UW",("d",1)),
  S("love","L AH V",("A",1),("F",1)), S("me","M IY",("D",2)) ]),
 dict(text="And I shall sleep in peace until you come to me", mood="rest; slower and slower; the last note thins to breath", dyn=(0.48,0.26), color="rest", syl=[
  S("And","AE N D",("C",1)), S("I","AY",("D",1)), S("shall","SH AE L",("E",1)),
  S("sleep","S L IY P",("F",1.5)), S("in","IH N",("B",1.5)), S("peace","P IY S",("A",1.5)), S("un-","AH N",("F",0.75)), S("til","T IH L",("E",1)), S("you","Y UW",("D",0.75)), S("come","K AH M",("B,",1.25)), S("to","T UW",("C",1)),
  S("me","M IY",("D",8)) ]),
]
# tempo feel per line: (pickup stretch, body stretch, last-note stretch, breath rest in eighths after the line)
FEEL = [ (1.10,1.00,1.00,1.0),(1.02,1.00,1.04,1.0),(1.02,1.02,1.04,1.0),(1.02,1.06,1.12,1.0),
         (1.00,0.98,1.00,1.0),(1.00,1.02,1.10,1.1),(1.06,1.06,1.10,1.0),(1.16,1.32,1.35,0.0),
         (1.10,1.02,1.02,1.0),(1.04,1.02,1.04,1.0),(1.02,1.00,1.02,1.0),(1.02,1.06,1.12,1.1),
         (1.00,1.00,1.02,1.0),(1.00,1.00,1.04,1.0),(1.06,1.08,1.14,1.1),(1.20,1.40,1.50,0.0) ]
# harmony: two half-bar chords per bar, as (root pitch class name in Eb, quality). bar 1 = first full bar of line
CH = {1:[("Eb","maj"),("Eb7","dom/Db")], 2:[("Ab","maj"),("Ab","min6")], 3:[("Eb","maj/G"),("Cm","min")], 4:[("Fm7","min7"),("Bb7","dom")],
      5:[("Eb","maj"),("Eb7","dom/Db")], 6:[("Ab","maj"),("F","min")],   7:[("Eb","maj/Bb"),("Bb7","dom")], 8:[("Eb","maj"),("Bb7","sus")],
      9:[("Cm","min"),("Ab","maj")],     10:[("Eb","maj"),("Bb","maj/D")],11:[("Cm","min"),("Gm","min")],    12:[("Fm7","min7"),("Bb7","dom")],
      13:[("Eb","maj/G"),("Ab","maj7")], 14:[("Eb","maj/Bb"),("Cm","min")],15:[("Fm7","min7"),("Bb7","sus-dom")],16:[("Eb","maj"),("Eb","add9")]}

INTRO = 8.4          # seconds before the first sung pickup
INTER = 8.2          # instrumental between verses (from end of "so" to next pickup)
OUTRO = 12.5         # after the last "me" begins to fade

def build():
    t = INTRO
    lines = []; notes = []; bars = []
    allv = [("v1", V1), ("v2", V2)]
    li = 0
    for vname, V in allv:
        if vname == "v2": t += INTER
        for k, L in enumerate(V):
            pk, bd, ls, br = FEEL[li]
            syl_out = []
            t0 = t
            e = 0.0; nsyl = len(L["syl"])
            for si, s in enumerate(L["syl"]):
                last = si == nsyl - 1
                stretch = pk if e < 3 - 1e-6 else (ls if last else bd)
                ns = []
                for (nm, ei) in s["notes"]:
                    d = ei * E8 * stretch
                    if abs(e - 3) < 1e-6: bars.append(dict(line=li, bar=2*k+1, t=t, verse=vname))
                    if abs(e - 11) < 1e-6: bars.append(dict(line=li, bar=2*k+2, t=t, verse=vname))
                    ns.append(dict(midi=N[nm], t=round(t,4), d=round(d,4)))
                    t += d; e += ei
                syl_out.append(dict(word=s["word"], ph=s["ph"], t=ns[0]["t"], d=round(sum(n["d"] for n in ns),4), notes=ns))
                notes += ns
            lines.append(dict(i=li, verse=vname, text=L["text"], mood=L["mood"], color=L["color"], dyn=L["dyn"],
                              t0=round(t0,4), t1=round(t,4), syl=syl_out))
            t += br * E8 * 1.0
            li += 1
    end = t + OUTRO
    # chords with absolute times
    chords = []
    bt = {}
    for i, b in enumerate(bars):
        nxt = None
        for c in bars[i+1:]:
            if c["t"] > b["t"]: nxt = c["t"]; break
        L = lines[b["line"]]
        if nxt is None or (nxt - b["t"]) > 6.5: nxt = b["t"] + 8*E8*1.3
        half = (nxt - b["t"]) / 2
        for j, c in enumerate(CH[b["bar"]]):
            chords.append(dict(t=round(b["t"]+j*half,4), d=round(half,4), chord=c[0], kind=c[1], bar=b["bar"], verse=b["verse"]))
    return dict(title="Danny Boy", key="Eb", tonic_midi=51, bpm=BPM_Q, e8=E8, intro=INTRO, inter=INTER, outro=OUTRO,
                total=round(end,4), lines=lines, bars=bars, chords=chords)

if __name__ == "__main__":
    sc = build()
    os.makedirs(os.path.join(ROOT, "build"), exist_ok=True)
    json.dump(sc, open(os.path.join(ROOT, "build", "score.json"), "w"), indent=1)
    print("total", sc["total"])
    for L in sc["lines"]:
        e = sum(n["d"] for s in L["syl"] for n in s["notes"])
        print("%2d %s %7.2f-%7.2f  %s" % (L["i"], L["verse"], L["t0"], L["t1"], L["text"]))
