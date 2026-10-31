// La puerta vista desde adentro: madera vieja con herrajes, rasguños, manchas,
// telarañas, cadena, pestillo y pomo. Lo estático se pinta una vez; lo que se mueve, cada cuadro.
const TAU = Math.PI * 2;

export const LENS = { cx: 180, cy: 158, R: 106 };
const KNOB = { x: 292, y: 342 };
const BOLT = { x: 292, y: 268 };
const CHAIN = { from: [348, 230], to: [262, 236] };

export function createDoor(W, H, dpr) {
  const base = paintDoor(W, H, dpr);
  const dust = [];
  let knockAt = -10;

  return {
    // Al tocar cae polvo y la cadena se sacude.
    knock(time) {
      knockAt = time;
      for (let i = 0; i < 40; i++) {
        dust.push({
          x: Math.random() * W,
          y: Math.random() * 40,
          vx: (Math.random() - 0.5) * 12,
          vy: 10 + Math.random() * 30,
          life: 1.2 + Math.random() * 1.5,
          r: 0.6 + Math.random() * 1.4,
        });
      }
    },
    update(dt) {
      for (let i = dust.length - 1; i >= 0; i--) {
        const d = dust[i];
        d.vy += 40 * dt;
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        d.life -= dt;
        if (d.life <= 0) dust.splice(i, 1);
      }
    },
    draw(ctx, { time, knobTurn = 0, boltTurn = 0 }) {
      ctx.drawImage(base, 0, 0, W, H);
      drawChain(ctx, time, time - knockAt);
      drawBolt(ctx, boltTurn);
      drawKnob(ctx, knobTurn);

      ctx.fillStyle = 'rgba(220, 205, 180, 0.7)';
      for (const d of dust) {
        ctx.globalAlpha = Math.min(1, d.life);
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    },
  };
}

// ---------- Partes que se mueven ----------

function drawChain(ctx, time, sinceKnock) {
  const [x1, y1] = CHAIN.from;
  const [x2, y2] = CHAIN.to;
  const shake = sinceKnock < 1.6 ? Math.sin(sinceKnock * 14) * 12 * Math.exp(-sinceKnock * 2.4) : 0;
  const cx = (x1 + x2) / 2 + shake;
  const cy = Math.max(y1, y2) + 62 + Math.sin(time * 1.1) * 3;

  brassRect(ctx, x2 - 26, y2 - 7, 34, 14);
  brassRect(ctx, x1 - 6, y1 - 9, 12, 18);

  const LINKS = 16;
  for (let i = 0; i <= LINKS; i++) {
    const t = i / LINKS;
    const px = (1 - t) ** 2 * x1 + 2 * (1 - t) * t * cx + t ** 2 * x2;
    const py = (1 - t) ** 2 * y1 + 2 * (1 - t) * t * cy + t ** 2 * y2;
    const tx = 2 * (1 - t) * (cx - x1) + 2 * t * (x2 - cx);
    const ty = 2 * (1 - t) * (cy - y1) + 2 * t * (y2 - cy);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(Math.atan2(ty, tx));
    ctx.strokeStyle = '#9a968f';
    if (i % 2) {
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.ellipse(0, 0, 6, 3.4, 0, 0, TAU);
      ctx.stroke();
    } else {
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.moveTo(-6, 0);
      ctx.lineTo(6, 0);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawBolt(ctx, turn) {
  const { x, y } = BOLT;
  brassRect(ctx, x - 16, y - 24, 32, 48);
  ellipseFill(ctx, x, y, 11, 11, '#4a3312');
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((turn * Math.PI) / 2);
  ctx.fillStyle = '#d6b066';
  ctx.beginPath();
  ctx.roundRect(-4, -14, 8, 28, 3);
  ctx.fill();
  ctx.restore();
}

function drawKnob(ctx, turn) {
  const { x, y } = KNOB;
  brassRect(ctx, x - 15, y - 36, 30, 88);
  const g = ctx.createRadialGradient(x - 6, y - 7, 2, x, y, 18);
  g.addColorStop(0, '#f6dc9c');
  g.addColorStop(0.5, '#a57a35');
  g.addColorStop(1, '#3e2b0f');
  ellipseFill(ctx, x, y, 18, 18, g);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(turn);
  ctx.strokeStyle = 'rgba(40, 25, 5, 0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-12, 0);
  ctx.lineTo(12, 0);
  ctx.stroke();
  ctx.restore();
  ellipseFill(ctx, x, y + 32, 3.5, 3.5, '#0b0603');
  ctx.fillStyle = '#0b0603';
  ctx.fillRect(x - 1.5, y + 32, 3, 9);
}

// ---------- Puerta estática ----------

function paintDoor(W, H, dpr) {
  const canvas = document.createElement('canvas');
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const wood = ctx.createLinearGradient(0, 0, W, 0);
  wood.addColorStop(0, '#2b170b');
  wood.addColorStop(0.5, '#5a361d');
  wood.addColorStop(1, '#2b170b');
  ctx.fillStyle = wood;
  ctx.fillRect(0, 0, W, H);

  // Tablas, cada una con su tono
  const PLANKS = 5;
  const pw = W / PLANKS;
  for (let i = 0; i < PLANKS; i++) {
    ctx.fillStyle = `rgba(0, 0, 0, ${Math.random() * 0.2})`;
    ctx.fillRect(i * pw, 0, pw, H);
  }

  // Vetas
  for (let i = 0; i < 120; i++) {
    const x = Math.random() * W;
    const light = Math.random() < 0.25;
    ctx.strokeStyle = light
      ? `rgba(255, 215, 170, ${0.03 + Math.random() * 0.05})`
      : `rgba(0, 0, 0, ${0.08 + Math.random() * 0.2})`;
    ctx.lineWidth = 0.6 + Math.random();
    ctx.beginPath();
    ctx.moveTo(x, 0);
    for (let y = 0; y <= H; y += 16) ctx.lineTo(x + Math.sin(y * 0.025 + i) * 3, y);
    ctx.stroke();
  }

  // Nudos
  for (let i = 0; i < 4; i++) {
    const x = Math.random() * W;
    const y = Math.random() * H;
    for (let r = 9; r > 0; r -= 3) {
      ctx.strokeStyle = 'rgba(20, 8, 2, 0.45)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(x, y, r * 0.6, r * 1.6, 0, 0, TAU);
      ctx.stroke();
    }
  }

  // Juntas entre tablas
  for (let i = 1; i < PLANKS; i++) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(i * pw - 1.5, 0, 3, H);
    ctx.fillStyle = 'rgba(255, 210, 160, 0.06)';
    ctx.fillRect(i * pw + 1.5, 0, 1, H);
  }

  // Herrajes de hierro con remaches
  for (const y of [22, 296]) {
    const iron = ctx.createLinearGradient(0, y, 0, y + 16);
    iron.addColorStop(0, '#3a3431');
    iron.addColorStop(1, '#100d0c');
    ctx.fillStyle = iron;
    ctx.fillRect(0, y, W, 16);
    for (let x = 18; x < W; x += 44) {
      ellipseFill(ctx, x, y + 8, 3.2, 3.2, '#5c5450');
      ellipseFill(ctx, x - 1, y + 7, 1.2, 1.2, '#8d847e');
    }
  }

  // Rasguños de garras
  scratches(ctx, 22, 70, -0.12, 120);
  scratches(ctx, 300, 330, 0.25, 70);

  // Manchas que escurren
  drip(ctx, 40, 40, 80);
  drip(ctx, 326, 314, 55);

  // Advertencia tallada
  ctx.save();
  ctx.translate(26, 356);
  ctx.rotate(-0.06);
  ctx.font = 'bold 25px Georgia, serif';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(12, 5, 2, 0.85)';
  ctx.strokeText('NO ABRAS', 0, 0);
  ctx.fillStyle = 'rgba(210, 160, 112, 0.5)';
  ctx.fillText('NO ABRAS', 1, 1);
  ctx.restore();

  web(ctx, 0, 0, 1);
  web(ctx, W, 0, -1);

  // Placa de latón de la mirilla
  const { cx, cy, R } = LENS;
  const plate = ctx.createRadialGradient(cx - 30, cy - 30, R * 0.6, cx, cy, R + 22);
  plate.addColorStop(0, '#e3c07a');
  plate.addColorStop(0.6, '#9b7431');
  plate.addColorStop(1, '#3e2a0f');
  ellipseFill(ctx, cx, cy, R + 20, R + 20, plate);
  ellipseFill(ctx, cx, cy, R + 4, R + 4, '#0c0704');
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    const sx = cx + Math.cos(a) * (R + 12);
    const sy = cy + Math.sin(a) * (R + 12);
    ellipseFill(ctx, sx, sy, 3, 3, '#5a4219');
    ctx.strokeStyle = '#2a1d08';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx - 2, sy - 1);
    ctx.lineTo(sx + 2, sy + 1);
    ctx.stroke();
  }

  // Oscuridad arriba y abajo
  const shade = ctx.createLinearGradient(0, 0, 0, H);
  shade.addColorStop(0, 'rgba(0, 0, 0, 0.5)');
  shade.addColorStop(0.3, 'rgba(0, 0, 0, 0)');
  shade.addColorStop(0.75, 'rgba(0, 0, 0, 0)');
  shade.addColorStop(1, 'rgba(0, 0, 0, 0.55)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, W, H);

  return canvas;
}

function scratches(ctx, x, y, angle, len) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  for (let i = 0; i < 4; i++) {
    const ox = i * 9;
    ctx.beginPath();
    ctx.moveTo(ox, 0);
    for (let s = 1; s <= 10; s++) ctx.lineTo(ox + (Math.random() - 0.5) * 2.5, (s * len) / 10 - i * 4);
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(15, 7, 3, 0.85)';
    ctx.lineWidth = 3.4;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(220, 175, 125, 0.55)';
    ctx.lineWidth = 1.3;
    ctx.stroke();
  }
  ctx.restore();
}

function drip(ctx, x, y, len) {
  ctx.fillStyle = 'rgba(70, 6, 8, 0.6)';
  ctx.beginPath();
  ctx.ellipse(x, y, 12, 4, 0, 0, TAU);
  ctx.fill();
  for (let i = 0; i < 3; i++) {
    const dx = x + (Math.random() - 0.5) * 16;
    const l = len * (0.4 + Math.random() * 0.6);
    const w = 2 + Math.random() * 2.5;
    ctx.beginPath();
    ctx.roundRect(dx - w / 2, y, w, l, w / 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(dx, y + l, w * 0.8, w, 0, 0, TAU);
    ctx.fill();
  }
}

function web(ctx, x, y, dir) {
  const SPOKES = 6;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  ctx.strokeStyle = 'rgba(230, 230, 240, 0.25)';
  ctx.lineWidth = 0.8;
  const points = (r) => Array.from({ length: SPOKES }, (_, i) => {
    const a = (i / (SPOKES - 1)) * (Math.PI / 2);
    return [Math.cos(a) * r, Math.sin(a) * r];
  });
  for (const [px, py] of points(80)) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(px, py);
    ctx.stroke();
  }
  for (const r of [16, 30, 46, 62]) {
    const pts = points(r);
    ctx.beginPath();
    ctx.moveTo(...pts[0]);
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1];
      const [bx, by] = pts[i];
      ctx.quadraticCurveTo(((ax + bx) / 2) * 0.82, ((ay + by) / 2) * 0.82, bx, by);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function brassRect(ctx, x, y, w, h) {
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, '#c49a52');
  g.addColorStop(1, '#4e3712');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 6);
  ctx.fill();
}

function ellipseFill(ctx, x, y, rx, ry, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  ctx.fill();
}
