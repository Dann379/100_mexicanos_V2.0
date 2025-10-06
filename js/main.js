import { defaultState } from './core/state.js';
import { currentIndex, nextRound, allRevealed, startGame, reveal } from './core/logic.js';
import { els } from './ui/elements.js';
import { renderHeader, renderQuestion } from './ui/render.js';
import { toast, sfx } from './ui/effects.js';
import { wireWelcome, wireEvents } from './ui/events.js';

/* ===================== Preferencias (localStorage) ===================== */
const LS = { RANDOM:'randomMode', THRESH:'winThreshold' };
const loadPrefRandom   = () => localStorage.getItem(LS.RANDOM)!=='0';
const savePrefRandom   = (on) => localStorage.setItem(LS.RANDOM, on?'1':'0');
const loadPrefThreshold= () => { const v = parseInt(localStorage.getItem(LS.THRESH)||'',10); return Number.isFinite(v)&&v>0?v:500; };
const savePrefThreshold= (n) => { if(Number.isFinite(n)&&n>0) localStorage.setItem(LS.THRESH, String(n)); };

/* ===================== State ===================== */
const state = defaultState({ randomOn: loadPrefRandom(), winThreshold: loadPrefThreshold() });
function resetStateInPlace(prefs){
  const fresh = defaultState(prefs);
  for (const k of Object.keys(state)) delete state[k];
  for (const [k,v] of Object.entries(fresh)) state[k] = v;
}

/* ===================== Audio: priming + carga de pistas ===================== */
// Desbloqueo del AudioContext en el primer gesto del usuario
let __audioPrimed = false;
function primeAudioOnce(){
  if (__audioPrimed) return;
  __audioPrimed = true;
  sfx.unlock();
}
window.addEventListener('pointerdown', primeAudioOnce, { once:true, passive:true });
window.addEventListener('keydown',      primeAudioOnce, { once:true });

// Carga tus pistas personalizadas (ajusta rutas/nombres si hace falta)
sfx.load({
  welcome: '/audio/welcome.wav',
  reveal : '/audio/reveal.wav',
  error  : '/audio/error.wav',
  board  : '/audio/board.wav',
  ready  : '/audio/ready.wav',
  final  : '/audio/final.mp3'
});
// Asegura que no esté muteado y con volumen audible por defecto
if (sfx.audio.muted) sfx.audio.muted = false;
if (!sfx.audio.volume || sfx.audio.volume <= 0) sfx.audio.volume = 0.9;

/* ===================== Datos (preguntas) ===================== */
let dataReadyResolve;
const dataReady = new Promise(res => (dataReadyResolve = res));
const ensureDataReady = () => dataReady;
const DATA = () => window.__DATA__||[];

async function loadData(){
  els.errorBox && (els.errorBox.textContent='');
  const paths = ['./data/preguntas.json','./adata/preguntas.json','./preguntas.json'];
  for (const p of paths){
    try{
      const res = await fetch(p,{cache:'no-store'});
      if(!res.ok) throw new Error();
      const json = await res.json();
      if(!Array.isArray(json)||!json.length) throw new Error();
      window.__DATA__ = json; break;
    }catch(e){}
  }
  if(!window.__DATA__ || !window.__DATA__.length){
    els.errorBox && (els.errorBox.textContent='No se pudieron cargar las preguntas. Revisa /data/preguntas.json');
    window.__DATA__ = [{
      pregunta:'Ejemplo: ¿Qué comen los mexicanos en una taquiza?',
      respuestas:[
        {texto:'Tacos',puntos:38},{texto:'Quesadillas',puntos:25},{texto:'Sopes',puntos:18},
        {texto:'Tostadas',puntos:10},{texto:'Tamales',puntos:6},{texto:'Guacamole',puntos:3}
      ]
    }];
  }
  dataReadyResolve();
  render();
}
window.loadData = loadData;

/* ===================== Render (+ sonidos por cambio de fase) ===================== */
let __lastPhase = 'LOBBY';
let __readyTimer = null;

function render(){
  document.body?.setAttribute('data-phase', state.phase);

  // Sonidos por transición de fase
  if (__lastPhase !== state.phase){
    if (state.phase === 'READY') {
      if (__readyTimer) { clearTimeout(__readyTimer); __readyTimer = null; }
      // READY debe sonar al entrar (welcome ya sonó en SPLASH dentro de events.js)
      __readyTimer = setTimeout(()=> sfx.ready(), 0);
    }
    if (state.phase === 'FINAL') {
      sfx.final();
    }
    __lastPhase = state.phase;
  }

  renderHeader(state);
  const round = DATA()[currentIndex(state)];
  const lobbyMsg = 'Ingresa los nombres de los equipos y pulsa <b>Comenzar</b>';
  renderQuestion(state, round, lobbyMsg);
}

/* ===================== Enter inteligente ===================== */
function revealNext(){
  const round = DATA()[currentIndex(state)];
  if (!round) return false;
  for (let i=0; i<round.respuestas.length; i++){
    if (!state.revealed.has(i)){
      reveal(state, round, i, true);
      sfx.reveal();
      return true;
    }
  }
  return false;
}

/* === Avance con guardas (incluye READY) === */
function guardedAdvance(){
  if (state.phase==='LOBBY') { start(); render(); return; }

  // READY -> ROUND (mostrar la pregunta cuando decida el presentador)
  if (state.phase==='READY'){
    state.phase = 'ROUND';
    render();
    return;
  }

  if (state.phase==='ROUND'){
    revealNext(); // revela la siguiente; si era la última, assignTo -> INTER/FINAL
    render();
    return;
  }

  if (state.phase==='INTER'){
    const round = DATA()[currentIndex(state)];
    if (!allRevealed(state, round)) { toast(els.toast,'Revela todas las respuestas antes de continuar'); return; }
    // Si hubo victoria inmediata, FINAL ya está seteado por assignTo; si no:
    if (state.pendingFinal && state.winner) { state.phase='FINAL'; render(); return; }
    // Prepara siguiente ronda y queda en READY (no muestra la pregunta)
    nextRound(state, DATA(), state.originalTeam);
    render();
    return;
  }

  if (state.phase==='FINAL'){ toast(els.toast,'Juego terminado. Pulsa / para reiniciar'); return; }
}

/* ===================== Start / Reset ===================== */
function start(isReset=false){
  if (isReset){
    const prefs = { randomOn: state.randomOn, winThreshold: state.winThreshold };
    resetStateInPlace(prefs);
    // mostramos splash desde events.js al volver a wireWelcome
    els.welcome?.classList.add('hidden');
    render();
    return;
  }
  const nA = (state.names?.A||'').trim();
  const nB = (state.names?.B||'').trim();
  if (!nA || !nB) { els.errorBox && (els.errorBox.textContent='Debes ingresar ambos nombres de equipo'); return; }

  try { startGame(state, DATA(), 'A'); } // deja fase en READY
  catch { els.errorBox && (els.errorBox.textContent='No hay preguntas cargadas'); return; }

  render();
}

/* ===================== Prefs UI ===================== */
if (els.chkRandom){
  els.chkRandom.checked = state.randomOn;
  els.chkRandom.addEventListener('change', ()=>{
    state.randomOn = !!els.chkRandom.checked;
    savePrefRandom(state.randomOn);
    toast(els.toast, `Aleatorio: ${state.randomOn?'ON':'OFF'}`);
  });
}
if (els.inpThreshold){
  els.inpThreshold.value = String(state.winThreshold);
  els.inpThreshold.addEventListener('input', ()=>{
    const v = parseInt(els.inpThreshold.value,10);
    if(Number.isFinite(v)&&v>0){ state.winThreshold=v; savePrefThreshold(v); }
  });
}

/* ===================== Exportar ===================== */
function downloadJSON(obj, name='resultado_100mex.json'){
  const blob = new Blob([JSON.stringify(obj, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  setTimeout(()=> URL.revokeObjectURL(url), 500);
}
function exportResults(){
  const payload = {
    timestamp: new Date().toISOString(),
    teams: { A: state.names.A, B: state.names.B },
    scores: { A: state.scoreA, B: state.scoreB },
    winThreshold: state.winThreshold,
    multiplier: state.multiplier,
    roundsPlayed: state.roundCursor>=0 ? state.roundCursor+1 : 0,
    phase: state.phase,
    randomOn: state.randomOn,
    order: state.roundOrder
  };
  downloadJSON(payload, `resultado_${Date.now()}.json`);
  toast(els.toast, 'Resultado exportado');
}
els.btnExport?.addEventListener('click', exportResults);

/* ===================== Validación ===================== */
function normalize(s){ return (s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim(); }
function validateQuestions(arr){
  const issues = [];
  if (!Array.isArray(arr) || !arr.length) {
    issues.push('El archivo de preguntas está vacío o no es un arreglo.');
    return { ok:false, issues };
  }
  arr.forEach((q, qi)=>{
    if (!q || typeof q.pregunta!=='string') issues.push(`Q${qi+1}: falta "pregunta" (string).`);
    if (!Array.isArray(q.respuestas) || q.respuestas.length<4 || q.respuestas.length>6)
      issues.push(`Q${qi+1}: respuestas debe tener entre 4 y 6 elementos.`);
    if (Array.isArray(q.respuestas)){
      let sum=0; let dupSet = new Set(); let prev=Infinity;
      q.respuestas.forEach((r, ri)=>{
        if (!r || typeof r.texto!=='string') issues.push(`Q${qi+1} R${ri+1}: falta "texto".`);
        if (typeof r.puntos!=='number') issues.push(`Q${qi+1} R${ri+1}: "puntos" no es número.`);
        if (typeof r.puntos==='number'){
          if (r.puntos<=0) issues.push(`Q${qi+1} R${ri+1}: puntos <= 0.`);
          if (r.puntos>prev) issues.push(`Q${qi+1}: puntos no están en orden descendente.`);
          prev = r.puntos; sum+=r.puntos;
        }
        const key = normalize(r?.texto);
        if (dupSet.has(key)) issues.push(`Q${qi+1}: respuestas duplicadas ("${r?.texto}").`);
        dupSet.add(key);
      });
      if (sum!==100) issues.push(`Q${qi+1}: la suma de puntos es ${sum} (debe ser 100).`);
    }
  });
  return { ok: issues.length===0, issues };
}
function runValidation(){
  const arr = DATA();
  const { ok, issues } = validateQuestions(arr);
  if (ok){ toast(els.toast, `Preguntas OK (${arr.length})`); }
  else {
    toast(els.toast, `Validación: ${issues.length} problemas (ver consola)`);
    console.groupCollapsed('[VALIDACIÓN] Problemas encontrados');
    issues.forEach(x=>console.warn(x));
    console.groupEnd();
  }
}
els.btnValidate?.addEventListener('click', runValidation);
window.__validate = runValidation;

/* ===================== UI extra ===================== */
const btnPresenter  = document.getElementById('btnPresenter');
const btnFullscreen = document.getElementById('btnFullscreen');
const btnTheme      = document.getElementById('btnTheme');

btnPresenter?.addEventListener('click', ()=>{
  document.body.classList.toggle('presenter');
  toast(els.toast, document.body.classList.contains('presenter') ? 'Modo presentador ON' : 'Modo presentador OFF');
});

btnFullscreen?.addEventListener('click', async ()=>{
  try{
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
    else await document.exitFullscreen();
  }catch{}
});

const THEME_KEY = 'ui_theme_dark';
if (localStorage.getItem(THEME_KEY)==='1') document.body.classList.add('dark');
btnTheme?.addEventListener('click', ()=>{
  document.body.classList.toggle('dark');
  const on = document.body.classList.contains('dark');
  localStorage.setItem(THEME_KEY, on?'1':'0');
  toast(els.toast, on ? 'Tema claro' : 'Tema oscuro');
});

/* ===================== Eventos base ===================== */
const setTurn = (t)=>{ state.turn = t; render(); };
import { wireEvents as __wire } from './ui/events.js';
__wire(state, null, els, start, guardedAdvance, setTurn, render);

/* ===================== Init ===================== */
loadData();
render();

/* ===================== Splash + Nombres (wireWelcome) ===================== */
if (els.splash || els.welcome) {
  wireWelcome(
    state,
    els,
    ({a,b})=>{
      state.names.A = a;
      state.names.B = b;
    },
    async ()=>{ await ensureDataReady(); start(); },   // start -> READY
    ensureDataReady
  );
}

export { start, state };
