import * as THREE from 'three';
import { ChunkManager } from './chunks.js';
import { ObstacleManager } from './obstacles.js';
import { Player } from './player.js';
import { bindInput } from './input.js';
import { makeChurch, makeClouds, updateClouds, updateChurch } from './church.js';
import { makeBrickTexture } from './props.js';
import { AmbientPeople, makeDog, animateDogRun } from './npcs.js';
import { Collectibles } from './collectibles.js';
import { CHARACTERS, getSavedCharacter, saveCharacter } from './characters.js';
import { loadHeadlines, isNewsEnabled, setNewsEnabled, getLatestEdition } from './news.js';
import { sfx, unlock as unlockAudio, isMuted, setMuted } from './audio.js';
import {
  lbEnabled, getName, submitScore, renamePlayer, fetchTop, monthLabel, playerId,
} from './leaderboard.js';

// ------------------------------------------------------------ renderer

const app = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({
  antialias: window.devicePixelRatio < 2,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
app.appendChild(renderer.domElement);

// ------------------------------------------------------------ scene / sky

const SKY = new THREE.Color(0xbdd7e7);
const scene = new THREE.Scene();
scene.background = SKY;
scene.fog = new THREE.Fog(SKY, 35, 130);

const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 400);
camera.position.set(0, 4.6, 7.2);
camera.lookAt(0, 2.2, -20);

// ------------------------------------------------------------ lights

const hemi = new THREE.HemisphereLight(0xcfe4f0, 0x9a7a5c, 0.95);
scene.add(hemi);

// High sun so building shadows stay short and don't smear across the street.
const sun = new THREE.DirectionalLight(0xfff1d6, 1.5);
sun.position.set(-9, 34, -12);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -24;
sun.shadow.camera.right = 24;
sun.shadow.camera.top = 30;
sun.shadow.camera.bottom = -30;
sun.shadow.camera.near = 2;
sun.shadow.camera.far = 110;
sun.shadow.bias = -0.0004;
sun.shadow.camera.updateProjectionMatrix();
sun.target.position.set(0, 0, -18);
scene.add(sun, sun.target);

// ------------------------------------------------------------ ground

const brickTex = makeBrickTexture(256, 256);
const BRICK_WORLD = 6;
brickTex.repeat.set(20 / BRICK_WORLD, 260 / BRICK_WORLD);
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(20, 260),
  new THREE.MeshLambertMaterial({ map: brickTex })
);
ground.rotation.x = -Math.PI / 2;
ground.position.z = -100;
ground.receiveShadow = true;
scene.add(ground);

const stripMat = new THREE.MeshLambertMaterial({ color: 0xb9b2a4 });
for (const x of [-3.4, 3.4]) {
  const strip = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 260), stripMat);
  strip.rotation.x = -Math.PI / 2;
  strip.position.set(x, 0.01, -100);
  strip.receiveShadow = true;
  scene.add(strip);
}

// ------------------------------------------------------------ world

loadHeadlines().then(() => {
  // point the game-over link at the newest edition
  const ed = getLatestEdition();
  const a = document.getElementById('newsletterLink');
  a.href = ed.url;
  a.textContent = `📰 Read "${ed.title}" →`;
});

const chunks = new ChunkManager(scene);
const obstacles = new ObstacleManager(scene);
let character = getSavedCharacter();
const player = new Player(scene, character);
const people = new AmbientPeople(scene, 10);
const collectibles = new Collectibles(scene);

const church = makeChurch();
church.position.set(0, 0, -165);
scene.add(church);
const clouds = makeClouds();
clouds.position.z = -165;
scene.add(clouds);

// the black dog that chases you after your first wipeout
const chaser = makeDog('black');
chaser.scale.setScalar(1.25);
chaser.rotation.y = Math.PI / 2; // dog model faces +x; turn to run up the street after you
chaser.visible = false;
scene.add(chaser);

// ------------------------------------------------------------ game state

const $ = (id) => document.getElementById(id);
const scoreEl = $('score'), bestEl = $('best'), coinsEl = $('coins');
const startPanel = $('start'), overPanel = $('gameover');
const finalScoreEl = $('finalScore'), bestLineEl = $('bestLine'), coinLineEl = $('coinLine');
const powerEl = $('power');

const MODES = {
  easy: { base: 11, accel: 0.42, max: 24 },
  hard: { base: 13.5, accel: 0.75, max: 30 },
};
let modeName = localStorage.getItem('csr-mode') || 'easy';

const COIN_POINTS = 3; // score bonus per coin collected

let state = 'ready'; // ready | running | over
let speed = MODES[modeName].base;
let score = 0;
let coins = 0;
let best = Number(localStorage.getItem('csr-best') || 0);
bestEl.textContent = Math.floor(best);

let lives = 2;
let invuln = 0;
let magnetT = 0;
let shakeT = 0;
let overAt = 0;
let dogLunge = 0;

function startGame() {
  unlockAudio();
  sfx.stopLoops();
  chunks.reset();
  obstacles.reset();
  collectibles.reset();
  people.reset();
  player.reset();
  speed = MODES[modeName].base;
  score = 0;
  coins = 0;
  lives = 2;
  invuln = 0;
  magnetT = 0;
  dogLunge = 0;
  chaser.visible = false;
  state = 'running';
  startPanel.classList.add('hidden');
  overPanel.classList.add('hidden');
  powerEl.textContent = '';
}

function onHit() {
  if (invuln > 0 || player.flying > 0) return;
  lives -= 1;
  shakeT = 0.4;
  sfx.hit();
  if (lives > 0) {
    // first crash: the black dog picks up your scent
    invuln = 2.2;
    player.sliding = 0;
    player.zOffset = -1.4;              // scoot up the street
    chaser.visible = true;
    chaser.position.set(player.x, 0, 2.6);
    sfx.bark();
  } else {
    gameOver();
  }
}

function gameOver() {
  state = 'over';
  sfx.stopLoops();
  if (chaser.visible) sfx.bark();
  sfx.gameover();
  overAt = performance.now();
  dogLunge = chaser.visible ? 0.45 : 0;
  const s = Math.floor(score);
  const isBest = s > best;
  if (isBest) {
    best = s;
    localStorage.setItem('csr-best', String(best));
  }
  finalScoreEl.textContent = s;
  coinLineEl.textContent = `🪙 ${coins} collected · +${coins * COIN_POINTS} pts`;
  bestLineEl.textContent = isBest ? 'NEW BEST!' : `Best: ${Math.floor(best)}`;
  bestLineEl.className = isBest ? 'best-line new-best' : 'best-line';
  bestEl.textContent = Math.floor(best);
  setTimeout(() => overPanel.classList.remove('hidden'), 500);
  updateLeaderboard(s);
}

// ------------------------------------------------------------ leaderboard

const lbBox = $('lb'), lbList = $('lbList'), lbStatus = $('lbStatus');
const lbForm = $('lbForm'), lbNameInput = $('lbNameInput');
const lbThisBtn = $('lbThisBtn'), lbLastBtn = $('lbLastBtn'), lbRenameBtn = $('lbRenameBtn');
let lbMonthOffset = 0;

if (lbEnabled()) {
  lbBox.classList.remove('hidden');
  lbThisBtn.textContent = `🏆 ${monthLabel(0)}`;
  lbLastBtn.textContent = monthLabel(-1);
}

async function updateLeaderboard(s) {
  if (!lbEnabled()) return;
  if (!getName()) {
    // first run: ask for a name before joining the board
    lbForm.classList.remove('hidden');
    lbRenameBtn.classList.add('hidden');
    lbStatus.textContent = 'Pick a name to join the monthly leaderboard!';
    lbList.innerHTML = '';
    lbForm.dataset.pendingScore = String(s);
    return;
  }
  try {
    await submitScore(s);
  } catch { /* offline — still try to show the board */ }
  renderBoard();
}

async function renderBoard() {
  lbForm.classList.add('hidden');
  lbRenameBtn.classList.remove('hidden');
  lbStatus.textContent = 'Loading…';
  try {
    const rows = await fetchTop(lbMonthOffset);
    const me = playerId();
    lbList.innerHTML = '';
    rows.slice(0, 10).forEach((r, i) => {
      const li = document.createElement('li');
      if (r.player_id === me) li.className = 'me';
      const medal = ['🥇', '🥈', '🥉'][i];
      li.innerHTML = `<span class="rank">${medal || i + 1}</span><span class="nm"></span><span class="sc"></span>`;
      li.querySelector('.nm').textContent = r.name;
      li.querySelector('.sc').textContent = r.score;
      lbList.appendChild(li);
    });
    const myRank = rows.findIndex((r) => r.player_id === me);
    lbStatus.textContent = rows.length === 0
      ? 'No scores yet this month — be the first!'
      : myRank >= 0 ? `You're #${myRank + 1} of ${rows.length} this month` : '';
  } catch {
    lbStatus.textContent = 'Leaderboard unavailable (offline?)';
  }
}

$('lbSaveBtn').addEventListener('click', async () => {
  const name = lbNameInput.value.trim();
  if (!name) { lbNameInput.focus(); return; }
  sfx.click();
  const pending = Number(lbForm.dataset.pendingScore || 0);
  lbForm.dataset.pendingScore = '';
  try {
    await renamePlayer(name); // saves locally + updates any existing rows
    if (pending > 0) await submitScore(pending);
  } catch { /* offline */ }
  renderBoard();
});
lbNameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') $('lbSaveBtn').click();
});
lbRenameBtn.addEventListener('click', () => {
  sfx.click();
  lbNameInput.value = getName();
  lbForm.classList.remove('hidden');
  lbRenameBtn.classList.add('hidden');
  lbNameInput.focus();
});
lbThisBtn.addEventListener('click', () => {
  lbMonthOffset = 0;
  lbThisBtn.classList.add('sel');
  lbLastBtn.classList.remove('sel');
  renderBoard();
});
lbLastBtn.addEventListener('click', () => {
  lbMonthOffset = -1;
  lbLastBtn.classList.add('sel');
  lbThisBtn.classList.remove('sel');
  renderBoard();
});

$('startBtn').addEventListener('click', startGame);
$('restartBtn').addEventListener('click', startGame);
// back to the start screen to change runner / difficulty
$('menuBtn').addEventListener('click', () => {
  unlockAudio();
  sfx.click();
  sfx.stopLoops();
  state = 'ready';
  chaser.visible = false;
  player.reset();
  overPanel.classList.add('hidden');
  startPanel.classList.remove('hidden');
});
// sound toggle
const muteBtn = $('muteBtn');
function paintMute() {
  muteBtn.textContent = isMuted() ? '🔇 Sound: Off' : '🔊 Sound: On';
  muteBtn.classList.toggle('sel', !isMuted());
}
paintMute();
muteBtn.addEventListener('click', () => {
  unlockAudio();
  setMuted(!isMuted());
  paintMute();
  if (!isMuted()) sfx.click();
});

// character select
const charRow = $('charRow');
for (const c of CHARACTERS) {
  const b = document.createElement('button');
  b.className = 'chip' + (c.id === character.id ? ' sel' : '');
  b.textContent = `${c.emoji} ${c.name}`;
  b.addEventListener('click', () => {
    character = c;
    saveCharacter(c.id);
    player.setCharacter(c);
    charRow.querySelectorAll('.chip').forEach((x) => x.classList.remove('sel'));
    b.classList.add('sel');
  });
  charRow.appendChild(b);
}
// mode select
for (const mn of ['easy', 'hard']) {
  const b = $(mn + 'Btn');
  b.classList.toggle('sel', modeName === mn);
  b.addEventListener('click', () => {
    modeName = mn;
    localStorage.setItem('csr-mode', mn);
    $('easyBtn').classList.toggle('sel', mn === 'easy');
    $('hardBtn').classList.toggle('sel', mn === 'hard');
  });
}
// news toggle
const newsBtn = $('newsBtn');
function paintNews() {
  newsBtn.textContent = `📰 Local News: ${isNewsEnabled() ? 'On' : 'Off'}`;
  newsBtn.classList.toggle('sel', isNewsEnabled());
}
paintNews();
newsBtn.addEventListener('click', () => {
  setNewsEnabled(!isNewsEnabled());
  paintNews();
  // rebuilt on next full reload; cheap and safe
});

function tryRestart() {
  // spacebar / swipe-up quick restart, with a grace delay so a last-second
  // jump input doesn't skip the score screen
  if (state === 'over' && performance.now() - overAt > 700) startGame();
}

bindInput({
  left: () => { if (state === 'running') player.moveLane(-1); },
  right: () => { if (state === 'running') player.moveLane(1); },
  up: () => {
    if (state === 'running') {
      if (player.grounded && player.flying <= 0) sfx.jump();
      player.jump();
    } else tryRestart();
  },
  down: () => {
    if (state === 'running') {
      if (player.flying <= 0) sfx.slide();
      player.slide();
    }
  },
  anyKey: () => tryRestart(),
});
window.addEventListener('keydown', (e) => {
  if (e.target.closest?.('input, textarea')) return;
  if (e.code === 'Space') tryRestart();
});

// ------------------------------------------------------------ loop

const clock = new THREE.Clock();

function tick() {
  update(Math.min(clock.getDelta(), 0.05), clock.elapsedTime);
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

function update(dt, t) {
  updateClouds(clouds, t);
  updateChurch(church, t);

  if (state === 'running') {
    const mode = MODES[modeName];
    speed = Math.min(mode.max, speed + mode.accel * dt);
    const dz = speed * dt;
    const difficulty = (speed - mode.base) / (mode.max - mode.base);

    chunks.update(dz, dt);
    obstacles.update(dz, dt, t, difficulty);
    people.update(dz, dt, t);
    // capture BEFORE player.update ticks the timer down, or the frame where
    // flight ends is missed and the jetpack loop never stops
    const wasFlying = player.flying > 0;
    player.update(dt, speed);

    brickTex.offset.y += dz / BRICK_WORLD;
    score += dz;
    scoreEl.textContent = Math.floor(score);

    // collectibles + power-ups
    if (magnetT > 0) magnetT -= dt;
    // flying doubles as a magnet: soar over obstacles AND vacuum up coins
    const attract = magnetT > 0 || player.flying > 0;
    const got = collectibles.update(dz, dt, t, player, attract, obstacles);
    for (const it of got) {
      if (it.cfg.power === 'magnet') { magnetT = 7; sfx.magnetPickup(); }
      else if (it.cfg.power === 'fly') { player.startFlight(4.5); sfx.bonus(); sfx.jetpackPickup(); }
      else { coins += it.cfg.value; score += it.cfg.value * COIN_POINTS; sfx.coin(); }
    }
    if (wasFlying && player.flying <= 0) sfx.jetpackEnd();
    if (magnetT <= 0 && magnetT > -dt * 2) sfx.magnetEnd();
    coinsEl.textContent = coins;
    powerEl.textContent =
      player.flying > 0 ? `🍦 ${player.flying.toFixed(1)}s`
      : magnetT > 0 ? `🧲 ${magnetT.toFixed(1)}s` : '';

    // invulnerability blink
    if (invuln > 0) {
      invuln -= dt;
      player.body.visible = Math.floor(t * 12) % 2 === 0;
      if (invuln <= 0) player.body.visible = true;
    }

    // collisions (skip while flying or invulnerable)
    if (invuln <= 0 && player.flying <= 0) {
      const pz = player.zOffset;
      const hit = obstacles.checkCollision(player.x, player.bottom, player.top, 0.32, 0.3, pz)
        || chunks.checkVehicleHit(player.x, player.bottom, player.top, pz);
      if (hit) onHit();
    }

    // the black dog stays on your heels
    if (chaser.visible) {
      chaser.position.x += (player.x - chaser.position.x) * Math.min(1, dt * 8);
      chaser.position.z = player.zOffset + 3.0 + Math.sin(t * 2.2) * 0.35;
      animateDogRun(chaser, t, 11);
    }
  } else if (state === 'ready') {
    player.update(dt, 6);
  } else if (state === 'over' && dogLunge > 0) {
    // the dog catches you
    dogLunge -= dt;
    chaser.position.z += (player.zOffset + 0.4 - chaser.position.z) * Math.min(1, dt * 10);
    animateDogRun(chaser, t, 14);
  }

  // camera
  let cx = player.group.position.x * 0.35;
  let cy = 4.6, cz = 7.2;
  if (state === 'running') {
    cy += Math.sin(t * 9) * 0.03;
    if (player.flying > 0) cy += player.y * 0.35;
  }
  if (shakeT > 0) {
    shakeT -= dt;
    const s = shakeT * 0.5;
    cx += (Math.random() - 0.5) * s;
    cy += (Math.random() - 0.5) * s;
  }
  camera.position.set(cx, cy, cz);
  camera.lookAt(cx * 0.6, 2.2, -20);
}
tick();

// ------------------------------------------------------------ resize

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// debug/test hook: step the simulation manually from the console
window.__csr = {
  start: startGame,
  step: (dt = 1 / 60, t = 0) => update(dt, t),
  get state() { return state; },
  get score() { return Math.floor(score); },
  get speed() { return speed; },
  get lives() { return lives; },
  get coins() { return coins; },
  set mode(mn) { modeName = mn; },
  player, obstacles, chunks, collectibles,
};
