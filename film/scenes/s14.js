// s14  "And I shall hear, though soft you tread above me"   105.1 - 112.0   THE CUT-THROUGH
//
// THE ONE FEELING: she is listening. The dark turns out to be a room with somebody in it.
//
// Where the eye goes: the red thread falls out of his hand into the dark, and the eye goes down it because it is the only colour there is.
// At the bottom of it is a finger; beside the finger a face; we were looking at the folds of the ground and they were her bed all along.
// VALUE PLAN  lightest: the strip of evening behind his knees, then (later) her face. darkest: the blue-umber ground round her.
//   Every footfall is a light that goes down through the soil; what it touches (stone, root, crumb, sleeper) is drawn by it and keeps a little.
// BEATS (scene seconds; w0 And .18  w1 I .61  w2 shall .92  w3 hear 1.41  w4 though 2.72  w5 soft 3.09  w6 you 3.58  w7 tread 3.94  w8 above 4.53  w9 me 5.75)
//   0.00  wide. A strip of evening grass, his boots, his knees. Below, dark. One red line going down.
//   0.40  his near knee shuffles forward and comes down: first ring. It lights stones, roots, a dormouse asleep ... and at 1.41 (hear) it reaches her.
//   1.55  her finger stirs in the wool. The thread answers.
//   3.05  the other knee, very softly (soft): second ring, wider and warmer. We go down with it.
//   4.00  (tread) it breaks over her: her breath catches, the face starts to turn up.
//   4.60  his palm is laid on the grass at the top of the thread: third light, right above her. (above) her eyes open.
//   5.75  (me) it reaches her face. Wonder. Hold, breathing.
(function () {
  'use strict';
  const B = window.BIDE, A = B.anim, W = B.world, C = B.cast;
  const { clamp, lerp, ease, keys, hash, noise1, spline, mixc, TAU } = A;
  const PI = Math.PI, sin = Math.sin, cos = Math.cos, abs = Math.abs, hyp = Math.hypot, min = Math.min, max = Math.max;
  const { rngOf, fbm, track, resample, ridge, yAt, poly, lump, ribbon, found, ss } = W.util;
  const gauss = x => Math.exp(-x * x);
  const RED = W.RED, RED_D = W.RED_DEEP;

  /* ------------------------------------------------------------------ the place.  Ground space: y 0 is the grass line, +y goes down into the ground, px = sheet px at camera zoom 1 */
  const PALM = [905, 0], HAND = [1048, 474], HEADP = [1152, 392];
  const X0 = -760, X1 = 2720;
  const n2 = (x, y, s) => .62 * noise1(x * .0061 + y * .0027, s) + .44 * noise1(y * .0103 - x * .0047, s + 7) + .22 * noise1(x * .021 + y * .016, s + 13);

  // the long line of her under the bedclothes, feet (left) to neck (right)
  const TOP = resample(spline([[430, 534], [488, 528], [530, 508], [546, 474], [566, 446], [600, 434], [640, 424], [680, 398], [724, 358], [770, 334], [816, 330], [864, 346], [908, 366], [950, 356], [1002, 330], [1042, 322], [1078, 342], [1106, 376]], 10, false), 10);
  const LOW = resample(spline([[1118, 486], [1066, 508], [1016, 530], [972, 548], [912, 546], [858, 556], [800, 549], [742, 562], [684, 556], [628, 566], [570, 556], [512, 558], [462, 548], [430, 532]], 10, false), 12);
  const swell = x => gauss((x - 785) / 190) + .8 * gauss((x - 1040) / 110) + .35 * gauss((x - 600) / 120) + .5 * gauss((x - 1200) / 130);
  const bedw = x => gauss((x - 880) / 520);

  // beds of soil: they lie over her like covers and sag under her like a mattress
  const ST = [
    { y: 0, n: 7, s: 8, f: 1 / 210, up: 0, dn: 0 }, { y: 40, n: 13, s: 2, f: 1 / 120, up: 2, dn: 0 }, { y: 108, n: 18, s: 3, f: 1 / 260, up: 8, dn: 0 }, { y: 178, n: 20, s: 4, f: 1 / 300, up: 20, dn: 0 },
    { y: 250, n: 20, s: 5, f: 1 / 330, up: 30, dn: 0 }, { y: 486, n: 26, s: 6, f: 1 / 360, up: 0, dn: 44 }, { y: 574, n: 30, s: 7, f: 1 / 330, up: 0, dn: 40 }, { y: 690, n: 34, s: 9, f: 1 / 380, up: 0, dn: 24 }, { y: 860, n: 38, s: 11, f: 1 / 420, up: 0, dn: 8 }, { y: 1080, n: 40, s: 12, f: 1 / 420, up: 0, dn: 0 }];
  const bed = (i, x) => { const q = ST[i]; return q.y + q.n * fbm(x * q.f, q.s, 3) - q.up * swell(x) + q.dn * bedw(x); };
  const bedLine = (i, x0, x1, step = 34, dy = 0) => { const o = []; for (let x = x0; x <= x1 + step; x += step) o.push([x, bed(i, x) + dy]); return o; };
  const bedOf = (x, y) => { let k = 0; for (let i = 0; i < ST.length; i++) if (bed(i, x) < y) k = i; return k; };
  const slope = (i, x) => Math.atan2(bed(i, x + 24) - bed(i, x - 24), 48);
  //           humus      loam       umber      plum       blue clay   under her  deep       night      night
  const EARTH = ['#54422f', '#4c382b', '#40302b', '#382d31', '#2c2b36', '#2e2629', '#262430', '#1f1d27', '#1a1921', '#17161d'];
  const ROSEY = ['#8a6a3d', '#8e6240', '#8a5842', '#8a5048', '#8f4c48', '#6f3a3c', '#53303a', '#37232f', '#261c27', '#1d1820'];
  const GOLD = ['#c9a655', '#d6a457', '#dda457', '#e0a45c', '#e8b268', '#b97a4c', '#7a4743', '#472b36', '#2c1f2a', '#1f1921'];

  // stones: a few big ones placed by eye, the rest scattered; none on her, none on the thread
  const STONES = (() => {
    const R = rngOf(41), out = [[300, 618, 92, 3], [1612, 520, 104, 5], [118, 268, 50, 2], [534, 214, 42, 7], [994, 146, 33, 9], [1668, 250, 46, 4], [1466, 660, 58, 8], [742, 640, 66, 6], [60, 520, 44, 12], [1846, 620, 72, 13], [1010, 616, 40, 14], [430, 132, 24, 15], [1230, 226, 30, 16], [-190, 380, 86, 17], [2140, 430, 92, 18], [2360, 260, 60, 19], [-420, 220, 56, 20], [-540, 560, 100, 21], [2500, 640, 110, 22], [1130, 742, 84, 23], [480, 780, 70, 24], [1890, 846, 88, 25]].map(q => ({ x: q[0], y: q[1], r: q[2], s: q[3] }));
    let g = 0; while (out.length < 118 && g++ < 2400) { const x = X0 + 60 + R() * (X1 - X0 - 120), y = 62 + 800 * Math.pow(R(), .9), r = 6 + 20 * R() * R() + 5 * R(); if (hyp((x - 900) / 470, (y - 424) / 152) < 1 || abs(x - 940) < 60 && y < 420) continue; if (hyp((x - 322) / 120, (y - 330) / 92) < 1) continue; if (out.some(q => hyp(q.x - x, q.y - y) < q.r * 1.25 + r * 1.4)) continue; out.push({ x, y, r, s: out.length + 30 }); }
    return out.map((q, i) => { const rot = (hash(q.s, 1, 2) - .5) * .6 + slope(bedOf(q.x, q.y), q.x), asp = .62 + .22 * hash(q.s, 4, 4); return Object.assign(q, { rot, big: q.r > 22, body: spline(lump(q.x, q.y, q.r * 1.22, q.r * asp * 1.1, q.s + 40, { n: 10, rough: .15, rot }), 3, true), top: spline(lump(q.x - q.r * .16, q.y - q.r * .3, q.r * .82, q.r * asp * .42, q.s + 80, { n: 9, rough: .26, rot: rot - .1 }), 3, true), base: spline(lump(q.x + q.r * .1, q.y + q.r * asp * .58, q.r * 1.0, q.r * asp * .42, q.s + 120, { n: 9, rough: .2, rot }), 3, true) }); });
  })();

  // crumbs, grit, hair-roots: the things a light finds in the soil. Never drawn until something lights them.
  const CRUMBS = (() => { const R = rngOf(7), o = []; let g = 0; while (o.length < 8200 && g++ < 20000) { const x = X0 + R() * (X1 - X0), y = 10 + 760 * Math.pow(R(), .9); if (hyp((x - 1150) / 130, (y - 400) / 86) < 1) continue; const b = bedOf(x, y), k = R(), grit = R() < .34; o.push({ x, y, g: grit, a: slope(b, x) + (R() - .5) * (grit ? 2.4 : .5), l: grit ? 2 + 5 * R() : 12 + 34 * R() * R() + 4 * R(), w: grit ? 2.4 + 3 * R() : 2.2 + 3.6 * R() * R(), h: R(), th: R(), c: (R() - .5) * 10 }); } return o; })();

  /* ---- roots like handwriting: a cursive hand going down the page */
  function script(x, y, a0, len, seed, o = {}) {
    const R = rngOf(seed), pts = [[x, y]], st = o.step || 8; let a = a0, n = Math.round(len / st), loop = 0, dir = 1, cur = 0, next = 5 + R() * 8; const home = o.home ?? a0, stiff = o.stiff ?? .035, lw = o.loops ?? 1;
    for (let i = 0; i < n; i++) {
      if (loop > 0) { a += dir * (TAU / cur) * (1 + .25 * sin(loop)); loop--; if (!loop) { next = 7 + R() * 13; } }
      else { a += .3 * noise1(i * .33, seed) + (home - a) * stiff; next--; if (next <= 0 && R() < lw) { cur = 9 + Math.round(R() * 7); loop = cur; dir = R() < .5 ? -1 : 1; } else if (next <= 0) next = 8 + R() * 12; }
      x += cos(a) * st; y += sin(a) * st; pts.push([x, y]);
    } return pts;
  }
  // the thorn's big roots, placed by eye, and what grows off them
  const THORN = [1770, 4];
  const BIGROOTS = [
    { w: 34, p: [[1742, -6], [1700, 44], [1634, 84], [1556, 98], [1480, 128], [1424, 190], [1404, 262], [1440, 318], [1492, 306], [1488, 262], [1444, 262], [1398, 330], [1372, 420], [1390, 500], [1440, 546]] },
    { w: 26, p: [[1762, 0], [1744, 84], [1702, 160], [1690, 250], [1722, 330], [1708, 420], [1640, 470], [1580, 452], [1566, 404], [1604, 388], [1632, 420], [1600, 520], [1560, 600], [1570, 690]] },
    { w: 28, p: [[1796, 0], [1834, 82], [1844, 176], [1812, 262], [1830, 350], [1886, 410], [1900, 500], [1868, 588], [1886, 690]] },
    { w: 22, p: [[1820, 0], [1900, 50], [1990, 70], [2080, 130], [2130, 220], [2110, 320], [2170, 400], [2260, 430]] },
    { w: 14, p: [[1716, 20], [1640, 34], [1560, 40], [1490, 66], [1440, 70]] }].map((r, i) => ({ w: r.w, pts: resample(spline(r.p, 8, false), 12), s: i + 1 }));
  const FINE = (() => { const o = []; let s = 100; const R = rngOf(5);
    BIGROOTS.forEach((b, bi) => { const n = [11, 10, 8, 6, 5][bi]; for (let i = 0; i < n; i++) { const u = .14 + .82 * (i + R() * .6) / n, k = Math.min(b.pts.length - 2, Math.round(u * (b.pts.length - 1))), q = b.pts[k], q2 = b.pts[k + 1], an = Math.atan2(q2[1] - q[1], q2[0] - q[0]), sg = i % 2 ? 1 : -1; o.push({ w: 5.5 * (1 - u * .5), pts: script(q[0], q[1], an + sg * (.6 + .5 * R()), 110 + 150 * R(), s++, { home: PI / 2 + sg * .5 * (R() - .2), loops: .55 }) }); } });
    for (let i = 0; i < 46; i++) { const x = X0 + (X1 - X0) * (i + .7 * R()) / 46; if (abs(x - PALM[0]) < 34) continue; o.push({ turf: 1, w: 3.4, pts: script(x, bed(0, x) + 14, PI / 2 + (R() - .5) * .8, 46 + 120 * R() * R() + 20, s++, { home: PI / 2, loops: .5, step: 7 }) }); }
    return o; })();
  // the old rose by the stone: thin dark roots that have gone down as far as her pillow (in s15 they wake first)
  const STONE = [1352, 6];
  const ROSEROOTS = [[[1318, 2], [1300, 60], [1262, 112], [1248, 176], [1270, 236], [1256, 300], [1284, 352]], [[1392, 2], [1408, 76], [1386, 150], [1402, 230], [1360, 300], [1352, 372], [1310, 420]], [[1290, 4], [1230, 50], [1176, 78], [1150, 138], [1162, 206], [1120, 262], [1110, 306]]].map((p, i) => ({ w: 8 - i, pts: resample(spline(p, 8, false), 10), s: i + 60 }));

  /* ------------------------------------------------------------------ the camera: a point of the ground at the centre of the sheet, and a zoom */
  function cam(c) {
    const x = c[0], y = c[1], z = c[2], K = { x, y, z, S: (a, b) => [(a - x) * z + 960, (b - y) * z + 540], open(p) { p.push(); p.translate(960, 540); p.scale(z); p.translate(-x, -y); }, shut(p) { p.pop(); } };
    K.l = x - 960 / z; K.r = x + 960 / z; K.t = y - 540 / z; K.b = y + 540 / z; K.sees = (a, b, r = 0) => a > K.l - r && a < K.r + r && b > K.t - r && b < K.b + r; K.px = v => v * Math.pow(z, -.5); // pen weight that does not swell or starve with the zoom
    K.sz = Math.pow(z, .6); return K;
  }

  /* ------------------------------------------------------------------ light: one footfall is a wave going down through the soil */
  // a ring: {x, R radius now, A strength}. far(x,y): how far the light has had to travel to get there (it is slower through clay, quicker along roots)
  const far = (x, y, sx, seed) => hyp((x - sx) * .86, y * 1.04) + 38 * n2(x, y, seed) + (y > 250 ? (y - 250) * .05 : 0);
  function ringAt(rs, x, y) { let v = 0; for (const r of rs) { if (r.A <= .004) continue; const d = r.R - far(x, y, r.x, r.s); if (d < -60 || d > 330) continue; const f = d < 0 ? gauss(d / 20) : .78 * gauss(d / 46) + .22 * Math.exp(-d / 120); v += f * r.A; } return v > 1.2 ? 1.2 : v; }
  // the shape of one ring as bands of soil between two radii, broken by what is in the way
  function ringBand(r, a0, a1, r0, r1, n = 9) { const o = [], at = (a, rr) => { let x = r.x + cos(a) * rr / .86, y = sin(a) * rr / 1.04; const k = rr - (38 * n2(x, y, r.s) + (y > 250 ? (y - 250) * .05 : 0)); return [r.x + cos(a) * k / .86, sin(a) * k / 1.04]; }; for (let i = 0; i <= n; i++) o.push(at(lerp(a0, a1, i / n), r1)); for (let i = n; i >= 0; i--) o.push(at(lerp(a0, a1, i / n), r0)); return o; }
  function ringShade(p, rs, k = 1, only) {
    for (const r of rs) { if (r.A <= .01 || r.R < 10) continue; const N = 15, w = 40 + min(80, r.R * .125);
      for (let i = 0; i < N; i++) { const v = clamp(.62 + .75 * noise1(i * .62 + r.s * 3.7, r.s) + .25 * (hash(i, r.s, 5) - .5), .06, 1.15); if (only && !only(i / N, r)) continue; const a0 = PI * (.01 + .98 * (i - .25) / N), a1 = PI * (.01 + .98 * (i + 1.25) / N), o = 16 * (hash(i, r.s, 7) - .5);
        p.shade(ringBand(r, a0, a1, max(0, r.R - w * 1.7), r.R - 18, 5), { color: '#7a3f1c', alpha: min(.5, .4 * r.A * v * k), soft: 36, mode: 'screen' });
        p.shade(ringBand(r, a0, a1, max(0, r.R - w * .75 + o), r.R - 6 + o, 5), { color: '#b06a2c', alpha: min(.7, .5 * r.A * v * k), soft: 20, mode: 'screen' });
        if (v > .6) p.shade(ringBand(r, a0 + .05, a1 - .06, max(0, r.R - w * .22 + o), r.R + o, 4), { color: '#e9ab55', alpha: min(.6, .5 * (v - .5) * r.A * k), soft: 9, mode: 'screen' });
      } }
  }

  /* ------------------------------------------------------------------ drawing the ground */
  const ink = '#17131a';
  // E: {K camera, lit(x,y) 0..1 light now, rs rings, warm 0..1.., wcol(i,x?) ...}
  function ground(p, E) {
    const K = E.K, l = K.l - 80, r = K.r + 80, b = K.b + 90;
    for (let i = 0; i < ST.length; i++) { if (ST[i].y > K.b + 60) break; const line = bedLine(i, l, r, 40); line.push([r + 60, b + 60], [l - 60, b + 60]); const nx = ST[min(ST.length - 1, i + 1)].y; p.mass(line, { sharp: true, color: E.earth(i), dir: [.1, .04, -.1, .08, -.06, .05, -.08, .06, -.03, .05][i], len: [.8, .9, 1.1, 1.15, 1.2, 1.2, 1.25, 1.3, 1.3, 1.3][i], size: [.7, .8, .9, .95, 1, 1, 1.05, 1.1, 1.1, 1.1][i], vary: .62, dens: 1.1 }); }
    // lenses of other soil pressed into the beds: rust, olive, blue clay, plum
    for (const q of LENSES) { if (!K.sees(q[0], q[1], q[2])) continue; p.mass(q.sh, { color: E.lens(q), alpha: .5, dir: q[4], len: 1.1, size: .85, vary: .6, soft: 9 }); }
    if (E.mid) E.mid(p);
    // the ground she lies in: strokes turn round her, darker close in (a held breath), so the eye is drawn without knowing why
    p.mass(NEST, { color: E.nest, alpha: .5, dir: -.05, len: 1.3, size: .9, vary: .5, soft: 34 });
  }
  const LENSES = [[180, 160, 250, 24, .06, '#6b4630'], [640, 120, 190, 16, -.08, '#59492c'], [1290, 108, 210, 18, .05, '#6a4a30'], [420, 410, 260, 40, .05, '#26303c'], [60, 700, 320, 40, -.04, '#3c2b3a'], [1560, 330, 200, 34, .1, '#4b3630'], [1480, 760, 300, 46, -.05, '#222c3a'], [820, 760, 280, 30, .03, '#36263a'], [2100, 260, 260, 30, .08, '#503a2c'], [2300, 560, 300, 50, -.05, '#263040'], [-300, 300, 260, 36, .04, '#4b3838'], [-480, 640, 300, 50, .06, '#262c3a'], [1750, 120, 160, 20, .12, '#5a452e'], [1180, 620, 260, 24, -.04, '#3a2a2c']].map((q, i) => { q.sh = lump(q[0], q[1], q[2], q[3], i + 60, { n: 12, rough: .3, rot: q[4] }); return q; });
  const NEST = (() => { const o = []; for (let i = 0; i < 20; i++) { const a = i / 20 * TAU, k = 1 + .08 * noise1(i * .9, 4); o.push([892 + cos(a) * 500 * k, 420 + sin(a) * 168 * k - 12 * cos(a)]); } return o; })();

  // strata drawn as lost-and-found lines: they are the folds of the covers
  function strata(p, E) {
    const K = E.K;
    for (let i = 1; i < 9; i++) { if (ST[i].y > K.b) break; const L = bedLine(i, max(K.l, X0), min(K.r, X1), 30); found(p, L, { color: E.seam(i, 0), w: K.px(2.5), press: .5, seed: i * 3 + 2, seg: 170, gap: .8, skip: .28, step: 40, wobble: 1.3 }); if (i > 1) found(p, L.map(q => [q[0], q[1] + 7 + 5 * noise1(q[0] / 80, i)]), { color: E.seam(i, 1), w: K.px(2.6), press: .34, seed: i * 5 + 1, seg: 120, gap: 1.6, skip: .4, step: 40, medium: 'crayon' }); }
    // long fine folds between the beds, close together over her, like a sheet drawn up
    for (let j = 0; j < 15; j++) { const u = (j + .5) / 15, i = 2 + Math.floor(u * 3), f = u * 3 % 1, x0 = 430 + 120 * hash(j, 3, 9) + 60 * j * .3, x1 = 1230 + 130 * hash(j, 4, 9), pts = []; for (let x = x0; x <= x1; x += 36) { const y = lerp(bed(i, x), i + 1 < 5 ? bed(i + 1, x) : yAt(TOP, x) - 8, f); pts.push([x, y + 4 * noise1(x / 70, j), .4 + .6 * sin(PI * (x - x0) / (x1 - x0))]); } p.line(pts, { color: j % 3 ? E.seam(i, 2) : E.seam(i, 0), w: K.px(1.9 + .9 * hash(j, 8, 8)), press: .3 + .12 * hash(j, 7, 7), taper: [.35, .4], wobble: 1.5, medium: j % 3 ? 'crayon' : 'graphite' }); }
  }

  function stones(p, E) {
    const K = E.K, see = STONES.filter(q => K.sees(q.x, q.y, q.r * 1.4)); if (!see.length) return;
    p.mass(poly(...see.map(q => q.body)), { color: E.stone(0), dir: .3, size: .5, len: .6, vary: .5 }); p.mass(poly(...see.map(q => q.base)), { color: E.stone(1), alpha: .8, dir: .1, size: .44, len: .5, vary: .4 }); p.mass(poly(...see.map(q => q.top)), { color: E.stone(2), alpha: .7, dir: -.05, size: .42, len: .5, vary: .45 });
    for (const q of see) { const L = E.lit(q.x, q.y - q.r * .4); if (L > .05) { p.mass(q.body, { color: mixc(E.stone(0), '#b5793c', min(1, L * .9)), dir: .3, size: .48, len: .6, vary: .45 }); p.mass(q.base, { color: mixc(E.stone(1), '#6a3f2a', L * .8), alpha: .75, dir: .1, size: .44, len: .5, vary: .4 }); p.mass(q.top, { color: mixc(E.stone(2), '#ffdf9a', min(1, L * 1.1)), alpha: .9, dir: -.05, size: .4, len: .5, vary: .4 }); }
      if (!q.big && q.s % 2) continue; const rr = q.r, c = cos(q.rot), s2 = sin(q.rot), P = (a, b2) => [q.x + (a * c - b2 * s2) * rr, q.y + (a * s2 + b2 * c) * rr];
      p.line([P(-1.2, .06), P(-.8, .5), P(.1, .74), P(.9, .42), P(1.18, 0)], { color: ink, w: K.px(2), press: .55, wobble: 1.5, taper: [.25, .4] });
      if (L > .1) p.line([P(-1.12, -.1), P(-.7, -.48), P(0, -.64), P(.6, -.5), P(1.0, -.22)], { color: '#ffe9b8', w: K.px(2.2 + 2.2 * L), press: .35 + .55 * L, wobble: 1.4, taper: [.3, .35], medium: 'crayon', alpha: min(1, L * 1.5) });
      else if (q.big) p.line([P(-1.1, -.12), P(-.6, -.5), P(.1, -.6)], { color: E.seam(3, 2), w: K.px(1.8), press: .34, wobble: 1.4, taper: [.3, .5], medium: 'crayon' });
      if (rr > 40) p.line([P(-.2, -.52), P(.06, -.16), P(-.08, .2), P(.1, .42)], { color: ink, w: K.px(1.3), press: .42, wobble: 1.9, taper: [.1, .6] }); }
  }

  // light lies along a root where the ring is passing over it
  function litAlong(p, pts, E, w, off = 0) { let run = [], mx = 0; const flush = () => { if (run.length > 1) p.line(run.map((q, i) => [q[0] - w * .12, q[1] - off, sin(PI * (i + .6) / (run.length + .2)) * q[2]]), { color: mixc('#e0953f', '#ffe9b0', min(1, mx)), w: E.K.px(max(2.2, w)), press: min(1, .4 + .6 * mx), taper: [.35, .35], wobble: 1, medium: 'crayon', alpha: min(1, mx * 1.35) }); run = []; mx = 0; }; for (let i = 0; i < pts.length; i++) { const L = E.lit(pts[i][0], pts[i][1]); if (L > .09) { run.push([pts[i][0], pts[i][1], .4 + .6 * min(1, L)]); if (L > mx) mx = L; if (run.length > 14) { const q = run[run.length - 1]; flush(); run = [q]; } } else flush(); } flush(); }
  function roots(p, E) {
    const K = E.K; const rc = E.root;
    for (const b of BIGROOTS) { if (!b.pts.some((q, i) => i % 4 === 0 && K.sees(q[0], q[1], 40))) continue; const rb = ribbon(b.pts, u => max(1.4, b.w * .5 * (1 - .86 * Math.pow(u, .8)) * (1 + .16 * noise1(u * 14, b.s))), { step: 13, rough: 1.3, seed: b.s }); p.mass(rb.poly, { sharp: true, color: rc[0], dir: 1.3, size: .46, len: .7, vary: .5 }); const m = rb.L.length; p.mass(rb.L.slice(0, m).concat(b.pts.filter((_, i) => i % 1 === 0).slice().reverse()), { sharp: true, color: rc[1], alpha: .55, dir: 1.2, size: .42, len: .6, vary: .4 }); p.line(rb.L.filter((_, i) => i % 2 === 0), { color: ink, w: K.px(2.6), press: .6, taper: [.02, .35], wobble: 1.2 }); p.line(rb.R.filter((_, i) => i % 2 === 0), { color: rc[2], w: K.px(1.9), press: .4, taper: [.1, .5], wobble: 1.4, medium: 'crayon' });
      litAlong(p, b.pts, E, b.w * .34, b.w * .14); }
    for (const b of ROSEROOTS) { p.line(b.pts.filter((_, i) => i % 3 === 0).map((q, i, a) => [q[0], q[1], 1 - .6 * i / a.length]), { color: rc[0], w: b.w * 1.1, press: .8, taper: [.02, .5], wobble: 1.2, medium: 'crayon' }); p.line(b.pts.filter((_, i) => i % 3 === 0).map((q, i, a) => [q[0] + 2, q[1] + 2, 1 - .6 * i / a.length]), { color: ink, w: K.px(1.6), press: .5, taper: [.05, .5], wobble: 1.3 }); litAlong(p, b.pts, E, 4, 2); }
    for (const b of FINE) { if (!K.sees(b.pts[0][0], b.pts[0][1], 160) || (K.z < .85 && b.w < 2.6)) continue; const g = b.pts.filter((_, i) => i % 2 === 0 || b.pts.length < 10); p.line(g.map((q, i) => [q[0], q[1], (1 - .72 * i / g.length) * (.75 + .35 * noise1(i * .6, b.w * 10))]), { color: b.turf ? rc[3] : rc[0], w: K.px(b.w), press: .62, taper: [.02, .4], wobble: .7 }); litAlong(p, b.pts, E, b.w * .8, 1); }
  }

  function crumbs(p, E, floor = .1, cap = 300) {
    const K = E.K, rs = E.rs || []; let n = 0;
    for (let i = 0; i < CRUMBS.length && n < cap; i++) { const q = CRUMBS[i]; if (q.x < K.l || q.x > K.r || q.y < K.t || q.y > K.b) continue;
      if (!E.field) { let near = false; for (const r of rs) { const d = r.R - hyp((q.x - r.x) * .86, q.y * 1.04); if (d > -90 && d < (q.h > .8 ? 700 : 190)) { near = true; break; } } if (!near) continue; }
      let L = E.lit(q.x, q.y) * (.5 + .95 * q.h) - q.th * .2; if (q.h > .8 && E.ember) { const e = E.ember(q.x, q.y) * (.4 + 3 * (q.h - .8)); if (e > L) L = e; } if (L < floor) continue; n++; const c = cos(q.a) * q.l, s = sin(q.a) * q.l, v = min(1, L);
      p.line([[q.x - c * .5, q.y - s * .5, .6], [q.x + q.c * .2, q.y + q.c * .3, 1], [q.x + c * .5, q.y + s * .5, .6]], { color: v > .5 ? mixc('#eaa648', '#fff0c4', (v - .5) * 1.8) : mixc('#8a5228', '#eaa648', v * 2), w: K.px(q.w * (.8 + .7 * v)), press: .3 + .66 * v, taper: [.3, .4], wobble: 1.1, medium: 'crayon', alpha: min(1, .2 + v * 1.1) }); }
  }

  /* ------------------------------------------------------------------ her. Lying on her side as in bed, the beds of soil drawn up to her chest, her head on a pillow of clay */
  const DARK = '#292732';
  const PILLOW = [[1070, 470], [1086, 432], [1130, 418], [1190, 424], [1250, 420], [1312, 428], [1362, 448], [1384, 480], [1352, 512], [1270, 524], [1170, 520], [1096, 506]];
  // loose hair: it leaves the head in one river, lies along the pillow, crosses itself, goes over the end of it and away among the rootlets
  const LOCKS = (() => { const o = [], N = 19; for (let i = 0; i < N; i++) { const u = i / (N - 1), h = k => hash(i, k, 22); let x = 1206 - 14 * u, y = lerp(352, 428, u), a = lerp(-.62, .7, u) + .16 * (h(1) - .5); const len = 190 + 150 * h(2) + 60 * sin(PI * u), st = 8, n = Math.round(len / st), lam = 74 + 40 * h(3), amp = .2 + .24 * h(4), ph = h(5) * 1.6 + u * 2.2, curl = (h(6) < .5 ? -1 : 1) * (.05 + .1 * h(7)); const pts = [[x, y]]; let flow = a; for (let j = 1; j <= n; j++) { const d = j * st, t = j / n, over = 420 + 86 * u; const aim = x < 1262 ? lerp(-.2, .55, u) : y < over ? lerp(.36, .3, u) + .34 * ss(1270, 1380, x) * (1 - u * .6) : .06 + .08 * (h(8) - .5); flow += (aim - flow) * .16; const an = flow + amp * Math.cos(d / lam * TAU + ph) * ss(0, .22, t) + (t > .84 ? curl * (j - n * .84) * .55 : 0); x += cos(an) * st; y += sin(an) * st; pts.push([x, y]); } o.push({ pts, w: 7 + 8 * h(9) * h(9) + 2, k: h(10), u, ord: h(11) }); } return o; })();
  const CLUMPS = LOCKS.slice().sort((p, q) => p.ord - q.ord);
  const HAIRBACK = [[1194, 360], [1212, 342], [1246, 332], [1284, 334], [1318, 350], [1346, 372], [1372, 402], [1392, 436], [1390, 466], [1360, 478], [1326, 490], [1290, 500], [1250, 488], [1216, 462], [1188, 428]];
  const SHAWL = [[984, 352], [1008, 331], [1042, 322], [1076, 340], [1104, 368], [1109, 388], [1096, 418], [1084, 446], [1064, 463], [1032, 470], [1000, 478], [968, 481], [949, 466], [950, 438], [961, 404], [972, 374]];
  const BLB = TOP.filter(q => q[0] < 1056).concat([[1066, 332], [1080, 350], [1086, 378], [1082, 410], [1072, 444], [1060, 480], [1052, 512], [1046, 528]]).concat(LOW.filter(q => q[0] < 1040));
  const HEMB = [[1058, 327], [1078, 348], [1086, 378], [1082, 412], [1071, 446], [1058, 486], [1046, 530]], HEMB2 = [[1024, 324], [1046, 350], [1055, 384], [1051, 418], [1038, 454], [1023, 496], [1006, 546]];
  const BLA = TOP.filter(q => q[0] < 880).concat([[890, 362], [908, 388], [920, 424], [926, 466], [922, 506], [906, 548]]).concat(LOW.filter(q => q[0] < 904));
  const BLC = TOP.filter(q => q[0] < 660).concat([[668, 402], [694, 432], [712, 470], [714, 512], [700, 558]]).concat(LOW.filter(q => q[0] < 696)), HEMC = [[666, 403], [694, 434], [712, 472], [714, 514], [700, 558]];
  const HEMA = [[888, 361], [910, 390], [922, 430], [926, 474], [921, 512], [906, 548]];
  // o: v 0..1 how much of her can be seen, wake 0..1 the head comes round, lids 0..1, smile, finger 0..1, br breath, t, quilt 0..1 (s15)
  function her(p, E, o) {
    const K = E.K, v = clamp(o.v), z = K.z, t = o.t, br = o.br || 0, q = clamp(o.quilt || 0), g = E.glow || 0; // g warm light from her own hands
    const cl = (c, k = v, f = .17) => mixc(mixc(DARK, c, f * (.22 + 1.6 * clamp(k))), mixc(c, '#ffc98a', .2 + .1 * g), clamp(k));
    const lo = (c, k = v) => mixc('#1b1922', mixc(c, '#3a2028', .62), clamp(k * .9));
    const chalk = (k = v) => mixc('#4a4047', '#ffe6b6', clamp(k * .95)); const px = K.px, dy = y => y - br * clamp((470 - y) / 140);
    const Bx = a => a.map(w => [w[0], dy(w[1])]);
    K.open(p);
    // the hollow under her: a breath of darker ground so that she lies IN something
    p.mass([[470, 500], [620, 520], [880, 536], [1100, 526], [1260, 534], [1400, 500], [1440, 470], [1400, 552], [1180, 572], [880, 578], [620, 556], [500, 520]], { color: mixc('#15131a', '#3a1f22', g * .7), alpha: .55, dir: .02, size: .7, len: 1, soft: 14 });
    // pillow
    p.mass(PILLOW, { color: cl(mixc('#9c8468', '#e9c48a', q), v, .2), dir: .1, len: .7, size: .55, vary: .45 });
    p.shade([[1080, 486], [1200, 496], [1330, 486], [1384, 476], [1350, 520], [1200, 530], [1090, 516]], { color: lo('#8a6a58'), alpha: .6, soft: 14 });
    p.line([[1074, 462], [1090, 432], [1130, 419], [1170, 420]], { color: chalk(v * .8), w: px(2.2), press: .34, taper: [.4, .4], wobble: 1.3, medium: 'crayon' });
    p.line([[1250, 420], [1312, 428], [1362, 448], [1382, 478], [1360, 506]], { color: chalk(v * .7), w: px(2), press: .3, taper: [.4, .5], wobble: 1.4, medium: 'crayon' });
    p.line([[1096, 508], [1180, 521], [1270, 524], [1340, 514]], { color: '#16131a', w: px(2.2), press: .5, taper: [.3, .4], wobble: 1.4 });
    // hair loose on the pillow and away into the ground, where it might be roots
    const hv = v * .9, hb = cl('#c9beae', hv, .13), hd = cl('#8a8078', hv, .12), hl = cl('#f6ecda', hv, .2), sw = o.hair || 0;
    const Hx = a => a.map((w, i) => { const k = clamp((w[0] - 1230) / 260); return [w[0] + sw * 10 * k + 2.2 * noise1(t * .5 + w[0] * .01, w[1] * .1) * k, w[1] - sw * 16 * k * (1 - k) * 3]; });
    p.mass(Hx(HAIRBACK), { color: { lin: [1200, 350, 1400, 490], stops: [[0, cl('#7d736a', hv * .9, .12)], [.6, cl('#665d57', hv * .75, .1)], [1, cl('#4b4345', hv * .5, .08)]] }, dir: .5, len: 1.1, size: .46, vary: .5 });
    const hdk = lo('#4a4048', .5 + .4 * v);
    CLUMPS.forEach((l, i) => { const L = Hx(l.pts), m = L.length, wf = u => max(.5, l.w * Math.pow(1 - u, .62) * (.5 + .6 * sin(PI * min(1, u * 1.3 + .1)))), rb = ribbon(L, wf, { step: 10, rough: .6, seed: i + 3 }), c0 = l.k > .62 ? cl('#d8cebd', hv * .96, .13) : l.k > .3 ? cl('#b9ad9e', hv * .93, .12) : cl('#938980', hv * .9, .1), c1 = cl('#7b7068', hv * .62, .1), an = Math.atan2(L[m >> 1][1] - L[3][1], L[m >> 1][0] - L[3][0]);
      p.mass(rb.poly, { sharp: true, color: { lin: [1220, 350, 1500, 510], stops: [[0, c0], [.5, mixc(c0, c1, .35)], [1, c1]] }, dir: an, size: .36, len: .9, vary: .42 });
      p.line(rb.L.filter((_, j) => j % 2 === 0), { color: hdk, w: px(z < .95 ? 1.6 : 2), press: z < .95 ? .26 : .52, taper: [.12, .35], wobble: .8 });
      for (let j = 0; j < (z < .95 ? 2 : 3); j++) { const f2 = lerp(-.55, .62, j / 2) + .2 * (hash(i, j, 3) - .5), st = (hash(i, j, 5) * m * .3) | 0, en = m - ((hash(i, j, 6) * m * .15) | 0); if (en - st < 4) continue; p.line(L.slice(st, en).map((w, q2, A0) => { const j2 = st + q2, u = j2 / m, k = -wf(u) * f2, a = Math.atan2(L[min(m - 1, j2 + 1)][1] - L[max(0, j2 - 1)][1], L[min(m - 1, j2 + 1)][0] - L[max(0, j2 - 1)][0]); return [w[0] - sin(a) * k, w[1] + cos(a) * k, .5 + .5 * sin(PI * (q2 + 1) / (A0.length + 1))]; }), { color: f2 > .25 ? hl : f2 < -.2 ? (z < .95 ? hb : hd) : hb, w: px(f2 > .25 ? 2 + l.k : 1.5), press: f2 > .25 ? .3 + .32 * v : .42, taper: [.25, .5], wobble: .8, medium: f2 > -.1 ? 'crayon' : 'graphite' }); } });
    for (let i = 0; i < 8; i++) { const l = LOCKS[[0, 2, 4, 7, 10, 13, 16, 18][i]], L = Hx(l.pts), m = L.length, n0 = (m * (.35 + .3 * hash(i, 2, 7))) | 0; p.line(L.slice(n0).map((w, j) => [w[0] + j * (.9 * (hash(i, 3, 7) - .2)), w[1] + (hash(i, 5, 7) - .5) * j * 1.6]), { color: i % 2 ? hl : hd, w: px(1.3), press: .44, taper: [.2, .7], wobble: 1.2, medium: i % 2 ? 'crayon' : 'graphite' }); }
    // neck
    p.mass([[1160, 372], [1118, 362], [1084, 366], [1078, 400], [1088, 436], [1124, 440], [1166, 424]], { color: cl('#c99e80', v * .86), dir: 1.2, size: .4, len: .5, vary: .25 });
    p.shade([[1160, 402], [1118, 408], [1084, 412], [1086, 438], [1126, 444], [1168, 428]], { color: lo('#b88a70', max(.35, v)), alpha: .42, soft: 10 });
    K.shut(p);
    // head
    const wk = clamp(o.wake || 0), P0 = K.S(HEADP[0] + lerp(0, 3, wk), dy(HEADP[1] + lerp(4, -3, wk))), h = 140 * z;
    const LT = { dir: o.ldir == null ? -2.05 : o.ldir, warm: lerp(.06, .82, ss(.06, .85, v)), k: lerp(.3, .6, v), dim: .85 * (1 - v), rim: .35, shadow: mixc('#5a4048', '#b06a4a', g * .6) };
    const lids = clamp(o.lids || 0), ex = C.expr(['asleep', { base: 'wonder', open: 1.02, smile: .12, gx: .35, gy: -.42, brow: .55, browIn: .5, mOpen: .12, mRound: .1, wet: .55, blush: .5 }, ss(0, 1, max(lids, wk * .25))]);
    ex.open = lerp(0, 1.04, lids); ex.smile = lerp(.04, lerp(.1, .55, o.smile || 0), max(wk, o.smile || 0)); if (o.smile) { ex.cheek = .4 * o.smile; ex.smileEye = .4 * o.smile; ex.mOpen *= 1 - .7 * o.smile; } if (o.ex) Object.assign(ex, o.ex);
    const turn = lerp(.34, .84, wk) + (o.turn || 0), tilt = lerp(1.24, 1.1, wk) + (o.tilt || 0), nod = lerp(.14, -.16, wk) + (o.nod || 0) - .06 * (o.catch || 0);
    const vc = mixc('#564f5c', '#ffffff', Math.pow(v, .75));
    const FC = C.face(p, 'motherOld', { x: P0[0], y: P0[1] - .12 * h, h, view: 'front', turn, tilt, nod, face: -1, bust: false, construct: false, expr: ex, light: LT, t });
    if (v < .98) p.shade(poly(...FC.sil.concat(FC.rs('hair'))), { color: vc, alpha: 1, soft: 2, mode: 'multiply' });
    if (v < .34) p.mass(poly(...FC.rs('hair')), { color: cl('#a89c8e', v, .12), alpha: .82, dir: .6, size: .4, len: .8, vary: .35 });
    // the under hand, half under her cheek
    const veilHand = H => { if (v >= .98) return; const q = [H.wrist.slice(0, 2)]; for (const g2 of H.fingers) for (const w of g2.q) q.push([w[0], w[1]]); const c0 = q.reduce((a, w) => [a[0] + w[0] / q.length, a[1] + w[1] / q.length], [0, 0]); const A2 = q.map(w => [w, Math.atan2(w[1] - c0[1], w[0] - c0[0])]), out = []; for (let i = 0; i < 14; i++) { const a = -PI + i / 14 * TAU; let m = 0; for (const [w, b2] of A2) { const d = (w[0] - c0[0]) * cos(a) + (w[1] - c0[1]) * sin(a); if (d > m) m = d; } out.push([c0[0] + cos(a) * (m + 7 * z), c0[1] + sin(a) * (m + 7 * z)]); } p.shade(out, { color: vc, alpha: 1, soft: 4, mode: 'multiply' }); };
    veilHand(C.hand(p, { who: 'motherOld', x: K.S(1110, 0)[0], y: K.S(0, dy(459))[1], h: 104 * z, pose: 'rest', rot: -.2, roll: 150, flip: -1, light: LT, sleeve: false, armLen: 20 * z }));
    K.open(p);
    // the hair comes off the brow and over the crown on to the pillow: strands across the join
    { const oy = lerp(0, -5, wk), ox = lerp(0, 4, wk); for (let i = 0; i < 12; i++) { const u = i / 11, S0 = [1186 + 34 * u + ox, 350 + 58 * u * u + oy + 6 * (1 - u) * wk], S1 = [1226 + 18 * sin(u * 3) + ox * .5, 338 + 78 * u + oy * .6], S2 = LOCKS[min(18, Math.round(u * 18))].pts[7]; p.line(Hx([S0, [lerp(S0[0], S1[0], .6), lerp(S0[1], S1[1], .6) - 5 * (1 - u)], S1, [lerp(S1[0], S2[0], .6), lerp(S1[1], S2[1], .5)], S2]), { color: [hl, hd, hb][i % 3], w: px([3, 1.7, 4.4][i % 3]), press: .5, taper: [.35, .5], wobble: 1, medium: i % 3 === 1 ? 'graphite' : 'crayon' }); } }
    // a fall of hair from the nape over the edge of the pillow (it hides the pins she no longer wears)
    for (let i = 0; i < 9; i++) { const u = i / 8, l = LOCKS[min(18, 9 + i)].pts; p.line(Hx([[lerp(1196, 1204, u), lerp(384, 420, u)], [lerp(1214, 1212, u), lerp(398, 436, u)], [lerp(1236, 1222, u), lerp(418, 452, u)], l[6], l[10]]), { color: [hb, hd, hl][i % 3], w: px([5, 1.8, 2.8][i % 3]), press: .5, taper: [.3, .5], wobble: .9, medium: i % 3 === 1 ? 'graphite' : 'crayon' }); }
    // her shawl, what can be seen of it: crossed at the throat, the covers drawn up over the rest
    const cS = mixc('#a0834f', '#e0b676', q * .5);
    p.mass(Bx([[1052, 330], [1082, 342], [1106, 366], [1114, 392], [1106, 424], [1096, 456], [1070, 484], [1044, 490], [1050, 430], [1060, 380]]), { color: { lin: [1060, 340, 1090, 470], stops: [[0, cl(mixc(cS, '#e6c388', .3), v)], [.5, cl(cS, v * .95)], [1, cl(cS, v * .6)]] }, dir: 1.3, len: .6, size: .46, vary: .45 });
    { const col = Bx(resample(spline([[1072, 336], [1094, 350], [1109, 372], [1112, 398], [1104, 426], [1092, 456]], 6, false), 9)), rb = ribbon(col, u => 8 + 3 * sin(PI * u), { step: 10, rough: .5, seed: 3 }); p.mass(rb.poly, { sharp: true, color: cl(mixc(cS, '#e8cb96', .3), v * .92), dir: 1.2, size: .4, len: .5, vary: .4 }); p.line(rb.L, { color: lo('#5f4428', .5 + v * .5), w: px(1.9), press: .5, taper: [.2, .3], wobble: 1 }); p.line(rb.R, { color: lo('#5f4428', .5 + v * .5), w: px(1.6), press: .42, taper: [.3, .4], wobble: 1 }); for (let i = 1; i < col.length - 1; i++) { const c = col[i]; p.line([[c[0] - 5, c[1] + 2], [c[0] + 1, c[1] - 4], [c[0] + 6, c[1] + 1]], { color: i % 2 ? lo('#7a5c38', .6) : cl('#fbe3b2', v, .2), w: px(1.5), press: .4, taper: [.2, .3], wobble: .9 }); } }
    for (const l of [[[1094, 440], [1082, 452], [1066, 462]], [[1086, 402], [1076, 416], [1066, 424]], [[1088, 366], [1080, 380], [1074, 392]]]) p.line(Bx(l), { color: lo('#5f4428', .5 + v * .5), w: px(1.8), press: .45, taper: [.3, .5], wobble: 1.1 });
    p.line(Bx([[1070, 336], [1092, 348], [1107, 368]]), { color: chalk(), w: px(2.4), press: .3 + .3 * v, taper: [.3, .3], wobble: 1.2, medium: 'crayon' });
    // the beds of soil for bedclothes: an inner one with its edge turned down, a heavier one over the legs
    const cB = mixc('#8b6f5c', '#e2b57c', q), cH = mixc('#b79d7e', '#fae6bb', q), cA = mixc('#6f4d3a', '#cf9560', q), lq = (a, b) => lerp(a, b, q);
    p.mass(Bx(BLB), { color: { lin: [800, 330, 880, 530], stops: [[0, cl(cB, v)], [.55, cl(cB, v * lq(.72, .92))], [1, cl(cB, v * lq(.3, .7))]] }, dir: .5, len: 1, size: .72, vary: .55 });
    p.mass(Bx(HEMB.concat(HEMB2.slice().reverse())), { color: { lin: [1050, 330, 1030, 530], stops: [[0, cl(cH, v)], [.55, cl(cH, v * .85)], [1, cl(cH, v * .4)]] }, dir: 1.45, len: .6, size: .5, vary: .4 });
    p.shade(Bx([[1022, 330], [1042, 356], [1050, 390], [1044, 430], [1028, 470], [1004, 530], [986, 540], [1010, 470], [1028, 410], [1020, 352]]), { color: lo(cB), alpha: .55, soft: 9 }); p.shade(Bx([[930, 420], [980, 400], [1030, 430], [1020, 490], [990, 544], [930, 540]]), { color: lo(cB), alpha: .42, soft: 24 }); p.shade(Bx([[972, 350], [1004, 332], [1042, 328], [1050, 352], [1030, 372], [990, 380]]), { color: mixc('#7a4a2c', '#ffc880', v), alpha: .08 + .4 * v, soft: 13, mode: 'screen' });
    for (const l of [[[1036, 338], [1004, 376], [984, 430], [976, 500]], [[1016, 334], [980, 372], [956, 420], [944, 480]], [[1046, 366], [1028, 410], [1008, 460], [996, 520]], [[990, 344], [962, 372], [944, 404]]]) { p.line(Bx(l), { color: lo('#4a3028', .4 + v * .6), w: px(2.1), press: .46, taper: [.35, .5], wobble: 1.3 }); p.line(Bx(l.map(w => [w[0] - 8, w[1] + 2])), { color: cl('#d2a67c', v, .16), w: px(2.3), press: .24 + .2 * v, taper: [.35, .5], wobble: 1.4, medium: 'crayon' }); }
    p.mass(Bx(BLA), { color: { lin: [740, 330, 800, 530], stops: [[0, cl(cA, v)], [.5, cl(cA, v * lq(.75, .9))], [1, cl(cA, v * lq(.25, .66))]] }, dir: .34, len: 1.1, size: .8, vary: .58 });
    const cC = mixc('#4c3a3c', '#c27e62', q); p.mass(Bx(BLC), { color: { lin: [560, 420, 600, 560], stops: [[0, cl(cC, v)], [.5, cl(cC, v * lq(.7, .88))], [1, cl(cC, v * lq(.2, .62))]] }, dir: .2, len: 1.1, size: .8, vary: .58 });
    p.line(Bx(HEMC), { color: lo('#2e2024', .5 + v * .5), w: px(2.6), press: .55, taper: [.12, .3], wobble: 1.4 }); p.line(Bx(HEMC.map(w => [w[0] - 7, w[1] + 1])), { color: cl('#b48d74', v, .28), w: px(2.4), press: .3 + .2 * v, taper: [.2, .4], wobble: 1.4, medium: 'crayon' });
    // form: hip, knees drawn up toward us, the hollow behind them
    p.shade(Bx([[470, 500], [560, 470], [660, 480], [760, 500], [880, 500], [930, 520], [900, 556], [700, 566], [500, 560], [420, 534]]), { color: lo(cA), alpha: .62, soft: 22 }); p.shade(Bx([[700, 388], [770, 360], [860, 380], [900, 430], [900, 500], [840, 520], [800, 470], [760, 430]]), { color: lo(cA), alpha: .42, soft: 30 });
    p.shade(Bx([[716, 372], [768, 338], [822, 334], [862, 352], [810, 372], [750, 392]]), { color: mixc('#7a4a2c', '#ffc880', v), alpha: .1 + .44 * v, soft: 14, mode: 'screen' }); p.shade(Bx([[586, 446], [640, 420], [690, 414], [708, 446], [670, 470], [612, 476]]), { color: mixc('#7a4a2c', '#ffc880', v), alpha: .06 + .3 * v, soft: 16, mode: 'screen' });
    const fold = (l, k = 1) => p.line(Bx(l), { color: lo('#4a3028', .4 + v * .6), w: px(2.3 * k), press: .46, taper: [.3, .5], wobble: 1.4 }), foldL = l => p.line(Bx(l), { color: cl('#d2a67c', v, .3), w: px(2.6), press: .3 + .2 * v, taper: [.35, .5], wobble: 1.4, medium: 'crayon' });
    [[[776, 338], [752, 380], [752, 432], [776, 486], [800, 540]], [[822, 336], [830, 390], [850, 446], [862, 520]], [[728, 360], [716, 400], [728, 460], [744, 520]], [[866, 354], [882, 402], [896, 456], [894, 520]], [[664, 408], [634, 440], [620, 486], [630, 540]], [[598, 438], [572, 474], [562, 520]], [[640, 424], [606, 462], [592, 512]], [[700, 480], [744, 516], [760, 552]], [[540, 506], [520, 530], [514, 552]]].forEach((l, i) => fold(l, i < 4 ? 1.1 : .85));
    [[[788, 338], [770, 382], [774, 432], [802, 486]], [[738, 356], [728, 400], [742, 450]], [[684, 396], [652, 432], [640, 480]], [[840, 344], [848, 396], [868, 446]], [[618, 430], [588, 466], [578, 506]]].forEach(foldL);
    for (let j = 0; j < 7; j++) { const u = .1 + .84 * j / 6, pts = []; for (let x = 120 + 46 * hash(j, 2, 8); x < 860 - 60 * hash(j, 3, 8); x += 24) { const on = ss(400, 640, x), a = 452 + 18 * j + 10 * fbm(x / 160, j + 3, 2), b2 = lerp(yAt(TOP, x), 552, u); pts.push([x, lerp(a, b2, on) + 3 * noise1(x / 40, j), .35 + .65 * sin(PI * clamp((x - 120) / 760))]); } p.line(Bx(pts), { color: j % 2 ? cl('#8a6a58', v * .8, .3) : '#17141a', w: px(j % 2 ? 2.4 : 2), press: j % 2 ? .3 : .4, taper: [.4, .4], wobble: 1.5, medium: j % 2 ? 'crayon' : 'graphite' }); }
    p.line(Bx(HEMA), { color: lo('#3a2620', .5 + v * .5), w: px(2.8), press: .6, taper: [.12, .3], wobble: 1.4 }); p.line(Bx(HEMA.map(w => [w[0] - 7, w[1] + 1])), { color: cl('#d9ae82', v, .3), w: px(2.6), press: .34 + .2 * v, taper: [.2, .4], wobble: 1.4, medium: 'crayon' });
    p.line(Bx(HEMB), { color: chalk(v), w: px(2.4), press: .34 + .24 * v, taper: [.1, .4], wobble: 1.3, medium: 'crayon' }); p.line(Bx(HEMB2), { color: lo('#4a3830', .5 + v * .5), w: px(2), press: .5, taper: [.2, .4], wobble: 1.3 });
    for (let i = 0; i < 13; i++) { const u = (i + .5) / 13, a = HEMA[0], k = u * (HEMA.length - 1), j = min(HEMA.length - 2, Math.floor(k)), f = k - j, b = [lerp(HEMA[j][0], HEMA[j + 1][0], f), lerp(HEMA[j][1], HEMA[j + 1][1], f)]; p.line(Bx([b, [b[0] + 9 + 5 * hash(i, 2, 2), b[1] + 4], [b[0] + 13 + 9 * hash(i, 3, 2), b[1] + 12 + 6 * hash(i, 4, 2)]]), { color: i % 2 ? cl('#b98a62', v, .3) : lo('#5a3a2c', .6), w: px(1.8), press: .5, taper: [.05, .6], wobble: 1.4 }); }
    // the long light along the top of her: the line that gives her away
    const back = Bx(TOP.filter(w => w[0] > 440 && w[0] < 1056)); found(p, back, { color: chalk(v * .9), w: px(2.6), press: .3 + .34 * v, seed: 4, seg: 130, gap: 1.2 - .7 * v, skip: .3 * (1 - v), step: 22, medium: 'crayon' });
    // the soil has become a quilt (s15): patches along the beds, stitched
    if (q > .02) { const bx0 = 570, bx1 = 1030, nx = 9, ny = 4, at = (i, j) => { const u = i / nx, x = lerp(bx0, bx1, u) + (j - 2) * 9, top = yAt(TOP, x) + 4, bot = 540; return [x + 6 * noise1(i * 1.7 + j, 3), lerp(top, bot, j / ny) + 5 * noise1(i + j * 2.1, 6)]; };
      for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) { const h0 = hash(i, j, 41), kq = clamp(q * 1.7 - .5 * hash(i, j, 42) - .25 * (nx - i) / nx); if (kq <= .02) continue; const A0 = [at(i, j), at(i + 1, j), at(i + 1, j + 1), at(i, j + 1)]; p.shade(Bx(A0), { sharp: true, color: ['#f0c47c', '#d98a62', '#e8a36a', '#c9b06a', '#e2746a', '#f6dca0'][(h0 * 6) | 0], alpha: .46 * kq * (1 - .3 * j / ny), mode: 'over', soft: 2 }); const n4 = K.z < 1 ? 2 : 4, n3 = K.z < 1 ? 1 : 3; if (j < ny - 1 || i % 2) for (let m = 0; m < n4; m++) { const u = (m + .25) / n4, a0 = A0[3], b0 = A0[2], x = lerp(a0[0], b0[0], u), y = lerp(a0[1], b0[1], u); p.line(Bx([[x, y - 1], [x + 8, y + .5]]), { color: '#fff0cc', w: px(1.8), press: .7 * kq, taper: [.15, .15], wobble: .8, medium: 'crayon', alpha: kq }); } for (let m = 0; m < n3; m++) { const u = (m + .3) / n3, a0 = A0[1], b0 = A0[2], x = lerp(a0[0], b0[0], u), y = lerp(a0[1], b0[1], u); p.line(Bx([[x, y], [x + 1, y + 8]]), { color: '#fff0cc', w: px(1.7), press: .6 * kq, taper: [.15, .15], wobble: .8, medium: 'crayon', alpha: kq }); } } }
    const f = o.finger || 0, wr = [HAND[0] + 8 - 6 * f, HAND[1] + 2 - 14 * f];
    // the cuff, come out from under the hem
    p.mass(Bx([[1014, 462], [1034, wr[1] - 24], [wr[0] + 5, wr[1] - 18], [wr[0] + 9, wr[1] + 12], [1036, wr[1] + 20], [1012, wr[1] + 20]]), { color: cl(mixc('#c2b296', '#fff0d0', q * .4), v * .92), dir: .2, len: .6, size: .44, vary: .35 }); p.shade(Bx([[1012, wr[1] + 4], [wr[0] + 8, wr[1] + 4], [wr[0] + 8, wr[1] + 13], [1030, wr[1] + 22], [1012, wr[1] + 22]]), { color: lo('#9a8878'), alpha: .55, soft: 6 });
    p.line(Bx([[1012, wr[1] + 20], [1034, wr[1] + 20], [wr[0] + 7, wr[1] + 13]]), { color: lo('#4a3c36', .5 + v * .5), w: px(2), press: .5, taper: [.2, .25], wobble: 1.1 }); p.line(Bx([[1016, 462], [1034, wr[1] - 23], [wr[0] + 4, wr[1] - 17]]), { color: chalk(v), w: px(2), press: .3 + .25 * v, taper: [.3, .25], wobble: 1.1, medium: 'crayon' }); p.line(Bx([[wr[0] - 2, wr[1] - 17], [wr[0] + 2, wr[1] - 2], [wr[0], wr[1] + 12]]), { color: lo('#7a6a5c', .6), w: px(1.6), press: .4, taper: [.2, .3], wobble: 1.2 });
    // and the turned-down edge falls over her wrist
    p.mass(Bx([[1048, 440], [1060, 452], [1052, 490], [1040, 530], [1004, 548], [1018, 506], [1030, 470]]), { color: cl(cH, v * .42), dir: 1.45, len: .5, size: .46, vary: .4 }); p.line(Bx([[1059, 452], [1052, 490], [1041, 530]]), { color: lo('#4a3830', .5 + v * .5), w: px(2.2), press: .5, taper: [.2, .3], wobble: 1.2 });
    K.shut(p);
    const W0 = K.S(wr[0], dy(wr[1]) - 2); const HN = C.hand(p, { who: 'motherOld', x: W0[0], y: W0[1], h: 104 * z, pose: ['holdFingers', 'windThread', clamp(lerp(.3, 1, f))], rot: -.04 - .5 * f, roll: 20, light: LT, sleeve: false, armLen: 10 * z });
    veilHand(HN); const I = HN.fingers[0].q; return { finger: I.map(w => [(w[0] - 960) / z + K.x, (w[1] - 540) / z + K.y]), fr: HN.fingers[0].r.map(r => r / z), hand: HN };
  }

  /* ------------------------------------------------------------------ small sleepers */
  // a dormouse rolled in a ball of dry grass: breathes, and its ear turns when the light goes by
  function dormouse(p, E, o) {
    const K = E.K, x = 322, y = 330; if (!K.sees(x, y, 120)) return; const L = min(1, E.lit(x, y - 10) + (o.base || 0)), m = (a, b) => mixc(a, b, L), br = 1 + .022 * sin(o.t * 2.1), px = K.px, w = o.wake || 0;
    p.mass(lump(x, y + 4, 88, 60, 5, { n: 13, rough: .12 }), { color: m('#23212a', '#7d5230'), around: [x, y], size: .6, len: .8, vary: .5, soft: 9, alpha: .85 });
    for (let i = 0; i < 26; i++) { const a = i / 26 * TAU + .2 * hash(i, 1, 4), r = 66 + 16 * hash(i, 2, 4), c = cos(a), s = sin(a); p.line([[x + c * r * 1.16, y + 8 + s * r * .74], [x + cos(a + .34) * (r - 4) * 1.16, y + 8 + sin(a + .34) * (r - 2) * .76], [x + cos(a + .72) * (r + 6) * 1.16, y + 8 + sin(a + .72) * r * .74]], { color: i % 3 ? m('#4a3f35', '#eac27a') : m('#2a2422', '#a8743c'), w: px(2.2), press: .5, taper: [.2, .5], wobble: 1.2, medium: i % 2 ? 'crayon' : 'graphite' }); }
    p.mass([[x - 46, y + 18], [x - 48, y - 4], [x - 34, y - 28 * br], [x - 4, y - 38 * br], [x + 28, y - 30 * br], [x + 46, y - 8], [x + 44, y + 18], [x + 22, y + 32], [x - 14, y + 34], [x - 36, y + 30]], { color: m('#3b302b', '#c98f4e'), around: [x, y], size: .42, len: .6, vary: .5 });
    p.shade([[x - 46, y + 10], [x, y + 18], [x + 44, y + 8], [x + 30, y + 34], [x - 20, y + 36]], { color: m('#17141a', '#8a4f30'), alpha: .6, soft: 10 });
    const hx = x + 18, hy = y + 6 - 5 * w; p.mass([[hx - 24, hy + 2], [hx - 14, hy - 16], [hx + 8, hy - 18], [hx + 24, hy - 4], [hx + 33, hy + 11], [hx + 22, hy + 17], [hx, hy + 18], [hx - 18, hy + 14]], { color: m('#42362f', '#d9a15c'), dir: .4, size: .38, len: .5, vary: .4 });
    const er = -.5 - .6 * w; p.mass([[hx - 8, hy - 13], [hx - 8 + cos(er - .9) * 14, hy - 13 + sin(er - .9) * 14], [hx - 2 + cos(er - .5) * 19, hy - 14 + sin(er - .5) * 19], [hx + 5, hy - 17]], { color: m('#4a3a35', '#e2a877'), size: .34, len: .4, vary: .3 });
    p.line([[hx - 8, hy - 13], [hx - 6 + cos(er - .9) * 15, hy - 14 + sin(er - .9) * 15], [hx + cos(er - .4) * 18, hy - 14 + sin(er - .4) * 18], [hx + 6, hy - 16]], { color: m('#120f13', '#4a2c1c'), w: px(1.7), press: .6, taper: [.1, .3] });
    p.line([[hx + 3, hy - 3 + 1], [hx + 9, hy + 1], [hx + 15, hy - 1]], { color: m('#0e0c10', '#2c1a14'), w: px(2.2), press: .8, taper: [.2, .3] });
    p.line([[hx + 33, hy + 11], [hx + 27, hy + 4], [hx + 14, hy - 12], [hx - 6, hy - 18]], { color: m('#17131a', '#5a3820'), w: px(1.8), press: .5, taper: [.2, .5] });
    for (let i = 0; i < 4; i++) p.line([[hx + 27, hy + 9], [hx + 38 + 4 * i, hy + 8 + i * 5 - 2], [hx + 50 + 4 * i, hy + 10 + i * 8]], { color: m('#4a4038', '#f2cf92'), w: px(1.1), press: .45, taper: [.1, .7], medium: 'crayon' });
    p.line([[x - 44, y + 16], [x - 30, y + 32], [x - 2, y + 36], [x + 26, y + 33], [x + 48, y + 24], [x + 52, y + 12]], { color: m('#4a3b33', '#dba968'), w: 9, press: .6, taper: [.1, .4], wobble: 1.2, medium: 'crayon' });
    for (let i = 0; i < 18; i++) { const a = -2.9 + 2.7 * i / 18, r = 38; p.line([[x + cos(a) * r * 1.02, y - 2 + sin(a) * r * .84], [x + cos(a + .22) * (r - 7), y - 2 + sin(a + .22) * (r - 8) * .86]], { color: i % 2 ? m('#564639', '#f5cf8e') : m('#241d1e', '#86532c'), w: px(1.6), press: .46, taper: [.2, .5], medium: 'crayon' }); }
  }
  const mouse = (p, E, o) => { if (!E.K.sees(322, 330, 150)) return; p.push(); p.translate(322, 334); p.scale(1.35); p.translate(-322, -334); dormouse(p, E, o); p.pop(); };
  // bulbs under the turf, with their noses up. g 0..1 they shoot (s15)
  const BULBS = [[196, 96, 17, 0], [240, 118, 21, 1], [286, 92, 15, 2], [1536, 152, 18, 3], [1584, 182, 14, 4], [-120, 110, 18, 5], [2230, 130, 20, 6], [620, 104, 14, 7]];
  function bulbs(p, E) { const K = E.K; for (const [x, y, r, i] of BULBS) { if (!K.sees(x, y, 220)) continue; const sg = E.sprout ? E.sprout(x, y, i) : 0; if (sg > .01) { const top = lerp(y - r * 1.5, bed(0, x) - 64 - 22 * hash(i, 3, 3), sg), pts = []; for (let j = 0; j <= 6; j++) { const u = j / 6; pts.push([x + 9 * sin(u * 3 + i) * u, lerp(y - r * 1.4, top, u), 1 - .4 * u]); } p.line(pts, { color: mixc('#c9b46a', '#8fae55', ss(.3, .9, sg)), w: r * .34, press: .9, taper: [.05, .35], wobble: .8, medium: 'crayon' }); p.line(pts.map(q => [q[0] + r * .2 + 3, lerp(y - r, q[1], .86), .8]), { color: '#7f9c4a', w: r * .3, press: .85, taper: [.05, .5], wobble: .9, medium: 'crayon' }); } const L = min(1, E.lit(x, y - r) + (E.base || 0)), m = (a, b) => mixc(a, b, L); p.mass([[x, y - r * 1.7], [x + r * .34, y - r * .9], [x + r, y + r * .1], [x + r * .7, y + r * .9], [x, y + r * 1.05], [x - r * .75, y + r * .9], [x - r, y], [x - r * .36, y - r * .9]], { color: m('#4a3a34', '#d39a58'), dir: 1.5, size: .36, len: .6, vary: .45 }); p.shade([[x, y - r], [x + r, y], [x + r * .7, y + r], [x, y + r], [x + r * .2, y]], { color: m('#17141a', '#8a4a2c'), alpha: .55, soft: 4 }); for (const k of [-.5, -.1, .4]) p.line([[x + k * r * .3, y - r * 1.3], [x + k * r * 1.5, y], [x + k * r, y + r * .9]], { color: m('#231c1c', '#8a5a30'), w: K.px(1.4), press: .5, taper: [.2, .3] }); p.line([[x - r * .3, y - r * .9], [x - r * .86, y - r * .1], [x - r * .7, y + r * .5]], { color: m('#6b584a', '#ffe4ae'), w: K.px(1.8), press: .4 + .4 * L, taper: [.3, .4], medium: 'crayon' }); for (let j = 0; j < 5; j++) p.line([[x + (j - 2) * r * .2, y + r], [x + (j - 2) * r * .5, y + r * 1.5], [x + (j - 2) * r * .6 + 3 * noise1(i + j, 2), y + r * 2.1]], { color: m('#5a4a3e', '#d9a866'), w: K.px(1.3), press: .45, taper: [.05, .6], wobble: 1.4 }); } }
  // a snail shut up for the winter
  function snail(p, E) { const K = E.K, x = 430, y = 560, r = 26; if (!K.sees(x, y, 40)) return; const L = min(1, E.lit(x, y - r) + (E.base || 0)), m = (a, b) => mixc(a, b, L); p.mass(lump(x, y, r * 1.1, r * .95, 3, { n: 12, rough: .05 }), { color: m('#3f3a3c', '#cfa268'), around: [x, y], size: .36, len: .6, vary: .4 }); const S = []; for (let i = 0; i < 26; i++) { const a = i * .5 + .4, q = r * (1 - i / 28); S.push([x + cos(a) * q, y + sin(a) * q * .9, 1 - i * .02]); } p.line(S, { color: m('#17141a', '#5a3820'), w: K.px(2), press: .6, taper: [.05, .3] }); p.line(S.slice(6, 22).map(q => [q[0] - 3, q[1] - 3]), { color: m('#5c5450', '#fff0cc'), w: K.px(1.8), press: .3 + .4 * L, taper: [.3, .4], medium: 'crayon' }); }

  /* ------------------------------------------------------------------ the thread, from his palm down to her finger */
  const THREAD = [[905, 4], [911, 46], [938, 84], [954, 118], [944, 168], [926, 206], [930, 250], [950, 290], [962, 326]];
  function thread(p, E, o) { // o.finger: [[x,y]..] of her index (ground space), pull ripples, w, taut 0 slack over the covers .. 1 drawn up straight
    const K = E.K, F = o.finger, tip = F[2], knock = F[1], tt = o.taut || 0, dyb = o.dy || 0; const end = [lerp(knock[0], tip[0], .12), lerp(knock[1], tip[1], .12)];
    const slack = [[974, 346], [990, 380], [1006, 416], [1034, 440], [lerp(1034, end[0], .6), lerp(440, end[1], .5) + 8]], tight = [[984, 342], [1004, 362], [lerp(1004, end[0], .4), lerp(362, end[1], .4) + 5], [lerp(1004, end[0], .62), lerp(362, end[1], .62) + 5], [lerp(1004, end[0], .84), lerp(362, end[1], .84) + 3]];
    const pts = THREAD.map((q, i) => i > 2 && tt ? [lerp(q[0], lerp(905, 972, i / 9), .35 * tt), q[1]] : q.slice()).concat(slack.map((q, i) => [lerp(q[0], tight[i][0], tt), lerp(q[1], tight[i][1], tt) - dyb]), [end]);
    if (o.top) pts[0] = o.top; const g = o.glow || 0;
    K.open(p);
    const T = W.thread(p, pts, { w: (o.w || 4.8) * Math.pow(K.z, -.5), hang: .02, slack: .5 * (1 - .6 * tt), pull: o.pull, seed: 3, color: mixc(mixc('#7e2a2a', RED, o.v == null ? .6 : o.v), '#e8604a', g * .5), k1: o.k1 == null ? 1 : o.k1 });
    if (T && E.rs && E.rs.length) { const P = resample(T.path, 9); let run = []; const fl = () => { if (run.length > 2) p.line(run.map((q, i) => [q[0], q[1], .3 + .7 * sin(PI * i / (run.length - 1))]), { color: '#ffb489', w: 3.4 * Math.pow(K.z, -.5), press: .8, taper: [.4, .4], wobble: .5, medium: 'crayon' }); run = []; }; for (const q of P) { if (ringAt(E.rs, q[0], q[1]) > .3) run.push(q); else fl(); } fl(); }
    // three turns of it round her finger
    const d = [tip[0] - knock[0], tip[1] - knock[1]], l = hyp(d[0], d[1]) || 1, nx = -d[1] / l, ny = d[0] / l, r = (o.fr || 7) * 1.12; for (let i = 0; i < 3; i++) { const u = .08 + .3 * i, cx = lerp(knock[0], tip[0], u), cy = lerp(knock[1], tip[1], u), s2 = 3.2; p.line([[cx - nx * r - d[0] / l * s2, cy - ny * r - d[1] / l * s2], [cx + d[0] / l * 1.5, cy + d[1] / l * 1.5], [cx + nx * r + d[0] / l * s2, cy + ny * r + d[1] / l * s2]], { color: mixc(mixc('#7e2a2a', RED, o.v == null ? .6 : o.v), '#e8604a', g * .5), w: (o.w || 4.8) * .84 * Math.pow(K.z, -.5), press: 1.1, taper: [.06, .06], wobble: .5, medium: 'redline' }); p.line([[cx - nx * r * .8 - d[0] / l * 4, cy - ny * r * .8 - d[1] / l * 4 + 1.5], [cx + nx * r * .8 + d[0] / l * 2, cy + ny * r * .8 + d[1] / l * 2 + 1.5]], { color: RED_D, w: 1.8, press: .5, taper: [.3, .3] }); }
    K.shut(p); return T;
  }

  /* ------------------------------------------------------------------ above: evening, the land falling away, and (s15) colour coming back over it. R = how far the tide has run from the stone */
  const TC = [1340, -90];
  const tideAt = (R, x, y) => R < 2 ? 0 : ss(0, 1, (R - hyp(x - TC[0], (y - TC[1]) * 1.2) - 60 * noise1(x / 130 + y / 90, 5)) / 150);
  const tideBlob = (R, n = 30) => { const o = []; for (let i = 0; i < n; i++) { const a = i / n * TAU, r = max(4, R * (1 + .09 * noise1(i * .9, 3) + .05 * noise1(i * 2.3, 8)) - 40); o.push([TC[0] + cos(a) * r, TC[1] + sin(a) * r / 1.2]); } return o; };
  const GL = Object.assign({}, W.moods.gold, { top: '#8db6bb', mid: '#f2dc9a', low: '#ffdf9a', cl: '#fff6dc', cs: '#e6bd92', haze: '#f3deae', sun: '#ffe49a', tint: '#f0cf78', side: 1 });
  const MIXL = k => Object.assign({}, W.mixLight('lowsun', 'gold', k), { side: 1 });
  const HILL_F = (() => { const o = []; for (let x = -900; x <= 2900; x += 46) o.push([x, -96 - 70 * gauss((x - 240) / 420) - 54 * gauss((x - 980) / 300) - 40 * gauss((x - 1900) / 460) + 22 * fbm(x / 260, 3, 3)]); return o; })();
  const HILL_M = (() => { const o = []; for (let x = -900; x <= 2900; x += 46) o.push([x, -40 - 46 * gauss((x - 1620) / 620) + 16 * gauss((x - 200) / 420) + 12 * fbm(x / 210, 9, 3)]); return o; })();
  function land(p, K, t, R, E) {
    const hz = K.S(0, 0)[1]; if (hz < -10) return; const z = K.z, M = W.moods.lowsun, blob = tideBlob(R), wash = (shape, color, st) => { if (R > 4) p.clip(shape, () => p.mass(blob, Object.assign({ color, soft: 46 }, st))); };
    p.layer('sky', { every: 5, depth: .1 });
    const gy = y => y; K.open(p);
    const sky = [[-1000, -900], [3000, -900], [3000, 20], [-1000, 20]], G = (a, b, c) => ({ lin: [0, -830, 0, -70], stops: [[0, a], [.6, b], [1, c]] });
    p.mass(sky, { sharp: true, color: G(mixc(M.top, '#8d8a80', .35), mixc(M.mid, '#b09b78', .3), mixc(M.low, '#d9b27a', .4)), dir: -.04, len: 1.8, size: 1.4, vary: .5 }); p.mass(lump(1600, -60, 900, 90, 4, { n: 12, rough: .18 }), { color: '#f2d08e', alpha: .55, dir: -.03, len: 1.6, size: 1.1, soft: 26 });
    if (R > 4) p.mass(blob, { color: { lin: [0, -830, 0, -70], stops: [[0, '#93b6b2'], [.28, '#b9c9ac'], [.6, GL.mid], [1, GL.low]] }, dir: -.12, len: 1.8, size: 1.4, vary: .5, soft: 60 });
    const cl = [[80, -440, 560, 46, 1], [820, -330, 420, 26, 2], [1560, -500, 660, 54, 3], [2240, -320, 460, 30, 4], [420, -230, 520, 16, 5], [1800, -220, 600, 18, 6]]; cl.forEach(c => { const k = tideAt(R, c[0], c[1]); p.mass(lump(c[0], c[1], c[2], c[3], c[4] + 8, { n: 13, rough: .32, rot: -.02 }), { color: mixc(mixc('#f3dfb4', '#a59674', [.5, .2, .1, .6, .3, .3][c[4] - 1]), GL.cl, k), alpha: lerp(.5, .92, k), dir: -.06, len: 1.3, size: 1, soft: 12 }); if (k > .1 && c[3] > 24) p.mass(lump(c[0] - 40, c[1] + c[3] * .55, c[2] * .8, c[3] * .3, c[4] + 28, { n: 11, rough: .3 }), { color: GL.cs, alpha: .55 * k, dir: -.04, len: 1.2, size: .9, soft: 12 }); });
    K.shut(p);
    p.layer('hills', { every: 4, depth: .45 }); K.open(p);
    const Fs = HILL_F.concat([[2900, 40], [-900, 40]]), Ms = HILL_M.concat([[2900, 60], [-900, 60]]);
    p.mass(Fs, { sharp: true, color: { lin: [0, -220, 0, 0], stops: [[0, '#8d8a7c'], [1, '#b3a27e']] }, dir: .16, len: 1.2, size: .9, vary: .45 }); wash(Fs, { lin: [0, -220, 0, 0], stops: [[0, '#7fa3a6'], [.6, '#a9bf8e'], [1, '#d6cf8c']] }, { dir: .16, len: 1.2, size: .9, vary: .55 });
    found(p, HILL_F, { color: '#6a665a', w: K.px(2), press: .34, seed: 4, seg: 190, gap: .9, skip: .3 });
    for (let i = 0; i < 15; i++) { const x = -500 + 210 * i + 80 * hash(i, 2, 2), y = yAt(HILL_F, x); if (!K.sees(x, y, 80)) continue; const k = tideAt(R, x, y); p.line([[x, y + 6], [x - 26 + 20 * hash(i, 3, 3), y + 34], [x - 40 + 50 * hash(i, 4, 4), y + 70]], { color: mixc('#7d786a', '#5f8a7c', k), w: K.px(2.4), press: .34, taper: [.2, .6], wobble: 1.2, medium: 'crayon' }); }
    p.mass(Ms, { sharp: true, color: { lin: [0, -100, 0, 20], stops: [[0, '#a08f6c'], [1, '#8a7a58']] }, dir: -.1, len: 1.1, size: .85, vary: .55 }); wash(Ms, { lin: [0, -100, 0, 20], stops: [[0, '#b8c26a'], [.5, '#8fb05e'], [1, '#6f9a4e']] }, { dir: -.1, len: 1.1, size: .85, vary: .65 });
    // field walls, a road, the ruin down there
    [[[-700, -24], [-300, -46], [60, -40], [330, -18]], [[180, -60], [240, -38], [300, -14], [330, 4]], [[520, -14], [760, -40], [1000, -44]], [[1900, -70], [2100, -44], [2260, -10]]].forEach((l, i) => p.line(l, { color: mixc('#6f6656', '#7d8a5c', tideAt(R, l[1][0], l[1][1])), w: K.px(2.6), press: .42, taper: [.2, .3], wobble: 1.6, medium: 'crayon' }));
    { const hx = 150, hy = -34, k = tideAt(R, hx, hy); p.mass([[hx - 26, hy], [hx - 26, hy - 18], [hx + 26, hy - 18], [hx + 26, hy]], { sharp: true, color: mixc('#b8ac94', '#fbf0d8', k), dir: 1.5, size: .36, len: .4 }); p.mass([[hx - 32, hy - 17], [hx - 14, hy - 34], [hx + lerp(4, 18, k), hy - lerp(24, 34, k)], [hx + 32, hy - 17]], { sharp: true, color: mixc('#7a6c56', '#d8a85c', k), dir: .9, size: .34, len: .4 }); p.line([[hx - 4, hy - 6], [hx + 4, hy - 6]], { color: mixc('#4a4238', '#ffd27a', k), w: 6, press: .8 }); if (k > .2) W.smoke(p, { x: hx + 16, y: hy - 34, h: 90 * k, w: 5, k: .8 * k, light: 'gold', t: p.t }); }
    for (let i = 0; i < 130; i++) { const x = -420 + 23 * i + 12 * hash(i, 1, 6), y = yAt(HILL_M, x) + 10 + 50 * hash(i, 2, 6); if (!K.sees(x, y, 30)) continue; const k = tideAt(R, x, y), l = 10 + 16 * hash(i, 3, 6); p.line([[x, y], [x + 4, y - l * .6], [x + 9 + 5 * hash(i, 4, 6), y - l]], { color: mixc(i % 3 ? '#7a6b4a' : '#b5a070', i % 3 ? '#4f7d40' : '#e6d67a', k), w: K.px(2), press: .5, taper: [.05, .6], wobble: 1.1, medium: i % 2 ? 'crayon' : 'graphite' }); }
    K.shut(p);
  }

  const TURF = (l, r, step = 26) => { const o = []; for (let x = l; x <= r + step; x += step) o.push([x, bed(0, x)]); return o; };
  // the turf: a torn edge of root mat, and grass on it blade by blade, so colour can come back blade by blade
  function grass(p, K, t, R, wind) {
    const l = max(K.l - 30, X0 - 200), r = min(K.r + 30, X1 + 250), kk = ss(0, 1200, R), top = [], bot = [];
    for (let x = l - (l % 10); x < r + 10; x += 10) { const i = Math.round(x / 10), y = bed(0, x); top.push([x, y - 2 - 7 * hash(i, 1, 71) * hash(i, 2, 71)]); if (i % 2 === 0) bot.push([x, y + 15 + 13 * fbm(x / 70, 4, 2) + 9 * hash(i, 3, 71) * hash(i, 4, 71)]); }
    p.mass(top.concat(bot.reverse()), { sharp: true, color: { lin: [0, -6, 0, 30], stops: [[0, mixc('#4f4429', '#6f7a38', kk)], [1, mixc('#33291f', '#6a4c2c', kk)]] }, dir: 1.5, len: .5, size: .5, vary: .65 });
    for (let x = l - (l % 34); x < r; x += 34) { const i = Math.round(x / 34), y = bed(0, x) + 12, len = 14 + 46 * hash(i, 2, 72) * hash(i, 4, 72); p.line([[x, y], [x + 9 * noise1(i, 2), y + len * .5], [x + 18 * noise1(i, 3), y + len]], { color: i % 3 ? mixc('#1f1a18', '#5a3a28', kk) : '#8a6f4c', w: K.px(1.6), press: .55, taper: [.02, .7], wobble: 1.4 }); }
    const step = K.z < .95 ? 12 : 9.5; for (let i = Math.floor(l / step); i * step < r; i++) { const x = i * step, y = bed(0, x) + 7, k = tideAt(R, x, 0), patch = .62 + .5 * noise1(x / 130, 6), h = (14 + 34 * hash(i, 1, 3) * hash(i, 2, 3) + 20 * hash(i, 5, 3) * hash(i, 8, 3)) * patch * (1 + .3 * k) * ((hash(i, 9, 3) * 5 | 0) === 2 ? 1.35 : 1), b = wind(t - .1 * hash(i, 4, 3), x, 0) * (6 + h * .24) + (hash(i, 3, 3) - .42) * 15, X = x + 8 * hash(i, 6, 3), c = (hash(i, 9, 3) * 5) | 0; p.line([[X, y], [X + b * .3, y - h * .55], [X + b, y - h]], { color: mixc(['#453b27', '#6b5b3a', '#cdb078', '#574a30', '#8d7a50'][c], ['#3d6633', '#74a044', '#d3ca68', '#568a3a', '#9aba52'][c], k), w: K.px(c === 2 ? 2 : 3), press: .64, taper: [.03, .6], wobble: .9, medium: i % 3 ? 'crayon' : 'graphite' }); if (k > .6 && hash(i, 7, 3) < .14) p.line([[X + b, y - h - 2], [X + b + 4, y - h - 4]], { color: hash(i, 8, 3) < .5 ? '#fff3d6' : '#f5cf52', w: K.px(6) * clamp((k - .6) * 3), press: .9, taper: [.2, .2], medium: 'crayon' }); }
  }

  /* ------------------------------------------------------------------ s14 */
  const STEPS = [{ t: .42, x: 770, A: .95, s: 3 }, { t: 3.06, x: 792, A: 1.06, s: 5 }, { t: 4.62, x: 905, A: 1.14, s: 8 }];
  function rings(t) { const out = []; for (const r of STEPS.map(q => { const tau = t - q.t; if (tau <= 0 || tau > 3) return null; return { x: q.x, s: q.s, A0: q.A, old: ss(1.6, 3, tau), R: 1200 * (1 - Math.exp(-.62 * tau)), A: q.A * ss(0, .1, tau) * (1 - .2 * tau) * (1 - ss(1.1, 2.3, tau)) }; }).filter(Boolean)) { out.push(r); if (r.R > 190) out.push({ x: r.x, s: r.s + 1, A0: 0, old: r.old, R: r.R - 165 - 12 * sin(r.R * .01), A: r.A * .34 }); } return out; }
  const CAM = t => { const k = keys(t, [[2.1, 0], [4.3, 1, 'io']]), j = keys(t, [[4.62, 0], [6.1, 1, 'io']]), z = Math.exp(lerp(0, Math.log(1.5), k) + lerp(0, Math.log(2.05 / 1.5), j)); return [lerp(lerp(960, 1032, k), 1106, j), lerp(lerp(248, 302, k), 404, j), z]; };
  const VIS = t => keys(t, [[1.15, .015], [1.42, .28, 'in'], [1.62, .64, 'out'], [1.95, .56], [2.8, .22, 'io'], [3.75, .2], [4.0, .5, 'in'], [4.22, .74, 'out'], [5.0, .6], [5.3, .62], [5.62, .95, 'out'], [6.4, .9]]);
  // everything that is happening at scene time t. Shared with s15, which starts on the last of these drawings.
  function state(t) {
    const v = VIS(t), K = cam(CAM(t)), rs = rings(t);
    const o = { v, t, wake: keys(t, [[3.96, 0], [4.12, -.07, 'out'], [4.86, .96, 'io'], [5.2, 1.03], [5.6, 1]]), lids: keys(t, [[4.5, 0], [4.6, .2, 'out'], [4.7, .06], [4.95, .66, 'out'], [5.15, .56], [5.5, .9], [5.85, 1.06], [6.4, .98]]), finger: keys(t, [[1.46, 0], [1.58, -.1, 'out'], [1.98, .62, 'out'], [2.2, .5], [3.0, .34], [4.0, .3], [4.1, .2], [4.5, 1, 'out'], [4.9, .86]]), br: 1.7 * sin(t * 1.55) * (1 - ss(3.9, 4.2, t)) + keys(t, [[4.02, 0], [4.36, 6.5, 'out'], [4.9, 6], [6.0, 1.5], [6.9, 2.6]]), hair: keys(t - .14, [[3.96, 0], [4.86, 1, 'io'], [5.1, 1.1], [5.6, .9]]), nod: keys(t, [[1.5, 0], [1.8, -.035, 'out'], [2.7, 0]]), catch: keys(t, [[4.0, 0], [4.3, 1, 'out'], [5.4, .4]]) };
    return { v, K, rs, o };
  }
  function env(K, rs, v, t) {
    const near = (x, y) => v * .3 * gauss((x - 1060) / 360) * gauss((y - 420) / 190), seamK = v * .4;
    const ember = (x, y) => { let m = 0; for (const r of rs) { const d = r.R - hyp((x - r.x) * .86, y * 1.04); if (d > 20) { const e = r.A0 * .85 * Math.exp(-d / 420) * (1 - .6 * ss(.0, 1, r.old)); if (e > m) m = e; } } return m; };
    return { K, rs, v, ember, lit: (x, y) => ringAt(rs, x, y) + near(x, y), earth: i => EARTH[i], lens: q => q[5], nest: '#201d27', seam: (i, j) => j === 0 ? '#16131a' : j === 1 ? mixc(EARTH[i], '#8a6a4c', .42) : mixc(EARTH[i], mixc('#8d7058', '#d9a066', seamK), .4), stone: i => ['#332f37', '#1f1c24', '#443f46'][i], root: ['#4a3d36', '#5e4d40', '#766250', '#604f40'] };
  }
  function man(p, K, t, o = {}) {
    const x = 690, a = keys(t, [[-.2, -54], [.12, -54], [.42, -30, 'in'], [.5, -28], [2.55, -28], [2.8, -24], [3.06, 0, 'in']]), up = keys(t, [[.06, 0], [.26, -9, 'out'], [.42, 1.5, 'heavy'], [.6, 0], [2.6, 0], [2.86, -7, 'out'], [3.08, 1.5, 'heavy'], [3.35, 0]]), P = K.S(x + a, 2 + up), reach = keys(t, [[3.5, 0], [4.15, .72, 'io'], [4.62, 1, 'in']]), press = keys(t, [[4.6, 0], [4.75, 1, 'out'], [5.4, .7]]);
    const hp = K.S(PALM[0] + a * (1 - reach), lerp(-96, -15, reach) + 4 * press);
    return C.figure(p, 'dannyOld', { x: P[0], y: P[1], h: 900 * K.z, view: 'side', legs: { kind: 'kneel', k: keys(t, [[.3, .1], [.55, .2, 'settle'], [2.9, .16], [3.3, .26, 'settle']]) }, lean: lerp(.08, .3, reach) + .012 * up, bend: .22 + .1 * reach, head: { nod: .42 }, cap: false, armNear: { at: hp, h: ['holdFingers', 'flatOnEarth', ss(.5, 1, reach)] }, armFar: 'lap', expr: 'prayer', light: { dir: -.35, warm: .7, k: .6, dim: .22 }, drag: [keys(t, [[.1, 0], [.3, -.05], [.7, 0, 'settle'], [2.6, 0], [2.9, -.045], [3.4, 0, 'settle']]), 0], t: p.t });
  }
  const TAUT = t => keys(t, [[4.1, 0], [4.7, .35, 'io'], [4.95, 1, 'out'], [5.4, .9]]);
  function cap(p, k) { p.push(); p.translate(1208, 0); p.scale(.74); p.translate(-1208, 0); cap0(p, k); p.pop(); }
  function cap0(p, k) { const x = 1208, y = -4, c = mixc('#63605a', '#7d7a70', k), d = mixc('#38352f', '#4c4840', k); p.mass([[x - 46, y + 2], [x - 44, y - 14], [x - 22, y - 27], [x + 10, y - 29], [x + 34, y - 18], [x + 42, y - 4], [x + 40, y + 4]], { color: c, dir: .1, size: .4, len: .6, vary: .45 }); p.shade([[x - 46, y + 4], [x - 40, y - 6], [x, y - 8], [x + 40, y - 4], [x + 40, y + 6]], { color: d, alpha: .6, soft: 5 }); p.mass([[x + 26, y - 6], [x + 48, y - 6], [x + 66, y + 1], [x + 52, y + 5], [x + 28, y + 4]], { color: d, dir: .1, size: .36, len: .5, vary: .4 }); p.line([[x - 46, y + 1], [x - 44, y - 14], [x - 22, y - 27], [x + 10, y - 29], [x + 34, y - 18], [x + 48, y - 6], [x + 66, y + 1]], { color: '#2c2a2a', w: 2.2, press: .6, taper: [.15, .2], wobble: 1.1 }); p.line([[x - 12, y - 28], [x - 4, y - 16], [x + 4, y - 8]], { color: '#2c2a2a', w: 1.6, press: .4, taper: [.2, .5], wobble: 1.2 }); }
  const G14 = W.gusts({ seed: 14, every: 3.1, speed: 700, power: .55, base: .12 });

  // the last hold of s14: light comes down along the thread and lies on her; the corners go cold
  function poolWarm(p, E) { const K = E.K;
    if (E.pool > .01) { const q = E.pool, T = THREAD.concat([[972, 350], [1000, 396]]), a = T.map(w => [w[0] - 60 - 20 * hash(w[1], 2, 2), w[1]]), b2 = T.map(w => [w[0] + 74 + 24 * hash(w[1], 3, 2), w[1]]).reverse(); p.shade(a.concat(b2), { color: '#7a4020', alpha: .5 * q, soft: 46, mode: 'screen' }); p.shade(lump(1080, 386, 250, 150, 7, { n: 12, rough: .14 }), { color: '#8a4c22', alpha: .5 * q, soft: 60, mode: 'screen' }); p.shade(lump(1110, 372, 130, 92, 9, { n: 11, rough: .16 }), { color: '#b06a2e', alpha: .42 * q, soft: 34, mode: 'screen' }); }
  }
  function poolCold(p, E) { const K = E.K;
    if (E.pool > .01) { const q = E.pool;
      p.shade([[K.l - 60, K.t - 60], [K.l + 330, K.t - 60], [K.l + 190, K.y], [K.l + 300, K.b + 60], [K.l - 60, K.b + 60]], { color: '#4a4658', alpha: .55 * q, soft: 90 }); p.shade([[K.r + 60, K.t - 60], [K.r - 250, K.t - 60], [K.r - 130, K.y], [K.r - 300, K.b + 60], [K.r + 60, K.b + 60]], { color: '#4a4658', alpha: .55 * q, soft: 90 }); p.shade([[K.l - 60, 560], [K.x, 548], [K.r + 60, 560], [K.r + 60, K.b + 80], [K.l - 60, K.b + 80]], { color: '#4e4756', alpha: .6 * q, soft: 46 }); }
  }

  function near(p, v) {
    if (v > .03) { p.shade([[640, 300], [900, 250], [1200, 250], [1420, 330], [1480, 470], [1300, 590], [900, 610], [620, 570], [520, 440]], { color: '#7a4424', alpha: .34 * v, soft: 70, mode: 'screen' }); p.shade([[980, 330], [1140, 290], [1290, 340], [1340, 440], [1230, 520], [1040, 520]], { color: '#8a5228', alpha: .3 * v, soft: 50, mode: 'screen' }); }
  }
  function under(p, E, o, t) { // the ground, the sleepers, her, the thread: layers earth, roots, her
    const K = E.K;
    p.layer('earth', { every: 4, depth: .8 }); K.open(p); ground(p, E);
    near(p, E.v);
    poolWarm(p, E);
    ringShade(p, E.rs); strata(p, E); stones(p, E);
    poolCold(p, E);
    K.shut(p);
    p.layer('roots', { every: 2, depth: .95 }); K.open(p); roots(p, E); bulbs(p, E); snail(p, E); mouse(p, E, { t, wake: o.mouse || 0 }); crumbs(p, E); K.shut(p);
    p.layer('her', { every: 2, depth: 1 }); return her(p, E, o);
  }

  B.scene({ id: 's14', ink: 'dark', kit: null, draw(p, s) {
    const t = s.t, S = state(t), K = S.K, E = env(K, S.rs, S.v, t), o = S.o; E.pool = keys(t, [[4.7, 0], [5.7, 1, 'io']]); o.mouse = keys(t, [[1.0, 0], [1.16, 1, 'out'], [1.7, .5], [2.4, 0], [3.7, 0], [3.86, .8, 'out'], [4.8, 0]]);
    p.paper('#e4d3ae');
    land(p, K, t, 0, E);
    if (K.t < 40) { p.layer('man', { every: 1, depth: 1 }); K.open(p); W.stone(p, { x: STONE[0], y: STONE[1], scale: 1.5, light: 'lowsun', season: .62, t: p.t, tuft: 0 }); W.thorn(p, { x: THORN[0] + 14, y: 8, scale: 2.0, season: .78, light: 'lowsun', colour: .4, t: p.t, leaf: .12 }); cap(p, 0); K.shut(p); const M = man(p, K, t), hn = M.handNear, h0 = [(hn[0] - 960) / K.z + K.x, (hn[1] - 540) / K.z + K.y]; K.open(p); if (h0[1] < -16) W.thread(p, [h0, [lerp(h0[0], 905, .5) + 9, lerp(h0[1], 4, .55)], [905, 8]], { w: 4.8 * Math.pow(K.z, -.5), hang: .03, slack: .4, seed: 5 }); K.shut(p); }
    const H = under(p, E, o, t);
    thread(p, E, { finger: H.finger, fr: H.fr[1], v: clamp(.45 + .6 * S.v), pull: t > 1.5 && t < 3.9 ? { t0: 1.5 + s.abs - t, amp: 7, from: 1 } : { t0: 4.62 + s.abs - t, amp: 9, from: 0 }, glow: .4 * S.v, taut: TAUT(t) });
    if (K.t < 40) { p.layer('turf', { every: 2, depth: 1 }); K.open(p); grass(p, K, t, 0, G14); K.shut(p); }
  } });
  const kit = B.scenes.s14.kit = { PALM, HAND, HEADP, STONE, THORN, TOP, LOW, ST, bed, bedLine, bedOf, slope, EARTH, ROSEY, GOLD, STONES, CRUMBS, BIGROOTS, FINE, ROSEROOTS, BULBS, THREAD, TURF, script, cam, far, ringAt, ringBand, ringShade, ground, strata, stones, roots, crumbs, litAlong, dormouse: mouse, bulbs, snail, thread, her, land, grass, tideAt, tideBlob, GL, MIXL, under, state, env, man, n2, gauss, swell, NEST, G14, X0, X1, poolWarm, poolCold, ringAt, TAUT, cap, near };
  B.test.s14ground = function (p, k) {
    p.paper('#e7d7b4'); const K = cam([960, 248, 1]); const rs = [{ x: 720, R: [0, 180, 420, 640][Math.round(k)] || 0, A: 1, s: 3 }];
    const E = { K, rs, lit: (x, y) => ringAt(rs, x, y), earth: i => EARTH[i], lens: q => q[5], nest: '#221f28', seam: (i, j) => j === 0 ? '#17141a' : j === 1 ? mixc(EARTH[i], '#8a6a4c', .5) : mixc(EARTH[i], '#9a7c62', .42), stone: i => ['#4a4440', '#2b2729', '#6d645a'][i], root: ['#6e5842', '#8d7354', '#a78c68', '#7b664a'] };
    p.layer('earth', { every: 4, depth: .8 }); K.open(p); ground(p, E); ringShade(p, rs); strata(p, E); stones(p, E); K.shut(p);
    p.layer('roots', { every: 2, depth: .95 }); K.open(p); roots(p, E); crumbs(p, E); K.shut(p);
  };
  B.test.s14her = function (p, k) {
    p.paper('#e7d7b4'); const i = Math.round(k), z = [1, 1.6, 1.6, 1.6, 1.6, 2.4][i], K = cam(z === 1 ? [960, 248, 1] : z > 2 ? [1150, 420, z] : [1000, 400, 1.6]), v = [.12, .08, .3, .62, .95, .95][i], wk = [0, 0, 0, .1, 1, 1][i];
    const E = { K, rs: [], lit: () => v * .2, earth: i => EARTH[i], lens: q => q[5], nest: '#221f28', seam: (i, j) => j === 0 ? '#17141a' : j === 1 ? mixc(EARTH[i], '#8a6a4c', .5) : mixc(EARTH[i], '#9a7c62', .42), stone: i => ['#4a4440', '#2b2729', '#6d645a'][i], root: ['#6e5842', '#8d7354', '#a78c68', '#7b664a'] };
    p.layer('earth', { every: 4, depth: .8 }); K.open(p); ground(p, E); strata(p, E); stones(p, E); K.shut(p);
    p.layer('roots', { every: 2, depth: .95 }); K.open(p); roots(p, E); K.shut(p);
    p.layer('her', { every: 2, depth: 1 }); her(p, E, { v, wake: wk, lids: wk, finger: i > 2 ? 1 : 0, t: 1 });
  };
})();
