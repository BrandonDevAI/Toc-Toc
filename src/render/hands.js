// Tus manos en primera persona: la izquierda sostiene el tazón de dulces
// y la derecha duda entre el pomo y el pestillo.
const TAU = Math.PI * 2;
const SKIN = '#c98d6b';
const SKIN_EDGE = '#7d4c35';
const NAIL = '#e9bca5';
const SLEEVE = '#231c29';
const CUFF = '#30263a';
const CANDY_COLORS = ['#e63946', '#f4a261', '#2a9d8f', '#e9c46a', '#9b5de5', '#f15bb5'];
const MAX_CANDY = 20;

// Poses de la mano derecha (muñeca, rotación y qué tan cerrados están los dedos).
const POSES = {
  rest: { x: 330, y: 428, rot: -0.36, curl: 0.35 },
  knob: { x: 318, y: 410, rot: -0.38, curl: 0.75 },
  bolt: { x: 324, y: 350, rot: -0.3, curl: 0.55 },
  away: { x: 350, y: 580, rot: -0.15, curl: 0.3 },
};

export function createHands() {
  const candySlots = Array.from({ length: MAX_CANDY }, () => {
    const a = Math.random() * TAU;
    const d = Math.sqrt(Math.random());
    return {
      x: Math.cos(a) * d * 56,
      y: Math.sin(a) * d * 11,
      rot: Math.random() * Math.PI,
      color: CANDY_COLORS[Math.floor(Math.random() * CANDY_COLORS.length)],
    };
  }).sort((a, b) => a.y - b.y);

  const right = { ...POSES.rest };
  const bowl = { y: 0, scale: 1, rot: 0 };

  return {
    update(dt, { intent, reaction, sinceReaction }) {
      let pose = POSES.rest;
      if (reaction === 'happyKid' || reaction === 'attacked') pose = sinceReaction < 0.35 ? POSES.knob : POSES.away;
      else if (reaction) pose = POSES.bolt;
      else if (intent === 'open') pose = POSES.knob;
      else if (intent === 'reject') pose = POSES.bolt;

      let target = { y: 0, scale: 1, rot: 0 };
      if (reaction === 'happyKid' && sinceReaction > 0.5) target = { y: -55, scale: 1.12, rot: 0 };
      if (reaction === 'attacked' && sinceReaction > 0.35) target = { y: 170, scale: 1, rot: 0.6 };

      const k = 1 - Math.exp(-dt * 12);
      for (const key of Object.keys(right)) right[key] += (pose[key] - right[key]) * k;
      for (const key of Object.keys(bowl)) bowl[key] += (target[key] - bowl[key]) * k * 0.6;
    },
    draw(ctx, { time, candy, tension }) {
      // Respiración: más rápida y temblorosa cuando se acaba el tiempo.
      const breathe = Math.sin(time * (1.6 + tension * 2.5)) * 2;
      const tremble = tension > 0.5 ? Math.sin(time * 40) * tension * 1.2 : 0;

      drawBowl(ctx, 92, 402 + bowl.y + breathe, bowl.scale, bowl.rot, candy, candySlots);
      drawHand(ctx, { x: 22 + tremble, y: 450 + bowl.y + breathe, rot: 0.55, scale: 1, curl: 0.6, mirror: true });
      drawHand(ctx, { ...right, x: right.x + tremble, y: right.y + breathe * 0.6, scale: 1.05 });
    },
  };
}

function drawHand(ctx, { x, y, rot, scale, curl, mirror = false }) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(mirror ? -scale : scale, scale);

  ctx.fillStyle = SLEEVE;
  ctx.beginPath();
  ctx.roundRect(-30, -2, 60, 170, 14);
  ctx.fill();

  const lengths = [34, 39, 37, 29];
  const xs = [-16.5, -5.5, 5.5, 16.5];
  const fingers = xs.map((fx, i) => {
    const len = lengths[i] * (1 - curl * 0.5);
    return [fx, -50, fx + (i - 1.5) * 1.8, -50 - len];
  });
  const thumb = [-18, -24, -42, -52];

  // Primero los contornos y luego el relleno, así los dedos se funden con la palma.
  for (const pass of [SKIN_EDGE, SKIN]) {
    const grow = pass === SKIN_EDGE ? 1.5 : 0;
    capsule(ctx, ...thumb, 10.5 + grow, pass);
    ctx.fillStyle = pass;
    ctx.beginPath();
    ctx.roundRect(-23 - grow, -60 - grow, 46 + grow * 2, 60 + grow * 2, 16);
    ctx.fill();
    for (const f of fingers) capsule(ctx, ...f, 5.4 + grow, pass);
  }

  // Nudillos y uñas
  ctx.strokeStyle = 'rgba(125, 76, 53, 0.55)';
  ctx.lineWidth = 1.2;
  for (const [x1, y1, x2, y2] of fingers) {
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    ctx.beginPath();
    ctx.moveTo(mx - 3.5, my);
    ctx.lineTo(mx + 3.5, my);
    ctx.stroke();
    ctx.fillStyle = NAIL;
    ctx.beginPath();
    ctx.ellipse(x2, y2 + 1, 3.6, 4.2, 0, 0, TAU);
    ctx.fill();
  }

  ctx.fillStyle = CUFF;
  ctx.beginPath();
  ctx.roundRect(-31, -6, 62, 16, 6);
  ctx.fill();
  ctx.restore();
}

function drawBowl(ctx, x, y, scale, rot, candy, slots) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(scale, scale);

  ctx.fillStyle = '#c85a14';
  ctx.beginPath();
  ctx.ellipse(0, 46, 84, 74, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#2a0e03';
  for (const ex of [-30, 30]) {
    ctx.beginPath();
    ctx.moveTo(ex - 13, 46);
    ctx.lineTo(ex, 28);
    ctx.lineTo(ex + 13, 46);
    ctx.fill();
  }

  ctx.fillStyle = '#f07b1d';
  ctx.beginPath();
  ctx.ellipse(0, 0, 80, 22, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#4a1d06';
  ctx.beginPath();
  ctx.ellipse(0, 2, 71, 17, 0, 0, TAU);
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 2, 71, 17, 0, 0, TAU);
  ctx.clip();
  for (const c of slots.slice(0, Math.max(0, candy))) drawCandy(ctx, c);
  ctx.restore();
  ctx.restore();
}

function drawCandy(ctx, { x, y, rot, color }) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-7, 0);
  ctx.lineTo(-12, -4);
  ctx.lineTo(-12, 4);
  ctx.moveTo(7, 0);
  ctx.lineTo(12, -4);
  ctx.lineTo(12, 4);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, 0, 8, 5, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.beginPath();
  ctx.ellipse(-2, -2, 3, 1.5, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function capsule(ctx, x1, y1, x2, y2, r, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = r * 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}
