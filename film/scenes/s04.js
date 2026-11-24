// s04 · THE GATE  (29.4 – 36.9)  "It's you, it's you must go and I must bide"
//
// Feeling: the body holds on after the mind has let go.
// Words (scene time): It's .24 · YOU .61 · it's 1.13 · YOU 1.50 · must 2.87 · GO 3.33 · and 3.88 · I 4.34 · must 4.72 · BIDE 5.17–7.2
// A  -.4 – 2.35  a step apart, neither moves. She breathes in (.2) and goes into him; they meet on "you" (.61). His head comes down on hers. On the second "it's you" she holds harder.
// B  2.35 – 3.9  CLOSE. Hands already sliding. Fingertips stay (3.45–3.72), part. A strand of his scarf has caught round her finger; it runs out of its slack, tightens, and one stitch lets go.
// C  3.9 – end   Wide, behind her. He walks; the thread pays out of the scarf. "I must": the wind drops, her skirt comes to rest. He stops. 5.95 he looks back. Nobody moves. Only the thread.
// Eye: their two heads → the finger with the red loop → the red line → the small dark figure.
// Value: dark pair on pale hill; warm hands on slate; one dark woman against the sky, one small dark man on the pale road.
(function () {
  const B = window.BIDE, A = B.anim, { clamp, lerp, ease, hash, noise1, mixc, keys } = A, TAU = Math.PI * 2, hyp = Math.hypot;
  const ss = (a, b, x) => { x = clamp((x - a) / (b - a)); return x * x * (3 - 2 * x); };
  const GREY = { dir: -1.9, warm: .3, k: .42 }, CB = 2.35, CC = 3.9, BASE = { season: .6, colour: .3, light: 'day' };

  // ------------------------------------------------------------------ A
  function placeA(p, t, wind) {
    const W = B.world; p.paper('#e4dccb'); const o = Object.assign({ wind }, BASE);
    const In = f => { p.push(); p.translate(-1790, -722); p.scale(1.9, 1.9); f(); p.pop(); };
    In(() => W.yard(p, Object.assign({ part: 'back', cottage: false, clouds: 2 }, o))); In(() => W.yard(p, Object.assign({ part: 'mid' }, o))); In(() => W.yard(p, Object.assign({ part: 'gate', gate: .86, swing: -52 }, o)));
  }
  function drawA(p, t, s) {
    const C = B.cast, W = B.world, g = W.gusts({ seed: 8, every: 2.6, power: .8, base: .2 }); placeA(p, t, g);
    const k = keys(t, [[-.6, .04], [.12, .07], [.24, .0, 'io'], [.58, 1, 'in'], [.66, 1.0]]), sq = keys(t, [[1.12, 0], [1.4, 1, 'out'], [2.6, .75]]), hit = keys(t, [[.5, 0], [.6, 1, 'in'], [.78, -.25, 'out'], [1.0, .06], [1.2, 0]]), rest = keys(t, [[.75, 0], [1.2, 1, 'io']]);
    const kk = ss(0, 1, k), h = 762, XB = 1156, gap = lerp(.52, .165, kk) * h, x = XB - gap * .5 + 8 * hit, w = g(t, 900) * .55, v = keys(t, [[.24, 0], [.45, 1, 'in'], [.6, .8], [.8, -.35, 'out'], [1.1, .1], [1.4, 0]]);
    const br = .006 * Math.sin(t * 1.9) + (t > 1.5 ? .006 * Math.sin(t * 3.4) * Math.exp(-(t - 1.5)) : 0);
    p.layer('people', { every: 2, depth: .95 });
    p.shade([[820, 940], [1000, 920], [1280, 924], [1380, 950], [1240, 978], [930, 980]], { color: '#4c4a44', alpha: .4, soft: 18 });
    C.embrace(p, { a: 'mother', b: 'danny', x, y: 946, h, k, t, rock: .008, light: GREY, wind: [w * .6, 0], expr: [[{ base: 'falter', gy: -.35, open: .85 }, { base: 'ache', open: 0, browIn: 1, knit: .8, press: .4 }, ss(.35, .7, t)], [{ base: 'holdingBack', gy: .3 }, { base: 'ache', open: 0, press: .3 }, ss(.6, 1.1, t)]],
      poseA: { noFeet: k > .5, lean: lerp(.03, .1, kk) + .06 * v * (1 - kk) + .03 * hit + .03 * sq + br, drag: [-.12 * v, 0], shrug: .12 * sq + .25 * clamp(hit), bend: .04 + .1 * kk + .03 * sq, head: { turn: lerp(0, -.2, kk), nod: lerp(-.1, .1, kk) + .06 * sq, tilt: lerp(0, .2, kk) }, legs: k > .08 && k < .99 ? { kind: 'walk', phase: .15 + kk * .62, amp: 1.2 } : { kind: 'stand', gap: .07 } },
      poseB: { lean: lerp(.02, .1, kk) - .09 * hit + .03 * sq - br, bend: .04 + .2 * kk * (.5 + .12 * rest) + .025 * sq, shrug: .14 * sq, drag: [-.05 * v, 0], head: { turn: lerp(0, .1, kk), nod: lerp(.2, .3, rest * kk) + .05 * sq, tilt: lerp(0, .14, rest) + .05 * sq }, legs: { kind: 'stand', gap: .05 + .03 * clamp(hit) } } });
    p.layer('front', { every: 2, depth: 1 }); p.push(); p.translate(-1790, -722); p.scale(1.9, 1.9); W.grass(p, Object.assign({ line: [[940, 884], [1060, 892], [1180, 886]], n: 16, h: 40, depth: 10, t, wind: g, seed: 19, d: .03, lines: 18 }, BASE)); p.pop();
  }

  // ------------------------------------------------------------------ B
  function strandPts(a, b, L, vib, t) { const d = hyp(b[0] - a[0], b[1] - a[1]), sag = Math.sqrt(Math.max(0, .375 * d * (L - d))), o = []; for (let i = 0; i <= 18; i++) { const u = i / 18, q = 4 * u * (1 - u); o.push([lerp(a[0], b[0], u) + 4 * noise1(u * 6, 2) * (sag / 160), lerp(a[1], b[1], u) + sag * q + vib * Math.sin(u * Math.PI * 2) * Math.sin(t * 38) + (sag > 30 ? 10 * noise1(u * 5 + 3, 7) * q : 0)]); } return o; }
  function drawB(p, t, s) {
    const C = B.cast, W = B.world; p.paper('#dcd8cc');
    p.layer('far', { every: 6, still: true, depth: .08 });
    p.mass([[-40, -40], [1960, -40], [1960, 420], [-40, 420]], { sharp: true, color: { lin: [0, 0, 0, 400], stops: [[0, '#aeb6b6'], [1, '#d8d2c2']] }, dir: -.08, len: 1.5, size: 1.2, vary: .3 });
    p.mass([[-40, 300], [300, 250], [760, 210], [1200, 250], [1600, 200], [1960, 230], [1960, 800], [-40, 800]], { color: { lin: [0, 220, 0, 800], stops: [[0, '#8b958f'], [.4, '#79837c'], [1, '#8d8b76']] }, dir: .12, len: 1.4, size: 1.2, vary: .45 });
    p.mass([[-40, 780], [500, 740], [1100, 752], [1960, 726], [1960, 1120], [-40, 1120]], { color: { lin: [0, 740, 0, 1080], stops: [[0, '#b0a68a'], [1, '#c2b697']] }, dir: .04, len: 1.4, size: 1.1, vary: .4 });
    p.mass([[900, 1120], [1080, 900], [1300, 800], [1560, 752], [1640, 752], [1520, 830], [1500, 940], [1620, 1120]], { color: '#cfc3a4', alpha: .7, dir: .9, size: 1, soft: 14 });
    // the end bar of the gate, soft, behind
    p.mass([[190, -40], [246, -40], [252, 1120], [186, 1120]], { sharp: true, color: '#6d675b', alpha: .8, dir: 1.5, size: .8, soft: 5 }); p.mass([[-40, 560], [200, 566], [200, 604], [-40, 600]], { sharp: true, color: '#7a7365', alpha: .75, dir: 0, size: .7, soft: 5 }); p.mass([[-40, 800], [200, 800], [200, 836], [-40, 838]], { sharp: true, color: '#7a7365', alpha: .75, dir: 0, size: .7, soft: 5 });
    p.shade([[230, 0], [300, 0], [320, 1080], [240, 1080]], { color: '#4f4d46', alpha: .25, soft: 24 });
    const k = keys(t, [[CB - .4, .1], [2.5, .16, 'io'], [2.8, .24, 'io'], [3.3, .72, 'io'], [3.46, .9, 'out'], [3.7, .925], [3.8, 1.03, 'in'], [3.95, 1.16, 'out'], [4.3, 1.25]]), lag = keys(t - .09, [[2.5, 0], [3.3, .55, 'io'], [3.5, .72, 'out'], [3.72, .75], [3.86, 1, 'in'], [4.1, 1.2, 'out']]);
    const tight = t - 3.62, wind = noise1(t * 1.4, 3);
    p.layer('hands', { every: 2, depth: 1 });
    // his scarf, its end hanging in the air between them
    const ex = 1250 + 250 * lag + 16 * wind, ey = 610 - 18 * lag + 8 * noise1(t * 1.1, 8), tugk = keys(t, [[3.55, 0], [3.72, 1, 'in'], [3.9, .7, 'out'], [4.2, .3]]);
    const tail = [[1520 + 190 * lag, -70], [1532 + 200 * lag, 90], [1496 + 220 * lag + 10 * wind, 250], [1396 + 240 * lag - 14 * wind, 390 - 14 * tugk], [1322 + 248 * lag - 14 * tugk, 498 - 14 * tugk], [ex - 26 * tugk, ey]];
    const hx = 900, hy = 486;
    const H = C.hands(p, { x: hx, y: hy, h: 372, k, t, light: GREY, angle: .02 });
    const corner = scarfEnd(p, tail, 104, tugk, t);
    // the strand: twice round her second finger, then across
    const q = H.A.fingers[1].q, f = (i, u) => [lerp(q[i][0], q[i + 1][0], u), lerp(q[i][1], q[i + 1][1], u)], a = f(1, .42), b = f(1, .8), nx = -(b[1] - a[1]), ny = b[0] - a[0], l = hyp(nx, ny) || 1, n = [nx / l * 24, ny / l * 24];
    const wrap = c => [[c[0] - n[0], c[1] - n[1]], [c[0] - n[0] * .4 + 5, c[1] - n[1] * .4 + 3], [c[0] + n[0] * .4 + 6, c[1] + n[1] * .4 + 2], [c[0] + n[0], c[1] + n[1]]];
    [a, b].forEach(c => W.thread(p, wrap(c), { w: 8, fuzz: .2, ply: 0, tip: 3 }));
    const st = [b[0] + n[0], b[1] + n[1]], en = [corner[0] + 4, corner[1] - 2]; const d = hyp(en[0] - st[0], en[1] - st[1]), L = Math.max(d * 1.0005, lerp(560, 516, ss(2.4, 3.2, t))); const vib = tight > 0 && tight < 1.2 ? 9 * Math.exp(-3.4 * tight) : 0;
    W.thread(p, strandPts(st, en, L, vib, t), { raw: true, w: 8, fuzz: .7, tip: 3 });
    W.thread(p, [[a[0] - n[0], a[1] - n[1]], [a[0] - n[0] - 16, a[1] - n[1] + 26], [a[0] - n[0] - 10 + 5 * wind, a[1] - n[1] + 66]], { w: 7, fuzz: .4, tip: 12 });
  }
  // the knitted end of the scarf: ribs, rows, fringe, and the row that is giving way
  function scarfEnd(p, pts, w, tug, t) {
    const c = A.spline(pts, 8), L = [], R = [], n = c.length - 1; c.forEach((v, i) => { const a = c[Math.max(0, i - 1)], b = c[Math.min(n, i + 1)], d = hyp(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / d, ny = (b[0] - a[0]) / d, u = i / n, k = w * .5 * (.86 + .22 * u + .05 * Math.sin(u * 8 + t)) * (1 - .18 * tug * ss(.7, 1, u)); L.push([v[0] + nx * k, v[1] + ny * k]); R.push([v[0] - nx * k, v[1] - ny * k]); });
    const poly = L.concat(R.slice().reverse()); p.mass(poly, { sharp: true, color: { lin: [pts[0][0] - 80, 0, pts[0][0] + 60, 60], stops: [[0, '#c03a2c'], [1, '#97271f']] }, dir: 2.2, size: .6, len: .6, vary: .35, dens: 1.3 });
    p.shade(R.concat(c.slice().reverse()), { color: '#6a2430', alpha: .3, soft: 20 });
    for (let j = -3; j <= 3; j++) p.line(c.map((v, i) => [lerp(L[i][0], R[i][0], .5 + j / 7.6), lerp(L[i][1], R[i][1], .5 + j / 7.6)]), { color: j % 2 ? '#7a1f1d' : '#da6a57', w: 2.6, press: .55, taper: [.05, .1], medium: j % 2 ? 'graphite' : 'crayon' });
    for (let i = 4; i < n; i += 2) { const m = [lerp(L[i][0], R[i][0], .5), lerp(L[i][1], R[i][1], .5)], z = c[Math.min(n, i + 1)]; p.line([L[i], [m[0] + (z[0] - m[0]) * .7, m[1] + (z[1] - m[1]) * .7], R[i]], { color: '#7a1f1d', w: 1.8, press: .34, taper: [.15, .15], wobble: 1.4 }); }
    p.line(L, { color: '#5c1a1a', w: 4, press: .75, taper: [.02, .05] }); p.line(R, { color: '#5c1a1a', w: 4, press: .75, taper: [.02, .05] });
    const e = c[n], e1 = c[n - 2], dd = [e[0] - e1[0], e[1] - e1[1]], l = hyp(dd[0], dd[1]) || 1; for (let j = 0; j <= 8; j++) { const u = j / 8, a = [lerp(L[n][0], R[n][0], u), lerp(L[n][1], R[n][1], u)]; if (tug > .3 && j > 5) continue; const sw = noise1(t * 1.6 + j, 5) * 7; p.line([a, [a[0] + dd[0] / l * 20 + sw * .4, a[1] + dd[1] / l * 20], [a[0] + dd[0] / l * 40 + sw, a[1] + dd[1] / l * 38]], { color: j % 2 ? '#8e241d' : '#b5322b', w: 5, press: .85, taper: [.02, .3], medium: 'crayon' }); }
    if (tug > .05) for (let j = 0; j < 4; j++) { const u = .62 + j * .1; const a = [lerp(L[n][0], R[n][0], u), lerp(L[n][1], R[n][1], u)]; p.line([[a[0] - 10, a[1] - 8], [a[0] - 4, a[1] + 12 * tug], [a[0] + 10, a[1] - 6]], { color: '#c8473a', w: 4, press: .8, medium: 'crayon', taper: [.1, .1] }); }
    return L[n][0] < R[n][0] ? L[n] : R[n];
  }

  // ------------------------------------------------------------------ C
  // ground seen in perspective: z = distance in units of hers, X = metres to the right of the sheet's middle; a man is 1.1 × 620 / z
  const YH = 470, M = 383, gp = (X, z) => [960 + X * M / z, YH + 490 / z], RX = z => keys(z, [[.7, -.06], [1, .1, 'lin'], [1.5, .42, 'lin'], [2, .86, 'lin'], [2.5, 1.2, 'lin'], [3, 1.42, 'lin'], [3.6, 1.5, 'lin'], [4.3, 1.4, 'lin']]);
  let LT = null; const light = () => LT || (LT = B.world.mixLight('day', 'rain', .6));
  function placeC(p, t, g) {
    const W = B.world, b = Object.assign({}, BASE, { light: light() }); p.paper('#e6dfcf');
    p.layer('sky', { every: 6, still: true, depth: .08 }); W.sky(p, { mood: light(), t: 3, horizon: 560, clouds: 2, still: true });
    W.hill(p, Object.assign({ d: .92, pts: [[-60, 548], [240, 512], [520, 526], [820, 500], [1120, 494], [1400, 506], [1660, 470], [1980, 500]], base: 660, seed: 91, spurs: 4, rough: 5, hatch: 0 }, b));
    W.hill(p, Object.assign({ d: .66, pts: [[-60, 580], [300, 566], [700, 574], [1040, 552], [1300, 540], [1560, 536], [1980, 510]], base: 760, seed: 92, spurs: 4, rough: 6 }, b));
    W.road(p, Object.assign({ pts: [[1090, 604], [1050, 592], [1110, 576], [1240, 566], [1310, 554], [1280, 544], [1330, 538]], w: [9, 3], power: 1.2, d: .55, lw: 2 }, b));
    p.layer('land', { every: 6, still: true, depth: .4 });
    W.hill(p, Object.assign({ d: .3, pts: [[-60, 600], [300, 592], [700, 584], [980, 580], [1240, 578], [1600, 570], [1980, 580]], base: 900, seed: 93, spurs: 3, rough: 5 }, b));
    W.hill(p, Object.assign({ d: .14, pts: [[-60, 770], [240, 764], [620, 752], [960, 742], [1300, 740], [1600, 730], [1980, 722]], base: 1120, seed: 95, spurs: 2, rough: 5 }, b));
    // the road, flattening into the distance
    const L = [], R = [], zs = [.68, .76, .86, 1, 1.15, 1.35, 1.6, 1.9, 2.25, 2.7, 3.2, 3.8, 4.3]; zs.forEach((z, i) => { const w = .56 + .05 * noise1(i * 1.7, 3); L.push(gp(RX(z) - w, z)); R.push(gp(RX(z) + w + .03 * noise1(i * 2.1, 8), z)); });
    const c0 = W.seen('#ddd0ae', light(), .04), c1 = W.seen('#dcd2b8', light(), .3); p.mass(L.concat(R.slice().reverse()), { color: { lin: [0, 590, 0, 1080], stops: [[0, c1], [1, c0]] }, dir: .06, len: 1.1, size: .85, vary: .45, soft: 3 });
    p.mass(zs.map(z => gp(RX(z) - .06, z)).concat(zs.slice().reverse().map(z => gp(RX(z) + .1, z))), { color: W.seen('#b3aa86', light(), .15), alpha: .55, dir: 1.2, len: .7, size: .6, soft: 5, vary: .6 });
    for (const u of [-.34, .36]) p.line(zs.map(z => gp(RX(z) + u, z)), { color: '#8d8268', w: 3.4, press: .32, taper: [.1, .4], wobble: 2 });
    p.line(L, { color: '#4d473d', w: 3, press: .5, taper: [.2, .3], wobble: 2 }); p.line(R, { color: '#4d473d', w: 3, press: .42, taper: [.3, .3], wobble: 2 });
  }
  function drawC(p, t, s) {
    const C = B.cast, W = B.world, calm = keys(t, [[4.2, 1], [4.95, .06, 'io'], [9, 0]]), g0 = W.gusts({ seed: 6, every: 2.2, power: .9, base: .3 }), g = (tt, x, y) => g0(Math.min(tt, 5.2), x, y) * calm; placeC(p, t, g);
    const b = Object.assign({}, BASE, { light: light() });
    // him
    const walk = keys(t, [[3.2, 0], [4.6, 1.75, 'lin'], [4.95, 2.02, 'out']]), z = 2.3 + walk * .34, [px0, y] = gp(RX(z) + .02, z), px = px0, hd = 620 / z * 1.1;
    const back = keys(t, [[5.82, 0], [5.95, -.06], [6.32, 1, 'io']]), stp = ss(4.8, 5.05, t), ph = walk * 1.62 / 1.45;
    p.layer('him', { every: 2, depth: .85 });
    p.shade([[px - hd * .2, y + 2], [px, y - 6], [px + hd * .34, y - 2], [px + hd * .3, y + 8], [px, y + 10]], { color: '#4c4a44', alpha: .45, soft: 6 });
    const dn = C.figure(p, 'danny', { x: px, y, h: hd, yaw: lerp(2.6, 2.1, back), face: -1, t, light: GREY, legs: stp < .55 ? { kind: 'walk', phase: ph, amp: .85 } : { kind: 'stand', gap: .05 }, head: { turn: -1.5 * back, nod: .14 - .12 * back - .04 * stp, tilt: -.06 * back }, twist: -.45 * back, bend: .08 + .05 * stp, wind: [.35 * calm, 0], expr: 'ache' });
    // wall, gate, her
    p.layer('wall', { every: 6, depth: .85 });
    W.wall(p, { line: [[-40, 974], [60, 968], [150, 960]], h: 330, size: 92, light: light(), d: .04, seed: 5, moss: 6, lines: 30 }); W.pier(p, { x: 176, y: 982, w: 120, h: 392, light: light(), d: .03, seed: 8 });
    W.wall(p, { line: [[1640, 1010], [1780, 996], [1980, 980]], h: 320, size: 92, light: light(), d: .04, seed: 9, moss: 6, lines: 30 }); W.pier(p, { x: 1612, y: 1016, w: 124, h: 388, light: light(), d: .03, seed: 12 });
    p.layer('gate', { every: 2, depth: .9 }); const sw = .5 + .012 * Math.sin(t * 5) * Math.exp(-Math.max(0, t - 4) * 2), go = { x: 236, y: 976, w: 400, h: 352, open: sw, swing: 30, light: light() }; W.gate(p, go);
    const hold = [go.x + go.w * .97 * Math.cos(sw * 1.35), go.y - .95 * go.h + Math.sin(sw * 1.35) * 30 * .97];
    p.layer('her', { every: 2, depth: .97 });
    const br = Math.sin(t * 1.55), wsk = g0(Math.min(t, 5), 560) * calm;
    p.shade([[440, 958], [560, 944], [760, 952], [860, 966], [700, 982], [500, 982]], { color: '#4c4a44', alpha: .45, soft: 14 });
    const me = C.figure(p, 'mother', { x: 566, y: 966, h: 650, yaw: 2.2, face: 1, t, light: GREY, legs: { kind: 'stand' }, weight: -.5, lean: .02 + .015 * calm, bend: .03 + .006 * br, shrug: .08 * br, head: { turn: -.18, nod: -.04 + .012 * br }, wind: [.55 * wsk, 0], drag: [-.05 * calm * wsk, 0],
      armNear: { at: [756, 634], h: 'pinch', over: true }, armFar: { at: [hold[0] - 4, hold[1] - 26], h: 'onChair' }, expr: 'holdingBack' });
    // the thread
    const a = me.handNear, e = dn.scarfEnd || [px, y - hd * .62], d = hyp(e[0] - a[0], e[1] - a[1]);
    const L = d + 22 + 40 * ss(3.9, 4.9, t) - 34 * ss(5.8, 6.4, t), vib = 6 * Math.exp(-Math.max(0, t - 3.9) * 1.1) + 2.4 * Math.exp(-Math.max(0, t - 5) * .5);
    const pts = strandPts(a, e, L, 0, t).map((v, i, arr) => { const u = i / (arr.length - 1); return [v[0], v[1] + vib * Math.sin(u * 9 - t * 9) * Math.sin(Math.PI * u) + 3 * noise1(u * 4 - t * 1.2, 9) * Math.sin(Math.PI * u)]; });
    p.layer('thread', { every: 2, depth: 1 }); W.thread(p, pts, { raw: true, w: 5.4, wf: u => 1.15 - .6 * u, fuzz: .5, tip: 4 }); W.thread(p, [[a[0], a[1]], [a[0] + 6, a[1] + 30], [a[0] - 4 + 4 * calm * noise1(t * 2, 5), a[1] + 70], [a[0] + 8, a[1] + 96]], { w: 4.6, fuzz: .4, tip: 10 });
    p.layer('fore', { every: 2, depth: 1 }); W.grass(p, Object.assign({ line: [[-40, 1020], [200, 1004], [420, 996], [560, 1006]], n: 20, h: 58, depth: 22, t, wind: g, seed: 21, d: 0, lines: 22 }, b)); W.grass(p, Object.assign({ line: [[1340, 1040], [1640, 1030], [1980, 1020]], n: 16, h: 66, depth: 22, t, wind: g, seed: 25, d: 0, lines: 16 }, b));
  }
  B.scene({ id: 's04', ink: 'deep', draw(p, s) { const t = s.t; if (t < CB) drawA(p, t, s); else if (t < CC) drawB(p, t, s); else drawC(p, t, s); } });
})();
