import { multiplier } from '../game/rules.js';

const $ = (id) => document.getElementById(id);

export function createHud(bus) {
  const hour = $('hud-hour');
  const lives = $('hud-lives');
  const candy = $('hud-candy');
  const score = $('hud-score');
  const streak = $('streak');
  const timer = $('timer-fill');
  const bubble = $('bubble');

  bus.on('run:changed', ({ run, level }) => {
    hour.textContent = level.hour;
    lives.innerHTML = Array.from({ length: run.maxLives }, (_, i) =>
      `<span class="${i < run.lives ? '' : 'is-out'}">🕯️</span>`,
    ).join('');
    candy.textContent = run.candy;
    score.textContent = run.score;
    streak.hidden = multiplier(run) < 2;
  });

  return {
    setTimer(fraction) {
      const f = Math.max(0, Math.min(1, fraction));
      timer.style.transform = `scaleX(${f})`;
      timer.classList.toggle('is-low', f < 0.35);
    },
    say(text) {
      bubble.textContent = text;
      bubble.hidden = false;
    },
    hush() {
      bubble.hidden = true;
    },
  };
}
