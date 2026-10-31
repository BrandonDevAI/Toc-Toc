// Pistas que delatan a un monstruo real. `tier` decide en qué horas pueden aparecer.
// `reveal` se muestra después de decidir, para que el jugador aprenda a detectarlas.
// `excludes` evita disfraces donde la pista no se vería o se confundiría con el disfraz.
export const ANOMALIES = [
  { id: 'ojos_rojos', tier: 'obvia', reveal: 'le brillaban los ojos en rojo' },
  { id: 'cola', tier: 'obvia', reveal: 'le asomaba una cola de verdad, y se movía' },
  { id: 'colmillos', tier: 'obvia', reveal: 'tenía colmillos largos de verdad' },
  { id: 'sin_sombra', tier: 'media', reveal: 'no tenía sombra' },
  { id: 'sombra_rara', tier: 'media', reveal: 'su sombra tenía cuernos' },
  { id: 'ojos_negros', tier: 'media', reveal: 'tenía los ojos completamente negros', excludes: ['fantasma'] },
  { id: 'sonrisa_ancha', tier: 'sutil', reveal: 'su sonrisa era demasiado ancha', excludes: ['espantapajaros'] },
  { id: 'flota', tier: 'sutil', reveal: 'flotaba: sus pies no tocaban el piso' },
  { id: 'no_parpadea', tier: 'sutil', reveal: 'nunca parpadeó' },
];

// Detalles de disfraz que parecen pistas pero no lo son. Castigan al que decide sin mirar bien.
export const DECOYS = [
  { id: 'cola_falsa', reveal: 'la cola era de peluche y no se movía' },
  { id: 'lentes_rojos', reveal: 'eran lentes de juguete', excludes: ['fantasma'] },
  { id: 'colmillos_plastico', reveal: 'los colmillos eran de plástico' },
];
