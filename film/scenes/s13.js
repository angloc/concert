(function () {
  const B = window.BIDE, A = B.anim; B.test = B.test || {};
  const { clamp, lerp, keys, mixc } = A;

  // s13  "And kneel and say an Ave there for me"   97.6 - 105.1
  // FEELING: fifty years late, and the body hardly able to get down to it.
  // BEATS: -0.4..0.3 (And) he stands, a hand finds the top of the stone. 0.3 breath up. 0.66..1.22 (kneel) first knee; 1.22..2.0 he stops there, hanging on the stone, the arm shakes, he breathes.
  //        2.0 gathers; 2.1..2.6 (say) the second knee drops; 2.6..3.05 he lets himself back on his heels.
  //        3.05 CLOSE (an Ave there): bowed head, scarf ends in both hands, lips going, uneven, with stops. 5.17 (me): the brow gives way, the hands close, the shoulders hold, one second. 6.1 it goes out of him. then still.
  // EYE: wide: the red on the dark coat, the hand on the stone. close: closed eye -> lips -> hands.
  // VALUE: light sky behind; coat darkest; the rim of sun on the back, ear and crown is the only bright edge.

  // ---- the old man's head, drawn for this shot: three-quarter to the right, 560 high, origin in the middle of the skull.
  // o: x,y,s,rot, face, lids 0..1, squeeze 0..1, grief 0..1 (inner brow up), knit 0..1, mOpen, mPull (corners down), chin 0..1, tear
  // light: {key:'#', amb:'#', side:-1 sun behind / +1 sun in front, k}
  function headOld(p, o) {
    const gr = o.grief || 0, kn = o.knit || 0, sq = o.squeeze || 0, mo = o.mOpen || 0, mp = o.mPull || 0, ch = o.chin || 0, lid = o.lids || 0, gx = o.gx || 0, gy = o.gy || 0, soc = o.soc == null ? 1 : o.soc;
    const Lk = Object.assign({ skin: '#cfa181', lit: '#f0c796', sh: '#7a5647', deep: '#54392f', hair: '#c9c2b6', hairL: '#f4ead4', hairD: '#8a837b', ink: '#352b26', k: 1 }, o.light || {});
    const ink = Lk.ink, sk = Lk.skin, sh = Lk.sh;
    const ln = (pts, st) => p.line(pts, Object.assign({ color: ink, w: 3, press: .7, taper: [.15, .3], wobble: .8 }, st));
    p.push(); p.translate(o.x, o.y); p.rotate((o.rot || 0) * (o.face || 1)); p.scale((o.s || 1) * (o.face || 1), o.s || 1);

    // skull + face in one shape
    const face = [[-178, 196], [-214, 120], [-236, 50], [-256, -50], [-246, -146], [-200, -228], [-116, -280], [-18, -296], [82, -280], [154, -236], [196, -172], [214, -112], [224, -64], [214, -30], [204, 0], [214, 30], [219, 62], [214, 104], [204, 138], [207, 160 - 3 * mo], [213, 178 - 3 * mo], [207, 189], [210, 203 + 11 * mo], [199, 218 + 11 * mo], [200, 238 + 12 * mo - 3 * ch], [180, 262 + 13 * mo - 4 * ch], [134, 272 + 13 * mo - 4 * ch], [56, 250 + 9 * mo], [-22, 208 + 4 * mo], [-84, 168], [-118, 220]];
    p.mass(face, { color: sk, dir: 1.15, size: .6, len: .7, vary: .28 });
    const inFace = fn => p.clip(face, fn);
    // nose (breaks the far contour)
    const nose = [[158, -30], [178, -16], [196, 28], [226, 74], [243, 101], [238, 120], [216, 131], [186, 137], [158, 138], [140, 122], [142, 98], [156, 70], [152, 20]];
    p.mass(nose, { color: mixc(sk, '#c98d6f', .22), dir: 1.0, size: .5, len: .5, vary: .25 });

    // ---- form: big soft planes first
    inFace(() => {
      if (!Lk.front) p.shade([[60, -300], [160, -250], [250, -100], [240, 120], [230, 300], [100, 310], [118, 230], [150, 150], [128, 60], [140, -40], [120, -140]], { color: sh, alpha: .46 * Lk.k, soft: 38 }); // the front of the face turns away from the sun
      else { p.shade([[-260, -100], [-100, -120], [-40, 0], [-10, 120], [20, 280], [-120, 260], [-260, 120]], { color: sh, alpha: .34 * Lk.k, soft: 48 }); p.shade([[20, -230], [190, -180], [214, -110], [150, -84], [60, -100]], { color: Lk.lit, alpha: .3 * Lk.k, soft: 30, mode: 'screen' }); p.shade([[60, 30], [124, 40], [130, 90], [84, 110], [50, 84]], { color: Lk.lit, alpha: .3 * Lk.k, soft: 20, mode: 'screen' }); }
      p.shade([[-60, 190], [10, 160], [80, 176], [116, 226], [130, 280], [30, 262], [-60, 216]], { color: sh, alpha: .42, soft: 24 }); // under the cheek, jaw
      p.shade([[-24, 70], [40, 84], [92, 126], [96, 176], [60, 196], [10, 168], [-22, 120]], { color: sh, alpha: .42, soft: 26 }); // hollow cheek
      p.shade([[-70, -70], [-20, -104], [10, -60], [4, 0], [-40, 20], [-72, -10]], { color: sh, alpha: .34, soft: 24 }); // temple
      p.shade([[0, -48], [70, -62], [140, -44], [146, 10], [120, 36], [60, 44], [10, 30]], { color: sh, alpha: .5 * soc, soft: 17 }); // eye socket
      p.shade([[176, -46], [226, -50], [224, 20], [200, 44], [172, 24]], { color: sh, alpha: .62, soft: 13 });
      p.shade([[-180, 200], [-100, 150], [-84, 190], [-110, 240]], { color: Lk.deep, alpha: .34, soft: 18 });
      p.shade([[130, 208], [200, 208], [202, 220], [160, 230], [128, 220]], { color: sh, alpha: .34, soft: 9 }); // under the lip
      p.shade([[150, 250], [196, 236], [200, 290], [140, 296]], { color: sh, alpha: .3 + .3 * ch, soft: 12 });
      // warm places: cheek, ear side, nose
      p.shade([[40, 60], [110, 50], [128, 96], [80, 126], [44, 104]], { color: '#c46f4f', alpha: .24, soft: 20 });
    });
    p.shade([[176, 60], [246, 96], [240, 124], [190, 140], [150, 138], [150, 112], [190, 108]], { color: sh, alpha: .55, soft: 10 }); // under the nose
    p.shade([[196, 60], [240, 92], [236, 116], [206, 112]], { color: '#b5664c', alpha: .28, soft: 9 });
    // sun from behind: the cheekbone, jaw edge and the top of the brow catch it
    if (!Lk.front) inFace(() => {
      p.shade([[-110, -60], [-30, -90], [30, -70], [50, -30], [10, 30], [60, 62], [20, 86], [-40, 70], [-90, 60]], { color: Lk.lit, alpha: .34 * Lk.k, soft: 30, mode: 'screen' });
      p.shade([[-100, 140], [-60, 130], [0, 196], [40, 240], [10, 262], [-60, 214]], { color: Lk.lit, alpha: .3 * Lk.k, soft: 16, mode: 'screen' });
      p.shade([[-10, -230], [90, -230], [150, -170], [120, -120], [40, -140], [-10, -180]], { color: Lk.lit, alpha: .26 * Lk.k, soft: 24, mode: 'screen' });
    });

    // ---- hair: thin, white, combed forward; the crown shows through
    const hair = [[-176, 190], [-222, 128], [-250, 56], [-270, -50], [-258, -154], [-208, -242], [-118, -296], [-14, -312], [92, -294], [142, -256], [110, -240], [66, -246], [30, -214], [-2, -168], [-22, -116], [-40, -70], [-58, -26], [-62, 16], [-66, 64], [-84, 92], [-96, 60], [-104, 4], [-128, -22], [-152, -6], [-160, 50], [-156, 116], [-166, 170]];
    p.mass(hair, { color: Lk.hair, dir: -.5, size: .55, len: .9, vary: .4 });
    p.clip(hair, () => {
      if (!o.cap) p.shade([[-60, -300], [60, -310], [140, -260], [60, -220], [-10, -190], [-60, -240]], { color: '#c9a184', alpha: .36, soft: 24 }); // scalp through the thin top
      p.shade([[-160, 200], [-240, 100], [-200, 60], [-150, 40], [-120, -10], [-60, -40], [-30, -110], [-70, 100]], { color: Lk.hairD, alpha: .6, soft: 22 });
      p.shade([[-280, -40], [-262, -160], [-200, -250], [-100, -305], [20, -312], [40, -280], [-80, -262], [-170, -190], [-220, -90], [-226, 20], [-260, 20]], { color: Lk.hairL, alpha: .6 * Lk.k, soft: 16, mode: 'screen' });
    });
    if (!o.cap) for (let i = 0; i < 30; i++) { // combed strands, wrapping the skull
      const u = i / 29, a = -2.75 + u * 2.0, r0 = 150 + 34 * p.fix(i, 3), r1 = 262 + 24 * p.fix(i, 4), cx = -18, cy = -20; const x0 = cx + Math.cos(a - .35) * r1 * 1.0, y0 = cy + Math.sin(a - .35) * r1 * 1.03, xm = cx + Math.cos(a - .1) * (r1 - 18), ym = cy + Math.sin(a - .1) * (r1 - 14) * 1.06, x1 = cx + Math.cos(a + .25) * (r0 + 60), y1 = cy + Math.sin(a + .25) * (r0 + 70);
      ln([[x0, y0], [xm, ym], [x1, y1]], { color: i % 3 === 0 ? Lk.hairD : i % 3 === 1 ? '#fbf3e2' : Lk.hair, w: i % 3 === 1 ? 4.2 : 2.4, press: .42, medium: i % 3 === 1 ? 'crayon' : 'graphite', taper: [.25, .5], wobble: 1 });
    }
    // nape and sideburn wisps
    [[[-150, 60], [-176, 110], [-182, 168]], [[-170, 40], [-206, 96], [-214, 150]], [[-200, 60], [-228, 110], [-236, 140]], [[-60, 10], [-70, 60], [-64, 108]], [[-74, 20], [-84, 66], [-82, 104]], [[-84, 92], [-88, 120], [-78, 140]]].forEach((q, i) => ln(q, { color: i % 2 ? Lk.hairD : '#efe6d4', w: 2.6, press: .55, taper: [.1, .6] }));
    // wisps lifting off the top (they move a little in the air)
    const wv = o.wisp || 0; if (!o.cap)  [[[10, -304], [52, -326 - 10 * wv], [104, -318 - 18 * wv]], [[-60, -302], [-20, -326 - 8 * wv], [40, -330 - 16 * wv]], [[80, -292], [122, -300 - 8 * wv], [160, -280 - 16 * wv]], [[-200, -240], [-216, -268 - 6 * wv], [-206, -296 - 8 * wv]]].forEach((q, i) => ln(q, { color: i % 2 ? Lk.hairD : '#efe4cf', w: 2.2, press: .55, taper: [.1, .7] }));

    if (o.cap) {
      const cc = Lk.cap || '#5d666b', cd = Lk.capD || '#343a40', cl = Lk.capL || '#98a2a3';
      p.shade([[-60, -150], [60, -160], [196, -140], [214, -84], [120, -62], [20, -70], [-50, -90]], { color: sh, alpha: .62, soft: 18 }); // the peak's shadow
      const cp = [[-272, -38], [-296, -110], [-284, -206], [-224, -288], [-120, -340], [10, -352], [120, -330], [196, -278], [226, -214], [222, -156], [150, -142], [40, -148], [-90, -124], [-180, -82]];
      p.mass(cp, { color: cc, dir: -.45, size: .7, len: .9, vary: .45 });
      p.shade([[-280, -40], [-290, -130], [-240, -180], [-120, -190], [40, -200], [180, -190], [224, -160], [150, -140], [40, -146], [-90, -122], [-180, -80]], { color: cd, alpha: .6, soft: 26 });
      p.shade([[-270, -200], [-200, -290], [-100, -336], [20, -346], [120, -324], [180, -276], [60, -290], [-80, -280], [-190, -220]], { color: cl, alpha: .5 * Lk.k, soft: 18, mode: 'screen' });
      const pk = [[64, -152], [150, -150], [216, -160], [262, -138], [296, -104], [286, -86], [226, -98], [140, -108], [84, -122]]; p.mass(pk, { color: mixc(cc, cd, .45), dir: .2, size: .5, len: .8, vary: .35 }); p.shade([[84, -126], [150, -116], [230, -104], [288, -90], [280, -80], [160, -100], [84, -112]], { color: cd, alpha: .7, soft: 6 }); p.shade([[120, -150], [210, -156], [262, -134], [200, -132], [130, -136]], { color: cl, alpha: .4, soft: 8, mode: 'screen' });
      ln([[-272, -38], [-298, -112], [-284, -208], [-222, -290], [-118, -342]], { w: 3, press: .4 }); ln([[-118, -342], [12, -354], [122, -332], [198, -280], [228, -214], [224, -160]], { w: 3.6, press: .6 }); ln([[-274, -38], [-182, -80], [-90, -122], [40, -146], [64, -150]], { w: 4.4, press: .85 }); ln([[64, -152], [84, -120], [142, -106], [228, -96], [288, -84], [298, -104], [262, -140], [218, -160]], { w: 4.2, press: .85 }); ln([[72, -150], [150, -150], [218, -160]], { w: 3, press: .5 });
      [[[-60, -330], [-40, -260], [-60, -160]], [[60, -340], [84, -260], [80, -170]], [[-180, -300], [-190, -220], [-170, -110]], [[10, -352], [30, -300], [120, -270]]].forEach((q, i) => ln(q, { w: 2.6, press: .34, taper: [.2, .5] }));
    }

    // ---- ear, large and old; the sun comes through it
    const ear = [[-100, -30], [-132, -38], [-158, -14], [-160, 34], [-148, 74], [-128, 108], [-106, 112], [-98, 84], [-92, 40], [-88, 0]];
    p.mass(ear, { color: mixc(sk, '#d98a5c', (Lk.front ? .12 : .34) * Lk.k), dir: 1.4, size: .42, len: .45, vary: .25 });
    p.shade([[-140, -14], [-112, -18], [-104, 30], [-118, 66], [-136, 40], [-144, 10]], { color: sh, alpha: .5, soft: 7 });
    ln([[-96, -6], [-112, -32], [-140, -30], [-158, 0], [-156, 46], [-142, 86], [-122, 110], [-104, 108], [-98, 88]], { w: 3.6, press: .75, taper: [.1, .2] });
    ln([[-106, -8], [-130, -14], [-144, 12], [-138, 44], [-124, 66]], { w: 2.4, press: .5 }); ln([[-100, 22], [-116, 24], [-120, 46], [-108, 60]], { w: 2.4, press: .55 });
    [[-112, 30], [-106, 38], [-114, 44]].forEach((q, i) => ln([q, [q[0] + 10, q[1] - 6], [q[0] + 18, q[1] - 4]], { color: '#efe6d4', w: 1.8, press: .5 }));

    // ---- near eye
    const ey = 8, dq = 5 * sq;
    if (lid < .12) {
      const L0 = [22, 12 + 2 * sq], L1 = [50, 30 - dq], L2 = [86, 33 - dq], L3 = [118, 19 + sq];
      p.mass([[18, 8], [40, -16 + 8 * sq], [76, -24 + 10 * sq], [110, -12 + 6 * sq], [122, 14], [86, 34 - dq], [50, 32 - dq]], { color: mixc(sk, sh, .34), dir: .15, size: .4, len: .5, vary: .22 });
      p.shade([[30, -6], [76, -20], [112, -6], [84, 6], [44, 8]], { color: Lk.lit, alpha: .2, soft: 8, mode: 'screen' });
      ln([L0, L1, L2, L3], { w: 5.4, press: .95, taper: [.2, .18], wobble: .5 }); ln([[30, 17], [58, 29 - dq], [90, 30 - dq]], { w: 3, press: .6 });
      for (let i = 0; i < 6; i++) { const u = .12 + i * .15, x = lerp(22, 116, u), y = 12 + 22 * Math.sin(Math.PI * u) - dq; ln([[x, y], [x - 3 - 4 * (1 - u), y + 9], [x - 8 - 5 * (1 - u), y + 14]], { w: 2.2, press: .6, taper: [.05, .6] }); }
      ln([[16, 0], [40, -18 + 8 * sq], [76, -26 + 10 * sq], [112, -13 + 5 * sq]], { w: 2.6, press: .5 });
    } else {
      const yo = a => lerp(26, a, lid), U = [[18, 12], [44, yo(0)], [78, yo(-6)], [104, yo(0)], [119, 14]], wh = U.concat([[90, 28], [54, 28], [30, 20]]);
      p.mass(wh, { color: Lk.eyeW || '#d9cbb6', dir: .1, size: .32, len: .4, vary: .15 });
      p.clip(wh, () => { const ix = 74 + 20 * gx, iy = 9 + 12 * gy, c = [], d = []; for (let i = 0; i < 12; i++) c.push([ix + 17.5 * Math.cos(i / 12 * 6.283), iy + 18.5 * Math.sin(i / 12 * 6.283)]); p.mass(c, { color: '#5f6a6b', size: .28, len: .3, dir: 1.2 }); for (let i = 0; i < 10; i++) d.push([ix + 8.5 * Math.cos(i / 10 * 6.283), iy + 9 * Math.sin(i / 10 * 6.283)]); p.mass(d, { color: '#26211f', size: .26, len: .3 }); p.shade([[10, -22], [124, -22], [122, 8], [70, 0], [18, 14]], { color: '#4e4038', alpha: .66, soft: 5 }); p.shade([[14, 8], [34, 10], [34, 24], [16, 20]], { color: '#9a6f60', alpha: .5, soft: 4 }); });
      { const ix = 74 + 20 * gx, iy = 9 + 12 * gy; p.lift([[ix + 3, iy - 9], [ix + 9, iy - 9], [ix + 10, iy - 4], [ix + 4, iy - 3]], { amount: .95, soft: 1 }); if (o.wet) p.lift([[ix - 11, iy + 8], [ix - 4, iy + 11], [ix + 2, iy + 11], [ix - 5, iy + 13]], { amount: .7 * o.wet, soft: 1 }); }
      p.mass([[12, 8], [34, -14], [74, -24 + 6 * (1 - lid)], [112, -12], [121, 12], [104, yo(0)], [78, yo(-6)], [44, yo(0)], [20, 12]], { color: mixc(sk, sh, .4), dir: .15, size: .38, len: .5, vary: .2 });
      ln(U, { w: 5, press: .95, taper: [.2, .15], wobble: .5 }); ln([[12, 2], [34, -15], [74, -25 + 5 * (1 - lid)], [112, -13]], { w: 2.6, press: .5 }); ln([[20, 14], [52, 29], [88, 29], [118, 17]], { w: 2.2, press: .42, taper: [.25, .25] });
      for (let i = 0; i < 4; i++) ln([[22 + 9 * i, lerp(12, yo(-1), i / 4)], [16 + 8 * i, lerp(12, yo(-1), i / 4) - 4], [10 + 8 * i, lerp(12, yo(-1), i / 4) - 5]], { w: 1.8, press: .5, taper: [.05, .6] });
      if (o.wet) { ln([[40, 27], [62, 30], [92, 29]], { color: '#f6ecd9', w: 3.4, press: .5 * o.wet, medium: 'crayon' }); }
    }
    if (gr > .1) { ln([[20, -4], [52, -22 - 4 * gr], [96, -40 - 12 * gr], [124, -34 - 22 * gr]], { w: 2.8, press: .55 * gr, taper: [.15, .4] }); p.shade([[96, -50 - 14 * gr], [140, -44 - 26 * gr], [148, 6], [124, 6], [112, -18]], { color: sh, alpha: .5 * gr * soc, soft: 8 }); ln([[60, 52 - 8 * sq], [92, 50 - 10 * sq], [118, 36 - 4 * sq]], { w: 2.8, press: .5 * sq }); }
    // far eye
    if (lid < .12) { ln([[176, 20 + sq], [192, 30 - dq], [210, 20]], { w: 4.6, press: .9, taper: [.2, .2], wobble: .5 }); ln([[176, -2], [192, -12 + 5 * sq], [212, -4]], { w: 2.4, press: .45 }); ln([[206, 22], [212, 30], [216, 33]], { w: 2, press: .5 }); }
    else { const y = a => lerp(24, a, lid), w2 = [[177, 12], [190, y(0)], [208, y(2)], [213, 16], [196, 25]]; p.mass(w2, { color: mixc(Lk.eyeW || '#d9cbb6', sh, .25), size: .3, len: .3 }); const ix = 197 + 8 * gx, iy = 9 + 10 * gy; p.clip(w2, () => { p.mass([[ix - 9, iy - 14], [ix + 8, iy - 13], [ix + 10, iy + 12], [ix - 9, iy + 13]], { color: '#454a4c', size: .26, len: .3 }); p.shade([[174, -20], [216, -20], [216, 6], [176, 8]], { color: '#4e4038', alpha: .6, soft: 4 }); }); p.lift([[ix + 1, iy - 8], [ix + 5, iy - 8], [ix + 5, iy - 4], [ix + 2, iy - 4]], { amount: .8, soft: 1 }); ln([[175, 13], [190, y(-1)], [210, y(1)], [214, 12]], { w: 4.4, press: .9, taper: [.2, .2] }); ln([[174, -4], [190, -15], [214, -7]], { w: 2.4, press: .42 }); }
    // bags, crow's feet
    ln([[34, 48], [64, 58 - 4 * sq], [100, 52 - 4 * sq], [118, 38]], { w: 2.4, press: .42 }); ln([[52, 64], [82, 70], [110, 60]], { w: 2, press: .26 });
    [[[14, 12], [-6, 4], [-22, -10]], [[12, 18], [-12, 20], [-34, 14]], [[14, 24], [-8, 36], [-28, 40]], [[20, 32], [2, 50], [-14, 60]]].forEach((q, i) => ln(q, { w: 2.2, press: .36 + .28 * sq, taper: [.1, .6] }));

    // ---- brows: white, wiry; grief lifts the inner ends, the knit draws them together
    const bi = -74 * gr + 16 * kn, bx = 16 * kn, bo = 20 * gr; const nb = [[-22, -22 + bo], [14, -52 + bo + 4 * kn], [66, -62 - 4 * gr + 8 * kn], [108, -50 + bi * .62], [140 + bx, -32 + bi]];
    p.shade([[-10, -16], [40, -40], [100, -34], [140 + bx, -20 + bi * .6], [120, -6], [60, -20], [10, -8]], { color: sh, alpha: .4 * soc, soft: 9 });
    { const q = A.spline(nb, 7, false), N = q.length - 1; for (let i = 0; i < 46; i++) { const u = p.fix(i, 8), z = q[Math.round(u * N)], e = q[Math.max(0, Math.round(u * N) - 1)], f = q[Math.min(N, Math.round(u * N) + 1)], ta = Math.atan2(f[1] - e[1], f[0] - e[0]) + Math.PI, a = ta + lerp(.15, 1.0, u) + .5 * (p.fix(i, 7) - .5), l = 16 + 16 * p.fix(i, 9) * (1 - .4 * u), oy = (p.fix(i, 6) - .5) * 17 * (.5 + .5 * Math.sin(Math.PI * clamp(u, .1, .9))); const x0 = z[0], y0 = z[1] + oy + 5; ln([[x0, y0], [x0 + Math.cos(a) * l * .55, y0 + Math.sin(a) * l * .55 - 1], [x0 + Math.cos(a - .3) * l, y0 + Math.sin(a - .3) * l + 3]], { color: i % 4 === 0 ? '#6a6058' : i % 4 === 1 ? '#a79d92' : '#efe6d6', w: i % 4 === 0 ? 2.2 : 3.2, press: i % 4 === 0 ? .55 : .75, taper: [.05, .6], wobble: .5, medium: i % 4 > 1 ? 'crayon' : 'graphite' }); } }
    ln([[172 - bx * .6, -40 + bi], [190, -58 + bi * .6], [208, -60 + 4 * kn], [226, -46]], { color: mixc(Lk.hairD, '#f1e9d8', .3), w: 8, press: .7, medium: 'crayon', taper: [.15, .3] }); ln([[174, -36 + bi], [192, -52 + bi * .6], [214, -52]], { color: '#6f665d', w: 2.4, press: .5 });
    // forehead: furrows (they climb in the middle when the brow gives way)
    [[-112, .5], [-146, .42], [-178, .3]].forEach((f, i) => ln([[26 + 14 * i, f[0] + 8], [74 + 8 * i, f[0] - 2 - 4 * gr], [124 + 4 * i, f[0] - 8 * gr], [160, f[0] + 8 - 14 * gr], [190 - 6 * i, f[0] + 14]], { w: 2.4, press: f[1] * (.7 + .5 * gr), taper: [.25, .4], wobble: 1.2 }));
    ln([[146 + bx * .5, -34 + bi * .4], [150 + bx * .4, -56 + bi * .3], [146, -82]], { w: 3, press: .42 + .4 * kn }); ln([[164, -30 + bi * .3], [168, -52], [166, -72]], { w: 2.6, press: .34 + .4 * kn });

    // ---- nose lines
    ln([[176, -22], [188, 10], [206, 46], [232, 80], [244, 102], [238, 120], [220, 130]], { w: 3.8, press: .8, taper: [.25, .15] });
    ln([[220, 131], [200, 136], [186, 132]], { w: 3.2, press: .7 }); ln([[150, 96], [140, 112], [146, 130], [160, 138], [174, 132]], { w: 3, press: .65 }); ln([[186, 128], [198, 124], [206, 128]], { w: 4, press: .8 });
    ln([[158, 28], [166, 56], [160, 80]], { w: 2, press: .22 });
    // fold from the nose to the corner of the mouth, cheek lines
    ln([[140, 96], [118, 132 - 4 * mp], [104, 172], [108, 212 + 6 * mp], [122, 236 + 4 * mp]], { w: 3.2, press: .58, taper: [.15, .4] });
    ln([[60, 120], [56, 168], [74, 214]], { w: 2.4, press: .3, taper: [.3, .5] }); ln([[26, 142], [20, 180], [34, 222]], { w: 2.2, press: .22, taper: [.3, .5] });

    // ---- mouth
    const mc = [120, 184 + 7 * mp], mm = [160, 181 - 1 * mp], mf = [206, 180 + 4 * mp];
    if (mo > .025) p.mass([[mc[0] + 12, mc[1] - 1], [146, 182 + 2 * mp], [172, 181], [mf[0] - 3, mf[1] + 1], [196, 184 + 46 * mo], [166, 185 + 58 * mo], [138, 185 + 30 * mo + 3 * mp]], { color: '#54352f', dir: 0, size: .32, len: .5 });
    ln([mc, [136, 183 + 3 * mp], mm, [184, 183], mf], { w: 4.2, press: .9, taper: [.12, .18], wobble: .7 });
    if (mo > .025) ln([[136, 186 + 30 * mo + 3 * mp], [166, 187 + 58 * mo], [198, 185 + 46 * mo]], { w: 2.6, press: .5 });
    ln([[130, 202 + 14 * mo - 4 * mp], [164, 211 + 15 * mo - 9 * mp], [202, 203 + 13 * mo - 6 * mp]], { color: '#a5634f', w: 5, press: .3, medium: 'crayon' }); ln([[134, 214 + 13 * mo - 6 * mp], [166, 222 + 14 * mo - 10 * mp], [194, 216 + 12 * mo - 8 * mp]], { w: 2.4 + mp, press: .34 + .2 * mp }); if (mp > .2) ln([[128, 190], [160, 186], [200, 187]], { w: 2.6, press: .4 * mp });
    ln([mc, [110, 194 + 11 * mp], [108, 204 + 13 * mp]], { w: 3, press: .5 + .2 * mp });
    [[140, 168], [156, 164], [172, 164], [188, 166]].forEach((q, i) => ln([q, [q[0] + 2, q[1] + 10]], { w: 1.8, press: .26 }));
    ln([[180, 142], [184, 158], [186, 170]], { w: 2, press: .24 });
    if (ch > .05) { for (let i = 0; i < 9; i++) { const x = 146 + 46 * p.fix(i, 21), y = 238 + 32 * p.fix(i, 22); ln([[x, y], [x + 4, y + 3], [x + 8, y + 1]], { w: 2.2, press: .5 * ch }); } ln([[140, 228], [166, 236 - 6 * ch], [196, 230]], { w: 2.8, press: .5 * ch }); }
    // stubble
    inFace(() => { for (let i = 0; i < 80; i++) { const u = p.fix(i, 31), v = p.fix(i, 32), x = lerp(-60, 204, u), y0 = u < .35 ? lerp(120, 190, u / .35) : lerp(196, 226, (u - .35) / .65), y = lerp(y0, 296, v * .95); ln([[x, y], [x + 3, y + 7]], { color: p.fix(i, 33) > .4 ? '#e6ddcf' : '#6d5f57', w: 2, press: .5, taper: [.1, .5], wobble: .3 }); } for (let i = 0; i < 14; i++) { const x = lerp(140, 206, p.fix(i, 41)), y = lerp(144, 172, p.fix(i, 42)); ln([[x, y], [x + 2, y + 6]], { color: '#e6ddcf', w: 1.8, press: .45, taper: [.1, .5], wobble: .3 }); } });
    // age spots
    [[-10, -140], [20, -176], [-34, -60], [44, -118]].forEach((q, i) => p.shade([[q[0] - 7, q[1]], [q[0], q[1] - 5], [q[0] + 7, q[1] + 1], [q[0], q[1] + 5]], { color: '#8a5c44', alpha: .4, soft: 3 }));

    // ---- contour, pressed in the shadow, lost in the sun
    ln([[150, -240], [194, -176], [213, -114], [224, -66], [216, -34], [206, -4]], { w: 4, press: .75, taper: [.3, .15], passes: 1 });
    ln([[208, 4], [217, 34], [220, 62], [217, 78]], { w: 3.4, press: .65 }); ln([[212, 132], [205, 146], [207, 162], [213, 177 - 2 * mo], [207, 187]], { w: 3.4, press: .7 });
    ln([[207, 192 + 4 * mo], [211, 205 + 11 * mo], [200, 219 + 11 * mo], [202, 237 + 12 * mo - 3 * ch], [184, 262 + 13 * mo - 4 * ch], [136, 274 + 13 * mo - 4 * ch], [60, 253 + 9 * mo], [-18, 211 + 4 * mo]], { w: 4, press: .78, taper: [.1, .4] });
    ln([[-18, 211 + 4 * mo], [-70, 178], [-92, 132]], { w: 2.8, press: .34, taper: [.2, .5] });
    ln([[-258, -20], [-264, -110], [-236, -200], [-180, -262]], { w: 2.6, press: .3, taper: [.4, .5] });
    if (o.tear != null && o.tear > 0) { const q = A.spline([[58, 34], [60, 70], [70, 104], [82, 140], [84, 186]], 8, false), n = Math.max(2, Math.round(o.tear * (q.length - 1))), e = q[n]; ln(q.slice(0, n + 1), { color: '#fff4df', w: 4, press: .55, medium: 'crayon', taper: [.2, .1], wobble: .4 }); p.lift([[e[0] - 4, e[1] - 6], [e[0] + 3, e[1] - 7], [e[0] + 6, e[1] + 3], [e[0], e[1] + 8], [e[0] - 6, e[1] + 3]], { amount: .9, soft: 1 }); }
    p.pop();
  }
  B.test.s13head = headOld;

  const SUN = { skin: '#cfa181', lit: '#f6cd94', sh: '#80594a', deep: '#54392f', hair: '#c9c0b0', hairL: '#fbe6bf', hairD: '#8a8078', ink: '#352b26', k: 1 };
  const LT = { dir: -2.75, warm: .8, k: .8, dim: .06 };
  const RED = '#a5443c', RED_L = '#c97862', RED_D = '#6f2a2b', INK = '#2f2824';
  const lnOf = p => (pts, st) => p.line(pts, Object.assign({ color: INK, w: 4, press: .75, taper: [.12, .25], wobble: .9 }, st));
  const mv = (a, x, y) => a.map(v => [v[0] + x, v[1] + y, v[2]]);

  function closeBack(p) {
    const W = B.world;
    p.paper('#e6d7b2');
    p.layer('s13c-back', { every: 6, still: true, depth: .05 });
    W.sky(p, { mood: 'lowsun', horizon: 760, glowX: 250, t: 0, clouds: false });
    p.mass([[-40, 560], [140, 470], [420, 500], [620, 600], [560, 720], [-40, 760]], { color: '#f7e0a4', alpha: .8, dir: .1, size: 1.1, vary: .25, soft: 60 });
    [[[760, 120], [1100, 90], [1500, 110], [1980, 80], [1980, 190], [1500, 178], [1120, 168], [820, 160]], [[900, 300], [1240, 282], [1600, 292], [1980, 270], [1980, 330], [1560, 344], [1180, 336]], [[-40, 190], [240, 160], [520, 186], [420, 226], [140, 246], [-40, 240]]].forEach((q, i) => p.mass(q, { color: i === 1 ? '#c3b492' : '#b8ab92', alpha: .55, dir: .06, size: 1.1, len: 1.3, vary: .4, soft: 22 }));
    W.hill(p, { d: .95, pts: [[-60, 660], [220, 606], [460, 640], [760, 600], [1060, 640], [1400, 670], [1980, 640]], base: 900, seed: 71, spurs: 3, rough: 4, hatch: 0, light: 'lowsun', season: .62, colour: .45 });
    p.layer('s13c-mid', { every: 6, still: true, depth: .3 });
    W.hill(p, { d: .5, pts: [[-60, 850], [300, 830], [700, 846], [1200, 830], [1980, 800]], base: 1130, seed: 73, spurs: 2, rough: 5, hatch: 0, light: 'lowsun', season: .62, colour: .45 });
    // her stone, close: rough slab, its lit edge to the sun
    const ln = lnOf(p), st = [[1500, 1130], [1492, 900], [1470, 720], [1478, 560], [1500, 470], [1560, 424], [1640, 436], [1700, 408], [1790, 418], [1860, 396], [1960, 420], [1960, 1130]];
    p.mass(st, { color: { lin: [1470, 500, 1800, 800], stops: [[0, '#b5aa92'], [.16, '#8f897b'], [1, '#6c6963']] }, dir: 1.35, size: 1, len: .9, vary: .45 });
    p.shade([[1480, 1130], [1472, 720], [1482, 560], [1506, 474], [1536, 470], [1520, 620], [1524, 800], [1548, 1130]], { color: '#f4d59a', alpha: .62, soft: 12, mode: 'screen' });
    p.shade([[1560, 424], [1640, 438], [1700, 410], [1790, 420], [1860, 398], [1960, 422], [1960, 452], [1840, 440], [1720, 450], [1580, 466]], { color: '#f4d59a', alpha: .4, soft: 10, mode: 'screen' });
    p.shade([[1620, 560], [1960, 520], [1960, 1130], [1600, 1130]], { color: '#4b4a49', alpha: .4, soft: 60 });
    [[1590, 560, 34], [1640, 690, 26], [1580, 820, 40], [1720, 600, 22], [1760, 880, 36]].forEach((q, i) => { const o = []; for (let k = 0; k < 9; k++) { const a = k / 9 * 6.283, r = q[2] * (.6 + .7 * p.fix(i, k)); o.push([q[0] + Math.cos(a) * r, q[1] + Math.sin(a) * r * .8]); } p.mass(o, { color: i % 2 ? '#a39b82' : '#b3a988', alpha: .55, dir: i, size: .5, len: .5, vary: .5, soft: 5 }); });
    ln([[1498, 1080], [1490, 900], [1470, 720], [1478, 566], [1502, 470], [1560, 426]], { w: 4, press: .5, wobble: 1.6 }); ln([[1560, 426], [1640, 438], [1700, 410], [1790, 420], [1860, 398], [1950, 420]], { w: 4, press: .55, wobble: 1.8 }); ln([[1640, 470], [1628, 600], [1650, 720], [1636, 860]], { w: 3, press: .4, wobble: 2 }); ln([[1760, 500], [1748, 640], [1764, 720]], { w: 2.6, press: .3, wobble: 2 });
    for (let i = 0; i < 26; i++) { const x = 1440 + i * 19 + 12 * p.fix(i, 2), h = 40 + 70 * p.fix(i, 3); ln([[x, 1090], [x + 8, 1090 - h * .6], [x + 20 + 14 * p.fix(i, 4), 1090 - h]], { color: i % 3 ? '#6f6a4e' : '#cdb987', w: 3.4, press: .7, taper: [.05, .6] }); }
  }

  function body(p, f) {
    const ln = lnOf(p), br = f.breath;
    // far arm
    p.mass([[960, 830], [1050, 800], [1190, 816], [1290, 890], [1352, 1000], [1370, 1130], [900, 1130]], { color: '#57534d', dir: 1.1, size: .9, vary: .4 });
    p.shade([[930, 820], [1090, 830], [1130, 960], [1080, 1130], [900, 1130]], { color: '#2a2828', alpha: .6, soft: 40 });
    ln([[1060, 802], [1190, 816], [1292, 890], [1354, 1000], [1372, 1110]], { w: 4.6 }); ln([[1190, 900], [1240, 930], [1250, 990]], { w: 3, press: .45 }); ln([[1220, 860], [1280, 930], [1300, 1010]], { w: 3, press: .4 });
    // back and near side, round and heavy
    const back = [[40, 1130], [70, 980], [140, 826], [244, 692 - br], [376, 588 - 1.5 * br], [510, 530 - 1.6 * br], [636, 526 - br], [760, 610], [860, 730], [950, 850], [1030, 960], [1090, 1130]];
    p.mass(back, { color: { lin: [140, 700, 1000, 900], stops: [[0, '#7c7266'], [.3, '#605a54'], [1, '#403d3c']] }, dir: 2.2, size: 1, vary: .45 });
    p.shade([[600, 620], [780, 660], [1010, 930], [1070, 1140], [700, 1140], [640, 900]], { color: '#262324', alpha: .62, soft: 50 });
    p.shade([[150, 1140], [200, 950], [330, 820], [480, 800], [420, 960], [420, 1140]], { color: '#33302f', alpha: .42, soft: 46 });
    // low sun along the back
    p.shade([[38, 1130], [70, 980], [140, 826], [244, 692], [376, 588], [510, 530], [636, 526], [640, 540], [520, 546], [394, 602], [266, 704], [164, 836], [96, 986], [64, 1130]], { color: '#ffdca0', alpha: .7, soft: 6, mode: 'screen' });
    p.shade([[60, 1130], [110, 960], [190, 820], [320, 690], [470, 600], [600, 570], [500, 660], [360, 780], [240, 960], [180, 1130]], { color: '#e0b27a', alpha: .26, soft: 34, mode: 'screen' });
    // near arm, over the body
    const arm = [[330, 690], [420, 640], [520, 660], [590, 740], [640, 850], [720, 924], [830, 900], [880, 884], [914, 950], [896, 1010], [800, 1060], [690, 1110], [560, 1140], [420, 1140], [350, 1040], [306, 900], [300, 780]];
    p.mass(arm, { color: { lin: [300, 700, 900, 1000], stops: [[0, '#776e63'], [.5, '#5e5852'], [1, '#504c48']] }, dir: 1.0, size: .9, vary: .42 });
    p.shade([[520, 700], [600, 760], [660, 870], [740, 930], [880, 890], [910, 960], [780, 1070], [640, 1010], [560, 880]], { color: '#2e2b2b', alpha: .42, soft: 30 });
    p.shade([[320, 720], [400, 654], [480, 660], [420, 720], [360, 840], [340, 980], [310, 900]], { color: '#eec28a', alpha: .4, soft: 20, mode: 'screen' });
    ln([[560, 700], [612, 790], [656, 876], [722, 926], [830, 902], [884, 884]], { w: 5, press: .85 }); ln([[420, 1120], [352, 1040], [308, 910], [304, 800]], { w: 3.4, press: .4 }); ln([[890, 1012], [800, 1062], [690, 1112]], { w: 4, press: .6 });
    ln([[884, 884], [916, 950], [896, 1012]], { w: 4.6, press: .8 }); ln([[854, 894], [884, 956], [866, 1022]], { w: 3, press: .45 });
    [[[612, 806], [570, 850], [560, 910]], [[650, 880], [600, 930], [590, 1000]], [[700, 930], [668, 980], [676, 1040]], [[480, 690], [450, 760], [452, 840]], [[430, 1000], [520, 1010], [600, 980]]].forEach((q, i) => ln(q, { w: 3.6, press: .45, taper: [.1, .55] }));
    ln([[40, 1120], [70, 980], [140, 826], [244, 692 - br], [376, 588 - 1.5 * br], [510, 530 - 1.6 * br], [612, 526 - br]], { w: 3, press: .38, wobble: 1.4 });
    // collar turned up behind the scarf
    p.mass([[508, 536], [560, 500], [610, 520], [640, 620], [720, 700], [820, 800], [780, 830], [650, 740], [560, 640]], { color: '#5d5750', dir: .8, size: .6, vary: .35 }); ln([[508, 538], [566, 640], [652, 742], [782, 832]], { w: 4.4, press: .75 }); ln([[508, 536], [560, 502]], { w: 3.4, press: .6 });
  }

  function neck(p, f) {
    const ln = lnOf(p);
    p.mass([[600, 520], [650, 430], [720, 390], [800, 520], [800, 600], [700, 620]], { color: '#a3775f', dir: .9, size: .6, vary: .3 });
    const n = [[586, 520], [606, 480], [644, 464], [700, 474], [752, 520], [800, 590], [836, 650], [800, 690], [700, 660], [616, 604], [584, 560]];
    p.mass(n, { color: RED, dir: .55, size: .6, len: .8, vary: .4 }); p.shade([[620, 566], [700, 560], [820, 640], [800, 690], [700, 662], [612, 604]], { color: RED_D, alpha: .62, soft: 18 }); p.shade([[586, 518], [608, 480], [646, 466], [690, 474], [650, 512], [604, 552]], { color: '#f2b08c', alpha: .55, soft: 10, mode: 'screen' });
    [[[592, 530], [672, 534], [752, 596]], [[588, 556], [666, 574], [748, 636]], [[624, 474], [700, 500], [776, 580]]].forEach((q, i) => ln(q, { color: i === 1 ? RED_L : RED_D, w: 3, press: .55 }));
    for (let i = 0; i < 12; i++) { const u = i / 11, x = lerp(604, 770, u), y = lerp(520, 620, u) + 14 * (p.fix(i, 3) - .5); ln([[x, y], [x + 7, y + 10], [x + 3, y + 22]], { color: i % 2 ? RED_D : RED_L, w: 2.2, press: .5 }); }
    ln([[584, 560], [616, 606], [700, 662], [800, 690]], { color: '#4a2224', w: 4.4 }); ln([[586, 520], [606, 480], [646, 464], [702, 474], [752, 520]], { color: '#4a2224', w: 3, press: .45 });
  }

  function hands(p, f) {
    const C = B.cast, HT = { dir: -2.6, warm: .75, k: .75, dim: .03 }, ln0 = lnOf(p), ln = (q, st) => ln0(q, Object.assign({ color: RED_D, w: 3, press: .65 }, st)), g = f.grip, X = f.handX, Y = f.handY - 5 * g - 26, M = q => mv(q, X, Y), E = '#471f22';
    // the far end of the scarf, from behind the jaw
    const b = [[872, 676], [934, 672], [1000, 718 + Y * .5], [1066 + X, 786 + Y], [1060 + X, 846 + Y], [1000 + X, 840 + Y], [940, 770]];
    p.mass(b, { color: mixc(RED, RED_D, .35), dir: .8, size: .55, len: .7, vary: .4 }); p.shade([[880, 684], [940, 700], [1020 + X, 800 + Y], [1040 + X, 850 + Y], [960, 800]], { color: RED_D, alpha: .6, soft: 14 });
    ln([[934, 672], [1000, 718 + Y * .5], [1068 + X, 788 + Y]], { color: E, w: 4 }); [[[900, 690], [970, 740], [1034 + X, 808 + Y]], [[918, 682], [990, 734], [1050 + X, 800 + Y]]].forEach((q, i) => ln(q, { press: .45, color: i ? RED_L : RED_D }));
    // the near end
    const a = [[770, 650], [838, 660], [906, 722 + Y * .4], [984 + X, 800 + Y], [1004 + X, 856 + Y], [948 + X, 880 + Y], [862, 806], [782, 734]];
    p.mass(a, { color: RED, dir: .78, size: .55, len: .7, vary: .45 }); p.shade([[776, 722], [860, 792], [950 + X, 878 + Y], [990 + X, 850 + Y], [890, 762], [812, 700]], { color: RED_D, alpha: .55, soft: 14 }); p.shade([[786, 660], [840, 668], [910, 734], [960 + X, 790 + Y], [900, 752], [830, 694]], { color: '#e8a07e', alpha: .28, soft: 10, mode: 'screen' });
    [[[796, 668], [874, 738], [966 + X, 826 + Y]], [[788, 700], [862, 770], [944 + X, 850 + Y]], [[838, 662], [914, 734], [984 + X, 806 + Y]]].forEach((q, i) => ln(q, { color: i === 1 ? RED_L : RED_D, press: .5 })); for (let i = 0; i < 10; i++) { const u = .06 + i * .09, x = lerp(800, 964 + X, u), y = lerp(690, 836 + Y, u) + 12 * (p.fix(i, 3) - .5); ln([[x, y], [x + 8, y + 5], [x + 9, y + 15]], { color: i % 2 ? RED_D : RED_L, w: 2.2, press: .5 }); }
    ln([[838, 660], [908, 722 + Y * .4], [984 + X, 800 + Y]], { color: E, w: 4 }); ln([[782, 734], [862, 808], [950 + X, 882 + Y]], { color: E, w: 4.4 });
    // what hangs below the hands: two worn, frayed ends, one behind the other
    [[[1010, 890], [1084, 884], [1112, 956], [1120, 1030], [1050, 1040], [1030, 960]], [[956, 896], [1040, 900], [1046, 970], [1040, 1060], [966, 1066], [950, 980]]].forEach((e0, k) => { const e = M(e0); p.mass(e, { color: mixc(RED, RED_D, k ? .12 : .42), dir: 1.55, size: .55, len: .8, vary: .45 }); p.shade(M([[e0[0][0] - 8, e0[0][1] - 4], [e0[1][0] + 6, e0[1][1] - 4], [e0[1][0] + 10, e0[1][1] + 50], [e0[0][0] + 4, e0[0][1] + 56]]), { color: RED_D, alpha: .7, soft: 16 }); for (let i = 1; i < 4; i++) { const u = i / 4; ln(M([[lerp(e0[0][0], e0[1][0], u), e0[0][1] + 14], [lerp(e0[5][0], e0[2][0], u) + 4 * (p.fix(i, k) - .5), e0[2][1]], [lerp(e0[4][0], e0[3][0], u), e0[3][1]]]), { color: i % 2 ? RED_L : RED_D, w: 2.6, press: .45 }); } ln(M([e0[0], e0[5], e0[4]]), { color: E, w: 3.8, press: .7 }); ln(M([e0[1], e0[2], e0[3]]), { color: E, w: 3.8, press: .7 }); });
    // far hand, then the near one folded over it
    C.hand(p, { who: 'dannyOld', x: 1158 + X, y: 948 + Y, h: 236, pose: ['holdFingers', 'fist', .4 + .35 * g], rot: -2.62, mir: 1, flip: -1, roll: 30, light: HT, sleeve: false, armLen: .05 });
    p.mass(M([[1112, 884], [1160, 852], [1240, 888], [1290, 960], [1250, 1044], [1150, 1056], [1122, 1012], [1142, 950]]), { color: '#57534d', dir: 1.1, size: .7, vary: .35 }); p.shade(M([[1150, 900], [1200, 940], [1200, 1030], [1170, 1010]]), { color: '#2a2828', alpha: .4, soft: 10 }); ln0(M([[1114, 886], [1142, 946], [1128, 1006]]), { w: 4.4, press: .85 }); ln0(M([[1144, 866], [1176, 930], [1162, 1010]]), { w: 2.8, press: .4 }); ln0(M([[1114, 886], [1160, 854], [1236, 886]]), { w: 3.6, press: .6 });
    C.hand(p, { who: 'dannyOld', x: 884 + X, y: 968 + Y, h: 258, pose: ['holdFingers', 'fist', .3 + .4 * g], rot: -.56, roll: 18, light: HT, sleeve: false, armLen: .05 });
    p.mass(M([[780, 920], [836, 890], [882, 896], [914, 950], [914, 1004], [884, 1042], [820, 1060]]), { color: '#5e5852', dir: 1, size: .7, vary: .35 }); p.shade(M([[860, 890], [900, 930], [908, 1010], [870, 1040], [880, 970]]), { color: '#2a2828', alpha: .36, soft: 9 }); ln0(M([[880, 894], [914, 948], [914, 1004], [886, 1044]]), { w: 4.6, press: .85 }); ln0(M([[850, 896], [882, 954], [868, 1036]]), { w: 2.8, press: .42 });
  }

  function drawClose(p, f) {
    closeBack(p);
    p.layer('s13c-man', { every: f.hold ? 2 : 1, depth: 1 });
    body(p, f); neck(p, f);
    headOld(p, { x: 884 + f.hx, y: 388 + f.hy, s: 1.02, rot: .56 + f.nod, light: SUN, lids: 0, squeeze: f.squeeze, grief: f.grief, knit: f.knit, mPull: f.mPull, chin: f.chin, mOpen: f.mOpen, tear: f.tear, wisp: f.wisp });
    hands(p, f);
    p.layer('s13c-near', { every: 4, depth: 1 });
    B.world.thread(p, [[1080 + f.handX, 930 + f.handY], [1180, 968], [1330, 940], [1470, 926], [1520, 946]], { w: 7, slack: .4, seed: 4, light: 'lowsun', fuzz: .8 });
    const U = B.world.util, rg = U.ridge([[-40, 972], [420, 966], [900, 954], [1300, 944], [1600, 924], [1960, 912]], { amp: 6, seed: 23, step: 24 }), ln = lnOf(p);
    p.mass(U.below(rg, 1130), { sharp: true, color: { lin: [0, 900, 0, 1080], stops: [[0, '#6d5f41'], [.4, '#52472f'], [1, '#3a3226']] }, dir: -.06, len: 1.1, size: .9, vary: .5 });
    for (let i = 0; i < 96; i++) { const x = 1990 * p.fix(i, 81) - 30, y = U.yAt(rg, x) + 6 + 50 * p.fix(i, 82) * p.fix(i, 83), h = 18 + 44 * p.fix(i, 84) * p.fix(i, 85), b = .22 + .16 * A.noise1(p.t * .7 + x * .004, 4); ln([[x, y], [x + b * h * .4, y - h * .6], [x + b * h * 1.5 + 6 * (p.fix(i, 86) - .4), y - h]], { color: i % 4 === 0 ? '#e0c283' : i % 4 === 1 ? '#a38f5e' : i % 4 === 2 ? '#6f6242' : '#3b3324', w: 3, press: .7, taper: [.05, .65], wobble: .5 }); }
  }

  // WIDE: at the stone. two stages down, a hand on the stone, a pause halfway
  function drawWide(p, t) {
    const W = B.world, C = B.cast, G = W.GRAVE, g = t2 => A.noise1(t2 * 1.3, 4), o = { light: 'lowsun', season: .66, colour: .4, leaf: .35 }, ln = lnOf(p);
    p.paper('#e6d7b2');
    W.graveside(p, Object.assign({ part: 'back' }, o));
    W.graveside(p, Object.assign({ part: 'mid', t: Math.floor(p.t * 4 + 1e-6) / 4 }, o));
    const kd = keys(t, [[.28, 0], [.6, .06, 'out'], [1.0, .3, 'io'], [1.26, .5, 'in'], [1.38, .475, 'out'], [1.55, .49], [1.98, .5], [2.12, .47, 'out'], [2.5, .84, 'in'], [2.6, .9, 'out'], [3.1, 1, 'io']]);
    // long shadows, the sun is nearly on the hill behind him
    p.layer('s13-shade', { every: 3, depth: .6 });
    const sl = lerp(1, .46, clamp(kd * 1.3)), sh = (x, y, w, l, h) => p.hatch([[x - w, y - 6], [x + w, y - 8], [x + l, y + h * .5 - 14], [x + l + 30, y + h], [x + l - 60, y + h + 18], [x - w * .4, y + 22]], { color: '#4a4234', dir: .06, gap: 7, len: 150, w: 4.6, press: .42 });
    sh(880, 898, 70, 620 * sl, 24); sh(1110, 858, 66, 420, 18); sh(1500, 836, 80, 520, 30);
    p.layer('s13-man', { every: t > 1.5 && t < 1.95 ? 2 : 1, depth: 1 });
    const h = 560, x = 872, y = 900, tr = t > 1.22 && t < 2.0 ? 1 : 0;
    const hx = 1030 + tr * 1.6 * A.noise1(t * 11, 2), handY = keys(t, [[-.2, 610], [.3, 612], [.66, 606], [1.22, 664, 'in'], [1.4, 668], [2.1, 670], [2.5, 736, 'in'], [2.7, 744, 'out'], [3.2, 748]]) + tr * 2 * A.noise1(t * 13, 5);
    const pose = C.poses.kneelDown(kd), br = keys(t, [[1.3, 0], [1.5, .5, 'out'], [1.78, 1, 'io'], [2.1, .2]]);
    pose.bend += .07 * br; pose.head = { nod: (pose.head.nod || 0) + .22 * br + keys(t, [[-.4, .1], [.3, .12], [.5, .2], [1.2, 0]]) };
    const man = C.figure(p, 'dannyOld', Object.assign({ x, y, h, view: 'side', light: LT, cap: false, expr: ['ache', 'prayer', clamp((t - 2.2) / .8)], wind: [.16 + .1 * g(t), 0], shrug: .35 * br }, pose, { drag: [0, keys(t, [[.66, 0], [1.2, -.03, 'in'], [1.4, .012, 'out'], [1.6, 0], [2.2, 0], [2.5, -.025, 'in'], [2.72, .01, 'out'], [3, 0]])], armFar: { at: [hx, handY], h: ['reach', 'onChair', clamp((t + .3) * 2)], elbow: -1 }, armNear: ['rest', 'kneeHand', keys(t, [[.5, 0], [1.1, 1, 'io'], [3, 1]])] }));
    // the wool set down on the grass, and the last of the thread: to the foot of the stone, and in
    W.ball(p, { x: 966, y: 902, r: 24, roll: .7, light: 'lowsun', shadow: '#5a4e3a' });
    W.thread(p, [[988, 908], [1012, 908], [1036, 890], [1052, 872], [1062, 866]], { w: 5, meander: 3, light: 'lowsun', ground: .5, seed: 4 });
    for (let i = 0; i < 9; i++) { const X = 1040 + 6 * i, H = 20 + 18 * p.fix(i, 3); ln([[X, 880], [X + 2, 880 - H * .6], [X + 8 + 4 * p.fix(i, 4), 880 - H]], { color: i % 2 ? '#c9b078' : '#75684a', w: 3, press: .75, taper: [.05, .6] }); }
    for (let i = 0; i < 26; i++) { const X = 716 + 8 * i + 6 * p.fix(i, 11), H = 24 + 34 * p.fix(i, 12), Y = 934 + 10 * p.fix(i, 13); ln([[X, Y], [X + 3, Y - H * .6], [X + 10 + 6 * p.fix(i, 14), Y - H]], { color: i % 3 === 0 ? '#c9b078' : i % 3 === 1 ? '#8d7c52' : '#5c5038', w: 3.2, press: .75, taper: [.05, .6] }); }
    W.graveside(p, Object.assign({ part: 'front', t: Math.floor(p.t * 6 + 1e-6) / 6 }, o));
    p.air({ lin: [0, 0, 1920, 260], stops: [[0, '#fff6df'], [.5, '#f2e7d4'], [1, '#c3b9b3']], alpha: .9 });
    p.air({ lin: [0, 840, 0, 1080], stops: [[0, '#ffffff'], [.6, '#a89c8a'], [1, '#6c6257']], alpha: .95 });
    p.air({ rad: [240, 640, 760], stops: [[0, 'rgba(255,214,130,.34)'], [.5, 'rgba(255,205,120,.14)'], [1, 'rgba(255,200,120,0)']], mode: 'screen', alpha: 1 });
    return man;
  }

  // the prayer: said under the breath, uneven, the way words said ten thousand times are said
  const LIPS = [[3.0, 0], [3.2, .05], [3.36, .12], [3.46, .02], [3.58, .1], [3.66, .04], [3.8, .13], [3.92, .0], [4.16, .0], [4.26, .09], [4.36, .02], [4.46, .12], [4.58, .05], [4.7, .1], [4.8, .01], [4.94, .08], [5.06, .03], [5.16, .14], [5.28, .1, 'out'], [5.5, .03, 'io'], [6.2, .02], [6.5, .05, 'io'], [7.0, .02], [7.4, 0]];
  function state(t) {
    const gv = keys(t, [[5.12, 0], [5.2, .25, 'in'], [5.46, 1, 'out'], [6.06, .96], [6.62, .16, 'io'], [7.2, .1]]);      // the brow gives way, for one second
    const sh = keys(t, [[5.2, 0], [5.5, 1, 'out'], [6.1, 1], [6.9, -.5, 'io'], [7.6, -.35]]);                             // a held breath; then it goes
    const quiver = gv > .6 ? A.noise1(t * 10, 3) : 0, nodP = keys(t, [[3.0, 0], [3.3, .012], [3.8, .0], [4.2, .016], [4.6, .004], [5.0, .012]]);
    return { hx: 2 * A.noise1(t * .7, 1) + 8 * gv, hy: 2.5 * Math.sin(t * 1.5) * (1 - gv) + 14 * keys(t, [[5.2, 0], [5.55, 1, 'out'], [6.3, 1], [7.0, .7, 'io']]) + quiver * 1.6, nod: nodP + .075 * keys(t, [[5.2, 0], [5.6, 1, 'out'], [6.3, 1], [7.0, .75, 'io']]), breath: 3 * Math.sin(t * 1.5) * (1 - Math.abs(sh)) + 13 * sh, grip: keys(t, [[5.14, 0], [5.4, 1, 'snap'], [6.2, .95], [6.9, .3, 'io']]), handX: -6 * gv, handY: -16 * keys(t, [[5.16, 0], [5.5, 1, 'out'], [6.2, 1], [7, .3, 'io']]) + quiver, squeeze: gv, grief: gv, knit: gv * .85, mPull: keys(t, [[5.16, .1], [5.5, 1, 'out'], [6.1, .9], [6.8, .2, 'io']]) + .15 * quiver, chin: gv * .9 + .2 * quiver * gv, mOpen: keys(t, LIPS), wisp: .5 + .7 * A.noise1(t * 1.1, 6), hold: t > 6.95 };
  }
  B.test.s13face = function (p, k) {
    p.paper('#d8c9a6'); p.layer('a', { depth: 1, every: 2 });
    if (k < 1) headOld(p, { x: 900, y: 480, s: 1.1, rot: .55, mOpen: .2 });
    else if (k < 2) headOld(p, { x: 900, y: 480, s: 1.1, rot: .55, grief: 1, knit: .8, squeeze: 1, mPull: 1, chin: 1, mOpen: .1 });
    else if (k < 3) headOld(p, { x: 900, y: 520, s: 1.1, rot: -.08, lids: .8, gx: .55, gy: -.35, cap: true, grief: .5, wet: .8, mOpen: .12, light: { front: true, skin: '#c69d84', lit: '#f0e2cc', sh: '#6d5852', deep: '#4a3c38', hair: '#b9b5ae', hairL: '#e8e4d9', hairD: '#7d7a76', ink: '#322c2a', k: 1 } });
    else headOld(p, { x: 900, y: 520, s: 1.1, rot: .2, lids: .45, gx: .3, gy: .6, grief: .4, light: { front: true, skin: '#c69d84', lit: '#f0e2cc', sh: '#6d5852', deep: '#4a3c38', hair: '#b9b5ae', hairL: '#e8e4d9', hairD: '#7d7a76', ink: '#322c2a', k: 1 } });
  };
  B.test.s13wide = function (p, k) { drawWide(p, k); };
  B.test.s13close = function (p, k) { drawClose(p, state(k)); };
  B.test.s13wide = function (p, k) { drawWide(p, k); };
  const CUT = 3.05;
  B.scene({ id: 's13', ink: 'dark', draw(p, s) { if (s.t < CUT) drawWide(p, s.t); else drawClose(p, state(s.t)); } });
})();
