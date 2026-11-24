// shot.mjs - zero-dependency capture: one private headless Chrome per call, max 3 at once, always killed.
import { spawn } from 'node:child_process'; import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import { fileURLToPath } from 'node:url';
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url))); const arg = {}; const av = process.argv.slice(2);
for (let i = 0; i < av.length; i++) if (av[i].startsWith('--')) { const k = av[i].slice(2); arg[k] = (av[i + 1] && !av[i + 1].startsWith('--')) ? av[++i] : true; }
const SL = path.join(ROOT, 'build', 'slots'); fs.mkdirSync(SL, { recursive: true });
const alive = pid => { try { process.kill(pid, 0); return true; } catch { return false; } };
async function slot() { for (let tries = 0; tries < 1500; tries++) { for (let s = 0; s < 1; s++) { const f = path.join(SL, 's' + s); try { const fd = fs.openSync(f, 'wx'); fs.writeSync(fd, String(process.pid)); fs.closeSync(fd); return f; } catch { try { const pid = +fs.readFileSync(f, 'utf8'); if (!pid || !alive(pid)) fs.unlinkSync(f); } catch { } } } await new Promise(r => setTimeout(r, 400)); } throw new Error('no capture slot'); }
import { execSync } from 'node:child_process';
const memFree = () => { try { return +/free percentage: (\d+)/.exec(execSync('memory_pressure -Q', { encoding: 'utf8' }))[1]; } catch { return 100; } };
const slotFile = await slot(); for (let i = 0; i < 60 && memFree() < 18; i++) await new Promise(r => setTimeout(r, 2000));
 const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'bide-shot-')); let ch;
const done = () => { try { ch && ch.kill('SIGKILL'); } catch { } try { fs.unlinkSync(slotFile); } catch { } try { fs.rmSync(prof, { recursive: true, force: true }); } catch { } };
process.on('exit', done); process.on('SIGINT', () => process.exit(1)); process.on('SIGTERM', () => process.exit(1)); const guard = setTimeout(() => { console.error('timeout'); process.exit(2); }, (+arg.timeout || 170) * 1000);
try {
  const page = arg.page ? path.resolve(arg.page) : path.join(ROOT, 'film', 'dev.html');
  ch = spawn('/usr/bin/nice', ['-n', '15', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '--headless=new', '--use-angle=metal', '--no-first-run', '--no-default-browser-check', '--mute-audio', '--allow-file-access-from-files', '--disable-extensions', '--window-size=1920,1080', '--autoplay-policy=no-user-gesture-required', '--remote-debugging-port=0', '--user-data-dir=' + prof, 'about:blank'], { stdio: 'ignore' });
  let port; for (let i = 0; i < 700; i++) { try { port = fs.readFileSync(path.join(prof, 'DevToolsActivePort'), 'utf8').split('\n')[0]; break; } catch { await new Promise(r => setTimeout(r, 100)); } }
  const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); const ws = new WebSocket(list.find(x => x.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
  let id = 0; const wait = {}; const logs = []; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && wait[d.id]) { wait[d.id](d); delete wait[d.id]; } if (d.method === 'Runtime.exceptionThrown') logs.push('EXC ' + (d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text).slice(0, 600)); if (d.method === 'Runtime.consoleAPICalled' && ['error', 'warning', 'log'].includes(d.params.type)) logs.push(d.params.type + ': ' + d.params.args.map(a => a.value ?? a.description ?? '').join(' ').slice(0, 400)); };
  const cmd = (method, params = {}) => new Promise(r => { const i = ++id; wait[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
  await cmd('Runtime.enable'); await cmd('Page.enable'); await cmd('Page.navigate', { url: 'file://' + page }); for (let i = 0; i < 900; i++) { const r = await cmd('Runtime.evaluate', { expression: 'document.readyState' }); if (r.result?.result?.value === 'complete') break; await new Promise(r => setTimeout(r, 60)); }
  const ev = async e => { const r = await cmd('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) { logs.push('EXC ' + (r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text).slice(0, 900)); return null; } return r.result?.result?.value; };
  if (arg.eval && arg.only) { console.log(JSON.stringify(await ev(arg.eval))); } else {
    let items = []; if (arg.strip) { const [a, b] = arg.strip.split(':').map(Number); for (let n = Math.round(a * 12); n <= Math.round(b * 12); n += (+arg.step || 1)) items.push(n / 12); } else if (arg.at) items = arg.at.split(',').map(Number); else if (arg.fn) items = String(arg.k ?? '0').split(',').map(Number);
    const crop = arg.crop ? arg.crop.split(',').map(Number) : [0, 0, 1920, 1080]; const w = +arg.w || 640, h = Math.round(w * crop[3] / crop[2]), cols = +arg.cols || Math.min(3, items.length), rows = Math.ceil(items.length / cols);
    await ev(`(()=>{window.__E=BIDE.init(document.getElementById('film'),{stub:${!!arg.stub},capture:true});window.__M=document.createElement('canvas');__M.width=${cols * w};__M.height=${rows * (h + 18)};const c=__M.getContext('2d');c.fillStyle='#111';c.fillRect(0,0,__M.width,__M.height);c.font='13px monospace';return 1})()`);
    if (arg.eval) await ev(arg.eval);
    for (let i = 0; i < items.length; i++) {
      const k = items[i]; const t0 = Date.now();
      await ev(arg.fn ? `(async()=>{BIDE.drawFn('${arg.fn}',${k});if(BIDE.E.finish)BIDE.E.finish();})()` : `(async()=>{const w=${+arg.warm || 0};for(let j=w;j>0;j--)BIDE.renderAt(${k}-j/12);BIDE.renderAt(${k});if(BIDE.E.finish)BIDE.E.finish();})()`);
      await ev(`(()=>{const c=__M.getContext('2d'),x=${(i % cols) * w},y=${Math.floor(i / cols) * (h + 18)},f=document.getElementById('film');c.imageSmoothingQuality='high';c.drawImage(f,${crop[0]}*f.width/1920,${crop[1]}*f.height/1080,${crop[2]}*f.width/1920,${crop[3]}*f.height/1080,x,y,${w},${h});c.fillStyle='#ddd';c.fillText('${arg.fn ? arg.fn + ' k=' : 't='}${typeof k === 'number' ? k.toFixed(3) : k}  ${Date.now() - t0}ms',x+4,y+${h}+13);})()`);
    }
    const out = path.resolve(arg.out || 'build/shot.jpg'); fs.mkdirSync(path.dirname(out), { recursive: true }); const png = out.endsWith('.png'); const d = await ev(`__M.toDataURL('${png ? 'image/png' : 'image/jpeg'}',${+arg.q || .86})`); if (d) { fs.writeFileSync(out, Buffer.from(d.split(',')[1], 'base64')); console.log(out, cols * w + 'x' + rows * (h + 18)); }
  }
  for (const l of [...new Set(logs)].filter(l => !/ERR_FILE_NOT_FOUND|404/.test(l)).slice(0, 12)) console.log(l); ws.close();
} catch (e) { console.error(e); } finally { clearTimeout(guard); process.exit(0); }
