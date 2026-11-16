# Church Street Runner

An endless runner down Burlington's Church Street Marketplace (three lanes,
swipe to dodge, jump and slide). Built with Three.js. Live at
https://play.btownbrief.com/church-street-runner/.

## How it builds and deploys

- Source: `index.html` + `src/*.js` (ES modules, bare `three` import).
- The site serves the committed **`docs/`** folder (GitHub Pages "main /docs"),
  which is the output of `npm run build` (Vite, `outDir: docs`, `base: './'`).
- After editing `src/` or `index.html`: run `npm run build` and commit `src/`,
  `index.html` and `docs/` together. The bundle name in `docs/assets/` changes
  each build; Vite clears the old one.
- `python3 -m http.server` on the repo root does **not** run the game (bare
  `three` import). Test the build: `python3 -m http.server 9225 --directory docs`.
- `public/news.json` and `docs/news.json` are rewritten by
  `.github/workflows/update-news.yml`. Leave both alone.

## Things not to rename

- Leaderboard game id `church-street-runner` and the `submit_score`,
  `get_leaderboard`, `rename_player` calls in `src/leaderboard.js`.
- localStorage keys `csr-best`, `csr-char`, `csr-mode`, `csr-news`, `csr-mute`,
  `btown-player-id`, `btown-player-token`, `btown-player-name`.
- Keys added in the Nov 2026 upgrade: `csr-best-dist`, `csr-day`, `csr-streak`,
  `csr-bank`, `csr-far`, `csr-unlocked`, `csr-taught`, `csr-goal`.

## Controls

- Phone: swipe left/right to change lanes, up to jump, down to slide. Swipes
  fire as soon as your finger has moved, and you can chain swipes without
  lifting. Tap anywhere on the game-over screen to run again.
- Keyboard: arrow keys or WASD; Space runs / jumps / restarts.

## How a run works

- **Blocks.** The street is cut into 300 m blocks. Each starts at a cross
  street (coins only for 30 m, a breather), has a theme (Morning Stroll, Lunch
  Rush, Delivery Hour, Dogs Off Leash, Festival, Night Market) and its own time
  of day. Night begins about 1:50 in. After six blocks it loops as Day 2 with
  harder combinations. Speed is `min(28, 10 + 1.5*(block-1) + 1.8*progress)`.
- **Run order.** The middle blocks (Lunch Rush, Delivery Hour, Dogs Off Leash)
  are dealt fresh every run, and block 2 never repeats the last run's.
- **Patterns.** Obstacles come from authored patterns in tiers (`src/course.js`);
  tiers by block are 1, 2, 2, 3, 4, 4, so block 4 (about 900 m) is where rows
  first force a jump or a slide. New players get a gentle 200 m opening with
  the centre lane clear; once you have reached block 3, block 1 opens on a
  walker or solid and mixes tier 2 into every other pattern. Coins trace the safe
  route: a line through the open lane, an arc over a low prop, a low line under
  an orange gate.
- **Hazard colours.** Low props: jump. Tall things and people: go around.
  Safety-orange gates: slide. Cars wait at the crosswalks; they never hit you.
  From golden hour on, the sky and fog carry the colour while the light on the
  street stays near white, and hazards get a small self-light (gates glow
  orange), so the colours mean the same thing at night. Decor that looks like
  a hazard (bikes, boulders, sandwich boards) sits back by the shop fronts.
- **Lives.** Three. The black dog shows up on your first crash and catches you
  on the last.
- **Daily.** The America/New_York date picks one twist (Dog Day, Creemee Day,
  Maple Rush, Festival Day, Night Owl) and one goal that suits it (reach block
  4 or 5, 120 or 200 coins in a run, clear a block without a hit, 3 close calls
  in one run). The goal shows on the title and on the game-over screen until it
  is done, then a stamp. The streak counts days in a row with the goal done;
  at a 3-day streak the ring under your runner turns gold.
- **Goals.** Four starter runners, four more to unlock (reach block 4, reach
  block 6, 500 lifetime coins, finish block 6). Your best distance is chalked
  across the street as a thick cream band with poles and signs, and a
  "BEST in 140 m" countdown runs under the score for the last 200 m.

## Test hooks

`window.__T` (`start()`, `step(ms)`, `state()`, `setDate(str)`) and the older
`window.__csr` (`start`, `step(dt)`, `state`, `score`, `speed`, `lives`,
`coins`, `block`, `blockName`, `patternLog`, `setDate`, `snapshot()`,
`pause()`, `resume()`, plus the managers).

## Code map

| File | What it does |
|---|---|
| `src/main.js` | Scene, loop, HUD, run lifecycle, sky blending, leaderboard UI, test hooks |
| `src/blocks.js` | Block themes, time-of-day table, speed curve, daily plan |
| `src/course.js` | Pattern table, row spawner, coin routes, tutorial rows |
| `src/obstacles.js` | Obstacle types (J/S/G/W/D cells), pooling, collision |
| `src/collectibles.js` | Coins, creemee (flight), magnet |
| `src/chunks.js` | Street scenery chunks; every 14th is a cross street |
| `src/player.js`, `src/characters.js` | Runner rig, runner specs and unlocks |
| `src/input.js` | Swipe-on-move touch input and keyboard |
| `src/audio.js` | WebAudio sound effects |
