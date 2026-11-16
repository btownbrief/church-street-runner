// Swipe (touch) + keyboard input -> simple action callbacks.
// A swipe fires on touchmove as soon as the finger has travelled SWIPE_MIN.
// One stroke is one move: while the finger keeps going the same way after a
// swipe fired, the anchor follows it, so a long swipe never moves two lanes.
// A new direction (right, then up) fires again without lifting, and so does
// the same direction after the finger pauses. A touch that never travels far
// enough is a tap (used for quick retry).
const SWIPE_MIN = 24; // px
const PAUSE_MS = 130; // a pause this long ends a stroke

export function bindInput({ left, right, up, down, anyKey }) {
  let id = null;         // the one finger we follow; extra fingers are ignored
  let sx = 0, sy = 0;
  let swiped = false;
  let lockDir = null;    // direction of the swipe this stroke already fired
  let lastMoveT = 0;

  const onUI = (el) => el?.closest?.('button, a, input, [data-notap]');

  window.addEventListener('touchstart', (e) => {
    if (id !== null) return;
    const t = e.changedTouches[0];
    // a touch that starts on a button belongs to the button
    if (onUI(e.target)) return;
    id = t.identifier;
    sx = t.clientX; sy = t.clientY;
    swiped = false;
    lockDir = null;
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    if (id === null) return;
    for (const t of e.changedTouches) {
      if (t.identifier !== id) continue;
      const now = performance.now();
      if (lockDir && now - lastMoveT > PAUSE_MS) lockDir = null; // finger paused: a fresh stroke
      lastMoveT = now;
      const dx = t.clientX - sx;
      const dy = t.clientY - sy;
      const adx = Math.abs(dx), ady = Math.abs(dy);
      const dir = adx > ady ? (dx > 0 ? 'R' : 'L') : (dy > 0 ? 'D' : 'U');
      if (lockDir && dir === lockDir) { sx = t.clientX; sy = t.clientY; continue; } // same stroke
      if (Math.max(adx, ady) < SWIPE_MIN) continue;
      ({ R: right, L: left, D: down, U: up })[dir]();
      swiped = true;
      lockDir = dir;
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
