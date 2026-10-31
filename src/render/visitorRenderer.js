import { createPeephole } from './peephole.js';
import { createFog } from './fog.js';

// Dibuja el porche y al visitante por capas. Todo es procedural: no hay imágenes.
// La escena se pinta en un canvas aparte y la mirilla la compone en el canvas visible.
// El visitante se dibuja en un espacio local con los pies en y=0 y ~230 unidades de alto.
const W = 360;
const H = 440;
const HORIZON = 262;
const FEET_Y = 352;
const TAU = Math.PI * 2;
const APPEAR_TIME = 0.35;

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

  const peephole = createPeephole(W, H, dpr);
  const fog = createFog(W, H, HORIZON);
  let flicker = 0;

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

    const style = {
      time,
      blink: (time + visitor.id * 0.37) % 2.6 < 0.12,
      // Al resolver, todo monstruo muestra su verdadera cara.
      glow: visitor.anomalies.includes('ojos_rojos') || (reaction && visitor.isMonster),
    };

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(W / 2 + dx, FEET_Y);
    ctx.scale(scale, scale);
    if (!visitor.anomalies.includes('sin_sombra')) {
      ellipse(ctx, 0, 2, 62, 11, 'rgba(0, 0, 0, 0.5)');
    }
    ctx.translate(0, dy / scale);
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
    update(dt) {
      time += dt;
      fog.update(dt);
    },
    render() {
      ctx.clearRect(0, 0, W, H);
      drawBackdrop(ctx, stars, time, flicker);
      fog.draw(ctx);
      if (visitor) drawCurrentVisitor();
      fog.draw(ctx, { front: true });

      peephole.draw(view, scene);
      if (reaction === 'attacked') {
        const t = time - reactedAt;
        view.fillStyle = `rgba(160, 0, 20, ${Math.max(0, 0.45 - t * 0.3)})`;
        view.fillRect(0, 0, W, H);
      }
    },
  };
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

function drawVisitor(ctx, v, s) {
  if (v.anomalies.includes('cola')) drawTail(ctx, s.time);

  switch (v.costume) {
    case 'fantasma': drawGhost(ctx, v, s); break;
    case 'bruja': drawWitch(ctx, v, s); break;
    case 'calabaza': drawPumpkin(ctx, v, s); break;
    case 'vampiro': drawVampire(ctx, v, s); break;
  }

  if (v.props.includes('bolsa_calabaza')) {
    if (v.costume === 'fantasma') drawBag(ctx, 66, -52);
    else drawBag(ctx, 44, -68);
  }
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
