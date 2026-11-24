// shell.js - the title sheet and the player. The song is the clock: the picture only ever asks what time the song says it is.
(function () {
  const B = window.BIDE, A = B.anim, clamp = A.clamp, lerp = A.lerp;
  const CX = 960, CY = 770, R = 92, PAPER = '#e6d9c0', RED = '#a8342b';
  // ------------------------------------------------------------------------------------------------ the title sheet, drawn with the same engine
  // ball of wool: a soft red mass, then the windings (circles of a sphere seen from outside), the loose end, a little hatched weight under it
  function wool(p, cx, cy, r, turn, k, n) {
    const F = p.fix, pts = []; for (let i = 0; i < 18; i++) { const a = i / 18 * A.TAU, q = r * (1 + .05 * (F(i, 3) - .5) + .02 * (p.rnd(i, 8) - .5)); pts.push([cx + Math.cos(a) * q * 1.02, cy + Math.sin(a) * q * .97]); }
    if (k > .25) { const q = clamp((k - .25) / .4); p.mass(pts, { color: { rad: [cx - r * .3, cy - r * .35, r * 1.5], stops: [[0, '#c24a3c'], [.5, RED], [1, '#6e1f1b']] }, alpha: q, dir: .7, vary: .4, dens: 1.1 }); }
    const groups = [[.2, .5, 5], [1.25, .35, 5], [2.3, .65, 6], [.75, 1.0, 5], [2.8, .25, 4], [1.75, .85, 5]]; let c = 0; const all = groups.reduce((a, g) => a + g[2], 0);
    groups.forEach((g, gi) => {
      const th = g[0] + turn * (gi % 2 ? .8 : 1), tilt = g[1] + .35 * Math.sin(turn + gi); const ux = Math.cos(th), uy = Math.sin(th);                          // axis of this wind
      for (let j = 0; j < g[2]; j++, c++) {
        const kk = clamp(k * all * 1.15 - c); if (kk <= 0) return; const off = (j - (g[2] - 1) / 2) * .17 + .05 * (F(gi, j) - .5), rr = Math.sqrt(Math.max(.05, 1 - off * off)), L = [];
        const ax = [ux * Math.cos(tilt), uy * Math.cos(tilt), Math.sin(tilt)], bx = [-uy, ux, 0], by = [ax[1] * bx[2] - ax[2] * bx[1], ax[2] * bx[0] - ax[0] * bx[2], ax[0] * bx[1] - ax[1] * bx[0]];
        for (let i = 0; i <= 40; i++) { const a = i / 40 * A.TAU + gi, v = [0, 1, 2].map(q => ax[q] * off + (bx[q] * Math.cos(a) + by[q] * Math.sin(a)) * rr); if (v[2] > -.06) L.push([i, cx + v[0] * r * 1.0, cy + v[1] * r * .97, .55 + .5 * v[2]]); else L.push(null); }
        // the visible arc may wrap round the end of the list: start it after a gap
        let s = L.findIndex((v, i) => v && !L[(i + L.length - 1) % L.length]); if (s < 0) s = 0; const arc = []; for (let i = 0; i < L.length; i++) { const v = L[(s + i) % L.length]; if (!v) break; arc.push([v[1], v[2], v[3]]); }
        if (arc.length < 4) continue; const cut = arc.slice(0, Math.max(3, Math.ceil(arc.length * kk))), lit = F(gi, j, 2);
        p.line(cut, { color: lit > .72 ? '#dd7a69' : lit > .4 ? '#bf4639' : '#7d2520', w: 4.2 + 1.6 * F(gi, j, 5), press: .75, medium: 'crayon', taper: [.06, .08], wobble: .8 });
      }
    });
    if (k > .6) { const q = clamp((k - .6) / .3); const o = []; for (let i = 0; i <= 15; i++) { const a = -.6 + i / 15 * 5.6 * q; o.push([cx + Math.cos(a) * r * 1.03, cy + Math.sin(a) * r * .99, .5 + .5 * F(i, 4)]); } if (o.length > 3 && q > .1) p.line(o, { color: '#4a2a24', w: 2.4, press: .7, medium: 'graphite', taper: [.1, .2] }); }
  }
  function weight(p, cx, cy, r, k) { for (let i = 0; i < 13; i++) { if (i / 13 > k) break; const x = cx - r * .95 + i * r * .17 + 4 * (p.fix(i, 1) - .5), y = cy + r * .98 + 5 * (p.fix(i, 2) - .5); p.line([[x, y, .9], [x + r * .16, y + 7, .7], [x + r * .34 + 14 * p.fix(i, 3), y + 10 + 5 * p.fix(i, 6), .3]], { color: '#5a4e44', w: 2.6, press: .42, medium: 'graphite', taper: [.1, .5] }); } }
  // loose end of the wool: lies on the paper to the right, one lazy loop, off the sheet
  function tail(p, x, y, k, sway, r, from) {
    const T = [[x + r * .2, y + r * .96], [x + r * 1.15, y + r * 1.03], [x + r * 2.1, y + r * .82 + sway], [x + r * 2.9, y + r * 1.2], [x + r * 3.7, y + r * 1.12 + sway], [x + r * 4.0, y + r * .52], [x + r * 3.45, y + r * .42 - sway], [x + r * 3.3, y + r * .98], [x + r * 4.4, y + r * 1.22], [x + r * 5.8, y + r * .9 + sway], [x + r * 7.4, y + r * 1.28], [x + r * 9.2, y + r * 1.02], [x + r * 11, y + r * 1.2]];
    let q = A.spline(T, 7); q = q.slice(0, Math.max(0, Math.round(q.length * k))); if (from != null) { let i = 0; for (let j = 0; j < q.length; j++) if (q[j][0] < from) i = j; q = q.slice(i); if (q.length) q[0] = [from - r * .1, y + r * .97]; } if (q.length > 3) p.line(q.map((v, i) => [v[0], v[1], .75 + .25 * p.fix(i >> 2, 9)]), { color: RED, w: 4.4, press: .85, medium: 'crayon', taper: [.01, .03], wobble: .9 });
  }
  const H = () => B.hand;
  // the title is written on the sheet the film starts on, and the wool comes back on the sheet it ends on: ask the scene which paper that is
  const papers = {};
  function paperOf(id, u) {
    if (papers[id]) return papers[id]; const sc = B.scenes && B.scenes[id]; let got = null;
    if (sc) { const stop = {}, d = id === 's00' ? 8.4 : 12.3, q = new Proxy({}, { get: (o, k) => k === 'paper' ? c => { got = c; throw stop; } : k === 'W' ? 1920 : k === 'H' ? 1080 : k === 'n' || k === 't' ? 0 : () => .5 }); try { sc.draw(q, { id, t: u * d, abs: u * d, dur: d, u, n: Math.round(u * d * 12), w: () => 0, we: () => 0, words: [], level: 0, mouth: 0, round: 0 }); } catch (e) { } }
    return papers[id] = typeof got === 'string' ? got : PAPER;
  }
  function openSheet(p, q) { // q: {a seconds since the sheet appeared, leave 0..1 or -1, again, hot, focus, n}
    p.paper(q.again ? paperOf('s18', 1) : paperOf('s00', 0));
    const a = q.a, L = q.leave;
    if (!q.again) {
      p.layer('title', { every: L >= 0 ? 1 : 3, depth: 1 });
      const k = clamp(a / 2.3);
      if (L < 0) H().title(p, { x: CX, y: 470, size: 222, k });
      else rubTitle(p, L);
      if (k >= 1 && L < 0) H().write(p, 'press the wool', { x: CX - R - 64, y: CY + R * .95, size: 42, align: 'right', k: clamp((a - 3.5) / .9), seed: 8, color: '#5a4e44', w: 3.6 });
    } else if (L < 0) { p.layer('title', { every: 3, depth: 1 }); H().write(p, 'again', { x: CX - R - 64, y: CY + R * .95, size: 46, align: 'right', k: clamp((a - 1.3) / .6), seed: 5, color: '#5a4e44', w: 3.9 }); }
    p.layer('wool', { every: L >= 0 || a < 4 ? 1 : 3, depth: 1 });
    const s0 = q.again ? 0 : 1.5, kb = clamp((a - s0) / 1.3), kt = clamp((a - s0 - .7) / .8);
    if (L < 0) {
      const hot = q.hot ? 1 : 0, sq = hot ? 1.5 * Math.sin(q.n * 1.9) : 0;
      if (kt > 0) tail(p, CX, CY, kt, 3 * Math.sin(q.n * .9) * (hot ? 2.4 : .5), R);
      if (kb > 0) { weight(p, CX, CY, R, clamp(kb * 1.5 - .5)); wool(p, CX + sq, CY, R, .12 * hot * Math.sin(q.n * 1.3), kb, q.n); }
      if (q.focus && kb >= 1) { const o = []; for (let i = 0; i <= 22; i++) { const an = -2 + i / 22 * 6.9; o.push([CX + Math.cos(an) * (R + 27 + i * .35), CY + Math.sin(an) * (R + 25 - i * .3)]); } p.line(o, { color: '#4a4038', w: 3.4, press: .85, medium: 'graphite', taper: [.04, .1], passes: 2 }); }
    } else { // pressed: gives under the finger, then rolls away off the sheet, paying out its thread behind it
      const x = L < .22 ? 0 : Math.pow((L - .22) / .78, 1.7) * 1240, give = L < .22 ? Math.sin(L / .22 * Math.PI) : 0, hop = x > 40 ? Math.abs(Math.sin(x / 150)) * 9 * (1 - L) : 0, cx = CX - give * 16 + x, cy = CY + give * 9 - hop;
      tail(p, CX, CY, 1, 0, R, cx + R * .12);
      if (cx < 1920 + R * 1.3) { weight(p, cx, CY, R * (1 + .1 * give), 1 - .5 * L); p.push(); p.translate(cx, cy); p.scale(1 + .07 * give, 1 - .09 * give); wool(p, 0, 0, R, x / R, 1, q.n); p.pop(); }
    }
  }
  // the title goes the way the lyric goes: rubbed out with the side of the hand
  function rubTitle(p, L) {
    const T = H().titleLayout({ x: CX, y: 470, size: 222 }), q = clamp(L / .72), front = lerp(T.x0 - 160, T.x1 + 160, q * q * (3 - 2 * q)), gone = clamp((L - .6) / .36);
    T.strokes.forEach((s, si) => {
      let keep = [], ghost = []; const fk = () => { if (keep.length > 2) p.line(keep, { color: '#4a4038', w: 10.4, press: 1.2, medium: 'graphite', wobble: .5, taper: [.01, .02] }); keep = []; }, fg = () => { if (ghost.length > 2 && gone < 1) p.line(ghost, { color: '#6a5d50', w: 21, press: .78, alpha: .34 * (1 - gone), medium: 'graphite', wobble: 1.5, taper: [.12, .2] }); ghost = []; };
      s.pts.forEach((v, i) => { const d = front + 30 * (p.fix(si, 2) - .5) - v[0]; if (d < 0) { fg(); keep.push(v); } else { fk(); const z = clamp(d / 90); ghost.push([v[0] + 26 * (1 - z) + 18 * z, v[1] + 2 * (p.rnd(i, si) - .5), v[2] * (1 - .4 * z)]); } }); fk(); fg();
    });
  }

  B.titleSheet = { draw: openSheet, wool, CX, CY, R };
  B.test = B.test || {}; B.test.openSheet = (p, k) => openSheet(p, { a: k < 10 ? k : 99, leave: k >= 10 && k < 20 ? (k - 10) / 10 : -1, again: k >= 20, hot: false, focus: k === 9.5, n: Math.round(k * 12) });
})();

// the player
//   BIDE.player  { state, time(), index(), play(), pause(), toggle(), seek(t), restart(), mute(), fullscreen(), ready, stats }
// States: open (title sheet, ball of wool) -> leaving (title rubbed out, ball rolls off) -> playing <-> paused -> ended (blank, then the ball again)
(function () {
  const B = window.BIDE, A = B.anim, $ = id => document.getElementById(id);
  const desk = $('desk'); if (!desk) return;                                   // dev.html loads no shell
  const sheet = $('sheet'), ball = $('ball'), live = $('live'), mark = $('mark'), TOTAL = (B.timeline && B.timeline.total) || 151.74;
  const FPS = 12, LEAVE = 1.25, HOLD = 2.6, { draw: openSheet, CX, CY } = B.titleSheet, H = () => B.hand;
  const clamp = A.clamp, lerp = A.lerp, calm = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const stats = { drawn: 0, skipped: 0, cost: 0, worst: 0, quality: 1, stub: false, kind: '', log: [], keepLog: false };
  let canvas = $('film'), E = null;

  // ------------------------------------------------------------------------------------------------ engine on the sheet
  function hasGL2() { try { const c = document.createElement('canvas'), g = c.getContext('webgl2'); if (g) { const x = g.getExtension('WEBGL_lose_context'); if (x) x.loseContext(); } return !!g; } catch (e) { return false; } }
  function freshCanvas() { const c = canvas.cloneNode(false); c.width = 1920; c.height = 1080; canvas.replaceWith(c); canvas = c; }
  function boot(stub) {
    try { E = B.init(canvas, { stub: stub || !hasGL2() }); if (!E) throw 0; } catch (e) { freshCanvas(); E = B.init(canvas, { stub: true }); }
    stats.stub = !!(E.p && E.p.isStub); if (stats.quality < 1) setQ();
    canvas.addEventListener('webglcontextlost', ev => { ev.preventDefault(); const dead = canvas; setTimeout(() => { if (dead === canvas) { freshCanvas(); boot(lost++ > 1); dirty = true; } }, 400); });
  }
  function setQ() { if (E.quality) E.quality(stats.quality); else if (E.setRes) E.setRes(stats.quality); }
  let lost = 0, dirty = true;

  // ------------------------------------------------------------------------------------------------ song
  // clocks: 'buffer' (decoded, sample-accurate), 'media' (an <audio> element, if decoding fails), 'silent' (no song in the file)
  let ctx = null, gain = null, buf = null, audio = null, src = null, t0 = 0, muted = false, kind = 'silent', rate = 48000, sil = { base: 0, at: 0, run: false };
  const AC = window.AudioContext || window.webkitAudioContext, OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const breathe = () => new Promise(r => setTimeout(r, 0));
  async function unpack(text) {                                                // base64 -> bytes in slices, so the title keeps writing itself meanwhile
    const n = text.length, pad = text.endsWith('==') ? 2 : text.endsWith('=') ? 1 : 0, out = new Uint8Array(Math.floor(n * 3 / 4) - pad), step = 1 << 20; let o = 0;
    for (let i = 0; i < n; i += step) { const s = atob(text.slice(i, i + step)); for (let j = 0; j < s.length; j++) out[o++] = s.charCodeAt(j); await breathe(); }
    return out;
  }
  function sniff(b) {                                                          // container + sample rate, so decoding never resamples
    const s = String.fromCharCode(b[0], b[1], b[2], b[3]);
    if (s === 'fLaC') return { type: 'audio/flac', rate: (b[18] << 12) | (b[19] << 4) | (b[20] >> 4) };
    if (s === 'RIFF') return { type: 'audio/wav', rate: b[24] | b[25] << 8 | b[26] << 16 | b[27] << 24 };
    return { type: s === 'OggS' ? 'audio/ogg' : 'audio/mp4', rate: 48000 };
  }
  async function prepare() {
    const el = $('song'); const text = el ? el.textContent.replace(/\s+/g, '') : ''; if (!text || !OAC) { kind = text ? 'media' : 'silent'; if (!text) return; }
    let bytes = await unpack(text); el.textContent = ''; const info = sniff(bytes); rate = info.rate >= 8000 && info.rate <= 96000 ? info.rate : 48000;
    const blob = new Blob([bytes], { type: info.type });
    if (OAC) {
      try { const oc = new OAC(1, 1, rate), ab = bytes.buffer; bytes = null; buf = await new Promise((ok, no) => { const q = oc.decodeAudioData(ab, ok, no); if (q && q.then) q.then(ok, no); }); if (!buf || buf.duration < 1) throw 0; kind = 'buffer'; return; } catch (e) { buf = null; }
    }
    audio = document.createElement('audio'); audio.preload = 'auto'; audio.src = URL.createObjectURL(blob); kind = 'media';
    await new Promise(r => { audio.oncanplay = r; audio.onerror = () => { kind = 'silent'; audio = null; r(); }; setTimeout(r, 4000); });
  }
  let ready = false; const preparing = prepare().catch(() => { kind = 'silent'; }).then(() => { ready = true; stats.kind = kind; });

  function unlock() {                                                          // must run inside the press
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { }
    if (!ctx && AC) { try { ctx = new AC({ sampleRate: rate, latencyHint: 'playback' }); } catch (e) { try { ctx = new AC(); } catch (e2) { ctx = null; } } if (ctx) { gain = ctx.createGain(); gain.gain.value = muted ? 0 : 1; gain.connect(ctx.destination); ctx.onstatechange = () => { if (ctx.state === 'interrupted' && state === 'playing') setState('paused'); }; } }
    if (ctx && ctx.state !== 'running') { const q = ctx.resume(); if (q && q.catch) q.catch(() => { }); }
    if (kind === 'media' && audio && (state === 'open' || state === 'ended')) { const v = audio.volume; audio.volume = 0; const q = audio.play(); if (q && q.then) q.then(() => { audio.pause(); audio.currentTime = 0; audio.volume = v; }, () => { }); }
  }
  const late = () => Math.min(.3, (ctx && (ctx.outputLatency || ctx.baseLatency)) || 0);   // what is HEARD now left the context this long ago
  const clock = {
    t() { if (kind === 'buffer') return ctx.currentTime - t0 - late(); if (kind === 'media' && sil.pre == null) return audio.currentTime; return sil.base + (sil.run ? (performance.now() - sil.at) / 1000 : 0); },
    start(off, delay) {
      if (kind === 'buffer') { if (src) { try { src.stop(); } catch (e) { } src.disconnect(); } src = ctx.createBufferSource(); src.buffer = buf; src.connect(gain); const when = ctx.currentTime + Math.max(.02, delay); t0 = when - off; const g = gain.gain; g.cancelScheduledValues(ctx.currentTime); g.setValueAtTime(0, Math.max(0, when - .005)); g.linearRampToValueAtTime(muted ? 0 : 1, when + .02); src.start(when, Math.min(off, buf.duration - .01)); t0 -= 0; }
      else if (kind === 'media') { audio.muted = muted; audio.currentTime = off; if (delay > .05) { sil = { base: off - delay, at: performance.now(), run: true, pre: 1 }; setTimeout(() => { sil.pre = null; if (state === 'playing' || state === 'leaving') audio.play().catch(() => { kind = 'silent'; sil = { base: off, at: performance.now(), run: true }; }); }, delay * 1000); } else if (state === 'playing') audio.play().catch(() => { }); }
      else sil = { base: off - delay, at: performance.now(), run: true };
    },
    pause() { if (kind === 'buffer') return ctx.suspend(); if (kind === 'media') audio.pause(); else { sil.base = clock.t(); sil.run = false; } },
    resume() { if (kind === 'buffer') return ctx.resume(); if (kind === 'media') audio.play().catch(() => { }); else { sil.at = performance.now(); sil.run = true; } },
    stop() { if (kind === 'buffer') { if (src) { try { src.stop(); } catch (e) { } src.disconnect(); src = null; } if (ctx && ctx.state === 'running') ctx.suspend(); } else if (kind === 'media') audio.pause(); else sil.run = false; },
    mute(m) { muted = m; if (gain) gain.gain.setTargetAtTime(m ? 0 : 1, ctx.currentTime, .02); if (audio) audio.muted = m; }
  };

  // ------------------------------------------------------------------------------------------------ states
  let state = 'open', since = performance.now(), leaveFrom = 0, hot = false, focus = false, lastN = -1, endAt = 0, raf = 0, waiting = false;
  function setState(s) { state = s; since = performance.now(); lastN = -1; dirty = true; const idle = s === 'open' || s === 'ended'; ball.hidden = !(idle && (s === 'open' || endAt === 0)); if (s === 'ended') { ball.hidden = true; ball.setAttribute('aria-label', 'Play Danny Boy again'); } sheet.style.cursor = s === 'playing' || s === 'paused' ? 'pointer' : ''; showMark(s === 'paused'); kick(); }
  const say = t => { live.textContent = t; };
  async function play() {
    if (state === 'paused') { unlock(); pausedAt = null; await clock.resume(); setState('playing'); say('Playing'); return; }
    if (state === 'playing' || state === 'leaving') return; const again = state === 'ended';
    unlock(); leaveAgain = again; leaveFrom = performance.now(); waiting = !ready; setState('leaving'); say('Playing Danny Boy');
    const run = () => { waiting = false; if (state !== 'leaving') return; if (kind === 'buffer' && !ctx) unlock(); if (kind === 'buffer' && !ctx) kind = 'silent'; const left = Math.max(.06, LEAVE - (performance.now() - leaveFrom) / 1000); clock.start(0, left); started = true; };
    started = false; if (ready) { if (ctx && ctx.state === 'suspended') { try { await Promise.race([ctx.resume(), new Promise(r => setTimeout(r, 500))]); } catch (e) { } } run(); } else { await preparing; unlock(); run(); }
  }
  let started = false, leaveAgain = false;
  async function pause() { if (state !== 'playing') return; pausedAt = now(); await clock.pause(); if (state === 'playing') { setState('paused'); say('Paused'); } }
  function toggle() { return state === 'playing' ? pause() : state === 'leaving' ? undefined : play(); }
  function seek(t) {
    if (state !== 'playing' && state !== 'paused') return; t = clamp(t, 0, TOTAL - .05); const was = state;
    clock.start(t, .03); if (was === 'paused') { if (kind === 'silent') { sil.base = t; sil.run = false; } if (kind === 'media') audio.pause(); pausedAt = t; } lastN = -1; dirty = true; showMark(true); kick();
  }
  let pausedAt = null;
  function restart() { if (state === 'open' || state === 'leaving') return; if (state === 'ended') return play(); seek(0); if (state === 'paused') play(); }
  function mute() { clock.mute(!muted); showMark(true); say(muted ? 'Muted' : 'Sound on'); }
  function fullscreen() { const d = document, el = d.documentElement; try { if (d.fullscreenElement || d.webkitFullscreenElement) (d.exitFullscreen || d.webkitExitFullscreen).call(d); else { const q = (el.requestFullscreen || el.webkitRequestFullscreen).call(el); if (q && q.catch) q.catch(() => { }); } } catch (e) { } }
  const now = () => clock.t();

  // ------------------------------------------------------------------------------------------------ loop
  let lastFrame = 0, maxGap = 0, slow = 0, cpu = 0, drewAt = 0;
  function measure() { // the drawing before this one is over: what did it really cost (our time, or the screen held up by the GPU)?
    if (!drewAt) return; const c = Math.max(cpu, maxGap > 400 ? 0 : maxGap); stats.cost += (c - stats.cost) * .1; if (state === 'playing') stats.worst = Math.max(stats.worst, c); slow = c > 70 ? slow + 1 : Math.max(0, slow - .5);
    if (slow >= 8 && stats.quality > .5) { stats.quality = stats.quality > .8 ? .75 : .55; setQ(); slow = -6; }
  }
  function paint(fn) { measure(); const a = performance.now(); fn(); cpu = performance.now() - a; drewAt = a; maxGap = 0; stats.drawn++; }
  function kick() { if (!raf) raf = requestAnimationFrame(frame); }
  function frame(t) {
    raf = requestAnimationFrame(frame); if (lastFrame) maxGap = Math.max(maxGap, t - lastFrame); lastFrame = t; const ms = performance.now();
    if (state === 'open' || (state === 'ended' && endAt === 0)) {
      let a = (ms - since) / 1000; if (calm && state === 'open') a = Math.max(a, 9); const busy = a < (state === 'open' ? 4.6 : 2.2) || hot, n = Math.floor(a * FPS), every = calm ? 1e9 : busy ? 1 : 4, m = busy ? n : Math.floor(n / every) * every;
      if (m !== lastN || dirty) { lastN = m; dirty = false; paint(() => E.draw(p => openSheet(p, { a, leave: -1, again: state === 'ended', hot, focus, n: m }), { n: m, id: state })); }
    } else if (state === 'leaving') {
      const q = clamp((ms - leaveFrom) / 1000 / LEAVE, 0, waiting || !started ? .97 : 1), n = Math.floor(q * LEAVE * FPS + 1e-6);
      if (started && clock.t() >= 0) { setState('playing'); return; }
      if (n !== lastN) { lastN = n; paint(() => E.draw(p => openSheet(p, { a: 99, leave: n / FPS / LEAVE, again: leaveAgain, n }), { n, id: 'leaving' })); }
    } else if (state === 'playing' || state === 'paused') {
      const s = state === 'paused' && pausedAt != null ? pausedAt : now(); if (state === 'playing') pausedAt = null;
      if (s >= TOTAL + .1 || (kind === 'media' && audio.ended)) { clock.stop(); endAt = ms; setState('ended'); endAt = ms; return; }
      const n = Math.floor(clamp(s, 0, TOTAL - .01) * FPS + 1e-6);
      if (n !== lastN || dirty) { if (lastN >= 0 && n > lastN + 1) stats.skipped += n - lastN - 1; lastN = n; dirty = false; paint(() => B.renderAt(n / FPS + 1e-4)); if (stats.keepLog) stats.log.push([n, s, performance.now()]); }
    } else if (state === 'ended') { // the blank sheet holds, then the wool comes back
      if (ms - endAt > HOLD * 1000) { endAt = 0; since = ms; lastN = -1; ball.hidden = false; say('The end. Press the wool to hear it again.'); }
    }
    drawMark(ms);
  }

  // ------------------------------------------------------------------------------------------------ hairline progress, only while the pointer moves
  let markUntil = 0, markA = 0, markKey = ''; const mc = mark.getContext('2d');
  function showMark(on) { markUntil = performance.now() + (on ? 1800 : 0); }
  function drawMark(ms) {
    const want = (state === 'playing' || state === 'paused') && (ms < markUntil || state === 'paused' || drag) ? 1 : 0; markA += (want - markA) * .18; if (markA < .02 && !want) markA = 0;
    const s = clamp(now2() / TOTAL), key = [markA.toFixed(2), Math.round(s * 1900), state, muted, mark.width].join(); if (key === markKey) return; markKey = key;
    const w = mark.width, h = mark.height, u = w / 1920, c = mc; c.clearRect(0, 0, w, h); if (markA <= 0) return; c.save(); c.globalAlpha = markA; c.lineCap = 'round';
    const x0 = 120, x1 = 1800, y = 1054, wob = x => y + 1.1 * Math.sin(x * .011) + .7 * Math.sin(x * .037 + 1);
    const seg = (a, b, col, lw, al, dy) => { c.strokeStyle = col; c.lineWidth = Math.max(.7 * dpr(), lw * u); c.globalAlpha = markA * al; c.beginPath(); for (let x = a; x <= b; x += 12) c.lineTo(x * u, (wob(x) + dy) * u); c.lineTo(b * u, (wob(b) + dy) * u); c.stroke(); };
    seg(x0, x1, '#f3ead8', 3, .28, 2); seg(x0, x1, '#54483d', 1.4, .5, 0); const X = lerp(x0, x1, s); seg(x0, X, '#54483d', 2.6, .9, 0);
    c.globalAlpha = markA; c.strokeStyle = '#54483d'; c.lineWidth = Math.max(1 * dpr(), 3 * u); c.beginPath(); c.moveTo((X + 2) * u, (y - 11) * u); c.lineTo((X - 2) * u, (y + 11) * u); c.stroke();
    const note = state === 'paused' ? 'paused' : muted ? 'muted' : ''; if (note && H()) { const L = H().layout(note, { x: 1800, y: 78, size: 46, align: 'right', seed: 3 }); for (const pass of [['#f3ead8', 7, .35], ['#4a4038', 3, .9]]) { c.strokeStyle = pass[0]; c.globalAlpha = markA * pass[2]; c.lineWidth = Math.max(1, pass[1] * u); c.lineJoin = 'round'; for (const q of L.strokes) { c.beginPath(); for (const v of q.pts) c.lineTo(v[0] * u, v[1] * u); c.stroke(); } } }
    c.restore();
  }
  const now2 = () => state === 'paused' && pausedAt != null ? pausedAt : (state === 'playing' || state === 'paused') ? now() : 0;

  // ------------------------------------------------------------------------------------------------ window, pointer, keys
  const dpr = () => Math.min(3, window.devicePixelRatio || 1);
  function fit() {
    const W = desk.clientWidth || innerWidth, HH = desk.clientHeight || innerHeight, d = dpr(), k = Math.min(W / 1920, HH / 1080), w = Math.max(1, Math.round(1920 * k * d)), h = Math.max(1, Math.round(1080 * k * d));
    sheet.style.width = w / d + 'px'; sheet.style.height = h / d + 'px'; sheet.style.left = Math.round((W - w / d) / 2 * d) / d + 'px'; sheet.style.top = Math.round((HH - h / d) / 2 * d) / d + 'px';
    if (mark.width !== w || mark.height !== h) { mark.width = w; mark.height = h; markKey = ''; } ball.style.left = CX / 19.2 + '%'; ball.style.top = CY / 10.8 + '%'; dirty = true; kick();
  }
  const at = e => { const r = sheet.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * 1920, (e.clientY - r.top) / r.height * 1080]; };
  let drag = false, hideT = 0;
  const stir = () => { if (state === 'playing' || state === 'paused') showMark(true); desk.classList.remove('quiet'); clearTimeout(hideT); hideT = setTimeout(() => { if (state === 'playing') desk.classList.add('quiet'); }, 2200); };
  const onLine = e => (state === 'playing' || state === 'paused') && markA > .4 && Math.abs(at(e)[1] - 1054) < 34 && at(e)[0] > 90 && at(e)[0] < 1830;
  const toLine = e => clamp((at(e)[0] - 120) / 1680) * TOTAL;
  desk.addEventListener('pointermove', e => { stir(); if (drag) seek(toLine(e)); });
  desk.addEventListener('pointerdown', e => { if (e.button) return; if (onLine(e)) { drag = true; try { desk.setPointerCapture(e.pointerId); } catch (x) { } seek(toLine(e)); e.preventDefault(); } });
  const drop = e => { if (drag) { drag = false; swallow = performance.now(); } }; let swallow = -1e9;
  desk.addEventListener('pointerup', drop); desk.addEventListener('pointercancel', drop);
  desk.addEventListener('click', e => { if (e.target === ball || performance.now() - swallow < 250) return; if (state === 'playing' || state === 'paused') { stir(); toggle(); } });
  ball.addEventListener('click', e => { e.stopPropagation(); play(); });
  ball.addEventListener('pointerenter', () => { hot = true; dirty = true; }); ball.addEventListener('pointerleave', () => { hot = false; dirty = true; });
  ball.addEventListener('focus', () => { let v = true; try { v = ball.matches(':focus-visible'); } catch (e) { } focus = v; dirty = true; }); ball.addEventListener('blur', () => { focus = false; dirty = true; });
  addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return; const k = e.key;
    if (k === ' ' || k === 'Spacebar') { if (e.target === ball && !ball.hidden) return; e.preventDefault(); if (e.repeat) return; if (state === 'ended' && ball.hidden) return; stir(); toggle(); }
    else if (k === 'ArrowLeft' || k === 'ArrowRight') { e.preventDefault(); seek(now2() + (k === 'ArrowLeft' ? -5 : 5)); }
    else if (k === 'r' || k === 'R') restart(); else if (k === 'f' || k === 'F') fullscreen(); else if (k === 'm' || k === 'M') mute();
  });
  addEventListener('resize', fit); addEventListener('orientationchange', fit); document.addEventListener('fullscreenchange', fit); document.addEventListener('visibilitychange', () => { lastFrame = 0; maxGap = 0; drewAt = 0; dirty = true; });
  if (window.ResizeObserver) new ResizeObserver(fit).observe(desk);

  B.player = { get state() { return state; }, get muted() { return muted; }, get ready() { return ready; }, preparing, time: now2, index: () => lastN, play, pause, toggle, seek, restart, mute, fullscreen, stats, total: TOTAL, get audio() { return { kind, rate, ctx: ctx && ctx.state, dur: buf && buf.duration, late: late() }; }, clockTime: () => clock.t() };
  fit(); boot(/[?&]stub\b/.test(location.search)); setState('open');
})();
