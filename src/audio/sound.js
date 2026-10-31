import { createMusic } from './music.js';

// Todos los sonidos se sintetizan con Web Audio: no hay archivos de audio.
// El navegador exige un gesto del usuario antes de sonar, por eso existe unlock().
const MUTE_KEY = 'toctoc:muted';
const MASTER_VOLUME = 0.8;

export function createSound() {
  let ctx = null;
  let master = null;
  let noise = null;
  let music = null;
  let muted = loadMuted();

  function unlock() {
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      ctx = new AudioCtx();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : MASTER_VOLUME;
      master.connect(ctx.destination);
      noise = createNoiseBuffer(ctx);
      startAmbience();
      music = createMusic(ctx, master, noise);
    }
    if (ctx.state === 'suspended') ctx.resume();
  }

  // Tono con envolvente rápida; `to` hace un glissando hasta esa frecuencia.
  function tone({ type = 'sine', freq, to = freq, at = 0, dur = 0.2, gain = 0.3 }) {
    if (!ctx) return;
    const t = ctx.currentTime + at;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  function burst({ at = 0, dur = 0.1, gain = 0.3, filter = 'lowpass', freq = 800 }) {
    if (!ctx) return;
    const t = ctx.currentTime + at;
    const src = ctx.createBufferSource();
    const f = ctx.createBiquadFilter();
    const g = ctx.createGain();
    src.buffer = noise;
    f.type = filter;
    f.frequency.value = freq;
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(master);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.05);
  }

  // Ruido filtrado con envolvente de subida y bajada (respiración, crujidos).
  function swell({ at = 0, dur, peak, freq, q = 0.8 }) {
    if (!ctx) return;
    const t = ctx.currentTime + at;
    const src = ctx.createBufferSource();
    const f = ctx.createBiquadFilter();
    const g = ctx.createGain();
    src.buffer = noise;
    f.type = 'bandpass';
    f.frequency.value = freq;
    f.Q.value = q;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + dur * 0.4);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(master);
    src.start(t, Math.random());
    src.stop(t + dur + 0.05);
  }

  // Viento: ruido filtrado que respira.
  function startAmbience() {
    const wind = ctx.createBufferSource();
    wind.buffer = noise;
    wind.loop = true;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 420;
    band.Q.value = 0.8;
    const lfo = ctx.createOscillator();
    const lfoDepth = ctx.createGain();
    lfo.frequency.value = 0.13;
    lfoDepth.gain.value = 260;
    lfo.connect(lfoDepth).connect(band.frequency);
    const windGain = ctx.createGain();
    windGain.gain.value = 0.05;
    wind.connect(band).connect(windGain).connect(master);
    wind.start();
    lfo.start();
  }

  return {
    unlock,
    get muted() {
      return muted;
    },
    toggleMute() {
      muted = !muted;
      saveMuted(muted);
      if (master) master.gain.setTargetAtTime(muted ? 0 : MASTER_VOLUME, ctx.currentTime, 0.05);
      return muted;
    },
    // Música (no hace nada hasta que el audio se desbloquea).
    setIntensity(value) {
      music?.setIntensity(value);
    },
    tension(duration) {
      music?.tension(duration);
    },
    release() {
      music?.release();
    },
    knock() {
      for (const at of [0, 0.3, 0.55]) {
        tone({ freq: 110, to: 42, at, dur: 0.22, gain: 1 });
        burst({ at, dur: 0.09, gain: 0.6, freq: 450 });
      }
      // La cadena tintinea con los golpes.
      for (let i = 0; i < 5; i++) {
        tone({ type: 'triangle', freq: 2800 + Math.random() * 2200, at: 0.05 + i * 0.09, dur: 0.08, gain: 0.03 });
      }
    },
    // Campanadas de medianoche (parciales inarmónicos, como una campana real).
    bells(count) {
      for (let i = 0; i < count; i++) {
        const at = i * 0.65;
        for (const [mult, gain] of [[1, 0.35], [2.76, 0.12], [5.4, 0.05]]) {
          tone({ freq: 196 * mult, at, dur: 2.6, gain });
        }
      }
    },
    // Pausa el audio cuando la pestaña queda en segundo plano.
    suspend() {
      if (ctx?.state === 'running') ctx.suspend();
    },
    resume() {
      if (ctx?.state === 'suspended') ctx.resume();
    },
    // Tu respiración; `nervous` la hace corta y entrecortada.
    breath(nervous = false) {
      const inhale = nervous ? 0.45 : 0.9;
      const exhale = nervous ? 0.5 : 1.2;
      swell({ dur: inhale, peak: 0.08, freq: 1200 });
      swell({ at: inhale + 0.08, dur: exhale, peak: 0.1, freq: 700 });
    },
    // Bisagra vieja al abrir la puerta.
    creak() {
      if (!ctx) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const band = ctx.createBiquadFilter();
      const g = ctx.createGain();
      osc.type = 'sawtooth';
      const curve = Float32Array.from({ length: 24 }, (_, i) => 70 + Math.sin(i * 1.7) * 25 + Math.random() * 40);
      osc.frequency.setValueCurveAtTime(curve, t, 1.1);
      band.type = 'bandpass';
      band.frequency.value = 750;
      band.Q.value = 5;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.3, t + 0.15);
      g.gain.linearRampToValueAtTime(0.0001, t + 1.1);
      osc.connect(band).connect(g).connect(master);
      osc.start(t);
      osc.stop(t + 1.2);
    },
    // Pestillo metálico.
    lock() {
      burst({ dur: 0.03, gain: 0.6, filter: 'highpass', freq: 2200 });
      tone({ type: 'square', freq: 1700, dur: 0.04, gain: 0.06 });
      burst({ at: 0.09, dur: 0.05, gain: 0.7, filter: 'highpass', freq: 1500 });
      tone({ freq: 160, to: 90, at: 0.09, dur: 0.12, gain: 0.4 });
    },
    heartbeat() {
      tone({ freq: 62, to: 40, dur: 0.16, gain: 0.7 });
      tone({ freq: 58, to: 38, at: 0.18, dur: 0.14, gain: 0.45 });
    },
    candy() {
      [784, 988, 1175, 1568].forEach((freq, i) =>
        tone({ type: 'triangle', freq, at: i * 0.07, dur: 0.25, gain: 0.18 }));
    },
    avoided() {
      tone({ freq: 523, at: 0, dur: 0.3, gain: 0.15 });
      tone({ freq: 659, at: 0.12, dur: 0.4, gain: 0.15 });
    },
    sad() {
      tone({ type: 'triangle', freq: 392, to: 370, dur: 0.3, gain: 0.18 });
      tone({ type: 'triangle', freq: 311, to: 277, at: 0.28, dur: 0.5, gain: 0.18 });
    },
    // Susto: grito de cuerdas agudas y disonantes sobre un golpe grave.
    scare() {
      for (const freq of [110, 117, 156, 233]) {
        tone({ type: 'sawtooth', freq, to: freq * 0.5, dur: 1.2, gain: 0.12 });
      }
      for (const freq of [1046, 1109, 1480, 1568]) {
        tone({ type: 'sawtooth', freq, to: freq * 1.06, dur: 1.1, gain: 0.05 });
      }
      tone({ freq: 70, to: 30, dur: 1.4, gain: 0.9 });
      burst({ dur: 0.6, gain: 0.7, filter: 'highpass', freq: 1200 });
    },
  };
}

function createNoiseBuffer(ctx) {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

function loadMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

function saveMuted(value) {
  try {
    localStorage.setItem(MUTE_KEY, value ? '1' : '0');
  } catch {
    // Sin almacenamiento: la preferencia dura solo esta visita.
  }
}
