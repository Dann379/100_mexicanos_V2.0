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
  state.phase     = 'READY';      // 👈 fase nueva
  state.revealed  = new Set();
  state.errors    = 0;
  state.pool      = 0;

  state.turn      = startTeam;
  state.stealTeam = otherTeam(startTeam);
  state.originalTeam = startTeam;

  state.winner       = null;
  state.pendingFinal = false;
}

/* Revelar respuesta */
export function reveal(state, round, idx, fromUI=false){
  const item = round?.respuestas[idx];
  if (!item) { if (state.phase === 'STEAL' && fromUI) failSteal(state); return; }
  const wasHidden = !state.revealed.has(idx);

  if (['INTER','LOBBY','FINAL','READY'].includes(state.phase)) { // READY: aún no se juega
    if (wasHidden) state.revealed.add(idx);
    return;
  }

  if (state.phase === 'STEAL') {
    if (fromUI && wasHidden) {
      state.revealed.add(idx);
      state.pool += item.puntos * state.multiplier;
      assignTo(state, state.stealTeam);
    } else failSteal(state);
    return;
  }

  // ROUND normal
  if (!wasHidden) return;
  state.revealed.add(idx);
  state.pool += item.puntos * state.multiplier;
  if (allRevealed(state, round)) assignTo(state, state.turn);
}

/* Errores / STEAL */
export function addError(state) {
  if (state.phase === 'STEAL') { assignTo(state, otherTeam(state.stealTeam)); return; }
  if (state.phase !== 'ROUND') return;
  state.errors++;
  if (state.errors >= 3) {
    state.phase = 'STEAL';
    state.stealTeam = otherTeam(state.turn);
    state.turn = state.stealTeam;
  }
}

/* Asignación de pozo y chequeo de victoria inmediata */
export function assignTo(state, team) {
  if (!['ROUND','STEAL'].includes(state.phase)) return;

  const awarded = state.pool;
  if (team === 'A') state.scoreA += awarded; else state.scoreB += awarded;
  state.pool = 0;

  const teamScore = team === 'A' ? state.scoreA : state.scoreB;
  if (teamScore >= state.winThreshold) {
    state.winner = team;
    state.pendingFinal = false;
    state.phase = 'FINAL';      // 👈 victoria inmediata
    return;
  }

  state.phase = 'INTER';
}

/* Fallo en STEAL */
export function failSteal(state){ assignTo(state, otherTeam(state.stealTeam)); }

/* Preparar SIGUIENTE ronda (pero NO mostrar la pregunta aún) */
export function nextRound(state, DATA, startTeam) {
  state.roundCursor++;
  if (state.roundCursor >= state.roundOrder.length) {
    state.roundOrder = buildOrder(DATA.length);
    if (state.randomOn) shuffleInPlace(state.roundOrder);
    state.roundCursor = 0;
  }

  state.roundIndex = state.roundOrder[state.roundCursor];
  state.multiplier = computeMultiplierFromRound(state.roundCursor + 1);

  // Dejamos todo listo pero pasamos a READY (espera Enter)
  state.phase     = 'READY';     // 👈 fase nueva antes de ROUND
  state.revealed  = new Set();
  state.errors    = 0;
  state.pool      = 0;

  state.turn      = startTeam;
  state.stealTeam = otherTeam(startTeam);
  state.originalTeam = startTeam;
}
