// s17 (126.6-139.4) "And I shall sleep in peace until you come to me" - slower and slower
// FEELING: being put to bed. then, when nobody is looking any more, running home.
// BEATS (scene seconds; And .23 I .75 shall 1.14 sleep 1.63-2.7 in 2.7 peace 3.51-4.53 until 4.53 you 5.5 come 5.94 to 6.7 me 7.34-12.64)
//  -.7-1.1  last rose light on the hill; small, the old man asleep against the stone, the scarf round them both.
//  1.1-4.7  night is drawn up over the hill like a blanket by two hands we do not see: pull, rest; pull, rest and a pat; the last pull long and slow.
//  2.6-6    stars put in one at a time. the last and brightest goes where she will stand.
//  4.6-6.4  "until you come": the thread stirs in the grass, lifts from its far end, swings up and lies down among the stars in long bends.
//  5.4-7.7  out of the sleeping man a small boy gets up (line, a little warm tone): lifts his head, sees, stands, looks back once at the old man.
//  7.7-8.6  steps on to the thread. it gives. stumbles, saves himself.
//  8.6-11.4 runs, sure, smaller and smaller. she has her arms open; goes down on her knees for him.
//  11.4-    they meet. she gets up with him. hold.
// EYE: the man -> the hem going up -> star after star -> along the thread -> her -> back to him getting up -> up again with him.
// VALUE: darkest tree and hill, middle the blue, lightest stars and the two of them.
(function () {
  'use strict';
  const B = window.BIDE, A = B.anim, { clamp, lerp, ease, keys, hash, noise1, mixc, spline, TAU } = A, PI = Math.PI, sin = Math.sin, cos = Math.cos, hyp = Math.hypot;
  const ss = (a, b, x) => { x = clamp((x - a) / (b - a)); return x * x * (3 - 2 * x); };
  let W, C, DL, NL, SNL, calm;
  function init() { if (W) return; W = B.world; C = B.cast; calm = W.gusts({ seed: 5, power: .35, base: .08, every: 3.4 });
    DL = Object.assign({}, W.mixLight('gold', 'dusk', .45), { top: '#7f93a6', mid: '#d9b49a', low: '#f6c68a', cl: '#f3d3b0', cs: '#a98a94', tint: '#b98f78', tk: .3, shade: '#5a5264', sun: '#f6cf90', haze: '#c9a493' });
    NL = W.light('night'); SNL = Object.assign({}, NL, { top: '#8896a6', sun: '#dfe6e2', tint: '#62718a', tk: .45, shade: '#3a4863', ink: '#1a2233' }); }
  const STONE = [1164, 660, .93], MAN = [1046, 678, 342];

  // ---------------------------------------------------------------- the hill, at dusk or at night
  function back(p, light) { W.thornHill(p, { part: 'back', layers: false, light, season: .34, colour: .75, clouds: light === NL ? false : [[300, 250, 900, 80, 1], [1250, 180, 900, 70, 3], [820, 420, 860, 40, 5]], t: 0 }); }
  function land(p, light, t) {
    W.thornHill(p, { part: 'mid', layers: false, light, season: .34, colour: .75, treeScale: 1.45, t, wind: calm });
    const n = light === NL; W.stone(p, { x: STONE[0], y: STONE[1], scale: STONE[2], light: n ? SNL : light, season: .34, tuft: 0, t });
    W.rosesOver(p, { x: STONE[0] + 18, y: STONE[1] - 4, scale: STONE[2] * .98, k: .9, light, colour: 1, t, wind: calm });
  }
  // the scarf: round the stone, over his shoulder, into his hand
  function scarfOver(p, dim, an) {
    const c = dim ? '#97342f' : '#ab3a31', dk = dim ? '#461a22' : '#751c20', lt = dim ? '#b85d4d' : '#d0604f', sh = an.shoulderNear, nk = an.neck, hd = an.handNear;
    const rib = (pts, w0, w1, sd, fr) => { const q = spline(pts, 5, false), L = [], R = [], m = q.length; q.forEach((v, i) => { const A0 = q[Math.max(0, i - 1)], e = q[Math.min(m - 1, i + 1)], l = hyp(e[0] - A0[0], e[1] - A0[1]) || 1, w = lerp(w0, w1, i / (m - 1)) * (1 + .22 * noise1(i * .55, sd)); L.push([v[0] - (e[1] - A0[1]) / l * w, v[1] + (e[0] - A0[0]) / l * w]); R.push([v[0] + (e[1] - A0[1]) / l * w, v[1] - (e[0] - A0[0]) / l * w]); });
      p.mass(L.concat(R.slice().reverse()), { color: c, dir: .4 + sd, size: .4, len: .5, vary: .42 }); p.shade(L.concat(q.slice().reverse()), { sharp: true, color: '#4a1a2a', alpha: .42, soft: 2.5 });
      p.line(L.filter((_, i) => i % 2 === 0), { color: dk, w: 2.4, press: .7, taper: [.12, .12] }); p.line(R.filter((_, i) => i % 2 === 0), { color: dk, w: 1.8, press: .5, taper: [.2, .2] }); [.35, .7].forEach((u, j) => p.line(q.map((v, i) => [lerp(L[i][0], R[i][0], u), lerp(L[i][1], R[i][1], u)]).filter((_, i) => i % 2 === 0), { color: j ? lt : dk, w: 1.5, press: .42, taper: [.25, .3] }));
      if (fr) for (let j = 0; j < 5; j++) { const u = j / 4, e = m - 1, x = lerp(L[e][0], R[e][0], u), y = lerp(L[e][1], R[e][1], u), dx = q[e][0] - q[e - 3][0], dy = q[e][1] - q[e - 3][1], l = hyp(dx, dy) || 1; p.line([[x, y], [x + dx / l * 7, y + dy / l * 7], [x + dx / l * 14 + 3 * (hash(j, sd, 1) - .5), y + dy / l * 14]], { color: j % 2 ? c : lt, w: 2, press: .85, taper: [.05, .5] }); } };
    rib([[1238, 576], [1220, 592], [1184, 600], [1146, 596], [1112, 584], [sh[0] + 14, sh[1] - 8], [nk[0] + 14, nk[1] + 2]], 10.5, 8.5, 3);
    rib([[1214, 596], [1222, 616], [1214, 640], [1219, 660]], 8, 9.5, 5, 1); rib([[1206, 598], [1202, 618], [1207, 636]], 7.5, 8.5, 6, 1);
    rib([[nk[0] + 18, nk[1] - 6], [nk[0] + 8, nk[1] + 8], [nk[0] - 12, nk[1] + 8], [nk[0] - 24, nk[1] - 4]], 8.5, 7.5, 7);
    rib([[nk[0] - 6, nk[1] + 8], [lerp(nk[0], hd[0], .3) - 2, lerp(nk[1], hd[1], .38)], [lerp(nk[0], hd[0], .62) + 2, lerp(nk[1], hd[1], .72)], [hd[0] + 12, hd[1] - 2]], 8.5, 8, 8, 1);
  }
  // his cap, taken off long ago, on the grass by the stone
  function cap(p, dim) { const x = 1150, y = 688, c = dim ? '#5c6b78' : '#747c80', d = dim ? '#1f2837' : '#40474d', l = dim ? '#93a3b0' : '#b0b6b2'; p.mass([[x - 22, y + 2], [x - 23, y - 8], [x - 12, y - 17], [x + 8, y - 18], [x + 24, y - 10], [x + 28, y + 1], [x + 18, y + 6], [x - 8, y + 6]], { color: { lin: [x, y - 18, x, y + 6], stops: [[0, l], [.5, c], [1, d]] }, dir: .1, size: .36, len: .4, vary: .3 }); p.mass([[x - 18, y + 1], [x - 34, y + 2], [x - 45, y + 8], [x - 36, y + 12], [x - 14, y + 8]], { color: d, dir: .2, size: .34, len: .36 }); p.line([[x - 22, y + 3], [x - 24, y - 8], [x - 12, y - 18], [x + 8, y - 19], [x + 25, y - 10], [x + 29, y + 2], [x + 18, y + 7]], { color: d, w: 2.6, press: .85, taper: [.1, .2] }); p.line([[x - 45, y + 8], [x - 34, y + 2], [x - 18, y + 2], [x + 6, y + 5], [x + 27, y + 2]], { color: d, w: 2.2, press: .8 }); p.line([[x - 6, y - 17], [x + 1, y - 8], [x - 1, y + 2]], { color: d, w: 1.6, press: .5 }); p.line([[x + 10, y - 17], [x + 16, y - 8], [x + 14, y + 2]], { color: d, w: 1.6, press: .4 }); }
  // what is left of his hair, white
  function hair(p, an, dim) { const h = an.head, S = an.S, l = dim ? '#c3c9cf' : '#f4ede0', m = dim ? '#7f8894' : '#b5aca0', X = (a, b) => [h[0] + (a + .1) * S * .074, h[1] + (b - .06) * S * .074]; p.mass([X(-.42, -.94), X(.1, -1.14), X(.68, -.88), X(1.04, -.32), X(1.0, .34), X(.7, .62), X(.5, .2), X(.34, -.22), X(-.06, -.56)], { color: dim ? '#a9b0b8' : '#dcd5c9', dir: 2.2, size: .34, len: .4, vary: .3 }); for (let i = 0; i < 8; i++) { const u = i / 7; p.line([X(-.36 + .9 * u, -.9 - .18 * Math.sin(u * 2.6) + .35 * u * u), X(.2 + .62 * u, -.72 + .5 * u), X(.46 + .42 * u, -.2 + .62 * u)], { color: i % 2 ? l : m, w: 1.9, press: .7, medium: i % 2 ? 'crayon' : 'graphite', taper: [.15, .5], wobble: .5 }); } }
  function man(p, t, dim, peace) {
    const br = noise1(t * .42, 3) * .5 + .5 * sin(t * 1.35);
    const an = C.figure(p, 'dannyOld', Object.assign({ x: MAN[0], y: MAN[1], h: MAN[2], face: -1, t }, C.poses.asleepAtStone(), { lean: -.49 - .012 * br, bend: -.34, head: { nod: lerp(.06, -.02, peace), tilt: -.1, turn: -.4 }, legs: { kind: 'sitGround', up: .62 }, armNear: 'lap', armFar: 'lap', expr: { base: 'asleep', smile: lerp(.04, .34, peace), cheek: lerp(0, .3, peace) }, scarf: false, cap: false, light: dim ? { dir: -2.3, warm: .3, k: .6, dim: .28 } : { dir: -2.7, warm: .85, k: .6, dim: .05 } }));
    hair(p, an, dim); scarfOver(p, dim, an); cap(p, dim); return an;
  }
  let HANDP = null; const handPt = () => { if (HANDP) return HANDP; const fake = { t: 0, n: 0, fix: () => .5, rnd: () => .5 }, an = C.figure(fake, 'dannyOld', Object.assign({ x: MAN[0], y: MAN[1], h: MAN[2], face: -1, t: 0, lite: true, rec: NUL(fake) }, C.poses.asleepAtStone(), { lean: -.49, bend: -.34, legs: { kind: 'sitGround', up: .62 }, armNear: 'lap', armFar: 'lap' })); return HANDP = an.handNear.slice(0, 2); };

  // ---------------------------------------------------------------- the blanket
  // hem height at seven places; the two hands (x 600 and 1330) lead, the middle sags after them, the sides come last
  const HX = [-80, 280, 600, 960, 1330, 1640, 2000], HL = [.13, .06, 0, .055, .02, .06, .14], HS = [26, 4, -26, 30, -20, 6, 34];
  const HEM = t => keys(t, [[.95, 930], [1.1, 944, 'out'], [1.72, 742, 'io'], [1.92, 752, 'out'], [2.5, 752], [2.62, 764, 'out'], [3.22, 486, 'io'], [3.44, 500, 'out'], [3.66, 500], [3.8, 508, 'out'], [4.9, -190, 'io']]);
  const hemPts = t => HX.map((x, i) => { const y = HEM(t - HL[i]), mv = Math.abs(HEM(t - HL[i] + .08) - HEM(t - HL[i] - .08)); const tuck = i >= 2 && i <= 4 ? 0 : 0; return [x, y + HS[i] * (.5 + Math.min(1, mv / 60)) + 8 * noise1(i * 2 + .3, 3) + tuck]; });
  const hemLine = (t, n = 14) => spline(hemPts(t), n, false);
  const hemShape = h => c => { c.beginPath(); h.forEach((v, i) => i ? c.lineTo(v[0], v[1]) : c.moveTo(v[0], v[1])); c.lineTo(2040, 1160); c.lineTo(-120, 1160); c.closePath(); };
  const hemOff = (h, d) => h.map((v, i) => { const a = h[Math.max(0, i - 1)], b = h[Math.min(h.length - 1, i + 1)], l = hyp(b[0] - a[0], b[1] - a[1]) || 1; return [v[0] - (b[1] - a[1]) / l * d, v[1] + (b[0] - a[0]) / l * d]; });
  // folds hang from where it is held
  function hemFolds(p, h) {
    const at = x => { for (let i = 1; i < h.length; i++) if (h[i][0] >= x) return h[i][1]; return h[h.length - 1][1]; };
    [[600, -230, 260, 34], [600, -90, 380, 40], [600, 40, 420, 38], [600, 190, 280, 34], [1330, -220, 280, 34], [1330, -70, 420, 40], [1330, 80, 400, 38], [1330, 230, 260, 34], [280, 40, 200, 26], [1640, -30, 220, 26]].forEach((q, i) => { const x0 = q[0] + q[1] * .12, y0 = at(x0) + 6, x1 = q[0] + q[1], y1 = y0 + q[2]; p.shade([[x0 - 4, y0], [x0 + 6, y0], [lerp(x0, x1, .5) + q[3] * .7, lerp(y0, y1, .5)], [x1 + q[3] * .4, y1], [x1 - q[3] * .4, y1 - 20], [lerp(x0, x1, .5) - q[3] * .3, lerp(y0, y1, .5)]], { color: '#3b4a6e', alpha: .55, soft: 13, mode: 'multiply' }); });
  }
  function hemDraw(p, h, t) {
    const a = hemOff(h, -2), b = hemOff(h, 78); p.mass(a.concat(b.slice().reverse()), { sharp: true, color: { lin: [0, h[50][1], 0, h[50][1] + 90], stops: [[0, '#6f86a2'], [.5, '#4c6186'], [1, '#33486a']] }, alpha: .58, dir: .06, size: .6, len: .9, vary: .55, soft: 9 });
    for (let r = 0; r < 6; r++) { const q = hemOff(h, 9 + r * 12), z = []; let d = r; for (let i = 1; i < q.length; i++) { const l = hyp(q[i][0] - q[i - 1][0], q[i][1] - q[i - 1][1]), m = Math.max(1, Math.round(l / 10)); for (let j = 0; j < m; j++) { const u = j / m; d++; z.push([lerp(q[i - 1][0], q[i][0], u), lerp(q[i - 1][1], q[i][1], u) + (d % 2 ? 4.6 : -4.6)]); } } const pr = .62 * (1 - r / 6.4); for (let i = 0; i < z.length - 2; i += 46) { if (r > 2 && hash(i, r, 3) < (r - 2) * .2) continue; p.line(z.slice(i, i + 47), { color: r % 2 ? '#93a8bf' : '#b4c3d0', w: 2.1, press: pr, wobble: .8, taper: [.03, .03] }); } }
    for (let i = 0; i < h.length - 6; i += 9) p.line(h.slice(i, i + 11), { color: i % 2 ? '#b9c7d4' : '#9fb2c6', w: 3.6, press: .72, medium: 'crayon', taper: [.2, .3], wobble: 1.4 });
  }

  // ---------------------------------------------------------------- stars
  const HERO = [[1500, 92, 2.55, 11], [250, 214, 2.95, 9], [960, 150, 3.35, 12], [1180, 330, 3.8, 8], [700, 420, 4.2, 9], [330, 70, 4.6, 10], [1010, 420, 5.0, 8], [546, 160, 5.45, 18]];
  function oneStar(p, x, y, r, age, n, last) { // dot, then the cross strokes, then it settles
    if (age < 0) return; const k = keys(age, [[0, .25], [.08, .4], [.17, 1.35, 'out'], [.4, .85], [.6, 1]]), tw = 1 + .12 * (hash(n, Math.round(x), 2) - .5) * 2, c = last ? '#fff3d0' : '#f3ead2';
    p.dust(x, y, 4, { color: c, n: 6, seed: Math.round(x), size: 1.4 }); if (age < .08) return; for (let j = 0; j < (age < .17 ? 1 : 2); j++) { const a = .12 + j * PI / 2, l = r * k * tw * (j ? 1.25 : .9); p.line([[x - cos(a) * l, y - sin(a) * l, .15], [x, y, 1], [x + cos(a) * l, y + sin(a) * l, .15]], { color: c, w: 3.2, press: .95, taper: [.4, .4], wobble: .5 }); }
  }
  function stars(p, t, n, hide) {
    W.stars(p, { n: 150, seed: 3, area: [0, 0, 1920, 690], k: ss(2.4, 7.4, t) * .95, t: Math.floor(t * 4) / 4 });
    HERO.forEach((s, i) => { if (hide && i === 7) return; oneStar(p, s[0], s[1], s[3], t - s[2], Math.floor(n / 4) + i, i === 7); });
  }

  // ---------------------------------------------------------------- the thread
  const G0 = [[0, 0], [870, 704], [760, 726], [620, 772], [470, 820], [320, 858], [160, 896], [30, 926], [-120, 950]];
  const S0 = [[0, 0], [902, 618], [820, 600], [700, 588], [560, 562], [436, 512], [376, 446], [420, 394], [530, 376], [660, 372], [780, 346], [852, 290], [816, 240], [716, 222], [644, 226], [596, 230]];
  const TAILUP = [[574, 212], [562, 178], [560, 140], [528, 112], [478, 106], [450, 78], [470, 50], [502, 60], [494, 86], [454, 88], [412, 62], [398, 30]];
  let gT, sT, NP = 84;
  function paths() { if (sT) return; const hp = handPt(); G0[0] = [hp[0] - 4, hp[1] + 6]; S0[0] = [hp[0] - 4, hp[1] + 4]; gT = W.util.track(spline(G0, 10, false)); sT = W.util.track(spline(S0, 12, false)); }
  const PL = () => (paths(), sT.len);
  // strand at scene time t: each point leaves the ground in its turn, the far end first, swings wide and settles
  function strand(t, o = {}) {
    paths(); const out = [], full = spline(S0.concat(TAILUP), 12, false), fT = W.util.track(full), n = NP;
    for (let i = 0; i <= n; i++) {
      const u = i / n, g = gT.at(u), s = fT.at(u), ts = 4.95 + .85 * (1 - u) * (1 - .25 * u), x = clamp((t - ts) / 1.25), e = ease.io(x), arc = sin(PI * e);
      let px = lerp(g[0], s[0], e) - 150 * arc * u, py = lerp(g[1], s[1], e) - 120 * arc * (.3 + u) * ss(0, .16, u); // swings out to the left and over
      const st = keys(t, [[4.5, 0], [4.75, 1], [5.2, .2]]) * (1 - e); py += st * 7 * sin(u * 34 - t * 13) * sin(PI * u); // it stirs in the grass
      const after = t - ts - 1.15; if (after > -.2) { const q = Math.max(0, after + .2), am = 26 * Math.exp(-1.6 * q) * sin(PI * Math.min(1, u * 1.02)); px += am * .5 * sin(q * 5.2 + u * 9); py += am * cos(q * 4.6 + u * 8); }
      if (e > .5) { const f = (e - .5) * 2 * sin(PI * clamp(u * 1.05)) * 5; py += f * noise1(u * 5 - t * .5, 7); px += f * .6 * noise1(u * 4 + t * .4, 9); }
      if (o.foot != null) { const d = (u * fT.len - o.foot) / (70 * (o.sc || 1) + 30); py += 15 * (o.sc || 1) * (o.press || 0) * Math.exp(-d * d); if (d < 0) py += 7 * (o.sc || 1) * Math.exp(d * .5) * sin(d * 3 + t * 16) * Math.min(1, -d); }
      out.push([px, py]);
    }
    if (o.slack) return out; return out;
  }
  const onSky = d => { paths(); return sT.s(d); };

  // ---------------------------------------------------------------- figures of light: only line and a little warm tone
  const NUL = p => { const r = { p, ops: [] }; for (const k of ['mass', 'shade', 'lift', 'hatch', 'line', 'dust', 'call', 'contour', 'flush']) r[k] = () => r; return r; };
  const CREAM = '#fbeecb', WARM = '#f0c389', HAIRT = '#b98450';
  const mix = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
  const off2 = (a, b, r) => { const l = hyp(b[0] - a[0], b[1] - a[1]) || 1; return [-(b[1] - a[1]) / l * r, (b[0] - a[0]) / l * r]; };
  function limb(p, a, m, b, r0, r1, r2, st) { // a bent tube: tone, then its two edges
    const n0 = off2(a, m, 1), n1 = off2(a, b, 1), n2 = off2(m, b, 1), L = [[a[0] + n0[0] * r0, a[1] + n0[1] * r0], [m[0] + n1[0] * r1, m[1] + n1[1] * r1], [b[0] + n2[0] * r2, b[1] + n2[1] * r2]], R = [[a[0] - n0[0] * r0, a[1] - n0[1] * r0], [m[0] - n1[0] * r1, m[1] - n1[1] * r1], [b[0] - n2[0] * r2, b[1] - n2[1] * r2]];
    if (st.tone > .02) p.mass(L.concat(R.slice().reverse()), { color: st.fill || WARM, alpha: st.tone, dir: Math.atan2(b[1] - a[1], b[0] - a[0]), size: .36, len: .42, vary: .25 });
    if (st.k > .02) { p.line(L, { color: st.ink, w: st.w, press: .95 * st.k, taper: [.1, .2], wobble: .7 }); p.line(R, { color: st.ink, w: st.w, press: .95 * st.k, taper: [.1, .2], wobble: .7 }); }
  }
  // the boy. pose = anything C.figure takes; k 0..1 how much of him is drawn yet
  function lightBoy(p, pose, o = {}) {
    const k = o.k == null ? 1 : o.k, an = C.figure(p, 'boy', Object.assign({ lite: true, rec: NUL(p), light: {} }, pose)), r = an.rig, T = an.T, S = an.S, h = pose.h, w = Math.max(1.6, h * .0175), ink = o.ink || CREAM, tone = (o.tone == null ? .86 : o.tone), a = an.ctx.arms, near = an.ctx.near, far = an.ctx.far, kk = i => clamp(k * 5 - i), tn = i => tone * clamp(k * 5 - i - .5);
    const ST = (i, fill) => ({ ink, w, k: kk(i), tone: tn(i), fill }), leg = (i, lv) => { const l = r.legs[i], H = T(l.hip), K = T(l.knee), N = T(l.ank); limb(p, H, K, N, .05 * S, .038 * S, .026 * S, ST(lv, '#f0c79c')); const sh = mix(H, K, .86); limb(p, H, mix(H, K, .5), sh, .066 * S, .06 * S, .054 * S, ST(lv, '#8fa0a8')); if (kk(lv) > .4) { const n = off2(H, K, .054 * S); p.line([[sh[0] + n[0], sh[1] + n[1]], [sh[0] - n[0], sh[1] - n[1]]], { color: ink, w: w * .9, press: .85 }); const a0 = mix(K, N, .52), m = off2(K, N, .034 * S); p.line([[a0[0] + m[0], a0[1] + m[1]], [a0[0] - m[0], a0[1] - m[1]]], { color: ink, w: w * .8, press: .7 }); } const f = [T([l.ank[0] - .03, l.ank[1] + .01]), T([l.ank[0] + .02 * cos(l.a), l.ank[1] + .035]), T([l.ank[0] + .085 * cos(l.a), l.ank[1] + .035 + .07 * sin(l.a)]), T([l.ank[0] + .07 * cos(l.a), l.ank[1] + .005 + .06 * sin(l.a)])]; if (tn(lv) > .02) p.mass(f, { color: '#c99a6c', alpha: tn(lv), dir: 0, size: .34, len: .36 }); if (kk(lv) > .02) p.line(f.concat([f[0]]), { color: ink, w, press: .9 * kk(lv), taper: [.1, .2], wobble: .5 }); };
    const arm = (i, lv) => { limb(p, T(a[i].sh), T(a[i].el), T(a[i].wr), .042 * S, .036 * S, .026 * S, ST(lv)); const q = T(a[i].wr); if (kk(lv) > .3) p.line([[q[0] - .02 * S, q[1]], [q[0], q[1] + .022 * S], [q[0] + .02 * S, q[1]], [q[0], q[1] - .02 * S]], { color: ink, w: w * .9, press: .8, taper: [.1, .1] }); };
    arm(far, 3); leg(far, 2);
    const sp = [0, .25, .5, .75, 1].map(u => r.at(u)), wd = [.085, .082, .086, .08, .045], Ls = sp.map((q, i) => T([q.c[0] + q.n[0] * wd[i], q.c[1] + q.n[1] * wd[i]])), Rs = sp.map((q, i) => T([q.c[0] - q.n[0] * wd[i], q.c[1] - q.n[1] * wd[i]]));
    leg(near, 2);
    const hem = T([r.P[0], r.P[1] + .045]); if (tn(1) > .02) p.mass(Ls.concat(Rs.slice().reverse(), [hem]), { color: '#f3d6a4', alpha: tn(1), dir: 1.4, size: .36, len: .45, vary: .25 }); if (kk(1) > .02) { p.line(Ls, { color: ink, w, press: .95 * kk(1), taper: [.15, .2], wobble: .7 }); p.line(Rs, { color: ink, w, press: .95 * kk(1), taper: [.15, .2], wobble: .7 }); p.line([Ls[0], hem, Rs[0]], { color: ink, w, press: .85 * kk(1), taper: [.1, .1] }); if (h > 80) for (let j = 0; j < 4; j++) { const u = (j + .7) / 4.6, q = mix(Ls[0], Rs[0], u), e = mix(Ls[1], Rs[1], u); p.line([q, mix(q, e, .42)], { color: '#d9a968', w: w * .7, press: .6 * kk(1), taper: [.1, .5] }); } p.line([Ls[4], T([r.nb.c[0], r.nb.c[1] + .02]), Rs[4]], { color: ink, w: w * .9, press: .8 * kk(1), taper: [.1, .1] }); }
    // head: an egg, a mop of hair scribbled, the cheek
    const hd = r.head, c0 = T([hd.p[0], hd.p[1] - .012]), R0 = .104 * S, tl = hd.tilt * (pose.face || 1), fx = sin(hd.turn) * (pose.face || 1), egg = []; for (let i = 0; i <= 11; i++) { const q = i / 11 * TAU - 1.2, x = cos(q) * R0 * .84, y = sin(q) * R0 * (sin(q) > 0 ? 1.06 : 1); egg.push([c0[0] + x * cos(tl) - y * sin(tl), c0[1] + x * sin(tl) + y * cos(tl)]); }
    const HH = (x, y) => [c0[0] + (x * cos(tl) - y * sin(tl)) * R0, c0[1] + (x * sin(tl) + y * cos(tl)) * R0];
    if (tn(0) > .02) { p.mass(egg, { color: '#f7d7ae', alpha: Math.min(1, tn(0) * 1.15), around: 0, dir: .9, size: .34, len: .36, vary: .2 }); }
    if (kk(0) > .02) { p.line(egg, { color: ink, w, press: .95 * kk(0), taper: [.05, .25], wobble: .6 }); const hs = fx >= 0 ? 1 : -1; if (tn(0) > .02) p.mass([HH(-1.0 * hs, .25), HH(-.98 * hs, -.5), HH(-.4 * hs, -1.12), HH(.4 * hs, -1.06), HH(.92 * hs, -.42), HH(.5 * hs, -.3), HH(-.1 * hs, -.42), HH(-.55 * hs, .1)], { color: HAIRT, alpha: Math.min(1, tn(0) * 1.2), dir: 2.2, size: .34, len: .36, vary: .4 }); for (let j = 0; j < 6; j++) { const u = j / 5; p.line([HH((-.8 + 1.4 * u) * hs, -.75 - .25 * sin(u * 3)), HH((-1.0 + 1.7 * u) * hs, -.5 + .1 * u), HH((-1.08 + 1.9 * u) * hs, -.1 - .2 * u)], { color: j % 2 ? ink : '#e2b27a', w: w * .8, press: .75 * kk(0), taper: [.1, .5], wobble: .8 }); }
      if (h > 90 && cos(hd.turn) > -.2) { const ex = .34 * hs; p.line([HH(ex - .12, .06), HH(ex, .0), HH(ex + .12, .06)], { color: '#7a5236', w: w * .85, press: .9 * kk(0), taper: [.2, .2] }); p.line([HH(ex - .02 * hs, .5), HH(ex + .2 * hs, .46)], { color: '#9a5f48', w: w * .8, press: .7 * kk(0), taper: [.2, .3] }); } }
    arm(near, 4); return an;
  }
  // her, far up and small. open: arms, kneel: down on her knees, hold: him in her arms
  function lightMother(p, x, y, h, o = {}) {
    const k = o.k == null ? 1 : o.k, kn = o.kneel || 0, f = o.face || 1, open = o.open || 0, hold = o.hold || 0, S = h, w = Math.max(1.6, h * .0185), ink = o.ink || CREAM, tone = o.tone == null ? .86 : o.tone, dn = .3 * kn, le = (o.lean || 0) * f, X = (a, b) => [x + (a * f + le * b) * S, y - (b - dn * ss(0, .5, b)) * S], sw = (o.wind || 0) * f, st = i => ({ color: ink, w, press: .95 * clamp(k * 3 - i), taper: [.08, .22], wobble: .6 }), tn = i => tone * clamp(k * 3 - i - .5);
    const wa = X(-.06, .55), wb = X(.06, .55), hemL = X(-.17 - .06 * kn + sw * .1, 0), hemR = X(.16 + .12 * kn + sw * .16, 0), hm = X(.0 + sw * .12, -.012);
    const skirt = [wa, X(-.1, .36), X(-.145 - .05 * kn + sw * .05, .14), hemL, hm, hemR, X(.14 + .09 * kn + sw * .1, .15), X(.1, .36), wb];
    if (tn(1) > .02) p.mass(skirt, { color: '#c8b48e', alpha: tn(1), dir: 1.5, size: .34, len: .4, vary: .3 }); p.line([wa, X(-.1, .36), X(-.145 - .05 * kn + sw * .05, .14), hemL], st(1)); p.line([wb, X(.1, .36), X(.14 + .09 * kn + sw * .1, .15), hemR], st(1)); p.line([hemL, hm, hemR], st(1.2)); p.line([X(-.01, .5), X(.0 + sw * .05, .25), X(.02 + sw * .1, .04)], Object.assign(st(1.4), { w: w * .75 }));
    const ch = [X(-.065, .55), X(-.1, .72), X(-.07, .815), X(.0, .835), X(.07, .815), X(.1, .72), X(.065, .55)]; if (tn(0) > .02) p.mass(ch, { color: '#eac38a', alpha: tn(0), dir: 1, size: .34, len: .4, vary: .3 }); p.line([ch[0], ch[1], ch[2], ch[3]], st(0)); p.line([ch[6], ch[5], ch[4], ch[3]], st(0));
    // head, hair, the knot at the nape
    const hx = .012 + .03 * hold + (o.nod || 0) * .05, hy = .9 - .03 * (o.nod || 0), c = X(hx, hy), R = .068 * S, ring = []; for (let i = 0; i <= 10; i++) { const a = i / 10 * TAU - .6; ring.push([c[0] + cos(a) * R * .84, c[1] + sin(a) * R * 1.04]); } if (tn(0) > .02) p.mass(ring, { color: '#f7d7ae', alpha: Math.min(1, tn(0) * 1.2), dir: 1, size: .32, len: .34, vary: .2 }); p.line(ring, st(.1)); const hr = [[c[0] - f * R * .95, c[1] + R * .25], [c[0] - f * R * .9, c[1] - R * .6], [c[0] - f * R * .1, c[1] - R * 1.18], [c[0] + f * R * .7, c[1] - R * .6], [c[0] + f * R * .15, c[1] - R * .45], [c[0] - f * R * .4, c[1] + R * .05]]; if (tn(0) > .02) p.mass(hr, { color: '#5a3c26', alpha: Math.min(1, tn(0) * 1.3), dir: 2, size: .32, len: .34, vary: .3 }); p.line([hr[0], hr[1], hr[2], hr[3]], st(.2)); p.line([[c[0] - f * R * 1.0, c[1] + R * .1], [c[0] - f * R * 1.5, c[1] + R * .25], [c[0] - f * R * 1.1, c[1] + R * .6]], st(.3)); if (o.wisp !== 0) p.line([[c[0] - f * R * .2, c[1] - R * 1.1], [c[0] - f * R * .9 + sw * S * .1, c[1] - R * 1.3], [c[0] - f * R * 1.7 + sw * S * .2, c[1] - R * .9]], Object.assign(st(.5), { w: w * .7 }));
    // arms: from holding the thread at her breast, to wide open, to closed round him
    const A1 = open * (1 - hold), hand = i => { const s = i ? 1 : -1; const rest = [.03 * s + .05, .66], wide = [.3 * s + (kn ? .1 * kn : 0), .74 + .03 * (i ? 1 : 0) - .1 * kn], hug = i ? [.16, .7] : [.14, .56]; return [lerp(lerp(rest[0], wide[0], A1), hug[0], hold), lerp(lerp(rest[1], wide[1], A1), hug[1], hold)]; }, els = i => { const s = i ? 1 : -1, hh = hand(i); return [lerp(lerp(.12 * s, .19 * s, A1), hh[0] * .6 + .06, hold), lerp(.66, .68, A1) - .04 * hold]; };
    const armD = i => { const s = i ? 1 : -1, a = X(.075 * s, .79), e = X(...els(i)), b = X(...hand(i)); limb(p, a, e, b, .03 * S, .026 * S, .017 * S, { ink, w: w * .95, k: clamp(k * 3 - 1.4), tone: tn(1.2), fill: '#f0dcb4' }); }; armD(0); if (o.between) o.between(); armD(1);
    return { hand: X(...hand(1)), handB: X(...hand(0)), chest: X(0, .72), head: c };
  }

  // the two of them met. up 0 = she is on her knees, he stands in her arms; 1 = she has got up with him, his head on her shoulder
  function tinyPair(p, x, y, S, up, o = {}) {
    const ink = o.ink || CREAM, tone = o.tone == null ? .9 : o.tone, w = Math.max(1.6, S * .0175), kn = 1 - up, dn = .3 * kn, sw = o.wind || 0, lean = (o.lean || 0), X = (a, b) => { const c = cos(lean), q = sin(lean), bb = b - dn * ss(0, .5, b); return [x + (a * c + bb * q) * S, y - (bb * c - a * q) * S]; }, B0 = (a, b) => { const c = cos(lean), q = sin(lean); return [x + (a * c + b * q) * S, y - (b * c - a * q) * S]; }, L2 = (u, v) => [lerp(u[0], v[0], up), lerp(u[1], v[1], up)], st = { color: ink, w, press: .95, taper: [.08, .22], wobble: .6 }, M = (pts, c, dir = 1.3, al = 1) => tone > .02 && p.mass(pts, { color: c, alpha: Math.min(1, tone * al), dir, size: .33, len: .38, vary: .25 });
    const tube = (pts, r, fill) => { const L = [], R = []; pts.forEach((v, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], n = off2(a, b, r[i] * S); L.push([v[0] + n[0], v[1] + n[1]]); R.push([v[0] - n[0], v[1] - n[1]]); }); M(L.concat(R.slice().reverse()), fill, Math.atan2(pts[1][1] - pts[0][1], pts[1][0] - pts[0][0])); p.line(L, st); p.line(R, st); };
    // skirt
    const wa = X(-.075, .55), wb = X(.065, .55), hl = B0(-.19 - .07 * kn + sw * .1, 0), hr = B0(.15 + .14 * kn + sw * .2, 0), hm = B0(.0 + sw * .14, -.014);
    M([wa, X(-.115, .36), B0(-.155 - .06 * kn + sw * .05, .13), hl, hm, hr, B0(.13 + .1 * kn + sw * .12, .14), X(.1, .36), wb], '#a9a6a0', 1.5); p.line([wa, X(-.115, .36), B0(-.155 - .06 * kn + sw * .05, .13), hl], st); p.line([wb, X(.1, .36), B0(.13 + .1 * kn + sw * .12, .14), hr], st); p.line([hl, hm, hr], st); p.line([X(-.03, .5), B0(-.04 + sw * .06, .24 - .06 * kn), B0(-.05 + sw * .12, .04)], Object.assign({}, st, { w: w * .7 })); p.line([X(.03, .46), B0(.05 + sw * .08, .22 - .06 * kn), B0(.08 + sw * .16, .04)], Object.assign({}, st, { w: w * .7 }));
    // shawl
    const ch = [X(-.07, .55), X(-.125, .7), X(-.09, .81), X(-.03, .845), X(.05, .83), X(.1, .72), X(.065, .55)]; M(ch, '#e2b878', 1); p.line([ch[0], ch[1], ch[2], ch[3]], st); p.line([ch[6], ch[5], ch[4], ch[3]], Object.assign({}, st, { w: w * .8 }));
    // him
    const hip = B0(...L2([.17, .285], [.105, .52])), sh = B0(...L2([.135, .46], [.105, .735])), hd = B0(...L2([.085, .545], [.06, .835])), k1 = B0(...L2([.185, .15], [.185, .455])), f1 = B0(...L2([.2, .0], [.165, .3])), k2 = B0(...L2([.145, .15], [.14, .43])), f2 = B0(...L2([.13, .0], [.1, .27]));
    tube([hip, k2, f2], [.034, .026, .018], '#e5bd92'); const tb = [[...hip], [lerp(hip[0], sh[0], .5) + .012 * S, lerp(hip[1], sh[1], .5)], [...sh]]; tube(tb, [.05, .052, .04], '#f6d69c'); tube([hip, k1, f1], [.036, .028, .018], '#f0c79c'); p.line([[k1[0] - .03 * S, k1[1] - .004 * S], [k1[0] + .026 * S, k1[1] + .012 * S]], Object.assign({}, st, { w: w * .8 })); [f1, f2].forEach(v => p.line([[v[0] - .012 * S, v[1]], [v[0] + .02 * S, v[1] + .016 * S], [v[0] + .05 * S, v[1] + .012 * S]], Object.assign({}, st, { w: w * 1.5, color: ink })));
    // her arm under him / round his back
    const egg = (c, r, t) => { const o2 = []; for (let i = 0; i <= 10; i++) { const a = i / 10 * TAU - .8, ex = cos(a) * r * .86, ey = sin(a) * r * 1.06; o2.push([c[0] + ex * cos(t) - ey * sin(t), c[1] + ex * sin(t) + ey * cos(t)]); } return o2; }, HH = (c, r, t) => (u, v) => [c[0] + (u * cos(t) - v * sin(t)) * r, c[1] + (u * sin(t) + v * cos(t)) * r];
    // her head bent over his
    const mh = B0(...L2([.015, .612], [-.036, .905])), mr = .066 * S, mt = .34 + (o.nod || 0), mg = egg(mh, mr, mt), mH = HH(mh, mr, mt); M(mg, '#f9dab2', 1); p.line(mg, st); M([mH(.5, -.62), mH(.1, -1.1), mH(-.6, -.98), mH(-1.02, -.3), mH(-.9, .5), mH(-.45, .66), mH(-.4, .0), mH(.1, -.42)], '#5a3c26', 2, 1.1); p.line([mH(.62, -.5), mH(.1, -1.12), mH(-.64, -1), mH(-1.06, -.3), mH(-.92, .5)], st); { const b = mH(-1.15, .5); M(egg(b, .026 * S, 0), '#5a3c26', 2, 1.1); p.line(egg(b, .026 * S, 0), Object.assign({}, st, { w: w * .8 })); } p.line([mH(-.5, -1.06), mH(-.95 - sw * .3, -1.0), mH(-1.35 - sw * .5, -.6)], Object.assign({}, st, { w: w * .6 })); p.line([mH(.18, .14), mH(.36, .24), mH(.54, .14)], { color: '#6b4630', w: w * .85, press: .9, taper: [.2, .2] });
    // his head on her shoulder
    const bt = -.42, br = .062 * S, bg = egg(hd, br, bt), bH = HH(hd, br, bt); M(bg, '#fbdcb4', 1); M([bH(-.7, -.2), bH(-.7, -.8), bH(-.1, -1.12), bH(.6, -.94), bH(1.02, -.2), bH(.92, .55), bH(.5, .3), bH(.36, -.3), bH(-.2, -.46)], '#b98450', 2.2, 1.1); p.line(bg, st); for (let j = 0; j < 4; j++) p.line([bH(-.5 + .4 * j, -.95), bH(-.1 + .38 * j, -.6), bH(.2 + .34 * j, -.1)], { color: j % 2 ? '#8a5a32' : ink, w: w * .65, press: .7, taper: [.1, .5] }); p.line([bH(-.42, .12), bH(-.26, .22), bH(-.1, .14)], { color: '#6b4630', w: w * .85, press: .9, taper: [.2, .2] });
    // arms: his round her neck, hers round his back and under him
    tube([sh, B0(...L2([.06, .5], [.02, .79])), B0(...L2([-.06, .53], [-.085, .815]))], [.026, .024, .016], '#f6d69c');
    const squeeze = o.squeeze || 0; tube([X(.07, .79), B0(...L2([.215, .5], [.2, .7])), B0(...L2([.19 - .01 * squeeze, .4], [.135 - .01 * squeeze, .64]))], [.03, .026, .017], '#f2dcb0'); tube([X(-.095, .78), X(-.12, .63), B0(...L2([.06, .33], [.07, .5])), B0(...L2([.18, .31], [.15, .49]))], [.03, .028, .024, .016], '#f2dcb0');
    return { chest: X(0, .7), hem: [hl, hr] };
  }
  // ---------------------------------------------------------------- his run, worked out once
  const H0 = 196, SE = .46, SC = d => lerp(1, SE, Math.pow(clamp(d / PL()), .85)), T_GO = 7.78, T_MEET = 11.42;
  let RUN = null;
  function runTable() { if (RUN) return RUN; paths(); const out = [], dt = 1 / 48, end = PL() - 34; let d = 0, ph = 0, t = T_GO; const spd = (t, d) => { const h = H0 * SC(d), base = C.stride('boy', 'run', h); const c = keys(t, [[T_GO, 0], [8.0, .9, 'out'], [8.22, 1.1], [8.34, .25, 'out'], [8.5, .9], [8.75, 1.9], [9.3, 2.5], [10.9, 2.75], [T_MEET, 2.3]]); return [c * base * keys(t, [[T_GO, .36], [8.5, .5], [9.1, 1]]), c]; };
    let tot = 0; { let dd = 0; for (let q = T_GO; q < T_MEET; q += dt) dd += spd(q, dd)[0] * dt; tot = dd; } const kf = end / tot; for (; t < T_MEET; t += dt) { out.push([t, d, ph]); const [v, c] = spd(t, d); d = Math.min(end, d + v * kf * dt); ph += c * dt; } out.push([t, end, ph]); RUN = out; return out; }
  function runAt(t) { const R = runTable(); if (t <= T_GO) return [0, 0]; const i = Math.min(R.length - 1, Math.floor((t - T_GO) * 48)), a = R[i], b = R[Math.min(R.length - 1, i + 1)], f = clamp((t - a[0]) * 48); return [lerp(a[1], b[1], f), lerp(a[2], b[2], f)]; }

  const HER = [546, 234], HM = H0 * SE / .64 * 1.02;
  // everything that is light, at scene time t. fade: 1 cream on night .. 0 pencil on paper (s18)
  function lights(p, t, o = {}) {
    const ink = o.ink, tone = o.tone, n = Math.round(t * 12);
    // her
    const hk = ss(6.0, 6.9, t), opn = keys(t, [[6.7, 0], [7.5, .55], [9.2, .7], [10.2, 1]]), kneel = keys(t, [[10.55, 0], [11.15, 1], [11.6, 1], [12.35, 0]]), hold = keys(t, [[11.3, 0], [11.55, 1, 'out']]), wd = .5 + .5 * noise1(t * .8, 6);
    const b = runAt(t), q = onSky(b[0]), sc = SC(b[0]), h = H0 * sc, f = cos(q[2]) >= 0 ? 1 : -1;
    const met = t >= T_MEET - .04;
    if (hk > 0) {
      if (!met) lightMother(p, HER[0], HER[1], HM, { k: hk, face: 1, open: opn, kneel, hold: 0, wind: .5 * wd, lean: .05 * kneel, nod: keys(t, [[6.8, 0], [7.2, .4], [10.6, .5]]), ink, tone });
      else tinyPair(p, HER[0], HER[1], HM, keys(t, [[11.82, 0], [11.95, -.03, 'out'], [12.5, 1, 'io']]), { ink, tone, wind: .5 * wd, lean: .05 * Math.exp(-3 * (t - T_MEET)) * cos((t - T_MEET) * 9) + .025 * noise1(t * .45, 12), nod: keys(t, [[11.5, -.12], [11.8, .06, 'out'], [12.9, 0], [13.6, .08]]), squeeze: keys(t, [[11.5, 0], [11.9, 1], [12.6, 0], [13.3, 1], [14, .4]]) });
    }
    if (met || t < 5.7) return { d: b[0], sc };
    // him: seated where the old man sits, then up and away
    const dr = ss(5.72, 6.22, t), base = { t, h };
    if (t < T_GO) {
      const seat = [MAN[0] + 4, MAN[1] - 2], up = keys(t, [[6.56, 0], [6.66, -.04, 'out'], [7.08, 1, 'io']]), hd = keys(t, [[6.2, 0], [6.4, 1, 'out']]), lb = keys(t, [[7.2, 0], [7.36, 1, 'out'], [7.6, 1], [7.74, 0]]), foot = onSky(0), mv = ss(6.64, 7.12, t), x = lerp(seat[0], foot[0] - 6, mv), y = lerp(seat[1], foot[1] + 4, mv);
      const legs = up < .06 ? { kind: 'sitGround', up: .62 } : { kind: 'feet', feet: [[-.06, 0, 0], [.07, 0, 0]], hip: [0, 0] };
      const pose = up < .06 ? { view: 'side', lean: -.36 + .22 * hd - .6 * Math.min(0, up), bend: -.02, legs, armNear: 'lap', armFar: hd > .5 ? 'kneeHand' : 'lap', head: { nod: lerp(.26, -.42, hd), tilt: lerp(-.16, 0, hd), turn: lerp(-.5, -.1, hd) } } : { view: 'side', crouch: keys(up, [[0, .95], [.5, .7], [.85, .06], [1, 0]]), lean: keys(up, [[0, -.1], [.35, .62], [.8, .3], [1, .03, 'settle']]), bend: keys(up, [[0, .2], [.4, .5], [1, .02]]), legs, armNear: up < .6 ? 'ground' : ['ground', 'rest', ss(.6, 1, up)], armFar: up < .5 ? 'kneeHand' : ['kneeHand', 'rest', ss(.5, 1, up)], twist: -.35 * lb, head: { nod: lerp(-.1, -.36, ss(.4, 1, up)) + .5 * lb, turn: -1.9 * lb, tilt: 0 } };
      lightBoy(p, Object.assign({ x, y, face: -1 }, base, pose), { k: dr, ink, tone: (tone == null ? .86 : tone) * ss(6.05, 6.7, t) });
    } else {
      const st = keys(t, [[T_GO, 1], [8.9, 0]]), walk = t < 8.7, wob = st * sin(t * 11) * .12, sl = clamp(Math.atan2(sin(q[2]), Math.abs(cos(q[2]))), -.7, .7), X0 = { x: q[0], y: q[1] + 3 * sc + 9 * sc * st * .6, face: f };
      const leap = ss(11.12, 11.3, t);
      if (t >= 8.14 && t < 8.62) { // the thread gives: a foot goes through, he is down on his hands, up again
        const a0 = ss(8.14, 8.27, t), a1 = ss(8.2, 8.36, t), a2 = ss(8.44, 8.62, t), dn = a1 * (1 - a2);
        lightBoy(p, Object.assign({}, base, X0, { view: 'side', rot: sl * .35, crouch: .1 + .62 * dn, lean: .1 + .95 * dn - .18 * a0 * (1 - a1), bend: .06 + .32 * dn, legs: { kind: 'feet', feet: [[-.04 - .16 * dn, lerp(0, .13, a0 * (1 - a2)), .5 * dn], [.06 - .1 * dn, 0, 0]] }, armNear: [lerp(.2, .36, dn), lerp(.9, .06, dn), 'open'], armFar: [lerp(-.2, .3, dn), lerp(.86, .03, dn), 'open'], head: { nod: lerp(.1, -.3, dn) } }), { ink, tone });
      } else if (leap > 0 && t < T_MEET) { const u = (t - 11.12) / (T_MEET - 11.12); lightBoy(p, Object.assign({}, base, X0, { y: X0.y - 34 * sin(PI * clamp(u * .8 + .1)) * sc / SE * .8, view: 'side', rot: -.12, lean: .3, legs: { kind: 'feet', feet: [[-.24, -.16, 1.0], [-.04, -.1, .7]] }, armNear: [.34, .84, 'open'], armFar: [.32, .92, 'open'], head: { nod: -.3 } }), { ink, tone }); }
      else lightBoy(p, Object.assign({}, base, X0, { view: 'side', rot: sl * .35, legs: walk ? { kind: 'walk', phase: b[1], amp: 1.1 } : { kind: 'run', phase: b[1] }, lean: (walk ? .04 : .06) + wob * .4, bend: .04, side: wob * .5, armNear: walk ? [.16, .7 + .1 * wob, 'open'] : t > 10.7 ? ['rest', { p: [.3, .84], h: 'reach' }, ss(10.7, 11.1, t)] : 'rest', armFar: walk ? [-.24, .74 - .4 * wob, 'open'] : t > 10.7 ? ['rest', { p: [.3, .88], h: 'reach' }, ss(10.7, 11.1, t)] : 'rest', head: { nod: -.22, turn: 0 } }), { ink, tone });
    }
    return { d: b[0], sc, press: ss(T_GO, T_GO + .3, t), on: t > T_GO };
  }

  const KIT = B.test.s17kit = { init, back: p => back(p, NL), land: (p, t) => land(p, NL, t), man, stars, strand, lights, STONE, MAN, HER, HM, get W() { return W; }, get C() { return C; }, get NL() { return NL; }, HERO, S0, TAILUP, CREAM, scarfOver, lightBoy, lightMother, tinyPair };
  // thread weight thins as it climbs
  KIT.thread = (p, s, o = {}) => W.thread(p, s, Object.assign({ raw: true, w: 5.4, wf: u => lerp(1.1, .6, ss(0, .95, u)), color: o.night === false ? undefined : '#c43a32', fuzz: .7, ply: 0 }, o));

  B.scene({
    id: 's17', ink: s => s.t < .6 ? 'dark' : 'dark',
    draw(p, s) {
      init(); const t = s.t, n = s.n; p.paper('#eadfc6');
      const up = t > 5.35, h = up ? null : hemLine(t), hc = up ? null : hemLine(t, 5), inB = up ? f => f() : f => p.clip(hemShape(hc), f), tq = Math.floor(t * 3) / 3;
      if (!up) { p.layer('s17-dback', { every: 6, still: true, depth: .05 }); back(p, DL); p.layer('s17-dland', { every: 5, depth: .8 }); land(p, DL, 0); p.layer('s17-dman', { every: 3, depth: .95 }); man(p, Math.floor(t * 4) / 4, false, 0); }
      // while the hem moves everything under it is laid down together; afterwards the parts that rest are left alone
      p.layer('s17-nback', { every: 5, still: up, depth: .05 }); inB(() => { back(p, NL); if (!up) stars(p, t, n, false); });
      if (up) { p.layer('s17-stars', { every: 1, depth: .9 }); stars(p, t, n, t > 6.3); }
      p.layer('s17-nland', { every: 4, depth: .8 }); inB(() => { land(p, NL, up ? tq : 0); if (!up) man(p, Math.floor(t * 6) / 6, true, 0); });
      if (up) { p.layer('s17-nman', { every: 2, depth: .95 }); man(p, Math.floor(t * 6) / 6, true, ss(5.6, 7.4, t)); }
      if (!up) { p.layer('s17-fold', { every: 2, depth: .5 }); p.clip(hemShape(h), () => hemFolds(p, h)); p.layer('s17-hem', { every: 2, depth: .9 }); hemDraw(p, h, t); }
      const b = runAt(t), foot = b[0], on = t > T_GO - .05 && t < T_MEET; const sd = strand(t, on ? { foot, sc: SC(foot), press: ss(T_GO, T_GO + .25, t) } : {});
      p.layer('s17-thread', { every: 1, depth: 1 }); KIT.thread(p, sd, { ground: 0 });
      if (t > 5.6) { p.layer('s17-light', { every: 1, depth: 1 }); if (t > 6) p.lift([[HER[0] - 74, HER[1] - 20], [HER[0] - 40, HER[1] - 118], [HER[0] + 20, HER[1] - 128], [HER[0] + 76, HER[1] - 60], [HER[0] + 60, HER[1] + 12], [HER[0] - 30, HER[1] + 18]], { amount: .16 * ss(6, 7, t), soft: 22 }); lights(p, t); }
    }
  });
  B.test.s17pair = (p, k) => { init(); p.paper('#25344f'); p.layer('a', { depth: 1 }); [0, .5, 1].forEach((u, i) => { tinyPair(p, 300 + i * 500, 900, 700, u, { wind: .5 }); tinyPair(p, 300 + i * 500 + 220, 300, 143, u, { wind: .5 }); }); };
  B.test.s17boy = (p, k) => { init(); p.paper('#25344f'); p.layer('a', { depth: 1 }); for (let i = 0; i < 8; i++) lightBoy(p, { x: 140 + i * 230, y: 400, h: 172, face: -1, view: 'side', legs: { kind: 'run', phase: i / 8 }, lean: .06, t: i }); for (let i = 0; i < 6; i++) lightBoy(p, { x: 140 + i * 130, y: 640, h: 60 + i * 12, face: 1, view: 'side', legs: { kind: 'run', phase: i / 6 }, t: i }); [0, .5, 1].forEach((o, i) => lightMother(p, 1000 + i * 160, 640, 92, { open: o })); lightMother(p, 1500, 640, 92, { open: 1, kneel: 1 }); lightMother(p, 1660, 640, 92, { hold: 1 }); lightMother(p, 400, 1000, 300, { open: 1, wind: .4 }); lightMother(p, 800, 1000, 300, { open: 1, kneel: 1, wind: .4 }); };
})();
