// Blocks: the run is a walk down Church Street, one city block at a time.
// Every block starts at a cross street, has a theme (hazard mix + scenery
// bias), a pattern tier, and its own time of day. After six blocks the list
// loops as "Day 2", one tier harder. The America/New_York date picks one
// twist and one goal; the middle blocks are reshuffled every run.

export const BLOCK_LEN = 300;        // 10 chunks of 30 m
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

// time of day, one row per block position (1..6). The sky and fog carry the
// colour; the light on the street stays close to white from golden hour on,
// so hazard colours (orange = duck) read the same at sunset and night.
export const SKIES = [
  { name: 'morning', sky: 0xbdd7e7, sun: 0xfff1d6, sunI: 1.5, hemiSky: 0xcfe4f0, hemiGround: 0x9a7a5c, hemiI: 0.95, cloud: 0xffffff, glow: 0 },
  { name: 'noon', sky: 0xa8d4f2, sun: 0xffffff, sunI: 1.65, hemiSky: 0xd8ecf8, hemiGround: 0xa08262, hemiI: 1.0, cloud: 0xffffff, glow: 0 },
  { name: 'afternoon', sky: 0xd9d6bf, sun: 0xffe4b8, sunI: 1.5, hemiSky: 0xe8e0c8, hemiGround: 0x9a7a5c, hemiI: 0.9, cloud: 0xfff6e6, glow: 0 },
  { name: 'golden', sky: 0xf2c48c, sun: 0xffd29a, sunI: 1.35, hemiSky: 0xf5e2c6, hemiGround: 0x8a6c54, hemiI: 0.85, cloud: 0xffe2bc, glow: 0.15 },
  { name: 'sunset', sky: 0xd98a7a, sun: 0xffcfb4, sunI: 1.0, hemiSky: 0xf2e6de, hemiGround: 0x7a6a62, hemiI: 0.85, cloud: 0xf2b2a0, glow: 0.5 },
  { name: 'night', sky: 0x1b2440, sun: 0xc4cdea, sunI: 0.6, hemiSky: 0xd0d6ea, hemiGround: 0x5e5650, hemiI: 0.72, cloud: 0x3c4466, glow: 1 },
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

// The date picks the twist; the order of the middle blocks is dealt per run
// (see runOrder), so run 10 doesn't open like run 9. Each twist keeps its
// signature: Festival Day puts the festival second, Dog Day the dogs second,
// Night Owl starts at night.
const MIDDLE = ['lunch', 'delivery', 'dogs'];
export function dailyPlan(date, mid = MIDDLE) {
  const twist = twistFor(date);
  let order = ['stroll', ...mid, 'festival', 'night'];
  if (twist.id === 'dogday') order = ['stroll', 'dogs', ...mid.filter((t) => t !== 'dogs'), 'festival', 'night'];
  if (twist.id === 'festival') order = ['stroll', 'festival', ...mid, 'night'];
  if (twist.id === 'nightowl') order = ['night', ...mid, 'festival', 'stroll'];
  return { date, twist, order, skyReverse: twist.id === 'nightowl', goal: goalFor(date, twist) };
}

// A fresh middle order for each run. The block-2 theme never repeats the
// previous run's, so back-to-back runs open on different streets.
let lastLead = null;
export function runOrder(rng = Math.random) {
  const mid = MIDDLE.slice();
  for (let i = mid.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [mid[i], mid[j]] = [mid[j], mid[i]];
  }
  if (mid[0] === lastLead) [mid[0], mid[1]] = [mid[1], mid[0]];
  lastLead = mid[0];
  return mid;
}

// ------------------------------------------------------------ daily goal
// One goal a day, picked by the date to suit the twist. Finishing it keeps
// the streak alive.
export const GOALS = {
  reach4: { id: 'reach4', text: 'Reach Block 4', n: 4, unit: 'block' },
  reach5: { id: 'reach5', text: 'Reach Block 5', n: 5, unit: 'block' },
  coins: { id: 'coins', text: 'Grab 120 coins in one run', n: 120, unit: 'coins' },
  maple: { id: 'maple', text: 'Grab 200 coins in one run', n: 200, unit: 'coins' },
  clean: { id: 'clean', text: 'Clear a block without a hit', n: 1, unit: 'clean' },
  close: { id: 'close', text: '3 close calls in a row', n: 3, unit: 'close' },
};
const GOAL_POOL = {
  dogday: ['clean', 'reach4'],
  creemee: ['coins', 'reach5'],
  maple: ['maple', 'reach4'],
  festival: ['reach5', 'close'],
  nightowl: ['clean', 'reach4'],
};
function goalFor(date, twist) {
  const pool = GOAL_POOL[twist.id] || ['reach4'];
  const rng = mulberry32(hashStr('csr-goal:' + date));
  return GOALS[pool[Math.floor(rng() * pool.length)]];
}

const TIER_BY_POS = [1, 2, 2, 3, 4, 4];

// block number (1-based) -> what that block is
export function blockInfo(plan, block) {
  const pos = (block - 1) % BLOCKS_PER_DAY;
  const day = Math.floor((block - 1) / BLOCKS_PER_DAY) + 1;
  const theme = THEMES[plan.order[pos]];
  // tier by block position: 1, 2, 2, 3, 4, 4 (forced jumps and slides start
  // at block 4, about 900 m in); Day 2 mixes tier 3-4 pairs
  let tier = day > 1 ? 5 : TIER_BY_POS[pos];
  // the reward block is one tier easier, but never easier than tier 2 when it
  // comes second (Festival Day), so the opening still asks for something
  if (theme.reward && tier < 5) tier = Math.max(block === 2 ? 2 : 1, tier - 1);
  const skyIdx = plan.skyReverse ? BLOCKS_PER_DAY - 1 - pos : pos;
  return { block, pos, day, theme, tier, sky: SKIES[skyIdx] };
}

export function blockAt(dist) {
  return Math.floor(Math.max(0, dist) / BLOCK_LEN) + 1;
}

// speed curve: rises inside a block, eases back 0.3 m/s at each cross street
export function speedAt(dist) {
  const b = blockAt(dist);
  const p = (Math.max(0, dist) - (b - 1) * BLOCK_LEN) / BLOCK_LEN;
  return Math.min(28, 10 + 1.5 * (b - 1) + 1.8 * p);
}
