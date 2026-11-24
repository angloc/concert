// s05  36.9-43.7  "But come ye back when summer's in the meadow"
//
// FEELING  Her wish: the happiest thing that ever happened, happening again. Joy with a run-up, and an arc that lifts the stomach.
// THREE DRAWINGS
//   A 0.00-1.75  THE MEADOW   gold, waist-high. she stands with her back to us at the left; far off a red streak is coming, weaving. "come ye": she drops to her
//                knees in the grass and throws her arms open. the red line lies across the whole meadow behind him: it is the thread.
//   B 1.75-3.50  THE RUN      him, coming at us, filling the sheet: a real run (drive, airborne, reach, squash), laughing, the red tail flying over his head.
//   C 3.50-6.80  HER ARMS     low, against the sky. three strides, a crouch, the leap; she is up on one knee to meet him; "meadow": caught, rocked back,
//                swung out and round, his legs flying, the red tail drawing a ring in the air after them. then it pales, the seeds they shook loose turn to snow.
// EYE      her back > red streak > her open arms | his face | his leap > her face > the ring > the two heads together
// VALUES   A her dark skirt against gold. B face and jumper light against blue, red over it. C both figures dark-on-light against the sky.
(function () {
  const B = window.BIDE, A = B.anim, { clamp, lerp, keys, hash, noise1, spline, mixc, ease, TAU } = A;
  const sin = Math.sin, cos = Math.cos, max = Math.max, min = Math.min, abs = Math.abs, PI = Math.PI, hyp = Math.hypot;
  const CUT1 = 1.75, CUT2 = 3.5, HIT = 4.58;
  const CL = { dir: -2.2, warm: .85, k: .55 }; // light on the people
  const ss = (a, b, x) => { x = clamp((x - a) / (b - a)); return x * x * (3 - 2 * x); };
  const breeze = (t, x) => .16 + .14 * noise1(t * .7 + x * .0016, 3) + .22 * max(0, noise1(t * .9 - x * .0011, 8));
  const COL = 1.5, SEAS = .34;
  const light = () => Object.assign({}, B.world.light('summer'), { top: '#5f9cc4', mid: '#a6cdd2', low: '#f7dc95', cl: '#fff3d2', cs: '#c9b98c', haze: '#e6dcaa', hz: .56, sun: '#ffd35f', shade: '#5d7a58', tint: '#f4c355', tk: .13, ink: '#4a3b26' });
  const JOY = { base: 'joy', mOpen: .7, mWide: .55, open: .4, smile: 1, brow: .5 };

  // calls that have not changed since the last drawing are laid again without being worked out again
  const MEM = {};
  function memo(p, id, key, fn) {
    const play = l => { for (const c of l) if (c[0] === 'clip') p.clip(c[1], () => play(c[2])); else p[c[0]](...c[1]); };
    const m = MEM[id]; if (m && m.key === key) { play(m.list); return; }
    let list = []; const r = Object.create(p); for (const k of ['mass', 'shade', 'line', 'hatch', 'lift', 'dust', 'push', 'pop', 'translate', 'rotate', 'scale']) r[k] = (...a) => { list.push([k, a]); return p[k](...a); };
    r.clip = (sh, f) => { const out = list, sub = []; list = sub; p.clip(sh, f); list = out; out.push(['clip', sh, sub]); };
    fn(r); MEM[id] = { key, list };
  }
  // ---------------------------------------------------------------- the red tail: a strip of knitted red flying from his fist, ending in the thread
  // hand(t) -> [x, y, size of the boy there]; it goes where the hand has been, sinking and rippling
  function tailPts(hand, t, o = {}) {
    const n = o.n || 26, T = o.T || .9, out = []; for (let j = 0; j <= n; j++) {
      const u = j / n, tau = u * T, q = hand(t - tau), s = q[2], amp = s * (o.amp ?? .15) * Math.pow(u, .7), ph = tau * (o.k || 13) - t * 8.4;
      out.push([q[0] + s * .05 * Math.pow(u, .8) * cos(ph * .8 + 1) + (o.dx || 0) * u * s, q[1] + s * ((o.drop ?? .34) * Math.pow(u, 1.5)) + amp * sin(ph), s, u]);
    } return out;
  }
  function tail(p, pts, t, o = {}) {
    const U = B.world.util, F = [], K = [], L = [], R = []; if (pts.length < 3) return; let q = spline(pts.map(a => [a[0], a[1], a[2]]), 3, false); const m = q.length - 1, tw = []; for (let i = 0; i <= m; i++) { const a = q[max(0, i - 1)], b = q[min(m, i + 1)], l = hyp(b[0] - a[0], b[1] - a[1]) || 1, u = i / m, u0 = (o.u0 || 0) + u * ((o.u1 ?? 1) - (o.u0 || 0)), w = q[i][2] * lerp(.052, .02, u0) * (o.w || 1), c = cos(u0 * 11 - t * 5), k = (.4 + .6 * abs(c)) * w; tw.push(c); L.push([q[i][0] - (b[1] - a[1]) / l * k, q[i][1] + (b[0] - a[0]) / l * k]); R.push([q[i][0] + (b[1] - a[1]) / l * k, q[i][1] - (b[0] - a[0]) / l * k]); }
    for (let i = 0; i < m; i += 2) { const j = min(m, i + 2), z = [L[i], L[i + 1 > m ? m : i + 1], L[j], R[j], R[i + 1 > m ? m : i + 1], R[i]]; (tw[i] > -.1 ? F : K).push(z); }
    const an = Math.atan2(q[m][1] - q[0][1], q[m][0] - q[0][0]); if (K.length) p.mass(U.poly(...K), { color: '#8f2722', dir: an, size: .42, len: .6, vary: .3 }); if (F.length) p.mass(U.poly(...F), { color: '#c9382d', dir: an + .2, size: .42, len: .6, vary: .35 });
    const lw = max(1.4, q[0][2] * .006); p.line(L, { color: '#6d1a18', w: lw * 1.5, press: .7, taper: [.02, .3], wobble: .7 }); p.line(R, { color: '#6d1a18', w: lw * 1.2, press: .5, taper: [.02, .3], wobble: .7 });
    // stitches across it, and the loose thread at the end
    if (q[0][2] > 150) for (let i = 2; i < m; i += 3) p.line([L[i], [lerp(L[i][0], R[i][0], .5) + 2, lerp(L[i][1], R[i][1], .5) + 3], R[i]], { color: '#8f2722', w: lw, press: .4, wobble: .5 });
  }

  // make the tail start in the fist that is actually drawn
  function tie(pts, hand) { if (!hand || !pts.length) return pts; const dx = hand[0] - pts[0][0], dy = hand[1] - pts[0][1]; return pts.map(q => { const k = Math.pow(1 - q[3], 3); return [q[0] + dx * k, q[1] + dy * k, q[2], q[3]]; }); }

  // ---------------------------------------------------------------- A: the meadow
  // his path through the hay: size from distance, ground from size
  const YA = 596, hA = t => 1 / lerp(1 / 58, 1 / 250, clamp((t + .6) / 2.5, -.5, 1.2)), pathA = t => { const h = hA(t); return [keys(t, [[-1.4, 1790], [-.4, 1640], [.5, 1380], [1.05, 1440], [1.8, 1080], [2.4, 900]]), YA + 1.28 * h, h]; };
  const handA = t => { const q = pathA(t); return [q[0] + q[2] * .14, q[1] - q[2] * 1.05, q[2]]; };
  function drawA(p, t) {
    const W = B.world, C = B.cast, U = W.util, L = light(), base = { light: L, season: SEAS, colour: COL }, tq = Math.floor(p.n / 3) / 4;
    p.paper('#efe2be');
    p.layer('A-back', { every: 6, still: true, depth: .12 });
    W.sky(p, { mood: L, t: 0, horizon: 600, seed: 2 }); W.hills(p, Object.assign({ preset: 'west', dy: -50 }, base)); W.meadow(p, Object.assign({ part: 'back', y: 606, t: 0, wind: .3 }, base));
    p.layer('A-mid', { every: 3, depth: .6 });
    memo(p, 'midA', tq, r => W.meadow(r, Object.assign({ part: 'mid', y: 606, t: tq, wind: (tt, x) => breeze(tt, x) }, base)));
    p.layer('A-boy', { every: 1, depth: .9 });
    { const wk = []; for (let j = 0; j <= 14; j++) { const q = pathA(t - j * .16); wk.push([q[0], q[1] - q[2] * .02]); } const rb = U.ribbon(wk, u => hA(t - u * 2.2) * .2 * (1 - .4 * u) + 2, { step: 18, rough: 3 }); p.mass(rb.poly, { sharp: true, color: '#fff1b4', alpha: .62, dir: -.9, size: .6, len: .6, vary: .5, soft: 3 }); p.mass(rb.R.concat(rb.R.map(q => [q[0], q[1] + 5]).reverse()), { sharp: true, color: '#8f8a3e', alpha: .6, dir: -1, size: .4, len: .4 }); }
    const [bx, by, bh] = pathA(t), dx = pathA(t + .05)[0] - bx, f = dx > 4 ? 1 : -1;
    // the line he has drawn across the meadow
    { const P = []; for (let j = 0; j <= 16; j++) { const q = pathA(t - .5 - j * .14); P.push([q[0] + 6 * noise1(j, 4), q[1] - q[2] * .28, .5 + .5 * min(1, q[2] / 100)]); } P.push([1960, 640]); p.line(P, { color: '#b5322b', w: 3.4, press: .85, taper: [.02, .1], wobble: 1, medium: 'crayon' }); }
    const ph = t * 1.5; C.group(p, rec => { const F = C.figure(p, 'boy', { rec, x: bx, y: by - bh * .13 * abs(sin(PI * (ph * 2 + .3))), h: bh, yaw: .75, face: f, legs: { kind: 'run', phase: ph }, lean: .2, armNear: [-.14, .92, 'fist'], expr: JOY, light: CL, wind: [.6, 0] }); tail(p, tie(tailPts(handA, t, { T: .8, amp: .2, drop: .5, n: 18 }), F.handNear), t, { w: 1.5 }); });
    // hay closing round his legs
    W.grass(p, Object.assign({ line: [[bx - bh * .9, by + bh * .02], [bx + bh * .9, by + bh * .02]], n: 12, h: bh * .34, depth: bh * .08, seed: 40 + (p.n % 7), d: .15, lines: 16, t, wind: (tt, x) => breeze(tt, x) + (x - bx > 0 ? 1 : -1) * .7 * Math.exp(-Math.pow((x - bx) / (bh * .3), 2)) }, base));
    p.layer('A-her', { every: 1, depth: 1 });
    const drop = keys(t, [[.5, 0], [1.02, 1, 'in']]), fling = keys(t, [[.55, 0], [.72, -.08, 'out'], [1.18, 1.06, 'io'], [1.36, 1, 'out']]), brt = .02 * sin(t * 5);
    const hx = 520, up = keys(t, [[.2, 0], [.46, 1, 'out'], [.56, .4], [.7, 0]]);
    memo(p, 'Aher', t > 1.35 ? Math.floor(p.n / 2) : p.n + .5, p => C.figure(p, 'mother', { x: hx, y: 1022, h: 720, face: 1, yaw: keys(t, [[.4, 2.36], [1.1, 2.72, 'io']]), legs: drop > 0 ? { kind: 'kneelDown', k: drop } : { kind: 'stand', gap: .07 }, crouch: 0, lean: keys(t, [[.3, .02], [.48, -.03, 'out'], [.9, .14], [1.12, .02, 'out'], [1.3, .06], [1.75, .08]]), bend: -.06 * up, shrug: keys(t, [[.2, 0], [.46, .7, 'out'], [.8, .1], [1.2, .35], [1.7, .2]]) + brt,
      head: { turn: keys(t, [[-.5, -.35], [.15, -.35], [.4, -.1, 'out'], [1.2, -.2]]), nod: keys(t, [[0, -.02], [.4, -.14, 'out'], [1.0, .0], [1.3, -.12]]) },
      armNear: t < .56 ? ['rest', [.12, .9, 'onChair'], keys(t, [[-.5, .9], [.2, .9], [.5, .6]])] : ['rest', [-.36, .66 + brt + .05 * fling, 'open'], fling], armFar: ['rest', [.39, .68 - brt + .05 * fling, 'open'], fling], noFeet: true, expr: 'joy', light: CL, wind: [.24 + .3 * keys(t, [[.9, 0], [1.1, 1, 'out'], [1.6, .2]]), 0], drag: [0, -.04 * sin(PI * clamp((t - .6) / .5))] }));
    p.layer('A-front', { every: 1, depth: 1 });
    const puff = keys(t, [[.94, 0], [1.06, 1, 'out'], [1.7, .25]]), wf = (tt, x, y) => breeze(tt, x) + (x > hx ? 1 : -1) * .9 * puff * Math.exp(-Math.pow((x - hx) / 260, 2));
    foot(p, 974);
    W.grass(p, Object.assign({ line: [[-40, 990], [300, 984], [700, 990], [1000, 994]], n: 46, h: 200, depth: 30, seed: 17, d: 0, lines: 70, t, wind: wf, avoid: (x, y) => (abs(x - hx) < 170 ? lerp(1, .66, puff) : 1) * (x > 740 ? .4 : 1) }, base));
    W.grass(p, Object.assign({ line: [[880, 986], [1400, 978], [1960, 986]], n: 30, h: 96, depth: 22, seed: 27, d: 0, lines: 34, t, wind: wf }, base));
    nearHay(p, t, wf, base, { id: 'A' });
  }
  // a quiet dark foot to the sheet for the words: shade under the hay, laid before the near grass
  function foot(p, y = 968) { p.mass([[-40, y - 6], [300, y + 6], [760, y - 2], [1200, y + 8], [1600, y - 4], [1960, y + 2], [1960, 1130], [-40, 1130]], { color: { lin: [0, y, 0, 1080], stops: [[0, '#76803f'], [.4, '#4d5a33'], [1, '#3c4a2d']] }, dir: -1.3, size: .7, len: .7, vary: .45, soft: 16 }); }
  // near hay kept to the two sides, short and dark behind the words
  function nearHay(p, t, wf, base, o = {}) { const tq = Math.floor(p.n / 2) / 6; memo(p, 'hay' + (o.id || ''), tq, r => nearHay1(r, t, wf, base, o)); }
  function nearHay1(p, t, wf, base, o) {
    const W = B.world; W.grass(p, Object.assign({ line: [[300, 1010], [960, 1018], [1620, 1010]], n: 20, h: 44, depth: 30, seed: 23, d: 0, lines: 26, t, wind: wf, tint: '#3f4c2c' }, base));
    [[-10, 1070, 22, 420, .22], [110, 1078, 16, 330, .1], [250, 1070, 10, 220, .02], [1690, 1070, 13, 280, -.1], [1810, 1064, 20, 400, -.16], [1930, 1072, 20, 440, -.26]].forEach((q, i) => W.tall(p, Object.assign({ x: q[0], y: q[1], n: q[2], h: q[3] * (o.k || 1), spread: 46 + q[2] * 2.6, seed: i + 31, lean: q[4], light1: .15, t, wind: wf }, base)));
    W.flowers(p, Object.assign({ rg: [[-60, 972], [600, 966], [1300, 972], [1980, 964]], x0: -20, x1: 430, y0: -70, y1: 40, n: 14, s: 1.2, stems: 1, seed: 9, drift: 1, t, wind: wf }, base)); W.flowers(p, Object.assign({ rg: [[-60, 972], [600, 966], [1300, 972], [1980, 964]], x0: 1180, x1: 1940, y0: -70, y1: 30, n: 22, s: 1.2, stems: 1, seed: 12, drift: 1, t, wind: wf }, base));
  }

  // ---------------------------------------------------------------- B: the run
  const uB = t => clamp((t - CUT1 + .2) / (CUT2 - CUT1 + .2), -.4, 1.1), hB = t => 1 / lerp(1 / 300, 1 / 1280, uB(t)), xB = t => keys(t, [[1.1, 1760], [1.75, 1520], [2.35, 1300, 'io'], [2.7, 1130, 'io'], [3.1, 860, 'in'], [3.5, 470, 'lin'], [3.9, 60]]);
  const PHB = t => (t - CUT1) * 1.42 + .1, hopB = t => hB(t) * .135 * Math.pow(abs(sin(PI * (PHB(t) * 2 + .28))), .75);
  const yB = t => 664 + .8 * hB(t);
  const handB = t => [xB(t) + hB(t) * .2, yB(t) - hopB(t) - hB(t) * (1.02 + .03 * sin(t * 9)), hB(t)];
  function drawB(p, t) {
    const W = B.world, C = B.cast, U = W.util, L = light(), base = { light: L, season: SEAS, colour: COL }, n = Math.round((t - CUT1) * 12), tq = Math.floor(p.n / 3) / 4;
    p.paper('#efe2be');
    p.layer('B-back', { every: 6, still: true, depth: .1 });
    W.sky(p, { mood: L, t: 0, horizon: 660, seed: 6 }); W.hills(p, Object.assign({ preset: 'west', dy: 20 }, base)); W.meadow(p, Object.assign({ part: 'back', y: 668, t: 0, wind: .3 }, base));
    p.layer('B-mid', { every: 3, depth: .6 }); memo(p, 'midB', tq, r => W.meadow(r, Object.assign({ part: 'mid', y: 660, t: tq, wind: (tt, x) => breeze(tt, x) }, base)));
    const x = xB(t), h = hB(t), y = yB(t), ph = PHB(t), hop = hopB(t), air = Math.pow(abs(sin(PI * (ph * 2 + .28))), .8), sq = 1 - air;
    p.layer('B-boy', { every: 1, depth: 1 });
    { const P = []; for (let j = 0; j <= 10; j++) { const q = t - .75 - j * .1; P.push([xB(q), yB(q) - hB(q) * .3, .6]); } p.line(P, { color: '#b5322b', w: 4, press: .8, taper: [.02, .4], medium: 'crayon' }); }
    C.group(p, rec => {
      const F = C.figure(p, 'boy', { rec, x, y: y - hop, h, yaw: lerp(.72, .5, uB(t)), face: -1, legs: { kind: 'run', phase: ph }, lean: .2 + .1 * air, bend: -.07 * air + .1 * sq, crouch: .1 * sq, twist: .26 * sin(TAU * ph), side: .05 * sin(TAU * ph), head: { nod: -.08 + .1 * sq, tilt: .09 * sin(TAU * ph + .7), turn: -.1 }, armNear: [-.16, .9 + .03 * sin(t * 9), 'fist'], expr: Object.assign({}, JOY, { mOpen: .6 + .25 * air }), light: CL, wind: [.95, -.15], drag: [.05, 0] });
      tail(p, tie(tailPts(handB, t, { T: .62, amp: .17, drop: .2, n: 22, k: 15, dx: .7 }), F.handNear), t, { w: 1.2 });
    });
    p.layer('B-front', { every: 1, depth: 1 });
    const part = (tt, gx, gy) => breeze(tt, gx) + (gx - x > 0 ? 1 : -1) * 1.1 * Math.exp(-Math.pow((gx - x) / (h * .26), 2)) + .55 * Math.exp(-Math.pow((gx - x - h * .6) / (h * .5), 2));
    W.grass(p, Object.assign({ line: [[x - h * 1.3, y + 4], [x, y + 10], [x + h * 1.3, y + 4]], n: 34, h: h * .42, depth: h * .08, seed: 60 + (p.n % 5), d: .04, lines: 46, t, wind: part }, base));
    [[x - h * .34, y + h * .03, 7], [x + h * .36, y + h * .05, 7]].forEach(([gx, gy, m], i) => W.tall(p, Object.assign({ x: gx, y: gy, n: m, h: h * .5, spread: h * .1, seed: 70 + i + (p.n % 4) * 3, lean: i ? .5 : -.6, t, wind: (tt, q) => breeze(tt, q), light1: .2 }, base)));
    // what his feet throw up
    const st = ph * 2 - Math.floor(ph * 2); for (let i = 0; i < 11; i++) { const q = (st + .1 * hash(i, p.n - Math.round(st * 4), 1)) , a = -PI / 2 + (hash(i, Math.floor(ph * 2), 2) - .4) * 1.9, d = h * (.08 + .34 * q) * (.5 + .8 * hash(i, Math.floor(ph * 2), 3)), X = x + h * .1 + cos(a) * d, Y = y - h * .03 + sin(a) * d * .8 + h * .3 * q * q; p.line([[X, Y], [X + cos(a + q * 3) * h * .03, Y + sin(a + q * 3) * h * .03]], { color: i % 2 ? '#e9cf7d' : '#7b7a3c', w: 2 + h * .005, press: .85 * (1 - q * .6), taper: [.1, .5] }); }
    foot(p, 980);
    if (t > 3.08) { const k = clamp((t - 3.08) / .42); for (let i = 0; i < 16; i++) { const q = k * 1.5 - .5 * hash(i, 8, 1); if (q < 0 || q > 1) continue; const X = lerp(x + 120, x - 620, hash(i, 8, 2)), L = 300 + 460 * hash(i, 8, 3), a = lerp(-1.75, -3.0, ease.out(q)) + .3 * (hash(i, 8, 4) - .5); p.line([[X, 1120], [X + cos(a * .5 - .8) * L * .5, 1120 + sin(a * .5 - .8) * L * .55], [X + cos(a) * L, 1120 + sin(a) * L * .9 - 60]], { color: ['#f4d766', '#8d9140', '#fff0b4', '#6c7c36'][i % 4], w: 9 + 10 * hash(i, 8, 5), press: .85, medium: 'crayon', taper: [.02, .6], wobble: 1.3 }); } }
    W.grass(p, Object.assign({ line: [[-40, 990], [500, 984], [1000, 992], [1500, 984], [1960, 990]], n: 66, h: 150, depth: 18, seed: 37, d: .01, lines: 90, t, wind: part }, base));
    nearHay(p, t, part, base, { k: 1.25, id: 'B' });
    if (n <= 0) p.lift([[-40, -40], [1960, -40], [1960, 1120], [-40, 1120]], { amount: .26, soft: 10 });
  }

  // ---------------------------------------------------------------- C: her arms
  const MX = 690, MY = 952, MH = 636, BH = MH * .63;
  // his line in: three strides, a crouch, a leap, then whatever she does with him
  const runX = t => keys(t, [[3.3, 1780], [4.18, 1226, 'lin'], [4.29, 1184, 'out'], [HIT, 902, 'lin'], [4.7, 890]]);
  const leapY = t => { const u = clamp((t - 4.26) / (HIT - 4.26)); return u <= 0 ? 0 : 118 * sin(PI * .66 * u); };
  const PHI = [[HIT, 90], [4.72, 84, 'out'], [4.86, 48, 'in'], [5.0, -14, 'lin'], [5.12, -62, 'lin'], [5.28, -92, 'out'], [5.4, -112], [5.52, -160, 'in'], [5.62, -210, 'lin'], [5.74, -250, 'out'], [5.88, -274], [6.06, -294, 'out'], [6.6, -302], [7.2, -306]];
  const LIFT = [[HIT, -.1], [4.7, -.2, 'out'], [4.9, .25], [5.28, 1, 'io'], [5.6, 1.05], [5.8, .95], [6.08, .05, 'io']], OUT = [[HIT, .62], [4.74, .55], [5.1, 1, 'io'], [5.8, 1], [6.08, .1, 'io']];
  const wrap = a => { a = ((a + PI) % TAU + TAU) % TAU - PI; return a; };
  // the pair: she at the hub, he held under the arms at the rim, lying out from her as hard as she turns
  function pairPose(t) {
    const phi = keys(t, PHI) * PI / 180, lift = keys(t, LIFT), out = keys(t, OUT), a = wrap(phi), sp = sin(a), cp = cos(a), hb = BH * (1 + .12 * cp * out), r1 = lerp(.18, .3, out) * MH, H1 = lerp(.62, .92, lift) * MH, x = MX + keys(t, [[HIT, 4], [4.7, -54, 'out'], [5.02, -14], [5.5, 6], [6.2, 0]]), y = MY, ax = x + r1 * sp, ay = y - H1 + r1 * cp * .16, tau = out * 1.2, psi = Math.atan2(sin(tau) * sp, cos(tau));
    return { a, sp, cp, hb, ax, ay, psi, lift, out, x, y };
  }
  // where his fist is, and where the tail is that comes after it: close to them it follows the fist, further back it has been flung out wide
  const handC = t => { const x = runX(t), y = MY - leapY(t); return [x + BH * .1, y - BH * 1.02, BH]; };
  const ringT = t => min(.86, t - keys(t, [[HIT, HIT - .42], [5.05, 4.79, 'io']]));
  function ring(t, hand) {
    const n = 34, T = ringT(t), out = []; for (let j = 0; j <= n; j++) {
      const u = j / n, tt = t - u * T; if (tt < HIT - .02) { const q = handC(tt), k = clamp((t - HIT) / .5); out.push([q[0] + BH * .35 * u, q[1] + BH * (.16 * sin(u * 11 - t * 8) + .3 * u * u) * (1 - .3 * k), BH, u]); continue; }
      const at = (tq, uu) => { const q = pairPose(tq), lag = keys(tq - .05, PHI) * PI / 180, R = lerp(.36, lerp(.5, .78, q.out), ease.out(clamp(uu * 3))) * MH * lerp(.7, 1, q.out), H = lerp(.74, 1.06, q.lift) * MH - .1 * MH * uu; return [q.x + R * sin(lag), q.y - H + R * cos(lag) * .24, 1 + .16 * cos(lag)]; };
      const z = at(tt, u), z0 = at(HIT, u), h0 = handC(HIT), k = 1 - ss(0, .34, tt - HIT); out.push([z[0] + (h0[0] - z0[0]) * k, z[1] + (h0[1] - z0[1]) * k + lerp(6, 36, u) * sin(u * 13 - t * 8), BH * z[2], u]);
    } return tie(out, hand);
  }
  function pair(p, t, before) {
    if (t > 6.06) { // settled: his head on her shoulder, the turn dying away
      let F; B.cast.group(p, rec => { F = B.cast.carry(p, { rec, x: MX, y: MY, h: MH, yaw: keys(t, [[6.06, 1.2], [6.5, 1.02, 'out'], [7.4, .95]]), lift: 0, face: 1, light: CL, expr: ['peace', 'peace'], wind: [.3, 0], drag: [keys(t, [[6.06, -.09], [6.5, .03, 'out'], [6.9, 0]]), 0], legs: { kind: 'stand', gap: .07 } }); if (before) before(F.b); }); return F.b;
    }
    const C = B.cast, q = pairPose(t), { a, sp, cp, hb, ax, ay, psi, lift, out, x, y } = q, b = wrap(a + PI), f = a < 0 ? -1 : 1, fb = b < 0 ? -1 : 1, rise = keys(t, [[HIT, .42], [4.72, .5, 'out'], [5.04, 0, 'io']]), spin = out * clamp((t - 4.7) / .3), shX = x + .05 * MH * sp, shY = y - (.8 - .24 * rise) * MH, hug = keys(t, [[5.86, 0], [6.1, 1, 'io']]);
    const M = { x, y, h: MH, face: f, yaw: abs(a), noFeet: true, lean: -.05 - .13 * out + keys(t, [[HIT - .04, .26], [4.66, -.24, 'out'], [4.86, -.1], [5.1, 0]]), bend: -.06 + .08 * hug, legs: rise > .02 ? { kind: 'kneelDown', k: rise } : { kind: 'stand', gap: .07, stance: .05 }, expr: hug > .5 ? ['joy', 'peace', hug] : JOY, head: { nod: lerp(-.28 * lift, .18, hug), turn: -.22 * abs(sp) * (1 - hug), tilt: .16 * hug }, light: CL, armNear: { at: [ax - .02 * MH * sp + .03 * MH * cp, ay + .03 * MH + .06 * MH * hug], h: 'onChair', elbow: -1 }, armFar: { at: [ax - .02 * MH * sp - .03 * MH * cp, ay + .01 * MH], h: 'onChair', elbow: -1 }, wind: [.2 - .75 * cp * spin, 0], drag: [-.13 * cp * f * spin - .03 * spin, -.02 * spin] };
    const K = { x: ax, y: ay + .72 * hb, h: hb, face: fb, yaw: abs(b), rot: -psi, pivot: [0, -.72], legs: { kind: 'hang', k: lerp(.2, .6, hug) + .5 * max(0, cp) * out, kick: .9 * out, swing: 0 }, expr: hug > .5 ? ['joy', 'peace', hug] : JOY, head: { nod: lerp(-1.15 * abs(sp) * out, .1, hug), turn: -.75 * abs(sp) * out * (1 - hug), tilt: 0 }, armNear: { at: [ax + .13 * hb * sp * out, ay - lerp(.2, .22, out) * hb], h: 'fist' }, armFar: { at: [shX + 6, shY - 8], h: 'onChair' }, light: CL, wind: [.7 * sp, 0] };
    let F; C.group(p, rec => { M.rec = rec; K.rec = rec; const boy = () => { F = C.figure(p, 'boy', K); }; if (cp > .3) { C.figure(p, 'mother', M); boy(); } else { boy(); C.figure(p, 'mother', M); } if (before) before(F); });
    return F;
  }
  function drawC(p, t) {
    const W = B.world, C = B.cast, U = W.util, L = light(), base = { light: L, season: SEAS, colour: COL }, n = Math.round((t - CUT2) * 12), tq = Math.floor(p.n / 3) / 4, pale = keys(t, [[5.6, 0], [6.3, .42, 'io'], [7.2, .86]]);
    p.paper('#efe2be');
    p.layer('C-back', { every: 6, still: true, depth: .1 });
    W.sky(p, { mood: L, t: 0, horizon: 720, seed: 9 }); W.hills(p, Object.assign({ preset: 'west', dy: 70 }, base)); W.meadow(p, Object.assign({ part: 'back', y: 716, t: 0, wind: .3 }, base));
    p.layer('C-mid', { every: 3, depth: .6 }); memo(p, 'midC', tq, r => W.meadow(r, Object.assign({ part: 'mid', y: 706, t: tq, wind: (tt, x) => breeze(tt, x) }, base)));
    p.layer('C-act', { every: 1, depth: 1 });
    const split = pts => { const back = [], fore = []; let run = null, side = null; pts.forEach((q, j) => { const tt = t - j / (pts.length - 1) * ringT(t), sd = q[3] < .16 ? -1 : tt < HIT ? 1 : cos(keys(tt - .05, PHI) * PI / 180) < -.05 ? -1 : 1; if (sd !== side) { if (run) run.push(q); run = [q]; side = sd; (sd < 0 ? back : fore).push({ r: run, u0: q[3] }); } else run.push(q); }); return { back, fore }; };
    const lay = l => l.forEach(o => tail(p, o.r, t, { w: 1.1, u0: o.u0, u1: o.r[o.r.length - 1][3] }));
    if (t < HIT) {
      const x = runX(t), up = leapY(t), cr = keys(t, [[4.08, 0], [4.2, 1, 'out'], [4.31, .05, 'out'], [HIT, 0]]), fl = ss(4.25, 4.44, t), ph = (1780 - x) / C.stride('boy', 'run', BH) * 1.05, air = t < 4.14 ? Math.pow(abs(sin(PI * (ph * 2 + .28))), .8) : 0;
      const pts = tailPts(handC, t, { T: .5, amp: .2, drop: .3, n: 30, k: 12, dx: .6 });
      // she: on her knees, beckoning with her whole body; up on one knee as he leaps
      const rk = keys(t, [[4.16, 1], [4.5, .42, 'io']]), bk = t < 4.15 ? ease.io(clamp(sin(t * 11) * 1.2)) : 0, be = .04 * bk, reach = keys(t, [[3.4, .3], [3.9, .55], [4.15, .4], [4.5, 1, 'io']]) - .35 * bk;
      memo(p, 'Cher', t < 4.1 ? Math.floor(p.n / 2) : p.n + .5, p => C.figure(p, 'mother', { x: MX, y: MY, h: MH, face: 1, yaw: keys(t, [[3.4, 1.05], [4.3, 1.32, 'io']]), legs: { kind: 'kneelDown', k: rk }, lean: keys(t, [[3.4, .1], [3.9, .18], [4.15, .04], [4.5, .3, 'io']]) - .07 * bk, bend: -.05 + .05 * bk, shrug: .2 + 4 * be, head: { nod: keys(t, [[3.4, -.05], [4.3, -.02], [4.55, -.2]]), turn: keys(t, [[4.1, -.42], [4.5, -.12]]), tilt: .06 * bk }, armNear: [[.16, .44 + be, 'open'], [.38, .56, 'open'], reach], armFar: [[.34, .56 + be, 'open'], [.45, .64, 'open'], reach], noFeet: true, expr: JOY, light: CL, wind: [.22, 0], drag: [keys(t, [[4.1, 0], [4.4, -.08], [HIT, -.04]]), 0] }));
      const running = t < 4.14;
      const K = running ? { x, y: MY - BH * .09 * air, h: BH, yaw: 1.02, face: -1, legs: { kind: 'run', phase: ph }, lean: .2 + .06 * air, bend: .04 * (1 - air), crouch: .05 * (1 - air), twist: .2 * sin(TAU * ph), head: { nod: -.16, turn: -.34, tilt: .06 * sin(TAU * ph) }, armFar: [-.12, 1.0, 'fist'], armNear: ['rest', 'reach', .5 + .5 * sin(TAU * ph)], expr: JOY, light: CL, wind: [.95, -.1] }
        : { x: lerp(x, x, 1), y: MY - up + (fl > 0 ? 0 : 0), h: BH, yaw: 1.4, face: -1, rot: -.95 * fl + .12 * cr, pivot: [0, -.55], crouch: .3 * cr, bend: .2 * cr - .1 * fl, legs: fl > .1 ? { kind: 'run', phase: .48 } : { kind: 'stand', gap: .1, stance: .05 }, lean: .25 * cr, head: { nod: -.1 - .75 * fl, turn: -.05 }, armNear: cr > .4 && fl < .2 ? [-.2, .5, 'fist'] : [.3, .86, 'open'], armFar: cr > .4 && fl < .2 ? [-.26, .56, 'fist'] : [.34, .96, 'fist'], expr: JOY, light: CL, wind: [.9, -.1] };
      if (t > 4.36 && t < HIT) smear(p, x + BH * .2, MY - up - BH * .5, t); // one stretched drawing under the fastest part of the leap
      C.group(p, rec => { K.rec = rec; const F = C.figure(p, 'boy', K); tail(p, tie(pts, F.handFar), t, { w: 1.1 }); });
    } else { let z = null; pair(p, t, F => { z = split(ring(t, F.handNear)); lay(z.back); if (t > 6.06) { lay(z.fore); z = null; } }); if (z) lay(z.fore); }
    p.layer('C-front', { every: 1, depth: 1 });
    const burst = keys(t, [[HIT, 0], [4.68, 1, 'out'], [5.0, .8], [6.0, .6], [6.8, .2]]), sw = t > 4.9 ? .5 * sin(keys(t - .08, PHI) * PI / 180) * burst : 0, bxr = t < HIT ? runX(t) : -999;
    const wf = (tt, x, y) => breeze(tt, x) + (x > MX ? 1 : -1) * .85 * burst * Math.exp(-Math.pow((x - MX) / 250, 2)) + sw * Math.exp(-Math.pow((x - MX) / 420, 2)) + (x - bxr > 0 ? 1 : -1) * .95 * Math.exp(-Math.pow((x - bxr) / 110, 2)) + .5 * Math.exp(-Math.pow((x - bxr - 190) / 170, 2));
    foot(p, 972);
    // the hay swirls after them: arcs combed round the hub
    if (t > 4.84) { const k = clamp((t - 4.84) / .2) * keys(t, [[4.8, 1], [6.0, .8], [6.6, 0]]); for (let i = 0; i < 12; i++) { const a1 = keys(t - .05 - .05 * hash(i, 4, 1), PHI) * PI / 180, R = 130 + 330 * hash(i, 4, 2), L = .9 + .9 * hash(i, 4, 3), P = []; for (let j = 0; j <= 7; j++) { const a = a1 + L * j / 7 + .4 * (hash(i, 4, 5) - .5); P.push([MX + R * sin(a), min(946, MY - 34 + R * .12 * cos(a) - 26 * hash(i, 4, 6)), 1 - .7 * j / 7]); } const Q = P.filter(q => abs(q[0] - MX) > 150); if (Q.length < 4 || Q.some((q, j) => j && abs(q[0] - Q[j - 1][0]) > 220)) continue; p.line(Q, { color: ['#ffe9a6', '#6d7a38', '#f7d56e'][i % 3], w: i % 3 === 1 ? 4 : 9, press: .8 * k, medium: i % 3 === 1 ? 'graphite' : 'crayon', taper: [.1, .7], wobble: 1.4 }); } }
    W.grass(p, Object.assign({ line: [[-40, 966], [500, 960], [1000, 968], [1500, 958], [1960, 966]], n: 64, h: 128, depth: 20, seed: 17, d: .02, lines: 86, t, wind: wf, avoid: (x) => abs(x - MX) < 150 ? lerp(1, .62, burst) : 1 }, base));
    nearHay(p, t, wf, base, { id: 'C' });
    if (t > HIT && t < HIT + .5) for (let i = 0; i < 22; i++) { const q = (t - HIT) / .5, a = -PI / 2 + (hash(i, 3, 2) - .5) * 2.5, d = 40 + 260 * ease.out(q) * (.4 + .8 * hash(i, 3, 3)), X = MX + 60 + cos(a) * d, Y = MY - 20 + sin(a) * d * .7 + 120 * q * q; p.line([[X, Y], [X + cos(a + q * 4) * 18, Y + sin(a + q * 4) * 18]], { color: i % 2 ? '#f0d98c' : '#86843f', w: 4.5, press: .85 * (1 - q), taper: [.1, .5] }); }
    seeds(p, t);
    if (pale > .01) p.air({ color: '#f3efe7', alpha: pale, mode: 'over' });
    if (n <= 0) { p.layer('C-cut', { every: 1 }); p.lift([[-40, -40], [1960, -40], [1960, 1120], [-40, 1120]], { amount: .26, soft: 10 }); }
  }
  // the stretched drawing
  function smear(p, x, y, t) { for (let i = 0; i < 6; i++) { const k = (i - 2.5) * 26; p.line([[x + 250 - 14 * i, y + k * .8 + 40], [x + 120, y + k * .9 + 8], [x - 20, y + k]], { color: ['#d9c898', '#f3e7c4', '#6f86a0', '#d9c898', '#b5322b', '#f3e7c4'][i], w: 16 - abs(i - 2.5) * 3, medium: 'crayon', press: .7, taper: [.7, .12], wobble: 1.2 }); } }
  // dandelion seeds shaken loose by the swing; they go up on the warm air, hang, and come down as the first of the snow
  function seeds(p, t) {
    const flakes = [];
    for (let i = 0; i < 64; i++) {
      const h = k => hash(i, 19, k), t0 = HIT + .12 + 1.3 * h(1), age = t - t0; if (age < 0) continue; const a = -PI / 2 + (h(2) - .5) * 2.2, up = (170 + 420 * h(3)) * (1 - Math.exp(-age * 2.1)), x = MX + (h(4) < .5 ? -1 : 1) * (120 + 300 * h(8)) + cos(a) * up + 70 * noise1(age * .9 + i, 4) + (60 + 60 * h(6)) * age * .6, y = MY - 40 + sin(a) * up + 46 * age * age * (.5 + h(5)), s = 7 + 8 * h(7), r = age * 2 + i; if (y > 960) continue;
      const snow = ss(5.8, 6.4, t), tl = .35 * sin(age * 2 + i * 1.7) + .25; if (snow < .85) { for (let j = -2; j <= 2; j++) p.line([[x, y], [x + sin(tl + j * .42) * s, y - cos(tl + j * .42) * s]], { color: '#fffaf0', w: 2.1, press: .85 * (1 - snow * .7), taper: [.05, .5], wobble: .3 }); p.line([[x, y], [x - sin(tl) * s * .9, y + cos(tl) * s * .9]], { color: '#8d7a45', w: 1.7, press: .75 * (1 - snow), taper: [.05, .2] }); }
      if (snow > .1) flakes.push(B.world.util.lump(x, y, s * .42 * snow, s * .4 * snow, i, { n: 7, rough: .2 }));
    }
    if (flakes.length) p.mass(B.world.util.poly(...flakes), { color: '#fbf7ee', size: .36, len: .36, vary: .1, dir: 0 });
  }
  B.scene({ id: 's05', ink: 'dark', draw(p, s) { const n = Math.round(s.t * 12), t = s.t; if (n < Math.round(CUT1 * 12)) drawA(p, t); else if (n < Math.round(CUT2 * 12)) drawB(p, t); else drawC(p, t); } });
})();
