// s02  15.3-22.3  "From glen to glen, and down the mountain side"
//
// FEELING  Something far too big is calling, and it is calling him. Scale and wind.
// BEATS    0.0  From   two small people from behind, close together, on the brink of the great glen. a murmur of lines behind the farthest range
//          0.36 glen   the call leaps across the FAR glen (thin, small, right to left) and lands: birds go up, the flank is combed flat
//          1.25 glen   the NEAR glen answers: bold lines from the left hill, down through the whole valley and up to the right summit
//          2.3  and    it coils on the summit, hangs (anticipation). his head has followed it. hers has too.
//          3.1  down   it drops: one long falling line, hairpin by hairpin, and where it has passed there is a road
//          4.04 mountain  marchers and pipers pour over the top and come down the line. she has stopped looking at the hills: she is looking at him
//          5.0  side   it crosses the valley floor and hits them: grass goes down, birds burst, coat and scarf stream
//          5.7  ...    he takes half a step toward it. she does not. her hand goes out after his sleeve and stops short.
// EYE      figures (dark on the palest water) > far hills > across > right summit > down the road > back to the figures
// VALUES   darkest: the two figures, the foot of the knoll. lightest: the lough behind them, the chalk in the call. red: one scarf.
(function () {
  const B = window.BIDE, A = B.anim, { clamp, lerp, keys, hash, noise1, spline, mixc, ease, TAU } = A;
  const sin = Math.sin, cos = Math.cos, max = Math.max, min = Math.min, hyp = Math.hypot, PI = Math.PI;
  const LAND = {
    farL: [[-60, 452], [140, 430], [330, 446], [520, 404], [640, 372], [735, 330], [800, 318], [858, 340], [920, 392], [985, 448], [1050, 500], [1110, 532]],
    farR: [[930, 548], [990, 512], [1060, 462], [1120, 410], [1180, 352], [1232, 312], [1290, 300], [1350, 322], [1420, 372], [1520, 420], [1700, 450], [1980, 470]],
    left: [[-80, 250], [40, 196], [150, 160], [250, 148], [340, 166], [420, 214], [500, 286], [580, 344], [680, 418], [780, 492], [880, 548], [990, 596], [1100, 618]],
    right: [[820, 712], [930, 690], [1030, 652], [1130, 602], [1220, 556], [1300, 486], [1390, 420], [1470, 330], [1545, 262], [1620, 180], [1700, 128], [1780, 116], [1860, 150], [1920, 196], [2000, 214]],
    near: [[-60, 806], [110, 806], [290, 818], [460, 842], [620, 872], [780, 906], [940, 932], [1120, 948], [1340, 958], [1620, 962], [1980, 944]],
    road: [[1764, 112], [1802, 178], [1786, 244], [1706, 296], [1604, 334], [1540, 386], [1576, 440], [1672, 482], [1722, 540], [1676, 600], [1530, 640], [1364, 664], [1236, 704], [1190, 760], [1246, 818], [1290, 880], [1220, 944], [1080, 1000], [960, 1060]]
  };
  const W = () => B.world, C = () => B.cast;
  let G = null;
  function geo() {
    if (G) return G; const U = W().util;
    G = { near: U.ridge(LAND.near, { amp: 6, seed: 9, step: 22 }), farL: U.ridge(LAND.farL, { amp: 5, seed: 52, step: 24 }), left: U.ridge(LAND.left, { amp: 8, seed: 53, step: 22 }), right: U.ridge(LAND.right, { amp: 8, seed: 54, step: 22 }), road: U.track(spline(LAND.road, 8, false)) };
    G.s1 = U.track(spline([[1268, 306], [1216, 340], [1130, 440], [1030, 486], [930, 440], [860, 352], [806, 312], [740, 286]], 12, false));
    G.s2 = U.track(spline([[150, 156], [262, 126], [380, 176], [540, 330], [740, 470], [960, 520], [1180, 452], [1370, 300], [1530, 170], [1660, 96], [1770, 78]], 12, false));
    G.coil = U.track(spline([[1500, 176], [1600, 104], [1716, 66], [1822, 92], [1862, 176], [1800, 250], [1690, 246], [1628, 176], [1660, 92], [1768, 48], [1866, 96], [1880, 190], [1800, 262], [1716, 232], [1690, 160], [1740, 112], [1790, 132], [1806, 186]], 10, false));
    // the fall keeps to the road, then at the valley floor the wind goes on without it, up over the knoll and through the two of them
    G.fall = G.road; G.gust = U.track(spline([[1330, 668], [1232, 708], [1192, 764], [1180, 830], [1080, 880], [930, 872], [760, 806], [560, 730], [320, 690], [60, 630], [-240, 540]], 12, false));
    G.gust2 = U.track(spline([[1840, 470], [1640, 560], [1400, 640], [1150, 690], [930, 660], [740, 590], [520, 520], [260, 500], [0, 440], [-240, 400]], 12, false));
    return G;
  }
  // calls that have not changed since the last drawing are laid again without being worked out again
  const MEM = {};
  function memo(p, id, key, fn) {
    const play = l => { for (const c of l) if (c[0] === 'clip') p.clip(c[1], () => play(c[2])); else p[c[0]](...c[1]); };
    const m = MEM[id]; if (m && m.key === key) { play(m.list); return; }
    let list = []; const r = Object.create(p); for (const k of ['mass', 'shade', 'line', 'hatch', 'lift', 'dust', 'push', 'pop', 'translate', 'rotate', 'scale']) r[k] = (...a) => { list.push([k, a]); return p[k](...a); };
    r.clip = (sh, f) => { const out = list, sub = []; list = sub; p.clip(sh, f); list = out; out.push(['clip', sh, sub]); };
    fn(r); MEM[id] = { key, list };
  }
  // a bundle of drawn strands along a path. u0..u1 = the part of the path that is on the paper now
  function bundle(p, T, u0, u1, o) {
    if (u1 - u0 < .012) return; const n = o.n || 10, sp = o.spread || 40, sd = o.seed || 1, w0 = o.w || 5, U = W().util, t = p.t;
    for (let i = 0; i < n; i++) {
      const h = k => hash(i, sd, k), lag = (o.lag ?? .12) * h(1) * (i ? 1 : 0), tl = h(2) * (o.fray ?? .3) * (u1 - u0), a = clamp(u0 + tl, 0, 1), b = clamp(u1 - lag * (u1 < 1 ? 1 : 0), 0, 1); if (b - a < .015) continue;
      const off = (i / (n - 1 || 1) - .5) * sp * 2 + (h(3) - .5) * sp * .5, m = max(5, Math.ceil((b - a) * T.len / 70)), pts = [], rise = (h(4) - .5) * sp * 1.1;
      for (let j = 0; j <= m; j++) { const u = lerp(a, b, j / m), q = T.at(u), env = sin(PI * clamp(u * (1 - 2 * (o.pinch ?? .06)) + (o.pinch ?? .06))), k = off * (.16 + .95 * env) + rise * env * env + (o.wander ?? 12) * U.fbm(u * 4.4 - t * .8 + i * .7, sd + 4); pts.push([q[0] - sin(q[2]) * k, q[1] + cos(q[2]) * k, (o.press0 ?? .3) + .7 * Math.pow(j / m, .6)]); }
      // the leading end of a few strands curls over, the way a pencil finishes a gust
      if (o.curl && i % o.curl === 0 && b < .995) { const q = pts[pts.length - 1], z = pts[pts.length - 2]; let an = Math.atan2(q[1] - z[1], q[0] - z[0]), sg = h(6) < .5 ? 1 : -1, r = (o.curlR || 18) * (.6 + .8 * h(5)), x = q[0], y = q[1]; for (let j = 1; j <= 6; j++) { an += sg * .72; x += cos(an) * r * (1 - j * .1); y += sin(an) * r * (1 - j * .1); pts.push([x, y, .8 - j * .1]); } }
      const kd = h(8), big = i === 0 ? 1.35 : .6 + .7 * h(7), st = kd < .42 ? { color: o.ink || '#37454d', w: w0 * .62 * big, medium: 'graphite', press: .82 } : kd < .74 ? { color: '#f6efdf', w: w0 * 1.5 * big, medium: 'crayon', press: .9 } : { color: o.blue || '#4f7186', w: w0 * .95 * big, medium: 'crayon', press: .78 };
      p.line(pts, Object.assign({ taper: [o.t0 ?? .5, b > .985 ? .12 : .22], wobble: 1.2, alpha: o.alpha ?? 1 }, st));
    }
  }
  // grass and heather lying down where the call has passed: a pale sheen with the strokes combed the way it went. pts = centre line, half widths
  function comb(p, L, R, k, dir, o = {}) {
    if (k < .04 || L.length < 2) return; const sh = W().util.poly(L.concat(R.slice().reverse()));
    p.mass(sh, { color: o.pale || '#e6e1c2', alpha: .62 * k, dir, len: 1.3, size: .7, vary: .3, soft: 9, dens: 1.1 });
    p.hatch(sh, { color: o.dark || '#53645a', dir, gap: o.gap || 11, len: o.len || 58, w: o.w || 1.9, press: .52 * k, curve: .25 });
    p.hatch(sh, { color: '#f4efdb', dir: dir + .06, gap: (o.gap || 11) * 1.7, len: (o.len || 58) * .8, w: (o.w || 1.9) * 1.8, press: .6 * k, medium: 'crayon' });
  }
  // a band lying on a hillside under its skyline from x0 to x1
  function flank(rg, x0, x1, d0, d1) { const L = [], R = [], U = W().util; for (let i = 0; i <= 9; i++) { const u = i / 9, x = lerp(x0, x1, u), y = U.yAt(rg, x), e = .25 + .75 * Math.pow(sin(PI * clamp(u * .94 + .03)), .6); L.push([x, y + d0 + 6 * noise1(x / 60, 3)]); R.push([x + 10 * noise1(x / 50, 5), y + d0 + 14 + (d1 - d0) * e * (.8 + .3 * noise1(x / 90, 8))]); } return [L, R]; }
  const pulse = (t, t0, a, hold) => t < t0 ? 0 : t < t0 + a ? ease.out((t - t0) / a) : 1 - ease.io(clamp((t - t0 - a) / hold));
  // birds put up from one place: a startled launch, then each its own line away
  function burst(p, t, o) {
    const n = o.n || 8; for (let i = 0; i < n; i++) {
      const h = k => hash(i, o.seed || 3, k), tt = t - o.t0 - h(1) * .34; if (tt < 0) continue; const a = o.dir + (h(2) - .5) * (o.fan || 1.1), v = (o.v || 170) * (.65 + .7 * h(3)), d = v * (tt + .9 * (1 - Math.exp(-tt * 2.2))) * .8, x = o.x + (h(4) - .5) * (o.w || 60) + cos(a) * d, y = o.y + (h(5) - .5) * (o.w || 60) * .3 + sin(a) * d + 26 * noise1(tt * 1.1 + i * 3, 5) * min(1, tt) + 14 * tt * tt * (o.sink || 0);
      if (x < -60 || x > 1980 || y < -40) continue; const s = (o.s || 10) * (.75 + .5 * h(6)), beat = tt < 1.5 || noise1(tt * .8 + i, 9) > 0 ? 1 : 0, w = beat ? [1, .2, -.8, -.1][(Math.floor(p.n * .99 + i * 2.3)) & 3] : .25, fx = cos(a) < 0 ? -1 : 1, col = o.color || '#3b4247';
      p.line([[x + s * 1.2 - fx * s * .2, y - s * .75 * w, .5], [x + s * .5 + fx * s * .1, y - s * .62 * w - 2, .9], [x, y, 1], [x - s * .5 + fx * s * .1, y - s * .62 * w - 2, .9], [x - s * 1.2 - fx * s * .2, y - s * .75 * w, .5]], { color: col, w: 2 + s * .13, press: .9, taper: [.3, .3], wobble: .4 }); p.line([[x - fx * s * .4, y + 1.5], [x + fx * s * .35, y]], { color: col, w: 2.4 + s * .12, press: .9, taper: [.2, .3], wobble: .2 });
    }
  }
  // the fall: it hangs, drops, checks at each bend and drops again
  const FALL = [[3.1, 0], [3.22, .03, 'in'], [3.5, .25, 'lin'], [3.68, .31, 'out'], [3.98, .53, 'io'], [4.14, .57], [4.42, .78, 'io'], [4.74, 1, 'lin']];
  const GUST = [[4.4, 0], [4.72, .3, 'in'], [5.16, 1, 'lin']];
  const HIT = 4.84, hit = t => A.clamp((t - HIT) / .2) * (1 - .45 * ease.io(clamp((t - 5.6) / 1.6))); // how hard the wind is on the two of them
  function people(p, t) {
    const Ca = C(), h = 236, L = { dir: -1.2, warm: .28, k: .5 };
    const bl = hit(t), gx = -.13 + .05 * noise1(t * .9, 3) - .95 * bl, mx = 586, my = 876, dx = 684, dy = 892;
    // he: looks to the far glen, follows the answer across, watches it fall, is hit, steps
    const look = keys(t, [[-1, -.1], [.45, -.1], [.8, -.5, 'out'], [1.35, -.5], [2.1, .34, 'io'], [3.15, .38], [4.7, .18], [5.2, .02], [6, .1]]);
    const nod = keys(t, [[0, -.04], [.7, -.1], [1.9, -.24, 'out'], [2.9, -.28], [4.3, .06], [4.86, .08], [4.98, .24, 'out'], [5.4, .02], [6.1, -.1]]);
    const st = clamp(keys(t, [[5.3, 0], [5.44, -.07, 'out'], [5.9, 1, 'io']])), br = .12 * sin(t * 1.5), air = sin(PI * clamp((t - 5.44) / .42));
    const lean = keys(t, [[4.8, .02], [HIT, .02], [5.02, -.12, 'out'], [5.3, -.07], [5.78, .17, 'io'], [6.2, .11, 'settle'], [7.5, .1]]);
    const danny = { x: dx + 18 * st, y: dy + 3 * st, h: h * 1.1, view: '34back', face: 1, lean, bend: keys(t, [[4.8, 0], [5.02, .16, 'out'], [5.8, 0]]), side: .01, weight: .7, shrug: keys(t, [[2.2, 0], [2.75, .35], [3.1, .1], [4.9, .1], [5.05, .6, 'out'], [5.8, .1]]) + br * .3,
      head: { turn: -.2 + look, nod, tilt: .02 }, legs: { kind: 'feet', feet: [[-.055, 0, 0], [.035 + lerp(.0, .16, st), .012 * st - .055 * air, .35 * air]] },
      armNear: { g: 'rest', add: [keys(t, [[4.9, 0], [5.1, -.05, 'out'], [6.0, .06], [7.4, .05]]), 0] }, armFar: ['rest', [.14, .56, 'open'], keys(t, [[5.4, 0], [6.1, .8, 'io'], [7.4, .7]])], wind: [gx * 1.15, -.06 * bl], drag: [-.05 * bl, 0], light: L, expr: 'hope' };
    // she: one look at the hills, then only at him
    const ml = keys(t, [[0, .1], [.6, .1], [.95, -.2, 'out'], [1.5, -.2], [2.3, .34], [3.2, .34], [3.7, -.42, 'io'], [7.4, -.5]]);
    const reach = keys(t, [[5.5, 0], [6.02, 1, 'out'], [6.5, .95], [7.4, .4]]), hold = keys(t, [[4.9, 0], [5.15, 1, 'out'], [7.4, .9]]);
    const mother = { x: mx, y: my, h, view: '34back', face: 1, lean: keys(t, [[4.9, .0], [5.06, -.08, 'out'], [5.7, .02], [6.1, .06]]), bend: keys(t, [[3, .02], [4, .1], [4.9, .1], [5.06, .24, 'out'], [6, .12]]), weight: -.5, shrug: keys(t, [[4.9, 0], [5.1, .5, 'out'], [6.4, .2]]) - br * .2,
      head: { turn: ml, nod: keys(t, [[0, 0], [1.9, -.12], [3.1, -.14], [3.8, -.08], [7, -.1]]), tilt: keys(t, [[3.4, 0], [4.1, .05]]) }, legs: { kind: 'stand', gap: .06 },
      armFar: ['rest', [.33, .6, 'reach'], reach], armNear: ['rest', 'holdScarf', hold], wind: [gx * 1.1, -.03 * bl], drag: [-.06 * bl, 0], light: L, expr: 'holdingBack' };
    Ca.group(p, rec => { Ca.figure(p, 'mother', Object.assign({ rec }, mother)); Ca.figure(p, 'danny', Object.assign({ rec }, danny)); });
  }
  // grass on the knoll: a light breeze from the right, then the whole call goes over it
  const gw = (tt, x) => { const w = tt - (HIT - .1 + .36 * clamp((1150 - x) / 1300)); const h = w <= 0 ? 0 : w < .16 ? ease.out(w / .16) : (1 - .62 * ease.io(clamp((w - .5) / 1.3))) + .14 * Math.exp(-w * 2) * sin(w * 9); return -(.13 + .1 * noise1(tt * .8 + x * .002, 7)) - 1.3 * h; };
  B.scene({
    id: 's02', ink: 'dark',
    draw(p, s) {
      const Wd = W(), U = Wd.util, g = geo(), t = s.t, base = { season: .3, light: Wd.mixLight('day', 'dawn', .28), colour: .5 }, L = base.light;
      p.paper('#e4dac6');
      // ---- sky and the far glens
      p.layer('sky', { every: 6, still: true, depth: .05 });
      Wd.sky(p, { mood: base.light, t: 0, horizon: 600, seed: 3, clouds: [[300, 150, 700, 130, 1], [1040, 214, 900, 170, 3], [1640, 96, 520, 90, 5], [760, 330, 560, 60, 6], [1460, 356, 620, 46, 7]] });
      Wd.hill(p, Object.assign({ d: .97, pts: [[-60, 500], [200, 470], [500, 480], [760, 450], [900, 424], [1010, 430], [1100, 404], [1220, 430], [1500, 420], [1980, 440]], base: 610, seed: 51, spurs: 4, rough: 4, hatch: 0 }, base));
      Wd.hill(p, Object.assign({ d: .84, pts: LAND.farL, base: 616, seed: 52, spurs: 5, rough: 5, hatch: .6 }, base));
      Wd.hill(p, Object.assign({ d: .76, pts: LAND.farR, base: 640, seed: 57, spurs: 5, rough: 5, hatch: .8 }, base));
      // ---- the near glen
      p.layer('glen', { every: 6, still: true, depth: .4 });
      const mid = '#a9ad8e', lit = '#c9c49f', hz = L.haze;
      p.mass(U.below(U.ridge([[-80, 700], [300, 640], [520, 590], [700, 584], [900, 580], [1100, 584], [1320, 600], [1980, 650]], { amp: 2, seed: 4, step: 30 }), 1060), { sharp: true, color: { lin: [0, 578, 0, 930], stops: [[0, mixc(lit, hz, .55)], [.4, lit], [1, mid]] }, dir: .04, len: 1.5, size: 1, vary: .45 });
      Wd.lough(p, { x: 690, y: 700, rx: 250, ry: 38, light: L, seed: 7, n: 12, d: .45 });
      Wd.lough(p, { x: 1010, y: 602, rx: 130, ry: 9, light: L, seed: 8, n: 4, d: .8 });
      Wd.hill(p, Object.assign({ d: .52, rg: g.left, base: [[-80, 880], [160, 850], [330, 800], [470, 736], [600, 676], [780, 640], [960, 632], [1100, 630]], seed: 53, foot: mixc(mid, hz, .4), hatch: 1,
        spurs: [{ x: 70, to: [-30, 620], w: 130, k: .8 }, { x: 232, to: [330, 560], w: 130, bow: -50, k: 1.15 }, { x: 350, to: [470, 690], w: 160, bow: -60, k: 1.1 }, { x: 500, to: [640, 640], w: 90, k: .85 }, { x: 660, to: [790, 630], w: 90, bow: -30 }, { x: 840, to: [960, 622], w: 60, k: .8 }] }, base));
      Wd.hill(p, Object.assign({ d: .36, rg: g.right, base: [[820, 716], [960, 740], [1140, 790], [1400, 880], [1700, 970], [2000, 1020]], seed: 54, foot: mixc(mid, hz, .2), dir: -.42, hatch: 1,
        spurs: [{ x: 1880, to: [1940, 560], w: 150, bow: -50, k: 1.1 }, { x: 1770, to: [1790, 560], w: 150, bow: 46, k: .7 }, { x: 1600, to: [1500, 520], w: 110, k: .8 }, { x: 1480, to: [1350, 640], w: 120, bow: 40 }, { x: 1300, to: [1160, 700], w: 100, bow: 36, k: .9 }, { x: 1130, to: [1030, 716], w: 70, k: .7 }] }, base));
      Wd.fields(p, Object.assign({ quad: [[540, 752], [1060, 740], [1180, 900], [360, 890]], rows: 4, cols: 6, d: .42, seed: 8, ww: 3.4, alpha: .42, press: .8, fill: .5 }, base));
      Wd.fields(p, Object.assign({ quad: [[1200, 800], [1640, 780], [1980, 930], [1080, 970]], rows: 4, cols: 6, d: .32, seed: 12, ww: 4.5, alpha: .34, fill: .5, wall: .5 }, base));
      [[880, 716, .9], [1056, 648, .7], [1010, 742, 1]].forEach((h, i) => Wd.tinyHouse(p, h[0], h[1], 15 * h[2], L, .45, i));
      Wd.sheep(p, { at: [[1500, 810, 1.3], [1570, 846, 1.5], [1612, 858, 1.5], [1522, 872, 1.6], [1710, 846, 1.4], [1660, 886, 1.5]], s: 5, d: .4, light: L });
      // ---- cloud shadows running over the land: rubbed on with the side of the hand, almost no strokes
      p.layer('shadow', { every: 4, depth: .1 });
      p.clip(U.poly(g.left.concat([[1100, 640], [1980, 640], [1980, 1100], [-80, 1100]]), g.right.concat([[2000, 1100], [820, 1100]])), () => {
        for (let i = 0; i < 2; i++) { const x = 1420 + 1480 * i - 250 * t; if (x < -800 || x > 2800) continue; const y = 640 + 110 * cos((x - 1000) / 420), sh = []; for (let j = 0; j < 22; j++) { const a = j / 22 * TAU, k = 1 + .16 * U.fbm(Math.cos(a) * 1.7 + i * 4, 5 + i) + .16 * U.fbm(Math.sin(a) * 1.7 + 3 + i * 4, 8 + i), X = Math.cos(a) * (350 + 70 * i) * k, Y = Math.sin(a) * 190 * k, sl = clamp((x - 1000) / 500, -1, 1) * -.5; sh.push([x + X * cos(sl) - Y * sin(sl), y + X * sin(sl) + Y * cos(sl) ]); } p.mass(sh, { color: '#50625d', alpha: .6, dir: -.5, soft: 40, dens: .01, vary: .1, len: 1.6, size: 1.4 }); }
      });
      // ---- the road as it is being drawn, combed ground, the marchers, birds
      p.layer('life', { every: 1, depth: .75 });
      const fk = t < 3.1 ? 0 : keys(t, FALL);
      if (fk > .012) Wd.road(p, { pts: g.road.slice(0, min(1, fk), 22), w: [3, lerp(3, 30, Math.pow(fk, 1.8))], power: 1.8, d: .25, light: L, season: .3, colour: .5, lw: 2.2 });
      { // the ground answers: a comb of light runs over each flank with the call
        const k1 = pulse(t, .7, .14, .5), x1 = lerp(880, 700, clamp((t - .68) / .5)); if (k1 > .03) { const [a, b] = flank(g.farL, x1 - 70, x1 + 70, 6, 70); comb(p, a, b, k1 * .8, PI - .5, { gap: 8, len: 26, w: 1.4, dark: '#7f908c' }); }
        const k2 = pulse(t, 1.26, .2, .75), x2 = lerp(190, 860, ease.io(clamp((t - 1.2) / .8))); if (k2 > .03) { const [a, b] = flank(g.left, x2 - 250, x2 + 130, 14, 150); comb(p, a, b, k2 * .8, .66); }
        const k3 = pulse(t, 1.74, .16, .8), x3 = lerp(1250, 1700, ease.out(clamp((t - 1.66) / .8))); if (k3 > .03) { const [a, b] = flank(g.right, x3 - 220, x3 + 130, 14, 170); comb(p, a, b, k3 * .85, -.72); }
        if (fk > .03) for (let i = 0; i < 4; i++) { const u1 = fk - i * .1 + .03, u0 = u1 - .13; if (u1 < .03 || u0 > .99) continue; const age = t - inv(FALL, clamp(u1 - .03)), k = age < 0 ? 0 : 1 - ease.io(clamp((age - .1) / .7)); if (k < .05) continue; for (const sg of [-1, 1]) { const A0 = [], A1 = [], m = 5; let dd = 0; for (let j = 0; j <= m; j++) { const q = g.road.at(clamp(lerp(u0, u1, j / m), 0, 1)), r = lerp(16, 40, q[1] / 1000) , w = lerp(46, 130, clamp((q[1] - 100) / 800)) * (.8 + .4 * hash(i, j, sg + 2)), nx = -sin(q[2]), ny = cos(q[2]); A0.push([q[0] + sg * nx * r, q[1] + sg * ny * r * .5]); A1.push([q[0] + sg * nx * w, q[1] + sg * ny * w * .5]); if (j === 3) dd = q[2] + sg * .25; } comb(p, A0, A1, k * .9, dd, { gap: 10, len: 46 }); } }
      }
      if (fk > .03 && fk <= 1) [[.245, 1.0], [.395, 1.2], [.6, 1.5], [.8, 1.9]].forEach(([u, sc], i) => { const age = t - inv(FALL, u); if (age < 0 || age > .36) return; const q = g.road.at(u - .012); for (let j = 0; j < 4; j++) { const an = q[2] + (j - 1.5) * .12, d0 = (20 + 260 * age) * sc, d1 = d0 + (90 - 120 * age) * sc * (.7 + .5 * hash(i, j, 3)), cv = (j - 1.5) * 10 * sc; if (d1 < d0 + 8) continue; p.line([[q[0] + cos(an) * d0, q[1] + sin(an) * d0 * .8], [q[0] + cos(an) * (d0 + d1) / 2 - sin(an) * cv, q[1] + sin(an) * (d0 + d1) * .4 + cos(an) * cv], [q[0] + cos(an) * d1, q[1] + sin(an) * d1 * .8]], { color: j % 2 ? '#f6efdf' : '#3f4d52', w: (j % 2 ? 7 : 3.4) * sc * .7, medium: j % 2 ? 'crayon' : 'graphite', press: .8, taper: [.3, .6], wobble: 1.2 }); } });
      if (t > 3.2) Wd.marchers(p, { k: keys(t, [[3.45, .02], [4.35, .5, 'out'], [4.7, .53], [8, .63]]), n: 21, road: LAND.road, scale: 1.7, gap: .021, light: L, d: .08, tempo: 1.9, coat: '#39434a' });
      burst(p, t, { t0: .84, x: 800, y: 330, n: 7, dir: -2.4, v: 70, s: 5, w: 70, seed: 3, color: '#5a6468' }); burst(p, t, { t0: 1.96, x: 1640, y: 190, n: 9, dir: -2.5, v: 150, s: 9, w: 120, seed: 5 }); burst(p, t, { t0: 4.3, x: 1250, y: 800, n: 13, dir: -2.35, v: 270, s: 14, w: 200, seed: 8, fan: .9 });
      // ---- the call
      p.layer('call', { every: 1, depth: .95 });
      if (t < .9) bundle(p, U.track(spline([[1120, 470], [1150, 420], [1196, 372], [1240, 322], [1270, 296], [1300, 292]], 8, false)), keys(t, [[-.1, 0], [.8, 1, 'io']]), keys(t, [[-.5, 0], [.3, .9, 'out'], [.6, 1]]), { n: 5, spread: 12, w: 3, seed: 2, wander: 7 });
      if (t > .34 && t < 1.7) bundle(p, g.s1, keys(t, [[.62, 0], [1.5, 1, 'io']]), keys(t, [[.34, 0], [.42, .06, 'out'], [.82, 1, 'io']]), { n: 10, spread: 28, w: 3.6, seed: 11, curl: 3, curlR: 9, wander: 8, pinch: .03 });
      if (t > 1.16 && t < 3.3) bundle(p, g.s2, keys(t, [[1.75, 0], [2.15, .2], [2.95, 1, 'io']]), keys(t, [[1.16, 0], [1.3, .05, 'out'], [1.92, 1, 'io']]), { n: 20, spread: 92, w: 7.6, seed: 21, curl: 4, curlR: 22, wander: 22, pinch: .05 });
      if (t > 1.9 && t < 3.9) bundle(p, g.coil, keys(t, [[2.2, 0], [3.0, .3], [3.24, .42], [3.7, 1, 'in']]), keys(t, [[1.88, 0], [2.4, .46, 'out'], [3.0, .72], [3.26, 1, 'in']]), { n: 10, spread: 20, w: 6, seed: 31, wander: 12, pinch: .2, lag: .14 });
      if (t > 3.1 && t < 6.2) bundle(p, g.fall, keys(t, [[3.5, 0], [4.2, .1], [5.0, .62, 'lin'], [6.0, 1, 'io']]), fk, { n: 13, spread: 26, w: 7.4, seed: 41, wander: 12, pinch: .12, lag: .06, fray: .4 });
      if (t > 5.3 && t < 7.9) bundle(p, g.gust2, keys(t, [[5.75, 0], [6.5, .4], [7.6, 1, 'out']]), keys(t, [[5.3, 0], [6.2, .8, 'io'], [6.9, 1, 'lin']]), { n: 6, spread: 80, w: 5, seed: 61, curl: 3, curlR: 24, wander: 30, pinch: .2, lag: .2, fray: .6, alpha: .9 });
      p.layer('near', { every: 2, depth: .9 });
      p.mass(U.below(g.near, 1130), { sharp: true, color: { lin: [0, 800, 0, 1090], stops: [[0, '#93986f'], [.4, '#727f62'], [1, '#414f43']] }, dir: .2, len: 1.2, size: 1, vary: .45 });
      Wd.sward(p, Object.assign({ rg: g.near, depth: 190, n: 300, t, wind: gw, seed: 4, h: 20, d: .06 }, base));
      p.shade([[470, 872], [560, 866], [760, 890], [880, 936], [700, 944], [520, 910]], { color: '#4d5a55', alpha: .45, soft: 14, mode: 'multiply' });
      p.shade([[-40, 1000], [500, 1010], [1400, 1030], [1960, 1020], [1960, 1100], [-40, 1100]], { color: '#39443d', alpha: .5, soft: 40, mode: 'multiply' });
      Wd.grass(p, Object.assign({ line: U.cut(g.near, -40, 1960), n: 74, h: 34, depth: 8, t, wind: gw, seed: 26, d: .04, lines: 60, grow: .2, avoid: x => x > 540 && x < 740 ? .5 : 1 }, base));
      U.found(p, g.near, { color: '#3d3f39', w: 2.8, press: .55, seed: 3, seg: 150, gap: .7, skip: .3 });
      p.layer('people', { every: 1, depth: 1 });
      { const tp = t < 4.7 || t > 6.5 ? Math.floor(p.n / 2) / 6 - 15.3 : t; memo(p, 'people', tp, r => people(r, tp)); }
      p.layer('front', { every: 1, depth: 1 });
      Wd.grass(p, Object.assign({ line: [[-40, 878], [180, 872], [420, 900], [640, 936], [800, 968], [940, 1000]], n: 34, h: 54, depth: 40, t, wind: gw, seed: 6, d: 0, lines: 46, avoid: (x, y) => (y > 960 && x > 360 ? 0 : x > 520 && x < 780 && y < 950 ? .34 : 1) }, base));
      Wd.grass(p, Object.assign({ line: [[-40, 1000], [160, 1020], [330, 1046]], n: 10, h: 120, depth: 40, t, wind: gw, seed: 16, d: 0, lines: 30 }, base));
      Wd.grass(p, Object.assign({ line: [[1640, 1060], [1800, 1040], [1960, 1004]], n: 10, h: 100, depth: 40, t, wind: gw, seed: 18, d: 0, lines: 30 }, base));
      if (t > 4.4 && t < 6.4) bundle(p, g.gust, keys(t, [[4.72, 0], [5.06, .2, 'in'], [5.85, 1, 'out']]), keys(t, GUST), { n: 16, spread: 100, w: 7.8, seed: 51, curl: 5, curlR: 30, wander: 26, pinch: .14, lag: .1, fray: .5 });
    }
  });
  function inv(ks, v) { for (let i = 1; i < ks.length; i++) if (v <= ks[i][1]) { const a = ks[i - 1], b = ks[i]; return lerp(a[0], b[0], clamp((v - a[1]) / ((b[1] - a[1]) || 1e-6))); } return ks[ks.length - 1][0]; }
})();
