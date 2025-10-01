export function otherTeam(t){ return t === 'A' ? 'B' : 'A'; }

export function defaultState({ randomOn=false, winThreshold=500 }={}){
  return {
    // prefs
    randomOn,
    winThreshold,
    // nombres
    names: { A: 'Equipo 1', B: 'Equipo 2' },
    // puntajes
    scoreA: 0,
    scoreB: 0,
    // ronda
    phase: 'LOBBY',            // LOBBY | ROUND | STEAL | INTER | FINAL
    roundOrder: [],
    roundCursor: -1,
    roundIndex: 0,
    multiplier: 1,
    // estado de la ronda actual
    revealed: new Set(),       // índices revelados (texto + puntos)
    errors: 0,
    pool: 0,
    // turnos
    turn: 'A',
    stealTeam: 'B',
    originalTeam: 'A',
    // final
    winner: null,
    pendingFinal: false,
  };
}
