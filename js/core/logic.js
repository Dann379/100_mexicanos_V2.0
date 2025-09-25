import { computeMultiplierFromRound } from './multiplier.js';
import { buildOrder, shuffleInPlace } from './random.js';
import { otherTeam } from './state.js';

export const currentIndex = (state) =>
  state.roundCursor >= 0 && state.roundCursor < state.roundOrder.length
    ? state.roundOrder[state.roundCursor]
    : state.roundIndex;

// ✅ Ahora “todas reveladas” significa: TODOS LOS PUNTOS revelados
export const allRevealed = (state, q) => state.revealedPts.size >= q.respuestas.length;

export function startGame(state, DATA, startTeam) {
  if (!DATA.length) throw new Error('No hay preguntas');
  state.roundOrder = buildOrder(DATA.length);
  if (state.randomOn) shuffleInPlace(state.roundOrder);
  state.roundCursor = 0;
  state.roundIndex = state.roundOrder[0];
  state.multiplier = computeMultiplierFromRound(1);
  state.phase = 'ROUND';
  state.revealed = new Set();
  state.revealedPts = new Set();
  state.errors = 0;
  state.pool = 0;
  state.turn = startTeam;
  state.stealTeam = otherTeam(startTeam);
  state.originalTeam = startTeam;
}

/* ------------------- Revelado en DOS pasos ------------------- */
/* 1) Revela SOLO el TEXTO (no suma puntos) */
export function revealText(state, round, idx, fromUI=false){
  const item = round?.respuestas[idx];
  if (!item) { if (state.phase === 'STEAL' && fromUI) failSteal(state); return; }
  if (state.revealed.has(idx)) return; // ya revelado el texto
  state.revealed.add(idx);
}

/* 2) Revela el PUNTAJE (suma al pozo y puede asignar) */
export function revealPoints(state, round, idx, fromUI=false){
  const item = round?.respuestas[idx];
  if (!item) { if (state.phase === 'STEAL' && fromUI) failSteal(state); return; }
  if (!state.revealed.has(idx)) state.revealed.add(idx); // si alguien se saltó el paso 1, lo corregimos
  if (state.revealedPts.has(idx)) return; // ya revelado puntaje

  state.revealedPts.add(idx);

  // Sumar al pozo
  state.pool += (item.puntos * state.multiplier);

  if (state.phase === 'STEAL') {
    // ✅ Acierto en STEAL: se asigna al equipo que roba y cierra la ronda
    assignTo(state, state.stealTeam);
    return;
  }

  // ROUND normal: si ya se revelaron TODOS los puntos, adjudica al equipo en turno
  if (allRevealed(state, round)) assignTo(state, state.turn);
}

/* Compat de eventos antiguos (si un sitio llama 'reveal', lo convertimos a la lógica nueva) */
export function reveal(state, round, idx, fromUI=false){
  if (!state.revealed.has(idx)) return revealText(state, round, idx, fromUI);
  return revealPoints(state, round, idx, fromUI);
}

/* ----------------------- Errores / STEAL --------------------- */
export function addError(state) {
  if (state.phase === 'STEAL') { assignTo(state, otherTeam(state.stealTeam)); return; }
  if (state.phase !== 'ROUND') return;
  state.errors++;
  if (state.errors >= 3) {
    state.phase = 'STEAL';
    state.stealTeam = otherTeam(state.turn);
    state.turn = state.stealTeam;  // turno visual/lógico pasa al que roba
  }
}

export function assignTo(state, team) {
  if (!['ROUND','STEAL'].includes(state.phase)) return;
  const awarded = state.pool;
  if (team === 'A') state.scoreA += awarded; else state.scoreB += awarded;
  state.pool = 0;
  state.phase = 'INTER';
  const teamScore = team === 'A' ? state.scoreA : state.scoreB;
  if (teamScore > state.winThreshold) { state.winner = team; state.pendingFinal = true; }
}

export function failSteal(state){ assignTo(state, otherTeam(state.stealTeam)); }

export function nextRound(state, DATA, startTeam) {
  state.roundCursor++;
  if (state.roundCursor >= state.roundOrder.length) {
    state.roundOrder = buildOrder(DATA.length);
    if (state.randomOn) shuffleInPlace(state.roundOrder);
    state.roundCursor = 0;
  }
  state.roundIndex = state.roundOrder[state.roundCursor];
  state.multiplier = computeMultiplierFromRound(state.roundCursor + 1);
  state.phase = 'ROUND';
  state.revealed = new Set();
  state.revealedPts = new Set();
  state.errors = 0;
  state.pool = 0;
  state.turn = startTeam;
  state.stealTeam = otherTeam(startTeam);
  state.originalTeam = startTeam;
}
