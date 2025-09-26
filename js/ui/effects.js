export function toast(el, msg){
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(()=> el.classList.remove('show'), 1200);
}

export function ping(el){
  if (!el) return;
  el.classList.remove('ping');
  void el.offsetWidth; // reflow
  el.classList.add('ping');
}

export function bigX(overlay, textEl, count){
  if (!overlay) return;
  overlay.style.pointerEvents = 'none';
  overlay.classList.add('show');
  if (textEl) textEl.textContent = '✖'.repeat(Math.max(1, Math.min(3, count||1)));
  setTimeout(()=> overlay.classList.remove('show'), 650);
}

/* ------------------- SFX (WebAudio, sin archivos) ------------------- */
let _ctx;
function ctx(){ _ctx = _ctx || new (window.AudioContext||window.webkitAudioContext)(); return _ctx; }
async function ensureRunning(){ try{ if (ctx().state === 'suspended') await ctx().resume(); }catch{} }

function beep({freq=880, dur=0.12, type='sine', gain=0.04, attack=0.01, release=0.08}={}){
  const ac = ctx(); const t0 = ac.currentTime;
  const osc = ac.createOscillator(); const g = ac.createGain();
  osc.type = type; osc.frequency.value = freq;
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0+attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0+attack+Math.max(0,dur-release));
  osc.connect(g).connect(ac.destination);
  osc.start(t0); osc.stop(t0+dur+0.02);
}

function seq(list, gap=0.02){
  const ac = ctx(); let t = ac.currentTime;
  for (const step of list){
    const {freq, dur=0.1, type='sine', gain=0.04} = step;
    const osc = ac.createOscillator(); const g = ac.createGain();
    osc.type = type; osc.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t+0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t+dur);
    osc.connect(g).connect(ac.destination);
    osc.start(t); osc.stop(t+dur+0.02);
    t += dur + gap;
  }
}

export const sfx = {
  async welcome(){
    await ensureRunning();
    // Arpegio amistoso
    seq([{freq:523.25,dur:0.10},{freq:659.25,dur:0.10},{freq:783.99,dur:0.14,type:'triangle'}], 0.03);
  },
  async reveal(){
    await ensureRunning();
    // Ding ascendente
    seq([{freq:880,dur:0.08},{freq:1174.66,dur:0.09,type:'triangle'}], 0.01);
  },
  async error(){
    await ensureRunning();
    // Buzz corto
    beep({freq:160,dur:0.12,type:'square',gain:0.06});
    setTimeout(()=>beep({freq:140,dur:0.10,type:'square',gain:0.05}), 70);
  },
  async board(){  // 🔊 “ya está en tablero”
    await ensureRunning();
    // Tono corto y amable (descendente)
    seq([{freq:659.25,dur:0.06,type:'triangle',gain:0.05},{freq:523.25,dur:0.06,type:'triangle',gain:0.04}], 0.015);
  }
};
