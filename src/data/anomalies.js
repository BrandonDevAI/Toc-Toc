// Pistas que delatan a un monstruo real. `tier` decide en qué horas pueden aparecer.
// `name` se usa en el resumen final; `reveal` se muestra después de decidir,
// para que el jugador aprenda a detectarlas.
// `excludes` evita disfraces donde la pista no se vería o se confundiría con el disfraz.
export const ANOMALIES = [
  { id: 'ojos_rojos', tier: 'obvia', name: 'Ojos rojos', reveal: 'le brillaban los ojos en rojo' },
  { id: 'cola', tier: 'obvia', name: 'Cola', reveal: 'le asomaba una cola de verdad, y se movía' },
  { id: 'colmillos', tier: 'obvia', name: 'Colmillos', reveal: 'tenía colmillos largos de verdad' },
  { id: 'sin_sombra', tier: 'media', name: 'Sin sombra', reveal: 'no tenía sombra' },
  { id: 'sombra_rara', tier: 'media', name: 'Sombra con cuernos', reveal: 'su sombra tenía cuernos' },
  { id: 'ojos_negros', tier: 'media', name: 'Ojos negros', reveal: 'tenía los ojos completamente negros', excludes: ['fantasma'] },
  { id: 'sonrisa_ancha', tier: 'sutil', name: 'Sonrisa ancha', reveal: 'su sonrisa era demasiado ancha', excludes: ['espantapajaros'] },
  { id: 'flota', tier: 'sutil', name: 'Flota', reveal: 'flotaba: sus pies no tocaban el piso' },
  { id: 'no_parpadea', tier: 'sutil', name: 'No parpadea', reveal: 'nunca parpadeó' },
  // Solo aparece en el evento de medianoche.
  { id: 'invisible', tier: 'medianoche', name: 'El de medianoche', reveal: 'no había nadie... solo su sombra' },
];

// Detalles de disfraz que parecen pistas pero no lo son. Castigan al que decide sin mirar bien.
export const DECOYS = [
  { id: 'cola_falsa', name: 'Cola de peluche', reveal: 'la cola era de peluche y no se movía' },
  { id: 'lentes_rojos', name: 'Lentes de juguete', reveal: 'eran lentes de juguete', excludes: ['fantasma'] },
  { id: 'colmillos_plastico', name: 'Colmillos de plástico', reveal: 'los colmillos eran de plástico' },
];
