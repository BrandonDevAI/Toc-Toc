// Loop principal con delta time limitado (evita saltos al volver de otra pestaña).
const MAX_DT = 0.1;

export function createGameLoop(update, render) {
  let last = 0;
  let rafId = null;

  function frame(now) {
    const dt = Math.min((now - last) / 1000, MAX_DT);
    last = now;
    update(dt);
    render();
    rafId = requestAnimationFrame(frame);
  }

  return {
    start() {
      last = performance.now();
      rafId = requestAnimationFrame(frame);
    },
    stop() {
      cancelAnimationFrame(rafId);
    },
  };
}
