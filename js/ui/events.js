import { reveal, addError, nextRound, currentIndex } from '../core/logic.js';
import { toast, bigX } from './effects.js';

export function wireEvents(state, DATA, els, start, guardedAdvance, setTurn){
  document.addEventListener('keydown', (e)=>{
    const key = e.key; const tgt = (e.target||{}); const tag=(tgt.tagName||'').toLowerCase();
    const typing = ['input','textarea','select'].includes(tag) || tgt.isContentEditable;
    // Evita hotkeys si la bienvenida está visible
const welcomeVisible = !!(els.welcome && !els.welcome.classList.contains('hidden'));
if (welcomeVisible && e.key !== 'Enter') return;
// Si quieres que ni Enter haga nada antes de enviar el formulario, usa:
// if (welcomeVisible) return;

    if (key!=='Enter' && typing) return;

    if (key==='Enter') guardedAdvance();
    if (key==='/' || key==='?') start(true);
    if (key.toLowerCase?.()==='x') { addError(state); bigX(els.overlayX, els.overlayXText, state.errors); }
    if (key.toLowerCase?.()==='l') window.loadData?.();

    if (key.toLowerCase?.()==='r'){
      if (state.phase==='ROUND' || state.phase==='INTER'){
        // Rebarajar se hace en nextRound automáticamente con roundCursor=-1
        state.roundCursor = -1;
        toast(els.toast,'Orden rebarajado (desde próxima ronda)');
      }
    }
    if (key.length===1){
      const k = key.toLowerCase();
      if (['1','2','3','4','5','6'].includes(k)) {
        const round = DATA[currentIndex(state)];
        if (round) reveal(state, round, Number(k)-1, true);
      }
      if (k==='a') setTurn('A');
      if (k==='b') setTurn('B');
    }
  });

  els.answers.addEventListener('click', (e)=>{
    const card = e.target.closest('.card'); if (!card) return;
    const idx = Number(card.dataset.idx);
    const round = DATA[currentIndex(state)];
    if (round) reveal(state, round, idx, true);
  });

  els.btnReset.addEventListener('click', ()=> start(true));
  els.teamA.addEventListener('click', ()=> setTurn('A'));
  els.teamB.addEventListener('click', ()=> setTurn('B'));
}

export function wireWelcome(state, els, onSubmit){
  if (!els.welcome) return;

  // Enter dentro de inputs = enviar
  const submit = () => {
    const a = (els.wNameA?.value || '').trim();
    const b = (els.wNameB?.value || '').trim();
    const start = els.wStart?.value || 'A';
    if (!a || !b) {
      // usa tu toast si quieres
      (els.toast) && (els.toast.textContent='Ingresa ambos nombres'); 
      (els.toast) && els.toast.classList.add('show'); 
      setTimeout(()=>els.toast.classList.remove('show'), 1200);
      return;
    }
    onSubmit({ a, b, start });
    els.welcome.classList.add('hidden');
  };

  els.wStartBtn?.addEventListener('click', submit);
  [els.wNameA, els.wNameB, els.wStart].forEach(inp=>{
    inp?.addEventListener('keydown', (e)=>{
      if (e.key === 'Enter') submit();
    });
  });
}

