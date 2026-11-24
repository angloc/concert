// s00 · THE FIRST PAGE  (0 – 8.4, harp alone)
//
// Feeling: someone sits down at a blank sheet and remembers an evening; you watch the memory come up out of the paper.
// Beats (seconds; harp notes at .40 .95 1.50 2.10 2.9 3.2 3.55 4.0 4.5 5.05 7.0 7.25)
//   0.40  a red point touches the paper.  0.95 it tries a short mark and stops.  1.50 it goes: a long wave, three loops, up, and round and round into a ball.
//   1.2 – 2.9  "Danny Boy" is written above it.
//   2.4 – 4.6  blue and rust searching lines, then graphite: hands and needles first, then her, the boy, the chair, the hearth. The loops turn out to be round the boy.
//   4.1 – 4.9  a thumb rubs the title out as the fire catches and tone arrives in patches from the hearth outwards.
//   5.3  he tugs at the wool, twice; the ball hops in her lap; she stops knitting and looks down; he looks up, caught; he laughs; she tries not to, and does.
// Eye: red line → ball → her face → along the thread to the boy's face.
// Value: lightest = bare paper and the fire; darkest = the mouth of the hearth, then his/her hair against the lit wall.
(function () {
  const B = window.BIDE, A = B.anim, { clamp, lerp, ease, hash, noise1, mixc, keys } = A, TAU = Math.PI * 2, hyp = Math.hypot;
  const ss = (a, b, x) => { x = clamp((x - a) / (b - a)); return x * x * (3 - 2 * x); };
  const FIRE = [318, 786], LIGHT = { dir: [-.86, .12, .5], warm: 1, k: .82, dim: .05, rim: .6 };

  // the drawing arrives in two ways: graphite grows outward from a focus (lines only), then tone covers it inside the patches laid in so far
  function graphite(p, focus, front) {
    const q = Object.create(p); q.line = (pts, st) => {
      if (!pts || pts.length < 2) return; let a = hyp(pts[0][0] - focus[0], pts[0][1] - focus[1]), e = pts[pts.length - 1], b = hyp(e[0] - focus[0], e[1] - focus[1]), P = pts; if (b < a) { P = pts.slice().reverse(); a = b; }
      let L = 0; for (let i = 1; i < P.length; i++) L += hyp(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]);
      const k = clamp((front - a) / (L * .9 + 24)); if (k <= 0) return; if (k < 1) { let s = 0, out = [P[0]]; for (let i = 1; i < P.length; i++) { s += hyp(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); if (s > L * k) break; out.push(P[i]); } P = out; if (P.length < 2) return; }
      p.line(P, k < 1 ? Object.assign({}, st, { taper: [.05, .1] }) : st);
    };
    for (const m of ['mass', 'shade', 'lift', 'hatch', 'dust']) q[m] = () => { }; q.clip = (a, f) => f(); return q;
  }
  // patches of tone, laid in as a hand lays them: zigzag bands of pastel. [x,y,rx,ry,angle,t0,dur]
  const PATCH = [[330, 600, 300, 230, -1.15, 4.2, .42], [300, 880, 330, 130, .04, 4.4, .36], [680, 380, 320, 300, -.95, 4.5, .5], [720, 880, 330, 170, .06, 4.62, .42], [380, 220, 400, 180, -.95, 4.72, .4], [1010, 640, 280, 330, -1.0, 4.82, .46], [690, 660, 260, 150, -.8, 4.78, .36], [1080, 230, 340, 200, -.95, 4.95, .42], [1060, 920, 340, 150, .05, 5.0, .4], [1300, 560, 280, 380, -1.05, 5.08, .46], [1480, 880, 330, 190, .03, 5.25, .4], [1560, 420, 300, 420, -1.0, 5.32, .46], [80, 560, 260, 620, -1.2, 5.0, .4], [1700, 800, 300, 420, -.9, 5.5, .4], [960, 1010, 1100, 110, .02, 5.5, .36]];
  PATCH.forEach(c => { c[5] -= .28; });
  const BANDS = PATCH.map((c, j) => { const [x, y, rx, ry, th, t0, d] = c, ux = Math.cos(th), uy = Math.sin(th), nx = -uy, ny = ux, R = Math.hypot(rx * nx, ry * ny), n = Math.max(5, Math.round(R * 2 / 40)), out = []; for (let i = 0; i < n; i++) { const o = (i + .5) / n * 2 - 1, half = Math.sqrt(Math.max(.1, 1 - o * o * .86)) * Math.hypot(rx * ux, ry * uy), h0 = half * (1.05 + .5 * (hash(i, j, 1) - .4)), h1 = half * (1.05 + .5 * (hash(i, j, 2) - .4)), cx = x + nx * o * R, cy = y + ny * o * R; out.push({ a: [cx - ux * h0, cy - uy * h0], b: [cx + ux * h1, cy + uy * h1], w: R / n, j, i }); } return { out, t0, d, n, ux, uy, nx, ny }; });
  // one ragged polygon per patch: the bands already laid, and the one under the hand
  function region(t) {
    return ctx => { ctx.beginPath(); for (const Q of BANDS) { const m = clamp((t - Q.t0) / Q.d) * Q.n; if (m <= 0) continue; const L = [], Rr = []; for (let i = 0; i < Math.ceil(m); i++) { const q = Q.out[i], k = clamp(m - i), f = i % 2; let a = q.a, b = q.b; if (k < 1) { if (f) a = [lerp(b[0], a[0], k), lerp(b[1], a[1], k)]; else b = [lerp(a[0], b[0], k), lerp(a[1], b[1], k)]; } const e = (v, s, z, o) => [v[0] + Q.nx * q.w * s + Q.ux * z, v[1] + Q.ny * q.w * s + Q.uy * z]; L.push(e(a, -.9, 16), e(a, -.1, -8), e(a, .75, 10)); Rr.push(e(b, -.75, -12), e(b, .05, 9), e(b, .9, -16)); }
      const P = L.concat(Rr.reverse()); P.forEach((v, i) => i ? ctx.lineTo(v[0], v[1]) : ctx.moveTo(v[0], v[1])); ctx.closePath(); } };
  }

  // ------------------------------------------------------------------ the room, as a vignette: nothing reaches the edge of the paper
  function room(q, t, fk) {
    const W = B.world, U = W.util, fl = 1 + .05 * noise1(t * 3.1, 3) + .035 * noise1(t * 7.1, 5);
    const ink = '#3a312a';
    // wall: a warm patch, its edge scribbled out into the paper
    const WL = { rad: [FIRE[0] + 60, FIRE[1] - 120, 1330], stops: [[0, mixc('#b59772', '#f0cf98', .75 * fk)], [.22, mixc('#ab8e6a', '#dcb57f', .6 * fk)], [.5, '#a38462'], [.72, '#947961'], [.9, '#a89074'], [1, '#b9a68a']] };
    q.mass([[70, 190], [230, 136], [430, 120], [700, 106], [930, 120], [1180, 140], [1340, 190], [1450, 270], [1530, 400], [1556, 560], [1520, 690], [1420, 752], [900, 756], [300, 758], [70, 762], [44, 600], [60, 380]], { color: WL, dir: .34, len: 1.25, size: 1.05, vary: .45, soft: 26 });
    const edge = (sh, c, dir, o) => { q.hatch(sh, Object.assign({ color: c, dir, gap: 15, len: 120, w: 11, press: .5, curve: .12, medium: 'crayon' }, o)); };
    edge([[1330, 150], [1480, 210], [1600, 360], [1640, 560], [1600, 730], [1460, 748], [1520, 560], [1480, 380], [1360, 240]], '#9d866b', .98);
    edge([[180, 110], [520, 70], [900, 78], [1260, 110], [1400, 170], [1300, 190], [900, 140], [500, 140], [200, 170]], '#b09674', 1.02);
    edge([[30, 220], [90, 190], [80, 480], [66, 740], [20, 700]], '#c2a67e', .98);
    q.hatch([[1500, 220], [1640, 300], [1724, 470], [1730, 620], [1650, 740], [1560, 740], [1620, 560], [1560, 360]], { color: '#8a745c', dir: .98, gap: 14, len: 130, w: 3, press: .4, curve: .15 });
    q.hatch([[260, 70], [560, 48], [980, 54], [1330, 90], [1420, 150], [900, 100], [420, 108]], { color: '#97826a', dir: 1.02, gap: 16, len: 100, w: 3, press: .34, curve: .15 });
    // floor
    q.mass([[70, 762], [420, 748], [980, 750], [1450, 746], [1650, 786], [1720, 870], [1660, 950], [1480, 1004], [1100, 1024], [640, 1020], [340, 996], [140, 944], [56, 860]], { color: { rad: [FIRE[0] + 90, FIRE[1] + 40, 1250], stops: [[0, mixc('#b4946c', '#f2cf92', .8 * fk)], [.25, mixc('#a5865f', '#d6ab72', .6 * fk)], [.58, '#96795a'], [.85, '#937b61'], [1, '#a8927a']] }, dir: .03, len: 1.3, size: .95, vary: .42, soft: 16 });
    edge([[1540, 930], [1740, 850], [1780, 900], [1680, 980], [1420, 1030], [1120, 1042], [1180, 1010]], '#9a8266', -.12, { len: 160 });
    edge([[60, 906], [340, 986], [700, 1008], [1100, 1016], [1080, 1044], [560, 1046], [220, 1012], [30, 936]], '#b1956d', .08, { len: 160 });
    q.hatch([[1540, 940], [1730, 860], [1800, 884], [1700, 980], [1400, 1034], [1200, 1034]], { color: '#8c7760', dir: -.1, gap: 14, len: 150, w: 3, press: .38 });
    q.hatch([[80, 950], [330, 1020], [700, 1040], [720, 1062], [280, 1050], [40, 990]], { color: '#97805f', dir: .08, gap: 13, len: 150, w: 3, press: .34 });
    // flags
    [[[60, 806], [420, 812], [900, 806], [1500, 812]], [[90, 884], [640, 892], [1180, 886], [1640, 880]], [[240, 972], [760, 984], [1300, 976]], [[640, 812], [600, 888]], [[980, 808], [1010, 886]], [[1300, 810], [1360, 882]], [[480, 890], [400, 980]], [[830, 890], [820, 984]], [[1180, 888], [1230, 978]]].forEach((v, i) => q.line(v, { color: ink, w: 3.2, press: .34, taper: [.25, .35], wobble: 1.6 }));
    // chimney breast
    q.mass([[96, 112], [300, 96], [560, 94], [572, 420], [580, 758], [520, 758], [514, 388], [128, 388], [122, 760], [64, 760], [78, 430]], { sharp: true, color: { lin: [64, 0, 600, 0], stops: [[0, '#bf9d74'], [.4, mixc('#c5a479', '#ecc88f', .5 * fk)], [1, '#a88562']] }, dir: 1.5, len: 1, size: .95, vary: .42 });
    q.shade([[520, 96], [580, 96], [584, 758], [548, 758], [536, 400]], { color: '#6a4e3a', alpha: .4, soft: 18 });
    // mouth of the hearth
    q.mass([[128, 388], [514, 384], [522, 762], [120, 764]], { sharp: true, color: { rad: [FIRE[0], FIRE[1] - 50, 340], stops: [[0, mixc('#4a3a30', '#b4763f', fk)], [.5, mixc('#35291f', '#6b4530', fk * .8)], [1, '#2a2019']] }, dir: 1.5, len: .85, size: .8, vary: .4 });
    for (let i = 0; i < 5; i++) { const y = 420 + i * 66; q.line([[122, y], [150, y - 3], [168, y + 5]], { color: '#241b15', w: 3, press: .55 }); q.line([[480, y + 26], [500, y + 23], [520, y + 27]], { color: '#241b15', w: 3, press: .55 }); }
    // mantel beam and what stands on it
    q.mass([[66, 342], [316, 332], [590, 340], [594, 392], [316, 386], [64, 394]], { sharp: true, color: '#674a33', dir: 0, size: .6, len: 1.1, vary: .45 }); q.line([[64, 395], [316, 387], [594, 393]], { color: '#241b15', w: 4.4, press: .8, wobble: 1.4 }); q.line([[66, 342], [316, 332], [590, 340]], { color: '#e0b680', w: 3.6, press: .6, medium: 'crayon' });
    q.mass([[176, 336], [166, 300], [180, 276], [208, 278], [218, 304], [208, 337]], { color: '#8f8b7c', dir: 1.2, size: .45, len: .4 }); q.line([[218, 292], [236, 300], [218, 318]], { color: ink, w: 3.4, press: .6 });
    q.mass([[440, 336], [438, 278], [506, 276], [508, 337]], { sharp: true, color: '#5c4835', size: .4, len: .4 }); q.mass([[450, 328], [448, 288], [496, 286], [498, 328]], { sharp: true, color: '#bfa984', size: .4, len: .4 });
    // hearth flag
    q.mass([[84, 762], [560, 758], [640, 836], [30, 838]], { color: { rad: [FIRE[0], FIRE[1] + 20, 380], stops: [[0, mixc('#8a7a68', '#f0c078', .85 * fk)], [1, '#8a7660']] }, dir: .02, len: .9, size: .8 }); q.line([[30, 840], [318, 848], [642, 838]], { color: ink, w: 3.6, press: .55, wobble: 1.5 });
    // crane and pot
    q.line([[168, 742], [170, 452], [300, 448]], { color: '#1d1714', w: 8, press: .9, taper: [.02, .05] }); q.line([[290, 450], [292, 520]], { color: '#1d1714', w: 4.4, press: .85 });
    q.mass([[252, 534], [256, 584], [276, 612], [318, 612], [336, 582], [338, 534]], { color: '#231c18', dir: 1.2, size: .5, len: .5 }); q.line([[252, 534], [294, 514], [338, 534]], { color: '#1d1714', w: 4.4, press: .85 }); if (fk > .1) q.line([[262, 588], [282, 609], [314, 610]], { color: '#d2914f', w: 4.6, press: .55 * fk, medium: 'crayon' });
    // drawn edges that stay open
    q.line([[96, 112], [84, 300], [78, 430], [66, 752]], { color: ink, w: 3, press: .4, taper: [.5, .2], wobble: 1.6 }); q.line([[562, 100], [572, 420], [578, 752]], { color: ink, w: 3, press: .5, taper: [.4, .2], wobble: 1.6 }); q.line([[584, 756], [900, 752], [1250, 756], [1540, 748]], { color: ink, w: 3, press: .45, taper: [.1, .5], wobble: 1.5 });
    // the little window, night outside
    q.mass([[792, 214], [962, 210], [966, 420], [790, 424]], { sharp: true, color: '#8d7257', dir: 1.4, size: .6, len: .8 }); q.mass([[814, 234], [944, 231], [946, 396], [813, 400]], { sharp: true, color: { lin: [0, 230, 0, 400], stops: [[0, '#45464a'], [1, '#5d5c58']] }, dir: .5, size: .7, len: .8, vary: .5 }); q.line([[879, 232], [880, 398]], { color: '#b79a72', w: 8, press: .9, taper: [0, 0], medium: 'crayon' }); q.line([[814, 316], [945, 314]], { color: '#b79a72', w: 8, press: .9, taper: [0, 0], medium: 'crayon' }); q.line([[772, 430], [880, 428], [988, 425]], { color: ink, w: 4, press: .65, wobble: 1.3 }); q.line([[792, 420], [790, 214], [962, 210], [966, 418]], { color: ink, w: 2.6, press: .45, wobble: 1.3, taper: [.1, .1] });
    // her shadow on the wall, and both of theirs on the floor, away from the fire
    q.shade([[1390, 320], [1440, 236], [1490, 270], [1512, 390], [1512, 560], [1490, 736], [1410, 742], [1370, 560], [1380, 420]], { color: '#4b382b', alpha: .5 * fk, soft: 34 });
    q.shade([[1130, 950], [1320, 920], [1520, 890], [1640, 900], [1600, 950], [1420, 984], [1200, 992]], { color: '#5c4636', alpha: .6 * fk, soft: 20 }); q.shade([[800, 950], [920, 930], [1040, 940], [1040, 980], [900, 994]], { color: '#5c4636', alpha: .55 * fk, soft: 16 });
    // the light itself
    if (fk > .02) { q.shade([[30, 770], [300, 730], [800, 770], [900, 880], [520, 980], [100, 930]], { color: '#ffd591', alpha: .34 * fk * fl, soft: 90, mode: 'screen' }); q.shade([[60, 400], [300, 260], [640, 330], [700, 560], [600, 760], [100, 780]], { color: '#f2b870', alpha: .16 * fk * fl, soft: 110, mode: 'screen' }); }
  }

  // ------------------------------------------------------------------ the two of them
  const mute = p => { const q = Object.create(p); for (const m of ['mass', 'shade', 'line', 'lift', 'hatch', 'dust', 'layer', 'air', 'paper']) q[m] = () => { }; q.clip = (a, f) => f(); return q; };
  const BALL = [1058, 652, 42], KX = 826, KY = 974, KH = 590, MX = 1268, MY = 976, MH = 900;
  const SH = .28, tug = t => keys(t + SH, [[5.3, 0], [5.38, -.12], [5.58, 1, 'out'], [5.72, .9], [5.86, .1], [5.96, -.1], [6.16, 1.45, 'out'], [6.3, 1.2], [6.5, .35, 'out'], [6.9, .2]]);
  const giggle = t => { let v = 0; for (const a of [7.0, 7.25, 7.5, 7.83, 8.1]) { const x = t + SH - a; if (x >= 0 && x < .25) v = Math.max(v, Math.sin(x / .25 * Math.PI) * (a > 7.7 ? .55 : 1)); } return v; };
  function boyPose(t) {
    const T = t + SH, tg = tug(t), up = keys(T, [[6.5, 0], [6.56, -.12], [6.78, 1.06, 'out'], [6.95, 1]]), jo = keys(T, [[6.98, 0], [7.16, 1, 'out']]), g = giggle(t), petted = keys(T, [[7.82, 0], [8.0, 1, 'out']]);
    const hx = lerp(.225, .22, jo) - .085 * tg, hy = lerp(.44, .52, jo) + .035 * tg + .02 * g;
    return { x: KX, y: KY, h: KH, view: '34', face: 1, t, legs: { kind: 'sitGround', up: .85 + .05 * g + .06 * tg }, light: { dir: [-.55, -.1, .85], warm: 1, k: .6, dim: 0, rim: .8 },
      lean: .06 - .13 * tg - .12 * jo - .035 * g, bend: lerp(.14, -.02, up) + .05 * g + .05 * petted, shrug: .9 * g + .25 * jo + .5 * petted, head: { nod: lerp(.28, -.34, up) + .1 * g + .12 * petted, turn: lerp(-.1, -.06, up), tilt: lerp(.08, -.05, up) - .06 * g + .08 * petted },
      armNear: [hx - .02, hy - .03 - .035 * Math.max(0, tg), ['fist', 'open', clamp(jo - .1)]], armFar: [hx + .05, hy + .05 + .02 * tg, ['holdFingers', 'open', clamp(jo)]],
      expr: jo > 0 ? [up > .5 ? 'wonder' : 'stillness', 'joy', jo] : [{ base: 'stillness', gy: .6, open: .5, press: .5 * clamp(tg), knit: .4 * clamp(tg) }, { base: 'wonder', gy: -.3 }, clamp(up)], cap: false };
  }
  function motherPose(t, pat) {
    const T = t + SH, look = keys(T, [[6.22, 0], [6.3, -.1], [6.52, 1.06, 'out'], [6.75, 1]]), sm = keys(T, [[6.96, 0], [7.5, 1, 'io']]), reach = keys(T, [[7.22, 0], [7.32, -.07], [7.8, 1, 'io']]), start = keys(T, [[6.12, 0], [6.22, 1, 'out'], [6.7, 0]]), n = t > 4.95 && T < 6.15 ? 1 : 0;
    const click = n * (Math.floor(t * 6) % 2 ? 1 : -1) * .009;
    return { x: MX, y: MY, h: MH, yaw: 1.02 + .08 * look, face: -1, t, legs: { kind: 'sit', seat: .282 }, light: LIGHT, lean: lerp(.06, .22, reach) - .04 * start, bend: lerp(.12, .26, reach) - .04 * start, shrug: .25 * start,
      head: { nod: lerp(.5, .32, look) + .16 * reach, turn: lerp(-.26, -.06, look), tilt: lerp(.03, -.1, sm) - .05 * reach },
      armNear: { g: 'knit', add: [.0, .03 + click + .022 * start - .03 * reach] }, armFar: [{ g: 'knit', add: [-.0, .035 - click + .028 * start] }, { at: pat, h: ['knit', 'cradle', clamp(reach * 1.4)], over: true }, reach],
      expr: sm > .02 ? [{ base: 'stillness', gy: .5, open: .72 }, { base: 'joy', mOpen: lerp(.2, .08, reach), mWide: .5, open: .4, smile: 1.15, smileEye: .95, cheek: 1, gy: .6, browIn: .4, brow: .25, blush: .8 }, sm] : [{ base: 'stillness', gy: .75, open: .3 }, { base: 'stillness', gy: .5, open: .8, brow: .35, browIn: 0, smile: .22 }, clamp(look)] };
  }
  // the one red line. anchors follow him; fl marks where it passes behind. returns {P:[[x,y]], F:[behind]} from the loose end to her lap
  const ring = (P, F, c, rx, ry, rot, a0, a1, n) => { for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n), x = Math.cos(a) * rx, y = Math.sin(a) * ry, cr = Math.cos(rot), sr = Math.sin(rot); P.push([c[0] + x * cr - y * sr, c[1] + x * sr + y * cr]); F.push(Math.sin(a) < -.15); } };
  function wool(k, t) {
    const P = [], F = [], add = (x, y, b) => { P.push([x, y]); F.push(!!b); }, tg = clamp(tug(t), -.2, 1.4), g = giggle(t), hd = k.head, hn = k.handNear, hf = k.handFar, S = k.S, N = k.neck, V = k.pelvis, at = u => [lerp(N[0], V[0], u), lerp(N[1], V[1], u)], rot = Math.atan2(V[0] - N[0], V[1] - N[1]);
    add(206, 906); add(268, 890); add(340, 892); add(420, 918); add(500, 932); add(576, 918); add(640, 902); add(694, 908); add(732, 916);
    ring(P, F, at(.86), .122 * S, .03 * S, .02, Math.PI * .96, Math.PI * .96 - TAU * .86, 14);                       // round his middle
    const b = at(.47); ring(P, F, b, .116 * S, .036 * S, -.42 - rot, Math.PI * 1.08, -.15, 9);                        // up across his chest and over the shoulder
    add(N[0] + .075 * S, N[1] + .01 * S, true); add(hd[0] + .0 * S, hd[1] + .08 * S, true); add(hd[0] - .085 * S, hd[1] + .02 * S, true);
    const nd = k.rig.head.nod, cr = [hd[0] + .07 * S * Math.sin(nd) - .004 * S, hd[1] - .088 * S * Math.cos(nd) + 2 * g]; ring(P, F, cr, .088 * S, .025 * S, nd * .75 - .13 + .5 * k.rig.head.tilt, Math.PI * 1.06, Math.PI * 1.06 - TAU * .86, 14);   // a crooked crown
    add(hd[0] - .06 * S, hd[1] + .04 * S, true); add(N[0] + .0 * S, N[1] - .01 * S, true); add(N[0] + .1 * S, N[1] + .05 * S, true); add(lerp(N[0], hn[0], .7), lerp(N[1], hn[1], .7) + .05 * S, false);
    ring(P, F, [hn[0] - .012 * S, hn[1] + .018 * S], .03 * S, .015 * S, .5, 2.4, 2.4 - TAU * 1.1, 9); add(lerp(hn[0], hf[0], .5), lerp(hn[1], hf[1], .5) + .05 * S * (1 - .4 * tg));
    ring(P, F, [hf[0] - .008 * S, hf[1] + .016 * S], .028 * S, .014 * S, .4, 2.6, 2.6 - TAU * .9, 8);
    return { P, F };
  }
  function measured(W0) { const pts = [], fl = []; const n = W0.P.length; for (let i = 0; i < n - 1; i++) { const a = W0.P[Math.max(0, i - 1)], b = W0.P[i], c = W0.P[i + 1], d = W0.P[Math.min(n - 1, i + 2)]; for (let j = 0; j < 6; j++) { const u = j / 6, u2 = u * u, u3 = u2 * u; pts.push([0, 1].map(q => .5 * (2 * b[q] + (c[q] - a[q]) * u + (2 * a[q] - 5 * b[q] + 4 * c[q] - d[q]) * u2 + (3 * b[q] - a[q] - 3 * c[q] + d[q]) * u3))); fl.push(W0.F[i] && W0.F[i + 1]); } } pts.push(W0.P[n - 1]); fl.push(false); const L = [0]; for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + hyp(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return { pts, fl, L, len: L[L.length - 1] }; }
  function strands(p, m, behind, d1, st) { let run = []; const put = () => { if (run.length > 2) B.world.thread(p, run, Object.assign({ raw: true, w: 6, fuzz: .5, tip: 5 }, st)); run = []; }; for (let i = 0; i < m.pts.length; i++) { if (m.L[i] > d1) break; if (behind == null || m.fl[i] === behind) run.push(m.pts[i]); else { if (run.length) run.push(m.pts[i]); put(); } } put(); }
  // from his hand to her lap: slack, or tight when he pulls
  function slackLine(a, b, sag) { const o = []; for (let i = 0; i <= 10; i++) { const u = i / 10; o.push([lerp(a[0], b[0], u) + 3 * noise1(u * 4, 3) * sag / 40, lerp(a[1], b[1], u) + sag * 4 * u * (1 - u) * (1 + .25 * (u - .5))]); } return o; }

  let KA0 = null, WL0 = null;
  // how far the line has got: dot, a try, then it goes
  const DRAWN = t => keys(t, [[.93, 0], [1.12, 64, 'out'], [1.2, 82], [1.42, 82], [1.5, 88], [1.62, 120, 'in'], [2.08, 520, 'io'], [2.2, 640, 'lin'], [2.62, 1080, 'lin'], [3.12, 1560, 'lin'], [3.46, 1960, 'io']]);

  function draw(p, s) {
    const C = B.cast, W = B.world, t = s.t, abs = t; p.paper('#eadfc6');
    if (!KA0) { const m = mute(p); KA0 = C.figure(m, 'boy', boyPose(5)); WL0 = measured(wool(KA0, 5)); }
    const fk = keys(t, [[4.0, 0], [4.2, .42, 'out'], [4.3, .3], [4.5, .42], [4.72, 1, 'out']]), doneT = t > 5.75, reg = doneT ? null : region(t), tone = f => { if (t < 3.95) return; reg ? p.clip(reg, f) : f(); };
    const roomFront = keys(t, [[3.1, 0], [4.5, 2000, 'io']]), figFront = keys(t, [[2.65, 0], [4.45, 1000, 'io']]), boyFront = keys(t, [[3.0, 0], [4.3, 460, 'io']]), chairFront = keys(t, [[3.4, 0], [4.5, 760, 'io']]);
    // ---- searching lines and the title, on the bare paper
    p.layer('search', { every: 3, depth: .8 }); search(p, t); title(p, t);
    // ---- the room
    if (t > 3.05) { p.layer('room', { every: 4, depth: .4 }); if (!doneT) room(graphite(p, [360, 560], roomFront), t, fk); tone(() => room(p, t, fk));
      if (t > 4.0) { p.layer('fire', { every: 1, depth: .7 }); W.fire(p, { x: FIRE[0], y: FIRE[1], w: 270, h: lerp(120, 200, fk) * (1 + .12 * keys(t, [[4.1, 0], [4.25, 1, 'out'], [4.6, 0]])), k: fk, t, turf: t > 4.1 }); } }
    // ---- the people and the wool
    p.layer('people', { every: 2, depth: .95 });
    let ka = KA0, wl = WL0, ma = null; const d1 = t >= 3.46 ? 1e9 : DRAWN(t), chair = { x: MX + 26, y: MY + 6, scale: 1.9, ground: 0 };
    if (!doneT && t > 2.6) { const gp = graphite(p, KA0.handFar, boyFront), mp = graphite(p, [1100, 560], figFront); W.chair(graphite(p, [1300, 700], chairFront), chair); C.figure(mp, 'mother', motherPose(t, [900, 600])); if (t > 2.95) C.figure(gp, 'boy', boyPose(t)); }
    if (t > 2.9) { const R = p0 => C.group(p0, r => C.figure(p0, 'boy', Object.assign({ rec: r }, boyPose(t)))); if (t < 3.95) { ka = KA0; wl = WL0; } else { if (t < 4.9) strands(p, WL0, true, d1, {}); let an = null; tone(() => { an = R(p); }); ka = an || KA0; wl = measured(wool(ka, t)); } strands(p, wl, false, d1, {}); if (t < 3.95) strands(p, wl, true, d1, {}); }
    else if (t >= .95) strands(p, WL0, null, d1, {});
    if (t >= .38 && t < 1.3) { const r = t < .55 ? 5 : t < .75 ? 6.6 : 7.6; p.mass([[206 - r, 906], [206, 906 - r], [206 + r, 906 + 1], [206, 906 + r]], { color: '#b5322b', size: .35, len: .3 }); p.line([[205, 905], [207, 907]], { color: '#b5322b', w: 12, press: 1, medium: 'crayon', taper: [0, 0] }); }
    // mother
    const rub = keys(t + SH, [[7.8, 0], [7.95, 0], [8.1, 1, 'io'], [8.25, .1, 'io'], [8.42, 1, 'io'], [8.6, .2]]), pat = [ka.head[0] + 34 - 22 * rub, ka.head[1] - 74 + 12 * rub];
    tone(() => W.chair(p, chair)); tone(() => { ma = C.figure(p, 'mother', motherPose(t, pat)); });
    if (!ma && t > 2.6) { ma = { handNear: [1121, 530], handFar: [1082, 478] }; }
    // the knitting
    const nk = clamp((t - 2.6) / .5); if (nk > 0) knitting(p, t, nk, ma);
    // the ball, wound by the line itself, then a ball in a lap
    const T = t + SH, wk = keys(t, [[3.46, 0], [4.7, 1, 'lin']]), hop = keys(T, [[6.05, 0], [6.2, 1, 'out'], [6.4, 0, 'heavy'], [6.48, .2, 'out'], [6.58, 0, 'heavy']]), br = BALL[2] * (.8 + .2 * wk), bx = BALL[0] - 12 * ss(6.05, 6.5, T), by = BALL[1] - 46 * hop + (BALL[2] - br) * .6;
    if (t > 3.3) {
      const a = wl.pts[wl.pts.length - 1], e = t < 3.46 ? null : [bx - br * .86, by - br * .3], sag = keys(T, [[5.3, 34], [5.5, 4, 'out'], [5.74, 8], [5.9, 36, 'out'], [6.14, 2, 'out'], [6.34, 6], [6.6, 40, 'out'], [7.0, 30], [8, 26]]) + 8 * giggle(t);
      if (e) { const sl = slackLine(a, e, sag); const k1 = keys(t, [[3.46, 0], [3.66, 1, 'lin']]); W.thread(p, sl, { raw: true, w: 6, fuzz: .5, k1, tip: 4 }); }
      const w2 = keys(t, [[3.62, 0], [4.7, 1, 'lin']]);
      if (w2 > 0) { if (w2 < 1) { const wc = W.windCurve(bx, by, br, 6, { a0: 3.4, seed: 3 }); if (w2 > .4) W.ball(p, { x: bx, y: by, r: br * (.82 + .18 * w2), k: ss(.3, .95, w2), roll: t * 1.5, ground: 0 }); W.thread(p, wc, { w: 5, k1: w2, fuzz: .3, tip: 4 }); } else W.ball(p, { x: bx, y: by, r: br, k: 1, roll: 7.05 - .9 * hop - .5 * ss(6.05, 6.5, T), ground: t > 4.9 ? .6 : 0, squash: hop > .02 ? -.05 * hop : .07, shadow: '#3d4a52', tailAt: 3.4 }); }
    }
  }
  function knitting(p, t, k, ma) {
    const W = B.world; const hn = ma ? ma.handNear : [1121, 530], hf = ma && t < 6.9 ? ma.handFar : [1082, 478]; const cx = lerp(1150, hn[0], .5), cy = lerp(578, hn[1], .5);
    const a = Math.atan2(hf[1] - hn[1], hf[0] - hn[0]), nx = hn[0] - 14, ny = hn[1] - 6;
    if (k > .3) W.knit(p, { x: nx - 8, y: ny + 8, w: 66, rows: 9 * clamp((k - .3) / .7), rh: 11, st: 11, fold: v => [-.6 * v * v * .25 + 2 * Math.sin(v * .8), 0] });
    W.needles(p, { x: nx - 12, y: ny + 2, a: -.62, b: -2.62, len: 150, scale: .92 });
  }
  // blue and rust searching lines: the gesture first, the drawing on top of it later
  const SEARCH = [
    ['b', 2.45, [[1196, 284], [1270, 320], [1312, 420], [1326, 560], [1302, 660], [1262, 720]]], ['b', 2.55, [[1150, 372], [1166, 300], [1216, 278], [1264, 310], [1268, 384], [1222, 440], [1172, 428], [1148, 376], [1166, 296]]], ['r', 2.7, [[1330, 520], [1270, 660], [1130, 690], [1044, 706], [1030, 820], [1038, 966]]], ['b', 2.8, [[1290, 450], [1322, 570], [1230, 590], [1110, 540]]], ['r', 2.86, [[1184, 464], [1120, 540], [1080, 500]]],
    ['b', 2.95, [[790, 690], [800, 636], [860, 612], [918, 640], [930, 704], [884, 756], [816, 742], [788, 688], [808, 630]]], ['r', 3.05, [[848, 752], [768, 800], [738, 900], [770, 966], [860, 980], [914, 900], [896, 800], [850, 752]]], ['b', 3.15, [[870, 780], [936, 760], [988, 664]]], ['r', 3.2, [[850, 930], [912, 850], [930, 966]]],
    ['b', 3.3, [[20, 766], [400, 758], [1000, 752], [1640, 756], [1760, 752]]], ['r', 3.4, [[70, 60], [78, 400], [60, 800]]], ['r', 3.46, [[562, 40], [574, 420], [584, 800]]], ['b', 3.55, [[30, 392], [330, 386], [640, 392]]], ['b', 3.6, [[124, 770], [128, 380], [516, 382], [522, 772]]], ['r', 3.66, [[1390, 1000], [1402, 720], [1420, 380], [1426, 340]]], ['r', 3.72, [[1462, 960], [1476, 600], [1490, 350]]],
    ['b', 3.8, [[780, 150], [880, 130], [980, 160], [990, 430], [770, 436], [778, 150]]]];
  function search(p, t) { for (const [c, t0, pts] of SEARCH) { const k = clamp((t - t0) / .3); if (k <= 0) continue; const sp = A.spline(pts, 5), n = Math.max(2, Math.ceil(sp.length * k)); p.line(sp.slice(0, n), { color: c === 'b' ? '#7d97ab' : '#b0764e', w: 3, press: .5, taper: [.2, .3], wobble: 1.6, passes: 2 }); } }
  // the title, and the thumb that rubs it out
  function title(p, t) {
    const H = B.hand, o = { x: 730, y: 446, size: 190 }, k = keys(t, [[1.5, 0], [3.02, 1, 'lin']]); if (k <= 0 || t > 5.1) return;
    const rub = clamp((t - 3.72) / .85), L = H.titleLayout(o); if (rub <= 0) { H.title(p, Object.assign({ k, color: '#4a4038' }, o)); return; }
    const front = lerp(L.x0 - 60, L.x1 + 120, rub * rub * (3 - 2 * rub)), gone = clamp((t - 4.4) / .6), st = { color: '#4a4038', w: 2.4 + o.size * .036, press: 1.2, medium: 'graphite', wobble: .5, taper: [.1, .15] };
    for (let i = 0; i < L.strokes.length; i++) { let keep = [], drag = [], gh = []; const edge = front + 22 * (p.fix(i, 3, 5) - .5), fl = () => { if (keep.length > 1) p.line(keep, st); keep = []; if (drag.length > 1) p.line(drag, Object.assign({}, st, { w: st.w * 1.9, press: .8, alpha: .5 })); drag = []; if (gh.length > 1 && gone < 1) p.line(gh, Object.assign({}, st, { w: st.w * 3, press: .7, alpha: .26 * (1 - gone), taper: [.2, .3], wobble: 1.4 })); gh = []; };
      let mode = 0; for (const v of L.strokes[i].pts) { const d = edge - v[0], m = d < 0 ? 0 : d < 80 ? 1 : 2; if (m !== mode) { fl(); mode = m; } if (m === 0) keep.push(v); else if (m === 1) drag.push([v[0] + (80 - d) * .4 + 6, v[1] + 4 * (p.rnd(i, v[0]) - .5), .8]); else gh.push([v[0] + 18 + 10 * p.fix(i, 7), v[1] + 2, v[2]]); } fl(); }
    if (gone < 1) for (let i = 0; i < 5; i++) { const y = 380 + i * 34 + 10 * (p.fix(i, 9) - .5), a = L.x0 - 30, b = Math.min(front, L.x1 + 40); if (b - a > 80) p.line([[a + 40 * p.fix(i, 2), y + 4, .5], [lerp(a, b, .4), y - 5, .9], [lerp(a, b, .75), y + 3, .9], [b - 30 * p.fix(i, 4), y, .6]], { color: '#4a4038', w: 34, press: .5, alpha: .09 * (1 - gone), wobble: 1.4, taper: [.2, .12] }); }
  }

  B.scene({ id: 's00', draw });
})();
