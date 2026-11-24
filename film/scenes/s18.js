// s18 (139.4-151.74) outro - everything is un-drawn. must start on the last sheet of s17 (transition into it: cut)
// FEELING: somebody finishes, gently, and signs it. the wait is over.
// BEATS (scene seconds; harp notes .35 1.09 1.8 2.6 3.0 3.4 3.8 4.6 5.3 5.65 6.0 6.8 7.9 8.2 and the harmonic 8.9; whistle 6.9-9.9)
//  0-.35    the two of them, held.
//  .35-2.9  the sky is lifted with the kneaded eraser, stroke after stroke, starting slowly; an island of night is left round the two.
//  2.5-4.2  the hill, the tree, the stone: the tone goes first, the pencil drawing stays a moment, then un-draws itself line by line.
//  4.2-5.6  the old man; his scarf runs out into the thread; the island goes. on bare paper: one red thread and two tiny figures in pencil. hold.
//  6.2-6.8  they are lifted, very lightly. only the thread.
//  6.9-8.1  nobody holds it now: it slackens, sinks, lies down on the paper.
//  8.1-8.9  gathers, is drawn straight, a last twang.
//  8.9-10.8 and writes: bide. then the signature alone.
// VALUE: from the darkest sheet of the film to the emptiest.
(function () {
  'use strict';
  const B = window.BIDE, A = B.anim, { clamp, lerp, ease, keys, hash, noise1, mixc, spline, TAU } = A, PI = Math.PI, sin = Math.sin, cos = Math.cos, hyp = Math.hypot;
  const ss = (a, b, x) => { x = clamp((x - a) / (b - a)); return x * x * (3 - 2 * x); };
  const PAPER = '#eadfc6', T17 = 12.8; let W, C, K;
  function init() { if (!K) { K = B.test.s17kit; K.init(); W = K.W; C = K.C; } }

  // ---------------------------------------------------------------- the eraser
  // a stroke: [x0,y0,x1,y1,width,bow,start,seconds]
  const band = (q, u, i) => { // the rubbed ribbon, always wound the same way so they add up
    const e = u >= 1 ? 1 : ease.io(u) * .9 + u * .1, n = 12, L = [], R = []; for (let j = 0; j <= n; j++) { const f = j / n * e, x = lerp(q[0], q[2], f), y = lerp(q[1], q[3], f) + q[5] * sin(PI * f), dx = q[2] - q[0], dy = q[3] - q[1] + q[5] * PI * cos(PI * f), l = hyp(dx, dy) || 1, w = q[4] * .5 * (.82 + .3 * noise1(j * .7, i + 3)) * (j === 0 ? .55 : 1) * (j === n ? .7 : 1); L.push([x - dy / l * w, y + dx / l * w]); R.push([x + dy / l * w, y - dx / l * w]); }
    let P = L.concat(R.reverse()), a = 0; for (let j = 0, k = P.length - 1; j < P.length; k = j++) a += P[k][0] * P[j][1] - P[j][0] * P[k][1]; if (a < 0) P.reverse(); return P; };
  function rub(p, list, t, o = {}) { const ps = []; list.forEach((q, i) => { const u = (t - q[6]) / q[7]; if (u > 0) ps.push(band(q, Math.min(1, u), i)); }); if (ps.length) p.lift(c => { c.beginPath(); for (const P of ps) { P.forEach((v, j) => j ? c.lineTo(v[0], v[1]) : c.moveTo(v[0], v[1])); c.closePath(); } }, { amount: o.amount || 1, soft: o.soft == null ? 4 : o.soft }); }
  // crumbs and streaks a working eraser leaves
  function crumbs(p, list, t, cols, gone) { list.forEach((q, i) => { const u = (t - q[6]) / q[7]; if (u <= .25 || gone >= 1) return; const e = Math.min(1, u), x = lerp(q[0], q[2], e), y = lerp(q[1], q[3], e) + q[5] * sin(PI * e), al = (1 - gone) * (u > 4 ? Math.max(0, 1 - (u - 4) / 8) : 1); if (al <= .02) return;
    p.dust(x, y, q[4] * .46, { color: cols[i % cols.length], n: 13, seed: i, alpha: .75 * al, size: 1.2 });
    if (i % 2 === 0 && Math.abs(q[2] - q[0]) > 300) for (let j = 0; j < 2; j++) { const f = .2 + .6 * hash(i, j, 3), g = Math.min(e, f + .16 + .2 * hash(i, j, 4)); if (g < f + .05) continue; const off = (hash(i, j, 5) - .5) * q[4] * .9, P = []; for (let m = 0; m <= 4; m++) { const z = lerp(f, g, m / 4); P.push([lerp(q[0], q[2], z), lerp(q[1], q[3], z) + q[5] * sin(PI * z) + off]); } p.line(P, { color: cols[(i + j) % cols.length], w: 5 + 4 * hash(i, j, 6), press: .3 * al, medium: 'crayon', taper: [.4, .6], wobble: 1.4 }); } }); }
  // sky: an arm going across and back. strokes stop short of the two of them
  const ISL = [560, 168, 210, 150];
  const SKY = (() => { const o = []; const add = (x0, y0, x1, y1, w, b) => o.push([x0, y0, x1, y1, w, b]);
    add(1500, 60, 2000, 120, 170, -20); add(1960, 190, 1020, 40, 160, -40); add(1000, -10, 1960, 290, 150, 30); add(1940, 330, 860, 150, 150, -30); add(840, 30, 1500, 250, 150, 20); add(860, 270, 1960, 420, 150, 20); add(1960, 500, 830, 330, 150, -26);
    add(800, 410, 1960, 560, 140, 20); add(1960, 640, 700, 450, 150, -20); add(330, 60, -40, 130, 170, 20); add(-40, 240, 330, 190, 160, -20); add(340, 300, -60, 400, 160, 10); add(-40, 480, 820, 380, 150, -26); add(900, 500, -60, 570, 150, 20); add(-60, 660, 1000, 560, 150, -10); add(1960, 720, 760, 560, 140, -10); add(1100, 640, -60, 740, 130, 10); add(-60, 820, 900, 660, 130, 0); add(760, 360, 340, 352, 110, 16); add(420, 24, 800, 8, 80, -8); add(1960, 780, 1300, 600, 120, 0);
    return o.map((q, i, a) => { const u = i / (a.length - 1); return q.concat([.35 + 2.3 * Math.pow(u, .82) + (i > 0 && i < 4 ? .12 : 0), lerp(.3, .2, u)]); }); })();
  const SKY2 = [[1960, 20, 1100, 10, 90, 4], [-60, 20, 360, 10, 90, 0], [60, 330, 360, 240, 90, 10], [-40, 560, 420, 470, 100, 0], [420, 440, 820, 480, 80, 10], [860, 130, 880, 420, 100, 10], [1180, 130, 1900, 250, 90, -10], [1960, 610, 1500, 560, 90, 0], [300, 60, 330, 300, 60, -10], [380, 340, 800, 372, 70, 0], [-60, 730, 420, 700, 110, 0], [1500, 40, 1960, 20, 80, 0]].map((q, i) => q.concat([2.66 + i * .07, .18]));
  const ISLE = [[330, 120, 520, 40, 130, -10], [690, 30, 780, 250, 120, 20], [350, 240, 470, 300, 110, 20], [640, 330, 420, 330, 100, 10], [420, 60, 660, 20, 100, -10], [450, 200, 420, 60, 110, 0], [690, 120, 660, 280, 120, 0], [470, 130, 640, 110, 120, -20], [640, 190, 460, 210, 130, 10], [470, 262, 660, 250, 90, 0]].map((q, i) => q.concat([4.72 + i * .095, .2]));
  const LAND = [[-60, 930, 620, 830, 170, -20], [700, 900, -60, 1040, 170, 20], [-60, 1080, 900, 960, 170, -10], [400, 800, 1000, 690, 130, -10], [980, 800, 420, 900, 150, 10], [900, 1050, 1960, 900, 180, 10], [1960, 1040, 1000, 1080, 170, 0], [980, 880, 1960, 780, 170, -20], [1960, 690, 1180, 780, 170, 10], [1880, 250, 1380, 330, 170, -30], [1300, 300, 1960, 400, 150, 10], [1960, 480, 1240, 380, 140, -10], [1240, 480, 1800, 540, 130, 10], [1340, 560, 1420, 720, 130, 0], [1280, 430, 1120, 560, 110, 0], [1100, 470, 1300, 560, 120, 0], [1300, 640, 1080, 600, 120, 0], [1060, 690, 1330, 700, 110, 0], [1180, 540, 1180, 690, 120, 0]].map((q, i, a) => q.concat([2.5 + 1.62 * Math.pow(i / (a.length - 1), .9), .2]));
  const MANL = [[900, 700, 1090, 640, 110, -6], [1110, 560, 930, 640, 110, -10], [1000, 540, 1100, 690, 120, 0], [1120, 660, 880, 690, 90, 0], [1090, 690, 1230, 690, 70, 4]].map((q, i) => q.concat([4.2 + i * .13, .18]));

  // ---------------------------------------------------------------- the pencil lines under the tone, taken off the real drawing
  let LINES = null;
  function recorded(p) {
    if (LINES) return LINES; const out = []; let M = [1, 0, 0, 1, 0, 0]; const st = [];
    const rec = { W: 1920, H: 1080, n: 0, t: 0, isStub: false, rnd: (a = 0, b = 0, c = 0) => hash(a, b, c), fix: (a = 0, b = 0, c = 0) => hash(a, b, c), paper() { }, layer() { }, mass() { }, shade() { }, lift() { }, hatch() { }, dust() { }, air() { }, push() { st.push(M); }, pop() { if (st.length) M = st.pop(); }, translate() { }, rotate() { }, scale() { }, clip(s, f) { f(); }, line(pts, o) { if (pts && pts.length > 1) { const k = pts.map(v => [v[0], v[1], v[2] == null ? 1 : v[2]]); let l = 0; for (let i = 1; i < k.length; i++) l += hyp(k[i][0] - k[i - 1][0], k[i][1] - k[i - 1][1]); if (l > 9) out.push({ p: k, o: o || {}, l }); } } };
    K.land(rec, 12.5); const nl = out.length; K.man(rec, 12.5, true, 1);
    const all = out.map((q, i) => { let x = 0, y = 0; for (const v of q.p) { x += v[0]; y += v[1]; } x /= q.p.length; y /= q.p.length; const man = i >= nl; const tree = !man && x > 1230 && y < 640, stone = !man && !tree && x > 1040 && x < 1330 && y < 690, hue = A.hex(q.o.color || '#333'), red = hue[0] > 110 && hue[0] > hue[1] * 1.7; return Object.assign(q, { x, y, man, kind: man ? 'm' : tree ? 't' : stone ? 's' : 'g', red }); }).filter(q => !(q.kind === 'g' && q.l < 26));
    // thin them out so the drawing on the bare paper stays light
    const cnt = {}; LINES = all.filter((q, i) => { cnt[q.kind] = (cnt[q.kind] || 0) + 1; if (q.kind === 'g') return q.l > 60 || hash(i, 3, 1) < .5; if (q.kind === 't') return q.l > 24 && (q.l > 70 || hash(i, 5, 2) < .6); return true; });
    LINES.forEach((q, i) => { const h = hash(i, 7, 7); q.t0 = q.kind === 'g' ? 3.5 + 1.3 * clamp(1 - q.x / 1920 + .4 * (h - .5)) : q.kind === 't' ? 3.6 + 1.3 * clamp((hyp(q.x - 1330, q.y - 604) / 560) * -1 + 1 + .5 * (h - .5)) * 1 : q.kind === 's' ? 4.0 + .8 * h : 4.4 + .5 * h; if (q.kind === 't') q.t0 = 3.4 + 1.5 * clamp(1 - hyp(q.x - 1330, q.y - 604) / 600 + .35 * (h - .5)); q.d = clamp(q.l / 900, .2, .42); });
    return LINES;
  }
  const cutTo = (P, k) => { let L = 0; const d = [0]; for (let i = 1; i < P.length; i++) { L += hyp(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); d.push(L); } const e = L * k, o = [P[0]]; for (let i = 1; i < P.length; i++) { if (d[i] <= e) o.push(P[i]); else { const f = (e - d[i - 1]) / (d[i] - d[i - 1] || 1); if (f > .02) o.push([lerp(P[i - 1][0], P[i][0], f), lerp(P[i - 1][1], P[i][1], f), P[i][2]]); break; } } return o; };
  function pencil(p, t, kIn) {
    for (const q of recorded(p)) { const k = 1 - ease.io(clamp((t - q.t0) / q.d)); if (k <= .02) continue; const a = cutTo(q.p, k); if (a.length < 2) continue; const c = q.red ? '#b24a40' : mixc(q.o.color || '#3a332d', '#544a42', .72); p.line(a, Object.assign({}, q.o, { color: c, medium: q.red ? q.o.medium : 'graphite', press: (q.o.press == null ? .8 : q.o.press) * .85 * kIn * (q.man ? .8 : 1), w: Math.min(q.o.w || 3, 4.2) })); }
  }

  // ---------------------------------------------------------------- the thread, from the last sheet of s17 to its signature
  const SIZE = 150, SIG0 = [1006, 604], N = 150;
  let SP = null, HT = null;
  function sig() { if (SP) return SP; const raw = B.hand.signaturePath({ x: SIG0[0], y: SIG0[1], size: SIZE }).map(v => [v[0], v[1]]); SP = W.util.track(raw);
    // the hand slows where the line turns and runs where it is open; it rests a moment where one letter becomes the next
    const n = 420, dt = []; let tot = 0; const q = []; for (let i = 0; i <= n; i++) q.push(SP.at(i / n)); for (let i = 0; i < n; i++) { const a = q[Math.max(0, i - 5)][2], b = q[Math.min(n, i + 5)][2]; let d = b - a; while (d > PI) d -= TAU; while (d < -PI) d += TAU; const cur = Math.abs(d) / (10 * SP.len / n), v = Math.pow(cur + .004, -.36); dt.push(1 / v); } const x0 = q.map(v => v[0]); const rest = [.235, .395, .70, .86]; rest.forEach((r, j) => { const i0 = Math.round(r * n); for (let k = -5; k <= 5; k++) dt[i0 + k] *= 2.5 - .2 * Math.abs(k); }); for (let i = 0; i < 16; i++) dt[i] *= 2.2 - i * .075; for (let i = 0; i < 26; i++) dt[n - 1 - i] *= 2.0 - i * .038;
    dt.forEach(v => tot += v); let c = 0; HT = [0]; dt.forEach(v => { c += v; HT.push(c / tot); }); return SP; }
  const penAt = u => { sig(); u = clamp(u); let a = 0, b = HT.length - 1; while (b - a > 1) { const m = (a + b) >> 1; if (HT[m] <= u) a = m; else b = m; } return (a + clamp((u - HT[a]) / (HT[b] - HT[a] || 1))) / (HT.length - 1); };
  const resN = (pts, n) => { const T = W.util.track(pts), o = []; for (let i = 0; i <= n; i++) { const q = T.at(i / n); o.push([q[0], q[1]]); } return o; };
  let LIE = null, GAT = null;
  function shapes() { if (LIE) return; // u 0 = the end that will write (right), u 1 = the end she held (left)
    LIE = resN(spline([[1452, 640], [1376, 612], [1290, 640], [1216, 700], [1130, 706], [1070, 654], [1098, 598], [1166, 606], [1166, 668], [1086, 720], [970, 716], [880, 668], [800, 640], [716, 668], [640, 716], [580, 700], [570, 648], [622, 622], [660, 660], [628, 712], [540, 734], [440, 712], [372, 734]], 8, false), N);
    GAT = resN(spline([[1010, 640], [968, 612], [918, 622], [888, 664], [846, 680], [812, 648], [836, 612], [872, 632], [852, 674], [792, 690], [742, 662], [694, 640], [648, 664], [610, 692], [568, 672], [530, 650], [484, 668], [430, 660]], 8, false), N); }
  const X0 = () => { const a = sig().at(0); return [a[0], a[1]]; };
  const TAUT = () => { const a = X0(), o = []; for (let i = 0; i <= N; i++) { const u = i / N; o.push([a[0] - 470 * u, a[1] + 3 * noise1(u * 6, 2)]); } return o; };
  // scarf outline as wool: it runs out into the thread
  const SCF = [[1218, 656], [1222, 620], [1236, 580], [1218, 594], [1184, 602], [1146, 598], [1114, 586], [1096, 566], [1078, 542], [1062, 556], [1044, 584], [1010, 612], [966, 634]];
  const SCF2 = [[1300, 668], [1276, 640], [1240, 628], [1204, 640], [1178, 664], [1146, 676], [1112, 664], [1088, 644], [1064, 636], [1040, 642], [1018, 648], [992, 646], [966, 636]];
  function scarfLine(rx, h) { const P = SCF.map((v, i) => [lerp(v[0], SCF2[i][0], rx), lerp(v[1], SCF2[i][1], rx)]); P[12] = [h[0], h[1]]; P[11] = [h[0] + 30, lerp(h[1] - 18, h[1] + 9, rx)]; P[10] = [h[0] + 60, lerp(h[1] - 42, h[1] + 8, rx)]; return spline(P, 6, false); }
  function threadAt(t) {
    shapes(); const t17 = t + T17, live = K.strand(t17); const un = ss(4.45, 5.5, t);
    // once the scarf has run out its wool is part of the strand: a few soft bends that were stitches
    let base = live; if (un > 0) { const rx = ss(4.7, 6.1, t), S = scarfLine(rx, live[0]), T = W.util.track(S), m = 46, pre = []; const kk = 1 - un; for (let i = 0; i < m; i++) { const u = i / m, q = T.at(lerp(1 - un, 1, u)); const zig = (1 - ss(.0, .9, un - (1 - u) * .35)) * 5 * (i % 2 ? 1 : -1); pre.push([q[0] - sin(q[2]) * zig , q[1] + cos(q[2]) * zig ]); } base = pre.concat(live); }
    if (t < 6.86) return base;
    const Af = resN(base, N), out = [];
    for (let i = 0; i <= N; i++) { const u = i / N, a = Af[i], l = LIE[i], g = GAT[i], tt = TAUT()[0]; const f0 = 6.9 + .42 * (1 - u) , f = clamp((t - f0) / .78), e = f * f * (1.55 - .55 * f); // let go at the far end: that end starts down first
      let x = lerp(a[0], l[0], ease.io(f)), y = lerp(a[1], l[1], e); const bounce = t - f0 - .78; if (bounce > 0 && bounce < .6) y -= 10 * Math.exp(-6 * bounce) * Math.abs(sin(bounce * 13)); x += 22 * sin(f * PI) * noise1(u * 7 + t * 2.2, 4);
      out.push([x, y]); }
    if (t < 8.06) return out;
    const tau = TAUT(); return out.map((v, i) => { const u = i / N, gk = ease.io(clamp((t - 8.06 - .1 * u) / .42)), tk = keys(t - .07 * u, [[8.42, 0], [8.5, -.05, 'out'], [8.8, 1, 'in'], [8.86, 1.02], [8.95, 1]]), g = GAT[i], q = tau[i]; let x = lerp(v[0], g[0], gk), y = lerp(v[1], g[1], gk); x = lerp(x, q[0], tk); y = lerp(y, q[1], tk); const tw = t - 8.82; if (tw > 0) y += 9 * Math.exp(-8 * tw) * sin(tw * 62) * sin(PI * u); return [x, y]; });
  }
  const WR0 = 8.98, WR1 = 10.82;
  function written(t) { // the far end lies still at first; then it is pulled along after the pen. two pieces, both measured from the first letter, so the line keeps its grain
    const S = sig(), k = penAt((t - WR0) / (WR1 - WR0)), h = k * S.len, a = X0(), tail = -keys(t, [[WR0, -470], [WR0 + .7, -452], [WR0 + 1.2, -250, 'in'], [WR1 - .25, -60, 'lin'], [WR1 + .12, 0, 'out']]), word = [], line = [];
    for (let i = 0, n = Math.max(2, Math.ceil(h / 6)); i <= n; i++) { const q = S.s(h * i / n); word.push([q[0], q[1]]); } for (let i = 0, n = Math.max(2, Math.ceil(tail / 12)); i <= n; i++) { const d = tail * i / n, w = clamp(d / 200); line.push([a[0] - d, a[1] + 3 * noise1(-d / 80, 2) * clamp(d / 40) + (tail < 440 ? 4 * w * noise1(-d / 46 + t * 3, 6) : 0)]); }
    return { word: h > 4 ? word : null, line: tail > 6 ? line : null }; }
  function drawSig(p, t) { const w = written(t), o = { raw: true, w: 6.4, color: '#b5322b', ply: 1, plyMax: 170, fuzz: .55 }; if (w.line) W.thread(p, w.line, Object.assign({}, o, { ground: .5 * (1 - ss(WR1 - .6, WR1, t)), seed: 2 })); if (w.word) W.thread(p, w.word, o); }

  B.scene({
    id: 's18', ink: s => s.abs < 140.4 ? 'dark' : 'light',
    draw(p, s) {
      init(); const t = s.t; p.paper(PAPER); const t17 = t + T17, n = s.n;
      const toneOn = t < 5.6, ghost = keys(t, [[.4, 0], [2.6, .6], [4.6, 1], [6.4, .6], [8.4, 0]]);
      if (toneOn) { // the last sheet of s17, taken off in its own order: sky, then land, then him
        p.layer('s18-sky', { every: 6, still: true, depth: .05 }); K.back(p);
        p.layer('s18-stars', { every: 6, depth: .9 }); K.stars(p, T17 + .2, 0, true);
        const under = t > 2.4 ? c => { c.beginPath(); c.moveTo(-80, 1160); W.HILL.rg.forEach(v => c.lineTo(v[0], v[1] + 14)); c.lineTo(2000, 1160); c.closePath(); } : null; // what lies behind the hill goes before the hill does
        if (t > .33) { p.layer('s18-l1', { every: 4, depth: 1 }); rub(p, SKY, t); if (t > 2.6) rub(p, SKY2, t); if (under) p.lift(under, { amount: 1 }); if (t > 4.7) rub(p, ISLE, t); }
        if (t > 1.3) { p.layer('s18-l1b', { every: 4, depth: 1 }); rub(p, SKY, t - 1.0, { soft: 14 }); if (t > 3.4) rub(p, SKY2, t - .8, { soft: 10 }); if (under) p.lift(under, { amount: 1 }); if (t > 4.9) rub(p, ISLE, t - .2, { soft: 8 }); }
        if (t > 3.2) { p.layer('s18-l1c', { every: 4, depth: 1 }); const hole = W.util.lump(566, 172, 232, 172, 21, { n: 15, rough: .16 }); let ar = 0; for (let j = 0, k = hole.length - 1; j < hole.length; k = j++) ar += hole[k][0] * hole[j][1] - hole[j][0] * hole[k][1]; const hs = spline(ar > 0 ? hole.slice().reverse() : hole, 5, true); p.lift(c => { c.beginPath(); c.moveTo(-80, -80); c.lineTo(2000, -80); c.lineTo(2000, 1160); c.lineTo(-80, 1160); c.closePath(); hs.forEach((v, j) => j ? c.lineTo(v[0], v[1]) : c.moveTo(v[0], v[1])); c.closePath(); }, { amount: ss(3.2, 4.2, t), soft: 7 }); if (t > 5.0) p.lift(spline(W.util.lump(566, 172, 330, 250, 23, { n: 15, rough: .12 }), 5, true), { amount: ss(5.0, 5.5, t), soft: 18 }); }
        if (t < 4.3) { p.layer('s18-land', { every: 5, depth: .8 }); K.land(p, 12.5); if (t > 2.5) { p.layer('s18-l2', { every: 4, depth: 1 }); rub(p, LAND, t); } }
        if (t < 4.95) { p.layer('s18-man', { every: 3, depth: .95 }); K.man(p, Math.floor(Math.min(t17, T17 + 1) * 4) / 4, true, 1); if (t > 4.2) { p.layer('s18-l3', { every: 4, depth: 1 }); rub(p, MANL, t); } }
      }
      if (ghost > .02) { // what an eraser cannot quite get out
        p.layer('s18-ghost', { every: 8, depth: .3 }); const G = [[1540, 160, 420, 120, '#93a3b4', .05], [1240, 420, 520, 110, '#93a3b4', .04], [220, 260, 300, 130, '#93a3b4', .05], [500, 900, 560, 110, '#8f97a0', .05], [1500, 880, 520, 130, '#8f97a0', .05], [1560, 380, 330, 120, '#878f98', .06], [1150, 620, 170, 90, '#8a8780', .06], [560, 180, 150, 110, '#93a3b4', .05 * ss(5, 5.5, t)]];
        const on = [.6, 1.4, 1.8, 3, 3, 3.4, 4.4, 5]; G.forEach((g, i) => p.shade(W.util.lump(g[0], g[1], g[2], g[3], i + 5, { rough: .3, rot: -.12 }), { color: g[4], alpha: g[5] * 3.2 * ghost * ss(on[i], on[i] + .5, t), soft: 50 })); }
      if (t > .4 && t < 7.6) { p.layer('s18-crumb', { every: 2, depth: 1 }); crumbs(p, SKY, t, ['#4d6484', '#324a6c', '#7d8ea2'], ss(6.2, 7.4, t)); crumbs(p, LAND, t, ['#3d4a5e', '#54604f', '#2f3b52'], ss(6.4, 7.5, t)); crumbs(p, MANL, t, ['#6a5d50', '#4a4038'], ss(6.4, 7.5, t)); crumbs(p, ISLE, t, ['#324a6c', '#7d8ea2'], ss(6.4, 7.5, t)); }
      if (t > 2.3 && t < 5.4) { p.layer('s18-pencil', { every: 2, depth: 1 }); pencil(p, t, ss(2.3, 2.8, t)); }
      // thread
      if (t < WR0) { const th = threadAt(t), thin = ss(4.3, 5.8, t); p.layer('s18-thread', { every: 1, depth: 1 });
        if (t < 5.5 && t > 4.45) { // the scarf, as far as it has not run out yet
          const un = ss(4.45, 5.5, t), th0 = K.strand(t17)[0], S = scarfLine(ss(4.7, 6.1, t), th0), T = W.util.track(S), z = []; for (let i = 0; i <= 120; i++) { const u = lerp(0, 1 - un, i / 120), q = T.at(u), w = 8 * (i % 2 ? 1 : -1); z.push([q[0] - sin(q[2]) * w, q[1] + cos(q[2]) * w]); } /* stitches */ if (un < .97) { const q0 = z.slice(); p.line(q0, { color: '#a5382f', w: 5, press: .9, medium: 'crayon', taper: [.02, .05], wobble: 1 }); p.line(q0.map(v => [v[0] + 2, v[1] + 2]), { color: '#6d1d1f', w: 2, press: .6, taper: [.02, .05] }); } }
        K.thread(p, th, { night: true, color: mixc('#c43a32', '#b5322b', ss(3, 6, t)), w: lerp(5.4, 6.4, thin), wf: u => lerp(lerp(1.1, .6, ss(0, .95, u)), 1, thin), ply: thin > .5 ? 1 : 0, ground: .8 * ss(7.6, 8, t) }); }
      else { p.layer('s18-sig', { every: t > WR1 + .2 ? 5 : 3, depth: 1 }); drawSig(p, t); }
      // the two of them
      if (t < 6.9) { const ink = mixc(K.CREAM, '#5d4c40', ss(4.7, 5.5, t)), al = keys(t, [[6.22, 1], [6.42, .55, 'out'], [6.6, .2, 'out'], [6.85, 0]]); p.layer('s18-two', { every: 1, depth: 1, alpha: al }); if (t < 5) p.lift([[K.HER[0] - 74, K.HER[1] - 20], [K.HER[0] - 40, K.HER[1] - 118], [K.HER[0] + 20, K.HER[1] - 128], [K.HER[0] + 76, K.HER[1] - 60], [K.HER[0] + 60, K.HER[1] + 12], [K.HER[0] - 30, K.HER[1] + 18]], { amount: .16, soft: 22 }); K.lights(p, t17, { ink, tone: lerp(.9, .78, ss(4.7, 5.5, t)) });
        if (t > 6.2) { p.layer('s18-l4', { every: 1, depth: 1 }); [[470, 120, 640, 150, 60, 10, 6.22, .16], [640, 190, 470, 206, 56, -8, 6.4, .16], [480, 236, 630, 240, 40, 0, 6.56, .14], [560, 90, 540, 240, 60, 0, 6.68, .14]].forEach((q, i) => { const u = (t - q[6]) / q[7]; if (u > 0) p.lift(band(q, Math.min(1, u), i), { amount: .34, soft: 10, sharp: true }); }); } }
    }
  });
  B.test.s18lines = (p, k) => { init(); p.paper(PAPER); p.layer('a', { depth: 1 }); pencil(p, k, 1); };
  B.test.s18sig = (p, k) => { init(); p.paper(PAPER); p.layer('a', { depth: 1 }); drawSig(p, k); };
})();
