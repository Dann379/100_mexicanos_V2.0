import { reveal, addError, currentIndex } from '../core/logic.js';
import { toast, bigX } from './effects.js';

let wired = false;

export function wireEvents(state, _DATA_UNUSED, els, start, guardedAdvance, setTurn, rerender){
  if (wired) return; wired = true;
  const DATA = () => window.__DATA__ || [];

  document.addEventListener('keydown', (e)=>{
    const key = e.key;
    const tgt = (e.target||{});
    const tag = (tgt.tagName||'').toLowerCase();
    const typing = ['input','textarea','select'].includes(tag) || tgt.isContentEditable;

    // Si la bienvenida está visible, bloqueamos hotkeys globales
    const welcomeVisible = !!(els.welcome && !els.welcome.classList.contains('hidden'));
    if (welcomeVisible) return;

    if (key!=='Enter' && typing) return;

    if (key === 'Enter') { guardedAdvance(); rerender(); return; }
    if (key === '/' || key === '?') { start(true); rerender(); return; }

    const k = (key.length===1 ? key.toLowerCase() : key.toLowerCase?.());

    if (k === 'x') {
      // En STEAL sólo hay 1 error posible -> pintamos 1 X
      if (state.phase === 'STEAL') bigX(els.overlayX, els.overlayXText, 1);
      else bigX(els.overlayX, els.overlayXText, (state.errors||0)+1);
      addError(state);
      rerender();
      return;
    }

    if (k === 'l') { window.loadData?.(); return; }
    if (k === 'r') {
      if (state.phase==='ROUND' || state.phase==='INTER'){
        state.roundCursor = -1;
        toast(els.toast,'Orden rebarajado (desde próxima ronda)');
      }
      return;
    }

    if (k === 'd') {
      const round = DATA()[currentIndex(state)];
      console.log('[DEBUG] phase:', state.phase, 'cursor:', state.roundCursor, 'turn:', state.turn, 'stealTeam:', state.stealTeam);
      console.log('[DEBUG] revealed:', [...state.revealed], 'pool:', state.pool, 'scores:', state.scoreA, state.scoreB);
      console.log('[DEBUG] round:', round);
      toast(els.toast, 'Debug impreso en consola');
      return;
    }

    if (['1','2','3','4','5','6'].includes(k)) {
      const round = DATA()[currentIndex(state)];
      if (round) { reveal(state, round, Number(k)-1, true); rerender(); }
      return;
    }
    if (k === 'a') { setTurn('A'); return; }
    if (k === 'b') { setTurn('B'); return; }
  });

  els.answers.addEventListener('click', (e)=>{
    const card = e.target.closest('.card');
    if (!card) return;
    const idx = Number(card.dataset.idx);
    const round = (window.__DATA__||[])[currentIndex(state)];
    if (round) { reveal(state, round, idx, true); rerender(); }
  });

  els.btnReset?.addEventListener('click', ()=> { start(true); rerender(); });
  els.teamA?.addEventListener('click', ()=> setTurn('A'));
  els.teamB?.addEventListener('click', ()=> setTurn('B'));
}

export function wireWelcome(state, els, onSubmit, start, ensureDataReady){
  if (!els.welcome) return;

  const submit = async () => {
    const a = (els.wNameA?.value || '').trim();
    const b = (els.wNameB?.value || '').trim();
    if (!a || !b) {
      if (els.toast){
        els.toast.textContent = 'Ingresa ambos nombres';
        els.toast.classList.add('show');
        setTimeout(()=>els.toast.classList.remove('show'), 1200);
      }
      return;
    }
    onSubmit({ a, b, start: 'A' });
    els.welcome.classList.add('hidden');

    // Espera a que las preguntas estén cargadas, luego inicia
    await ensureDataReady?.();
    start();
  };

  els.wStartBtn?.addEventListener('click', submit);
  [els.wNameA, els.wNameB].forEach(inp=>{
    inp?.addEventListener('keydown', (e)=>{
      if (e.key === 'Enter') submit();
    });
  });
}
