// Lente de la mirilla con efecto ojo de pez. Toma un círculo de la escena (`source`)
// y lo dibuja ampliado en el lente de la puerta (`lens`).
const TAU = Math.PI * 2;
const RINGS = 28;
const BULGE = 0.2; // 0 = sin distorsión; el centro se ve 1 / (1 - BULGE) veces más grande

export function createPeephole(lens, source, dpr) {
  const { cx, cy, R } = lens;
  const { x: sx, y: sy, radius: SR } = source;
  const zoom = SR / R;

  return {
    draw(ctx, scene) {
      // Anillos concéntricos, de afuera hacia adentro, cada uno más ampliado.
      for (let i = RINGS; i >= 1; i--) {
        const r = (R * i) / RINGS;
        const mid = (R * (i - 0.5)) / RINGS;
        const s = 1 / (1 - BULGE * (1 - (mid / R) ** 2));
        const half = (r / s) * zoom;
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, TAU);
        ctx.clip();
        ctx.drawImage(
          scene,
          (sx - half) * dpr, (sy - half) * dpr, 2 * half * dpr, 2 * half * dpr,
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
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(cx, cy, R * 0.8, 1.12 * Math.PI, 1.42 * Math.PI);
      ctx.stroke();
    },
  };
}
