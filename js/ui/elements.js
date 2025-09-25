export const $ = (s) => document.querySelector(s);
export const els = {
  answers: $('#answers'),
  question: $('#question'),
  roundLabel: $('#roundLabel'),
  multLabel: $('#multLabel'),
  multPill:  $('#multPill'),
  phaseLabel: $('#phaseLabel'),
  poolTop:   $('#poolTop'),
  pool:      $('#pool'),
  scoreA:    $('#scoreA'),
  scoreB:    $('#scoreB'),
  labelA:    $('#labelA'),
  labelB:    $('#labelB'),
  teamA:     $('#teamA'),
  teamB:     $('#teamB'),

  // Barra de config vigente
  chkRandom: $('#chkRandom'),
  inpThreshold: $('#inpThreshold'),
  errorBox:  $('#errorBox'),
  btnReset:  $('#btnReset'),

  // Bienvenida real en el HTML
  welcome:  $('#welcome'),
  wNameA:   $('#wNameA'),
  wNameB:   $('#wNameB'),
  // No existe selector de "equipo que inicia" en la bienvenida; arrancamos con 'A' por defecto
  wStartBtn:$('#wStartBtn'),

  // Overlays y toast
  toast:     $('#toast'),
  overlayX:  $('#overlayX'),
  overlayXText: $('#overlayXText'),
};
