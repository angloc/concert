// s01 · THE DOORWAY  (8.4 – 15.3)  "Oh Danny boy, the pipes, the pipes are calling"
//
// Feeling: she is still dressing him like a child, and he has already left.
// Words (scene time): Oh 0 · Danny .41 · boy 1.34 · the 2.68 · PIPES 3.06 · the 3.55 · PIPES 3.93 · are 4.48 · CALLING 4.80–6.65
// A  -.4 – 3.9  Doorway, two figures. She lifts the finished scarf over his bowed head (.25), draws it round (.95), snugs it (1.35), tucks it (1.75),
//               pats it flat at 2.12 and 2.48. Her hands stay. His hand starts up to cover hers; on "pipes" it stops in the air, his head goes round to the hills, the hand sinks.
// B  3.92 – end Redrawn close, on the second "pipes". He listens, breath held. 4.35 she looks where he looks; 4.95 back at him; the smile is still there;
//               5.5 – 6.1 it gives way; her fingers close on the wool; 6.2 her eyes drop.
// Eye: the red scarf between two pairs of hands → his turned head → her mouth.
// Value: his dark coat on the white wall (she belongs to the warm dark door, he to the pale morning).
(function () {
  const B = window.BIDE, A = B.anim, { clamp, lerp, ease, hash, noise1, mixc, keys } = A, TAU = Math.PI * 2, hyp = Math.hypot;
  const ss = (a, b, x) => { x = clamp((x - a) / (b - a)); return x * x * (3 - 2 * x); };
  const Z = 1.12, TX = -60, TY = -120, CUT = 3.9;
  const DAWN = { dir: -2.6, warm: .4, k: .45 }, MLIGHT = { dir: -2.7, warm: .42, k: .5, rim: .7 };
  const off = (a, o) => [a[0] + o[0], a[1] + o[1]];
  // a knitted band along a path: pastel red, its edges, the ribs
  function band(p, pts, w, o = {}) {
    const c = A.spline(pts, 6), L = [], R = [], n = c.length - 1; c.forEach((v, i) => { const a = c[Math.max(0, i - 1)], b = c[Math.min(n, i + 1)], d = hyp(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / d, ny = (b[0] - a[0]) / d, u = i / n, k = w * .5 * (o.prof ? o.prof(u) : 1); L.push([v[0] + nx * k, v[1] + ny * k]); R.push([v[0] - nx * k, v[1] - ny * k]); });
    p.mass(L.concat(R.slice().reverse()), { sharp: true, color: o.color || '#b23327', dir: Math.atan2(c[n][1] - c[0][1], c[n][0] - c[0][0]) + .4, size: .5, len: .5, vary: .3, dens: 1.3 });
    if (o.shade !== 0) p.shade(L.concat(c.slice().reverse()), { color: '#6a2d33', alpha: .4, soft: 6 });
    p.line(L, { color: '#6b1f1e', w: 3, press: .7, taper: [.05, .1] }); p.line(R, { color: '#6b1f1e', w: 3, press: .7, taper: [.05, .1] });
    for (const q of [-.4, 0, .4]) p.line(c.map((v, i) => [lerp(L[i][0], R[i][0], .5 + q * .5), lerp(L[i][1], R[i][1], .5 + q * .5)]), { color: q ? '#7d211e' : '#d7604f', w: 1.8, press: .5, taper: [.2, .2], medium: q ? 'graphite' : 'crayon' });
    return c[n];
  }

  // ------------------------------------------------------------------ A
  function placeA(p) {
    const W = B.world; p.paper('#e9dfca');
    p.layer('sky', { every: 6, still: true, depth: .12 }); W.sky(p, { mood: 'dawn', horizon: 640, still: true }); W.hills(p, { light: 'dawn', preset: 'west', dy: 70, season: .33 });
    p.layer('door', { every: 6, still: true, depth: .6 }); p.push(); p.translate(TX, TY); p.scale(Z, Z); W.doorway(p, { part: 'back', light: 'dawn', warm: 1 }); p.pop();
  }
  const NEAR = [[-.7, [128, -170]], [-.35, [140, -205, 'io']], [.02, [96, -205], 'io'], [.3, [74, -40], 'heavy'], [.36, [76, -34]], [.56, [100, 66], 'io'], [.64, [108, 56]], [.94, [40, 8], 'io'], [1.08, [46, 14]], [1.32, [98, 124], 'in'], [1.42, [92, 110], 'out'], [1.56, [102, 100]], [1.76, [68, 46], 'out'], [1.94, [74, 54]], [2.0, [124, 84], 'out'], [2.12, [78, 106], 'in'], [2.28, [79, 108]], [2.36, [122, 86], 'out'], [2.48, [78, 108], 'in']];
  const FAR = [[-.7, [104, -160]], [-.35, [116, -196]], [.02, [70, -196], 'io'], [.34, [52, -30], 'heavy'], [.6, [72, 62], 'io'], [.7, [80, 54]], [1.0, [22, 2], 'io'], [1.12, [26, 12]], [1.36, [74, 112], 'in'], [1.5, [66, 98], 'out'], [1.8, [48, 36], 'out'], [2.1, [58, 60], 'io'], [2.4, [52, 66]]];
  const lin = k => k.map(v => [v[0], v[1].slice(0, 2), v[2]]);
  const hN = t => keys(t, lin(NEAR)), hF = t => keys(t, lin(FAR));
  const pat = t => { let v = 0; for (const a of [2.12, 2.48]) { const x = t - a; if (x >= 0 && x < .34) v += Math.sin(x / .34 * Math.PI) * Math.exp(-x * 3); } return v; };
  const snug = t => keys(t, [[1.2, 0], [1.34, 1, 'in'], [1.6, 0, 'out']]);
  function dannyA(t, s) {
    const bow = keys(t, [[-.6, .75], [.1, 1], [.45, .95], [1.15, .1, 'io'], [1.34, .34, 'in'], [1.7, 0, 'out']]), turn = keys(t, [[3.06, 0], [3.16, -.05], [3.52, 1, 'io']]), hear = keys(t, [[2.98, 0], [3.1, 1, 'out']]), hand = keys(t, [[2.5, 0], [2.98, .62, 'io'], [3.5, .58], [3.95, .12, 'io']]), P = pat(t);
    const hx = [936, 545];
    return { x: 842, y: 963, h: 812, yaw: 1.12, face: 1, t, light: DAWN, legs: { kind: 'stand' }, weight: .5, lean: .02 + .05 * bow - .016 * P - .01 * hear, bend: .02 + .2 * bow - .03 * hear, shrug: .1 * hear, twist: -.28 * turn,
      head: { nod: .04 + .42 * bow - .06 * hear, turn: -1.9 * turn - .06, tilt: .04 * bow - .05 * turn }, wind: [.12 * hear, 0],
      armNear: ['rest', { at: hx, h: ['rest', 'cradle', .8], over: true }, hand], armFar: 'rest',
      expr: hear > 0 ? [{ base: 'tender', gy: .25 }, { base: 'wonder', gx: lerp(.2, .9, turn), gy: -.05, mOpen: .06, brow: .5 }, hear] : [{ base: 'tender', open: .1, gy: .6, smile: .3 }, { base: 'tender', gy: .3 }, ss(1.0, 1.35, t)] };
  }
  function motherA(t, N) {
    const P = pat(t), stop = keys(t, [[3.16, 0], [3.3, 1, 'out']]), up = keys(t, [[2.5, 0], [2.85, 1, 'io']]), hn = off(N, hN(t)), hf = off(N, hF(t)), reach = keys(t, [[-.6, 1], [.1, 1], [.55, .25, 'io'], [.95, 1, 'io'], [1.35, .3], [1.75, .5], [2.2, .38], [4, .34]]);
    const flat = ss(1.94, 2.1, t), after = keys(t, [[3.55, 0], [3.9, 1, 'io']]);
    return { x: 1102, y: 929, h: 735, yaw: 1.22, face: -1, t, light: MLIGHT, lean: .06 + .11 * reach - .012 * P, bend: .02 + .05 * reach, shrug: .22 * ss(.5, 1, reach) * ss(.2, -.1, t), weight: .4,
      head: { nod: lerp(.1, -.17, Math.max(up, ss(.35, -.2, t))) + .06 * P, turn: -.06, tilt: .05 * up },
      armNear: { at: hn, h: ['pinch', 'onChair', flat], over: true, rot: lerp(0, -.2, flat) }, armFar: { at: hf, h: ['pinch', 'rest', flat], over: true },
      expr: up > 0 ? [{ base: 'tender', gy: .5 }, stop > 0 ? ['tender', { base: 'tender', gy: -.4, open: .86, smile: .5, browIn: .6 }, stop] : { base: 'tender', gy: -.3, smile: .8, open: .75 }, up] : { base: 'tender', gy: t < .3 ? -.1 : .5, press: .2, smile: .7 } };
  }
  function drawA(p, t, s) {
    const C = B.cast, W = B.world; placeA(p); p.layer('people', { every: 2, depth: .95 });
    const on = t >= .96, dp = dannyA(t, s); if (!on) dp.scarf = false;
    // the scarf before it is on: a loop lifted over his head, then hanging from the nape to her hands
    const R = C.group(p, r => {
      const D = C.figure(p, 'danny', Object.assign({ rec: r }, dp)), N = D.neck, H = D.head; const mp = motherA(t, N);
      if (!on) {
        const bk = keys(t, [[-.7, [H[0] + 10, H[1] - 150]], [-.3, [H[0] - 4, H[1] - 138]], [.02, [H[0] - 66, H[1] - 96], 'io'], [.22, [N[0] - 62, N[1] - 34], 'in'], [.32, [N[0] - 50, N[1] + 8], 'out'], [.45, [N[0] - 46, N[1] + 2]], [1.2, [N[0] - 46, N[1] + 2]]]);
        const hn = off(N, hN(t)), hf = off(N, hF(t)), grip = h => [h[0] - 34, h[1] - 6];
        const wrap = ss(.6, .95, t);
        r.ops.unshift({ k: 'call', fn: () => band(p, [bk, [lerp(bk[0], hf[0], .3), bk[1] - 12 + 10 * wrap], [lerp(bk[0], hf[0], .72), lerp(bk[1], hf[1], .55)], grip(hf)], 40, { color: '#96291f' }) });
        r.call(() => { const g = grip(hn), dn = keys(t, [[.1, 0], [.5, 1]]), side = [N[0] - 18, N[1] + 26 + 14 * dn], fr = [lerp(N[0] + 26, N[0] + 34, dn), N[1] + lerp(8, 46, dn)]; const pts = t < .25 ? [bk, [lerp(bk[0], g[0], .34), lerp(bk[1], g[1], .34) + 20], [lerp(bk[0], g[0], .7), lerp(bk[1], g[1], .7) + 18], g] : [bk, side, fr, g]; band(p, pts, 46); const e = g, q = [e[0] + 10, e[1] + 66], q2 = [e[0] - 4 + 10 * Math.sin(t * 5), e[1] + 150]; band(p, [e, q, q2], 40, { prof: u => .8 + .25 * u }); for (let j = -2; j <= 2; j++) p.line([[q2[0] + j * 8, q2[1]], [q2[0] + j * 9 - 2, q2[1] + 16]], { color: '#7c2320', w: 2.4, press: .6, taper: [.1, .4] }); });
      }
      const M = C.figure(p, 'mother', Object.assign({ rec: r }, mp)); return { D, M, N };
    });
    if (on && R.D.scarfEnd) { const e = R.D.scarfEnd, sw = noise1(t * 1.7, 4); W.thread(p, [[e[0] + 4, e[1] + 10], [e[0] + 10 + 4 * sw, e[1] + 40], [e[0] + 2 + 9 * sw, e[1] + 74], [e[0] + 12 + 12 * sw, e[1] + 96]], { w: 3, fuzz: .3, ply: 0 }); }
    // what he hears: a few pencil lines come in off the hills and go past him
    const hk = clamp((t - 2.9) / 1.0); if (hk > 0) { p.layer('call', { every: 1, depth: .9 }); call(p, hk, [[[-60, 640], [160, 560], [380, 470], [560, 400], [760, 330], [1000, 270]], [[-60, 700], [140, 640], [360, 560], [560, 470], [740, 400]], [[-60, 560], [200, 470], [420, 390], [640, 310], [820, 270]], [[-60, 760], [160, 700], [380, 640], [560, 560]]]); }
    p.layer('fore', { every: 3, depth: 1 }); p.push(); p.translate(TX, TY); p.scale(Z, Z); W.doorway(p, { part: 'front', light: 'dawn', wind: W.windOf(.25 + .5 * ss(2.8, 3.3, t)) }); p.pop();
  }
  // long light pencil strokes travelling along a path (head k, tail behind it)
  function call(p, k, paths, o = {}) { paths.forEach((pts, i) => { const c = A.spline(pts, 8), n = c.length - 1, h = clamp(k * 1.5 - i * .13, 0, 1.6), a = Math.max(0, h - .55), b = Math.min(1, h); if (b - a < .04) return; const q = c.slice(Math.floor(a * n), Math.ceil(b * n) + 1).map((v, j) => [v[0], v[1] + 5 * noise1(j * .3 + i * 7, 3)]); if (q.length > 2) { p.line(q, { color: '#6f8796', w: 4, press: .55, taper: [.5, .35], wobble: 1.2 }); p.line(q.map(v => [v[0] + 6, v[1] + 9]), { color: '#8fa2ab', w: 2.6, press: .4, taper: [.6, .4], wobble: 1.6 }); } }); }

  // ------------------------------------------------------------------ B
  function placeB(p) {
    const W = B.world; p.paper('#e9dfca');
    p.layer('sky', { every: 6, still: true, depth: .1 }); W.sky(p, { mood: 'dawn', horizon: 760, still: true }); W.hills(p, { light: 'dawn', preset: 'west', dy: 150, season: .33 });
    p.layer('wall', { every: 6, still: true, depth: .4 });
    p.mass([[1000, -40], [996, 400], [984, 1120], [1960, 1120], [1960, -40]], { sharp: true, color: { lin: [1000, 0, 1960, 300], stops: [[0, '#a3743f'], [.16, '#75522f'], [.45, '#4f3b2c'], [1, '#3b2e26']] }, dir: 1.35, size: 1, vary: .45 });
    p.shade([[1020, 500], [1300, 640], [1700, 700], [1960, 660], [1960, 1120], [1010, 1120]], { color: '#e0a558', alpha: .2, soft: 120, mode: 'screen' });
    p.mass([[824, -40], [822, 500], [810, 1120], [1000, 1120], [1012, 500], [1018, -40]], { sharp: true, color: { lin: [810, 0, 1020, 0], stops: [[0, '#dcdad0'], [.6, '#ddd0b4'], [1, '#e2c491']] }, dir: 1.5, size: .9, vary: .4 });
    p.mass([[-60, 940], [300, 930], [830, 960], [830, 1140], [-60, 1140]], { color: { lin: [0, 930, 0, 1100], stops: [[0, '#b5b69b'], [1, '#8f917a']] }, dir: .04, size: .9, soft: 16 });
    p.shade([[800, 860], [1020, 840], [1300, 860], [1300, 1140], [780, 1140]], { color: '#4a3524', alpha: .82, soft: 60 });
    p.line([[824, -20], [821, 300], [826, 640], [812, 1100]], { color: '#4a4038', w: 3.4, press: .5, wobble: 1.6, taper: [.1, .1] }); p.line([[1018, -20], [1014, 420], [1004, 1100]], { color: '#4a4038', w: 4, press: .65, wobble: 1.6, taper: [.1, .1] });
  }
  function drawB(p, t, s) {
    const C = B.cast, W = B.world; placeB(p);
    const push = ss(CUT, 6.9, t) * 0, br = Math.sin(t * 1.5);
    const look = keys(t, [[4.3, 0], [4.36, .1], [4.62, 1, 'out'], [4.92, 1], [5.12, .06, 'io'], [5.3, 0]]), fal = keys(t, [[5.3, 0], [5.62, .45, 'io'], [5.76, .4], [6.15, 1, 'io']]), down = keys(t, [[6.0, 0], [6.28, 1, 'io']]), grip = keys(t, [[5.6, 0], [5.95, 1, 'out']]);
    const listen = keys(t, [[CUT - .2, .6], [4.15, 1, 'out'], [5.2, .85], [6.9, 1]]), wind = W.windOf(.5)(t, 600) * .5 + .25;
    p.layer('people', { every: 2, depth: .96 });
    const blink = keys(t, [[4.86, 0], [4.92, 1], [5.0, 1], [5.08, 0]]), sigh = keys(t, [[5.0, 0], [5.6, 1, 'io'], [6.6, .4]]);
    C.face(p, 'danny', { x: 640, y: 402 - 5 * listen, h: 452, view: '34', turn: .42 + .07 * listen, face: -1, nod: -.05 - .06 * listen - .02 * sigh, tilt: -.02, cap: true, bodyTurn: -.5, expr: ['wonder', 'hope', .35 + .4 * sigh], open: lerp(.98, .08, blink), gx: .7, gy: -.1, mOpen: .05 + .07 * sigh, light: { dir: -2.6, warm: .35, k: .5 }, wind: [wind, 0], bustLen: 2.4 });
    p.shade([[60, 930], [500, 900], [980, 930], [990, 1140], [40, 1140]], { color: '#4b463f', alpha: .5, soft: 40 });
    // her hand, flat on his chest; the sleeve goes back under her shawl
    const hy = 806 + 3 * br + 5 * grip; C.hand(p, { who: 'mother', x: 886 - 34 * grip, y: hy + 12, h: 250, pose: [{ base: 'flatOnEarth', roll: 10 }, { base: 'holdFingers', roll: 22 }, grip * .75], rot: -.2 + .05 * grip, mir: -1, light: { dir: -2.8, warm: .42, k: .5 }, armLen: 130, arm: [1080, hy + 120], sleeveLen: 360 });
    C.face(p, 'mother', { x: 1296, y: 520, h: 420, view: '34', turn: .3 + .16 * look - .05 * down, face: -1, nod: -.17 + .07 * look + .24 * down, tilt: .05 - .03 * fal, wind: [.15, 0],
      expr: [{ base: 'tender', smile: .66, browIn: .12, smileEye: .5, cheek: .55 }, { base: 'falter', wet: .95, smile: -.14, browIn: 1 }, fal], gx: lerp(lerp(.2, .75, look), .05, down), gy: lerp(lerp(-.5, -.08, look), .62, down), open: lerp(lerp(.72, .8, look), .42, down), light: { dir: -2.8, warm: .42, k: .55 }, bustLen: 2.4 });
    p.shade([[1000, 930], [1400, 900], [1700, 930], [1720, 1140], [990, 1140]], { color: '#54422c', alpha: .45, soft: 40 });
    const hk = clamp((t - CUT + .25) / 1.15); if (hk > 0 && hk < 1) { p.layer('call', { every: 1, depth: .9 }); call(p, hk, [[[-60, 420], [120, 380], [330, 330], [560, 300]], [[-60, 560], [140, 500], [320, 440], [430, 410]], [[-60, 300], [160, 250], [380, 190], [620, 130]]]); }
  }
  B.scene({ id: 's01', ink: s => s.t < CUT ? 'light' : 'dark', draw(p, s) { if (s.t < CUT) drawA(p, s.t, s); else drawB(p, s.t, s); } });
})();
