import { ANOMALIES, DECOYS } from '../data/anomalies.js';

const START_LIVES = 3;
const START_CANDY = 20;
const BASE_POINTS = 100;
const SPEED_BONUS = 50;
const SAD_KID_PENALTY = 50;
const STREAK_FOR_BONUS = 3;
const MIDNIGHT_BONUS = 1000;

export function createRun() {
  return {
    lives: START_LIVES,
    maxLives: START_LIVES,
    candy: START_CANDY,
    score: 0,
    streak: 0,
    hourIndex: 0,
    visitorInHour: 0,
    correct: 0,
    wrong: 0,
    // Pistas y señuelos que viste esta noche: id -> si siempre acertaste con ellos.
    seen: {},
    // Cómo terminó la medianoche: null si no se llegó, o el `kind` del resultado.
    midnight: null,
  };
}

export function multiplier(run) {
  return run.streak >= STREAK_FOR_BONUS ? 2 : 1;
}

// decision: 'open' | 'reject' | 'timeout' (no decidir cuenta como no abrir).
export function resolveDecision(run, visitor, decision, timeLeft, timer) {
  const opened = decision === 'open';
  const correct = opened !== visitor.isMonster;
  const reveal = ANOMALIES.find((a) => a.id === visitor.anomalies[0])?.reveal ?? null;
  const decoyReveal = DECOYS.find((d) => d.id === visitor.decoys[0])?.reveal ?? null;
  let points = 0;

  if (correct) {
    run.streak++;
    run.correct++;
    const speed = Math.max(0, timeLeft) / timer;
    points = Math.round((BASE_POINTS + SPEED_BONUS * speed) * multiplier(run));
    if (opened) run.candy--;
  } else {
    run.streak = 0;
    run.wrong++;
    if (opened) run.lives--;
    else points = -Math.min(SAD_KID_PENALTY, run.score);
  }
  run.score += points;

  const clue = visitor.anomalies[0] ?? visitor.decoys[0];
  if (clue) run.seen[clue] = (run.seen[clue] ?? true) && correct;

  const kind = opened
    ? visitor.isMonster ? 'attacked' : 'happyKid'
    : visitor.isMonster ? 'avoided' : 'sadKid';

  return { kind, correct, points, reveal, decoyReveal, timeout: decision === 'timeout' };
}

// La medianoche define el final; no abrir da un bono grande.
export function resolveMidnight(run, outcome) {
  run.midnight = outcome.kind;
  if (outcome.correct) {
    run.score += MIDNIGHT_BONUS;
    outcome.points += MIDNIGHT_BONUS;
  }
}

// 'midnight' (sobreviviste), 'letIn' (abriste a medianoche) o 'dead' (sin velas).
export function endingOf(run) {
  if (run.midnight === 'attacked') return 'letIn';
  return run.lives <= 0 ? 'dead' : 'midnight';
}
