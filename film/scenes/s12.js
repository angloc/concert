(function () {
  const B = window.BIDE, A = B.anim; B.test = B.test || {};
  const { clamp, lerp, keys, mixc } = A;
  // s12  "Ye'll come and find the place where I am lying"   90.6 - 97.6
  // FEELING: led by the hand, uphill, to the thing he already knows.
  // BEATS: -0.4..2.05 (Ye'll come and find) CLOSE the thread through the grass, taut uphill. one old hand feels along it, the other comes past and takes hold. hand over hand, gently.
  //        2.05..4.1 (the place where) LOW: boots in the long grass. a step, the weight, a drag, a step. one boot slips back an inch.
  //        4.1..7 (I am lying 4.96) WIDE: the hill, the thorn, the plain stone on the sky. he is small. two steps and he stops. the thread goes slack in his hand. he does not go nearer.
  // VALUE: A dark slope, light thread-side sky corner, pale hands. B near-silhouette boots on a pale strip of sky. C pale sky, dark hill, stone and man on the light.
  const CUT1 = 2.05, CUT2 = 4.1;
  const INK = '#2a2826', RED = '#a5443c', LIGHT = 'dusk', base = { light: LIGHT, season: .7, colour: .42 };
  let G = null; const gust = () => G || (G = B.world.gusts({ seed: 57, every: 2.4, power: .95, base: .4, dir: 1, speed: 1100 }));
  const lnOf = p => (pts, st) => p.line(pts, Object.assign({ color: INK, w: 4, press: .75, taper: [.12, .25], wobble: .9 }, st));
  const HT = { dir: -2.5, warm: .5, k: .7, dim: .1 };
  const t2 = t => Math.floor(t * 6 + 1e-6) / 6;
  // long grass, tuft by tuft along a slope, leaning with the gust; push(x) lays it over where something stands
  function blades(p, t, o) {
    const g = gust(), n = o.n, [x0, x1] = o.x || [-80, 1990], cols = o.cols, sd = o.seed || 1, m = o.per || 5;
    for (let i = 0; i < n; i++) {
      const X = lerp(x0, x1, (i + p.fix(i, sd)) / n), Y = o.y(X) + (p.fix(i, sd, 2) - .5) * (o.dy || 30), H = o.h * (.6 + .7 * p.fix(i, sd, 3)), big = p.fix(i, sd, 7) > .8;
      for (let k = 0; k < m; k++) {
        const r = q => p.fix(i * 17 + k, sd, q), x = X + (k - m / 2) * (o.spread || 9) + 8 * (r(2) - .5), h = H * (.55 + .6 * r(3)) * (big && k === 2 ? 1.5 : 1), b = g(t - .1 * r(4), x, Y), push = o.push ? o.push(x, Y) : 0, fan = (k - (m - 1) / 2) * .13, th = fan + (r(5) - .5) * .3 + b * .72 + push, kk = Math.max(.3, 1 - Math.abs(push) * .45), a1 = th * .42, a2 = th * .95, a3 = th * 1.55, q = [[x, Y + 8]];
        let px = x, py = Y; [[a1, .4], [a2, .34], [a3, .3]].forEach(z => { px += Math.sin(z[0]) * h * z[1] * (1.1 - .1 * kk); py -= Math.cos(z[0]) * h * z[1] * kk; q.push([px, py]); });
        const c = cols[(i * 3 + k * 2 + (r(6) > .7 ? 1 : 0)) % cols.length]; p.line(q, { color: c, w: (o.w || 4) * (.65 + .6 * r(7)), press: .8, taper: [.03, .7], wobble: .5, medium: (i + k) % 3 === 0 ? 'crayon' : 'graphite' });
        if (big && k === 2) for (let j = 0; j < 5; j++) { const u = j / 5, z = [lerp(q[2][0], q[3][0], .2 + u * .8), lerp(q[2][1], q[3][1], .2 + u * .8)]; p.line([[z[0] - 4, z[1] + 4], [z[0] + 5, z[1] - 4]], { color: o.seedC || '#c8b482', w: 4.4, press: .7, taper: [.1, .3], wobble: .3, medium: 'crayon' }); }
      }
    }
  }

  // ------------------------------------------------------------------ A. the hand on the thread
  const SL = x => 900 - .36 * x;            // the slope the picture is built on
  const TH = x => 800 - .315 * x;
  const RGY = x => keys(x, [[-60, 760], [240, 690], [560, 610], [900, 480], [1240, 340], [1560, 210], [1980, 60]].map(v => [v[0], v[1], 'lin']));           // the thread, taut uphill
  function slopeBack(p, t) {
    const W = B.world; p.paper('#cdbf9f');
    p.layer('s12a-sky', { every: 6, still: true, depth: .04 }); W.sky(p, { mood: LIGHT, t: 3, horizon: 560, clouds: false, glowX: 300 });
    p.mass([[-40, 300], [240, 250], [620, 260], [860, 330], [700, 520], [-40, 700]], { color: '#f0d7a0', alpha: .75, dir: -.1, size: 1.1, vary: .3, soft: 60 });
    W.hill(p, Object.assign({ d: .9, pts: [[-60, 520], [200, 480], [480, 500], [760, 440], [1100, 420], [1980, 300]], base: 900, seed: 212, spurs: 3, rough: 5, hatch: 0 }, base));
    p.layer('s12a-land', { every: 5, still: true, depth: .5 });
    const rg = W.util.ridge([[-60, 760], [240, 690], [560, 610], [900, 480], [1240, 340], [1560, 210], [1980, 60]], { amp: 9, seed: 66, step: 24 });
    p.mass(W.util.below(rg, 1130), { sharp: true, color: { lin: [300, 500, 1100, 1080], stops: [[0, '#a09670'], [.4, '#7d7859'], [1, '#4b4d40']] }, dir: -.36, len: 1.3, size: 1.1, vary: .5 });
    p.shade([[-60, 900], [600, 800], [1300, 620], [1980, 420], [1980, 1130], [-60, 1130]], { color: '#2f3331', alpha: .36, soft: 90 });
    W.util.found(p, rg, { color: '#3a3a32', w: 3, press: .5, seed: 9, seg: 170, gap: .7, skip: .2 });
  }
  function sleeve(p, ln, x, y, rot, s, c0, c1) { const ca = Math.cos(rot), sa = Math.sin(rot), N = (u, v) => [x - ca * u * s + sa * v * s * -1 * -1 * 0 - sa * v * s, y - sa * u * s + ca * v * s]; const q = [N(-20, -62), N(-28, 0), N(-18, 64), N(70, 84), N(240, 108), N(1100, 190), N(1100, -190), N(240, -104), N(70, -80)];
    p.mass(q, { color: { lin: [...N(0, -90), ...N(0, 100)], stops: [[0, c0], [.5, mixc(c0, c1, .5)], [1, c1]] }, dir: rot + 1.25, size: .8, vary: .45 }); p.shade([N(-20, 8), N(-16, 66), N(240, 112), N(1100, 196), N(1100, 60), N(200, 46), N(50, 30)], { color: '#1f1f20', alpha: .5, soft: 22 }); p.shade([N(-16, -62), N(70, -80), N(240, -103), N(560, -140), N(560, -104), N(240, -72), N(50, -50)], { color: '#f3d8a2', alpha: .38, soft: 10, mode: 'screen' });
    ln([N(-20, -64), N(-30, 0), N(-18, 66)], { w: 5, press: .85 }); ln([N(10, -70), N(0, 0), N(14, 74)], { w: 3, press: .42 }); ln([N(-20, -64), N(70, -81), N(240, -105), N(1060, -186)], { w: 3.8, press: .5 }); ln([N(-18, 66), N(70, 85), N(240, 109), N(1060, 186)], { w: 5, press: .8 }); [[70, -40, 112, 12, 96, 56], [180, -64, 206, 0, 190, 70], [320, -70, 340, 10, 326, 84]].forEach(v => ln([N(v[0], v[1]), N(v[2], v[3]), N(v[4], v[5])], { w: 3.2, press: .42, taper: [.15, .5] })); }
  function drawHands(p, t) {
    const W = B.world, C = B.cast, ln = lnOf(p); slopeBack(p, t);
    p.layer('s12a-grass', { every: 2, depth: .85 });
    blades(p, t2(t), { n: 26, per: 4, y: x => RGY(x) + 26, dy: 30, h: 110, w: 3.4, seed: 4, cols: ['#a59a6b', '#6d6b4c', '#8b855d', '#5d5f46'] }); blades(p, t2(t), { n: 28, per: 4, y: x => SL(x) - 20, dy: 110, h: 150, w: 4, seed: 14, cols: ['#8f875c', '#5f5f45', '#767253', '#4c4f3c'] });
    // the pull of each hold runs up the line
    const pull = keys(t, [[-.4, 0], [.9, 0], [1.06, 1, 'snap'], [1.3, .5, 'io'], [1.86, .35], [2.0, 1, 'snap'], [2.3, .8]]);
    const sag = lerp(.02, .002, pull), dx = -14 * pull, dy = 7 * pull;
    // hand one is already there; its thumb feels along. hand two comes past.
    const feel = keys(t, [[-.4, -40], [.1, 0, 'io'], [.35, 6], [.6, 2], [1.2, 0], [1.34, -6, 'io'], [1.46, 30, 'in'], [1.92, 700, 'io'], [2.02, 716, 'out'], [2.4, 720]]);
    const x1 = 760 + feel + dx, lift1 = keys(t, [[1.3, 0], [1.62, 1, 'io'], [1.92, 0, 'io']]);
    const x2 = keys(t, [[.1, -260], [.3, -120, 'in'], [.88, 1100, 'io'], [.96, 1092, 'out'], [1.1, 1096], [3, 1096]]) + (t > .9 ? dx : 0), lift2 = keys(t, [[.15, .8], [.55, 1], [.92, 0, 'io']]);
    const y1 = TH(x1) + dy - 62 * lift1, y2 = TH(x2) + dy - 70 * lift2;
    const open1 = lift1, open2 = keys(t, [[.1, .8], [.6, 1], [.84, .9], [.98, 0, 'out']]);
    p.layer('s12a-thread', { every: 1, depth: 1 });
    const hold = t > .96 ? Math.max(x1, x2) : x1 + 20;
    // loose behind the last hand, taut ahead of the first
    const tail = t > 1.4 ? x2 : x1;
    W.thread(p, [[tail, TH(tail) + dy], [tail - 90, TH(tail) + 130 + 14 * A.noise1(t * 1.1, 3)], [tail - 300, TH(tail) + 250], [tail - 560, TH(tail) + 320], [-160, 1060]], { w: 9, hang: .02, slack: .6, light: LIGHT, seed: 4 });
    W.thread(p, [[tail, TH(tail) + dy], [1400, TH(1400) + dy * .5], [1990, TH(1990)]], { w: 9, hang: sag, light: LIGHT, seed: 6, pull: [{ t0: .98, amp: 11, speed: 1500 }, { t0: 1.98, amp: 11, speed: 1500 }] });
    p.layer('s12a-hands', { every: 1, depth: 1 });
    const hand = (x, y, open, far) => { const h = far ? 250 : 276, rot = -.58 - .12 * open, hx = x - Math.cos(rot) * h * .62, hy = y - Math.sin(rot) * h * .62; sleeve(p, ln, hx, hy, rot - .06 + (far ? -.04 : .02), far ? .94 : 1.06, far ? '#5d5a54' : '#6f6a61', far ? '#3b3a38' : '#403d3a'); C.hand(p, { who: 'dannyOld', x: hx, y: hy, h, pose: ['fist', { base: 'reach', f: [[9, 14, 22, 12], [3, 18, 26, 14], [-4, 22, 28, 14], [-12, 26, 30, 14]], th: [48, 20, 8, 10], roll: 44, pitch: 0 }, .12 + .8 * open], rot, roll: 40, light: HT, sleeve: false, armLen: .05 }); };
    if (t > .12) hand(x2, y2, open2, true);
    hand(x1, y1, open1, false);
    p.layer('s12a-near', { every: 2, depth: 1 });
    blades(p, t2(t), { n: 26, per: 4, y: x => 1010 - .16 * Math.max(0, x - 500), dy: 80, h: 200, w: 5, seed: 9, cols: ['#4a4c3c', '#63614a', '#383b33', '#85805a'], seedC: '#b5a577', spread: 11 }); blades(p, t2(t), { n: 18, per: 4, x: [900, 1990], y: x => 1080 - .3 * (x - 900), dy: 60, h: 190, w: 5, seed: 19, cols: ['#3a3d34', '#55553f', '#2f332f', '#6f6c4e'], spread: 11 });
  }

  // ------------------------------------------------------------------ B. boots
  const GY = x => 890 - .16 * (x - 300);
  function boot(p, ln, ax, ay, a, far) { // ankle, sole angle. toe to the right
    const c = Math.cos(a), s = Math.sin(a), N = (u, v) => [ax + u * c - v * s, ay + u * s + v * c], col = far ? '#3d3733' : '#564a40', dk = '#231f1d', lt = far ? '#6a5e50' : '#9a8468';
    const up = [N(-62, -110), N(-70, -30), N(-78, 30), N(-74, 66), N(-20, 74), N(60, 76), N(150, 76), N(206, 70), N(214, 48), N(196, 22), N(150, 4), N(92, -14), N(58, -50), N(50, -112)];
    p.mass(up, { color: { lin: [...N(0, -80), ...N(40, 80)], stops: [[0, mixc(col, lt, .25)], [1, mixc(col, dk, .35)]] }, dir: a + .5, size: .6, len: .7, vary: .45 });
    p.shade([N(-70, 20), N(30, 34), N(120, 40), N(210, 44), N(206, 74), N(-74, 70)], { color: dk, alpha: .5, soft: 12 }); p.shade([N(66, -44), N(100, -14), N(156, 4), N(196, 20), N(170, 26), N(96, 6)], { color: '#f0d3a0', alpha: .42, soft: 8, mode: 'screen' });
    p.mass([N(-80, 60), N(-20, 70), N(90, 72), N(208, 66), N(214, 80), N(120, 92), N(20, 92), N(-10, 88), N(-16, 104), N(-82, 102)], { sharp: true, color: '#2a2522', dir: a, size: .5, vary: .3 });
    ln([N(-62, -108), N(-70, -30), N(-79, 30), N(-78, 66)], { w: 4.6, press: .8 }); ln([N(58, -50), N(92, -14), N(150, 4), N(198, 22), N(216, 48), N(208, 70)], { w: 4.4, press: .75 }); ln([N(-80, 64), N(60, 76), N(206, 70)], { w: 3.4, press: .6 }); ln([N(-82, 102), N(-14, 104), N(-8, 88), N(100, 92), N(212, 80)], { w: 4.6, press: .85 });
    ln([N(140, 6), N(156, 32), N(148, 62)], { w: 3, press: .5 }); [[40, -70, 78, -46], [50, -44, 92, -18], [66, -22, 112, -2]].forEach((v, i) => ln([N(v[0], v[1]), N(v[2] - 10, v[3] - 6), N(v[2], v[3])], { color: i % 2 ? '#1f1b19' : '#8a775f', w: 3.4, press: .7 })); [[-50, 0, -10, 12, 30, 6], [-40, 30, 10, 40, 70, 34], [-30, -50, 0, -40, 24, -56]].forEach(v => ln([N(v[0], v[1]), N(v[2], v[3]), N(v[4], v[5])], { w: 2.6, press: .4, taper: [.2, .5] }));
    // mud
    for (let i = 0; i < 7; i++) { const u = -60 + 260 * p.fix(i, 3), v = 40 + 46 * p.fix(i, 4); ln([N(u, v), N(u + 12, v + 4)], { color: '#75664d', w: 5, press: .6, medium: 'crayon' }); }
  }
  function leg(p, ln, hip, ank, far) {
    const tgt = [ank[0] - 6, ank[1] - 40], k = A.ik(hip[0], hip[1], tgt[0], tgt[1], 372, 372, 1), kn = [k.x, k.y], c = far ? '#403d3d' : '#57524d';
    const dir = (a, b) => { const d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [(b[0] - a[0]) / d, (b[1] - a[1]) / d]; }, d1 = dir(hip, kn), d2 = dir(kn, tgt), off = (o, d, u, w) => [o[0] + d[0] * u - d[1] * w, o[1] + d[1] * u + d[0] * w]; // w + = back of the leg (left)
    const front = [off(hip, d1, 0, -104), off(hip, d1, 190, -98), off(kn, d1, -40, -92), off(kn, [(d1[0] + d2[0]) / 2, (d1[1] + d2[1]) / 2], 8, -90), off(kn, d2, 70, -80), off(kn, d2, 220, -74), off(tgt, d2, -18, -74), off(tgt, d2, 30, -66)], back = [off(hip, d1, 0, 110), off(hip, d1, 200, 96), off(kn, d1, -20, 74), off(kn, d2, 40, 74), off(kn, d2, 150, 84), off(tgt, d2, -60, 78), off(tgt, d2, 16, 80)];
    p.mass(front.concat(back.slice().reverse()), { color: { lin: [kn[0] - 100, kn[1], kn[0] + 100, kn[1]], stops: [[0, mixc(c, '#1f1f20', .4)], [.6, c], [1, mixc(c, '#d8bd88', .26)]] }, dir: Math.atan2(d2[1], d2[0]), size: .9, vary: .45 });
    ln(back, { w: 4, press: .65 }); ln(front, { w: 4.6, press: .75 }); ln([front[7], off(tgt, d2, 42, 6), back[6]], { w: 5, press: .85 });
    [[kn, d1, -30, 62, kn, d2, 6, 6, kn, d2, 20, -60], [kn, d1, 6, 66, kn, d2, 46, 10, kn, d2, 60, -50], [tgt, d2, -130, 70, tgt, d2, -96, 0, tgt, d2, -110, -56], [tgt, d2, -54, 66, tgt, d2, -24, 0, tgt, d2, -40, -60]].forEach(v => ln([off(v[0], v[1], v[2], v[3]), off(v[4], v[5], v[6], v[7]), off(v[8], v[9], v[10], v[11])], { w: 3.2, press: .44, taper: [.12, .55] }));
  }
  function drawBoots(p, t) {
    const W = B.world, ln = lnOf(p); p.paper('#cdbf9f');
    p.layer('s12b-sky', { every: 6, still: true, depth: .04 }); W.sky(p, { mood: LIGHT, t: 6, horizon: 640, clouds: false, glowX: 1300 });
    p.mass([[500, 470], [900, 420], [1500, 400], [1980, 380], [1980, 640], [1300, 660], [600, 720]], { color: '#f2d9a2', alpha: .8, dir: -.1, size: 1.1, vary: .3, soft: 60 });
    p.layer('s12b-land', { every: 5, still: true, depth: .5 });
    const rg = W.util.ridge([[-60, 760], [300, 730], [700, 690], [1100, 620], [1500, 550], [1980, 470]], { amp: 8, seed: 88, step: 24 });
    p.mass(W.util.below(rg, 1130), { sharp: true, color: { lin: [600, 560, 800, 1080], stops: [[0, '#857e5c'], [.4, '#5f5f49'], [1, '#34372f']] }, dir: -.2, len: 1.3, size: 1.1, vary: .5 }); W.util.found(p, rg, { color: '#3a3a32', w: 3, press: .5, seed: 9, seg: 170, gap: .7, skip: .2 });
    // ---- two steps. the near foot goes first, the far foot drags after. each: lift late, swing, land heel first, then the weight comes onto it
    const step = (t0, t1, x0, x1, up) => { const k = keys(t, [[t0, 0], [t0 + (t1 - t0) * .3, .1, 'in'], [t1 - .06, 1, 'io'], [t1, 1]]), h = up * Math.pow(Math.sin(Math.PI * clamp(k)), .8); const x = lerp(x0, x1, k); const air = t > t0 && t < t1; return { x, y: GY(x) - 92 - h, a: -.16 + (t < t0 - .25 ? 0 : t < t0 + .16 ? keys(t, [[t0 - .25, 0], [t0 + .1, .62, 'io'], [t0 + .16, .62]]) : air ? keys(t, [[t0 + .16, .62], [t1 - .16, -.28, 'io'], [t1, -.3]]) : keys(t, [[t1, -.3], [t1 + .1, 0, 'snap'], [t1 + 1, 0]])), k, air }; };
    const near = t < 2.95 ? step(1.95, 2.68, 360, 900, 60) : { x: 900 - 16 * keys(t, [[2.95, 0], [3.06, 1, 'snap'], [4.4, 1]]), y: GY(892) - 92, a: -.16, k: 1 }, far = step(3.14, 3.9, 560, 1240, 46);
    const sink = keys(t, [[2.66, 0], [2.78, 12, 'snap'], [2.95, 5, 'out'], [3.06, 14, 'snap'], [3.3, 4, 'io'], [3.88, 4], [4.0, 14, 'snap'], [4.3, 6]]);
    const hipX = keys(t, [[1.8, 470], [2.45, 640, 'io'], [2.74, 742, 'out'], [3.1, 820, 'io'], [3.66, 1000, 'io'], [3.98, 1090, 'out'], [4.6, 1170]]), hipY = 34 + sink * 1.4 + keys(t, [[1.9, 6], [2.3, -26, 'io'], [2.7, 10, 'in'], [3.05, 2], [3.5, -28, 'io'], [3.9, 8, 'in'], [4.3, 0]]) - .15 * (hipX - 520);
    const g = gust();
    p.layer('s12b-grass1', { every: 2, depth: .8 });
    blades(p, t, { n: 36, y: x => GY(x) - 56, dy: 60, h: 120, w: 3.6, seed: 14, cols: ['#8d8660', '#6c6b4e', '#a49869', '#5a5c44'] });
    p.layer('s12b-man', { every: 1, depth: 1 });
    leg(p, ln, [hipX + 26, hipY], [far.x, far.y], true); boot(p, ln, far.x, far.y, far.a, true);
    // the thread: lies in the grass, up the hill; his boot comes down beside it
    const thr = []; for (let i = 0; i <= 14; i++) { const x = lerp(-60, 1990, i / 14); thr.push([x, GY(x) + 22 + 9 * A.noise1(x / 190, 5) - 8 * Math.exp(-Math.pow((x - near.x - 60) / 120, 2)) * 0]); } W.thread(p, thr, { w: 8, meander: 8, light: LIGHT, seed: 5, ground: .5 });
    leg(p, ln, [hipX, hipY], [near.x, near.y], false); boot(p, ln, near.x, near.y, near.a, false);
    // hem of the coat, swinging late
    const hem = hipX - 40 - 60 * clamp((keys(t, [[1.8, .4], [2.3, 1, 'io'], [2.8, .1, 'io'], [3.0, -.1, 'out'], [3.5, 1, 'io'], [4.0, .1, 'io'], [4.3, -.15]])), -1, 1);
    const w = g(t, hipX, 300), wl = g(t - .14, hipX, 300), hy = hipY + 186, fl = 34 + 74 * w, lift = 26 * wl;
    const coat = [[hipX - 190, -80], [hipX - 196, hy - 160], [hem - 168, hy - 20], [hem - 150 + 12 * w, hy + 84 + 6 * A.noise1(t * 2, 4)], [hem - 60, hy + 104], [hem + 40, hy + 98 - lift * .3], [hem + 130 + fl * .5, hy + 78 - lift], [hem + 176 + fl, hy + 40 - lift * 1.2 + 6 * A.noise1(t * 2.3, 7)], [hipX + 168 + fl * .4, hy - 60], [hipX + 146, hy - 180], [hipX + 146, -80]];
    p.mass(coat, { color: { lin: [hipX - 220, 100, hipX + 200, 160], stops: [[0, '#3f3d3b'], [.55, '#5d5852'], [1, '#867b6b']] }, dir: 1.4, size: 1, vary: .45 }); p.shade([[hem - 180, hy + 10], [hem - 150, hy + 96], [hem + 60, hy + 104], [hem + 176 + fl, hy + 46 - lift], [hem + 130, hy + 20], [hem, hy + 50]], { color: '#1f1f20', alpha: .42, soft: 14 });
    ln(coat.slice(1, 10), { w: 4.8, press: .78 });
    [[-120, 40, -6], [-50, 10, 6], [30, 20, 40], [96, 30, 100]].forEach((v, i) => ln([[hipX + v[0], hy - 260 + v[1] * 2], [hipX + v[0] + 4, hy - 110], [hem + v[0] * 1.05 + v[2] * (.3 + w), hy + 84 - (i === 3 ? lift * .8 : 0)]], { w: 3.4, press: .44, taper: [.1, .5] })); ln([[hem - 20, hy + 102], [hem - 6, hy + 10], [hipX - 6, hy - 120]], { w: 4, press: .6, taper: [.05, .4] });
    for (let i = 0; i < 12; i++) { const u = i / 11, x = lerp(hem - 140, hem + 60, u), y = hy + lerp(90, 100, Math.sin(u * 2.6)) + 4; ln([[x, y], [x - 4 + 8 * p.fix(i, 2), y + 14 + 9 * p.fix(i, 3)]], { color: '#4a4642', w: 2.4, press: .6, taper: [.05, .5] }); }
    // near grass closes over the boots; it is pushed over where a foot comes down and takes its time standing up again
    const crush = (f, t1) => { const d = t - t1; return d < -.06 ? 0 : (d < .1 ? clamp((d + .06) / .12) : lerp(1, .55, clamp((d - .1) / 1.2))); };
    const c1 = crush(near, 2.68), c2 = crush(far, 3.9);
    p.layer('s12b-near', { every: 2, depth: 1 });
    blades(p, t, { n: 54, y: x => GY(x) + 30, dy: 44, h: 118, w: 4.2, seed: 21, cols: ['#6f6d4d', '#4f523f', '#938a60', '#43463a', '#b0a06c'], push: (x) => { let s = 0; if (c1) { const u = (x - 960) / 170; s += c1 * 1.15 * Math.exp(-u * u) * (u > 0 ? 1 : -.6); } if (c2) { const u = (x - 1300) / 170; s += c2 * .8 * Math.exp(-u * u) * (u > 0 ? 1 : -.5); } return s; } });
    blades(p, t, { n: 30, y: x => 1050 - .09 * x, dy: 60, h: 160, w: 5, seed: 33, cols: ['#34382f', '#4a4c39', '#2b2e2a', '#5d5b41'], spread: 11 });
  }

  // ------------------------------------------------------------------ C. the hill
  function drawHill(p, t) {
    const W = B.world, C = B.cast, g = gust(), o = { light: LIGHT, season: .7, colour: .42, leaf: .4, stone: true, wind: g };
    p.paper('#cdbf9f'); W.thornHill(p, Object.assign({ part: 'back' }, o));
    // a bank of cloud low in the west, so a white head can be seen against it
    p.layer('s12c-bank', { every: 6, still: true, depth: .06 }); p.mass([[-40, 470], [220, 440], [520, 452], [820, 470], [1000, 520], [860, 590], [600, 640], [260, 690], [-40, 700]], { color: '#8d8f8e', alpha: .62, dir: .05, size: 1.2, len: 1.3, vary: .4, soft: 44 });
    W.thornHill(p, Object.assign({ part: 'mid', t: Math.floor(p.t * 4 + 1e-6) / 4 }, o));
    const x = keys(t, [[3.5, 520, 'lin'], [4.1, 586, 'lin'], [4.62, 640, 'io'], [4.74, 646], [5.12, 686, 'io'], [5.22, 690], [8, 690]]), y = W.util.yAt(W.HILL.rg, x) + 34, H = 212, ph = (x - 690) / C.stride('dannyOld', 'walk', H) + 4.1;
    const stop = keys(t, [[5.08, 0], [5.55, 1, 'io']]), sink = keys(t, [[6.5, 0], [7.2, 1, 'io']]);
    // he stops. nothing for a breath. then the cap comes off, slowly, and is held low
    const up = keys(t, [[5.62, 0], [5.98, 1, 'io'], [6.14, 1], [6.72, 0, 'io']]), off = t >= 6.06;
    p.layer('s12c-man', { every: t > 7 ? 2 : 1, depth: .95 });
    const stone = [1104, 640];
    const man = C.figure(p, 'dannyOld', { x, y, h: H, view: 'side', cap: !off, capInHand: off, light: { dir: -.2, warm: .5, k: .7, dim: .22 }, legs: { kind: 'walk', phase: ph }, lean: lerp(.18, -.01, stop), bend: lerp(.12, -.1, stop) + .16 * sink, shrug: -.2 * sink, head: { nod: lerp(.12, -.24, stop) + .3 * sink }, armFar: [{ p: [.22, .6], h: 'pinch' }, { p: [.1, .48], h: 'pinch' }, keys(t, [[5.2, 0], [5.9, 1, 'io']])], armNear: off ? [{ p: [.12, .5], h: 'pinch', over: true }, { p: [.05, .95], h: 'pinch', over: true }, up] : ['rest', { p: [.05, .95], h: 'pinch', over: true }, up], wind: [.34 + .5 * g(t, x, 600), 0] });
    const hf = man.handFar, lay = keys(t, [[5.14, 0], [5.8, 1, 'out']]), pts = [hf];
    for (let i = 1; i <= 8; i++) { const u = i / 8, X = lerp(hf[0], stone[0], u), gy = W.util.yAt(W.HILL.rg, X) + 30, ty = lerp(hf[1], stone[1], u), k = lay * clamp(Math.min(u * 4.5, 1)); pts.push([X, i === 8 ? stone[1] : lerp(Math.min(ty, gy), Math.min(gy, lerp(ty, gy, .9)), k)]); }
    W.thread(p, pts, { w: 3.6, light: LIGHT, seed: 4, ply: 0, fuzz: .3, meander: 2 * lay, ground: .4 * lay, pull: { t0: 5.1, amp: 5, speed: 900 } });
    W.thread(p, [[man.pelvis[0] - 8, man.pelvis[1]], hf], { w: 2.8, hang: .2, light: LIGHT, ply: 0, fuzz: .2 });
    W.thornHill(p, Object.assign({ part: 'front', t: Math.floor(p.t * 6 + 1e-6) / 6 }, o));
    p.air({ lin: [0, 660, 0, 1080], stops: [[0, '#ffffff'], [.55, '#b4b1af'], [1, '#6b6c73']], alpha: .95 });
  }
  B.test.s12a = (p, k) => drawHands(p, k); B.test.s12b = (p, k) => drawBoots(p, k); B.test.s12c = (p, k) => drawHill(p, k);
  B.scene({ id: 's12', ink: 'dark', draw(p, s) { if (s.t < CUT1) drawHands(p, s.t); else if (s.t < CUT2) drawBoots(p, s.t); else drawHill(p, s.t); } });
})();
