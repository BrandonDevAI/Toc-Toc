import { createEventBus } from './core/eventBus.js';
import { createStateMachine } from './core/stateMachine.js';
import { createGameLoop } from './core/gameLoop.js';
import { NIGHT } from './game/difficulty.js';
import { createVisitor } from './game/visitorFactory.js';
import { createRun, resolveDecision } from './game/rules.js';
import { createVisitorRenderer } from './render/visitorRenderer.js';
import { playEffect } from './render/effects.js';
import { createHud } from './ui/hud.js';
import { createScreens } from './ui/screens.js';
import { createControls } from './ui/controls.js';

const HOUR_INTRO_TIME = 2;
const KNOCK_TIME = 1.1;
const RESULT_TIME = 1.9;
const BEST_KEY = 'toctoc:best';

const bus = createEventBus();
const stage = document.getElementById('stage');
const flash = document.getElementById('flash');
const renderer = createVisitorRenderer(document.getElementById('scene'));
const hud = createHud(bus);
const screens = createScreens();
const controls = createControls(stage, bus);

let run = createRun();
let visitor = null;
let visitorCount = 0;
let timeLeft = 0;

const level = () => NIGHT[Math.min(run.hourIndex, NIGHT.length - 1)];
const syncHud = () => bus.emit('run:changed', { run, level: level() });

const sm = createStateMachine({
  menu: {
    enter() {
      renderer.setVisitor(null);
      screens.menu(loadBest());
    },
  },
  hourIntro: {
    enter() {
      renderer.setVisitor(null);
      screens.hour(level());
      syncHud();
    },
    update(dt, elapsed) {
      if (elapsed > HOUR_INTRO_TIME) sm.change('knock');
    },
  },
  knock: {
    enter() {
      visitor = createVisitor(++visitorCount, level());
      renderer.setVisitor(null);
      screens.knock();
      playEffect(stage, 'is-knocking');
    },
    update(dt, elapsed) {
      if (elapsed > KNOCK_TIME) sm.change('peek');
    },
  },
  peek: {
    enter() {
      screens.hideAll();
      renderer.setVisitor(visitor);
      timeLeft = level().timer;
      hud.say(visitor.dialogue);
      controls.enable(run.candy > 0);
    },
    update(dt) {
      timeLeft -= dt;
      hud.setTimer(timeLeft / level().timer);
      if (timeLeft <= 0) decide('timeout');
    },
    exit() {
      controls.disable();
      hud.hush();
    },
  },
  result: {
    enter(outcome) {
      screens.result(outcome);
      renderer.react(outcome.kind);
      syncHud();
      if (outcome.kind === 'attacked') {
        playEffect(stage, 'is-shaking');
        playEffect(flash, 'is-flashing');
      }
    },
    update(dt, elapsed) {
      if (elapsed > RESULT_TIME) advance();
    },
    exit() {
      hud.setTimer(1);
    },
  },
  summary: {
    enter({ won }) {
      const previous = loadBest();
      const isRecord = run.score > previous;
      if (isRecord) saveBest(run.score);
      screens.summary({ run, won, best: Math.max(previous, run.score), isRecord });
    },
  },
}, bus);

function decide(decision) {
  const outcome = resolveDecision(run, visitor, decision, timeLeft, level().timer);
  sm.change('result', outcome);
}

function advance() {
  if (run.lives <= 0) return sm.change('summary', { won: false });
  run.visitorInHour++;
  if (run.visitorInHour < level().visitors) return sm.change('knock');
  run.visitorInHour = 0;
  run.hourIndex++;
  if (run.hourIndex >= NIGHT.length) return sm.change('summary', { won: true });
  sm.change('hourIntro');
}

function startRun() {
  run = createRun();
  visitorCount = 0;
  hud.setTimer(1);
  syncHud();
  sm.change('hourIntro');
}

function loadBest() {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

function saveBest(score) {
  try {
    localStorage.setItem(BEST_KEY, String(score));
  } catch {
    // Sin almacenamiento disponible: el récord solo dura esta partida.
  }
}

bus.on('decision', (decision) => {
  if (sm.name === 'peek') decide(decision);
});
screens.onStart(startRun);
window.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (sm.name === 'menu' || sm.name === 'summary')) startRun();
});

syncHud();
sm.change('menu');
createGameLoop(
  (dt) => {
    sm.update(dt);
    renderer.update(dt);
  },
  () => renderer.render(),
).start();
