// world.js - land, weather, houses, growing things and wool, drawn on the painter API. See docs/knowledge/film/world.md.
window.BIDE = window.BIDE || {};
(function () {
  'use strict';
  const B = window.BIDE, A = B.anim, W = B.world = {};
  B.test = B.test || {};
  const { clamp, lerp, ease, hash, noise1, spline, mixc, TAU } = A;
  const PI = Math.PI, sin = Math.sin, cos = Math.cos, abs = Math.abs, hyp = Math.hypot, min = Math.min, max = Math.max;

  // ------------------------------------------------------------------ small tools
  const ss = (a, b, x) => { x = clamp((x - a) / (b - a)); return x * x * (3 - 2 * x); };
  function rngOf(seed) { let a = (Math.imul(((seed + 1) * 7919) | 0, 1597334677) ^ 0x9e3779b9) >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function fbm(x, s, o = 3) { let a = .56, v = 0, f = 1; for (let i = 0; i < o; i++) { v += a * noise1(x * f, s + i * 31); a *= .5; f *= 2.07; } return v; }
  // arc-length view of a polyline
  function track(pts) {
    const n = pts.length, L = new Array(n); L[0] = 0; for (let i = 1; i < n; i++) L[i] = L[i - 1] + hyp(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    const len = L[n - 1] || 1e-6;
    const T = {
      pts, len, L,
      s(d) { d = clamp(d, 0, len); let a = 0, b = n - 1; while (b - a > 1) { const m = (a + b) >> 1; if (L[m] <= d) a = m; else b = m; } const f = (d - L[a]) / ((L[b] - L[a]) || 1e-6), P = pts[a], Q = pts[b]; return [lerp(P[0], Q[0], f), lerp(P[1], Q[1], f), Math.atan2(Q[1] - P[1], Q[0] - P[0])]; },
      at(u) { return T.s(u * len); },
      slice(u0, u1, step) { const d0 = clamp(u0) * len, d1 = clamp(u1) * len, m = max(2, Math.ceil((d1 - d0) / step)), o = []; for (let i = 0; i <= m; i++) { const q = T.s(lerp(d0, d1, i / m)); o.push([q[0], q[1]]); } return o; }
    };
    return T;
  }
  const resample = (pts, step) => track(pts).slice(0, 1, step);
  // hand-made contour: smooth keys, resample, then push along the normal by slow noise
  function rough(keys, o = {}) { const { amp = 4, freq = 1 / 70, seed = 1, step = 18, closed = false, per = 8 } = o; const s = spline(keys, per, closed); if (closed) s.push(s[0].slice()); const T = track(s), m = max(3, Math.round(T.len / step)), out = []; for (let i = 0; i < m + (closed ? 0 : 1); i++) { const q = T.at(i / m), k = amp * fbm(q[0] * freq + q[1] * freq * .7 + seed * 3.1, seed); out.push([q[0] - sin(q[2]) * k, q[1] + cos(q[2]) * k]); } return out; }
  // skyline: keys left to right, long swell from the keys plus worn small irregularity
  function ridge(keys, o = {}) { const { amp = 6, freq = 1 / 120, seed = 1, step = 20 } = o; const s = resample(spline(keys, 10, false), step); return s.map(q => [q[0], q[1] + amp * fbm(q[0] * freq, seed, 3)]); }
  function yAt(rg, x) { if (x <= rg[0][0]) return rg[0][1]; for (let i = 1; i < rg.length; i++) if (rg[i][0] >= x) { const a = rg[i - 1], b = rg[i]; return lerp(a[1], b[1], (x - a[0]) / ((b[0] - a[0]) || 1e-6)); } return rg[rg.length - 1][1]; }
  function cut(rg, x0, x1) { const o = [[x0, yAt(rg, x0)]]; for (const q of rg) if (q[0] > x0 && q[0] < x1) o.push(q); o.push([x1, yAt(rg, x1)]); return o; }
  // closed shape under a skyline; foot may be a y or a polyline (left to right)
  function below(rg, foot, seed = 3) { const o = rg.slice(); if (typeof foot === 'number') { const x0 = rg[0][0], x1 = rg[rg.length - 1][0], n = max(3, Math.round((x1 - x0) / 90)); for (let i = 0; i <= n; i++) { const x = lerp(x1, x0, i / n); o.push([x, foot + 6 * noise1(x / 130, seed)]); } } else for (let i = foot.length - 1; i >= 0; i--) o.push(foot[i]); return o; }
  const poly = (...ps) => ctx => { ctx.beginPath(); for (const q of ps) { if (!q.length) continue; ctx.moveTo(q[0][0], q[0][1]); for (let i = 1; i < q.length; i++) ctx.lineTo(q[i][0], q[i][1]); ctx.closePath(); } };
  // irregular closed lump
  function lump(x, y, rx, ry, seed, o = {}) { const n = o.n || 11, r = o.rough ?? .18, a0 = o.rot || 0, out = []; for (let i = 0; i < n; i++) { const a = i / n * TAU + (hash(seed, i, 2) - .5) * .35, k = 1 + (hash(seed, i, 1) - .5) * 2 * r, X = cos(a) * rx * k, Y = sin(a) * ry * k; out.push([x + X * cos(a0) - Y * sin(a0), y + X * sin(a0) + Y * cos(a0)]); } return out; }
  // ribbon polygon round a centre line; w(u) is the half width
  function ribbon(pts, w, o = {}) { const T = track(pts), step = o.step || 26, m = max(3, Math.round(T.len / step)), L = [], R = []; for (let i = 0; i <= m; i++) { const u = i / m, q = T.at(u), k = w(u), nx = -sin(q[2]), ny = cos(q[2]), j = o.rough ? o.rough * noise1(i * .7, (o.seed || 1)) : 0, j2 = o.rough ? o.rough * noise1(i * .7, (o.seed || 1) + 9) : 0; L.push([q[0] + nx * (k + j), q[1] + ny * (k + j)]); R.push([q[0] - nx * (k + j2), q[1] - ny * (k + j2)]); } return { L, R, poly: L.concat(R.slice().reverse()) }; }
  // pen weight: the tooth eats thin soft lines, so everything the world draws goes through these
  const ln = (p, pts, st) => p.line(pts, Object.assign({}, st, { w: (st.w || 3) * 1.4 + .9, press: min(1, (st.press ?? .8) * 1.22 + .1) }));
  const hx = (p, sh, st) => p.hatch(sh, Object.assign({}, st, { w: (st.w || 2) * 1.35 + .8, press: min(1, (st.press ?? .5) * 1.25 + .08) }));
  // straight-sided things: every side its own stroke, overshooting the corner a little
  function bx(p, pts, st, closed) { const n = pts.length, m = closed ? n : n - 1; for (let i = 0; i < m; i++) { const a = pts[i], b = pts[(i + 1) % n], dx = b[0] - a[0], dy = b[1] - a[1], l = hyp(dx, dy) || 1, ov = min(7, l * .06), s = i * 3 + Math.round(a[0] + a[1]), k = (hash(s, 1, 3) - .5) * min(5, l * .02); ln(p, [[a[0] - dx / l * ov * hash(s, 2, 3), a[1] - dy / l * ov * hash(s, 2, 3)], [(a[0] + b[0]) / 2 - dy / l * k, (a[1] + b[1]) / 2 + dx / l * k], [b[0] + dx / l * ov * hash(s, 3, 3), b[1] + dy / l * ov * hash(s, 3, 3)]], Object.assign({ taper: [.06, .14] }, st)); } }
  // lost-and-found line: one contour drawn as several strokes of different weight with gaps
  function found(p, pts, o = {}) { const T = track(pts), R = rngOf(o.seed || 1), avg = o.seg || 170, gap = o.gap ?? .25; let d = (o.from || 0) * T.len + R() * avg * .3; const end = (o.to ?? 1) * T.len; let g = 0; while (d < end - 12 && g++ < 60) { const l = avg * (.45 + 1.1 * R()), e = min(end, d + l); if (R() > (o.skip || 0)) { const s = T.slice(d / T.len, e / T.len, o.step || 34), pr = (o.press || .8) * (.55 + .5 * R()); ln(p, s, { color: o.color || INK, w: (o.w || 3) * (.75 + .5 * R()), press: pr, taper: o.taper || [.18, .35], wobble: o.wobble ?? 1, passes: o.passes || 1, medium: o.medium, alpha: o.alpha ?? 1 }); } d = e - l * .1 + l * gap * (R() * 1.8); } }
  const pmap = (pts, f) => pts.map(q => { const r = f(q[0], q[1]); return q.length > 2 ? [r[0], r[1], q[2]] : r; });
  W.util = { ln, hx, bx, rngOf, fbm, track, resample, rough, ridge, yAt, cut, below, poly, lump, ribbon, found, ss };

  // ------------------------------------------------------------------ colour
  const PAPER = '#e9dec7', INK = '#3d3733', BLUEPENCIL = '#6d8594', RUST = '#a5714c';
  const RED = '#b5322b', RED_DEEP = '#7a1c20', RED_LIGHT = '#d4685a', ROSE = '#c24a40', ROSE_PALE = '#dc9080';
  Object.assign(W, { PAPER, INK, RED, RED_DEEP, RED_LIGHT, ROSE, ROSE_PALE, BLUEPENCIL, RUST });
  // season 0 spring, .33 summer, .66 autumn, 1 winter. each: grass light, grass mid, grass dark, earth, rushes
  const SE = [
    { k: 0, lit: '#c3be90', mid: '#9a9f78', dark: '#586352', earth: '#9c886a', dry: '#c9bb8c' },
    { k: .33, lit: '#c8bd7c', mid: '#929a63', dark: '#4f5d42', earth: '#94805c', dry: '#d3bc78' },
    { k: .66, lit: '#d3b478', mid: '#ad8f5a', dark: '#675640', earth: '#86694a', dry: '#c79a58' },
    { k: 1, lit: '#d9d3c4', mid: '#a8a397', dark: '#60625f', earth: '#7d7264', dry: '#bcae90' }];
  function seasonPal(s, colour = .55) { s = clamp(s); let i = 0; while (i < SE.length - 2 && s > SE[i + 1].k) i++; const a = SE[i], b = SE[i + 1], k = clamp((s - a.k) / (b.k - a.k)), o = {}; for (const q in a) if (q !== 'k') { let c = mixc(a[q], b[q], k); const g = greyOf(c); o[q] = mixc(g, c, .42 + .58 * clamp(colour, 0, 1)); if (colour > 1) o[q] = sat(o[q], colour - 1); } return o; }
  function greyOf(c) { const h = A.hex(c), l = h[0] * .3 + h[1] * .55 + h[2] * .15; return A.toHex([l * .985 + 3, l * .985 + 1, l * .955 + 2]); }
  function sat(c, k) { const h = A.hex(c), l = h[0] * .3 + h[1] * .55 + h[2] * .15; return A.toHex(h.map(v => l + (v - l) * (1 + k))); }
  const MOODS = {
    dawn: { top: '#aebbc0', mid: '#d3d0c3', low: '#ecd6b2', cl: '#efe3cd', cs: '#a5adb0', haze: '#d6d3c6', hz: .78, sun: '#f0d9ac', shade: '#68787f', tint: '#a9b2ae', tk: .16, ink: '#46443f', side: 1 },
    day: { top: '#a5b6bc', mid: '#c8cfca', low: '#e6dcc6', cl: '#f3ecdc', cs: '#a3aba9', haze: '#cdd1c8', hz: .74, sun: '#f1e2b8', shade: '#5c6d72', tint: '#b9bcae', tk: .04, ink: '#3d3733', side: -1 },
    summer: { top: '#8fb2bd', mid: '#c3cfc0', low: '#f1dfb0', cl: '#fbf1d8', cs: '#b9b59c', haze: '#dcd6b2', hz: .66, sun: '#f7dd93', shade: '#5f7a6c', tint: '#e8cf8a', tk: .1, ink: '#4a4030', side: -1 },
    gold: { top: '#c9c29d', mid: '#ead69a', low: '#f6dd9b', cl: '#fbeec6', cs: '#cdb179', haze: '#ecd7a0', hz: .7, sun: '#fbe09a', shade: '#8a7f55', tint: '#efcf7c', tk: .24, ink: '#5a4527', side: -1 },
    rain: { top: '#8d9697', mid: '#a9aea9', low: '#c9c6b8', cl: '#cfccc0', cs: '#7c8688', haze: '#b0b4ae', hz: .7, sun: '#d2cdb9', shade: '#485357', tint: '#868d89', tk: .28, ink: '#3b3a3a', side: -1 },
    dusk: { top: '#71808b', mid: '#a5a59c', low: '#dfc39a', cl: '#d9c7a8', cs: '#68737c', haze: '#a9aba3', hz: .72, sun: '#e2c08a', shade: '#48555e', tint: '#6f7b7b', tk: .3, ink: '#35322f', side: 1 },
    lowsun: { top: '#b8b59f', mid: '#dcc79a', low: '#f0cf93', cl: '#f3dfb4', cs: '#a59674', haze: '#d7c193', hz: .7, sun: '#f3cd85', shade: '#6d6a56', tint: '#c9a568', tk: .22, ink: '#463a2b', side: 1 },
    snow: { top: '#c4cacc', mid: '#d6d7d3', low: '#e6e2d7', cl: '#ece8df', cs: '#b7bec1', haze: '#dcdcd6', hz: .9, sun: '#f2ecde', shade: '#8497a3', tint: '#d4d6d3', tk: .4, ink: '#5a6066', side: -1 },
    night: { top: '#1c2842', mid: '#38506c', low: '#8ba0a3', cl: '#5a6c7d', cs: '#263349', haze: '#3f5469', hz: .55, sun: '#8fa0a4', shade: '#121b2d', tint: '#1a2640', tk: .84, ink: '#10151f', side: -1 },
    storm: { top: '#4f5b63', mid: '#7f8680', low: '#d6bd83', cl: '#a6a391', cs: '#434e57', haze: '#8f938b', hz: .7, sun: '#ecc976', shade: '#37444b', tint: '#6b716a', tk: .22, ink: '#2c2a29', side: -1 }
  };
  for (const q in MOODS) MOODS[q].mood = q; W.moods = MOODS; MOODS['storm-light'] = MOODS.storm;
  // light: mood name | {mood, ...overrides} | {mix:[a,b,k]}
  function lightOf(o) {
    if (!o) return MOODS.day; if (typeof o === 'string') return MOODS[o] || MOODS.day;
    if (o.mix) { const a = lightOf(o.mix[0]), b = lightOf(o.mix[1]), k = clamp(o.mix[2]), r = {}; for (const q in a) r[q] = q === 'mood' ? (k < .5 ? a.mood : b.mood) : typeof a[q] === 'string' ? mixc(a[q], b[q], k) : lerp(a[q], b[q], k); return r; }
    if (o.top && o.cl) return o; return Object.assign({}, MOODS[o.mood || 'day'], o);
  }
  W.light = lightOf;
  W.mixLight = (a, b, k) => lightOf({ mix: [a, b, k] });
  // land colour seen at distance d (0 near .. 1 far) in light L
  const rgba = (c, a) => { const h = A.hex(c); return `rgba(${h[0] | 0},${h[1] | 0},${h[2] | 0},${a.toFixed(3)})`; };
  const seen = (c, L, d) => mixc(mixc(c, L.tint, L.tk), L.haze, clamp(d) * L.hz);
  W.seen = seen;
  function landPal(o, d) { const L = lightOf(o.light), s = seasonPal(o.season ?? .33, o.colour ?? .55), r = { L }; for (const q in s) r[q] = seen(s[q], L, d); r.shade = mixc(seen(s.dark, L, d * .85), mixc(L.shade, L.haze, d * .62), .55); r.deep = mixc(r.shade, L.ink, .45 * (1 - d)); r.sun = mixc(seen(s.lit, L, d), L.sun, .55); r.ink = mixc(L.ink, L.haze, d * .8); return r; }

  // ------------------------------------------------------------------ wind: gusts arrive, pass, settle
  // gusts(opts) -> fn(t,x,y) bend (about 0..1.3, a little negative on the rebound); fn.fronts(t) -> moving fronts
  W.gusts = function (o = {}) {
    const { seed = 1, every = 2.7, speed = 950, power = 1, base = .16, hold = .5, dir = 1, x0 = -200 } = o;
    const ev = i => ({ t: (i + .15 + .7 * hash(seed, i, 1)) * every, s: power * (.35 + .75 * hash(seed, i, 2)), v: speed * (.75 + .5 * hash(seed, i, 3)), h: hold * (.5 + 1.1 * hash(seed, i, 4)), y: hash(seed, i, 5) });
    const env = (q, h) => q <= 0 ? 0 : q < .42 ? ease.out(q / .42) * (1 + .1 * sin(q / .42 * PI)) : q < .42 + h ? 1 - .16 * ((q - .42) / h) : (z => .84 * Math.exp(-2.3 * z) * cos(4.1 * z))(q - .42 - h);
    const f = (t, x = 960, y = 0) => { const i1 = Math.floor(t / every) + 1; let b = base * (.7 + .5 * noise1(t * .9 + x * .0011, seed + 5)); for (let i = i1; i > i1 - 5; i--) { const e = ev(i), q = t - e.t - ((dir > 0 ? x - x0 : 1920 - x0 - x) / e.v) - (y - 700) * .00022 * (e.y - .5); if (q > 0) b += e.s * env(q, e.h); } return min(1.6, b); };
    f.dir = dir; f.fronts = t => { const i1 = Math.floor(t / every) + 1, o2 = []; for (let i = i1; i > i1 - 5; i--) { const e = ev(i), q = t - e.t; if (q > -.2) { const x = dir > 0 ? x0 + q * e.v : 1920 - x0 - q * e.v; if (x > -500 && x < 2420) o2.push({ x, s: e.s, y: e.y, i, w: e.v * (.42 + e.h) }); } } return o2; };
    return f;
  };
  const CALM = W.gusts({ seed: 4, power: .5 });
  // any `wind` option becomes fn(t,x,y) -> signed bend
  function windOf(w) { if (w == null) return CALM; if (typeof w === 'function') { if (w._s) return w; const f = (t, x, y) => w(t, x, y) * (w.dir || 1); f._s = 1; return f; } const key = 'n' + w; return WC[key] || (WC[key] = (() => { const g = W.gusts({ seed: 4, power: abs(w), dir: w < 0 ? -1 : 1 }), f = (t, x, y) => g(t, x, y) * g.dir; f._s = 1; return f; })()); }
  const WC = {};
  W.windOf = windOf;

  // ------------------------------------------------------------------ sky
  // a cloud: heads heaped on a torn base and leaning with the wind. returns the parts a pastel hand would lay
  function cloudParts(cx, cy, w, h, seed, age, side) {
    const flat = h / w < .2, n = flat ? 7 : 6 + Math.round(3 * hash(seed, 9, 9)), heads = [], lean = .16 + .2 * hash(seed, 8, 1), R = k => hash(seed, k, 3), P = { body: [], cap: [], hol: [], base: [], bits: [], heads };
    const pk = .3 + .4 * hash(seed, 2, 2);
    for (let i = 0; i < n; i++) { const u = (i + .5 + (hash(seed, i, 2) - .5) * .7) / n, e = u < pk ? u / pk : (1 - u) / (1 - pk), env = Math.pow(clamp(e), .75) * (.7 + .45 * hash(seed, i, 5)), r = flat ? h * (.34 + .2 * hash(seed, i, 6)) : h * (.2 + .17 * hash(seed, i, 6)) * (.65 + .5 * env), rx = r * (flat ? 2.6 + 1.6 * hash(seed, i, 7) : 1.05 + .55 * hash(seed, i, 7)); heads.push([cx + (u - .5) * w * .84 + lean * h * env + 6 * noise1(age + i, seed), cy - h * env * (flat ? .3 : .62) - r * .1, rx, r * (1 + .04 * noise1(age * 1.3 + i * 2, seed + 1)), i]); }
    const L = (x, y, rx, ry, k, o) => spline(lump(x, y, rx, ry, seed * 19 + k, o), 4, true);
    heads.forEach(([x, y, rx, ry, i]) => {
      P.body.push(L(x, y, rx, ry, i, { n: 11, rough: .12 })); if (!flat) { for (let j = 0; j < 2; j++) { const a = -PI / 2 + (hash(seed, i, 11 + j) - .5) * 2.2; P.body.push(L(x + cos(a) * rx * .72, y + sin(a) * ry * .74, rx * (.36 + .2 * hash(seed, i, 13 + j)), ry * (.34 + .2 * hash(seed, i, 15 + j)), i * 3 + j + 30, { n: 9, rough: .17 })); } }
      P.cap.push(L(x + side * rx * .22, y - ry * .3, rx * .62, ry * .44, i + 60, { n: 9, rough: .25, rot: side * .3 })); if (!flat || i % 2) P.hol.push(L(x - side * rx * .34, y + ry * .46, rx * .72, ry * .5, i + 90, { n: 9, rough: .25 }));
    });
    const bot = []; for (let i = 0; i <= 8; i++) { const u = i / 8; bot.push([cx + (u - .5) * w * .9 + lean * h * .3 * sin(PI * u), cy - h * (.3 * sin(PI * u) + .04)]); } for (let i = 8; i >= 0; i--) { const u = i / 8; bot.push([cx + (u - .5) * w * .86, cy + h * .07 * (noise1(u * 5 + age * .3, seed + 7)) * sin(PI * u) + h * .03]); } P.body.push(bot);
    for (let i = 0; i < (flat ? 2 : 4); i++) { const u = hash(seed, i, 21) - .5, l = w * (.16 + .2 * hash(seed, i, 22)); P.base.push(L(cx + u * w * .7, cy - h * .02 + h * .1 * (i % 2), l, h * (flat ? .12 : .075), i + 120, { n: 9, rough: .3 })); }
    for (let i = 0; i < 4; i++) { const sg = i % 2 ? 1 : -1; P.bits.push(L(cx + sg * w * (.46 + .12 * hash(seed, i, 31)) + lean * h, cy - h * (.05 + .42 * hash(seed, i, 32)), h * (.09 + .1 * hash(seed, i, 33)) * 1.7, h * (.06 + .06 * hash(seed, i, 34)), i + 140, { n: 8, rough: .3 })); }
    return P;
  }
  const CLOUDS = {
    dawn: [[300, 200, 900, 90, 1], [1180, 150, 1100, 100, 2], [1720, 320, 620, 70, 3], [760, 380, 1000, 46, 4], [1500, 470, 620, 34, 5]],
    day: [[250, 300, 760, 250, 1], [1010, 170, 620, 160, 2], [1620, 330, 980, 270, 3], [820, 420, 520, 90, 5], [1260, 500, 620, 56, 6], [420, 520, 560, 44, 7]],
    summer: [[180, 300, 700, 210, 1], [1600, 250, 860, 250, 3], [940, 400, 460, 84, 5], [620, 500, 520, 48, 6], [1300, 510, 560, 44, 7]],
    gold: [[300, 260, 980, 130, 1], [1440, 200, 1000, 140, 3], [950, 420, 860, 52, 5], [1650, 470, 700, 40, 6]],
    rain: [[160, 210, 1300, 260, 1], [980, 170, 1200, 240, 2], [1720, 250, 1200, 280, 3], [700, 380, 1300, 100, 4], [1500, 440, 1000, 70, 5]],
    dusk: [[380, 220, 1100, 110, 1], [1400, 180, 1200, 120, 2], [860, 360, 1200, 60, 4], [1660, 430, 800, 44, 5], [300, 470, 700, 36, 6]],
    lowsun: [[320, 220, 1100, 110, 1], [1350, 170, 1200, 120, 2], [900, 390, 1100, 54, 4], [1640, 470, 700, 40, 5]],
    snow: [[500, 180, 1400, 120, 1], [1500, 230, 1200, 140, 2]],
    night: [[420, 560, 1000, 60, 1], [1500, 520, 900, 64, 2]],
    storm: [[160, 210, 1300, 300, 1], [1020, 130, 1200, 250, 2], [1720, 270, 1200, 310, 3], [700, 400, 1200, 90, 4], [1380, 470, 1000, 60, 5]]
  };
  CLOUDS['storm-light'] = CLOUDS.storm; W.CLOUDS = CLOUDS;
  // sky(p,{mood, t, horizon, drift px/s, seed, clouds:true|list|n, bleed, strength})
  W.sky = function (p, o = {}) {
    const L = lightOf(o.mood || o.light || 'day'), name = o.set || L.mood || 'day', H = o.horizon ?? 720, t = o.t ?? 0, sd = o.seed || 0, e = o.bleed === false ? 14 : -40, dr = (o.drift ?? 5) * t, dir = o.dir ?? -.22;
    const edge = []; for (let i = 0; i <= 16; i++) edge.push([lerp(-30, 1950, i / 16), e + 22 * noise1(i * .9, 3 + sd)]);
    const full = below(edge, H + 60);
    p.mass(full, { sharp: true, color: { lin: [0, 0, 0, H], stops: [[0, L.top], [.5, L.mid], [1, L.low]] }, dir, len: 1.7, size: 1.5, dens: .95, vary: .55, alpha: o.strength ?? 1 });
    // second, crossing pass, only in the upper corners: a hand going over the top of the sheet again
    const R = rngOf(11 + sd);
    for (let i = 0; i < 3; i++) { const x = [260, 1640, 1010][i] + R() * 120, y = 60 + R() * 60; p.shade(lump(x, y, 420 + R() * 160, 120 + R() * 40, 40 + i + sd, { rough: .3, rot: dir }), { color: mixc(L.top, L.cs, .35), alpha: .3, soft: 46, mode: 'multiply' }); }
    if (o.glow !== false && (name === 'dawn' || name === 'dusk' || name === 'lowsun' || name === 'storm' || name === 'gold')) { const gx = o.glowX ?? (L.side > 0 ? 1420 : 520); p.mass(lump(gx, H - 90, 720, 120, 71, { rough: .2 }), { color: { rad: [gx, H - 70, 720], stops: [[0, mixc(L.sun, '#fff0c8', .35)], [1, L.low]] }, alpha: .75, dir: -.05, len: 1.6, size: 1.2, soft: 24 }); }
    let list = o.clouds === false ? [] : Array.isArray(o.clouds) ? o.clouds : (CLOUDS[name] || CLOUDS.day); if (typeof o.clouds === 'number') list = list.slice(0, o.clouds);
    list.forEach((c, i) => {
      const shf = sd ? 1660 * hash(sd, 3, 3) : 0, cx = ((c[0] + shf + dr * (1 - i * .13) + 700) % 3320 + 3320) % 3320 - 700, k = H / 720, s = c[4] + sd * 7, age = t * .16, cy = c[1] * k, w = c[2], h = c[3] * lerp(1, k, .6), side = L.side, heavy = name === 'storm' || name === 'rain', C = cloudParts(cx, cy, w, h, s, age, side), far = clamp((cy / H - .5) * 2);
      p.mass(poly(...C.body), { color: { lin: [0, cy - h, 0, cy + h * .12], stops: [[0, L.cl], [.55, mixc(L.cl, L.cs, .22)], [1, mixc(L.cs, L.low, .35)]] }, alpha: .95, dir: dir + .5 * (hash(s, 5, 5) - .5), len: 1, size: 1.1, vary: .4, soft: 6, dens: .95 });
      p.mass(poly(...C.hol), { color: mixc(L.cs, L.cl, heavy ? .12 : .34), alpha: heavy ? .6 : .55, dir: .35, len: .8, size: .9, vary: .35, soft: 16 });
      p.mass(poly(...C.cap), { color: mixc(L.cl, L.sun, .2), alpha: heavy ? .55 : .8, dir: dir - .3, len: .8, size: .9, vary: .25, soft: 8 });
      p.mass(poly(...C.base), { color: mixc(L.cs, L.mid, heavy ? .1 : .4), alpha: .7, dir: 0, len: 1.2, size: .8, vary: .3, soft: 9 });
      if (far < .7) p.mass(poly(...C.bits), { color: mixc(L.cl, L.mid, .3), alpha: .65, dir, len: .8, size: .7, vary: .3, soft: 8 });
      if (far < .6) C.heads.forEach((q, j) => { if (j % 3 !== (s % 3)) return; const T = track(spline(lump(q[0], q[1], q[2] * .96, q[3] * .96, s * 19 + q[4], { n: 11, rough: .12 }), 4, true)), a0 = side < 0 ? .52 : .68; ln(p, T.slice(a0, a0 + .17, 24), { color: mixc(L.cs, L.ink, .18), w: 1.7, press: .24, taper: [.45, .5], wobble: 1.3 }); });
    });
  };
  // cloudShadow(p,{x,w,rg|y0,y1,k,edge}) : one cloud's shadow lying on the land; call inside the land layer
  W.cloudShadow = function (p, o = {}) {
    const L = lightOf(o.light), x = o.x ?? 960, w = o.w ?? 800, y0 = o.y0 ?? 400, y1 = o.y1 ?? 1080, s = o.seed || 1, sl = o.slant ?? -.9, n = 11, a = [], b = [];
    for (let i = 0; i <= n; i++) { const u = i / n, y = lerp(y0, y1, u), k = lerp(.5, 1.2, u); a.push([x - w * .5 * k + sl * (y1 - y) * .6 + 90 * fbm(u * 4.2 + s, s) * (.4 + u), y]); b.push([x + w * .5 * k + sl * (y1 - y) * .6 + 100 * fbm(u * 4.6 + s + 9, s + 2) * (.4 + u), y]); }
    if (o.up != null) { a.unshift([a[0][0] - 30, o.up]); b.unshift([b[0][0] - 30, o.up]); } const sh = a.concat(b.reverse()); p.shade(sh, { color: o.color || mixc(L.shade, '#39435c', .35), alpha: (o.k ?? 1) * (o.alpha ?? .55), soft: o.soft ?? 26, mode: 'multiply' }); return sh;
  };
  W.sunPatch = function (p, o = {}) { const L = lightOf(o.light), sh = lump(o.x ?? 960, o.y ?? 760, o.rx ?? 420, o.ry ?? 110, o.seed || 5, { rough: .25, rot: o.rot || -.1 }); p.shade(sh, { color: o.color || L.sun, alpha: (o.k ?? 1) * (o.alpha ?? .5), soft: o.soft ?? 40, mode: 'screen' }); return sh; };
  // a tide of light across the whole sheet: k -0.3..1.3 sweeps the edge from left to right
  W.tide = function (p, o = {}) { const k = o.k ?? .5, x = lerp(-700, 2600, k), L = lightOf(o.light), dark = o.dark || '#4a5470'; p.air({ color: dark, lin: [x - 420, 0, x + 420, 260], stops: [[0, o.from || '#ffffff'], [1, dark]], alpha: o.alpha ?? .5, mode: 'multiply' }); };

  // ------------------------------------------------------------------ land
  // one fall line from the skyline down to a foot, bowed and worn
  function fall(S, F, bow, seed, n = 6) { const o = [], dx = F[0] - S[0], dy = F[1] - S[1], l = hyp(dx, dy) || 1; for (let i = 0; i <= n; i++) { const u = i / n, b = bow * sin(PI * u) + l * .028 * noise1(u * 3.1, seed); o.push([S[0] + dx * u - dy / l * b, S[1] + dy * u + dx / l * b]); } return o; }
  // hill(p,{pts skyline keys, base y|polyline, d 0 near..1 far, season, light, colour, spurs, seed, dir, hatch, crest})
  // spurs: n | [{x, to:[fx,fy], w, bow, k}] : a crest coming down from a knuckle of the skyline. one side takes the sun, the other loses it;
  // the crest is crisp, everything else on the flank is lost
  W.hill = function (p, o) {
    const d = o.d ?? .4, C = Object.assign(landPal(o, d), o.pal), L = C.L, sd = o.seed || 1, rg = o.rg || ridge(o.pts, { amp: o.rough ?? lerp(9, 4, d), freq: lerp(1 / 90, 1 / 170, d), seed: sd, step: lerp(16, 30, d) });
    let y0 = 1e9, yi = 0; rg.forEach((q, i) => { if (q[1] < y0) { y0 = q[1]; yi = i; } }); const yb = typeof o.base === 'number' ? o.base : max(...o.base.map(q => q[1])), x0 = rg[0][0], x1 = rg[rg.length - 1][0], px = rg[yi][0];
    const body = below(rg, o.base, sd + 5), slope = Math.atan2(rg[rg.length - 1][1] - rg[0][1], x1 - x0), side = o.side ?? L.side; // side -1: sun from the left
    const foot = o.foot || mixc(C.mid, L.haze, .25 + .5 * d);
    p.mass(body, { sharp: true, color: { lin: [0, y0, 0, yb], stops: [[0, mixc(C.mid, C.lit, .3)], [.42, C.mid], [1, foot]] }, dir: o.dir ?? slope * .8 + .08, len: 1.35, size: lerp(1.05, 1.35, d), dens: 1.05, vary: o.vary ?? lerp(.42, .28, d), soft: d > .7 ? 3 : 0 });
    const R = rngOf(sd * 13 + 2), spurs = o.spurs == null ? 5 : o.spurs; let list = spurs;
    if (!Array.isArray(spurs)) { // knuckles of the skyline, in order of how far they stand up
      const K = []; for (let i = 2; i < rg.length - 2; i++) { const w = max(2, Math.round(60 / lerp(16, 30, d))), a = rg[max(0, i - w)], b = rg[min(rg.length - 1, i + w)], z = (a[1] + b[1]) / 2 - rg[i][1]; K.push([i, z]); }
      K.sort((a, b) => b[1] - a[1]); const pick = []; for (const k of K) { if (pick.length >= spurs) break; if (pick.every(q => abs(rg[q][0] - rg[k[0]][0]) > (x1 - x0) / (spurs * 1.7))) pick.push(k[0]); }
      list = pick.map(i => { const x = rg[i][0], y = rg[i][1], l = (yb - y) * (.55 + .4 * R()); return { x, to: [x + (x - px) * .16 + side * -l * (.25 + .3 * R()), y + l], w: (x1 - x0) / spurs * (.42 + .3 * R()), k: .7 + .45 * R() }; });
    }
    const drk = lerp(.95, .5, d), crests = [];
    list.forEach((s, i) => {
      const S = [s.x, yAt(rg, s.x)], F = s.to, l = hyp(F[0] - S[0], F[1] - S[1]), c = fall(S, F, s.bow ?? (F[0] - S[0] > 0 ? -1 : 1) * l * .12, sd + i * 7, 8), an = Math.atan2(F[1] - S[1], F[0] - S[0]), w = s.w || 90, kk = min(1, (s.k ?? 1) * drk);
      const plane = (sg, ww, stretch) => { // region between the crest, the skyline on that side, and a lost lower edge
        const xe = clamp(S[0] + sg * ww, x0 + 2, x1 - 2), tp = cut(rg, min(S[0], xe), max(S[0], xe)); if (sg < 0) tp.reverse(); const E = tp[tp.length - 1], low = []; for (let j = 1; j <= 7; j++) { const u = j / 7, q = [lerp(E[0], F[0] + sg * ww * .22, Math.pow(u, 1.25)), lerp(E[1], F[1] - l * .02, Math.pow(u, .85 * stretch))]; low.push([q[0] + 16 * noise1(u * 4 + i, sd) + sg * ww * .12 * sin(PI * u), q[1] + 12 * noise1(u * 3 + i, sd + 3)]); }
        return c.slice().reverse().concat(tp.slice(1), low);
      };
      const m = [(S[0] + F[0]) / 2, (S[1] + F[1]) / 2], nx = -side * abs(sin(an)), ny = (side * cos(an) > 0 ? 1 : -1) * abs(cos(an)) * .35, sh = plane(-side, w, 1), fd = ss(.36, .75, d), sdir = lerp(an - side * .55, slope * .8 + .12 - side * .3, fd), g = a => ({ lin: [m[0], m[1], m[0] + nx * w * 1.05, m[1] + abs(ny) * w + w * .25], stops: [[0, rgba(C.shade, a)], [.35, rgba(C.shade, a * .72)], [1, rgba(mixc(C.shade, C.mid, .5), 0)]] });
      p.mass(sh, { sharp: true, color: g(kk), dir: sdir, len: .9, size: lerp(.9, 1.15, d), vary: .35, soft: 9 });
      if (d < .9) { const lf = plane(side, w * .62, 1); p.mass(lf, { sharp: true, color: { lin: [m[0], m[1], m[0] - nx * w * .62, m[1] + w * .1], stops: [[0, rgba(C.sun, lerp(.75, .4, d) * (s.sun ?? 1))], [1, rgba(C.sun, 0)]] }, dir: lerp(an + side * .45, slope * .8 + side * .25, fd), len: .8, size: .95, vary: .4, soft: 14 }); }
      if ((o.hatch ?? 1) && d < .75) { const near = c.concat(c.map((q, j) => { const u = j / (c.length - 1), ww = w * .55 * sin(PI * Math.pow(u, .7) * .95 + .05) * (1 + .4 * noise1(j + i * 4, sd)); return [q[0] - side * ww, q[1] + ww * .3]; }).reverse()); hx(p, near, { color: mixc(C.shade, C.ink, .35), dir: sdir + .1, gap: lerp(15, 13, d), len: lerp(80, 46, d), w: lerp(2, 1.3, d), press: lerp(.3, .16, d) * (o.hatch ?? 1) * kk, curve: .2 }); }
      if (d < .86) crests.push([c, s]);
      // gullies: two or three strokes let down the flank, following the fall of the ground
      if (d < .8) for (let j = 0; j < 2; j++) { const u = .3 + .4 * j, a0 = [lerp(S[0], S[0] - side * w, u), 0]; a0[1] = yAt(rg, clamp(a0[0], x0, x1)) + 14 + 20 * hash(i, j, 2); const f2 = fall(a0, [lerp(a0[0], F[0] - side * w * .3, .55), lerp(a0[1], F[1], .5 + .3 * hash(i, j, 3))], 10 * (hash(i, j, 4) - .5) * 4, sd + i * 5 + j, 5); ln(p, f2, { color: mixc(C.shade, C.ink, .4), w: lerp(1.8, 1.1, d), press: lerp(.36, .18, d), taper: [.25, .7], wobble: 1.6 }); }
    });
    crests.forEach(([c, s]) => ln(p, c.slice(0, 7).map((q, j) => [q[0], q[1], 1 - j * .12]), { color: C.ink, w: lerp(2.2, 1.2, d), press: lerp(.46, .2, d) * min(1, s.k ?? 1), taper: [.06, .8], wobble: 1.6 }));
    if (o.crest !== 0) found(p, rg, { color: C.ink, w: lerp(2.8, 1.4, d), press: lerp(.6, .24, d) * (o.crest ?? 1), seed: sd + 3, seg: lerp(260, 170, d), gap: .45, skip: lerp(.14, .34, d), step: 44 });
    return rg;
  };
  // hills(p,{preset|ridges:[..], season, light, colour}) far ranges back to front
  const RANGES = {
    west: [
      { d: .95, pts: [[-60, 560], [160, 520], [380, 548], [560, 490], [760, 470], [900, 505], [1120, 452], [1300, 492], [1520, 470], [1760, 520], [1980, 500]], base: 700, seed: 21, spurs: 3, rough: 5 },
      { d: .72, pts: [[-60, 620], [140, 560], [330, 520], [470, 530], [620, 596], [820, 640], [1010, 630], [1200, 590], [1420, 528], [1600, 506], [1780, 552], [1980, 596]], base: 780, seed: 22, spurs: 4, rough: 6 },
      { d: .5, pts: [[-60, 700], [200, 690], [420, 724], [700, 742], [980, 716], [1240, 700], [1500, 668], [1740, 660], [1980, 690]], base: 900, seed: 23, spurs: 3, rough: 7 }],
    high: [
      { d: .95, pts: [[-60, 430], [220, 400], [430, 420], [640, 372], [820, 350], [960, 372], [1090, 340], [1260, 392], [1440, 362], [1660, 420], [1980, 400]], base: 600, seed: 31, spurs: 3, rough: 4 },
      { d: .66, pts: [[-80, 300], [110, 240], [280, 196], [400, 180], [510, 214], [640, 306], [770, 402], [900, 490], [1040, 566], [1200, 600], [1980, 640]], base: 760, seed: 32, spurs: 4, rough: 7 }]
  };
  W.hills = function (p, o = {}) { const list = o.ridges || RANGES[o.preset || 'west']; const out = []; for (const r of list) out.push(W.hill(p, Object.assign({ season: o.season, light: o.light, colour: o.colour, hatch: o.hatch }, r, o.dy ? { pts: r.pts.map(q => [q[0], q[1] + o.dy]), base: r.base + o.dy } : {}))); return out; };

  // patch of walled fields lying on the ground: quad [tl,tr,br,bl] in perspective
  W.fields = function (p, o) {
    const d = o.d ?? .35, C = landPal(o, d), R = rngOf(o.seed || 1), [a, b, c, e] = o.quad, rows = o.rows || 4, cols = o.cols || 5, pw = o.power || 1.7, G = [];
    const at = (u, v) => { const k = Math.pow(v, pw), P = [lerp(a[0], b[0], u), lerp(a[1], b[1], u)], Q = [lerp(e[0], c[0], u), lerp(e[1], c[1], u)], bl = (o.bulge || 0) * sin(PI * u) * (1 - abs(2 * k - 1) * .4); return [lerp(P[0], Q[0], k), lerp(P[1], Q[1], k) - bl]; };
    for (let j = 0; j <= rows; j++) { G.push([]); for (let i = 0; i <= cols; i++) { const eu = i > 0 && i < cols ? (R() - .5) * .5 / cols : 0, ev = j > 0 && j < rows ? (R() - .5) * .42 / rows : 0; G[j].push(at(i / cols + eu, j / rows + ev)); } }
    const mids = (P, Q, s) => { const o2 = []; for (let i = 0; i <= 3; i++) { const u = i / 3; o2.push([lerp(P[0], Q[0], u) + 5 * noise1(u * 3, s), lerp(P[1], Q[1], u) + 3 * noise1(u * 3 + 4, s)]); } return o2; };
    const tones = [C.lit, C.mid, C.dry, mixc(C.mid, C.dark, .35), mixc(C.lit, C.earth, .4)], groups = tones.map(() => []);
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) if (R() < (o.fill ?? .7)) { const q = [G[j][i], G[j][i + 1], G[j + 1][i + 1], G[j + 1][i]]; groups[(R() * tones.length) | 0].push(q); }
    groups.forEach((g, k) => { if (g.length) p.mass(poly(...g), { color: tones[k], alpha: o.alpha ?? .6, dir: (o.dir ?? .05) + (k - 2) * .22, len: .8, size: .8, vary: .4 }); });
    for (let j = 0; j <= rows; j++) for (let i = 0; i < cols; i++) if (R() < (o.wall ?? .72)) { const w = lerp(1.2, o.ww || 4, Math.pow(j / rows, 1.5)); ln(p, mids(G[j][i], G[j][i + 1], i + j * 9), { color: mixc(C.ink, C.mid, .35), w: w * .7, press: lerp(.26, .46, j / rows) * (o.press ?? 1), taper: [.1, .15], wobble: 1.8 }); }
    for (let j = 0; j < rows; j++) for (let i = 0; i <= cols; i++) if (R() < (o.wall ?? .72)) { const w = lerp(1.2, o.ww || 4, Math.pow((j + .5) / rows, 1.5)); ln(p, mids(G[j][i], G[j + 1][i], i + j * 9 + 50), { color: mixc(C.ink, C.mid, .35), w: w * .7, press: lerp(.26, .46, j / rows) * (o.press ?? 1), taper: [.1, .15], wobble: 1.8 }); }
    return at;
  };
  // road(p,{pts, w:[far,near], d, light}) pale track with broken verges. returns ribbon with .track
  W.road = W.path = function (p, o) {
    const s = spline(o.pts, 8, false), T = track(s), [w0, w1] = o.w || [3, 40], pw = o.power || 2, d = o.d ?? .3, C = landPal(o, d), L = C.L, hw = u => lerp(w0, w1, Math.pow(u, pw)), r = ribbon(s, hw, { step: 18, rough: 1.5, seed: o.seed || 2 });
    p.mass(r.poly, { sharp: true, color: o.color || mixc(seen('#d6c6a6', L, d), L.sun, .3), alpha: o.alpha ?? .95, dir: o.dir ?? 0, len: .7, size: .7, vary: .35 });
    if (o.ruts !== 0) { const mid = ribbon(s, u => hw(u) * .3, { step: 30 }); p.shade(mid.poly, { color: C.lit, alpha: .35, soft: 4, mode: 'multiply' }); }
    found(p, r.L, { color: C.ink, w: o.lw || 2.4, press: .5, seed: 5, seg: 90, gap: .5, skip: .2, step: 26 }); found(p, r.R, { color: C.ink, w: o.lw || 2.4, press: .42, seed: 8, seg: 80, gap: .6, skip: .25, step: 26 });
    r.track = T; r.hw = hw; return r;
  };
  W.lough = function (p, o) { // still water: lifted paper with a few level strokes and the dark shore under it
    const L = lightOf(o.light), d = o.d ?? .6, { x, y, rx, ry } = o, sh = lump(x, y, rx, ry, o.seed || 9, { n: 14, rough: .1 });
    p.mass(sh, { color: { lin: [0, y - ry, 0, y + ry], stops: [[0, mixc(L.shade, L.haze, .45)], [.35, mixc(L.mid, L.cl, .35)], [1, mixc(L.low, L.cl, .5)]] }, dir: 0, len: 1.5, size: .7, vary: .3 });
    const R = rngOf(o.seed || 9); for (let i = 0; i < (o.n ?? 7); i++) { const yy = y + (R() - .4) * ry * 1.3, xx = x + (R() - .5) * rx * 1.3, l = rx * (.1 + .25 * R()); ln(p, [[xx - l, yy], [xx, yy + 1], [xx + l, yy - 1]], { color: R() < .6 ? L.cl : mixc(L.shade, L.haze, .4), w: 2 + 1.5 * R(), press: .5, taper: [.4, .5] }); }
    const T = track(sh.slice(7).concat([sh[0]])); ln(p, T.slice(.05, .95, 60), { color: mixc(L.shade, L.ink, .4), w: 2.4, press: .4, taper: [.3, .4], wobble: 1.3 });
  };
  W.sheep = function (p, o) { const L = lightOf(o.light), d = o.d ?? .35, s = o.s || 7, b = [], h = []; o.at.forEach((q, i) => { const k = s * (q[2] || 1), f = hash(i, 3, 1) < .5 ? -1 : 1, x = q[0], y = q[1]; b.push([[x - k, y - k * .2], [x - k * .7, y - k * .9], [x + k * .5, y - k * .95], [x + k, y - k * .4], [x + k * .7, y + k * .2], [x - k * .7, y + k * .25]]); h.push([[x + f * k * 1.0, y - k * .55], [x + f * k * 1.5, y - k * .5], [x + f * k * 1.45, y], [x + f * k, y - k * .1]]); }); p.mass(poly(...b), { color: mixc(seen('#efe8d8', L, d), L.sun, .2), dir: 0, size: .4, len: .4, vary: .2 }); p.mass(poly(...h), { color: mixc(L.ink, L.haze, d), dir: 0, size: .3, len: .3 }); };

  // ------------------------------------------------------------------ grass
  function bladePath(ctx, b) { const [x, y, h, th, w] = b, t1 = th * .4, t2 = th * 1.3, mx = x + sin(t1) * h * .56, my = y - cos(t1) * h * .56, tx = mx + sin(t2) * h * .5, ty = my - cos(t2) * h * .5; ctx.moveTo(x - w, y + 2); ctx.quadraticCurveTo(mx - w * .9, my, tx, ty); ctx.quadraticCurveTo(mx + w * .9, my, x + w, y + 2); ctx.closePath(); }
  function bladePts(b) { const [x, y, h, th] = b, t1 = th * .4, t2 = th * 1.3, mx = x + sin(t1) * h * .56, my = y - cos(t1) * h * .56, tx = mx + sin(t2) * h * .5, ty = my - cos(t2) * h * .5; return [[x, y, 1], [x + sin(t1 * .6) * h * .28, y - h * .28, .95], [mx, my, .8], [tx, ty, .4]]; }
  // grass(p,{line:[[x,y]..] ground line, depth px below it that the clumps are spread over, h, n, wind, t, season, light, colour, d, seed, stiff, lines, avoid(x,y)->0..1})
  W.grass = function (p, o) {
    const d = o.d ?? .05, C = landPal(o, d), t = o.t ?? p.t, g = windOf(o.wind), line = o.line || [[-40, o.y ?? 980], [1960, o.y ?? 980]], T = track(line.length > 2 ? spline(line, 5, false) : line), n = Math.round((o.n || 46) * 1.5), H = o.h || 70, dep = (o.depth ?? 50) * (o.depth === 0 ? 0 : 1.5), sd = o.seed || 1, R = rngOf(sd * 5 + 1), lean = o.lean ?? .12, st = 1 / (o.stiff || 1), groups = [[], [], []], acc = [], wk = o.bw || 1, clr = o.avoid, seedy = [];
    for (let i = 0; i < n; i++) {
      const row = Math.pow(R(), .9), q = T.at(R()), x = q[0], y = q[1] + row * dep, patch = noise1(x / 170 + row * 2, sd + 3), sc = (.62 + row * (o.grow ?? .5) * .8) * (.6 + .75 * R()) * (1 + .3 * patch), tuft = R(), m = 3 + ((R() * 5) | 0), lag = R() * .14, bend = g(t - lag, x, y), av = clr ? clr(x, y) : 1, thin = patch < -.55, r5 = [R(), R(), R(), R(), R(), R()];
      if (av <= 0 || thin) { for (let j = 0; j < m; j++) { R(); R(); R(); R(); R(); } continue; }
      for (let j = 0; j < m; j++) { const a = R(), b0 = R(), c = R(), e = R(), z = R(), fan = (j / (m - 1 || 1) - .5) * (.42 + .75 * tuft) + (a - .5) * .34, h = H * sc * av * (.4 + .85 * b0 * b0 + .15) * (1 - abs(fan) * .3), b = [x + (j / m - .5) * 17 * sc + (c - .5) * 12, y + (e - .5) * 10, h, fan + lean + bend * st * (.75 + .5 * z) * (.7 + h * .0022), (1 + 1.1 * sc) * wk]; const tone = clamp(.5 + .55 * patch + (z - .5) * .9); groups[row < .3 ? (tone > .6 ? 1 : 0) : tone < .36 ? 0 : tone < .7 ? 1 : 2].push(b); if ((i * 7 + j * 3) % (o.every || 4) === 0) acc.push([b, tone]); }
      if (r5[0] < (o.seeds ?? .16) && sc > .7) seedy.push([x, y, H * sc * 1.25 * av, lean + bend * st * .95 + (r5[1] - .5) * .3, r5[2]]);
    }
    const cols = [mixc(C.dark, C.shade, .35), mixc(C.mid, C.dark, .12), mixc(C.lit, C.sun, .25)], dir = -PI / 2 + lean;
    groups.forEach((gr, k) => { if (gr.length) p.mass(ctx => { ctx.beginPath(); for (const b of gr) bladePath(ctx, b); }, { color: o.tint ? mixc(cols[k], o.tint, .5) : cols[k], dir: dir + (k - 1) * .12, len: .5, size: .4, vary: .4, alpha: o.alpha ?? .95 }); });
    const al = o.alpha ?? 1, mx = min(o.lines ?? 70, acc.length); for (let i = 0; i < mx; i++) { const [b, tone] = acc[Math.floor(i * acc.length / mx)], k = hash(i, sd, 3), dk = k < .34; p.line(bladePts(b), { color: dk ? mixc(C.deep, C.dark, .3) : tone > .5 ? (k < .7 ? C.lit : C.dry) : mixc(C.mid, C.dark, .4 * k), w: (dk ? 2.4 + 1.2 * k : 3 + 1.8 * k) * wk * (.8 + b[2] / 220), press: dk ? .62 : .78, taper: [.05, .65], wobble: .6, medium: dk ? 'graphite' : 'crayon', alpha: al }); }
    seedy.slice(0, 18).forEach(([x, y, h, th, k], i) => { const q = bladePts([x, y, h, th, 1]), e = q[3], a = Math.atan2(e[1] - q[2][1], e[0] - q[2][0]); p.line(q, { color: mixc(C.dry, C.dark, .35 * k), w: 2.6, press: .7, taper: [.03, .2], wobble: .7, alpha: al }); if (k > .35) for (let j = 0; j < 3; j++) { const s = .62 + j * .16, z = [lerp(q[2][0], e[0], s), lerp(q[2][1], e[1], s)]; p.line([z, [z[0] + cos(a - .5) * 8, z[1] + sin(a - .5) * 8]], { color: C.dry, w: 3.4, press: .75, taper: [.1, .6], medium: 'crayon', wobble: .3, alpha: al }); } });
  };
  // sward: short strokes lying over a slope, with the pale band a gust combs through it
  W.sward = function (p, o) {
    const d = o.d ?? .25, C = landPal(o, d), t = o.t ?? p.t, g = windOf(o.wind), R = rngOf(o.seed || 1), n = o.n || 150, rg = o.rg, x0 = o.x0 ?? -20, x1 = o.x1 ?? 1940, gr = [[], [], []], depth = o.depth || 200, H = o.h || 13;
    for (let i = 0; i < n; i++) { const x = lerp(x0, x1, R()), v = Math.pow(R(), o.power || 1.2), y = yAt(rg, x) + 6 + v * depth, k = .5 + v * 1.1, b = g(t - R() * .1, x, y), m = 2 + (R() * 3 | 0); for (let j = 0; j < m; j++) gr[R() * 3 | 0].push([x + (j - 1) * 9 * k + R() * 6, y + R() * 5, H * k * (.6 + .7 * R()), .15 + (R() - .5) * .5 + b * .9, (.9 + .7 * k)]); }
    [mixc(C.dark, C.shade, .5), C.mid, C.sun].forEach((c, k) => p.mass(ctx => { ctx.beginPath(); for (const b of gr[k]) bladePath(ctx, b); }, { color: c, dir: -PI / 2 + .15, len: .4, size: .35, vary: .4, alpha: o.alpha ?? .85 }));
    if (g.fronts || (o.wind && o.wind.fronts)) W.gustBand(p, Object.assign({}, o, { C }));
  };
  W.gustBand = function (p, o) { const wf = o.wind && o.wind.fronts ? o.wind : CALM, C = o.C || landPal(o, o.d ?? .25), t = o.t ?? p.t, rg = o.rg, depth = o.depth || 200; for (const f of wf.fronts(t)) { const w = min(520, f.w * .6), x = f.x - w * .5, a = cut(rg, x - w * .5, x + w * .5); if (x > 2300 || x < -400) continue; const sh = [], n = 8, off = depth * (.2 + .5 * f.y); for (let i = 0; i <= n; i++) { const u = i / n, X = x + (u - .5) * w; sh.push([X, yAt(rg, X) + off - 16 * sin(PI * u) - 6 * noise1(u * 4 + t, f.i)]); } for (let i = n; i >= 0; i--) { const u = i / n, X = x + (u - .5) * w - depth * .22; sh.push([X, yAt(rg, clamp(X, -80, 2000)) + off + depth * .3 * sin(PI * u) + 8 * noise1(u * 5 + t, f.i + 3)]); } p.mass(sh, { color: C.sun, alpha: .34 * min(1, f.s), dir: .1, len: .8, size: .6, vary: .6, soft: 8 }); } };

  // ground(p,{area:[x0,y0,x1,y1], dips, tussocks, stones, seed, light, season, colour, wind, t, avoid(x,y)}) : the near earth given a shape
  W.ground = function (p, o) {
    const d = o.d ?? .02, C = landPal(o, d), L = C.L, t = o.t ?? p.t, g = windOf(o.wind), [x0, y0, x1, y1] = o.area, sd = o.seed || 1, R = rngOf(sd * 7 + 3), av = o.avoid, sx = x1 - x0, sy = y1 - y0, items = [];
    for (let i = 0; i < (o.dips ?? 5); i++) { const v = (i + R() * .8) / (o.dips ?? 5), x = x0 + sx * R(), y = y0 + sy * (.05 + .85 * v), w = (150 + 280 * R()) * (.6 + .8 * v), h = (12 + 20 * R()) * (.6 + .9 * v), tl = (R() - .5) * .3; p.mass(lump(x, y, w, h, i + sd, { n: 12, rough: .22, rot: tl }), { color: mixc(C.dark, C.shade, .35), alpha: .5, dir: tl + .05, len: .9, size: .7, vary: .45, soft: 9 }); p.mass([[x - w * .9, y - h * .5 - w * .9 * sin(tl)], [x - w * .2, y - h * 1.25], [x + w * .7, y - h * .8 + w * .7 * sin(tl)], [x + w * .2, y - h * .6], [x - w * .4, y - h * .5]], { color: mixc(C.lit, C.sun, .4), alpha: .45, dir: tl, len: .8, size: .6, vary: .4, soft: 6 }); }
    for (let i = 0; i < (o.stones ?? 5); i++) { const v = Math.pow(R(), .8), x = x0 + sx * R(), y = y0 + sy * v, r = (9 + 22 * R() * R()) * (.6 + .9 * v); if (av && av(x, y) <= 0) continue; items.push([y, 's', x, r, i]); }
    for (let i = 0; i < (o.tussocks ?? 9); i++) { const v = Math.pow(R(), .85), x = x0 + sx * R(), y = y0 + sy * v, r = (24 + 40 * R()) * (.5 + .85 * v); if (av && av(x, y) <= 0) continue; items.push([y, 't', x, r, i]); }
    items.sort((a, b) => a[0] - b[0]);
    const sc = seen('#8f8a7e', L, d), sk = mixc(seen('#55554f', L, d), L.shade, .4), sl = mixc(seen('#b5ae9c', L, d), L.sun, .2), side = L.side;
    for (const [y, k, x, r, i] of items) {
      if (k === 's') { const b = lump(x, y - r * .25, r * 1.35, r * .72, i + sd, { n: 9, rough: .15, rot: (hash(i, sd, 1) - .5) * .4 }); p.mass(lump(x - side * r * .4, y + r * .3, r * 1.5, r * .3, i + 4, { n: 9 }), { color: C.shade, alpha: .6, dir: 0, size: .42, len: .5 }); p.mass(b, { color: { lin: [x, y - r, x, y + r * .4], stops: [[0, sc], [1, sk]] }, dir: .2, size: .46, len: .5, vary: .45 }); p.mass(lump(x + side * r * .25, y - r * .56, r * .66, r * .2, i + 9, { n: 8, rough: .35 }), { color: sl, alpha: .7, dir: 0, size: .36, len: .42 }); p.mass(lump(x, y + r * .34, r * 1.3, r * .2, i + 12, { n: 9, rough: .3 }), { color: mixc(C.dark, C.mid, .5), alpha: .8, dir: -1.4, size: .36, len: .4 }); ln(p, b.slice(0, 4), { color: L.ink, w: 1.5, press: .5, taper: [.2, .4] }); }
      else { p.mass(lump(x - side * r * .3, y + r * .08, r * 1.25, r * .26, i + 3, { n: 9, rough: .2 }), { color: C.shade, alpha: .65, dir: 0, size: .5, len: .5, soft: 3 }); const bl = [[], [], []], n = 40, b = g(t - hash(i, 1, 1) * .12, x, y); p.mass([[x - r * 1.05, y + 2], [x - r * .8, y - r * .34], [x - r * .2, y - r * .56], [x + r * .4, y - r * .5], [x + r * .9, y - r * .26], [x + r * 1.05, y + 2]], { color: mixc(C.dark, C.mid, .35), alpha: .85, dir: -1.4, size: .44, len: .5, vary: .5 }); for (let j = 0; j < n; j++) { const u = hash(i, j, 2) + hash(i, j, 12) - 1, fan = u * 1.15 + (hash(i, j, 3) - .5) * .5, h = r * (1.15 - abs(u) * .45) * (.35 + .75 * hash(i, j, 4)); bl[hash(i, j, 5) < .42 ? 0 : hash(i, j, 5) < .78 ? 1 : 2].push([x + u * r * .95, y - r * .1 * (1 - abs(u)) + 3, h, fan + b * .6, .9 + r * .016]); } bl.forEach((z, q) => { if (z.length) p.mass(ctx => { ctx.beginPath(); for (const a of z) bladePath(ctx, a); }, { color: [mixc(C.dark, C.shade, .3), mixc(C.mid, C.dark, .25), mixc(C.lit, C.mid, .35)][q], dir: -1.5 + (q - 1) * .25, size: .36, len: .42, vary: .45 }); }); for (let j = 0; j < 8; j++) { const a = bl[j % 3][(j * 3) % Math.max(1, bl[j % 3].length)]; if (a) p.line(bladePts(a), { color: j % 3 === 0 ? C.deep : j % 3 === 1 ? C.dry : C.lit, w: 2.6, press: .7, taper: [.04, .65], wobble: .6, medium: j % 2 ? 'crayon' : 'graphite' }); } }
    }
  };
  // ruts(p,{pts, w:[far,near]}) two wheel-worn lines and the grass ridge between
  W.ruts = function (p, o) { const C = landPal(o, o.d ?? .05), L = C.L, T = track(spline(o.pts, 8, false)), [w0, w1] = o.w || [8, 120], pw = o.power || 1.6; for (const sg of [-1, 1]) { const c = T.slice(0, 1, 30).map((q, i, a) => { const u = i / (a.length - 1), z = T.at(u), k = lerp(w0, w1, Math.pow(u, pw)) * .5 * sg * (1 + .08 * noise1(u * 6, 3)); return [z[0] - sin(z[2]) * k, z[1] + cos(z[2]) * k]; }), rb = ribbon(c, u => lerp(w0, w1, Math.pow(u, pw)) * .13 + 1, { step: 26, rough: 2.5, seed: sg + 3 }); p.mass(rb.poly, { sharp: true, color: mixc(C.earth, C.shade, .42), alpha: .75, dir: 1.2, size: .55, len: .6, vary: .45, soft: 3 }); found(p, sg > 0 ? rb.L : rb.R, { color: mixc(C.shade, L.ink, .4), w: 2, press: .42, seed: sg + 5, seg: 120, gap: .7, skip: .25, step: 30 }); found(p, sg > 0 ? rb.R : rb.L, { color: mixc(C.lit, L.sun, .5), w: 3.4, press: .4, seed: sg + 8, seg: 90, gap: .9, skip: .3, step: 30, medium: 'crayon' }); } };

  // ------------------------------------------------------------------ dry-stone wall, gate
  // wall(p,{line base polyline, h number|fn(u), size, d, light, season, seed, gapTo, snow, detail 0..1})
  W.wall = function (p, o) {
    const d = o.d ?? .1, L = lightOf(o.light), T = track(o.line.length > 2 ? spline(o.line, 6, false) : o.line), hf = typeof o.h === 'function' ? o.h : () => o.h || 120, R = rngOf(o.seed || 1), sz = o.size || 40, side = L.side, det = o.detail ?? 1;
    const st = c => seen(c, L, d), P = (s, v) => { const q = T.s(s); return [q[0] + .06 * v, q[1] - v]; };
    const m = Math.round(T.len / 40), top = [], bot = []; for (let i = 0; i <= m; i++) { const u = i / m, s = u * T.len, h = hf(u); top.push(P(s, h * (.93 + .05 * noise1(i * .8, 4)))); bot.push(P(s, -3)); }
    p.mass(top.concat(bot.slice().reverse()), { sharp: true, color: mixc(st('#4d4f4e'), L.shade, .35), dir: .1, len: .6, size: .7, vary: .3 });
    const tones = ['#b9b3a4', '#a09c92', '#87867f', '#b0a48c'].map(st), G = [[], [], [], []], edges = [];
    const hmax = max(hf(0), hf(.5), hf(1)), bin = max(6, sz * .16), N = Math.max(4, Math.ceil(T.len / bin)), prof = new Float32Array(N), under = [], capl = [];
    for (let i = 0; i < N; i++) prof[i] = 2 * R();
    const put = (i0, nb, base, hh, wob) => { // one stone, bedded on whatever is under it
      const s0 = i0 * bin + 1.4 + sz * .02, s1 = (i0 + nb) * bin - 1.4 - sz * .02, gp = 1.6 + sz * .018, v0 = base + gp * .4, v1 = base + hh - gp, w = s1 - s0, jt = k => (R() - .5) * k, c = min(w, hh) * (.16 + .14 * R()), tl = jt(hh * .16) * wob;
      const q = [P(s0 + jt(c), v0 + c * .9), P(s0 + c, v0 + jt(c * .4)), P(s0 + w * (.4 + .2 * R()), v0 + jt(c * .6)), P(s1 - c, v0 + tl * .4), P(s1 + jt(c * .6), v0 + c), P(s1 + jt(c * .8), v1 - c + tl), P(s1 - c * (.6 + .7 * R()), v1 + tl + jt(c * .4)), P(s0 + w * (.35 + .3 * R()), v1 + jt(c * .8)), P(s0 + c, v1 - tl + jt(c * .4)), P(s0 + jt(c * .7), v1 - c - tl)];
      G[R() * 4 | 0].push(q); if (w > sz * .3) { under.push([q[0], q[1], q[2], q[3], q[4], [lerp(q[3][0], q[6][0], .28), lerp(q[3][1], q[6][1], .28)], [lerp(q[2][0], q[7][0], .24), lerp(q[2][1], q[7][1], .24)], [lerp(q[1][0], q[8][0], .26), lerp(q[1][1], q[8][1], .26)]]); if (R() < .7) capl.push([q[9], q[8], q[7], q[6], q[5], [lerp(q[6][0], q[3][0], .24), lerp(q[6][1], q[3][1], .24)], [lerp(q[7][0], q[2][0], .22), lerp(q[7][1], q[2][1], .22)], [lerp(q[8][0], q[1][0], .22), lerp(q[8][1], q[1][1], .22)]]); if (R() < .42 * det) edges.push(q); }
    };
    for (let it = 0; it < 900; it++) {
      let bi = -1, bv = 1e9; for (let i = 0; i < N; i++) { const room = hf((i + .5) / N) * .93 - prof[i]; if (room > sz * .16 && prof[i] < bv) { bv = prof[i]; bi = i; } } if (bi < 0) break;
      const tol = sz * .13, want = Math.max(2, Math.round(sz * (.55 + 1.5 * R() * R() + .35 * R()) / bin)); let a = bi, e = bi + 1; while (a > 0 && bi - a < want * .3 && abs(prof[a - 1] - bv) < tol) a--; while (e < N && e - a < want && abs(prof[e] - bv) < tol) e++;
      const nb = e - a; let base = 0; for (let i = a; i < e; i++) base = max(base, prof[i]); const room = hf((a + nb / 2) / N) * .94 - base; let hh = min(room, sz * (.36 + .52 * R()) * (1 - .22 * base / hmax)); if (nb * bin < sz * .3) hh = min(hh, sz * .3); if (hh < sz * .1) { for (let i = a; i < e; i++) prof[i] = hf((i + .5) / N) * 2; continue; }
      put(a, nb, base, hh, nb * bin < sz ? 1 : .5); for (let i = a; i < e; i++) prof[i] = base + hh;
    }
    // the top: mostly long flat stones, some set on edge and leaning on their neighbours
    if (o.cope !== false) { let z = -R() * sz * .4; while (z < T.len) { const on = R() < .42, wv = on ? sz * (.26 + .26 * R()) : sz * (.7 + .9 * R()), u = clamp((z + wv / 2) / T.len), h0 = hf(u) * .9, hi = on ? sz * (.34 + .34 * R()) : sz * (.16 + .16 * R()), tl = on ? (R() - .3) * sz * .34 : 0, jt = k => (R() - .5) * k; const q = [P(z, h0), P(z + tl * .6 + jt(3), h0 + hi * .6), P(z + wv * .2 + tl, h0 + hi + jt(hi * .2)), P(z + wv * .7 + tl, h0 + hi * .96 + jt(hi * .2)), P(z + wv + tl * .7 + jt(3), h0 + hi * .55), P(z + wv - 1, h0 - 2)]; G[R() * 4 | 0].push(q); capl.push([q[1], q[2], q[3], q[4], [lerp(q[3][0], q[5][0], .3), lerp(q[3][1], q[5][1], .3)], [lerp(q[2][0], q[0][0], .3), lerp(q[2][1], q[0][1], .3)]]); if (R() < .6 * det) edges.push(q); z += wv * (.94 + .1 * R()); } }
    G.forEach((g, k) => { if (g.length) p.mass(poly(...g), { color: tones[k], dir: [.2, -.35, .6, 1.2][k], len: .5, size: .52, vary: .5 }); });
    if (under.length) p.mass(poly(...under), { color: mixc(st('#6c6c67'), L.shade, .3), alpha: .7, dir: .05, len: .45, size: .42, vary: .4 }); if (capl.length) p.mass(poly(...capl), { color: mixc(st('#d6cfbd'), L.sun, .3), alpha: .72, dir: -.1, len: .42, size: .4, vary: .4 });
    // light on the top faces, weight at the foot
    const lit = top.map(q => [q[0], q[1] - 2]).concat(top.slice().reverse().map(q => [q[0], q[1] + hmax * .3])); p.shade(lit, { color: L.sun, alpha: .3, soft: 10, mode: 'screen' });
    p.shade(bot.map(q => [q[0], q[1] - hmax * .42]).concat(bot.slice().reverse()), { color: L.shade, alpha: .5, soft: 18, mode: 'multiply' });
    const nL = min(edges.length, o.lines ?? 70); for (let i = 0; i < nL; i++) { const q = edges[Math.floor(i * edges.length / nL)], k = hash(i, 2, 4); ln(p, q.length < 10 ? (k < .5 ? q.slice(0, 3) : q.slice(3, 6)) : k < .55 ? [q[9], q[0], q[1], q[2], q[3]] : [q[5], q[4], q[3], q[2]], { color: mixc(L.ink, L.haze, d * .7), w: lerp(1, 2.2, hash(i, 1, 7)), press: .55, taper: [.25, .45], wobble: 1.4 }); if (k > .8 && q.length > 8) ln(p, [q[8], q[7], q[6]], { color: mixc(L.sun, '#f4ead2', .4), w: 3, press: .55, taper: [.3, .4], medium: 'crayon' }); }
    if (o.moss) { const M = []; for (let i = 0; i < o.moss; i++) { const s = R() * T.len, v = R() * hmax * .9, q = P(s, v); M.push(lump(q[0], q[1], 6 + R() * 16, 4 + R() * 8, i + 70, { n: 7, rough: .4 })); } p.mass(poly(...M), { color: seen('#8d9268', L, d), alpha: .75, dir: .4, size: .4, len: .4, vary: .5 }); }
    if (o.snow) { const c = top.map((q, i) => [q[0], q[1] - sz * (.2 + .35 * hash(i, 5, 5)) * o.snow]).concat(top.slice().reverse().map((q, i) => [q[0], q[1] + sz * .1 * o.snow * hash(i, 6, 6)])); p.mass(c, { color: mixc('#f3efe6', L.cl, .5), dir: 0, size: .7, vary: .2 }); }
    return { top, bot, at: (u, v) => P(u * T.len, v) };
  };
  // low wall seen far off: a worn ribbon with a lit top
  W.farWall = function (p, o) { const d = o.d ?? .4, L = lightOf(o.light), s = spline(o.line, 6, false), [w0, w1] = o.w || [3, 8], r = ribbon(s, u => lerp(w0, w1, u), { step: 14, rough: lerp(.6, 2, w1 / 12), seed: o.seed || 2 }); p.mass(r.poly, { sharp: true, color: seen('#8d8b82', L, d), dir: 0, size: .45, len: .5, vary: .5 }); found(p, r.L, { color: mixc(L.ink, L.haze, d), w: 2, press: .55, seed: o.seed || 2, seg: 60, gap: .4, step: 20 }); };
  // gate(p,{x,y,w,h,open 0..1 (swings away), light}) old five-bar between stone piers
  W.gate = function (p, o) {
    const L = lightOf(o.light), d = o.d ?? .05, { x, y } = o, w = o.w || 300, h = o.h || 150, op = clamp(o.open ?? 0), wood = seen('#8f8877', L, d), dk = mixc(seen('#5b564b', L, d), L.shade, .4), k = cos(op * 1.35), sk = sin(op * 1.35) * (o.swing ?? -60), P = (u, v) => [x + w * u * k, y - v * h + sk * u - 6 * u * (1 - v) * 0], sag = u => .05 * u;
    const bar = (u0, v0, u1, v1, b, c) => { const a = P(u0, v0 - sag(u0)), e = P(u1, v1 - sag(u1)), mx = [(a[0] + e[0]) / 2, (a[1] + e[1]) / 2 + 2]; const r = ribbon([a, mx, e], () => b, { step: 30, rough: .8, seed: u0 * 9 + v0 * 31 }); p.mass(r.poly, { color: c, dir: Math.atan2(e[1] - a[1], e[0] - a[0]), len: 1, size: .45, vary: .45 }); ln(p, r.R.length ? (r.L[0][1] > r.R[0][1] ? r.L : r.R) : r.L, { color: L.ink, w: 2.6, press: .6, taper: [.1, .2], wobble: 1.2 }); };
    bar(.02, -.02, .02, 1.02, h * .045, dk); bar(.98, .02, .98, .98, h * .035, dk);
    [.12, .3, .5, .72, .94].forEach((v, i) => bar(0, v, i === 3 ? .74 : 1, v + (hash(i, 2, 2) - .5) * .03, h * .026, i % 2 ? wood : mixc(wood, dk, .25)));
    bar(.04, .1, .96, .9, h * .024, mixc(wood, dk, .4));
    return { latch: P(.98, .72), top: P(.5, .94), hinge: P(0, .9) };
  };
  W.pier = function (p, o) { const { x, y } = o, w = o.w || 62, h = o.h || 200; return W.wall(p, Object.assign({ size: w * .52, lines: 22, cope: false, seed: 5 }, o, { line: [[x - w / 2, y], [x, y + 2], [x + w / 2, y]], h: u => h * (1 - .03 * u) })); };

  // ------------------------------------------------------------------ the glen (s02)
  const GLEN = {
    left: [[-80, 330], [60, 262], [170, 214], [300, 188], [392, 196], [470, 232], [560, 300], [640, 344], [740, 412], [840, 486], [930, 540], [1040, 590], [1140, 612]],
    right: [[780, 704], [900, 686], [1010, 650], [1120, 596], [1210, 560], [1300, 496], [1390, 452], [1480, 372], [1560, 330], [1640, 262], [1740, 214], [1830, 206], [1920, 236], [2000, 226]],
    near: [[-60, 700], [120, 722], [300, 770], [470, 836], [640, 902], [820, 952], [1040, 988], [1300, 1004], [1600, 1012], [1980, 1000]],
    road: [[1600, 306], [1560, 350], [1508, 384], [1540, 424], [1470, 468], [1396, 500], [1424, 548], [1360, 590], [1262, 618], [1278, 668], [1200, 712], [1096, 742], [1058, 786], [1110, 846], [1086, 918], [960, 990], [880, 1090]]
  };
  W.GLEN = GLEN;
  // glen(p,{season,light,colour,t,wind,part,callK,shadowX}) ; parts 'back','mid','front' ; opens its own layers unless layers:false
  W.glen = function (p, o = {}) {
    const light = o.light || 'day', L = lightOf(light), se = o.season ?? .3, col = o.colour ?? .5, part = o.part, ly = (n, s) => { if (o.layers !== false) p.layer('glen-' + n, s); }, t = o.t ?? p.t, base = { season: se, light, colour: col }, wind = o.wind || GLENWIND;
    if (!part || part === 'back') {
      ly('sky', { every: 6, still: true, depth: 0 }); W.sky(p, { mood: light, t, horizon: 600, drift: 0, clouds: o.clouds });
      W.hill(p, Object.assign({ d: .97, pts: [[-60, 470], [140, 452], [330, 470], [560, 440], [700, 418], [830, 396], [940, 408], [1040, 378], [1150, 404], [1270, 372], [1420, 400], [1980, 420]], base: 600, seed: 51, spurs: 4, rough: 4, hatch: 0 }, base));
      W.hill(p, Object.assign({ d: .8, pts: [[540, 548], [680, 520], [790, 502], [900, 516], [1000, 486], [1110, 500], [1230, 470], [1400, 500]], base: 612, seed: 52, spurs: 3, rough: 4, hatch: 0 }, base));
    }
    if (!part || part === 'mid') {
      ly('mid', { every: 5, still: !o.shadow && !o.moving, depth: .35 });
      const floorTop = [[-60, 640], [300, 600], [480, 584], [700, 574], [900, 570], [1100, 574], [1320, 590], [1980, 640]], C = landPal(base, .5);
      p.mass(below(ridge(floorTop, { amp: 2, seed: 4, step: 30 }), 1060), { sharp: true, color: { lin: [0, 570, 0, 900], stops: [[0, mixc(C.lit, L.haze, .5)], [.4, C.lit], [1, C.mid]] }, dir: .04, len: 1.5, size: 1, vary: .45 });
      W.lough(p, { x: 905, y: 596, rx: 250, ry: 17, light, seed: 7, n: 8 });
      W.hill(p, Object.assign({
        d: .56, pts: GLEN.left, base: [[-80, 830], [200, 800], [480, 770], [700, 730], [860, 690], [1000, 655], [1140, 630]], seed: 53, rough: 9, foot: mixc(C.mid, L.haze, .42),
        spurs: [{ x: 70, to: [-30, 620], w: 130, k: .8 }, { x: 262, to: [330, 560], w: 120, bow: -50, k: 1.1 }, { x: 392, to: [560, 690], w: 170, bow: -60, k: 1.1 }, { x: 560, to: [720, 610], w: 90, k: .8 }, { x: 640, to: [860, 660], w: 100, bow: -30 }, { x: 840, to: [980, 628], w: 60, k: .8 }]
      }, base));
      softFields(p, [[640, 700, 190, 26, -.16], [820, 664, 150, 16, -.1], [470, 800, 230, 34, -.2], [900, 742, 210, 28, -.12], [700, 850, 260, 34, -.1]], base, .46, 5);
      fieldWalls(p, [[[300, 842], [430, 800], [560, 770], [700, 742], [840, 716], [960, 688]], [[610, 872], [700, 820], [786, 772], [852, 728], [900, 694]], [[520, 762], [610, 744], [720, 738], [800, 746]], [[690, 704], [780, 692], [880, 684], [950, 670]], [[640, 664], [700, 694], [732, 734]]], base, .46, 3);
      W.hill(p, Object.assign({
        d: .4, pts: GLEN.right, base: [[780, 712], [940, 742], [1140, 800], [1400, 880], [1700, 960], [2000, 1010]], seed: 54, rough: 9, foot: mixc(C.mid, L.haze, .22), dir: -.42,
        spurs: [{ x: 1830, to: [1900, 600], w: 170, bow: -50, k: 1.1 }, { x: 1735, to: [1690, 640], w: 150, bow: 46 }, { x: 1560, to: [1600, 560], w: 110, k: .8 }, { x: 1476, to: [1330, 700], w: 120, bow: 40 }, { x: 1300, to: [1150, 720], w: 100, bow: 36, k: .9 }, { x: 1120, to: [1010, 720], w: 70, k: .7 }]
      }, base));
      softFields(p, [[1380, 770, 200, 30, .06], [1640, 830, 260, 40, .2], [1240, 850, 200, 30, -.02], [1820, 900, 220, 44, .24], [1560, 900, 220, 30, .1]], base, .34, 9);
      fieldWalls(p, [[[1150, 762], [1290, 744], [1430, 750], [1580, 778], [1760, 826], [1960, 874]], [[1210, 834], [1400, 830], [1600, 866], [1800, 926]], [[1432, 750], [1468, 700], [1512, 648], [1548, 600]], [[1580, 778], [1556, 832], [1500, 884], [1430, 930]], [[1764, 826], [1788, 764], [1800, 706]]], base, .34, 7);
      W.road(p, { pts: GLEN.road, w: [1.5, 17], power: 1.7, d: .38, light, season: se, colour: col, lw: 2 });
      // a few houses no bigger than a fingernail, and their smoke
      [[742, 662, 1], [1168, 640, .8], [632, 712, 1.2]].forEach((h, i) => tinyHouse(p, h[0], h[1], 15 * h[2], L, .45, i));
      W.sheep(p, { at: [[380, 760], [398, 768], [430, 752], [470, 774, 1.1], [505, 760], [1560, 800, 1.5], [1602, 812, 1.5], [1512, 826, 1.6], [1660, 790, 1.4]], s: 5, d: .4, light });
      if (o.shadow) W.cloudShadow(p, { x: o.shadow, w: 620, y0: 420, y1: 1000, seed: 3, light });
    }
    if (!part || part === 'front') {
      ly('front', { every: 2, depth: .85 });
      const rg = ridge(GLEN.near, { amp: 7, seed: 9, step: 22 }), C = landPal(base, .06);
      p.mass(below(rg, 1130), { sharp: true, color: { lin: [0, 700, 0, 1080], stops: [[0, mixc(C.mid, C.lit, .4)], [.5, C.mid], [1, mixc(C.dark, C.mid, .4)]] }, dir: .34, len: 1.2, size: 1, vary: .5 });
      p.mass(below(cut(rg, -60, 760).map(q => [q[0], q[1] + 120]), 1130), { sharp: true, color: C.dark, alpha: .5, dir: .5, len: 1, size: 1, vary: .5, soft: 18 });
      const bend = o.bend || wind;
      W.sward(p, Object.assign({ rg, depth: 330, n: 420, t, wind: bend, seed: 4, H: 22, d: .08 }, base));
      W.grass(p, Object.assign({ line: [[-40, 800], [240, 880], [560, 1000], [900, 1060], [1400, 1080], [1960, 1070]], n: 90, h: 84, depth: 60, t, wind: bend, seed: 6, d: 0, lines: 80 }, base));
      found(p, rg, { color: C.ink, w: 2.8, press: .5, seed: 3, seg: 150, gap: .7, skip: .3 });
      W.ground(p, Object.assign({ area: [-20, 900, 1000, 1080], dips: 3, stones: 5, tussocks: 7, seed: 12, t, wind: bend }, base));
      if (o.callK != null) W.combed(p, Object.assign({ rg, k: o.callK }, base));
    }
  };
  // combed: the pale side of the grass turned up where the call is passing over the near slope
  W.combed = function (p, o) { const C = landPal(o, .05), kk = o.k * 1.35 - .12, hx0 = 1920 * (1 - kk), rg = o.rg; if (hx0 > 2300) return; const n = o.n || 64; for (let i = 0; i < n; i++) { const a = hash(i, 5, 1), x = hx0 + 620 * Math.pow(a, 1.3) - 40, y = yAt(rg, clamp(x, -60, 1960)) + 14 + 260 * hash(i, 5, 2); if (x < -80 || x > 1990 || y > 1070) continue; const sl = (yAt(rg, clamp(x - 60, -60, 1960)) - yAt(rg, clamp(x + 20, -60, 1960))) / 80, l = (46 + 60 * hash(i, 5, 3)) * (1 - .6 * a), v = .4 + .6 * hash(i, 5, 2); p.line([[x, y], [x - l * .5, y - l * .5 * -sl - 6 * v], [x - l, y - l * -sl + 3]], { color: i % 4 ? mixc(C.sun, '#f6eed8', .35) : C.deep, w: i % 4 ? 4.5 * v + 1.5 : 2.6, press: .62 * (1 - a * .7), taper: [.15, .6], medium: i % 4 ? 'crayon' : 'graphite', wobble: .8 }); } };
  // ground seen across a valley: soft patches of other crops, and walls that rise and dip with it
  function softFields(p, list, base, d, sd) { const C = landPal(base, d), tn = [C.lit, C.dry, mixc(C.mid, C.dark, .4), mixc(C.lit, C.earth, .45), C.mid]; list.forEach((q, i) => p.mass(lump(q[0], q[1], q[2], q[3], i + sd, { n: 10, rough: .3, rot: q[4] }), { color: tn[i % 5], alpha: .55, dir: q[4] + .1 * (i % 3 - 1), len: .9, size: .8, vary: .4, soft: 7 })); }
  function fieldWalls(p, list, base, d, sd) { const C = landPal(base, d); list.forEach((w, i) => { const s = resample(spline(w, 8, false), 16).map(q => [q[0], q[1] + 3.5 * noise1(q[0] / 46, sd + i) + 2 * noise1(q[0] / 17, sd + i + 4)]); found(p, s, { color: mixc(C.ink, C.shade, .3), w: 1.9, press: .46, seed: sd + i, seg: 120, gap: .55, skip: .22, step: 22 }); found(p, s.map(q => [q[0] + 1, q[1] + 4]), { color: C.shade, w: 3.4, press: .3, seed: sd + i + 20, seg: 90, gap: .9, skip: .35, step: 24, medium: 'crayon' }); }); }
  const GLENWIND = W.gusts({ seed: 12, every: 2.3, power: .8 });
  function tinyHouse(p, x, y, s, L, d, i, lit) { const wl = mixc(seen('#efe9db', L, d), L.sun, .2), rf = seen('#8a8274', L, d); p.mass([[x - s, y], [x - s, y - s * .55], [x + s, y - s * .6], [x + s, y - s * .02]], { sharp: true, color: wl, dir: 0, size: .4, len: .5 }); p.mass([[x - s * 1.08, y - s * .5], [x - s * .82, y - s * 1.1], [x + s * .86, y - s * 1.12], [x + s * 1.1, y - s * .56]], { sharp: true, color: rf, dir: .1, size: .4, len: .5 }); ln(p, [[x - s * 1.05, y - s * .52], [x, y - s * .58], [x + s * 1.1, y - s * .57]], { color: mixc(L.ink, L.haze, d), w: 1.8, press: .6 }); ln(p, [[x - s, y - s * .5], [x - s, y]], { color: mixc(L.ink, L.haze, d), w: 1.6, press: .5 }); if (lit) p.mass([[x + s * .1, y - s * .42], [x + s * .42, y - s * .42], [x + s * .42, y - s * .14], [x + s * .1, y - s * .14]], { sharp: true, color: lit, size: .3 }); }
  W.tinyHouse = tinyHouse;

  // marchers(p,{k 0..1 where the head of the column is on the road, n, road pts, t, light, w, s}) tiny figures with pipers
  W.marchers = function (p, o = {}) {
    const T = track(spline(o.road || GLEN.road, 8, false)), n = o.n || 17, L = lightOf(o.light), t = o.t ?? p.t, hs = o.scale || 1.25, coat = [], kilt = [], head = [], d0 = o.d ?? .25, col = o.coat || '#4d565c';
    const legs = [], pipes = [], packs = [];
    let u = o.k ?? .6; const beat = t * (o.tempo || 1.85);
    for (let i = 0; i < n; i++) {
      if (u < .01) break; const q = T.at(u), gone = u > .995, s = hs * lerp(9, 48, Math.pow(u, 1.7)); if (gone) { u -= .012 + u * .012; continue; }
      const ph = beat + hash(i, 1, 1) * .18 + (i % 2) * .0, st = Math.floor(((ph % 1) + 1) % 1 * 4), bob = [0, -.05, 0, -.05][st] * s, x = q[0] + (i % 2 ? 1 : -1) * s * .22, y = q[1] + (i % 2 ? .12 : 0) * s, f = cos(q[2]) >= 0 ? 1 : -1, sw = [1, .25, -1, -.25][st] * s * .2, lean = f * s * .05, piper = i === 0 || i === 1 || i === 4;
      const hy = y - s * .46 + bob; // hip
      coat.push([[x - s * .11, hy], [x - s * .13 + lean, hy - s * .3], [x - s * .05 + lean, hy - s * .37], [x + s * .08 + lean, hy - s * .36], [x + s * .14 + lean, hy - s * .28], [x + s * .12, hy]]);
      kilt.push([[x - s * .12, hy - s * .05], [x + s * .13, hy - s * .05], [x + s * .16, hy + s * .15], [x - s * .15, hy + s * .15]]);
      head.push(lump(x + lean * 1.2, hy - s * .45, s * .075, s * .095, i + 3, { n: 7, rough: .1 }));
      if (s > 9) { legs.push([[x - s * .04, hy + s * .1], [x - s * .05 + sw * .6, hy + s * .28 - abs(bob)], [x - s * .05 + sw, y]]); legs.push([[x + s * .05, hy + s * .1], [x + s * .05 - sw * .6, hy + s * .28], [x + s * .05 - sw, y]]); }
      if (piper && s > 8) { pipes.push([[x + f * s * .04, hy - s * .3], [x - f * s * .1, hy - s * .52], [x - f * s * .2, hy - s * .78]]); pipes.push([[x + f * s * .1, hy - s * .28], [x + f * s * .02, hy - s * .5], [x - f * s * .03, hy - s * .74]]); packs.push(lump(x + f * s * .13, hy - s * .2, s * .11, s * .09, i, { n: 7 })); } else if (s > 14) packs.push([[x - f * s * .11, hy - s * .3], [x - f * s * .24, hy - s * .28], [x - f * s * .23, hy - s * .08], [x - f * s * .1, hy - s * .06]]);
      u -= (o.gap || .017) * (.75 + .5 * hash(i, 6, 1)) * lerp(1, 1.35, u);
    }
    const c = seen(col, L, d0); if (!coat.length) return;
    p.mass(poly(...coat), { color: c, dir: 1.4, size: .35, len: .4, vary: .3 }); p.mass(poly(...kilt), { color: mixc(c, seen('#7c7a5e', L, d0), .55), dir: 1.5, size: .3, len: .3 }); p.mass(poly(...head), { color: seen('#b99c82', L, d0), dir: 0, size: .3, len: .3 }); if (packs.length) p.mass(poly(...packs), { color: mixc(c, '#6d5f4c', .5), dir: .4, size: .3, len: .3 });
    legs.forEach((l, i) => ln(p, l, { color: mixc(L.ink, L.haze, .12), w: max(1.5, hs * 2.6), press: .75, taper: [.05, .2], wobble: .5 })); pipes.forEach(l => ln(p, l, { color: L.ink, w: max(1.4, hs * 2), press: .8, taper: [.05, .1], wobble: .4 }));
  };

  // callLines(p,{k 0..1, paths, n strands, light, spread, curl}) the pipes as rushing pencil lines, hill to hill
  const CALL = [
    [[1660, 250], [1500, 210], [1320, 300], [1150, 430], [960, 470], [760, 420], [560, 300], [380, 170], [200, 90], [-80, 70]],
    [[1690, 290], [1560, 330], [1400, 470], [1200, 600], [980, 640], [740, 640], [480, 600], [220, 620], [40, 700], [-120, 800]],
    [[1640, 270], [1520, 420], [1420, 620], [1240, 800], [1000, 900], [760, 920], [480, 880], [200, 840], [-120, 900]]];
  W.CALL = CALL;
  W.callLines = function (p, o = {}) {
    const k = clamp(o.k ?? .5, 0, 1.5), L = lightOf(o.light), t = o.t ?? p.t, paths = o.paths || CALL, n = o.n || 11, tail = o.tail ?? .36, sp = o.spread ?? 52, al = o.alpha ?? 1, chalk = o.chalk || '#f5ecd9', blue = o.blue || mixc(BLUEPENCIL, L.ink, .15), gr = mixc(L.ink, BLUEPENCIL, .3);
    paths.forEach((path, a) => {
      const T = track(spline(path, 10, false)), kk = k * 1.4 - a * .1; if (kk <= 0) return;
      const strand = (u0, u1, off, seed, fl) => { const m = max(4, Math.ceil((u1 - u0) * T.len / 70)), pts = []; for (let j = 0; j <= m; j++) { const u = lerp(u0, u1, j / m), q = T.at(u), pinch = .22 + 1.05 * Math.pow(sin(PI * clamp(u * .94 + .04)), 1.2), w = off * pinch + sp * fl * fbm(u * 3.4 - t * .9 + seed * .17, a * 7 + 3, 2) + sp * .18 * noise1(u * 13 - t * 2.4 + seed, a + 5); pts.push([q[0] - sin(q[2]) * w, q[1] + cos(q[2]) * w, .45 + .55 * sin(PI * Math.pow(j / m, .8))]); } return pts; };
      // the body of the wind: side of the chalk
      for (let i = 0; i < 4; i++) { const h = kk - .02 - .09 * i, u1 = clamp(h), u0 = clamp(h - tail * (1.1 + .3 * hash(i, a, 41))); if (u1 - u0 < .03) continue; p.line(strand(u0, u1, (i - 1.5) * sp * .62, i + 60, .5), { color: i % 2 ? chalk : mixc(blue, chalk, .55), w: [30, 22, 36, 18][i], press: [.36, .3, .28, .34][i], taper: [.5, .3], wobble: 2, medium: 'crayon', alpha: al }); }
      for (let i = 0; i < n; i++) {
        const h = kk - .34 * hash(i, a, 1) * hash(i, a, 11) - .012 * i + .03, tl = tail * (.45 + 1.1 * hash(i, a, 2)), u1 = clamp(h), u0 = clamp(h - tl); if (u1 - u0 < .015 || u0 >= 1) continue; const off = (i - (n - 1) / 2) * sp * .36 + (hash(i, a, 3) - .5) * sp * .9, pts = strand(u0, u1, off, i, .75);
        if (i % 4 === 1 && u1 < 1 && o.curl !== 0) { const q = pts[pts.length - 1], z = pts[pts.length - 2], an = Math.atan2(q[1] - z[1], q[0] - z[0]), r = 26 + 34 * hash(i, a, 5), sg = hash(i, a, 6) < .5 ? 1 : -1; for (let j = 1; j <= 6; j++) { const b = an + sg * j * .72, e = pts[pts.length - 1]; pts.push([e[0] + cos(b) * r * (1 - j * .12), e[1] + sin(b) * r * (1 - j * .12), .6 - j * .07]); } }
        const kd = hash(i, a, 8), st = kd < .5 ? { color: gr, w: 4.4, press: .92 } : kd < .74 ? { color: chalk, w: 6, press: .85, medium: 'crayon' } : { color: blue, w: 5, press: .9 }; p.line(pts, Object.assign({ taper: [.5, .16], wobble: 1.3, alpha: al }, st));
      }
      // what runs ahead of it: quick straight flicks, gone in a drawing
      if (kk < 1) for (let i = 0; i < 6; i++) { const r = p.rnd(i, a, 1), u = kk - .07 + .1 * r, l = .035 + .04 * p.rnd(i, a, 2), off = (i - 2.5 + p.rnd(i, a, 3)) * sp * .62; if (u + l > 1 || u < 0) continue; const A0 = T.at(u), B0 = T.at(u + l), pin = .3 + sin(PI * u); p.line([[A0[0] - sin(A0[2]) * off * pin, A0[1] + cos(A0[2]) * off * pin], [B0[0] - sin(B0[2]) * off * pin, B0[1] + cos(B0[2]) * off * pin]], { color: i % 3 ? gr : chalk, w: i % 3 ? 2.6 : 5, press: .75, taper: [.3, .5], medium: i % 3 ? 'graphite' : 'crayon', wobble: .5, alpha: al }); }
    });
  };
  // callSky(p,{k}) the clouds over the glen combed out along the first line of the call
  W.callSky = function (p, o = {}) { const k = clamp(o.k ?? .5, 0, 1.4), L = lightOf(o.light), T = track(spline(o.path || [[1700, 190], [1400, 150], [1080, 230], [760, 200], [420, 90], [-120, 40]], 10, false)); for (let i = 0; i < 7; i++) { const kk = k * 1.4 - .05 * i - .06; if (kk <= 0) continue; const u1 = clamp(kk), u0 = clamp(kk - .42 - .2 * hash(i, 2, 2)); if (u1 - u0 < .04) continue; const m = 8, A0 = [], B0 = [], off = (i - 3) * 34 + 20 * hash(i, 3, 3); for (let j = 0; j <= m; j++) { const u = lerp(u0, u1, j / m), q = T.at(u), w = off + 16 * noise1(u * 7, i), th = (7 + 13 * hash(i, 4, 4)) * sin(PI * j / m); A0.push([q[0] - sin(q[2]) * (w - th), q[1] + cos(q[2]) * (w - th)]); B0.push([q[0] - sin(q[2]) * (w + th), q[1] + cos(q[2]) * (w + th)]); } p.mass(A0.concat(B0.reverse()), { color: i % 3 === 1 ? mixc(L.cs, L.mid, .4) : mixc(L.cl, '#fbf4e4', .3), alpha: .8, dir: Math.atan2(T.at(u1)[1] - T.at(u0)[1], T.at(u1)[0] - T.at(u0)[0]), len: 1.2, size: .6, vary: .3, soft: 5 }); } };
  // how hard the call is bending the grass at x now (same k as callLines); feed to grass as wind
  W.callWind = function (k, under) { const g = windOf(under || CALM), f = (t, x, y) => { const h = 1 - x / 1920, kk = k * 1.35 - .12, q = kk - h; return g(t, x, y) * .6 - (q > 0 ? 1.35 * ease.out(clamp(q / .12)) * (1 - .55 * clamp((q - .2) / .5)) : 0); }; f._s = 1; return f; };
  // ------------------------------------------------------------------ fire, lamp, smoke
  // fire(p,{x,y base centre,w,h,k 0 embers..1 full,t,seed,turf}) drawn licks, each with its own short life
  W.fire = function (p, o) {
    const { x, y } = o, w = o.w || 150, h = o.h || 150, k = clamp(o.k ?? 1, 0, 1.3), t = o.t ?? p.t, sd = o.seed || 1, n = o.n || 9;
    if (o.turf !== false) { // sods stacked on end
      [[-.42, 0, .3, .2, -.2], [.4, .0, .32, .2, .25], [-.14, -.05, .26, .24, .5], [.16, -.06, .26, .26, -.4], [0, .02, .5, .16, 0]].forEach((s, i) => p.mass(lump(x + s[0] * w, y + s[1] * h - .05 * h, s[2] * w, s[3] * h * .7, sd * 7 + i, { n: 8, rough: .16, rot: s[4] }), { color: mixc('#3a3330', '#5c4436', k * .5 + .2 * hash(i, 2, 2)), dir: s[4] + .3, size: .5, len: .5, vary: .4 }));
      for (let i = 0; i < 9; i++) { const a = x + (hash(i, sd, 4) - .5) * w * .95, b = y - h * .16 * hash(i, sd, 5), f = .5 + .5 * noise1(t * (2 + i * .3), i + sd); ln(p, [[a - 9, b], [a, b - 4 * hash(i, 1, 1)], [a + 8 + 8 * hash(i, 2, 1), b + 2]], { color: mixc('#a4582c', '#f0b55a', f), w: 4 + 3 * f, press: .35 + .6 * f * (.4 + .6 * max(k, .35)), taper: [.2, .4], medium: 'crayon', wobble: .6 }); }
    }
    if (k < .06) return;
    p.mass(lump(x, y - h * .34, w * .72, h * .56 * k, 5 + sd, { rough: .16 }), { color: { rad: [x, y - h * .2, w * .8], stops: [[0, 'rgba(236,160,74,.75)'], [.5, 'rgba(206,118,52,.34)'], [1, 'rgba(160,84,40,0)']] }, alpha: min(1, k), dir: -1.5, size: .8, len: .7, vary: .4, soft: 10 });
    const L = [[], [], []];
    for (let j = 0; j < n; j++) {
      const T = .42 + .4 * hash(j, sd, 1), c = t / T + hash(j, sd, 2), gen = Math.floor(c), a = c - gen, q0 = gen * 13 + j, u = n > 1 ? (j + .5) / n - .5 : 0, ctr = 1 - abs(u) * 1.35, bx = x + u * w * .86 + (hash(q0, 3, sd) - .5) * w * .14, H = h * k * (.52 + .42 * hash(q0, 4, sd)) * (.36 + .74 * ctr), grow = a < .3 ? .35 + .65 * ease.out(a / .3) : 1, die = a > .58 ? (a - .58) / .42 : 0, sg = hash(q0, 5, sd) < .5 ? -1 : 1, sway = sg * w * (.07 + .13 * hash(q0, 8, sd)) + w * .09 * noise1(t * 2.7 + j, 8 + sd) - u * w * .5, bw = w * (.1 + .05 * hash(q0, 6, sd)) * (1 - die * .7);
      const y0 = y - h * .04 - die * H * .34, hh = H * grow * (1 - .15 * die), mk = (q, hk) => { const tip = [bx + sway * 1.15 * hk, y0 - hh * hk], a1 = [bx - sway * .5, y0 - hh * .26 * hk], a2 = [bx + sway * .2, y0 - hh * .56 * hk], a3 = [bx + sway * .95, y0 - hh * .8 * hk]; return [[bx - bw * .8 * q, y0], [a1[0] - bw * 1.3 * q, a1[1]], [a2[0] - bw * .9 * q, a2[1]], [a3[0] - bw * .34 * q, a3[1]], tip, [a3[0] + bw * .3 * q, a3[1] + hh * .05], [a2[0] + bw * .8 * q, a2[1] + hh * .04], [a1[0] + bw * 1.25 * q, a1[1] + hh * .03], [bx + bw * .85 * q, y0]]; };
      L[0].push(spline(mk(1, 1), 4, true)); if (a < .85) L[1].push(spline(mk(.72, .74), 4, true)); if (ctr > .3 && a < .7) L[2].push(spline(mk(.46, .42), 4, true));
      if (a > .58 && hash(q0, 9, sd) < .75) { const z = (a - .58) / .42, fx = bx + sway * (1.1 + z * .9), fy = y0 - hh * (1.02 + .3 * z), f = bw * .55 * (1 - z); L[0].push(spline([[fx - f, fy + 10 * (1 - z)], [fx - f * .5 + sway * .1, fy - 10 * (1 - z)], [fx + sway * .16, fy - 24 * (1 - z) - 4], [fx + f * .8, fy - 2]], 4, true)); } // torn-off lick
    }
    [['#bd6f35', .85], ['#e4a24c', .92], ['#f7e0a4', .95]].forEach((c, i) => { if (L[i].length) p.mass(poly(...L[i]), { color: c[0], alpha: c[1], dir: -PI / 2, len: .55, size: .46, vary: .45 }); });
    for (let j = 0; j < 4; j++) { const c = t * 1.1 + hash(j, sd, 21), g = Math.floor(c), a = c - g; if (hash(g, j, 22) < .45 * k) { const sx = x + (hash(g, j, 23) - .5) * w * .6 + 24 * noise1(a * 3, j), sy = y - h * (.5 + a * 1.1); ln(p, [[sx, sy], [sx + 3, sy - 7]], { color: '#f1bd66', w: 3, press: .9 * (1 - a), taper: [0, .5] }); } }
  };
  // firelight over the whole sheet; call last. k 0..1 strength of fire, dark = colour of the dark
  W.firelight = function (p, o) { const t = o.t ?? p.t, f = 1 + .035 * noise1(t * 2.6, 3) + .03 * noise1(t * 6.1, 5), k = clamp(o.k ?? 1), r = (o.r || 1500) * f * lerp(.55, 1, k), dk = o.dark || '#3a3a4a'; p.air({ rad: [o.x, o.y, r], stops: [[0, o.warm || '#fff0cf'], [.26, '#f3d3a0'], [.5, mixc('#d8a874', dk, .28)], [.78, mixc('#a77f62', dk, .72)], [1, dk]], alpha: o.alpha ?? .86, mode: 'multiply' }); };
  W.lamp = function (p, o) { // oil lamp: brass foot, glass, one flame
    const { x, y } = o, s = o.scale || 1, k = o.k ?? 1, t = o.t ?? p.t, f = k * (1 + .06 * noise1(t * 2.2, 4)); const q = (a, b) => [x + a * s, y + b * s];
    if (k > .05) { p.mass(lump(x, y - 66 * s, 150 * s * f, 130 * s * f, 4, { rough: .2 }), { color: { rad: [x, y - 66 * s, 150 * s * f], stops: [[0, 'rgba(250,226,166,.85)'], [.35, 'rgba(240,198,124,.4)'], [1, 'rgba(217,167,97,0)']] }, dir: { to: [x, y - 66 * s] }, len: .7, size: .7, vary: .3, soft: 8 }); }
    p.mass([q(-22, 0), q(-17, -12), q(-6, -16), q(-8, -26), q(-16, -34), q(-12, -44), q(12, -44), q(16, -34), q(8, -26), q(6, -16), q(17, -12), q(22, 0)], { color: '#8a7442', dir: .2, size: .4, len: .4 });
    p.mass([q(-11, -44), q(-15, -60), q(-8, -78), q(-6, -96), q(6, -96), q(8, -78), q(15, -60), q(11, -44)], { color: '#eadfc0', alpha: .6, dir: 1.5, size: .4, len: .5 });
    if (k > .05) p.mass([q(-5, -48), q(-6, -58), q(1, -78 - 6 * (f - 1) * 10), q(6, -58), q(4, -48)], { color: '#fbeab4', dir: -1.5, size: .35, len: .4 });
    ln(p, [q(-11, -44), q(-15, -60), q(-8, -78), q(-6, -97)], { w: 2.2 * s, press: .6 }); ln(p, [q(11, -44), q(15, -60), q(8, -78), q(6, -96)], { w: 2 * s, press: .45 }); ln(p, [q(-22, 0), q(-17, -12), q(-6, -16), q(-8, -26), q(-16, -34)], { w: 2.4 * s, press: .7 });
  };
  // smoke(p,{x,y,h,k,wind,t,w,light}) turf smoke: a leaning ribbon that thickens, tears and thins
  W.smoke = function (p, o) {
    const { x, y } = o, h = o.h || 260, w = o.w || 16, t = o.t ?? p.t, k = o.k ?? 1, L = lightOf(o.light), g = windOf(o.wind), c = o.color || mixc(L.cs, L.ink, .22), sd = o.seed || 1, n = 11, rise = o.rise || 60; if (k < .03) return;
    const pos = (u, j = 0) => { const age = u * h / rise, b = g(t - age * .5, x, y); return [x + (.14 + b * .42) * u * u * h + (5 + 30 * u) * (w / 16) * noise1(u * 2.4 - t * .55 + j, sd), y - u * h * (1 - .22 * abs(b) * u)]; };
    for (let j = 0; j < 2; j++) { const P = []; for (let i = 0; i <= n; i++) P.push(pos(i / n, j * .4)); const r = ribbon(P, u => w * (.3 + 2.2 * u * (1 - .3 * u)) * (1 + .4 * noise1(u * 5 - t * .9 + j * 3, sd + 2)) * (j ? .5 : 1) * (1 - ss(.75, 1, u) * .7), { step: 18 }); p.mass(r.poly, { sharp: true, color: { lin: [x, y, x + 10, y - h], stops: [[0, rgba(c, j ? .75 : .5)], [.55, rgba(c, j ? .42 : .3)], [1, rgba(c, 0)]] }, alpha: k, dir: -1.3, len: .9, size: .75, vary: .5, soft: 6 }); }
    for (let j = 0; j < 4; j++) { const u0 = ((t * .2 + j * .29 + hash(j, sd, 1)) % 1) * .8, pts = []; for (let i = 0; i <= 5; i++) { const u = clamp(u0 + i * .05), q = pos(u, j); pts.push([q[0] + (j - 1.5) * w * (.3 + .9 * u), q[1]]); } p.line(pts, { color: mixc(c, L.ink, .35), w: 2.4, press: .42 * k * (1 - u0), taper: [.4, .5], wobble: 1 }); }
  };

  // ------------------------------------------------------------------ cottage
  // cottage(p,{x,y near corner on the ground, scale, state:'lived'|'night'|'ruin', door 0..1, window 0..1 light, smoke 0..1, light, season, t, flip})
  W.cottage = function (p, o) {
    const s = o.scale || 1, f = o.flip ? -1 : 1, X = (a, b) => [o.x + a * s * f, o.y + b * s], st = o.state || 'lived', ruin = st === 'ruin', night = st === 'night', L = lightOf(o.light || (night ? 'night' : 'day')), d = o.d ?? .12, t = o.t ?? p.t, se = o.season ?? .3, C = landPal({ light: L, season: se, colour: o.colour ?? .5 }, d), lw = v => max(1.3, v * Math.pow(s, .6)), K = (o.k ?? 1);
    const P = (u, v) => X(440 * u + 1.5 * sin(u * 9), lerp(-34 * u, -132 + 13 * u, v)), G = (u, v) => X(-132 * u, lerp(-30 * u, -132 + 10 * u, v)); // front wall, gable wall
    const wl = seen(ruin ? '#c3bcac' : '#ece5d6', L, d), wsh = mixc(seen('#a9adaa', L, d), L.shade, ruin ? .4 : .28), thatch = seen(ruin ? '#8f8770' : '#b39d72', L, d), td = mixc(seen('#75684d', L, d), L.shade, .35), dk = mixc(L.ink, L.shade, .25), gableLit = L.side < 0 ? f > 0 : f < 0, win = o.window ?? (night ? 1 : 0);
    const warm = k => mixc('#5d4a35', '#f2c877', clamp(k));
    // ground shadow
    p.mass([X(-160, -26), X(0, 6), X(220, 0), X(470, -32), X(540, -16), X(240, 26), X(-10, 30), X(-190, 2)], { color: mixc(C.dark, C.mid, .35), alpha: .6, dir: .03, len: .9, size: .6, vary: .5, soft: 9 });
    // gable
    p.mass([X(0, 2), X(1, -132), X(-60, -216), X(-134, -122), X(-133, -28)], { sharp: true, color: gableLit ? wl : wsh, dir: 1.3, len: .8, size: .75, vary: .35 });
    if (!gableLit) hx(p, [X(0, 2), X(1, -132), X(-60, -216), X(-134, -122), X(-133, -28)], { color: mixc(L.shade, L.ink, .25), dir: 1.15, gap: 11 * s + 3, len: 60 * s, w: lw(1.8), press: .32, curve: .1 });
    // front
    p.mass([P(0, -.02), P(.35, -.01), P(.7, 0), P(1, 0), P(1, 1), P(.5, 1), P(0, 1)], { sharp: true, color: gableLit ? mixc(wl, wsh, .55) : wl, dir: .05, len: .9, size: .75, vary: .35 });
    p.shade([P(0, .74), P(.5, .72), P(1, .74), P(1, 1.02), P(0, 1.02)], { color: L.shade, alpha: .38, soft: 5 * s, mode: 'multiply' }); p.shade([P(0, 0), P(1, 0), P(1, .2), P(.5, .14), P(0, .2)], { color: C.dark, alpha: .35, soft: 8 * s, mode: 'multiply' });
    if (ruin) { const g = []; for (let i = 0; i < 15; i++) { const u = hash(i, 4, 1), v = hash(i, 4, 2) * .9; if (u > .38 && u < .56) continue; const q = P(u, v); g.push(lump(q[0], q[1], (10 + 14 * hash(i, 4, 3)) * s, (6 + 7 * hash(i, 4, 4)) * s, i, { n: 8 })); } p.mass(poly(...g), { color: seen('#8b887d', L, d), dir: .1, size: .5, len: .5, vary: .5 }); }
    else { for (let i = 0; i < 5; i++) { const q = P(.08 + .86 * hash(i, 5, 1), .15 + .6 * hash(i, 5, 2)); ln(p, [[q[0] - 14 * s, q[1]], [q[0], q[1] - 3 * s], [q[0] + 16 * s, q[1] + s]], { color: wsh, w: lw(2.4), press: .35, taper: [.4, .5], medium: 'crayon' }); } }
    // openings
    const hole = (u0, u1, v0, v1, c) => p.mass([P(u0, v0), P(u0, v1), P(u1, v1), P(u1, v0)], { sharp: true, color: c, dir: 1.5, size: .4, len: .5, vary: .3 });
    [[.15, .245, .36, .72], [.7, .775, .36, .72]].forEach((w, i) => {
      hole(w[0], w[1], w[2], w[3], win > .05 && (o.lit == null || o.lit === i || o.lit === 'all') ? warm(win) : mixc(dk, L.shade, .4));
      const a = P(w[0], w[2] - .03), b = P(w[1], w[2] - .03); ln(p, [a, b], { color: wl, w: lw(5), press: .8, taper: [.05, .1], medium: 'crayon' }); if (!ruin) { ln(p, [P((w[0] + w[1]) / 2, w[2]), P((w[0] + w[1]) / 2, w[3])], { color: win > .3 ? '#6b512f' : wl, w: lw(2), press: .7 }); ln(p, [P(w[0], (w[2] + w[3]) / 2), P(w[1], (w[2] + w[3]) / 2)], { color: win > .3 ? '#6b512f' : wl, w: lw(2), press: .7 }); } bx(p, [P(w[0], w[2]), P(w[0], w[3]), P(w[1], w[3]), P(w[1], w[2])], { color: dk, w: lw(2.2), press: .7, wobble: 1.2 });
    });
    const du = [.43, .53], op = clamp(o.door ?? (ruin ? .6 : 0));
    hole(du[0], du[1], 0, .75, op > .05 ? (win > .3 || o.warm ? mixc('#4a3a2c', '#e0ad62', o.warm ?? win * .8) : mixc(dk, '#4b463f', .4)) : seen('#6f827e', L, d));
    if (op > .05) { const u1 = lerp(du[1], du[0] + .025, op); hole(du[0], u1 - (ruin ? .012 : 0), ruin ? -.04 : 0, .75, seen(ruin ? '#7e8580' : '#6f827e', L, d)); ln(p, [P(u1, 0), P(u1, .75)], { color: dk, w: lw(2.4), press: .8 }); }
    bx(p, [P(du[0], 0), P(du[0], .76), P(du[1], .755), P(du[1], 0)], { color: dk, w: lw(2.6), press: .75, wobble: 1.2 }); if (op < .3 && !ruin) ln(p, [P(du[0], .4), P(du[1], .39)], { color: dk, w: lw(2), press: .6 });
    p.mass([P(du[0] - .02, -.03), P(du[1] + .02, -.03), P(du[1] + .03, -.09), P(du[0] - .03, -.1)], { color: seen('#b6b0a2', L, d), dir: 0, size: .5, len: .5 });
    // roof: ridge, eave, verge. in ruin the middle is gone and the rafters stand out
    const R = (u, v) => X(lerp(-8 + 456 * u, -62 + 462 * u, v), lerp(-120 + 10 * u + 5 * sin(u * 7) * (ruin ? 1.6 : 1), -222 + 46 * u + (ruin ? 16 : 7) * sin(PI * u) + 2 * sin(u * 11), v)), rdir = f > 0 ? 1.07 : PI - 1.07, rg = { lin: [...X(0, -222), ...X(0, -110)], stops: [[0, mixc(thatch, L.sun, gableLit ? .05 : .28)], [.6, thatch], [1, mixc(thatch, td, .5)]] };
    const eave = (a, b, v = 0) => { const z = []; for (let i = 0; i <= 10; i++) { const u = lerp(a, b, i / 10), q = R(u, v); z.push([q[0], q[1] + (2.5 * noise1(u * 22, 3) + 2) * s]); } return z; }, line = (a, b, v) => { const z = []; for (let i = 0; i <= 8; i++) z.push(R(lerp(a, b, i / 8), v)); return z; };
    if (!ruin) {
      p.mass(eave(-.01, 1.01, -.03).concat(line(-.01, 1, 1).reverse()), { sharp: true, color: rg, dir: rdir, len: .9, size: .7, vary: .5 });
      p.mass([X(-62, -224), X(-8, -118), X(-22, -112), X(-64, -202)], { sharp: true, color: td, dir: rdir, size: .5, len: .6 }); p.mass([X(-60, -224), X(-146, -108), X(-134, -106), X(-58, -206)], { sharp: true, color: mixc(td, thatch, .3), dir: 2.1, size: .5, len: .6 });
      hx(p, eave(0, 1, 0).concat(line(0, 1, .96).reverse()), { color: td, dir: rdir, gap: 13 * s + 2, len: 44 * s, w: lw(1.8), press: .36, curve: .1 });
      [.3, .74].forEach((v, i) => found(p, line(.01, .99, v).map((q, z) => [q[0], q[1] + (2 + 1.5 * noise1(z * 1.3, i)) * s]), { color: td, w: lw(1.1), press: .34, seed: i + 4, seg: 120 * s, gap: .6, skip: .2, step: 24 * s })); for (let i = 0; i < 5; i++) { const u = .05 + .88 * hash(i, 12, 1), v = .15 + .6 * hash(i, 12, 2), q = R(u, v); p.mass(lump(q[0], q[1], (26 + 26 * hash(i, 12, 3)) * s, (12 + 10 * hash(i, 12, 4)) * s, i + 3, { n: 9, rough: .35, rot: rdir }), { color: i % 2 ? mixc(thatch, td, .35) : mixc(thatch, L.sun, .4), alpha: .5, dir: rdir, len: .7, size: .5, vary: .5, soft: 4 }); } for (let i = 0; i < 16; i++) { const u = .02 + .96 * hash(i, 13, 1), q = R(u, -.03), q2 = R(u - .004, .07); ln(p, [q2, [(q[0] + q2[0]) / 2 + 1, (q[1] + q2[1]) / 2], [q[0] + 1, q[1] + 4 * s]], { color: i % 3 ? td : mixc(thatch, L.sun, .4), w: lw(1.3), press: .5, taper: [.2, .5] }); }
      ln(p, line(0, 1, 1), { color: dk, w: lw(3), press: .62, wobble: 1.4, taper: [.08, .2] }); ln(p, eave(0, 1, -.03), { color: dk, w: lw(3), press: .7, wobble: 1.4, taper: [.06, .2] }); ln(p, [X(-62, -224), X(-104, -166), X(-146, -108)], { color: dk, w: lw(2.8), press: .6, wobble: 1.2 }); ln(p, [X(-62, -224), X(-34, -172), X(-8, -118)], { color: dk, w: lw(2.4), press: .55, wobble: 1.2 });
    } else {
      p.mass([R(.1, 0), R(.2, 1), R(.95, .95), R(.9, 0)], { color: mixc(dk, '#4d4a45', .3), dir: .2, size: .7, len: .8, vary: .4 });
      p.mass(line(.0, .27, -.02).concat([R(.25, .25), R(.3, .42), R(.22, .62), R(.24, .82), R(.16, 1)], line(0, .14, 1).reverse()), { sharp: true, color: rg, dir: rdir, len: .8, size: .7, vary: .6 });
      p.mass([R(.74, -.04), R(1, -.02), R(1, .96), R(.9, .8), R(.86, .5), R(.79, .34)], { sharp: true, color: mixc(thatch, td, .3), dir: rdir, len: .8, size: .7, vary: .6 });
      for (let i = 0; i < 8; i++) { const u = .25 + i * .075 + .02 * hash(i, 7, 7), v1 = i === 3 || i === 5 ? .55 : .98, dr = (i === 3 ? .06 : i === 5 ? -.08 : 0); const a = R(u, -.02), b = R(u + dr, v1); p.mass(ribbon([a, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 3 * s], b], () => 3.2 * s, { step: 20, rough: .6 }).poly, { color: seen('#57504a', L, d), dir: rdir, size: .35, len: .6 }); }
      ln(p, line(.12, .95, 1).map((q, i) => [q[0], q[1] + (i % 3) * 2 * s]), { color: dk, w: lw(5), press: .8, wobble: 2 }); ln(p, eave(0, .28, -.02), { color: dk, w: lw(2.8), press: .65 }); ln(p, eave(.74, 1, -.02), { color: dk, w: lw(2.8), press: .65 }); ln(p, [X(-62, -224), X(-104, -166), X(-146, -108)], { color: dk, w: lw(2.6), press: .6 });
      const ms = []; for (let i = 0; i < 9; i++) { const q = P(.3 + .45 * hash(i, 8, 1), 1.0); ms.push(lump(q[0], q[1] - 2 * s, (9 + 8 * hash(i, 8, 2)) * s, 5 * s, i + 4, { n: 7 })); } p.mass(poly(...ms), { color: C.mid, dir: -1.4, size: .45, len: .4, vary: .5 });
    }
    // chimneys
    [[.07, ruin ? .75 : 1], [.93, 1]].forEach((c, i) => { const q = R(c[0], 1), hh = 46 * s * c[1], ww = 17 * s; p.mass([[q[0] - ww, q[1] + 8 * s], [q[0] - ww * .95, q[1] - hh], [q[0] + ww * .9, q[1] - hh * (ruin ? .86 : 1.02)], [q[0] + ww, q[1] + 8 * s]], { sharp: true, color: gableLit ? wsh : mixc(wl, wsh, .3), dir: 1.5, size: .5, len: .5 }); p.shade([[q[0] - f * ww * -.1, q[1] + 8 * s], [q[0], q[1] - hh], [q[0] + f * ww, q[1] - hh], [q[0] + f * ww, q[1] + 8 * s]], { color: L.shade, alpha: .4, soft: 2, mode: 'multiply' }); bx(p, [[q[0] - ww, q[1] + 6 * s], [q[0] - ww * .95, q[1] - hh], [q[0] + ww, q[1] - hh], [q[0] + ww, q[1] + 8 * s]], { color: dk, w: lw(2.4), press: .65, wobble: 1.2 }); if (i === 0 && (o.smoke ?? 0) > 0) W.smoke(p, { x: q[0], y: q[1] - hh, h: 230 * s + 60, w: 9 * s + 4, k: o.smoke, t, wind: o.wind, light: L }); });
    // the drawn edges, lost and found
    ln(p, [X(0, 3), X(2, -60), X(0, -124)], { color: dk, w: lw(2.8), press: .55, wobble: 1.3 }); ln(p, [X(-133, -28), X(-134, -70), X(-133, -112)], { color: dk, w: lw(2.4), press: .5, wobble: 1.3 }); ln(p, [P(1, 0), P(1.002, .5), P(1, .9)], { color: dk, w: lw(2), press: .4 });
    found(p, [P(0, -.02), P(.25, -.01), P(.5, 0), P(.75, 0), P(1, 0)], { color: dk, w: lw(2.4), press: .5, seed: 4, seg: 90 * s + 30, gap: .5 });
    // grass grown against it
    const gr = [], nn = ruin ? 60 : 26; for (let i = 0; i < nn; i++) { const u = hash(i, 9, 1), q = hash(i, 9, 4) < .75 ? P(u, -.02) : G(u, -.02); if (!ruin && u > .38 && u < .58) continue; gr.push([q[0], q[1] + 4 * s, (ruin ? 34 : 15) * s * (.5 + hash(i, 9, 2)), .15 + (hash(i, 9, 3) - .5) * .7 + .4 * windOf(o.wind)(t, q[0], q[1]), 1.5 * s + .8]); } p.mass(ctx => { ctx.beginPath(); for (const b of gr) bladePath(ctx, b); }, { color: C.dark, dir: -1.5, size: .35, len: .4, vary: .5 });
    if (night && win > .1) { const a = P(.2, .5), b = P(.74, .5); [a, b].forEach((q, i) => { if (o.lit != null && o.lit !== 'all' && o.lit !== i) return; p.shade(lump(q[0], q[1], 70 * s, 54 * s, i, { rough: .2 }), { color: '#f2c877', alpha: .4 * win, soft: 26 * s, mode: 'screen' }); }); }
    return { door: P(.48, 0), win0: P(.2, .54), win1: P(.74, .54), doorTop: P(.48, .75), gable: X(-60, -216), at: P };
  };

  // ------------------------------------------------------------------ doorway, near (s01, s04, s11)
  // full-sheet composition: open air on the left, the white wall, the door with the warm room behind it
  W.DOOR = { x0: 872, x1: 1236, top: 168, sill: 936, left: 452, cx: 1054 };
  W.doorway = function (p, o = {}) {
    const L = lightOf(o.light || 'dawn'), d = 0, D = W.DOOR, warm = o.warm ?? 1, t = o.t ?? p.t, wl = mixc('#e9e2d4', L.tint, .12), cool = mixc('#a9b4b8', L.shade, .18), dk = mixc(L.ink, '#4a4038', .4), part = o.part, se = o.season ?? .3, C = landPal({ light: L, season: se, colour: o.colour ?? .5 }, .05);
    if (!part || part === 'back') {
      // ground in front
      p.mass([[-40, 880], [300, 900], [700, 928], [1100, 946], [1960, 940], [1960, 1120], [-40, 1120]], { sharp: true, color: { lin: [0, 880, 0, 1080], stops: [[0, mixc(seen('#b9ab90', L, 0), L.haze, .2)], [1, mixc(seen('#988b76', L, 0), L.shade, .25)]] }, dir: .03, len: 1.2, size: .9, vary: .4 });
      // wall
      const e = [[D.left, 0], [D.left - 6, 220], [D.left + 5, 470], [D.left - 4, 720], [D.left - 10, 926]];
      p.mass([[D.left + 4, -40], ...e, [900, 946], [1400, 958], [1960, 948], [1960, -40]], { sharp: true, color: { lin: [D.left, 0, 1920, 700], stops: [[0, mixc(wl, L.sun, .25)], [.4, wl], [1, mixc(wl, cool, .55)]] }, dir: .12, len: 1.2, size: 1.05, vary: .4 });
      // lime over stone: soft lumps that catch the light on one side
      const R = rngOf(7); for (let i = 0; i < 26; i++) { const x = D.left + 40 + R() * 1400, y = 190 + R() * 700; if (x > D.x0 - 90 && x < D.x1 + 90) continue; const rx = 34 + R() * 46, ry = 20 + R() * 26; p.shade(lump(x + rx * .25, y + ry * .45, rx * 1.1, ry * .5, i + 20, { n: 9, rough: .3 }), { color: cool, alpha: .2, soft: 16, mode: 'multiply' }); if (i % 2 === 0) { p.mass(lump(x - rx * .1, y - ry * .3, rx * .7, ry * .34, i + 50, { n: 8, rough: .35 }), { color: mixc(wl, L.sun, .35), alpha: .55, dir: -.15, size: .6, len: .7, vary: .25, soft: 8 }); ln(p, [[x - rx * .6, y + ry * .5], [x - rx * .1, y + ry * .62], [x + rx * .5, y + ry * .42]], { color: mixc(cool, L.ink, .3), w: 1.4, press: .22, taper: [.4, .5], wobble: 1.6 }); } }
      p.shade([[D.left - 10, 760], [900, 800], [1400, 810], [1960, 780], [1960, 960], [1300, 962], [D.left - 10, 930]], { color: mixc(C.dark, cool, .4), alpha: .42, soft: 50, mode: 'multiply' }); // rain-splash and green at the foot
      hx(p, [[1720, 140], [1960, 130], [1960, 930], [1820, 940], [1760, 600]], { color: mixc(cool, L.ink, .25), dir: 1.35, gap: 24, len: 260, w: 1.4, press: .16, curve: .06 });
      // the room inside
      const op = [[D.x0, D.sill], [D.x0 + 4, D.top + 12], [D.x0 + 60, D.top - 2], [D.x1 - 50, D.top - 6], [D.x1 - 2, D.top + 10], [D.x1 + 3, D.sill + 4]];
      p.mass(op, { sharp: true, color: { lin: [D.x0, D.top, D.x1, D.sill], stops: [[0, mixc('#3b302a', '#54402f', warm)], [.5, mixc('#463b33', '#8a6038', warm)], [1, mixc('#4f463d', '#c68b4a', warm)]] }, dir: 1.35, len: 1, size: .9, vary: .45 });
      if (warm > .05) { p.mass(lump(D.x1 - 92, 742, 150, 190, 8, { rough: .2 }), { color: { rad: [D.x1 - 60, 760, 210], stops: [[0, '#f3cf85'], [.5, '#dea154'], [1, '#8a6038']] }, alpha: .72 * warm, dir: { around: [D.x1, 780] }, len: .8, size: .9, soft: 26 }); ln(p, [[D.x1 - 120, 470], [D.x1 - 60, 462], [D.x1 - 4, 466]], { color: '#e6bd7c', w: 4, press: .5 * warm, medium: 'crayon' }); ln(p, [[D.x1 - 116, 480], [D.x1 - 60, 474], [D.x1 - 4, 478]], { color: '#3b2c22', w: 5, press: .6 }); [[-96, 30], [-62, 36], [-30, 28]].forEach((q, i) => p.mass(lump(D.x1 + q[0], 466 - q[1] * .5, 12, q[1] * .5, i + 3, { n: 8, rough: .1 }), { color: mixc('#5a4632', '#b98f57', .4 + .2 * i), size: .4, len: .4 })); }
      // lintel shadow inside, floor light
      p.shade([[D.x0, D.top - 10], [D.x1, D.top - 10], [D.x1, D.top + 150], [D.x0, D.top + 250]], { color: '#2d2522', alpha: .55, soft: 46, mode: 'multiply' });
      p.mass([[D.x0 + 4, D.sill - 2], [D.x0 + 60, 868], [D.x1 - 40, 862], [D.x1, D.sill]], { sharp: true, color: mixc('#5c5146', '#d9a35f', .6 * warm), alpha: .7, dir: 0, size: .7, len: .8 });
      // reveal: the thickness of the wall, warmed
      p.mass([[D.x1 - 2, D.top + 8], [D.x1 + 44, D.top - 16], [D.x1 + 52, D.sill + 10], [D.x1 + 2, D.sill + 2]], { sharp: true, color: mixc(wl, '#eebf7c', .6 * warm), dir: 1.5, size: .6, len: .9 }); p.mass([[D.x0 - 24, D.top - 12], [D.x0 + 4, D.top + 10], [D.x0 + 2, D.sill], [D.x0 - 22, D.sill + 6]], { sharp: true, color: mixc(wl, cool, .55), dir: 1.5, size: .6, len: .9 });
      p.mass([[D.x0 - 26, D.top - 12], [D.x1 + 46, D.top - 18], [D.x1 - 2, D.top + 12], [D.x0 + 4, D.top + 12]], { sharp: true, color: mixc(cool, '#6d6256', .5), dir: 0, size: .6, len: .8 });
      // door leaf, folded back inside
      p.mass([[D.x0 + 2, D.top + 14], [D.x0 + 76, D.top + 44], [D.x0 + 78, D.sill - 44], [D.x0 + 2, D.sill - 2]], { sharp: true, color: seen('#5f7672', L, 0), dir: 1.5, size: .6, len: 1, vary: .4 }); p.shade([[D.x0 + 2, D.top + 14], [D.x0 + 76, D.top + 44], [D.x0 + 76, D.top + 300], [D.x0 + 2, D.top + 260]], { color: '#26302f', alpha: .4, soft: 20 }); [.33, .66].forEach(u => ln(p, [[D.x0 + 2 + 74 * u, D.top + 14 + 30 * u], [D.x0 + 2 + 75 * u, 560], [D.x0 + 2 + 75 * u, D.sill - 2 - 40 * u]], { color: dk, w: 2, press: .4 })); ln(p, [[D.x0 + 2, 540], [D.x0 + 78, 552]], { color: dk, w: 3, press: .5 });
      // small window with its deep reveal
      const wx = 1512, wy = 366; p.mass([[wx, wy], [wx + 176, wy - 6], [wx + 180, wy + 236], [wx - 2, wy + 232]], { sharp: true, color: mixc(wl, cool, .35), dir: 1.4, size: .6, len: .8 }); p.mass([[wx + 28, wy + 18], [wx + 168, wy + 12], [wx + 170, wy + 204], [wx + 28, wy + 200]], { sharp: true, color: { lin: [wx, wy, wx + 140, wy + 200], stops: [[0, '#4a4844'], [.5, mixc('#4b4f52', '#9c7346', .62 * warm)], [1, mixc('#4b4f52', '#d9a35c', .7 * warm)]] }, dir: 1.2, size: .6, len: .7 }); ln(p, [[wx + 98, wy + 16], [wx + 99, wy + 202]], { color: '#cfc6b3', w: 3.4, press: .8, taper: [0, 0] }); ln(p, [[wx + 28, wy + 106], [wx + 168, wy + 104]], { color: '#cfc6b3', w: 3.4, press: .8, taper: [0, 0] }); bx(p, [[wx + 30, wy + 202], [wx + 28, wy + 18], [wx + 168, wy + 12], [wx + 170, wy + 204]], { color: dk, w: 3, press: .6 }); ln(p, [[wx - 14, wy + 236], [wx + 80, wy + 238], [wx + 196, wy + 238]], { color: dk, w: 3.4, press: .6 });
      // thatch hanging over
      const th = []; for (let i = 0; i <= 30; i++) { const x = lerp(D.left - 70, 1980, i / 30); th.push([x, 104 - 12 * sin(i * .21) + 9 * noise1(i * 1.3, 6)]); }
      p.shade(th.map(q => [q[0], q[1] - 14]).concat(th.slice().reverse().map(q => [q[0] + 30, q[1] + 64])), { color: mixc(L.shade, cool, .3), alpha: .6, soft: 18, mode: 'multiply' });
      p.mass([[D.left - 58, -40], ...th, [1980, -40]], { sharp: true, color: { lin: [0, 0, 0, 110], stops: [[0, seen('#b7a176', L, 0)], [.7, seen('#9b8762', L, 0)], [1, mixc(seen('#6c5d43', L, 0), L.shade, .3)]] }, dir: 1.35, len: 1.1, size: .75, vary: .55 });
      hx(p, [[D.left - 40, -40], ...th.slice(1), [1980, -40]], { color: mixc('#6c5d43', L.ink, .3), dir: 1.42, gap: 15, len: 60, w: 1.5, press: .34, curve: .1 }); found(p, th, { color: dk, w: 3.4, press: .7, seed: 5, seg: 130, gap: .35, step: 40 });
      // drawn edges
      found(p, e, { color: dk, w: 3.2, press: .55, seed: 2, seg: 220 }); ln(p, [[D.x0, D.sill], [D.x0 - 2, 700], [D.x0 + 3, 420], [D.x0 + 2, D.top + 12]], { color: dk, w: 4, press: .75, wobble: 1.5, passes: 2 }); ln(p, [[D.x1 + 2, D.sill], [D.x1 + 3, 700], [D.x1 - 2, 420], [D.x1 - 1, D.top + 8]], { color: dk, w: 4, press: .7, wobble: 1.5 }); ln(p, [[D.x0 - 26, D.top - 12], [1040, D.top - 20], [D.x1 + 46, D.top - 18]], { color: dk, w: 3.4, press: .7, wobble: 1.5 });
      // step
      p.mass([[D.x0 - 70, D.sill + 2], [D.x1 + 80, D.sill + 6], [D.x1 + 112, D.sill + 44], [1000, D.sill + 56], [D.x0 - 96, D.sill + 42]], { color: { lin: [D.x0, 0, D.x1, 0], stops: [[0, seen('#a9a69b', L, 0)], [.7, mixc(seen('#c2b79f', L, 0), '#eebf7c', .4 * warm)], [1, seen('#a8a294', L, 0)]] }, dir: .02, len: .9, size: .7 }); ln(p, [[D.x0 - 94, D.sill + 42], [960, D.sill + 56], [D.x1 + 110, D.sill + 44]], { color: dk, w: 4, press: .6, wobble: 1.6 });
      if (warm > .05) p.shade([[D.x0 + 60, D.sill + 10], [D.x1 + 60, D.sill + 8], [D.x1 + 10, 1060], [D.x0 - 190, 1074]], { color: '#f0c27c', alpha: .34 * warm, soft: 30, mode: 'screen' });
    }
    if (!part || part === 'back') { W.ground(p, { area: [-20, 930, 820, 1070], dips: 4, stones: 7, tussocks: 5, seed: 6, light: L, season: se, colour: o.colour, t, wind: o.wind }); W.ground(p, { area: [1240, 985, 1900, 1070], dips: 3, stones: 6, tussocks: 2, seed: 9, light: L, season: se, colour: o.colour, t, wind: o.wind }); }
    if (!part || part === 'front') W.grass(p, { line: [[-40, 1010], [300, 1000], [D.left + 180, 968], [D.left + 330, 960]], n: 26, h: 62, depth: 30, t, wind: o.wind, season: se, light: L, colour: o.colour, seed: 15, lines: 24, d: 0 });
    return D;
  };

  // ------------------------------------------------------------------ chair and room
  // chair(p,{x,y seat centre on the floor, scale, face 1 looks left / -1 looks right, light, worn}) ladder-back with a rope seat
  W.chair = function (p, o) {
    const s = o.scale || 1, f = o.face || 1, X = (a, b) => [o.x + a * s * f, o.y + b * s], c = o.color || '#7d6347', dk = o.dark || '#4a392b', lit = o.lit || '#b1905f', al = o.alpha ?? 1;
    const bar = (a, b, w, col, rim) => { const r = ribbon([X(...a), X((a[0] + b[0]) / 2 + 1.5, (a[1] + b[1]) / 2), X(...b)], u => w * s * (1 + .12 * sin(u * 9)), { step: 26, rough: .5 * s, seed: a[0] + b[1] }); p.mass(r.poly, { color: col, dir: Math.atan2(b[1] - a[1], (b[0] - a[0]) * f), len: .8, size: .42, vary: .4, alpha: al }); if (rim) { ln(p, r.R, { color: dk, w: 2.4 * Math.sqrt(s), press: .7 * al, taper: [.1, .2], wobble: 1 }); ln(p, r.L, { color: lit, w: 2 * Math.sqrt(s), press: .4 * al, taper: [.2, .3], medium: 'crayon' }); } };
    if (o.ground !== 0) p.mass([X(-60, 20), X(40, 14), X(150, 4), X(230, 26), X(120, 46), X(-30, 38)], { color: o.shadow || '#4a3b30', alpha: .5 * al, dir: .03, size: .6, len: .8, soft: 6 });
    // far legs, stretchers
    bar([-33, -15], [-31, -130], 6.5, mixc(c, dk, .5)); bar([82, -20], [80, -135], 7, mixc(c, dk, .45)); bar([-33, -52], [81, -58], 4, mixc(c, dk, .5)); bar([-79, -40], [33, -44], 4.4, mixc(c, dk, .25)); bar([-78, -66], [-33, -84], 4, mixc(c, dk, .4)); bar([34, -60], [81, -82], 4, mixc(c, dk, .4));
    // back posts and slats
    bar([80, -130], [96, -318], 7.4, mixc(c, dk, .25), 1); [[-186, 20], [-240, 22], [-294, 24]].forEach((q, i) => { const a = X(35 + (-q[0] - 130) * .085, q[0] + 4), b = X(80 + (-q[0] - 130) * .085, q[0] - 22), h = q[1] * s * .5; p.mass([[a[0], a[1] - h], [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - h - 7 * s], [b[0], b[1] - h], [b[0], b[1] + h], [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + h - 4 * s], [a[0], a[1] + h]], { color: i === 2 ? c : mixc(c, dk, .2), dir: -.5 * f, size: .42, len: .6, alpha: al }); ln(p, [[a[0], a[1] + h], [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + h - 4 * s], [b[0], b[1] + h]], { color: dk, w: 2.2 * Math.sqrt(s), press: .6 * al }); });
    // seat
    const st = [X(-80, -114), X(-34, -150), X(82, -154), X(34, -117)]; p.mass([X(-84, -112), X(-34, -153), X(86, -156), X(36, -114)], { sharp: true, color: o.seat || '#a88f63', dir: .1, size: .6, len: .6, vary: .4, alpha: al });
    for (let i = 1; i < 7; i++) { const u = i / 7, a = [lerp(st[0][0], st[1][0], u), lerp(st[0][1], st[1][1], u)], b = [lerp(st[3][0], st[2][0], u), lerp(st[3][1], st[2][1], u)], m = [(st[0][0] + st[2][0]) / 2, (st[0][1] + st[2][1]) / 2 + 5 * s]; ln(p, [a, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 4 * s], b], { color: dk, w: 1.8 * Math.sqrt(s), press: .38 * al, wobble: 1 }); }
    p.shade([X(-20, -128), X(60, -150), X(84, -154), X(36, -116)], { color: dk, alpha: .3 * al, soft: 8 * s });
    ln(p, [X(-84, -110), X(-20, -108), X(36, -112)], { color: dk, w: 3.4 * Math.sqrt(s), press: .75 * al, wobble: 1 }); p.mass([X(-84, -112), X(36, -115), X(36, -103), X(-84, -100)], { sharp: true, color: mixc(c, dk, .35), dir: 0, size: .4, len: .6, alpha: al });
    // near legs and near post
    bar([-79, 19], [-80, -112], 7.2, c, 1); bar([33, 16], [34, -116], 7.6, c, 1); bar([34, -114], [52, -314], 7.8, c, 1); [[52, -314], [96, -318]].forEach(q => p.mass(lump(...X(q[0] + 1, q[1] - 7), 9 * s, 11 * s, 4, { n: 8, rough: .08 }), { color: c, size: .35, len: .4, alpha: al }));
    bar([-79, -22], [33, -26], 4.6, c, 1);
    if (o.rim) { [[[-86, 16], [-87, -50], [-87, -112]], [[26, 12], [26, -50], [27, -112]], [[27, -120], [36, -220], [44, -312]], [[-84, -114], [-30, -116], [34, -119]], [[72, -140], [80, -230], [87, -316]]].forEach((q, i) => ln(p, q.map(z => X(z[0], z[1])), { color: o.rim, w: 3 * Math.sqrt(s), press: .85 * al, taper: [.1, .25], medium: 'crayon', wobble: .8 })); [-186, -240, -294].forEach(y => ln(p, [X(36 + (-y - 130) * .085, y - 5), X(58 + (-y - 130) * .085, y - 24), X(80 + (-y - 130) * .085, y - 31)], { color: o.rim, w: 2.4 * Math.sqrt(s), press: .7 * al, medium: 'crayon' })); }
    return { seat: X(0, -134), top: X(74, -320), knee: X(-84, -114), floor: X(0, 0), arm: X(40, -230) };
  };
  // floor flags in perspective between y0 (wall) and 1080
  function flags(p, o) { const { y0, vx, c, ink } = o, rows = o.rows || 6, R = rngOf(o.seed || 3), groups = [[], [], []], lines = []; const ys = []; for (let j = 0; j <= rows; j++) ys.push(y0 + (1110 - y0) * Math.pow(j / rows, 1.7)); for (let j = 0; j < rows; j++) { const ya = ys[j], yb = ys[j + 1], ka = (ya - y0 + 260) / 260, kb = (yb - y0 + 260) / 260; let x = -9 - R() * 2; while (x < 9) { const w = .9 + R() * 1.5, jx = () => (R() - .5) * .18, pt = (a, y, k) => [vx + (a + jx()) * 170 * k, y + (R() - .5) * 7]; const q = [pt(x, ya, ka), pt(x + w / 2, ya, ka), pt(x + w, ya, ka), pt(x + w, yb, kb), pt(x + w / 2, yb, kb), pt(x, yb, kb)]; if (q[0][0] < 2000 && q[3][0] > -80) { const cx = (q[0][0] + q[3][0]) / 2; groups[R() * 3 | 0].push(q.map(z => [lerp(z[0], (q[1][0] + q[4][0]) / 2, .02), z[1]])); if (R() < .85) lines.push([q[5], q[4], q[3]]); if (R() < .7) lines.push([q[2], q[3]]); } x += w; } } groups.forEach((g, i) => { if (g.length) p.mass(poly(...g), { color: [mixc(c, '#ffffff', .07), c, mixc(c, ink, .13)][i], dir: [.03, -.1, .15][i], len: .9, size: .8, vary: .45, alpha: .85 }); }); lines.slice(0, o.lines || 46).forEach((l, i) => ln(p, l, { color: ink, w: 2 + 1.6 * hash(i, 3, 3), press: .4, taper: [.15, .3], wobble: 1.6 })); }
  // the room (s08, s09, s11). ROOM holds the places actors and the ball of wool need.
  W.ROOM = { floor: 700, corner: 1372, hearth: [446, 676], window: [1030, 400], sill: [1030, 512], chair: [826, 884], lap: [770, 740], door: [1650, 780], threshold: [[1512, 742], [1786, 826]], out: [1760, 700] };
  W.interior = function (p, o = {}) {
    const fire = o.fire ?? 1, ruin = clamp(o.ruin ?? 0), t = o.t ?? p.t, day = o.day ?? (ruin > .5 ? .8 : 0), L = lightOf(o.light || (day > .5 ? 'rain' : 'night')), M = W.ROOM, part = o.part, warmW = mixc(mixc('#b89a74', '#c9b79a', .4), '#84827a', max(ruin, day * .6)), dkW = mixc('#5f4c3c', '#4b4c4a', ruin), ink = '#2f2722', fl = mixc('#8d7a63', '#6f6f69', ruin), g = windOf(o.wind), C = landPal({ light: L, season: o.season ?? (ruin ? .66 : .3), colour: o.colour ?? .4 }, .05);
    if (!part || part === 'back') {
      // back wall and side wall
      p.mass([[-40, -40], [M.corner, -40], [M.corner + 4, 300], [M.corner - 2, M.floor], [600, M.floor + 6], [-40, M.floor - 4]], { sharp: true, color: { rad: [460, 640, 1150], stops: [[0, mixc(warmW, '#f0cd92', .35 * fire)], [.5, warmW], [1, mixc(warmW, dkW, .55)]] }, dir: .25, len: 1.2, size: 1.05, vary: .45 });
      p.mass([[M.corner, -40], [1960, -40], [1960, 884], [1660, 788], [M.corner - 2, M.floor]], { sharp: true, color: { lin: [M.corner, 0, 1960, 0], stops: [[0, mixc(warmW, dkW, .5)], [1, mixc(warmW, dkW, .2 + .3 * (1 - day))]] }, dir: -.5, len: 1.1, size: 1, vary: .45 });
      p.mass([[-40, M.floor - 6], [600, M.floor + 4], [M.corner, M.floor], [1660, 788], [1960, 884], [1960, 1120], [-40, 1120]], { sharp: true, color: { rad: [470, 720, 1300], stops: [[0, mixc(fl, '#e7ba7c', .45 * fire)], [.45, fl], [1, mixc(fl, dkW, .6)]] }, dir: .02, len: 1.2, size: .9, vary: .4 });
      flags(p, { y0: M.floor, vx: 760, c: mixc(fl, '#d8b384', .2 * fire), ink: mixc(ink, '#5b5a56', ruin * .5), lines: 40 });
      // rafters
      [[-40, 40, 1372, 56, 26], [-40, -10, 1372, 4, 22]].forEach((b, i) => p.mass([[b[0], b[1]], [700, b[1] + 6], [b[2], b[3]], [b[2], b[3] + b[4]], [700, b[1] + b[4] + 9], [b[0], b[1] + b[4]]], { sharp: true, color: mixc('#4a3a2d', '#5b564e', ruin), dir: 0, size: .6, len: 1 })); for (let i = 0; i < 7; i++) { const x = 60 + i * 205 + 30 * hash(i, 2, 2); if (ruin > .4 && (i === 4 || i === 5)) continue; p.mass([[x, -40], [x + 34, -40], [x + 30, 64], [x + 2, 62]], { sharp: true, color: mixc('#523f30', '#5b564e', ruin), dir: 1.5, size: .6, len: .7, vary: .4 }); }
      p.shade([[-40, 70], [1372, 88], [1960, 40], [1960, 190], [1372, 210], [-40, 190]], { color: '#3a2d25', alpha: .4, soft: 50 });
      // corner, floor line
      found(p, [[M.corner + 1, 60], [M.corner + 4, 300], [M.corner - 2, M.floor]], { color: ink, w: 3, press: .5, seed: 3 }); found(p, [[-30, M.floor - 4], [200, M.floor], [760, M.floor + 4], [M.corner - 2, M.floor]], { color: ink, w: 3, press: .5, seed: 6 }); found(p, [[M.corner, M.floor], [1500, 740], [1660, 790], [1940, 878]], { color: ink, w: 3, press: .5, seed: 9 });
      // whitewash worn off in patches
      const R = rngOf(5); for (let i = 0; i < 9; i++) { const x = 730 + R() * 620, y = 150 + R() * 520; if (x > 890 && x < 1170 && y > 260 && y < 540) continue; p.shade(lump(x, y, 40 + R() * 60, 24 + R() * 40, i, { n: 9, rough: .3 }), { color: dkW, alpha: .2 + .18 * ruin, soft: 14 }); if (i % 2) ln(p, [[x - 50, y], [x - 10, y - 14], [x + 40, y - 6]], { color: ink, w: 2, press: .22, taper: [.4, .5] }); }
      // chimney breast and hearth
      p.mass([[176, -40], [724, -40], [722, 300], [730, M.floor + 4], [640, M.floor + 4], [634, 372], [262, 372], [256, M.floor + 2], [168, M.floor + 2], [180, 300]], { sharp: true, color: { lin: [176, 0, 724, 0], stops: [[0, mixc(warmW, '#f2d5a0', .12 + .2 * fire)], [.75, warmW], [1, mixc(warmW, dkW, .55)]] }, dir: 1.45, len: 1, size: .95, vary: .4 });
      p.mass([[262, 372], [634, 372], [640, M.floor + 4], [256, M.floor + 2]], { sharp: true, color: { rad: [446, 650, 290], stops: [[0, mixc('#4a3a30', '#b87a42', fire)], [.5, mixc('#332a26', '#6a4530', fire * .8)], [1, '#2a2320']] }, dir: 1.5, len: .8, size: .8, vary: .4 });
      // hearth stones seen at the jambs
      for (let i = 0; i < 5; i++) { const y = 400 + i * 60; ln(p, [[256, y], [286, y - 2], [302, y + 4]], { color: ink, w: 2.6, press: .5 }); ln(p, [[600, y + 22], [618, y + 20], [640, y + 23]], { color: ink, w: 2.6, press: .5 }); }
      p.mass([[222, 338], [448, 330], [676, 336], [680, 376], [448, 372], [220, 380]], { sharp: true, color: mixc('#604732', '#6a6258', ruin), dir: 0, size: .6, len: 1.1, vary: .45 }); ln(p, [[222, 380], [448, 373], [680, 377]], { color: ink, w: 4, press: .8, wobble: 1.4 }); ln(p, [[222, 338], [448, 330], [676, 336]], { color: mixc('#d9b07a', '#9a948a', ruin), w: 3.4, press: .6, medium: 'crayon' });
      // mantel things: a jug, a candlestick, a small framed nothing
      if (ruin < .5) { p.mass([[292, 330], [284, 304], [296, 284], [318, 286], [326, 306], [318, 331]], { color: '#8b8a80', dir: 1.2, size: .4, len: .4 }); ln(p, [[326, 296], [340, 302], [326, 318]], { color: ink, w: 3, press: .6 }); p.mass([[590, 333], [592, 320], [600, 318], [600, 286], [608, 286], [608, 318], [618, 320], [620, 333]], { sharp: true, color: '#9a8050', size: .35, len: .4 }); p.mass([[600, 286], [601, 262], [607, 262], [608, 286]], { sharp: true, color: '#e8dcc0', size: .3, len: .4 }); p.mass([[420, 327], [418, 280], [474, 278], [476, 327]], { sharp: true, color: '#5d4a38', size: .4, len: .4 }); p.mass([[428, 320], [426, 288], [466, 286], [468, 320]], { sharp: true, color: '#b9a582', size: .4, len: .4 }); }
      // hearth flag, crane and pot
      p.mass([[206, M.floor + 2], [690, M.floor + 4], [752, 770], [138, 766]], { color: { rad: [446, 710, 320], stops: [[0, mixc('#8a8175', '#eab66b', .7 * fire)], [1, mixc('#79716a', '#6b6b66', ruin)]] }, dir: .02, len: .9, size: .8 }); ln(p, [[138, 767], [446, 774], [752, 771]], { color: ink, w: 3.4, press: .6, wobble: 1.4 });
      bx(p, [[288, 660], [290, 432], [440, 430]], { color: '#1f1a18', w: 7, press: .9, taper: [.02, .05] }); ln(p, [[432, 430], [433, 480], [430, 520]], { color: '#1f1a18', w: 4, press: .85 }); if (ruin < .7) { p.mass([[392, 528], [396, 568], [414, 590], [452, 590], [468, 566], [470, 528]], { color: '#26201d', dir: 1.2, size: .5, len: .5 }); ln(p, [[392, 528], [430, 510], [470, 528]], { color: '#1f1a18', w: 4, press: .85 }); ln(p, [[398, 566], [414, 588], [440, 592]], { color: '#c98a4c', w: 4, press: .5 * fire, medium: 'crayon' }); }
      // window: deep, low, four panes
      const wc = day > .05 ? mixc('#31405a', mixc(L.cl, L.mid, .3), day) : '#2e3c56';
      p.mass([[916, 282], [1146, 278], [1150, 524], [912, 528]], { sharp: true, color: mixc(warmW, day > .4 ? '#e9e4d6' : dkW, .42), dir: 1.4, size: .7, len: .8 }); p.mass([[946, 304], [1118, 300], [1120, 496], [944, 498]], { sharp: true, color: wc, dir: .4, size: .8, len: .8, vary: .45 });
      ln(p, [[1031, 302], [1032, 498]], { color: mixc('#6d5a45', '#cfc8b8', .3), w: 8, press: .9, taper: [0, 0], medium: 'crayon' }); ln(p, [[944, 400], [1120, 398]], { color: mixc('#6d5a45', '#cfc8b8', .3), w: 8, press: .9, taper: [0, 0], medium: 'crayon' }); if (ruin > .3) { ln(p, [[1034, 304], [1078, 350], [1070, 396]], { color: ink, w: 2, press: .5 }); ln(p, [[1118, 330], [1078, 350]], { color: ink, w: 2, press: .5 }); }
      p.mass([[898, 508], [1164, 504], [1182, 540], [884, 546]], { sharp: true, color: mixc(mixc(warmW, '#e6d4b4', .4), dkW, .1), dir: 0, size: .6, len: .9 }); ln(p, [[884, 547], [1030, 545], [1182, 541]], { color: ink, w: 3.6, press: .7, wobble: 1.3 }); bx(p, [[944, 498], [946, 304], [1118, 300], [1120, 496]], { color: ink, w: 3, press: .6, wobble: 1.3 }); bx(p, [[912, 520], [916, 282], [1146, 278], [1150, 510]], { color: ink, w: 2.2, press: .4, wobble: 1.4 });
      // door in the side wall, with the world outside it
      const dop = o.door ?? 1; if (dop > .02) {
        const out = [[1512, 742], [1514, 250], [1782, 204], [1786, 826]]; p.mass(out, { sharp: true, color: { lin: [0, 220, 0, 820], stops: [[0, L.mid], [.5, L.low], [.56, mixc(C.mid, L.haze, .4)], [1, C.mid]] }, dir: .1, len: 1, size: .8, vary: .4 });
        p.mass([[1513, 560], [1600, 548], [1700, 556], [1785, 540], [1786, 640], [1513, 620]], { sharp: true, color: mixc(C.mid, L.haze, .5), dir: -.1, size: .7, len: .7 }); p.mass([[1513, 640], [1640, 650], [1786, 640], [1786, 826], [1513, 742]], { sharp: true, color: C.mid, dir: .2, size: .7, len: .7 }); if (o.doorGrass !== false) W.grass(p, { line: [[1518, 735], [1650, 776], [1782, 815]], n: 16, h: 44, depth: 0, t, wind: o.wind, season: o.season ?? (ruin ? .66 : .3), light: L, seed: 22, lines: 8, d: .05, grow: 0 });
        p.mass([[1486, 738], [1500, 236], [1516, 248], [1512, 744]], { sharp: true, color: mixc(warmW, dkW, .35), dir: 1.5, size: .5, len: .8 }); p.mass([[1782, 204], [1806, 182], [1812, 838], [1786, 828]], { sharp: true, color: mixc(warmW, L.cl, .35), dir: 1.5, size: .5, len: .8 }); p.mass([[1500, 236], [1806, 182], [1782, 206], [1514, 252]], { sharp: true, color: mixc(dkW, warmW, .3), dir: -.15, size: .5, len: .8 });
        if (ruin > .4) { p.mass([[1512, 300], [1596, 330], [1584, 776], [1508, 744]], { sharp: true, color: mixc('#5f6f6b', L.haze, .25), dir: 1.5, size: .6, len: .9, vary: .5 }); [.3, .6].forEach(u => ln(p, [[1512 + 84 * u, 304 + 26 * u], [1509 + 76 * u, 748 + 26 * u]], { color: ink, w: 2, press: .5 })); ln(p, [[1596, 330], [1592, 560], [1584, 776]], { color: ink, w: 3.4, press: .7 }); }
        p.mass([[1494, 742], [1790, 832], [1772, 858], [1470, 762]], { sharp: true, color: mixc('#8f8878', L.cl, .3 * day + .1), dir: .3, size: .5, len: .8 }); ln(p, [[1470, 763], [1620, 812], [1772, 859]], { color: ink, w: 3.6, press: .65, wobble: 1.4 }); bx(p, [[1512, 742], [1514, 250], [1782, 204], [1786, 826]], { color: ink, w: 3.2, press: .6, wobble: 1.4 });
        p.shade([[1494, 752], [1786, 840], [1560, 960], [1240, 960], [1180, 920]], { color: mixc(L.cl, L.low, .4), alpha: .16 + .12 * day, soft: 34, mode: 'screen' });
      } else { p.mass([[1512, 742], [1514, 250], [1782, 204], [1786, 826]], { sharp: true, color: mixc('#5b5f58', dkW, .4), dir: 1.5, size: .7, len: 1, vary: .4 }); [.25, .5, .75].forEach(u => ln(p, [[1512 + 270 * u, 250 - 46 * u], [1512 + 272 * u, 742 + 84 * u]], { color: ink, w: 2.4, press: .5 })); bx(p, [[1512, 742], [1514, 250], [1782, 204], [1786, 826]], { color: ink, w: 3.4, press: .6 }); p.mass(lump(1756, 520, 7, 9, 3, { n: 7 }), { color: '#2a2320', size: .3, len: .3 }); }
      if (ruin > .05) {
        p.shade([[-40, -40], [760, -40], [640, 500], [360, 1120], [-40, 1120]], { color: '#4a4641', alpha: .5 * ruin, soft: 80 }); p.shade([[1380, -40], [1960, -40], [1960, 240], [1440, 260]], { color: '#3d3b39', alpha: .55 * ruin, soft: 50 }); p.shade([[1180, 1120], [1240, 960], [1960, 900], [1960, 1120]], { color: '#4a4641', alpha: .4 * ruin, soft: 60 });
        // open roof: sky through the hole, fallen timbers, weeds, soot
        p.mass([[820, -40], [900, 60], [1010, 48], [1090, 88], [1230, 60], [1330, 96], [1420, -40]], { color: mixc(L.low, L.cl, .4), alpha: ruin, dir: -.3, size: .9, len: .9, vary: .5 }); found(p, [[820, -30], [900, 60], [1010, 48], [1090, 88], [1230, 60], [1330, 96], [1420, -30]], { color: ink, w: 3.4, press: .7 * ruin, seed: 4, seg: 110 });
        [[1080, 66, 1186, 704, 13], [1336, 92, 1230, 712, 11], [940, 52, 790, 720, 12]].forEach((b, i) => { const rb = ribbon([[b[0], b[1]], [(b[0] + b[2]) / 2 + 10 * (i - 1), (b[1] + b[3]) / 2 + 6], [b[2], b[3]]], () => b[4], { step: 40, rough: 1.8, seed: i }); p.mass(rb.poly, { color: { lin: [b[0] - 10, 0, b[0] + 20, 0], stops: [[0, '#6a6256'], [1, '#3b3631']] }, dir: Math.atan2(b[3] - b[1], b[2] - b[0]), size: .46, len: .9, alpha: ruin }); ln(p, rb.L, { color: ink, w: 2, press: .6 * ruin, wobble: 1.4 }); ln(p, rb.R, { color: ink, w: 1.6, press: .5 * ruin, wobble: 1.4 }); }); [0, 1, 2, 3, 4].forEach(i => { const x = 880 + i * 120 + 30 * hash(i, 9, 9); ln(p, [[x, -20], [x + 12 * (hash(i, 8, 9) - .5), 30], [x - 6, 70 + 40 * hash(i, 7, 9)]], { color: '#3b3631', w: 7, press: .85 * ruin, wobble: 1.6, taper: [0, .3] }); });
        const heap = []; for (let i = 0; i < 12; i++) heap.push(lump(1100 + 190 * (hash(i, 3, 1) - .5) * 2, 690 - 18 * hash(i, 3, 2), 30 + 30 * hash(i, 3, 3), 12 + 14 * hash(i, 3, 4), i, { n: 8, rough: .3 })); p.mass(poly(...heap), { color: mixc('#7b7566', L.haze, .2), alpha: ruin, dir: .3, size: .6, len: .6, vary: .5 });
        W.grass(p, { line: [[760, 712], [1010, 716], [1250, 706], [1380, 706]], n: 18, h: 46, depth: 16, t, wind: o.wind, season: o.season ?? .66, light: L, seed: 31, lines: 14, d: .05, alpha: ruin });
      }
    }
    if ((!part || part === 'back') && fire > .05) { p.mass([[210, 716], [690, 716], [900, 800], [980, 900], [620, 960], [240, 920], [60, 810]], { color: { rad: [446, 720, 520], stops: [[0, 'rgba(255,214,140,.75)'], [.5, 'rgba(240,186,112,.34)'], [1, 'rgba(230,170,100,0)']] }, dir: .02, len: 1, size: .7, vary: .3, soft: 10, alpha: min(1, fire) }); [[300, 690], [592, 690]].forEach((q, i) => p.mass([[q[0] - 34, 690], [q[0] - 30, 420], [q[0] + 10, 400], [q[0] + 24, 690]], { color: { rad: [446, 650, 300], stops: [[0, 'rgba(255,206,130,.6)'], [1, 'rgba(230,160,90,0)']] }, dir: 1.5, size: .6, len: .8, soft: 8, alpha: min(1, fire) })); }
    if ((!part || part === 'fire') && fire >= 0 && ruin < .9) W.fire(p, { x: 446, y: 694, w: 190, h: 190, k: fire, t });
    if (ruin > .5 && (!part || part === 'fire')) { const ash = []; for (let i = 0; i < 7; i++) ash.push(spline(lump(446 + 150 * (hash(i, 2, 2) - .5), 690 - 12 * hash(i, 3, 3), 26 + 22 * hash(i, 4, 4), 8 + 8 * hash(i, 5, 5), i, { n: 8, rough: .25 }), 2, true)); p.mass(poly(...ash), { color: '#4d4946', dir: .2, size: .5, len: .5, vary: .5 }); }
    if ((!part || part === 'shaft') && (o.shaft ?? (ruin > .5 ? 1 : 0)) > 0) W.shaft(p, { k: o.shaft ?? 1, t, pts: [[930, 50], [1290, 80], [1080, 930], [600, 890]], light: L });
    if ((!part && o.chair !== false && o.chair !== 0) || part === 'chair') W.chair(p, Object.assign({ x: M.chair[0], y: M.chair[1], scale: 1.12, rim: fire > .1 && ruin < .4 ? mixc('#8a6a48', '#f6cf8c', min(1, fire)) : null }, ruin > .4 ? { color: '#7c7467', dark: '#403c38', lit: '#b8b2a2', seat: '#948c78' } : {}));
    return M;
  };
  // shaft(p,{pts quad, k, t}) a leaning beam of light with slow dust in it
  W.shaft = function (p, o) {
    const k = o.k ?? 1, t = o.t ?? p.t, L = lightOf(o.light), q = o.pts || [[900, 0], [1200, 0], [900, 900], [500, 880]], c = o.color || mixc(L.sun, '#fff3d6', .45), P = (u, v) => { const a = [lerp(q[0][0], q[1][0], u), lerp(q[0][1], q[1][1], u)], b = [lerp(q[3][0], q[2][0], u), lerp(q[3][1], q[2][1], u)]; return [lerp(a[0], b[0], v), lerp(a[1], b[1], v)]; }, an = Math.atan2(P(.5, 1)[1] - P(.5, 0)[1], P(.5, 1)[0] - P(.5, 0)[0]);
    const beam = (u0, u1, al, soft) => p.mass([P(u0, 0), P(u1, 0), P(u1 + .02, .5), P(u1, 1), P(u0, 1), P(u0 - .02, .5)], { sharp: true, color: { lin: [...P(.5, 0), ...P(.5, 1)], stops: [[0, rgba(c, al)], [.5, rgba(c, al * .62)], [1, rgba(c, al * .5)]] }, dir: an, len: 1.3, size: .8, vary: .25, soft, alpha: k });
    beam(0, 1, .4, 26); beam(.16, .5, .42, 12); beam(.64, .86, .34, 12);
    { const pc = P(.5, 1), pr = abs(P(1, 1)[0] - P(0, 1)[0]) * .62; p.mass(lump(...pc, pr, 54, 5, { rough: .2, n: 15 }), { color: { rad: [pc[0], pc[1], pr], stops: [[0, rgba(c, .8)], [.5, rgba(c, .62)], [1, rgba(c, 0)]] }, alpha: k, dir: .02, len: .9, size: .7, vary: .3, soft: 14 }); }
    [.1, .36, .7, .92].forEach((u, i) => ln(p, [P(u, .02), P(u + .02, .4), P(u, .9)], { color: '#f6ead0', w: 3, press: .2 * k, taper: [.3, .6], medium: 'crayon', wobble: .8 }));
    for (let i = 0; i < 34; i++) { const u = .08 + .84 * hash(i, 1, 31) + .06 * noise1(t * .3 + i, 4), v = (hash(i, 2, 31) + t * .018 * (.4 + hash(i, 3, 31)) + .05 * noise1(t * .4 + i * 3, 9)) % 1, z = P(u, v), r = 1.2 + 2.4 * hash(i, 4, 31) * hash(i, 5, 31); p.line([[z[0] - r, z[1]], [z[0] + r, z[1] + r * .4]], { color: '#fdf4df', w: r * 1.7 + .8, press: .7 * k * sin(PI * v), taper: [.2, .2], wobble: .3 }); }
  };  // ------------------------------------------------------------------ the thorn tree
  // limbs authored in tree space: root at 0,0, up is negative y, the sea wind has pushed everything to +x
  const LIMBS = [
    { w: [21, 4], pts: [[-12, 8], [-9, -22], [8, -46], [3, -78], [24, -108], [66, -128], [112, -164], [172, -176], [234, -202], [306, -198]] },
    { w: [12, 7], pts: [[20, 10], [13, -20], [22, -52], [20, -84], [34, -112]] },
    { w: [10, 2.5], pts: [[4, -70], [-12, -98], [-3, -130], [22, -158], [34, -194], [82, -220], [140, -230]] },
    { w: [10, 2.5], pts: [[22, -104], [62, -104], [102, -128], [162, -128], [212, -148], [280, -142], [340, -122]] },
    { w: [8, 2], pts: [[68, -130], [82, -170], [124, -202], [170, -236], [228, -238], [270, -250]] },
    { w: [6, 1.6], pts: [[-8, -96], [-36, -116], [-44, -146], [-68, -160], [-78, -184]] },
    { w: [5, 1.6], pts: [[170, -176], [222, -176], [270, -186], [330, -164], [366, -146]] },
    { w: [5, 1.6], pts: [[100, -128], [146, -106], [204, -108], [262, -92], [300, -94]] },
    { w: [4, 1.4], pts: [[30, -190], [26, -222], [52, -246], [60, -268]] }];
  const TWIGS = (() => {
    const R = rngOf(77), out = []; const cnt = [11, 0, 9, 11, 8, 6, 7, 6, 4];
    LIMBS.forEach((l, li) => { const T = track(spline(l.pts, 6, false)), n = cnt[li]; for (let i = 0; i < n; i++) { const u = lerp(li === 0 ? .42 : .22, 1, (i + .6 * R()) / n), q = T.at(u), sg = i % 2 ? 1 : -1, a0 = q[2] + sg * (.4 + .8 * R()), len = lerp(66, 36, u) * (.55 + .8 * R()) * (li > 4 ? .75 : 1), pts = [[q[0], q[1]]]; let a = a0, x = q[0], y = q[1]; for (let j = 0; j < 4; j++) { a = a + ((-.12) - a) * .2 + (R() - .5) * 1.0; x += cos(a) * len / 4; y += sin(a) * len / 4; pts.push([x, y]); } out.push({ pts, w: 3 * (1 - u * .4), li }); for (let k = 0; k < 3; k++) { const b = pts[1 + ((R() * 3.9) | 0)]; let aa = a + (R() - .5) * 2.6, X = b[0], Y = b[1], l2 = len * (.24 + .34 * R()); const pp = [[X, Y]]; for (let j = 0; j < 2; j++) { aa += (-.1 - aa) * .18 + (R() - .5) * 1.1; X += cos(aa) * l2 / 2; Y += sin(aa) * l2 / 2; pp.push([X, Y]); } out.push({ pts: pp, w: 1.5, li, fine: 1 }); } } }); return out;
  })();
  // the crown is made where the twigs end: many small ragged heaps, so it keeps the shape the wind gave the wood
  const HEAPS = (() => { const R = rngOf(31), h = []; TWIGS.forEach((w, i) => { const e = w.pts[w.pts.length - 1], m = w.pts[1]; if (!w.fine) { h.push([m[0] + 6, m[1] - 2, 24 + 14 * R(), 13 + 8 * R(), -.25 + (R() - .5) * .5]); h.push([e[0], e[1], 17 + 13 * R(), 9 + 7 * R(), -.2 + (R() - .5) * .7]); } else if (R() < .42) h.push([e[0], e[1], 10 + 10 * R(), 6 + 5 * R(), -.2 + (R() - .5)]); }); LIMBS.forEach((l, li) => { if (li === 1) return; const T = track(spline(l.pts, 6, false)); for (let i = 0; i < 5; i++) { const q = T.at(lerp(li === 0 ? .55 : .4, 1, i / 4)); h.push([q[0], q[1] - 8, 30 + 18 * R(), 16 + 8 * R(), -.2]); } });
    const top = x => { let m = 0; for (const z of h) if (abs(z[0] - x) < z[2]) m = min(m, z[1] - z[3]); return m; }; h.forEach((z, i) => { z[5] = z[1] - z[3] - top(z[0]); z[6] = hash(i, 4, 4); }); return h.sort((a, b) => b[5] - a[5]); })();
  // thorn(p,{x,y,scale,season,wind,t,blossom 0..1,leaf 0..1,light,colour,flip}) lone hawthorn bent by the sea wind
  W.thorn = function (p, o) {
    const s = o.scale || 1, f = o.flip ? -1 : 1, t = o.t ?? p.t, g = windOf(o.wind), L = lightOf(o.light), d = o.d ?? .05, se = o.season ?? .33, C = landPal({ light: L, season: se, colour: o.colour ?? .5 }, d), leaf = o.leaf ?? (se < .12 ? .5 + se * 4 : se < .55 ? 1 : se < .8 ? 1 - (se - .55) / .25 * .9 : 0), bloom = o.blossom ?? (se < .24 ? 1 - abs(se - .1) / .14 : 0), sw = Math.sqrt(s), lw = v => max(1.1, v * sw);
    const bark = mixc(seen('#5a5048', L, d), L.ink, .25), barkLit = mixc(mixc(seen('#968b76', L, d), L.sun, .25), L.shade, min(.6, L.tk * 1.3));
    // everything above the bole gives to the gust, the tips late and most
    const gv = [0, .07, .15].map(lag => g(t - lag, o.x, o.y) * f), X = (a, b, tip = 0) => { const h = clamp(-b / 270), r = clamp((hyp(a - 10, b) - 70) / 300), k = r * r, bd = lerp(gv[0], gv[2], r) * (9 * h + 26 * k) + tip * 4 * noise1(t * 5 + a * .02, 3) * abs(gv[1]); return [o.x + (a + bd) * s * f, o.y + (b + bd * .1 + (a > 60 ? bd * .16 * k : 0)) * s]; };
    const M = a => a.map(q => X(q[0], q[1]));
    // far twigs
    const drawTwigs = (sel, press) => TWIGS.forEach((w, i) => { if (!sel(w, i)) return; ln(p, w.pts.map((q, j) => { const z = X(q[0], q[1], j / 3); return [z[0], z[1], 1 - j * .16]; }), { color: bark, w: lw(w.w), press, taper: [.02, .6], wobble: .9 }); });
    drawTwigs((w, i) => w.fine && i % 2 && (leaf < .5 || i % 4 === 1), .5);
    if (leaf > .03) { // dark inside of the crown first
      const g0 = [], n = HEAPS.length; HEAPS.forEach((h, i) => { if (h[6] > leaf * 1.15) return; const c = X(h[0], h[1] + 5, .5); g0.push(spline(lump(c[0], c[1], h[2] * s * 1.05, h[3] * s * 1.15, i + 50, { n: 9, rough: .3, rot: h[4] * f }), 2, true)); });
      if (g0.length) p.mass(poly(...g0), { color: mixc(C.dark, C.shade, .5), alpha: .92 * min(1, leaf * 1.6), dir: -.3 * f, len: .55, size: .55, vary: .5 });
    }
    // bole and limbs
    LIMBS.forEach((l, i) => { const r = ribbon(spline(M(l.pts), 5, false), u => lerp(l.w[0], l.w[1], Math.pow(u, .7)) * s * (i === 0 ? 1 + .35 * Math.pow(1 - u, 6) + .12 * noise1(u * 13, 3) : 1) * .62, { step: 14 * s + 5, rough: 1.3 * s, seed: i + 3 }); p.mass(r.poly, { sharp: true, color: i === 0 ? { lin: [o.x - 16 * s, 0, o.x + 18 * s, 0], stops: [[0, L.side < 0 ? barkLit : bark], [1, L.side < 0 ? bark : barkLit]] } : bark, dir: i === 0 ? -1.2 : -.5 * f, size: .42, len: .6, vary: .4 }); const lo = r.L[0][1] > r.R[0][1] ? r.L : r.R; ln(p, (i === 0 ? r.R : lo).filter((_, j) => j % 2 === 0), { color: mixc(L.ink, L.haze, d), w: lw(i === 0 ? 3 : 2), press: .7, taper: [.04, .5], wobble: 1.2 }); });
    // roots gripping, a twist in the bark
    [[-4, 2, -34, 12], [4, 2, 30, 14], [0, 4, 8, 18]].forEach((q, i) => ln(p, [X(q[0], q[1] - 12), X((q[0] + q[2]) / 2, (q[1] + q[3]) / 2 - 4), X(q[2], q[3])], { color: bark, w: lw(7 - i), press: .8, taper: [.02, .7] }));
    [[-6, -8, 4, -44, 20, -84], [6, -4, 14, -50, 34, -96], [0, -50, 18, -86, 48, -122]].forEach(q => ln(p, [X(q[0], q[1]), X(q[2], q[3]), X(q[4], q[5])], { color: L.ink, w: lw(1.8), press: .5, taper: [.3, .4], wobble: 1.6 }));
    drawTwigs((w, i) => w.fine ? i % 2 === 0 && (leaf < .5 || i % 3 === 0) : true, leaf > .5 ? .5 : .72);
    if (leaf > .03) {
      const mid = [], lit = [], top = []; const R = rngOf(5);
      HEAPS.forEach((h, i) => { if (h[6] > leaf * 1.15) return; const k = .5 + .5 * leaf, c = X(h[0] - 3, h[1] - 2, .7); if (h[5] < 74) mid.push(spline(lump(c[0], c[1], h[2] * s * .86 * k, h[3] * s * .8 * k, i + 70, { n: 9, rough: .34, rot: h[4] * f }), 2, true)); if (h[5] < 40) { const e = X(h[0] - 8, h[1] - h[3] * .45, .8); lit.push(spline(lump(e[0], e[1], h[2] * s * .58 * k, h[3] * s * .42 * k, i + 90, { n: 8, rough: .4, rot: h[4] * f }), 2, true)); if (h[5] < 12 && i % 2) { const z = X(h[0] - 12, h[1] - h[3] * .7, .9); top.push(spline(lump(z[0], z[1], h[2] * s * .34 * k, h[3] * s * .26 * k, i + 110, { n: 7, rough: .4, rot: h[4] * f }), 2, true)); } } });
      if (mid.length) p.mass(poly(...mid), { color: mixc(C.mid, C.dark, .34), alpha: .8, dir: -.4 * f, len: .42, size: .42, vary: .55 }); if (lit.length) p.mass(poly(...lit), { color: mixc(C.lit, C.mid, .42), alpha: .85, dir: -.7 * f, len: .38, size: .4, vary: .55 }); if (top.length) p.mass(poly(...top), { color: mixc(C.lit, C.sun, .5), alpha: .8, dir: -.3 * f, len: .36, size: .38, vary: .4 });
      const n = Math.round((o.flicks ?? 64) * leaf); for (let i = 0; i < n; i++) { const h = HEAPS[(i * 7) % HEAPS.length], a = -.4 + (R() - .5) * 3.4, q = X(h[0] + cos(a) * h[2] * 1.02, h[1] + sin(a) * h[3] * 1.15, 1), l = (6 + 8 * R()) * s, an = -.25 + (R() - .5) * 1.8; p.line([[q[0], q[1]], [q[0] + cos(an) * l * f, q[1] + sin(an) * l]], { color: i % 3 === 0 ? C.lit : i % 3 === 1 ? C.dark : mixc(C.dark, C.deep, .4), w: max(1.8, 4.4 * sw * (.7 + .5 * R())), press: .75, taper: [.1, .5], medium: 'crayon', wobble: .4 }); }
    }
    if (bloom > .03) { const b = []; for (let i = 0; i < 260 * bloom; i++) { const h = HEAPS[(i * 5) % HEAPS.length]; if (h[5] > 60 && i % 3) continue; const a = hash(i, 8, 1) * TAU, r = Math.sqrt(hash(i, 8, 2)), q = X(h[0] + cos(a) * h[2] * .95 * r, h[1] - h[3] * .35 + sin(a) * h[3] * .8 * r, .6); b.push(lump(q[0], q[1], (3 + 5 * hash(i, 8, 3) * hash(i, 8, 6)) * s, (2.4 + 3 * hash(i, 8, 4)) * s, i, { n: 6, rough: .4, rot: -.3 })); } p.mass(poly(...b), { color: mixc('#f3ebda', L.tint, .12 + L.tk * .6), alpha: .95, dir: -.4, size: .34, len: .35, vary: .3 }); }
    return { foot: [o.x, o.y], crown: X(150, -230), lee: X(330, -190) };
  };

  // ------------------------------------------------------------------ the stone
  // stone(p,{x,y,scale,light,season,wind,t,moss,lean,tuft,snow}) a plain upright slab
  W.stone = function (p, o) {
    const s = o.scale || 1, L = lightOf(o.light), d = o.d ?? .03, ln0 = o.lean ?? -.05, X = (a, b) => [o.x + (a + -b * ln0) * s, o.y + b * s], lowk = min(.62, L.tk * 1.5), c = mixc(mixc(seen('#a09d92', L, d), L.sun, .12), L.shade, lowk), dk = mixc(seen('#4f5150', L, d), L.shade, .45), lit = mixc(mixc(seen('#c8c3b2', L, d), L.sun, .35), L.shade, lowk * .8), se = o.season ?? .5, C = landPal({ light: L, season: se, colour: o.colour ?? .5 }, d), sd = L.side;
    const face = [X(-54, 16), X(-57, -36), X(-53, -92), X(-58, -150), X(-55, -184), X(-36, -193), X(-4, -187), X(22, -194), X(30, -182), X(46, -178), X(52, -158), X(49, -104), X(54, -48), X(52, 16)], edge = sd < 0 ? [X(52, 16), X(54, -48), X(49, -104), X(52, -158), X(46, -178), X(60, -173), X(69, -152), X(66, -96), X(70, -40), X(68, 18)] : [X(-54, 16), X(-57, -36), X(-53, -92), X(-58, -150), X(-55, -184), X(-70, -177), X(-74, -146), X(-69, -90), X(-73, -34), X(-70, 18)], sq = Math.sqrt(s);
    p.mass(lump(o.x + (sd < 0 ? 74 : -74) * s, o.y + 12 * s, 140 * s, 20 * s, 4, { rough: .2 }), { color: C.shade, alpha: .8, dir: .05, size: .7, len: .7, soft: 5 });
    p.mass(edge, { sharp: true, color: dk, dir: 1.5, size: .5, len: .6, vary: .4 }); p.mass(face, { sharp: true, color: { lin: [...X(-60 * -sd, -120), ...X(60 * -sd, -40)], stops: sd < 0 ? [[0, mixc(c, lit, .2)], [.5, c], [1, mixc(c, dk, .5)]] : [[0, mixc(c, dk, .5)], [.5, c], [1, mixc(c, lit, .3)]] }, dir: 1.25, size: .55, len: .65, vary: .55 });
    p.mass([X(-54, -183), X(-36, -192), X(-4, -186), X(22, -193), X(30, -181), X(45, -177), X(40, -166), X(10, -172), X(-30, -174)], { color: lit, alpha: .8, dir: -.1, size: .42, len: .5 });
    [[-30, -140, 30, 18], [16, -96, 24, 26], [-18, -52, 34, 20], [30, -140, 16, 22]].forEach((q, i) => p.shade(lump(...X(q[0], q[1]), q[2] * s, q[3] * s, i + 9, { n: 9, rough: .35 }), { color: i % 2 ? dk : mixc(dk, '#8d8a6a', .5), alpha: .3, soft: 8 * s }));
    p.shade([X(-60, -40), X(0, -30), X(60, -44), X(60, 18), X(-60, 18)], { color: mixc(C.dark, dk, .4), alpha: .6, soft: 16 * s });
    const M = []; for (let i = 0; i < (o.moss ?? 10); i++) { const a = -50 + 96 * hash(i, 6, 1), b = -186 + 190 * Math.pow(hash(i, 6, 2), .8); M.push(lump(...X(a, b), (6 + 13 * hash(i, 6, 3)) * s, (4 + 8 * hash(i, 6, 4)) * s, i + 30, { n: 8, rough: .4 })); } if (M.length) p.mass(poly(...M), { color: mixc(seen('#8c9160', L, d), C.mid, .3), alpha: .85, dir: .6, size: .42, len: .42, vary: .6 });
    const Li = []; for (let i = 0; i < 6; i++) Li.push(lump(...X(-40 + 78 * hash(i, 7, 1), -160 + 110 * hash(i, 7, 2)), (5 + 7 * hash(i, 7, 3)) * s, (4 + 6 * hash(i, 7, 4)) * s, i + 60, { n: 8, rough: .3 })); p.mass(poly(...Li), { color: mixc(lit, mixc('#d8c897', L.shade, lowk), .45), alpha: .6, dir: 0, size: .38, len: .4 });
    hx(p, sd < 0 ? [X(4, 14), X(8, -90), X(50, -150), X(52, 14)] : [X(-54, 14), X(-56, -150), X(-8, -90), X(-4, 14)], { color: mixc(dk, L.ink, .4), dir: 1.15, gap: 11 * s + 2, len: 44 * s, w: 1.8, press: .36, curve: .15 });
    found(p, face.slice(0, 6), { color: L.ink, w: 2 * sq, press: .55, seed: 3, seg: 70 * s, gap: .4, step: 20 * s }); found(p, face.slice(4, 11), { color: L.ink, w: 2 * sq, press: .5, seed: 5, seg: 60 * s, gap: .5, step: 16 * s }); found(p, face.slice(10), { color: L.ink, w: 2.4 * sq, press: .62, seed: 8, seg: 80 * s, gap: .35, step: 20 * s });
    ln(p, [X(-20, -186), X(-13, -156), X(-24, -128), X(-18, -104)], { color: L.ink, w: 1.5 * sq, press: .42, wobble: 1.8, taper: [.1, .7] }); ln(p, [X(34, -64), X(24, -46), X(31, -24)], { color: L.ink, w: 1.4 * sq, press: .36, taper: [.3, .6] });
    if (o.snow) p.mass([X(-60, -178), X(-40, -198 - 10 * o.snow), X(0, -196 - 12 * o.snow), X(28, -200 - 8 * o.snow), X(50, -184), X(56, -160), X(34, -176), X(0, -178), X(-36, -180)], { color: mixc('#f2eee5', L.cl, .4), dir: 0, size: .5 });
    if (o.tuft !== 0) W.grass(p, { line: [X(-96, 22), X(0, 26), X(100, 22)], n: 20, h: 46 * s, depth: 12 * s, t: o.t, wind: o.wind, season: se, light: L, colour: o.colour, seed: 41, lines: 22, d, stiff: 1.2 });
    return { top: X(0, -190), face, left: X(-56, -80), right: X(54, -80), foot: X(0, 16) };
  };

  // ------------------------------------------------------------------ roses
  // an old garden rose built petal by petal in space (rings round an axis), then turned whichever way it faces and drawn flat.
  // th: how far the petal leans out (rad), base: how it leaves the heart, rec: curl of the rim, w: half width, len, v0: where it can first be seen
  const RING_FULL = [
    { n: 6, th: 1.62, base: 1.5, rec: .75, w: .56, len: 1.0, cl: .5, go: [0, .3] }, { n: 6, th: 1.18, base: 1.45, rec: .5, w: .52, len: .93, cl: .38, go: [.2, .5] },
    { n: 7, th: .78, base: 1.4, rec: .2, w: .46, len: .86, cl: .26, go: [.42, .7] }, { n: 7, th: .42, base: 1.2, rec: -.15, w: .4, len: .74, cl: .14, go: [.6, .85] }, { n: 5, th: .14, base: .8, rec: -.4, w: .28, len: .62, cl: .05, go: [.78, .95] }, { n: 3, th: -.04, base: .4, rec: -.3, w: .2, len: .52, cl: 0, go: [.9, 1] }];
  const RING_SMALL = [{ n: 5, th: 1.55, base: 1.45, rec: .6, w: .62, len: 1, cl: .5 }, { n: 5, th: 1.0, base: 1.4, rec: .3, w: .54, len: .88, cl: .3 }, { n: 5, th: .5, base: 1.2, rec: -.1, w: .46, len: .74, cl: .16 }, { n: 3, th: .1, base: .6, rec: -.3, w: .3, len: .58, cl: .02 }];
  function rose3(o) {
    const { x, y, r, seed: sd = 1, open = 1, tilt = .9, rot = 0, rings = RING_FULL, droop } = o, ct = cos(tilt), st = sin(tilt), cr = cos(rot), sr = sin(rot), list = [];
    const proj = q => { const X = q[0], Y = q[1] * ct + q[2] * st, z = q[2] * ct - q[1] * st; return [x + (X * cr + Y * sr) * r, y + (X * sr - Y * cr) * r, z]; };
    rings.forEach((g, gi) => {
      for (let i = 0; i < g.n; i++) {
        const h = k => hash(i + gi * 11, sd, k), dr = droop ? droop(gi, i) : 0, phi = (i + (gi % 2) * .5 + (h(1) - .5) * .42) / g.n * TAU + gi * .37 + sd, th = lerp(g.cl, g.th, open) + (h(2) - .5) * .22 + dr, len = g.len * (.9 + .2 * h(3)), w = g.w * (.88 + .26 * h(4)), m = 8, rr = [.03 + gi * -.002], hh = [0];
        for (let j = 1; j <= m; j++) { const v = j / m, a = lerp(lerp(.2, g.base, open), th, ss(0, .62, v)) + (g.rec * open + dr * .7) * ss(.6, 1, v); rr.push(max(.02, rr[j - 1] + sin(a) * len / m)); hh.push(hh[j - 1] + cos(a) * len / m); }
        const P = (u, v) => { const z = clamp(v) * m, j = min(m - 1, Math.floor(z)), f = z - j, R = lerp(rr[j], rr[j + 1], f), H = lerp(hh[j], hh[j + 1], f), wv = w * (.3 + .7 * sin(PI * min(1, .1 + clamp(v) * .62))), de = clamp(u * wv / (R + .17), -1.45, 1.45), q = u * u; return proj([R * (1 - .1 * q) * cos(phi + de), R * (1 - .1 * q) * sin(phi + de), H - .07 * q * len]); };
        const vr = u => 1 - .2 * Math.pow(abs(u), 2.3) - .045 * h(6) * Math.exp(-u * u * 30) + .025 * noise1(u * 2.6 + i, sd + gi), v0 = o.trim && gi < 2 ? .34 : .04, out = [P(-.75, v0), P(-1, .34), P(-1, .6)], rim = [], inn = []; for (let j = 0; j <= 8; j++) { const u = -1 + j / 4; rim.push(P(u * .99, vr(u))); inn.push(P(u * .86, vr(u) - .1 - .03 * h(7))); } out.push(...rim, P(1, .6), P(1, .34), P(.75, v0));
        let ar = 0, zz = 0; out.forEach((q, j) => { const e = out[(j + 1) % out.length]; ar += q[0] * e[1] - e[0] * q[1]; zz += q[2]; }); const c = P(0, .62), dx = (c[0] - x) / r, dy = (c[1] - y) / r, dl = hyp(dx, dy) || 1, li = (-.55 * dx - .83 * dy) / dl, inner = ar > 0;
        list.push({ out: out.map(q => [q[0], q[1]]), rim: rim.map(q => [q[0], q[1]]), inn: inn.map(q => [q[0], q[1]]), b: P(0, v0), mid: c, top: P(0, vr(0)), z: zz / out.length + gi * .02, inner, lit: inner ? clamp(.46 - .34 * li) : clamp(.56 + .5 * li), gi, i, go: g.go ? lerp(g.go[0], g.go[1], h(9)) : 0, vein: [P(0, .3), P(.05, .55), P(.02, .8)], vein2: [P(.45, .4), P(.5, .6), P(.46, .78)], size: r * len * .5 });
      }
    });
    return list.sort((a, b) => a.z - b.z);
  }
  const leafShape = (x, y, l, a, w, k = 1) => { const c = cos(a), q = sin(a), P = (u, v) => [x + (u * c - v * q) * l, y + (u * q + v * c) * l]; return [P(0, 0), P(.22, -w * .7), P(.55, -w), P(.85, -w * .5), P(1.05, .04), P(.8, w * .55 * k), P(.5, w * .95 * k), P(.2, w * .6 * k)]; };
  // a rose leaf: five leaflets on one stalk
  function leaf5(x, y, l, a, sd) { const c = cos(a), q = sin(a), out = [], A = (u, v) => [x + (u * c - v * q) * l, y + (u * q + v * c) * l], j = k => (hash(sd, k, 3) - .5) * .3; [[.32, 1], [.32, -1], [.68, 1], [.68, -1]].forEach(([u, sg], i) => { const b = A(u, sg * .03); out.push(leafShape(b[0], b[1], l * (u < .5 ? .36 : .42), a + sg * (1.0 + j(i)), .36)); }); const e = A(.84, 0); out.push(leafShape(e[0], e[1], l * .46, a + j(7), .36)); return { polys: out, rachis: [[x, y], A(.5, .02), A(.86, 0)] }; }
  // many small blooms laid in a few passes: guard petals, cup, heart, rims
  function blooms(p, list, L, d) {
    if (!list.length) return; const nk = L.tk > .5 ? .5 : 0, c = mixc(seen(ROSE, L, d), RED, .28 + nk), dk = mixc(seen(RED_DEEP, L, d), RED, .12 + nk * .5), lt = mixc(seen(ROSE_PALE, L, d), L.sun, .12), gr = mixc(seen('#6f7a4c', L, d), L.shade, .2), A0 = [], A1 = [], B0 = [], H0 = [], LP = [], SP = [], ln1 = [], cen = [];
    list.forEach(q => {
      const r = q.r, open = q.open ?? 1; if (r < 1.5) return; const rot = q.rot ?? 0, tl = q.tilt ?? (.35 + .95 * hash(q.seed, 1, 5));
      if (open < .36) { const u = (a, b) => [q.x + (a * cos(rot) - b * sin(rot)) * r, q.y + (a * sin(rot) + b * cos(rot)) * r]; A0.push(spline([u(0, -.72), u(.24, -.4), u(.27, 0), u(0, .24), u(-.27, 0), u(-.24, -.4)], 3, true)); SP.push(spline([u(-.24, .02), u(0, .1), u(.24, .02), u(.2, .34), u(0, .46), u(-.2, .34)], 3, true)); ln1.push([u(-.02, -.66), u(.12, -.3), u(.04, .1)]); SP.push(leafShape(...u(-.12, .26), r * .5, -PI / 2 + rot - .35, .16)); SP.push(leafShape(...u(.12, .26), r * .46, -PI / 2 + rot + .35, .16)); return; }
      const ps = rose3({ x: q.x, y: q.y, r: r * .8, seed: q.seed, open, tilt: tl, rot, rings: RING_SMALL, trim: true });
      ps.forEach((z, k) => { const pl = spline(z.out, 2, true); if (z.gi < 2) (z.lit > .52 ? A1 : A0).push(pl); else if (z.gi === 2) B0.push(pl); else H0.push(pl); if ((z.gi < 2 && z.lit > .34) || (z.gi === 2 && z.lit > .5)) LP.push(z.rim.slice(1, 8).concat(z.inn.slice(1, 8).reverse())); if (r > 11 && (k + q.seed) % 4 === 0 && z.gi < 3) ln1.push(z.rim.slice(1, 8)); });
      cen.push([q.x, q.y, r]);
    });
    if (SP.length) p.mass(poly(...SP), { color: gr, dir: 1.4, size: .34, len: .34 });
    if (A0.length) p.mass(poly(...A0), { color: mixc(c, dk, .22), dir: .5, size: .38, len: .38, vary: .45 }); if (A1.length) p.mass(poly(...A1), { color: mixc(c, lt, .14), dir: -.6, size: .38, len: .38, vary: .45 });
    if (B0.length) p.mass(poly(...B0), { color: mixc(c, dk, .5), dir: 1.1, size: .34, len: .34, vary: .4 }); if (H0.length) p.mass(poly(...H0), { color: dk, dir: .2, size: .34, len: .34, vary: .3 }); if (LP.length) p.mass(poly(...LP), { color: mixc(lt, c, .12), alpha: .92, dir: -.2, size: .34, len: .34, vary: .3 });
    ln1.slice(0, 80).forEach(l => p.line(l, { color: dk, w: 1.7, press: .55, taper: [.2, .4], wobble: .6 }));
    cen.forEach(([x, y, r], i) => { if (r < 9) return; const sp = []; for (let j = 0; j < 6; j++) { const a = i + j * 1.15, q = r * (.04 + .04 * j); sp.push([x + cos(a) * q * 1.1, y - r * .05 + sin(a) * q * .75]); } p.line(sp, { color: mixc(dk, INK, .25), w: max(1.4, r * .07), press: .7, taper: [.1, .5], wobble: .5 }); });
  }
  const bloom = (p, x, y, r, seed, L, d, open = 1, rot = 0, tilt) => blooms(p, [{ x, y, r, seed, open, rot, tilt }], L, d);
  W.bloom = bloom; W.blooms = blooms;

  // rose(p,{x,y,r,apart 0..1,seed,rot,tilt,open,light,stem,stemTo,leaves,shake,wind,t0}) the close rose; petals let go one after another as apart rises
  // returns {loose:[{x,y,rot,yaw,age}]} ; loose petals are drawn too unless loose:false
  W.rose = function (p, o) {
    const { x, y } = o, r = o.r || 120, sd = o.seed || 1, L = lightOf(o.light || 'day'), ap = clamp(o.apart ?? 0), rot = o.rot || 0, span = o.span ?? 2.6, t = o.t ?? p.t, shake = o.shake || 0, dim = L.tk * .5, tilt = o.tilt ?? .95, open = o.open ?? 1;
    const base = mixc(ROSE, L.tint, dim), deep = mixc(RED_DEEP, L.tint, dim * .8), pale = mixc(ROSE_PALE, L.sun, .22), loose = [], C = landPal({ light: L, season: o.season ?? .4, colour: o.colour ?? .6 }, 0), gr = mixc(C.dark, '#6f7a4c', .45), bs = [x - sin(rot) * 0, y], jx = shake * noise1(t * 9, sd) * r * .03, jy = shake * noise1(t * 11, sd + 3) * r * .02;
    const ax = [sin(rot) * sin(tilt), -cos(rot) * sin(tilt)], under = k => [bs[0] - ax[0] * r * k, bs[1] - ax[1] * r * k];
    if (o.stem !== false) {
      const s0 = under(.06), st = o.stemTo || [x + r * .2, y + r * 3.1], bend = [lerp(s0[0], st[0], .45) - r * .2, lerp(s0[1], st[1], .5)], rb = ribbon(spline([s0, bend, st], 8, false), u => r * .04 * (1 + u * .6), { step: 20, rough: 1 }); p.mass(rb.poly, { sharp: true, color: gr, dir: 1.5, size: .42, len: .7 }); ln(p, rb.R, { color: L.ink, w: 1.8, press: .5 });
      [[.3, 1], [.46, -1], [.6, 1], [.78, -1]].forEach(([u, sg]) => { const q = track(rb.L).at(u); p.mass([[q[0], q[1] - r * .03], [q[0] + sg * r * .09, q[1] - r * .05], [q[0], q[1] + r * .04]], { sharp: true, color: '#8a6a48', size: .34, len: .34, dir: 0 }); });
      if (o.leaves !== false) [[.42, .5, 1.25], [.66, 2.7, 1.1], [.82, .25, .9]].forEach(([u, a, k], i) => { const q = track(rb.L).at(u), lf = leaf5(q[0], q[1], r * k, a, i + sd); lf.polys.forEach((z, j) => { p.mass(z, { color: (i + j) % 2 ? C.mid : mixc(C.mid, C.dark, .4), dir: a + (j - 2) * .4, size: .42, len: .5, vary: .5 }); }); ln(p, lf.rachis, { color: C.deep, w: 2, press: .6 }); lf.polys.forEach((z, j) => { ln(p, [z[0], z[4]], { color: C.deep, w: 1.2, press: .42, taper: [.05, .6] }); if (j % 2) ln(p, z.slice(1, 5), { color: L.ink, w: 1.2, press: .34 }); }); });
    }
    // hip and sepals
    const hp = under(.02); p.mass(lump(hp[0], hp[1] + r * .05, r * .17, r * .2, 4, { n: 9, rough: .08 }), { color: gr, dir: 1.5, size: .4, len: .5 }); for (let i = 0; i < 5; i++) { const a = PI / 2 + (i - 2) * .62 + rot * .5; ln(p, [[hp[0] + cos(a) * r * .1, hp[1] + r * .06 + sin(a) * r * .06], [hp[0] + cos(a) * r * .4, hp[1] + r * .1 + sin(a) * r * .22], [hp[0] + cos(a) * r * .62, hp[1] + r * .02 + sin(a) * r * .42]], { color: gr, w: r * .042, press: .85, taper: [.02, .8] }); }
    const ps = rose3({ x: x + jx, y: y + jy, r: r * .92, seed: sd, open, tilt, rot, droop: (gi, i) => { const g = RING_FULL[gi], th = lerp(g.go[0], g.go[1], hash(i + gi * 11, sd, 9)) * .94; return ap > 0 ? .55 * ease.in(clamp((ap - th + .09) / .09)) + ap * .12 : 0; } });
    ps.forEach((z, k) => {
      const th = z.go * .94;
      if (ap > th + .001) { const a0 = Math.atan2(z.mid[1] - y, z.mid[0] - x), age = (ap - th) * span / .6, at = o.path ? o.path(th) : [x, y], fl = W.flutter(sd * 31 + z.gi * 9 + z.i, age, Object.assign({ key: 'r', x: z.mid[0] - x + at[0], y: z.mid[1] - y + at[1], rot: a0, vx: cos(a0) * 36, vy: -6, wind: o.wind, t0: Math.round(((o.t0 ?? 0) + th) * 12) / 12 }, o.fall || {})); loose.push(Object.assign(fl, { age, s: r * .34 * (1.1 - z.gi * .1), tone: hash(k, sd, 6) })); return; }
      const li = z.lit, b = [z.b[0], z.b[1]], m = [z.top[0], z.top[1]], dg = { lin: [b[0], b[1], m[0], m[1]] }, dpt = z.gi / 5, dir = Math.atan2(m[1] - b[1], m[0] - b[0]);
      if (z.gi > 0 || k > 4) p.shade(z.out.map(q => [lerp(z.mid[0], q[0], 1.06) + r * .025, lerp(z.mid[1], q[1], 1.06) + r * .04]), { color: deep, alpha: .34, soft: r * .09 });
      dg.stops = z.inner ? [[0, mixc(deep, INK, .12)], [.4, mixc(base, deep, .62 + .1 * dpt)], [.78, mixc(base, deep, .28 * (1 - li) + .22 * dpt)], [1, mixc(base, pale, .34 * li)]] : [[0, mixc(base, deep, .5)], [.45, mixc(base, deep, .3 * (1 - li) + .1 * dpt)], [.85, mixc(base, pale, .3 * li)], [1, mixc(base, pale, .2 + .4 * li)]];
      p.mass(z.out, { color: dg, dir, size: .46, len: .46, vary: .42 });
      p.mass(z.rim.concat(z.inn.slice().reverse()), { color: mixc(pale, base, .18 + .5 * (1 - li)), alpha: .88, dir: dir + PI / 2, size: .34, len: .44, vary: .3 });
      ln(p, z.rim, { color: mixc(deep, INK, .25), w: 1.5, press: .46, wobble: 1.3, taper: [.2, .35] });
      if (z.gi < 4) { ln(p, z.inn.slice(1, 8), { color: mixc(deep, base, .25), w: 1.2, press: .34, taper: [.3, .45], wobble: 1.2 }); ln(p, z.vein, { color: deep, w: 1.1, press: .3, taper: [.2, .7] }); if (k % 2) ln(p, z.vein2, { color: z.inner ? deep : mixc(pale, base, .4), w: 1.2, press: .28, taper: [.3, .7] }); }
      else ln(p, [z.out[0], z.out[1], z.out[2], z.rim[0]], { color: mixc(deep, INK, .4), w: 1.6, press: .6, taper: [.2, .3] });
    });
    if (ap > .95) { const k = ss(.95, 1, ap); for (let i = 0; i < 13; i++) { const a = PI + i / 12 * PI; ln(p, [[hp[0] + cos(a) * r * .06, hp[1] - r * .06 + sin(a) * r * .03], [hp[0] + cos(a) * r * .22, hp[1] - r * .08 + sin(a) * r * .18]], { color: i % 2 ? '#8d6f3a' : '#c7a45a', w: 1.8, press: .7 * k }); } }
    if (o.loose !== false) loose.forEach(l => W.petal(p, Object.assign({ light: L }, l)));
    return { loose, under: hp };
  };
  // how a petal really comes down: falls edge-on fast, broadside slow, tips and glides. deterministic in age.
  const FL = new Map();
  W.flutter = function (seed, age, o = {}) {
    const H = 1 / 48, key = seed + '|' + (o.key || '') + '|' + Math.round(o.x) + ',' + Math.round(o.y) + ',' + Math.round((o.vx || 0)) + ',' + Math.round((o.rot || 0) * 10) + '|' + Math.round((o.t0 || 0) * 12); let S = FL.get(key);
    if (!S) { if (FL.size > 400) FL.clear(); S = { st: [], v: [o.vx || 0, o.vy || 0], x: o.x, y: o.y, th: o.rot ?? hash(seed, 1, 1) * TAU, w: (hash(seed, 2, 1) - .5) * 7, yaw: hash(seed, 3, 1) * TAU }; S.st.push([S.x, S.y, S.th, S.yaw]); FL.set(key, S); }
    const g = (o.g ?? 430) * (.8 + .4 * hash(seed, 5, 1)), kp = (o.drag ?? 3.4) * (.6 + .9 * hash(seed, 4, 1)), kl = .4 + .3 * hash(seed, 7, 1), gw = o.wind ? windOf(o.wind) : null, t0 = o.t0 || 0, wp = (o.windPower ?? 400) * (.4 + 1.0 * hash(seed, 6, 1));
    const need = Math.min(48 * 14, Math.max(0, Math.round(age / H)));
    while (S.st.length <= need) {
      const tt = t0 + S.st.length * H, wx = gw ? gw(tt, S.x, S.y) * wp : 0, wy = gw ? -abs(wx) * .16 * noise1(tt * 1.7, seed) : 0, rx = S.v[0] - wx, ry = S.v[1] - wy, c = cos(S.th), q = sin(S.th), along = rx * c + ry * q, across = -rx * q + ry * c, fa = -kl * along, fc = -kp * across * (.35 + abs(across) / 260);
      S.v[0] += (fa * c - fc * q) * H; S.v[1] += (fa * q + fc * c + g) * H; S.w += (-.0042 * along * across * .9 - 1.6 * S.w + 3.2 * noise1(tt * 2.1, seed + 9)) * H * 4; S.w = clamp(S.w, -9, 9); S.th += S.w * H; S.yaw += (1.4 + 2 * noise1(tt, seed + 3)) * H; S.x += S.v[0] * H; S.y += S.v[1] * H; if (o.floor != null && S.y > o.floor) { S.y = o.floor; S.v = [0, 0]; S.w *= .2; S.th = lerp(S.th, Math.round(S.th / PI) * PI, .2); }
      S.st.push([S.x, S.y, S.th, S.yaw]);
    }
    const z = S.st[need]; return { x: z[0], y: z[1], rot: z[2], yaw: z[3] };
  };
  // petal(p,{x,y,s,rot,yaw,tone,light}) one cupped petal seen from wherever it has turned to
  W.petal = function (p, o) {
    const { x, y } = o, s = o.s || 18, a = o.rot || 0, yw = o.yaw || 0, L = lightOf(o.light || 'day'), f = .22 + .78 * abs(cos(yw)), back = cos(yw) < 0, tn = o.tone ?? .5, c = mixc(mixc(back ? ROSE_PALE : ROSE, back ? ROSE : ROSE_PALE, .3 * tn), L.tint, L.tk * .45), dk = mixc(RED_DEEP, L.tint, L.tk * .3), P = (u, v) => [x + (u * cos(a) - v * f * sin(a)) * s, y + (u * sin(a) + v * f * cos(a)) * s], cp = .25 * sin(yw * 1.3), i = Math.round(tn * 97);
    const sh = [P(-.9, 0), P(-.5, -.5 + cp * .4), P(.1, -.82 + cp), P(.66, -.62 + cp), P(.84, -.16 + cp * .6), P(.74, .06 + cp * .5), P(.9, .3 + cp * .5), P(.6, .72 + cp * .6), P(0, .78 + cp), P(-.55, .44 + cp * .4)];
    p.mass(sh, { color: c, dir: a + .3, size: max(.34, min(.5, s / 50)), len: .42, vary: .4 });
    if (s > 10) p.mass([P(.1, -.8 + cp), P(.66, -.62 + cp), P(.84, -.16 + cp * .6), P(.9, .3 + cp * .5), P(.66, .16 + cp * .5), P(.5, -.3 + cp * .6)], { color: back ? mixc(c, dk, .3) : mixc(ROSE_PALE, L.sun, .25), alpha: .85, dir: a, size: .34, len: .4 });
    ln(p, [P(.86, .3 + cp * .5), P(.6, .72 + cp * .6), P(0, .78 + cp), P(-.55, .44 + cp * .4), P(-.9, 0)], { color: dk, w: s > 16 ? 2.2 : 1.4, press: .6, taper: [.2, .4], wobble: .7 }); if (s > 14) ln(p, [P(-.84, 0), P(-.2, .06 + cp * .4), P(.5, .04 + cp * .6)], { color: dk, w: 1.6, press: .4, taper: [.05, .7] });
  };
  // petals(p,{t, t0, n, from:[x,y] or fn(i), spread, wind, s, floor, seed, light}) a handful that has been let go
  W.petals = function (p, o) { const t = o.t ?? p.t, n = o.n || 7, out = []; for (let i = 0; i < n; i++) { const h = k => hash(i, o.seed || 1, k), t0 = (o.t0 || 0) + (o.every ?? .22) * i * (.6 + .8 * h(1)); if (t < t0) continue; const f = typeof o.from === 'function' ? o.from(i) : [(o.from || [960, 300])[0] + (h(2) - .5) * (o.spread ?? 120), (o.from || [960, 300])[1] + (h(3) - .5) * (o.spread ?? 120) * .5]; const z = W.flutter((o.seed || 1) * 100 + i, t - t0, { key: 'p', x: f[0], y: f[1], rot: h(4) * TAU, vx: (h(5) - .4) * 120 * (o.throw ?? 1), vy: -60 * h(6) * (o.throw ?? 1), wind: o.wind, t0, floor: o.floor != null ? o.floor + (h(8) - .5) * 60 : null, g: o.g, windPower: o.windPower }); if (z.x < -60 || z.x > 1980 || z.y > 1140) continue; W.petal(p, Object.assign({ s: (o.s || 20) * (.7 + .6 * h(7)), tone: h(9), light: o.light }, z)); out.push(z); } return out; };

  // roseBush(p,{x,y middle of the foot, scale, w, h, bloom 0..1, season, seed, wind, t, light, colour, leaf, canes, hang}) an old rambling rose.
  // hang:true gives only canes falling from x,y (over a wall top). returns .heads
  W.roseBush = function (p, o) {
    const s = o.scale || 1, t = o.t ?? p.t, g = windOf(o.wind), L = lightOf(o.light), d = o.d ?? .05, se = o.season ?? .33, C = landPal({ light: L, season: se, colour: o.colour ?? .55 }, d), sd = o.seed || 1, R = rngOf(sd * 3 + 5), bl = clamp(o.bloom ?? 1), leaf = o.leaf ?? (se > .8 ? 0 : se > .55 ? 1 - (se - .55) / .25 * .85 : 1), wd = (o.w || 340) * s, ht = (o.h || 210) * s, n = o.canes ?? 9, canes = [], lw = v => max(1.2, v * Math.sqrt(s)), gr = o.grow ?? 1, hang = o.hang, side = L.side;
    const bw = (x, y, k = 1) => { const h = clamp((o.y - y) / ht), b = g(t - .12 * h, x, y) * k * (hang ? 1 : h * h + .15); return [x + b * 9 * s, y + abs(b) * 2 * s]; };
    const topAt = u => ht * gr * Math.pow(max(0, sin(PI * clamp(u))), .62) * (.74 + .3 * noise1(u * 3.4 + sd, sd) + .16 * noise1(u * 8.7, sd + 3));
    const lv = [[], [], []], rach = [], heads = [];
    const addLeaf = (x, y, l, a, tone, sd2) => { const q = bw(x, y), b = g(t, x, y), lf = leaf5(q[0], q[1], l, a + b * .22, sd2); lv[tone].push(...lf.polys); if (rach.length < 26 && hash(sd2, 4, 4) < .35) rach.push(lf.rachis); };
    if (!hang) {
      // the body of the bush, dark inside, then the side the light gets
      const edge = []; for (let i = 0; i <= 26; i++) { const u = i / 26, q = bw(o.x + (u - .5) * wd, o.y - topAt(u) * .88); edge.push([q[0] + 9 * s * noise1(i * 1.7, sd + 5), q[1] + 12 * s * noise1(i * 1.3, sd + 8)]); } const body = edge.concat([[o.x + wd * .46, o.y + 8], [o.x, o.y + 12], [o.x - wd * .46, o.y + 8]]);
      if (leaf > .04) { p.mass(body, { sharp: true, color: { lin: [0, o.y - ht, 0, o.y], stops: [[0, mixc(C.dark, C.mid, .25)], [.5, mixc(C.dark, C.shade, .3)], [1, mixc(C.shade, C.deep, .55)]] }, alpha: .95 * min(1, leaf * 1.15), dir: .7, size: .5, len: .5, vary: .6 }); const lit = []; for (let i = 0; i < 9; i++) { const u = .12 + .76 * R(), v = .45 + .5 * R(), q = bw(o.x + (u - .5) * wd * .92 + side * wd * .04, o.y - topAt(u) * v); lit.push(spline(lump(q[0], q[1], (24 + 26 * R()) * s, (15 + 14 * R()) * s, i + sd, { n: 9, rough: .35 }), 3, true)); } p.mass(poly(...lit), { color: mixc(C.mid, C.dark, .25), alpha: .6 * leaf, dir: -.5, size: .46, len: .44, vary: .6, soft: 4 }); }
      const N = Math.round(150 * (o.dens ?? 1)); for (let i = 0; i < N; i++) { const u = R(), v = Math.pow(R(), .7), k = R(), z = R(), y = topAt(u) * v, x = o.x + (u - .5) * wd; if (z > leaf * 1.04 || y < 8 * s) continue; const a = -PI / 2 + (u - .5) * 2.2 + (k - .5) * 1.5, up = v + (side < 0 ? .5 - u : u - .5) * .5; addLeaf(x, o.y - y, (21 + 14 * k) * s, a, up + (k - .5) * .5 > .78 ? 2 : up > .42 ? 1 : 0, i + sd * 50); }
    }
    // canes
    for (let i = 0; i < n; i++) {
      const u = hang ? (i + .5) / n : (i + .5 + (R() - .5) * .7) / n, sg = hang ? (R() < .5 ? -1 : 1) : u < .5 ? -1 : 1, out = hang ? .25 + R() * .5 : .5 + abs(u - .5), len = (hang ? (o.len || 90) : 120 + 130 * R()) * s * gr * (hang ? .5 + .9 * R() : 1), x0 = o.x + (u - .5) * wd * (hang ? 1 : .62), y0 = hang ? o.y + (R() - .5) * 6 * s : o.y - topAt(u) * (.35 + .4 * R()), pts = [[x0, y0]]; let an = hang ? PI / 2 - sg * (.9 + .5 * R()) : -PI / 2 + sg * (.15 + .75 * out) + (R() - .5) * .4, X = x0, Y = y0; for (let j = 1; j <= 6; j++) { an += sg * (hang ? -.05 : .12 + .1 * j * out) * (.6 + .8 * R()); if (hang) an += (PI / 2 - an) * .16; X += cos(an) * len / 6; Y += sin(an) * len / 6; pts.push(bw(X, Y, hang ? j / 6 : 1)); } canes.push(pts);
      ln(p, pts, { color: mixc(C.dark, '#6b5a44', .5), w: lw(2.6), press: .72, taper: [.04, .55], wobble: 1.1 });
      const T = track(pts); for (let j = 0; j < (hang ? 5 : 6); j++) { const k = R(), z = R(); if (z > leaf * 1.04) continue; const v = .25 + .75 * (j + k * .6) / 6, q = T.at(v), s2 = j % 2 ? 1 : -1; addLeaf(q[0], q[1], (22 + 13 * k) * s * (1.1 - v * .35), q[2] + s2 * (.6 + .5 * k), j % 3 === 0 ? 1 : 2, i * 20 + j + sd); }
    }
    if (leaf > .04) [mixc(C.dark, C.shade, .12), mixc(C.mid, C.dark, .42), mixc(C.lit, C.mid, .55)].forEach((c, i) => { if (lv[i].length) p.mass(poly(...lv[i]), { color: c, dir: [.5, -.6, 1.2][i], size: .36, len: .36, vary: .55 }); });
    rach.forEach(q => p.line(q, { color: mixc(C.dark, L.ink, .3), w: lw(1.7), press: .45, taper: [.1, .4] }));
    if (leaf < .5 && !hang) for (let i = 0; i < 16; i++) { const u = .1 + .8 * hash(i, sd, 51), q = bw(o.x + (u - .5) * wd * .9, o.y - topAt(u) * (.5 + .6 * hash(i, sd, 52))), b0 = [o.x + (u - .5) * wd * .5, o.y - 10]; ln(p, [b0, [lerp(b0[0], q[0], .5) + 14 * s * (hash(i, sd, 53) - .5), lerp(b0[1], q[1], .55)], q], { color: mixc(C.dark, '#6b5a44', .5), w: lw(1.8), press: .55 * (1 - leaf), taper: [.03, .6], wobble: 1.3 }); }
    // flowers: on the canes' ends, and scattered over the side that gets the sun; never two together
    const put = (x, y, r, rot, i) => { if (heads.some(h => hyp(h.x - x, h.y - y) < (h.r + r) * .74)) return; heads.push({ x, y, r, rot, k: hash(i, sd, 40), i }); };
    canes.forEach((c, i) => { const e = c[c.length - 1], z = c[c.length - 2]; put(e[0], e[1], (hang ? 11 : 12) * s * (.75 + .7 * hash(i, sd, 41)), Math.atan2(e[1] - z[1], e[0] - z[0]) + PI / 2, i); const q = track(c).at(.62); if (hash(i, sd, 45) < .6) put(q[0] + (hash(i, 2, 45) - .5) * 14 * s, q[1] - 10 * s, (8 + 9 * hash(i, sd, 46)) * s, (hash(i, 3, 45) - .5) * 2, i + 30); });
    if (!hang) for (let i = 0; i < (o.flowers ?? 44); i++) { const u = .06 + .88 * hash(i, sd, 47), v = .3 + .7 * hash(i, sd, 48), q = bw(o.x + (u - .5) * wd, o.y - topAt(u) * v); put(q[0], q[1], (8 + 15 * hash(i, sd, 49) * hash(i, sd, 50) + 3) * s, (u - .5) * 2.2 + (hash(i, 5, 45) - .5) * .8, i + 60); }
    const on = [], off = []; heads.forEach(h => { const a = clamp(bl * 1.5 - h.k * .55); (h.k < bl * 1.03 ? on : off).push(Object.assign(h, { open: hash(h.i, sd, 55) < .2 ? .25 : .55 + .45 * a, seed: h.i * 3 + sd, tilt: .35 + .95 * hash(h.i, sd, 56), r: h.r * (.7 + .3 * a) })); });
    if (off.length && se > .42) { const hips = off.map(h => spline(lump(h.x, h.y, h.r * .3, h.r * .27, h.i + 9, { n: 7, rough: .2 }), 2, true)); p.mass(poly(...hips), { color: mixc(seen('#8d7a4c', L, d), C.earth, .4), dir: 0, size: .34, len: .36 }); off.forEach(h => p.line([[h.x - 5 * s, h.y - 7 * s], [h.x, h.y - 2 * s], [h.x + 6 * s, h.y - 6 * s]], { color: C.deep, w: lw(1.8), press: .55 })); }
    on.sort((a, b) => a.y - b.y); blooms(p, on, L, d);
    if (leaf > .2) { const ov = []; on.forEach((h, i) => { if (i % 2) return; ov.push(...leaf5(h.x - h.r * .5, h.y + h.r * .55, 22 * s, .9 + hash(i, 3, 3) * 1.2, i).polys.slice(0, 4)); }); if (ov.length) p.mass(poly(...ov), { color: mixc(C.mid, C.lit, .15), dir: .3, size: .34, len: .34, vary: .5 }); }
    return { heads: on, canes, top: on[0] };
  };
  // dead heads: umbels, thistle and dock, nodding
  W.deadFlowers = function (p, o) {
    const t = o.t ?? p.t, g = windOf(o.wind), L = lightOf(o.light || 'rain'), d = o.d ?? .03, C = landPal({ light: L, season: o.season ?? .72, colour: o.colour ?? .5 }, d), n = o.n || 11, T = track(o.line || [[-20, 1000], [1940, 1010]]), H = o.h || 190, sd = o.seed || 1, col = mixc(seen('#6d5a42', L, d), L.ink, .25), pale = mixc(seen('#b59c70', L, d), L.haze, .1);
    for (let i = 0; i < n; i++) {
      const h = k => hash(i, sd, k), q = T.at((i + .5 + (h(1) - .5) * 1.1) / n), hh = H * (.55 + .7 * h(2)), kind = Math.floor(h(3) * 3), lean = (h(4) - .35) * .35, b = g(t - h(5) * .15, q[0], q[1]), th = lean + b * .42, nod = th * 1.5 + .25 * (h(6) - .3), x = q[0], y = q[1], m = [x + sin(th * .35) * hh * .5, y - cos(th * .35) * hh * .5], e = [m[0] + sin(th) * hh * .5, m[1] - cos(th) * hh * .5];
      ln(p, [[x, y + 6], m, e], { color: col, w: 3.6, press: .8, taper: [.02, .3], wobble: .8 });
      if (kind === 0) for (let j = -3; j <= 3; j++) { const a = nod - PI / 2 + j * .33, l = hh * .17 * (1 - abs(j) * .06), z = [e[0] + cos(a) * l, e[1] + sin(a) * l]; ln(p, [e, [(e[0] + z[0]) / 2 + j, (e[1] + z[1]) / 2 - 2], z], { color: col, w: 2, press: .7, taper: [.05, .2], wobble: .5 }); ln(p, [[z[0] - 4, z[1] + 1], [z[0], z[1] - 2], [z[0] + 5, z[1] + 1]], { color: j % 2 ? col : pale, w: 5, press: .8, medium: 'crayon', wobble: .4 }); }
      else if (kind === 1) { p.mass(lump(e[0], e[1], 11, 14, i + sd, { n: 9, rough: .25, rot: nod }), { color: mixc(col, pale, .3), dir: nod - 1.5, size: .34, len: .4 }); for (let j = -3; j <= 3; j++) { const a = nod - PI / 2 + j * .24; ln(p, [[e[0] + cos(a) * 8, e[1] + sin(a) * 8], [e[0] + cos(a) * (20 + 5 * h(7 + j)), e[1] + sin(a) * 22]], { color: j % 2 ? pale : col, w: 2.2, press: .7, taper: [.05, .5] }); } const l1 = [lerp(x, m[0], .9), lerp(y, m[1], .9)]; ln(p, [l1, [l1[0] + 22, l1[1] - 6], [l1[0] + 40, l1[1] + 8]], { color: col, w: 3, press: .6, taper: [.05, .6] }); }
      else for (let j = 0; j < 7; j++) { const u = .5 + j * .07, z = [lerp(m[0], e[0], (u - .5) * 2), lerp(m[1], e[1], (u - .5) * 2)]; ln(p, [[z[0] - 6 + j * .5, z[1] + 2], [z[0], z[1] - 3], [z[0] + 7 - j * .5, z[1] + 3]], { color: j % 2 ? col : mixc(col, pale, .4), w: 6 - j * .4, press: .8, medium: 'crayon', wobble: .8 }); }
    }
  };
  // tall(p,{x,y,n,h,spread,lean}) one clump of standing hay: blades, arching stems and three kinds of seed head, no two of a length
  W.tall = function (p, o) {
    const t = o.t ?? p.t, g = windOf(o.wind), C = o.C || landPal(o, o.d ?? .02), L = C.L, n = o.n || 14, H = o.h || 200, sd = o.seed || 1, sp = o.spread ?? 60, k0 = o.light1 ?? 0, al = o.alpha ?? 1, gold = mixc(C.dry, L.sun, .55), hot = mixc(L.sun, '#fff6da', .5), G = [[], []];
    for (let i = 0; i < n; i++) { const h = k => hash(i, sd, k), u = h(1) - .5, x = o.x + u * sp * 2, y = o.y + (h(2) - .5) * 22, l = H * (.3 + .55 * h(3)), b = g(t - .1 * h(4), x, y); G[h(5) < .5 ? 0 : 1].push([x, y, l, u * 1.1 + (h(6) - .5) * .5 + (o.lean || 0) + b * .8, 2 + l * .011]); }
    p.mass(ctx => { ctx.beginPath(); for (const b of G[0]) bladePath(ctx, b); }, { color: mixc(C.dark, C.mid, .45), dir: -1.5, size: .4, len: .5, vary: .45, alpha: al * .9 }); p.mass(ctx => { ctx.beginPath(); for (const b of G[1]) bladePath(ctx, b); }, { color: mixc(C.lit, L.sun, .35), dir: -1.35, size: .4, len: .5, vary: .45, alpha: al * .9 });
    const m = o.stems ?? Math.round(n * .7);
    for (let i = 0; i < m; i++) {
      const h = k => hash(i, sd + 40, k), u = h(1) - .5, x = o.x + u * sp * 1.8, y = o.y + (h(2) - .5) * 18, l = H * (.45 + .75 * h(3) * h(3) + .25 * h(7)), b = g(t - .14 * h(4), x, y - l * .5), th = u * .7 + (h(6) - .5) * .42 + (o.lean || 0) + b * .85, pts = [], seg = 5; let X = x, Y = y, a = -PI / 2 + th * .15; for (let j = 0; j <= seg; j++) { pts.push([X, Y, 1 - .1 * j]); a += th * .34 * (.5 + j * .28); X += cos(a) * l / seg; Y += sin(a) * l / seg; }
      const e = pts[seg], f = pts[seg - 1], an = Math.atan2(e[1] - f[1], e[0] - f[0]), lost = h(8) < .22, lit = h(9) < .5 + k0, c = lost ? hot : lit ? gold : h(10) < .5 ? mixc(C.dark, C.deep, .2) : mixc(C.mid, C.dark, .4), kind = Math.floor(h(11) * 4), s = .7 + .5 * h(12);
      p.line(pts, { color: c, w: (2.2 + 2 * h(13)) * (H > 200 ? 1.15 : 1), press: lost ? .5 : .78, taper: [.03, .25], wobble: .8, medium: lit || lost ? 'crayon' : 'graphite', alpha: al });
      if (kind === 0) p.line([[lerp(f[0], e[0], .5), lerp(f[1], e[1], .5)], e, [e[0] + cos(an) * 14 * s, e[1] + sin(an) * 14 * s]], { color: c, w: 8 * s, press: .75, taper: [.25, .35], medium: 'crayon', wobble: .5, alpha: al });
      else if (kind === 1) for (let j = 0; j < 5; j++) { const v = j / 5, q = [lerp(pts[3][0], e[0], v), lerp(pts[3][1], e[1], v)], sg = j % 2 ? 1 : -1, dr = 10 + 8 * h(20 + j); p.line([q, [q[0] + sg * 7 * s, q[1] + 2], [q[0] + sg * 11 * s + b * 4, q[1] + dr * s]], { color: lit ? hot : c, w: 3.6 * s, press: .72, taper: [.2, .3], medium: 'crayon', wobble: .4, alpha: al }); }
      else if (kind === 2) { for (let j = 0; j < 3; j++) { const v = .35 + j * .24, q = [lerp(f[0], e[0], v), lerp(f[1], e[1], v)]; p.line([q, [q[0] + cos(an - .55) * 10 * s, q[1] + sin(an - .55) * 10 * s]], { color: c, w: 4 * s, press: .7, taper: [.1, .6], medium: 'crayon', wobble: .3, alpha: al }); } p.line([e, [e[0] + cos(an + .3) * 9, e[1] + sin(an + .3) * 9]], { color: c, w: 4 * s, press: .7, taper: [.1, .6], medium: 'crayon', wobble: .3, alpha: al }); }
    }
  };
  // meadow(p,{rg|y, t, wind, light, colour, season, part:'back'|'mid'|'front'}) hay meadow at the top of summer, waist-high to a child
  W.meadow = function (p, o = {}) {
    const L = lightOf(o.light || 'summer'), t = o.t ?? p.t, se = o.season ?? .33, col = o.colour ?? 1, part = o.part, wind = o.wind ?? MEADWIND, C = landPal({ light: L, season: se, colour: col }, .03), C2 = landPal({ light: L, season: se, colour: col }, .3), base = { light: L, season: se, colour: col, t, wind }, y0 = o.y ?? 640, rg = o.rg || ridge([[-60, y0 + 30], [300, y0 - 6], [700, y0 + 20], [1100, y0 - 14], [1500, y0 + 10], [1980, y0 - 24]], { amp: 8, seed: 14, step: 26 }), gold = mixc(C.lit, L.sun, .6), hot = mixc(L.sun, '#fff4d2', .45);
    if (!part || part === 'back') {
      p.mass(below(rg, 1130), { sharp: true, color: { lin: [0, y0 - 20, 0, 1080], stops: [[0, mixc(C2.lit, L.sun, .6)], [.3, gold], [.62, mixc(C.mid, C.lit, .4)], [1, mixc(C.dark, C.mid, .45)]] }, dir: -1.2, len: .9, size: .85, vary: .6 });
      // the swell of the ground under the hay: light on the near side of each rise, cool in the hollows
      [[300, 720, 520, 34, -.06, 1], [1240, 712, 620, 36, .05, 0], [780, 770, 640, 40, -.03, 1], [1640, 800, 520, 46, .1, 0], [240, 850, 560, 50, -.08, 0], [1050, 862, 620, 52, .04, 1]].forEach((q, i) => p.mass(lump(q[0], q[1], q[2], q[3], i + 3, { n: 12, rough: .25, rot: q[4] }), { color: q[5] ? hot : mixc(C.mid, C.dark, .35), alpha: q[5] ? .5 : .42, dir: -1.25 + .1 * i, len: .7, size: .7, vary: .55, soft: 12 }));
      W.sward(p, Object.assign({ rg, depth: 300, n: 300, seed: 24, H: 30, d: .15 }, base));
      W.flowers(p, Object.assign({ rg, y0: 6, y1: 90, n: 46, s: .42, seed: 3, drift: 1 }, base));
    }
    if (!part || part === 'mid') {
      W.flowers(p, Object.assign({ rg, y0: 90, y1: 250, n: 84, s: .85, seed: 7, drift: 1 }, base));
      // clumps standing in the middle distance: gathered, then a gap, then a straggler
      [[120, 800, 12, 110], [190, 826, 16, 150], [330, 790, 8, 84], [520, 840, 9, 96], [1010, 806, 7, 70], [1260, 830, 13, 120], [1330, 800, 9, 92], [1590, 846, 17, 150], [1680, 812, 10, 104], [1860, 830, 15, 140]].forEach((q, i) => W.tall(p, Object.assign({ x: q[0], y: q[1], n: q[2], h: q[3], spread: 34 + q[2] * 2.4, seed: i + 5, C, light1: .1, lean: .06 * (i % 3 - 1) }, base)));
    }
    if (!part || part === 'front') {
      W.grass(p, Object.assign({ line: [[-40, 960], [500, 950], [1000, 966], [1500, 948], [1960, 960]], n: 46, h: 96, depth: 60, seed: 17, d: 0, lines: 60, stiff: .8 }, base));
      W.flowers(p, Object.assign({ rg: ridge([[-60, 960], [500, 948], [1000, 970], [1500, 944], [1980, 960]], { amp: 10, seed: 5 }), y0: -50, y1: 70, n: 44, s: 1.25, stems: 1, seed: 9, drift: 1 }, base));
      [[-10, 1060, 26, 420, .22], [120, 1074, 20, 330, .1], [270, 1062, 13, 230, .02], [420, 1080, 9, 170, -.04], [720, 1086, 6, 120, .05], [1200, 1084, 7, 130, -.03], [1480, 1070, 12, 230, -.02], [1640, 1066, 18, 320, -.12], [1800, 1060, 22, 400, -.16], [1930, 1070, 22, 440, -.26]].forEach((q, i) => W.tall(p, Object.assign({ x: q[0], y: q[1], n: q[2], h: q[3], spread: 46 + q[2] * 2.6, seed: i + 31, C, lean: q[4], light1: .15 }, base)));
    }
    return rg;
  };
  const MEADWIND = W.gusts({ seed: 31, every: 2.6, power: .7, base: .22 });
  W.flowers = function (p, o) {
    const t = o.t ?? p.t, g = windOf(o.wind), L = lightOf(o.light), C = landPal(o, .05), n = o.n || 30, s0 = o.s || 1, sd = o.seed || 1, G = { w: [], ws: [], y: [], m: [], e: [], r: [] }, stems = [], x0 = o.x0 ?? -20, x1 = o.x1 ?? 1940;
    // drift: flowers come in companies of one kind, thick here and absent there
    const cn = 7, cs = Array.from({ length: cn }, (_, i) => [lerp(x0, x1, (i + .9 * hash(i, sd, 61)) / cn), .12 + .76 * hash(i, sd, 62), 60 + 150 * hash(i, sd, 63), hash(i, sd, 64)]);
    for (let i = 0; i < n; i++) { const h = k => hash(i, sd, k), c = cs[Math.floor(h(20) * cn)], co = o.drift && h(21) < .8, x = co ? c[0] + (h(1) + h(22) - 1) * c[2] : lerp(x0, x1, h(1)), v = co ? clamp(c[1] + (h(2) + h(23) - 1) * .3) : h(2), y = yAt(o.rg, clamp(x, -60, 1980)) + lerp(o.y0 ?? 0, o.y1 ?? 100, v), s = s0 * (.65 + .6 * h(3)) * (1 + .35 * v), kind = co ? clamp(c[3] + (h(4) - .5) * .2) : h(4), b = g(t - .1 * h(5), x, y), len = (o.stems ? 110 : 18) * s * (.35 + .95 * h(6)), th = (h(7) - .4) * .4 + b * .55, e = [x + sin(th) * len, y - cos(th) * len], r = 9.5 * s;
      if (o.stems) stems.push([[x, y + 14], [x + sin(th * .4) * len * .55, y - len * .55], e]);
      if (kind < .38) { const fc = .5 + .45 * h(9), tn = (h(8) - .5) * .5; for (let j = 0; j < 9; j++) { const a = j / 9 * TAU + h(8) * 3, q = leafShape(cos(a) * r * .3, sin(a) * r * .3, r * (1 + .2 * hash(i, j, 3)), a, .24).map(z => [e[0] + z[0] + z[1] * tn * fc, e[1] + z[1] * fc]); G[sin(a) > .45 ? 'ws' : 'w'].push(q); } G.e.push(lump(e[0], e[1] - r * .06, r * .4, r * .34 * fc * 1.3, i, { n: 7, rough: .12 })); }
      else if (kind < .7) { G.y.push(lump(e[0], e[1], r * .6, r * .44, i + 3, { n: 8, rough: .24 })); if (h(24) < .5) G.y.push(lump(e[0] + r * 1.2, e[1] + r * .5, r * .36, r * .3, i + 9, { n: 7, rough: .24 })); } else if (kind < .88) { for (let j = 0; j < 5; j++) { const a = -PI / 2 + (j - 2) * .42; G.m.push(leafShape(e[0], e[1], r * .85, a, .22)); } } else { for (let j = 0; j < 4; j++) G.r.push(lump(e[0] + (j % 2 - .5) * r * .4, e[1] + j * r * .5, r * .28, r * .24, i * 5 + j, { n: 6, rough: .25 })); }
    }
    stems.forEach((q, i) => p.line(q, { color: i % 3 ? mixc(C.mid, C.dark, .5) : mixc(C.lit, L.sun, .3), w: 2.2 * s0, press: .62, taper: [.02, .3], wobble: .8 }));
    const K = { w: mixc('#f8f1de', L.tint, .05), ws: mixc('#d8cfb8', L.tint, .15), y: mixc('#eabf48', L.sun, .15), m: mixc('#9a7fa2', L.tint, .12), e: '#d9a63a', r: mixc('#a8805a', L.tint, .1) };
    for (const q of ['r', 'm', 'y', 'ws', 'w', 'e']) if (G[q].length) p.mass(poly(...G[q]), { color: K[q], dir: q === 'w' ? -.3 : .6, size: .34, len: .34, vary: .25 });
  };
  // ------------------------------------------------------------------ weather and small lives
  // birds(p,{t, x,y, n, dir, speed, spread, scale, seed, rise, light}) each bird flaps in its own bursts, then glides
  W.birds = function (p, o = {}) {
    const t = o.t ?? p.t, n = o.n || 7, sd = o.seed || 1, L = lightOf(o.light), s0 = o.scale || 1, dir = o.dir ?? -1, c = o.color || mixc(L.ink, L.haze, o.d ?? .25);
    for (let i = 0; i < n; i++) {
      const h = k => hash(i, sd, k), tt = t - (o.t0 || 0) - h(1) * (o.stagger ?? .5); if (tt < 0 && o.t0 != null) continue;
      const sp = (o.speed ?? 120) * (.8 + .4 * h(2)), x = (o.x ?? 1200) + dir * sp * tt + (h(3) - .5) * (o.spread ?? 420), y = (o.y ?? 300) - (o.rise ?? 24) * ease.out(clamp(tt / 3)) * 3 + (h(4) - .5) * (o.spread ?? 420) * .35 + 14 * noise1(tt * .9 + i * 3, sd); if (x < -80 || x > 2000) continue;
      const s = s0 * (9 + 8 * h(5)), burst = noise1(tt * .55 + i * 2.7, sd + 1) > -.25 || tt < 1.2, ph = (tt * (3.4 + h(6)) + h(7)) % 1, w = burst ? [1, .35, -.75, -.1][Math.floor(ph * 4)] : .28 + .1 * noise1(tt * 2, i), fx = dir;
      const wing = sg => [[x, y, 1], [x + sg * s * .55 + fx * s * .12, y - s * .62 * w - s * .08, .9], [x + sg * s * 1.25 - fx * s * .18, y - s * (w > 0 ? .3 : .75) * w + s * .1 * (w < 0 ? -1 : 1), .4]];
      ln(p, wing(-1), { color: c, w: 2 + s * .07, press: .8, taper: [.02, .6], wobble: .4 }); ln(p, wing(1), { color: c, w: 2 + s * .07, press: .8, taper: [.02, .6], wobble: .4 }); ln(p, [[x - fx * s * .4, y + 1], [x, y], [x + fx * s * .3, y - 1]], { color: c, w: 2.4 + s * .09, press: .85, taper: [.2, .3], wobble: .3 });
    }
  };
  // rain(p,{t,k 0..1,wind,light,depth}) squalls of slanted strokes; whole bands arrive and thin
  W.rain = function (p, o = {}) {
    const t = o.t ?? p.t, k = o.k ?? 1, L = lightOf(o.light || 'rain'), sl = o.slant ?? .32, sd = o.seed || 1, n = Math.round((o.n || 120) * k), c = mixc(L.cl, '#ffffff', .25), dk = mixc(L.shade, L.haze, .35), m = Math.round(t * 12);
    const veil = []; for (let j = 0; j < 3; j++) { const x = ((j * 760 + t * 210 + sd * 300) % 2900) - 500, w = 260 + 120 * hash(j, sd, 1); p.shade([[x, -40], [x + w, -40], [x + w - 420 * sl, 1100], [x - 80 - 420 * sl, 1100]], { color: L.cs, alpha: .13 * k, soft: 70, mode: 'multiply' }); }
    for (let i = 0; i < n; i++) { const h = q => hash(i + m * 7, sd, q), x = h(1) * 2200 - 60, gap = .5 + .5 * noise1(x / 330 - t * 1.6, sd); if (h(2) > .35 + .65 * gap) continue; const y = h(3) * 1150 - 60, l = (28 + 70 * h(4)) * (.6 + .6 * gap); ln(p, [[x, y], [x - sl * l * .5, y + l * .5], [x - sl * l, y + l]], { color: i % 3 ? c : dk, w: i % 3 ? 2.2 : 1.6, press: .28 + .3 * h(5), taper: [.5, .15], wobble: .3 }); }
  };
  // stars(p,{n, area, t, k, seed}) pricked out one by one with the eraser and a white pencil
  W.stars = function (p, o = {}) {
    const t = o.t ?? p.t, k = o.k ?? 1, n = o.n || 200, sd = o.seed || 1, [x0, y0, x1, y1] = o.area || [0, 0, 1920, 640], R = rngOf(sd * 9 + 1), dots = [], pts = [], m = Math.round(t * 12);
    for (let i = 0; i < n; i++) { const x = lerp(x0, x1, R()), v = Math.pow(R(), 1.25), y = lerp(y0, y1, v), big = R(), on = R(); if (on > k) continue; if (pts.some(q => hyp(q[0] - x, q[1] - y) < 26)) continue; pts.push([x, y]); const c = big > .84 ? '#f9efd0' : big > .5 ? '#ece6d2' : '#c9d1d8', fade = 1 - .4 * v;
      if (big > .84) { const r = 8 + 11 * R() * R() + (big > .96 ? 11 : 0), a = R() * .5, tw = .75 + .35 * hash(i, Math.floor(m / 3 + R() * 3), 4); for (let j = 0; j < 2; j++) { const b = a + j * PI / 2; ln(p, [[x - cos(b) * r * tw, y - sin(b) * r * tw, .2], [x, y, 1], [x + cos(b) * r * tw, y + sin(b) * r * tw, .2]], { color: c, w: 3, press: .9 * fade, taper: [.4, .4], wobble: .5 }); } p.dust(x, y, 5, { color: c, n: 5, seed: i, size: 1.3 }); }
      else if (big > .45) { ln(p, [[x - 2.4, y], [x + 2.4, y + 1.6]], { color: c, w: 3 + 2 * (big - .45), press: .85 * fade, taper: [.1, .1], wobble: .4 }); }
      else p.dust(x, y, 3.2, { color: c, n: 2, seed: i, alpha: fade, size: 1.1 });
    }
    if (o.way) { const A0 = [], B0 = []; for (let i = 0; i <= 10; i++) { const u = i / 10, X = lerp(120, 1840, u), Y = lerp(y0 + (y1 - y0) * .78, y0 + 30, u) + 46 * noise1(u * 4, 3), w = 46 + 60 * sin(PI * u) + 26 * noise1(u * 6, 5); A0.push([X, Y - w]); B0.push([X, Y + w]); } p.mass(A0.concat(B0.reverse()), { color: { lin: [300, y1, 1600, y0], stops: [[0, 'rgba(120,142,164,0)'], [.5, 'rgba(142,160,178,.5)'], [1, 'rgba(120,142,164,.12)']] }, alpha: k, dir: -.32, len: 1.2, size: 1, vary: .35, soft: 40 }); for (let i = 0; i < 9; i++) { const u = i / 8; p.dust(lerp(180, 1780, u), lerp(y0 + (y1 - y0) * .78, y0 + 30, u) + 46 * noise1(u * 4, 3), 150, { color: i % 2 ? '#d5dade' : '#b4c0ca', n: 70, seed: i + 30, alpha: .75 * k, size: .8 }); } }
    return pts;
  };
  // snow(p,{t, fall 0..1, wind, depth:'far'|'near'|'all', seed}) flakes drawn one at a time, each with its own idle path
  W.snow = function (p, o = {}) {
    const t = o.t ?? p.t, k = clamp(o.fall ?? 1), g = windOf(o.wind), sd = o.seed || 1, dp = o.depth || 'all', col = o.color || '#f7f3ea', edge = o.edge || '#a9b6bf';
    const path = (i, cls, v, sway, sc) => { const h = q => hash(i, sd + cls * 10, q), life = 1220 / v, tt = t + h(1) * life, y = ((tt % life) / life) * 1220 - 70, w = g(t - h(2) * .3, 960, y) * 130 * sc, x = h(3) * 2100 - 90 + sway * (noise1(tt * .42 + i * 1.9, sd) + .55 * noise1(tt * 1.1 + i, sd + 4)) + w * .6 + (tt % life) * 16 * sc; return [((x + 100) % 2140 + 2140) % 2140 - 100, y]; };
    if (dp !== 'near') { const a = [], a2 = []; for (let i = 0; i < 130 * k; i++) { const q = path(i, 1, 46 + 26 * hash(i, sd, 9), 26, .3), r = 2.6 + 2.8 * hash(i, sd, 8); a.push(lump(q[0], q[1], r * 1.2, r, i, { n: 6, rough: .3 })); a2.push(lump(q[0] + r * .5, q[1] + r * .7, r * 1.2, r, i, { n: 6, rough: .3 })); } if (a.length) { p.mass(poly(...a2), { color: edge, alpha: .55, dir: .5, size: .34, len: .34, vary: .1 }); p.mass(poly(...a), { color: col, dir: .5, size: .34, len: .34, vary: .06 }); } }
    if (dp !== 'far') {
      const b = [], b2 = []; for (let i = 0; i < 64 * k; i++) { const q = path(i, 2, 88 + 40 * hash(i, sd, 7), 52, .7), r = 5.5 + 5 * hash(i, sd, 6); b.push(lump(q[0], q[1], r, r * .86, i, { n: 8, rough: .26, rot: t * .7 + i })); b2.push(lump(q[0] + r * .35, q[1] + r * .5, r, r * .86, i, { n: 8, rough: .26, rot: t * .7 + i })); } if (b.length) { p.mass(poly(...b2), { color: edge, alpha: .6, dir: -.4, size: .36, len: .36, vary: .1 }); p.mass(poly(...b), { color: col, dir: -.4, size: .36, len: .36, vary: .06 }); }
      for (let i = 0; i < 18 * k; i++) { const q = path(i, 3, 150 + 60 * hash(i, sd, 5), 90, 1.25), r = 11 + 11 * hash(i, sd, 4), sh = lump(q[0], q[1], r, r * .84, i + 3, { n: 10, rough: .26, rot: t * .9 + i }); p.mass(pmap(sh, (x, y) => [x + r * .28, y + r * .42]), { color: edge, alpha: .5, dir: i, size: .46, len: .42, soft: 3 }); p.mass(sh, { color: col, dir: i, size: .46, len: .42, vary: .08, soft: 2 }); ln(p, [sh[2], sh[4], sh[6]], { color: edge, w: 1.2, press: .4, taper: [.3, .5], wobble: .9 }); }
    }
  };
  // footprints(p,{pts, k, w:[far,near], light}) pressed into snow, left and right
  W.footprints = function (p, o) { const T = track(spline(o.pts, 8, false)), [w0, w1] = o.w || [3, 13], k = o.k ?? 1, a = [], b = []; let d = 0, i = 0; while (d < T.len * k) { const u = d / T.len, s = lerp(w0, w1, Math.pow(u, o.power || 1.4)), q = T.s(d), sg = i % 2 ? 1 : -1, x = q[0] - sin(q[2]) * s * .62 * sg, y = q[1] + cos(q[2]) * s * .62 * sg * .6; a.push(spline(lump(x, y, s * .78, s * .42, i, { n: 8, rough: .16, rot: q[2] }), 2, true)); b.push([[x - s * .6, y - s * .34], [x + s * .5, y - s * .36], [x + s * .3, y - s * .5], [x - s * .4, y - s * .5]]); d += s * 2.5 * (.85 + .3 * hash(i, 3, 3)); i++; } if (a.length) { p.mass(poly(...a), { color: o.color || '#8fa1b0', dir: .2, size: .36, len: .4, vary: .25 }); p.mass(poly(...b), { color: '#fbf8f1', dir: 0, size: .34, len: .4, vary: .1 }); } return T; };
  // snowGround(p,{rg,foot,light,k}) the land with the colour snowed out of it
  W.snowGround = function (p, o) { const L = lightOf(o.light || 'snow'), rg = o.rg, k = o.k ?? 1, y0 = min(...rg.map(q => q[1])), yb = o.foot || 1130; p.mass(below(rg, yb), { sharp: true, color: { lin: [0, y0, 0, yb], stops: [[0, mixc('#eeeae1', L.cl, .4)], [.4, '#eae7df'], [1, o.low || '#dcdfdf']] }, alpha: k, dir: o.dir ?? .06, len: 1.3, size: .9, vary: .2 }); const R = rngOf(o.seed || 4); for (let i = 0; i < (o.n ?? 6); i++) { const x = R() * 1900, v = .12 + .8 * R(), y = yAt(rg, x) + v * (min(yb, 1080) - yAt(rg, x)), w = 160 + 300 * R(); p.mass([[x - w, y], [x - w * .4, y - 10 - 12 * v], [x + w * .3, y - 8], [x + w, y + 6], [x + w * .4, y + 16 + 14 * v], [x - w * .5, y + 14]], { color: o.shade || '#c2ccd2', alpha: .5 * k, dir: .05, len: 1, size: .7, vary: .3, soft: 8 }); } };

  // ------------------------------------------------------------------ wool
  // THE THREAD. woolPath turns anchor points into a hanging, rippling, looping strand (dense polyline)
  W.woolPath = function (pts, o = {}) {
    const t = o.t ?? 0, sd = o.seed || 1, slack = o.slack ?? 0, hang = o.hang ?? 0, m = o.meander ?? 0, air = o.air ?? 0;
    let base = []; // sag between anchors
    if (hang > 0) { for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], l = hyp(b[0] - a[0], b[1] - a[1]), n = 8; for (let j = 0; j < n; j++) { const u = j / n, sk = u + .06 * sin(PI * u) * (b[1] > a[1] ? 1 : -1); base.push([lerp(a[0], b[0], u), lerp(a[1], b[1], u) + hang * l * 4 * sk * (1 - sk)]); } } base.push(pts[pts.length - 1].slice(0, 2)); base = spline(base, 4, false); } else base = spline(pts, 12, false);
    const T = track(base), st = o.step || 9, n = max(4, Math.round(T.len / st)), out = [];
    const loops = o.loops === true || typeof o.loops === 'number' ? Array.from({ length: o.loops === true ? 3 : o.loops }, (_, i) => ({ u: (i + .3 + .4 * hash(i, sd, 61)) / (o.loops === true ? 3 : o.loops), r: (o.loopR || 34) * (.65 + .7 * hash(i, sd, 62)), dir: hash(i, sd, 63) < .5 ? 1 : -1 })) : (o.loops || []);
    for (let i = 0; i <= n; i++) {
      const s = i / n * T.len, u = i / n, q = T.s(s), nx = -sin(q[2]), ny = cos(q[2]), tx = cos(q[2]), ty = sin(q[2]), end = min(1, u * T.len / 60, (1 - u) * T.len / 60 + (o.free ? 1 : 0)); let x = q[0], y = q[1], w = 0;
      if (m) w += m * end * (noise1(s / 84 + 2, sd) + .5 * noise1(s / 31, sd + 3));
      if (slack) w += slack * 9 * end * (noise1(s / 130 + 7, sd + 5) + .6 * noise1(s / 47, sd + 8));
      if (air) { const gr = o.free ? .25 + .75 * u : sin(PI * clamp(u)); w += air * gr * (fbm(s / 190 - t * 1.35, sd + 11, 2) * 1.5 + .35 * noise1(s / 60 - t * 3.1, sd + 13)); }
      if (o.pull) for (const pl of [].concat(o.pull)) { const from = pl.from ? T.len - s : s, age = t - pl.t0 - from / (pl.speed || 1500); if (age > 0 && age < 2.2) w += (pl.amp || 16) * end * Math.exp(-2.6 * age) * sin(age * TAU * (pl.freq || 3.2)) * Math.exp(-from / 1600); }
      x += nx * w; y += ny * w;
      for (const lp of loops) { const c = lp.u * T.len, Lh = lp.r * 2.7, z = (s - c) / Lh; if (abs(z) < 1) { const ph = PI * (z + 1), e = sin(PI * (z + 1) / 2), k = e * e, lift = lp.r * (1 - cos(ph)) * .95 * k, sl = sin(ph) * lp.r * 2.5 * (.35 + .65 * k); x += nx * lp.dir * lift + tx * sl; y += ny * lp.dir * lift + ty * sl; } }
      out.push([x, y]);
    }
    return out;
  };
  // thread(p, pts, {k0,k1,w,fuzz,ply,ground,color,t, + any woolPath option}) ; raw:true when pts is already a woolPath/rope
  W.thread = function (p, pts, o = {}) {
    const k0 = clamp(o.k0 ?? 0), k1 = clamp(o.k1 ?? 1), t = o.t ?? p.t; if (k1 - k0 < .0005 || pts.length < 2) return null;
    const path = o.raw ? pts : W.woolPath(pts, Object.assign({ t }, o)), T = track(path), w = o.w ?? 6, L = o.light ? lightOf(o.light) : null, c = o.color || (L ? mixc(RED, L.tint, L.tk * .22) : RED), dk = L ? mixc(RED_DEEP, L.ink, L.tk * .3) : RED_DEEP, lt = L ? mixc(RED_LIGHT, L.sun, .12) : RED_LIGHT, al = o.alpha ?? 1, len = T.len * (k1 - k0), sd = o.seed || 1, wf = o.wf || (() => 1), d0 = k0 * T.len, d1 = k1 * T.len;
    const step = max(5, w * 1.7), n = max(3, Math.ceil(len / step)), core = [], P = []; for (let i = 0; i <= n; i++) { const s = lerp(d0, d1, i / n), q = T.s(s); P.push([q[0], q[1], q[2], s]); core.push([q[0], q[1], (.86 + .2 * noise1(s / 46, sd + 2)) * wf(s / T.len)]); }
    const tp = [min(.2, 10 / len), min(.2, (o.tip ?? 16) / len)], cut0 = 420;
    const chunk = (arr, fn) => { for (let i = 0; i < arr.length - 1; i += cut0) fn(arr.slice(i, i + cut0 + 1), i === 0, i + cut0 >= arr.length - 1); };
    if (o.ground) { const off = P.map(q => [q[0] + w * .35, q[1] + w * .75, .9]); chunk(off, a => p.line(a, { color: o.shadow || '#5a5550', w: w * 1.1, press: .34 * o.ground, taper: [.02, .02], wobble: .5 * (o.wobble ?? 1), alpha: al })); }
    if (w >= 4) chunk(core, (a, f, l) => p.line(a, { color: mixc(c, lt, .25), w: w * 1.75, press: .34, taper: [f ? tp[0] : 0, l ? tp[1] : 0], wobble: .9 * (o.wobble ?? 1), medium: 'crayon', alpha: al })); // the halo of loose wool
    chunk(core, (a, f, l) => p.line(a, { color: c, w: w * 1.22, press: 1.2, taper: [f ? tp[0] : 0, l ? tp[1] : 0], wobble: .55 * (o.wobble ?? 1), medium: 'redline', alpha: al }));
    if (w >= 2.6) chunk(core.map((q, i) => { const z = P[i]; return [q[0] - sin(z[2]) * w * .22, q[1] + cos(z[2]) * w * .22, q[2]]; }), (a, f, l) => p.line(a, { color: dk, w: w * .34, press: .62, taper: [f ? tp[0] : 0, l ? tp[1] : 0], wobble: .6 * (o.wobble ?? 1), alpha: al })); // its own shaded under-edge
    if (w >= 5 && o.ply !== 0) { // the twist: slanting marks right across the strand
      const zs = w * (w > 8 ? .95 : 1.25), nn = Math.min(o.plyMax ?? 190, Math.floor(len / zs)), zz = len / max(1, nn); for (let i = 0; i < nn; i++) { const s0 = d0 + (Math.floor(d0 / zz) + i + .5) * zz - Math.floor(d0 / zz) * zz, q = T.s(s0 + (hash(i, sd, 5) - .5) * zz * .3), k = w * .46 * wf(s0 / T.len), tx = cos(q[2]), ty = sin(q[2]), sl = w * .42; p.line([[q[0] + ty * k - tx * sl, q[1] - tx * k - ty * sl], [q[0] + tx * w * .05, q[1] + ty * w * .05], [q[0] - ty * k + tx * sl, q[1] + tx * k + ty * sl]], { color: i % 2 ? dk : lt, w: max(1.1, w * (i % 2 ? .15 : .17)), press: i % 2 ? .72 : .6, taper: [.2, .25], wobble: .25, alpha: al * .9 }); }
    }
    const nf = Math.min(o.fuzzMax ?? 46, Math.round(len / 24 * (o.fuzz ?? 1))); // stray fibres
    for (let i = 0; i < nf; i++) { const s0 = Math.floor((i + hash(i, sd, 71)) * (T.len / max(1, Math.round(T.len / 24 * (o.fuzz ?? 1))))); if (s0 < d0 || s0 > d1) continue; const q = T.s(s0), sg = hash(i, sd, 72) < .5 ? 1 : -1, l = w * (.9 + 1.5 * hash(i, sd, 73)), a = q[2] + sg * (.35 + .8 * hash(i, sd, 74)), x = q[0] - sin(q[2]) * sg * w * .4, y = q[1] + cos(q[2]) * sg * w * .4; p.line([[x, y], [x + cos(a) * l * .6, y + sin(a) * l * .6], [x + cos(a + sg * .6) * l, y + sin(a + sg * .6) * l]], { color: i % 3 ? c : lt, w: max(1.1, w * .2), press: .6, taper: [.02, .7], wobble: .4, alpha: al }); }
    const e = T.s(d1), b = T.s(d0); return { end: e, start: b, track: T, path };
  };
  // rope: the strand as a real string of beads, for pulls, drops and dragging. deterministic, cached per id.
  // opts {id,n,seg|len,t0,a(t)->[x,y], b(t)->[x,y]|null, grav, damp, wind, ground(x)->y, iters}
  const RP = new Map();
  W.rope = function (o, t) {
    const h = 1 / 36, n = o.n || 28, seg = o.seg || (o.len || 400) / n, steps = max(0, Math.round((t - o.t0) / h)), key = o.id + '|' + n + '|' + seg.toFixed(2) + '|' + o.t0; let S = RP.get(key);
    if (!S) { if (RP.size > 60) RP.clear(); const a = o.a(o.t0), b = o.b ? o.b(o.t0) : [a[0] + n * seg * .6, a[1] + 40], P = []; for (let i = 0; i <= n; i++) { const u = i / n; P.push([lerp(a[0], b[0], u), lerp(a[1], b[1], u) + sin(PI * u) * 30]); } S = { f: [], P, Q: P.map(q => q.slice()) }; for (let w = 0; w < 50; w++) stepRope(S, o, o.t0, seg, n, h); S.f.push(S.P.map(q => q.slice())); RP.set(key, S); }
    while (S.f.length <= min(steps, 36 * 40)) { stepRope(S, o, o.t0 + S.f.length * h, seg, n, h); S.f.push(S.P.map(q => q.slice())); }
    return S.f[min(steps, S.f.length - 1)];
  };
  function stepRope(S, o, tt, seg, n, h) {
    const g = (o.grav ?? 900) * h * h, dm = o.damp ?? .965, gw = o.wind ? windOf(o.wind) : null, P = S.P, Q = S.Q;
    for (let i = 0; i <= n; i++) { const q = P[i], z = Q[i], vx = (q[0] - z[0]) * dm, vy = (q[1] - z[1]) * dm; Q[i] = [q[0], q[1]]; let fx = 0; if (gw) fx = gw(tt - i * .01, q[0], q[1]) * (o.windPower ?? 500) * h * h; P[i] = [q[0] + vx + fx, q[1] + vy + g]; if (o.ground) { const gy = o.ground(P[i][0]); if (P[i][1] > gy) { P[i][1] = gy; P[i][0] = lerp(P[i][0], q[0], o.friction ?? .55); } } }
    const A0 = o.a(tt), B0 = o.b ? o.b(tt) : null;
    for (let k = 0; k < (o.iters || 14); k++) { P[0] = [A0[0], A0[1]]; if (B0) P[n] = [B0[0], B0[1]]; for (let i = 0; i < n; i++) { const a = P[i], b = P[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], l = hyp(dx, dy) || 1e-4; if (l <= seg && !o.stiff) continue; const c = (l - seg) / l * .5, la = i === 0 ? 0 : 1, lb = B0 && i === n - 1 ? 0 : 1, m = la + lb || 1; a[0] += dx * c * 2 * la / m; a[1] += dy * c * 2 * la / m; b[0] -= dx * c * 2 * lb / m; b[1] -= dy * c * 2 * lb / m; } }
    if (o.ground) for (const q of P) { const gy = o.ground(q[0]); if (q[1] > gy) q[1] = gy; }
  }
  // laid over ground: a lazy line from a to b following ground(x), with catches on the grass
  W.layOn = function (a, b, ground, o = {}) { const n = o.n || 14, out = []; for (let i = 0; i <= n; i++) { const u = i / n, x = lerp(a[0], b[0], u) + (i && i < n ? (o.side ?? 26) * noise1(u * 5.3, o.seed || 1) : 0); out.push([x, (ground ? ground(x) : lerp(a[1], b[1], u)) + (o.dy || 0) + (i && i < n ? (o.up ?? 7) * noise1(u * 8.1, (o.seed || 1) + 4) : 0)]); } return out; };
  // the thread caught on grass: a few blades drawn over a strand so it lies in the grass, not on it
  W.catches = function (p, pts, o = {}) { const T = track(pts), n = o.n || 12, L = lightOf(o.light), C = landPal({ light: L, season: o.season ?? .4, colour: o.colour ?? .5 }, o.d ?? .05), t = o.t ?? p.t, g = windOf(o.wind), h = o.h || 34; for (let i = 0; i < n; i++) { const u = (i + hash(i, o.seed || 1, 1)) / n, q = T.at(u), b = g(t, q[0], q[1]), kk = h * (.6 + .7 * hash(i, o.seed || 1, 2)); ln(p, bladePts([q[0] + (hash(i, 2, 3) - .5) * 8, q[1] + 9, kk, .15 + (hash(i, 3, 4) - .5) * .6 + b * .7]), { color: i % 3 === 0 ? C.deep : i % 3 === 1 ? C.mid : C.lit, w: 3.4, press: .8, taper: [.04, .6], wobble: .6, medium: i % 2 ? 'crayon' : 'graphite' }); } };
  // ball of wool. roll = turned angle (rad); tail: point the loose end leaves from is returned
  W.ball = function (p, o) {
    const { x, y } = o, r = o.r || 46, roll = o.roll || 0, L = o.light ? lightOf(o.light) : null, c = L ? mixc(RED, L.tint, L.tk * .25) : RED, dk = L ? mixc(RED_DEEP, L.ink, L.tk * .3) : RED_DEEP, lt = L ? mixc(RED_LIGHT, L.sun, .15) : RED_LIGHT, sd = o.seed || 1, k = clamp(o.k ?? 1), sx = o.squash ? 1 + o.squash : 1, sy = o.squash ? 1 - o.squash : 1;
    const S = (u, v) => [x + u * r * sx, y + v * r * sy + (o.squash ? o.squash * r : 0)];
    if (o.ground !== 0 && k > .6) p.mass(lump(x + r * .2, y + r * .93, r * 1.15, r * .24, 5, { rough: .16 }), { color: o.shadow || '#4b4038', alpha: .5, dir: 0, size: .5, len: .6, soft: 5 });
    if (k > .3) { const out = []; for (let i = 0; i < 16; i++) { const a = i / 16 * TAU, q = 1 + .045 * (hash(i + Math.round(roll * 3), sd, 1) - .5) * 2; out.push(S(cos(a) * q, sin(a) * q)); } p.mass(out, { color: { rad: [x - r * .35, y - r * .4, r * 1.7], stops: [[0, mixc(c, lt, .7)], [.45, c], [1, dk]] }, alpha: clamp((k - .3) / .3), dir: .7 + roll, size: .5, len: .55, vary: .4 }); p.shade([S(-.5, .95), S(.1, .5), S(.7, .1), S(1, .1), S(.75, .72), S(.2, 1)], { color: dk, alpha: .4 * k, soft: r * .2 }); }
    // wound strands: small circles of a turning sphere, in three lays
    const bands = []; for (let a = 0; a < 3; a++) for (let j = -2; j <= 2; j++) bands.push([a, j * .31 + .1 * (hash(a, j + 5, sd) - .5)]); const cr = cos(roll), sr = sin(roll), nb = Math.ceil(bands.length * k);
    for (let i = 0; i < nb; i++) { const [a, off] = bands[(i * 7) % bands.length], ax = [[.2, .9, .38], [.86, -.3, .42], [-.55, .62, .56]][a], rr = Math.sqrt(max(0, 1 - off * off)), e1 = norm(cross(ax, [.3, .1, .9])), e2 = cross(ax, e1); let seg = []; const put = () => { if (seg.length > 2) { p.line(seg, { color: i % 3 === 0 ? lt : i % 3 === 1 ? dk : mixc(c, dk, .5), w: max(1.4, r * (i % 3 === 0 ? .075 : .06)), press: .85, taper: [.12, .2], wobble: .7, medium: i % 3 === 0 ? 'crayon' : 'graphite' }); } seg = []; };
      for (let j = 0; j <= 22; j++) { const b = j / 22 * TAU + i, v = [0, 1, 2].map(q => ax[q] * off + (e1[q] * cos(b) + e2[q] * sin(b)) * rr), X = v[0] * cr - v[1] * sr, Y = v[0] * sr + v[1] * cr; if (v[2] > .06) seg.push(S(X * .97, Y * .97)); else put(); } put(); }
    if (k > .8) for (let i = 0; i < 7; i++) { const a = hash(i, sd, 30) * TAU, q = S(cos(a), sin(a)); p.line([q, [q[0] + cos(a + .6) * r * .12, q[1] + sin(a + .6) * r * .12], [q[0] + cos(a + 1.4) * r * .2, q[1] + sin(a + 1.4) * r * .2]], { color: c, w: max(1.1, r * .028), press: .7, taper: [.02, .7], wobble: .6 }); }
    const ta = (o.tailAt ?? .55); return { tail: S(cos(ta), sin(ta)), top: S(0, -1) };
  };
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], norm = a => { const l = hyp(a[0], a[1], a[2]) || 1; return a.map(v => v / l); };
  // winding curve for the first line: circles that fall in and become a ball. returns anchor points for thread()
  W.windCurve = function (x, y, r, turns = 5, o = {}) { const out = [], n = turns * 14, sd = o.seed || 1; for (let i = 0; i <= n; i++) { const u = i / n, a = (o.a0 ?? 2.4) + u * turns * TAU, tilt = .5 + 1.1 * noise1(u * turns * .9, sd), rr = r * (.35 + .65 * Math.pow(sin(PI * min(1, u * .55 + .12)), .6)) * (.9 + .2 * noise1(u * 9, sd + 2)), ex = cos(a) * rr, ey = sin(a) * rr * (.45 + .5 * abs(cos(tilt * 1.6 + u * 4))), c = cos(tilt + u * 3), s = sin(tilt + u * 3); out.push([x + ex * c - ey * s, y + ex * s + ey * c]); } return out; };
  W.needles = function (p, o) { const { x, y } = o, s = o.scale || 1, a = o.a ?? -.5, b = o.b ?? -2.5, l = (o.len || 260) * s; [[a, 1], [b, 0]].forEach(([q, i]) => { const x1 = x + cos(q) * l * .72, y1 = y + sin(q) * l * .72, x0 = x - cos(q) * l * .28, y0 = y - sin(q) * l * .28; const r = ribbon([[x0, y0], [(x0 + x1) / 2, (y0 + y1) / 2 + 2], [x1, y1]], () => 3.4 * s, { step: 40 }); p.mass(r.poly, { color: i ? '#b59a6c' : '#a48a60', dir: q, size: .4, len: .8 }); ln(p, r.R, { color: '#4a3a2a', w: 2.2, press: .75, taper: [.05, .1], wobble: .6 }); p.mass(lump(x1, y1, 8 * s, 8 * s, 3 + i, { n: 8, rough: .1 }), { color: '#7d5f3e', size: .34, len: .4 }); }); };
  // knitting growing off the needle: rows of small v stitches. rows 0..n
  W.knit = function (p, o) { const { x, y } = o, w = o.w || 120, rows = o.rows ?? 6, rh = o.rh || 11, st = o.st || 12, L = o.light ? lightOf(o.light) : null, c = L ? mixc(RED, L.tint, L.tk * .25) : RED, f = o.fold || (v => [0, 0]); const pt = (u, v) => { const z = f(v); return [x + (u - .5) * w + z[0], y + v * rh + z[1]]; }; const l = [], r = [], m = Math.ceil(rows) * 2; for (let i = 0; i <= m; i++) { l.push(pt(0, i / m * rows)); r.push(pt(1, i / m * rows)); } p.mass(l.concat(r.reverse()), { color: c, dir: 1.4, size: .5, len: .5, vary: .45 }); const n = Math.max(3, Math.round(w / st)); for (let j = 0; j < n; j++) { const z = []; for (let i = 0; i <= rows * 2; i++) { const q = pt((j + .5 + (i % 2 ? .28 : -.28)) / n, i / 2); z.push(q); } if (z.length > 2) p.line(z, { color: j % 2 ? RED_DEEP : RED_LIGHT, w: 2.2, press: .75, taper: [.02, .05], wobble: .4 }); } };
  // handwriting for the last line. one unbroken stroke + the dot. unit: x-height 1, baseline y=0, about 5 wide
  const SPELL = { bide: { main: [[-1.15, .34], [-.8, .14], [-.46, -.3], [-.12, -1.1], [.14, -1.86], [.16, -2.3], [-.02, -2.34], [-.1, -1.8], [-.08, -.9], [-.04, -.2], [.04, -.06], [.06, -.5], [.2, -.86], [.46, -.98], [.7, -.8], [.76, -.42], [.58, -.08], [.28, .02], [.2, .08], [.5, .12], [.84, .0], [1.1, -.42], [1.24, -.92], [1.22, -.5], [1.24, -.12], [1.42, .02], [1.72, -.16], [2.02, -.6], [2.34, -.92], [2.12, -1.04], [1.82, -.86], [1.66, -.46], [1.76, -.06], [2.02, 0], [2.28, -.36], [2.46, -1.04], [2.58, -1.84], [2.6, -2.3], [2.5, -1.6], [2.44, -.8], [2.48, -.18], [2.68, .02], [3.0, -.2], [3.3, -.56], [3.46, -.84], [3.34, -1.04], [3.1, -.92], [3.0, -.5], [3.1, -.1], [3.4, .04], [3.84, -.12], [4.34, -.34], [4.94, -.42], [5.6, -.28]], old: [[-1.1, .22], [-.62, .16], [-.22, -.16], [.12, -.9], [.36, -1.7], [.4, -2.2], [.22, -2.34], [.06, -1.9], [.0, -1.1], [.02, -.4], [.2, -.02], [.48, -.04], [.72, -.36], [.74, -.72], [.58, -.92], [.46, -.8], [.62, -.66], [.94, -.74], [1.2, -.95], [1.22, -.62], [1.17, -.22], [1.32, 0], [1.6, -.16], [1.92, -.58], [2.24, -.94], [2.02, -1.04], [1.74, -.84], [1.6, -.44], [1.7, -.06], [1.96, -.06], [2.22, -.44], [2.42, -1.1], [2.55, -1.9], [2.58, -2.3], [2.46, -1.6], [2.4, -.8], [2.44, -.18], [2.64, 0], [2.96, -.22], [3.26, -.6], [3.4, -.86], [3.26, -1.02], [3.04, -.88], [2.96, -.48], [3.06, -.1], [3.36, .02], [3.8, -.14], [4.3, -.34], [4.9, -.4], [5.5, -.28]], dot: [[1.26, -1.42], [1.31, -1.36]] } };
  W.spell = function (word, x, y, s) { const w = SPELL[word] || SPELL.bide; const f = a => a.map(q => [x + q[0] * s, y + q[1] * s]); return { main: f(w.main), dot: f(w.dot), width: 6.6 * s }; };

  // ------------------------------------------------------------------ under the ground (s14, s15)
  W.UNDER = { turf: 330, grave: [930, 336], bed: [1010, 752], bedR: [352, 138], head: [1262, 700], tree: [1500, 330], stone: [760, 318], knees: [640, 330], roseRoot: [872, 334] };
  // roots authored one by one: the thorn's reach over her like an arm, the rose's go down to find her hand
  const TREE_ROOTS = [
    { w: [30, 4], pts: [[1492, 330], [1462, 398], [1392, 452], [1300, 492], [1190, 528], [1070, 536], [960, 528], [850, 548], [748, 600], [676, 676]] },
    { w: [26, 4], pts: [[1508, 332], [1492, 430], [1478, 520], [1470, 610], [1448, 706], [1400, 800], [1320, 878], [1218, 924], [1100, 948]] },
    { w: [22, 3], pts: [[1522, 332], [1570, 400], [1628, 452], [1700, 500], [1790, 524], [1880, 570], [1960, 590]] },
    { w: [18, 3], pts: [[1514, 334], [1544, 450], [1570, 560], [1618, 660], [1650, 760], [1706, 840]] },
    { w: [15, 2.5], pts: [[1480, 332], [1408, 378], [1320, 404], [1230, 400], [1140, 424], [1050, 420]] },
    { w: [10, 2], pts: [[1500, 420], [1440, 500], [1400, 580], [1392, 650]] }];
  const ROSE_ROOTS = [
    { w: [12, 2.4], pts: [[872, 334], [862, 396], [884, 450], [872, 512], [904, 566], [948, 612], [1000, 640], [1052, 660]] },
    { w: [9, 2], pts: [[878, 336], [912, 392], [960, 432], [1000, 492], [1060, 540], [1110, 602], [1148, 650]] },
    { w: [8, 2], pts: [[864, 336], [822, 396], [806, 460], [770, 520], [762, 590], [728, 650]] },
    { w: [6, 1.6], pts: [[868, 338], [850, 410], [838, 490], [846, 560], [830, 640], [842, 700]] },
    { w: [5, 1.4], pts: [[884, 340], [940, 372], [1010, 384], [1070, 430], [1120, 450]] }];
  // under(p,{grow 0..1 rose roots, red 0..1 roots turning to thread from her side up, warm 0..1, t, season, part:'back'|'roots'|'above'|'turf', roses, rings:[{x,k}], bed, sky, avoid})
  W.under = function (p, o = {}) {
    const t = o.t ?? p.t, U = W.UNDER, warm = clamp(o.warm ?? 0), red = clamp(o.red ?? 0), grow = clamp(o.grow ?? 1), L = lightOf(o.light || W.mixLight('dusk', 'lowsun', warm)), se = o.season ?? .6, part = o.part, C = landPal({ light: L, season: lerp(se, .3, warm), colour: lerp(.45, 1, warm) }, .05), y0 = o.turf ?? U.turf, [bX, bY] = U.bed;
    const rg = o.rg || ridge([[-60, y0 + 10], [260, y0 + 4], [560, y0 - 6], [900, y0 + 8], [1300, y0 - 4], [1620, y0 + 10], [1980, y0 + 2]], { amp: 5, seed: 8, step: 24 }), lay = (dy, sd, am, dip = 0) => rg.map(q => [q[0], q[1] + dy + am * fbm(q[0] / 260, sd, 3) + dip * Math.exp(-Math.pow((q[0] - bX) / 420, 2))]);
    const wm = (c, k = 1) => mixc(c, '#cf8f45', warm * .36 * k);
    if (!part || part === 'back') {
      if (o.sky !== false) { W.sky(p, { mood: L, horizon: y0 + 40, clouds: [[300, 150, 900, 60, 1], [1350, 110, 1100, 70, 2], [860, 240, 900, 34, 4]], glow: false, t: 0 }); p.mass(below(ridge([[-60, 300], [300, 280], [700, 296], [1100, 276], [1500, 292], [1980, 270]], { amp: 4, seed: 31, step: 34 }), y0 + 60), { sharp: true, color: mixc(C.mid, L.haze, .6), dir: .05, size: 1, vary: .3 }); }
      // the earth in its beds, each worked in its own direction, all of them giving way round the place where she lies
      const l1 = lay(50, 2, 14), l2 = lay(150, 3, 30, 26), l3 = lay(300, 4, 40, -40), l4 = lay(520, 5, 44, 60), l5 = lay(660, 6, 34, 20);
      p.mass(below(rg, 1130), { sharp: true, color: wm('#5f4a34'), dir: .1, len: .9, size: .8, vary: .5 });
      p.mass(below(l1, 1130), { sharp: true, color: { lin: [0, y0 + 50, 0, y0 + 190], stops: [[0, wm('#54402f')], [1, wm('#6a5139')]] }, dir: .12, len: 1, size: .85, vary: .5 });
      p.mass(below(l2, 1130), { sharp: true, color: { lin: [0, y0 + 150, 0, y0 + 320], stops: [[0, wm('#7a6044')], [1, wm('#61492f', .9)]] }, dir: -.14, len: 1.1, size: .95, vary: .55 });
      p.mass(below(l3, 1130), { sharp: true, color: { lin: [0, y0 + 270, 0, y0 + 560], stops: [[0, wm('#4c3a2c', .95)], [1, wm('#3a2d26', .85)]] }, dir: .1, len: 1.2, size: 1, vary: .5 });
      p.mass(below(l4, 1130), { sharp: true, color: wm('#4b3f36', .7), dir: -.1, len: 1.2, size: 1, vary: .5 });
      p.mass(below(l5, 1130), { sharp: true, color: wm('#2c2523', .5), dir: .04, len: 1.2, size: 1.05, vary: .45 });
      [[160, 470, 240, 30, .1, '#8a6f4f'], [620, 520, 190, 24, -.1, '#8f7452'], [1560, 480, 260, 30, .05, '#86694a'], [1700, 760, 260, 60, .1, '#33291f'], [240, 720, 300, 70, -.06, '#35291f'], [560, 900, 380, 60, .04, '#594a3c'], [1560, 960, 340, 50, -.05, '#56473b']].forEach((q, i) => p.mass(lump(q[0], q[1], q[2], q[3], i + 60, { n: 11, rough: .3, rot: q[4] }), { color: wm(q[5], .8), alpha: .55, dir: q[4], len: 1, size: .8, vary: .55, soft: 10 }));
      [[l1, '#2b211b', .45], [l2, '#a98b63', .35], [l3, '#231b18', .55], [l4, '#7d6b58', .3]].forEach(([l, c, pr], i) => found(p, l, { color: wm(c, .5), w: 3, press: pr, seed: i + 4, seg: 170, gap: .9, skip: .3, step: 46, medium: i % 2 ? 'crayon' : 'graphite' }));
      // round the bed the strokes turn and close, like hair, like a blanket tucked in
      p.mass(lump(bX, bY, 500, 236, 12, { n: 16, rough: .08 }), { color: { rad: [bX, bY, 500], stops: [[0, wm('#5a4533')], [.62, rgba(wm('#463529'), .9)], [1, rgba(wm('#3c2e26'), 0)]] }, dir: { around: [bX, bY] }, len: 1.2, size: .85, vary: .5, soft: 8 });
      // stones bedded where they fell, the light of nothing on their upper sides
      const R = rngOf(23), st = []; const fixed = [[330, 610, 62], [1770, 660, 74], [520, 800, 46], [1640, 900, 56], [140, 880, 70], [1240, 1010, 58], [760, 980, 40]]; fixed.forEach(q => st.push(q)); for (let i = 0; i < 24; i++) { const x = R() * 1960 - 20, y = y0 + 110 + R() * 610, r = 7 + 20 * R() * R() + 5 * R(); if (hyp((x - bX) / 400, (y - bY) / 190) < 1 || st.some(q => hyp(q[0] - x, q[1] - y) < q[2] * 1.3 + r)) continue; st.push([x, y, r]); }
      const S = st.map((q, i) => spline(lump(q[0], q[1], q[2] * 1.3, q[2] * .82, i + 40, { n: 10, rough: .16, rot: (hash(i, 1, 2) - .5) * .7 }), 3, true)), SL = st.map((q, i) => spline(lump(q[0] - q[2] * .25, q[1] - q[2] * .34, q[2] * .85, q[2] * .3, i + 80, { n: 9, rough: .3, rot: (hash(i, 1, 2) - .5) * .7 }), 3, true)), SD = st.map((q, i) => spline(lump(q[0] + q[2] * .1, q[1] + q[2] * .46, q[2] * 1.05, q[2] * .34, i + 120, { n: 9, rough: .25 }), 3, true));
      p.mass(poly(...S), { color: wm('#5f564d', .7), dir: .3, size: .55, len: .6, vary: .45 }); p.mass(poly(...SD), { color: wm('#3a332f', .6), alpha: .75, dir: .1, size: .46, len: .5, vary: .4 }); p.mass(poly(...SL), { color: wm('#857a6a', .9), alpha: .75, dir: 0, size: .44, len: .5, vary: .45 });
      st.forEach((q, i) => { if (q[2] < 16 && i % 2) return; ln(p, [[q[0] - q[2] * 1.3, q[1] + q[2] * .05], [q[0] - q[2] * .8, q[1] + q[2] * .6], [q[0] + q[2] * .2, q[1] + q[2] * .84], [q[0] + q[2] * 1.1, q[1] + q[2] * .4]], { color: '#1c1613', w: 1.7, press: .55, wobble: 1.6, taper: [.2, .4] }); if (q[2] > 36) ln(p, [[q[0] - q[2] * .2, q[1] - q[2] * .7], [q[0] + q[2] * .1, q[1] - q[2] * .1], [q[0] - q[2] * .1, q[1] + q[2] * .4]], { color: '#2a2320', w: 1.3, press: .4, wobble: 1.8, taper: [.1, .6] }); });
      // what else is down there: a broken cup, a button
      ln(p, [[418, 918], [432, 944], [462, 950], [484, 930], [488, 906]], { color: '#b9ad97', w: 4, press: .7, wobble: 1 }); ln(p, [[418, 918], [440, 908], [462, 916], [488, 906]], { color: '#8d8272', w: 2, press: .6 }); p.mass(lump(1480, 1012, 11, 8, 5, { n: 9, rough: .08 }), { color: '#8c8272', dir: 0, size: .36, len: .4 });
      if (o.bed !== false) {
        const [rx, ry] = U.bedR, hol = []; for (let i = 0; i < 22; i++) { const a = i / 22 * TAU, k = 1 + .05 * noise1(i * 1.1, 3) + .12 * Math.max(0, sin(a)) * Math.max(0, -cos(a)) - .1 * Math.max(0, -sin(a)) * Math.max(0, -cos(a)); hol.push([bX + cos(a) * rx * k, bY + sin(a) * ry * k + 16 * cos(a) * -1]); }
        p.mass(hol, { color: { rad: [bX + 110, bY - 20, 400], stops: [[0, mixc('#7c644b', '#f0c47e', warm * .8)], [.55, mixc('#675039', '#cf9a52', warm * .65)], [1, wm('#46362b')]] }, dir: { around: [bX, bY] }, len: 1, size: .75, vary: .4, soft: 14 });
        for (let j = 0; j < 7; j++) { const k = 1.04 + j * .085, a0 = -.5 + .5 * hash(j, 2, 2), seg = []; const st0 = PI * (.08 + .1 * hash(j, 3, 3)), en = PI * (.92 - .1 * hash(j, 4, 3)); const top = j % 2; for (let i = 0; i <= 9; i++) { const a = (top ? -1 : 1) * lerp(st0, en, i / 9); seg.push([bX + cos(a) * rx * k * (1 + .02 * noise1(i + j * 4, 5)), bY + sin(a) * ry * (k + .06) - 16 * cos(a) + 5 * noise1(i * .8 + j, 8), .5 + .5 * sin(PI * i / 9)]); } ln(p, seg, { color: j % 3 === 1 ? wm('#a58560', .8) : '#2a201a', w: 2.4 - j * .16, press: .5 - j * .035, taper: [.3, .4], wobble: 1.8, medium: j % 3 === 1 ? 'crayon' : 'graphite' }); }
      }
      for (let i = 0; i < 9; i++) p.dust(R() * 1920, y0 + 70 + R() * 640, 110, { color: i % 3 ? wm('#a58c68', .6) : '#1f1916', n: 22, seed: i + 5, size: 1.1 });
    }
    if (!part || part === 'roots') { rootSet(p, TREE_ROOTS, { grow: 1, red: red * .92, warm, seed: 3, kids: 5, t, hair: 34, late: .25 }); if (grow > .01) rootSet(p, ROSE_ROOTS, { grow, red, warm, seed: 7, kids: 5, t, hair: 26, late: 0 }); }
    if ((!part && o.above) || part === 'above') { W.thorn(p, { x: U.tree[0], y: y0 + 12, scale: 2.35, season: lerp(se, .3, warm), light: L, colour: lerp(.45, 1, warm), t, wind: o.wind, leaf: o.leaf, d: .02 }); if (o.stone !== false) { W.stone(p, { x: U.grave[0], y: y0 + 14, scale: 1.2, light: L, season: lerp(se, .3, warm), colour: lerp(.45, 1, warm), t, wind: o.wind, tuft: 0 }); if (o.roses) W.rosesOver(p, { x: U.grave[0], y: y0 + 10, scale: 1.2, k: o.roses, light: L, colour: 1, t, wind: o.wind }); } }
    if (!part || part === 'turf') {
      const mat = rg.map(q => [q[0], q[1] - 3]).concat(lay(34, 12, 20).reverse()); p.mass(mat, { sharp: true, color: wm(mixc('#57462f', C.dark, .4)), dir: 1.5, len: .5, size: .55, vary: .6 }); for (let i = 0; i < 64; i++) { const x = i * 31 + 24 * hash(i, 1, 1), y = yAt(rg, x) + 8, l = 18 + 62 * hash(i, 2, 1) * hash(i, 4, 1); ln(p, [[x, y], [x + 9 * noise1(i, 2), y + l * .5], [x + 22 * noise1(i, 3), y + l]], { color: i % 3 ? '#2c221c' : wm('#8d7352', .6), w: 1.3, press: .55, taper: [.02, .7], wobble: 1.4 }); }
      found(p, rg, { color: '#2c2419', w: 2.4, press: .5, seed: 3, seg: 150, gap: .7, skip: .2 });
      W.grass(p, { line: rg.filter((_, i) => i % 5 === 0).map(q => [q[0], q[1] + 8]), n: 92, h: 64, depth: 4, t, wind: o.wind, season: lerp(se, .3, warm), light: L, colour: lerp(.45, 1, warm), seed: 27, d: .02, lines: 90, grow: .2, avoid: o.avoid });
    }
    (o.rings || []).forEach(r => W.treadRings(p, r));
    return rg;
  };
  function rootSet(p, set, o) {
    const R = rngOf(o.seed), warm = o.warm || 0;
    set.forEach((r, i) => {
      const T = track(rough(r.pts, { amp: 5, seed: i + o.seed, step: 16, freq: 1 / 60 })), g = clamp(o.grow * 1.35 - i * .07); const s = T.slice(0, max(.02, g), 16), [w0, w1] = r.w, kids = [];
      for (let j = 0; j < o.kids + (w0 > 18 ? 3 : 0); j++) { const u = .12 + .84 * (j + R() * .8) / (o.kids + 3), q = T.at(u), sg = (j % 2 ? 1 : -1), a0 = q[2] + sg * (.4 + .7 * R()), l = (60 + 110 * R()) * (1 - u * .45), pts = [[q[0], q[1]]]; let a = a0, x = q[0], y = q[1]; for (let k = 0; k < 5; k++) { a += (PI / 2 - a) * .08 + (R() - .5) * .8; x += cos(a) * l / 5; y += sin(a) * l / 5; pts.push([x, y]); } kids.push([u, pts, lerp(w0, w1, u) * .4]); }
      if (g <= .02) return;
      const c = mixc('#7e654a', '#c39254', warm * .55), dk = '#271d18', lt = mixc('#a98d69', '#e2ba78', warm * .6);
      kids.forEach(([u, pts, w], j) => { const gk = clamp((g - u) * 3.2); if (gk <= .02) return; const kp = track(pts).slice(0, gk, 14).map((q, z, A2) => [q[0], q[1], 1 - .6 * z / A2.length]); p.line(kp, { color: mixc(c, lt, .25), w: max(2.4, w), press: .9, taper: [.02, .6], wobble: 1.2 }); if (j % 2 === 0) { const e = kp[kp.length - 1], b = kp[Math.max(0, kp.length - 3)], an = Math.atan2(e[1] - b[1], e[0] - b[0]); for (let z = -1; z <= 1; z += 2) p.line([b, [b[0] + cos(an + z * .7) * 18, b[1] + sin(an + z * .7) * 18], [b[0] + cos(an + z * .5) * 36 * gk, b[1] + sin(an + z * .5) * 36 * gk]], { color: lt, w: 1.8, press: .62, taper: [.02, .7], wobble: 1 }); } });
      const rb = ribbon(s, u => max(1, lerp(w0, w1, Math.pow(u * g, .75)) * .5 * (1 + .14 * noise1(u * 14, i))), { step: 14, rough: .9, seed: i + o.seed }); p.mass(rb.poly, { sharp: true, color: c, dir: Math.atan2(r.pts[3][1] - r.pts[0][1], r.pts[3][0] - r.pts[0][0]), size: .42, len: .7, vary: .5 });
      const lo = (rb.L[2] || rb.L[0])[1] > (rb.R[2] || rb.R[0])[1] ? [rb.L, rb.R] : [rb.R, rb.L]; ln(p, lo[0].filter((_, k) => k % 2 === 0), { color: dk, w: w0 > 14 ? 2.6 : 1.6, press: .7, taper: [.02, .4], wobble: 1.2 }); if (w0 > 8) ln(p, lo[1].filter((_, k) => k % 2 === 0), { color: lt, w: w0 > 14 ? 2.6 : 1.8, press: .5, taper: [.1, .5], wobble: 1.2, medium: 'crayon' });
      if (w0 > 14) for (let k = 1; k < 4; k++) { const u = k * .13, q = T.at(u), z = T.at(u + .1); if (u + .1 < g) ln(p, [[q[0], q[1]], [(q[0] + z[0]) / 2 + 3, (q[1] + z[1]) / 2 - 2], [z[0], z[1]]], { color: dk, w: 1.2, press: .42, taper: [.3, .5], wobble: 2 }); }
      // red climbs from the far end, as wool
      const rk = clamp((o.red || 0) * (1.35 + o.late) - o.late - i * .06); if (rk > .01) { const sr = s.slice().reverse(); W.thread(p, sr, { raw: true, k1: rk, w: max(4, Math.min(9, w0 * .42)), seed: i + 3, fuzz: .6, plyMax: 54, wf: u => lerp(.55, 1.1, u) }); kids.forEach(([u, pts], j) => { if (1 - u < rk && j % 2 === 0) W.thread(p, pts.slice().reverse(), { raw: true, k1: clamp((rk - (1 - u)) * 4), w: 3, seed: j + 9, fuzz: .5 }); }); }
    });
  }
  W.rootSet = rootSet; W.TREE_ROOTS = TREE_ROOTS; W.ROSE_ROOTS = ROSE_ROOTS;
  // treadRings(p,{x,y,k 0..1,depth,power}) one footfall: soft bows of light sinking through the soil, thinning as they go
  W.treadRings = function (p, o) {
    const k = clamp(o.k ?? 0), x = o.x ?? 640, y = o.y ?? 336, D = o.depth || 620, pw = o.power ?? 1; if (k <= 0 || k >= 1) return;
    const bow = (r, th, a0, a1, sd, n = 24) => { const A1 = [], A2 = []; for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n), tp = Math.pow(sin(PI * i / n), .7), w = 1 + .05 * noise1(a * 4 + sd * 2, 4), R1 = r * w, R2 = (r - th * tp) * w; A1.push([x + cos(a) * R1 * 1.1, y + sin(a) * R1 * .84]); A2.push([x + cos(a) * R2 * 1.1, y + sin(a) * R2 * .84]); } return A1.concat(A2.reverse()); };
    for (let j = 2; j >= 0; j--) {
      const q = k - j * .15; if (q <= 0) continue; const e = ease.out(q), r = D * e, th = lerp(30, 110, e) * (1 - j * .18), fade = Math.pow(1 - q, .95) * pw * (1 - j * .2);
      p.mass(bow(r + th * .25, th * 1.5, .14, PI - .14, j), { sharp: true, color: rgba('#a8783c', .75 * fade), dir: { around: [x, y] }, len: 1.1, size: .85, vary: .5, soft: lerp(16, 36, e) });
      p.mass(bow(r, th * .7, .2, PI - .2, j + 3), { sharp: true, color: rgba('#e3b264', .95 * fade), dir: { around: [x, y] }, len: 1, size: .7, vary: .4, soft: lerp(8, 18, e) });
      p.mass(bow(r - th * .16, th * .22, .34, PI - .4, j + 6), { sharp: true, color: rgba('#fbe6b2', .9 * fade), dir: { around: [x, y] }, len: .9, size: .5, vary: .25, soft: 4 });
      for (let z = 0; z < 3; z++) { const b0 = lerp(.3, PI - .3, (z + .12 * hash(z, j, 3)) / 3), b1 = b0 + .9 * (.5 + .35 * hash(z, j, 4)), pts = []; for (let i = 0; i <= 6; i++) { const a = lerp(b0, b1, i / 6), R1 = (r - th * .3) * (1 + .05 * noise1(a * 4 + j * 2 + 6, 4)); pts.push([x + cos(a) * R1 * 1.1, y + sin(a) * R1 * .84, .35 + .65 * sin(PI * i / 6)]); } p.line(pts, { color: z === 1 ? '#fdf0cf' : '#f0cc86', w: lerp(7, 3.4, e), press: .7 * fade, taper: [.45, .45], wobble: 2, alpha: min(1, fade * 1.3) }); }
    }
  };
  const arc = (x, y, rx, ry, a0, a1, n) => { const o = []; for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n); o.push([x + cos(a) * rx, y + sin(a) * ry]); } return o; };
  // warmth(p,{k}) gold coming down through the ground in soft tongues; call after the soil masses in the same layer
  W.warmth = function (p, o) { const k = clamp(o.k ?? 0), t = o.t ?? p.t, y0 = o.y ?? W.UNDER.turf; if (k < .01) return; for (let i = 0; i < 7; i++) { const x = [180, 470, 760, 1010, 1240, 1500, 1760][i], w = 150 + 80 * hash(i, 3, 3) + (i === 3 ? 90 : 0), dl = hash(i, 5, 5) * .3, q = clamp((k - dl) / (1 - dl)); if (q <= .01) continue; const h = (560 + 220 * hash(i, 4, 4) + (i === 3 ? 120 : 0)) * ease.out(q), a = [], b = []; for (let j = 0; j <= 7; j++) { const u = j / 7, ww = w * (1 - u * .6) * (1 + .25 * noise1(u * 3 + t * .25 + i, i)), dx = 40 * noise1(u * 2 + i * 3, 3) + (1010 - x) * .12 * u; a.push([x - ww + dx, y0 + 26 + u * h]); b.push([x + ww + dx, y0 + 26 + u * h]); } p.shade(a.concat(b.reverse()), { color: { lin: [0, y0, 0, y0 + h + 40], stops: [[0, rgba('#e9b25c', .85)], [.5, rgba('#d8964a', .55)], [1, rgba('#b0703a', 0)]] }, alpha: .72 * q, soft: 46, mode: 'screen' }); } };
  // roses opening over the stone (s15 on). k 0..1
  W.rosesOver = function (p, o) {
    const s = o.scale || 1, k = clamp(o.k ?? 1), L = lightOf(o.light || 'gold'), t = o.t ?? p.t, g = windOf(o.wind), C = landPal({ light: L, season: .33, colour: o.colour ?? .9 }, .03), X = (a, b) => [o.x + a * s, o.y + b * s]; if (k < .01) return;
    const canes = [
      [[-66, 20], [-84, -34], [-70, -92], [-84, -142], [-62, -192], [-22, -214], [24, -212], [62, -226], [88, -204]],
      [[-58, 22], [-62, -26], [-92, -74], [-104, -120], [-138, -146], [-150, -182]],
      [[-74, 20], [-112, -16], [-128, -62], [-168, -84], [-176, -118]],
      [[-64, 18], [-56, -60], [-74, -116], [-58, -168], [-66, -214], [-40, -246], [-6, -252]],
      [[-50, 22], [-28, -16], [-36, -56], [-14, -86], [-20, -118]],
      [[58, 22], [78, -10], [70, -52], [92, -82], [84, -118], [110, -138]],
      [[66, 22], [104, 2], [122, -30], [152, -38], [160, -62]],
      [[-30, -206], [10, -196], [34, -170], [38, -134], [58, -112]]];
    const b = g(t, o.x, o.y), B2 = (q, u) => { const z = X(q[0], q[1]); return [z[0] + b * 7 * s * u, z[1] + abs(b) * 1.5 * s * u]; };
    const lv = [[], [], []], hd = [], sq = Math.sqrt(s), ml = []; // a soft dark mass of leaf gathers first on the weather side
    [[-70, -20, 44, 34], [-92, -70, 40, 40], [-70, -130, 34, 40], [-50, -186, 44, 26], [10, -206, 50, 20], [74, -18, 40, 26], [84, -62, 26, 34]].forEach((q, i) => { const kk = clamp(k * 1.6 - i * .12); if (kk > .05) { const z = B2(q, .3); ml.push(spline(lump(z[0], z[1], q[2] * s * kk, q[3] * s * kk, i + 5, { n: 9, rough: .34 }), 3, true)); } });
    if (ml.length) p.mass(poly(...ml), { color: mixc(C.dark, C.shade, .3), alpha: .85, dir: .8, size: .46, len: .45, vary: .6 });
    canes.forEach((c, i) => { const gk = clamp(k * 1.7 - i * .09), pts = c.map((q, j) => B2(q, j / c.length * .7)); if (gk < .02) return; const T = track(spline(pts, 6, false)), sl = T.slice(0, gk, 22 * s); p.line(sl, { color: mixc(mixc(C.dark, '#6b5a44', .4), RED_DEEP, clamp(1.1 - gk)), w: 4.2 * sq, press: .85, taper: [.02, .4], wobble: 1.2 }); const nl = Math.round(T.len / (20 * s)); for (let j = 0; j < nl; j++) { const u = (j + hash(i, j, 5)) / nl; if (u > gk) break; const q = T.at(u), gg = clamp((gk - u) * 4), sg = j % 2 ? 1 : -1, a = q[2] + sg * (.5 + .9 * hash(i, j, 2)), off = (hash(i, j, 6) - .5) * 30 * s; lv[hash(i, j, 9) < .36 ? 2 : off > 4 * s ? 0 : 1].push(...leaf5(q[0] + off, q[1] + off * .5, (24 + 12 * hash(i, j, 3)) * s * gg, a + b * .2, i * 9 + j).polys); } [.34, .56, .78, 1].forEach((u, j) => { if (gk < u * .95 || hash(i, j, 12) < .16) return; const q = T.at(u), x = q[0] + (hash(i, j, 13) - .5) * 26 * s, y = q[1] + (hash(i, j, 14) - .5) * 18 * s, r = (12 + 13 * hash(i, j, 7) * hash(i, j, 17) + 2) * s; if (hd.some(h => hyp(h.x - x, h.y - y) < (h.r + r) * .72)) return; const op = clamp((gk - u * .9) * 2.6 + (gk >= 1 ? k * .4 : 0)); hd.push({ x, y, r: r * (.45 + .55 * op), open: hash(i, j, 18) < .18 ? .28 : lerp(.1, 1, op), seed: i * 5 + j + 2, tilt: .4 + .9 * hash(i, j, 19), rot: (x - X(0, 0)[0]) / (130 * s) + (hash(i, j, 20) - .5) * .7 }); }); });
    if (lv[0].length) p.mass(poly(...lv[0]), { color: mixc(C.dark, C.shade, .15), dir: .5, size: .36, len: .36, vary: .5 }); if (lv[1].length) p.mass(poly(...lv[1]), { color: mixc(C.mid, C.dark, .3), dir: -.6, size: .36, len: .36, vary: .5 }); if (lv[2].length) p.mass(poly(...lv[2]), { color: mixc(C.lit, C.mid, .4), dir: .9, size: .36, len: .36, vary: .5 });
    hd.sort((a, b2) => a.y - b2.y); blooms(p, hd, L, .02); return hd;
  };

  // ------------------------------------------------------------------ places: whole compositions in parts
  // every place: (p,{part:'back'|'mid'|'front', season, light, colour, t, wind, layers}) ; no part = everything. opens its own layers unless layers:false
  const open = (p, o, n, s) => { if (o.layers !== false) p.layer(n, s); };
  const HILLWIND = W.gusts({ seed: 7, every: 2.4, power: .85, base: .22 });
  W.HILLWIND = HILLWIND;
  W.HILL = { rg: [[-60, 884], [180, 850], [440, 786], [700, 712], [940, 650], [1160, 606], [1340, 592], [1500, 606], [1680, 652], [1840, 712], [1980, 770]], tree: [1330, 604], stone: [1120, 628], stand: [828, 690], path: [[300, 1080], [520, 960], [640, 860], [820, 770], [960, 706], [1090, 650]] };
  // thornHill: one big hill against the sky, the thorn on it, the sea and the low land far off (s07, s12, s17)
  W.thornHill = function (p, o = {}) {
    const light = o.light || 'day', L = lightOf(light), se = o.season ?? .3, col = o.colour ?? .5, part = o.part, t = o.t ?? p.t, wind = o.wind || HILLWIND, base = { season: se, light, colour: col }, H = W.HILL, rg = ridge(H.rg, { amp: 6, seed: 33, step: 22 }), night = L.tk > .6, snow = o.snow ?? ss(.9, 1, se);
    if (!part || part === 'back') {
      open(p, o, 'hill-sky', { every: 5, still: o.still ?? !o.drift, depth: .05 }); W.sky(p, { mood: light, t, horizon: night ? 690 : 780, drift: o.drift ?? 0, clouds: o.clouds, seed: o.skySeed });
      // sea, with the headlands lying in it
      const C = landPal(base, .9), sea = [[-40, 730], [400, 726], [900, 728], [1400, 724], [1960, 730]]; p.mass(below(sea, 900), { sharp: true, color: { lin: [0, 726, 0, 830], stops: [[0, mixc(L.mid, L.shade, .28)], [1, mixc(L.low, L.mid, .5)]] }, dir: 0, len: 1.6, size: .8, vary: .3 });
      for (let i = 0; i < 7; i++) { const y = 742 + i * 11, x = 120 + 900 * hash(i, 2, 8); ln(p, [[x, y], [x + 90, y + 1], [x + 200 + 120 * hash(i, 3, 8), y - 1]], { color: i % 2 ? L.cl : mixc(L.shade, L.haze, .4), w: 2, press: .36, taper: [.4, .5] }); }
      W.hill(p, Object.assign({ d: .92, pts: [[-60, 704], [120, 676], [300, 690], [420, 720], [520, 736]], base: 744, seed: 61, spurs: 2, rough: 3, hatch: 0 }, base)); W.hill(p, Object.assign({ d: .86, pts: [[1180, 736], [1400, 690], [1620, 640], [1780, 652], [1980, 620]], base: 770, seed: 62, spurs: 3, rough: 4, hatch: 0 }, base));
      W.hill(p, Object.assign({ d: .66, pts: [[-60, 772], [200, 764], [460, 786], [700, 800], [980, 812], [1500, 800], [1980, 760]], base: 960, seed: 63, spurs: 3, rough: 5 }, base)); W.fields(p, Object.assign({ quad: [[-20, 790], [560, 800], [700, 920], [-80, 930]], rows: 3, cols: 6, d: .6, seed: 18, ww: 2.6, alpha: .45, press: .7 }, base));
    }
    if (!part || part === 'mid') {
      open(p, o, 'hill-land', { every: o.every || 3, depth: .6 }); const C = landPal(base, .08);
      p.mass(below(rg, 1130), { sharp: true, color: { lin: [300, 640, 1500, 1080], stops: [[0, mixc(C.mid, C.sun, L.side < 0 ? .5 : .15)], [.5, C.mid], [1, mixc(C.dark, C.mid, L.side < 0 ? .35 : .7)]] }, dir: -.34, len: 1.25, size: 1, vary: .5 });
      p.mass(below(cut(rg, 1280, 1980).map(q => [q[0], q[1] + 4]), [[1120, 1130], [1400, 1000], [1700, 1010], [1980, 1060]].reverse().reverse()), { sharp: true, color: C.shade, alpha: L.side < 0 ? .5 : .1, dir: .5, len: 1.1, size: .95, vary: .5, soft: 14 });
      p.mass([[-60, 990], [300, 930], [760, 900], [1240, 930], [1980, 1000], [1980, 1130], [-60, 1130]], { color: mixc(C.dark, C.deep, .2), alpha: .6, dir: -.12, len: 1.2, size: 1, vary: .5, soft: 24 });
      // worn sheep-tracks across the slope, following it
      [[40, 150, .9], [90, 420, .7], [150, 260, .6]].forEach((q, i) => found(p, cut(rg, 120 + q[1] * .4, 1500 - q[1]).map(z => [z[0] + q[0], z[1] + q[0] * .9 + 10 * noise1(z[0] / 160, i)]), { color: mixc(C.dark, C.ink, .3), w: 2.2, press: .36 * q[2], seed: i + 6, seg: 180, gap: .9, skip: .3, step: 50 }));
      if (snow > .02) W.snowGround(p, { rg: rg.map(q => [q[0], q[1] + 2]), light, k: snow, low: '#cfd6d9' });
      if (snow < .6) W.sward(p, Object.assign({ rg, depth: 420, n: 520, t, wind, seed: 5, H: 18, d: .1 }, base, snow ? { alpha: .85 * (1 - snow) } : {}));
      if (o.sunX != null) W.sunPatch(p, { x: o.sunX, y: 820, rx: 520, ry: 210, rot: -.28, light, k: o.sunK ?? 1, color: '#f2cf78' });
      found(p, rg, { color: C.ink, w: 3, press: .55, seed: 9, seg: 190, gap: .7, skip: .25 });
      if (snow < .5) W.ground(p, Object.assign({ area: [-20, 860, 1940, 1060], dips: 7, stones: 8, tussocks: 13, seed: 17, t, wind }, base)); if (night) { found(p, cut(rg, 60, 1300).map(q => [q[0], q[1] + 4]), { color: '#93a8b6', w: 3.4, press: .5, seed: 4, seg: 230, gap: .8, skip: .2, medium: 'crayon' }); p.mass(cut(rg, 100, 1240).concat(cut(rg, 100, 1240).map(q => [q[0], q[1] + 60 + 30 * noise1(q[0] / 120, 3)]).reverse()), { sharp: true, color: { lin: [0, 620, 0, 900], stops: [[0, 'rgba(140,162,178,.4)'], [1, 'rgba(110,130,150,.1)']] }, dir: -.34, len: 1.1, size: .9, vary: .4, soft: 14 }); }
      if (o.stone) W.stone(p, { x: H.stone[0], y: H.stone[1] + 12, scale: .52, light, season: se, colour: col, t, wind, snow: snow * .8 });
      W.thorn(p, { x: H.tree[0], y: H.tree[1] + 12, scale: o.treeScale || 1.3, season: se, light, colour: col, t, wind, leaf: o.leaf, blossom: o.blossom, d: .06 });
      if (o.roses) W.rosesOver(p, { x: H.stone[0], y: H.stone[1] + 8, scale: .52, k: o.roses, light, colour: col, t, wind });
      const shade = pp => { if (o.shadow != null) [].concat(o.shadow).forEach((x, i) => W.cloudShadow(pp, { x, w: o.shadowW || 900, y0: 560, y1: 1100, up: 180, seed: 3 + i, light, slant: -.5, color: o.shadowColor || mixc(L.shade, '#323c58', .55), alpha: .62, k: o.shadowK ?? 1 })); };
      shade(p);
    }
    if (!part || part === 'front') { open(p, o, 'hill-near', { every: 2, depth: .95 }); if (snow < .6) { W.grass(p, Object.assign({ line: [[-40, 1040], [400, 1010], [900, 1030], [1400, 1022], [1960, 1050]], n: 66, h: 92, depth: 46, t, wind, seed: 8, d: 0, lines: 90, alpha: .95 * (1 - snow) }, base)); [[30, 1086, 10, 200, .16], [150, 1094, 7, 140, .06], [1700, 1092, 7, 150, .05], [1840, 1086, 11, 210, -.06]].forEach((q, i) => W.tall(p, Object.assign({ x: q[0], y: q[1], n: q[2], h: q[3], spread: 64, seed: i + 71, lean: q[4], t, wind, alpha: 1 - snow }, base))); } if (o.shadow != null) [].concat(o.shadow).forEach((x, i) => W.cloudShadow(p, { x, w: o.shadowW || 900, y0: 560, y1: 1100, seed: 3 + i, light, slant: -.5, color: o.shadowColor || mixc(L.shade, '#323c58', .55), alpha: .55, k: o.shadowK ?? 1 })); }
    return { rg };
  };
  W.GRAVE = { stone: [1090, 838], kneel: [760, 880], tree: [1500, 812], ground: x => 846 + 14 * noise1(x / 300, 4) - (x - 960) * .02 };
  // graveside: up close beside the stone, the thorn over it, the country falling away (s12 end, s13, s15, s16)
  W.graveside = function (p, o = {}) {
    const light = o.light || 'lowsun', L = lightOf(light), se = o.season ?? .62, col = o.colour ?? .45, part = o.part, t = o.t ?? p.t, wind = o.wind || HILLWIND, base = { season: se, light, colour: col }, G = W.GRAVE;
    const rg = ridge([[-60, 800], [240, 812], [560, 834], [860, 830], [1200, 812], [1560, 794], [1980, 806]], { amp: 6, seed: 37, step: 24 });
    if (!part || part === 'back') {
      open(p, o, 'grave-sky', { every: 5, still: o.still ?? true, depth: .05 }); W.sky(p, { mood: light, t, horizon: 700, drift: 0, glowX: 430, clouds: o.clouds });
      W.hill(p, Object.assign({ d: .95, pts: [[-60, 560], [160, 520], [340, 536], [560, 500], [760, 520], [960, 556], [1200, 580], [1980, 600]], base: 680, seed: 71, spurs: 4, rough: 4, hatch: 0 }, base)); W.lough(p, { x: 560, y: 664, rx: 330, ry: 15, light, seed: 4, n: 6 });
      W.hill(p, Object.assign({ d: .7, pts: [[-60, 640], [200, 664], [420, 690], [760, 690], [1100, 668], [1500, 640], [1980, 650]], base: 840, seed: 72, spurs: 3, rough: 5 }, base)); W.fields(p, Object.assign({ quad: [[40, 690], [900, 694], [1000, 810], [-120, 806]], rows: 3, cols: 7, d: .6, seed: 23, ww: 3, alpha: .45, press: .7 }, base));
    }
    if (!part || part === 'mid') {
      open(p, o, 'grave-land', { every: 3, depth: .75 }); const C = landPal(base, .04);
      p.mass(below(rg, 1130), { sharp: true, color: { lin: [0, 800, 0, 1080], stops: [[0, mixc(C.lit, C.sun, .4)], [.35, C.mid], [1, mixc(C.dark, C.deep, .25)]] }, dir: -.1, len: 1.1, size: .95, vary: .55 }); p.mass([[1180, 850], [1500, 824], [1980, 830], [1980, 1000], [1300, 960]], { color: C.shade, alpha: .55, dir: .1, size: .9, vary: .5, soft: 22 });
      W.sward(p, Object.assign({ rg, depth: 230, n: 300, t, wind, seed: 15, H: 26, d: .06 }, base)); W.ground(p, Object.assign({ area: [-20, 880, 1940, 1060], dips: 6, stones: 7, tussocks: 12, seed: 27, t, wind, avoid: (x, y) => abs(x - G.kneel[0]) < 200 && y < 960 ? 0 : 1 }, base));
      W.thorn(p, { x: G.tree[0], y: G.tree[1] + 22, scale: 2.35, season: se, light, colour: col, t, wind, leaf: o.leaf, blossom: o.blossom, d: .02, flip: o.flip ?? false });
      W.stone(p, { x: G.stone[0], y: G.stone[1] + 14, scale: 1.2, light, season: se, colour: col, t, wind }); if (o.roses) W.rosesOver(p, { x: G.stone[0], y: G.stone[1] + 10, scale: 1.2, k: o.roses, light, colour: col, t, wind });
      found(p, rg, { color: C.ink, w: 2.6, press: .4, seed: 9, seg: 160, gap: .9, skip: .3 });
    }
    if (!part || part === 'front') { open(p, o, 'grave-near', { every: 2, depth: 1 }); W.grass(p, Object.assign({ line: [[-40, 1010], [420, 992], [900, 1010], [1400, 990], [1960, 1020]], n: 58, h: 104, depth: 60, t, wind, seed: 9, d: 0, lines: 80, avoid: o.avoid }, base)); [[-6, 1090, 13, 260, .2], [120, 1096, 8, 170, .08], [1790, 1094, 9, 190, -.04], [1930, 1088, 12, 250, -.18]].forEach((q, i) => W.tall(p, Object.assign({ x: q[0], y: q[1], n: q[2], h: q[3], spread: 66, seed: i + 81, lean: q[4], t, wind }, base))); }
    return { rg };
  };
  W.YARD = { wall: [[-30, 846], [320, 856], [700, 862], [1010, 858], [1236, 850]], h: 196, gate: [1296, 866], rose: [470, 742], bush: [380, 360, 940, 660], gap: [1300, 1690], reach: [640, 600], road: [[1500, 1090], [1490, 960], [1480, 872], [1560, 790], [1700, 742], [1640, 706], [1500, 690], [1560, 664]] };
  // yard: stone wall with the rose bush behind it, the gate, the road away (s03, s04)
  W.yard = function (p, o = {}) {
    const light = o.light || 'day', L = lightOf(light), se = o.season ?? .33, col = o.colour ?? .55, part = o.part, t = o.t ?? p.t, wind = o.wind || YARDWIND, base = { season: se, light, colour: col }, Y = W.YARD, snow = o.snow || 0;
    if (!part || part === 'back') {
      open(p, o, 'yard-sky', { every: 5, still: o.still ?? true, depth: .1 }); W.sky(p, { mood: light, t, horizon: 640, clouds: o.clouds });
      W.hill(p, Object.assign({ d: .9, pts: [[-60, 520], [200, 470], [420, 488], [700, 430], [960, 400], [1180, 440], [1440, 400], [1700, 450], [1980, 430]], base: 680, seed: 81, spurs: 4, rough: 5, hatch: 0 }, base));
      W.hill(p, Object.assign({ d: .58, pts: [[-60, 600], [260, 590], [600, 612], [900, 600], [1160, 560], [1400, 526], [1640, 540], [1980, 596]], base: 830, seed: 82, spurs: 4, rough: 7 }, base)); W.fields(p, Object.assign({ quad: [[820, 628], [1700, 600], [2000, 780], [700, 800]], rows: 4, cols: 7, d: .48, seed: 33, ww: 3.6, alpha: .5 }, base));
      const C = landPal(base, .2); p.mass(below([[-40, 742], [500, 750], [1100, 742], [1960, 730]], 1130), { sharp: true, color: { lin: [0, 730, 0, 960], stops: [[0, mixc(C.mid, C.lit, .5)], [1, C.mid]] }, dir: .04, len: 1.2, size: .9, vary: .5 });
      W.road(p, { pts: Y.road.slice().reverse(), w: [3, 120], power: 2.6, d: .18, light, season: se, colour: col, lw: 2.6 }); if (o.cottage !== false) W.cottage(p, { x: 150, y: 750, scale: .84, light, season: se, colour: col, d: .28, smoke: o.smoke ?? 1, t, wind, state: o.state || 'lived', window: o.window });
    }
    if (!part || part === 'bush') { open(p, o, 'yard-bush', { every: 2, depth: .85 }); W.roseBush(p, { x: Y.rose[0] + 130, y: Y.rose[1] + 70, w: 470, h: 250, scale: 1.4, bloom: o.bloom ?? 1, season: se, light, colour: col, t, wind, seed: 4, canes: 10, leaf: o.leaf, d: .04 }); }
    if (!part || part === 'mid') {
      open(p, o, 'yard-wall', { every: 4, depth: .8 }); const C = landPal(base, .06);
      p.mass(below([[-40, 850], [500, 860], [1236, 850], [1700, 862], [1960, 852]], 1130), { sharp: true, color: { lin: [0, 850, 0, 1080], stops: [[0, mixc(C.mid, C.dark, .35)], [1, mixc(C.mid, C.earth, .3)]] }, dir: .03, len: 1.1, size: .9, vary: .5 }); p.mass([[1300, 878], [1692, 878], [1740, 960], [1720, 1040], [1780, 1130], [980, 1130], [1120, 1030], [1250, 950]], { color: { lin: [0, 880, 0, 1080], stops: [[0, mixc(seen('#cbb994', L, .05), C.earth, .3)], [1, mixc(C.earth, C.mid, .3)]] }, alpha: .9, dir: .5, size: .8, len: .9, vary: .5, soft: 12 }); W.ruts(p, { pts: [[1500, 880], [1480, 940], [1420, 1010], [1330, 1110]], w: [150, 330], power: 1, light, season: se, colour: col }); W.ground(p, Object.assign({ area: [-20, 900, 1100, 1060], dips: 5, stones: 6, tussocks: 10, seed: 14, t, wind }, base)); W.ground(p, Object.assign({ area: [1760, 900, 1940, 1060], dips: 1, stones: 2, tussocks: 3, seed: 18, t, wind }, base));
      W.wall(p, { line: Y.wall, h: u => Y.h * (1 - .05 * u + .03 * sin(u * 9)), size: 56, light, d: .06, seed: 5, moss: 16, lines: 80, snow }); W.wall(p, { line: [[1752, 858], [1860, 852], [1980, 846]], h: 178, size: 54, light, d: .06, seed: 9, moss: 4, lines: 24, snow }); W.pier(p, { x: 1262, y: 866, w: 74, h: 236, light, d: .05, seed: 8 }); W.pier(p, { x: 1724, y: 868, w: 74, h: 228, light, d: .05, seed: 12 });
    }
    if (!part || part === 'spray') { open(p, o, 'yard-spray', { every: 2, depth: .85 }); W.roseBush(p, { x: 610, y: 672, w: 330, len: 120, hang: true, canes: 6, scale: 1.25, bloom: o.bloom ?? 1, season: se, light, colour: col, t, wind, seed: 11, leaf: o.leaf, d: .03 }); }
    if (!part || part === 'gate') { open(p, o, 'yard-gate', { every: 2, depth: .85 }); W.gate(p, { x: Y.gate[0], y: 862, w: 392, h: 170, open: o.gate ?? 0, swing: o.swing, light }); }
    if (!part || part === 'front') { open(p, o, 'yard-front', { every: 2, depth: 1 }); W.grass(p, Object.assign({ line: [[-40, 876], [300, 884], [720, 890], [1220, 878]], n: 40, h: 46, depth: 12, t, wind, seed: 19, d: .03, lines: 44 }, base)); W.grass(p, Object.assign({ line: [[-40, 1050], [420, 1040], [820, 1062], [1120, 1076]], n: 30, h: 84, depth: 36, t, wind, seed: 21, d: 0, lines: 34 }, base)); [[40, 1078, 9, 190, .12], [190, 1090, 6, 130, .02], [1880, 1084, 8, 170, -.14]].forEach((q, i) => W.tall(p, Object.assign({ x: q[0], y: q[1], n: q[2], h: q[3], spread: 60, seed: i + 61, lean: q[4], t, wind }, base))); }
  };
  const YARDWIND = W.gusts({ seed: 15, every: 3.1, power: .6 });
  W.VALLEY = { cottage: [1196, 690], scale: .5, window: [1300, 648], path: [[210, 1120], [360, 1000], [620, 922], [900, 880], [1010, 820], [980, 772], [1090, 736], [1230, 704], [1400, 678]] };
  // snowValley: near-white, hushed, one lit window (s06)
  W.snowValley = function (p, o = {}) {
    const light = o.light || 'snow', L = lightOf(light), part = o.part, t = o.t ?? p.t, k = o.k ?? 1, V = W.VALLEY, blue = '#a9b7c1', lit = o.window ?? 1;
    if (!part || part === 'back') {
      open(p, o, 'snow-sky', { every: 6, still: o.still ?? true, depth: .05 }); W.sky(p, { mood: light, t, horizon: 520, clouds: 1, strength: .85 });
      // the far land: one long soft fold laid over another, hardly darker than the paper
      const sp = (shade, ink) => ({ shade, mid: '#e3e3de', lit: '#ebe8e0', sun: '#f4f0e6', ink, dark: shade, deep: shade });
      W.hill(p, { d: .9, light, season: 1, pts: [[-60, 452], [160, 400], [380, 420], [620, 360], [860, 376], [1080, 420], [1300, 372], [1540, 330], [1760, 380], [1980, 360]], base: 640, seed: 91, rough: 5, hatch: 0, crest: .7, foot: '#e8e5dd', pal: sp('#c3ccd2', '#aab4ba'), spurs: [{ x: 620, to: [470, 600], w: 250, k: .9, bow: 50 }, { x: 1540, to: [1400, 600], w: 280, k: .9, bow: 60 }, { x: 180, to: [60, 590], w: 180, k: .7, bow: 40 }, { x: 1000, to: [900, 590], w: 190, k: .5, bow: 30 }] });
      W.hill(p, { d: .7, light, season: 1, pts: [[-60, 580], [220, 540], [420, 488], [640, 458], [860, 506], [1060, 566], [1260, 552], [1500, 484], [1720, 440], [1980, 474]], base: 760, seed: 92, rough: 5, hatch: 0, crest: .9, foot: '#ebe8e0', pal: sp('#b3bfc8', '#8f9ba4'), spurs: [{ x: 640, to: [440, 700], w: 300, k: .85, bow: 70 }, { x: 1730, to: [1500, 690], w: 330, k: .85, bow: 80 }, { x: 420, to: [250, 680], w: 160, k: .6, bow: 46 }, { x: 1500, to: [1320, 670], w: 200, k: .6, bow: 46 }, { x: 900, to: [820, 660], w: 160, k: .5, bow: 24 }] });
    }
    if (!part || part === 'mid') {
      open(p, o, 'snow-land', { every: 4, depth: .6 });
      const r1 = ridge([[-60, 640], [260, 620], [560, 636], [860, 668], [1120, 690], [1440, 668], [1700, 640], [1980, 620]], { amp: 5, seed: 94, step: 26 }), r2 = ridge([[-60, 800], [300, 780], [640, 824], [960, 846], [1300, 820], [1640, 790], [1980, 800]], { amp: 6, seed: 95, step: 26 });
      W.snowGround(p, { rg: r1, foot: 960, light, seed: 4, low: '#e0e2e0' });
      // walls: here a run of cap stones, there only a long swell in the snow with blue behind it
      [[[290, 706], [430, 692], [560, 694], [700, 712], [840, 742], [970, 772]], [[1410, 726], [1560, 706], [1700, 712], [1840, 724], [1980, 716]], [[560, 694], [584, 668], [636, 650], [700, 644]], [[970, 772], [1160, 792], [1380, 786], [1600, 792], [1820, 806]]].forEach((w, i) => {
        const T = track(spline(w, 8, false)), pts = T.slice(0, 1, 14), sh = ribbon(pts.map(q => [q[0] + 4, q[1] + 7]), u => 7 + 5 * noise1(u * 5 + i, 3), { step: 22, rough: 2, seed: i }); p.mass(sh.poly, { sharp: true, color: '#bfcad2', alpha: .85, dir: .05, size: .6, len: .9, vary: .25, soft: 8 }); const cap = ribbon(pts, u => 4 + 2 * noise1(u * 7, i + 2), { step: 20, rough: 1.5, seed: i + 3 }); p.mass(cap.poly, { sharp: true, color: '#f1eee6', alpha: .9, dir: .05, size: .5, len: .8, vary: .12 });
        const st = [], R = rngOf(i + 51); let d = 20 * R(); while (d < T.len) { const run = 1 + (R() * 5 | 0); if (R() < .46) for (let k = 0; k < run; k++) { const q = T.s(d + k * 11), r = 2.6 + 3.4 * R(); st.push(lump(q[0], q[1] + 3 + 2 * R(), r * 1.5, r, i * 30 + k, { n: 7, rough: .25 })); } d += run * 11 + 20 + 130 * R() * R(); } if (st.length) p.mass(poly(...st), { color: '#777e83', alpha: .9, dir: .2, size: .36, len: .4, vary: .4 }); found(p, pts, { color: '#8f9ba3', w: 1.7, press: .5, seed: i + 2, seg: 210, gap: .8, skip: .3, step: 34 });
      });
      W.cottage(p, { x: V.cottage[0], y: V.cottage[1], scale: V.scale, state: 'lived', light: Object.assign({}, MOODS.snow), season: 1, window: lit, lit: 1, smoke: o.smoke ?? .7, t, wind: o.wind, d: .2 });
      // snow on the thatch, and against the gable
      const X = (a, b) => [V.cottage[0] + a * V.scale, V.cottage[1] + b * V.scale]; p.mass([X(-64, -226), X(100, -216), X(260, -194), X(400, -180), X(446, -118), X(300, -122), X(120, -128), X(-6, -126)], { color: '#eff0ec', dir: 1.1, size: .6, len: .7, vary: .15 }); ln(p, [X(-6, -122), X(130, -126), X(300, -120), X(446, -114)], { color: '#8f9ca6', w: 1.8, press: .55, wobble: 1.6 }); found(p, [X(-62, -226), X(100, -216), X(260, -196), X(400, -182)], { color: '#a9b3b9', w: 1.6, press: .5, seed: 4, seg: 60, gap: .6 }); p.mass([X(-190, -10), X(-120, -44), X(-40, -14), X(60, 6), X(200, -14), X(460, -40), X(540, -10), X(300, 40), X(-60, 46)], { color: '#eceae3', dir: .05, size: .7, vary: .15 });
      if (lit > .02) { const w = [V.cottage[0] + 327 * V.scale, V.cottage[1] - 92 * V.scale]; p.mass(lump(w[0] + 8, w[1] + 10, 92, 62, 3, { rough: .18 }), { color: { rad: [w[0], w[1], 92], stops: [[0, 'rgba(242,188,96,.75)'], [.4, 'rgba(242,200,128,.34)'], [1, 'rgba(242,210,150,0)']] }, dir: { around: w }, len: .7, size: .6, vary: .3, soft: 6, alpha: lit }); p.mass([[w[0] - 13, w[1] - 14], [w[0] + 13, w[1] - 15], [w[0] + 14, w[1] + 13], [w[0] - 13, w[1] + 15]], { sharp: true, color: mixc('#8b8f92', '#eda63c', lit), size: .36, len: .4, dir: 1 }); p.mass([[w[0] - 24, w[1] + 34], [w[0] + 22, w[1] + 34], [w[0] + 66, w[1] + 84], [w[0] - 40, w[1] + 88]], { color: '#f3cf8d', alpha: .6 * lit, dir: .2, size: .6, soft: 10 }); ln(p, [[w[0], w[1] - 13], [w[0], w[1] + 13]], { color: '#6b4a1e', w: 1.8, press: .8 }); }
      W.snowGround(p, { rg: r2, light, seed: 8, low: '#d8dde0', n: 8 }); found(p, r2, { color: '#a3b0b9', w: 2.4, press: .4, seed: 5, seg: 240, gap: 1, skip: .35 });
      // bare thorn and a few stems for scale
      W.thorn(p, { x: 470, y: 706, scale: .42, season: 1, light: 'snow', t, wind: o.wind, d: .3 });
    }
    if (!part || part === 'front') { open(p, o, 'snow-near', { every: 3, depth: .95 }); [[1500, 1040, 5, 130, .05], [1610, 1060, 7, 170, -.02], [1730, 1030, 4, 110, .06], [1850, 1064, 8, 190, -.08]].forEach((q, i) => W.tall(p, { x: q[0], y: q[1], n: 3, stems: q[2], h: q[3], spread: 34, seed: i + 21, lean: q[4], t, wind: o.wind, light: 'snow', season: .85, colour: .4 })); }
    return V;
  };
  W.ROAD = { pts: [[1250, 598], [1180, 622], [1110, 646], [1150, 676], [1250, 704], [1230, 742], [1090, 786], [960, 850], [900, 930], [880, 1010], [860, 1110]], walk: [[980, 850], [890, 960]], ruin: [1270, 598] };
  // roadHome: late autumn road under rain, walls falling down, the ruin up ahead (s10)
  W.roadHome = function (p, o = {}) {
    const light = o.light || 'rain', L = lightOf(light), se = o.season ?? .74, col = o.colour ?? .42, part = o.part, t = o.t ?? p.t, wind = o.wind || ROADWIND, base = { season: se, light, colour: col }, R0 = W.ROAD;
    if (!part || part === 'back') {
      open(p, o, 'road-sky', { every: 5, still: o.still ?? true, depth: .05 }); W.sky(p, { mood: light, t, horizon: 620, clouds: o.clouds });
      W.hill(p, Object.assign({ d: .86, pts: [[-60, 440], [200, 410], [460, 430], [700, 400], [940, 430], [1200, 396], [1500, 340], [1740, 372], [1980, 350]], base: 640, seed: 101, spurs: 4, rough: 5, hatch: 0 }, base)); W.hill(p, Object.assign({ d: .58, pts: [[-60, 560], [220, 540], [520, 566], [820, 590], [1080, 580], [1320, 548], [1560, 500], [1780, 480], [1980, 500]], base: 760, seed: 102, spurs: 4, rough: 6 }, base));
      p.mass(lump(1360, 560, 420, 70, 8, { rough: .2 }), { color: { rad: [1360, 560, 420], stops: [[0, rgba(mixc(L.sun, '#f3e7c4', .5), .75)], [1, rgba(L.low, 0)]] }, dir: .02, len: 1.2, size: .9, soft: 16 }); W.cottage(p, { x: R0.ruin[0], y: R0.ruin[1] + 10, scale: .46, state: o.state || 'ruin', light, season: se, colour: col, d: .34, t, wind });
    }
    if (!part || part === 'mid') {
      open(p, o, 'road-land', { every: 4, depth: .6 }); const rg = ridge([[-60, 640], [260, 646], [620, 660], [960, 640], [1250, 610], [1560, 624], [1980, 600]], { amp: 6, seed: 104, step: 24 }), C = landPal(base, .16), C2 = landPal(base, .04);
      p.mass(below(rg, 1130), { sharp: true, color: { lin: [0, 600, 0, 1080], stops: [[0, mixc(C.lit, L.haze, .4)], [.35, C.mid], [1, mixc(C2.dark, C2.mid, .5)]] }, dir: .08, len: 1.2, size: 1, vary: .5 });
      W.fields(p, Object.assign({ quad: [[-40, 668], [900, 672], [760, 830], [-200, 850]], rows: 3, cols: 5, d: .4, seed: 44, ww: 4, alpha: .5 }, base)); [[120, 700, 360, 44], [1500, 690, 420, 60], [300, 900, 500, 90], [1480, 900, 560, 110]].forEach((q, i) => p.mass(lump(q[0], q[1], q[2], q[3], i + 3, { rough: .25 }), { color: i % 2 ? C2.dry : mixc(C2.dark, C2.mid, .5), alpha: .5, dir: .1, size: .9, vary: .5, soft: 14 }));
      W.sward(p, Object.assign({ rg: rg.map(q => [q[0], q[1] + 20]), depth: 420, n: 380, t, wind, seed: 45, H: 20, d: .1 }, base));
      W.road(p, { pts: R0.pts, w: [5, 190], power: 2.1, d: .1, light, season: se, colour: col, color: mixc(seen('#b5aa94', L, .1), L.low, .25), lw: 3 });
      p.shade([[-40, 900], [300, 860], [700, 860], [820, 1120], [-40, 1120]], { color: mixc(C2.dark, '#4a4038', .5), alpha: .5, soft: 60 }); p.shade([[1080, 1120], [1180, 900], [1500, 840], [1980, 900], [1980, 1120]], { color: mixc(C2.dark, '#4a4038', .5), alpha: .55, soft: 60 });
      W.ruts(p, { pts: R0.pts.slice(4), w: [16, 250], power: 1.5, light, season: se, colour: col }); W.ground(p, Object.assign({ area: [-20, 890, 760, 1060], dips: 4, stones: 8, tussocks: 9, seed: 47, t, wind }, base)); W.ground(p, Object.assign({ area: [1140, 880, 1940, 1060], dips: 4, stones: 8, tussocks: 9, seed: 48, t, wind }, base));
      // water standing in the ruts
      [[1000, 856, 60, 9], [884, 952, 90, 13], [930, 900, 40, 7]].forEach((q, i) => p.mass(lump(q[0], q[1], q[2], q[3], i, { rough: .2 }), { color: mixc(L.low, L.cl, .5), alpha: .85, dir: 0, size: .5, len: .7 }));
      W.wall(p, { line: [[-60, 930], [200, 880], [480, 828], [730, 780], [900, 742]], h: u => lerp(170, 44, Math.pow(u, .85)) * (1 - .55 * ss(.28, .36, u) * (1 - ss(.44, .52, u))), size: 44, light, d: .12, seed: 51, moss: 14, lines: 56 }); W.wall(p, { line: [[1330, 742], [1500, 800], [1720, 880], [1980, 980]], h: u => lerp(52, 190, u) * (1 - .4 * ss(.5, .6, u) * (1 - ss(.66, .74, u))), size: 46, light, d: .12, seed: 52, moss: 12, lines: 50 });
    }
    if (!part || part === 'front') { open(p, o, 'road-near', { every: 2, depth: 1 }); W.deadFlowers(p, Object.assign({ line: [[-20, 1060], [300, 1040], [560, 1066]], n: 8, h: 300, t, wind, seed: 3 }, base)); W.deadFlowers(p, Object.assign({ line: [[1320, 1060], [1600, 1036], [1940, 1060]], n: 9, h: 280, t, wind, seed: 8 }, base)); W.grass(p, Object.assign({ line: [[-40, 1050], [300, 1030], [620, 1080]], n: 26, h: 88, depth: 40, t, wind, seed: 46, d: 0, lines: 36 }, base)); W.grass(p, Object.assign({ line: [[1180, 1080], [1500, 1040], [1960, 1050]], n: 30, h: 88, depth: 40, t, wind, seed: 47, d: 0, lines: 36 }, base)); }
  };
  const ROADWIND = W.gusts({ seed: 23, every: 2.2, power: .9, base: .3, dir: -1 });
  // ruinYard: out of the back door, the hill with the thorn on it behind (s11 exterior, s12)
  W.RUIN = { cottage: [300, 838], door: [548, 806], path: [[560, 830], [700, 850], [860, 826], [980, 770], [1100, 706], [1230, 640], [1330, 586], [1400, 540]], tree: [1480, 520], stone: [1400, 528] };
  W.ruinYard = function (p, o = {}) {
    const light = o.light || 'dusk', L = lightOf(light), se = o.season ?? .7, col = o.colour ?? .45, part = o.part, t = o.t ?? p.t, wind = o.wind || HILLWIND, base = { season: se, light, colour: col }, U = W.RUIN;
    const rg = ridge([[-60, 800], [260, 780], [560, 770], [860, 720], [1100, 634], [1300, 556], [1460, 520], [1620, 534], [1800, 590], [1980, 640]], { amp: 7, seed: 111, step: 22 });
    if (!part || part === 'back') { open(p, o, 'ruin-sky', { every: 5, still: o.still ?? true, depth: .05 }); W.sky(p, { mood: light, t, horizon: 700, clouds: o.clouds }); W.hill(p, Object.assign({ d: .9, pts: [[-60, 600], [240, 566], [520, 590], [800, 560], [1100, 590], [1980, 640]], base: 800, seed: 112, spurs: 4, rough: 5 }, base)); }
    if (!part || part === 'mid') {
      open(p, o, 'ruin-land', { every: 4, depth: .6 }); const C = landPal(base, .1); p.mass(below(rg, 1130), { sharp: true, color: { lin: [200, 560, 900, 1080], stops: [[0, mixc(C.lit, C.sun, .3)], [.45, C.mid], [1, mixc(C.dark, C.mid, .4)]] }, dir: -.38, len: 1.25, size: 1, vary: .5 }); p.mass(below(cut(rg, 1460, 1980), [[1300, 1130], [1500, 900], [1760, 860], [1980, 900]]), { sharp: true, color: C.shade, alpha: .5, dir: .5, size: 1, vary: .5, soft: 14 });
      W.sward(p, Object.assign({ rg, depth: 420, n: 440, t, wind, seed: 48, H: 20, d: .1 }, base)); found(p, rg, { color: C.ink, w: 3, press: .5, seed: 9, seg: 190, gap: .7, skip: .25 });
      W.ground(p, Object.assign({ area: [-20, 890, 1940, 1050], dips: 6, stones: 9, tussocks: 12, seed: 37, t, wind }, base));
      found(p, U.path, { color: mixc(C.dark, C.ink, .4), w: 1.8, press: .34, seed: 3, seg: 120, gap: .6 }); W.thorn(p, { x: U.tree[0], y: U.tree[1] + 8, scale: .78, season: se, light, colour: col, t, wind, d: .14 }); W.stone(p, { x: U.stone[0], y: U.stone[1] + 18, scale: .24, light, season: se, colour: col, t, wind, tuft: 0, moss: 3 });
      W.cottage(p, { x: U.cottage[0], y: U.cottage[1], scale: 1.15, state: 'ruin', door: o.door ?? .6, light, season: se, colour: col, t, wind, d: .08 });
    }
    if (!part || part === 'front') { open(p, o, 'ruin-near', { every: 2, depth: 1 }); W.grass(p, Object.assign({ line: [[-40, 1030], [400, 1010], [900, 1030], [1400, 1010], [1960, 1040]], n: 58, h: 100, depth: 50, t, wind, seed: 49, d: 0, lines: 80 }, base)); [[40, 1090, 12, 240, .14], [1500, 1094, 7, 150, .02], [1880, 1088, 12, 230, -.12]].forEach((q, i) => W.tall(p, Object.assign({ x: q[0], y: q[1], n: q[2], h: q[3], spread: 66, seed: i + 91, lean: q[4], t, wind }, base))); }
    return { rg };
  };
//@@TAIL
  B.test.worldSheet = function (p, k) { const f = SHEETS[k | 0]; p.paper(PAPER); if (f) f(p, k - (k | 0)); };
  const SHEETS = W.SHEETS = [
    /* 0 glen */ p => { W.glen(p, { bend: W.callWind(.62), callK: .62 }); p.layer('call', { depth: 1 }); W.callSky(p, { k: .62 }); W.marchers(p, { k: .86 }); W.birds(p, { x: 800, y: 560, n: 9, t: 1.1, dir: -1 }); W.callLines(p, { k: .62 }); },
    /* 1 gate and rose bush, summer */ p => W.yard(p, { bloom: 1 }),
    /* 2 the same, autumn, going */ p => { W.yard(p, { bloom: .22, season: .64, gate: .6 }); p.layer('pet', { depth: 1 }); W.petals(p, { t: 2.2, n: 9, from: [560, 560], wind: W.gusts({ seed: 2, power: .8 }), s: 22 }); },
    /* 3 meadow */ p => { p.layer('sky', { depth: .1 }); W.sky(p, { mood: 'summer', horizon: 640 }); W.hills(p, { light: 'summer', season: .33, colour: 1 }); p.layer('m', { depth: .85 }); W.meadow(p, { light: 'summer' }); },
    /* 4 snow valley */ p => { W.snowValley(p, {}); p.layer('fl', { depth: 1 }); W.thread(p, W.layOn([210, 1110], [1400, 690], null, { n: 4 }).length ? W.VALLEY.path : [], { w: 4.5, meander: 6, seed: 4, ground: .5, light: 'snow' }); W.snow(p, { t: 4.2, fall: .9 }); },
    /* 5 thorn hill, sun */ p => W.thornHill(p, { sunX: 700, stone: false }),
    /* 6 thorn hill, shadow */ p => W.thornHill(p, { light: 'storm', season: .66, shadow: [900, 1900] }),
    /* 7 doorway */ p => { p.layer('a', { depth: .2 }); W.sky(p, { mood: 'dawn', horizon: 620 }); W.hills(p, { light: 'dawn', preset: 'west', dy: 60 }); p.layer('b', { depth: .85 }); W.doorway(p, {}); },
    /* 8 room at night */ p => { p.layer('a', { depth: .8 }); W.interior(p, { fire: 1, door: 0 }); p.layer('b', { depth: .95 }); W.lamp(p, { x: 1030, y: 510 }); W.ball(p, { x: 740, y: 930, r: 44 }); W.firelight(p, { x: 446, y: 640 }); },
    /* 9 the room in ruin */ p => { p.layer('a', { depth: .8 }); W.interior(p, { ruin: 1, fire: 0, light: 'rain' }); },
    /* 10 under */ p => { p.layer('a', { depth: .8 }); W.under(p, { grow: .7, part: 'back' }); p.layer('b', { depth: .9 }); W.under(p, { grow: .7, part: 'roots' }); p.layer('c', { depth: .9 }); W.under(p, { part: 'above' }); W.under(p, { part: 'turf' }); p.layer('r', { depth: 1 }); W.treadRings(p, { x: 640, k: .3 }); W.treadRings(p, { x: 700, k: .62 }); },
    /* 11 under, warm */ p => { const o = { grow: 1, red: .8, warm: 1 }; p.layer('a', { depth: .8 }); W.under(p, { ...o, part: 'back' }); W.warmth(p, { k: 1 }); p.layer('b', { depth: .9 }); W.under(p, { ...o, part: 'roots' }); p.layer('c', { depth: .9 }); W.under(p, { ...o, part: 'above', roses: 1 }); W.under(p, { ...o, part: 'turf' }); },
    /* 12 night */ p => { const o = { light: 'night', season: .4, stone: true, roses: 1, clouds: false }; W.thornHill(p, { ...o, part: 'back' }); p.layer('st', { depth: .9, every: 3 }); W.stars(p, { way: 1 }); W.thornHill(p, { ...o, part: 'mid' }); p.layer('th', { depth: 1 }); W.thread(p, [[1130, 590], [1010, 430], [1190, 300], [980, 170], [700, 110]], { w: 5, air: 26, loops: 2, light: 'night' }); W.thornHill(p, { ...o, part: 'front' }); },
    /* 13 road home */ p => W.roadHome(p, {}),
    /* 14 ruin yard */ p => { W.ruinYard(p, {}); p.layer('th', { depth: 1 }); W.thread(p, W.RUIN.path, { w: 4.4, meander: 8, light: 'dusk', ground: .5 }); },
    /* 15 graveside */ p => W.graveside(p, {}),
    /* 16 graveside, colour */ p => W.graveside(p, { light: 'gold', season: .3, colour: 1, roses: 1 }),
    /* 17 thorn seasons */ p => { p.layer('a', { depth: .9 }); [0.1, .33, .66, 1].forEach((se, i) => W.thorn(p, { x: 220 + (i % 2) * 900, y: 480 + (i > 1 ? 540 : 0), scale: 1.5, season: se })); },
    /* 18 rose */ p => { p.layer('a', { depth: .9 }); W.rose(p, { x: 420, y: 340, r: 170 }); W.rose(p, { x: 1300, y: 300, r: 150, apart: .55, t: 3, seed: 2 }); W.roseBush(p, { x: 900, y: 1000, scale: 1.2, bloom: 1 }); W.roseBush(p, { x: 1500, y: 1000, scale: 1, bloom: .25, season: .7, seed: 3 }); W.stone(p, { x: 260, y: 960, scale: 1.1 }); W.rosesOver(p, { x: 260, y: 956, scale: 1.1 }); },
    /* 19 wool */ p => { p.layer('a', { depth: 1 }); W.thread(p, [[120, 200], [500, 160], [900, 260], [1400, 150], [1800, 240]], { w: 12, slack: 1, loops: 3, loopR: 40 }); W.thread(p, [[120, 420], [700, 420], [1300, 400]], { w: 6, hang: .18, pull: { t0: -.4, amp: 22 }, t: 0 }); W.ball(p, { x: 1560, y: 470, r: 110 }); W.thread(p, W.windCurve(260, 720, 120, 4), { w: 6 }); W.needles(p, { x: 640, y: 720 }); W.knit(p, { x: 640, y: 730, w: 150, rows: 14 }); const z = W.spell('bide', 980, 800, 120); W.thread(p, z.main, { w: 9 }); W.thread(p, z.dot, { w: 11, ply: 0, fuzz: 0 }); W.birds(p, { x: 1300, y: 940, t: 1.3, n: 8 }); W.fire(p, { x: 260, y: 1030, w: 140, h: 120, t: 2 }); },
    /* 20 cottages */ p => { p.layer('a', { depth: .3 }); W.sky(p, { mood: 'day' }); W.hills(p, {}); p.layer('b', { depth: .85 }); W.cottage(p, { x: 300, y: 900, scale: 1.2, smoke: 1 }); W.cottage(p, { x: 1260, y: 900, scale: 1.1, state: 'ruin' }); },
    /* 21 wall, gate, dead flowers */ p => { p.layer('a', { depth: .9 }); W.wall(p, { line: [[-20, 700], [700, 730], [1300, 680]], h: 210, size: 62, moss: 10 }); W.gate(p, { x: 1380, y: 740, w: 380, h: 210, open: .3 }); W.pier(p, { x: 1340, y: 742, h: 260 }); W.deadFlowers(p, { line: [[60, 1040], [1900, 1050]], n: 14, h: 240 }); }
  ];
  // motion pages: k is seconds. A wind on the hill, B the rose and its petals, C fire smoke snow, D wool
  const gM = W.gusts({ seed: 5, every: 1.9, power: 1 });
  B.test.motionA = (p, k) => { p.paper(PAPER); p.layer('m', { every: 2, depth: .9 }); W.thorn(p, { x: 260, y: 700, scale: 2.2, season: .4, wind: gM }); W.ground(p, { area: [1000, 720, 1900, 820], dips: 1, stones: 2, tussocks: 6, wind: gM, seed: 5 }); W.grass(p, { line: [[0, 820], [1920, 830]], n: 60, h: 130, wind: gM, lines: 90 }); W.tall(p, { x: 1500, y: 1060, n: 20, h: 330, wind: gM }); W.deadFlowers(p, { line: [[1050, 1040], [1400, 1040]], n: 5, h: 300, wind: gM }); };
  B.test.motionB = (p, k) => { p.paper(PAPER); p.layer('m', { every: 1, depth: 1 }); W.rose(p, { x: 520, y: 300, r: 170, apart: A.clamp((k - .3) / 2.6), shake: k < .5 ? 1 : .3, wind: gM }); W.petals(p, { t: k, n: 9, from: [1300, 160], wind: gM, s: 30, floor: 960 }); };
  B.test.motionC = (p, k) => { p.paper('#6c6a6b'); p.layer('m', { every: 1, depth: 1 }); W.fire(p, { x: 340, y: 900, w: 360, h: 420, t: k }); W.smoke(p, { x: 820, y: 940, h: 700, w: 30, t: k, wind: gM }); W.snow(p, { t: k + 5, fall: 1, wind: gM }); W.lamp(p, { x: 1300, y: 900, scale: 2.4 }); };
  B.test.motionD = (p, k) => { p.paper(PAPER); p.layer('m', { every: 1, depth: 1 }); const hx = 900 + 620 * A.ease.io(A.clamp(k / 1.6)), s = W.rope({ id: 'md', n: 34, len: 1250, t0: 0, a: () => [220, 320], b: t => [900 + 620 * A.ease.io(A.clamp(t / 1.6)), 300], ground: () => 560 }, k); W.thread(p, s, { raw: true, w: 9, pull: { t0: 1.6, amp: 26 } }); const bx = 300 + 900 * A.ease.out(A.clamp(k / 2.4)); W.ball(p, { x: bx, y: 820, r: 70, roll: (bx - 300) / 70 }); W.thread(p, [[300, 885], [(300 + bx) / 2, 880], [bx - 20, 886]], { w: 8, meander: 8, ground: .5 }); W.thread(p, [[1300, 700], [1500, 760], [1700, 640], [1880, 700]], { w: 7, air: 34, free: true, t: k }); const z = W.spell('bide', 1380, 980, 80); W.thread(p, z.main, { w: 7, k1: A.clamp(k / 2.4) }); };
  B.test.motionE = (p, k) => { W.glen(p, { bend: W.callWind(k / 2.6), callK: k / 2.6 }); p.layer('call', { depth: 1, every: 1 }); W.callSky(p, { k: k / 2.6 }); W.marchers(p, { k: .55 + k * .03 }); W.birds(p, { x: 800, y: 600, n: 9, t: k, t0: 1, dir: -1 }); W.callLines(p, { k: k / 2.6 }); };
})();
