# ADVISOR: Church Street Runner

Creative-director review, 2026-11-16, branch `upgrade-2026-11-16`.
Played as a 390x844 touch phone (real CDP touches): about 15 minutes, 27 runs
across Easy, Hard and the live site. Screenshots and bot scripts are in
`/tmp/upgrade-church-street-runner/`. The branch is identical to live, so every
finding below is the BEFORE state.

## Read this first (how this repo builds and deploys)

- There is no README/AGENTS/CLAUDE file in this repo. Add a short `README.md` as part of this work.
- Source is `index.html` + `src/*.js` (Three.js, ES modules, bare `three` import). The site serves the **committed `docs/` folder** (GitHub Pages "main /docs"), which is the output of `npm run build` (`vite build`, `outDir: docs`, `base: './'`).
- So: this game already has a build step. Do not add another one, do not restructure, do not add dependencies. Edit `src/` and `index.html`, run `npm run build` (node_modules is already installed), and commit `src/` and `docs/` together. The bundle filename hash changes; make sure the old `docs/assets/index-*.js` is gone and `docs/index.html` points at the new one.
- `python3 -m http.server` on the repo root does NOT run the game (bare `three` import). Test against the built output: `python3 -m http.server 9225 --directory docs`.
- `public/news.json` and `docs/news.json` are rewritten by `.github/workflows/update-news.yml`. Leave both files and the workflow alone.
- Do not rename: leaderboard game id `church-street-runner` and the `submit_score` / `get_leaderboard` / `rename_player` calls in `src/leaderboard.js`; localStorage keys `csr-best`, `csr-char`, `csr-mode`, `csr-news`, `btown-player-id`, `btown-player-token`, `btown-player-name`. New features use NEW keys (listed below). Wrap new localStorage access in try/catch.
- Keep the test hook `window.__csr` and extend it (see Acceptance tests).

## Verdict

It is a handsome little 3D street with nothing to do on it. The whole difficulty
curve is spent in the first 31 seconds (Easy) or 22 seconds (Hard); after that
speed, spawn rules and scenery never change again, so second 35 is the game
forever, and most runs end between 15 and 60 seconds anyway. Obstacles are one
random row at a time with a lane always free, so jumping and sliding are never
required and the best strategy is "wiggle sideways". Giant navy news banners
sweep across the top third of the phone every few seconds and look like the
thing you are supposed to duck. Apart from a monthly leaderboard there is no
reason to open it tomorrow: coins buy nothing and no run is different from the last.

## Scores (1-10)

| Area | Score | Why |
|---|---|---|
| Fun | 4 | Pleasant for one run; no decisions, no rhythm, no surprise. |
| Difficulty curve | 3 | 12 dead seconds, then a ramp to top speed by 0:31, then flat forever. A cliff, not a curve. |
| Readability | 4 | Player is dark on dark brick; decor uses the same models as hazards; banners cover the view. |
| Taste / Looks | 5 | The street and steeple are charming. HUD, title and game-over are cluttered. |
| Phone feel | 5 | Swipes only register on finger lift; jump window is tight; side-swiping cars are unfair. |
| Variety | 2 | Minute 3 is pixel-for-pixel minute 1 (compare `local-easy-r0-t5.png` and `pro-easy-r0-t45.png`). |
| Reason to return | 3 | Monthly board only. |

## Evidence from play

| Test | Result |
|---|---|
| Player who never touches the screen, Easy, 3 runs | Survives 21-27 s, scores 391-552. First obstacle contact not before 11 s. |
| Simple reactive bot, Easy, 5 runs | Dies at 16-33 s (scores 252-663). |
| Simple reactive bot, Hard, 6 runs | Dies at 13-20 s (scores 246-503). |
| Strong bot that reads every obstacle position, Easy, 7 runs (local + live) | Dies at 29-78 s. Every death happened at or near the 24 m/s cap. |
| Speed curve from code | Easy: 11 -> 24 m/s at 0.42 m/s^2 = cap at 31 s. Hard: 13.5 -> 30 at 0.75 = cap at 22 s. `difficulty` is derived from speed, so spawn gap and 2-lane rows also max out then. |
| Spawn rules (`obstacles.js spawnRow`) | One row every 12-29 m, 1 or 2 of 3 lanes blocked, each row rolled independently. A lane is always open, so jump and slide are optional forever. |
| Jump fairness | Apex 1.42 m vs obstacles up to 1.05 m tall plus a 0.15 m foot offset: about 0.22 m of clearance and roughly a quarter-second timing window at start speed. |
| Cars | Spawn on a random timer, arrive from off-screen at 10 m/s, cannot be jumped, no warning. Killed the strong bot at 24 m/s. |
| News banners | `pro-easy-r1-t20.png`: two navy bars cover about 30% of the screen including the whole HUD. `both-hard-r0-over.png`: a real headline about a cyclist killed in a crosswalk, shown over a crosswalk in a game where cars hit you. `local-easy-r0-t5.png`: junk item "Sunday: Sunday". |
| Load | `window.__csr` ready in 0.8-1.3 s at 4x CPU throttle on wifi. The audit's 4.8 s was not reproduced; the cost is the 598 KB bundle (156 KB gzipped) on cellular. |

## Ranked upgrade plan

### 1. Blocks: the street becomes a trip, and each block changes the rules

**Evidence:** speed, hazards, sky and scenery are identical from 0:31 onward.

**Change:** divide the run into blocks. A block is 14 chunks (420 m). Every 14th
recycled chunk is forced to be the cross-street chunk (`chunkIntersection`), and
it is removed from the random pool; the block number ticks up when the player
crosses it. Each block has a theme that sets the hazard mix, the pattern tier
(item 2), the scenery bias and the time of day.

| Block | Name | What is new | Sky |
|---|---|---|---|
| 1 | Morning Stroll | Low props only (jump kind). One lane blocked per row. | Pale morning (current look) |
| 2 | Lunch Rush | Walkers, dog walkers, patio tables. Two-lane rows. | Bright noon |
| 3 | Delivery Hour | Dollies, box stacks, slide gates. First rows that force a jump or slide. | Warm afternoon |
| 4 | Dogs Off Leash | Wandering dogs in twos and threes (today there is one rare dog). | Golden hour |
| 5 | Festival | Bunting, gate sequences, twice the coin lines, one guaranteed creemee flight. A reward block. | Sunset |
| 6 | Night Market | Full mix. Lamps and windows glow. | Night |

After block 6 the list loops as "Day 2" one pattern tier higher.

- **Speed (replaces Easy/Hard):** `speed = min(28, 10 + 2*(block-1) + 2.5*progressInBlock)`, dropping back 0.5 m/s at each new block. That reaches the old 24 m/s cap around block 7 (about 2.7 minutes) instead of at 31 seconds.
- **Breather:** the first 30 m after each cross street has coins only, no hazards. Tension builds across the block and releases at the corner.
- **Block card:** on crossing, a small card under the score slides in for 1.6 s: "BLOCK 3 · DELIVERY HOUR", with a soft whoosh and a +50 bonus pop.
- **Time of day:** a 6-row table of `scene.background`, fog colour, sun colour and intensity, hemisphere intensity. Lerp to the next row over the 30 m breather. Night: sun 0.35, hemi 0.45, sky `#1b2440`, lamp bulbs and a few window panes switch to an emissive material.
- **Scenery bias:** weight the chunk pick by theme (construction chunk x3 in Delivery Hour, park and trees x3 in Dogs Off Leash, festival x3 in Festival, patio x3 in Lunch Rush). Bias only; never block on a chunk being unavailable.
- **First 10 seconds:** first coin line at 15 m, first obstacle at 45 m (today the first obstacle is 140 m out, about 12 seconds of empty road).

**Check:** `__csr.block` reads 1 at start and 2 after 420 m. Screenshots at 5 s, 60 s and 120 s must be obviously different pictures (sky colour and hazard types). `__csr.speed` at 31 s is under 13.

### 2. Authored patterns instead of random rows

**Evidence:** every row is an independent dice roll with a free lane, so there is
no rhythm and two of the three moves are decoration.

**Change:** replace `spawnRow`'s random roll with a pattern queue. A pattern is 1-4
rows; each row is three cells (left, centre, right) from: empty, `J` low prop,
`S` tall solid, `G` slide gate, `W` walker, `D` wandering dog. Row spacing inside a
pattern is `max(11, speed * 0.8)` metres; spacing between patterns is
`max(16, speed * 1.3)`. Mirror left/right at random. Pick the model for each
cell at random from the existing types of that kind, limited by the block theme.

| Tier | Unlocks | Patterns |
|---|---|---|
| 1 | Block 1 | Single `J..` · Pair `J.J` · Hop line: three `J` in one lane with a coin arc over each |
| 2 | Block 2 | Slalom `S..` / `..S` / `S..` · Split `S.S` then `.S.` · Walker pair `W.W` |
| 3 | Block 3 | Hurdle wall `SJS` (must jump) · Limbo `SGS` (must slide) · Full gate `GGG` · Step `J..` / `.S.` / `..J` |
| 4 | Block 4 | Dog pack `DD.` · Zipper `SS.` / `.SS` / `SS.` · Hop-then-duck: `SJS` then `SGS` |
| 5 | Day 2 | Any two tier 3-4 patterns back to back with the shorter spacing |

- A block draws 60% from its own tier and 40% from lower tiers. Never repeat the same pattern twice in a row.
- **Coins trace the safe route.** Replace the independent coin spawner's lane pick with the pattern's solution lane: a line through the open lane, an arc (y from 1.05 up to 2.1 and back) over a `J`, a low line (y 0.6) under a `G`. Coins teach the move without any text.
- Keep the existing rule that the second obstacle in a row is escapable for tiers 1-2.

**Check:** add `__csr.patternLog` (names in spawn order). In a 3-block run it must
contain at least 8 distinct names and at least one forced-jump and one
forced-slide pattern after block 3. A bot that only changes lanes must die in
block 3; a bot that also jumps and slides must be able to reach block 4.

### 3. Make every hit feel like the player's fault

**Evidence:** swipes fire on `touchend`; tight jump clearance; unwarned cars; decor
that looks like hazards.

**Change:**
- **Swipe on move.** In `input.js`, fire the action on `touchmove` as soon as travel passes 24 px, then re-anchor the start point so a second swipe works without lifting the finger. Keep tap-to-restart on `touchend`.
- **Jump:** `JUMP_V` 8.6 -> 9.4 (apex about 1.70 m, airtime about 0.72 s). Cap the collision `maxY` of every jump-kind obstacle at 0.8 (models unchanged).
- **Jump buffer:** a swipe up within 0.12 s before landing jumps on landing.
- **Slide:** `SLIDE_TIME` 0.62 -> 0.75.
- **Hitboxes:** player half-width 0.32 -> 0.26; pedestrian `half.x` 0.42 -> 0.36. Near-miss detection keeps its current wider box.
- **Cars stop being a hazard.** Cross streets are now the block gate and the breather. Cars wait at the crosswalk as scenery (one each side, stopped behind the stripes). Delete `checkVehicleHit` use from the collision step.
- **Lives:** 2 -> 3, shown as three pips. The dog still appears on the first hit and catches you on the last.
- **Gates:** recolour the slide gate from navy to safety orange with a white stripe, so "duck" has one colour and nothing else on the street shares it.

**Check:** with real CDP touches, a swipe registers before `touchEnd` is sent.
Jumping 0.15 s early or late over a sandwich board both clear it at 10 m/s.
An untouched player still loses (the game is not trivial) but not before 20 s.

### 4. Clear the view (subtraction)

**Evidence:** banner screenshots above; player shirt `#2f6b4f` on dark red brick;
horizon sits at 49% of the screen so the top half is sky; bikes, benches, trash
cans, news boxes, boulders and sawhorses appear both as sidewalk decor and as
in-lane hazards (`pro-easy-r0-t45.png`).

**Change:**
- **Remove all over-street news banners** (`addNewsBanner` calls and the festival banner). Headlines move to the shared ticker: add `<script src="https://play.btownbrief.com/ticker.js" defer></script>` to `index.html` (this page does not have it yet), call `window.BtownTicker?.hide()` in `startGame` and `.show()` on the title and game-over screens. Keep the game-over "Read the latest Btown Brief" link.
- **Camera for portrait:** move to about `(0, 6.4, 8.2)` looking at `(0, 0.6, -13)`, fov 62 when the viewport is taller than wide. Target: horizon between 24% and 30% from the top, player about 14% of screen height with feet near 84%. Tune with screenshots. Keep the flight camera lift.
- **Player pop:** a cream ground ring under the runner (radius 0.9 m, 35% opacity) and a small emissive lift (`0x222222`) on the player materials, so the runner is the brightest thing on screen.
- **Lane vs sidewalk:** darken the brick outside the two grey strips to about 72% and push `DECOR_X` from 5.4 to 6.4. Cut ambient sidewalk walkers from 10 to 4.
- **HUD:** score as a large bare number top-left with the block name in small caps under it; three life pips beside it; coin count small top-right. Remove the Best badge and the empty power badge (show a power timer bar at top centre only while flight or magnet is active). Shrink the mute button to 36 px at 60% opacity and move it to the top-right under the coin count, out of the swipe zone.

**Check:** one-second test on five random gameplay screenshots: point to the
runner, every hazard and the open lane. No element other than the HUD overlaps
the top 20% of the screen. No navy bars anywhere.

### 5. Today on Church Street (daily reason to return)

**Evidence:** nothing differs between today and tomorrow.

**Change:** seed a small PRNG (mulberry32) from the America/New_York date
(`YYYY-MM-DD`). The seed picks which theme follows block 1 (the block order
rotates daily) and one daily twist, shown on the title as one line,
"TODAY · DOG DAY":

| Twist | Effect |
|---|---|
| Dog Day | Half of all low props become dogs; block 4 comes second. |
| Creemee Day | One guaranteed creemee flight in every block. |
| Maple Rush | Twice as many coin lines. |
| Festival Day | Festival is block 2; bunting in every block. |
| Night Owl | The run starts at night and works backward to morning. |

Obstacle details stay random per run, so the day has a flavour without being memorisable.

- **Streak:** new key `csr-streak` = `{last:'YYYY-MM-DD', n}`. Playing on consecutive days increments it. Title shows "3-day streak" from 2 upward.
- **Today's best:** new key `csr-day` = `{date, best}`. Title shows "Today 1,240 · Best 2,010".
- No leaderboard change: scores keep going to `church-street-runner` monthly.

**Check:** override the date in the test hook (`__csr.setDate('2026-11-17')`): the
title line and block order change; same date gives the same twist twice. Streak
goes 1 -> 2 across consecutive dates and resets after a gap.

### 6. Coins and distance unlock runners; game over shows one next goal

**Evidence:** coins are worth 3 points and nothing else; four runners, all free.

**Change:** keep Sam, June, Marcus and Brook free. Add four runners as data-only
specs in `characters.js` (the rig already supports hats, jackets, bags, hair):

| Runner | Unlock |
|---|---|
| The Busker | Reach block 3 |
| The Mail Carrier | Reach block 5 |
| The Chef | 500 lifetime coins |
| The Night Owl | Finish block 6 |

New keys: `csr-bank` (lifetime coins), `csr-far` (farthest block), `csr-unlocked`
(array of ids). Locked chips show a lock and, on tap, the requirement. The
game-over screen shows exactly one line with a thin progress bar for the
nearest locked goal: "Next: The Busker · reach Block 3 (you reached Block 2)".
On unlock: a callout during the run and a "NEW RUNNER" card on game over.

**Check:** set `csr-bank` to 499, collect one coin, die: the Chef unlocks and is
selectable; reload keeps it. Existing `csr-char` values still load.

### 7. Personal-best line on the street

**Evidence:** the only best-score feedback is a number in the HUD and a line after death.

**Change:** store best distance in a new key `csr-best-dist` (metres, separate from
`csr-best`, which includes coin points). Draw a chalk line across the three
lanes at that distance with "BEST 1,255" lettered on the ground, visible from
about 120 m out. Crossing it fires the "NEW BEST!" callout, the best sound and
a confetti burst, mid-run. Draw a thinner "TODAY" line the same way when it differs.

**Check:** run 1 dies at about 300 m; in run 2 the line is visible approaching
300 m and the callout fires on crossing.

### 8. Title and game-over: one decision each

**Evidence:** the title has 4 runner chips, 3 mode chips, a 3-line instruction box
and the RUN button over a busy scene; game over stacks title, score, best,
coins, month tabs, name form, RUN AGAIN, change-runner, newsletter link and
"press Space", and the banner collides with the text (`local-easy-r0-over.png`).

**Change:**
- **Title:** logo, the "TODAY" line, best/streak line, runner row (one horizontal scrolling row of chips), a big RUN button in the thumb zone. Remove the Easy/Hard chips, the Local News chip and the tips box. Keep reading `csr-mode` and `csr-news` harmlessly; do not delete them.
- **Teach by doing:** on the first run only (new key `csr-taught`), the first three obstacles are scripted: a low prop in your lane with a ghost arrow and "SWIPE UP", a walker with "SWIPE SIDEWAYS", a gate with "SWIPE DOWN". Arrows fade as soon as the move is made.
- **Game over:** "THE DOG GOT YOU!" smaller, score big, "Block 4 · Best 2,010", the one next-goal line, RUN AGAIN large in the lower third. The leaderboard collapses to one tappable row ("You're #4 in November") that expands the existing board and tabs; the name form appears inside the expanded board, not on top of the retry button. Hide "press Space" on touch devices. Tap-anywhere-to-retry after 700 ms stays.

**Check:** title-to-running is one tap. Game-over screenshot at 390x844 has at
most six text elements above the fold and RUN AGAIN sits between 60% and 80% of
screen height. Submitting a name still posts the pending score.

### 9. Small polish

- Pause on `visibilitychange` (stop the jetpack loop too) and resume with a 3-2-1.
- Size the renderer on orientation change, not on every `resize`, so the Safari toolbar does not re-layout mid-run.
- `navigator.vibrate?.(20)` on a hit, `(8)` on a near miss.
- Add `<link rel="modulepreload">` for the bundle. Build the 7 visible chunks first and the spare chunks in idle time so RUN is live sooner on slow phones.
- Monthly leaderboard note for Stephen: the gentler speed curve changes how fast scores accumulate, so November's board will mix old and new runs.

## Remove list

- Over-street news banners and the Local News toggle (ticker replaces them).
- Easy/Hard mode picker (one tuned curve).
- Moving cars as a hazard.
- The Best badge and the empty power badge in the HUD.
- The instructions box on the title; "press Space" on touch.
- Six of the ten ambient sidewalk walkers.
- Navy as a colour on anything in the play field.

## Keep list

- The steeple at the end of the street, the brick, the low-poly storefronts and landmarks.
- The black dog: appears on the first crash, catches you on the last. It is the game's identity.
- Creemee flight and the magnet, with their sounds.
- Near-miss "CLOSE ONE!" streak, coin sparkle, crash debris and the new-best confetti.
- Four distinct runners and the saved choice.
- Monthly leaderboard, shared `btown-*` identity, game id `church-street-runner`.
- The newsletter link on game over and the GoatCounter tag.
- Tap-anywhere / Space quick retry with the 700 ms grace delay.

## Acceptance tests

Run against the built `docs/` at 390x844, touch emulation, real CDP touches.

1. **Build:** `npm run build` succeeds; `docs/index.html` references the new bundle; no console errors on load, during a run, or on game over.
2. **Extended hook:** `window.__csr` also exposes `block`, `blockName`, `patternLog`, `setDate(str)`, and keeps `start`, `step`, `state`, `score`, `speed`, `lives`, `coins`.
3. **First 10 seconds:** a coin is collected or an obstacle is on screen within 3 s of tapping RUN; first obstacle reaches the player between 4 and 6 s.
4. **Curve:** speed at 31 s is under 13 m/s; 24 m/s is not reached before block 7.
5. **Idle player:** dies, but not before 20 s.
6. **Lane-only bot:** cannot pass block 3. **Full-move bot:** reaches block 4 in at least 3 of 5 runs.
7. **Variety:** screenshots at 5 s, 60 s and 120 s differ in sky colour and hazard types; a 3-block run logs 8 or more distinct patterns.
8. **Readability:** no navy bars; nothing but HUD in the top 20% of the screen; runner is visibly the brightest object in five random gameplay shots.
9. **Input:** swipe registers before finger lift; two swipes in one touch give two moves; a swipe that starts on the mute button does nothing in the game; two fingers at once do not break lane state.
10. **Daily:** same date gives the same twist; next date changes it; streak counts up and resets.
11. **Saves:** a browser with existing `csr-best`, `csr-char` and `btown-player-*` values keeps its best score, runner and leaderboard name after the update.
12. **Leaderboard:** a finished run posts to `submit_score` with `p_game: 'church-street-runner'` and the board renders.
13. **Ticker:** hidden while running, visible on the title and game-over screens.
14. **One-tap retry:** from game over, one tap starts a new run after the 700 ms grace.
