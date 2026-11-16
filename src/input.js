// Swipe (touch) + keyboard input -> simple action callbacks.
// A swipe fires on touchmove as soon as the finger has travelled SWIPE_MIN,
// then re-anchors, so you can swipe again without lifting. A touch that
// never travels far enough is a tap (used for quick retry).
const SWIPE_MIN = 24; // px

export function bindInput({ left, right, up, down, anyKey }) {
  let id = null;         // the one finger we follow; extra fingers are ignored
  let sx = 0, sy = 0;
  let swiped = false;

  const onUI = (el) => el?.closest?.('button, a, input, [data-notap]');

  window.addEventListener('touchstart', (e) => {
    if (id !== null) return;
    const t = e.changedTouches[0];
    // a touch that starts on a button belongs to the button
    if (onUI(e.target)) return;
    id = t.identifier;
    sx = t.clientX; sy = t.clientY;
    swiped = false;
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    if (id === null) return;
    for (const t of e.changedTouches) {
      if (t.identifier !== id) continue;
      const dx = t.clientX - sx;
      const dy = t.clientY - sy;
      const adx = Math.abs(dx), ady = Math.abs(dy);
      if (Math.max(adx, ady) < SWIPE_MIN) return;
      if (adx > ady) (dx > 0 ? right : left)();
      else (dy > 0 ? down : up)();
      swiped = true;
      sx = t.clientX; sy = t.clientY; // re-anchor for the next swipe
    }
  }, { passive: true });

  const end = (e) => {
    if (id === null) return;
    for (const t of e.changedTouches) {
      if (t.identifier !== id) continue;
      id = null;
      if (!swiped && e.type === 'touchend' && !onUI(e.target)) anyKey?.();
    }
  };
  window.addEventListener('touchend', end, { passive: true });
  window.addEventListener('touchcancel', end, { passive: true });

  window.addEventListener('keydown', (e) => {
    // don't hijack keys while typing (e.g. the leaderboard name field)
    if (e.target.closest?.('input, textarea')) return;
    switch (e.code) {
      case 'ArrowLeft': case 'KeyA': left(); break;
      case 'ArrowRight': case 'KeyD': right(); break;
      case 'ArrowUp': case 'KeyW': case 'Space': up(); e.preventDefault(); break;
      case 'ArrowDown': case 'KeyS': down(); e.preventDefault(); break;
      default: anyKey?.();
    }
  });
}
