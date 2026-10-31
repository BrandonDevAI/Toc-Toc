// Niebla baja que cruza el porche. La densidad sube con la hora de la noche.
const PUFFS = 18;

export function createFog(W, H, horizon) {
  let density = 0;

  function spawn(anywhere) {
    const r = 60 + Math.random() * 80;
    return {
      x: anywhere ? Math.random() * W : -r,
      y: horizon - 30 + Math.random() * (H - horizon + 20),
      r,
      speed: 6 + Math.random() * 14,
      alpha: 0.5 + Math.random() * 0.5,
    };
  }

  const puffs = Array.from({ length: PUFFS }, () => spawn(true));

  return {
    setDensity(value) {
      density = value;
    },
    update(dt) {
      for (const p of puffs) {
        p.x += p.speed * dt;
        if (p.x - p.r > W) Object.assign(p, spawn(false));
      }
    },
    // La capa de adelante es más tenue para no tapar del todo las pistas (como la sombra).
    draw(ctx, { front = false } = {}) {
      if (density <= 0) return;
      const strength = front ? 0.12 : 0.25;
      puffs.forEach((p, i) => {
        if (front && i % 3 !== 0) return;
        const a = density * p.alpha * strength;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.scale(1, 0.45);
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, p.r);
        g.addColorStop(0, `rgba(205, 195, 235, ${a})`);
        g.addColorStop(1, 'rgba(205, 195, 235, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(-p.r, -p.r, p.r * 2, p.r * 2);
        ctx.restore();
      });
    },
  };
}
