const SWIPE_MIN = 50;

// Botones, teclado (← → / A D) y deslizar en móvil. Emite 'decision' por el bus.
export function createControls(stage, bus) {
  const openBtn = document.getElementById('btn-open');
  const rejectBtn = document.getElementById('btn-reject');
  let enabled = false;

  function decide(decision) {
    if (!enabled) return;
    if (decision === 'open' && openBtn.disabled) return;
    bus.emit('decision', decision);
  }

  openBtn.addEventListener('click', () => decide('open'));
  rejectBtn.addEventListener('click', () => decide('reject'));

  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') decide('open');
    else if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') decide('reject');
  });

  let startX = null;
  stage.addEventListener('touchstart', (e) => {
    startX = e.changedTouches[0].clientX;
  }, { passive: true });
  stage.addEventListener('touchend', (e) => {
    if (startX === null) return;
    const dx = e.changedTouches[0].clientX - startX;
    startX = null;
    if (Math.abs(dx) > SWIPE_MIN) decide(dx > 0 ? 'open' : 'reject');
  });

  return {
    enable(canOpen) {
      enabled = true;
      openBtn.disabled = !canOpen;
      rejectBtn.disabled = false;
    },
    disable() {
      enabled = false;
      openBtn.disabled = true;
      rejectBtn.disabled = true;
    },
  };
}
