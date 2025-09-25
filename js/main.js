import { defaultState } from './core/state.js';
import { currentIndex, nextRound, allRevealed, startGame } from './core/logic.js';
import { els } from './ui/elements.js';
import { renderHeader, renderQuestion } from './ui/render.js';
import { toast } from './ui/effects.js';
import { wireWelcome, wireEvents } from './ui/events.js';

/* Preferencias (localStorage) */
const LS = { RANDOM:'randomMode', THRESH:'winThreshold' };
const loadPrefRandom = () => localStorage.getItem(LS.RANDOM)!=='0';
const savePrefRandom = (on) => localStorage.setItem(LS.RANDOM, on?'1':'0');
const loadPrefThreshold = () => {
  const raw = localStorage.getItem(LS.THRESH)||'';
  const v = parseInt(raw,10);
  return Number.isFinite(v)&&v>0 ? v : 500;
};
const savePrefThreshold = (n) => { if(Number.isFinite(n)&&n>0) localStorage.setItem(LS.THRESH, String(n)); };

/* 🔴 Importante: UNA sola referencia a state, jamás reasignar */
const state = defaultState({ randomOn: loadPrefRandom(), winThreshold: loadPrefThreshold() });

/* Reset seguro (in-place, sin perder la referencia capturada por los listeners) */
function resetStateInPlace(prefs){
  const fresh = defaultState(prefs);
  // borramos todas las claves del objeto actual
  for (const k of Object.keys(state)) delete state[k];
  // copiamos todo desde el fresco
  for (const [k,v] of Object.entries(fresh)) state[k] = v;
}

/* -------- Carga de preguntas con promesa compartida -------- */
let dataReadyResolve;
const dataReady = new Promise(res => (dataReadyResolve = res));

async function loadData(){
  els.errorBox && (els.errorBox.textContent='');
  const paths = ['./data/preguntas.json','./adata/preguntas.json','./preguntas.json'];
  for (const p of paths){
    try{
      const res = await fetch(p,{cache:'no-store'});
      if(!res.ok) throw new Error('fetch failed');
      const json = await res.json();
      if(!Array.isArray(json)||!json.length) throw new Error('bad json');
      window.__DATA__ = json; // visible para debug
      break;
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

const ensureDataReady = () => dataReady;

/* Helpers */
const DATA = () => window.__DATA__||[];

/* -------------------- Render compuesto -------------------- */
function render(){
  document.body?.setAttribute('data-phase', state.phase);
  renderHeader(state);
  const round = DATA()[currentIndex(state)];
  const lobbyMsg = 'Ingresa los nombres de los equipos y pulsa <b>Comenzar</b>';
  renderQuestion(state, round, lobbyMsg);
}

/* -------------------- Guardas de avance -------------------- */
function guardedAdvance(){
  if (state.phase==='LOBBY') { start(); render(); return; }
  if (state.phase==='INTER'){
    if (!allRevealed(state, DATA()[currentIndex(state)])) { toast(els.toast,'Revela todas las respuestas antes de continuar'); return; }
    if (state.pendingFinal && state.winner) { state.phase='FINAL'; render(); return; }
    nextRound(state, DATA(), state.originalTeam); render(); return;
  }
  if (state.phase==='FINAL'){ toast(els.toast,'Juego terminado. Pulsa / para reiniciar'); return; }
}

/* ---------------------- Start / Reset ---------------------- */
function start(isReset=false){
  if (isReset){
    const prefs = { randomOn: state.randomOn, winThreshold: state.winThreshold };
    resetStateInPlace(prefs);         // 🔧 no reasignamos state
    els.welcome?.classList.remove('hidden');
    render();
    return;
  }
  const nA = (state.names?.A||'').trim();
  const nB = (state.names?.B||'').trim();
  if (!nA || !nB) { els.errorBox && (els.errorBox.textContent='Debes ingresar ambos nombres de equipo'); return; }
  try { startGame(state, DATA(), 'A'); } 
  catch { els.errorBox && (els.errorBox.textContent='No hay preguntas cargadas'); return; }
  render();
}

/* ---------------------- Turno manual ----------------------- */
function setTurn(t){ state.turn = t; render(); }

/* ------------------ Preferencias UI (LS) ------------------- */
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

/* -------------- Eventos base (con re-render) --------------- */
import { wireEvents as __wire } from './ui/events.js';
__wire(state, /*DATA array vivo*/ null, els, start, guardedAdvance, setTurn, render);

/* ------------------------- Init ---------------------------- */
loadData(); 
render();

/* ------------- Bienvenida (inicia al confirmar) ------------ */
if (els.welcome) {
  els.welcome.classList.remove('hidden');
  wireWelcome(
    state, 
    els, 
    ({a,b})=>{
      state.names.A = a;
      state.names.B = b;
    }, 
    async ()=>{ await ensureDataReady(); start(); },
    ensureDataReady
  );
}

export { start, state };
