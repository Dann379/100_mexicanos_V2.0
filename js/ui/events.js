import { reveal, addError, currentIndex } from '../core/logic.js';
import { toast, bigX, sfx } from './effects.js';

let wired = false;

/* ================== Eventos de juego ================== */
export function wireEvents(state, _DATA_UNUSED, els, start, guardedAdvance, setTurn, rerender){
  if (wired) return;
  wired = true;

  const DATA = () => window.__DATA__ || [];

  function handleIndex(i){
    const round = DATA()[currentIndex(state)];
    if (!round) return;
    reveal(state, round, i, true);
    sfx.reveal();
    rerender();
  }

  /* --------- Teclado global (bloqueado si la bienvenida está visible) --------- */
  document.addEventListener('keydown', (e)=>{
    const key = e.key;
    const tgt = (e.target||{});
    const tag = (tgt.tagName||'').toLowerCase();
    const typing = ['input','textarea','select'].includes(tag) || tgt.isContentEditable;

    const welcomeVisible = !!(els.welcome && !els.welcome.classList.contains('hidden'));
    if (welcomeVisible) return;

    if (key!=='Enter' && typing) return;

    if (key === 'Enter') { guardedAdvance(); rerender(); return; }
    if (key === '/' || key === '?') { start(true); rerender(); return; }

    if (key === 'ArrowLeft')  { setTurn('A'); e.preventDefault(); return; }
    if (key === 'ArrowRight') { setTurn('B'); e.preventDefault(); return; }
    if (key === 'ArrowDown')  { sfx.board(); e.preventDefault(); return; }

    const k = (key.length===1 ? key.toLowerCase() : key.toLowerCase?.());

    if (k === 'x') {
      if (state.phase === 'STEAL') bigX(els.overlayX, els.overlayXText, 1);
      else bigX(els.overlayX, els.overlayXText, (state.errors||0)+1);
      addError(state);
      sfx.error();
      rerender();
      return;
    }

    if (k === 'v') { window.__validate?.(); return; }
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
      console.log('[DEBUG] revealed:', [...state.revealed], 'pool:', state.pool);
      console.log('[DEBUG] scores:', state.scoreA, state.scoreB, 'round:', round);
      toast(els.toast, 'Debug en consola');
      return;
    }

    if (['1','2','3','4','5','6'].includes(k)) { handleIndex(Number(k)-1); return; }
  });

  /* --------- Click / Touch en tarjetas (delegación) --------- */
  const activateCard = (target)=>{
    const card = target.closest?.('.card');
    if (!card || !(card.dataset && 'idx' in card.dataset)) return;
    const idx = Number(card.dataset.idx);
    if (Number.isFinite(idx)) handleIndex(idx);
  };
  els.answers.addEventListener('click', (e)=> activateCard(e.target));
  els.answers.addEventListener('touchend', (e)=>{
    if (e.changedTouches && e.changedTouches.length) {
      const el = document.elementFromPoint(
        e.changedTouches[0].clientX, e.changedTouches[0].clientY
      );
      if (el) activateCard(el);
    }
  }, {passive:true});

  /* --------- Botones auxiliares --------- */
  els.btnReset?.addEventListener('click', ()=> { start(true); rerender(); });
  els.teamA?.addEventListener('click', ()=> setTurn('A'));
  els.teamB?.addEventListener('click', ()=> setTurn('B'));
}

/* ================== Bienvenida (nombres + Enter) ================== */
export function wireWelcome(state, els, onSubmit, start, ensureDataReady){
  if (!els.welcome) return;

  els.welcome.classList.remove('hidden');
  setTimeout(()=> els.wNameA?.focus(), 0);

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

    await ensureDataReady?.();
    sfx.welcome?.();
    start();
  };

  els.wStartBtn?.addEventListener('click', (e)=>{ e.preventDefault(); e.stopPropagation(); submit(); });
  [els.wNameA, els.wNameB].forEach(inp=>{
    inp?.addEventListener('keydown', (e)=>{
      if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); submit(); }
    });
  });

  const onDocEnter = (e)=>{
    const visible = !!(els.welcome && !els.welcome.classList.contains('hidden'));
    if (!visible) return document.removeEventListener('keydown', onDocEnter);
    if (e.key === 'Enter') {
      const a = (els.wNameA?.value || '').trim();
      const b = (els.wNameB?.value || '').trim();
      if (a && b) { e.preventDefault(); submit(); }
    }
  };
  document.addEventListener('keydown', onDocEnter);
}
