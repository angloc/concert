// s06  "Or when the valley's hushed and white with snow"
// FEELING  a held breath. Nothing is asked of us but to see one small light, and that somebody is behind it.
// BEATS    0.0 the summer meadow is being snowed out: last blades and gold go under (Or when) · 1.4 the valley is bare and white (valley's)
//          3.2 HUSHED: the snow itself stops in the air, the smoke stops; only the line breathes · 4.0 it remembers to fall (and white)
//          4.3 her hand comes up to the glass, waits, and wipes a round place to look through (white with) · 5.6 the light is clearer by a breath, her face is in it, looking along the thread (snow)
// EYE      window -> thread -> away over the hill to the left, and back. VALUES darkest her shape in the window, lightest the snow; the only warm thing is the window, the only red the thread.
(function () {
  const B = window.BIDE, A = B.anim, { lerp, clamp, mixc, noise1, hash, keys } = A, TAU = Math.PI * 2;
  const ss = (a, b, x) => { x = clamp((x - a) / (b - a)); return x * x * (3 - 2 * x); };
  const WN = { x: 1424, x0: 1370, x1: 1478, y0: 508, y1: 634 };                     // the window
  const PATH = [[1262, 674], [1226, 700], [1160, 716], [1096, 742], [1030, 786], [940, 806], [850, 786], [770, 778], [690, 806], [610, 812], [540, 776], [488, 734], [420, 722], [352, 712], [300, 680], [232, 662], [170, 648], [120, 618], [66, 596], [16, 566], [-40, 548]];
  // her time: the snow slows, stops on "hushed", and starts again more softly
  const TAU_ = t => keys(t, [[-2, -2, 'lin'], [2.7, 2.7, 'lin'], [3.4, 3.02, 'out'], [4.05, 3.02], [5.1, 3.36, 'in'], [8.6, 5.4, 'lin']]);
  const far = y => clamp((y - 540) / 280);                                            // 0 far .. 1 near, for the thread and its stitches

  function flakes(p, tau, from, to) {
    const n = 120; for (let i = from * n | 0; i < to * n; i++) {
      const h = k => hash(i, 61, k), cls = i % 5 === 0 ? 2 : i % 3 === 0 ? 1 : 0, v = [36, 58, 84][cls] * (.8 + .4 * h(1)), life = 1260 / v, tt = tau + 40 + h(2) * life, u = (tt % life) / life, y = u * 1260 - 80, sw = [20, 34, 56][cls], x = h(3) * 2060 - 70 + sw * (noise1(tt * .55 + i * 1.7, 3) + .5 * noise1(tt * 1.3 + i, 9)), r = [3.2, 6.4, 13.5][cls] * (.7 + .65 * h(4) * h(4) + (cls === 2 && i % 4 === 0 ? .35 : 0)), rot = h(5) * 6 + .9 * noise1(tt * .6 + i, 5);
      if (cls === 0) { p.mass([[x - r, y - r * .2], [x, y - r], [x + r * 1.1, y], [x + r * .2, y + r]], { color: '#fbfaf6', size: .3, len: .3, dir: rot, vary: 0 }); if (i % 2) p.line([[x - r * .4, y + r * 1.1], [x + r * 1.1, y + r * .5]], { color: '#aab8c2', w: 2, press: .42, taper: [.3, .4], wobble: .5 }); }
      else if (cls === 1) { const q = []; for (let j = 0; j < 7; j++) { const a = j / 7 * TAU + rot, k = r * (.75 + .5 * hash(i, j, 7)); q.push([x + Math.cos(a) * k, y + Math.sin(a) * k * .9]); } p.mass(q, { color: '#fcfbf8', size: .3, len: .34, dir: rot, vary: 0 }); p.line([[x - r * .7, y + r * .7], [x + r * .2, y + r * 1.05], [x + r, y + r * .3]], { color: '#9fafba', w: 2.2, press: .5, taper: [.3, .4], wobble: .7 }); }
      else { // a big one: two or three crystals that came down holding on to each other
        const lobes = [[0, 0, 1], [.75 * Math.cos(rot), .6 * Math.sin(rot), .68], [-.62 * Math.cos(rot + .7), -.55 * Math.sin(rot + .7), .6]], sh = (dx, dy, k) => lobes.map((l, m) => { const q = []; for (let j = 0; j < 8; j++) { const a = j / 8 * TAU + rot + m, kk = r * l[2] * (.78 + .44 * hash(i, j + m * 9, 7)) * k; q.push([x + dx + l[0] * r + Math.cos(a) * kk, y + dy + l[1] * r + Math.sin(a) * kk * .9]); } return A.spline(q, 3, true); }), poly = L => c => { c.beginPath(); L.forEach(q => { q.forEach((z, j) => j ? c.lineTo(z[0], z[1]) : c.moveTo(z[0], z[1])); c.closePath(); }); };
        p.mass(poly(sh(2, 3, 1.08)), { color: '#b3c1cb', alpha: .72, size: .34, len: .4, dir: rot, vary: .05, soft: 2 }); p.mass(poly(sh(0, 0, 1)), { color: '#fffefb', size: .34, len: .4, dir: rot, vary: 0 });
        p.line([[x - r * .9, y + r * .8], [x - r * .1, y + r * 1.12], [x + r * .9, y + r * .7]], { color: '#93a5b2', w: 2.2, press: .5, taper: [.3, .4], wobble: .8 }); for (let j = 0; j < 3; j++) { const a = rot + j * 1.1 + hash(i, j, 8), c = Math.cos(a), q = Math.sin(a) * .9; p.line([[x + c * r * .5, y + q * r * .5], [x + c * r * (1.25 + .3 * hash(i, j, 9)), y + q * r * (1.25 + .3 * hash(i, j, 9))]], { color: '#fffefb', w: 3, press: .9, taper: [.1, .5], wobble: .6, medium: 'crayon' }); } }
    }
  }

  B.scene({
    id: 's06', ink: 'light',
    draw(p, s) {
      const t = s.t, W = B.world, U = W.util, tau = TAU_(t), green = keys(t, [[-1, 1], [0, .8], [1.9, .12, 'io'], [2.6, 0]]);
      // the light in the window: it draws in a little before she wipes the glass, then is clearer
      const k = .8 + .025 * noise1(s.abs * 1.3, 3) + keys(t, [[3.1, 0], [3.7, -.05], [4.9, -.03], [5.7, .2, 'out'], [6.6, .14], [8, .12]]);
      const hand = keys(t, [[4.05, 0], [4.2, -.05], [4.72, 1, 'out'], [9, 1]]), wipe = keys(t, [[4.9, 0], [5.15, .18, 'in'], [5.62, .82, 'lin'], [6.0, 1, 'out']]), clear = ss(.04, .8, wipe), turn = wipe * 1.35;
      p.paper('#e9e7e0');
      // ---- sky and the two long hills
      p.layer('s06sky', { every: 6, depth: .05, still: true });
      p.mass([[-30, -30], [1950, -30], [1950, 720], [-30, 720]], { sharp: true, color: { lin: [200, -40, 100, 640], stops: [[0, '#ccd3d7'], [.45, '#d9dddd'], [.8, '#e3e3df'], [1, '#e8e6e0']] }, dir: -.08, len: 2, size: 1.7, vary: .18 });
      p.mass([[-60, 60], [300, 20], [760, 60], [1240, 30], [1700, 70], [1980, 40], [1980, 170], [1500, 196], [980, 150], [420, 200], [-60, 160]], { color: '#c1cad0', alpha: .5, dir: -.05, len: 1.8, size: 1.5, vary: .2, soft: 40 });
      const h1 = U.ridge([[-60, 452], [180, 418], [420, 432], [700, 470], [960, 456], [1200, 410], [1500, 398], [1980, 430]], { amp: 4, seed: 5, step: 26 });
      p.mass(U.below(h1, 760), { sharp: true, color: { lin: [0, 400, 0, 620], stops: [[0, '#dcdfdf'], [1, '#e8e6e0']] }, dir: .06, len: 1.6, size: 1.2, vary: .12 });
      p.mass([[700, 470], [860, 468], [1010, 452], [980, 500], [820, 530], [640, 520]], { color: '#c6d0d7', alpha: .7, dir: .3, len: 1.2, size: 1, vary: .2, soft: 18 });
      U.found(p, h1, { color: '#9aa6ae', w: 2, press: .36, seed: 4, seg: 260, gap: .9, skip: .3 });
      // ---- the near land: what is left of the meadow under the snow
      p.layer('s06land', { every: 3, depth: .5 });
      const h2 = U.ridge([[-60, 552], [120, 532], [330, 570], [560, 628], [820, 664], [1060, 664], [1300, 654], [1980, 650]], { amp: 4, seed: 11, step: 24 });
      p.mass(U.below(h2, 1130), { sharp: true, color: { lin: [0, 540, 0, 1100], stops: [[0, mixc('#efede6', '#d9cf9a', green * .7)], [.35, mixc('#f5f2eb', '#cfc27c', green * .8)], [.72, mixc('#f2efe9', '#b7b068', green * .85)], [1, mixc('#e6e6e2', '#97985c', green * .85)]] }, dir: .05, len: 1.5, size: 1.1, vary: .12 + .3 * green });
      // long blue hollows
      [[[60, 560], [260, 560], [470, 622], [420, 660], [220, 612], [40, 590]], [[620, 700], [880, 716], [1100, 700], [1040, 742], [800, 764], [600, 738]], [[-60, 800], [260, 770], [620, 846], [900, 880], [640, 906], [240, 850], [-60, 850]], [[1120, 884], [1500, 840], [1980, 860], [1980, 920], [1500, 900], [1200, 930]]].forEach((q, i) => p.mass(q, { color: ['#c9d3da', '#d2dade', '#d3dbdf', '#d0d9de'][i], alpha: .62 * (1 - .6 * green), dir: .06 + .05 * i, len: 1.5, size: 1, vary: .2, soft: 26 }));
      U.found(p, h2, { color: '#98a5ae', w: 2.2, press: .42, seed: 9, seg: 230, gap: 1, skip: .34 });
      // blades and flower heads going under
      if (green > .02) for (let i = 0; i < 64; i++) { const x = 40 + 1840 * hash(i, 3, 1), y = 720 + 330 * hash(i, 3, 2), l = (34 + 60 * hash(i, 3, 3)) * (.5 + .5 * (y - 700) / 340), cover = clamp(green * 1.5 - hash(i, 3, 4) * .7); if (cover <= .05 || (x > 1160 && y < 760)) continue; const b = .2 + .3 * noise1(i, 4); p.line([[x, y], [x + l * .2 * b, y - l * .6 * cover], [x + l * b, y - l * cover]], { color: mixc('#f3f1ea', i % 3 ? '#a8a15c' : '#8a9460', cover), w: 3.4, press: .7 * cover + .1, taper: [.05, .6], medium: 'crayon', wobble: .8 }); if (i % 5 === 0) p.dust(x + l * b, y - l * cover, 7 * cover, { color: i % 2 ? '#e3c25a' : '#f7f2dd', n: 6, seed: i, size: 1.3 }); }
      // light from the window lying on the snow
      p.mass([[1380, 690], [1470, 688], [1520, 760], [1500, 792], [1340, 798], [1318, 766]], { color: '#f2d49a', alpha: .16 + .42 * k * (.7 + .5 * clear), dir: .05, len: 1, size: .8, vary: .15, soft: 16 });
      p.mass([[1396, 692], [1456, 690], [1482, 740], [1372, 746]], { color: '#f6cd84', alpha: .1 + .4 * k * (.6 + .6 * clear), dir: .05, len: .8, size: .6, vary: .12, soft: 8 });
      // ---- the cottage: mostly not there
      p.layer('s06house', { every: 4, depth: .7 });
      p.mass([[1184, 478], [1990, 462], [1990, 690], [1500, 684], [1300, 680], [1180, 684]], { sharp: true, color: { lin: [1180, 0, 1980, 0], stops: [[0, '#cdd5d9'], [.35, '#d7dbdc'], [.7, '#e4e3df'], [1, '#eae8e2']] }, dir: 1.5, len: .9, size: .8, vary: .12 });
      p.mass([[1146, 492], [1166, 470], [1232, 352], [1262, 324], [1500, 306], [1990, 290], [1990, 486], [1700, 490], [1400, 496], [1200, 502]], { color: { lin: [1200, 310, 1260, 500], stops: [[0, '#f4f2ec'], [.7, '#efede7'], [1, '#e2e4e3']] }, dir: 1.2, len: 1.1, size: .9, vary: .1 });
      p.mass([[1160, 494], [1400, 492], [1700, 484], [1990, 478], [1990, 500], [1700, 506], [1400, 514], [1196, 516]], { color: '#a9b6c0', alpha: .8, dir: 0, len: 1, size: .6, vary: .25, soft: 3 });
      p.line([[1150, 492], [1200, 504], [1330, 503], [1480, 500]], { color: '#6b7680', w: 3, press: .55, taper: [.15, .5], wobble: 1.6 }); p.line([[1560, 498], [1760, 492], [1900, 486]], { color: '#8a959d', w: 2.4, press: .4, taper: [.3, .6], wobble: 1.6 }); p.line([[1148, 488], [1180, 440], [1230, 354], [1262, 326]], { color: '#8a959d', w: 2.4, press: .42, taper: [.2, .6], wobble: 1.6 }); p.line([[1186, 516], [1184, 600], [1182, 676]], { color: '#6b7680', w: 2.8, press: .5, taper: [.1, .4], wobble: 1.3 });
      // chimney, its smoke going straight up and stopping
      p.mass([[1306, 326], [1308, 262], [1364, 258], [1366, 320]], { sharp: true, color: '#b9c3ca', dir: 1.5, size: .6, len: .6 }); p.mass([[1300, 268], [1304, 252], [1368, 248], [1372, 262], [1334, 260]], { color: '#f6f4ef', size: .5, len: .5 }); p.line([[1308, 322], [1309, 264]], { color: '#6b7680', w: 2.6, press: .5 });
      for (let i = 0; i < 6; i++) { const u = ((i + tau * .34) % 6) / 6, y = 246 - u * 226, x = 1338 + 10 * u + 16 * u * noise1(tau * .5 + i * 1.3 + u * 2, 7), r = 9 + 26 * u, al = .5 * Math.sin(Math.PI * Math.min(1, u * 1.15 + .06)); if (al > .03) p.mass(U.lump(x, y, r, r * 1.5, i + 3, { n: 9, rough: .3 }), { color: '#e9e7e2', alpha: al, dir: 1.5, size: .8, len: .9, soft: 9, vary: .1 }); }
      // door, drifted shut at the foot
      p.mass([[1228, 516], [1300, 513], [1302, 682], [1228, 684]], { sharp: true, color: { lin: [1228, 520, 1300, 680], stops: [[0, '#8996a0'], [1, '#a3aeb6']] }, dir: 1.5, size: .6, len: .9, vary: .25 }); [[1228, 518, 1229, 678], [1300, 516, 1301, 676], [1252, 520, 1253, 660], [1277, 520, 1277, 660]].forEach((q, i) => p.line([[q[0], q[1]], [q[2], q[3]]], { color: '#4f5a64', w: i < 2 ? 2.8 : 1.8, press: i < 2 ? .55 : .3, wobble: 1.2 }));
      p.mass([[1120, 704], [1160, 676], [1222, 660], [1290, 664], [1350, 676], [1480, 674], [1640, 664], [1990, 640], [1990, 720], [1600, 712], [1300, 716]], { color: { lin: [0, 660, 0, 716], stops: [[0, '#f3f1eb'], [1, '#e9e8e3']] }, dir: .05, len: 1.3, size: .9, vary: .1, soft: 4 }); p.line([[1130, 700], [1180, 672], [1230, 660], [1290, 664]], { color: '#a3b0b9', w: 2.2, press: .4, taper: [.3, .5] }); p.line([[1500, 674], [1640, 665], [1760, 655]], { color: '#a3b0b9', w: 2.2, press: .34, taper: [.3, .5] });
      // ---- the window, and her
      p.layer('s06window', { every: 2, depth: 1 });
      p.mass([[1354, 494], [1494, 490], [1498, 650], [1350, 654]], { sharp: true, color: '#c3ccd2', dir: 1.5, size: .5, len: .6, vary: .2 });
      const glow = mixc('#c98c48', '#f7bd5c', clamp(k)), pane = [[WN.x0, WN.y0], [WN.x1, WN.y0 - 3], [WN.x1 + 1, WN.y1 - 2], [WN.x0 - 1, WN.y1]];
      p.mass(pane, { sharp: true, color: { rad: [1446, 590, 110], stops: [[0, mixc('#e0a458', '#ffd888', clamp(k))], [.5, glow], [1, mixc('#8f6236', '#c8853c', clamp(k))]] }, dir: 1.2, size: .42, len: .5, vary: .12 });
      const lean = keys(t, [[3.1, 0], [3.7, 2, 'out'], [4.3, 2], [5.0, 9, 'io'], [5.9, 9], [6.4, 12, 'io'], [9, 12]]), br = 1.1 * noise1(s.abs * .55, 4), hx = 1429 - lean * 1.25, hy = 567 - lean * .1 + br;
      p.clip(pane, () => {
        // her shape behind the misted glass
        p.mass([[hx - 46, 660], [hx - 40, hy + 46], [hx - 26, hy + 27], [hx - 9, hy + 19], [hx - 9, hy + 9], [hx + 10, hy + 9], [hx + 11, hy + 19], [hx + 30, hy + 29], [hx + 42, hy + 50], [hx + 48, 660]], { color: { lin: [hx - 46, 620, hx + 48, 600], stops: [[0, '#7d5130'], [1, '#4a2e1e']] }, size: .4, len: .5, dir: .8, vary: .15, soft: 1.6 });
        p.mass([[hx - 17, hy - 8], [hx - 12, hy - 23], [hx + 2, hy - 27], [hx + 15, hy - 21], [hx + 19, hy - 6], [hx + 14, hy + 8], [hx + 3, hy + 17], [hx - 8, hy + 15], [hx - 15, hy + 5]], { color: '#7a4628', size: .32, len: .36, dir: 1, vary: .1, soft: 1.2 });
        p.mass([[hx - 14, hy - 12], [hx - 13, hy - 24], [hx + 2, hy - 29], [hx + 17, hy - 23], [hx + 22, hy - 5], [hx + 25, hy + 5], [hx + 17, hy + 12], [hx + 12, hy - 4], [hx + 3, hy - 15]], { color: '#2f1c14', size: .32, len: .36, dir: .6, vary: .15, soft: .8 });
        // the mist on the panes
        p.shade(pane, { sharp: true, color: '#f6e2b6', alpha: .4 - .05 * clear, soft: 0, mode: 'over' });
        if (hand > .02) { // the hand comes up out of her shawl, flat on the glass, and goes round
          const a = -1.9 + turn * TAU, cx = 1406, cy = 570, R = 13 * ss(0, .25, wipe), X = lerp(1418, cx, hand) + Math.cos(a) * R, Y = lerp(652, cy + 8 * (1 - ss(0, .2, wipe)), hand) + Math.sin(a) * R * .95;
          if (clear > .01) { // the place she has rubbed clear: light, and her face in it
            const r = 30 * clear, sh = U.lump(cx + 4, cy - 2, r * 1.08, r, 7, { n: 12, rough: .09 });
            p.mass(sh, { color: { rad: [cx + 20, cy + 14, 46], stops: [[0, '#ffe7a6'], [.6, '#fbc768'], [1, '#e0a04c']] }, size: .34, len: .4, dir: .9, vary: .08 });
            p.clip(sh, () => { const fx = hx - 3, fy = hy + 3, dk = { color: '#24150f', w: 3, press: .95, wobble: .15, taper: [.15, .2] };
              p.mass([[fx - 4, fy + 16], [fx + 12, fy + 14], [fx + 18, fy + 40], [fx - 12, fy + 40]], { color: '#a86a3c', size: .3, len: .3, vary: .04 });
              p.mass([[fx - 16, fy - 12], [fx - 8, fy - 22], [fx + 6, fy - 24], [fx + 18, fy - 14], [fx + 20, fy + 2], [fx + 12, fy + 15], [fx, fy + 21], [fx - 9, fy + 18], [fx - 15, fy + 8], [fx - 18, fy - 2]], { color: { lin: [fx - 18, 0, fx + 20, 0], stops: [[0, '#f3c38b'], [1, '#b97842']] }, size: .28, len: .32, dir: 1.2, vary: .03 });
              [[-6, -19, 4, -25, 16, -17, 22, -2, 22, 10], [-6, -19, 6, -20, 16, -11, 19, 0, 20, 12], [-6, -19, -13, -15, -17, -7, -18, 1]].forEach(q => { const a2 = []; for (let m = 0; m < q.length; m += 2) a2.push([fx + q[m], fy + q[m + 1]]); p.line(a2, { color: '#33201a', w: 7, press: 1, wobble: .3, taper: [.05, .2] }); }); p.line([[fx - 7, fy - 20], [fx + 4, fy - 28], [fx + 18, fy - 22], [fx + 25, fy - 6]], { color: '#33201a', w: 8, press: 1, wobble: .3, taper: [.1, .2] });
              p.line([[fx - 12, fy - 1.2], [fx - 8.5, fy - 2.4], [fx - 5, fy - .6]], { color: '#4a2a1c', w: 2, press: .9, wobble: .15, taper: [.15, .2] }); p.line([[fx - 10.4, fy - .4], [fx - 8.6, fy + .4]], dk); p.line([[fx + 3, fy - 1.2], [fx + 7.5, fy - 2.6], [fx + 12, fy + .2]], { color: '#4a2a1c', w: 2, press: .9, wobble: .15, taper: [.15, .2] }); p.line([[fx + 4.6, fy - .4], [fx + 6.6, fy + .4]], dk);
              p.line([[fx - 14, fy - 6], [fx - 9, fy - 8.4], [fx - 5, fy - 8]], { color: '#4a2c1e', w: 1.9, press: .7, wobble: .2 }); p.line([[fx + 2, fy - 8.4], [fx + 8, fy - 9], [fx + 14, fy - 5]], { color: '#4a2c1e', w: 1.9, press: .7, wobble: .2 }); p.line([[fx - 2, fy - 2], [fx - 6, fy + 6], [fx - 3, fy + 7.4]], { color: '#9a5f38', w: 1.8, press: .6, wobble: .2 }); p.line([[fx - 6, fy + 12.4], [fx - 2, fy + 12], [fx + 3, fy + 12.6]], { color: '#7a3f2a', w: 2.2, press: .75, wobble: .2 }); p.line([[fx - 18, fy - 2], [fx - 15, fy + 8], [fx - 9, fy + 18], [fx, fy + 21]], { color: '#8a5230', w: 1.8, press: .5, wobble: .3 }); });
            p.line(sh.slice(1, 8), { color: '#fff6dc', w: 2, press: .5, wobble: .6, taper: [.2, .4], medium: 'crayon' }); if (clear > .7) { const dy = 12 * ss(5.9, 7.2, t); p.line([[cx - 10, cy + r - 2], [cx - 11, cy + r + 6 + dy]], { color: '#ffe2a0', w: 2.2, press: .6 * ss(5.6, 6, t), wobble: .4, taper: [.1, .5] }); }
          }
          const rest = ss(5.85, 6.35, t), HX = lerp(X, 1387, rest), HY = lerp(Y, 596, rest); // it stays there, against the cold
          p.mass([[HX + 2, HY + 4], [HX + 14, HY + 2], [1440, 634], [1442, 664], [1404, 664], [1396, 640]], { color: '#7a4f2e', size: .34, len: .4, dir: .9, vary: .1, soft: 1 }); p.mass([[HX - 8, HY + 4], [HX - 9, HY - 8], [HX - 5, HY - 15], [HX + 1, HY - 12], [HX + 7, HY - 15], [HX + 10, HY - 5], [HX + 9, HY + 6], [HX + 1, HY + 10]], { color: '#c28250', size: .28, len: .3, dir: 1.2, vary: .05 }); [[-5, -1], [1, 0], [6, 1]].forEach(q => p.line([[HX + q[0], HY - 4], [HX + q[0] * .9 - .4, HY - 14 + Math.abs(q[0]) * .3]], { color: '#6b3f22', w: 1.6, press: .6, wobble: .2, taper: [.1, .3] })); p.line([[HX - 9, HY + 4], [HX - 10, HY - 8], [HX - 5, HY - 16]], { color: '#5a351f', w: 1.8, press: .55, wobble: .3 });
        }
        // frost in the corners
        p.mass([[WN.x0, WN.y0], [WN.x0 + 34, WN.y0 - 2], [WN.x0 + 12, WN.y0 + 14], [WN.x0, WN.y0 + 36]], { color: '#f4f1e8', alpha: .8, size: .34, len: .34, dir: .8, vary: .1 }); p.mass([[WN.x1, WN.y1], [WN.x1 - 40, WN.y1], [WN.x1 - 16, WN.y1 - 12], [WN.x1, WN.y1 - 34]], { color: '#f2efe6', alpha: .8, size: .34, len: .34, dir: .8, vary: .1 }); p.mass([[WN.x0, WN.y1], [WN.x0 + 24, WN.y1], [WN.x0 + 8, WN.y1 - 10], [WN.x0, WN.y1 - 22]], { color: '#f2efe6', alpha: .7, size: .34, len: .34, dir: .8, vary: .1 });
      });
      // bars, reveal, snow on the sill
      p.line([[1370, 540], [1424, 538], [1478, 537]], { color: '#6b5238', w: 6, press: .9, taper: [0, 0], wobble: .8 }); p.line([[1424, 506], [1424, 539]], { color: '#6b5238', w: 5, press: .9, taper: [0, 0], wobble: .8 }); [[[1370, 634], [1371, 507]], [[1368, 508], [1480, 504]], [[1478, 505], [1480, 632]]].forEach(q => p.line(q, { color: '#4f4a44', w: 3.6, press: .7, wobble: 1, taper: [.05, .1] })); p.mass([[1346, 654], [1350, 636], [1400, 630], [1450, 634], [1496, 630], [1504, 650], [1430, 656]], { color: '#f7f5f0', size: .5, len: .6, dir: 0, vary: .08 }); p.line([[1346, 655], [1430, 658], [1504, 651]], { color: '#8f9ca6', w: 2.6, press: .5, taper: [.2, .3] });
      p.shade(U.lump(1424, 572, 130, 130, 3, { rough: .15 }), { color: '#ffdf9e', alpha: .2 * k * (.8 + .4 * clear), soft: 40, mode: 'multiply' });
      // ---- the thread on the snow: pressed in, stitch by stitch, half covered already
      p.layer('s06thread', { every: 3, depth: .95 });
      const T = U.track(A.spline(PATH, 10)), buried = keys(t, [[4.9, 0], [8, 1, 'lin']]); let d = 2, i = 0;
      while (d < T.len - 6) {
        const q0 = T.s(d), f = far(q0[1]), near = .3 + .7 * f, r = hash(i, 2, 5), L = (16 + 74 * r * r + (r > .86 ? 40 : 0)) * near, gap = (7 + 15 * Math.pow(hash(i, 3, 5), 2)) * near, w = 1.5 + 3.6 * f * f + .9 * f, gone = clamp(buried * 1.6 - hash(i, 9, 2) - .5 * f), n = Math.max(2, Math.round(L / (9 * near + 3))), P = [];
        for (let j = 0; j <= n; j++) { const u = j / n, z = T.s(Math.min(T.len, d + L * u)), sd = [-Math.sin(z[2]), Math.cos(z[2])], o = 3.2 * near * noise1((d + L * u) / 40, 4) + 2 * near * noise1((d + L * u) / 13, 6), end = Math.min(u, 1 - u) * 2; P.push([z[0] + sd[0] * o, z[1] + sd[1] * o + (1 - Math.min(1, end * 2.4)) * 2.2 * near, .45 + .6 * Math.min(1, end * 2.2)]); }
        p.line(P.map(z => [z[0] + w * .25, z[1] + w * .95 + .6, z[2]]), { color: '#b4c3cd', w: w * 1.9, press: .5, taper: [.25, .3], wobble: .5, medium: 'crayon' }); p.line(P.map(z => [z[0], z[1] - w * 1.0, z[2]]), { color: '#fffdf8', w: w * .9, press: .75, taper: [.3, .3], wobble: .6, medium: 'crayon' });
        p.line(P, { color: mixc('#b12f29', '#d9968e', gone * .7), w: w * (1.1 - .4 * gone), press: 1, taper: [.14, .18], wobble: .6, medium: 'crayon' }); if (f > .3 && n > 2) p.line(P.slice(0, -1).map(z => [z[0], z[1] - w * .24, z[2] * .7]), { color: '#d4685a', w: w * .4, press: .55, taper: [.2, .4], medium: 'crayon', wobble: .4 });
        d += L + gap; i++;
      }
      // ---- what stands up out of the snow
      [[150, 1036, 120, -.22, 0], [196, 1012, 196, -.08, 1], [224, 1026, 138, .16, 2], [262, 1018, 226, .07, 0], [300, 1034, 104, .3, 1], [1726, 1032, 148, -.12, 2], [1762, 1022, 204, .1, 0], [1800, 1038, 112, .26, 1]].forEach((q, j) => { const b = q[3] + .025 * noise1(tau * .6 + j, 5), l = q[2], X = u => [q[0] + Math.sin(b * u * 1.7) * l * u, q[1] - l * u * (1 - .1 * u * Math.abs(b))], tip = X(1), ink = ['#8d8064', '#6f6551', '#9a8a68'][j % 3]; p.line([X(0), X(.35), X(.7), tip], { color: ink, w: 2.2, press: .75, taper: [.03, .2], wobble: .8 });
        if (q[4] === 0) for (let m = 0; m < 7; m++) { const z = X(.8 + m * .032), an = -1.57 + b * 1.6 + (m % 2 ? .62 : -.62) * (1 - m * .08); p.line([z, [z[0] + Math.cos(an) * 10, z[1] + Math.sin(an) * 10]], { color: ink, w: 2.6, press: .7, taper: [.05, .5], wobble: .5 }); if (m === 4) p.line([[z[0] - 7, z[1] - 4], [z[0] + 6, z[1] - 5]], { color: '#fdfcf8', w: 5, press: 1, medium: 'crayon', taper: [.3, .3], wobble: .5 }); }
        else if (q[4] === 1) { for (let m = -2; m <= 2; m++) { const an = -1.57 + b + m * .42; p.line([tip, [tip[0] + Math.cos(an) * 15, tip[1] + Math.sin(an) * 15]], { color: ink, w: 2, press: .65, taper: [.05, .5], wobble: .4 }); p.line([[tip[0] + Math.cos(an) * 14 - 3, tip[1] + Math.sin(an) * 15 - 1], [tip[0] + Math.cos(an) * 14 + 3, tip[1] + Math.sin(an) * 15 - 2]], { color: '#fdfcf8', w: 4.4, press: 1, medium: 'crayon', taper: [.2, .2], wobble: .4 }); } }
        else { p.line([X(.55), [X(.55)[0] + 22, X(.55)[1] - 6], [X(.55)[0] + 34, X(.55)[1] + 12]], { color: ink, w: 1.8, press: .6, taper: [.05, .5] }); p.mass([[tip[0] - 5, tip[1] + 5], [tip[0] - 4, tip[1] - 7], [tip[0] + 5, tip[1] - 7], [tip[0] + 6, tip[1] + 4]], { color: ink, size: .3, len: .3, vary: .1 }); p.line([[tip[0] - 6, tip[1] - 8], [tip[0], tip[1] - 11], [tip[0] + 7, tip[1] - 8]], { color: '#fdfcf8', w: 5.4, press: 1, medium: 'crayon', taper: [.2, .2], wobble: .4 }); }
        p.mass([[q[0] - 13, q[1] + 5], [q[0] - 2, q[1] - 5], [q[0] + 15, q[1] + 4]], { color: '#f5f3ee', size: .5, len: .5, vary: .05 }); p.line([[q[0] + 2, q[1] + 4], [q[0] + 15, q[1] + 5]], { color: '#a9b8c3', w: 2, press: .4, taper: [.2, .4] }); });
      // ---- snow falling, flake by flake
      p.layer('s06snow', { every: 2, depth: 1 });
      flakes(p, tau, 0, 1);
    }
  });
})();
