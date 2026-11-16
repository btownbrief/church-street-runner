// Blocks: the run is a walk down Church Street, one city block at a time.
// Every block starts at a cross street, has a theme (hazard mix + scenery
// bias), a pattern tier, and its own time of day. After six blocks the list
// loops as "Day 2", one tier harder. The daily plan (seeded from the
// America/New_York date) reorders the middle blocks and adds one twist.

export const BLOCK_LEN = 420;        // 14 chunks of 30 m
export const BREATHER = 30;          // coins only for 30 m after a cross street
export const BLOCKS_PER_DAY = 6;

// cell letters: J low prop (jump), S tall solid, G slide gate,
// W walker (moving solid), D loose dog (jump)
export const THEMES = {
  stroll: {
    id: 'stroll', name: 'Morning Stroll',
    J: ['sandwich', 'newsbox', 'trash', 'boulder', 'bike'],
    S: ['umbrella', 'planter'], W: ['shopper', 'texter'],
    chunkBias: { storefront: 3, jazz: 2, trees: 2 },
  },
  lunch: {
    id: 'lunch', name: 'Lunch Rush',
    J: ['chair', 'sandwich', 'bike'],
    S: ['umbrella'], W: ['shopper', 'texter', 'baller', 'walker-golden', 'walker-black'],
    swapStoW: 0.5,
    chunkBias: { patio: 3, icecream: 3 },
  },
  delivery: {
    id: 'delivery', name: 'Delivery Hour',
    J: ['boxes', 'barrier'], S: ['dolly', 'stack'], W: ['mail'],
    chunkBias: { construction: 4, storefront: 2 },
  },
  dogs: {
    id: 'dogs', name: 'Dogs Off Leash',
    J: ['boulder', 'bike'], S: ['planter'],
    W: ['walker-golden', 'walker-black', 'walker-shaggy', 'walker-brown'],
    swapJtoD: 0.5,
    chunkBias: { park: 4, trees: 3 },
  },
  festival: {
    id: 'festival', name: 'Festival',
    J: ['sandwich', 'chair'], S: ['umbrella'], W: ['shopper', 'baller'],
    reward: true, coinMul: 2, creemee: true,
    chunkBias: { festival: 5, jazz: 2 },
  },
  night: {
    id: 'night', name: 'Night Market',
    J: null, S: null, W: null, // full mix
    swapJtoD: 0.2,
    chunkBias: { patio: 2, festival: 2, icecream: 2 },
  },
};

// time of day, one row per block position (1..6)
export const SKIES = [
  { name: 'morning', sky: 0xbdd7e7, sun: 0xfff1d6, sunI: 1.5, hemiSky: 0xcfe4f0, hemiGround: 0x9a7a5c, hemiI: 0.95, cloud: 0xffffff, glow: 0 },
  { name: 'noon', sky: 0xa8d4f2, sun: 0xffffff, sunI: 1.65, hemiSky: 0xd8ecf8, hemiGround: 0xa08262, hemiI: 1.0, cloud: 0xffffff, glow: 0 },
  { name: 'afternoon', sky: 0xd9d6bf, sun: 0xffe4b8, sunI: 1.5, hemiSky: 0xe8e0c8, hemiGround: 0x9a7a5c, hemiI: 0.9, cloud: 0xfff6e6, glow: 0 },
  { name: 'golden', sky: 0xf2c48c, sun: 0xffc27a, sunI: 1.35, hemiSky: 0xf5d6a8, hemiGround: 0x8a6448, hemiI: 0.8, cloud: 0xffe2bc, glow: 0.15 },
  { name: 'sunset', sky: 0xd98a7a, sun: 0xff9a68, sunI: 1.05, hemiSky: 0xe8a898, hemiGround: 0x6a4a44, hemiI: 0.7, cloud: 0xf2b2a0, glow: 0.5 },
  { name: 'night', sky: 0x1b2440, sun: 0xa8b8e6, sunI: 0.55, hemiSky: 0x6a76a4, hemiGround: 0x4a3a32, hemiI: 0.8, cloud: 0x3c4466, glow: 1 },
];

export const TWISTS = [
  { id: 'dogday', name: 'Dog Day', blurb: 'Loose dogs everywhere' },
  { id: 'creemee', name: 'Creemee Day', blurb: 'A creemee flight every block' },
  { id: 'maple', name: 'Maple Rush', blurb: 'Twice the coins' },
  { id: 'festival', name: 'Festival Day', blurb: 'The festival comes early' },
  { id: 'nightowl', name: 'Night Owl', blurb: 'Start at night, run to morning' },
];

// ------------------------------------------------------------ daily seed

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function nyDate(d = new Date()) {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

export function dayDiff(a, b) {
  // whole days from date string a to date string b
  return Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 86400000);
}

// Twists come in shuffled runs of five, so every twist shows up once in any
// five-day stretch and the same one rarely lands two days running.
function cycleOrder(cycle) {
  const rng = mulberry32(hashStr('csr-cycle:' + cycle));
  const order = TWISTS.map((t, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}
function twistFor(date) {
  const day = Math.floor(Date.parse(date + 'T12:00:00Z') / 86400000);
  const n = TWISTS.length;
  const cycle = Math.floor(day / n);
  const order = cycleOrder(cycle);
  // no repeat across the seam between two cycles
  const prevLast = cycleOrder(cycle - 1)[n - 1];
  if (order[0] === prevLast) [order[0], order[1]] = [order[1], order[0]];
  return TWISTS[order[((day % n) + n) % n]];
}

export function dailyPlan(date) {
  const rng = mulberry32(hashStr('csr:' + date));
  const twist = twistFor(date);
  const middle = ['lunch', 'delivery', 'dogs'];
  const rot = Math.floor(rng() * 3);
  const mid = middle.slice(rot).concat(middle.slice(0, rot));
  let order = ['stroll', ...mid, 'festival', 'night'];
  if (twist.id === 'dogday') order = ['stroll', 'dogs', ...mid.filter((t) => t !== 'dogs'), 'festival', 'night'];
  if (twist.id === 'festival') order = ['stroll', 'festival', ...mid, 'night'];
  if (twist.id === 'nightowl') order = ['night', ...mid, 'festival', 'stroll'];
  return { date, twist, order, skyReverse: twist.id === 'nightowl' };
}

// block number (1-based) -> what that block is
export function blockInfo(plan, block) {
  const pos = (block - 1) % BLOCKS_PER_DAY;
  const day = Math.floor((block - 1) / BLOCKS_PER_DAY) + 1;
  const theme = THEMES[plan.order[pos]];
  let tier = day > 1 ? 5 : Math.min(4, block);
  if (theme.reward && tier < 5) tier = Math.max(1, tier - 1);
  const skyIdx = plan.skyReverse ? BLOCKS_PER_DAY - 1 - pos : pos;
  return { block, pos, day, theme, tier, sky: SKIES[skyIdx] };
}

export function blockAt(dist) {
  return Math.floor(Math.max(0, dist) / BLOCK_LEN) + 1;
}

// speed curve: rises inside a block, eases back 0.5 m/s at each cross street
export function speedAt(dist) {
  const b = blockAt(dist);
  const p = (Math.max(0, dist) - (b - 1) * BLOCK_LEN) / BLOCK_LEN;
  return Math.min(28, 10 + 2 * (b - 1) + 2.5 * p);
}
