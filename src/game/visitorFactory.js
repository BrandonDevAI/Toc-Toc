import { COSTUMES, SKIN_TONES, PANTS, DIALOGUES } from '../data/costumes.js';
import { ANOMALIES, DECOYS } from '../data/anomalies.js';

const pick = (list, rng) => list[Math.floor(rng() * list.length)];

function pickWeighted(weights, rng) {
  const entries = Object.entries(weights);
  let roll = rng() * entries.reduce((sum, [, w]) => sum + w, 0);
  for (const [key, w] of entries) {
    roll -= w;
    if (roll < 0) return key;
  }
  return entries[entries.length - 1][0];
}

const fits = (costumeId) => (item) => !item.excludes?.includes(costumeId);

// Arma un visitante combinando piezas. Los monstruos reciben una anomalía del nivel actual;
// algunos niños, un detalle engañoso que parece pista pero no lo es.
export function createVisitor(id, level, rng = Math.random) {
  const isMonster = rng() < level.monsterRate;
  const costume = pick(COSTUMES, rng);
  const tier = pickWeighted(level.tiers, rng);
  const anomalies = ANOMALIES.filter((a) => a.tier === tier).filter(fits(costume.id));
  const decoys = DECOYS.filter(fits(costume.id));

  return {
    id,
    isMonster,
    costume: costume.id,
    palette: {
      skin: pick(SKIN_TONES, rng),
      cloth: pick(costume.colors, rng),
      pants: pick(PANTS, rng),
    },
    height: 0.78 + rng() * 0.22,
    props: rng() < 0.7 ? ['bolsa_calabaza'] : [],
    anomalies: isMonster ? [pick(anomalies, rng).id] : [],
    decoys: !isMonster && rng() < level.decoyRate ? [pick(decoys, rng).id] : [],
    dialogue: pick(DIALOGUES, rng),
  };
}

// Medianoche: no hay nadie en el porche. Solo una bolsa que flota y una sombra con cuernos.
export function createMidnightVisitor(id) {
  return {
    id,
    isMonster: true,
    costume: 'invisible',
    palette: { skin: '#000', cloth: '#000', pants: '#000' },
    height: 1,
    props: ['bolsa_calabaza'],
    anomalies: ['invisible'],
    decoys: [],
    dialogue: 'Dulce... o truco...',
  };
}
