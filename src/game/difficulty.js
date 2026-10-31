// Curva de la noche: cada hora trae más visitantes, menos tiempo y pistas más sutiles.
export const NIGHT = [
  { hour: '8 PM', visitors: 4, timer: 6, monsterRate: 0.35, tiers: ['obvia'], tip: 'Calentamiento: los monstruos casi no disimulan.' },
  { hour: '9 PM', visitors: 5, timer: 5, monsterRate: 0.4, tiers: ['obvia', 'media'], tip: 'Algunos ya aprendieron a esconderse.' },
  { hour: '10 PM', visitors: 6, timer: 4.5, monsterRate: 0.45, tiers: ['obvia', 'media'], tip: 'La niebla sube. Mira con atención.' },
  { hour: '11 PM', visitors: 6, timer: 4, monsterRate: 0.5, tiers: ['media', 'obvia'], tip: 'Última hora antes de medianoche...' },
];
