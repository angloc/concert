(function () {
  const B = window.BIDE, A = B.anim; B.test = B.test || {};
  const { clamp, lerp, keys, mixc } = A;
  // s11  "If I am dead, as dead I well may be"   83.5 - 90.6
  // FEELING: he has come fifty years to say sorry to a chair.
  // BEATS: 0.15 his shadow comes in first. 0.5..1.1 (If I am) he fills the door, dark. hand on the jamb. 1.1..1.7 (dead) he does not move.
  //        1.75 over the sill, heavy. 2.35 looks to the hearth, then up at the sky where the roof was. 2.95 (as dead) the cap comes off, the way it did coming into her house.
  //        3.75 CLOSE (I well may): the hand comes over the top rail, stops short of it, lands fingers first, strokes the wood once like a shoulder; it leaves a clean track in the dust. It closes.
  //        4.95 (be): him, bareheaded, over the empty seat. He looks at it. The eyes go along the thread, away from the chair. He knows. A breath out. That is all.
  // VALUE: one pale shaft and the pale door in a grey-dark room; he is the darkest thing, then the red.
  const INK = '#2c2726', RED = '#a5443c', RED_L = '#c97862', RED_D = '#6f2a2b', COAT = '#5f5953';
  const CUT1 = 3.75, CUT2 = 4.92;
  const lnOf = p => (pts, st) => p.line(pts, Object.assign({ color: INK, w: 4, press: .75, taper: [.12, .25], wobble: .9 }, st));
  let G = null; const gust = () => G || (G = B.world.gusts({ seed: 41, every: 3, power: .5, base: .12, dir: -1 }));
  const OPEN = [[1512, 742], [1514, 250], [1782, 204], [1786, 826], [1650, 786]];
  const CH = { x: 826, y: 884, scale: 1.12 };

  // ------------------------------------------------------------------ WIDE
  function drawWide(p, t) {
    const W = B.world, C = B.cast, g = gust(), ln = lnOf(p);
    p.paper('#c9c5b8');
    p.layer('s11-room', { every: 6, still: true, depth: .75 });
    W.interior(p, { part: 'back', ruin: 1, fire: -1, day: .8, light: 'rain', season: .7, wind: g });
    // the light that comes down where the roof was
    const beam = [[900, 40], [1340, 84], [1060, 900], [520, 876]];
    p.shade(beam, { color: '#fff3d2', alpha: .34, soft: 34, mode: 'screen' }); p.shade([[1000, 40], [1250, 70], [930, 890], [620, 870]], { color: '#fff3d2', alpha: .26, soft: 24, mode: 'screen' }); p.shade([[470, 886], [760, 836], [1080, 866], [1100, 910], [800, 932], [520, 918]], { color: '#fff1cf', alpha: .5, soft: 18, mode: 'screen' });
    // the door has dropped on its one hinge and leans across the opening
    p.mass([[1506, 262], [1600, 296], [1668, 786], [1580, 812], [1506, 752]], { sharp: true, color: { lin: [1520, 400, 1660, 500], stops: [[0, '#465150'], [1, '#62716d']] }, dir: 1.46, size: .7, len: .9, vary: .5 }); [.34, .66].forEach(u => ln([[lerp(1514, 1600, u), lerp(280, 296, u) + 14], [lerp(1584, 1668, u) - 22, lerp(806, 786, u) - 14]], { w: 2.4, press: .5 })); ln([[1512, 284], [1600, 297]], { w: 3.4, press: .7, taper: [.05, .05] }); ln([[1600, 297], [1634, 540], [1668, 786]], { w: 4.2, press: .85, taper: [.03, .1] }); ln([[1580, 812], [1668, 786]], { w: 3.6, press: .75 }); p.mass([[1528, 470], [1628, 446], [1632, 470], [1532, 496]], { sharp: true, color: '#3c4644', dir: -.3, size: .4, len: .6 });
    p.layer('s11-chair', { every: 5, still: true, depth: .95 });
    W.chair(p, Object.assign({ color: '#8f8676', dark: '#35312e', lit: '#e6dec8', seat: '#b3aa92', rim: '#fbf3dc', ground: 0 }, CH));
    p.hatch([[740, 894], [900, 884], [1010, 900], [1080, 930], [960, 944], [820, 926], [736, 910]], { color: '#2b2928', dir: .12, gap: 8, len: 90, w: 4, press: .5 });
    // dead leaves blown in under the chair and along the wall
    for (let i = 0; i < 16; i++) { const x = 560 + 820 * p.fix(i, 1), y = 730 + 190 * Math.pow(p.fix(i, 2), 1.6), r = 7 + 8 * p.fix(i, 3), a = p.fix(i, 4) * 6.28; p.mass([[x - r, y], [x - r * .2, y - r * .5], [x + r, y + r * .1 * Math.sin(a)], [x + r * .1, y + r * .5]], { color: i % 2 ? '#7d6a4c' : '#6a5a44', dir: a, size: .36, len: .4 }); ln([[x - r, y], [x + r, y + 2]], { w: 1.8, press: .5 }); }

    // ---- him
    const px = keys(t, [[.12, 1960], [.62, 1742, 'out'], [.74, 1738], [1.06, 1664, 'io'], [1.74, 1662], [2.02, 1560, 'io'], [2.14, 1556], [2.42, 1472, 'io'], [2.56, 1462, 'out'], [3.2, 1458]]);
    const py = keys(px, [[1440, 852], [1560, 822], [1664, 802], [1780, 806], [1900, 806]].map(v => [v[0], v[1], 'lin']));
    const h = keys(px, [[1440, 520], [1664, 486], [1900, 478]].map(v => [v[0], v[1], 'lin']));
    const ph = (1850 - px) / C.stride('dannyOld', 'walk', 496) + .12, inside = px < 1640;
    const dim = keys(t, [[1.6, .66], [2.5, .46, 'io'], [3.4, .4]]);
    const LT = { dir: -.35, warm: .15, k: .6, dim, rim: .2 };
    // shadow first
    const sk = keys(t, [[.1, 0], [.65, 1, 'out'], [3, .8]]); if (sk > 0) { p.layer('s11-shadow', { every: 2, depth: .5 }); const bx = keys(px, [[1440, 1440], [1700, 1630], [1900, 1800]].map(v => [v[0], v[1], 'lin'])), by = keys(px, [[1440, 856], [1640, 812], [1900, 812]].map(v => [v[0], v[1], 'lin'])); const L0 = [bx - 560 * sk, by + 92], sh = [[bx + 26, by - 8], [bx - 200, by + 4], [L0[0], L0[1] - 34], [L0[0] - 40, L0[1]], [L0[0] + 30, L0[1] + 26], [bx - 180, by + 66], [bx - 20, by + 22]]; p.hatch(sh, { color: '#2c2c30', dir: .16, gap: 7, len: 120, w: 4.6, press: .5 * sk }); p.hatch(sh, { color: '#2c2c30', dir: -.1, gap: 12, len: 90, w: 4, press: .32 * sk }); }
    p.layer('s11-man', { every: 1, depth: 1 });
    const jamb = keys(t, [[.9, 0], [1.2, 1, 'io'], [1.95, 1], [2.2, 0, 'io']]);
    const capU = keys(t, [[2.86, 0], [3.1, 1, 'io'], [3.24, 1], [3.66, 0, 'io']]), capOff = t >= 3.17;
    const lookY = keys(t, [[1.1, .1], [1.5, .06], [2.4, .12], [2.5, .02], [2.72, -.3, 'io'], [2.92, -.3], [3.12, .1, 'io'], [3.4, .3, 'io']]), turn = keys(t, [[1.1, 0], [2.3, 0], [2.55, -.5, 'io'], [2.9, -.35], [3.2, .05, 'io']]);
    const wait = keys(t, [[1.05, 0], [1.35, 1, 'out'], [1.7, .4]]);
    const fig = () => C.figure(p, 'dannyOld', { x: px, y: py, h, view: 'side', yaw: keys(t, [[1.6, 1.45], [2.4, 1.1, 'io']]), face: -1, light: LT, cap: !capOff, capInHand: capOff, expr: ['stillness', 'ache', clamp((t - 2.5) / 1)], wind: [-.12, 0],
      legs: { kind: 'walk', phase: ph }, lean: .02 + keys(t, [[1.74, 0], [1.9, .1, 'io'], [2.2, .02], [2.6, 0]]), bend: .02 + .05 * wait + keys(t, [[2.5, 0], [2.75, -.14, 'io'], [3.0, -.1], [3.5, .1, 'io']]), crouch: keys(t, [[1.98, 0], [2.12, .07, 'out'], [2.4, .01]]), head: { nod: lookY, turn }, drag: [keys(t, [[.6, .05], [1.2, 0], [1.9, .05], [2.6, 0]]), 0],
      armNear: capOff ? [{ p: [.13, .56], h: 'pinch', over: true }, { p: [.055, .93], h: 'pinch', over: true }, capU] : [{ p: [lerp(.15, .05, keys(t, [[2.5, 0], [2.82, 1, 'io']])), lerp(.5, .46, keys(t, [[2.5, 0], [2.82, 1, 'io']]))], h: 'cradle', over: true }, { p: [.06, .95], h: 'pinch', over: true }, capU],
      armFar: jamb > .01 ? [{ p: [.16, .49], h: 'cradle' }, { at: [1520, 552], h: 'onChair' }, jamb] : [.16, .49, 'cradle'] });
    let man; if (!inside) p.clip([[1512, 100], [1782, 100], [1786, 826], [1700, 860], [1500, 880], [1500, 742]], () => { man = fig(); }); else man = fig();
    // the thread: in at the door, across the floor, up to the post of her chair where she left it, over the seat, and on
    const post = [888, 548], lead = [[1330, 878], [1190, 902], [1060, 900], [980, 800], post], on = [[post[0] - 2, post[1] + 4], [836, 690], [760, 754], [708, 800], [676, 890], [560, 912], [320, 892], [130, 904], [-60, 880]];
    const bk = keys(t, [[2.26, 1], [2.5, 0, 'io']]), bq = [lerp(man.handFar[0], man.handNear[0], bk) - 10, lerp(man.handFar[1], man.handNear[1], bk) - 10], have = true;
    if (have) { const draw = () => W.ball(p, { x: bq[0], y: bq[1], r: 17, roll: px * .02, ground: 0, light: 'rain' }); if (!inside) p.clip([[1500, 200], [1786, 200], [1786, 880], [1500, 880]], draw); else draw(); }
    const pouch = bq, pl = inside ? { t0: 1.9, amp: 8, speed: 900 } : undefined;
    if (inside) { const gx = keys(t, [[1.8, 1480], [2.5, 1330, 'io'], [3.2, 1290]]); W.thread(p, [have ? bq : pouch, [gx, lerp(846, 880, clamp((1480 - gx) / 190))]], { w: 4.4, hang: .13, light: 'rain', seed: 5 }); }
    W.thread(p, (inside ? [[keys(t, [[1.8, 1480], [2.5, 1330, 'io'], [3.2, 1290]]), keys(t, [[1.8, 846], [2.5, 880]])]].concat(lead.slice(1)) : [[1700, 798], [1600, 808], [1480, 840]].concat(lead)), { w: 4.8, meander: 3, slack: .2, seed: 8, ground: .5, light: 'rain', pull: pl });
    W.thread(p, [[post[0] - 8, post[1] - 6], [post[0] + 8, post[1] + 2], [post[0] - 8, post[1] + 8]], { w: 4, light: 'rain', ply: 0, fuzz: 0 });
    W.thread(p, on, { w: 4.8, meander: 4, slack: .3, seed: 11, ground: .5, light: 'rain' });
    p.layer('s11-shaft', { every: 2, depth: .9 });
    motes(p, t, beam, 34, 1);
    p.air({ rad: [1060, 560, 1350], stops: [[0, '#ffffff'], [.42, '#e6e3de'], [.75, '#b4b2b2'], [1, '#86868a']], alpha: .95 });
  }
  // dust in the light: each grain has its own lazy fall, and the air stirs when something moves
  function motes(p, t, q, n, s, stir = 0) { for (let i = 0; i < n; i++) { const u = p.fix(i, 51), v0 = p.fix(i, 52), sp = .012 + .02 * p.fix(i, 53), v = (v0 + (t + 8) * sp + .03 * A.noise1(t * .5 + i, 3)) % 1, uu = clamp(u + .07 * A.noise1(t * .42 + i * 1.7, 6) + stir * .06 * A.noise1(t * 2.2 + i, 9)), a = [lerp(q[0][0], q[1][0], uu), lerp(q[0][1], q[1][1], uu)], b = [lerp(q[3][0], q[2][0], uu), lerp(q[3][1], q[2][1], uu)], x = lerp(a[0], b[0], v), y = lerp(a[1], b[1], v), r = s * (1.2 + 2.2 * p.fix(i, 54)), k = Math.sin(Math.PI * v) * (.45 + .55 * Math.abs(A.noise1(t * .8 + i * 2.3, 12))); p.line([[x - r, y], [x, y - r * .4], [x + r, y + r * .3]], { color: '#fff7e2', w: r * 1.5, press: .85 * k, taper: [.2, .2], wobble: .3, medium: 'crayon' }); } }

  // ------------------------------------------------------------------ CLOSE: the hand and the wood
  function drawHand(p, t) {
    const W = B.world, C = B.cast, ln = lnOf(p);
    p.paper('#a9a59b');
    p.layer('s11h-back', { every: 6, still: true, depth: .1 });
    p.mass([[-40, -40], [1960, -40], [1960, 1120], [-40, 1120]], { sharp: true, color: { lin: [0, 0, 1920, 900], stops: [[0, '#4c4947'], [.45, '#6f6c68'], [1, '#56545a']] }, dir: .3, len: 1.3, size: 1.2, vary: .4 });
    p.mass([[-40, 180], [330, 160], [360, 1120], [-40, 1120]], { color: '#34302f', alpha: .85, dir: 1.5, size: 1.1, vary: .4, soft: 30 });
    p.mass([[980, -40], [1560, -40], [1180, 1120], [420, 1120]], { color: '#b9b4a4', alpha: .5, dir: 1.9, size: 1.2, len: 1.2, vary: .3, soft: 70 });
    p.layer('s11h-wood', { every: 6, still: true, depth: .95 });
    // the far post, the second slat, the top rail, the near post
    const wood = { color: { lin: [400, 400, 1500, 700], stops: [[0, '#6b6155'], [.45, '#938775'], [1, '#6a6055']] }, dir: -.06, len: 1.3, size: .8, vary: .5 };
    p.mass([[500, 760], [900, 730], [1320, 712], [1328, 836], [920, 850], [506, 884]], Object.assign({}, wood, { color: '#544c44' })); p.shade([[500, 820], [920, 800], [1330, 780], [1330, 842], [920, 856], [500, 892]], { color: '#25211f', alpha: .55, soft: 16 }); ln([[500, 760], [900, 730], [1320, 712]], { w: 4, press: .6 }); ln([[506, 886], [920, 852], [1328, 838]], { w: 4.4, press: .75 }); ln([[540, 776], [900, 748], [1290, 730]], { color: '#b9ab92', w: 3, press: .4, medium: 'crayon' });
    const rail = [[430, 520], [600, 468], [860, 438], [1140, 430], [1330, 436], [1402, 452], [1406, 590], [1330, 580], [1140, 580], [860, 594], [610, 626], [436, 668]];
    p.mass(rail, wood); p.shade([[430, 600], [610, 556], [860, 528], [1140, 520], [1404, 530], [1406, 596], [1140, 586], [860, 602], [610, 634], [430, 676]], { color: '#2a2522', alpha: .5, soft: 26 }); p.shade([[432, 520], [600, 470], [860, 440], [1140, 430], [1400, 452], [1400, 474], [1140, 456], [860, 466], [610, 496], [436, 548]], { color: '#fff2d2', alpha: .62, soft: 9, mode: 'screen' });
    [[460, 566, 700, 520, 980, 500], [520, 612, 800, 562, 1200, 540], [900, 480, 1120, 476, 1380, 490], [620, 590, 760, 570, 900, 566], [1000, 556, 1180, 548, 1390, 556], [560, 540, 640, 524, 740, 516]].forEach((v, i) => ln([[v[0], v[1]], [v[2], v[3]], [v[4], v[5]]], { color: i % 2 ? '#3b332d' : '#b7a88e', w: 2.6, press: .4, taper: [.2, .4], wobble: 1.6 })); ln([[700, 552], [716, 544], [734, 550], [722, 560], [704, 558]], { w: 2.4, press: .55 });
    ln([[430, 520], [600, 468], [860, 438], [1140, 430], [1330, 436]], { w: 4, press: .55 }); ln([[436, 668], [610, 628], [860, 596], [1140, 582], [1406, 592]], { w: 5, press: .85 });
    const post = (x0, x1, x2, x3, kx, ky, c) => { p.mass([[x0, 380], [x1, 380], [x2, 1130], [x3, 1130]], { sharp: true, color: c, dir: 1.52, len: 1.2, size: .7, vary: .45 }); p.mass([[kx - 34, ky + 44], [kx - 42, ky + 12], [kx - 24, ky - 26], [kx + 8, ky - 34], [kx + 36, ky - 10], [kx + 38, ky + 24], [kx + 26, ky + 46]], { color: c, dir: 1.2, size: .5, len: .5, vary: .4 }); p.shade([[kx - 10, ky - 20], [kx + 36, ky], [kx + 34, ky + 44], [kx, ky + 46]], { color: '#25211f', alpha: .45, soft: 10 }); ln([[kx - 34, ky + 44], [kx - 42, ky + 12], [kx - 24, ky - 26], [kx + 8, ky - 34], [kx + 36, ky - 10], [kx + 38, ky + 24], [kx + 26, ky + 46]], { w: 4.2, press: .75 }); ln([[x0 - 4, 384], [(x0 + x1) / 2, 392], [x1 + 4, 382]], { w: 3.6, press: .7 }); ln([[x0, 390], [x3, 1110]], { w: 4.4, press: .75 }); ln([[x1, 390], [x2, 1110]], { w: 4, press: .6 }); ln([[x0 + 14, 400], [x3 + 14, 1100]], { color: '#c9bb9f', w: 4, press: .42, medium: 'crayon' }); };
    post(1380, 1446, 1474, 1402, 1412, 340, '#7d7264'); post(392, 452, 436, 374, 420, 396, '#5d544a');
    // the thread, where she left it: two turns round the post, and on
    p.layer('s11h-thread', { every: 2, depth: 1 });
    W.thread(p, [[1990, 720], [1760, 640], [1560, 560], [1450, 500]], { w: 9, hang: .02, light: 'rain', seed: 2 });
    [[1372, 506, 1412, 520, 1454, 500], [1370, 528, 1410, 544, 1456, 522], [1374, 486, 1414, 500, 1452, 482]].forEach((v, i) => W.thread(p, [[v[0], v[1]], [v[2], v[3]], [v[4], v[5]]], { w: 8.5, light: 'rain', seed: 5 + i, fuzz: .6 }));
    W.thread(p, [[1376, 528], [1300, 640], [1130, 756], [860, 842], [520, 900], [200, 930], [-60, 946]], { w: 9, slack: .5, light: 'rain', seed: 7 });
    // ---- the hand
    const bx = keys(t, [[3.6, 1290], [3.86, 1268, 'out'], [3.98, 1266], [4.14, 1228, 'io'], [4.28, 1222], [4.4, 1210, 'in'], [4.74, 930, 'io'], [4.82, 918, 'out'], [5.6, 914]]);
    const by = keys(t, [[3.6, 190], [3.86, 262, 'out'], [3.97, 258], [4.13, 318, 'io'], [4.2, 326, 'out'], [4.36, 322], [4.74, 332, 'io'], [4.84, 338, 'out'], [5.6, 338]]) + (t < 4.1 ? 3.4 * A.noise1(t * 9, 2) : 0);
    const rot = keys(t, [[3.6, 2.34], [3.9, 2.2, 'out'], [4.16, 2.08, 'io'], [4.4, 2.06], [4.56, 1.86, 'io'], [4.78, 2.1, 'out'], [4.92, 2.04]]);
    const curl = keys(t, [[3.6, .25], [3.9, .1], [4.12, .5, 'io'], [4.4, .62], [4.6, .42, 'io'], [4.78, .55], [4.95, .95, 'io']]);
    // the clean track it leaves, and the dust it lifts
    p.layer('s11h-track', { every: 2, depth: 1 });
    const trk = clamp((1200 - bx) / 300); if (trk > .02) { const x1 = lerp(1160, 820, trk); [[456, 15, 0], [482, 17, -16], [508, 16, -6], [532, 12, 18]].forEach((v, i) => { const a = 1168 + v[2] * .6, b = x1 + v[2]; if (a - b < 20) return; ln([[a, v[0] - 4], [(a + b) / 2, v[0] - 7], [b, v[0] + 1]], { color: '#7f644b', w: v[1] * 1.45, press: .72, medium: 'crayon', taper: [.3, .03], wobble: .6 }); ln([[a - 10, v[0] - 8], [(a + b) / 2, v[0] - 12], [b + 8, v[0] - 5]], { color: '#d2b58c', w: 3, press: .45, medium: 'crayon', taper: [.2, .1] }); ln([[a, v[0] + 6], [(a + b) / 2, v[0] + 4], [b, v[0] + 11]], { color: '#463527', w: 2.6, press: .45, taper: [.1, .1] }); }); }
    p.layer('s11h-hand', { every: t > 4.95 || t < 3.7 ? 2 : 1, depth: 1 });
    // its shadow on the rail
    const lift = clamp((330 - by) / 80); p.hatch([[bx - 176, 458 + 24 * lift], [bx - 60, 448 + 20 * lift], [bx + 30, 452], [bx + 6, 556], [bx - 100, 590], [bx - 190, 556]], { color: '#231e1c', dir: 2.2, gap: 8, len: 70, w: 4.4, press: .42 * (1 - .65 * lift), curve: .1 });
    const H = C.hand(p, { who: 'dannyOld', x: bx, y: by, h: 330, pose: { base: 'onChair', f: [[9, lerp(12, 44, curl), lerp(14, 46, curl), 12 + 10 * curl], [3, lerp(16, 48, curl), lerp(18, 48, curl), 14 + 10 * curl], [-5, lerp(18, 46, curl), lerp(20, 50, curl), 14 + 10 * curl], [-13, lerp(18, 42, curl), lerp(20, 46, curl), 14 + 10 * curl]], th: [42, 24, 10, 14], roll: 8, pitch: 6 }, rot, light: { dir: -1.9, warm: .35, k: .8, dim: .06 }, sleeve: false, armLen: .1 });
    // worn sleeve, coming in from above
    const ca = Math.cos(rot), sa = Math.sin(rot), N = (u, v) => [bx - ca * u - sa * v, by - sa * u + ca * v], slv = [N(-34, -78), N(-40, 0), N(-30, 80), N(60, 98), N(240, 120), N(620, 150), N(620, -190), N(240, -124), N(60, -96)];
    p.mass(slv, { color: { lin: [bx - 60, by - 60, bx + 200, by - 100], stops: [[0, '#777066'], [1, '#4a4642']] }, dir: rot + 1.2, size: .8, vary: .45 }); p.shade([N(-34, 10), N(-28, 82), N(240, 124), N(620, 154), N(620, 60), N(200, 50), N(40, 34)], { color: '#242222', alpha: .5, soft: 24 }); p.shade([N(-30, -78), N(60, -96), N(240, -122), N(500, -160), N(500, -120), N(220, -84), N(40, -58)], { color: '#f3ead2', alpha: .36, soft: 12, mode: 'screen' });
    ln([N(-34, -80), N(-42, 0), N(-30, 82)], { w: 5, press: .85 }); ln([N(0, -86), N(-8, 0), N(4, 90)], { w: 3, press: .42 }); ln([N(-34, -80), N(60, -97), N(240, -125), N(600, -186)], { w: 4, press: .55 }); ln([N(-30, 82), N(60, 99), N(240, 121), N(600, 150)], { w: 5, press: .8 }); [[60, -50, 110, 10, 90, 60], [170, -70, 200, 0, 180, 70], [300, -60, 320, 20, 300, 90]].forEach(v => ln([N(v[0], v[1]), N(v[2], v[3]), N(v[4], v[5])], { w: 3.2, press: .4, taper: [.15, .5] })); for (let i = 0; i < 6; i++) ln([N(-38 - 6 * p.fix(i, 2), -60 + i * 24), N(-50 - 12 * p.fix(i, 3), -56 + i * 24)], { color: '#8a8278', w: 2, press: .5, taper: [.05, .6] });
    p.layer('s11h-dust', { every: 2, depth: .8 });
    p.mass([[1020, -40], [1500, -40], [1120, 1120], [520, 1120]], { color: '#fff3d6', alpha: .1, dir: 1.9, size: 1.2, soft: 80 });
    motes(p, t, [[1020, -40], [1500, -40], [1120, 1120], [520, 1120]], 30, 1.9, clamp((t - 4.35) * 2) * clamp((5.2 - t) * 2));
    if (t > 4.4) for (let i = 0; i < 16; i++) { const t0 = 4.42 + .35 * p.fix(i, 61), a = t - t0; if (a < 0) continue; const x0 = lerp(1150, 840, (t0 - 4.42) / .35) + 30 * (p.fix(i, 62) - .5), x = x0 - 40 * (1 - Math.exp(-3 * a)) * (.4 + p.fix(i, 63)), y = 444 - 70 * (1 - Math.exp(-2.4 * a)) * (.3 + p.fix(i, 64)) + 14 * a * a, r = 1.6 + 2.4 * p.fix(i, 65); p.line([[x - r, y], [x + r, y + r * .4]], { color: '#fff4da', w: r * 1.6, press: .8 * clamp(1.4 - a), taper: [.2, .2], wobble: .4, medium: 'crayon' }); }
    p.air({ rad: [960, 420, 1150], stops: [[0, '#ffffff'], [.5, '#dcdad6'], [1, '#77767c']], alpha: .95 });
  }

  // ------------------------------------------------------------------ MEDIUM: he understands
  const SHAFT = { front: true, skin: '#c5a08a', lit: '#f7ead0', sh: '#5f504c', deep: '#423835', hair: '#b4b0a8', hairL: '#f2ecdc', hairD: '#6f6c69', ink: '#2c2725', eyeW: '#cfc8ba', k: 1.1 };
  function drawMan(p, t) {
    const W = B.world, C = B.cast, ln = lnOf(p);
    p.paper('#b3aea3');
    p.layer('s11m-back', { every: 6, still: true, depth: .1 });
    p.mass([[-40, -40], [1960, -40], [1960, 1120], [-40, 1120]], { sharp: true, color: { lin: [0, 200, 1920, 700], stops: [[0, '#8d8a83'], [.5, '#77746f'], [1, '#4d4b4c']] }, dir: .25, len: 1.3, size: 1.2, vary: .42 });
    p.mass([[-40, 120], [250, 110], [262, 1120], [-40, 1120]], { color: '#393534', alpha: .9, dir: 1.5, size: 1.1, vary: .4, soft: 24 }); p.mass([[-40, 70], [300, 60], [304, 118], [-40, 130]], { color: '#5f574d', dir: 0, size: .8, vary: .4, soft: 6 });
    p.mass([[1560, 60], [1920, 20], [1960, 900], [1580, 820]], { color: '#8b9390', alpha: .5, dir: 1.5, size: 1.1, vary: .3, soft: 40 });
    p.mass([[560, -40], [1180, -40], [800, 1120], [-20, 1120]], { color: '#cfc9b6', alpha: .55, dir: 1.95, size: 1.2, len: 1.2, vary: .3, soft: 70 });
    const und = keys(t, [[5.35, 0], [6.2, 1, 'io']]);            // understanding: the body lets down
    const nod = keys(t, [[4.8, .26], [5.15, .28], [5.36, .3], [5.62, .14, 'io'], [6.15, .15], [6.5, .31, 'io'], [6.72, .35, 'out'], [7.4, .34]]);
    const gx = keys(t, [[4.9, .45], [5.2, .5], [5.34, .75, 'snap'], [5.62, 1, 'io'], [6.2, .98], [6.5, .6, 'io']]), gy = keys(t, [[4.9, .85], [5.22, .9], [5.36, .55, 'snap'], [5.66, .1, 'io'], [6.2, .16], [6.55, .8, 'io']]);
    const lids = keys(t, [[4.9, .42], [5.24, .4], [5.42, .62, 'out'], [6.0, .6], [6.26, .56], [6.56, .16, 'io'], [6.8, .02, 'io'], [7.6, .02]]);
    const inh = keys(t, [[5.0, 0], [5.5, 7, 'io'], [6.1, 8], [6.75, -5, 'io'], [7.4, -3]]);
    p.layer('s11m-man', { every: t > 6.8 || t < 5.1 ? 2 : 1, depth: 1 });
    // seat and near bars of the chair, lit, empty
    const hx = 1150 - 8 * und, hy = 372 - inh * .4 + 10 * und;
    const body = [[930, 1130], [918, 960], [900, 820], [930, 700 - inh], [1010, 618 - inh], [1140, 590 - inh], [1290, 560 - inh], [1440, 600 - inh], [1570, 700 - inh], [1650, 850], [1690, 1000], [1700, 1130]];
    p.mass(body, { color: { lin: [900, 700, 1700, 900], stops: [[0, '#7b746a'], [.3, '#625d56'], [1, '#3d3b3a']] }, dir: 1.1, size: 1, vary: .45 });
    p.shade([[1300, 640], [1500, 660], [1640, 860], [1700, 1130], [1300, 1130], [1240, 900]], { color: '#232122', alpha: .55, soft: 50 }); p.shade([[920, 830], [950, 700 - inh], [1030, 628 - inh], [1110, 610 - inh], [1060, 700], [1000, 860], [980, 1000], [930, 1000]], { color: '#f6ecd2', alpha: .4, soft: 22, mode: 'screen' }); p.shade([[1180, 590 - inh], [1300, 566 - inh], [1430, 604 - inh], [1400, 640], [1280, 620], [1190, 630]], { color: '#f6ecd2', alpha: .28, soft: 16, mode: 'screen' });
    ln([[918, 1100], [916, 960], [900, 820], [930, 700 - inh], [1010, 618 - inh]], { w: 3.6, press: .5 }); ln([[1290, 560 - inh], [1440, 600 - inh], [1570, 700 - inh], [1650, 850], [1692, 1010]], { w: 4.6, press: .7 });
    // lapels
    p.mass([[1080, 650 - inh], [1150, 700], [1120, 860], [1060, 1010], [1010, 1130], [960, 1130], [990, 900], [1030, 740]], { color: '#57524c', dir: 1.8, size: .8, vary: .4 }); ln([[1150, 700], [1124, 860], [1064, 1010], [1020, 1120]], { w: 4.2, press: .7 }); ln([[1052, 690 - inh], [1000, 880], [966, 1090]], { w: 3, press: .4 });
    // neck and scarf, turned to the left
    p.mass([[1100, 560], [1180, 480], [1320, 470], [1380, 560], [1340, 660], [1180, 690]], { color: '#8e6f60', dir: 2, size: .6, vary: .3 });
    const n = [[1404, 560 - inh], [1390, 510 - inh], [1340, 490 - inh], [1280, 520], [1180, 596], [1100, 640], [1060, 668], [1058, 712], [1100, 736], [1210, 718], [1330, 660], [1396, 610 - inh]];
    p.mass(n, { color: mixc(RED, '#7f5850', .14), dir: 2.8, size: .6, len: .8, vary: .42 }); p.shade([[1400, 570], [1290, 630], [1140, 690], [1058, 700], [1100, 738], [1214, 720], [1334, 662]], { color: RED_D, alpha: .6, soft: 15 }); p.shade([[1150, 610], [1090, 650], [1064, 680], [1110, 676], [1190, 640], [1270, 570]], { color: '#f0c0a0', alpha: .36, soft: 12, mode: 'screen' });
    [[[1394, 540 - inh], [1276, 590], [1140, 652], [1070, 672]], [[1396, 572 - inh], [1290, 624], [1150, 684], [1066, 704]]].forEach((q, i) => ln(q, { color: i ? '#4a2224' : RED_D, w: i ? 4 : 2.8, press: i ? .7 : .5 })); for (let i = 0; i < 13; i++) { const u = i / 12, x = lerp(1370, 1090, u), y = lerp(540, 678, u) + 14 * (p.fix(i, 3) - .5); ln([[x, y], [x - 4, y + 10], [x + 1, y + 20]], { color: i % 2 ? RED_D : RED_L, w: 2.2, press: .5 }); }
    ln([[1396, 610 - inh], [1330, 662], [1210, 720], [1100, 738], [1058, 712]], { color: '#4a2224', w: 4.4 }); ln([[1404, 560 - inh], [1390, 510 - inh], [1342, 490 - inh]], { color: '#4a2224', w: 3.6 });
    // a tail of it hanging straight down the coat
    p.mass([[1100, 716], [1172, 712], [1190, 850], [1196, 1000], [1120, 1004], [1104, 860]], { color: RED, dir: 1.5, size: .6, len: .9, vary: .42 }); p.shade([[1140, 716], [1176, 712], [1194, 860], [1196, 1000], [1156, 1000], [1150, 860]], { color: RED_D, alpha: .5, soft: 14 }); ln([[1100, 720], [1104, 860], [1120, 1000]], { color: '#4a2224', w: 3.8 }); ln([[1174, 714], [1192, 860], [1198, 1000]], { color: '#4a2224', w: 3.8 }); [[1124, 730], [1148, 730]].forEach(q => ln([q, [q[0] + 6, 860], [q[0] + 14, 996]], { color: RED_D, w: 2.4, press: .4 }));
    B.test.s13head(p, { x: hx, y: hy, s: .8, rot: nod, face: -1, lids, gx: gx - .2, gy: gy * .9, grief: keys(t, [[5.0, .3], [5.3, .32], [5.8, .5, 'out'], [6.5, .3], [7, .22]]), squeeze: 0, knit: 0, mOpen: keys(t, [[5.5, 0], [5.75, .07, 'out'], [6.2, .06], [6.6, .02], [6.8, 0]]), mPull: keys(t, [[5.6, 0], [6.1, -.35, 'io'], [6.5, -.2], [7, .25, 'io']]), wet: .5 * und, soc: .55, light: SHAFT });
    // the arm to the chair, the hand still on it
    const arm = [[1010, 640 - inh], [1120, 650], [1130, 760], [1050, 850], [930, 880], [800, 846], [740, 812], [760, 740], [840, 748], [930, 742], [968, 690]];
    p.mass(arm, { color: { lin: [760, 700, 1100, 900], stops: [[0, '#7a7369'], [1, '#524e49']] }, dir: 2.7, size: .9, vary: .42 }); p.shade([[1130, 760], [1050, 852], [930, 882], [800, 848], [760, 826], [900, 820], [1030, 770], [1100, 700]], { color: '#262424', alpha: .5, soft: 22 }); p.shade([[770, 744], [850, 752], [940, 744], [990, 680], [1030, 660], [980, 740], [900, 780], [790, 776]], { color: '#f6ecd2', alpha: .34, soft: 14, mode: 'screen' });
    ln([[968, 690], [930, 742], [840, 750], [762, 740]], { w: 4, press: .6 }); ln([[1130, 764], [1052, 852], [930, 884], [800, 850], [742, 814]], { w: 5, press: .85 }); [[[1010, 720], [980, 780], [1010, 830]], [[940, 760], [930, 810], [950, 850]], [[1060, 690], [1050, 760], [1070, 800]]].forEach(q => ln(q, { w: 3.2, press: .42, taper: [.1, .5] }));
    // the top of her chair in front of him
    const ch = p2 => { p2; }; ch();
    p.mass([[470, 790], [560, 758], [660, 742], [780, 738], [842, 748], [846, 826], [780, 818], [660, 824], [562, 842], [474, 874]], { color: { lin: [470, 760, 850, 800], stops: [[0, '#b3a892'], [1, '#7b7162']] }, dir: -.08, size: .7, len: 1.1, vary: .45 }); p.shade([[470, 840], [562, 806], [660, 790], [846, 796], [846, 830], [660, 830], [562, 848], [474, 882]], { color: '#2a2522', alpha: .5, soft: 14 }); p.shade([[470, 790], [560, 758], [660, 742], [780, 738], [842, 748], [842, 760], [660, 756], [560, 774], [474, 806]], { color: '#fff4d8', alpha: .7, soft: 6, mode: 'screen' });
    ln([[470, 790], [560, 758], [660, 742], [780, 738], [842, 748]], { w: 3.6, press: .5 }); ln([[474, 876], [562, 844], [660, 826], [780, 820], [846, 828]], { w: 4.6, press: .85 });
    p.mass([[474, 930], [660, 896], [846, 890], [846, 944], [660, 950], [476, 988]], { color: '#5d554b', dir: -.08, size: .7, vary: .45 }); ln([[474, 930], [660, 896], [846, 890]], { w: 3.4, press: .5 }); ln([[476, 990], [660, 952], [846, 946]], { w: 4, press: .7 });
    [[452, 486, 480, 440, 760], [832, 872, 884, 838, 726]].forEach((v, i) => { p.mass([[v[0], v[4] + 24], [v[1], v[4] + 22], [v[2], 1130], [v[3], 1130]], { sharp: true, color: i ? '#6d6357' : '#a59a85', dir: 1.5, size: .6, vary: .45 }); const kx = (v[0] + v[1]) / 2, ky = v[4]; p.mass([[kx - 22, ky + 28], [kx - 27, ky + 8], [kx - 14, ky - 18], [kx + 8, ky - 22], [kx + 24, ky - 4], [kx + 22, ky + 28]], { color: i ? '#7a7062' : '#b3a892', dir: 1, size: .4, len: .5 }); ln([[kx - 22, ky + 28], [kx - 27, ky + 8], [kx - 14, ky - 18], [kx + 8, ky - 22], [kx + 24, ky - 4], [kx + 22, ky + 28]], { w: 3.4, press: .7 }); ln([[v[0], v[4] + 28], [v[3], 1120]], { w: 3.6, press: .6 }); ln([[v[1], v[4] + 28], [v[2], 1120]], { w: 4, press: .75 }); });
    C.hand(p, { who: 'dannyOld', x: 748 , y: 766 - inh * .3, h: 196, pose: { base: 'onChair', f: [[9, 40, 42, 20], [3, 44, 44, 22], [-5, 42, 46, 22], [-13, 38, 42, 22]], th: [42, 24, 10, 14], roll: 10, pitch: 6 }, rot: 2.52, light: { dir: -2.3, warm: .35, k: .8, dim: .03 }, sleeve: false, armLen: .06 });
    p.mass([[738, 716], [776, 722], [806, 760], [800, 812], [762, 834], [744, 800]], { color: '#736c63', dir: 2, size: .6, vary: .35 }); ln([[740, 716], [730, 766], [746, 820]], { w: 4.2, press: .8 });
    // the thread: from his other hand to the post of the chair, round it, and away to the left
    p.layer('s11m-thread', { every: 2, depth: 1 });
    W.thread(p, [[1250, 1030], [1090, 960], [960, 870], [880, 782]], { w: 6.4, hang: .03, light: 'rain', seed: 3, pull: { t0: 5.25, amp: 7, speed: 1400 } });
    [[832, 778, 858, 788, 884, 776], [830, 792, 856, 803, 886, 790]].forEach((v, i) => W.thread(p, [[v[0], v[1]], [v[2], v[3]], [v[4], v[5]]], { w: 6, light: 'rain', seed: 5 + i, fuzz: .5 }));
    W.thread(p, [[834, 790], [780, 862], [660, 912], [520, 926], [340, 900], [140, 904], [-60, 866]], { w: 6.4, slack: .5, seed: 8, light: 'rain', pull: { t0: 5.3, amp: 9, speed: 1200, from: 0 } });
    p.layer('s11m-dust', { every: 2, depth: .8 });
    motes(p, t, [[620, -40], [1180, -40], [820, 1120], [60, 1120]], 34, 1.7);
    p.air({ rad: [860, 480, 1150], stops: [[0, '#ffffff'], [.5, '#dedcd8'], [1, '#6f6e74']], alpha: .95 });
  }
  B.test.s11wide = (p, k) => drawWide(p, k); B.test.s11hand = (p, k) => drawHand(p, k); B.test.s11man = (p, k) => drawMan(p, k);
  B.scene({ id: 's11', ink: 'dark', draw(p, s) { if (s.t < CUT1) drawWide(p, s.t); else if (s.t < CUT2) drawHand(p, s.t); else drawMan(p, s.t); } });
})();
