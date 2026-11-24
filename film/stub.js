// stub.js - plain Canvas2D stand-in with the painter API, used only until engine.js exists (or with ?stub).
window.BIDE = window.BIDE || {};
(function () {
  const B = window.BIDE, A = () => B.anim;
  B.stub = function (canvas) {
    const W = 1920, H = 1080; canvas.width = W; canvas.height = H; const c = canvas.getContext('2d');
    const path = (sh, st) => { if (typeof sh === 'function') { sh(c); return; } const q = (st && st.sharp) ? sh : A().spline(sh, 8, true); c.beginPath(); q.forEach((v, i) => i ? c.lineTo(v[0], v[1]) : c.moveTo(v[0], v[1])); c.closePath(); };
    const col = x => { if (typeof x === 'string') return x; const g = x.lin ? c.createLinearGradient(...x.lin) : c.createRadialGradient(x.rad[0], x.rad[1], 0, x.rad[0], x.rad[1], x.rad[2]); x.stops.forEach(s => g.addColorStop(s[0], s[1])); return g; };
    const modes = { multiply: 'multiply', screen: 'screen', over: 'source-over' };
    const p = {
      W, H, n: 0, t: 0, isStub: true,
      rnd: (a = 0, b = 0, d = 0) => A().hash(a + p.n * 17.13, b, d), fix: (a = 0, b = 0, d = 0) => A().hash(a, b, d),
      paper(k) { c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.fillStyle = k; c.fillRect(0, 0, W, H); }, layer() { },
      mass(sh, st) { c.save(); c.globalAlpha = st.alpha ?? 1; if (st.soft) c.filter = `blur(${st.soft}px)`; path(sh, st); c.fillStyle = col(st.color); c.fill(); c.restore(); },
      shade(sh, st) { c.save(); c.globalAlpha = st.alpha ?? .4; c.globalCompositeOperation = modes[st.mode || 'multiply']; if (st.soft) c.filter = `blur(${st.soft}px)`; path(sh, st); c.fillStyle = col(st.color); c.fill(); c.restore(); },
      line(pts, st = {}) { const q = A().spline(pts, 8, false), tp = st.taper || [.15, .3]; c.save(); c.strokeStyle = st.color || '#3a332d'; c.lineCap = 'round'; const w = st.w || 3; for (let k = 0; k < (st.passes || 1); k++) for (let i = 1; i < q.length; i++) { const u = i / q.length, e = Math.min(1, u / (tp[0] || 1e-3), (1 - u) / (tp[1] || 1e-3)); c.globalAlpha = (st.alpha ?? 1) * (st.press ?? .8); c.lineWidth = Math.max(.6, w * (.35 + .65 * e) * (q[i][2] ?? 1)); const j = (st.wobble ?? 1) * 1.1; c.beginPath(); c.moveTo(q[i - 1][0] + (p.rnd(i - 1, k, 1) - .5) * j, q[i - 1][1] + (p.rnd(i - 1, k, 2) - .5) * j); c.lineTo(q[i][0] + (p.rnd(i, k, 1) - .5) * j, q[i][1] + (p.rnd(i, k, 2) - .5) * j); c.stroke(); } c.restore(); },
      hatch(sh, st) { c.save(); path(sh, st); c.clip(); const g = st.gap || 12, d = st.dir || 0; c.strokeStyle = st.color || '#3a332d'; c.lineWidth = st.w || 2; c.globalAlpha = st.press ?? .5; c.translate(W / 2, H / 2); c.rotate(d); for (let y = -1400; y < 1400; y += g) { c.beginPath(); c.moveTo(-1400, y + p.rnd(y, 1) * 4); c.lineTo(1400, y + p.rnd(y, 2) * 4); c.stroke(); } c.restore(); },
      lift(sh, st = {}) { c.save(); c.globalAlpha = st.amount ?? .5; if (st.soft) c.filter = `blur(${st.soft}px)`; path(sh, st); c.fillStyle = '#efe4cf'; c.fill(); c.restore(); },
      dust(x, y, r, st = {}) { c.save(); c.fillStyle = st.color || '#fff'; for (let i = 0; i < (st.n || 20); i++) { const a = p.fix(i, st.seed || 0, 1) * 6.28, q = Math.sqrt(p.fix(i, st.seed || 0, 2)) * r; c.globalAlpha = .5; c.fillRect(x + Math.cos(a) * q, y + Math.sin(a) * q, 2, 2); } c.restore(); },
      push() { c.save(); }, pop() { c.restore(); }, translate(x, y) { c.translate(x, y); }, rotate(a) { c.rotate(a); }, scale(x, y) { c.scale(x, y ?? x); },
      clip(sh, fn) { c.save(); path(sh, {}); c.clip(); fn(); c.restore(); },
      air(st) { c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = st.alpha ?? .3; c.globalCompositeOperation = modes[st.mode || 'multiply']; c.fillStyle = st.lin || st.rad ? col(st) : st.color; c.fillRect(0, 0, W, H); c.restore(); }
    };
    return { p, canvas, W, H, draw(fn, o) { p.n = o.n; p.t = o.n / 12; fn(p); }, over(prev, next, k, o) { p.n = o.n; p.t = o.n / 12; prev(p); c.save(); c.globalAlpha = k; next(p); c.restore(); } };
  };
})();
