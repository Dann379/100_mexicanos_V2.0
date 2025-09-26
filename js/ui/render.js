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
  els.labelA.textContent = state.names.A || 'Equipo 1';
  els.labelB.textContent = state.names.B || 'Equipo 2';

  const activeTeam = state.phase === 'STEAL' ? state.stealTeam : state.turn;
  els.teamA?.classList.toggle('active', activeTeam === 'A');
  els.teamB?.classList.toggle('active', activeTeam === 'B');

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

  if (state.phase==='STEAL'){
    els.question.innerHTML = `🕵️ Robo: <b>${state.names[state.stealTeam]}</b> tiene <b>1 intento</b>. Elige una respuesta correcta para llevarse el pozo.`;
  } else if (state.phase==='INTER' && state.pendingFinal && state.winner){
    els.question.innerHTML = `🏁 ${state.names[state.winner]} ya superó ${state.winThreshold} puntos.<br><small>Revela todas las respuestas y pulsa Enter</small>`;
  } else {
    els.question.textContent = round.pregunta;
  }

  els.answers.innerHTML = '';
  round.respuestas.forEach((r, i) => {
    const revealed = state.revealed.has(i);
    const card = document.createElement('div');
    card.className = 'card' + (revealed ? ' revealed is-revealed show open' : '');
    card.dataset.idx = String(i);

    const txt = revealed ? r.texto : '— — —';
    const pts = revealed ? String(r.puntos) : '';

    card.innerHTML = `
      <div class="badge">#${i+1}</div>
      <div class="text" style="${revealed?'opacity:1;visibility:visible;':'opacity:.02;'}">${txt}</div>
      <div class="pts"  style="${revealed?'opacity:1;visibility:visible;':'opacity:0;'}">${pts}</div>
    `;
    els.answers.appendChild(card);
  });
}
