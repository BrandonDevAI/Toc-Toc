// Música de terror generada en vivo con Web Audio:
// - un dron grave y disonante que nunca se resuelve,
// - una caja musical desafinada a la que se le acaba la cuerda,
// - cuerdas en trémolo que crecen con la hora,
// - raspones, susurros y golpes lejanos al azar,
// - un tono que sube mientras decides y se corta de golpe al decidir.
const TICK_MS = 100;
const LOOKAHEAD = 0.3;
const BEAT = 0.46;
const VOLUME = 0.9;

// Melodía de la caja musical: [semitonos desde La4, duración en tiempos].
const MELODY = [
  [0, 1], [3, 1], [7, 1], [6, 2], [3, 1], [2, 1], [-1, 2], [0, 3],
  [7, 1], [8, 1], [7, 1], [6, 1], [3, 2], [1, 1], [0, 4],
];
const freqOf = (semitones) => 440 * 2 ** (semitones / 12);

export function createMusic(ctx, out, noise) {
  const bus = ctx.createGain();
  bus.gain.value = VOLUME;
  bus.connect(out);

  const reverb = ctx.createConvolver();
  reverb.buffer = createImpulse(ctx, 3.5);
  const wet = ctx.createGain();
  wet.gain.value = 0.6;
  reverb.connect(wet).connect(bus);

  // Conecta un nodo seco al bus y una parte a la reverb.
  function send(node, amount = 1) {
    node.connect(bus);
    const g = ctx.createGain();
    g.gain.value = amount;
    node.connect(g).connect(reverb);
  }

  // Dron: dos notas a medio tono (La y Si bemol) que "pelean" entre sí.
  const droneFilter = ctx.createBiquadFilter();
  droneFilter.type = 'lowpass';
  droneFilter.frequency.value = 240;
  droneFilter.Q.value = 6;
  for (const f of [55, 58.27]) {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = f;
    osc.connect(droneFilter);
    osc.start();
  }
  const droneLfo = ctx.createOscillator();
  const droneDepth = ctx.createGain();
  droneLfo.frequency.value = 0.045;
  droneDepth.gain.value = 140;
  droneLfo.connect(droneDepth).connect(droneFilter.frequency);
  droneLfo.start();
  const drone = ctx.createGain();
  drone.gain.value = 0.045;
  droneFilter.connect(drone);
  send(drone, 0.8);

  const sub = ctx.createOscillator();
  const subGain = ctx.createGain();
  sub.frequency.value = 41.2;
  subGain.gain.value = 0.05;
  sub.connect(subGain).connect(bus);
  sub.start();

  // Cuerdas en trémolo (Mi, Fa y Si bemol: tritono y medio tono).
  const stringBand = ctx.createBiquadFilter();
  stringBand.type = 'bandpass';
  stringBand.frequency.value = 1400;
  stringBand.Q.value = 0.9;
  for (const f of [329.63, 349.23, 466.16]) {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = f;
    osc.detune.value = (Math.random() - 0.5) * 14;
    osc.connect(stringBand);
    osc.start();
  }
  const trem = ctx.createGain();
  trem.gain.value = 0.5;
  const tremLfo = ctx.createOscillator();
  const tremDepth = ctx.createGain();
  tremLfo.frequency.value = 6.5;
  tremDepth.gain.value = 0.5;
  tremLfo.connect(tremDepth).connect(trem.gain);
  tremLfo.start();
  const strings = ctx.createGain();
  strings.gain.value = 0;
  stringBand.connect(trem).connect(strings);
  send(strings, 1);

  const box = ctx.createGain();
  box.gain.value = 1;
  send(box, 1.3);

  let intensity = 0;
  let noteIndex = 0;
  let nextNote = ctx.currentTime + 1;
  let nextEvent = ctx.currentTime + 6;
  let riser = null;

  function musicBox(freq, t) {
    const detune = (Math.random() - 0.5) * 30;
    for (const [mult, gain, type] of [[1, 0.16, 'sine'], [2, 0.05, 'sine'], [4.02, 0.02, 'triangle']]) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq * mult;
      osc.detune.value = detune;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(gain, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
      osc.connect(g).connect(box);
      osc.start(t);
      osc.stop(t + 1.9);
    }
  }

  function noiseVoice(t, dur) {
    const src = ctx.createBufferSource();
    src.buffer = noise;
    src.start(t, Math.random() * 1.5);
    src.stop(t + dur + 0.1);
    return src;
  }

  function panned(node) {
    const pan = ctx.createStereoPanner();
    pan.pan.value = Math.random() * 1.6 - 0.8;
    node.connect(pan);
    send(pan, 1.2);
  }

  // Raspón metálico, como uñas en una puerta.
  function scrape(t) {
    const src = noiseVoice(t, 1.8);
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.Q.value = 8;
    band.frequency.setValueAtTime(2600, t);
    band.frequency.exponentialRampToValueAtTime(450, t + 1.8);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.14, t + 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
    src.connect(band).connect(g);
    panned(g);
  }

  // Susurro: ruido con forma de voz cortado en sílabas.
  function whisper(t) {
    const src = noiseVoice(t, 1.4);
    const formant = ctx.createBiquadFilter();
    formant.type = 'bandpass';
    formant.frequency.value = 900 + Math.random() * 600;
    formant.Q.value = 2.5;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    for (let i = 0; i < 8; i++) {
      const at = t + i * 0.15;
      g.gain.linearRampToValueAtTime(0.03 + Math.random() * 0.07, at + 0.05);
      g.gain.linearRampToValueAtTime(0.004, at + 0.14);
    }
    src.connect(formant).connect(g);
    panned(g);
  }

  // Golpe grave lejano.
  function boom(t) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.frequency.setValueAtTime(50, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 2.5);
    g.gain.setValueAtTime(0.3, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.5);
    osc.connect(g);
    send(g, 1.5);
    osc.start(t);
    osc.stop(t + 2.6);
  }

  function schedule() {
    const now = ctx.currentTime;
    if (nextNote < now - 1) nextNote = now + 0.1; // la pestaña estuvo en segundo plano

    while (nextNote < now + LOOKAHEAD) {
      const [semitones, beats] = MELODY[noteIndex];
      // Al final de cada frase la caja se va quedando sin cuerda.
      const windDown = Math.max(0, noteIndex - (MELODY.length - 5)) * 0.22;
      musicBox(freqOf(semitones + 12), nextNote);
      nextNote += beats * BEAT * (1 + windDown);
      noteIndex = (noteIndex + 1) % MELODY.length;
      if (noteIndex === 0) nextNote += 5 + Math.random() * 6;
    }

    if (now >= nextEvent) {
      const roll = Math.random();
      if (roll < 0.4) scrape(now + 0.05);
      else if (roll < 0.75) whisper(now + 0.05);
      else boom(now + 0.05);
      nextEvent = now + 7 + Math.random() * (10 - intensity * 5);
    }
  }

  setInterval(schedule, TICK_MS);

  return {
    // 0 = 8 PM, 1 = 11 PM. Sube cuerdas y dron.
    setIntensity(value) {
      intensity = value;
      const now = ctx.currentTime;
      strings.gain.setTargetAtTime(0.012 + 0.05 * value, now, 2);
      drone.gain.setTargetAtTime(0.045 + 0.03 * value, now, 2);
    },
    // Tono que sube durante `duration` segundos mientras miras por la mirilla.
    tension(duration) {
      this.release(false);
      const now = ctx.currentTime;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(0.07, now + duration);
      const oscs = [180, 184.5].map((f) => {
        const osc = ctx.createOscillator();
        osc.frequency.setValueAtTime(f, now);
        osc.frequency.exponentialRampToValueAtTime(f * 2, now + duration);
        osc.connect(g);
        osc.start(now);
        return osc;
      });
      send(g, 0.6);
      riser = { g, oscs };
    },
    // Corta el tono. Con `silence`, la música baja de golpe y vuelve despacio.
    release(silence = true) {
      const now = ctx.currentTime;
      if (riser) {
        riser.g.gain.cancelScheduledValues(now);
        riser.g.gain.setValueAtTime(riser.g.gain.value, now);
        riser.g.gain.linearRampToValueAtTime(0, now + 0.06);
        riser.oscs.forEach((osc) => osc.stop(now + 0.1));
        riser = null;
      }
      if (silence) {
        bus.gain.cancelScheduledValues(now);
        bus.gain.setValueAtTime(0.2, now);
        bus.gain.setTargetAtTime(VOLUME, now + 1, 0.8);
      }
    },
  };
}

function createImpulse(ctx, seconds) {
  const length = ctx.sampleRate * seconds;
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3;
  }
  return buffer;
}
