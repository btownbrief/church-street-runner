// Playable character roster. Each spec fully restyles the Player rig —
// different skin tones, outfits, hats and silhouettes (not recolors).
export const CHARACTERS = [
  {
    id: 'sam',
    name: 'Sam',
    emoji: '🧢',
    skin: 0xe8b48a,
    shirt: 0x2f6b4f, pants: 0x3b3f4a, shoes: 0xefe9dc,
    hat: 'cap', hatColor: 0xb03a30,
  },
  {
    id: 'june',
    name: 'June',
    emoji: '👒',
    skin: 0xd9a26e,
    shirt: 0xe0864f, pants: 0xe0864f, shoes: 0xf0e7d8,
    hat: 'brim', hatColor: 0xe4d6b0,
    dress: true, hair: 0x4a3823,
  },
  {
    id: 'marcus',
    name: 'Marcus',
    emoji: '🎧',
    skin: 0x6f4a30,
    shirt: 0xc9a22e, pants: 0x2c2c30, shoes: 0xffffff,
    hat: 'beanie', hatColor: 0x2f4d73,
    jacket: 0x3d3d44, headphones: true,
  },
  {
    id: 'brook',
    name: 'Brook',
    emoji: '🥾',
    skin: 0xc98e62,
    shirt: 0x8e3b32, pants: 0x5c4632, shoes: 0x4a3823,
    hat: null, hair: 0x8a6a3a,
    flannel: 0x5c1f1a, backpack: 0x2e5f43,
  },
  // ---- unlockable runners (data only; the rig builds them) ----
  {
    id: 'busker',
    name: 'The Busker',
    emoji: '🎸',
    skin: 0xb07850,
    shirt: 0xd8c39a, pants: 0x4a3a2c, shoes: 0x2b2420,
    hat: 'brim', hatColor: 0x3d2f26,
    vest: 0x7a3a5a, guitar: 0xc9883a,
    unlock: { kind: 'block', n: 3, text: 'Reach Block 3' },
  },
  {
    id: 'carrier',
    name: 'The Mail Carrier',
    emoji: '📬',
    skin: 0xe0b08a,
    shirt: 0x8fb6dc, pants: 0x3e5a78, shoes: 0x1f1f22,
    hat: 'cap', hatColor: 0x3e5a78,
    satchel: 0x6b4a2f,
    unlock: { kind: 'block', n: 5, text: 'Reach Block 5' },
  },
  {
    id: 'chef',
    name: 'The Chef',
    emoji: '👨‍🍳',
    skin: 0x8a5a3a,
    shirt: 0xf6f3ea, pants: 0x2c2c30, shoes: 0x1f1f22,
    hat: 'toque', hatColor: 0xffffff,
    unlock: { kind: 'bank', n: 500, text: 'Collect 500 coins (all runs)' },
  },
  {
    id: 'owl',
    name: 'The Night Owl',
    emoji: '🦉',
    skin: 0xd9a26e,
    shirt: 0x2a2a34, pants: 0x2a2a34, shoes: 0xf2f2f2,
    hat: 'beanie', hatColor: 0x6a4fb0,
    vest: 0xd8ff3a, headphones: true,
    unlock: { kind: 'block', n: 7, text: 'Finish Block 6 (the Night Market)' },
  },
];

function safeGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function safeSet(key, value) {
  try { localStorage.setItem(key, value); } catch { /* storage blocked */ }
}

// ---- unlock progress: lifetime coins, farthest block, unlocked ids ----
export function loadProgress() {
  let unlocked = [];
  try { unlocked = JSON.parse(safeGet('csr-unlocked') || '[]'); } catch { unlocked = []; }
  if (!Array.isArray(unlocked)) unlocked = [];
  return {
    bank: Number(safeGet('csr-bank') || 0) || 0,
    far: Number(safeGet('csr-far') || 1) || 1,
    unlocked,
  };
}
export function saveProgress(p) {
  safeSet('csr-bank', String(Math.floor(p.bank)));
  safeSet('csr-far', String(Math.floor(p.far)));
  safeSet('csr-unlocked', JSON.stringify(p.unlocked));
}
export function isUnlocked(c, p) {
  return !c.unlock || p.unlocked.includes(c.id);
}
export function meetsUnlock(c, bank, far) {
  if (!c.unlock) return true;
  return c.unlock.kind === 'bank' ? bank >= c.unlock.n : far >= c.unlock.n;
}
// 0..1 progress toward a locked runner
export function unlockProgress(c, bank, far) {
  if (!c.unlock) return 1;
  if (c.unlock.kind === 'bank') return Math.min(1, bank / c.unlock.n);
  return Math.min(1, far / c.unlock.n);
}

export function getSavedCharacter(progress) {
  const id = safeGet('csr-char');
  const c = CHARACTERS.find((x) => x.id === id);
  if (c && (!progress || isUnlocked(c, progress))) return c;
  return CHARACTERS[0];
}
export function saveCharacter(id) {
  safeSet('csr-char', id);
}
