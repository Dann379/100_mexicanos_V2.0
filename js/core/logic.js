import { computeMultiplierFromRound } from './multiplier.js';
import { buildOrder, shuffleInPlace } from './random.js';
import { otherTeam } from './state.js';

export const currentIndex = (state) =>
  state.roundCursor >= 0 && state.roundCursor < state.roundOrder.length
    ? state.roundOrder[state.roundCursor]
    : state.roundIndex;

export const allRevealed = (state, q) => state.revealed.size >= q.respuestas.length;

/* ================== FLUJO ================== */

export function startGame(state, DATA, startTeam) {
  if (!DATA.length) throw new Error('No hay preguntas');

  state.roundOrder = buildOrder(DATA.length);
  if (state.randomOn) shuffleInPlace(state.roundOrder);

  state.roundCursor = 0;
  state.roundIndex  = state.roundOrder[0];
  state.multiplier  = computeMultiplierFromRound(1);

  // Estado base de ronda (pero aún sin mostrar pregunta)
  state.phase     = 'READY';      // fase “listo” antes de ROUND
  state.revealed  = new Set();
  state.errors    = 0;
  state.pool      = 0;

  state.turn      = startTeam;
  state.stealTeam = otherTeam(startTeam);
  state.originalTeam = startTeam;   // equipo dueño original de la ronda

  state.winner       = null;
  state.pendingFinal = false;
}

/* Revelar respuesta
   - ROUND: revela y suma al pozo; si quedan todas reveladas -> asigna al equipo en turno
   - STEAL: una oportunidad; si acierta, asigna a quien roba; si falla, asigna al ORIGINAL
   - INTER: permite revelar SOLO visual (no suma al pozo, ni asigna)
   - LOBBY / READY / FINAL: no hace nada
*/
export function reveal(state, round, idx, fromUI=false){
  const item = round?.respuestas[idx];
  if (!item) { 
    // En STEAL, si intentan “revelar” algo inválido, se considera fallo
    if (state.phase === 'STEAL' && fromUI) failSteal(state);
    return; 
  }
  const wasHidden = !state.revealed.has(idx);

  // Bloques por fase
  if (state.phase === 'INTER'){
    // Revelado visual sin afectar pozo
    if (wasHidden) state.revealed.add(idx);
    return;
  }
  if (!['ROUND','STEAL'].includes(state.phase)) return; // LOBBY/READY/FINAL -> no hace nada

  if (state.phase === 'STEAL') {
    // UNA oportunidad de robar:
    // si acierta (elige una respuesta no revelada), se asigna al equipo que roba.
    if (fromUI && wasHidden) {
      state.revealed.add(idx);
      state.pool += item.puntos * state.multiplier;
      assignTo(state, state.stealTeam);       // ✅ puntos para quien roba
    } else {
      failSteal(state);                        // ❌ fallo -> puntos al equipo ORIGINAL
    }
    return;
  }

  // ROUND normal
  if (!wasHidden) return;
  state.revealed.add(idx);
  state.pool += item.puntos * state.multiplier;
  if (allRevealed(state, round)) assignTo(state, state.turn);
}

/* Errores / paso a STEAL */
export function addError(state) {
  if (state.phase === 'STEAL') {
    // En STEAL: la ÚNICA oportunidad falló => pozo para el equipo ORIGINAL
    assignTo(state, state.originalTeam);
    return; 
  }
  if (state.phase !== 'ROUND') return;

  state.errors++;
  if (state.errors >= 3) {
    state.phase = 'STEAL';
    state.stealTeam = otherTeam(state.turn);  // el contrario intenta robar
    state.turn = state.stealTeam;             // ilumina al equipo que roba
  }
}

/* Asignación de pozo y chequeo de victoria inmediata */
export function assignTo(state, team) {
  if (!['ROUND','STEAL'].includes(state.phase)) return;

  const awarded = state.pool;
  if (team === 'A') state.scoreA += awarded; else state.scoreB += awarded;
  state.pool = 0; // 🔒 pozo a cero; respuestas posteriores ya no suman

  const teamScore = team === 'A' ? state.scoreA : state.scoreB;
  if (teamScore >= state.winThreshold) {
    state.winner = team;
    state.pendingFinal = false;
    state.phase = 'FINAL';      // termina de inmediato al igualar o superar la meta
    return;
  }

  state.phase = 'INTER';
}

/* Fallo en STEAL: asigna al equipo ORIGINAL (no al que roba) */
export function failSteal(state){ 
  assignTo(state, state.originalTeam); 
}

/* Preparar siguiente ronda (queda en READY, no muestra la pregunta aún) */
export function nextRound(state, DATA, startTeam) {
  state.roundCursor++;
  if (state.roundCursor >= state.roundOrder.length) {
    state.roundOrder = buildOrder(DATA.length);
    if (state.randomOn) shuffleInPlace(state.roundOrder);
    state.roundCursor = 0;
  }

  state.roundIndex = state.roundOrder[state.roundCursor];
  state.multiplier = computeMultiplierFromRound(state.roundCursor + 1);

  state.phase     = 'READY';     // pausa antes de ver la siguiente pregunta
  state.revealed  = new Set();
  state.errors    = 0;
  state.pool      = 0;

  state.turn      = startTeam;
  state.stealTeam = otherTeam(startTeam);
  state.originalTeam = startTeam;
}
