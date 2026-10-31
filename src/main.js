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
import { createSound } from './audio/sound.js';

const HOUR_INTRO_TIME = 2;
const KNOCK_TIME = 1.1;
const RESULT_TIME = 1.9;
const HEARTBEAT_FROM = 0.4; // fracción del tiempo restante en la que empieza el latido
const HEARTBEAT_EVERY = 0.75;
const BEST_KEY = 'toctoc:best';

const RESULT_SOUND = {
  happyKid: 'candy',
  avoided: 'avoided',
  sadKid: 'sad',
  attacked: 'scare',
};

const bus = createEventBus();
const stage = document.getElementById('stage');
const flash = document.getElementById('flash');
const renderer = createVisitorRenderer(document.getElementById('scene'));
const hud = createHud(bus);
const screens = createScreens();
const controls = createControls(stage, bus);
const sound = createSound();
const muteBtn = document.getElementById('btn-mute');

let run = createRun();
let visitor = null;
let visitorCount = 0;
let timeLeft = 0;
let nextHeartbeat = 0;

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
      renderer.setAtmosphere(level());
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
      sound.knock();
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
      nextHeartbeat = level().timer * HEARTBEAT_FROM;
      hud.say(visitor.dialogue);
      controls.enable(run.candy > 0);
    },
    update(dt) {
      timeLeft -= dt;
      hud.setTimer(timeLeft / level().timer);
      if (timeLeft <= nextHeartbeat && timeLeft > 0) {
        sound.heartbeat();
        nextHeartbeat -= HEARTBEAT_EVERY;
      }
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
      sound[RESULT_SOUND[outcome.kind]]();
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
  sound.unlock();
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
function renderMute() {
  muteBtn.textContent = sound.muted ? '🔇' : '🔊';
  muteBtn.setAttribute('aria-label', sound.muted ? 'Activar sonido' : 'Silenciar');
}

screens.onStart(startRun);
muteBtn.addEventListener('click', () => {
  sound.toggleMute();
  sound.unlock();
  renderMute();
});
window.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (sm.name === 'menu' || sm.name === 'summary')) startRun();
  if (e.key.toLowerCase() === 'm') {
    sound.toggleMute();
    renderMute();
  }
});

renderMute();
renderer.setAtmosphere(NIGHT[0]);
syncHud();
sm.change('menu');
createGameLoop(
  (dt) => {
    sm.update(dt);
    renderer.update(dt);
  },
  () => renderer.render(),
).start();
