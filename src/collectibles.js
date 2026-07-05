// Coins + Vermont bonus items (creemee, maple syrup jug) + power-up pickups
// (magnet, jetpack). Pooled and recycled like obstacles.
import * as THREE from 'three';
import { LANES } from './obstacles.js';

const goldMat = new THREE.MeshLambertMaterial({ color: 0xe8b23a, emissive: 0x6b4d10 });
const creamMat = new THREE.MeshLambertMaterial({ color: 0xf5f0e2 });
const coneMat = new THREE.MeshLambertMaterial({ color: 0xc79a58 });
const jugMat = new THREE.MeshLambertMaterial({ color: 0x8a5a2c });
const jugCapMat = new THREE.MeshLambertMaterial({ color: 0xb03a30 });
const magnetMat = new THREE.MeshLambertMaterial({ color: 0xc23b2e, emissive: 0x50100a });
const magnetTipMat = new THREE.MeshLambertMaterial({ color: 0xe8e6df });
const jetMat = new THREE.MeshLambertMaterial({ color: 0x6d7680, emissive: 0x1c2126 });
const flameMat = new THREE.MeshLambertMaterial({ color: 0xffa02e, emissive: 0xcc5f10 });

function makeCoin() {
  const c = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.07, 14), goldMat);
  c.rotation.x = Math.PI / 2; // face the player
  const g = new THREE.Group();
  g.add(c);
  // maple leaf stamp hint
  const leaf = new THREE.Mesh(new THREE.CircleGeometry(0.13, 5), new THREE.MeshLambertMaterial({ color: 0xb07818 }));
  leaf.position.z = 0.045;
  g.add(leaf);
  return g;
}

function makeCreemee() {
  const g = new THREE.Group();
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.5, 8), coneMat);
  cone.rotation.x = Math.PI;
  cone.position.y = -0.2;
  g.add(cone);
  const s1 = new THREE.Mesh(new THREE.SphereGeometry(0.21, 8, 6), creamMat);
  s1.position.y = 0.12; g.add(s1);
  const s2 = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), creamMat);
  s2.position.y = 0.3; g.add(s2);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.22, 8), creamMat);
  tip.position.y = 0.46; g.add(tip);
  return g;
}

function makeMapleJug() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.44, 0.26), jugMat);
  g.add(body);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.14, 8), jugMat);
  neck.position.y = 0.29; g.add(neck);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.06, 8), jugCapMat);
  cap.position.y = 0.38; g.add(cap);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.025, 6, 10), jugMat);
  handle.position.set(0.17, 0.12, 0); g.add(handle);
  const label = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.2, 0.16), creamMat);
  label.position.set(-0.18, 0, 0); g.add(label);
  return g;
}

function makeMagnetPickup() {
  const g = new THREE.Group();
  const u = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.09, 8, 12, Math.PI), magnetMat);
  u.rotation.z = Math.PI;
  g.add(u);
  for (const x of [-0.26, 0.26]) {
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.18), magnetTipMat);
    tip.position.set(x, 0.22, 0);
    g.add(tip);
  }
  return g;
}

function makeJetpackPickup() {
  const g = new THREE.Group();
  for (const x of [-0.14, 0.14]) {
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.5, 10), jetMat);
    tank.position.x = x;
    g.add(tank);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), magnetMat);
    nose.position.set(x, 0.28, 0);
    g.add(nose);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.2, 8), flameMat);
    flame.rotation.x = Math.PI;
    flame.position.set(x, -0.35, 0);
    g.add(flame);
  }
  return g;
}

const KINDS = {
  coin: { build: makeCoin, value: 1, pool: 30 },
  creemee: { build: makeCreemee, value: 15, pool: 3 },
  maple: { build: makeMapleJug, value: 8, pool: 3 },
  magnet: { build: makeMagnetPickup, power: 'magnet', pool: 2 },
  jetpack: { build: makeJetpackPickup, power: 'jetpack', pool: 2 },
};

export class Collectibles {
  constructor(scene) {
    this.scene = scene;
    this.pool = [];
    for (const [kind, cfg] of Object.entries(KINDS)) {
      for (let i = 0; i < cfg.pool; i++) {
        const obj = cfg.build();
        obj.visible = false;
        scene.add(obj);
        this.pool.push({ obj, kind, cfg, active: false });
      }
    }
    this.nextSpawnZ = 0;
    this.sincePower = 0;
  }

  reset() {
    for (const it of this.pool) { it.active = false; it.obj.visible = false; }
    this.nextSpawnZ = -30;
    this.sincePower = 0;
  }

  acquire(kind) {
    return this.pool.find((it) => !it.active && it.kind === kind) || null;
  }

  spawnLine(z) {
    const lane = Math.floor(Math.random() * 3);
    const n = 4 + Math.floor(Math.random() * 3);
    this.sincePower += 1;
    // occasionally lead the line with a bonus item or power-up
    let head = null;
    const roll = Math.random();
    if (this.sincePower > 4 && roll < 0.22) {
      head = this.acquire(roll < 0.12 ? 'magnet' : 'jetpack');
      if (head) this.sincePower = 0;
    } else if (roll < 0.42) {
      head = this.acquire(roll < 0.32 ? 'maple' : 'creemee');
    }
    let zi = z;
    if (head) {
      head.active = true;
      head.obj.position.set(LANES[lane], 1.05, zi);
      head.obj.visible = true;
      zi -= 2.2;
    }
    for (let i = 0; i < n; i++) {
      const c = this.acquire('coin');
      if (!c) break;
      c.active = true;
      c.obj.position.set(LANES[lane], 1.05, zi - i * 2.0);
      c.obj.visible = true;
    }
  }

  // returns array of pickups collected this frame
  update(dz, dt, t, player, magnetOn) {
    const got = [];
    this.nextSpawnZ += dz;
    if (this.nextSpawnZ > -40) {
      this.spawnLine(-135 - Math.random() * 8);
      this.nextSpawnZ = -40 - (14 + Math.random() * 22);
    }
    const px = player.x, py = player.y + 1.0;
    for (const it of this.pool) {
      if (!it.active) continue;
      const o = it.obj;
      o.position.z += dz;
      o.rotation.y += dt * 3;
      o.position.y = 1.05 + Math.sin(t * 4 + o.position.z * 0.5) * 0.08;
      if (magnetOn) {
        const dx = px - o.position.x, dyz = -o.position.z;
        const dist = Math.hypot(dx, dyz);
        if (dist < 7 && o.position.z > -10) {
          o.position.x += dx * Math.min(1, dt * 8);
          o.position.z += (0 - o.position.z) * Math.min(1, dt * 6);
        }
      }
      if (o.position.z > 8) {
        it.active = false;
        o.visible = false;
        continue;
      }
      // pickup check
      if (Math.abs(o.position.z) < 0.9 && Math.abs(o.position.x - px) < 0.75 &&
          Math.abs(o.position.y - py) < 1.4) {
        it.active = false;
        o.visible = false;
        got.push(it);
      }
    }
    return got;
  }
}
