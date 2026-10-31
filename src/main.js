import { createEventBus } from './core/eventBus.js';
import { createStateMachine } from './core/stateMachine.js';
import { createGameLoop } from './core/gameLoop.js';
import { NIGHT } from './game/difficulty.js';
import { createVisitor, createMidnightVisitor } from './game/visitorFactory.js';
import { createRun, resolveDecision, resolveMidnight, endingOf } from './game/rules.js';
import { THOUGHTS } from './data/thoughts.js';
import { createVisitorRenderer } from './render/visitorRenderer.js';
import { playEffect } from './render/effects.js';
import { createHud } from './ui/hud.js';
import { createScreens } from './ui/screens.js';
import { createControls } from './ui/controls.js';
import { createSound } from './audio/sound.js';

const HOUR_INTRO_TIME = 2;
const KNOCK_TIME = 1.4;
const RESULT_TIME = 2.2;
const HURRY_AT = 0.4; // fracción del tiempo restante en la que entran los nervios
const HEARTBEAT_EVERY = 0.75;
const BREATH_CALM = 2.3;
const BREATH_NERVOUS = 1.1;
const LATE_HOUR = 3;
const MIDNIGHT_BELLS = 6;
const BEST_KEY = 'toctoc:best';
const SHARE_TEXT = {
  midnight: (s) => `🚪 Sobreviví a la medianoche en Toc Toc con ${s} puntos 🌕🎃 ¿Te atreves a mirar por la mirilla?`,
  letIn: (s) => `🚪 Hice ${s} puntos en Toc Toc... pero a medianoche abrí la puerta 🩸 ¿Tú le abrirías?`,
  dead: (s) => `🚪 Hice ${s} puntos en Toc Toc antes de que se apagaran mis velas 🕯️ ¿Llegas a medianoche?`,
};

const RESULT_SOUND = {
  happyKid: 'candy',
  avoided: 'avoided',
  sadKid: 'sad',
  attacked: 'scare',
};

const pick = (list) => list[Math.floor(Math.random() * list.length)];

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
let nextBreath = 0;
let hurried = false;

const level = () => NIGHT[Math.min(run.hourIndex, NIGHT.length - 1)];
const syncHud = () => {
  bus.emit('run:changed', { run, level: level() });
  renderer.setCandy(run.candy);
};

const sm = createStateMachine({
  menu: {
    enter() {
      renderer.setVisitor(null);
      hud.clearThought();
      screens.menu(loadBest());
    },
  },
  hourIntro: {
    enter() {
      renderer.setVisitor(null);
      renderer.setAtmosphere(level());
      sound.setIntensity(run.hourIndex / (NIGHT.length - 1));
      if (level().midnight) sound.bells(MIDNIGHT_BELLS);
      hud.clearThought();
      screens.hour(level());
      syncHud();
    },
    update(dt, elapsed) {
      if (elapsed > (level().introTime ?? HOUR_INTRO_TIME)) sm.change('knock');
    },
  },
  knock: {
    enter() {
      const midnight = level().midnight;
      visitor = midnight ? createMidnightVisitor(++visitorCount) : createVisitor(++visitorCount, level());
      renderer.setVisitor(null);
      renderer.knock();
      screens.knock();
      playEffect(stage, 'is-knocking');
      sound.knock();
      hud.think(pick(midnight ? THOUGHTS.midnightKnock : THOUGHTS.knock));
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
      nextHeartbeat = level().timer * HURRY_AT;
      nextBreath = 0.3;
      hurried = false;
      hud.say(visitor.dialogue);
      const pool = level().midnight ? THOUGHTS.midnight
        : run.hourIndex >= LATE_HOUR ? [...THOUGHTS.peek, ...THOUGHTS.late]
          : THOUGHTS.peek;
      hud.think(pick(pool));
      controls.enable(run.candy > 0);
      sound.tension(level().timer);
    },
    update(dt, elapsed) {
      timeLeft -= dt;
      const fraction = timeLeft / level().timer;
      hud.setTimer(fraction);
      renderer.setTension(1 - fraction);

      if (!hurried && fraction < HURRY_AT) {
        hurried = true;
        hud.think(pick(THOUGHTS.hurry));
      }
      if (timeLeft <= nextHeartbeat && timeLeft > 0) {
        sound.heartbeat();
        nextHeartbeat -= HEARTBEAT_EVERY;
      }
      if (elapsed >= nextBreath) {
        sound.breath(hurried);
        nextBreath = elapsed + (hurried ? BREATH_NERVOUS : BREATH_CALM);
      }
      if (timeLeft <= 0) decide('timeout');
    },
    exit() {
      controls.disable();
      hud.hush();
      hud.clearThought();
      sound.release();
      renderer.setTension(0);
      renderer.setIntent(null);
    },
  },
  result: {
    enter(outcome) {
      const opened = outcome.kind === 'happyKid' || outcome.kind === 'attacked';
      screens.result(outcome);
      renderer.react(outcome.kind);
      if (opened) sound.creak();
      else sound.lock();
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
    enter() {
      const previous = loadBest();
      const isRecord = run.score > previous;
      if (isRecord) saveBest(run.score);
      screens.summary({ run, ending: endingOf(run), best: Math.max(previous, run.score), isRecord });
    },
  },
}, bus);

function decide(decision) {
  const outcome = resolveDecision(run, visitor, decision, timeLeft, level().timer);
  if (level().midnight) resolveMidnight(run, outcome);
  sm.change('result', outcome);
}

function advance() {
  if (run.lives <= 0) return sm.change('summary');
  run.visitorInHour++;
  if (run.visitorInHour < level().visitors) return sm.change('knock');
  run.visitorInHour = 0;
  run.hourIndex++;
  if (run.hourIndex >= NIGHT.length) return sm.change('summary');
  sm.change('hourIntro');
}

async function share() {
  const text = SHARE_TEXT[endingOf(run)](run.score);
  const url = location.href.split('#')[0];
  try {
    if (navigator.share) {
      await navigator.share({ title: 'Toc Toc', text, url });
      return;
    }
    await navigator.clipboard.writeText(`${text} ${url}`);
    screens.shareStatus('¡Copiado! Pégalo donde quieras.');
  } catch (err) {
    if (err?.name !== 'AbortError') screens.shareStatus('No se pudo compartir desde este navegador.');
  }
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

function renderMute() {
  muteBtn.textContent = sound.muted ? '🔇' : '🔊';
  muteBtn.setAttribute('aria-label', sound.muted ? 'Activar sonido' : 'Silenciar');
}

bus.on('decision', (decision) => {
  if (sm.name === 'peek') decide(decision);
});
bus.on('intent', (intent) => {
  if (sm.name === 'peek') renderer.setIntent(intent);
});
screens.onStart(startRun);
screens.onShare(share);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) sound.suspend();
  else sound.resume();
});
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
