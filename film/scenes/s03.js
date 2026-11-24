// s03  22.3-29.4  "The summer's gone, and all the roses falling"
//
// FEELING  The loveliest thing in the garden comes apart because it was touched. She will not let the last piece of it go.
// THREE DRAWINGS
//   A 0.00-2.75  THE WALL   the bush heaped over the stones, green and full. she comes in from the right, head down, stops. "gone": the colour starts to go
//                out of the picture from the left edge. her hand goes up toward one rose.
//   B 2.75-5.42  CLOSE      her hand and the rose. touch, a breath, the cup of the fingers. "roses": the first petal lets go; then all of them, through her fingers.
//   C 5.42-7.1   HER        everything behind her is ochre and grey. petals pour over the wall and past her. the closed hand comes up to her heart; she bows over it.
// EYE      rose bush > her > hand > rose | fingertips > first petal > palm | petals across the paper > her face > the closed hand
// VALUES   A dark heap of leaf against pale sky, her cream apron the lightest thing on the right. B dark leaf, light hand, red rose between.
//          C almost empty pale sheet, her dark hair the one accent. red: roses and petals only.
(function () {
  const B = window.BIDE, A = B.anim, { clamp, lerp, keys, hash, noise1, spline, mixc, ease, TAU } = A;
  const sin = Math.sin, cos = Math.cos, max = Math.max, min = Math.min, PI = Math.PI;
  const CUT1 = 2.75, CUT2 = 5.42;
  const ss = (a, b, x) => { x = clamp((x - a) / (b - a)); return x * x * (3 - 2 * x); };
  // a cold wind out of the left: one gust on "gone", one that takes the rose, one that carries everything off
  const wind = (t, x = 960) => { const lag = (x + 200) / 2600; const g = (t0, p, h) => { const q = t - t0 - lag; return q < 0 ? 0 : q < .3 ? p * ease.out(q / .3) : p * Math.exp(-(q - .3) / h); }; return .12 + .08 * noise1(t * .8 + x * .001, 4) + g(1.35, .45, .7) + g(4.1, .5, .5) + g(5.0, 1.0, 1.0) + g(6.2, .5, .8); };
  wind._s = 1;
  // how far the colour has drained at x when the front of the tide stands at X
  const drained = (X, x, w = 340) => ss(0, 1, (X - x) / w + .0);
  const SUM = { sky: '#b9c3c4', hill: '#a9ab90', field: '#aea979', ground: '#8a8b58', groundD: '#5e6546', leaf: '#55693f', leafD: '#34472f', leafL: '#8a9a5c' };
  const AUT = { sky: '#c3bfb2', hill: '#b5a98f', field: '#b99f6d', ground: '#a78a5b', groundD: '#78654a', leaf: '#8f7448', leafD: '#5c4d3b', leafL: '#bfa069' };
  // summer on the right, autumn on the left, the edge between them moving
  const across = (a, b, X, w = 360) => ({ lin: [X - w, 0, X + 40, 0], stops: [[0, b], [.35, mixc(b, a, .25)], [.7, mixc(b, a, .75)], [1, a]] });

  // calls that have not changed since the last drawing are laid again without being worked out again
  const MEM = {};
  function memo(p, id, key, fn) {
    const play = l => { for (const c of l) if (c[0] === 'clip') p.clip(c[1], () => play(c[2])); else p[c[0]](...c[1]); };
    const m = MEM[id]; if (m && m.key === key) { play(m.list); return; }
    let list = []; const r = Object.create(p); for (const k of ['mass', 'shade', 'line', 'hatch', 'lift', 'dust', 'push', 'pop', 'translate', 'rotate', 'scale']) r[k] = (...a) => { list.push([k, a]); return p[k](...a); };
    r.clip = (sh, f) => { const out = list, sub = []; list = sub; p.clip(sh, f); list = out; out.push(['clip', sh, sub]); };
    fn(r); MEM[id] = { key, list };
  }

  // ------------------------------------------------------------------------------------------------ A: the wall
  const tideA = t => keys(t, [[1.1, -380], [1.5, -100, 'in'], [2.75, 1000, 'lin'], [3.4, 1500]]);
  const HERO = [946, 548];
  function drawA(p, s) {
    const W = B.world, C = B.cast, U = W.util, t = s.t, X = tideA(t), L = W.mixLight('day', 'rain', .18), tq = Math.floor(p.n / 3) / 4 - 22.3, Xq = tideA(tq + .12);
    p.paper('#e6ddc9');
    p.layer('A-sky', { every: 6, still: true, depth: .05 }); W.sky(p, { mood: L, t: 0, horizon: 600, seed: 5, clouds: [[420, 190, 900, 150, 2], [1500, 250, 900, 170, 4], [960, 430, 900, 60, 5]] });
    p.layer('A-land', { every: 5, depth: .3 });
    const far = U.ridge([[-60, 520], [200, 486], [480, 506], [760, 452], [1000, 430], [1240, 470], [1460, 420], [1700, 452], [1980, 440]], { amp: 6, seed: 81, step: 26 }), mid = U.ridge([[-60, 620], [300, 600], [640, 622], [980, 590], [1260, 566], [1500, 548], [1760, 580], [1980, 606]], { amp: 6, seed: 82, step: 26 });
    p.mass(U.below(far, 720), { sharp: true, color: across(mixc(SUM.hill, '#c9d0c6', .45), mixc(AUT.hill, '#cfc9bb', .5), X * 1.1 + 100, 520), dir: -.12, len: 1.4, size: 1.2, vary: .3 });
    p.mass(U.below(mid, 900), { sharp: true, color: across(SUM.field, AUT.field, X * 1.05 + 60, 460), dir: .06, len: 1.3, size: 1.1, vary: .4 });
    U.found(p, far, { color: '#6c7672', w: 1.8, press: .34, seed: 4, seg: 190, gap: .5, skip: .3 }); U.found(p, mid, { color: '#5d645a', w: 2.2, press: .4, seed: 6, seg: 200, gap: .5, skip: .3 });
    [[[900, 640], [1130, 622], [1400, 634], [1700, 622], [1960, 640]], [[1040, 690], [1330, 676], [1600, 690], [1960, 676]], [[1400, 634], [1364, 676]], [[1640, 626], [1690, 690]], [[1160, 622], [1120, 684]]].forEach((q, i) => U.ln(p, q, { color: '#5d645a', w: 2, press: .34, taper: [.2, .3], wobble: 1.6 }));
    p.mass(U.below([[-40, 800], [500, 806], [1100, 798], [1960, 786]], 1130), { sharp: true, color: across(SUM.ground, AUT.ground, X, 420), dir: .03, len: 1.2, size: 1, vary: .5 });
    p.layer('A-bush', { every: 3, depth: .75 });
    // each part of the heap turns when the tide reaches it
    [[90, 690, 1.35, 11, 8], [930, 690, 1.15, 6, 7], [470, 700, 1.75, 4, 10]].forEach(([x, y, sc, sd, n]) => { const k = drained(Xq, x, 420); memo(p, 'bush' + sd, tq + '|' + k, p => W.roseBush(p, { x, y, scale: sc, w: 360, h: 218, season: lerp(.32, .7, k), colour: lerp(.95, .62, k), leaf: 1 - .26 * ease.io(k), bloom: lerp(1, .42, k), light: L, t: tq, wind, seed: sd, canes: n, d: .05, flowers: 34, dens: .85 })); });
    { // the one she has come for
      const k = drained(X, 950), b = wind(t, HERO[0]) * 6; U.ln(p, [[850, 640], [880, 600], [918, 572], [HERO[0] + b, HERO[1] + 6]], { color: '#5d6a48', w: 4.4, press: .8, taper: [.1, .2] });
      W.bloom(p, HERO[0] + b, HERO[1], 34, 7, L, .02, 1, .25, .8); void k;
    }
    p.layer('A-wall', { every: 5, still: true, depth: .8 });
    p.mass([[-40, 886], [1300, 880], [1960, 872], [1960, 900], [-40, 916]], { sharp: true, color: '#63675c', dir: 0, size: .7 });
    W.wall(p, { line: [[-30, 886], [300, 894], [700, 898], [1010, 892], [1290, 884]], h: u => 236 * (1 - .05 * u + .03 * sin(u * 9)), size: 62, light: L, d: .05, seed: 5, moss: 14, lines: 70 });
    W.pier(p, { x: 1322, y: 890, w: 82, h: 276, light: L, d: .05, seed: 8 });
    p.layer('A-ground', { every: 4, depth: .85 });
    p.mass(U.below([[-40, 894], [400, 900], [900, 902], [1300, 892], [1960, 876]], 1130), { sharp: true, color: across(SUM.ground, AUT.ground, X - 40, 420), dir: .05, len: 1.2, size: 1, vary: .5 });
    p.shade([[-40, 960], [960, 976], [1960, 950], [1960, 1120], [-40, 1120]], { color: '#4c4a3c', alpha: .5, soft: 40, mode: 'multiply' });
    p.shade([[-40, 892], [1300, 888], [1300, 922], [600, 940], [-40, 930]], { color: '#4f5147', alpha: .45, soft: 12, mode: 'multiply' });
    p.layer('A-her', { every: 1, depth: 1 });
    herA(p, t, L);
    p.layer('A-front', { every: 1, depth: 1 });
    { const k = drained(Xq, 380), k2 = drained(Xq, 1000); memo(p, 'hang', tq + '|' + k + '|' + k2, p => { W.roseBush(p, { x: 400, y: 668, scale: 1.5, hang: true, len: 120, canes: 5, season: lerp(.32, .7, k), colour: lerp(.95, .62, k), bloom: lerp(1, .5, k), leaf: 1 - .4 * k, light: L, t: tq, wind, seed: 9, d: .02 }); W.roseBush(p, { x: 820, y: 664, scale: 1.15, hang: true, len: 90, canes: 3, season: lerp(.32, .72, k2), colour: lerp(.95, .4, k2), bloom: lerp(1, .5, k2), light: L, t: tq, wind, seed: 12, d: .02 }); }); }
    [[-40, 420, 1], [420, 900, 2], [900, 1340, 3], [1500, 1960, 4]].forEach(([x0, x1, sd]) => { const k = drained(X, (x0 + x1) / 2); W.grass(p, { line: [[x0, 912], [(x0 + x1) / 2, 918], [x1, 910]], n: 14, h: 46, depth: 14, t, wind, seed: 19 + sd, d: .03, lines: 18, light: L, season: lerp(.33, .68, k), colour: lerp(.8, .4, k) }); });
    // the first few to let go
    [[560, 470, 1.62, 1], [300, 520, 1.36, 2], [720, 560, 2.15, 3], [420, 420, 2.0, 4], [880, 470, 2.45, 5]].forEach(([x, y, t0, sd]) => petal(p, t, { x, y, t0, sd, s: 16, floor: 960 }));
    leaves(p, t, X);
  }
  function herA(p, t, L) {
    const C = B.cast, h = 620, x = keys(t, [[-1, 1700], [-.6, 1640], [.2, 1500, 'lin'], [1.05, 1262, 'lin'], [1.5, 1178, 'out']]), st = C.stride('mother', 'walk', h), walking = t < 1.5;
    const gx = .1 + .34 * (wind(t, x) - .1), reach = keys(t, [[1.75, 0], [1.95, -.06, 'out'], [2.6, .86, 'io'], [3.4, 1]]), turn = keys(t, [[1.2, 1.4], [1.9, 1.02, 'io']]);
    const amp = keys(t, [[1.0, 1], [1.5, .12, 'out']]);
    C.figure(p, 'mother', { x, y: 958, h, face: -1, yaw: turn, legs: walking ? { kind: 'walk', phase: (1700 - x) / st, amp } : { kind: 'stand', gap: .06 }, lean: keys(t, [[0, .05], [1.4, .03], [1.62, -.015, 'out'], [2.1, .03], [2.75, .1]]), bend: .08, weight: keys(t, [[1.5, 0], [1.9, .6]]), shrug: keys(t, [[1.9, 0], [2.2, .25], [2.6, .1]]),
      head: { turn: keys(t, [[0, .0], [1.3, .05], [1.7, .12]]), nod: keys(t, [[0, .26], [.9, .24], [1.35, .06, 'io'], [2.2, .1], [2.75, .14]]), tilt: keys(t, [[1.6, 0], [2.4, .1]]) },
      armFar: ['rest', { at: [HERO[0] + 42, HERO[1] + 16], h: 'reach' }, reach], armNear: 'rest', wind: [gx, 0], drag: [keys(t, [[1.2, .0], [1.5, -.06, 'out'], [1.9, 0]]), 0], light: { dir: -2.3, warm: .35, k: .45 }, expr: ['stillness', 'tender', keys(t, [[.6, 0], [1.8, 1]])] });
  }
  // one petal let go at t0
  function petal(p, t, o) { const W = B.world, age = t - o.t0; if (age < 0) return; const h = k => hash(o.sd, 5, k), z = W.flutter(o.sd * 17 + 3, age, { key: 's03' + (o.key || ''), x: o.x, y: o.y, rot: h(1) * TAU, vx: o.vx ?? (h(2) - .2) * 70, vy: o.vy ?? -20, wind, t0: o.t0, floor: o.floor, windPower: o.wp || 430, g: o.g }); if (z.x < -80 || z.x > 2000 || z.y > 1140) return; W.petal(p, Object.assign({ s: o.s || 18, tone: h(4), light: 'day' }, z)); }
  // small dry leaves leaving the bush just behind the edge of the tide
  function leaves(p, t, X) {
    const W = B.world, G = [[], []]; for (let i = 0; i < 16; i++) {
      const h = k => hash(i, 31, k), x = 60 + 980 * h(1), y = 380 + 240 * h(2), t0 = inv(x) + .25 + .6 * h(3), age = t - t0; if (age < 0) continue; const z = W.flutter(900 + i, age, { key: 'lf', x, y, rot: h(4) * TAU, vx: 40 * h(5), vy: -10, wind, t0, floor: 930 + 40 * h(6), windPower: 380 }); const l = 13 + 9 * h(7), f = .25 + .75 * Math.abs(cos(z.yaw)), c = cos(z.rot), q = sin(z.rot), P = (u, v) => [z.x + (u * c - v * f * q) * l, z.y + (u * q + v * f * c) * l]; G[i % 2].push([P(-1, 0), P(-.4, -.42), P(.4, -.36), P(1, 0), P(.4, .38), P(-.4, .4)]);
    }
    if (G[0].length) p.mass(W.util.poly(...G[0]), { color: '#a5813f', dir: .4, size: .36, len: .36 }); if (G[1].length) p.mass(W.util.poly(...G[1]), { color: '#8a6c42', dir: -.4, size: .36, len: .36 });
  }
  const inv = x => { for (let t = 1.2; t < 3.2; t += .05) if (tideA(t) > x) return t; return 3.2; };

  // ------------------------------------------------------------------------------------------------ B: hand and rose
  const tideB = t => keys(t, [[2.7, -300], [3.1, 60, 'in'], [5.2, 2350, 'lin']]);
  function drawB(p, s) {
    const W = B.world, C = B.cast, U = W.util, t = s.t, n = Math.round((t - CUT1) * 12), X = tideB(t), L = W.mixLight('day', 'rain', .15);
    p.paper('#e6ddc9');
    p.layer('B-back', { every: 5, depth: .1 });
    p.mass([[-40, -40], [1960, -40], [1960, 1120], [-40, 1120]], { sharp: true, color: { lin: [0, 0, 0, 1080], stops: [[0, '#b4bfc0'], [.55, '#d6d4c8'], [1, '#cfc7b1']] }, dir: -.25, len: 1.6, size: 1.5, vary: .4 });
    // the bush out of focus: heaps of leaf, ragged, the whole left side and all along the bottom
    const heaps = (list, a, b, al, sd) => p.mass(U.poly(...list.map(([x, y, rx, ry], i) => spline(U.lump(x, y, rx, ry, sd + i, { n: 13, rough: .3, rot: hash(i, sd, 3) - .5 }), 3, true))), { color: across(a, b, X, 520), dir: .7, size: .9, len: .7, vary: .6, alpha: al });
    heaps([[-20, 120, 260, 210], [60, 420, 330, 260], [210, 180, 150, 110], [330, 520, 210, 190], [120, 800, 420, 300], [470, 830, 240, 220], [760, 980, 330, 150], [1150, 1010, 360, 120], [1560, 1020, 380, 130], [1900, 1000, 260, 150], [250, -10, 180, 90], [310, 290, 150, 120]], SUM.leafD, AUT.leafD, 1, 3);
    heaps([[40, 260, 170, 120], [190, 520, 190, 130], [60, 720, 200, 140], [380, 700, 140, 110], [250, 900, 220, 110], [640, 960, 160, 70], [1040, 1010, 170, 60], [1500, 1000, 180, 60]], SUM.leaf, AUT.leaf, .8, 23);
    { const G = [], H = [[230, 60], [262, 120], [250, 210], [330, 300], [390, 390], [372, 250], [520, 470], [548, 560], [540, 650], [620, 700], [690, 790], [700, 850], [900, 860], [1040, 900], [980, 880], [1180, 905], [1330, 910], [1500, 900], [1660, 905], [1820, 880], [150, 300], [430, 420], [500, 520], [560, 740], [760, 870], [1250, 900], [1420, 905], [1750, 900]]; H.forEach(([x, y], i) => { for (let j = 0; j < 3; j++) { const h = k => hash(i, j, k), up = y > 840; G.push(leaf(x + (h(1) - .5) * 70, y + (h(2) - .5) * 50 + (up ? 24 : 0), 44 + 46 * h(3), up ? -PI / 2 + (h(4) - .5) * 1.8 : -.4 + (h(4) - .5) * 1.9, .36)); } }); p.mass(U.poly(...G), { color: across(SUM.leafD, AUT.leafD, X, 520), dir: .5, size: .6, len: .6, vary: .5 }); }
    p.mass([[-40, 1010], [400, 990], [1000, 1010], [1500, 1000], [1960, 1012], [1960, 1120], [-40, 1120]], { color: across('#35422f', '#4f4436', X, 520), dir: .1, size: 1.1, vary: .4, soft: 18 });
    p.layer('B-leaf', { every: 2, depth: .6 });
    // single leaves, each turning on its own
    const LV = [[-20, 200, 190, .3], [120, 110, 170, .9], [60, 330, 210, .1], [250, 250, 180, -.5], [300, 420, 190, -.1], [100, 520, 220, .2], [360, 590, 200, -.5], [180, 700, 230, 0], [430, 760, 210, -.4], [60, 860, 240, -.3], [330, 900, 220, -.2], [600, 900, 190, -.6], [820, 985, 180, -.8], [1060, 960, 170, -2.2], [1120, 1010, 190, -.5], [1400, 985, 170, -2.4], [1480, 1010, 190, -.6], [1760, 1000, 180, -2.2], [1800, 1010, 180, -.7], [300, 60, 150, .4]];
    const col = [[SUM.leaf, AUT.leaf], [SUM.leafL, AUT.leafL], [mixc(SUM.leaf, SUM.leafD, .5), mixc(AUT.leaf, AUT.leafD, .4)]];
    LV.forEach(([x, y, l, a], i) => { const k = drained(X + 90 * noise1(i * 2.3, 4), x, 300), w = wind(t - .1 * hash(i, 1, 1), x), sh = leaf(x + w * 10, y + 10 * k, l * (1 - .14 * k), a + .14 * w + .32 * k, .33 - .12 * k), c = col[i % 3]; p.mass(sh, { color: mixc(c[0], c[1], k), dir: a + .5, size: .7, len: .7, vary: .5 }); U.ln(p, [sh[0], [lerp(sh[0][0], sh[4][0], .5), lerp(sh[0][1], sh[4][1], .5) - 6], sh[4]], { color: mixc('#33402b', '#57432c', k), w: 2.2, press: .5, taper: [.05, .5] }); U.ln(p, sh.slice(i % 2, 6), { color: '#37382c', w: 1.7, press: .4, wobble: 1.4 }); if (k > .5 && i % 3 === 0) p.shade([sh[3], sh[4], sh[5]], { color: '#6b4a2c', alpha: .4 * k, soft: 8 }); });
    W.blooms(p, [{ x: 220, y: 470, r: 74 * (1 - .2 * drained(X, 220)), seed: 5, open: 1, rot: -.4, tilt: .8 }, { x: 120, y: 780, r: 60, seed: 14, open: .9, rot: -.2, tilt: .7 }, { x: 470, y: 880, r: 52, seed: 9, open: .9, rot: .3, tilt: 1 }], L, .15);
    // ---- the rose and the hand
    p.layer('B-act', { every: 1, depth: 1 });
    const touch = keys(t, [[3.2, 0], [3.34, 1, 'out'], [3.5, .5], [3.9, .62], [4.08, 1], [4.3, .4], [5, .2]]), ap = keys(t, [[4.12, 0], [4.2, .04, 'out'], [4.44, .07], [4.62, .18, 'in'], [5.1, .74, 'lin'], [5.4, .97, 'out'], [5.9, 1]]);
    const rx = 690 - 20 * touch + wind(t, 700) * 9, ry = 392 - 10 * touch + 4 * sin(t * 1.3), rot = .05 - .1 * touch + .06 * wind(t, 700);
    const hx = keys(t, [[2.5, 2150], [3.26, 1404, 'io'], [3.38, 1384, 'out'], [3.6, 1390], [4.0, 1216, 'io'], [4.14, 1212], [4.3, 1268, 'out'], [4.72, 1262], [5.06, 1242, 'io'], [5.5, 1262]]);
    const hy = keys(t, [[2.5, 760], [3.26, 468, 'out'], [3.6, 472], [4.0, 646, 'io'], [4.14, 642], [4.3, 690, 'out'], [4.72, 740], [5.06, 776, 'io'], [5.36, 752]]);
    const roll = keys(t, [[3.5, 8], [4.0, 66, 'io'], [4.14, 66], [4.34, 86, 'out'], [4.76, 126, 'io'], [5.06, 132], [5.36, 96, 'io']]), hr = keys(t, [[2.7, .16], [3.3, -.02, 'out'], [3.6, .02], [4.0, .1, 'io'], [4.14, .12], [4.34, .02, 'out'], [5.05, .0], [5.4, -.12]]);
    const pk = t < 4.02 ? ['reach', 'cradle', .92 * ease.io(clamp((t - 3.5) / .5))] : t < 4.6 ? ['cradle', 'open', keys(t, [[4.16, 0], [4.3, .6, 'out'], [4.6, .4]])] : t < 5.06 ? ['cradle', 'open', keys(t, [[4.6, .4], [5.06, .1]])] : ['cradle', 'fist', keys(t, [[5.06, 0], [5.36, .9, 'io'], [5.6, 1]])];
    const hand = { who: 'mother', x: hx, y: hy, h: 520, pose: pk, rot: hr, mir: -1, roll, light: { dir: -2.2, warm: .45, k: .5 }, armLen: 300, arm: [2500, hy + 260], cuffAt: .5, sleeveLen: 1300 };
    const st = spline([[rx - 10, ry + 60], [rx - 60, ry + 270], [rx - 10, ry + 520], [rx - 120, 1150]], 8, false), rb = U.ribbon(st, u => 9 + 6 * u, { step: 22, rough: 1.4 }), kS = drained(X, 690); p.mass(rb.poly, { sharp: true, color: mixc('#566a3f', '#77643f', kS), dir: 1.5, size: .55, len: .8 }); U.ln(p, rb.R, { color: '#33362a', w: 2.4, press: .6 }); U.ln(p, rb.L, { color: '#4b4f3c', w: 1.6, press: .4 });
    [[.3, 1], [.46, -1], [.62, 1], [.76, -1]].forEach(([u, sg]) => { const q = (sg > 0 ? rb.R : rb.L)[Math.floor(u * rb.L.length)]; U.ln(p, [q, [q[0] + sg * 22, q[1] - 8]], { color: '#6d5036', w: 6, press: .85, taper: [0, .8] }); });
    [[rx - 48, ry + 250, 190, -2.75, 0], [rx - 30, ry + 380, 200, .3, 1], [rx - 16, ry + 560, 210, -2.9, 2]].forEach(([x, y, l, a, i]) => { const k = drained(X + 40, 700, 280), sh = leaf(x, y, l * (1 - .1 * k), a + .15 * wind(t, x) - .2 * k, .34 - .1 * k); p.mass(sh, { color: mixc(i % 2 ? SUM.leafL : SUM.leaf, i % 2 ? AUT.leafL : AUT.leaf, k), dir: a + .4, size: .6, len: .6, vary: .45 }); U.ln(p, [sh[0], [lerp(sh[0][0], sh[4][0], .5), lerp(sh[0][1], sh[4][1], .5) - 6], sh[4]], { color: '#39422e', w: 2.4, press: .55, taper: [.05, .5] }); for (let j = 0; j < 3; j++) { const m = [lerp(sh[0][0], sh[4][0], .3 + .18 * j), lerp(sh[0][1], sh[4][1], .3 + .18 * j)]; U.ln(p, [m, [lerp(m[0], sh[1 + j][0], .7), lerp(m[1], sh[1 + j][1], .7)]], { color: '#3f4732', w: 1.5, press: .4, taper: [.05, .7] }); U.ln(p, [m, [lerp(m[0], sh[7 - j][0], .7), lerp(m[1], sh[7 - j][1], .7)]], { color: '#3f4732', w: 1.5, press: .4, taper: [.05, .7] }); } U.ln(p, sh.slice(0, 5), { color: '#33362a', w: 2, press: .5 }); U.ln(p, sh.slice(4).concat([sh[0]]), { color: '#33362a', w: 2, press: .4 }); });
    const under = t > 3.66; let H = null; if (under) H = C.hand(p, hand);
    const R = W.rose(p, { x: rx, y: ry, r: 226, apart: ap, seed: 3, rot, tilt: .92, stem: false, light: L, wind, t0: 4.12, shake: t > 3.24 && t < 3.6 ? 1 : 0, loose: false, span: 1.9, t, fall: { key: 'rz', t0: 4.2, windPower: 380, g: 860 } });
    if (ap < .5) p.shade(U.lump(rx, ry, 222, 190, 3, { n: 12, rough: .06 }), { color: '#c2453a', alpha: .42 * (1 - ap * 2), soft: 18, mode: 'multiply' });
    if (!under) H = C.hand(p, hand);
    // petals that come down into the hand
    const inHand = (u, v, w) => { const q = H.V(u, v, w); return [q[0], q[1]]; };
    const land = (t1, u, v, rot0, sd) => { if (t < t1 - .28 || t > 5.3) return; const q = inHand(u, v, .05), k = clamp((t - t1 + .28) / .28), sw = sin(k * 5 + sd) * 46 * (1 - k); W.petal(p, { x: q[0] + sw + 30 * (1 - k), y: q[1] - 250 * (1 - k * k) - 12, s: 70, rot: lerp(rot0 + 1.3, rot0, k), yaw: lerp(1.9, .35, k), tone: .3 + .2 * sd, light: L }); };
    const L2 = R.loose.slice().sort((a, b) => a.y - b.y); L2.forEach(l => W.petal(p, Object.assign({ light: L }, l, { s: l.s * .92 })));
    if (t < 4.62 && under) C.hand(p, Object.assign({}, hand, { only: 'thumb', sleeve: false }));
    land(4.84, .44, .0, 2.9, 1); land(4.97, .74, -.02, 2.5, 2);
    if (t > 5.12) { // the fingers close over it
      const k = clamp((t - 5.12) / .2); if (k < 1) { C.hand(p, Object.assign({}, hand, { only: 'thumb', sleeve: false })); } else C.hand(p, hand);
      const q = inHand(.62, .16, .02); W.petal(p, { x: q[0] - 4, y: q[1] - 26, s: 50, rot: -1.9, yaw: .5, tone: .4, light: L });
    }
    // the first drawing after the cut is still half a sketch
    if (n <= 1) { p.layer('B-lay', { every: 1, depth: 1 }); const c = '#6d8594'; p.line(circ(rx, ry, 236), { color: c, w: 3.4, press: .55, passes: 2, medium: 'redline', wobble: 2 }); p.line([[rx - 10, ry + 230], [rx - 70, ry + 470], [rx - 120, 1080]], { color: c, w: 3, press: .45, medium: 'redline' }); p.line([[1940, 880], [hx + 160, hy + 60], [hx - 320, hy - 60]], { color: c, w: 3, press: .5, passes: 2, medium: 'redline' }); if (n <= 0) p.lift([[-40, -40], [1960, -40], [1960, 1120], [-40, 1120]], { amount: .34, soft: 10 }); }
  }
  const circ = (x, y, r) => { const o = []; for (let i = 0; i <= 14; i++) o.push([x + cos(i / 13 * TAU) * r * (1 + .02 * i), y + sin(i / 13 * TAU) * r]); return o; };
  function leaf(x, y, l, a, w) { const c = cos(a), q = sin(a), P = (u, v) => [x + (u * c - v * q) * l, y + (u * q + v * c) * l]; return [P(0, 0), P(.22, -w * .7), P(.55, -w), P(.85, -w * .5), P(1.05, .04), P(.8, w * .55), P(.5, w * .95), P(.2, w * .6)]; }

  // ------------------------------------------------------------------------------------------------ C: her
  const tideC = t => keys(t, [[5.3, 900], [6.3, 2500, 'io']]);
  function drawC(p, s) {
    const W = B.world, C = B.cast, U = W.util, t = s.t, n = Math.round((t - CUT2) * 12), X = tideC(t), L = W.mixLight('day', 'rain', .4);
    p.paper('#e6ddc9');
    p.layer('C-back', { every: 5, depth: .1 });
    p.mass([[-40, -40], [1960, -40], [1960, 720], [-40, 720]], { sharp: true, color: { lin: [0, 0, 0, 700], stops: [[0, '#b2b9b8'], [.6, '#cfcdc2'], [1, '#ddd2bd']] }, dir: -.2, len: 1.7, size: 1.6, vary: .45 });
    const far = U.ridge([[-60, 560], [260, 520], [620, 560], [900, 600], [1300, 560], [1640, 520], [1980, 560]], { amp: 8, seed: 81, step: 30 }); p.mass(U.below(far, 1130), { sharp: true, color: across('#a6aa7e', mixc(AUT.hill, '#c4bba8', .4), X, 620), dir: -.08, len: 1.5, size: 1.3, vary: .4 }); U.found(p, far, { color: '#7a7a70', w: 2, press: .32, seed: 4, seg: 240, gap: .5, skip: .3 });
    p.mass(U.below([[-40, 800], [600, 820], [1200, 800], [1960, 780]], 1130), { sharp: true, color: across(SUM.ground, AUT.ground, X, 620), dir: .04, len: 1.3, size: 1.1, vary: .5 });
    p.layer('C-bush', { every: 3, depth: .5 });
    const tq = Math.floor(p.n / 3) / 4 - 22.3; memo(p, 'bushC', tq, p => W.roseBush(p, { x: 250, y: 860, scale: 2.5, w: 330, h: 200, season: .72, colour: .55, leaf: .66, bloom: .1, light: L, t: tq, wind, seed: 4, canes: 8, d: .12, dens: .7, flowers: 26 }));
    p.layer('C-wall', { every: 5, still: true, depth: .7 }); W.wall(p, { line: [[-60, 1150], [400, 1156], [1000, 1150], [2000, 1140]], h: u => 262 - 40 * u, size: 96, light: L, d: .1, seed: 15, moss: 8, lines: 0 }); p.shade([[-40, 900], [1960, 910], [1960, 1120], [-40, 1120]], { color: '#4a4b4a', alpha: .78, soft: 40, mode: 'multiply' });
    p.layer('C-petal0', { every: 1, depth: .8 }); stream(p, t, 0);
    p.layer('C-her', { every: 1, depth: 1 });
    const hk = keys(t, [[5.62, 0], [5.74, -.05, 'out'], [6.24, 1, 'io'], [8, 1]]), bow = keys(t, [[6.1, 0], [6.6, 1, 'io']]), br = .006 * sin(t * 2.0);
    const eyes = { base: 'ache', open: keys(t, [[5.4, .85], [6.05, .8], [6.2, .45, 'io'], [6.42, .5], [6.56, .12, 'io'], [8, .08]]), gx: keys(t, [[5.4, .3], [5.95, -.25, 'io'], [6.2, .0]]), gy: keys(t, [[5.4, .1], [5.95, .02], [6.2, .55]]), mOpen: keys(t, [[5.4, .12], [6.1, .1], [6.5, .02]]), press: keys(t, [[6.1, .1], [6.6, .6]]), wet: .95, smile: -.3 };
    const F = C.figure(p, 'mother', { x: 1236, y: 2080, h: 1900, face: -1, yaw: keys(t, [[5.4, .78], [5.95, .55, 'io'], [6.6, .66]]), armNear: [{ p: [.1, .58], h: 'fist', over: true }, { g: 'overHeart', h: 'fist', add: [-.004, .012 * bow] }, hk], armFar: 'rest', bend: .06 + .1 * bow, lean: .02 + .02 * bow, shrug: keys(t, [[5.5, 0], [6.15, .5, 'io'], [6.7, .25]]) + br * 12,
      head: { turn: keys(t, [[5.4, .12], [5.95, -.16, 'io'], [6.55, .05]]), nod: keys(t, [[5.4, .02], [5.95, -.03], [6.6, .24, 'io'], [8, .26]]), tilt: keys(t, [[5.9, .0], [6.6, .13, 'io']]) }, expr: eyes, wind: [.28 + .5 * wind(t, 1200), -.04], light: { dir: -2.3, warm: .3, k: .5 }, legs: 'stand' });
    { const q = F.handNear, k = hk; if (q) W.petal(p, { x: q[0] + lerp(-6, 10, k), y: q[1] + lerp(-20, -26, k), s: 32, rot: lerp(2.9, -2.1, k), yaw: .5, tone: .35, light: L }); }
    p.shade([[-40, 936], [1960, 936], [1960, 1120], [-40, 1120]], { color: '#4a4b4c', alpha: .8, soft: 30, mode: 'multiply' });
    p.layer('C-petal1', { every: 1, depth: 1 }); stream(p, t, 1);
    if (n <= 0) p.lift([[-40, -40], [1960, -40], [1960, 1120], [-40, 1120]], { amount: .3, soft: 10 });
  }
  // the petals going over the wall and across the paper. near ones pass in front of her and are big; each has its own flight
  function stream(p, t, near) {
    for (let i = 0; i < 70; i++) {
      const h = k => hash(i, 77, k), isN = h(1) < .2 ? 1 : 0; if (isN !== near) continue;
      const t0 = 4.5 + 1.9 * Math.pow(h(2), 1.1), x = -160 + 560 * h(3);
      // the near ones keep below or above her face; the far ones pass behind her
      if (near) petal(p, t, { key: 'n', x: x - 120, y: h(4) < .7 ? 700 + 190 * h(5) : 60 + 70 * h(5), t0, sd: i + 60, s: 32 + 22 * h(5), vx: 560 + 260 * h(6), vy: h(4) < .7 ? -60 * h(7) : -20, wp: 1250, g: h(4) < .7 ? 120 : 60 });
      else petal(p, t, { key: 'c', x, y: 400 + 440 * h(4) * h(8), t0, sd: i + 60, s: 11 + 15 * h(5), vx: 420 + 380 * h(6), vy: -320 + 180 * h(7), wp: 950, g: 250 });
    }
  }
  B.scene({ id: 's03', ink: s => s.t < CUT1 ? 'dark' : s.t < CUT2 ? 'dark' : 'dark', draw(p, s) { const n = Math.round(s.t * 12); if (n < Math.round(CUT1 * 12)) drawA(p, s); else if (n < Math.round(CUT2 * 12)) drawB(p, s); else drawC(p, s); } });
})();
