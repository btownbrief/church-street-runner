// The course: authored obstacle patterns, laid down row by row ahead of the
// runner, with coins tracing each pattern's safe route.
//
// A pattern is 1-4 rows; a row is three cells (left, centre, right):
//   .  empty   J low prop   S tall solid   G slide gate   W walker   D loose dog
// Rows inside a pattern are max(11, speed*0.8) m apart; patterns are
// max(16, speed*1.3) m apart. Each block (blocks.js) unlocks a tier.
import { LANES } from './obstacles.js';
import { BLOCK_LEN, BREATHER, blockAt, blockInfo, speedAt } from './blocks.js';

const SPAWN_Z = -140;        // rows appear here (inside the fog)
const FIRST_COINS = 15;      // first coin line, metres from the start
const FIRST_ROW = 45;        // first obstacle, metres from the start
const PRE_CORNER = 16;       // no obstacles this close before a cross street
const OPENING = 200;         // first 200 m: a gentle first wave, centre lane kept clear
                             // (new players only; returning players skip it)
const OPENING_SET = ['single', 'pair', 'hop-line', 'stagger'];
const RETURN_T2 = ['post', 'walker-pair', 'gate'];
const OPEN_POST = { name: 'post', tier: 2, rows: ['.S.'] };

export const PATTERNS = [
  // tier 1 — low props only; jumping is optional but pays (coin arcs)
  { name: 'single', tier: 1, rows: ['J..'], shift: true },
  { name: 'pair', tier: 1, rows: ['J.J'] },
  { name: 'hop-line', tier: 1, rows: ['J..', 'J..', 'J..'], shift: true, hop: true },
  { name: 'stagger', tier: 1, rows: ['J..', '..J'] },
  { name: 'gap', tier: 1, rows: ['.J.', 'J.J'] },
  // tier 2 — solids and walkers; you have to read the street
  { name: 'post', tier: 2, rows: ['S..'], shift: true },
  { name: 'slalom', tier: 2, rows: ['S..', '..S', 'S..'] },
  { name: 'split', tier: 2, rows: ['S.S', '.S.'] },
  { name: 'walker-pair', tier: 2, rows: ['W.W'] },
  { name: 'gate', tier: 2, rows: ['G..'], shift: true },
  { name: 'crowd', tier: 2, rows: ['W..', '.SW'] },
  // tier 3 — the first rows that force a jump or a slide
  { name: 'hurdle-wall', tier: 3, rows: ['SJS'], forced: 'jump' },
  { name: 'limbo', tier: 3, rows: ['SGS'], forced: 'slide' },
  { name: 'full-gate', tier: 3, rows: ['GGG'], forced: 'slide' },
  { name: 'step', tier: 3, rows: ['J..', '.S.', '..J'] },
  { name: 'fence', tier: 3, rows: ['JJJ'], forced: 'jump' },
  // tier 4 — combinations
  { name: 'dog-pack', tier: 4, rows: ['DD.'] },
  { name: 'zipper', tier: 4, rows: ['SS.', '.SS', 'SS.'] },
  { name: 'hop-duck', tier: 4, rows: ['SJS', 'SGS'], forced: 'both' },
  { name: 'pinch', tier: 4, rows: ['S.W', 'GGG'], forced: 'slide' },
  { name: 'dog-fence', tier: 4, rows: ['DJD'], forced: 'jump' },
];

const BLOCKING = new Set(['S', 'W']);

function mirrorRow(r) { return r.split('').reverse().join(''); }
function shiftRow(r, k) {
  // rotate a single-occupant row so its prop can land in any lane
  const a = r.split('');
  return a.slice(3 - k).concat(a.slice(0, 3 - k)).join('');
}

// Cheapest path through the rows: open cells cost nothing, jump/slide cells
// cost a little (or are preferred on hop lines), lane changes cost 1 each.
export function planRoute(rows, startLane, preferHop = false) {
  const INF = 1e9;
  const cellCost = (c) => (c === '.' ? 0 : BLOCKING.has(c) ? INF : preferHop ? -0.6 : 0.7);
  let cost = [0, 1, 2].map((l) => cellCost(rows[0][l]) + Math.abs(l - startLane) * 0.6);
  const back = [];
  for (let r = 1; r < rows.length; r++) {
    const next = [], from = [];
    for (let l = 0; l < 3; l++) {
      let best = INF, arg = 0;
      for (let p = 0; p < 3; p++) {
        const c = cost[p] + Math.abs(l - p);
        if (c < best) { best = c; arg = p; }
      }
      next.push(best + cellCost(rows[r][l]));
      from.push(arg);
    }
    back.push(from);
    cost = next;
  }
  let lane = cost.indexOf(Math.min(...cost));
  const route = [lane];
  for (let r = back.length - 1; r >= 0; r--) { lane = back[r][lane]; route.unshift(lane); }
  return route;
}

export class Course {
  constructor(obstacles, collectibles) {
    this.obstacles = obstacles;
    this.collectibles = collectibles;
    this.patternLog = [];
    this.reset({ plan: null });
  }

  reset({ plan, tutorial = false, twist = null, returning = false }) {
    this.plan = plan;
    this.twist = twist;
    this.returning = returning;
    this.openPicks = 0;
    this.queue = [];
    this.cursor = -FIRST_ROW;    // world z of the next row
    this.lastName = '';
    this.routeLane = 1;
    this.patternLog = [];
    this.sincePower = 0;
    this.creemeeBlock = 0;        // last block that got its guaranteed creemee
    this.dist = 0;
    if (tutorial) {
      this.queue.push(
        { cells: '.J.', gap: 34, hint: 'up', name: 'teach-jump' },
        { cells: '.W.', gap: 36, hint: 'side', name: 'teach-side' },
        { cells: 'GGG', gap: 30, hint: 'down', name: 'teach-slide' },
      );
      this.cursor = -FIRST_ROW;
    }
    if (plan) this.#coinLine(1, -FIRST_COINS, -FIRST_COINS - 13, 1.05);
    if (plan) this.update(0, 0);
  }

  info(dist) { return blockInfo(this.plan, blockAt(dist)); }

  // distance window [start, end) around the next cross street with no obstacles
  #quietZone(rowDist) {
    const b = Math.round(rowDist / BLOCK_LEN) * BLOCK_LEN;
    if (b === 0) return null;
    if (rowDist >= b - PRE_CORNER && rowDist < b + BREATHER) return { start: b - PRE_CORNER, end: b + BREATHER };
    return null;
  }

  update(dz, dist) {
    this.dist = dist;
    this.cursor += dz;
    let guard = 0;
    while (this.cursor > SPAWN_Z && guard++ < 20) this.#placeNext();
  }

  #placeNext() {
    const rowDist = this.dist - this.cursor;
    const quiet = this.#quietZone(rowDist);
    if (quiet) {
      // breather around the cross street: a coin line straight through it
      const zEnd = this.dist - quiet.end;
      this.#coinLine(this.routeLane, this.cursor, Math.max(zEnd, this.cursor - 40), 1.05);
      this.cursor = zEnd;
      return;
    }
    if (!this.queue.length) this.#queuePattern(rowDist);
    const row = this.queue.shift();
    if (!row) return;
    // never let a pattern run into the cross street: drop rows that would
    const nextCorner = Math.ceil((rowDist + 1) / BLOCK_LEN) * BLOCK_LEN;
    if (row.inPattern && rowDist > nextCorner - PRE_CORNER) {
      this.queue = [];
      return;
    }
    this.#placeRow(row, this.cursor, rowDist);
    this.cursor -= row.gap;
  }

  #queuePattern(rowDist) {
    const info = this.info(rowDist);
    const speed = speedAt(rowDist);
    const inGap = Math.max(11, speed * 0.8);
    const between = Math.max(16, speed * 1.3);
    const blockEnd = info.block * BLOCK_LEN - PRE_CORNER;

    const opening = info.block === 1 && rowDist < OPENING && !this.returning;
    let picks;
    if (info.block === 1 && this.returning) {
      // returning players: block 1 alternates tier 1 and the one-row tier 2
      // patterns, opening on a solid in the centre lane so the first seconds
      // ask for a real move. The multi-row tier 2 patterns wait for block 2.
      const n = this.openPicks++;
      if (n === 0) {
        picks = [OPEN_POST];
        this.lastName = 'post';
      } else if (n % 2 === 0) {
        const pool = PATTERNS.filter((p) => RETURN_T2.includes(p.name) && p.name !== this.lastName);
        picks = [pool[Math.floor(Math.random() * pool.length)]];
        this.lastName = picks[0].name;
      } else picks = [this.#pick(1, 1)];
    } else if (opening) {
      const pool = PATTERNS.filter((p) => OPENING_SET.includes(p.name) && p.name !== this.lastName);
      picks = [pool[Math.floor(Math.random() * pool.length)]];
      this.lastName = picks[0].name;
    } else if (info.tier >= 5) {
      // Day 2: two tier 3-4 patterns back to back, short spacing
      picks = [this.#pick(4, 3), this.#pick(4, 3)];
    } else {
      picks = [this.#pick(info.tier, 1)];
    }

    // turn the picks into rows
    const rows = [];
    for (const [pi, p] of picks.entries()) {
      const mirror = Math.random() < 0.5;
      const k = p.shift ? (opening ? (Math.random() < 0.5 ? 0 : 2) : Math.floor(Math.random() * 3)) : 0;
      let cells = p.rows.map((r) => (p.shift ? shiftRow(r, k) : r)).map((r) => (mirror ? mirrorRow(r) : r));
      cells = cells.map((r) => this.#themeCells(r, info));
      cells.forEach((c, i) => {
        const last = i === cells.length - 1;
        const lastPick = pi === picks.length - 1;
        rows.push({
          cells: c, name: p.name, inPattern: true, hop: p.hop,
          gap: last ? (lastPick ? between : inGap * 1.15) : inGap,
        });
      });
      this.patternLog.push(p.name);
      if (this.patternLog.length > 400) this.patternLog.shift();
    }
    // if the pattern would run into the next cross street, coins instead
    const len = rows.reduce((s, r, i) => s + (i < rows.length - 1 ? r.gap : 0), 0);
    if (rowDist + len > blockEnd) {
      this.patternLog.splice(this.patternLog.length - picks.length, picks.length);
      const zEnd = this.dist - (blockEnd + PRE_CORNER);
      this.#coinLine(this.routeLane, this.cursor, Math.max(zEnd, this.cursor - 30), 1.05);
      this.cursor = Math.min(zEnd, this.cursor - 30);
      return;
    }

    // coin route through the whole pattern
    const route = planRoute(rows.map((r) => r.cells), this.routeLane, rows[0].hop);
    rows.forEach((r, i) => { r.lane = route[i]; });

    // power-ups lead the pattern now and then; a creemee is guaranteed once
    // per Festival block (and every block on Creemee Day)
    const wantsCreemee = (info.theme.creemee || this.twist === 'creemee') &&
      this.creemeeBlock !== info.block && rowDist > (info.block - 1) * BLOCK_LEN + BREATHER + 60;
    this.sincePower += 1;
    let power = null;
    if (wantsCreemee) { power = 'creemee'; this.creemeeBlock = info.block; }
    else if (this.sincePower > 6 && Math.random() < 0.18) power = Math.random() < 0.5 ? 'magnet' : 'creemee';
    if (power) {
      if (this.collectibles.place(power, LANES[route[0]], 1.05, this.cursor + 7)) this.sincePower = 0;
    }

    // extra coin line in the gap after the pattern (always on reward blocks
    // and Maple Rush)
    const coinMul = (info.theme.coinMul || 1) * (this.twist === 'maple' ? 2 : 1);
    const lastRow = rows[rows.length - 1];
    lastRow.gapCoins = Math.random() < (coinMul > 1 ? 0.9 : 0.3);

    this.queue.push(...rows);
  }

  #pick(tier, minTier) {
    // 60% from the block's own tier, 40% from the tiers below; never repeat
    const own = Math.random() < 0.6 || tier === minTier;
    let pool = PATTERNS.filter((p) => (own ? p.tier === tier : p.tier >= minTier && p.tier < tier));
    if (!pool.length) pool = PATTERNS.filter((p) => p.tier <= tier && p.tier >= minTier);
    let choice = pool[Math.floor(Math.random() * pool.length)];
    for (let i = 0; i < 6 && choice.name === this.lastName && pool.length > 1; i++) {
      choice = pool[Math.floor(Math.random() * pool.length)];
    }
    this.lastName = choice.name;
    return choice;
  }

  // theme flavour: some low props become loose dogs, some solids become walkers
  #themeCells(row, info) {
    const swapD = (info.theme.swapJtoD || 0) + (this.twist === 'dogday' ? 0.5 : 0);
    const swapW = info.theme.swapStoW || 0;
    return row.split('').map((c) => {
      if (c === 'J' && swapD && Math.random() < swapD) return 'D';
      if (c === 'S' && swapW && Math.random() < swapW) return 'W';
      return c;
    }).join('');
  }

  #placeRow(row, z, rowDist) {
    const info = this.info(rowDist);
    const theme = info.theme;
    for (let l = 0; l < 3; l++) {
      const c = row.cells[l];
      if (c === '.') continue;
      const slot = this.obstacles.spawn(c, l, z, theme[c] || null);
      if (slot && row.hint) {
        slot.teach = true; // tutorial props bump you without costing a life
        if (l === 1 || row.hint === 'down') slot.hint = row.hint;
      }
    }
    // coins along the safe lane
    const lane = row.lane ?? this.#tutorialLane(row);
    const cell = row.cells[lane];
    const X = LANES[lane];
    if (cell === 'J' || cell === 'D') {
      for (let i = -2; i <= 2; i++) {
        const off = i * 2.2;
        this.collectibles.place('coin', X, 1.05 + 1.05 * (1 - (off / 4.4) ** 2), z - off);
      }
    } else if (cell === 'G') {
      for (let i = -1; i <= 1; i++) this.collectibles.place('coin', X, 0.6, z - i * 2.2);
    } else {
      for (const off of [1.1, -1.1]) this.collectibles.place('coin', X, 1.05, z - off);
    }
    if (row.gapCoins) this.#coinLine(lane, z - 6, Math.max(z - row.gap + 6, z - 6 - 4 * 2.2 - 0.1), 1.05);
    if (row.lane !== undefined) this.routeLane = row.lane;
  }

  #tutorialLane(row) {
    // tutorial rows: coins teach the move in the centre lane (arc / low line),
    // or sit in the side lane you should move to
    if (row.cells[1] === 'W') return 0;
    return 1;
  }

  #coinLine(lane, zStart, zEnd, y) {
    for (let z = zStart; z > zEnd; z -= 2.2) this.collectibles.place('coin', LANES[lane], y, z);
  }
}
