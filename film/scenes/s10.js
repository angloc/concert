(function () {
  const B = window.BIDE, A = B.anim; B.test = B.test || {};
  const { clamp, lerp, keys, mixc } = A;
  // s10  "But when ye come, and all the flowers are dying"   76.4 - 83.5
  // FEELING: a tired man doing a small job for fifty years, until he looks up.
  // BEATS: -0.5..2.3 (But when ye come) heavy walk against the wind, winding; the thread runs ahead of him to a house he has not looked at yet.
  //        2.3 the thread comes up short: he stops a beat late, half a step runs on. 2.6 looks down at it. 2.9..3.5 (all the) folds down, hand on thigh.
  //        3.5..4.05 (flow'rs) two small tugs, it springs free, the ripple runs away up the road. 4.1..4.8 (are) straightens in pieces, the head last.
  //        4.75 cut close (dying 5.0): the eyes find it. the breath goes in and does not come out. the last petal on the briar lets go.
  // EYE: figure (left third) -> red line -> small pale house (right). CLOSE: eyes -> house -> petal.
  // VALUE: darkest = coat and the near dead stalks; lightest = the band of sky behind his shoulders and the house.
  const L = 'rain', SE = .74, COL = .42, base = { light: L, season: SE, colour: COL };
  const INK = '#312a26', RED = '#a5443c', RED_L = '#c97862', RED_D = '#6f2a2b';
  const LT = { dir: -1.1, warm: .22, k: .5, dim: .04 };
  let G = null; const gust = () => G || (G = B.world.gusts({ seed: 23, every: 2.4, power: .8, base: .26, dir: -1 }));
  const lnOf = p => (pts, st) => p.line(pts, Object.assign({ color: INK, w: 4, press: .75, taper: [.12, .25], wobble: .9 }, st));
  const H = 512, SNAG = [846, 728], HOUSE = [1500, 556];
  const ROAD = [[1503, 560], [1470, 588], [1520, 620], [1640, 656], [1660, 694], [1500, 738], [1180, 784], [760, 832], [320, 868], [-140, 896]];
  const roadY = x => keys(x, [[-140, 896], [320, 868], [760, 832], [1180, 784]].map(v => [v[0], v[1], 'lin']));
  const stride = () => B.cast.stride('dannyOld', 'walk', H);

  // distance walked: each step is a push and nearly a stop. ends at D1 on a planted foot
  const X0 = 236, D1 = 2.1; // cycles walked by the time he stops (two steps a cycle)
  function cyc(t) { const q = t < 1.5 ? (t + .9) * .66 : keys(t, [[1.5, 2.4 * .66, 'lin'], [2.46, D1, 'out']]); const f = q * 2, s = f - Math.floor(f); return Math.min(D1, q - .045 * Math.sin(s * 6.283) * clamp((2.2 - t) * 2)); }
  const manX = t => X0 + cyc(t) * stride();

  function wideBack(p) {
    const W = B.world;
    p.paper('#d3cdbd');
    p.layer('s10-sky', { every: 6, still: true, depth: .05 });
    W.sky(p, { mood: L, t: 4, horizon: 600 });
    p.mass([[1120, 430], [1300, 360], [1520, 350], [1740, 330], [1980, 350], [1980, 520], [1700, 540], [1400, 540], [1180, 520]], { color: '#8d969a', alpha: .75, dir: .1, size: 1.1, len: 1.2, vary: .45, soft: 40 });
    W.hill(p, Object.assign({ d: .95, pts: [[-60, 560], [200, 520], [460, 544], [700, 500], [940, 520], [1180, 470], [1420, 400], [1640, 430], [1980, 390]], base: 720, seed: 101, spurs: 4, rough: 5, hatch: 0 }, base));
    W.hill(p, Object.assign({ d: .68, pts: [[-60, 640], [220, 626], [520, 640], [820, 636], [1080, 604], [1320, 560], [1520, 520], [1760, 528], [1980, 560]], base: 800, seed: 102, spurs: 4, rough: 6 }, base));
    W.cottage(p, Object.assign({ x: HOUSE[0], y: HOUSE[1], scale: .4, state: 'ruin', d: .42 }, base));
  }
  function wideLand(p, t) {
    const W = B.world, U = W.util, C = W.seen;
    p.layer('s10-land', { every: 4, depth: .6 });
    const rg = U.ridge([[-60, 706], [300, 700], [700, 694], [1050, 650], [1300, 596], [1500, 560], [1720, 580], [1980, 626]], { amp: 6, seed: 104, step: 24 });
    p.mass(U.below(rg, 1130), { sharp: true, color: { lin: [0, 560, 0, 1080], stops: [[0, '#b4ab92'], [.3, '#97896a'], [.62, '#7b6c53'], [1, '#5d5243']] }, dir: .06, len: 1.2, size: 1, vary: .5 });
    W.fields(p, Object.assign({ quad: [[300, 712], [1100, 676], [1060, 800], [100, 850]], rows: 3, cols: 6, d: .42, seed: 44, ww: 4, alpha: .5 }, base));
    [[200, 780, 380, 34], [1300, 720, 330, 34], [1620, 840, 420, 60], [420, 980, 520, 70], [1300, 980, 560, 90]].forEach((q, i) => p.mass(U.lump(q[0], q[1], q[2], q[3], i + 3, { rough: .25 }), { color: i % 2 ? '#8f8163' : '#64583f', alpha: .5, dir: .05, size: .9, vary: .5, soft: 14 }));
    W.sward(p, Object.assign({ rg: rg.map(q => [q[0], q[1] + 20]), depth: 300, n: 240, t: Math.floor(t * 3 + 1e-6) / 3, wind: gust(), seed: 45, H: 20, d: .1 }, base));
    W.road(p, Object.assign({ pts: ROAD, w: [4, 100], power: 1.7, d: .1, color: '#a89c86', lw: 3 }, base));
    [[430, 866, 64, 7], [640, 850, 46, 6], [980, 812, 38, 5], [250, 886, 60, 7]].forEach((q, i) => p.mass(U.lump(q[0], q[1], q[2], q[3], i, { rough: .2 }), { color: '#cfd0c8', alpha: .85, dir: 0, size: .5, len: .7 }));
    W.wall(p, Object.assign({ line: [[-60, 792], [160, 776], [420, 756], [640, 736]], h: u => lerp(96, 40, u) * (1 - .5 * U.ss(.4, .5, u) * (1 - U.ss(.62, .72, u))), size: 34, d: .22, seed: 51, moss: 10, lines: 44 }, base));
  }
  // the old rose briar that has come through the tumbled wall and caught the thread
  function briar(p, t, o) {
    const W = B.world, ln = lnOf(p), g = gust(), k = o.k || 1, sx = v => [o.x + v[0] * k, o.y + v[1] * k], b = g(t, o.x, o.y), tug = o.tug || 0;
    const stems = [[[0, 0], [6, -60], [-6, -124], [-30, -178], [-74, -212], [-122, -208 + 0 * b]], [[14, 4], [34, -70], [44, -150], [70, -214], [112, -240]], [[-10, 6], [-30, -40], [-62, -74], [-104, -84]], [[24, 4], [60, -40], [104, -70], [150, -72]]];
    stems.forEach((st, i) => { const q = st.map((v, j) => { const u = j / (st.length - 1); return sx([v[0] + (b * 22 - 8 * tug) * u * u - (i === 0 ? 0 : 0), v[1] + 6 * b * u * u + (i === 0 ? 5 * tug * u : 0)]); }); ln(q, { color: '#4a3d33', w: (i ? 4.4 : 6) * Math.sqrt(k), press: .9, taper: [.02, .4], wobble: 1 }); ln(q.map(v => [v[0] - 2 * k, v[1] - 2 * k]), { color: '#9c8970', w: 2 * k, press: .4, taper: [.1, .5], medium: 'crayon' }); for (let j = 0; j < 7; j++) { const u = .12 + j * .12, z = A.spline(q, 6, false), e = z[Math.min(z.length - 1, Math.round(u * (z.length - 1)))], s = j % 2 ? 1 : -1; ln([e, [e[0] + s * 7 * k, e[1] - 4 * k], [e[0] + s * 11 * k, e[1] + 1 * k]], { color: '#4a3d33', w: 2.6 * k, press: .85, taper: [.02, .5], wobble: .3 }); } if (i !== 1) { for (let j = 0; j < 3; j++) { const e = q[2 + j] || q[q.length - 1], s = j % 2 ? 1 : -1, dx = s * (18 + 8 * p.fix(i, j)) * k, dy = (10 + 10 * p.fix(j, i)) * k; p.mass([e, [e[0] + dx * .5, e[1] + dy * .1], [e[0] + dx, e[1] + dy * .7], [e[0] + dx * .9, e[1] + dy * 1.3], [e[0] + dx * .35, e[1] + dy]], { color: j % 2 ? '#7a6244' : '#8f7350', dir: 1, size: .36, len: .4, vary: .5 }); ln([e, [e[0] + dx * .6, e[1] + dy * .6], [e[0] + dx, e[1] + dy]], { color: '#4a3b2e', w: 2 * k, press: .5 }); } } });
    const tip = sx([112 + b * 22 - 8 * tug, -240 + 6 * b]);
    return { tip, snag: sx([-104 + (b * 14 - 8 * tug) * .6, -84]) };
  }
  // the one rose left on it: brown at the edges, head hung
  function deadRose(p, x, y, r, o) {
    const ln = lnOf(p), hang = o.hang || 0, n = o.n; p.push(); p.translate(x, y); p.rotate(.9 + hang); p.scale(r / 30, r / 30);
    ln([[0, 0], [-4, -14], [-2, -24]], { color: '#4a3d33', w: 4 }); [[-12, -2, -26, 10], [10, -4, 24, 8], [-2, 2, -4, 22]].forEach(q => ln([[0, -2], [q[0], q[1] + 4], [q[2], q[3]]], { color: '#5d6147', w: 4.4, press: .8, taper: [.05, .6] }));
    const pet = [[[-4, 0], [-26, 6], [-30, 28], [-14, 40], [0, 24]], [[4, 0], [26, 4], [32, 24], [18, 40], [2, 26]], [[-8, 4], [-14, 30], [0, 46], [14, 30], [8, 4]]];
    pet.forEach((q, i) => { if (i === 1 && n < 3) return; p.mass(q, { color: [mixc(RED, '#6f4a38', .5), mixc(RED, '#7a3a34', .3), mixc(RED, '#5f3a30', .45)][i], dir: 1.4, size: .34, len: .4, vary: .5 }); ln(q, { color: '#4a2224', w: 2.2, press: .6 }); }); ln([[-6, 10], [0, 24], [2, 38]], { color: '#4a2224', w: 2, press: .6 }); p.pop();
    const c = Math.cos(.9 + hang), s = Math.sin(.9 + hang); return [x + (18 * c - 22 * s) * r / 30, y + (18 * s + 22 * c) * r / 30];
  }

  function threadTo(p, hand, t) {
    const W = B.world; const free = 4.06;
    // how far the thread is drawn up off the road: slack, then taut at 2.3, then loose
    const hang = keys(t, [[-1, .13], [1.6, .1], [2.22, .012, 'in'], [2.42, .03, 'out'], [2.9, .07], [3.5, .06], [3.6, .02], [3.72, .06], [3.86, .012], [4.06, .05], [4.3, .16, 'out'], [5, .14]]);
    const c = keys(t, [[free - .02, SNAG], [free + .1, [884, 770], 'in'], [free + .24, [906, 832], 'in'], [free + .34, [908, 820], 'out'], [free + .44, [910, 832], 'in']]);
    W.thread(p, [hand, c], { w: 5.2, hang, seed: 3, light: L, pull: t > free - .02 ? { t0: free, amp: 7, from: 0, speed: 900 } : { t0: 2.28, amp: 9, from: 0, speed: 1400 } });
    const far = t < free ? [[SNAG[0], SNAG[1]], [900, 800], [960, 818]] : [c, [940, 830], [980, 818]];
    W.thread(p, far.concat([[1080, 798], [1260, 776], [1500, 738], [1640, 698], [1640, 660], [1540, 628], [1482, 592], [1505, 566]]), { w: 4.6, wf: u => lerp(1, .34, Math.pow(u, .7)), meander: 7, slack: .25, seed: 6, ground: .45, light: L, ply: 0, pull: [{ t0: 2.3, amp: 5, speed: 1400 }, { t0: free + .1, amp: 12, speed: 1100, freq: 2.6 }] });
  }

  // the dark near side of the road, where the line is written
  function bank(p, top) {
    const U = B.world.util, rg = U.ridge(top, { amp: 7, seed: 61, step: 22 });
    p.mass(U.below(rg, 1130), { sharp: true, color: { lin: [0, top[0][1] - 60, 0, 1080], stops: [[0, '#7a6b50'], [.35, '#5f523e'], [1, '#463c30']] }, dir: -.12, len: 1.1, size: 1, vary: .5 });
    [[360, 1010, 420, 40], [1100, 980, 460, 46], [1640, 930, 360, 50]].forEach((q, i) => p.mass(U.lump(q[0], q[1], q[2], q[3], i + 9, { rough: .25 }), { color: i % 2 ? '#574a37' : '#4c4234', alpha: .6, dir: -.1, size: .9, vary: .5, soft: 14 }));
    for (let i = 0; i < 90; i++) { const x = 1960 * p.fix(i, 71) - 20, y = U.yAt(rg, x) + 4 + 70 * p.fix(i, 72) * p.fix(i, 73), h = 10 + 20 * p.fix(i, 74); p.line([[x, y], [x - 3, y - h * .6], [x - 8 - 8 * p.fix(i, 75), y - h]], { color: i % 3 === 0 ? '#a9976f' : i % 3 === 1 ? '#8a7a58' : '#473c2e', w: 2.8, press: .65, taper: [.05, .6], wobble: .5 }); }
    return rg;
  }
  function drawWide(p, t) {
    const W = B.world, C = B.cast, g = gust();
    wideBack(p); wideLand(p, t);
    p.layer('s10-man', { every: 1, depth: 1 });
    const x = manX(t), y = roadY(x) + 4, wind = g(t, x, 600);
    const walking = t < 2.5; const ph = cyc(t);
    const stoop = keys(t, [[2.86, 0], [3.0, -.06, 'out'], [3.5, 1, 'io'], [4.02, 1], [4.12, .95], [4.42, .4, 'io'], [4.52, .38], [4.8, .06, 'out'], [5.4, 0]]);
    const look = keys(t, [[2.45, 0], [2.72, 1, 'out'], [4.3, 1], [4.62, .6], [4.95, -.75, 'io']]); // head: down at the snag, then up to the house
    const wa = keys(t, [[-1, 0], [2.2, 13.2, 'lin'], [2.36, 13.6, 'out']]); // winding hand, hand over hand
    const win = keys(t, [[2.2, 1], [2.6, 0]]);
    const reach = keys(t, [[2.9, 0], [3.5, 1, 'io'], [4.08, 1], [4.16, 1.06, 'snap'], [4.7, 0, 'io']]);
    const tug = keys(t, [[3.5, 0], [3.6, 1, 'snap'], [3.7, .2], [3.82, 1.3, 'snap'], [3.98, .9], [4.06, 0, 'snap']]);
    const bob = walking ? 0 : 0;
    const bri = briar(p, t, { x: 950, y: 826, k: 1, tug: tug - (t > 4.06 && t < 4.6 ? 1.2 * Math.exp(-(t - 4.06) * 5) * Math.cos((t - 4.06) * 16) : 0) });
    const drag = walking ? -.05 - .04 * Math.sin(ph * 6.283 * 2) : keys(t, [[2.4, -.03], [2.62, .05, 'out'], [3, 0], [3.5, .04], [4.2, .02], [4.5, -.03], [5, 0]]);
    const holdY = .5 + .012 * Math.sin(ph * 12.566) - .1 * Math.max(0, stoop);
    const man = C.figure(p, 'dannyOld', { x, y, h: H, view: 'side', light: LT, expr: ['stillness', 'ache', clamp((t - 4.4) / .6)], wind: [-.42 - .4 * wind, -.02], drag: [drag, 0],
      legs: { kind: 'walk', phase: ph }, crouch: stoop * .27, lean: .05 + stoop * .42 + keys(t, [[2.3, 0], [2.46, .06, 'out'], [2.7, 0]]), bend: stoop * .32 + keys(t, [[4.6, 0], [5, -.1]]),
      head: { nod: .16 + .16 * look - (stoop > .3 ? .18 * stoop : 0) + keys(t, [[4.6, 0], [4.98, -.12, 'out']]), turn: 0 }, shrug: keys(t, [[4.9, 0], [5.15, .3, 'out']]),
      armFar: [{ p: [.185 + .014 * Math.sin(wa + 2) * win, holdY], h: ['cradle', 'reach', clamp(reach * 2)] }, { at: [SNAG[0] - 18 - 9 * tug, SNAG[1] + 6], h: 'pinch' }, clamp(reach)],
      armNear: [{ p: [.2 + (.036 * Math.cos(wa)) * win, holdY + .035 + .038 * Math.sin(wa) * win], h: 'pinch', over: true }, 'kneeHand', keys(t, [[2.96, 0], [3.5, 1, 'io'], [4.2, 1], [4.72, 0, 'io']])] });
    // the ball rides in the far hand; while he is down the near hand has it. it changes hands when both are on it
    const bk = keys(t, [[2.6, 0], [2.86, 1, 'io'], [4.66, 1], [4.95, 0, 'io']]), hf = man.handFar, hn = man.handNear, bq = [lerp(hf[0] + 12, hn[0] + 10, bk), lerp(hf[1] - 12, hn[1] - 10, bk)];
    W.ball(p, { x: bq[0], y: bq[1], r: 19, roll: wa * .25, ground: 0, light: L });
    threadTo(p, [bq[0] + 12, bq[1] + 2], t);
    if (t < 2.5) { const nh = man.handNear; W.thread(p, [[bq[0] + 4, bq[1] - 16], [nh[0] + 4, nh[1] - 2]], { w: 3, light: L, hang: .05, fuzz: .3 }); }
    const rose = deadRose(p, bri.tip[0] + 4, bri.tip[1] + 2, 17, { hang: .15 + .2 * g(t, 1060, 600), n: t > 5 ? 2 : 3 });
    p.layer('s10-near', { every: 2, depth: 1 }); const T2 = Math.floor(t * 6 + 1e-6) / 6;
    bank(p, [[-40, 946], [300, 930], [700, 914], [1080, 880], [1400, 846], [1700, 832], [1960, 812]]);
    W.deadFlowers(p, Object.assign({ line: [[-40, 1070], [150, 1050], [330, 1076]], n: 6, h: 400, t: T2, wind: g, seed: 3 }, base));
    W.deadFlowers(p, Object.assign({ line: [[1420, 1080], [1640, 1050], [1960, 1070]], n: 8, h: 330, t: T2, wind: g, seed: 8 }, base));
    W.grass(p, Object.assign({ line: [[-40, 1060], [260, 1046], [480, 1086]], n: 24, h: 90, depth: 40, t: T2, wind: g, seed: 46, d: 0, lines: 34 }, base));
    W.grass(p, Object.assign({ line: [[1200, 1090], [1500, 1056], [1960, 1060]], n: 28, h: 88, depth: 40, t: T2, wind: g, seed: 47, d: 0, lines: 34 }, base));
  }
  // ---- CLOSE. he looks up.
  const RAIN = { front: true, skin: '#d0a88d', lit: '#f4e8d4', sh: '#7b645a', deep: '#4c3e3a', hair: '#bab6ae', hairL: '#eceae0', hairD: '#7d7a76', ink: '#322c2a', cap: '#646d70', capD: '#343a3e', capL: '#a9b2b1', eyeW: '#d8d2c6', k: 1 };
  const HOUSE2 = [1480, 520];
  function closeBack(p, t) {
    const W = B.world, U = W.util;
    p.paper('#d3cdbd');
    p.layer('s10c-sky', { every: 6, still: true, depth: .04 });
    W.sky(p, { mood: L, t: 9, horizon: 640, clouds: false });
    p.mass([[-40, -40], [1960, -40], [1960, 120], [1400, 170], [900, 120], [420, 190], [-40, 140]], { color: '#979b9b', alpha: .75, dir: .06, size: 1.2, len: 1.3, vary: .4, soft: 40 });
    p.mass([[1060, 330], [1260, 250], [1500, 262], [1760, 232], [1980, 280], [1980, 470], [1700, 500], [1380, 490], [1120, 440]], { color: '#8d9598', alpha: .85, dir: .1, size: 1.1, len: 1.2, vary: .4, soft: 46 });
    p.mass([[620, 420], [900, 380], [1100, 420], [1180, 520], [900, 560], [640, 540]], { color: '#e6e1d2', alpha: .6, dir: .1, size: 1, vary: .3, soft: 50 });
    W.hill(p, Object.assign({ d: .9, pts: [[-60, 640], [260, 600], [620, 640], [900, 620], [1240, 560], [1560, 470], [1980, 430]], base: 900, seed: 131, spurs: 3, rough: 5, hatch: 0 }, base));
    p.layer('s10c-land', { every: 5, still: true, depth: .4 });
    W.hill(p, Object.assign({ d: .5, pts: [[-60, 830], [400, 800], [800, 770], [1080, 690], [1300, 590], [1480, 530], [1680, 520], [1980, 560]], base: 1130, seed: 132, spurs: 3, rough: 6 }, base));
    W.cottage(p, Object.assign({ x: HOUSE2[0], y: HOUSE2[1] + 8, scale: .62, state: 'ruin', d: .34 }, base));
    W.road(p, Object.assign({ pts: [[1486, 540], [1450, 580], [1530, 628], [1660, 690], [1640, 760], [1400, 850], [1180, 960], [1120, 1100]], w: [6, 150], power: 1.6, d: .3, color: '#aea28d', lw: 3 }, base));
    p.layer('s10c-thr', { every: 3, depth: .8 });
    W.thread(p, [[1130, 1086], [1190, 960], [1400, 850], [1636, 760], [1660, 694], [1530, 632], [1456, 584], [1488, 544]], { w: 5.6, wf: u => lerp(1, .4, u), meander: 8, slack: .3, seed: 9, ground: .4, light: L, ply: 0 });
  }
  function closeMan(p, t) {
    const W = B.world, C = B.cast, ln = lnOf(p), g = gust(), HT = { dir: -.8, warm: .25, k: .5, dim: .03 };
    const up = keys(t, [[4.3, .24], [4.8, .15], [5.1, -.08, 'out'], [5.4, -.05, 'io'], [6.75, -.055], [7.2, -.02, 'io']]);
    const gy = keys(t, [[4.75, .75], [4.92, -.1, 'snap'], [5.2, -.3, 'out'], [7.6, -.3]]), gx = keys(t, [[4.75, .1], [4.95, .8, 'snap'], [5.3, .62], [7.6, .62]]);
    const lids = keys(t, [[4.6, .22], [4.86, .34], [5.06, .78, 'out'], [5.25, 1, 'out'], [5.7, .9], [6.0, .88], [6.08, .05, 'in'], [6.2, .0], [6.34, .78, 'out'], [7.6, .8]]);
    const grief = keys(t, [[4.8, .12], [5.0, .16], [5.35, .34, 'out'], [6.0, .5, 'io'], [7, .68]]), mo = keys(t, [[5.0, 0], [5.3, .11, 'out'], [6.6, .09], [6.95, .04]]);
    const inh = keys(t, [[4.8, 0], [4.95, -.15, 'out'], [5.4, 1, 'out'], [6.72, 1], [7.1, .1, 'io'], [7.6, .25]]) * 11; // the breath goes in and stays
    const hz = keys(t, [[5.1, 0], [6.1, 18, 'io']]);
    const wind = g(t, 600, 500), hx = 640 + keys(t, [[4.8, -16], [5.15, 3, 'out'], [5.5, 0]]), hy = 452 - inh * .5 + keys(t, [[4.8, 10], [5.15, -4, 'out'], [5.5, 0]]);
    const back = [[90, 1130], [110, 960], [160, 820 - inh], [244, 704 - inh * 1.2], [360, 640 - inh * 1.3], [480, 626 - inh], [620, 690 - inh * .6], [760, 780], [850, 900], [900, 1130]];
    // tail of the scarf blown back over the shoulder: the gust runs along it
    const fl = []; { let x = 486, y = 604 - inh; for (let i = 0; i <= 8; i++) { const gk = clamp(g(t - i * .07, 560 - i * 40, 560) * .9 + .1, 0, 1.1), a = Math.PI + lerp(.34, -.12, gk) * -1 + .34 * A.noise1(t * 1.5 + i * .42, 5) * (i / 8) + (i < 2 ? -.1 : 0); fl.push([x, y]); x += Math.cos(a) * 45; y += Math.sin(a) * 45; } }
    const w = i => 38 + 5 * A.noise1(i * .9, 2), lft = [], rgt = []; fl.forEach((v, i) => { const a = fl[Math.max(0, i - 1)], b = fl[Math.min(fl.length - 1, i + 1)], d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / d, ny = (b[0] - a[0]) / d; lft.push([v[0] + nx * w(i), v[1] + ny * w(i)]); rgt.push([v[0] - nx * w(i), v[1] - ny * w(i)]); });
    const tp = lft.concat(rgt.slice().reverse()); p.mass(tp, { color: mixc(RED, '#8f6258', .18), dir: 2.9, size: .6, len: .9, vary: .42 }); p.shade(lft.concat(fl.slice().reverse()), { color: RED_D, alpha: .4, soft: 12 }); ln(lft, { color: '#4a2224', w: 4 }); ln(rgt, { color: '#4a2224', w: 4 }); ln(fl, { color: RED_L, w: 2.6, press: .45 }); { const e = fl.length - 1; for (let k = 0; k < 8; k++) { const u = k / 7, x = lerp(lft[e][0], rgt[e][0], u), y = lerp(lft[e][1], rgt[e][1], u); ln([[x, y], [x - 12, y + 8 * (p.fix(k, 3) - .4)], [x - 24 - 8 * p.fix(k, 4), y + 18 * (p.fix(k, 5) - .3)]], { color: k % 2 ? RED : RED_D, w: 3, press: .7, taper: [.05, .5] }); } }
    // coat
    p.mass(back, { color: { lin: [160, 700, 880, 900], stops: [[0, '#56534f'], [.5, '#68635c'], [1, '#777067']] }, dir: 2.0, size: 1, vary: .45 });
    p.shade([[90, 1130], [110, 960], [160, 830], [250, 720], [330, 740], [300, 900], [330, 1130]], { color: '#2d2b2b', alpha: .5, soft: 46 }); p.shade([[560, 700], [700, 780], [760, 900], [700, 1000], [600, 880]], { color: '#2c2a2a', alpha: .5, soft: 34 });
    p.shade([[200, 760], [300, 676], [420, 640], [500, 640], [440, 680], [320, 740]], { color: '#e3e1d6', alpha: .36, soft: 22, mode: 'screen' }); p.shade([[760, 790], [852, 900], [890, 1100], [850, 1100], [800, 930]], { color: '#e3e1d6', alpha: .32, soft: 16, mode: 'screen' });
    ln(back.slice(0, 6), { w: 4, press: .62, wobble: 1.4 }); ln(back.slice(6), { w: 4.6, press: .7 });
    // lapel, seam, sleeve
    p.mass([[470, 640 - inh], [560, 680 - inh * .6], [700, 800], [780, 960], [760, 1130], [640, 1130], [560, 900], [500, 760]], { color: '#5a554f', dir: 1.1, size: .8, vary: .4 }); ln([[474, 648 - inh], [520, 780], [596, 930], [650, 1110]], { w: 4.4, press: .75 }); ln([[700, 800], [782, 962], [764, 1120]], { w: 3.4, press: .5 });
    ln([[330, 700 - inh], [372, 820], [380, 960]], { w: 3.4, press: .4 }); [[[250, 900], [300, 960], [320, 1040]], [[420, 860], [400, 930], [420, 1010]]].forEach(q => ln(q, { w: 3.4, press: .4, taper: [.1, .55] }));
    p.mass([[452, 606 - inh], [520, 560 - inh], [640, 560], [740, 640], [760, 740], [650, 720], [520, 680 - inh]], { color: '#9c7664', dir: .9, size: .6, vary: .3 });
    // scarf round the neck: two worn turns
    const n = [[428, 640 - inh], [446, 590 - inh], [500, 566 - inh], [560, 600], [660, 668], [760, 690], [806, 712], [812, 760], [770, 790], [660, 776], [540, 730], [450, 690 - inh]];
    p.mass(n, { color: mixc(RED, '#8f6258', .12), dir: .35, size: .6, len: .8, vary: .42 }); p.shade([[440, 660], [560, 700], [700, 740], [812, 750], [770, 792], [650, 778], [530, 732], [448, 694]], { color: RED_D, alpha: .55, soft: 15 }); p.shade([[450, 590 - inh], [504, 570 - inh], [600, 640], [760, 700], [700, 706], [560, 650], [470, 620 - inh]], { color: '#e0a78f', alpha: .3, soft: 12, mode: 'screen' });
    [[[440, 620 - inh], [560, 664], [700, 716], [800, 722]], [[436, 652 - inh], [548, 700], [690, 752], [790, 758]], [[470, 588 - inh], [580, 636], [700, 690], [790, 704]]].forEach((q, i) => ln(q, { color: i === 1 ? '#4a2224' : i ? RED_L : RED_D, w: i === 1 ? 4 : 2.8, press: i === 1 ? .7 : .5 })); for (let i = 0; i < 16; i++) { const u = i / 15, x = lerp(456, 780, u), y = lerp(616, 728, u) + 18 * (p.fix(i, 3) - .5); ln([[x, y], [x + 4, y + 10], [x - 1, y + 20]], { color: i % 2 ? RED_D : RED_L, w: 2.2, press: .5 }); }
    ln([[450, 690 - inh], [540, 732], [660, 778], [770, 792], [814, 758]], { color: '#4a2224', w: 4.4 }); ln([[428, 640 - inh], [446, 590 - inh], [502, 566 - inh]], { color: '#4a2224', w: 4 });
    B.test.s13head(p, { x: hx, y: hy, s: .94, rot: up, cap: true, lids, gx, gy, grief, knit: keys(t, [[4.8, .12], [5.2, 0]]), mOpen: mo, wet: keys(t, [[5.4, 0], [6.4, 1]]), mPull: keys(t, [[6.2, 0], [7, .4]]), light: RAIN });
    // the breath: one last cloud of it, and then none
    const ex = clamp((t - 4.35) / .9); if (t < 5.5) { const a = (1 - ex) * .8, q = [hx + 220 - 60 * ex, hy + 190 - 30 * ex]; const o = []; for (let i = 0; i < 9; i++) { const an = i / 9 * 6.283, r = (26 + 46 * ex) * (.75 + .5 * p.fix(i, 6)); o.push([q[0] + Math.cos(an) * r * 1.5, q[1] + Math.sin(an) * r * .8]); } p.mass(o, { color: '#eef0ea', alpha: .5 * a, dir: 3, size: .8, len: .9, vary: .2, soft: 18 }); }
    // hands with the ball, low, half forgotten
    const Y = hz - inh * .3;
    p.mass([[640, 990], [740, 916 + Y], [836, 900 + Y], [876, 950 + Y], [870, 1040 + Y], [800, 1130], [600, 1130]], { color: '#5d5852', dir: .6, size: .8, vary: .4 }); ln([[650, 980], [744, 916 + Y], [836, 898 + Y]], { w: 4.4 });
    C.hand(p, { who: 'dannyOld', x: 1120, y: 936 + Y, h: 190, pose: 'cradle', rot: -2.9, mir: 1, flip: -1, light: HT, sleeve: false, armLen: .05 });
    W.ball(p, { x: 986, y: 868 + Y, r: 70, roll: 1.2, ground: 0, light: L });
    C.hand(p, { who: 'dannyOld', x: 846, y: 958 + Y, h: 206, pose: { base: 'holdFingers', f: [[8, 16, 26, 16], [3, 20, 30, 18], [-3, 24, 32, 18], [-9, 28, 34, 18]], th: [58, 18, 8, 10], roll: 40, pitch: 0 }, rot: -.42, light: HT, sleeve: false, armLen: .05 });
    p.mass([[800, 906 + Y], [838, 894 + Y], [872, 930 + Y], [880, 990 + Y], [846, 1030 + Y], [790, 1010 + Y]], { color: '#68625b', dir: 1, size: .6, vary: .35 }); ln([[836, 894 + Y], [872, 934 + Y], [880, 990 + Y], [850, 1030 + Y]], { w: 4.2, press: .8 });
    W.thread(p, [[1040, 906 + Y], [1084, 960 + Y], [1120, 1040], [1130, 1086]], { w: 8, light: L, seed: 4 });
  }
  function closeNear(p, t) {
    const W = B.world, g = gust();
    p.layer('s10c-near', { every: 2, depth: 1 });
    bank(p, [[-40, 1010], [420, 1000], [800, 976], [1100, 944], [1400, 916], [1700, 890], [1960, 880]]);
    const br = briar(p, t, { x: 1290, y: 960, k: 1.45, tug: 0 }); const rose = deadRose(p, br.tip[0] + 6, br.tip[1] + 4, 34, { hang: .16 + .16 * g(t, 1300, 700), n: t > 5.1 ? 2 : 3 });
    if (t > 5.1) { const q = W.flutter(4, t - 5.1, { x: rose[0], y: rose[1], vx: -20, vy: 10, wind: -.5 }); if (q) W.petal(p, { x: q.x ?? q[0], y: q.y ?? q[1], s: 24, rot: q.rot ?? (t * 2), yaw: q.yaw ?? t * 3, color: mixc(RED, '#7a3a34', .3) }); }
    W.deadFlowers(p, Object.assign({ line: [[1500, 1110], [1700, 1080], [1960, 1100]], n: 5, h: 420, t, wind: g, seed: 12 }, base));
  }
  function drawClose(p, t) { closeBack(p, t); p.layer('s10c-man', { every: t > 5.5 ? 2 : 1, depth: 1 }); closeMan(p, t); closeNear(p, t); }
  const CUT = 4.8;
  B.test.s10wide = function (p, k) { drawWide(p, k); };
  B.test.s10close = function (p, k) { drawClose(p, k); };
  B.scene({ id: 's10', ink: 'dark', draw(p, s) { if (s.t < CUT) drawWide(p, s.t); else drawClose(p, s.t); } });
})();
