// main.js - the film: scene order, transitions, per-drawing evaluation.
(function () {
  const B = window.BIDE, A = B.anim;
  const TL = B.timeline;
  // id, start, end, transition INTO this scene {k:'paint'|'wash'|'cut', d:seconds, dir:angle}
  const ORDER = [
    ['s00', 0, 8.4, { k: 'cut' }], ['s01', 8.4, 15.3, { k: 'paint', d: 1.0, dir: 0 }], ['s02', 15.3, 22.3, { k: 'paint', d: 1.0, dir: 0 }], ['s03', 22.3, 29.4, { k: 'paint', d: .9, dir: 1.2 }],
    ['s04', 29.4, 36.9, { k: 'paint', d: .8, dir: 0 }], ['s05', 36.9, 43.7, { k: 'wash', d: 1.0 }], ['s06', 43.7, 50.9, { k: 'paint', d: 1.6, dir: 1.57 }], ['s07', 50.9, 58.3, { k: 'paint', d: .9, dir: -.6 }],
    ['s08', 58.3, 68.3, { k: 'paint', d: 1.2, dir: 3.14 }], ['s09', 68.3, 76.4, { k: 'paint', d: 1.6, dir: 1.57 }], ['s10', 76.4, 83.5, { k: 'paint', d: 1.2, dir: 0 }], ['s11', 83.5, 90.6, { k: 'paint', d: 1.0, dir: 0 }],
    ['s12', 90.6, 97.6, { k: 'paint', d: 1.0, dir: -1.2 }], ['s13', 97.6, 105.1, { k: 'paint', d: 1.0, dir: 0 }], ['s14', 105.1, 112, { k: 'paint', d: 1.2, dir: 1.57 }], ['s15', 112, 119, { k: 'cut' }],
    ['s16', 119, 126.6, { k: 'paint', d: 1.0, dir: -.8 }], ['s17', 126.6, 139.4, { k: 'paint', d: 1.2, dir: -1.57 }], ['s18', 139.4, 151.74, { k: 'cut' }]];
  B.order = ORDER;
  const lineOf = { s01: 0, s02: 1, s03: 2, s04: 3, s05: 4, s06: 5, s07: 6, s08: 7, s10: 8, s11: 9, s12: 10, s13: 11, s14: 12, s15: 13, s16: 14, s17: 15 };
  function state(o, abs) { const i = Math.max(0, Math.min(TL ? TL.level.length - 1 : 0, Math.round(abs * 24))); const li = lineOf[o[0]], ws = TL && li != null ? TL.words.filter(w => w.line === li) : []; return { id: o[0], t: abs - o[1], abs, dur: o[2] - o[1], u: A.clamp((abs - o[1]) / (o[2] - o[1])), n: Math.round((abs - o[1]) * 12), w: k => ws[k] ? ws[k].t0 - o[1] : 0, we: k => ws[k] ? ws[k].t1 - o[1] : 0, words: ws, line: li, level: TL ? TL.level[i] : 0, mouth: TL ? TL.mouth[i] : 0, round: TL ? TL.round[i] : 0 }; }
  function fnFor(o, abs) { const sc = B.scenes[o[0]]; const st = state(o, abs); return p => { if (sc) sc.draw(p, st); else p.paper('#e6d9c0'); if (B.lyrics) B.lyrics(p, st); }; }
  let E = null;
  B.init = function (canvas, opts = {}) { const useStub = opts.stub || !B.engine; E = useStub ? B.stub(canvas) : B.engine.create(canvas, opts); B.E = E; return E; };
  // draw the sheet for song time t (held on twos). returns drawing index.
  B.renderAt = function (t) {
    const n = Math.floor(t * 12 + 1e-6), abs = n / 12; let k = 0; for (let i = 0; i < ORDER.length; i++) if (abs >= ORDER[i][1]) k = i;
    const cur = ORDER[k], tr = cur[3], into = abs - cur[1]; const nx = ORDER[k + 1];
    // a transition of length d straddles the cut: 40% before, 60% after
    let a = null, b = null, q = 1, T = null;
    if (k > 0 && tr.d && into < tr.d * .6) { a = ORDER[k - 1]; b = cur; T = tr; q = (into + tr.d * .4) / tr.d; }
    else if (nx && nx[3].d && nx[1] - abs < nx[3].d * .4) { a = cur; b = nx; T = nx[3]; q = (abs - (nx[1] - nx[3].d * .4)) / nx[3].d; }
    if (a) E.over(fnFor(a, abs), fnFor(b, abs), A.clamp(q), { n, kind: T.k, dir: T.dir || 0, idA: a[0], idB: b[0] }); else E.draw(fnFor(cur, abs), { n, id: cur[0] });
    return n;
  };
  B.drawFn = function (name, k) { E.draw(p => B.test[name](p, k), { n: Math.round((k || 0) * 12), id: 'test:' + name }); };
})();
