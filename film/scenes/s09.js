// s09 · THE CHAIR  (68.3 – 76.4)  whistle alone
//
// Feeling: the house after. Nothing happens; a ball of wool gets down by itself and goes to find him.
// Music (scene time): harp .25 · 2.1–2.4 (roll) · 3.6 · 4.6–4.9 · 5.9 · 7.1 (last). Whistle breathes at 4.5.
//  -.6 – 1.2  nothing. embers, an empty chair, her shawl over its back, the ball where her lap was.
//  1.2        the fire draws; the fringe of the shawl leans to the open door; the ball rocks once, and back.
//  1.75 – 2.4 rocks again, goes over the edge of the seat; lands on the harp.
//  2.5 – 4.6  rolls the length of the floor, unwinding. 4.62 bumps the threshold and stops.
//  5.0 – 5.7  climbs the sill, hangs there, tips. 5.9 the grass takes it; the thread draws tight, lifts off the floor, and lies down again.
//  4.5 – 7.2  flame to ember to a thread of smoke. The only colour left is the line across the floor.
// Eye: ball on the chair → along the floor with it → the door → back along the thread to the chair.
// Value: everything sinks toward one grey-brown; lightest = the grey doorway, and the red.
(function () {
  const B = window.BIDE, A = B.anim, { clamp, lerp, ease, hash, noise1, mixc, keys } = A, TAU = Math.PI * 2, hyp = Math.hypot;
  const ss = (a, b, x) => { x = clamp((x - a) / (b - a)); return x * x * (3 - 2 * x); };
  const SEAT = [848, 742], Z = 1.1, TX = -90, TY = -50, DOOR = [[1573, 766], [1575, 225], [1870, 174], [1875, 859]];
  let LT = null; const dusk = () => LT || (LT = B.world.mixLight('night', 'rain', .55));
  const draught = t => keys(t, [[1.05, 0], [1.4, 1, 'io'], [1.9, .5], [2.3, 1, 'io'], [3.2, .3], [4.4, .45], [5.6, .3], [7, .1], [9, .05]]);

  // ---- the ball: contact point on the ground, height above it, radius
  const R0 = 38, X0 = SEAT[0] + 14, YF = 972;
  function ball(t) {
    const rock = keys(t, [[1.3, 0], [1.46, 7, 'out'], [1.64, -4, 'io'], [1.78, -1], [1.98, 15, 'in'], [2.12, 40, 'in']]);
    if (t < 2.12) return { x: SEAT[0] + rock * .35, y: SEAT[1] + Math.max(0, rock) * .5 + (rock > 15 ? (rock - 15) * .9 : 0), h: 0, r: R0, roll: rock / R0, sq: 0, on: 'seat' };
    if (t < 2.42) { const u = (t - 2.12) / .3; return { x: X0 + 14 * u, y: YF, yy: lerp(SEAT[1] + 42, YF, u * u), h: 0, r: R0, roll: 40 / R0 + u * .9, sq: -.08 * u, on: 'air' }; }
    const X = keys(t, [[2.42, X0 + 14], [2.66, X0 + 26, 'lin'], [3.1, X0 + 96, 'in'], [3.6, X0 + 300, 'lin'], [4.1, X0 + 545, 'lin'], [4.62, 1638, 'lin'], [4.7, 1627, 'out'], [4.86, 1631, 'io'], [5.02, 1631], [5.34, 1660, 'io'], [5.46, 1667], [5.58, 1661, 'io'], [5.7, 1668, 'io'], [5.84, 1690, 'in'], [6.02, 1738, 'lin'], [6.12, 1748, 'out']]);
    if (t > 6.12) { const q = keys(t, [[6.12, [1748, 812, 24]], [6.6, [1766, 758, 17], 'lin'], [7.1, [1782, 706, 10], 'lin'], [7.6, [1780, 676, 6], 'lin'], [8.4, [1785, 655, 3], 'lin'], [9.2, [1790, 648, 1.5], 'lin']]); return { x: q[0], y: q[1], h: 0, r: q[2], roll: 30 + t * 9, sq: 0, on: 'grass' }; }
    const gy = keys(X, [[X0, YF], [X0 + 70, YF, 'lin'], [1090, 958, 'lin'], [1320, 918, 'lin'], [1520, 868, 'lin'], [1632, 842, 'lin'], [1652, 824, 'lin'], [1676, 810, 'lin'], [1700, 818, 'lin'], [1748, 812, 'lin']]);
    const hop = t < 2.66 ? 30 * Math.sin((t - 2.42) / .24 * Math.PI) : t < 2.8 ? 8 * Math.sin((t - 2.66) / .14 * Math.PI) : (t > 4.62 && t < 4.78) ? 10 * Math.sin((t - 4.62) / .16 * Math.PI) : 0;
    const jig = t > 2.8 && t < 4.6 ? 1.8 * Math.abs(Math.sin(X * .029)) + (hash(Math.round(X / 90), 3, 3) > .6 ? 1.8 : 0) : 0;
    const r = lerp(R0, 25, ss(X0 + 30, 1700, X)), sq = t < 2.5 ? .2 * (1 - (t - 2.42) / .08) : t > 4.6 && t < 4.7 ? .12 : .03;
    return { x: X, y: gy, h: hop + jig, r, roll: 40 / R0 + .9 + (X - X0 - 14) / r, sq, on: X < 1692 ? 'floor' : 'grass' };
  }
  // where it has been: the thread, from the rope of the seat, down the leg, along the floor
  function trail(t) {
    const pts = [[SEAT[0] - 26, SEAT[1] - 10], [SEAT[0] - 6, SEAT[1] - 6], [SEAT[0] + 12, SEAT[1] + 10], [SEAT[0] + 18, SEAT[1] + 40]]; if (t < 2.16) return null;
    const end = Math.min(t, 8.8), c = ball(Math.min(t, 2.42));
    if (t < 2.42) { pts.push([c.x - 6, lerp(SEAT[1] + 40, c.yy || 900, .5) - 16], [c.x - 2, (c.yy || c.y) - c.r * 1.7]); return pts; }
    pts.push([SEAT[0] + 20, 840], [SEAT[0] + 16, 910], [SEAT[0] + 20, 956], [SEAT[0] + 42, 972]); const i0 = pts.length - 1; let j = i0;
    for (let q = 2.8; q <= end; q += .09) { const b = ball(q), l = pts[pts.length - 1]; if (hyp(b.x - l[0], b.y - l[1]) < (b.x > 1700 ? 13 : 30)) continue; pts.push([b.x + (b.x > 1740 ? 2 * noise1(b.y / 14, 3) : 0), b.y - 3 + 5 * noise1(b.x / 47, 5) * (b.x > 1700 ? .3 : 1)]); if (b.x < 1690) j = pts.length - 1; }
    const e = ball(end); pts.push([e.x - e.r * .45, e.y - e.h - e.r * .4]);
    // when the ball drops over the sill it draws tight, lifts, and lies down again a little straighter
    const pull = keys(t, [[5.86, 0], [6.14, 1, 'out'], [6.36, .9], [6.95, 0, 'io']]), A0 = pts[i0], Z0 = pts[j], n = j;
    for (let i = i0; i < n; i++) { const u = (i - i0) / (n - i0), sx = lerp(A0[0], Z0[0], u), sy = lerp(A0[1], Z0[1], u), k = Math.max(pull * .8, .3 * ss(6.3, 7, t)), bow = 34 * Math.sin(Math.PI * u) * (1 - pull * .7); pts[i] = [lerp(pts[i][0], sx, k * .7), lerp(pts[i][1], sy + bow, k * .7) - pull * 9 * Math.sin(Math.PI * u) - pull * 3 * Math.sin(u * 22 - t * 26)]; }
    return pts;
  }
  // ---- the empty chair, three-quarter, turned to the fire. ladder back, rope seat
  function slab(p, pts, w, c, dk, o = {}) { const n = pts.length - 1, L = [], R = []; pts.forEach((v, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n, i + 1)], d = hyp(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / d, ny = (b[0] - a[0]) / d, k = w * .5 * (1 + .1 * noise1(v[1] * .03 + w, 2)); L.push([v[0] + nx * k, v[1] + ny * k]); R.push([v[0] - nx * k, v[1] - ny * k]); }); p.mass(L.concat(R.slice().reverse()), { sharp: true, color: c, dir: Math.atan2(pts[n][1] - pts[0][1], pts[n][0] - pts[0][0]), len: .9, size: .42, vary: .4 }); if (o.dark !== 0) p.line(o.flip ? L : R, { color: dk, w: 3.2, press: .72, taper: [.06, .12], wobble: 1.1 }); if (o.lit) p.line(o.flip ? R : L, { color: o.lit, w: 3, press: .5, taper: [.15, .3], medium: 'crayon' }); }
  function chair(p, lit) {
    const c = '#7d6347', dk = '#2f251d', md = mixc(c, dk, .34), li = mixc('#7a6346', '#d9ab6c', lit);
    slab(p, [[838, 700], [832, 800], [834, 872]], 15, mixc(c, dk, .5), dk); slab(p, [[834, 826], [948, 840]], 9, mixc(c, dk, .5), dk);            // far legs
    slab(p, [[950, 716], [948, 800], [954, 892]], 17, md, dk);
    slab(p, [[772, 832], [836, 800]], 8, mixc(c, dk, .4), dk); slab(p, [[892, 858], [950, 820]], 9, md, dk); slab(p, [[770, 872], [890, 896]], 10, mixc(c, dk, .2), dk, { lit: li }); slab(p, [[770, 812], [892, 834]], 9, mixc(c, dk, .25), dk);
    slab(p, [[840, 712], [848, 580], [862, 440]], 17, mixc(c, dk, .15), dk, { lit: li }); slab(p, [[950, 722], [962, 590], [980, 448]], 18, md, dk, { lit: mixc(md, li, .5) });   // back posts
    [[464, 34], [548, 32], [630, 30]].forEach(([y, h], i) => { const x0 = lerp(862, 842, (y - 440) / 270), x1 = lerp(980, 952, (y - 448) / 270); const q = [[x0 + 6, y - h / 2 + 2], [(x0 + x1) / 2, y - h / 2 - 6], [x1 - 6, y - h / 2 + 8], [x1 - 6, y + h / 2 + 6], [(x0 + x1) / 2, y + h / 2 - 5], [x0 + 6, y + h / 2]]; p.mass(q, { sharp: true, color: { lin: [x0, 0, x1, 0], stops: [[0, mixc(c, li, .5)], [1, md]] }, dir: .05, size: .45, len: .8, vary: .4 }); p.line([q[5], q[4], q[3]], { color: dk, w: 3, press: .7, wobble: 1, taper: [.05, .1] }); p.line([q[0], q[1], q[2]], { color: li, w: 2.6, press: .45, medium: 'crayon' }); });
    for (const [x, y] of [[863, 432], [981, 440]]) p.mass([[x - 10, y + 10], [x - 11, y - 4], [x, y - 13], [x + 11, y - 3], [x + 10, y + 11]], { color: mixc(c, li, .3), size: .4, len: .4 });
    p.mass([[762, 744], [834, 704], [952, 720], [894, 768]], { sharp: true, color: { lin: [762, 0, 952, 0], stops: [[0, mixc('#8f7850', '#d8b274', lit)], [1, '#7a6847']] }, dir: .12, size: .55, len: .7, vary: .4 });       // rope seat
    for (let i = 1; i < 9; i++) { const u = i / 9, a = [lerp(762, 834, u), lerp(744, 704, u)], b = [lerp(894, 952, u), lerp(768, 720, u)]; p.line([a, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 5], b], { color: dk, w: 2, press: .36, wobble: 1 }); }
    p.line([[774, 742], [830, 736], [888, 752], [852, 726], [836, 712]], { color: dk, w: 2.4, press: .34, wobble: 1 });
    p.mass([[758, 744], [896, 768], [896, 782], [758, 757]], { sharp: true, color: mixc(c, dk, .12), dir: .16, size: .4, len: .7 }); p.mass([[896, 768], [956, 720], [956, 733], [896, 782]], { sharp: true, color: md, dir: -.6, size: .4, len: .7 }); p.line([[758, 758], [896, 783], [956, 734]], { color: dk, w: 3.6, press: .8, taper: [.04, .08] }); p.line([[760, 744], [894, 768]], { color: li, w: 3, press: .5, medium: 'crayon' });
    slab(p, [[768, 752], [764, 830], [768, 914]], 17, c, dk, { lit: li }); slab(p, [[892, 776], [890, 860], [894, 942]], 19, mixc(c, dk, .12), dk, { lit: li });       // near legs
  }
  // her shawl: over the right corner of the back, one point hanging in front
  function shawl(p, t, dr, lit) {
    const sw = dr * 9 + 1.6 * noise1(t * 1.2, 4), K = (d, l) => mixc(d, l, lit);
    const B0 = [[978, 436], [1000, 446], [1012, 500], [1018, 600], [1016 + sw * .5, 690], [1008 + sw, 742], [996 + sw * .9, 716], [988 + sw, 756], [978 + sw * .7, 700], [972, 600], [974, 500]];
    p.mass(B0, { color: K('#3f362c', '#6b583d'), dir: 1.5, size: .6, len: .8, vary: .4 }); p.line(B0.slice(0, 8), { color: '#2a221b', w: 3.2, press: .6, taper: [.1, .2] }); fringe(p, [980, 712], [1012, 740], 8, sw, '#5a4a33', t);
    const P = [[892, 452], [916, 436], [952, 432], [986, 434], [1004, 448], [1004, 478], [996, 530], [990, 590], [984 + sw * .3, 640], [972 + sw * .6, 690], [962 + sw * .5, 650], [950 + sw * .7, 702], [940 + sw * .5, 640], [926 + sw * .4, 610], [912 + sw * .2, 560], [900, 510]];
    p.mass(P, { color: { lin: [890, 0, 1004, 0], stops: [[0, K('#77613f', '#d9aa62')], [.5, K('#625139', '#a08050')], [1, K('#473c30', '#665440')]] }, dir: 1.4, size: .62, len: .9, vary: .45 });
    p.shade([[966, 436], [1004, 452], [994, 560], [978, 640], [960, 600], [960, 500]], { color: '#2e2622', alpha: .36, soft: 14 });
    [[[914, 444], [924, 520], [932 + sw * .3, 606]], [[938, 438], [948, 520], [950 + sw * .5, 660]], [[966, 438], [972, 540], [968 + sw * .5, 650]], [[898, 470], [940, 462], [1000, 470]]].forEach(v => p.line(v, { color: '#33291f', w: 3, press: .5, taper: [.15, .4], wobble: 1.3 }));
    p.line([[972 + sw * .6, 690], [984 + sw * .3, 640], [996, 530], [1004, 478], [1004, 448], [986, 434], [952, 432], [916, 436], [892, 452], [900, 510], [912 + sw * .2, 560], [926 + sw * .4, 610], [940 + sw * .5, 640], [950 + sw * .7, 702]], { color: '#2c241d', w: 3.6, press: .65, taper: [.08, .15], wobble: 1.2 });
    fringe(p, [930 + sw * .1, 612], [978, 682], 12, sw * .7, K('#54462f', '#b48d55'), t); fringe(p, [902, 520], [926, 600], 6, sw * .4, K('#54462f', '#b48d55'), t);
  }
  function fringe(p, a, b, n, sw, c, t) { for (let i = 0; i < n; i++) { const u = i / (n - 1), x = lerp(a[0], b[0], u) + sw, y = lerp(a[1], b[1], u) + 6 * Math.sin(u * 7); p.line([[x, y - 8], [x + sw * .4 + 2 * noise1(t * 2 + i, 8), y + 13], [x + sw * .9 + 3 * noise1(t * 2 + i, 9), y + 30]], { color: i % 2 ? c : '#33291f', w: 2.8, press: .65, taper: [.05, .5] }); } }
  // what is outside: the only thing that gets lighter
  function outside(p, t, dawn, g, bend, b) {
    const c = (n, d) => mixc(n, d, dawn);
    p.clip(x => { x.beginPath(); DOOR.forEach((v, i) => i ? x.lineTo(v[0], v[1]) : x.moveTo(v[0], v[1])); x.closePath(); }, () => {
      p.mass([[1540, 130], [1900, 130], [1900, 700], [1540, 700]], { sharp: true, color: { lin: [0, 180, 0, 620], stops: [[0, c('#3d4654', '#8e989f')], [.7, c('#525a63', '#b6bab6')], [1, c('#5f6468', '#c9c8bd')]] }, dir: -.1, len: 1.1, size: .9, vary: .35 });
      p.mass([[1540, 570], [1640, 536], [1740, 548], [1830, 520], [1920, 530], [1920, 720], [1540, 720]], { color: c('#444c52', '#8b9492'), dir: .1, size: .8, len: .9, vary: .4 });
      p.mass([[1540, 640], [1700, 632], [1800, 644], [1920, 630], [1920, 900], [1540, 900]], { color: { lin: [0, 630, 0, 850], stops: [[0, c('#4b524f', '#939a8c')], [1, c('#3c423f', '#767d70')]] }, dir: .05, size: .8, len: .9, vary: .5 });
      p.mass([[1690, 850], [1740, 740], [1790, 690], [1772, 652], [1786, 650], [1812, 690], [1800, 750], [1800, 860]], { color: c('#5c605e', '#b3ae9f'), alpha: .85, dir: 1.2, size: .6, len: .7 });
      p.line([[1570, 566], [1640, 538], [1740, 550], [1830, 522], [1880, 528]], { color: '#39404a', w: 2.6, press: .4, taper: [.2, .3], wobble: 1.5 });
      if (b) wool(p, b, dawn);
      p.shade([[1575, 225], [1640, 214], [1620, 780], [1573, 766]], { color: '#2b3038', alpha: .3 * (1 - .5 * dawn), soft: 20 });
      for (let i = 0; i < 62; i++) { const u = (i + hash(i, 4, 1)) / 62, x = lerp(1570, 1880, u), y = lerp(772, 862, u) - 2 - 26 * hash(i, 4, 2), h = 30 + 50 * hash(i, 4, 3), w = g(t, x, y) * .5 + bend(x) + (hash(i, 4, 5) - .5) * .5; p.line([[x, y, 1], [x + Math.sin(w * .4) * h * .55, y - Math.cos(w * .4) * h * .55, .9], [x + Math.sin(w * 1.1) * h, y - Math.cos(w * 1.1) * h, .4]], { color: c(['#39413f', '#4b524f', '#2f3735', '#565c57'][i % 4], ['#69736a', '#7c8577', '#566059', '#989c8a'][i % 4]), w: 4, press: .75, taper: [.02, .6], wobble: .5, medium: i % 2 ? 'crayon' : 'graphite' }); }
    });
  }
  function draw(p, s) {
    const W = B.world, t = s.t, dr = draught(t), g = W.windOf(.12 + .4 * dr);
    const fk = keys(t, [[-1, .5], [1.1, .46], [1.4, .58, 'out'], [1.9, .4], [2.5, .36], [4.2, .2, 'io'], [5.6, .075, 'io'], [6.4, .05], [7.15, .02]]), glow = keys(t, [[-1, 1], [1.4, 1.02], [2.4, .88], [4.4, .6, 'io'], [6.0, .22, 'io'], [7.2, .04, 'io'], [9, 0]]), dawn = keys(t, [[-1, .06], [2.4, .12], [6.2, .72, 'io'], [8.4, .95]]);
    const In = f => { p.push(); p.translate(TX, TY); p.scale(Z, Z); f(); p.pop(); }, lit = clamp(glow * .95), b = ball(t), tr = trail(t);
    p.paper('#a89a84');
    p.layer('room', { every: 6, depth: .75 }); In(() => W.interior(p, { part: 'back', fire: .5 * Math.round(glow * 8) / 8, door: 1, day: .12, light: dusk(), season: .7, wind: 0, doorGrass: false, t: 0 }));
    // the window, greyed down
    p.mass([[951, 285], [1140, 281], [1142, 495], [949, 498]], { sharp: true, color: { lin: [0, 284, 0, 496], stops: [[0, '#434a52'], [1, '#565a5c']] }, dir: .4, size: .8, len: .8, vary: .4 }); p.line([[1044, 284], [1045, 496]], { color: '#7c6b54', w: 9, press: .9, taper: [0, 0], medium: 'crayon' }); p.line([[949, 391], [1141, 388]], { color: '#7c6b54', w: 9, press: .9, taper: [0, 0], medium: 'crayon' }); [[[949, 500], [951, 283]], [[947, 285], [1144, 281]], [[1140, 279], [1142, 497]]].forEach(v => p.line(v, { color: '#2f2722', w: 3, press: .6, wobble: 1.3, taper: [.05, .1] }));
    p.shade([[760, 930], [890, 900], [1000, 880], [1200, 884], [1260, 910], [1080, 950], [900, 966]], { color: '#3a2d24', alpha: .55, soft: 24 });
    p.layer('fire', { every: 2, depth: .85 }); In(() => W.fire(p, { x: 446, y: 694, w: 170, h: 130, k: fk, t }));
    p.layer('chair', { every: 2, depth: .95 });
    chair(p, lit); shawl(p, t, dr, lit);
    // the light goes out of the room
    const G = Math.min(1, glow); W.firelight(p, { x: 400, y: 660, r: lerp(720, 1220, G), alpha: lerp(.6, .88, G), warm: mixc('#9a9ca2', '#ffe6b4', G), dark: mixc('#34363f', '#3c3a42', G), t });
    p.air({ color: '#737a86', alpha: .5 * (1 - G), mode: 'multiply' }); p.air({ color: '#4b505a', alpha: .3 * (1 - G), mode: 'over' });
    // and what is left keeps its colour: the doorway, the wool, the embers, the smoke
    const part = ss(5.78, 6.02, t) * (1 - ss(6.3, 7.0, t)), bend = x => { const d = (x - b.x) / 60; return part * Math.sign(d || 1) * Math.exp(-d * d) * .9; };
    p.layer('out', { every: 2, depth: .8 }); outside(p, t, dawn, g, bend, b.on === 'grass' ? b : null);
    p.layer('spill', { every: 4, depth: .3 }); p.shade([[1530, 792], [1860, 894], [1640, 1010], [1180, 1050], [1060, 980]], { color: '#a3adb8', alpha: .46 * dawn, soft: 40, mode: 'screen' }); p.shade([[1556, 768], [1878, 862], [1858, 894], [1530, 792]], { color: '#aab2b8', alpha: .34 * dawn, soft: 6, mode: 'screen' });
    p.layer('red', { every: 2, depth: 1 });
    const em = keys(t, [[2.5, 0], [4.6, 1, 'io'], [6.2, .75], [7.05, .5], [7.3, 0, 'in']]); if (em > 0) for (let i = 0; i < 6; i++) { const f = .55 + .45 * noise1(t * 1.3 + i * 3, i), x = 352 + i * 18 + 8 * hash(i, 2, 2), y = 706 - 5 * hash(i, 3, 3), on = em * f * (i === 3 ? 1 : ss(.35 + .1 * (i % 3), .9, em)); if (on > .05) p.line([[x, y], [x + 9, y - 3], [x + 18, y + 1]], { color: mixc('#7a3d24', '#e08a45', on), w: 4.6, press: .3 + .6 * on, taper: [.2, .4], medium: 'crayon' }); }
    smoke(p, t);
    const wl = clamp(.35 + .5 * G + .25 * dawn), rc = mixc('#6f2420', '#b5322b', wl);
    if (t < 2.14) wool(p, b, wl);
    if (tr) W.thread(p, tr, { w: 5.6, color: rc, ground: .5, shadow: '#1d1917', fuzz: .6, seed: 3, tip: 6, wf: u => t > 6 ? (u < .72 ? 1.12 - .5 * u : Math.max(.3, .76 - 1.6 * (u - .72))) : 1.12 - .4 * u });
    if (t >= 2.14 && b.on !== 'grass') wool(p, b, wl);
  }
  function smoke(p, t) { const k = ss(4.0, 6.0, t); if (k <= 0) return; const n = 18, H = 300 * k, mk = (ph, a) => { const o = []; for (let i = 0; i <= n; i++) { const u = i / n, sw = (3 + 46 * u * u) * noise1(u * 3.1 - t * .6, 7) + a * u * u + (2 + 7 * u) * Math.sin(u * 13 - t * 2.1 + ph); o.push([396 + sw, 696 - H * u, (.95 - .7 * u) * (.75 + .25 * noise1(u * 9 - t * 2, 5))]); } return o; }; p.line(mk(0, 14), { color: '#a9aaa6', w: 4.2, press: .8 * Math.min(1, k * 1.5), taper: [.1, .7], medium: 'graphite', wobble: .5, alpha: .85 }); p.line(mk(1.1, 22).slice(2), { color: '#8f908d', w: 3, press: .5, taper: [.2, .8], medium: 'graphite', wobble: .6, alpha: .7 }); }
  function wool(p, b, wl) { const y = (b.yy != null ? b.yy : b.y); p.shade([[b.x - b.r * .9, b.y - 3], [b.x, b.y - 9], [b.x + b.r * 1.2, b.y - 4], [b.x + b.r * .9, b.y + 7], [b.x - b.r * .6, b.y + 6]], { color: '#1d1815', alpha: b.on === 'grass' ? .2 : .5, soft: 5 }); B.world.ball(p, { x: b.x, y: y - b.h - b.r * .96, r: b.r, k: 1, roll: b.roll, squash: b.sq > .01 ? b.sq : 0, ground: 0, tailAt: 2.4 }); if (wl < .97) p.shade(Array.from({ length: 16 }, (_, i) => [b.x + Math.cos(i / 16 * TAU) * b.r * 1.02, y - b.h - b.r * .96 + Math.sin(i / 16 * TAU) * b.r * 1.02]), { color: '#4a2a2c', alpha: .75 * (1 - wl), soft: 2 }); }
  B.scene({ id: 's09', draw });
})();
