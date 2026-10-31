import { ANOMALIES, DECOYS } from '../data/anomalies.js';

const $ = (id) => document.getElementById(id);

const ENDINGS = {
  midnight: { title: '🌕 ¡Sobreviviste a la medianoche!', line: 'No le abriste a lo que no tenía cuerpo.' },
  letIn: { title: '🩸 Lo dejaste entrar...', line: 'A medianoche no había nadie en el porche. Y aun así abriste.' },
  dead: { title: '💀 Se apagaron tus velas', line: 'Abriste demasiadas veces.' },
};

const CLUE_NAMES = Object.fromEntries([...ANOMALIES, ...DECOYS].map((c) => [c.id, c.name]));

const RESULT_COPY = {
  happyKid: {
    tone: 'good',
    title: '🍬 ¡Era un niño!',
    detail: (o) => (o.decoyReveal ? `No te engañó: ${o.decoyReveal}.` : 'Se fue feliz con sus dulces.'),
  },
  avoided: { tone: 'good', title: '😮‍💨 ¡Bien visto!', detail: (o) => `Era un monstruo: ${o.reveal}.` },
  attacked: { tone: 'bad', title: '💀 ¡Era un monstruo!', detail: (o) => `Se te pasó que ${o.reveal}.` },
  sadKid: {
    tone: 'bad',
    title: '😢 Era solo un niño...',
    detail: (o) => (o.decoyReveal ? `Caíste: ${o.decoyReveal}.` : 'Se fue sin dulces.'),
  },
};

export function createScreens() {
  const screens = {
    menu: $('screen-menu'),
    hour: $('screen-hour'),
    knock: $('screen-knock'),
    result: $('screen-result'),
    summary: $('screen-summary'),
  };

  function show(name) {
    for (const [key, node] of Object.entries(screens)) node.hidden = key !== name;
  }

  return {
    hideAll() {
      show(null);
    },
    menu(best) {
      $('menu-best').textContent = best ? `🏆 Récord: ${best}` : '';
      show('menu');
    },
    hour(level) {
      $('hour-title').textContent = level.hour;
      $('hour-tip').textContent = level.tip;
      show('hour');
    },
    knock() {
      show('knock');
    },
    result(outcome) {
      const copy = RESULT_COPY[outcome.kind];
      const card = $('result-card');
      card.dataset.tone = copy.tone;
      $('result-title').textContent = copy.title;
      $('result-detail').textContent =
        (outcome.timeout ? '⏰ Se acabó el tiempo. ' : '') + copy.detail(outcome);
      $('result-points').textContent =
        outcome.kind === 'attacked' ? '−1 🕯️'
          : outcome.points > 0 ? `+${outcome.points}`
            : outcome.points < 0 ? `${outcome.points}` : '';
      show('result');
    },
    summary({ run, ending, best, isRecord }) {
      const copy = ENDINGS[ending];
      $('summary-title').textContent = copy.title;
      $('summary-line').textContent = copy.line;
      $('summary-score').textContent = run.score;
      $('summary-record').hidden = !isRecord;
      $('summary-stats').textContent =
        `${run.correct} aciertos · ${run.wrong} errores · ${run.candy} dulces sobrantes · récord ${best}`;

      // Pistas que viste esta noche: ✓ si siempre acertaste con ellas.
      const clues = $('summary-clues');
      clues.replaceChildren(...Object.entries(run.seen).map(([id, ok]) => {
        const chip = document.createElement('li');
        chip.className = ok ? 'chip chip--ok' : 'chip chip--miss';
        chip.textContent = `${ok ? '✓' : '✗'} ${CLUE_NAMES[id]}`;
        return chip;
      }));
      $('share-status').textContent = '';
      show('summary');
    },
    shareStatus(text) {
      $('share-status').textContent = text;
    },
    onStart(fn) {
      document.querySelectorAll('[data-action="start"]').forEach((btn) => btn.addEventListener('click', fn));
    },
    onShare(fn) {
      $('btn-share').addEventListener('click', fn);
    },
  };
}
