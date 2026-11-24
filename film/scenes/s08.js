// s08  "Oh Danny boy, oh Danny boy, I love you so"
// FEELING  all her love in one finger wound with thread, and then rest.
// BEATS    0.0 she winds, eyes on the thread · 0.8 "Danny": her eyes go first, then her head; lips almost say it; she listens into the dark the thread comes from
//          2.8 a blink, back down to the thread; 3.0 one more turn · 4.6 "boy": the thread gives a small tremble from its far end; she stops, follows it with her eyes, sure of him
//          5.5 "I love you so": brow gives, eyes fill; 6.4 one tear starts, 6.9 runs, waits on the cheek, goes on; the smile comes from under it; 7.1-7.8 the eyes close and stay closed
//          7.0-8.2 the last turn slows and is not finished; 7.9-9.3 hand and head come down, the thread goes slack. After 9.3 only the fire moves.
// EYE      lit face -> red thread -> hand -> face. VALUES lightest the fire side of the face and the fingers, darkest the room behind her; one cold thing, the window.
(function () {
  const B = window.BIDE, A = B.anim, { lerp, clamp, mixc, noise1, hash } = A;
  // a limb, finger, lock of hair: centre line + half widths -> closed outline
  function tube(pts, ws, o = {}) { const c = A.spline(pts, 6), n = c.length - 1, L = [], R = []; for (let i = 0; i <= n; i++) { const a = c[Math.max(0, i - 1)], b = c[Math.min(n, i + 1)], d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / d, ny = (b[0] - a[0]) / d, u = i / n * (ws.length - 1), j = Math.min(ws.length - 2, Math.floor(u)), w = lerp(ws[j], ws[j + 1], u - j); L.push([c[i][0] + nx * w, c[i][1] + ny * w]); R.push([c[i][0] - nx * w, c[i][1] - ny * w]); if (i === n && o.round !== false) { const tx = (b[0] - a[0]) / d, ty = (b[1] - a[1]) / d; L.push([c[i][0] + nx * w * .62 + tx * w * .78, c[i][1] + ny * w * .62 + ty * w * .78]); R.push([c[i][0] - nx * w * .62 + tx * w * .78, c[i][1] - ny * w * .62 + ty * w * .78]); } } return { poly: L.concat(R.slice().reverse()), L, R, c }; }

  // ---------------------------------------------------------------- the face, three-quarter, looking left. local px, between the eyes = 0,0
  function face(p, f) {
    const L = f.light, sm = f.smile, lid = f.lid, cl = 1 - lid, sw = f.sw || 0;
    const K = (d, l, k = 1) => mixc(d, l, clamp(L * k));
    const skin = { lin: [-240, 70, 168, 0], stops: [[0, K('#9a6040', '#ffd29a')], [.27, K('#8a563a', '#f9bd84')], [.5, K('#754a35', '#df9a66')], [.72, K('#54352c', '#95593f')], [1, '#3c2929']] };
    const ink = '#26170f', ink2 = '#5a3021', ink3 = '#7c472f';
    // neck, old and corded, mostly lost
    p.mass([[-56, 240], [40, 236], [110, 130], [140, 20], [206, 40], [226, 170], [236, 290], [200, 380], [60, 470], [-20, 430], [-12, 330]], { color: { lin: [-60, 320, 220, 250], stops: [[0, K('#55352a', '#8d5a3c')], [.4, K('#422a24', '#5d3a2c')], [1, '#2a2022']] }, dir: 1.3, size: .6, len: .7, vary: .2 });
    p.line([[2, 296], [12, 350], [6, 420]], { color: '#24150f', w: 3.4, press: .5 }); p.line([[60, 290], [86, 360], [84, 450]], { color: '#24150f', w: 3, press: .4 }); p.line([[-14, 300], [-4, 350]], { color: K('#6b4330', '#c98a58'), w: 4, press: .5, medium: 'crayon' });
    // bun
    p.mass([[222, 44], [262, 14], [312, 22], [344, 64], [342, 116], [304, 152], [250, 154], [216, 116]], { color: { lin: [216, 100, 350, 60], stops: [[0, '#4c4143'], [.55, '#6c6468'], [1, '#8793a6']] }, around: [282, 86], size: .45, len: .6, vary: .3 });
    [[236, 60, 284, 34, 322, 66, 308, 112, 266, 122], [250, 76, 282, 56, 304, 80, 288, 102], [228, 110, 262, 142, 310, 134, 336, 96]].forEach((q, i) => { const a = []; for (let j = 0; j < q.length; j += 2) a.push([q[j], q[j + 1]]); p.line(a, { color: i === 1 ? '#3a3234' : '#a5a7ac', w: 2.6, press: .5, taper: [.2, .5], wobble: 1.3 }); });
    // face
    const F = [[-112, -238], [-146, -222], [-179, -164], [-191, -100], [-180, -44], [-190, -4], [-207, 34], [-203 - 3 * sm, 88], [-186 - 4 * sm, 146], [-172, 200], [-149, 250], [-112, 283], [-58, 286], [14, 260], [88, 200], [134, 128], [156, 40], [150, -60], [110, -170], [20, -240]];
    p.mass(F, { color: skin, dir: 1.15, size: .48, len: .55, vary: .03, dens: 1.6 });
    // the side of the head turns away from the fire; the edge of that shadow swings with the flame
    const s1 = [[70, -240], [34, -130], [66, -64], [52, 6], [28, 60], [66, 130], [30, 220], [-6, 300], [190, 300], [230, 0], [170, -230]].map(q => [q[0] + (q[0] < 100 ? sw : 0), q[1]]);
    p.shade(s1, { color: '#4f3030', alpha: .62, soft: 30 });
    p.shade([[112, -130], [100, 0], [92, 100], [100, 200], [220, 170], [230, -100]], { color: '#281d26', alpha: .62, soft: 24 });
    p.shade([[-230, -330], [-170, -216], [-60, -190], [40, -166], [140, -160], [140, -330]], { color: '#7a4e3c', alpha: .5, soft: 46 });
    // temple hollow, sockets
    p.shade([[50, -84], [86, -60], [80, -10], [58, -10], [52, -40]], { color: '#5a3328', alpha: .5, soft: 18 });
    p.shade([[-82, -34], [-30, -50], [30, -42], [66, -12], [52, 24], [0, 36], [-56, 28], [-84, 4]], { color: '#8a5238', alpha: .5, soft: 14 });
    p.shade([[-122, -34], [-150, -46], [-186, -36], [-196, 2], [-164, 22], [-128, 14]], { color: '#a5633f', alpha: .42, soft: 10 });
    // nose: its near side is in shadow, and it throws a small shadow up and away from the fire
    p.shade([[-106, -60], [-82, -40], [-74, 4], [-72, 52], [-66, 90], [-80, 120], [-112, 124], [-114, 80], [-120, 20], [-120, -30]], { color: '#5d3426', alpha: .64, soft: 8 });
    p.shade([[-74, 8], [-44, 20], [-44, 70], [-72, 96], [-78, 50]], { color: '#6b3d2c', alpha: .36, soft: 16 });
    p.shade([[-150, 110], [-104, 118], [-82, 120], [-90, 134], [-128, 132]], { color: '#5d2f20', alpha: .55, soft: 6 });
    // what age did: fold, hollow, jowl, corners
    p.shade([[-88, 92], [-52, 116], [-30, 164], [-36, 222], [-54, 216], [-52, 170], [-76, 128]], { color: '#62372a', alpha: .56, soft: 9 });
    p.shade([[-8, 108], [44, 116], [44, 186], [4, 216], [-18, 178]], { color: '#6e3f2e', alpha: .5, soft: 22 });
    p.shade([[-188, 118], [-168, 130], [-160, 168], [-176, 178]], { color: '#8c5238', alpha: .4, soft: 10 });
    p.shade([[-142, 206], [-104, 211], [-58, 212], [-72, 226], [-110, 227], [-138, 220]], { color: '#7c4430', alpha: .5, soft: 8 });
    p.shade([[-62, 264], [-10, 250], [60, 220], [120, 170], [130, 230], [40, 300], [-60, 304]], { color: '#4a2a22', alpha: .56, soft: 18 });
    p.shade([[-60, 226], [-30, 214], [0, 232], [-14, 256], [-46, 256]], { color: '#7a4631', alpha: .34, soft: 14 });
    // lights
    const li = (sh, a, so, c) => p.shade(sh, { color: c || '#ffab62', alpha: a * .72 * clamp(L * 1.05), soft: so, mode: 'screen' });
    li([[-204, 12], [-170, 16], [-146, 56], [-158, 104], [-196, 98], [-210, 52]], .46, 15); li([[-52, 44], [-10, 40], [24, 60], [6, 88], [-32, 92], [-54, 72]], .42, 18);
    li([[-126, -28], [-116, -8], [-120, 40], [-136, 84], [-164, 98], [-166, 82], [-146, 40], [-133, 0]], .54, 7, '#ffc078'); li([[-146, 238], [-110, 232], [-90, 248], [-104, 272], [-130, 268]], .2, 13); li([[-186, -88], [-150, -104], [-94, -96], [-96, -70], [-150, -66], [-184, -60]], .34, 13); li([[-150, 140], [-120, 136], [-100, 144], [-104, 162], [-140, 164]], .26, 9); li([[-80, -96], [-20, -108], [30, -84], [10, -72], [-60, -74]], .22, 14);
    p.shade([[-178, 70], [-160, 60], [-140, 90], [-158, 112], [-182, 104]], { color: '#e0643f', alpha: .2, soft: 14, mode: 'multiply' }); p.shade([[-36, 66], [10, 54], [36, 92], [-6, 118], [-44, 100]], { color: '#c8553a', alpha: .34, soft: 20 });

    // ---- eyes
    const nU = [[-62, 8], [-46, lerp(16, -4, lid)], [-16, lerp(23, -15, lid)], [14, lerp(21, -9, lid)], [40, 13]], nD = [[40, 13], [18, 19 - 4 * sm], [-10, 23 - 5 * sm], [-42, 17 - 2 * sm], [-62, 8]];
    const fU = [[-138, 8], [-148, lerp(14, -5, lid)], [-164, lerp(17, -11, lid)], [-180, lerp(13, -4, lid)], [-188, 7]], fD = [[-188, 7], [-178, 14 - 2 * sm], [-162, 17 - 4 * sm], [-146, 13 - 2 * sm], [-138, 8]];
    if (lid > .05) {
      const nE = nU.concat(nD.slice(1)), fE = fU.concat(fD.slice(1)), wh = K('#5d4436', '#b88c66', .95);
      p.mass(nE, { color: { lin: [-60, 10, 40, 0], stops: [[0, K('#6b4e3c', '#d2a67a')], [.6, wh], [1, K('#4c3830', '#8a664c')]] }, size: .28, len: .3, dir: 0, vary: .05 }); p.mass(fE, { color: K('#6b4e3c', '#cfa47a'), size: .28, len: .3, dir: 0, vary: .05 });
      const x = -20 + f.gx * 15, y = 4 + f.gy * 9, x2 = -161 + f.gx * 8, y2 = 4 + f.gy * 7;
      p.clip(nE, () => { p.mass(c => { c.beginPath(); c.arc(x, y, 21, 0, 7); }, { color: '#34241d', size: .26, len: .3, dir: 1, vary: .05 }); p.mass(c => { c.beginPath(); c.arc(x - 5, y + 6, 11, 0, 7); }, { color: K('#4a3325', '#96633a'), size: .26, len: .3, alpha: .9, soft: 3, vary: .05 }); p.mass(c => { c.beginPath(); c.arc(x, y, 8.5, 0, 7); }, { color: '#0f0a09', size: .26, len: .3, vary: 0 }); p.shade([[-70, -30], [50, -30], [44, 2], [0, lerp(22, -5, lid)], [-40, lerp(16, 2, lid)], [-66, 6]], { color: '#2a1812', alpha: .55, soft: 4 }); });
      p.clip(fE, () => { p.mass(c => { c.beginPath(); c.ellipse(x2, y2, 13, 18, 0, 0, 7); }, { color: '#34241d', size: .26, len: .3, dir: 1, vary: .05 }); p.mass(c => { c.beginPath(); c.ellipse(x2, y2, 5.5, 8, 0, 0, 7); }, { color: '#0f0a09', size: .26, len: .3, vary: 0 }); });
      const gl = clamp(lid * 2 - .3); if (gl > 0) { p.line([[x - 10, y - 3], [x - 5, y - 5]], { color: '#fff0cc', w: 4.6 + 3 * f.wet, press: 1 * gl, taper: [.1, .2], wobble: .2, medium: 'crayon' }); p.line([[x2 - 6, y2 - 2], [x2 - 3, y2 - 4]], { color: '#fff0cc', w: 4 + 2 * f.wet, press: .95 * gl, taper: [.1, .2], wobble: .2, medium: 'crayon' }); if (f.wet > .3) { p.line([[x + 7, y + 8], [x + 11, y + 6]], { color: '#f3c98c', w: 3.4, press: .8 * f.wet * gl, taper: [.2, .3], wobble: .2 }); } }
    }
    // lids over the balls of the eyes
    const nLid = [[-66, 5], [-50, lerp(-4, -18, lid)], [-12, lerp(-12, -30, lid)], [28, lerp(-8, -20, lid)], [54, 10], [40, 14], ...nU.slice(1, 4).reverse(), [-62, 8]], fLid = [[-134, 6], [-146, lerp(-4, -17, lid)], [-166, lerp(-6, -22, lid)], [-186, lerp(-2, -13, lid)], [-192, 7], ...fU.slice(1, 4).reverse()];
    p.mass(nLid, { color: { lin: [-70, 10, 60, -10], stops: [[0, K('#6f4330', '#d59a62')], [.5, K('#5d3a2b', '#b0744a')], [1, K('#54342a', '#8a563c')]] }, dir: .1, size: .32, len: .36, vary: .03, soft: 3 }); p.mass(fLid, { color: K('#7c4e36', '#dfa56c'), dir: .1, size: .3, len: .34, vary: .03, soft: 2.5 });
    if (cl > .3) { p.shade([[-46, 2], [-20, -8], [12, 0], [4, 12], [-30, 12]], { color: '#ffc988', alpha: .34 * cl * L, soft: 6, mode: 'screen' }); p.shade([[-152, 4], [-166, -4], [-178, 4], [-166, 12]], { color: '#ffc988', alpha: .3 * cl * L, soft: 4, mode: 'screen' }); }
    p.shade([[-66, -2], [-40, lerp(-2, -18, lid) + 6], [0, lerp(-6, -22, lid) + 8], [40, lerp(2, -8, lid) + 8], [40, 14], [0, lerp(22, -12, lid)], [-50, lerp(16, -2, lid)]], { color: '#7a4530', alpha: .22 + .2 * cl, soft: 5 });
    if (f.wet > .05 && lid > .05) { p.line([[-56, 12], [-30, 19 - 2 * sm], [-6, 22 - 5 * sm], [22, 18 - 4 * sm]], { color: '#ffecc6', w: 3.6 * f.wet, press: .85 * f.wet, taper: [.3, .4], wobble: .3 }); p.line([[-146, 12], [-162, 16 - 3 * sm], [-178, 13]], { color: '#ffecc6', w: 3 * f.wet, press: .85 * f.wet, taper: [.3, .4], wobble: .3 }); }
    p.line(nU, { color: '#1d110b', w: 6, press: .95, taper: [.3, .22], wobble: .5 }); p.line(fU, { color: '#1d110b', w: 5, press: .9, taper: [.25, .25], wobble: .5 });
    if (cl > .5) { for (let i = 0; i < 6; i++) { const u = .15 + i * .14, q = A.spline(nU, 6), z = q[Math.floor(u * (q.length - 1))]; p.line([z, [z[0] - 1 + i * 1.6, z[1] + 8 * cl]], { color: '#2a1812', w: 2, press: .5 * cl, taper: [.05, .6], wobble: .3 }); } }
    p.line(nD, { color: ink2, w: 2.6, press: .46, taper: [.3, .3], wobble: .6 }); p.line(fD, { color: ink3, w: 2.4, press: .42, taper: [.3, .3], wobble: .6 });
    // folds: hooded outer corner, bags, crow's feet
    const lf = 9 * cl; p.line([[-68, -4 + lf * .4], [-42, -22 + lf], [-4, -32 + lf], [34, -18 + lf], [60, 10], [68, 24]], { color: ink2, w: 3.4, press: .62, taper: [.25, .4], wobble: .8 }); p.line([[-132, -4], [-150, -20 + lf], [-172, -20 + lf], [-190, -6]], { color: '#6b3a28', w: 2.8, press: .55, taper: [.25, .3] });
    p.line([[-60, 30], [-30, 44], [6, 46 - 5 * sm], [46, 32 - 5 * sm]], { color: ink3, w: 2.8, press: .46, taper: [.35, .4] }); p.line([[-36, 56], [10, 62 - 4 * sm], [48, 46 - 5 * sm]], { color: ink3, w: 2.4, press: .34 + .2 * sm, taper: [.4, .4] }); p.line([[-146, 30], [-166, 37], [-188, 28]], { color: '#83492f', w: 2.4, press: .38, taper: [.35, .4] });
    [[54, 8, 82, -6, 98, -14], [58, 16, 90, 14, 110, 12], [52, 24, 80, 36, 100, 48], [46, 32, 66, 52, 80, 70]].forEach(q => p.line([[q[0], q[1]], [q[2], q[3] - 3 * sm], [q[4], q[5] - 6 * sm]], { color: '#48261b', w: 2.4, press: .44 + .22 * sm, taper: [.1, .6] }));
    // brows: soft, white, lifted inside when she aches
    const bi = f.browIn * 13, br = (x0, x1, k0, n, base) => { for (let i = 0; i < n; i++) { const u = i / (n - 1), x = lerp(x0, x1, u), dx = (x1 - x0) / n, y = base - 22 * Math.sin(u * 2.5) + 18 * u * u - bi * (1 - u) * 1.15; for (let j = 0; j < 2; j++) p.line([[x - dx * .4, y + 5 - j * 6 + 3 * u], [x + dx, y - 1 - j * 5 + 3 * u], [x + dx * 2.4, y + 1 - j * 3 + 7 * u]], { color: K('#7d6a5b', j ? '#f3d8aa' : '#cfae86', 1 - u * k0), w: 3, press: .5, taper: [.2, .6], wobble: .9, medium: j ? 'crayon' : 'graphite' }); } };
    p.shade([[-82, -54 - bi], [-30, -80 - bi * .4], [30, -70], [66, -44], [30, -56], [-30, -64 - bi * .4], [-78, -42 - bi]], { color: '#5d3728', alpha: .35, soft: 6 }); br(-78, 56, .7, 8, -54); br(-132, -184, .1, 5, -54);
    // forehead, frown
    [[-168, -146, -100, -154, -20, -142, 54, -118], [-164, -116 - bi * .5, -100, -124 - bi * .8, -30, -112 - bi * .4, 44, -94], [-152, -180, -90, -188, -20, -176, 24, -160]].forEach(q => p.line([[q[0], q[1]], [q[2], q[3]], [q[4], q[5]], [q[6], q[7]]], { color: '#5d3325', w: 2.8, press: .38 + .16 * f.browIn, taper: [.3, .4], wobble: 1.4 }));
    p.line([[-100, -46 - bi * .3], [-96, -74 - bi * .5], [-92, -92 - bi * .5]], { color: ink2, w: 3, press: .55, taper: [.2, .5] }); p.line([[-118, -50], [-120, -74 - bi * .5]], { color: '#6b3a28', w: 2.4, press: .45, taper: [.2, .5] });
    // ---- nose
    p.line([[-114, -48], [-126, -10], [-142, 34], [-163, 76], [-167, 95], [-154, 110]], { color: '#82472c', w: 3, press: .62, taper: [.5, .2], wobble: .7 }); p.line([[-154, 110], [-140, 114], [-124, 122], [-108, 120]], { color: '#48251a', w: 3.8, press: .78, taper: [.2, .2] }); p.line([[-94, 78], [-80, 95], [-83, 115], [-99, 121]], { color: '#4a2619', w: 3.2, press: .6, taper: [.35, .3] }); p.line([[-134, 113], [-121, 116], [-110, 113]], { color: '#1d0f0a', w: 5.4, press: .75, taper: [.3, .3] });
    p.line([[-154, 84], [-158, 92]], { color: '#fff0cf', w: 5, press: .7 * L, taper: [.3, .4], medium: 'crayon', wobble: .3 });
    // ---- mouth
    const mo = f.mOpen, up = -11 * sm, ox = 9 * sm, cf = [-160 - ox * .4, 178 + up], cn = [-50 + ox, 180 + up * 1.3], ro = f.mRound || 0, nx = 14 * ro; cf[0] += nx; cn[0] -= nx * 1.4;
    const oL = -146 + nx * .7, oR = -70 - nx * .9; if (mo > .03) p.mass([[oL, 177 + up * .6], [-132, 173], [-112, 177], [-92, 173], [oR, 178 + up * .6], [-88, 175 + mo * 32], [-112, 178 + mo * 40], [-134, 175 + mo * 30]], { color: '#4f251a', size: .28, len: .3, vary: .03 });
    p.shade([cf, [-134, 164], [-113, 168], [-92, 163], cn, [-84, 175], [-112, 177], [-136, 174]], { color: '#8a3e2a', alpha: .56, soft: 4 }); p.mass([[oL + 2, 179 + mo * 12], [-130, 177 + mo * 30], [-110, 180 + mo * 38], [-88, 177 + mo * 30], [oR + 2, 181 + mo * 10], [-82, 194 + mo * 26], [-112, 200 + mo * 32], [-138, 193 + mo * 24]], { color: K('#7c4232', '#d58860'), size: .3, len: .36, dir: 0, vary: .1, soft: 2, alpha: .85 });
    p.line([[-120, 190 + mo * 25], [-104, 191 + mo * 26]], { color: '#ffdfae', w: 4, press: .4 * L, taper: [.3, .4], medium: 'crayon' });
    const md = 5 * sm; p.line([cf, [-138, 173 + md * .5], [-124, 171 + md], [-112, 176 + md], [-98, 171 + md], [-74, 177 + md * .5], cn], { color: '#311510', w: 4.2, press: .88, taper: [.2, .2], wobble: .6 }); if (mo > .05) p.line([[oL, 178], [-134, 176 + mo * 30], [-112, 179 + mo * 39], [-88, 176 + mo * 31], [oR, 180]], { color: '#5a2a1d', w: 2.6, press: .55, taper: [.3, .3] });
    p.line([[cn[0] - 4, cn[1] - 7], [cn[0] + 6, cn[1] + 1], [cn[0] + 4, cn[1] + 17]], { color: '#3f1f15', w: 3.2, press: .6, taper: [.2, .6] }); p.line([[cf[0] + 2, cf[1] - 4], [cf[0] - 6, cf[1] + 2], [cf[0] - 3, cf[1] + 13]], { color: '#6b3826', w: 2.6, press: .5, taper: [.2, .6] });
    [[-140, 148, -137, 163], [-124, 144, -122, 160], [-100, 146, -101, 161], [-84, 150, -88, 165], [-66, 158, -71, 172]].forEach(q => p.line([[q[0], q[1]], [q[2], q[3]]], { color: ink3, w: 2.2, press: .34, taper: [.3, .4] })); [[-140, 204, -136, 216], [-84, 204, -78, 216]].forEach(q => p.line([[q[0], q[1]], [q[2], q[3]]], { color: ink3, w: 2, press: .3, taper: [.3, .4] }));
    p.line([[-86, 90], [-54, 116 - 3 * sm], [-30 + 5 * sm, 154 - 6 * sm], [-28 + 12 * sm, 196]], { color: '#3f2016', w: 3.6, press: .56 + .2 * sm, taper: [.25, .5], wobble: 1 }); p.line([[-168, 108], [-186 - 3 * sm, 138], [-178, 172]], { color: '#8a5034', w: 2.6, press: .4, taper: [.3, .5] });
    if (sm > .2) p.line([[-8 + 6 * sm, 134], [8 + 6 * sm, 164], [2 + 6 * sm, 196]], { color: ink2, w: 2.6, press: .4 * sm, taper: [.3, .5] });
    p.line([[-34, 206], [-40, 228], [-58, 250]], { color: ink2, w: 2.6, press: .42, taper: [.3, .5] }); p.line([[-136, 217], [-108, 223], [-78, 217]], { color: '#5d2f20', w: 2.8, press: .46, taper: [.35, .4] });
    [[24, 96, 30, 130, 20, 166], [46, 80, 60, 120, 52, 160], [10, 216, 34, 226, 60, 210]].forEach(q => p.line([[q[0], q[1]], [q[2], q[3]], [q[4], q[5]]], { color: '#48271d', w: 2.2, press: .3, taper: [.4, .5], wobble: 1.2 }));
    // contour: lit edge found, jaw lost
    p.line([[-152, -230], [-183, -164], [-193, -98], [-182, -46], [-191, -4], [-209, 34]], { color: '#8a4d2c', w: 3.2, press: .5, taper: [.3, .2], wobble: 1 }); p.line([[-209, 32], [-205 - 3 * sm, 88], [-188 - 3 * sm, 146], [-173, 202], [-153, 254], [-114, 288], [-60, 292]], { color: '#6e3a22', w: 3.6, press: .6, taper: [.1, .4], wobble: 1 }); p.line([[-64, 292], [12, 262], [76, 214]], { color: '#1d110c', w: 3.4, press: .6, taper: [.2, .6], wobble: 1 });
    // ear
    p.mass([[132, -6], [160, -24], [180, 6], [174, 54], [152, 84], [136, 66]], { color: '#4c312a', around: [156, 30], size: .36, len: .4, vary: .15 }); p.line([[148, -10], [168, 8], [162, 50], [146, 74]], { color: '#24150f', w: 3, press: .5 }); p.line([[142, 70], [154, 84], [168, 66]], { color: '#8a5a44', w: 3, press: .4 });
    // ---- hair: thin, parted in the middle, combed straight back over the ear into the knot
    const S0 = [[-122, -240], [-90, -232], [-44, -222], [4, -202], [46, -168], [72, -120], [86, -66], [98, -16], [112, 22], [146, 0], [186, 24], [214, 100], [240, 96], [266, 30], [274, -70], [250, -178], [190, -254], [96, -296], [-20, -298], [-96, -276]];
    p.mass(S0, { color: { lin: [-130, -220, 280, -60], stops: [[0, K('#86715d', '#e8caa0')], [.25, K('#6b5b50', '#ab947e')], [.5, '#5e5252'], [.8, '#423c44'], [1, '#4b5060']] }, dir: .6, size: .5, len: 1, vary: .15 });
    const E0 = [244, 84], roots = [[-116, -244], [-104, -262], [-70, -276], [-20, -288], [-60, -226], [-10, -208], [34, -180], [64, -136], [82, -84], [96, -30], [110, 14]], mids = [[[10, -298], [150, -262], [240, -150]], [[-10, -280], [128, -248], [222, -140]], [[20, -268], [120, -226], [206, -120]], [[60, -276], [160, -216], [232, -110]], [[20, -244], [112, -186], [192, -90]], [[56, -214], [128, -150], [196, -64]], [[84, -172], [140, -108], [200, -40]], [[104, -124], [150, -72], [206, -20]], [[116, -74], [156, -40], [208, 8]], [[126, -24], [164, -10], [212, 34]], [[140, -4], [172, 8], [214, 60]]];
    roots.forEach((r, i) => { const q = [r, ...mids[i], E0], lo = i > 3, t = lo ? (i - 4) / 6 : 0, w = lo ? 17 : 22, T = tube(q, [5, w, w + 3, w - 4, 8], { round: false }), v = [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1][i];
      p.mass(T.poly, { color: { lin: [r[0] - 10, r[1], E0[0], E0[1]], stops: [[0, K('#8a7462', v ? '#f8dfb2' : '#dfc298')], [.3, K('#6b5b51', v ? '#c3a685' : '#9c8571')], [.62, v ? '#5b5050' : '#4a4246'], [1, '#3a343a']] }, dir: Math.atan2(mids[i][1][1] - r[1], mids[i][1][0] - r[0]), size: .38, len: .95, vary: .14 });
      p.line(T.R.filter((_, j) => j % 3 === 0), { color: '#2a2224', w: 2.2, press: .34, taper: [.35, .5], wobble: 1.6 });
      for (let j = 0; j < 3; j++) { const o = (j - 1) * 9; p.line(q.map((z, m) => [z[0] + o * .4 + 7 * (hash(i, j, m) - .5), z[1] + o * .8 + 7 * (hash(i, j, m + 9) - .5)]).slice(0, 5 - (j === 2 ? 1 : 0)), { color: j === 1 ? K('#92806f', '#ffefcf') : K('#7a6d68', '#d8bf9c'), w: j === 1 ? 2.8 : 2.2, press: j === 1 ? .5 : .4, taper: [.04, .65], wobble: 1.6, medium: j === 1 ? 'crayon' : 'graphite' }); } });
    // short hairs where the forehead starts
    for (let i = 0; i < 26; i++) { const u = i / 25, q = A.spline(S0.slice(0, 9), 6), z = q[Math.floor(u * (q.length - 1))], an = lerp(-2.0, -.1, u) + .5 * (hash(i, 4, 4) - .5), l = 12 + 16 * hash(i, 5, 5); p.line([[z[0] - 6 * Math.cos(an) - 4, z[1] - 6 * Math.sin(an)], [z[0] + Math.cos(an) * l, z[1] + Math.sin(an) * l + 4]], { color: i % 3 ? K('#8d7c6c', '#f3dcb4', 1 - u * .4) : K('#5f4636', '#8a6448'), w: 2.2, press: .5, taper: [.3, .5], wobble: .8 }); }
    // the far side of the parting
    p.mass([[-114, -250], [-142, -242], [-168, -212], [-184, -164], [-179, -156], [-164, -192], [-140, -220], [-112, -234]], { color: K('#8b7560', '#f3d8aa'), dir: 2.2, size: .34, len: .5, vary: .1 }); [[-116, -246, -150, -224, -180, -172], [-114, -240, -144, -214, -170, -180]].forEach(q => p.line([[q[0], q[1]], [q[2], q[3]], [q[4], q[5]]], { color: K('#9b8a78', '#fff0d0'), w: 2.4, press: .5, taper: [.1, .6] })); p.line([[-92, -284], [-108, -264], [-114, -240]], { color: '#7d4f38', w: 4, press: .6, taper: [.4, .2] });
    p.shade([[90, -110], [112, -40], [122, 22], [160, 6], [214, 100], [270, 80], [250, -40], [160, -130]], { color: '#1f1a20', alpha: .46, soft: 22 });
    // cold edge from the window, flyaways
    p.line([[262, -120], [275, -60], [270, 0], [256, 50]], { color: '#8b9db8', w: 5, press: .6, taper: [.3, .4], medium: 'crayon' }); p.line([[150, -274], [212, -230], [250, -170], [266, -106]], { color: '#7588a6', w: 4, press: .5, taper: [.4, .3], medium: 'crayon', wobble: 1.6 }); p.line([[300, 20], [344, 60], [344, 112], [308, 150]], { color: '#8b9db8', w: 4.4, press: .6, taper: [.3, .4], medium: 'crayon' });
    const w0 = f.wisp || 0; [[30, -298, 70, -316, 120, -308], [150, -276, 196, -268, 228, -234], [-60, -292, -30, -306, 10, -304], [256, -150, 282, -110, 286, -60], [236, 96, 252, 140, 240, 176], [206, 100, 214, 150, 196, 190]].forEach((q, i) => p.line([[q[0], q[1]], [q[2], q[3]], [q[4] + w0 * .3, q[5]]], { color: i < 3 ? K('#6b5d55', '#cdb595', .7) : '#6f7687', w: 2, press: .42, taper: [.1, .7], wobble: 1.4 }));
    p.line([[62, -118], [86 + w0, -54], [84 + w0 * 1.6, 0], [96 + w0 * 2, 44]], { color: K('#8d7c6c', '#e2c8a0', .8), w: 2.2, press: .5, taper: [.1, .6] }); p.line([[74, -96], [100 + w0, -30], [104 + w0 * 1.4, 30]], { color: K('#6d6058', '#b99f82', .8), w: 2, press: .42, taper: [.1, .6] }); p.line([[-130, -244], [-168, -214], [-192 - w0 * .6, -160]], { color: K('#a08b74', '#ffe9c2'), w: 2.2, press: .55, taper: [.1, .6] });
    // ---- the tear
    if (f.tear >= 0) {
      const path = A.spline([[-30, 23 - 4 * sm], [-28, 44], [-20, 74], [-16, 106], [-26, 138], [-20, 172], [-14, 206], [-24, 246]], 8), m = path.length - 1, at = clamp(f.tear) * m, j = Math.floor(at), tr = path.slice(0, j + 1), e = path[j];
      if (tr.length > 2) { p.line(tr.map((q, i) => [q[0] + 4, q[1], .4 + .6 * i / tr.length]), { color: '#5a2e20', w: 2.6, press: .34, taper: [.2, .05], wobble: .3 }); p.line(tr.map((q, i) => [q[0], q[1], (.3 + .5 * hash(i >> 2, 3, 3)) * (.5 + .5 * i / tr.length)]), { color: '#ffe7ba', w: 3.4, press: .55, taper: [.2, .05], wobble: .3 }); }
      const r = 1 + .25 * (f.tear < .06 ? f.tear / .06 - 1 : 0); p.mass([[e[0] - 6 * r, e[1] - 1], [e[0], e[1] - 12 * r], [e[0] + 6 * r, e[1] - 1], [e[0] + 5 * r, e[1] + 7 * r], [e[0] - 1, e[1] + 10 * r], [e[0] - 6 * r, e[1] + 6 * r]], { color: '#f0bf8a', size: .28, len: .3, vary: 0 }); p.line([[e[0] - 2.5, e[1] - 5], [e[0] - 3, e[1] + 5]], { color: '#fffbee', w: 5, press: 1, taper: [.2, .2], wobble: .2, medium: 'crayon' }); p.line([[e[0] - 4, e[1] + 10], [e[0] + 3, e[1] + 9], [e[0] + 6, e[1] + 2]], { color: '#4a2519', w: 2.4, press: .6, wobble: .2 });
    }
  }
  // ---------------------------------------------------------------- her left hand, back to us, the first finger wound with thread. wrist = 0,0, fingers point left
  function hand(p, h) {
    const L = h.light, K = (d, l, k = 1) => mixc(d, l, clamp(L * k)), tx = h.tx, ty = h.ty, cu = h.curl;
    const out = (a, o = {}) => p.line(a, Object.assign({ color: '#2a170f', w: 3, press: .62, taper: [.15, .35], wobble: .7 }, o)), th3 = (a, o) => out(a.filter((_, j) => j % 3 === 0), o);
    const skin = (x0, y0, x1, y1, a, m, z) => ({ lin: [x0, y0, x1, y1], stops: [[0, K('#9a6040', a || '#ffd9a4')], [.35, K('#7f4e36', m || '#eaa869')], [.75, K('#5d3828', '#a5673f')], [1, z || '#4a2d24']] });
    // sleeve behind the wrist
    const sl = tube([[-6, 6], [120, 34], [300, 110], [470, 220]], [60, 72, 100, 130], { round: false });
    // the fingers folded under, low to high so each overlaps the last
    const bump = (pts, ws, c) => { const T = tube(pts, ws); p.mass(T.poly, { color: c, dir: .5, size: .34, len: .45, vary: .04, dens: 1.4 }); return T; };
    const d1 = 10 * cu;
    const lt = bump([[-128, 46], [-172 + d1, 64], [-186 + d1, 88], [-166 + d1, 104]], [23, 19, 17, 13], skin(-210, 110, -110, 30)); th3(lt.L, { press: .5, color: '#6e3b22' }); out([[-176 + d1, 52], [-168 + d1, 62], [-170 + d1, 74]], { w: 2.2, press: .4 });
    const rg = bump([[-148, 14], [-206 + d1, 30], [-222 + d1, 60], [-196 + d1, 80]], [26, 22, 19, 15], skin(-250, 80, -130, 0)); th3(rg.L, { press: .55, color: '#6e3b22' }); th3(rg.R, { press: .5 }); out([[-208 + d1, 16], [-200 + d1, 28], [-202 + d1, 42]], { w: 2.2, press: .4 });
    const md = bump([[-160, -22], [-226 + d1, -10], [-246 + d1, 24], [-218 + d1, 48]], [28, 24, 21, 16], skin(-270, 50, -140, -40)); th3(md.L, { press: .58, color: '#6e3b22' }); th3(md.R, { press: .55 }); out([[-228 + d1, -28], [-218 + d1, -12], [-220 + d1, 4]], { w: 2.4, press: .45 });
    // back of the hand
    const BK = [[26, -46], [-40, -64], [-104, -76], [-154, -72], [-178, -48], [-186, -14], [-176, 22], [-156, 54], [-122, 72], [-72, 70], [-20, 56], [26, 48]];
    p.mass(BK, { color: skin(-190, 70, 40, -90, '#fbcb90', '#dd9b62', '#4f3126'), dir: .12, size: .44, len: .6, vary: .05, dens: 1.5 });
    p.shade([[-176, -20], [-120, -8], [-60, -16], [-40, -60], [-150, -74]], { color: '#8a5238', alpha: .34, soft: 14 }); p.shade([[-60, 30], [20, 10], [40, 60], [-60, 76]], { color: '#6b3d2b', alpha: .3, soft: 18 });
    // tendons, veins, knuckles
    [[6, -18, -70, -34, -148, -48], [4, 4, -70, -8, -160, -12], [4, 22, -60, 22, -148, 24], [6, 36, -50, 46, -122, 52]].forEach((q, i) => { out([[q[0], q[1]], [q[2], q[3] + 3], [q[4], q[5]]], { color: '#8a5234', w: 3.4, press: .36, taper: [.3, .4], wobble: 1.4 }); p.line([[q[0] - 10, q[1] + 5], [q[2], q[3] + 9], [q[4] + 10, q[5] + 5]], { color: K('#9a6a48', '#ffe3b4'), w: 3.2, press: .4, taper: [.3, .4], medium: 'crayon' }); });
    [[-168, -46, 13], [-180, -10, 14], [-170, 24, 13], [-148, 54, 11]].forEach(q => { p.shade([[q[0] - q[2], q[1]], [q[0], q[1] - q[2]], [q[0] + q[2] * 1.3, q[1]], [q[0], q[1] + q[2]]], { color: '#ffcb8c', alpha: .4 * L, soft: 6, mode: 'screen' }); out([[q[0] + 4, q[1] - q[2] * .8], [q[0] + 10, q[1]], [q[0] + 6, q[1] + q[2] * .8]], { color: '#8a4d30', w: 2.4, press: .4, taper: [.3, .4] }); });
    [[-96, 20, -70, 30, -58, 44], [-110, -30, -84, -24, -60, -32]].forEach(q => out([[q[0], q[1]], [q[2], q[3]], [q[4], q[5]]], { color: '#86685c', w: 3, press: .3, taper: [.3, .4], wobble: 1.6 }));
    // first finger: out along the thread
    const ix = [[-146, -54], [-228 + tx * .2, -88 + ty * .3 + cu * 8], [-286 + tx * .6 + cu * 8, -98 + ty * .7 + cu * 26], [-332 + tx + cu * 22, -90 + ty + cu * 58]], IX = tube(ix, [28, 24, 19, 12]);
    p.mass(IX.poly, { color: skin(-300, -50, -260, -130, '#ffdcaa', '#f0b074'), dir: .25, size: .34, len: .5, vary: .04, dens: 1.5 });
    th3(IX.L, { w: 2.8, press: .55, color: '#6e3b22' }); th3(IX.R, { w: 3.2, press: .68 }); const K1 = ix[1]; [[0], [9], [17]].forEach(q => out([[K1[0] - 6 + q[0], K1[1] - 18], [K1[0] - 2 + q[0], K1[1] - 4], [K1[0] - 4 + q[0], K1[1] + 10]], { w: 2, press: .42, color: '#6b3826', taper: [.3, .4] })); const K2 = ix[2]; [[0], [7]].forEach(q => out([[K2[0] - 2 + q[0], K2[1] - 13], [K2[0] + 2 + q[0], K2[1]], [K2[0] + q[0], K2[1] + 9]], { w: 2, press: .36, color: '#6b3826' }));
    const e = ix[3], e2 = ix[2], ea = Math.atan2(e[1] - e2[1], e[0] - e2[0]); p.line([[e[0] + 4, e[1] - 10], [e[0] - 7, e[1] - 5], [e[0] - 9, e[1] + 3]].map(q => q), { color: K('#b07a55', '#fff0cf'), w: 4, press: .55, taper: [.2, .4], medium: 'crayon' });
    // the thread, wound round and round
    const c = IX.c, at = u => { const i = clamp(u) * (c.length - 1), j = Math.min(c.length - 2, Math.floor(i)), f = i - j, a = c[j], b2 = c[j + 1], q = c[Math.max(0, j - 1)]; return [lerp(a[0], b2[0], f), lerp(a[1], b2[1], f), Math.atan2(b2[1] - q[1], b2[0] - q[0])]; };
    const n = Math.floor(h.loops), fr = h.loops - n, uOf = i => .36 + (i % 9) * .035 + .005 * (hash(i, 3, 3) - .5), wOf = u => lerp(27, 17, (u - .33) / .42);
    for (let i = 0; i < n + (fr > .02 ? 1 : 0); i++) { const u = uOf(i), z = at(u), w = wOf(u) + (i > 8 ? 3 : 1), nx = -Math.sin(z[2]), ny = Math.cos(z[2]), tl = 4 * (hash(i, 5, 5) - .5), ax = Math.cos(z[2]), ay = Math.sin(z[2]), pts = []; for (let j = 0; j <= 6; j++) { const v = lerp(-1, 1, j / 6), bow = 7 * (1 - v * v); pts.push([z[0] + nx * w * v + ax * (bow + tl * v), z[1] + ny * w * v + ay * (bow + tl * v)]); } const k = Math.max(3, Math.ceil(7 * (i < n ? 1 : fr))); const q = pts.slice(0, k); p.line(q.map(v => [v[0] + 2, v[1] + 1]), { color: '#4d1216', w: 9.5, press: .85, taper: [.04, .04], wobble: .3 }); p.line(q, { color: i % 3 === 1 ? '#c93c31' : '#b52e29', w: 7.2, press: 1, taper: [.06, .06], wobble: .5, medium: 'crayon' }); p.line(q.slice(2, 6).map(v => [v[0] - 2, v[1] + 1]), { color: K('#b4433a', '#f59a74'), w: 2.4, press: .6, taper: [.3, .4], wobble: .4, medium: 'crayon' }); }
    // thumb on top, its ball on the wound thread
    const th = [[-34, -44], [-110, -104], [-180 + h.rub * .5, -130], [-238 + h.rub, -118 + ty * .35 + cu * 10]], TH = tube(th, [36, 29, 23, 14]);
    p.mass(TH.poly, { color: skin(-220, -90, -60, -150, '#fdd09a', '#dc9a60'), dir: .4, size: .36, len: .5, vary: .05, dens: 1.5 }); p.shade([[-236, -100], [-180, -108], [-110, -80], [-50, -40], [-110, -64], [-190, -92]], { color: '#6b3a28', alpha: .3, soft: 7 });
    th3(TH.R, { w: 3.2, press: .66 }); th3(TH.L, { w: 3, press: .58 }); const T2 = th[2]; [[0], [9]].forEach(q => out([[T2[0] + q[0] + 4, T2[1] - 16], [T2[0] + q[0] + 2, T2[1] - 2], [T2[0] + q[0] + 8, T2[1] + 12]], { w: 2, press: .42, color: '#5d3020' })); const tp = th[3]; p.line([[tp[0] - 8, tp[1] - 9], [tp[0] + 10, tp[1] - 14], [tp[0] + 24, tp[1] - 14]], { color: K('#a0694a', '#ffe6bd'), w: 3.2, press: .5, taper: [.2, .5], medium: 'crayon' });
    out([[-156, 56], [-120, 74], [-70, 72], [-20, 58], [22, 50]], { color: '#7a4327', w: 3, press: .55 }); out([[-40, -66], [0, -56], [26, -48]], { w: 3, press: .6 });
    // cuff
    p.mass(sl.poly, { color: { lin: [-20, 120, 260, -20], stops: [[0, K('#80624c', '#e3b68c')], [.4, K('#5b4338', '#9c6f54')], [1, '#2e2223']] }, dir: .4, size: .55, len: .7, vary: .12 }); p.mass([[4, -62], [34, -60], [46, 0], [36, 66], [2, 62], [10, 0]], { color: { lin: [0, 66, 40, -62], stops: [[0, K('#9c8364', '#f3d4a2')], [.5, K('#77624a', '#bf9a6c')], [1, '#4a3b31']] }, dir: 1.5, size: .4, len: .5, vary: .1 }); out([[4, -62], [12, 0], [3, 62]], { w: 3.2, press: .62 }); out([[36, -60], [47, 0], [37, 66]], { w: 2.6, press: .5 }); [[60, -50, 110, -30, 200, 0], [70, 30, 120, 60, 200, 110], [60, 0, 110, 14, 170, 50]].forEach(q => out([[q[0], q[1]], [q[2], q[3]], [q[4], q[5]]], { w: 2.4, press: .36, taper: [.1, .6] }));
    p.shade([[60, 70], [200, 60], [520, 160], [520, 400], [100, 280]], { color: '#171316', alpha: .7, soft: 40 });
    const z = at(uOf(Math.max(0, Math.ceil(h.loops) - 1))), w = wOf(.5); return { x: z[0] + Math.sin(z[2]) * w * -.2 - 8, y: z[1] + w * .86 };
  }

  // ---------------------------------------------------------------- the shot
  const keys = A.keys;
  const FIRE = t => { const slow = .5 + .5 * noise1(t * .55, 11), lick = noise1(t * 2.6, 5), q = noise1(t * 6.1, 9); let v = .85 + .11 * slow + .09 * lick + .05 * q; const pop = hash(Math.floor(t * 1.15), 3, 8); const ph = (t * 1.15) % 1; if (pop > .7) v -= .13 * Math.exp(-5 * ph) * (1 - ph); return v; };
  function act(t) {
    const G = {};
    G.lid = keys(t, [[0, .56], [.72, .56], [.9, .72, 'out'], [2.74, .7], [2.84, .06, 'in'], [2.95, .06], [3.12, .56, 'out'], [4.72, .56], [4.95, .74, 'out'], [5.9, .72], [6.3, .66], [6.75, .55], [7.1, .36], [7.75, 0, 'io'], [12, 0]]);
    G.gx = keys(t, [[0, -.3], [.74, -.3], [.86, -.95, 'out'], [2.8, -.95], [3.0, -.3, 'out'], [4.74, -.3], [4.92, -1, 'out'], [5.95, -1], [6.3, -.5], [8, -.45]]);
    G.gy = keys(t, [[0, .85], [.74, .85], [.86, -.1, 'out'], [2.8, -.1], [3.0, .85, 'out'], [4.74, .85], [4.92, .3, 'out'], [5.95, .28], [6.3, .6], [8, .8]]);
    G.rot = keys(t, [[-.6, -.175], [.8, -.175], [1.5, -.075, 'settle'], [2.85, -.085], [3.7, -.17], [4.8, -.172], [5.5, -.12, 'out'], [6.2, -.12], [7.0, -.142], [7.9, -.15], [9.2, -.215, 'io'], [12, -.215]]);
    G.dy = keys(t, [[-.6, 8], [.8, 8], [1.5, -8, 'settle'], [2.9, -6], [3.8, 8], [4.8, 8], [5.6, -4, 'out'], [6.5, -4], [7.2, -12, 'io'], [8.8, 11, 'io'], [9.6, 15, 'io']]);
    G.dx = keys(t, [[.8, 0], [1.6, 7, 'out'], [2.9, 6], [3.8, 0], [4.9, 0], [5.6, -10, 'out'], [6.8, -8], [9.2, -2]]);
    G.mOpen = keys(t, [[.78, 0], [.96, .2, 'out'], [1.12, .06], [1.28, .17], [1.5, .04], [1.72, .02], [1.86, .2, 'out'], [2.3, .12], [2.6, 0], [3.5, 0], [3.7, .13, 'out'], [3.9, .04], [4.2, .03], [4.56, 0], [4.7, .14, 'out'], [5.2, .05], [5.4, 0], [5.8, .02], [6.0, .14, 'out'], [6.35, .05], [6.5, .1], [6.9, 0], [12, 0]]);
    G.mRound = keys(t, [[1.6, 0], [1.84, .9, 'out'], [2.3, .7], [2.7, 0], [4.5, 0], [4.7, .7, 'out'], [5.3, 0], [6.3, 0], [6.6, .5], [7, 0]]);
    G.smile = keys(t, [[0, .22], [.9, .18], [1.5, .34], [2.7, .28], [3.6, .18], [4.7, .1], [5.4, .02], [5.9, .02], [6.5, .28, 'io'], [7.2, .92, 'io'], [8.3, 1], [9.4, .84], [12, .82]]);
    G.browIn = keys(t, [[0, .2], [.85, .2], [1.15, .65, 'out'], [2.8, .55], [3.4, .25], [4.8, .3], [5.1, .7, 'out'], [5.9, .95], [6.5, 1], [7.3, .55], [8.6, .12], [12, .1]]);
    G.wet = keys(t, [[1.2, .2], [2.6, .35], [4.8, .35], [5.6, .75], [6.5, 1], [8.2, 1]]);
    G.tear = t < 6.4 ? -1 : keys(t, [[6.4, 0], [6.74, .05], [6.84, .1], [7.12, .4, 'out'], [7.65, .46], [7.9, .5], [8.45, .8, 'io'], [9.5, .86]]);
    G.breath = keys(t, [[-1, 0], [.2, 1], [1.6, .1], [3, 1], [4.4, .1], [5.5, .9], [6.3, .2], [7.2, 1.5, 'io'], [8.9, -.4, 'io'], [12, -.4]]);
    // the winding: each turn is a small circle of the finger, with a rest after it; the last one does not finish
    const T = [[-.9, 0], [-.1, .9], [.25, 1], [.7, 1.12], [3.0, 1.15], [3.35, 1.3, 'in'], [4.1, 2.1, 'io'], [4.5, 2.3], [4.64, 2.34], [5.9, 2.36], [6.2, 2.5, 'in'], [6.8, 3.0, 'io'], [7.0, 3.06], [8.2, 3.42, 'out'], [12, 3.42]], tw = keys(t, T), am = keys(t, [[6.9, 1], [8.2, .45, 'out'], [8.8, 0]]); const a = tw * Math.PI * 2 - .6;
    G.tx = Math.cos(a) * 9 * am; G.ty = Math.sin(a) * 19 * am; G.loops = 5 + tw; G.rub = keys(t, [[1, 0], [1.6, -9], [2.4, -2], [3, 0], [5.2, 0], [5.8, -10], [6.2, -1], [7.0, -8], [8.1, 4, 'io']]) + 3 * Math.sin(a) * am;
    G.curl = keys(t, [[0, .1], [.8, .1], [1.4, .3], [2.9, .3], [3.3, .1], [4.6, .12], [4.8, 0, 'out'], [6, .1], [7.9, .22], [9.05, .95, 'io']]);
    G.hx = keys(t, [[.8, 0], [1.6, 5], [3, 5], [3.6, 0], [4.64, 0], [4.76, -9, 'out'], [5.2, -3, 'settle'], [6.2, 0], [7.8, 4], [9.15, 22, 'io']]); G.hy = keys(t, [[.8, 0], [1.6, 8], [3, 8], [3.6, 0], [4.64, 0], [4.76, 3, 'out'], [5.4, 0], [6.0, -2], [7.15, -10], [7.9, 0], [9.2, 74, 'io']]); G.hr = keys(t, [[.8, 0], [1.6, .03], [3.2, 0], [4.7, -.02], [7.8, 0], [9.15, -.16, 'io']]);
    G.sag = keys(t, [[-.6, 54], [0, 46], [.8, 60], [2.6, 62], [3.6, 40], [4.1, 52], [4.64, 50], [4.74, 18, 'out'], [5.2, 34, 'settle'], [6.2, 38], [6.7, 30], [7.9, 46], [9.35, 118, 'io']]);
    return G;
  }
  B.scene({
    id: 's08', ink: 'dark',
    draw(p, s) {
      const t = s.t, G = act(t), W = B.world, fl = FIRE(s.abs) * keys(t, [[8.0, 1], [10, .86]]), sw = 32 * noise1(s.abs * 1.9, 21) + 12 * noise1(s.abs * 4.7, 2), dark = '#1d191d';
      p.paper('#32261f');
      p.layer('s08wall', { every: 3, depth: .15 });
      p.mass([[-30, -30], [1950, -30], [1950, 1110], [-30, 1110]], { sharp: true, color: { rad: [150 + sw * .4, 1010, 1780], stops: [[0, mixc('#6d4226', '#b87740', fl)], [.26, mixc('#4a3022', '#7d5232', fl)], [.52, mixc('#33261f', '#4b3529', fl)], [.8, '#262026'], [1, dark]] }, dir: .35, len: 1.3, size: 1.25, vary: .35 });
      p.shade([[-60, -60], [700, -60], [500, 160], [-60, 300]], { color: '#1c171a', alpha: .6, soft: 90 }); p.shade([[300, 990], [960, 940], [1700, 990], [1960, 1120], [200, 1120]], { color: '#171416', alpha: .75, soft: 44 });
      // the window: the only cold thing in the room
      p.layer('s08window', { every: 6, depth: .3, still: true });
      p.mass([[1496, 28], [1866, 20], [1872, 596], [1490, 604]], { sharp: true, color: { lin: [1490, 0, 1870, 0], stops: [[0, '#2c2527'], [1, '#423c40']] }, dir: 1.5, size: .8, len: .9, vary: .3 });
      p.mass([[1544, 62], [1826, 56], [1830, 548], [1540, 554]], { sharp: true, color: { lin: [1540, 60, 1830, 550], stops: [[0, '#1f2b45'], [.55, '#2f4361'], [1, '#5d7590']] }, dir: -.5, size: .9, len: .9, vary: .3 });
      p.mass([[1541, 520], [1590, 516], [1660, 498], [1730, 470], [1790, 440], [1829, 424], [1830, 548], [1540, 554]], { color: '#8398ad', dir: .08, size: .6, len: .9, vary: .25 }); p.shade([[1541, 520], [1829, 512], [1830, 552], [1540, 556]], { color: '#3a4a63', alpha: .5, soft: 10 });
      [[1556, 80], [1610, 110], [1700, 84], [1776, 130], [1640, 200], [1580, 260], [1742, 250], [1806, 210], [1690, 330], [1600, 380], [1780, 370]].forEach((q, i) => p.line([[q[0] - 2, q[1]], [q[0] + 2.5, q[1] + 1.5]], { color: '#b9c6d2', w: 4 + 2 * hash(i, 3, 3), press: .7, taper: [.2, .2], wobble: .4, medium: 'crayon' }));
      p.line([[1684, 58], [1686, 300], [1685, 552]], { color: '#1d181a', w: 15, press: .95, taper: [0, 0], medium: 'crayon' }); p.line([[1542, 304], [1690, 301], [1829, 300]], { color: '#1d181a', w: 13, press: .95, taper: [0, 0], medium: 'crayon' }); p.line([[1692, 60], [1693, 300], [1692, 550]], { color: '#6f86a0', w: 3, press: .5 });
      p.mass([[1462, 590], [1880, 580], [1900, 618], [1440, 630]], { sharp: true, color: { lin: [1440, 0, 1900, 0], stops: [[0, '#3a3030'], [.5, '#5f6672'], [1, '#49505c']] }, dir: 0, size: .5, len: .9, vary: .25 }); p.line([[1444, 631], [1660, 625], [1900, 619]], { color: '#151214', w: 4, press: .7 }); [[[1542, 556], [1544, 60]], [[1544, 58], [1828, 54]], [[1828, 56], [1831, 548]], [[1494, 600], [1497, 30]]].forEach(q => p.line(q, { color: '#151214', w: 4, press: .6, wobble: 1.3 }));
      // her
      p.layer('s08her', { every: 1, depth: 1 });
      const ox = 1050 + G.dx, oy = 396 + G.dy - 2.2 * G.breath, br = G.breath;
      // shawl behind the neck, then head, then the shawl's front edge
      const sh = (d, l, k) => mixc(d, l, clamp(fl * k)), yb = -5 * br;
      p.mass([[1296, 596], [1350, 640 + yb], [1452, 716 + yb], [1570, 836 + yb], [1650, 1000], [1676, 1130], [620, 1130], [664, 1000], [744, 884 + yb * .6], [846, 800 + yb], [930, 762 + yb], [1010, 740], [1150, 700]], { color: { lin: [660, 900, 1560, 780], stops: [[0, sh('#6b4c2c', '#d9a154', 1)], [.26, sh('#573d28', '#ab753c', 1)], [.6, sh('#402c24', '#6b452b', 1)], [1, '#2a1f21']] }, dir: .9, size: .85, len: .8, vary: .35 });
      p.push(); p.translate(ox, oy); p.rotate(G.rot); face(p, { lid: G.lid, gx: G.gx, gy: G.gy, mOpen: G.mOpen, mRound: G.mRound, smile: G.smile, browIn: G.browIn, wet: G.wet, tear: G.tear, light: fl, sw, wisp: 4 * noise1(s.abs * .9, 4) }); p.pop();
      // blouse at the throat, the near fold of the shawl drawn up round the neck
      p.mass([[986, 770 + yb], [1050, 800 + yb], [1110, 900], [1080, 1000], [960, 960], [920, 830 + yb]], { color: { lin: [920, 900, 1110, 840], stops: [[0, sh('#6b5640', '#e0bd88', 1)], [1, '#4a3a2e']] }, dir: 1.2, size: .55, len: .7, vary: .12 });
      p.mass([[1306, 560], [1352, 628 + yb], [1330, 720 + yb], [1250, 820 + yb], [1150, 910], [1086, 1010], [1040, 1130], [900, 1130], [1000, 980], [1070, 880 + yb], [1150, 780 + yb], [1230, 690 + yb], [1270, 620]], { color: { lin: [960, 980, 1330, 700], stops: [[0, sh('#63452b', '#c08a48', 1)], [.4, sh('#4a3326', '#7c5330', 1)], [1, '#2e2123']] }, dir: 2.3, size: .7, len: .8, vary: .3 });
      p.mass([[930, 758 + yb], [980, 772 + yb], [1000, 860], [960, 980], [900, 1130], [760, 1130], [800, 960], [862, 838 + yb]], { color: { lin: [780, 900, 1000, 900], stops: [[0, sh('#74522f', '#e6b163', 1)], [.6, sh('#573d28', '#b07b41', 1)], [1, '#4a3126']] }, dir: 1.9, size: .7, len: .8, vary: .3 });
      const kn = (a, w, pr, c) => p.line(a, { color: c || '#241a15', w, press: pr, taper: [.15, .4], wobble: 1.4 });
      kn([[1306, 562], [1268, 622], [1228, 692 + yb], [1148, 782 + yb], [1068, 882 + yb], [998, 982], [930, 1090]], 4, .7); kn([[930, 758 + yb], [984, 774 + yb], [1002, 860], [962, 980], [905, 1100]], 4, .62); kn([[1352, 632 + yb], [1332, 720 + yb], [1252, 820 + yb], [1152, 912], [1088, 1012]], 3.2, .5); kn([[846, 800 + yb], [744, 884 + yb * .6], [664, 1002], [630, 1090]], 3.4, .4, '#7a5330'); kn([[1452, 716 + yb], [1570, 836 + yb], [1652, 1000], [1676, 1100]], 4, .5, '#6f7c90');
      for (let i = 0; i < 9; i++) { const u = i / 8, x = lerp(1180, 1560, u), y = lerp(860, 900, u); kn([[x, y + yb], [x - 40 + 30 * u, y + 90], [x - 60 + 60 * u, y + 200]], 2.4, .3); } for (let i = 0; i < 7; i++) { const u = i / 6, x = lerp(720, 880, u), y = lerp(960, 850, u); kn([[x, y], [x + 10, y + 60], [x + 4, y + 130]], 2.4, .28, '#5d4329'); }
      // fringe of knitted stitches on the lit edge
      for (let i = 0; i < 12; i++) { const u = i / 11, x = lerp(936, 896, u) + 40 * Math.sin(u * 3), y = lerp(790, 1080, u); p.line([[x, y + yb], [x - 10, y + 10 + yb], [x - 22, y + 8 + yb]], { color: sh('#7d6140', '#e9c486', 1), w: 4, press: .5, taper: [.1, .5], medium: 'crayon', wobble: .8 }); }
      // the hand and the thread
      p.shade([[-60, 1000], [500, 930], [760, 950], [1000, 980], [1500, 960], [1980, 1000], [1980, 1140], [-60, 1140]], { color: '#2a1d1b', alpha: .7, soft: 46 });
      const hx = 952 + G.hx, hy = 842 + G.hy + yb * .7, ha = .2 + G.hr; p.layer('s08hand', { every: 1, depth: 1 });
      p.push(); p.translate(hx, hy); p.rotate(ha); const e = hand(p, { light: fl * 1.02, tx: G.tx, ty: G.ty, curl: G.curl, loops: G.loops, rub: G.rub }); p.pop();
      const ex = hx + e.x * Math.cos(ha) - e.y * Math.sin(ha), ey = hy + e.x * Math.sin(ha) + e.y * Math.cos(ha);
      const x0 = -40, y0 = 724; const pts = [[ex + 2, ey], [lerp(ex, x0, .1), lerp(ey, y0, .1) + G.sag * .42], [lerp(ex, x0, .45), lerp(ey, y0, .45) + G.sag * 1.15], [lerp(ex, x0, .78), lerp(ey, y0, .78) + G.sag * .72], [x0, y0]];
      W.thread(p, pts, { w: 8.5, fuzz: 1, slack: .5, seed: 8, t: s.abs, pull: [{ t0: 58.3 + 4.6, amp: 15, speed: 1900, from: 1, freq: 3.4 }, { t0: 58.3 + .2, amp: 5 }, { t0: 58.3 + 3.9, amp: 5 }, { t0: 58.3 + 6.9, amp: 4 }] });
      // the firelight lies over everything and breathes
      p.air({ rad: [170 + sw, 1060, 1900], stops: [[0, '#fff4dc'], [.34, '#fbe0ba'], [.62, '#b39a92'], [1, '#4d4658']], alpha: .42, mode: 'multiply' });
      p.air({ rad: [60 + sw, 1120, 900], stops: [[0, '#c8722c'], [.5, '#4a2610'], [1, '#000000']], alpha: .34 * fl, mode: 'screen' });
    }
  });
  B.test.s08face = function (p, k) {
    p.paper('#3a2a21'); p.layer('bg', { every: 4, depth: .2 }); p.mass([[-20, -20], [1940, -20], [1940, 1100], [-20, 1100]], { sharp: true, color: { rad: [100, 1000, 1700], stops: [[0, '#8a5630'], [.4, '#4a3226'], [1, '#1d1a1e']] }, dir: .3, vary: .4 });
    p.layer('f', { every: 1, depth: 1 });
    const o = [{ lid: .62, gx: -.2, gy: .6 }, { lid: .8, gx: -.9, gy: -.1, mOpen: .3, mRound: .4, browIn: .6 }, { lid: .72, gx: -.5, gy: .2, smile: .5, wet: 1, tear: .4, browIn: .9 }, { lid: 0, smile: 1, tear: .85, browIn: .3 }][Math.floor(k) % 4];
    p.push(); p.translate(1010, 400); p.rotate(-.12); face(p, Object.assign({ lid: 1, gx: 0, gy: 0, mOpen: 0, smile: 0, browIn: .2, wet: 0, tear: -1, light: 1, wisp: 0 }, o)); p.pop();
  };
})();
