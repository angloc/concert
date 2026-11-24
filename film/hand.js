// hand.js - one person's handwriting, stroke by stroke.
// Every letter is a pen path (control points in true pen order), not an outline. Letters join where the hand would join them,
// common letters have 2-4 forms, and each time one is written its points, slant, size and place on the line move a little.
//
//   BIDE.hand.layout(text,{x,y,size,align,seed,tail})   -> {strokes:[{pts:[[x,y,press]..],len,at,word,ch}],total,width,x0,x1,words}
//   BIDE.hand.write(p,text,{x,y,size,color,w,k,align,seed,press,alpha,medium,wobble,passes})   k 0..1 along the true stroke order
//   BIDE.hand.measure(text,{size,seed})                 -> {width,ascent,descent}
//   BIDE.hand.title(p,{x,y,size,k,color,w})             the film title "Danny Boy"
//   BIDE.hand.signaturePath({x,y,size})                 -> [[x,y,press]..] "bide" as ONE continuous line (size = letter size; x = middle of the word, y = baseline)
//   BIDE.hand.signature(p,{x,y,size,k,color,w})         writes its first k in red thread, returns the tip; BIDE.hand.cut(points,k) = first k of any path
//   BIDE.lyrics(p,s)                                    the sung line at the bottom of the sheet
//
// WHERE main.js SHOULD CALL B.lyrics: inside fnFor(), after the scene has drawn, on EVERY sheet, transitions included:
//     return p => { if (sc) sc.draw(p, st); else p.paper('#e6d9c0');  if (B.lyrics) B.lyrics(p, st); };   // st = state(o, abs)
// It opens its own last layer ('lyric'), reads only st.abs (which line is being sung now) and st.id (pencil or chalk). Because both sheets
// of a transition get the same words at the same place, the line stays whole while one picture is painted over the other.
window.BIDE = window.BIDE || {};
(function () {
  const B = window.BIDE, clamp = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x, lerp = (a, b, k) => a + (b - a) * k;

  // ------------------------------------------------------------------------------------------------ alphabet
  // Units: x-height 100, baseline 0, y up, unslanted. "x,y x,y! ..." = points the pencil passes through; ! = it turns sharply there.
  // | lifts the pencil. A stroke starting with + is made after the joined run (dots, crossbars).
  // Prefixes: < only when the letter is started fresh; ^ only when joined from the letter before;
  //           > only when the letter ends (free exit); ] only when it joins the next one.
  // w advance, i how willing it is to be joined from the left (0..1), o exit: 0 lifts, 1 leaves along the baseline, 2 leaves from the top, f how often.
  const G = {
    a: [
      { w: 104, i: .5, o: 1, s: '^4,40 ^34,88 ^60,100 82,86! 57,101 28,92 9,56 11,18 32,-3 57,13 75,53 83,95! 79,48 82,15 93,1 106,7 >126,27' },
      { w: 101, i: .4, o: 1, s: '^2,36 ^36,86 ^64,98 86,90! 62,101 31,88 11,50 16,9 42,-2 65,24 80,70 86,90! 81,40 86,8 99,2 >120,19' },
      { w: 98, i: .2, o: 1, s: '<72,95 70,97 44,101 17,76 8,38 20,4 44,3 67,35 78,82 80,90! 78,34 84,5 98,0 >114,14' },
      { w: 106, i: .4, o: 1, s: '^6,44 ^38,90 ^64,99 84,78! 66,98 36,97 11,66 8,26 27,-2 54,7 76,48 88,98! 83,54 84,18 96,2 108,6 >132,30' }],
    b: [
      { w: 98, i: 0, o: 0, s: '22,197 18,124 14,44 13,3! 19,50 41,90 69,95 90,68 85,25 57,-2 29,4 >13,19' },
      { w: 96, i: .7, o: 0, s: '<-2,28 28,100 46,166 40,196 24,186 16,120 12,40 14,4! 25,62 53,97 84,84 90,42 65,0 31,2 >16,16' },
      { w: 95, i: 0, o: 0, s: '28,198 17,118 12,34 32,0 68,4 90,42 78,84 50,91 18,62' }],
    c: [
      { w: 88, i: .4, o: 1, s: '^2,36 ^34,84 ^58,98 80,82! 62,100 33,92 9,55 15,13 45,-3 70,5 >93,25' },
      { w: 90, i: .3, o: 1, s: '84,86 60,99 27,85 10,45 25,7 55,-1 76,9 >97,31' }],
    d: [
      { w: 108, i: .4, o: 1, s: '^4,38 ^34,86 ^58,99 80,83! 57,100 27,91 8,51 15,11 41,-2 65,21 80,78 89,148 93,196! 87,112 84,42 89,8 102,0 >123,19' },
      { w: 107, i: .2, o: 1, s: '78,90 50,98 20,81 8,41 22,2 49,3 72,36 83,96 91,192! 84,96 83,30 92,3 >112,8' },
      { w: 104, i: .1, o: 0, f: .5, fin: 1, s: '80,76 53,98 21,82 8,39 27,0 61,4 85,50 87,112 70,164 40,192' }],
    e: [
      { w: 84, i: 1, o: 1, s: '<1,36 15,46 49,55 79,73 75,95 50,102 22,87 10,47 23,7 53,-3 73,4 >94,24' },
      { w: 83, i: 1, o: 1, s: '<-3,27 13,38 47,51 75,71 72,93 52,101 26,89 13,49 27,5 59,-1 77,8 >101,31' },
      { w: 88, i: 1, o: 1, s: '<4,46 17,51 54,55 84,68 80,95 48,102 17,77 10,35 33,-1 65,2 81,12 >101,30' },
      { w: 80, i: 1, o: 1, s: '<-1,30 14,40 42,52 68,74 63,97 44,100 22,80 14,42 26,4 54,0 72,10 >92,32' },
      { w: 86, i: 1, o: 1, f: .7, s: '<0,40 14,47 50,50 78,60 82,86 60,101 32,94 12,64 14,22 38,-2 66,0 82,14 >104,36' }],
    f: [
      { w: 68, i: 0, o: 0, s: '88,172 70,198 48,188 37,142 33,72 28,-2 | +1,92 34,98 76,102' },
      { w: 70, i: 0, o: 0, s: '90,176 72,199 48,184 38,112 32,22 24,-50 5,-85 -18,-72 | +-2,90 36,98 74,105' },
      { w: 70, i: .7, o: 0, f: .12, s: '<-2,24 26,96 52,166 46,198 32,186 26,110 22,10 16,-62 2,-88 -8,-66 14,-14 | +0,94 34,99 72,101' }],
    g: [
      { w: 97, i: .4, o: 0, s: '^4,38 ^34,86 ^58,99 80,83! 57,100 27,91 9,53 17,13 43,2 66,28 84,92! 83,30 79,-30 63,-78 31,-91 1,-74' },
      { w: 99, i: .3, o: 1, s: '80,85 54,100 24,88 9,48 20,9 47,4 70,36 86,94! 84,22 77,-50 51,-91 20,-78 23,-48 58,-15 94,14 >117,34' },
      { w: 96, i: .2, o: 0, s: '76,92 44,99 14,72 10,32 32,2 60,18 79,60 83,90! 84,10 72,-56 44,-92 12,-84 -8,-62' }],
    h: [
      { w: 104, i: 0, o: 1, s: '22,197 19,122 14,42 12,0! 22,54 48,94 74,91 82,55 80,17 92,0 105,5 >124,24' },
      { w: 104, i: 1, o: 1, s: '<-3,30 30,104 47,170 39,197 23,182 16,112 12,0! 24,60 50,95 76,85 80,37 84,7 97,0 >118,20' },
      { w: 100, i: 0, o: 1, s: '24,194 15,64 12,0! 30,66 57,95 77,77 76,22 84,1 >106,13' }],
    i: [
      { w: 44, i: 1, o: 1, s: '<-4,74 12,98! 12,50 16,13 27,0 40,6 >58,27 | +20,144 23,136' },
      { w: 42, i: 1, o: 1, s: '<4,86 15,97! 10,42 18,5 31,1 >52,21 | +15,150 25,141' },
      { w: 40, i: 1, o: 1, s: '10,95! 12,42 15,4 24,0 >38,10 | +14,140 18,149 23,140' },
      { w: 45, i: 1, o: 1, s: '<-6,66 13,96! 13,46 19,9 33,-1 >56,22 | +24,146 30,152' }],
    j: [
      { w: 46, i: .8, o: 0, s: '<0,76 16,97! 18,22 12,-46 -10,-85 -37,-74 | +22,144 25,137' }],
    k: [
      { w: 92, i: 0, o: 1, s: '22,197 18,100 12,0 | 80,94 49,63 23,44! 45,30 69,6 85,0 >105,14' },
      { w: 90, i: 0, o: 1, s: '22,195 17,90 12,0! 17,42 45,82 73,91 75,66 45,50 25,48! 53,22 79,0 >101,12' }],
    l: [
      { w: 44, i: 0, o: 1, s: '19,197 14,112 13,38 22,4 35,2 >57,24' },
      { w: 50, i: 1, o: 1, s: '<-4,24 30,100 49,168 41,198 24,185 16,112 15,36 26,2 41,4 >62,26' },
      { w: 40, i: 0, o: 1, s: '22,194 15,82 17,12 29,-1 >44,10' },
      { w: 47, i: 1, o: 1, s: '<0,34 26,104 42,176 34,199 20,176 15,90 18,16 34,0 >58,22' }],
    m: [
      { w: 150, i: 1, o: 1, s: '<-2,76 12,97! 12,50 9,0! 18,52 38,92 56,89 62,51 60,2! 70,54 92,94 112,89 118,51 118,15 129,0 141,5 >162,24' },
      { w: 147, i: 1, o: 1, s: '<0,84 10,95! 10,0! 22,60 44,97 60,79 60,0! 74,62 96,96 112,79 114,22 121,2 137,2 >158,21' }],
    n: [
      { w: 98, i: 1, o: 1, s: '<-2,78 12,98! 12,50 9,0! 20,56 44,93 66,92 75,61 75,19 85,0 98,5 >118,24' },
      { w: 96, i: 1, o: 1, s: '<0,80 9,94! 12,0! 26,64 52,98 72,83 74,32 81,4 95,1 >116,20' },
      { w: 98, i: 1, o: 1, s: '<-1,84 10,95! 14,32 10,0! 32,70 54,93 71,85 72,41 80,7 95,0 >116,22' },
      { w: 92, i: 1, o: 1, s: '<2,88 11,96! 10,44 8,2! 19,48 40,90 60,96 70,72 70,26 78,3 >104,16' }],
    o: [
      { w: 92, i: .45, o: 2, s: '^2,36 ^30,84 58,100! 27,93 8,53 17,11 45,-3 75,17 85,58 71,91 52,100 ]62,86 ]86,82' },
      { w: 90, i: .3, o: 2, s: '50,99 21,87 8,47 23,5 53,-2 82,26 83,70 61,97 >44,101 ]58,88 ]84,86' },
      { w: 94, i: .2, o: 2, s: '64,95 37,102 12,73 12,29 37,-2 69,8 88,48 76,88 >58,99 ]66,90 ]90,80' },
      { w: 88, i: .3, o: 2, s: '<46,96 48,100 18,78 10,36 30,1 60,4 82,44 72,86 47,97 ]60,82 ]82,84' }],
    p: [
      { w: 98, i: 1, o: 0, s: '<0,80 14,97! 12,22 8,-87! 14,20 30,78 58,98 84,83 88,39 66,2 37,0 >16,17' },
      { w: 97, i: 1, o: 0, s: '<4,86 13,99! 11,10 6,-82! 12,0 26,70 54,99 82,88 92,50 74,8 44,-2 >20,8' }],
    q: [
      { w: 97, i: .2, o: 0, s: '80,85 54,100 24,89 9,51 19,9 47,4 70,35 83,93! 83,10 79,-85 >97,-62' }],
    r: [
      { w: 68, i: 1, o: 2, s: '<-2,79 12,98! 12,50 9,0! 18,54 36,90 55,97 >68,86 ]66,88' },
      { w: 70, i: 1, o: 2, s: '<0,84 10,94! 12,0! 22,60 43,94 64,93 ]70,84' },
      { w: 66, i: 1, o: 2, s: '<0,82 10,95! 10,42 10,2! 16,49 34,85 58,92 >66,80 ]66,82' }],
    s: [
      { w: 70, i: 0, o: 0, s: '66,85 49,100 25,93 20,71 43,53 64,33 57,7 29,-3 4,9' },
      { w: 68, i: 0, o: 0, s: '62,89 41,102 18,86 27,61 53,45 62,21 41,-1 8,4' },
      { w: 72, i: .9, o: 1, s: '<2,22 ^6,26 30,66 45,105! 49,80 66,46 62,12 37,-3 12,9! 44,-2 66,4 >92,25' },
      { w: 72, i: 0, o: 0, s: '68,94 46,99 22,84 32,58 58,42 66,18 46,-2 14,2 >-2,14' }],
    t: [
      { w: 58, i: 1, o: 1, s: '26,160! 22,100 19,38 26,5 41,1 >63,21 | +-8,100 26,106 68,109' },
      { w: 55, i: 1, o: 1, s: '25,166! 19,64 22,9 35,0 >57,15 | +-12,105 22,105 60,113' },
      { w: 57, i: 1, o: 1, s: '<10,130 23,152! 20,42 28,4 43,3 >63,20 | +-4,95 30,104 72,104' },
      { w: 54, i: 1, o: 1, s: '22,158! 18,50 22,2 >36,-2 | +-10,98 20,109 64,106' }],
    u: [
      { w: 102, i: 1, o: 1, s: '<-2,80 10,98! 8,45 18,6 41,-2 64,22 78,66 83,98! 80,42 86,7 99,0 >120,22' },
      { w: 101, i: 1, o: 1, s: '<0,84 9,95! 10,32 28,0 56,12 76,56 81,93! 82,32 90,4 103,2 >122,20' }],
    v: [
      { w: 80, i: 1, o: 2, s: '<-4,84 7,95 21,42 36,0! 56,52 75,97 ]86,88 ]100,86' },
      { w: 82, i: 1, o: 2, s: '<-6,80 5,93 18,34 37,0 59,36 79,99 ]88,88 ]102,88' }],
    w: [
      { w: 122, i: 1, o: 2, s: '<-4,84 7,96 14,42 30,2 50,28 62,82! 66,32 82,0 104,34 117,98 ]126,88 ]140,86' },
      { w: 118, i: 1, o: 2, s: '<-2,88 5,95 18,30 32,0! 46,40 60,80! 70,30 84,0! 100,50 114,100 ]124,90 ]138,86' },
      { w: 124, i: 1, o: 2, s: '<-6,78 8,94 10,30 28,-1 52,20 64,70 66,88! 70,24 88,-1 112,30 116,94 ]128,86 ]142,88' }],
    x: [{ w: 84, i: .5, o: 1, s: '<-2,82 10,93 40,48 72,4 >94,11 | 80,97 42,46 4,0' }],
    y: [
      { w: 92, i: 1, o: 0, s: '<-2,82 8,97! 12,52 32,28 58,46 79,96! 67,30 43,-44 11,-89 >-16,-82' },
      { w: 96, i: 1, o: 1, s: '<0,84 8,96! 10,47 34,24 62,50 82,97! 75,20 59,-54 31,-91 8,-72 30,-35 73,-4 >104,26' },
      { w: 88, i: .3, o: 0, s: '<4,92 8,98 22,54 42,27 | 82,100 55,30 27,-50 1,-89' },
      { w: 92, i: 1, o: 0, s: '<-4,78 10,95! 9,40 30,14 58,32 80,94! 72,14 56,-58 28,-92 0,-80 >-8,-60' }],
    z: [{ w: 84, i: .5, o: 1, s: '10,92 40,98 77,93! 40,44 6,2! 40,6 72,0 >93,14' }],
    // capitals
    A: [
      { w: 126, o: 1, s: '70,181 41,93 4,-1 | 68,178 89,92 107,9 117,0 >134,12 | 25,60 60,68 100,65' },
      { w: 124, o: 1, s: '2,2 35,92 70,180! 90,86 104,6 114,0 >130,10 | 24,56 62,66 102,62' }],
    B: [
      { w: 114, o: 0, s: '24,177 19,92 12,0 | 3,158 42,183 84,170 88,128 56,99 30,95! 72,93 104,65 97,21 54,-4 5,5' },
      { w: 112, o: 0, s: '26,172 20,90 13,2! 22,90 28,166 58,184 88,160 78,118 34,96! 78,94 102,60 88,12 46,-3 8,10' }],
    C: [{ w: 114, o: 1, s: '106,148 82,181 41,171 10,111 15,37 55,-2 92,16 >114,42' }],
    D: [
      { w: 130, o: 0, s: '28,176 23,92 15,2 | -6,158 44,184 104,160 124,94 96,25 45,-4 -4,6' },
      { w: 128, o: 0, s: '26,178 22,100 14,6! 30,0 80,8 120,58 116,124 72,174 18,180 >-8,160' }],
    E: [{ w: 98, o: 1, s: '94,166 62,181 27,162 30,120 62,101! 22,89 8,41 35,0 80,9 >104,30' }],
    F: [
      { w: 92, o: 0, s: '32,172 27,92 18,-2 | 2,166 50,174 102,183 | 23,96 56,100 84,105' },
      { w: 90, o: 0, s: '102,184 56,176 14,170 6,156 | 36,174 28,92 16,0 | 18,92 50,99 80,100' }],
    G: [{ w: 118, o: 0, s: '106,150 78,181 35,167 8,105 19,31 59,0 94,28 102,76! 62,78 | 102,76 104,30 108,0' }],
    H: [{ w: 118, o: 1, s: '20,178 17,92 12,0 | 104,181 99,92 98,10 108,0 >124,8 | 8,88 56,96 110,99' }],
    I: [
      { w: 54, o: 0, s: '3,172 29,180 56,180! 31,179! 27,92 21,3! -2,0 24,3 50,6' },
      { w: 54, o: 0, s: '4,174 28,180 55,179 | 31,179 27,92 22,3 | -2,0 22,3 49,5' },
      { w: 52, o: 0, s: '0,166 26,182 52,176! 30,178! 25,80 14,0! 30,-1 48,7' }],
    J: [{ w: 74, o: 0, s: '66,179 62,92 54,24 28,-4 2,22' }],
    K: [{ w: 110, o: 1, s: '22,179 18,92 12,0 | 100,180 58,114 24,86! 60,48 94,4 >118,8' }],
    L: [{ w: 92, o: 1, s: '30,181 25,92 14,8 18,0! 52,3 >94,14' }],
    M: [{ w: 140, o: 1, s: '8,0 24,178! 46,100 66,52! 92,116 118,180! 120,70 126,4 >142,4' }],
    N: [{ w: 116, o: 0, s: '10,0 22,178! 58,90 94,6! 100,96 106,184' }],
    O: [
      { w: 128, o: 0, s: '80,181 35,166 8,99 25,21 71,-2 112,44 117,116 86,171 >56,183' },
      { w: 126, o: 0, s: '66,180 24,148 10,78 38,10 86,6 120,66 108,140 70,180 >50,176' }],
    P: [{ w: 102, o: 0, s: '24,177 18,92 14,0 | 3,158 46,183 92,161 88,113 53,89 22,91' }],
    Q: [{ w: 130, o: 0, s: '80,181 35,166 8,99 25,21 71,-2 112,44 117,116 86,171 56,183 | 74,36 98,10 130,-16' }],
    R: [{ w: 112, o: 1, s: '24,177 18,92 14,0 | 3,158 46,183 90,163 86,116 54,92 30,91! 60,48 92,5 >116,8' }],
    S: [{ w: 100, o: 0, s: '92,151 67,183 29,167 26,125 63,97 88,57 63,7 21,0 0,25' }],
    T: [
      { w: 92, o: 0, s: '-6,166 48,173 114,182 | 58,172 53,92 46,-1' },
      { w: 90, o: 0, s: '58,170 52,90 44,2 | -4,172 52,175 110,178' }],
    U: [{ w: 118, o: 1, s: '12,179 10,71 32,4 71,6 98,61 105,179! 102,52 109,5 >128,12' }],
    V: [{ w: 100, o: 0, s: '6,179 26,90 46,0! 70,92 98,183' }],
    W: [{ w: 148, o: 0, s: '4,178 36,0! 72,130! 104,0! 144,184' }],
    X: [{ w: 110, o: 1, s: '10,178 54,92 100,4 >118,8 | 102,181 54,90 2,0' }],
    Y: [
      { w: 96, o: 0, s: '4,178 25,120 56,93 | 106,184 68,96 36,-2' },
      { w: 98, o: 0, s: '2,176 16,124 44,98 72,122 96,180! 80,100 48,10 24,-30' }],
    Z: [{ w: 104, o: 1, s: '10,172 54,180 98,176! 52,90 4,4! 50,8 90,0 >110,12' }],
    // figures
    0: [{ w: 92, s: '54,150 22,132 9,76 24,12 56,0 80,50 76,116 52,150' }],
    1: [{ w: 52, s: '6,118 32,150! 30,74 26,0' }, { w: 46, s: '28,150 26,74 20,0' }],
    2: [{ w: 88, s: '10,118 36,150 72,138 72,104 42,54 6,4! 42,8 84,2' }],
    3: [{ w: 86, s: '12,140 46,150 70,126 46,88 34,82! 70,74 76,32 44,-2 6,12' }],
    4: [{ w: 92, s: '50,150 28,96 6,48! 46,50 88,54 | 66,104 62,50 58,-2' }],
    5: [{ w: 86, s: '24,148 18,88! 52,96 78,60 62,10 30,-2 6,12 | 22,148 50,148 80,154' }],
    6: [{ w: 88, s: '68,150 28,108 10,48 30,0 66,8 76,48 50,74 16,52' }],
    7: [{ w: 82, s: '8,144 44,148 80,148! 52,74 30,-4' }],
    8: [{ w: 88, s: '70,126 48,150 22,130 34,92 66,58 66,14 36,-2 12,24 30,66 64,98 70,126' }],
    9: [{ w: 88, s: '74,122 50,148 20,130 18,90 46,72 72,104 78,128! 74,60 56,-4' }],
    // marks
    '.': [{ w: 30, s: '9,4 13,-1' }, { w: 30, s: '8,1 14,3' }],
    ',': [{ w: 36, s: '14,12 18,0 14,-20 0,-46' }, { w: 34, s: '12,9 16,-4 11,-24 -3,-44' }],
    "'": [{ w: 28, s: '16,204 18,190 10,164 4,152' }, { w: 27, s: '14,202 15,186 9,166 5,156' }],
    '-': [{ w: 66, s: '8,50 34,55 58,54' }],
    '!': [{ w: 40, s: '22,188 18,110 12,52 | 8,5 12,0' }],
    '?': [{ w: 78, s: '6,148 26,184 60,182 68,146 40,112 30,84 29,56 | 27,5 31,0' }],
    '(': [{ w: 50, s: '46,198 18,140 10,60 34,-30' }],
    ')': [{ w: 50, s: '8,198 34,140 38,60 8,-30' }],
    '&': [{ w: 112, s: '98,36 74,4 34,-2 9,32 26,70 60,112 60,150 38,166 24,142 44,92 76,34 108,0' }]
  };
  G['’'] = G["'"]; G['‘'] = G["'"];

  // ------------------------------------------------------------------------------------------------ parsing
  function parseGlyph(g) {
    if (g.P) return g.P;
    g.P = g.s.split('|').map(q => q.trim()).filter(Boolean).map(q => {
      let after = false; if (q[0] === '+') { after = true; q = q.slice(1); }
      return { after, pts: q.split(/\s+/).map(tok => { let cond = ''; if ('<>^]'.includes(tok[0])) { cond = tok[0]; tok = tok.slice(1); } let cusp = false; if (tok.endsWith('!')) { cusp = true; tok = tok.slice(0, -1); } const v = tok.split(',').map(Number); return { x: v[0], y: v[1], cusp, cond }; }) };
    });
    return g.P;
  }
  // seeded numbers: same text + seed = same handwriting
  function rng(seed) { let s = (seed * 2654435761) >>> 0 || 1; const f = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; f.n = () => (f() + f() + f()) * 2 / 3 - 1; return f; }  // f.n: bell-ish -1..1
  function strSeed(t) { let h = 2166136261; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function slow(r, len) { const a = []; for (let i = 0; i < len + 4; i++) a.push(r.n()); return x => { const i = Math.max(0, Math.floor(x)), f = x - i, u = f * f * (3 - 2 * f); return lerp(a[Math.min(i, len + 3)], a[Math.min(i + 1, len + 3)], u); }; }

  // ------------------------------------------------------------------------------------------------ curves
  // centripetal Catmull-Rom through the points, broken at cusps, then resampled evenly and relaxed a touch (a moving hand rounds its turns)
  function curve(pts, step) {
    const dense = [];
    let i0 = 0; const n = pts.length;
    if (n === 1) return [[pts[0].x, pts[0].y]];
    const piece = (a, b) => {
      const P = pts.slice(a, b + 1), m = P.length; const d = (p, q) => Math.max(1e-3, Math.sqrt(Math.hypot(p.x - q.x, p.y - q.y)));
      for (let i = 0; i < m - 1; i++) {
        const p1 = P[i], p2 = P[i + 1], p0 = i ? P[i - 1] : { x: 2 * p1.x - p2.x, y: 2 * p1.y - p2.y }, p3 = i + 2 < m ? P[i + 2] : { x: 2 * p2.x - p1.x, y: 2 * p2.y - p1.y };
        const t1 = d(p0, p1), t2 = t1 + d(p1, p2), t3 = t2 + d(p2, p3), N = Math.max(4, Math.ceil(Math.hypot(p2.x - p1.x, p2.y - p1.y) / 3));
        for (let j = 0; j < N; j++) {
          const t = t1 + (t2 - t1) * j / N, L = (A, Bq, ta, tb) => ({ x: (tb - t) / (tb - ta) * A.x + (t - ta) / (tb - ta) * Bq.x, y: (tb - t) / (tb - ta) * A.y + (t - ta) / (tb - ta) * Bq.y });
          const A1 = L(p0, p1, 0, t1), A2 = L(p1, p2, t1, t2), A3 = L(p2, p3, t2, t3), B1 = L(A1, A2, 0, t2), B2 = L(A2, A3, t1, t3), C = L(B1, B2, t1, t2);
          dense.push([C.x, C.y]);
        }
      }
    };
    for (let i = 1; i < n; i++) if (pts[i].cusp && i < n - 1) { piece(i0, i); i0 = i; }
    piece(i0, n - 1); dense.push([pts[n - 1].x, pts[n - 1].y]);
    let q = resample(dense, step);
    for (let it = 0; it < 2; it++) { const z = q.map(v => v.slice()); for (let i = 1; i < q.length - 1; i++) { z[i][0] = q[i][0] * .5 + (q[i - 1][0] + q[i + 1][0]) * .25; z[i][1] = q[i][1] * .5 + (q[i - 1][1] + q[i + 1][1]) * .25; } q = z; }
    return q;
  }
  function resample(P, step) {
    let L = 0; for (let i = 1; i < P.length; i++) L += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]);
    const n = Math.max(2, Math.round(L / step)), out = [P[0].slice()]; let k = 1, acc = 0, prev = P[0]; const st = L / n;
    for (let j = 1; j < n; j++) { let need = st * j; while (k < P.length) { const d = Math.hypot(P[k][0] - prev[0], P[k][1] - prev[1]); if (acc + d >= need) break; acc += d; prev = P[k]; k++; } if (k >= P.length) break; const d = Math.hypot(P[k][0] - prev[0], P[k][1] - prev[1]) || 1, f = (need - acc) / d; out.push([lerp(prev[0], P[k][0], f), lerp(prev[1], P[k][1], f)]); }
    out.push(P[P.length - 1].slice()); return out;
  }

  // ------------------------------------------------------------------------------------------------ layout
  const XH = .455, SLANT = .145;   // x-height as a part of size; forward lean
  const cache = new Map();
  function build(text, seed, tail, over) {
    const key = text + '|' + seed + '|' + (tail || 0) + '|' + (over ? over.key : ''); if (cache.has(key)) return cache.get(key);
    const r = rng(strSeed(text) ^ (seed * 7919)); const N = text.length, base = slow(r, N), lean = slow(r, N), big = slow(r, N), tight = slow(r, N);
    const drift = r.n() * .0022, last = {}; const gest = []; const gw = k => gest[k] || (gest[k] = { sz: 1 + .05 * r.n(), tilt: .02 * r.n() + .006, sh: .055 * r.n(), off: 5 * r.n() });
    const wl = []; { let k = -1; for (let i = 0; i < N; i++) { if (text[i] !== ' ') { if (!i || text[i - 1] === ' ') { k++; wl[k] = { a: i, n: 0 }; } wl[k].n++; } } }
    // choose a form for every letter
    const L = []; let word = -1, inWord = false;
    for (let i = 0; i < N; i++) {
      const ch = text[i]; if (ch === ' ') { inWord = false; L.push(null); continue; }
      if (!inWord) { word++; inWord = true; }
      const prev = L[i - 1], next = text[i + 1], isEnd = !next || next === ' ' || /[,.!?']/.test(next), isStart = !prev;
      let alts = (over && over[ch]) || G[ch] || G['.'];
      let pool = alts.filter(g => (!g.fin || isEnd)); if (pool.length > 1 && last[ch] != null) { const q = pool.filter(g => g !== last[ch]); if (q.length && r() < .86) pool = q; }
      // after a letter that leaves along the baseline prefer forms that can be joined; at the start of a word prefer fresh forms
      let W = pool.map(g => (g.f || 1) * (isStart ? (g.i > .9 && 'lhbf'.includes(ch) ? .35 : 1) : (prev && prev.g.o ? .35 + (g.i || 0) : 1)));
      if (isEnd) W = W.map((v, j) => v * (pool[j].fin ? 1.1 : 1));
      let s = W.reduce((a, b) => a + b, 0) * r(), k = 0; while (k < W.length - 1 && (s -= W[k]) > 0) k++;
      const g = pool[k]; last[ch] = g; L.push({ ch, g, i, word, isEnd, isStart });
    }
    // joins
    for (let i = 0; i < N - 1; i++) { const a = L[i], b = L[i + 1]; if (!a || !b) continue; const can = a.g.o && (b.g.i || 0) > 0; const round = 'acdgoq'.includes(b.ch); a.join = !!can && r() < (round ? (a.g.o === 2 && a.ch !== 'w' && a.ch !== 'v' ? .12 : 0) : b.g.i * (a.g.o === 2 ? (a.ch === 'r' ? (b.ch === 'e' || b.ch === 's' ? .12 : .5) : b.ch === 'e' || b.ch === 's' ? .5 : .85) : .94)) * (/[A-Z]/.test(a.ch) ? .5 : 1); if (a.join) b.joined = a.g.o; }
    // each letter's own points, moved a little by the hand
    let x = 0; const placed = [];
    for (let i = 0; i < N; i++) {
      const c = L[i]; if (!c) { x += 78 + 15 * r.n() + 9 * tight(i * .5); continue; }
      const W = gw(c.word), wi = wl[c.word], fu = wi.n > 2 ? (i - wi.a) / (wi.n - 1) : .3, tail2 = fu * Math.min(1, wi.n / 6);
      const asc = 1 + .1 * r.n() + .05 * big(i * .7 + 2), dsc = 1 + .13 * r.n();
      const P = parseGlyph(c.g), sx = 1.07 * (1 + .05 * tail2) * W.sz * (1 + .075 * r.n()) * (1 + .04 * tight(i * .6)), sy = (1 + .055 * r.n() + .045 * big(i * .45)) * W.sz * (1.03 - .09 * tail2), sh = .045 * r.n() + .06 * lean(i * .35) + W.sh, rot = .035 * r.n();
      const j = 3.0, off = 3.6 * r.n() + 5.5 * base(i * .38) + i * drift * 100 + W.off; if (c.isStart || i === wi.a) W.x = x;
      const strokes = P.map(st => ({ after: st.after, pts: st.pts.filter(q => q.cond === '' || (q.cond === '<' && !c.joined) || (q.cond === '^' && c.joined === 1) || (q.cond === '>' && !c.join) || (q.cond === ']' && c.join)).map(q => { const hy = q.y > 104 ? 104 + (q.y - 104) * asc : q.y < -6 ? -6 + (q.y + 6) * dsc : q.y; let px = q.x * sx + r.n() * j, py = hy * sy + r.n() * j * .8; px += py * sh; const ca = Math.cos(rot), sa = Math.sin(rot); return { x: px * ca - py * sa, y: px * sa + py * ca + off + (x - (W.x || 0)) * W.tilt, cusp: q.cusp, cond: q.cond }; }) }));
      // optical spacing: look at how close the bodies come, band by band
      const body = bands(strokes, true); let nominal = x + 0, ox = nominal;
      const pv = placed[placed.length - 1];
      if (pv && L[i - 1]) {
        const mark = /[,.'’!?-]/.test(c.ch) || /['’]/.test(pv.c.ch), want = c.joined ? 37 : 30; let gap = 1e9; const mode = c.joined ? 0 : 1;
        for (let b = 0; b < NB; b++) for (let d = -mode; d <= mode; d++) { const q = b + d; if (q < 0 || q >= NB) continue; if (pv.body.R[b] > -1e8 && body.Lf[q] < 1e8) gap = Math.min(gap, body.Lf[q] - pv.body.R[b] + Math.abs(d) * 6); }
        const opt = gap < 1e8 ? pv.x + want - gap : nominal; ox = mark ? nominal + (/[,.]/.test(c.ch) ? 12 : 4) : clamp(opt, nominal - 34, nominal + 24) * .8 + nominal * .2;
      }
      ox += 2.6 * r.n() + 2.5 * tight(i * .8); if (pv && L[i - 1] && /[tf]/.test(c.ch)) ox += /[ij]/.test(pv.c.ch) ? 12 : 3;
      placed.push({ c, strokes, x: ox, body }); x = ox + c.g.w * sx;
      if (/[,.]/.test(c.ch)) x += 6;
    }
    // weave the strokes into pen order: joined letters share one stroke; dots and bars wait for the end of the run
    const S = []; let run = null, wait = [];
    const flush = () => { if (run) { S.push(run); run = null; } for (const w of wait) S.push(w); wait = []; };
    placed.forEach((g, gi) => {
      const abs = st => st.pts.map(q => ({ x: q.x + g.x, y: q.y, cusp: q.cusp }));
      const mains = g.strokes.filter(s => !s.after), aft = g.strokes.filter(s => s.after);
      mains.forEach((st, si) => {
        const pts = abs(st);
        if (si === 0 && g.c.joined && run) { // glide from the last letter: ease the corner where the two meet
          run.pts[run.pts.length - 1].cusp = false; run.pts.push(...pts); run.chs.push(gi);
        } else { if (run) { S.push(run); run = null; } run = { pts, word: g.c.word, ch: gi, chs: [gi] }; }
      });
      for (const st of aft) wait.push({ pts: abs(st), word: g.c.word, ch: gi, chs: [gi], small: 1 });
      if (!g.c.join) flush();
    });
    flush();
    // the last letter can be drawn out (a held note)
    if (tail && placed.length) { for (let q = S.length - 1; q >= 0; q--) { const s = S[q]; if (s.small || s.ch < 0) continue; if (s.chs.includes(placed.length - 1) || q === S.length - 1) { stretch(s.pts, tail, placed[placed.length - 1], r); break; } } }
    // lean, sample, pressure
    const out = []; let x0 = 1e9, x1 = -1e9, total = 0; const nz = slow(r, 400); let acc = 0;
    for (const s of S) {
      let q = curve(s.pts, 4.2); if (q.length < 2) q = [q[0], [q[0][0] + 1, q[0][1] + 1]];
      q = q.map(v => [v[0] + v[1] * SLANT, -v[1]]);
      // a hand is never quite steady
      let d = 0; q = q.map((v, i) => { if (i) d += Math.hypot(v[0] - q[i - 1][0], v[1] - q[i - 1][1]); return [v[0] + 1.1 * nz(((acc + d) / 46) % 380), v[1] + 1.1 * nz(((acc + d) / 46 + 190) % 380)]; });
      let len = 0; for (let i = 1; i < q.length; i++) len += Math.hypot(q[i][0] - q[i - 1][0], q[i][1] - q[i - 1][1]); acc += len + 37; if (len < 20 || /[,'’.]/.test(placed[s.ch].c.ch)) s.small = 1;
      // pressure: down strokes bear on the pencil, up strokes skim, quick exits leave the paper
      const pr = q.map((v, i) => { const a = q[Math.max(0, i - 1)], b = q[Math.min(q.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], m = Math.hypot(dx, dy) || 1, dn = dy / m; return s.small ? .98 : .86 + (dn > 0 ? .17 : .12) * dn + .08 * nz((acc + i * 4) / 60 % 380); });
      for (let it = 0; it < 3; it++) for (let i = 1; i < pr.length - 1; i++) pr[i] = pr[i] * .5 + (pr[i - 1] + pr[i + 1]) * .25;
      let run2 = 0; const endStop = s.pts.length > 2 && !s.small; for (let i = 0; i < q.length; i++) { if (i) run2 += Math.hypot(q[i][0] - q[i - 1][0], q[i][1] - q[i - 1][1]); const a = clamp(run2 / 9), b = clamp((len - run2) / (endStop ? 24 : 10)); q[i][2] = clamp(pr[i] * (.62 + .38 * a) * (endStop ? .42 + .58 * Math.sqrt(b) : .7 + .3 * b), .2, 1.15); }
      const at = total; total += len + (s.small ? 34 : 24);
      for (const v of q) { if (v[0] < x0) x0 = v[0]; if (v[0] > x1) x1 = v[0]; }
      out.push({ pts: q, len, at, word: s.word, ch: s.ch, small: !!s.small });
    }
    const words = []; out.forEach((s, i) => { const w = words[s.word] || (words[s.word] = { a: i, b: i, l0: s.at, l1: s.at + s.len, x0: 1e9, x1: -1e9 }); w.b = i; w.l1 = s.at + s.len; for (const v of s.pts) { w.x0 = Math.min(w.x0, v[0]); w.x1 = Math.max(w.x1, v[0]); } });
    const res = { strokes: out, total: total - 24, x0, x1, words }; if (cache.size > 240) cache.clear(); cache.set(key, res); return res;
  }
  const NB = 15, BY = b => -96 + b * 20;
  function bands(strokes) { const Lf = Array(NB).fill(1e9), R = Array(NB).fill(-1e9); for (const s of strokes) { if (s.after) continue; const q = curve(s.pts.filter(v => v.cond !== '>' && v.cond !== '<' && v.cond !== '^' && v.cond !== ']').concat(s.pts.length < 2 ? [{ x: 1, y: 1 }] : []), 6); for (const v of q) { const b = clamp(Math.floor((v[1] + 96) / 20), 0, NB - 1); if (v[0] < Lf[b]) Lf[b] = v[0]; if (v[0] > R[b]) R[b] = v[0]; } } return { Lf, R }; }
  function stretch(pts, tail, g, r) {
    const e = pts[pts.length - 1], a = pts[pts.length - 2] || e, ch = g.c.ch;
    if (ch === 'y' || ch === 'g' || ch === 'j') { // the tail swings back under the word and away
      const dir = e.x < a.x ? -1 : 1;
      if (dir < 0) { pts.push({ x: e.x - tail * .22, y: e.y + 4 + 5 * r() }, { x: e.x - tail * .62, y: e.y + 26 + 8 * r() }); } else pts.push({ x: e.x + tail * .4, y: e.y + 6 }, { x: e.x + tail * .85, y: e.y - 8 });
    } else if (g.c.g.o === 2) { e.cusp = false; pts.push({ x: e.x + 14, y: e.y - 12 }, { x: e.x + tail * .5, y: e.y - 4 + 6 * r() }, { x: e.x + tail, y: e.y + 10 + 8 * r() }); }
    else { e.y = Math.min(e.y, 14); pts.push({ x: e.x + tail * .38, y: 9 + 5 * r() }, { x: e.x + tail * .72, y: 2 + 5 * r() }, { x: e.x + tail, y: 14 + 10 * r() }); }
  }
  // public layout in sheet pixels
  function layout(text, o = {}) {
    const size = o.size || 46, u = size * XH / 100, L = build(String(text), o.seed || 1, o.tail, o.over), w = (L.x1 - L.x0) * u, al = o.align || 'left', ox = (o.x || 0) - (al === 'center' ? w / 2 : al === 'right' ? w : 0) - L.x0 * u, oy = o.y || 0;
    const rot = o.rot || 0, ca = Math.cos(rot), sa = Math.sin(rot), cx = o.x || 0;
    const tf = v => { const px = ox + v[0] * u, py = v[1] * u; return rot ? [cx + (px - cx) * ca - py * sa, oy + (px - cx) * sa + py * ca, v[2]] : [px, oy + py, v[2]]; };
    return { strokes: L.strokes.map(s => ({ pts: s.pts.map(tf), len: s.len * u, at: s.at * u, word: s.word, ch: s.ch, small: s.small })), total: L.total * u, width: w, x0: ox + L.x0 * u, x1: ox + L.x1 * u, words: L.words.map(q => q && ({ a: q.a, b: q.b, l0: q.l0 * u, l1: q.l1 * u, x0: ox + q.x0 * u, x1: ox + q.x1 * u })), u, size };
  }
  const lcache = new Map();
  function layoutC(text, o) { const k = [text, o.x, o.y, o.size, o.align, o.seed, o.tail, o.rot, o.over && o.over.key].join('|'); let v = lcache.get(k); if (!v) { v = layout(text, o); if (lcache.size > 120) lcache.clear(); lcache.set(k, v); } return v; }
  function part(s, upto) { // the part of a stroke already written
    if (upto >= s.len - 1e-3) return s.pts; const out = [s.pts[0]]; let d = 0; for (let i = 1; i < s.pts.length; i++) { const a = s.pts[i - 1], b = s.pts[i], q = Math.hypot(b[0] - a[0], b[1] - a[1]); if (d + q >= upto) { const f = clamp((upto - d) / (q || 1)); out.push([lerp(a[0], b[0], f), lerp(a[1], b[1], f), lerp(a[2], b[2], f)]); break; } d += q; out.push(b); } return out;
  }
  function put(p, pts, st, len) { if (pts.length < 2) return; if (st.dot) { const a = pts[0], b = pts[pts.length - 1], m = pts[pts.length >> 1]; p.line([[a[0] - .6, a[1] - .6, 1.1], [m[0] + .4, m[1], 1.15], [b[0] + .6, b[1] + .6, .85]], Object.assign({}, st, { taper: [.02, .02] })); return; } p.line(pts, Object.assign({}, st, { taper: [Math.min(.3, 2 / Math.max(6, len)), Math.min(.3, 3 / Math.max(6, len))] })); }
  const dot = (st, len, size) => Object.assign({}, st, len < size * .115 ? { w: st.w * 1.6, press: st.press * 1.3, dot: 1 } : { w: st.w * 1.12 }); // dots are pressed, bars are drawn
  function write(p, text, o = {}) {
    const L = layoutC(text, o), size = o.size || 46, k = o.k == null ? 1 : clamp(o.k), at = k * L.total;
    const st = { color: o.color || '#4a4038', w: o.w || 1.9 + size * .044, press: o.press == null ? 1.25 : o.press, medium: o.medium || 'graphite', wobble: o.wobble == null ? .35 : o.wobble, passes: o.passes || 1, alpha: o.alpha == null ? 1 : o.alpha };
    for (const s of L.strokes) { if (s.at >= at) break; const pts = part(s, at - s.at); put(p, pts, s.small ? dot(st, s.len, size) : st, Math.min(s.len, at - s.at)); }
    return L;
  }
  function measure(text, o = {}) { const L = layoutC(text, Object.assign({}, o, { x: 0, y: 0, align: 'left' })), s = o.size || 46; return { width: L.width, ascent: s * XH * 1.98, descent: s * XH * .92, xheight: s * XH, total: L.total }; }


  // ------------------------------------------------------------------------------------------------ title
  // the same hand, bigger and slower: swash D and B, and the last y swings home under its own word
  const TITLE = { key: 'title',
    D: [{ w: 150, o: 0, s: '52,182 42,124 31,48 12,5 -14,2 -18,22 10,26 54,0 108,12 146,68 144,134 104,182 44,194 -12,178 -40,146 -30,122 -10,126' }],
    B: [{ w: 136, o: 0, s: '44,184 33,96 18,-4 | -34,132 -30,166 12,190 78,188 112,160 98,120 54,100 36,97! 92,102 128,70 118,20 66,-8 14,-2 -10,22' }],
    y: [{ w: 100, i: 1, o: 0, s: '<-2,80 8,97! 10,46 34,22 62,48 84,99! 77,24 58,-58 22,-104 -20,-98 -24,-66 8,-58' }],
    o: [{ w: 96, i: 1, o: 2, s: '58,100 26,92 8,52 18,9 47,-3 78,18 86,60 70,92 50,100 ]64,84 ]92,82' }] };
  TITLE.y2 = [{ w: 100, i: 1, o: 0, s: '<-2,80 8,97! 10,46 34,22 62,48 84,99! 76,20 48,-66 0,-112 -86,-128 -190,-118 -300,-112 -392,-126 >-420,-122' }];
  function titleLayout(o = {}) {
    const size = o.size || 220, x = o.x == null ? 960 : o.x, y = o.y == null ? 520 : o.y, sd = o.seed || 4;
    const k = ['T', x, y, size, sd, o.stack ? 1 : 0].join('|'); if (lcache.has(k)) return lcache.get(k);
    const a = layout('Danny', { x: 0, y: 0, size, seed: sd, over: TITLE }), b = layout('Boy', { x: 0, y: 0, size, seed: sd + 2, over: { key: 'title2', B: TITLE.B, o: TITLE.o, y: TITLE.y2 } });
    // the swash runs left of B, so place Boy by its B, not by its box
    const bx0 = Math.min(...b.strokes.slice(0, 2).flatMap(s => s.pts.map(v => v[0]))), gap = size * .30, wA = a.width, bRight = b.x1 - bx0, W = wA + gap + bRight, ox = x - W / 2;
    const S = []; let tot = 0; const add = (L, dx, dy, w) => { for (const s of L.strokes) { S.push({ pts: s.pts.map(v => [v[0] + dx, v[1] + dy, v[2]]), len: s.len, at: tot + s.at, word: w, small: s.small }); } tot += L.total + size * .25; };
    add(a, ox - a.x0, y, 0); add(b, ox + wA + gap - bx0, y + size * .012, 1);
    const res = { strokes: S, total: tot - size * .25, x0: ox, x1: ox + W, width: W, size }; lcache.set(k, res); return res;
  }
  function title(p, o = {}) {
    const L = titleLayout(o), k = o.k == null ? 1 : clamp(o.k), at = k * L.total, st = { color: o.color || '#4a4038', w: o.w || 2.4 + L.size * .036, press: o.press == null ? 1.2 : o.press, medium: o.medium || 'graphite', wobble: o.wobble == null ? .5 : o.wobble, passes: 1, alpha: o.alpha == null ? 1 : o.alpha };
    for (const s of L.strokes) { if (s.at >= at) break; const pts = part(s, at - s.at); put(p, pts, st, Math.min(s.len, at - s.at)); }
    // gone over once more where the hand pressed: the main down strokes, a hair off the first line
    if (o.again !== false) { const at2 = clamp(k * 1.18 - .18) * L.total; for (let i = 0; i < L.strokes.length; i++) { const s = L.strokes[i]; if (s.at >= at2 || s.small) continue; const pts = part(s, at2 - s.at); let run = []; const go = () => { if (run.length > 5) put(p, run.map((v, j) => [v[0] + L.size * .009 + 1.2 * Math.sin(j * .35 + i), v[1] + 1.5 * Math.cos(j * .28 + i * 2), v[2]]), Object.assign({}, st, { w: st.w * .62, press: st.press * .7, alpha: st.alpha * .75 }), run.length * 6); run = []; }; for (let j = 1; j < pts.length; j++) { if (pts[j][1] - pts[j - 1][1] > .45 * Math.hypot(pts[j][0] - pts[j - 1][0], pts[j][1] - pts[j - 1][1])) run.push(pts[j]); else go(); } go(); } }
    return L;
  }

  // ------------------------------------------------------------------------------------------------ signature: one line, never lifted
  // the red thread comes in along the ground, writes b-i-d-e, swings back over the word and ties a small knot for the dot of the i
  const SIG = '-190,-10 -120,4 -60,-4 -14,14 22,74 50,152 60,206 46,222 26,196 13,118 9,44 18,4 46,-6 76,12 88,50 78,84 60,86 66,68 96,66 120,96 118,52 122,16 138,2 158,12 172,40 188,76 212,98 238,90 226,100 198,96 176,64 174,24 194,0 220,8 242,44 258,110 273,192 277,212 269,160 257,80 256,22 272,0 300,10 330,40 362,70 362,98 336,104 316,76 314,30 336,0 372,-2 414,20 452,72 462,142 424,206 336,246 244,244 176,206 140,166 126,146 130,134 142,138 140,150 130,150';
  let sigc = null;
  function signaturePath(o = {}) {
    if (!sigc) { const pts = SIG.split(' ').map(t => { const v = t.split(',').map(Number); return { x: v[0], y: v[1] }; }); sigc = curve(pts, 4).map(v => [v[0] + v[1] * .12, -v[1]]); }
    const size = o.size || 120, u = size * XH / 100, q = sigc; let x0 = 1e9, x1 = -1e9; for (const v of q) { x0 = Math.min(x0, v[0]); x1 = Math.max(x1, v[0]); }
    const al = o.align || 'center', mid = al === 'center' ? (-14 + 372) / 2 : 0, x = o.x == null ? 960 : o.x, y = o.y == null ? 540 : o.y;  // centred on the letters, not on the thread that leads in
    return q.map((v, i) => { const a = q[Math.max(0, i - 1)], b = q[Math.min(q.length - 1, i + 1)], m = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [x + (v[0] - mid) * u, y + v[1] * u, clamp(.84 + .16 * (b[1] - a[1]) / m, .5, 1)]; });
  }

  // the first k (0..1) of a path by its length; signature(p,{x,y,size,k,color,w}) lets the red thread write it
  function cut(pts, k) { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return part({ pts, len: L }, clamp(k) * L); }
  function signature(p, o = {}) { const q = cut(signaturePath(o), o.k == null ? 1 : o.k); if (q.length > 2) p.line(q, { color: o.color || '#b5332a', w: o.w || 2.5 + (o.size || 120) * .018, press: o.press || 1, medium: o.medium || 'redline', wobble: o.wobble == null ? .5 : o.wobble, taper: [.02, .02], alpha: o.alpha == null ? 1 : o.alpha }); return q[q.length - 1]; }

  // ------------------------------------------------------------------------------------------------ the sung line
  const DARK = { s08: 1, s09: 1, s14: 1, s17: 1 };
  const INK = { light: '#4a4038', deep: '#2b241f', dark: '#e9dec8' };
  // a scene may say what is under its lyric: BIDE.scene({id, ink:'light'|'deep'|'dark' or (s)=>one of them, draw}); otherwise the table decides
  function inkOf(s) { const sc = B.scenes && B.scenes[s.id]; let v = sc && sc.ink; if (typeof v === 'function') v = v(s); return INK[v] ? v : DARK[s.id] ? 'dark' : 'light'; }
  const LY = { x: 960, y: 1010, size: 50, w: 4.5 };
  const letters = t => t.replace(/[^A-Za-z]/g, '').length;
  let plan = null;
  function makePlan() {
    const TL = B.timeline; plan = TL.lines.map((ln, i) => {
      const ws = TL.words.filter(w => w.line === i), toks = ln.text.split(/\s+/), lw = ws[ws.length - 1], n = letters(toks[toks.length - 1]);
      const hold = lw.t1 - lw.t0 - (.12 + n * .11), tail = clamp(hold * 92, 0, 300) * (/[gy]$/.test(toks[toks.length - 1]) ? .62 : 1);
      return { i, text: ln.text, toks, ws, n: toks.map(letters), tail: Math.round(tail), t0: ws[0].t0 - .08, rub: lw.t1 - .2, rubD: .5, end: lw.t1 + .85 };
    });
  }
  // how much of a word is on the paper at song time t: quick letters, then the last stroke drawn out for as long as the note is held
  function wordK(w, n, last, t) {
    const a = w.t0 - .08, end = w.t1 - (last ? .34 : .05), x = t - a, av = Math.max(.14, end - a); if (x <= 0) return 0; if (x >= av) return 1;
    const base = .12 + n * .105; if (av < base * 1.35) { const q = x / av; return q + .06 * Math.sin(q * Math.PI * 2) * -1; }
    const body = base * 1.12, f = last ? .72 : .84; if (x < body) { const q = x / body; return f * (1 - Math.pow(1 - q, 1.25)); }
    const q = (x - body) / (av - body); return f + (1 - f) * (1 - Math.pow(1 - q, 1.6));
  }
  B.lyrics = function (p, s) {
    if (!B.timeline) return; if (!plan) makePlan(); const t = s.abs, kindI = inkOf(s), dark = kindI === 'dark', ink = INK[kindI];
    let opened = false;
    for (const P of plan) {
      if (t < P.t0 || t > P.end) continue;
      if (!opened) { if (p.layer) p.layer('lyric', { every: 6, depth: 1 }); opened = true; }
      const L = layoutC(P.text, { x: LY.x, y: LY.y, size: LY.size, align: 'center', seed: 31 + P.i, tail: P.tail });
      const st = { color: ink, w: LY.w, press: dark ? 1.2 : 1.3, medium: 'graphite', wobble: .3, passes: 1, alpha: 1 };
      const rq = clamp((t - P.rub) / P.rubD), pad = 30, front = rq <= 0 ? -1e9 : lerp(L.x0 - pad, L.x1 + pad + 60, rq * rq * (3 - 2 * rq)), gone = clamp((t - P.rub - P.rubD) / .34);
      for (let i = 0; i < L.strokes.length; i++) {
        const q = L.strokes[i], wd = L.words[q.word], w = P.ws[q.word]; if (!w) continue; const k = wordK(w, P.n[q.word], q.word === P.ws.length - 1, t); if (k <= 0) continue;
        const at = wd.l0 + k * (wd.l1 - wd.l0); if (q.at >= at) continue; const pts = part(q, at - q.at), sst = q.small ? dot(st, q.len, LY.size) : st;
        if (rq <= 0) { put(p, pts, sst, Math.min(q.len, at - q.at)); continue; }
        smudge(p, pts, sst, front, rq >= 1 ? gone : 0, i, dark);
      }
      if (rq > 0) thumb(p, L, ink, front, rq >= 1 ? gone : 0, dark);
    }
  };
  // rubbed out with the side of the thumb, left to right: ahead of the thumb the line is whole, under it it drags, behind it only a grey ghost is left
  function smudge(p, pts, st, front, gone, seed, dark) {
    let keep = [], drag = [], ghost = []; const edge = front + 14 * (p.fix(seed, 3, 5) - .5);
    const gk = () => { if (keep.length > 1) put(p, keep, st, keep.length * 2.6); keep = []; }, gd = () => { if (drag.length > 1) put(p, drag, Object.assign({}, st, { w: st.w * 1.7, press: .85, alpha: .5 }), drag.length * 2.6); drag = []; };
    const gg = () => { if (ghost.length > 1 && gone < 1) { const c = ghost[ghost.length >> 1][0], far = clamp((front - c) / 520); p.line(ghost, Object.assign({}, st, { w: st.w * 2.5, press: .8, alpha: (dark ? .26 : .3) * (1 - .55 * far) * (1 - gone), taper: [.2, .3], wobble: 1 })); } ghost = []; };
    for (const v of pts) { const d = edge - v[0]; if (d < 0) { gd(); gg(); keep.push(v); } else if (d < 46) { gk(); gg(); drag.push([v[0] + (46 - d) * .34 + 4, v[1] - 1 + 2.4 * (p.rnd(seed, 1) - .5), v[2] * (1 - d / 90)]); } else { gk(); gd(); ghost.push([v[0] + 12 + 8 * p.fix(seed, 7), v[1] + 1.5, v[2]]); } }
    gk(); gd(); gg();
  }
  // the grey the thumb leaves on the paper
  function thumb(p, L, ink, front, gone, dark) {
    if (gone >= 1) return; const y = LY.y - 11, a = L.x0 - 14, b = Math.min(front, L.x1 + 20); if (b - a < 60) return;
    for (let i = 0; i < 3; i++) { const yy = y + (i - 1) * 12 + 4 * (p.fix(i, 9) - .5), s0 = lerp(a, b, .12 * p.fix(i, 2)), s1 = lerp(b, a, .06 * p.fix(i, 4)); p.line([[s0, yy + 2, .5], [lerp(s0, s1, .35), yy - 2, .9], [lerp(s0, s1, .7), yy + 1, .9], [s1, yy - 1, .6]], { color: ink, w: 22, press: .5, alpha: (dark ? .09 : .1) * (1 - gone), medium: 'graphite', wobble: 1.2, taper: [.2, .12] }); }
  }

  B.hand = { layout: layoutC, write, measure, part, title, titleLayout, signaturePath, signature, cut, glyphs: G, XH, SLANT, ink: INK, dark: DARK, inkOf };

  // ------------------------------------------------------------------------------------------------ test sheets
  B.test = B.test || {};
  B.test.handSheet = function (p, k) {
    p.paper('#eadfc8'); if (p.layer) p.layer('hand', { every: 1, depth: 1 });
    const H = B.hand, kk = Math.floor(k + 1e-6);
    if (kk === 0) {
      ['a b c d e f g h i j k l m', 'n o p q r s t u v w x y z', 'A B C D E F G H I J K L M', 'N O P Q R S T U V W X Y Z', "0 1 2 3 4 5 6 7 8 9 . , ' ’ - ! ? ( ) &", 'aaa eee nnn ooo rrr sss ttt lll ddd iii yyy'].forEach((r, i) => H.write(p, r, { x: 110, y: 190 + i * 165, size: 104, seed: 3 + i }));
    } else if (kk === 1 || kk === 2) {
      for (let i = 0; i < 8; i++) { const j = (kk - 1) * 8 + i; H.write(p, B.timeline.lines[j].text, { x: 960, y: 120 + i * 125, size: 46, align: 'center', seed: 31 + j }); }
    } else if (kk === 3) {
      H.title(p, { x: 960, y: 420, size: 230 }); H.signature(p, { x: 960, y: 850, size: 190 }); H.signature(p, { x: 1560, y: 850, size: 110 }); H.signature(p, { x: 330, y: 850, size: 150, k: .55 });
    } else if (kk === 4) {
      [.12, .3, .55, .8].forEach((q, i) => H.write(p, 'the summer’s gone, and all the roses falling', { x: 960, y: 150 + i * 120, size: 60, align: 'center', seed: 9, k: q })); H.title(p, { x: 960, y: 820, size: 200, k: .5 });
    } else if (kk === 5) { // the same words many times: nothing may look stamped
      for (let i = 0; i < 7; i++) H.write(p, 'and the roses are calling me and the', { x: 130, y: 150 + i * 140, size: 78, seed: 60 + i * 3 });
    }
  };
  B.test.lyricAt = function (p, k) { let id = 's01'; for (const o of B.order || []) if (k >= o[1]) id = o[0]; p.paper(DARK[id] ? '#2c2622' : '#e4d7bd'); B.lyrics(p, { abs: Math.floor(k * 12 + 1e-6) / 12, id }); };
})();
