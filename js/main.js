import { defaultState } from './core/state.js';
import { currentIndex, nextRound, reveal, assignTo, allRevealed, startGame } from './core/logic.js';
import { els } from './ui/elements.js';
import { renderHeader, renderQuestion } from './ui/render.js';
import { toast } from './ui/effects.js';
import { wireWelcome } from './ui/events.js';

/* Preferencias (localStorage) */
const LS = { RANDOM:'randomMode', THRESH:'winThreshold' };
const loadPrefRandom = () => localStorage.getItem(LS.RANDOM)!=='0';
const savePrefRandom = (on) => localStorage.setItem(LS.RANDOM, on?'1':'0');
const loadPrefThreshold = () => { const v=parseInt(localStorage.getItem(LS.THRESH)||'',10); return Number.isFinite(v)&&v>0?v:500; };
const savePrefThreshold = (n) => { if(Number.isFinite(n)&&n>0) localStorage.setItem(LS.THRESH, String(n)); };

let DATA = [];
let state = defaultState({ randomOn: loadPrefRandom(), winThreshold: loadPrefThreshold() });

/* Carga de preguntas */
async function loadData(){
  els.errorBox.textContent='';
  const paths=['./data/preguntas.json','./adata/preguntas.json','./preguntas.json'];
  for (const p of paths){
    try{
      const res = await fetch(p,{cache:'no-store'});
      if(!res.ok) throw new Error();
      const json = await res.json();
      if(!Array.isArray(json)||!json.length) throw new Error();
      DATA = json;
      break;
    }catch(e){}
  }
  if(!DATA.length){
    els.errorBox.textContent='No se pudieron cargar las preguntas. Revisa /data/preguntas.json';
    DATA=[{pregunta:'Ejemplo: ¿Qué comen los mexicanos en una taquiza?',respuestas:[{texto:'Tacos',puntos:38},{texto:'Quesadillas',puntos:25},{texto:'Sopes',puntos:18},{texto:'Tostadas',puntos:10},{texto:'Tamales',puntos:6},{texto:'Guacamole',puntos:3}]}];
  }
  render(); // lobby
}
window.loadData = loadData;

/* Render compuesto */
function render(){
  renderHeader(state);
  const round = DATA[currentIndex(state)];
  const lobbyMsg = 'Ingresa los nombres de los equipos y pulsa <b>Enter</b> para iniciar';
  renderQuestion(state, round, lobbyMsg);
}

/* Guardas de avance */
function guardedAdvance(){
  if (state.phase==='LOBBY') { start(); return; }
  if (state.phase==='INTER'){
    if (!allRevealed(state, DATA[currentIndex(state)])) { toast(els.toast,'Revela todas las respuestas antes de continuar'); return; }
    if (state.pendingFinal && state.winner) { state.phase='FINAL'; render(); return; }
    nextRound(state, DATA, els.startTeam.value); render(); return;
  }
  if (state.phase==='FINAL'){ toast(els.toast,'Juego terminado. Pulsa / para reiniciar'); return; }
  toast(els.toast,'Primero termina la ronda');
}

/* Start/Reset */
function start(isReset=false){
  if (isReset){
    const prefs = { randomOn: state.randomOn, winThreshold: state.winThreshold };
    state = defaultState(prefs);
    els.nameA.value = ''; els.nameB.value = ''; els.startTeam.value = 'A';
  }
  const nA = els.nameA.value.trim(), nB = els.nameB.value.trim();
  if (!nA || !nB) { els.errorBox.textContent='Debes ingresar ambos nombres de equipo'; return; }
  state.names.A = nA; state.names.B = nB;
  try { startGame(state, DATA, els.startTeam.value); } catch { els.errorBox.textContent='No hay preguntas cargadas'; return; }
  render();
}

/* Turnos */
function setTurn(t){ state.turn = t; render(); }

/* Prefs UI */
els.chkRandom.checked = state.randomOn;
els.chkRandom.addEventListener('change', () => { state.randomOn = !!els.chkRandom.checked; savePrefRandom(state.randomOn); toast(els.toast, `Aleatorio: ${state.randomOn?'ON':'OFF'}`); });
els.inpThreshold.value = String(state.winThreshold);
els.inpThreshold.addEventListener('input', () => { const v=parseInt(els.inpThreshold.value,10); if(Number.isFinite(v)&&v>0){ state.winThreshold=v; savePrefThreshold(v);} });

/* Eventos base */
import { wireEvents } from './ui/events.js';
wireEvents(state, DATA, els, start, guardedAdvance, setTurn);

/* Init */
loadData(); render();

// Pre-cargar valores visuales de la barra de config para mantener compat
els.nameA.value = state.names?.A || '';
els.nameB.value = state.names?.B || '';
els.startTeam.value = 'A';

// Mostrar bienvenida y cablear submit
if (els.welcome) {
  els.welcome.classList.remove('hidden'); // asegúrate de mostrarla al inicio
  wireWelcome(state, els, ({a,b,start})=>{
   // 1) Espeja en la barra de config (por compat con tu flujo actual)
    els.nameA.value = a;
    els.nameB.value = b;
    els.startTeam.value = start;

   // 2) Actualiza en state (sin iniciar partida aún)
    state.names.A = a;
    state.names.B = b;

   // 3) Muestra LOBBY listo para que Enter inicie (guardedAdvance -> start())
    //    Si prefieres arrancar automático, llama aquí a start() directamente.
  });
}

