// s15  "And all my grave will warmer, sweeter be"   112.0 - 119.0   THE WARMTH
//
// THE ONE FEELING: she answers. Being heard is enough to make the ground bloom.
//
// Where the eye goes: her hands -> along the thread as it turns to root -> up with the tips, round the stones, to the grass -> the stone in its roses -> him.
// VALUE PLAN  we start with one small warm thing in a dark sheet; the light is made of earth colours getting out of one another's way (umber, rose, gold), and the
//   bottom of the sheet stays deep wine so the gold has something to stand on. At the end the lightest thing is the sky behind him, the reddest the stone.
// BEATS (scene seconds; w0 And .25  w1 all .69  w2 my 1.04  w3 grave 1.42  w4 will 2.78  w5 warmer 3.21  w6 sweeter 3.99  w7 be 4.95)
//   0.0  the last drawing of s14, held: her eyes open, the thread on her finger. A breath.
//   0.3  warmth in the thread and the hands (strokes lifted out of the dark); she feels it: the smile starts.
//   0.9  it goes down into the bed and out: the first tips, hesitant. They feel their way, stop, fork, go round a stone, run.
//   1.4  (grave) the dark goes from umber to rose to gold in a slow ragged front. We rise with the roots.
//   2.2  the covers loosen and turn to a quilt; her eyes close in peace; the dormouse unrolls; bulbs shoot.
//   3.2  (warmer) the grass is broken: first shoot, then the others; crumbs roll; they uncurl, leaves.
//   4.0  (sweeter) canes over the stone, buds; 4.95 (be) the roses open, one after another.
//   5.0  colour runs out from the stone over the hill like a tide. It goes over the old man. He feels it, and lifts his head.
(function () {
  'use strict';
  const B = window.BIDE, A = B.anim, W = B.world, C = B.cast, Q = B.scenes.s14.kit;
  const { clamp, lerp, ease, keys, hash, noise1, spline, mixc, TAU } = A;
  const PI = Math.PI, sin = Math.sin, cos = Math.cos, abs = Math.abs, hyp = Math.hypot, min = Math.min, max = Math.max;
  const { rngOf, fbm, track, resample, ridge, yAt, poly, lump, ribbon, found, ss } = W.util;
  const gauss = x => Math.exp(-x * x), RED = W.RED, RED_D = W.RED_DEEP;
  const { EARTH, ROSEY, GOLD, bed, HAND, STONE, THORN } = Q;
  const HEART = [1064, 446];

  /* ------------------------------------------------------------------ camera: hold on her, then rise and draw back with the growing */
  const CAM = t => { const k = keys(t, [[.95, 0], [5.0, 1, 'io']]), kz = keys(t, [[.95, 0], [4.8, 1, 'io']]), a = [1106, 404], b = [1072, 250], c = [1051, -56], q = (i) => (1 - k) * (1 - k) * a[i] + 2 * k * (1 - k) * b[i] + k * k * c[i]; return [q(0), q(1), Math.exp(lerp(Math.log(2.05), Math.log(.72), kz))]; };

  /* ------------------------------------------------------------------ the warmth: how far it has got, and what it does to a place */
  const FRONT = t => keys(t, [[.35, 0], [1.1, 130, 'out'], [1.9, 300, 'io'], [2.5, 420], [3.3, 720, 'io'], [4.3, 1120, 'io'], [5.6, 1620, 'io']]);
  const dist = (x, y) => hyp((x - HEART[0]) * .9, (y - HEART[1]) * 1.08) + 58 * Q.n2(x * .8, y * .8, 21) ;
  const warmAt = (R, x, y) => R < 4 ? 0 : ss(0, 1, (R - dist(x, y)) / (90 + R * .22));
  const three = (a, b, c, k) => k < .5 ? mixc(a, b, k * 2) : mixc(b, c, (k - .5) * 2);

  /* ------------------------------------------------------------------ the roots that wake: authored one by one, like handwriting going up the page */
  // p: path from her hands up; on: [path, index] where it forks from; t0 start, d duration, w width
  const PATHS = (() => {
    const P = [
      { p: [[1052, 452], [1026, 432], [1004, 392], [990, 344], [962, 300], [938, 262], [922, 214], [940, 160], [948, 112], [930, 70], [908, 34], [903, -4]], t0: .75, d: 2.5, w: 14 },
      { p: [[990, 344], [1012, 316], [1036, 284], [1030, 236], [1060, 196], [1048, 142], [1078, 96], [1064, 46], [1082, -4]], t0: 1.5, d: 2.0, w: 10.5 },
      { p: [[1030, 236], [1080, 226], [1122, 184], [1112, 134], [1152, 98], [1170, 48], [1162, -4]], t0: 2.2, d: 1.5, w: 8.5 },
      { p: [[1036, 284], [1098, 272], [1160, 262], [1200, 238], [1192, 196], [1222, 172], [1262, 164], [1276, 110], [1262, 62], [1292, 22], [1290, -6]], t0: 1.9, d: 1.85, w: 10.5 },
      { p: [[962, 300], [902, 292], [850, 266], [838, 210], [798, 172], [808, 112], [768, 64], [780, -4]], t0: 2.0, d: 1.8, w: 9 },
      { p: [[1064, 478], [1078, 524], [1128, 548], [1184, 580], [1250, 562], [1314, 584], [1380, 548], [1432, 508], [1474, 444], [1452, 380], [1478, 320], [1440, 262], [1460, 200], [1424, 140], [1438, 80], [1410, 34], [1414, -6]], t0: .95, d: 2.75, w: 14 },
      { p: [[1452, 380], [1400, 342], [1374, 290], [1394, 232], [1350, 182], [1368, 122], [1338, 72], [1348, 24], [1330, -8]], t0: 2.45, d: 1.35, w: 9.5 },
      { p: [[1474, 444], [1540, 424], [1592, 384], [1602, 314], [1652, 262], [1642, 192], [1692, 142], [1682, 72], [1722, 8]], t0: 2.5, d: 1.8, w: 10 },
      { p: [[1056, 480], [1036, 530], [980, 566], [916, 596], [846, 578], [776, 604], [700, 586], [620, 600], [520, 566], [436, 522], [390, 450], [414, 400], [440, 330], [396, 250], [360, 180], [382, 96], [352, 44], [364, -4]], t0: 1.0, d: 3.1, w: 14 },
      { p: [[520, 562], [496, 484], [512, 424], [560, 364], [540, 292], [588, 252], [566, 164], [606, 104], [588, 44], [602, -4]], t0: 2.3, d: 1.8, w: 9 },
      { p: [[436, 522], [330, 504], [240, 446], [206, 366], [172, 300], [182, 212], [132, 152], [142, 72], [112, -4]], t0: 2.6, d: 1.7, w: 9 },
      { p: [[1250, 560], [1300, 610], [1400, 640], [1540, 610], [1660, 560], [1760, 500], [1800, 420], [1960, 380], [2040, 300], [2020, 200], [2080, 110], [2060, -4]], t0: 2.0, d: 2.7, w: 9.5 }];
    return P.map((q, i) => { const R = rngOf(i * 7 + 3), pts = resample(spline(q.p, 10, false), 9), n = pts.length;
      // speed: it feels forward, waits, runs. Uneven on purpose.
      const K = [[0, 0]]; let tt = 0, pp = 0; const runs = 4 + (R() * 2 | 0); const ws = []; let sT = 0, sP = 0; for (let k = 0; k < runs; k++) { const run = [.5 + .9 * R(), .5 + R()], wait = [.25 + .55 * R(), .05 + .06 * R()]; ws.push(run, wait); sT += run[0] + wait[0]; sP += run[1] + wait[1]; } for (const w of ws) { tt += w[0] / sT; pp += w[1] / sP; K.push([tt, pp]); }
      const twigs = []; const nt = 5 + (R() * 4 | 0); for (let k = 0; k < nt; k++) { const u = .1 + .84 * (k + .7 * R()) / nt, j = Math.min(n - 3, Math.round(u * n)), a = Math.atan2(pts[j + 2][1] - pts[j][1], pts[j + 2][0] - pts[j][0]), sg = (k + i) % 2 ? 1 : -1; twigs.push({ u, pts: Q.script(pts[j][0], pts[j][1], a + sg * (.6 + .5 * R()), 46 + 90 * R(), i * 40 + k + 300, { home: a + sg * .35, loops: .4, step: 7, stiff: .06 }), w: 2 + 1.6 * R() }); }
      return Object.assign(q, { pts, n, K, twigs, s: i }); });
  })();
  const progOf = (q, t) => { const x = (t - q.t0) / q.d; if (x <= 0) return 0; if (x >= 1) return 1; for (let i = 1; i < q.K.length; i++) if (x <= q.K[i][0]) { const a = q.K[i - 1], b = q.K[i]; return lerp(a[1], b[1], (i % 2 ? ease.out : ease.io)((x - a[0]) / (b[0] - a[0]))); } return 1; };

  function redRoots(p, E, t) {
    const K = E.K, z = K.z; PATHS.forEach(q => {
      const g = progOf(q, t); if (g <= .004) return; const L = g * (q.n - 1), m = Math.floor(L), pts = q.pts.slice(0, m + 1); if (m < q.n - 1) { const f = L - m, a = q.pts[m], b = q.pts[m + 1]; pts.push([lerp(a[0], b[0], f), lerp(a[1], b[1], f)]); } if (pts.length < 2) return; const N = pts.length, old = clamp((t - q.t0) / 3.2);
      const wf = u => { const s = u * (N - 1), tip = min(1, (N - 1 - s) / 9 + .12); return q.w * .5 * (1 - .55 * s / q.n) * (.45 + .55 * old) * tip * (1 + .14 * noise1(s * .22, q.s)); };
      if (N > 3) { const rb = ribbon(pts, wf, { step: 12, rough: .5, seed: q.s }); p.mass(rb.poly, { sharp: true, color: mixc('#a8302a', '#cf4a38', .4 + .4 * hash(q.s, 2, 2)), dir: 1.3, size: .38, len: .6, vary: .4 }); p.line(rb.R.filter((_, i) => i % 2 === 0), { color: RED_D, w: K.px(1.9), press: .55, taper: [.05, .4], wobble: .9 }); p.line(rb.L.filter((_, i) => i % 2 === 0), { color: '#f7b08a', w: K.px(1.9), press: .4 + .25 * E.g, taper: [.1, .5], wobble: 1.1, medium: 'crayon' }); }
      else p.line(pts, { color: '#b5322b', w: q.w * .6, press: .9, taper: [.05, .5], medium: 'crayon' });
      // the tip feels about
      if (g < .995) { const T = pts[N - 1], a0 = Math.atan2(T[1] - pts[max(0, N - 3)][1], T[0] - pts[max(0, N - 3)][0]), a = a0 + .5 * noise1(t * 2.6, q.s + 40), r = 15 + 5 * noise1(t * 3, q.s); p.line([T, [T[0] + cos(a) * r * .6, T[1] + sin(a) * r * .6, .8], [T[0] + cos(a + .5 * noise1(t * 3.1, q.s + 9)) * r, T[1] + sin(a + .5 * noise1(t * 3.1, q.s + 9)) * r, .4]], { color: '#ffc49a', w: K.px(4.2), press: .95, taper: [.02, .6], wobble: .6, medium: 'crayon' });
        for (let i = 0; i < 5; i++) { const b = a0 + (i - 2) * .5, r0 = 16 + 6 * p.rnd(i, q.s), r1 = r0 + 8 + 12 * p.rnd(i, q.s, 3); p.line([[T[0] + cos(b) * r0, T[1] + sin(b) * r0], [T[0] + cos(b) * r1, T[1] + sin(b) * r1]], { color: i % 2 ? '#ffdf9e' : '#f2a35c', w: K.px(2.4), press: .6, taper: [.2, .6], medium: 'crayon' }); } }
      for (const w of q.twigs) { const gg = clamp((g - w.u) * (q.n * 9) / (w.pts.length * 7 * 1.5)); if (gg <= .03) continue; const s = w.pts.slice(0, max(2, Math.round(gg * w.pts.length))); p.line(s.map((c, i) => [c[0], c[1], 1 - .6 * i / w.pts.length]), { color: mixc('#b5322b', '#d9674a', hash(w.u * 100 | 0, q.s, 3)), w: K.px(w.w * 1.25), press: .8, taper: [.02, .45], wobble: .9, medium: 'crayon' }); if (gg < .98) { const e = s[s.length - 1]; p.line([s[s.length - 2], e], { color: '#ffd0a0', w: K.px(3), press: .8, taper: [.1, .5], medium: 'crayon' }); } }
    });
  }
  function rootGlow(p, E, t) { // the soil warms along each root before the front gets there: rubbed with a finger
    PATHS.forEach(q => { const g = progOf(q, t); if (g < .03) return; const pts = q.pts.slice(0, max(3, Math.round(g * q.n))).filter((_, i) => i % 4 === 0); if (pts.length < 3) return; const fade = 1 - .75 * ss(3.8, 5.2, t); p.shade(ribbon(pts, u => (30 + 12 * noise1(u * 7, q.s)) * (.5 + .5 * sin(PI * min(1, u * .8 + .25))), { step: 40 }).poly, { color: '#a8492a', alpha: .5 * fade, soft: 22, mode: 'screen' }); });
  }

  /* ------------------------------------------------------------------ the ground as it warms */
  function env(K, R, t) {
    const bz = 1.12 * R + 1, grad = (a, b, c) => R < 6 ? a : { rad: [HEART[0], HEART[1], bz], stops: [[0, c], [.4, mixc(c, b, .12)], [.7, b], [.9, mixc(a, b, .4)], [1, a]] };
    const g = keys(t, [[.2, 0], [1.2, .7, 'io'], [2.6, 1]]);
    const at = (a, b, c, x, y) => { const k = warmAt(R, x, y); return k <= .01 ? a : three(a, b, c, k * .92); };
    const front = (x, y) => { const d = R - dist(x, y); return R < 10 ? 0 : gauss(d / (34 + R * .05)) * (1 - ss(1500, 2200, R)); };
    return { K, rs: [], R, g, t, v: 1, field: true, warm: (x, y) => warmAt(R, x, y), glint: front,
      lit: (x, y) => min(1, warmAt(R, x, y) * .42 + front(x, y) * .6 + .28 * gauss((x - 1060) / 360) * gauss((y - 420) / 190)),
      earth: i => grad(EARTH[i], ROSEY[i], GOLD[i]), lens: q => at(q[5], mixc(q[5], '#b0583f', .55), mixc(q[5], '#e0a052', .6), q[0], q[1]),
      nest: R < 6 ? '#201d27' : { rad: [HEART[0], HEART[1], bz], stops: [[0, '#e0a25c'], [.35, '#b9694a'], [.7, '#6b3a3c'], [1, '#201d27']] },
      seam: (i, j) => { const k = ss(60, 700, R); return j === 0 ? mixc('#16131a', i > 5 ? '#2a1820' : '#6a3a2a', k * .8) : mixc(j === 1 ? mixc(EARTH[i], '#8a6a4c', .42) : mixc(EARTH[i], '#8d7058', .4), i > 6 ? '#6b4048' : '#f2c88a', k * .75); },
      stone: i => { const k = ss(120, 900, R); return mixc(['#332f37', '#1f1c24', '#443f46'][i], ['#a97a5c', '#6f4640', '#e0b98a'][i], k * .8); },
      root: (() => { const k = ss(150, 900, R); return [mixc('#4a3d36', '#7d4a38', k), mixc('#5e4d40', '#a8684a', k), mixc('#766250', '#e0a878', k), mixc('#604f40', '#8d5a40', k)]; })(), base: ss(300, 900, R) * .6 };
  }
  function sparks(p, E, t) { // crumbs the front lifts out of the dark, then lets go
    const K = E.K, R = E.R; if (R < 20) return; let n = 0; for (let i = 0; i < Q.CRUMBS.length && n < 230; i++) { const q = Q.CRUMBS[i]; if (q.x < K.l || q.x > K.r || q.y < K.t || q.y > K.b) continue; const d0 = R - hyp((q.x - HEART[0]) * .9, (q.y - HEART[1]) * 1.08); if (d0 < -130 || d0 > 190 + R * .12) continue; const L = E.glint(q.x, q.y) * (.4 + .9 * q.h) - q.th * .25; if (L < .12) continue; n++; const c = cos(q.a) * q.l, s = sin(q.a) * q.l, v = min(1, L); p.line([[q.x - c * .5, q.y - s * .5, .6], [q.x + q.c * .2, q.y + q.c * .3, 1], [q.x + c * .5, q.y + s * .5, .6]], { color: v > .5 ? mixc('#f2a95a', '#fff0c4', (v - .5) * 1.8) : mixc('#b0603a', '#f2a95a', v * 2), w: K.px(q.w * (.9 + .7 * v)), press: .35 + .6 * v, taper: [.3, .4], wobble: 1.1, medium: 'crayon', alpha: min(1, .2 + v * 1.1) }); }
  }
  // rubbed warm strokes round her hands: lifted out of the dark with a finger, redrawn every other drawing
  function handGlow(p, K, c, g, t) {
    if (g < .02) return; const N = 60; for (let i = 0; i < N; i++) { const a = TAU * (i + .8 * p.rnd(i, 1)) / N, r0 = 8 + 46 * p.rnd(i, 2), l = (12 + 52 * p.rnd(i, 3) * p.rnd(i, 8)) * (.45 + .75 * g); if (sin(a) < -.05 && cos(a) > .12 && p.rnd(i, 4) < .85) continue; // off her face
      const x0 = c[0] + cos(a) * r0 * 1.25, y0 = c[1] + sin(a) * r0 * .9, k = 1 - r0 / 70; p.line([[x0, y0, .5], [x0 + cos(a + .2) * l * .5, y0 + sin(a + .2) * l * .42, 1], [x0 + cos(a + .34) * l, y0 + sin(a + .34) * l * .8, .4]], { color: ['#ffdc9c', '#ffb766', '#ee7c52', '#f9c47c'][i % 4], w: K.px(2.4 + 3.8 * p.rnd(i, 5)), press: min(1, (.4 + .6 * p.rnd(i, 6)) * (.35 + .8 * g)), taper: [.3, .5], wobble: 1.2, medium: 'crayon', alpha: min(1, (.45 + .7 * k) * g * 1.1) }); }
  }

  /* ------------------------------------------------------------------ above: the hill, and the colour coming back over it */
  const TIDE = t => keys(t, [[4.5, 0], [4.9, 190, 'in'], [5.55, 900, 'io'], [6.3, 2600, 'io']]);
  const { tideAt, GL, MIXL, land, grass } = Q;

  /* ------------------------------------------------------------------ what comes up: shoots, leaves, buds, roses */
  const SHOOTS = PATHS.filter(q => q.p[q.p.length - 1][1] < 6).map((q, i) => ({ x: q.p[q.p.length - 1][0], t: q.t0 + q.d, h: [140, 176, 150, 190, 130, 170, 160, 0, 150, 120, 130, 140][i] || 110, s: i + 1 }));
  function leaf(p, x, y, l, a, col, k) { if (l < 2) return; const c = cos(a), s = sin(a), P = (u, v) => [x + c * u * l - s * v * l, y + s * u * l + c * v * l]; p.mass([P(0, 0), P(.3, -.26 * k), P(.7, -.22 * k), P(1, 0), P(.7, .22 * k), P(.3, .26 * k)], { color: col, dir: a, size: .34, len: .4, vary: .5 }); }
  function shoots(p, K, t, L, wind) {
    const roses = []; SHOOTS.forEach(q => {
      if (!q.h) return; const g = keys(t, [[q.t - .05, 0], [q.t + .12, .1, 'out'], [q.t + .42, .34, 'out'], [q.t + .6, .37], [q.t + 1.5, 1, 'out']]); if (g <= .002) return; const y0 = bed(0, q.x) + 4, lean = (hash(q.s, 2, 4) - .5) * 60, bend = wind(t, q.x, 0) * 10, curl = (1 - g) * 2.2 * (hash(q.s, 3, 4) < .5 ? -1 : 1), H = q.h * g, pts = []; let a = -PI / 2 + lean * .004, x = q.x, y = y0; const n = 9; for (let i = 0; i <= n; i++) { pts.push([x, y]); const u = i / n; a = -PI / 2 + lean * .006 * u + curl * u * u * .9 + bend * .012 * u + .16 * sin(u * 5 + q.s); x += cos(a) * H / n; y += sin(a) * H / n; }
      // crumbs pushed aside
      if (t < q.t + 1.3) for (let i = 0; i < 11; i++) { const k = clamp((t - q.t) / .5), sd = i % 2 ? 1 : -1, r = (8 + 34 * hash(i, q.s, 7)) * ease.out(k); p.line([[q.x + sd * r, y0 - 8 - 16 * sin(PI * k) * hash(i, q.s, 8)], [q.x + sd * r + 5, y0 - 10 - 16 * sin(PI * k) * hash(i, q.s, 8)]], { color: i % 2 ? '#5a3a28' : '#a8683c', w: K.px(6.5), press: .85, taper: [.2, .2], medium: 'crayon' }); }
      p.line(pts.map((w, i) => [w[0], w[1], 1 - .4 * i / n]), { color: mixc('#b5322b', '#5f7a3c', ss(.25, .95, g)), w: 8.5, press: .9, taper: [.02, .35], wobble: .8 }); p.line(pts.slice(0, 7).map(w => [w[0] - 1.6, w[1], .8]), { color: '#b8c070', w: 2, press: .4 * g, taper: [.1, .5], medium: 'crayon' });
      for (let j = 1; j < 5; j++) { const u = j / 5, gg = clamp((g - u * .6) * 2.4); if (gg <= .02) continue; const c = pts[Math.round(u * n)], sg = (j + q.s) % 2 ? 1 : -1; leaf(p, c[0], c[1], 36 * gg, -PI / 2 + sg * (1.0 + .3 * (1 - gg)) + bend * .01, j % 2 ? '#6f8f46' : '#93a955', gg); }
      const o = clamp((t - q.t - 1.0) / .9); if (g > .55) roses.push({ x: pts[n][0], y: pts[n][1], r: lerp(8, 27 + 8 * hash(q.s, 5, 5), ss(0, 1, o) * .8 + .2 * g), open: lerp(.2, 1, ease.out(o)), seed: q.s * 3 + 1, tilt: .75 - .35 * o, rot: (hash(q.s, 6, 6) - .5) * .8 });
    });
    return roses;
  }
  // a few great roses close to us on the stone, opening one by one
  const HERO = [[-96, -128, 34, 4.75], [-70, -232, 30, 5.0], [-134, -60, 28, 4.9], [40, -286, 31, 5.2], [-20, -70, 33, 5.1], [84, -190, 29, 5.35], [104, -60, 30, 5.3], [-150, -188, 24, 5.45], [10, -196, 25, 5.55], [66, -110, 22, 5.6]];
  /* ------------------------------------------------------------------ the old man: feels it come, lifts his head */
  function man(p, K, t, R) {
    const x = 690 + 2, P = K.S(x, 2), up = keys(t, [[5.25, 0], [5.42, -.1, 'out'], [5.55, -.06], [6.05, 1, 'io'], [6.35, 1.05], [6.7, 1]]), k = tideAt(R, 720, -150), lf = keys(t, [[5.4, 1], [6.15, 0, 'io']]);
    const hp = K.S(905, -14), u = clamp(up, -.2, 1.06), c1 = clamp(up);
    return C.figure(p, 'dannyOld', { x: P[0], y: P[1], h: 900 * K.z, yaw: lerp(1.45, 1.12, c1), legs: { kind: 'kneel', k: lerp(.26, .22, c1) }, lean: lerp(.3, .0, u), bend: lerp(.32, .03, u), head: { nod: lerp(.5, -.32, u), turn: lerp(0, -.36, c1) }, cap: false, armNear: [{ g: 'overHeart', add: [.0, -.03] }, { at: hp, h: 'flatOnEarth' }, lf], armFar: 'lap', expr: ['prayer', { base: 'wonder', wet: .8, browIn: .75, smile: .22, mOpen: .16 }, c1], scarfColor: mixc('#a24a3d', '#c4382c', k), light: { dir: -.35, warm: lerp(.7, .85, k), k: .6, dim: lerp(.22, 0, k) }, wind: [.14 * k, 0], t: p.t });
  }

  B.scene({ id: 's15', ink: 'dark', draw(p, s) {
    const t = s.t, K = Q.cam(CAM(t)), R = FRONT(t), E = env(K, R, t), RT = TIDE(t), wind = Q.G14, S = Q.state(6.9 + min(t, .7)), g = E.g;
    const q = keys(t, [[1.6, 0], [4.6, 1, 'io']]), smile = keys(t, [[.5, 0], [1.5, .75, 'io'], [2.6, 1]]);
    const o = Object.assign({}, S.o, { v: 1, t, wake: keys(t, [[2.2, 1], [4.6, .62, 'io']]), lids: keys(t, [[1.0, .98], [1.5, .8, 'io'], [2.1, .62], [2.35, .5], [3.1, .08, 'io'], [3.6, 0]]), smile, finger: keys(t, [[.5, S.o.finger], [1.4, .55, 'io'], [2.6, .45]]), br: 2.6 + 1.9 * sin((t + 6.9) * 1.55) + keys(t, [[.25, 0], [.7, 4, 'out'], [1.6, 0]]), hair: .9, quilt: q, turn: 0, ldir: -2.05 + .5 * g });
    E.pool = 1 - ss(.7, 2.4, t); E.ember = null; E.sprout = (x, y, i) => { const t0 = 2.7 + (x < 0 || x > 2000 ? 1 : 0) + .5 * hash(i, 9, 9); return keys(t, [[t0, 0], [t0 + .4, .25, 'out'], [t0 + .6, .28], [t0 + 1.5, 1, 'out']]); };
    p.paper('#e9d6ab');
    land(p, K, t, RT, E);
    if (K.t < 40) { const k = tideAt(RT, STONE[0], -100), ml = MIXL(k); p.layer('man', { every: 1, depth: 1 }); K.open(p);
      const tk = keys(t, [[4.85, 0], [5.25, .3, 'in'], [6.1, 1, 'out']]); W.thorn(p, { x: THORN[0] + 14, y: 8, scale: 2.0, season: lerp(.78, .24, tk), light: MIXL(tk), colour: lerp(.4, 1, tk), t: p.t, wind, leaf: lerp(.12, 1, tk), blossom: .5 * ss(.45, 1, tk) });
      W.stone(p, { x: STONE[0], y: STONE[1], scale: 1.5, light: ml, season: lerp(.62, .3, k), colour: lerp(.4, .9, k), t: p.t, tuft: 0 }); Q.cap(p, k); K.shut(p); man(p, K, t, RT); }
    // the ground
    p.layer('earth', { every: 4, depth: .8 }); K.open(p); Q.ground(p, E); Q.near(p, .9 * E.pool); Q.poolWarm(p, E); rootGlow(p, E, t);
    if (g > .01) { p.shade(lump(HEART[0], HEART[1] - 20, 210, 130, 7, { n: 12, rough: .16 }), { color: '#b8622c', alpha: .5 * g * (1 - .5 * ss(2, 4, t)), soft: 46, mode: 'screen' }); p.shade(lump(HEART[0] + 10, HEART[1] - 10, 104, 74, 9, { n: 11, rough: .18 }), { color: '#ffb060', alpha: .42 * g * (1 - .4 * ss(2, 4, t)), soft: 26, mode: 'screen' }); }
    { const k = ss(2.6, 4.8, t); if (k > .01) p.shade(lump(900, 414, 480, 138, 11, { n: 14, rough: .14 }), { color: '#c98a48', alpha: .34 * k, soft: 70, mode: 'screen' }); }
    // a ragged edge to the front, so it is never a circle: tongues of it along the beds
    if (R > 30 && R < 1800) for (let i = 0; i < 16; i++) { const a = TAU * (i + .4 * hash(i, 2, 12)) / 16, d = R * (.86 + .22 * hash(i, 3, 12)), x = HEART[0] + cos(a) * d / .9, y = HEART[1] + sin(a) * d / 1.08; if (y < -20 || y > 700) continue; p.shade(lump(x, y, 70 + R * .16, 16 + R * .03, i + 4, { n: 10, rough: .3, rot: .1 * sin(i) }), { color: '#a8462e', alpha: .4, soft: 24, mode: 'screen' }); }
    Q.strata(p, E); Q.stones(p, E);
    Q.poolCold(p, E); { const k = ss(1.2, 4.6, t); if (k > .01) { p.shade([[K.l - 60, 610], [K.x - 300, 592], [K.x + 300, 600], [K.r + 60, 610], [K.r + 60, K.b + 80], [K.l - 60, K.b + 80]], { color: '#5a3c48', alpha: .72 * k, soft: 70 }); p.shade([[K.l - 60, 40], [K.l + 210, 30], [K.l + 110, 320], [K.l + 240, K.b + 60], [K.l - 60, K.b + 60]], { color: '#7a4a50', alpha: .55 * k, soft: 110 }); p.shade([[K.r + 60, 40], [K.r - 190, 30], [K.r - 100, 320], [K.r - 240, K.b + 60], [K.r + 60, K.b + 60]], { color: '#7a4a50', alpha: .5 * k, soft: 110 }); } }
    K.shut(p);
    p.layer('roots', { every: 2, depth: .95 }); K.open(p); const E2 = Object.assign({}, E, { lit: E.glint }); Q.roots(p, E2); Q.bulbs(p, E); Q.snail(p, E); Q.dormouse(p, E, { t, wake: ss(2.4, 3.2, t), base: .75 * ss(2, 4.5, t) }); sparks(p, E, t); redRoots(p, E, t); K.shut(p);
    p.layer('her', { every: 2, depth: 1 }); const H = Q.her(p, E, o); K.open(p); if (g > .01) { const gg = g * (1 - .55 * ss(2.4, 4, t)); p.shade(lump(HEART[0], HEART[1], 160, 92, 5, { n: 12, rough: .16 }), { color: '#c8662e', alpha: .46 * gg, soft: 34, mode: 'screen' }); p.shade(lump(HEART[0] + 8, HEART[1] + 14, 74, 40, 8, { n: 11, rough: .18 }), { color: '#f08a3e', alpha: .42 * gg, soft: 18, mode: 'screen' }); } K.shut(p);
    Q.thread(p, E, { finger: H.finger, fr: H.fr[1], v: 1, glow: g, w: lerp(4.8, 6.4, g), taut: lerp(.9, .5, ss(1, 3, t)), pull: { t0: .35 + s.abs - t, amp: 5, from: 1 } });
    K.open(p); handGlow(p, K, [HEART[0] + 2, HEART[1] + 4], g * (1 - .75 * ss(2.2, 3.8, t)), t); K.shut(p);
    if (K.t < 40) { p.layer('turf', { every: 2, depth: 1 }); K.open(p);
      grass(p, K, t, RT, wind);
      const rk = keys(t, [[3.5, 0], [4.1, .3, 'out'], [4.75, .48, 'io'], [5.0, .55], [6.2, 1, 'out']]), kst = tideAt(RT, STONE[0], -100); W.rosesOver(p, { x: STONE[0], y: STONE[1] - 4, scale: 1.5, k: rk, light: Object.assign({}, GL), colour: lerp(.75, 1, kst), t: p.t, wind });
      const up = shoots(p, K, t, 'gold', wind); for (const h of HERO) { const op = clamp((t - h[3]) / 1.0); if (op > 0 || t > h[3] - .7) up.push({ x: STONE[0] + h[0], y: STONE[1] + h[1], r: h[2] * lerp(.4, 1, ease.out(op)), open: lerp(.2, 1, ease.out(op)), seed: Math.round(h[2] * 3 + h[0]), tilt: lerp(1.0, .4, op), rot: (hash(h[0], 2, 2) - .5) }); } W.blooms(p, up, GL, .02);
      for (const [x, y, r, i] of Q.BULBS) { const sg = E.sprout(x, y, i); if (sg < .75) continue; const kk2 = clamp((sg - .75) * 4), k = tideAt(RT, x, 0), ty = bed(0, x) - 64 - 22 * hash(i, 3, 3), fx = x + 9 * sin(3 + i) + wind(t, x, 0) * 6; for (let j = 0; j < 5; j++) { const a = -PI / 2 + (j - 2) * .62 + .2 * sin(i); p.line([[fx, ty], [fx + cos(a) * 11 * kk2, ty + sin(a) * 12 * kk2], [fx + cos(a) * 17 * kk2, ty + sin(a) * 15 * kk2]], { color: mixc(j % 2 ? '#d8c68a' : '#efe2b8', j % 2 ? '#f7cf4e' : '#fff0b0', k), w: 7, press: .85, taper: [.1, .3], wobble: .8, medium: 'crayon' }); } }
      if (t > 5.0) W.petals(p, { t: s.abs, t0: s.abs - t + 5.05, n: 16, every: .13, s: 15, from: i => [STONE[0] - 130 + 270 * hash(i, 4, 4), STONE[1] - 60 - 240 * hash(i, 5, 5)], wind, floor: 0 });
      K.shut(p); }
  } });
  B.scenes.s15.kit = { CAM, FRONT, PATHS, progOf, tideAt };
})();
