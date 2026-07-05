// Swipe (touch) + keyboard input → simple action callbacks.
const SWIPE_MIN = 26; // px

export function bindInput({ left, right, up, down, anyKey }) {
  let sx = 0, sy = 0, st = 0, tracking = false;

  window.addEventListener('touchstart', (e) => {
    const t = e.changedTouches[0];
    sx = t.clientX; sy = t.clientY; st = performance.now();
    tracking = true;
  }, { passive: true });

  window.addEventListener('touchend', (e) => {
    if (!tracking) return;
    tracking = false;
    // taps on UI buttons are handled by their own click handlers —
    // don't also treat them as a swipe/restart gesture
    if (e.target.closest?.('button, a')) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - sx;
    const dy = t.clientY - sy;
    const adx = Math.abs(dx), ady = Math.abs(dy);
    if (Math.max(adx, ady) < SWIPE_MIN) { anyKey?.(); return; }
    if (adx > ady) (dx > 0 ? right : left)();
    else (dy > 0 ? down : up)();
  }, { passive: true });

  window.addEventListener('keydown', (e) => {
    switch (e.code) {
      case 'ArrowLeft': case 'KeyA': left(); break;
      case 'ArrowRight': case 'KeyD': right(); break;
      case 'ArrowUp': case 'KeyW': case 'Space': up(); e.preventDefault(); break;
      case 'ArrowDown': case 'KeyS': down(); e.preventDefault(); break;
      default: anyKey?.();
    }
  });
}
