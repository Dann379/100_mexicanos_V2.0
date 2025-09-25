export function toast(el, msg){
  if(!el) return; el.textContent=msg; el.classList.add('show');
  clearTimeout(toast._t); toast._t=setTimeout(()=>el.classList.remove('show'),1600);
}
export function bigX(overlay, textEl, count){
  if (!overlay) return;
  overlay.style.pointerEvents = 'none';
  overlay.classList.add('show');
  if (textEl) textEl.textContent = '✖'.repeat(Math.max(1, Math.min(3, count||1)));
  setTimeout(()=> overlay.classList.remove('show'), 650);
}

export function ping(el){
  if(!el) return; el.classList.remove('ping'); void el.offsetWidth; el.classList.add('ping');
}
