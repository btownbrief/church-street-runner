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
];

export function getSavedCharacter() {
  const id = localStorage.getItem('csr-char');
  return CHARACTERS.find((c) => c.id === id) || CHARACTERS[0];
}
export function saveCharacter(id) {
  localStorage.setItem('csr-char', id);
}
