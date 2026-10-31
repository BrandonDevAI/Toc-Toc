import { createPeephole } from './peephole.js';
import { createFog } from './fog.js';
import { createDoor, LENS } from './door.js';
import { createHands } from './hands.js';

// Vista en primera persona: estás detrás de la puerta, con el tazón de dulces en una mano.
// El porche y el visitante se pintan en un canvas aparte (`scene`); la mirilla lo muestra
// en el lente, y al abrir la puerta se ve completo.
// El visitante se dibuja en un espacio local con los pies en y=0 y ~230 unidades de alto.
const W = 360;
const H = 440;
const HORIZON = 262;
const FEET_Y = 352;
const TAU = Math.PI * 2;
const APPEAR_TIME = 0.35;
// Parte del porche que cabe en la mirilla: centrada en el cuerpo para que se vean
// la cara y los pies con su sombra (varias pistas están en el piso).
const LENS_SOURCE = { x: 180, y: 248, radius: 140 };
const VIEW_OVERSCAN = 1.03; // margen para que el balanceo no deje bordes vacíos

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const easeInOut = (t) => t * t * (3 - 2 * t);

export function createVisitorRenderer(canvas) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const view = canvas.getContext('2d');
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  view.scale(dpr, dpr);

  const scene = document.createElement('canvas');
  scene.width = W * dpr;
  scene.height = H * dpr;
  const ctx = scene.getContext('2d');
  ctx.scale(dpr, dpr);

  const peephole = createPeephole(LENS, LENS_SOURCE, dpr);
  const fog = createFog(W, H, HORIZON);
  const door = createDoor(W, H, dpr);
  const hands = createHands();
  let flicker = 0;
  let tension = 0;
  let intent = null;
  let candy = 0;

  const stars = Array.from({ length: 45 }, () => ({
    x: Math.random() * W,
    y: Math.random() * (HORIZON - 70),
    r: 0.4 + Math.random() * 1.2,
    phase: Math.random() * TAU,
  }));

  let time = 0;
  let visitor = null;
  let shownAt = 0;
  let reaction = null;
  let reactedAt = 0;

  function drawCurrentVisitor() {
    const since = time - shownAt;
    let alpha = Math.min(1, since / APPEAR_TIME);
    let scale = visitor.height * (0.92 + 0.08 * alpha);
    let dx = 0;
    let dy = Math.sin(time * 2.2 + visitor.id) * 1.5;

    if (reaction) {
      const t = time - reactedAt;
      if (reaction === 'attacked') {
        const k = Math.min(t / 0.25, 1);
        scale *= 1 + 0.8 * k;
        dy += 70 * k;
      } else if (reaction === 'happyKid') {
        dy -= Math.abs(Math.sin(t * 9)) * 14 * Math.max(0, 1 - t / 1.2);
      } else if (reaction === 'sadKid') {
        dx = -t * 70;
        alpha *= Math.max(0, 1 - t / 1.2);
      } else if (reaction === 'avoided') {
        alpha *= Math.max(0, 1 - t / 1);
      }
    }

    const has = (id) => visitor.anomalies.includes(id);
    const style = {
      time,
      // Los niños parpadean seguido; el que nunca lo hace es sospechoso.
      blink: !has('no_parpadea') && (time + visitor.id * 0.37) % 1.8 < 0.15,
      // Al resolver, todo monstruo muestra su verdadera cara.
      glow: has('ojos_rojos') || (reaction && visitor.isMonster),
      blackEyes: has('ojos_negros'),
    };
    const lift = has('flota') ? 14 + Math.sin(time * 1.3) * 3 : 0;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(W / 2 + dx, FEET_Y);
    ctx.scale(scale, scale);
    if (has('sombra_rara') || has('invisible')) drawHornedShadow(ctx);
    else if (!has('sin_sombra')) ellipse(ctx, 0, 2, 62, 11, 'rgba(0, 0, 0, 0.5)');
    ctx.translate(0, dy / scale - lift);
    drawVisitor(ctx, visitor, style);
    ctx.restore();
  }

  return {
    setVisitor(v) {
      visitor = v;
      shownAt = time;
      reaction = null;
    },
    react(kind) {
      reaction = kind;
      reactedAt = time;
    },
    // Ambiente de la hora: densidad de niebla y cuánto titila la luz del porche (0 a 1).
    setAtmosphere(level) {
      fog.setDensity(level.fog);
      flicker = level.flicker;
    },
    // 0 = calma, 1 = se acabó el tiempo. Acelera respiración, temblor y visión de túnel.
    setTension(value) {
      tension = value;
    },
    // Hacia dónde va tu mano mientras dudas: 'open', 'reject' o null.
    setIntent(value) {
      intent = value;
    },
    setCandy(count) {
      candy = count;
    },
    knock() {
      door.knock(time);
    },
    update(dt) {
      time += dt;
      fog.update(dt);
      door.update(dt);
      hands.update(dt, { intent, reaction, sinceReaction: time - reactedAt });
    },
    render() {
      ctx.clearRect(0, 0, W, H);
      drawBackdrop(ctx, stars, time, flicker);
      fog.draw(ctx);
      if (visitor) drawCurrentVisitor();
      fog.draw(ctx, { front: true });

      const t = reaction ? time - reactedAt : 0;
      const opens = reaction === 'happyKid' || reaction === 'attacked';
      const locks = reaction === 'avoided' || reaction === 'sadKid';
      const knobTurn = opens ? -0.8 * clamp01(t / 0.25) : intent === 'open' ? -0.15 : 0;
      const doorOpen = opens ? easeInOut(clamp01((t - 0.25) / 0.5)) : 0;
      const boltTurn = locks ? clamp01(t / 0.2) : 0;

      // Balanceo de la cabeza, más fuerte con los nervios, y un golpe en cada latido.
      const sway = 1.5 + tension * 3;
      const freq = 0.6 + tension * 1.4;
      const beat = tension > 0.6 ? Math.max(0, Math.sin(time * 7.5)) ** 8 * 0.015 : 0;
      view.save();
      view.clearRect(0, 0, W, H);
      view.translate(W / 2, H / 2);
      view.scale(VIEW_OVERSCAN + beat, VIEW_OVERSCAN + beat);
      view.translate(-W / 2 + Math.sin(time * freq) * sway, -H / 2 + Math.cos(time * freq * 0.8) * sway * 0.7);

      if (doorOpen > 0) {
        view.drawImage(scene, 0, 0, W, H);
        drawVignette(view);
      }

      // La puerta gira sobre la bisagra izquierda al abrirse.
      view.save();
      view.scale(1 - 0.88 * doorOpen, 1);
      door.draw(view, { time, knobTurn, boltTurn });
      peephole.draw(view, scene);
      if (doorOpen > 0) {
        view.fillStyle = `rgba(0, 0, 0, ${doorOpen * 0.6})`;
        view.fillRect(0, 0, W, H);
      }
      view.restore();

      hands.draw(view, { time, candy, tension });
      drawRoomLight(view, time, tension);
      view.restore();

      if (reaction === 'attacked') {
        view.fillStyle = `rgba(160, 0, 20, ${Math.max(0, 0.5 - (t - 0.3) * 0.3)})`;
        view.fillRect(0, 0, W, H);
      }
    },
  };
}

// Vela detrás de ti: luz cálida que titila desde abajo y oscuridad alrededor.
// Con tensión alta, los bordes se ponen rojos (visión de túnel).
function drawRoomLight(ctx, time, tension) {
  const flick = 0.85 + 0.1 * Math.sin(time * 9.1) + 0.05 * Math.sin(time * 23.7);
  const light = ctx.createRadialGradient(110, 470, 30, 150, 360, 520);
  light.addColorStop(0, `rgba(255, 140, 50, ${0.14 * flick})`);
  light.addColorStop(0.35, 'rgba(0, 0, 0, 0)');
  light.addColorStop(1, `rgba(0, 0, 0, ${0.5 + (1 - flick) * 0.6})`);
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, W, H);

  if (tension > 0.4) {
    const k = (tension - 0.4) / 0.6;
    const tunnel = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.7);
    tunnel.addColorStop(0, 'rgba(90, 0, 0, 0)');
    tunnel.addColorStop(1, `rgba(90, 0, 0, ${0.45 * k})`);
    ctx.fillStyle = tunnel;
    ctx.fillRect(0, 0, W, H);
  }
}

function drawVignette(ctx) {
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75);
  v.addColorStop(0, 'rgba(0, 0, 0, 0)');
  v.addColorStop(1, 'rgba(0, 0, 0, 0.8)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
}

// ---------- Escenario ----------

function drawBackdrop(ctx, stars, time, flicker) {
  const sky = ctx.createLinearGradient(0, 0, 0, HORIZON);
  sky.addColorStop(0, '#07040f');
  sky.addColorStop(1, '#2b1446');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, HORIZON);

  ctx.fillStyle = '#fff';
  for (const s of stars) {
    ctx.globalAlpha = 0.35 + 0.65 * Math.abs(Math.sin(time * 1.5 + s.phase));
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Luna creciente
  const halo = ctx.createRadialGradient(250, 100, 10, 250, 100, 70);
  halo.addColorStop(0, 'rgba(246, 231, 176, 0.35)');
  halo.addColorStop(1, 'rgba(246, 231, 176, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(175, 25, 150, 150);
  ctx.save();
  ctx.beginPath();
  ctx.arc(250, 100, 24, 0, TAU);
  ctx.clip();
  ctx.beginPath();
  ctx.rect(222, 72, 56, 56);
  ctx.arc(261, 93, 21, 0, TAU);
  ctx.fillStyle = '#f6e7b0';
  ctx.fill('evenodd');
  ctx.restore();

  // Colinas y casa vecina
  ctx.fillStyle = '#120a1f';
  ctx.beginPath();
  ctx.moveTo(0, HORIZON);
  ctx.quadraticCurveTo(80, HORIZON - 50, 170, HORIZON - 20);
  ctx.quadraticCurveTo(260, HORIZON - 55, W, HORIZON - 25);
  ctx.lineTo(W, HORIZON);
  ctx.fill();
  ctx.fillRect(40, HORIZON - 75, 56, 60);
  ctx.beginPath();
  ctx.moveTo(32, HORIZON - 75);
  ctx.lineTo(68, HORIZON - 105);
  ctx.lineTo(104, HORIZON - 75);
  ctx.fill();
  ctx.fillStyle = '#ffb347';
  ctx.fillRect(52, HORIZON - 62, 12, 12);
  ctx.fillRect(72, HORIZON - 62, 12, 12);

  // Piso del porche con tablas en perspectiva
  const floor = ctx.createLinearGradient(0, HORIZON, 0, H);
  floor.addColorStop(0, '#4a2c1c');
  floor.addColorStop(1, '#1e120b');
  ctx.fillStyle = floor;
  ctx.fillRect(0, HORIZON, W, H - HORIZON);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.lineWidth = 1.5;
  for (let i = -6; i <= 6; i++) {
    ctx.beginPath();
    ctx.moveTo(W / 2 + i * 22, HORIZON);
    ctx.lineTo(W / 2 + i * 75, H);
    ctx.stroke();
  }

  // Círculo de luz en el piso donde se para el visitante: ahí se lee su sombra.
  ctx.save();
  ctx.translate(W / 2, FEET_Y);
  ctx.scale(1, 0.22);
  const pool = ctx.createRadialGradient(0, 0, 0, 0, 0, 130);
  pool.addColorStop(0, 'rgba(255, 200, 130, 0.45)');
  pool.addColorStop(1, 'rgba(255, 200, 130, 0)');
  ctx.fillStyle = pool;
  ctx.fillRect(-130, -130, 260, 260);
  ctx.restore();

  // Luz del porche: a veces baja de golpe, más seguido mientras avanza la noche.
  const dip = Math.sin(time * 23) * Math.sin(time * 7.3) > 1 - flicker * 0.4 ? 0.65 : 0;
  const glow = ctx.createRadialGradient(W / 2, 0, 0, W / 2, 0, 400);
  glow.addColorStop(0, `rgba(255, 190, 110, ${0.32 * (1 - dip)})`);
  glow.addColorStop(1, 'rgba(255, 190, 110, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Columnas del marco de la puerta
  ctx.fillStyle = '#140b08';
  ctx.fillRect(0, 0, 16, H);
  ctx.fillRect(W - 16, 0, 16, H);
}

// ---------- Visitante ----------

const COSTUME_DRAWERS = {
  fantasma: drawGhost,
  bruja: drawWitch,
  calabaza: drawPumpkin,
  vampiro: drawVampire,
  esqueleto: drawSkeleton,
  momia: drawMummy,
  gato: drawCat,
  espantapajaros: drawScarecrow,
  invisible: drawInvisible,
};

function drawVisitor(ctx, v, s) {
  const marks = new Set([...v.anomalies, ...v.decoys]);
  if (marks.has('cola')) drawTail(ctx, s.time);
  if (marks.has('cola_falsa')) drawFakeTail(ctx);

  COSTUME_DRAWERS[v.costume](ctx, v, s);
  drawFaceMarks(ctx, marks, v.costume === 'fantasma' ? -160 : -166);

  if (v.props.includes('bolsa_calabaza')) {
    if (v.costume === 'fantasma') drawBag(ctx, 66, -52);
    else if (v.costume === 'invisible') drawBag(ctx, 30, -96 + Math.sin(s.time * 2) * 6);
    else drawBag(ctx, 44, -68);
  }
}

// Medianoche: no se ve a nadie. Al revelarse aparece la criatura de sombra.
function drawInvisible(ctx, v, s) {
  if (!s.glow) return;
  ctx.fillStyle = '#050307';
  ctx.beginPath();
  ctx.moveTo(-52, 0);
  ctx.quadraticCurveTo(-64, -150, -36, -232);
  ctx.quadraticCurveTo(0, -268, 36, -232);
  ctx.quadraticCurveTo(64, -150, 52, 0);
  ctx.closePath();
  ctx.fill();
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * 22, -244);
    ctx.quadraticCurveTo(side * 62, -282, side * 58, -322);
    ctx.quadraticCurveTo(side * 44, -284, side * 8, -256);
    ctx.fill();
    // Brazos largos con garras
    ctx.strokeStyle = '#050307';
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(side * 40, -180);
    ctx.quadraticCurveTo(side * 84, -110, side * 74, -30);
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (const dx of [-8, 0, 8]) {
      ctx.moveTo(side * 74, -30);
      ctx.lineTo(side * (74 + dx), -12);
    }
    ctx.stroke();
  }
  glowDot(ctx, -15, -214, 6);
  glowDot(ctx, 15, -214, 6);
  drawFaceMarks(ctx, new Set(['sonrisa_ancha']), -190);
}

// Pistas y señuelos que van en la cara. `mouthY` es la altura de la boca.
function drawFaceMarks(ctx, marks, mouthY) {
  if (marks.has('sonrisa_ancha')) {
    const m = mouthY;
    ctx.fillStyle = '#2a0508';
    ctx.beginPath();
    ctx.moveTo(-25, m - 6);
    ctx.quadraticCurveTo(0, m + 16, 25, m - 6);
    ctx.quadraticCurveTo(0, m + 4, -25, m - 6);
    ctx.fill();
    ctx.fillStyle = '#f2ead8';
    for (let x = -18; x <= 18; x += 6) {
      const t = (x + 25) / 50;
      const y = m - 6 + 20 * t * (1 - t);
      polygon(ctx, [[x - 2.2, y - 0.5], [x + 2.2, y - 0.5], [x, y + 4]]);
    }
  }
  if (marks.has('colmillos')) {
    for (const x of [-6, 6]) {
      ctx.fillStyle = '#f7f3ea';
      polygon(ctx, [[x - 3.4, mouthY - 1], [x + 3.4, mouthY - 1], [x - Math.sign(x), mouthY + 17]]);
      ellipse(ctx, x - Math.sign(x), mouthY + 18.5, 1.8, 2.6, '#9b0c18');
    }
  }
  if (marks.has('colmillos_plastico')) {
    ctx.fillStyle = '#f28fb0';
    roundRect(ctx, -11, mouthY - 4, 22, 5, 2);
    ctx.fillStyle = '#fff';
    roundRect(ctx, -8, mouthY, 4, 6, 1.5);
    roundRect(ctx, 4, mouthY, 4, 6, 1.5);
  }
  if (marks.has('lentes_rojos')) {
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 2.5;
    for (const x of [-11, 11]) {
      ctx.fillStyle = 'rgba(230, 20, 30, 0.45)';
      ctx.beginPath();
      ctx.roundRect(x - 9, -192, 18, 15, 4);
      ctx.fill();
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(-2, -186);
    ctx.lineTo(2, -186);
    ctx.moveTo(-20, -188);
    ctx.lineTo(-31, -190);
    ctx.moveTo(20, -188);
    ctx.lineTo(31, -190);
    ctx.stroke();
  }
}

// Sombra deforme: más grande y con cuernos que asoman a los lados.
function drawHornedShadow(ctx) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.beginPath();
  ctx.ellipse(0, 0, 74, 13, 0, 0, TAU);
  ctx.fill();
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * 40, -6);
    ctx.quadraticCurveTo(side * 70, -14, side * 84, -42);
    ctx.quadraticCurveTo(side * 64, -18, side * 52, -2);
    ctx.fill();
  }
}

// Cola de disfraz: de peluche, rayada, con moño y quieta.
function drawFakeTail(ctx) {
  ctx.lineCap = 'round';
  ctx.lineWidth = 11;
  ctx.beginPath();
  ctx.moveTo(18, -72);
  ctx.quadraticCurveTo(62, -70, 70, -30);
  ctx.strokeStyle = '#7d7d88';
  ctx.stroke();
  ctx.setLineDash([5, 7]);
  ctx.strokeStyle = '#4a4a55';
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#e63946';
  polygon(ctx, [[18, -72], [8, -81], [8, -63]]);
  polygon(ctx, [[18, -72], [28, -81], [28, -63]]);
}

function drawGhost(ctx, v, s) {
  drawLegs(ctx, v.palette.pants);

  ctx.fillStyle = v.palette.cloth;
  ctx.beginPath();
  ctx.moveTo(-60, -52);
  ctx.bezierCurveTo(-52, -120, -46, -170, -40, -190);
  ctx.arc(0, -190, 40, Math.PI, 0);
  ctx.bezierCurveTo(46, -170, 52, -120, 60, -52);
  for (let i = 0; i < 6; i++) {
    const x = 60 - i * 20;
    ctx.quadraticCurveTo(x - 10, i % 2 ? -40 : -64, x - 20, -52);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Pliegues
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-18, -140);
  ctx.quadraticCurveTo(-26, -100, -30, -60);
  ctx.moveTo(20, -135);
  ctx.quadraticCurveTo(28, -95, 34, -58);
  ctx.stroke();

  // Agujeros de los ojos y la boca
  for (const x of [-14, 14]) {
    ellipse(ctx, x, -186, 8, 11, '#1a1320');
    if (s.glow) glowDot(ctx, x, -185, 4);
    else if (!s.blink) ellipse(ctx, x, -185, 2.6, 2.6, '#fff');
  }
  ellipse(ctx, 0, -160, 5, 7, '#1a1320');
}

function drawWitch(ctx, v, s) {
  const { cloth, skin, pants } = v.palette;
  drawLegs(ctx, pants);
  drawArms(ctx, cloth, skin);

  ctx.fillStyle = cloth;
  ctx.beginPath();
  ctx.moveTo(-26, -150);
  ctx.lineTo(-56, -58);
  for (let x = -56; x < 56; x += 14) {
    ctx.lineTo(x + 7, -48);
    ctx.lineTo(x + 14, -58);
  }
  ctx.lineTo(26, -150);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#1b1b1b';
  ctx.fillRect(-31, -118, 62, 8);
  ctx.fillStyle = '#e8c14a';
  ctx.fillRect(-5, -119, 10, 10);

  ellipse(ctx, 0, -172, 38, 36, '#2b1b14'); // pelo
  drawHead(ctx, skin, s);

  // Sombrero
  ellipse(ctx, 0, -206, 52, 9, '#15121c');
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-30, -208);
  ctx.quadraticCurveTo(-12, -250, 16, -282);
  ctx.quadraticCurveTo(12, -245, 30, -208);
  ctx.closePath();
  ctx.fillStyle = '#15121c';
  ctx.fill();
  ctx.clip();
  ctx.fillStyle = cloth;
  ctx.fillRect(-40, -224, 80, 9);
  ctx.restore();
}

function drawPumpkin(ctx, v, s) {
  const { cloth, skin } = v.palette;
  drawLegs(ctx, '#2f6b2f');
  drawArms(ctx, '#2f6b2f', skin);

  ellipse(ctx, 0, -108, 58, 52, cloth);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
  ctx.lineWidth = 2.5;
  for (const rx of [20, 40]) {
    ctx.beginPath();
    ctx.ellipse(0, -108, rx, 51, 0, 0, TAU);
    ctx.stroke();
  }

  // Cara de calabaza en la panza
  ctx.fillStyle = '#3a1606';
  for (const x of [-18, 18]) {
    ctx.beginPath();
    ctx.moveTo(x - 9, -112);
    ctx.lineTo(x, -128);
    ctx.lineTo(x + 9, -112);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(-26, -96);
  for (let i = 0; i <= 8; i++) ctx.lineTo(-26 + i * 6.5, i % 2 ? -88 : -96);
  ctx.quadraticCurveTo(0, -70, -26, -96);
  ctx.fill();

  drawHead(ctx, skin, s);

  // Gorro de tallo
  ellipse(ctx, 0, -210, 24, 8, '#3c8d2f');
  ctx.fillStyle = '#5b3a1a';
  ctx.fillRect(-4, -226, 8, 16);
  ellipse(ctx, 12, -222, 10, 4, '#4caf3a');
}

function drawVampire(ctx, v, s) {
  const { cloth, skin } = v.palette;

  // Capa
  ctx.fillStyle = '#120d16';
  polygon(ctx, [[-34, -152], [-70, -46], [70, -46], [34, -152]]);
  ctx.fillStyle = cloth;
  polygon(ctx, [[-28, -146], [-58, -54], [58, -54], [28, -146]]);

  drawLegs(ctx, '#15131a');
  drawArms(ctx, '#15131a', skin);

  ctx.fillStyle = '#f2efe9';
  roundRect(ctx, -26, -152, 52, 90, 8);
  ctx.fillStyle = '#15131a';
  polygon(ctx, [[-26, -150], [-8, -150], [-14, -62], [-26, -62]]);
  polygon(ctx, [[26, -150], [8, -150], [14, -62], [26, -62]]);
  ctx.fillStyle = cloth;
  polygon(ctx, [[0, -144], [-12, -151], [-12, -137]]);
  polygon(ctx, [[0, -144], [12, -151], [12, -137]]);

  // Cuello alto
  ctx.fillStyle = '#120d16';
  polygon(ctx, [[-18, -156], [-48, -214], [-32, -152]]);
  polygon(ctx, [[18, -156], [48, -214], [32, -152]]);

  drawHead(ctx, skin, s);

  // Pelo engominado con pico
  ctx.fillStyle = '#121016';
  ctx.beginPath();
  ctx.arc(0, -184, 33, Math.PI, 0);
  ctx.lineTo(12, -200);
  ctx.lineTo(0, -190);
  ctx.lineTo(-12, -200);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#fff';
  polygon(ctx, [[-7, -166], [-3, -166], [-5, -160]]);
  polygon(ctx, [[3, -166], [7, -166], [5, -160]]);
}

function drawSkeleton(ctx, v, s) {
  const BLACK = '#151318';
  const BONE = '#ece8dc';
  drawLegs(ctx, BLACK);
  ctx.fillStyle = BONE;
  for (const x of [-20, 12]) {
    roundRect(ctx, x, -64, 8, 24, 4);
    roundRect(ctx, x, -36, 8, 24, 4);
  }
  drawArms(ctx, BLACK, v.palette.skin);
  ctx.strokeStyle = BONE;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-26, -136);
  ctx.lineTo(-37, -100);
  ctx.moveTo(26, -136);
  ctx.lineTo(37, -100);
  ctx.stroke();

  ctx.fillStyle = BLACK;
  roundRect(ctx, -28, -152, 56, 94, 12);
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(0, -146);
  ctx.lineTo(0, -82);
  ctx.stroke();
  for (let i = 0; i < 4; i++) {
    const y = -140 + i * 12;
    const w = 18 - i * 2;
    ctx.beginPath();
    ctx.moveTo(-w, y + 4);
    ctx.quadraticCurveTo(0, y - 6, w, y + 4);
    ctx.stroke();
  }
  ctx.fillStyle = BONE;
  polygon(ctx, [[-16, -76], [16, -76], [8, -62], [-8, -62]]);

  ellipse(ctx, 0, -180, 37, 37, BLACK); // capucha
  drawHead(ctx, '#e9e6df', s);
  // Maquillaje de calavera
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 3.5;
  for (const x of [-11, 11]) {
    ctx.beginPath();
    ctx.ellipse(x, -184, 9.5, 10.5, 0, 0, TAU);
    ctx.stroke();
  }
  ctx.fillStyle = '#1a1a1a';
  polygon(ctx, [[-3, -172], [3, -172], [0, -177]]);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (const x of [-6, -2, 2, 6]) {
    ctx.moveTo(x, -168);
    ctx.lineTo(x, -161);
  }
  ctx.stroke();
}

function drawMummy(ctx, v, s) {
  const wrap = v.palette.cloth;
  drawLegs(ctx, wrap);
  drawArms(ctx, wrap, wrap);
  ctx.fillStyle = wrap;
  roundRect(ctx, -28, -152, 56, 94, 12);
  wrapLines(ctx, -28, -152, 56, 94);

  // Venda suelta
  ctx.strokeStyle = wrap;
  ctx.lineWidth = 6;
  ctx.lineCap = 'butt';
  ctx.beginPath();
  ctx.moveTo(22, -90);
  ctx.quadraticCurveTo(34, -70, 28, -48);
  ctx.stroke();

  drawHead(ctx, v.palette.skin, s);
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, -182, 32.5, 0, TAU);
  ctx.clip();
  ctx.fillStyle = wrap;
  ctx.fillRect(-40, -222, 80, 28);
  ctx.fillRect(-40, -158, 80, 20);
  wrapLines(ctx, -40, -222, 80, 28);
  wrapLines(ctx, -40, -158, 80, 20);
  ctx.translate(0, -176);
  ctx.rotate(-0.25);
  ctx.fillStyle = wrap;
  ctx.fillRect(18, -3, 30, 7);
  ctx.restore();
}

function wrapLines(ctx, x, y, w, h) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.strokeStyle = 'rgba(90, 70, 40, 0.35)';
  ctx.lineWidth = 1.5;
  for (let i = -h; i < w; i += 9) {
    ctx.beginPath();
    ctx.moveTo(x + i, y + h);
    ctx.lineTo(x + i + h * 0.6, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawCat(ctx, v, s) {
  const fur = v.palette.cloth;
  // Cola de tela, caída y quieta
  ctx.strokeStyle = fur;
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-18, -70);
  ctx.bezierCurveTo(-50, -60, -62, -30, -48, -6);
  ctx.stroke();

  drawLegs(ctx, fur);
  drawArms(ctx, fur, v.palette.skin);
  ctx.fillStyle = fur;
  roundRect(ctx, -28, -152, 56, 94, 14);
  ellipse(ctx, 0, -108, 16, 26, 'rgba(255, 255, 255, 0.25)');

  ellipse(ctx, 0, -180, 38, 37, fur); // capucha
  for (const side of [-1, 1]) {
    ctx.fillStyle = fur;
    polygon(ctx, [[side * 32, -200], [side * 34, -234], [side * 10, -212]]);
    ctx.fillStyle = '#e88aa5';
    polygon(ctx, [[side * 28, -205], [side * 30, -226], [side * 16, -213]]);
  }
  drawHead(ctx, v.palette.skin, s);

  ctx.fillStyle = '#e88aa5';
  polygon(ctx, [[-4, -177], [4, -177], [0, -172]]);
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (const side of [-1, 1]) {
    for (const dy of [-3, 3]) {
      ctx.moveTo(side * 9, -174);
      ctx.lineTo(side * 27, -175 + dy * 1.5);
    }
  }
  ctx.stroke();
}

function drawScarecrow(ctx, v, s) {
  const shirt = v.palette.cloth;
  ctx.fillStyle = '#3b5b8c';
  roundRect(ctx, -24, -70, 16, 64, 6);
  roundRect(ctx, 8, -70, 16, 64, 6);
  ctx.fillStyle = '#8c6d3a';
  ctx.fillRect(10, -48, 11, 11);
  ellipse(ctx, -17, -5, 14, 7, '#3a2a1a');
  ellipse(ctx, 17, -5, 14, 7, '#3a2a1a');
  strawTuft(ctx, -16, -12, 1);
  strawTuft(ctx, 16, -12, 1);

  drawArms(ctx, shirt, v.palette.skin);
  strawTuft(ctx, -39, -96, 1);
  strawTuft(ctx, 39, -96, 1);

  ctx.fillStyle = shirt;
  roundRect(ctx, -28, -152, 56, 94, 10);
  ctx.save();
  ctx.beginPath();
  ctx.rect(-28, -152, 56, 94);
  ctx.clip();
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.28)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = -24; x < 28; x += 10) {
    ctx.moveTo(x, -152);
    ctx.lineTo(x, -58);
  }
  for (let y = -146; y < -58; y += 12) {
    ctx.moveTo(-28, y);
    ctx.lineTo(28, y);
  }
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = '#c9a24a';
  ctx.fillRect(-29, -80, 58, 5);
  strawTuft(ctx, 0, -150, -1);

  drawHead(ctx, v.palette.skin, s);
  // Sonrisa cosida pintada
  ctx.strokeStyle = '#3a1a0a';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, -176, 15, 0.18 * Math.PI, 0.82 * Math.PI);
  for (let a = 0.25; a <= 0.76; a += 0.1) {
    const x = Math.cos(a * Math.PI) * 15;
    const y = -176 + Math.sin(a * Math.PI) * 15;
    ctx.moveTo(x - 1, y - 3);
    ctx.lineTo(x + 1, y + 3);
  }
  ctx.stroke();

  // Sombrero de paja
  ellipse(ctx, 0, -205, 54, 10, '#d9b45a');
  ctx.fillStyle = '#c9a24a';
  roundRect(ctx, -25, -234, 50, 30, 8);
  ctx.fillStyle = shirt;
  ctx.fillRect(-25, -212, 50, 6);
}

// Mechón de paja; `dir` = 1 hacia abajo, -1 hacia arriba.
function strawTuft(ctx, x, y, dir) {
  ctx.strokeStyle = '#e2c25a';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i - 2.5) * 0.3;
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.sin(a) * 11, y + Math.cos(a) * 11 * dir);
  }
  ctx.stroke();
}

// ---------- Partes compartidas ----------

function drawLegs(ctx, color) {
  ctx.fillStyle = color;
  roundRect(ctx, -24, -70, 16, 64, 6);
  roundRect(ctx, 8, -70, 16, 64, 6);
  ellipse(ctx, -17, -5, 14, 7, '#1b1b1f');
  ellipse(ctx, 17, -5, 14, 7, '#1b1b1f');
}

function drawArms(ctx, sleeve, skin) {
  ctx.strokeStyle = sleeve;
  ctx.lineWidth = 14;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-24, -142);
  ctx.lineTo(-40, -92);
  ctx.moveTo(24, -142);
  ctx.lineTo(40, -92);
  ctx.stroke();
  ellipse(ctx, -41, -86, 7, 7, skin);
  ellipse(ctx, 41, -86, 7, 7, skin);
}

function drawHead(ctx, skin, s) {
  ellipse(ctx, 0, -182, 32, 32, skin);
  for (const x of [-11, 11]) {
    if (s.glow) {
      ellipse(ctx, x, -184, 6, 7, '#1a0b0b');
      glowDot(ctx, x, -183, 4);
    } else if (s.blackEyes && !s.blink) {
      ellipse(ctx, x, -184, 6.5, 7.5, '#050307');
      ellipse(ctx, x + 1.5, -186, 1.2, 1.2, 'rgba(255, 255, 255, 0.45)');
    } else if (s.blink) {
      ctx.strokeStyle = '#2b1a12';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 5, -184);
      ctx.lineTo(x + 5, -184);
      ctx.stroke();
    } else {
      ellipse(ctx, x, -184, 6, 7, '#fff');
      ellipse(ctx, x, -183, 3.2, 3.6, '#2b1a12');
      ellipse(ctx, x + 1, -185, 1, 1, '#fff');
    }
  }
  ellipse(ctx, -19, -170, 5, 4, 'rgba(255, 110, 110, 0.35)');
  ellipse(ctx, 19, -170, 5, 4, 'rgba(255, 110, 110, 0.35)');
  ctx.strokeStyle = '#5a2a1a';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, -172, 9, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
}

function drawTail(ctx, time) {
  ctx.save();
  ctx.translate(20, -78);
  ctx.rotate(Math.sin(time * 3.2) * 0.18);
  ctx.strokeStyle = '#7a0f22';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(50, 20, 85, 0, 78, -48);
  ctx.stroke();
  ctx.fillStyle = '#7a0f22';
  polygon(ctx, [[78, -68], [91, -44], [65, -44]]);
  ctx.restore();
}

function drawBag(ctx, x, y) {
  ctx.strokeStyle = '#2a1a0e';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y - 6, 13, Math.PI, 0);
  ctx.stroke();
  ellipse(ctx, x, y + 6, 17, 15, '#f28a1f');
  ctx.fillStyle = '#3a1606';
  polygon(ctx, [[x - 9, y + 4], [x - 5, y - 2], [x - 1, y + 4]]);
  polygon(ctx, [[x + 1, y + 4], [x + 5, y - 2], [x + 9, y + 4]]);
  ctx.fillRect(x - 7, y + 10, 14, 3);
}

// ---------- Utilidades de dibujo ----------

function ellipse(ctx, x, y, rx, ry, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  ctx.fill();
}

function glowDot(ctx, x, y, r) {
  ctx.save();
  ctx.shadowColor = '#ff1a1a';
  ctx.shadowBlur = 14;
  ellipse(ctx, x, y, r, r * 1.1, '#ff2a2a');
  ctx.restore();
}

function polygon(ctx, points) {
  ctx.beginPath();
  ctx.moveTo(...points[0]);
  for (const p of points.slice(1)) ctx.lineTo(...p);
  ctx.closePath();
  ctx.fill();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}
