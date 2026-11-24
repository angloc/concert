// anim.js - timing helpers an animator would use. Everything is evaluated at held drawing times.
window.BIDE = window.BIDE || {};
(function () {
  const B = window.BIDE;
  const clamp = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x;
  const lerp = (a, b, k) => a + (b - a) * k;
  const ease = {
    lin: x => x, io: x => x * x * x * (x * (6 * x - 15) + 10),           // slow in, slow out
    in: x => x * x * (1.2 * x - .2 * x * x), out: x => 1 - Math.pow(1 - x, 2.6),
    snap: x => { const y = 1 - Math.pow(1 - x, 5); return y; },           // pops, long settle
    antic: x => x < .28 ? -.12 * Math.sin(x / .28 * Math.PI) : ease.io((x - .28) / .72),
    settle: x => x >= 1 ? 1 : 1 - Math.exp(-5.2 * x) * Math.cos(7.2 * x) * (1 - x), // overshoot + settle
    heavy: x => x * x * x, hold: x => 0
  };
  // keys(t, [[time, value, easeIntoThisKey], ...])  value: number or array of numbers
  function keys(t, ks) {
    if (t <= ks[0][0]) return ks[0][1];
    for (let i = 1; i < ks.length; i++) {
      if (t <= ks[i][0]) {
        const a = ks[i - 1], b = ks[i], x = (t - a[0]) / Math.max(1e-6, b[0] - a[0]), e = (ease[b[2] || 'io'])(clamp(x));
        return mixv(a[1], b[1], e);
      }
    }
    return ks[ks.length - 1][1];
  }
  function mixv(a, b, k) {
    if (typeof a === 'number') return a + (b - a) * k;
    if (Array.isArray(a)) return a.map((v, i) => mixv(v, b[i], k));
    const o = {}; for (const q in a) o[q] = q in b ? mixv(a[q], b[q], k) : a[q]; for (const q in b) if (!(q in o)) o[q] = b[q]; return o;
  }
  function hash(a, b, c) { let h = (Math.imul((a * 1000) | 0, 374761393) ^ Math.imul((b * 1000) | 0, 668265263) ^ Math.imul((c * 1000) | 0, 2147483647 ^ 0x5bd1e995)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return ((h >>> 0) % 1000003) / 1000003; }
  function noise1(x, s = 0) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash(i, s, 7), hash(i + 1, s, 7), u) * 2 - 1; }
  // lagged value: evaluate fn at earlier times so loose parts drag behind (overlap / follow through)
  function drag(fn, t, lag) { return fn(t - lag); }
  // spring chain for cloth/hair/thread: simulated deterministically from t0 in 1/24 s steps
  function chain(opts, t) { // opts:{t0,n,seg,root(t)->[x,y],dir(t)->angle,stiff,damp,grav,wind(t,i)->[fx,fy]}
    const n = opts.n, h = 1 / 24, steps = Math.max(1, Math.round((t - opts.t0) / h));
    let P = [], V = []; const r0 = opts.root(opts.t0), a0 = opts.dir(opts.t0);
    for (let i = 0; i <= n; i++) { P.push([r0[0] + Math.cos(a0) * opts.seg * i, r0[1] + Math.sin(a0) * opts.seg * i]); V.push([0, 0]); }
    const st = opts.stiff == null ? 60 : opts.stiff, dm = opts.damp == null ? .88 : opts.damp, g = opts.grav == null ? 500 : opts.grav;
    for (let s = 1; s <= Math.min(steps, 24 * 20); s++) {
      const tt = opts.t0 + s * h, r = opts.root(tt), a = opts.dir(tt); P[0] = r.slice(); let px = r[0], py = r[1], ang = a;
      for (let i = 1; i <= n; i++) {
        const tx = px + Math.cos(ang) * opts.seg, ty = py + Math.sin(ang) * opts.seg, w = opts.wind ? opts.wind(tt, i) : [0, 0];
        const k = st / (1 + i * .35);
        V[i][0] = (V[i][0] + ((tx - P[i][0]) * k + w[0]) * h) * dm; V[i][1] = (V[i][1] + ((ty - P[i][1]) * k + g + w[1]) * h) * dm;
        P[i][0] += V[i][0] * h; P[i][1] += V[i][1] * h;
        let dx = P[i][0] - P[i - 1][0], dy = P[i][1] - P[i - 1][1], d = Math.hypot(dx, dy) || 1; P[i][0] = P[i - 1][0] + dx / d * opts.seg; P[i][1] = P[i - 1][1] + dy / d * opts.seg;
        px = P[i][0]; py = P[i][1]; ang = Math.atan2(P[i][1] - P[i - 1][1], P[i][0] - P[i - 1][0]);
      }
    }
    return P;
  }
  // two-bone IK: returns elbow/knee point. bend = +1/-1
  function ik(ax, ay, bx, by, l1, l2, bend) { let dx = bx - ax, dy = by - ay, d = Math.hypot(dx, dy) || 1e-4; const m = (l1 + l2) * .999; if (d > m) { bx = ax + dx / d * m; by = ay + dy / d * m; dx = bx - ax; dy = by - ay; d = m; } const c = clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1), a = Math.atan2(dy, dx) - bend * Math.acos(c); return { x: ax + Math.cos(a) * l1, y: ay + Math.sin(a) * l1, ex: bx, ey: by }; }
  function spline(pts, per = 8, closed = false) { const n = pts.length, out = []; if (n < 3) return pts.map(p => p.slice()); const g = i => closed ? pts[(i % n + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]; const m = closed ? n : n - 1; for (let i = 0; i < m; i++) { const a = g(i - 1), b = g(i), c = g(i + 1), d = g(i + 2); for (let j = 0; j < per; j++) { const t = j / per, t2 = t * t, t3 = t2 * t; const o = []; for (let k = 0; k < Math.max(b.length, 2); k++) { const A = a[k] ?? 1, Bq = b[k] ?? 1, C = c[k] ?? 1, D = d[k] ?? 1; o.push(.5 * (2 * Bq + (C - A) * t + (2 * A - 5 * Bq + 4 * C - D) * t2 + (3 * Bq - A - 3 * C + D) * t3)); } out.push(o); } } if (!closed) out.push(pts[n - 1].slice()); return out; }
  function hex(c) { if (Array.isArray(c)) return c; c = c.replace('#', ''); if (c.length === 3) c = c.replace(/./g, '$&$&'); return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)]; }
  function toHex(a) { return '#' + a.slice(0, 3).map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join(''); }
  function mixc(a, b, k) { a = hex(a); b = hex(b); return toHex([0, 1, 2].map(i => a[i] + (b[i] - a[i]) * k)); }
  B.anim = { clamp, lerp, ease, keys, mixv, hash, noise1, drag, chain, ik, spline, hex, toHex, mixc, TAU: Math.PI * 2 };
  B.scenes = B.scenes || {}; B.test = B.test || {};
  B.scene = o => { B.scenes[o.id] = o; };
})();
