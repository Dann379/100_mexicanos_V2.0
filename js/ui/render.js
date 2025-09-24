import { ping } from './effects.js';
import { els } from './elements.js';

let lastMult = null;

export function renderHeader(state){
  els.phaseLabel.textContent = state.phase;
  els.roundLabel.textContent = state.roundCursor>=0 ? (state.roundCursor+1) : '—';
  els.multLabel.textContent  = String(state.multiplier);
  els.pool.textContent = els.poolTop.textContent = String(state.pool);
  els.scoreA.textContent = state.scoreA;
  els.scoreB.textContent = state.scoreB;
  els.labelA.textContent = state.names.A;
  els.labelB.textContent = state.names.B;

  if (els.multPill) {
    els.multPill.classList.remove('lvl1','lvl2','lvl3');
    els.multPill.classList.add(state.multiplier>=3?'lvl3':state.multiplier>=2?'lvl2':'lvl1');
    if (lastMult !== state.multiplier) { ping(els.multPill); lastMult = state.multiplier; }
  }
}

export function renderQuestion(state, round, lobbyMsg){
  if (state.phase==='FINAL'){
    const winner = state.winner || (state.scoreA >= state.scoreB ? 'A':'B');
    const pts = winner==='A' ? state.scoreA : state.scoreB;
    els.question.innerHTML = `🏆 ¡${state.names[winner]} gana con <b>${pts}</b> puntos!<br><small>Pulsa / para reiniciar</small>`;
    els.answers.innerHTML = '';
    return;
  }
  if (!round){
    els.question.innerHTML = lobbyMsg;
    els.answers.innerHTML = '';
    return;
  }
  if (state.phase==='INTER' && state.pendingFinal && state.winner){
    els.question.innerHTML = `🏁 ${state.names[state.winner]} ya superó ${state.winThreshold} puntos.<br><small>Revela todo y pulsa Enter</small>`;
  } else {
    els.question.textContent = round.pregunta;
  }

  // tarjetas
  els.answers.innerHTML = '';
  round.respuestas.forEach((r, i) => {
    const card = document.createElement('div');
    card.className = 'card' + (state.revealed.has(i) ? ' revealed' : '');
    card.innerHTML = `<div class="badge">#${i+1}</div>
      <div class="text">${state.revealed.has(i)?r.texto:'— — —'}</div>
      <div class="pts">${state.revealed.has(i)?r.puntos:''}</div>`;
    card.dataset.idx = String(i);
    els.answers.appendChild(card);
  });
}
