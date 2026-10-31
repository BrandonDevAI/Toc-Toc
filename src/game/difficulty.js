// Curva de la noche: cada hora trae más visitantes, menos tiempo y pistas más sutiles.
// `tiers` son pesos: qué tan seguido sale cada tipo de pista en un monstruo.
// `decoyRate` es la probabilidad de que un niño traiga un detalle engañoso.
// `fog` y `flicker` (0 a 1) controlan la niebla y cuánto titila la luz del porche.
export const NIGHT = [
  {
    hour: '8 PM', visitors: 4, timer: 6, monsterRate: 0.35,
    tiers: { obvia: 1 }, decoyRate: 0,
    fog: 0.15, flicker: 0,
    tip: 'Calentamiento: los monstruos casi no disimulan.',
  },
  {
    hour: '9 PM', visitors: 5, timer: 5, monsterRate: 0.4,
    tiers: { obvia: 2, media: 2 }, decoyRate: 0,
    fog: 0.35, flicker: 0.2,
    tip: 'Algunos ya aprendieron a esconderse. Mira también su sombra.',
  },
  {
    hour: '10 PM', visitors: 6, timer: 4.5, monsterRate: 0.45,
    tiers: { obvia: 1, media: 2, sutil: 1 }, decoyRate: 0.2,
    fog: 0.6, flicker: 0.5,
    tip: 'Ojo: algunos disfraces engañan.',
  },
  {
    hour: '11 PM', visitors: 6, timer: 4, monsterRate: 0.5,
    tiers: { media: 2, sutil: 2 }, decoyRate: 0.35,
    fog: 0.85, flicker: 1,
    tip: 'Última hora antes de medianoche... ¿parpadean? ¿tocan el piso?',
  },
  // Evento final: un solo visitante especial. Ver createMidnightVisitor.
  {
    hour: '12 AM', visitors: 1, timer: 6, monsterRate: 1,
    tiers: {}, decoyRate: 0,
    fog: 1, flicker: 1, midnight: true, introTime: 4.2,
    tip: 'Medianoche. Un último golpe en la puerta...',
  },
];
