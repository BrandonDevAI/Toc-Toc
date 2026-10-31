// Curva de la noche: cada hora trae más visitantes, menos tiempo y pistas más sutiles.
// `fog` y `flicker` (0 a 1) controlan la niebla y cuánto titila la luz del porche.
export const NIGHT = [
  { hour: '8 PM', visitors: 4, timer: 6, monsterRate: 0.35, tiers: ['obvia'], fog: 0.15, flicker: 0, tip: 'Calentamiento: los monstruos casi no disimulan.' },
  { hour: '9 PM', visitors: 5, timer: 5, monsterRate: 0.4, tiers: ['obvia', 'media'], fog: 0.35, flicker: 0.2, tip: 'Algunos ya aprendieron a esconderse.' },
  { hour: '10 PM', visitors: 6, timer: 4.5, monsterRate: 0.45, tiers: ['obvia', 'media'], fog: 0.6, flicker: 0.5, tip: 'La niebla sube. Mira con atención.' },
  { hour: '11 PM', visitors: 6, timer: 4, monsterRate: 0.5, tiers: ['media', 'obvia'], fog: 0.85, flicker: 1, tip: 'Última hora antes de medianoche...' },
];
