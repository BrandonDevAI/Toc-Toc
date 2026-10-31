// Todos los sonidos se sintetizan con Web Audio: no hay archivos de audio.
// El navegador exige un gesto del usuario antes de sonar, por eso existe unlock().
const MUTE_KEY = 'toctoc:muted';
const MASTER_VOLUME = 0.8;

export function createSound() {
  let ctx = null;
  let master = null;
  let noise = null;
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

  // Viento (ruido filtrado que respira) y un zumbido grave de fondo.
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

    for (const freq of [55, 82.4]) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.frequency.value = freq;
      g.gain.value = 0.018;
      osc.connect(g).connect(master);
      osc.start();
    }
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
    knock() {
      for (const at of [0, 0.26]) {
        tone({ freq: 120, to: 50, at, dur: 0.18, gain: 0.9 });
        burst({ at, dur: 0.07, gain: 0.5, freq: 500 });
      }
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
    scare() {
      for (const freq of [110, 117, 156, 233]) {
        tone({ type: 'sawtooth', freq, to: freq * 0.5, dur: 0.9, gain: 0.12 });
      }
      burst({ dur: 0.5, gain: 0.6, filter: 'highpass', freq: 1200 });
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
