/* ====================== E F F E C T S  &  S F X ====================== */
/* Soporta audio personalizado por archivo + fallback a beeps sintetizados */

const LS_VOL = 'sfx_volume';   // 0.0 - 1.0
const LS_MUT = 'sfx_muted';

let _ctx;
let _buffers = {};   // nombre -> AudioBuffer
let _volume = parseFloat(localStorage.getItem(LS_VOL) ?? '0.9');
let _muted  = localStorage.getItem(LS_MUT) === '1';

function ctx(){ _ctx = _ctx || new (window.AudioContext||window.webkitAudioContext)(); return _ctx; }
async function ensureRunning(){ try{ if (ctx().state === 'suspended') await ctx().resume(); }catch{} }

export const audio = {
  get volume(){ return _volume; },
  set volume(v){
    _volume = Math.max(0, Math.min(1, Number(v)||0));
    localStorage.setItem(LS_VOL, String(_volume));
  },
  get muted(){ return _muted; },
  set muted(m){
    _muted = !!m;
    localStorage.setItem(LS_MUT, _muted ? '1':'0');
  }
};

/* ------------------- CARGA DE ARCHIVOS ------------------- */
/**
 * load(map) decodifica y guarda AudioBuffers.
 * Ejemplo:
 * sfx.load({
 *   welcome:'/audio/welcome.mp3',
 *   reveal:'/audio/reveal.mp3',
 *   error:'/audio/error.mp3',
 *   board:'/audio/board.mp3',
 *   ready:'/audio/ready.mp3',
 *   final:'/audio/final.mp3'
 * })
 */
async function load(map={}){
  const entries = Object.entries(map);
  if (!entries.length) return;
  const AC = ctx();
  await ensureRunning();

  await Promise.all(entries.map(async ([name, url])=>{
    try{
      const res = await fetch(url, {cache:'no-store'});
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const arr = await res.arrayBuffer();
      const buf = await AC.decodeAudioData(arr);
      _buffers[name] = buf;
    }catch(err){
      console.warn('[SFX] no se pudo cargar', name, url, err);
    }
  }));
}

/* ------------------- REPRODUCCIÓN ------------------- */
function playBuffer(name, {gain=1}={}){
  if (_muted) return;
  const buf = _buffers[name];
  if (!buf) return false;
  const AC = ctx();
  const src = AC.createBufferSource();
  const g   = AC.createGain();
  src.buffer = buf;
  g.gain.value = Math.max(0, Math.min(1, gain * _volume));
  src.connect(g).connect(AC.destination);
  src.start();
  return true;
}

/* ------------------- FALLBACK: BEEPS ------------------- */
function beep({freq=880, dur=0.12, type='sine', gain=0.04, attack=0.01}={}){
  if (_muted) return;
  const AC = ctx(); const t0 = AC.currentTime;
  const osc = AC.createOscillator(); const g = AC.createGain();
  osc.type = type; osc.frequency.value = freq;
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain * _volume, t0+attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0+dur);
  osc.connect(g).connect(AC.destination);
  osc.start(t0); osc.stop(t0+dur+0.02);
}
function seq(list, gap=0.02){
  if (_muted) return;
  const AC = ctx(); let t = AC.currentTime;
  for (const step of list){
    const {freq, dur=0.1, type='sine', gain=0.05} = step;
    const osc = AC.createOscillator(); const g = AC.createGain();
    osc.type = type; osc.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain * _volume, t+0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t+dur);
    osc.connect(g).connect(AC.destination);
    osc.start(t); osc.stop(t+dur+0.02);
    t += dur + gap;
  }
}

/* ------------------- API PÚBLICA ------------------- */
export function toast(el, msg){
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(()=> el.classList.remove('show'), 1200);
}

export function ping(el){
  if (!el) return;
  el.classList.remove('ping');
  void el.offsetWidth;
  el.classList.add('ping');
}

export function bigX(overlay, textEl, count){
  if (!overlay) return;
  overlay.style.pointerEvents = 'none';
  overlay.classList.add('show');
  if (textEl) textEl.textContent = '✖'.repeat(Math.max(1, Math.min(3, count||1)));
  setTimeout(()=> overlay.classList.remove('show'), 650);
}

/* Llamar una vez tras cualquier gesto del usuario (click/tecla) para poder reproducir audio */
async function unlock(){ await ensureRunning(); }

/* ---------- Atajos que usan archivo si existe, y si no, caen a beep ---------- */
async function welcome(){
  await unlock();
  if (playBuffer('welcome')) return;
  seq([{freq:523.25,dur:0.10},{freq:659.25,dur:0.10},{freq:783.99,dur:0.14,type:'triangle',gain:0.06}], 0.03);
}
async function reveal(){
  await unlock();
  if (playBuffer('reveal')) return;
  seq([{freq:880,dur:0.08,gain:0.05},{freq:1174.66,dur:0.09,type:'triangle',gain:0.05}], 0.01);
}
async function error(){
  await unlock();
  if (playBuffer('error')) return;
  beep({freq:160,dur:0.12,type:'square',gain:0.06});
  setTimeout(()=>beep({freq:140,dur:0.10,type:'square',gain:0.05}), 70);
}
async function board(){
  await unlock();
  if (playBuffer('board')) return;
  seq([{freq:659.25,dur:0.06,type:'triangle',gain:0.05},{freq:523.25,dur:0.06,type:'triangle',gain:0.04}], 0.015);
}

/* NUEVO: sonido de fase READY (por ejemplo “drum roll” breve) */
async function ready(){
  await unlock();
  if (playBuffer('ready')) return;
  // fallback sutil
  seq([{freq:392,dur:0.08},{freq:440,dur:0.08},{freq:494,dur:0.10}], 0.02);
}

/* NUEVO: sonido de FINAL (aplausos o fanfarria) */
async function final(){
  await unlock();
  if (playBuffer('final')) return;
  // fallback: mini fanfarria
  seq([{freq:784,dur:0.12,type:'triangle',gain:0.06},{freq:988,dur:0.12,type:'triangle',gain:0.06},{freq:1175,dur:0.16,type:'square',gain:0.06}], 0.03);
}

export const sfx = { load, welcome, reveal, error, board, ready, final, unlock, audio };
