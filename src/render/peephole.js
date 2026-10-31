// Compone la escena como si se viera por la mirilla de una puerta:
// lente circular con efecto ojo de pez, aro de latón y madera alrededor.
const TAU = Math.PI * 2;
const RINGS = 28;
const BULGE = 0.2; // 0 = sin distorsión; el centro se ve 1 / (1 - BULGE) veces más grande

export function createPeephole(W, H, dpr) {
  const cx = W / 2;
  const cy = H / 2;
  const R = Math.min(W, H) / 2 - 12;
  const door = paintDoor(W, H, dpr, cx, cy, R);

  return {
    draw(ctx, scene) {
      ctx.drawImage(door, 0, 0, W, H);

      // Ojo de pez: anillos concéntricos, de afuera hacia adentro, cada uno más ampliado.
      for (let i = RINGS; i >= 1; i--) {
        const r = (R * i) / RINGS;
        const mid = (R * (i - 0.5)) / RINGS;
        const s = 1 / (1 - BULGE * (1 - (mid / R) ** 2));
        const half = r / s;
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, TAU);
        ctx.clip();
        ctx.drawImage(
          scene,
          (cx - half) * dpr, (cy - half) * dpr, 2 * half * dpr, 2 * half * dpr,
          cx - r, cy - r, 2 * r, 2 * r,
        );
        ctx.restore();
      }

      // Oscurecer el borde del lente
      const inner = ctx.createRadialGradient(cx, cy, R * 0.55, cx, cy, R);
      inner.addColorStop(0, 'rgba(0, 0, 0, 0)');
      inner.addColorStop(1, 'rgba(0, 0, 0, 0.85)');
      ctx.fillStyle = inner;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, TAU);
      ctx.fill();

      // Reflejo del vidrio
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
      ctx.lineWidth = 12;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(cx, cy, R * 0.8, 1.12 * Math.PI, 1.42 * Math.PI);
      ctx.stroke();

      // Aro de latón
      const brass = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
      brass.addColorStop(0, '#e6c27a');
      brass.addColorStop(0.5, '#8a6326');
      brass.addColorStop(1, '#3d2a0e');
      ctx.strokeStyle = brass;
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.arc(cx, cy, R + 3, 0, TAU);
      ctx.stroke();
    },
  };
}

// La puerta se pinta una sola vez en un canvas aparte.
function paintDoor(W, H, dpr, cx, cy, R) {
  const canvas = document.createElement('canvas');
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const wood = ctx.createLinearGradient(0, 0, W, 0);
  wood.addColorStop(0, '#1d110a');
  wood.addColorStop(0.5, '#33200f');
  wood.addColorStop(1, '#1d110a');
  ctx.fillStyle = wood;
  ctx.fillRect(0, 0, W, H);

  // Vetas
  ctx.lineWidth = 1;
  for (let i = 0; i < 70; i++) {
    const x = Math.random() * W;
    ctx.strokeStyle = `rgba(0, 0, 0, ${0.1 + Math.random() * 0.2})`;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    for (let y = 0; y <= H; y += 20) ctx.lineTo(x + Math.sin(y * 0.03 + i) * 3, y);
    ctx.stroke();
  }

  // Tablas
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.lineWidth = 3;
  for (let x = W / 6; x < W; x += W / 6) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }

  // Sombra que rodea el agujero de la mirilla
  const hole = ctx.createRadialGradient(cx, cy, R, cx, cy, R + 40);
  hole.addColorStop(0, 'rgba(0, 0, 0, 0.8)');
  hole.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = hole;
  ctx.fillRect(0, 0, W, H);

  return canvas;
}
