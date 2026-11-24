// s16 (119.0-126.6) "For you will bend and tell me that you love me" - CLIMAX 2
// FEELING: he lays his head down on her at last, and is held. Joy and grief in the same breath.
// BEATS (scene seconds; words For .17 you .66 will 1.12 bend 1.58-3.07 and 3.07 tell 3.44 me 3.92 that 4.42 you 4.87 love 5.33 me 6.27-7.35)
//  -.4-1.1  close in the gold: the old man on his knees before the stone in its roses; he looks at the ground, breathes, looks at the roses.
//  1.1-1.6  breath in, the head lifts and the eyes close (anticipation).
//  1.6-3.0  "bend": hand first, then the head comes down an arc, the back follows; cheek to the earth; the grass bends away; settle.
//  3.0-3.7  hold. his lips say it ("tell").
//  3.7-4.9  the drawing turns: searching lines, the old pose rubbed back to paper, the whole sheet turns a little way round his head; the earth
//           under his cheek comes up and is her shoulder, the stone above him is her head, the old face is the boy's.
//  4.9-7.6  she holds him; they turn slowly towards us in wind and petals. "love": she opens her eyes a little, says something into his hair.
// EYE: his face -> down with it to the grass -> same place: the boy's face -> up to hers.
// VALUE: darkest his coat / her hair, lightest the sky behind her head. All the colour the film has held back is here.
(function () {
  'use strict';
  const B = window.BIDE, A = B.anim, { clamp, lerp, ease, keys, hash, noise1, mixc, spline, TAU } = A, PI = Math.PI, sin = Math.sin, cos = Math.cos, hyp = Math.hypot;
  const ss = (a, b, x) => { x = clamp((x - a) / (b - a)); return x * x * (3 - 2 * x); };
  const HC = [1000, 716];                       // the centre everything turns about: his head, then the boy's
  const LIGHT = { dir: -2.35, warm: .85, k: .6 };
  let W, C, g, GL;
  const init = () => { if (W) return; W = B.world; C = B.cast; g = W.gusts({ seed: 12, every: 1.9, power: .8, base: .3, speed: 1100 });
    GL = Object.assign({}, W.light('gold'), { top: '#8db6bb', mid: '#f2dc9a', low: '#ffdf9a', cl: '#fff6dc', cs: '#e6bd92', haze: '#f3deae', sun: '#ffe49a', tint: '#f0cf78', tk: .2, hz: .62, shade: '#7f8a5c' }); };

  // ---------------------------------------------------------------- sheet 1: the gold hill, close by the stone
  const RG = [[-60, 752], [260, 772], [560, 800], [860, 818], [1180, 812], [1500, 790], [1980, 770]];
  function backGold(p) {
    p.layer('s16-sky', { every: 6, still: true, depth: .05 });
    W.sky(p, { mood: GL, horizon: 660, drift: 0, clouds: [[240, 230, 980, 170, 1], [1560, 150, 900, 150, 3], [1000, 400, 900, 54, 5], [420, 470, 700, 40, 7]] });
    p.mass([[200, 600], [460, 470], [840, 430], [1180, 480], [1300, 600], [820, 700], [300, 690]], { color: { rad: [700, 590, 600], stops: [[0, '#fff3c8'], [.5, '#ffe2a0'], [1, '#f7d58c']] }, alpha: .8, dir: -.06, len: 1.6, size: 1.2, soft: 60 });
    [[640, 560, -2.9, 520], [650, 560, -2.55, 560], [640, 550, -2.2, 520], [660, 550, -1.2, 480], [670, 560, -.62, 520], [660, 560, -.25, 560]].forEach((q, i) => p.line([[q[0] + cos(q[2]) * 120, q[1] + sin(q[2]) * 90], [q[0] + cos(q[2]) * q[3] * .6, q[1] + sin(q[2]) * q[3] * .6], [q[0] + cos(q[2] + .05) * q[3], q[1] + sin(q[2] + .05) * q[3]]], { color: '#fff3cf', w: 26, press: .22, medium: 'crayon', taper: [.4, .6], wobble: 2 }));
    const base = { season: .28, light: GL, colour: 1 };
    W.hill(p, Object.assign({ d: .95, pts: [[-60, 570], [160, 530], [340, 546], [560, 516], [760, 534], [960, 566], [1200, 590], [1980, 610]], base: 700, seed: 71, spurs: 4, rough: 4, hatch: 0 }, base));
    W.lough(p, { x: 480, y: 682, rx: 330, ry: 14, light: GL, seed: 4, n: 6 });
    W.hill(p, Object.assign({ d: .7, pts: [[-60, 650], [200, 678], [420, 702], [760, 710], [1100, 700], [1500, 670], [1980, 660]], base: 860, seed: 72, spurs: 3, rough: 5 }, base));
  }
  function landGold(p, t) {
    const base = { season: .28, light: GL, colour: 1 };
    p.layer('s16-land', { every: 4, depth: .72 });
    const rg = W.util.ridge(RG, { amp: 6, seed: 38, step: 24 });
    p.mass(W.util.below(rg, 1130), { sharp: true, color: { lin: [0, 780, 0, 1080], stops: [[0, '#dccb74'], [.3, '#b7b660'], [1, '#86954f']] }, dir: -.1, len: 1.1, size: .95, vary: .6 });
    W.sward(p, Object.assign({ rg, depth: 190, n: 240, t, wind: g, seed: 15, H: 34, d: .06 }, base));
    W.thorn(p, Object.assign({ x: 1800, y: 866, scale: 3.9, t, wind: g, d: .03, blossom: .3, flicks: 40 }, base));
    W.stone(p, Object.assign({ x: 1400, y: 850, scale: 2.5, t, wind: g, tuft: 0 }, base));
    W.rosesOver(p, Object.assign({ x: 1400, y: 846, scale: 2.5, k: .97, t, wind: g }, base));
  }
  // the bank in front of him: long grass, flowers, the light on it. his knees are behind it
  function nearGold(p, t) {
    const base = { season: .28, light: GL, colour: 1 };
    const top = W.util.ridge([[-60, 872], [220, 904], [520, 926], [900, 922], [1300, 930], [1980, 896]], { amp: 9, seed: 44, step: 22 });
    p.mass(W.util.below(top, 1130), { sharp: true, color: { lin: [0, 900, 0, 1080], stops: [[0, '#cfc070'], [.35, '#d8c884'], [1, '#c2b872']] }, dir: -.08, len: 1.1, size: .9, vary: .5 });
    W.grass(p, Object.assign({ line: [[-40, 946], [300, 944], [700, 944], [1000, 936], [1400, 942], [1960, 930]], n: 92, h: 84, depth: 14, t, wind: g, seed: 9, d: 0, lines: 80, avoid: x => x < 560 ? 1.35 : x > 1250 ? 1.1 : x > 860 && x < 1180 ? .62 : .95 }, base));
  }

  // ---------------------------------------------------------------- the old man, close. poses are whole drawings; k walks through them
  // coat outline, 12 points, same order in every pose: nape, over the back, down the left, along the bottom, up the front to the throat
  const COAT = [
    [0, [[566, 480], [462, 506], [352, 572], [306, 730], [304, 960], [520, 980], [880, 970], [900, 820], [872, 690], [818, 604], [752, 546], [650, 536]]],
    [.14, [[546, 458], [440, 486], [330, 556], [292, 720], [298, 960], [520, 980], [880, 970], [898, 810], [862, 676], [806, 588], [740, 526], [636, 516]]],
    [.42, [[656, 492], [532, 476], [392, 526], [288, 690], [256, 960], [520, 980], [900, 972], [946, 862], [932, 738], [884, 644], [832, 590], [744, 556]]],
    [.72, [[774, 610], [660, 490], [494, 470], [320, 560], [206, 720], [170, 962], [520, 978], [770, 962], [880, 840], [874, 776], [862, 726], [826, 660]]],
    [1, [[794, 668], [716, 534], [570, 470], [404, 520], [232, 610], [128, 960], [520, 976], [748, 964], [812, 906], [846, 846], [852, 790], [838, 716]]]];
  // head: middle of the skull x,y, rotation (the same head as s10-s13)
  const HEAD = [[0, [664, 322, .1]], [.14, [634, 284, -.06]], [.42, [800, 408, .4]], [.72, [948, 640, 1.0]], [.9, [994, 752, 1.4]], [1, [986, 744, 1.33]]], HS = .6;
  const GOLDSKIN = { skin: '#d8ab89', lit: '#ffdca2', sh: '#8a6351', deep: '#5c4135', hair: '#d8d2c6', hairL: '#fff5de', hairD: '#978f86', k: 1 };
  const COLLAR = [[0, [[508, 552], [530, 466], [594, 444], [634, 500], [604, 580], [546, 602]]], [.14, [[490, 532], [510, 444], [576, 424], [614, 482], [584, 560], [528, 582]]], [.42, [[598, 532], [622, 456], [692, 446], [722, 512], [696, 586], [632, 600]]], [.72, [[708, 606], [748, 540], [816, 556], [830, 640], [786, 702], [726, 676]]], [1, [[716, 660], [758, 584], [826, 600], [836, 690], [792, 756], [730, 730]]]];
  const SCARF = [ // collar band, 8 points
    [0, [[566, 452], [648, 500], [744, 494], [800, 456], [808, 530], [748, 594], [632, 602], [540, 534]]],
    [.14, [[546, 430], [628, 480], [724, 474], [780, 434], [790, 510], [730, 576], [614, 584], [520, 514]]],
    [.42, [[664, 478], [756, 528], [852, 546], [892, 516], [902, 582], [834, 644], [716, 626], [626, 546]]],
    [.72, [[786, 572], [850, 634], [872, 712], [868, 772], [828, 784], [786, 746], [748, 676], [740, 602]]],
    [1, [[808, 628], [862, 672], [878, 758], [866, 826], [824, 840], [788, 796], [764, 716], [768, 656]]]];
  const TAIL = [ // the hanging end, 5 points
    [0, [[748, 566], [768, 660], [760, 752], [774, 846], [762, 940]]],
    [.14, [[732, 548], [756, 650], [746, 744], [762, 838], [754, 936]]],
    [.42, [[822, 622], [818, 714], [784, 800], [788, 880], [822, 936]]],
    [.72, [[836, 772], [872, 826], [892, 880], [940, 906], [1006, 904]]],
    [1, [[836, 828], [866, 870], [908, 896], [976, 908], [1062, 902]]]];
  const COLC = '#776d5f';
  function ribbonPoly(pts, w0, w1) { const q = spline(pts, 6, false), L = [], R = []; q.forEach((v, i) => { const a = q[Math.max(0, i - 1)], b = q[Math.min(q.length - 1, i + 1)], l = hyp(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / l, ny = (b[0] - a[0]) / l, w = lerp(w0, w1, i / (q.length - 1)); L.push([v[0] + nx * w, v[1] + ny * w]); R.push([v[0] - nx * w, v[1] - ny * w]); }); return { poly: L.concat(R.slice().reverse()), L, R, q }; }
  const odd = a => a.filter((_, i) => i % 2 === 0);
  // kB body, kH head, kA far arm, kN near arm, kT tail (each 0..1 through the same poses, so parts can lead and trail)
  function oldMan(p, o) {
    const coat = keys(o.kB, COAT), hd = keys(o.kH, HEAD), sc = keys(lerp(o.kB, o.kH, .45), SCARF), tl = keys(o.kT, TAIL), br = o.br || 0, ink = '#3a302a', H = 316;
    const body = coat.map((v, i) => i < 4 ? [v[0] - br * 3, v[1] - br * 5] : i > 7 ? [v[0] + br * 3, v[1] - br * 3] : v);
    const hq = (x, y) => { const c = cos(hd[2]), s = sin(hd[2]); return [hd[0] + (x * c - y * s) * HS, hd[1] + (x * s + y * c) * HS]; };
    // far arm: goes out past the head to the earth at the foot of the stone; it lands before the head does
    const aK = o.kA; if (aK > .3) { const sh = keys(o.kB, [[0, [800, 660]], [.42, [870, 670]], [.72, [880, 760]], [1, [868, 776]]]), wr = keys(aK, [[.3, [900, 800]], [.46, [1010, 800]], [.62, [1130, 862]], [.7, [1150, 884]], [.8, [1142, 876]], [1, [1140, 876]]]), el = [(sh[0] + wr[0]) / 2 + 4, (sh[1] + wr[1]) / 2 - 40];
      const sl = ribbonPoly([sh, el, wr], 60, 42); p.mass(sl.poly, { sharp: true, color: mixc(COLC, '#554e58', .4), dir: .5, size: .6, len: .8, vary: .4 }); p.shade(sl.R.concat(sl.q.slice().reverse()), { sharp: true, color: '#5d5264', alpha: .4, soft: 8 }); p.line(odd(sl.L), { color: ink, w: 4, press: .7, taper: [.2, .1] }); p.line(odd(sl.R), { color: ink, w: 4.4, press: .8, taper: [.2, .1] });
      C.hand(p, { who: 'dannyOld', x: wr[0], y: wr[1], h: 150, pose: ['reach', 'flatOnEarth', ss(.45, .7, aK)], rot: lerp(.5, .14, aK), light: LIGHT, sleeve: false, armLen: 30 }); }
    // neck, and the collar of the coat standing up behind it
    const nk = [hq(-196, 70), hq(-150, 230), [lerp(sc[0][0], sc[7][0], .5), lerp(sc[0][1], sc[7][1], .5)], sc[6], sc[5], sc[4], hq(96, 250), hq(0, 160)];
    p.mass(nk, { color: '#b98a6e', dir: 1.3 + hd[2], size: .55, len: .6, vary: .25 }); p.shade([hq(-120, 130), hq(110, 230), hq(60, 330), hq(-110, 300)], { color: '#7a5142', alpha: .55, soft: 14 });
    // coat
    p.mass(body, { color: { lin: [240, 470, 800, 980], stops: [[0, '#9c907a'], [.4, COLC], [1, '#575048']] }, dir: keys(o.kB, [[0, 1.35], [1, .5]]), len: 1.1, size: .85, vary: .42 });
    const sm = spline(body, 8, true), sl0 = sm.length;
    p.clip(body, () => {
      p.shade([body[8], body[9], body[10], body[11], [body[11][0] - 90, body[11][1] + 60], [body[6][0] - 230, 800], [body[5][0], 990], [body[6][0] + 80, 990]], { color: '#63526a', alpha: .42, soft: 44 });
      p.shade([body[0], body[1], body[2], body[3], [body[3][0] + 70, body[3][1]], [body[2][0] + 70, body[2][1] + 60], [body[1][0] + 20, body[1][1] + 64]], { color: '#ffd98e', alpha: .6, soft: 22, mode: 'screen' });
    });
    const run = (i0, i1) => { const q = []; for (let i = Math.round(i0 * 8); i <= i1 * 8; i += 3) q.push(sm[i % sl0]); return q; }, at = (i, f) => { const a = body[i], b = body[(i + 1) % 12]; return [lerp(a[0], b[0], f), lerp(a[1], b[1], f)]; };
    p.line(run(0, 2), { color: ink, w: 5, press: .75, taper: [.1, .2], passes: 2 }); p.line(run(1.7, 4), { color: ink, w: 5.4, press: .8, taper: [.2, .1] }); p.line(run(7, 11), { color: ink, w: 5, press: .8, taper: [.2, .15] });
    // the coat hangs from the shoulder; it pulls where he bends
    { const u = ss(.5, 1, o.kB); if (u > .05) { p.line([[body[0][0] - 34, body[0][1] + 4], at(0, .75).map((v, j) => v + [4, 40][j]), at(1, .7).map((v, j) => v + [0, 60][j]), at(2, .7).map((v, j) => v + [30, 80][j]), [at(3, .7)[0] + 80, at(3, .7)[1] + 70]], { color: ink, w: 3.4, press: .5 * u, taper: [.2, .5], wobble: 1.3 }); p.line([[at(3, .2)[0] + 30, at(3, .2)[1] + 70], [at(3, .7)[0] + 120, at(3, .7)[1] + 70], [at(4, .3)[0] + 190, at(4, .3)[1] + 10]], { color: ink, w: 3.2, press: .42 * u, taper: [.3, .6], wobble: 1.4 }); [[.2, 60], [.5, 90], [.8, 70]].forEach((q, i) => p.line([[at(1, q[0])[0] + 30, at(1, q[0])[1] + 74 + 20 * i], [at(1, q[0])[0] + 50 + q[1] * .4, at(1, q[0])[1] + 120], [at(1, q[0])[0] + q[1] + 60, at(1, q[0])[1] + 190]], { color: ink, w: 3, press: .36 * u, taper: [.4, .6], wobble: 1.4 })); } }
    const S0 = at(1, .4), hem = [(body[4][0] + body[5][0]) / 2, 940];
    [[.1, 70, .0], [.4, 110, 40], [.75, 150, 110]].forEach((q, i) => p.line([[at(0, q[0])[0] - 10, at(0, q[0])[1] + 46], [lerp(at(0, q[0])[0], hem[0] + q[1], .45), lerp(at(0, q[0])[1], 900, .45) + 10], [hem[0] + q[1] + 60 + q[2], 900]], { color: ink, w: 3.4, press: .42, taper: [.35, .6], wobble: 1.5 }));
    const op = [[lerp(sc[5][0], sc[4][0], .3) - 8, sc[5][1] - 4], [lerp(sc[5][0], body[6][0], .5) - 46, lerp(sc[5][1], 960, .45)], [body[6][0] - 170, 960]]; p.line(op, { color: ink, w: 4.4, press: .6, taper: [.1, .3] }); p.line([[sc[6][0] - 6, sc[6][1] - 8], [sc[6][0] + 22, sc[6][1] + 70], [lerp(op[0][0], op[1][0], .7), lerp(op[0][1], op[1][1], .7)]], { color: ink, w: 3.6, press: .5, taper: [.1, .5] });
    { const q = keys(o.kB, COLLAR); p.mass(q, { color: '#544c46', dir: .9, size: .6, len: .7, vary: .4 }); p.shade([q[3], q[4], q[5], [q[5][0] + 30, q[5][1] - 40]], { color: '#2f2a30', alpha: .45, soft: 10 }); p.line([q[5], q[0], q[1], q[2]], { color: ink, w: 4.6, press: .85, taper: [.15, .2] }); p.line([q[5], q[4], q[3]], { color: ink, w: 3.6, press: .6, taper: [.2, .3] }); }
    // scarf band behind the jaw, the head, then its near fold and the hanging end
    p.mass(sc, { color: '#9c3129', dir: 1.1 + .6 * o.kB, size: .6, len: .7, vary: .4 });
    B.test.s13head(p, Object.assign({ x: hd[0], y: hd[1], s: HS, rot: hd[2], light: GOLDSKIN, wisp: o.wisp || 0 }, o.face));
    const mid2 = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u)], low = [sc[7], sc[6], sc[5], sc[4], mid2(sc[4], sc[3], .6), mid2(sc[5], sc[2], .52), mid2(sc[6], sc[1], .52), mid2(sc[7], sc[0], .6)];
    p.mass(low, { color: '#b03a2e', dir: .4 + .9 * o.kB, size: .55, len: .7, vary: .38 });
    p.shade([sc[6], sc[5], sc[4], [sc[4][0] - 8, sc[4][1] - 26], [sc[5][0], sc[5][1] - 34], [sc[6][0] + 6, sc[6][1] - 32]], { color: '#6a2430', alpha: .5, soft: 10 });
    [.3, .6, .86].forEach((u, i) => p.line([0, 1, 2, 3].map(j => mid2(low[j], low[7 - j], u)), { color: i % 2 ? '#d7604f' : '#7a1c20', w: 3.4, press: .5, taper: [.25, .35] }));
    p.line([sc[7], sc[6], sc[5], sc[4]], { color: '#6a1d1c', w: 4, press: .7, taper: [.2, .2] }); p.line([low[7], low[6], low[5], low[4]], { color: '#6a1d1c', w: 3.2, press: .6, taper: [.25, .25] });
    const tp = ribbonPoly(tl, 34, 37); p.mass(tp.poly, { sharp: true, color: '#b03a2e', dir: 1.4, size: .55, len: .7, vary: .38 }); p.shade(tp.R.concat(tp.q.slice().reverse()), { sharp: true, color: '#6a2430', alpha: .42, soft: 6 });
    for (let j = 1; j < 9; j++) { const i = Math.round(j / 9 * (tp.q.length - 1)); p.line([tp.L[i], tp.q[i], tp.R[i]], { color: j % 2 ? '#8d2723' : '#d7604f', w: 2.6, press: .42, taper: [.2, .3] }); }
    p.line(odd(tp.L), { color: '#6a1d1c', w: 3.4, press: .6, taper: [.1, .1] }); p.line(odd(tp.R), { color: '#6a1d1c', w: 4, press: .75, taper: [.1, .1] });
    const e = tp.q[tp.q.length - 1], e2 = tp.q[tp.q.length - 4], ea = Math.atan2(e[1] - e2[1], e[0] - e2[0]); for (let j = 0; j < 7; j++) { const w = (j / 6 - .5) * 64, x = e[0] - sin(ea) * w, y = e[1] + cos(ea) * w; p.line([[x, y], [x + cos(ea) * 16 + 3 * (hash(j, 2, 1) - .5), y + sin(ea) * 16], [x + cos(ea + .3 * (hash(j, 1, 1) - .5)) * 32, y + sin(ea + .2) * 30]], { color: j % 2 ? '#a5302a' : '#c24a40', w: 3.4, press: .8, taper: [.05, .5] }); }
    // near sleeve and hand
    { const sh = keys(o.kB, [[0, [404, 628]], [.14, [388, 612]], [.42, [470, 620]], [.72, [560, 668]], [1, [590, 676]]]), el = keys(o.kN, [[0, [350, 850]], [.42, [420, 900]], [.72, [500, 916]], [1, [516, 922]]]), wr = keys(o.kN, [[0, [470, 1010]], [.3, [540, 980]], [.5, [676, 904]], [.62, [748, 900]], [1, [742, 900]]]), sv = ss(.2, .5, o.kN);
      const sl = ribbonPoly([sh, [lerp(sh[0], el[0], .55) - 18, lerp(sh[1], el[1], .55)], el, [lerp(el[0], wr[0], .5), lerp(el[1], wr[1], .5) + 10], wr], 84, 50);
      if (sv > .02) { const m = sl.L.length, ua = Math.atan2(el[1] - sh[1], el[0] - sh[0]), cap = []; for (let j = 0; j <= 6; j++) { const a = ua + PI / 2 + j / 6 * PI; cap.push([sh[0] + cos(a) * 88, sh[1] + sin(a) * 96]); } const P2 = sl.L.slice(4).reverse().concat(cap).concat(sl.R.slice(4));
        p.clip(body, () => p.shade(sl.R.map(v => [v[0] + 46, v[1] + 8]).concat(sl.q.slice().reverse()), { sharp: true, color: '#453a4c', alpha: .5 * sv, soft: 22 }));
        p.mass(P2, { sharp: true, color: { lin: [sh[0] - 90, sh[1] - 60, sh[0] + 90, el[1]], stops: [[0, '#b3a78e'], [.35, '#8a7f6e'], [1, '#5f564e']] }, alpha: sv, dir: 1.35, size: .75, len: .9, vary: .42 });
        p.shade([[el[0] - 70, el[1] - 60], [el[0] + 40, el[1] - 70], [wr[0], wr[1] - 34], [wr[0], wr[1] + 60], [el[0] - 60, el[1] + 80]], { color: '#4d4152', alpha: .4 * sv, soft: 18 });
        { const z = odd(sl.R), h = z.length; p.line([cap[4], cap[5], cap[6]].concat(z.slice(3, Math.round(h * .5))), { color: ink, w: 5, press: .85 * sv, taper: [.3, .3] }); p.line(z.slice(Math.round(h * .76)), { color: ink, w: 4.4, press: .7 * sv, taper: [.3, .2] }); } p.line(odd(sl.L).slice(3, -3), { color: ink, w: 5, press: .7 * sv, taper: [.35, .3] });
        for (let j = 0; j < 3; j++) { const i = Math.round(m * (.3 + j * .1)), q = sl.q[i], r = sl.R[i]; if (q && r) p.line([r, [lerp(r[0], q[0], .6) + 4, lerp(r[1], q[1], .6) + 8], [q[0] + 12, q[1] + 20]], { color: ink, w: 3, press: .5 * sv, taper: [.1, .6] }); } }
      if (sv < 1) { p.line(odd(sl.R).slice(3, -3), { color: ink, w: 4.6, press: .7 * (1 - sv), taper: [.4, .3] }); p.line(odd(sl.L).slice(5, -5), { color: ink, w: 3.6, press: .3 * (1 - sv), taper: [.5, .4] }); }
      if (o.kN > .2) C.hand(p, { who: 'dannyOld', x: wr[0], y: wr[1], h: 170, pose: ['reach', 'flatOnEarth', ss(.3, .62, o.kN)], rot: lerp(.6, .06, ss(.2, .7, o.kN)), light: LIGHT, sleeve: false, armLen: 30 }); }
  }

  // ---------------------------------------------------------------- sheet 2: her, and him, small. heads are drawn apart so they can act on each other
  const q50 = v => Math.round(v * 50) / 50; // heads turn in small held steps (and the sculpted head is reused)
  const PH = 418; // her head height
  function pair(p, o) {
    const h = PH, t = p.t, tw = o.turn || 0, f = -1, br = o.br || 0, mx = HC[0] + (.365 + .05 * tw) * h + (o.dx || 0), my = HC[1] - .79 * h + (o.dy || 0), L = o.light, P = v => [mx + f * v[0] * h, my + v[1] * h + br * 4], PP = a => a.map(P), ink = '#4a3a2c';
    // her shoulders and head. m: {x,y,tilt,nod,turn} offsets in head heights
    const m = o.m || {};
    C.face(p, 'mother', { x: mx + (m.x || 0) * h, y: my + (m.y || 0) * h + br * 3, h, view: 'front', turn: q50(.72 + tw + (m.turn || 0)), nod: q50(.16 + (m.nod || 0)), tilt: -.3 + (m.tilt || 0), face: f, bodyTurn: .6 + tw * .6, bodyLean: -.03, bustLen: 1.9, expr: o.me, light: L, wind: o.wind, t, construct: true });
    // his back: one big jumper shape
    const j = [[.3, 1.18], [.52, 1.09], [.78, 1.15], [1.0, 1.36], [1.13, 1.74], [1.16, 2.3], [.2, 2.3], [.05, 1.84], [.08, 1.46]].map(P);
    p.mass(j, { color: { lin: [P([1.1, 1.1])[0], P([0, 1.1])[1], P([.1, 1.1])[0], P([0, 1.9])[1]], stops: [[0, '#f3e2b8'], [.5, '#e0cb9c'], [1, '#c2a878']] }, dir: 1.95, size: .9, len: 1.1, vary: .36 });
    p.clip(j, () => { p.shade(PP([[.3, 1.1], [.06, 1.2], [.0, 2.3], [.4, 2.3], [.36, 1.6]]), { color: '#8f7468', alpha: .5, soft: 30 }); p.shade(PP([[.7, 2.3], [.8, 1.9], [.2, 1.8], [.1, 2.3]]), { color: '#8f7468', alpha: .36, soft: 34 }); });
    p.line(PP([[.36, 1.13], [.54, 1.085], [.78, 1.145], [1.0, 1.36], [1.12, 1.72], [1.16, 2.2]]), { color: ink, w: 4.6, press: .75, taper: [.2, .2] });
    for (let i = 0; i < 4; i++) p.line(PP([[.5 + .13 * i, 1.22 + .03 * i], [.6 + .1 * i, 1.5], [.54 + .13 * i, 1.9]]), { color: '#8a7450', w: 3.2, press: .4, taper: [.4, .5] });
    // ribbing at his neck
    p.line(PP([[.1, 1.28], [.28, 1.2], [.5, 1.13], [.66, 1.15]]), { color: '#b89d70', w: 22, press: .7, medium: 'crayon', taper: [.1, .2] }); for (let i = 0; i < 7; i++) { const u = i / 6, q = P([lerp(.14, .62, u), 1.265 - .12 * sin(u * 2.2)]); p.line([[q[0], q[1] - 9], [q[0] + 2, q[1] + 10]], { color: '#8a7450', w: 2.6, press: .55 }); }
    // his arm, up round her neck, the hand holding on to the shawl
    const gr = o.grip || 0, arm = ribbonPoly(PP([[.2, 1.62], [.1, 1.36], [-.02, 1.16], [-.16, .99 - .015 * gr]]), .15 * h, .088 * h);
    p.mass(arm.poly, { sharp: true, color: { lin: [P([.2, 0])[0], P([0, 1.6])[1], P([-.2, 0])[0], P([0, 1])[1]], stops: [[0, '#d2bb8b'], [1, '#ecd9ad']] }, dir: 2.4, size: .75, len: .9, vary: .34 }); p.shade(arm.L.concat(arm.q.slice().reverse()), { sharp: true, color: '#8f7468', alpha: .34, soft: 14 }); p.line(odd(arm.L).slice(2), { color: ink, w: 4, press: .7, taper: [.3, .15] }); p.line(odd(arm.R).slice(1), { color: ink, w: 4.2, press: .75, taper: [.3, .15] });
    C.hand(p, { who: 'boy', x: P([-.15, .99])[0], y: P([-.15, .99 - .015 * gr])[1], h: .33 * h, pose: ['onChair', 'holdFingers', .35 * gr], rot: -2.5 - .05 * gr, mir: f, flip: -1, light: L, sleeve: false, armLen: 0 });
    const b = o.b || {};
    C.face(p, 'boy', { x: HC[0] + (o.dx || 0) + (b.x || 0) * h, y: HC[1] + (o.dy || 0) - .1 * h + (b.y || 0) * h + br * 4, h: h * .84, view: 'front', turn: q50(-.4 + tw * .5 + (b.turn || 0)), nod: q50(.1 + (b.nod || 0)), tilt: .5 + (b.tilt || 0), face: f, bust: false, expr: o.be, light: L, wind: o.wind, t });
    // her hand, spread on the back of his head, the thumb moving a little in his hair
    if (o.hand !== false) { const hk = o.stroke || 0, wx = P([.79, .88])[0] + hk * 9, wy = P([.79, .88])[1] - hk * 11; const sl = ribbonPoly([P([1.36, 1.9]), P([1.2, 1.5]), P([1.04, 1.2]), [lerp(P([1.04, 1.2])[0], wx, .62), lerp(P([1.04, 1.2])[1], wy, .62)]], .2 * h, .115 * h);
      C.hand(p, { who: 'mother', x: wx, y: wy, h: .56 * h, pose: { f: [[4, 16, 24, 12], [1, 18, 26, 14], [-2, 20, 28, 14], [-6, 22, 30, 16]], th: [34, 24, 10, 12], roll: 10, pitch: 0 }, rot: PI + .86, mir: f, flip: -1, light: L, sleeve: false, armLen: .16 * h, arm: P([1.04, 1.2]) });
      p.mass(sl.poly, { sharp: true, color: { lin: [P([1.4, 0])[0], 0, P([.8, 0])[0], 0], stops: [[0, '#f6ecd4'], [1, '#d9cab0']] }, dir: .9, size: .75, len: .9, vary: .3 }); p.shade(sl.R.concat(sl.q.slice().reverse()), { sharp: true, color: '#9d8a86', alpha: .36, soft: 12 }); p.line(odd(sl.L), { color: ink, w: 4, press: .7, taper: [.2, .15] }); p.line(odd(sl.R), { color: ink, w: 4.4, press: .75, taper: [.2, .15] }); const e = sl.q.length - 1; p.line([sl.L[e], sl.q[e], sl.R[e]], { color: ink, w: 3.6, press: .6 }); }
    return { mx, my };
  }
  // the light they turn in: everything the film has kept back. streaks of pastel go round with them
  const STR = (() => { const o = []; for (let i = 0; i < 40; i++) { const h = k => hash(i, 41, k); o.push({ r: 400 + 900 * h(1), a: h(2) * TAU, l: .5 + .7 * h(3), w: 7 + 17 * h(4), c: (h(5) * 8) | 0, v: .8 + .4 * h(6) }); } return o; })();
  const STC = ['#fffbe8', '#fff0b4', '#ffdc84', '#f4b7a2', '#8fc4c6', '#b4cf86', '#fffbe8', '#f2c07e'];
  function backLight(p, t, k = 1, spin = 0) {
    const cx = 1090, cy = 430;
    p.layer('s16-light', { every: 2, depth: .42, alpha: k });
    p.mass([[-40, -40], [960, -40], [1960, -40], [1960, 1120], [960, 1120], [-40, 1120]], { sharp: true, color: { rad: [cx, cy, 1220], stops: [[0, '#fffdf0'], [.2, '#fff4c8'], [.42, '#ffdf96'], [.62, '#f0c67c'], [.78, '#b7c4a0'], [.92, '#7fb1b8'], [1, '#6aa3b4']] }, dir: { around: [cx, cy] }, len: 1.7, size: 1.25, vary: .75, dens: 1 });
    p.mass([[-60, 720], [240, 770], [560, 860], [1000, 960], [1500, 880], [1980, 740], [1980, 1140], [-60, 1140]], { color: { lin: [0, 720, 0, 1080], stops: [[0, '#d7cf7c'], [.6, '#a5b868'], [1, '#86a858']] }, alpha: .8, dir: -.1, len: 1.4, size: 1, vary: .8, soft: 60 });
    const by = STC.map(() => []); STR.forEach((q, i) => { const a = q.a + spin * q.v * (1.25 - q.r * .0005), n = 7, L = [], R = []; for (let j = 0; j <= n; j++) { const u = j / n, e = a + q.l * 560 / q.r * (u - .5), ww = q.w * Math.pow(sin(PI * clamp(u * .92 + .04)), .8) * (1 + .3 * noise1(u * 5, i)); L.push([cx + cos(e) * (q.r + ww) * 1.2, cy + sin(e) * (q.r + ww) * .8]); R.push([cx + cos(e) * (q.r - ww) * 1.2, cy + sin(e) * (q.r - ww) * .8]); } by[q.c].push(L.concat(R.reverse())); });
    by.forEach((l, i) => { if (l.length) p.mass(W.util.poly(...l), { color: STC[i], alpha: .5, dir: { around: [cx, cy] }, len: 1.5, size: .8, vary: .4, soft: 6 }); });
    STR.forEach((q, i) => { if (i % 3 || q.c === 0 || q.c === 6) return; const a = q.a + spin * q.v * (1.25 - q.r * .0005) + .1, pts = []; for (let j = 0; j <= 5; j++) { const e = a + q.l * 640 / q.r * (j / 5 - .5); pts.push([cx + cos(e) * q.r * 1.2, cy + sin(e) * q.r * .8]); } p.line(pts, { color: STC[q.c], w: 6 + 5 * q.v, press: .5, medium: 'crayon', taper: [.4, .5], wobble: 1.5 }); });
    // the rose bush and the meadow, half seen, going by behind them
    p.layer('s16-bush', { every: 4, depth: .8, alpha: k }); const base = { season: .3, light: GL, colour: 1 }, sb = Math.round(spin * 14) / 14;
    W.roseBush(p, Object.assign({ x: 250 - sb * 120, y: 1010, scale: 1.5, w: 420, h: 250, bloom: 1, seed: 3, wind: g, t, d: .12 }, base));
    W.roseBush(p, Object.assign({ x: 1800 - sb * 100, y: 1030, scale: 1.45, w: 380, h: 270, bloom: 1, seed: 8, wind: g, t, d: .12 }, base));
  }
  // petals carried round them: behind when they go away from us, in front when they come
  const PET = (() => { const o = []; for (let i = 0; i < 26; i++) { const h = k => hash(i, 77, k); o.push({ a: h(1) * TAU, rx: 430 + 620 * h(2), ry: 90 + 190 * h(3), y: 330 + 560 * h(4), v: .62 + .5 * h(5), s: 13 + 15 * h(6), tn: h(7), w: 1 + 2 * h(8), r: h(9) * TAU }); } return o; })();
  function orbit(p, t, front, k = 1) {
    PET.forEach((q, i) => { if (i / PET.length > k) return; const a = q.a + t * q.v + .35 * noise1(t * .7 + i, 5), z = sin(a); if ((z > .05) !== front) return; const x = 1080 + cos(a) * q.rx + 26 * noise1(t * 1.1 + i * 3, 8), y = q.y + z * q.ry + 40 * noise1(t * .6 + i * 2, 4) + 22 * sin(t * q.w + i), s = q.s * (1 + .75 * Math.max(0, z)) * (z < 0 ? .8 : 1); if (x < -60 || x > 1980 || y < -60 || y > 1120) return; W.petal(p, { x, y, s, rot: q.r + t * (.8 + q.w * .5) + noise1(t * 1.3 + i, 2), yaw: t * (1.4 + q.w) + i, tone: q.tn, light: 'summer' }); });
  }

  // ---------------------------------------------------------------- between the two sheets: lines that look for the new pose in the old one
  const PHI = .85, rot = (v, a) => { const c = cos(a), s = sin(a), x = v[0] - HC[0], y = v[1] - HC[1]; return [HC[0] + x * c - y * s, HC[1] + x * s + y * c]; };
  const ring = (cx, cy, rx, ry, a, n = 14) => Array.from({ length: n + 1 }, (_, i) => { const u = i / n * TAU + 2.2, x = cos(u) * rx, y = sin(u) * ry; return [cx + x * cos(a) - y * sin(a), cy + x * sin(a) + y * cos(a)]; });
  const axis = (cx, cy, l, a, b = 0) => Array.from({ length: 5 }, (_, i) => { const u = (i / 4 - .5) * 2, x = u * l, y = b * (1 - u * u); return [cx + x * cos(a) - y * sin(a), cy + x * sin(a) + y * cos(a)]; });
  const SEARCH = [
    { c: 'g', w: 5, o: ring(984, 738, 172, 150, 1.33), n: ring(1000, 682, 166, 146, .5) },
    { c: 'b', w: 3, o: axis(960, 800, 130, 1.33, 8), n: axis(992, 712, 160, .5, 10) }, { c: 'b', w: 3, o: axis(984, 760, 160, 1.33 - PI / 2), n: axis(992, 700, 178, .5 - PI / 2) },
    { c: 'g', w: 6, o: [[812, 690], [716, 540], [560, 468], [372, 490], [250, 590], [180, 720], [150, 840], [140, 960]], n: [[1020, 880], [930, 852], [840, 866], [760, 920], [706, 990], [676, 1060], [664, 1100], [660, 1140]] },
    { c: 'g', w: 5, o: [[620, 846], [780, 848], [940, 850], [1100, 846], [1260, 842], [1420, 838], [1600, 830], [1800, 822]], n: [[990, 1060], [1060, 930], [1130, 820], [1200, 690], [1290, 560], [1372, 640], [1476, 756], [1518, 930]] },
    { c: 'g', w: 6, o: [[1262, 846], [1262, 700], [1270, 560], [1290, 420], [1345, 372], [1430, 380], [1520, 400], [1530, 560], [1532, 700]], n: [[952, 500], [938, 405], [944, 310], [1000, 222], [1070, 180], [1196, 160], [1300, 256], [1352, 400], [1262, 560]] },
    { c: 'r', w: 3, o: [[1262, 846], [1280, 640], [1300, 460], [1380, 380], [1470, 384], [1526, 480], [1532, 640], [1532, 800]], n: [[960, 560], [920, 400], [960, 250], [1080, 160], [1220, 150], [1320, 260], [1330, 420], [1240, 570]] },
    { c: 'g', w: 5, o: [[868, 776], [960, 786], [1060, 830], [1140, 876], [1240, 892]], n: [[1040, 1000], [1090, 880], [1150, 790], [1196, 740], [1252, 730]] },
    { c: 'd', w: 6, o: [[836, 828], [866, 870], [908, 896], [976, 908], [1062, 902]], n: [[600, 1100], [690, 940], [760, 810], [820, 700], [900, 590]] },
    { c: 'b', w: 3, o: [[700, 560], [540, 480], [360, 520], [220, 660], [160, 860]], n: [[900, 830], [800, 860], [720, 950], [670, 1050], [640, 1120]] }];
  const LC = { g: '#3a302a', b: '#6f93aa', r: '#a5714c', d: '#b5322b' };
  function searchLines(p, q, n, k) {
    const at = (c, u, sc) => { const e = ease.io(clamp(u)); return c.o.map((v, i) => { const m = Math.min(i, c.n.length - 1), w = rot(c.n[m], PHI), z = [lerp(v[0], w[0], e), lerp(v[1], w[1], e)], y = rot(z, -PHI * e); return [HC[0] + (y[0] - HC[0]) * sc, HC[1] + (y[1] - HC[1]) * sc]; }); };
    SEARCH.forEach((c, i) => {
      const lag = (hash(i, 3, 1) - .5) * .12, u = q + lag, pr = k * (c.c === 'b' || c.c === 'r' ? .55 : .8), J = (z, sd) => z.map((v, j) => [v[0] + (p.rnd(i * 9 + j, sd, 1) - .5) * 13, v[1] + (p.rnd(i * 9 + j, sd, 2) - .5) * 13]);
      const st = { color: LC[c.c], w: c.w, press: pr, medium: c.c === 'b' || c.c === 'r' || c.c === 'd' ? 'redline' : 'graphite', taper: [.12, .3], wobble: 2.2, passes: 2 };
      p.line(J(at(c, u - .14, 1), 4), Object.assign({}, st, { w: c.w * .7, press: pr * .42, passes: 1 }));       // where it was, not quite rubbed out
      p.line(J(at(c, u, 1), 1), st); if (i % 2 === 0) p.line(J(at(c, u + .1, 1.03), 7), Object.assign({}, st, { w: c.w * .6, press: pr * .5, passes: 1 }));   // where it may be going
    });
    p.dust(HC[0] + 60, HC[1] + 120, 420, { color: '#6b5f55', n: 70, seed: n, alpha: .4 * k });
  }
  // the kneaded eraser goes across the old pose
  function rub(p, q) {
    const a = clamp(q / .5), R = [[250, 760, 620, 440, 84], [860, 560, 1150, 840, 96], [160, 900, 560, 560, 70], [1240, 420, 1540, 640, 92], [330, 940, 760, 560, 78], [880, 840, 1180, 700, 60], [560, 930, 860, 640, 88], [1260, 780, 1500, 480, 70], [150, 620, 480, 470, 60], [640, 950, 900, 860, 52]];
    R.forEach((r, i) => { const u = clamp(a * 1.9 - i * .09); if (u <= .02) return; const s = i % 2 ? -1 : 1, A0 = s > 0 ? [r[0], r[1]] : [r[2], r[3]], A1 = s > 0 ? [r[2], r[3]] : [r[0], r[1]], e = [lerp(A0[0], A1[0], u), lerp(A0[1], A1[1], u)], m = [(A0[0] + e[0]) / 2, (A0[1] + e[1]) / 2 - 26]; const rb = ribbonPoly([A0, m, e], r[4] * .55, r[4] * .42); p.lift(rb.poly, { sharp: true, amount: .5 + .34 * hash(i, 5, 5), soft: 16 }); });
  }

  // ---------------------------------------------------------------- timing
  const T1 = 3.66, T2 = 4.92;
  const LK = { light: LIGHT };
  B.scene({
    id: 's16', ink: 'deep',
    draw(p, s) {
      init(); const t = s.t, q = (t - T1) / (T2 - T1); p.paper('#eee0c2');
      const phi = PHI * ease.io(clamp((q - .06) / .86));
      const aOld = keys(q, [[.06, 1], [.4, .34, 'lin'], [.56, 0, 'lin']]), aNew = keys(q, [[.4, 0], [.62, .5, 'lin'], [.95, 1, 'lin']]), aBg = keys(q, [[.28, 0], [.55, .4, 'lin'], [1, 1, 'lin']]);
      if (q < 1) { backGold(p); landGold(p, Math.floor(t * 4) / 4); }
      if (aOld > .02) {
        // breath in, a look at the roses, the lift before the bend; hand first, head down an arc, the back after it, the scarf last
        const path = L => keys(t - L, [[1.02, 0], [1.5, .14, 'out'], [1.62, .14], [2.2, .42, 'in'], [2.72, .84, 'lin'], [2.98, 1, 'out']]);
        const kH = path(.06) + keys(t, [[2.95, 0], [3.1, .02], [3.35, 0]]), kB = path(.0), kT = clamp(path(.2) + keys(t, [[3.1, 0], [3.25, .02], [3.5, 0]])), kA = clamp(path(-.14)), kN = clamp(path(-.1));
        const look = keys(t, [[-.6, 0], [.05, 0], [.4, 1], [1.0, 1], [1.4, .2]]), shut = keys(t, [[1.12, 0], [1.36, .75, 'out'], [1.9, 1]]), br = keys(t, [[-.4, 0], [.5, .3], [1.5, 1.6], [2.2, .6], [3.05, 0], [3.5, .5], [4.2, 0]]) + .25 * noise1(t * .8, 4), blink = keys(t, [[-.16, 0], [-.08, 1], [.02, 0]]);
        const face = { lids: Math.max(0, lerp(.4, .5, look) * (1 - shut) * (1 - blink)), gx: lerp(.3, .7, look), gy: lerp(.85, .1, look), grief: keys(t, [[-.4, .62], [.6, .7], [1.5, .72], [2.4, .8], [3.1, .5], [3.7, .25]]), squeeze: keys(t, [[1.6, 0], [2.5, .5], [3.1, .1], [3.5, 0]]), knit: keys(t, [[1.2, 0], [2.2, .25], [3.1, 0]]), mOpen: .02 + s.mouth * .62 * ss(3.2, 3.45, t) + .08 * keys(t, [[1.1, 0], [1.4, 1], [1.8, 0]]), mPull: keys(t, [[-.4, -.35], [.5, -.6], [1.3, .1], [2.2, .55], [3.0, .1], [3.5, -.55]]), chin: keys(t, [[2.4, 0], [2.9, .5], [3.6, .2]]), wet: ss(.2, 1, t), tear: keys(t, [[2.5, 0], [3.8, 1, 'out']]) };
        p.layer('s16-man', { every: 1, depth: 1, alpha: aOld }); p.push(); p.translate(HC[0], HC[1]); p.rotate(-phi); p.translate(-HC[0], -HC[1]);
        oldMan(p, { kB, kH: clamp(kH, 0, 1), kA, kN, kT, br, face, wisp: g(t, 800, 400) });
        p.pop();
      }
      if (q > .04 && q < .95) { p.layer('s16-rub', { every: 1, depth: 1 }); rub(p, q); }
      const spin = keys(t, [[4.0, -.25], [5.2, .12, 'out'], [8.4, 1.15, 'lin']]);
      if (aBg > .01) { const sq = keys(Math.floor(t * 4) / 4, [[4.0, -.25], [5.2, .12, 'out'], [8.4, 1.15, 'lin']]); backLight(p, Math.floor(t * 4) / 4, aBg, sq); }
      if (q < .42) { p.layer('s16-nr', { every: 3, depth: 1, alpha: 1 - ss(.05, .42, q) }); nearGold(p, Math.floor(t * 6) / 6); }
      if (aNew > .01) {
        const tw = keys(t, [[4.2, .4], [4.9, .36], [6.3, .02], [8.2, -.2, 'out']]);
        const open = keys(t, [[5.18, 0], [5.62, 1, 'out'], [6.55, .95], [7.05, 0]]), say = keys(t, [[5.66, 0], [5.8, 1], [5.95, .2], [6.1, .9], [6.28, .1], [6.42, .5], [6.6, 0]]), press = keys(t, [[4.6, .6], [5.2, 1], [5.6, 0], [6.6, 0], [7.1, 1]]), sn = keys(t, [[5.7, 0], [6.4, 1], [8, 1]]);
        const gu = g(t, 900, 500), sway = .016 * keys(t, [[4.4, -1], [5.9, 1], [7.3, -.8], [8.6, .6]]);
        const draw = () => { p.push(); p.translate(HC[0], HC[1]); p.rotate(PHI - phi + sway); p.translate(-HC[0], -HC[1]);
          pair(p, { turn: tw, dx: -14 * tw, br: noise1(t * .75, 9) * 1.4, light: LIGHT, wind: [.3 + .6 * gu, -.04], stroke: keys(t, [[5.3, 0], [5.9, 1], [6.5, .1], [7.1, .9], [7.8, .2]]), grip: sn,
            m: { y: .016 * press - .026 * open - .01 * say, x: .012 * open, nod: .05 * press - .05 * open + .025 * say, tilt: -.03 * press + .03 * open },
            b: { x: -.006 * sn, y: -.012 * sn, tilt: .05 * sn, nod: -.02 * sn },
            me: { base: ['peace', { base: 'tender', open: .36, gy: .72, gx: -.12, smile: .4, browIn: .55, wet: .9, smileEye: .42, blush: .62 }, open], mOpen: q50(.16 * say) }, be: { base: 'peace', smile: lerp(.16, .42, sn), cheek: lerp(.16, .4, sn), blush: .62 } });
          p.pop(); };
        p.layer('s16-pair', { every: 1, depth: 1, alpha: aNew }); if (aBg > .5) orbit(p, t, false, ss(4.5, 5.6, t));
        if (q < 1) { const L = (x, y, rx, ry, a, b, i) => { const u = ss(a, b, q); return u > .02 ? spline(W.util.lump(x, y, rx * u, ry * u, i + 3, { n: 13, rough: .22 }), 4, true) : null; }, bl = [L(1000, 690, 260, 230, .36, .62, 1), L(860, 980, 330, 260, .48, .78, 2), L(1330, 860, 420, 420, .5, .84, 3), L(1140, 360, 340, 330, .56, .92, 4), L(960, 760, 900, 700, .8, 1, 5)].filter(Boolean); if (bl.length) p.clip(c => { c.beginPath(); for (const b of bl) { b.forEach((v, i) => i ? c.lineTo(v[0], v[1]) : c.moveTo(v[0], v[1])); c.closePath(); } }, draw); }
        else draw();
        if (q > .9) orbit(p, t, true, ss(4.5, 5.6, t));
      }
      if (q > -.06 && q < 1.04) { p.layer('s16-search', { every: 1, depth: 1 }); searchLines(p, clamp((q - .1) / .72), Math.round(s.abs * 12), ss(-.06, .16, q) * (1 - ss(.66, 1.04, q))); }
    }
  });
  B.test.s16pose = (p, k) => { init(); p.paper('#eee0c2'); backGold(p); landGold(p, 2); p.layer('s16-man', { every: 1, depth: 1 }); const kk = [0, .14, .42, .72, .88, 1][k | 0]; oldMan(p, { kB: kk, kH: kk, kA: kk, kN: kk, kT: kk, face: { lids: kk < .1 ? .5 : 0, gx: .4, gy: .7, grief: .5, wet: 1, tear: kk > .9 ? .8 : 0 } }); p.layer('s16-nr', { every: 3, depth: 1 }); nearGold(p, 2); };
})();
