import { COSTUMES, SKIN_TONES, PANTS, DIALOGUES } from '../data/costumes.js';
import { ANOMALIES } from '../data/anomalies.js';

const pick = (list, rng) => list[Math.floor(rng() * list.length)];

// Arma un visitante combinando piezas; los monstruos reciben una anomalía del nivel actual.
export function createVisitor(id, level, rng = Math.random) {
  const isMonster = rng() < level.monsterRate;
  const costume = pick(COSTUMES, rng);
  const pool = ANOMALIES.filter((a) => level.tiers.includes(a.tier));

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
    anomalies: isMonster ? [pick(pool, rng).id] : [],
    dialogue: pick(DIALOGUES, rng),
  };
}
