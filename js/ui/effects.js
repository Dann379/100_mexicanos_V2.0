export function toast(el, msg){
  if(!el) return; el.textContent=msg; el.classList.add('show');
  clearTimeout(toast._t); toast._t=setTimeout(()=>el.classList.remove('show'),1600);
}
export function bigX(overlay, textEl, n=1){
  clearTimeout(bigX._t);
  if(!overlay||!textEl) return;
  textEl.textContent = '✖'.repeat(Math.max(1,Math.min(3,n)));
  overlay.classList.add('show');
  bigX._t=setTimeout(()=>overlay.classList.remove('show'),1000);
}
export function ping(el){
  if(!el) return; el.classList.remove('ping'); void el.offsetWidth; el.classList.add('ping');
}
