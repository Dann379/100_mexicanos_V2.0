export const defaultState = (prefs) => ({
  phase: 'LOBBY',
  roundIndex: -1,
  multiplier: 1,
  revealed: new Set(),
  errors: 0,
  pool: 0,
  scoreA: 0,
  scoreB: 0,
  turn: 'A',
  stealTeam: 'B',
  originalTeam: 'A',
  names: { A: 'Equipo 1', B: 'Equipo 2' },
  winner: null,
  pendingFinal: false,
  winThreshold: prefs.winThreshold, // localStorage
  randomOn: prefs.randomOn,         // localStorage
  roundOrder: [],
  roundCursor: -1,
});
export const otherTeam = (t) => (t === 'A' ? 'B' : 'A');
