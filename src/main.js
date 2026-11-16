import * as THREE from 'three';
import { ChunkManager, CHUNK_LEN } from './chunks.js';
import { ObstacleManager, setHazardGlow } from './obstacles.js';
import { Course } from './course.js';
import { Player, setPlayerGlow } from './player.js';
import { bindInput } from './input.js';
import { makeChurch, makeClouds, updateClouds, updateChurch } from './church.js';
import { makeBrickTexture, MAT } from './props.js';
import { AmbientPeople, makeDog, animateDogRun } from './npcs.js';
import { Collectibles } from './collectibles.js';
import {
  CHARACTERS, getSavedCharacter, saveCharacter, loadProgress, saveProgress,
  isUnlocked, meetsUnlock, unlockProgress,
} from './characters.js';
import { loadHeadlines, getLatestEdition } from './news.js';
import { sfx, unlock as unlockAudio, isMuted, setMuted } from './audio.js';
import {
  lbEnabled, getName, submitScore, renamePlayer, fetchTop, monthLabel, playerId,
} from './leaderboard.js';
import {
  BLOCK_LEN, blockAt, blockInfo, speedAt, dailyPlan, runOrder, nyDate, dayDiff,
} from './blocks.js';

// ------------------------------------------------------------ storage

function lsGet(key) { try { return localStorage.getItem(key); } catch { return null; } }
function lsSet(key, v) { try { localStorage.setItem(key, v); } catch { /* blocked */ } }
function lsJSON(key, fallback) {
  try { const v = JSON.parse(lsGet(key)); return v && typeof v === 'object' ? v : fallback; } catch { return fallback; }
}

// ------------------------------------------------------------ renderer

const app = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({
  antialias: window.devicePixelRatio < 2,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
app.appendChild(renderer.domElement);

// ------------------------------------------------------------ scene / sky

const scene = new THREE.Scene();
const skyColor = new THREE.Color(0xbdd7e7);
scene.background = skyColor;
scene.fog = new THREE.Fog(skyColor.clone(), 35, 130);

const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 400);

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
// the sidewalks outside the grey strips sit about 28% darker, so the three
// lanes read as the play field
const shadeMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false });
for (const side of [-1, 1]) {
  const shade = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 260), shadeMat);
  shade.rotation.x = -Math.PI / 2;
  shade.position.set(side * (3.65 + 3.2), 0.008, -100);
  scene.add(shade);
}

// ------------------------------------------------------------ world

loadHeadlines().then(() => {
  // point the game-over link at the newest edition
  const ed = getLatestEdition();
  const a = document.getElementById('newsletterLink');
  a.href = ed.url;
  a.textContent = `📰 Read "${ed.title}" →`;
}).catch(() => {});

const progress = loadProgress();
const chunks = new ChunkManager(scene);
const obstacles = new ObstacleManager(scene);
const collectibles = new Collectibles(scene);
const course = new Course(obstacles, collectibles);
let character = getSavedCharacter(progress);
const player = new Player(scene, character);
const people = new AmbientPeople(scene, 4);

const church = makeChurch();
church.position.set(0, 0, -165);
scene.add(church);
const clouds = makeClouds();
clouds.position.z = -165;
scene.add(clouds);
let cloudMat = null;
clouds.traverse((o) => { if (o.isMesh && !cloudMat) cloudMat = o.material; });

// the black dog that chases you after your first wipeout
const chaser = makeDog('black');
chaser.scale.setScalar(1.25);
chaser.rotation.y = Math.PI / 2; // dog model faces +x; turn to run up the street after you
chaser.visible = false;
scene.add(chaser);

// ------------------------------------------------------------ personal-best lines on the street

// A chalk line across the street at a distance you reached before, with a
// pole and a small sign on each grey strip so you can see it coming.
function makeChalkLine(label, strong) {
  const ink = strong ? '#8dffaa' : '#fff3d6';
  const group = new THREE.Group();
  group.visible = false;

  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  // fog-free, so the line reads from 100 m out
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(strong ? 7.4 : 6.8, strong ? 4.6 : 3.4),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, fog: !strong })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0.025;
  ground.renderOrder = 1;
  group.add(ground);

  const sc = document.createElement('canvas');
  sc.width = 256; sc.height = 96;
  const sg = sc.getContext('2d');
  const stex = new THREE.CanvasTexture(sc);
  stex.colorSpace = THREE.SRGBColorSpace;
  const poleMat = new THREE.MeshLambertMaterial({ color: 0xf4efe4, emissive: 0x333333 });
  for (const side of [-1, 1]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 2.6, 8), poleMat);
    pole.position.set(side * 3.4, 1.3, 0);
    group.add(pole);
    const sign = new THREE.Sprite(new THREE.SpriteMaterial({ map: stex, transparent: true, depthWrite: false, fog: !strong }));
    sign.scale.set(strong ? 2.3 : 1.9, strong ? 0.86 : 0.71, 1);
    sign.position.set(side * 3.4, 2.95, 0);
    group.add(sign);
  }

  group.userData.draw = (value) => {
    const text = `${label} ${value.toLocaleString('en-US')}`;
    g.clearRect(0, 0, 512, 256);
    g.fillStyle = strong ? 'rgba(255,250,235,0.97)' : 'rgba(255,250,235,0.75)';
    // a slightly wobbly chalk stripe across all three lanes; the best line is
    // a thick full-width band
    const th = strong ? 44 : 12;
    const top = strong ? 200 : 212;
    g.beginPath();
    g.moveTo(2, top + 2);
    for (let x = 2; x <= 510; x += 20) g.lineTo(x, top + Math.sin(x * 0.07) * 3);
    for (let x = 510; x >= 2; x -= 20) g.lineTo(x, top + th + Math.sin(x * 0.05) * 2);
    g.closePath();
    g.fill();
    g.font = `900 ${strong ? 150 : 92}px "Avenir Next", system-ui, sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'alphabetic';
    if (strong) {
      g.lineWidth = 10;
      g.strokeStyle = 'rgba(36,22,16,0.55)';
      g.strokeText(text, 256, 178, 504);
    }
    g.fillText(text, 256, 178, 504);
    tex.needsUpdate = true;

    sg.clearRect(0, 0, 256, 96);
    sg.fillStyle = 'rgba(36,22,16,0.82)';
    sg.beginPath();
    sg.roundRect(4, 8, 248, 80, 40);
    sg.fill();
    sg.fillStyle = ink;
    sg.font = '900 40px "Avenir Next", system-ui, sans-serif';
    sg.textAlign = 'center';
    sg.textBaseline = 'middle';
    sg.fillText(text, 128, 50, 230);
    stex.needsUpdate = true;
  };
  scene.add(group);
  return group;
}
const bestLineMesh = makeChalkLine('BEST', true);
const todayLineMesh = makeChalkLine('TODAY', false);

// ------------------------------------------------------------ DOM

const $ = (id) => document.getElementById(id);
const scoreEl = $('score'), coinsEl = $('coins'), pipsEl = $('pips');
const blockNameEl = $('blockName'), blockCardEl = $('blockCard'), hudEl = $('hud');
const powerBarEl = $('powerBar'), powerIconEl = $('powerIcon'), powerFillEl = $('powerFill');
const startPanel = $('start'), overPanel = $('gameover');
const finalScoreEl = $('finalScore'), bestLineEl = $('bestLine'), overTitleEl = $('overTitle');
const goalSubEl = $('goalSub'), goalTextEl = $('goalText'), goalFillEl = $('goalFill'), newRunnerEl = $('newRunner');
const effectsEl = $('effects'), impactFlashEl = $('impactFlash'), calloutEl = $('callout');
const teachEl = $('teach'), teachArrowEl = $('teachArrow'), teachTextEl = $('teachText');
const countdownEl = $('countdown');
const pbCountEl = $('pbCount');
const bestConfettiEl = $('bestConfetti');
const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
if ('ontouchstart' in window || window.matchMedia('(pointer: coarse)').matches) document.body.classList.add('touch');
// the shared news ticker: tucked away during play, back on the menus
const ticker = {
  hide: () => { try { window.BtownTicker?.hide?.(); } catch { /* not loaded */ } },
  show: () => { try { window.BtownTicker?.show?.(); } catch { /* not loaded */ } },
};

// ------------------------------------------------------------ game state

const COIN_POINTS = 3;   // score bonus per coin collected
const BLOCK_BONUS = 50;  // score bonus for reaching each new block
const MAX_LIVES = 3;
const MAGNET_TIME = 7;
const FLY_TIME = 4.5;

let state = 'ready'; // ready | running | paused | over
let dateOverride = null;
let today = nyDate();
let plan = dailyPlan(today);
let speed = speedAt(0);
let dist = 0;
let score = 0;
let coins = 0;
let best = Number(lsGet('csr-best') || 0) || 0;
let bestDist = Number(lsGet('csr-best-dist') || 0) || 0;
let block = 1;
let lives = MAX_LIVES;
let invuln = 0;
let magnetT = 0;
let shakeT = 0;
let overAt = 0;
let dogLunge = 0;
let nearMissStreak = 0;
let coinChain = 0, coinChainT = 0;
let nearCandidates = new Map();
let passedNearMisses = new Set();
let effectRunId = 0;
let liveParticles = 0;
let calloutToken = 0;
let scorePopToken = 0;
let impactToken = 0;
let runStartBestDist = 0;
let pbFired = false;
let runUnlocked = [];
let teaching = false;
let teachShown = null;   // obstacle slot whose hint is on screen
let teachSeen = 0;
let countdownT = 0;
let hitStop = 0;      // a few frames of freeze on impact
let runGoal = null;   // today's goal, tracked during the run
let goalProg = 0;
let goalDoneRun = false;
let hitThisBlock = false;
let pbCountShown = '';
const effectTimers = new Set();
const MAX_PARTICLES = 40;

function dayRecord() {
  const r = lsJSON('csr-day', null);
  return r && r.date === today ? r : { date: today, best: 0, dist: 0 };
}
// The streak counts days in a row on which the daily goal was done
// (csr-streak: { last: date of the last goal done, n }).
function streakNow() {
  const s = lsJSON('csr-streak', null);
  if (!s || !s.last) return 0;
  const gap = dayDiff(s.last, today);
  return gap >= 0 && gap <= 1 ? s.n || 0 : 0;
}
// today's goal record (csr-goal: { date, id, done, best })
function goalRecord() {
  const r = lsJSON('csr-goal', null);
  const g = dailyPlan(today).goal;
  return r && r.date === today && r.id === g.id ? r : { date: today, id: g.id, done: false, best: 0 };
}
const GOLD_STREAK = 3;
function paintRing() {
  // a gold ring under the runner after a 3-day goal streak
  const gold = streakNow() >= GOLD_STREAK;
  player.ring.material.color.setHex(gold ? 0xffc94a : 0xfff3d6);
  player.ring.userData.gold = gold;
}
function bumpStreak() {
  const s = lsJSON('csr-streak', null);
  if (!s || !s.last) { lsSet('csr-streak', JSON.stringify({ last: today, n: 1 })); return; }
  if (s.last === today) return;
  const gap = dayDiff(s.last, today);
  lsSet('csr-streak', JSON.stringify({ last: today, n: gap === 1 ? (s.n || 0) + 1 : 1 }));
}

function later(fn, delay) {
  const id = effectRunId;
  const timer = window.setTimeout(() => {
    effectTimers.delete(timer);
    if (id === effectRunId) fn();
  }, delay);
  effectTimers.add(timer);
}

function clearRunEffects() {
  effectRunId += 1;
  for (const timer of effectTimers) window.clearTimeout(timer);
  effectTimers.clear();
  effectsEl.querySelectorAll('.transient-effect').forEach((node) => node.remove());
  bestConfettiEl.replaceChildren();
  liveParticles = 0;
  calloutToken += 1;
  scorePopToken += 1;
  impactToken += 1;
  calloutEl.classList.remove('active', 'big');
  calloutEl.textContent = '';
  impactFlashEl.classList.remove('active');
  scoreEl.classList.remove('score-pop');
  pipsEl.classList.remove('hit');
  bestLineEl.classList.remove('fanfare');
  blockCardEl.classList.remove('show');
  hudEl.classList.remove('carding');
  teachEl.classList.remove('on');
  countdownEl.classList.remove('on');
  nearCandidates = new Map();
  passedNearMisses = new Set();
}

function screenPoint(position) {
  const point = position.clone().project(camera);
  return {
    x: (point.x * 0.5 + 0.5) * window.innerWidth,
    y: (-point.y * 0.5 + 0.5) * window.innerHeight,
  };
}

function spawnParticle(container, className, x, y, duration, styles = {}, text = '', allowReducedMotion = false) {
  if ((motionQuery.matches && !allowReducedMotion) || liveParticles >= MAX_PARTICLES) return;
  const node = document.createElement('span');
  node.className = `particle transient-effect ${className}`;
  node.textContent = text;
  node.setAttribute('aria-hidden', 'true');
  node.style.setProperty('--x', typeof x === 'number' ? `${x}px` : x);
  node.style.setProperty('--y', typeof y === 'number' ? `${y}px` : y);
  for (const [name, value] of Object.entries(styles)) node.style.setProperty(name, value);
  container.appendChild(node);
  liveParticles += 1;
  later(() => {
    if (!node.isConnected) return;
    node.remove();
    liveParticles = Math.max(0, liveParticles - 1);
  }, duration);
}

function buzz(ms) {
  try { navigator.vibrate?.(ms); } catch { /* not supported */ }
}

function popScore() {
  const token = ++scorePopToken;
  scoreEl.classList.remove('score-pop');
  void scoreEl.offsetWidth;
  scoreEl.classList.add('score-pop');
  later(() => {
    if (token === scorePopToken) scoreEl.classList.remove('score-pop');
  }, 220);
}

function showCallout(text, big = false) {
  const token = ++calloutToken;
  calloutEl.textContent = text;
  calloutEl.classList.remove('active', 'big');
  void calloutEl.offsetWidth;
  calloutEl.classList.toggle('big', big);
  calloutEl.classList.add('active');
  later(() => {
    if (token !== calloutToken) return;
    calloutEl.classList.remove('active', 'big');
    calloutEl.textContent = '';
  }, big ? 1650 : 950);
}

function showCoinPickup(points, position) {
  const { x, y } = screenPoint(position);
  spawnParticle(effectsEl, 'float-score', x, y - 12, 420, {}, `+${points}`, true);
  const offsets = [[-24, -20], [22, -24], [-18, 20], [24, 16]];
  for (const [dx, dy] of offsets) {
    spawnParticle(effectsEl, 'sparkle', x, y, 300, { '--dx': `${dx}px`, '--dy': `${dy}px` }, '✦');
  }
  popScore();
}

function paintPips(hit = false) {
  [...pipsEl.children].forEach((pip, i) => pip.classList.toggle('lost', i >= lives));
  if (hit) {
    pipsEl.classList.remove('hit');
    void pipsEl.offsetWidth;
    pipsEl.classList.add('hit');
  }
}

function showCrashImpact() {
  const token = ++impactToken;
  impactFlashEl.classList.remove('active');
  paintPips(true);
  if (!motionQuery.matches) impactFlashEl.classList.add('active');
  later(() => {
    if (token !== impactToken) return;
    impactFlashEl.classList.remove('active');
  }, 160);
  later(() => {
    if (token !== impactToken) return;
    pipsEl.classList.remove('hit');
  }, 440);

  const { x, y } = screenPoint(new THREE.Vector3(player.x, player.y + 0.9, player.zOffset));
  const colors = ['#8a4f2c', '#d6b58b', '#5b4336'];
  for (let i = 0; i < 10; i++) {
    spawnParticle(effectsEl, 'debris', x, y, 500, {
      '--dx': `${Math.round((Math.random() - 0.5) * 110)}px`,
      '--dy': `${Math.round(-25 - Math.random() * 70)}px`,
      '--rot': `${Math.round((Math.random() - 0.5) * 480)}deg`,
      '--color': colors[i % colors.length],
    });
  }
}

function confettiBurst(container) {
  const colors = ['#c9502f', '#ffe8c9', '#7dff9b', '#e8b23a'];
  for (let i = 0; i < 24; i++) {
    spawnParticle(container, 'confetti', `${5 + Math.random() * 90}%`, `${Math.random() * 12}%`, 1200, {
      '--dx': `${Math.round((Math.random() - 0.5) * 120)}px`,
      '--dy': `${Math.round(window.innerHeight * (0.55 + Math.random() * 0.35))}px`,
      '--rot': `${Math.round((Math.random() - 0.5) * 900)}deg`,
      '--color': colors[i % colors.length],
    });
  }
}

function confirmNearMiss() {
  nearMissStreak = Math.min(3, nearMissStreak + 1);
  const bonus = nearMissStreak * 5;
  score += bonus;
  scoreEl.textContent = Math.floor(score);
  popScore();
  showCallout(`CLOSE ONE! +${bonus} · ×${nearMissStreak}`);
  advanceGoal('close', nearMissStreak);
  sfx.nearMiss();
  buzz(8);
}

function updateNearMisses(pz) {
  for (const obstacle of passedNearMisses) {
    if (!obstacle.active) passedNearMisses.delete(obstacle);
  }
  for (const [obstacle, id] of nearCandidates) {
    if (id !== effectRunId || !obstacle.active) {
      nearCandidates.delete(obstacle);
      continue;
    }
    const subClearance = obstacle.type.sub?.map((part) => part.half.z + 0.52 - part.dz) || [];
    const clearance = Math.max(obstacle.type.half.z + 0.52, ...subClearance);
    if (obstacle.obj.position.z - pz > clearance) {
      nearCandidates.delete(obstacle);
      passedNearMisses.add(obstacle);
      confirmNearMiss();
    }
  }
}

// ------------------------------------------------------------ blocks, sky, time of day

const cTmp = new THREE.Color();
const glassEmissive = new THREE.Color(0x4a3614);
function mixHex(a, b, t, out) { return out.set(a).lerp(cTmp.set(b), t); }
function smooth(t) { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); }

// sky for a distance: blends across the 60 m around each cross street
function applySky(d) {
  const b = blockAt(d);
  const into = d - (b - 1) * BLOCK_LEN;
  let from = blockInfo(plan, b).sky, to = from, t = 0;
  if (into < 30 && b > 1) { from = blockInfo(plan, b - 1).sky; t = smooth(0.5 + into / 60); }
  else if (BLOCK_LEN - into < 30) { to = blockInfo(plan, b + 1).sky; t = smooth(0.5 - (BLOCK_LEN - into) / 60); }
  const lerp = (k) => from[k] + (to[k] - from[k]) * t;
  mixHex(from.sky, to.sky, t, skyColor);
  scene.fog.color.copy(skyColor);
  mixHex(from.sun, to.sun, t, sun.color);
  sun.intensity = lerp('sunI');
  mixHex(from.hemiSky, to.hemiSky, t, hemi.color);
  mixHex(from.hemiGround, to.hemiGround, t, hemi.groundColor);
  hemi.intensity = lerp('hemiI');
  if (cloudMat) mixHex(from.cloud, to.cloud, t, cloudMat.color);
  const glow = lerp('glow');
  MAT.lampGlow.emissiveIntensity = 0.9 + glow * 1.6;
  MAT.interiorGlow.emissiveIntensity = 0.55 + glow * 1.0;
  MAT.glassWarm.emissiveIntensity = 1 + glow * 1.5;
  MAT.glass.emissive.copy(glassEmissive).multiplyScalar(glow * 0.7);
  stripMat.color.setHex(0xb9b2a4).multiplyScalar(1 + glow * 0.25);
  setPlayerGlow(glow);
  setHazardGlow(glow);
  player.ring.material.opacity = (player.ring.userData.gold ? 0.6 : 0.38) + glow * 0.25;
}

function blockLabel(b) {
  const info = blockInfo(plan, b);
  return `Block ${b} · ${info.theme.name}`;
}

function enterBlock(b) {
  if (b > 1 && !hitThisBlock) advanceGoal('clean', 1);
  hitThisBlock = false;
  block = b;
  blockNameEl.textContent = blockLabel(b);
  if (b > 1) {
    score += BLOCK_BONUS;
    const info = blockInfo(plan, b);
    const eyebrow = document.createElement('small');
    eyebrow.textContent = `Block ${b}${info.day > 1 ? ` · Day ${info.day}` : ''}`;
    const bonus = document.createElement('b');
    bonus.textContent = `+${BLOCK_BONUS}`;
    blockCardEl.replaceChildren(eyebrow, info.theme.name, bonus);
    blockCardEl.classList.remove('show');
    void blockCardEl.offsetWidth;
    blockCardEl.classList.add('show');
    hudEl.classList.add('carding');
    later(() => hudEl.classList.remove('carding'), 1600);
    sfx.block();
    popScore();
  }
  if (b > progress.far) {
    progress.far = b;
    saveProgress(progress);
  }
  advanceGoal('block', b);
  checkUnlocks();
}

// ------------------------------------------------------------ daily goal

function advanceGoal(unit, value) {
  if (state !== 'running' || !runGoal || goalDoneRun || runGoal.unit !== unit) return;
  goalProg = Math.max(goalProg, value);
  if (goalProg < runGoal.n) return;
  goalDoneRun = true;
  const rec = goalRecord();
  if (rec.done) return; // already done today: nothing new to celebrate
  rec.done = true;
  rec.best = Math.max(rec.best || 0, goalProg);
  lsSet('csr-goal', JSON.stringify(rec));
  bumpStreak();
  paintRing();
  const st = streakNow();
  later(() => {
    showCallout(st >= 2 ? `GOAL DONE ✓ · 🔥 ${st} DAYS` : "TODAY'S GOAL DONE ✓", true);
    sfx.unlock();
    buzz(15);
  }, unit === 'block' ? 900 : 0);
}

function checkUnlocks() {
  for (const c of CHARACTERS) {
    if (!c.unlock || progress.unlocked.includes(c.id)) continue;
    if (meetsUnlock(c, progress.bank + (state === 'running' ? coins : 0), progress.far)) {
      progress.unlocked.push(c.id);
      saveProgress(progress);
      runUnlocked.push(c);
      if (state === 'running') {
        showCallout(`NEW RUNNER · ${c.emoji} ${c.name.toUpperCase()}`, true);
        sfx.unlock();
      }
    }
  }
}

// ------------------------------------------------------------ teach by doing (first run only)

const TEACH = {
  up: { arrow: '↑', text: 'SWIPE UP', nx: '0px', ny: '-10px' },
  side: { arrow: '↔', text: 'SWIPE SIDEWAYS', nx: '10px', ny: '0px' },
  down: { arrow: '↓', text: 'SWIPE DOWN', nx: '0px', ny: '10px' },
};
function updateTeach() {
  if (!teaching) return;
  const pz = player.zOffset;
  if (teachShown && (!teachShown.active || teachShown.obj.position.z > pz + 1.2)) {
    teachShown = null;
    teachEl.classList.remove('on');
    teachSeen += 1;
    if (teachSeen >= 3) { teaching = false; lsSet('csr-taught', '1'); }
  }
  if (teachShown) return;
  for (const o of obstacles.active) {
    if (!o.hint) continue;
    const z = o.obj.position.z;
    if (z > -speed * 1.7 && z < pz) {
      teachShown = o;
      const h = TEACH[o.hint];
      teachArrowEl.textContent = h.arrow;
      teachArrowEl.style.setProperty('--nx', h.nx);
      teachArrowEl.style.setProperty('--ny', h.ny);
      teachTextEl.textContent = h.text;
      teachEl.classList.add('on');
      // all three slots of a gate row share the hint; only teach it once
      for (const other of obstacles.active) if (other !== o && other.hint === o.hint) other.hint = null;
      break;
    }
  }
}
function teachDone(kind) {
  if (teachShown && teachShown.hint === kind) teachEl.classList.remove('on');
}

// ------------------------------------------------------------ run lifecycle

function startGame() {
  unlockAudio();
  sfx.stopLoops();
  clearRunEffects();
  closeSheet();
  today = dateOverride || nyDate();
  // the date picks the twist and goal; the middle blocks are dealt per run
  plan = dailyPlan(today, runOrder());
  runGoal = goalRecord().done ? null : plan.goal;
  goalProg = 0;
  goalDoneRun = false;
  hitThisBlock = false;
  chunks.biasFor = (seq) => blockInfo(plan, Math.floor((seq * CHUNK_LEN) / BLOCK_LEN) + 1).theme.chunkBias;
  chunks.reset();
  obstacles.reset();
  collectibles.reset();
  teaching = lsGet('csr-taught') !== '1';
  teachShown = null;
  teachSeen = 0;
  // returning players (reached block 3 before) skip the gentle opening
  course.reset({ plan, tutorial: teaching, twist: plan.twist.id, returning: !teaching && progress.far >= 3 });
  people.reset();
  player.reset();
  dist = 0;
  speed = speedAt(0);
  score = 0;
  coins = 0;
  lives = MAX_LIVES;
  nearMissStreak = 0;
  coinChain = 0;
  invuln = 0;
  magnetT = 0;
  dogLunge = 0;
  runUnlocked = [];
  runStartBestDist = bestDist;
  pbFired = false;
  const rec = dayRecord();
  bestLineMesh.visible = false;
  todayLineMesh.visible = false;
  if (bestDist > 60) bestLineMesh.userData.draw(Math.floor(bestDist));
  todayLineMesh.userData.todayDist = rec.dist > 60 && bestDist - rec.dist > 40 ? rec.dist : 0;
  if (todayLineMesh.userData.todayDist) todayLineMesh.userData.draw(Math.floor(rec.dist));
  chaser.visible = false;
  pbCountShown = '';
  pbCountEl.classList.remove('on');
  paintRing();
  state = 'running';
  document.body.classList.add('playing');
  startPanel.classList.add('hidden');
  overPanel.classList.add('hidden');
  powerBarEl.classList.remove('on');
  scoreEl.textContent = '0';
  coinsEl.textContent = '0';
  paintPips();
  enterBlock(1);
  applySky(0);
  ticker.hide();
}

function onHit() {
  if (invuln > 0 || player.flying > 0) return;
  lives -= 1;
  nearMissStreak = 0;
  hitThisBlock = true;
  nearCandidates.clear();
  shakeT = motionQuery.matches ? 0 : 0.4;
  showCrashImpact();
  sfx.hit();
  buzz(20);
  hitStop = motionQuery.matches ? 0 : 0.09;
  if (lives > 0) {
    // first crash: the black dog picks up your scent
    invuln = 2.2;
    player.sliding = 0;
    player.zOffset = -1.4;              // scoot up the street
    if (!chaser.visible) {
      chaser.visible = true;
      chaser.position.set(player.x, 0, 2.6);
    }
    sfx.bark();
  } else {
    gameOver();
  }
}

function nextGoal() {
  // the locked runner you are closest to
  let bestC = null, bestP = -1;
  for (const c of CHARACTERS) {
    if (isUnlocked(c, progress)) continue;
    const p = unlockProgress(c, progress.bank, progress.far);
    if (p > bestP) { bestP = p; bestC = c; }
  }
  return bestC ? { c: bestC, p: bestP } : null;
}

function gameOver() {
  state = 'over';
  document.body.classList.remove('playing');
  sfx.stopLoops();
  teachEl.classList.remove('on');
  powerBarEl.classList.remove('on');
  const s = Math.floor(score);
  // a first-ever run sets the best quietly: "NEW BEST!" needs a best to beat
  const isBest = s > best && best > 0;
  const firstBest = s > best && best <= 0;
  if (chaser.visible) sfx.bark();
  if (!isBest) sfx.gameover();
  overAt = performance.now();
  dogLunge = chaser.visible ? 0.45 : 0;
  if (isBest || firstBest) {
    best = s;
    lsSet('csr-best', String(best));
  }
  if (dist > bestDist) {
    bestDist = Math.floor(dist);
    lsSet('csr-best-dist', String(bestDist));
  }
  const rec = dayRecord();
  rec.best = Math.max(rec.best || 0, s);
  rec.dist = Math.max(rec.dist || 0, Math.floor(dist));
  lsSet('csr-day', JSON.stringify(rec));
  progress.bank += coins;
  saveProgress(progress);
  checkUnlocks();
  if (teaching) { teaching = false; lsSet('csr-taught', '1'); }

  overTitleEl.textContent = chaser.visible ? 'THE DOG GOT YOU!' : 'WIPEOUT!';
  finalScoreEl.textContent = s.toLocaleString('en-US');
  bestLineEl.textContent = isBest
    ? `NEW BEST! · Block ${block} · 🪙 ${coins}`
    : `Block ${block} · 🪙 ${coins} · Best ${best.toLocaleString('en-US')}`;
  bestLineEl.className = isBest ? 'best-line new-best' : 'best-line';

  if (runUnlocked.length) {
    const c = runUnlocked[runUnlocked.length - 1];
    newRunnerEl.textContent = `NEW RUNNER · ${c.emoji} ${c.name}`;
    newRunnerEl.classList.remove('hidden');
  } else newRunnerEl.classList.add('hidden');

  // the goal area: today's goal until it is done, then a stamp over the
  // next-runner bar
  const daily = plan.goal;
  const grec = goalRecord();
  if (!grec.done && runGoal) {
    grec.best = Math.max(grec.best || 0, goalProg);
    lsSet('csr-goal', JSON.stringify(grec));
  }
  const goal = nextGoal();
  goalTextEl.classList.toggle('stamp', grec.done);
  if (!grec.done) {
    const have = Math.min(daily.n, Math.max(goalProg, grec.best || 0));
    goalTextEl.textContent = `🎯 Today: ${daily.text}`;
    goalSubEl.textContent = daily.unit === 'clean'
      ? 'Not yet. One whole block, no hits'
      : daily.unit === 'block' ? `Today's farthest: Block ${have}` : `Today's best: ${have} of ${daily.n}`;
    goalFillEl.style.width = '0%';
    const pct = daily.unit === 'clean' ? 0 : Math.round((have / daily.n) * 100);
    requestAnimationFrame(() => requestAnimationFrame(() => { goalFillEl.style.width = `${pct}%`; }));
  } else if (goal) {
    const u = goal.c.unlock;
    const st = streakNow();
    goalTextEl.textContent = `✓ Today's goal done${st >= 2 ? ` · 🔥 ${st}-day streak` : ''}`;
    goalSubEl.textContent = `Next runner: ${goal.c.emoji} ${goal.c.name} · ` + (u.kind === 'bank'
      ? `${u.text} (${progress.bank} so far)`
      : `${u.text} (best: Block ${progress.far})`);
    goalFillEl.style.width = '0%';
    requestAnimationFrame(() => requestAnimationFrame(() => { goalFillEl.style.width = `${Math.round(goal.p * 100)}%`; }));
  } else {
    const st = streakNow();
    goalTextEl.textContent = `✓ Today's goal done${st >= 2 ? ` · 🔥 ${st}-day streak` : ''}`;
    goalSubEl.textContent = `Every runner unlocked · farthest: Block ${progress.far}`;
    goalFillEl.style.width = '100%';
  }
  overPanel.classList.remove('hidden');
  if (isBest) {
    bestLineEl.classList.add('fanfare');
    sfx.best();
    confettiBurst(bestConfettiEl);
  }
  updateLeaderboard(s);
  buildRunnerRow();
  paintTitle();
  ticker.show();
}

// ------------------------------------------------------------ pause / resume

function pauseGame() {
  if (state !== 'running') return;
  state = 'paused';
  countdownT = 0;
  sfx.stopLoops();
  countdownEl.textContent = 'II';
  countdownEl.dataset.n = '';
  countdownEl.classList.add('on');
}
function resumeGame() {
  if (state !== 'paused' || countdownT > 0) return;
  unlockAudio();
  countdownT = 2.4; // 3-2-1, 0.8 s each
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pauseGame();
  else resumeGame();
});

// ------------------------------------------------------------ leaderboard

const lbSheet = $('lbSheet'), lbList = $('lbList'), lbStatus = $('lbStatus'), lbToggle = $('lbToggle');
const lbForm = $('lbForm'), lbNameInput = $('lbNameInput');
const lbThisBtn = $('lbThisBtn'), lbLastBtn = $('lbLastBtn'), lbRenameBtn = $('lbRenameBtn');
let lbMonthOffset = 0;

if (lbEnabled()) {
  lbToggle.classList.remove('hidden');
  lbThisBtn.textContent = `🏆 ${monthLabel(0)}`;
  lbLastBtn.textContent = monthLabel(-1);
}

function openSheet() {
  sfx.click();
  lbSheet.classList.remove('closed');
  if (lbForm.dataset.pendingScore && !getName()) showNameForm();
  else renderBoard();
}
function closeSheet() {
  lbSheet.classList.add('closed');
  lbNameInput.blur();
}
function showNameForm() {
  lbForm.classList.remove('hidden');
  lbRenameBtn.classList.add('hidden');
  lbStatus.textContent = `Pick a name to join the ${monthLabel(0)} leaderboard!`;
  lbList.innerHTML = '';
}

async function updateLeaderboard(s) {
  if (!lbEnabled()) return;
  if (!getName()) {
    lbForm.dataset.pendingScore = String(s);
    lbToggle.textContent = `🏆 Join the ${monthLabel(0)} board`;
    return;
  }
  lbToggle.textContent = `🏆 ${monthLabel(0)} board`;
  try {
    if (s > 0) await submitScore(s);
  } catch { /* offline: still try to show the board */ }
  try {
    const rows = await fetchTop(0);
    const myRank = rows.findIndex((r) => r.player_id === playerId());
    if (myRank >= 0) lbToggle.textContent = `🏆 You're #${myRank + 1} in ${monthLabel(0)}`;
  } catch { /* offline */ }
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
      ? 'No scores yet this month. Be the first!'
      : myRank >= 0 ? `You're #${myRank + 1} of ${rows.length}` : '';
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
  updateLeaderboard(0).catch(() => {});
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
lbToggle.addEventListener('click', openSheet);
$('lbClose').addEventListener('click', () => { sfx.click(); closeSheet(); });

$('startBtn').addEventListener('click', startGame);
$('restartBtn').addEventListener('click', startGame);
// back to the start screen to change runner
$('menuBtn').addEventListener('click', () => {
  unlockAudio();
  sfx.click();
  sfx.stopLoops();
  clearRunEffects();
  closeSheet();
  state = 'ready';
  document.body.classList.remove('playing');
  chaser.visible = false;
  player.reset();
  overPanel.classList.add('hidden');
  startPanel.classList.remove('hidden');
  paintTitle();
  ticker.show();
});
// sound toggle
const muteBtn = $('mute');
function paintMute() {
  const muted = isMuted();
  muteBtn.textContent = muted ? '🔇' : '🔊';
  muteBtn.setAttribute('aria-label', muted ? 'Turn sound on' : 'Mute sound');
  muteBtn.title = muted ? 'Turn sound on' : 'Mute sound';
}
paintMute();
muteBtn.addEventListener('click', () => {
  unlockAudio();
  setMuted(!isMuted());
  paintMute();
  if (!isMuted()) sfx.click();
});

// ------------------------------------------------------------ title screen

const charRow = $('charRow'), lockNote = $('lockNote');
function buildRunnerRow() {
  charRow.replaceChildren();
  for (const c of CHARACTERS) {
    const open = isUnlocked(c, progress);
    const short = c.name.replace(/^The /, '');
    const b = document.createElement('button');
    b.className = 'chip' + (c.id === character.id ? ' sel' : '') + (open ? '' : ' locked');
    b.textContent = open ? `${c.emoji} ${short}` : `🔒 ${short}`;
    b.addEventListener('click', () => {
      sfx.click();
      if (!isUnlocked(c, progress)) {
        lockNote.textContent = `🔒 ${c.name}: ${c.unlock.text}`;
        return;
      }
      lockNote.textContent = '';
      character = c;
      saveCharacter(c.id);
      player.setCharacter(c);
      charRow.querySelectorAll('.chip').forEach((x) => x.classList.remove('sel'));
      b.classList.add('sel');
    });
    charRow.appendChild(b);
  }
  const sel = charRow.querySelector('.sel');
  if (sel) charRow.scrollLeft = Math.max(0, sel.offsetLeft - charRow.clientWidth / 2 + sel.offsetWidth / 2);
}

function paintTitle() {
  if (state !== 'running') today = dateOverride || nyDate();
  // keep the run's plan for the game-over screen; the title shows today's
  const tp = dailyPlan(today);
  if (state === 'ready') plan = tp;
  $('todayLine').textContent = `TODAY · ${tp.twist.name.toUpperCase()}`;
  $('todayBlurb').textContent = tp.twist.blurb;
  const grec = goalRecord();
  const goalEl = $('todayGoal');
  goalEl.textContent = grec.done ? `✓ ${tp.goal.text}` : `🎯 ${tp.goal.text}`;
  goalEl.classList.toggle('done', grec.done);
  paintRing();
  const rec = dayRecord();
  const parts = [];
  if (rec.best > 0) parts.push(`Today ${rec.best.toLocaleString('en-US')}`);
  if (best > 0) parts.push(`Best ${Math.floor(best).toLocaleString('en-US')}`);
  const st = streakNow();
  if (st >= 2) parts.push(`🔥 ${st}-day streak`);
  $('titleStats').textContent = parts.join(' · ');
  // the title shows the street as today's run will start (Night Owl: at night)
  if (state === 'ready') applySky(0);
}
buildRunnerRow();
paintTitle();

function tryRestart() {
  // tap / Space / swipe-up quick restart, with a grace delay so a last-second
  // jump input doesn't skip the score screen
  if (state === 'over' && performance.now() - overAt > 700 && lbSheet.classList.contains('closed')) startGame();
}

bindInput({
  left: () => { if (state === 'running') { player.moveLane(-1); teachDone('side'); } },
  right: () => { if (state === 'running') { player.moveLane(1); teachDone('side'); } },
  up: () => {
    if (state === 'running') {
      if (player.jump()) sfx.jump();
      teachDone('up');
    } else tryRestart();
  },
  down: () => {
    if (state === 'running') {
      if (player.flying <= 0) sfx.slide();
      player.slide();
      teachDone('down');
    }
  },
  anyKey: () => {
    if (state === 'paused') resumeGame();
    else tryRestart();
  },
});
window.addEventListener('keydown', (e) => {
  if (e.target.closest?.('input, textarea, button')) return;
  if (e.code === 'Space' && state === 'ready') startGame();
  else if (e.code === 'Space') tryRestart();
});

// ------------------------------------------------------------ loop

const clock = new THREE.Clock();

function tick() {
  update(Math.min(clock.getDelta(), 0.05), clock.elapsedTime);
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

function placeChalk(mesh, lineDist) {
  const z = player.zOffset - (lineDist - dist);
  mesh.visible = lineDist > 0 && z > -125 && z < 12;
  mesh.position.z = z;
}

function update(dt, t) {
  updateClouds(clouds, t);
  updateChurch(church, t);

  if (state === 'paused') {
    if (countdownT > 0) {
      countdownT -= dt;
      const n = Math.ceil(countdownT / 0.8);
      if (countdownT <= 0) {
        countdownEl.classList.remove('on');
        state = 'running';
        if (player.flying > 0) sfx.jetpackPickup();
        if (magnetT > 0) sfx.magnetPickup();
      } else if (countdownEl.dataset.n !== String(n)) {
        countdownEl.dataset.n = String(n);
        countdownEl.textContent = String(n);
        sfx.tick();
      }
    }
  } else if (state === 'running' && hitStop > 0) {
    hitStop -= dt;
  } else if (state === 'running') {
    speed = speedAt(dist);
    const dz = speed * dt;
    dist += dz;

    chunks.update(dz);
    obstacles.update(dz, dt, t);
    course.update(dz, dist);
    people.update(dz, dt, t);
    // capture BEFORE player.update ticks the timer down, or the frame where
    // flight ends is missed and the jetpack loop never stops
    const wasFlying = player.flying > 0;
    player.update(dt, speed);
    if (player.justJumped) { player.justJumped = false; sfx.jump(); }

    brickTex.offset.y += dz / BRICK_WORLD;
    score += dz;

    const b = blockAt(dist);
    if (b !== block) enterBlock(b);
    applySky(dist);

    // personal-best chalk lines on the street
    placeChalk(bestLineMesh, runStartBestDist > 60 ? runStartBestDist : 0);
    placeChalk(todayLineMesh, todayLineMesh.userData.todayDist || 0);
    // run-up to your best: "BEST in 140 m" for the last 200 m
    if (!pbFired && runStartBestDist > 60) {
      const left = runStartBestDist - dist;
      const txt = left > 0 && left <= 200 ? `BEST in ${Math.ceil(left)} m` : '';
      if (txt !== pbCountShown) {
        pbCountShown = txt;
        pbCountEl.textContent = txt;
        pbCountEl.classList.toggle('on', !!txt);
        pbCountEl.classList.toggle('close', left > 0 && left <= 50);
      }
    }
    if (!pbFired && runStartBestDist > 60 && dist >= runStartBestDist) {
      pbFired = true;
      pbCountShown = '';
      pbCountEl.classList.remove('on', 'close');
      showCallout('NEW BEST!', true);
      sfx.best();
      confettiBurst(effectsEl);
    }

    // collectibles + power-ups
    if (magnetT > 0) magnetT -= dt;
    // flying doubles as a magnet: soar over obstacles AND vacuum up coins
    const attract = magnetT > 0 || player.flying > 0;
    const got = collectibles.update(dz, dt, t, player, attract, obstacles);
    let pickupPoints = 0;
    let pickupPosition = null;
    coinChainT -= dt;
    if (coinChainT <= 0) coinChain = 0;
    for (const it of got) {
      if (it.cfg.power === 'magnet') { magnetT = MAGNET_TIME; sfx.magnetPickup(); }
      else if (it.cfg.power === 'fly') { player.startFlight(FLY_TIME); sfx.bonus(); sfx.jetpackPickup(); }
      else {
        const points = it.cfg.value * COIN_POINTS;
        coins += it.cfg.value;
        score += points;
        pickupPoints += points;
        pickupPosition ||= it.obj.position.clone();
      }
    }
    if (pickupPoints > 0) {
      sfx.coin(coinChain);
      coinChain += 1;
      coinChainT = 0.6;
      showCoinPickup(pickupPoints, pickupPosition);
      advanceGoal('coins', coins);
      if (progress.bank + coins >= 500) checkUnlocks();
    }
    scoreEl.textContent = Math.floor(score);
    if (wasFlying && player.flying <= 0) sfx.jetpackEnd();
    if (magnetT <= 0 && magnetT > -dt * 2) sfx.magnetEnd();
    coinsEl.textContent = coins;
    if (player.flying > 0 || magnetT > 0) {
      const flying = player.flying > 0;
      powerIconEl.textContent = flying ? '🍦' : '🧲';
      powerFillEl.style.transform = `scaleX(${Math.max(0, flying ? player.flying / FLY_TIME : magnetT / MAGNET_TIME)})`;
      powerBarEl.classList.add('on');
    } else powerBarEl.classList.remove('on');

    // invulnerability blink
    if (invuln > 0) {
      invuln -= dt;
      player.body.visible = Math.floor(t * 12) % 2 === 0;
      if (invuln <= 0) player.body.visible = true;
    }

    // collisions (skip while flying or invulnerable)
    if (invuln <= 0 && player.flying <= 0) {
      const pz = player.zOffset;
      const obstacleHit = obstacles.checkCollision(player.x, player.bottom, player.top, 0.26, 0.3, pz);
      if (obstacleHit && obstacleHit.teach) {
        // first-run lesson: bump, no life lost
        obstacleHit.teach = false;
        invuln = 1.0;
        shakeT = motionQuery.matches ? 0 : 0.2;
        sfx.hit();
        buzz(12);
      } else if (obstacleHit) {
        nearCandidates.delete(obstacleHit);
        onHit();
      } else {
        const nearby = obstacles.checkCollision(
          player.x, player.bottom - 0.45, player.top + 0.55, 0.62, 0.52, pz
        );
        // a close call is a late sidestep or a jump that only just cleared,
        // not every prop you hop over
        const close = nearby && (Math.abs(nearby.obj.position.x - player.x) > 0.5 ||
          (player.bottom >= nearby.type.maxY && player.bottom - nearby.type.maxY < 0.3));
        if (close && !passedNearMisses.has(nearby)) nearCandidates.set(nearby, effectRunId);
        updateNearMisses(pz);
      }
    }
    updateTeach();

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

  // camera: portrait frames the lanes low and close; landscape keeps the vista.
  // On the title it swings down to a close shot of your runner, above the
  // runner chips, and eases back out when you hit RUN.
  const camTarget = state === 'ready' ? 0 : 1;
  camBlend += (camTarget - camBlend) * Math.min(1, dt * 4.5);
  if (Math.abs(camTarget - camBlend) < 0.001) camBlend = camTarget;
  const k = smooth(camBlend);
  const hero = view.portrait ? HERO_PORTRAIT : HERO_LANDSCAPE;
  const vcy = hero.cy + (view.cy - hero.cy) * k, vcz = hero.cz + (view.cz - hero.cz) * k;
  const vly = hero.ly + (view.ly - hero.ly) * k, vlz = hero.lz + (view.lz - hero.lz) * k;
  // the runner turns to face you on the title
  player.group.rotation.y = Math.PI - (1 - k) * 0.75;
  let cx = player.group.position.x * 0.35;
  let cy = vcy;
  if (state === 'running') {
    cy += Math.sin(t * 9) * 0.03;
    if (player.flying > 0) cy += player.y * 0.35;
  }
  if (shakeT > 0 && !motionQuery.matches) {
    shakeT -= dt;
    const s = shakeT * 0.5;
    cx += (Math.random() - 0.5) * s;
    cy += (Math.random() - 0.5) * s;
  } else if (motionQuery.matches) {
    shakeT = 0;
  }
  camera.position.set(cx, cy, vcz);
  camera.lookAt(cx * 0.6, vly, vlz);
}
let camBlend = 0;
const HERO_PORTRAIT = { cy: 3.2, cz: 6.6, ly: 0.45, lz: -2 };
const HERO_LANDSCAPE = { cy: 2.4, cz: 5.4, ly: 0.9, lz: -3 };

// ------------------------------------------------------------ sizing
// Size once per orientation (or real width change), not on every resize, so
// Safari's toolbar showing/hiding never re-lays out the game mid-run. The
// canvas is CSS-stretched to the viewport in between.

const view = { cy: 4.6, cz: 7.2, ly: 2.2, lz: -20 };
let sizedW = 0, sizedH = 0;
function sizeView(force = false) {
  const w = window.innerWidth, h = window.innerHeight;
  const portraitNow = h > w;
  const wasPortrait = sizedH > sizedW;
  if (!force && w === sizedW && portraitNow === wasPortrait && Math.abs(h - sizedH) < 160) return;
  sizedW = w; sizedH = h;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  if (portraitNow) {
    Object.assign(view, { cy: 6.6, cz: 8.2, ly: 0.2, lz: -13, portrait: true });
    camera.fov = 62;
  } else {
    Object.assign(view, { cy: 4.6, cz: 7.2, ly: 2.2, lz: -20, portrait: false });
    camera.fov = 58;
  }
  camera.updateProjectionMatrix();
}
sizeView(true);
window.addEventListener('resize', () => sizeView());
window.addEventListener('orientationchange', () => setTimeout(() => sizeView(true), 250));

applySky(0);
tick();

// ------------------------------------------------------------ test hooks

function setDate(str) {
  dateOverride = str || null;
  paintTitle();
  return { date: today, twist: plan.twist.id, order: plan.order.slice(), streak: streakNow() };
}
function snapshot() {
  return {
    state, score: Math.floor(score), dist: Math.round(dist), speed: +speed.toFixed(2),
    block, blockName: blockInfo(plan, block).theme.name, lives, coins,
    lane: player.lane, x: +player.x.toFixed(2), y: +player.y.toFixed(2),
    grounded: player.grounded, sliding: player.sliding > 0, flying: player.flying > 0,
    twist: plan.twist.id, date: today,
  };
}
let simT = 0;
window.__csr = {
  start: startGame,
  step: (dt = 1 / 60, t) => { simT += dt; update(dt, t ?? simT); },
  get state() { return state; },
  get score() { return Math.floor(score); },
  get dist() { return dist; },
  get speed() { return speed; },
  get lives() { return lives; },
  get coins() { return coins; },
  get block() { return block; },
  get blockName() { return blockInfo(plan, block).theme.name; },
  get patternLog() { return course.patternLog.slice(); },
  get plan() { return plan; },
  get nearMissStreak() { return nearMissStreak; },
  setDate,
  snapshot,
  pause: pauseGame,
  resume: resumeGame,
  player, obstacles, chunks, collectibles, course, renderer,
};
// generic arcade test hook
window.__T = {
  start: startGame,
  step: (ms = 1000 / 60) => {
    let left = ms / 1000;
    while (left > 1e-6) { const d = Math.min(1 / 60, left); simT += d; update(d, simT); left -= d; }
    return snapshot();
  },
  state: snapshot,
  setDate,
};
