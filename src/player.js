// The runner: lane switching, jump, slide, jetpack flight.
// The rig is rebuilt from a character spec (see characters.js).
import * as THREE from 'three';
import { LANES } from './obstacles.js';

const GRAVITY = 26;
const JUMP_V = 8.6;      // apex ≈ 1.42m
const LANE_SPEED = 14;
const SLIDE_TIME = 0.62;
const FLY_HEIGHT = 3.2;

function m(color) { return new THREE.MeshLambertMaterial({ color }); }
function mesh(w, h, d, mat, x, y, z) {
  const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  o.position.set(x, y, z);
  o.castShadow = true;
  return o;
}
function limb(w, h, d, mat, x, y, z) {
  const pivot = new THREE.Group();
  pivot.position.set(x, y, z);
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  b.position.y = -h / 2;
  b.castShadow = true;
  pivot.add(b);
  return pivot;
}

export class Player {
  constructor(scene, spec) {
    this.group = new THREE.Group();
    this.body = new THREE.Group();
    this.group.add(this.body);
    scene.add(this.group);
    this.setCharacter(spec);
    this.reset();
  }

  setCharacter(spec) {
    this.spec = spec;
    this.body.clear();
    const skin = m(spec.skin), shirt = m(spec.shirt), pants = m(spec.pants), shoe = m(spec.shoes);

    if (spec.dress) {
      const dress = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.46, 0.9, 8), shirt);
      dress.position.y = 0.9;
      dress.castShadow = true;
      this.body.add(dress);
      this.body.add(mesh(0.44, 0.38, 0.27, shirt, 0, 1.4, 0));
    } else {
      this.body.add(mesh(0.5, 0.62, 0.3, shirt, 0, 1.05, 0));
      if (spec.jacket) {
        const jk = m(spec.jacket);
        this.body.add(mesh(0.56, 0.4, 0.34, jk, 0, 1.18, 0));
      }
      if (spec.flannel) {
        // flannel: overlay grid stripes on the torso
        const dark = m(spec.flannel);
        this.body.add(mesh(0.52, 0.08, 0.32, dark, 0, 1.2, 0));
        this.body.add(mesh(0.52, 0.08, 0.32, dark, 0, 0.98, 0));
        this.body.add(mesh(0.1, 0.62, 0.32, dark, -0.14, 1.05, 0));
        this.body.add(mesh(0.1, 0.62, 0.32, dark, 0.14, 1.05, 0));
      }
    }
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 10, 8), skin);
    head.position.set(0, 1.6, 0);
    head.castShadow = true;
    this.body.add(head);

    if (spec.hat === 'cap') {
      const hatMat = m(spec.hatColor);
      this.body.add(mesh(0.34, 0.06, 0.42, hatMat, 0, 1.68, -0.06));
      this.body.add(mesh(0.34, 0.16, 0.34, hatMat, 0, 1.76, 0.02));
    } else if (spec.hat === 'brim') {
      const hatMat = m(spec.hatColor);
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.05, 12), hatMat);
      brim.position.y = 1.72;
      brim.castShadow = true;
      this.body.add(brim);
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.16, 12), hatMat);
      crown.position.y = 1.81;
      this.body.add(crown);
    } else if (spec.hat === 'beanie') {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), m(spec.hatColor));
      b.scale.y = 0.75;
      b.position.y = 1.73;
      this.body.add(b);
    } else if (spec.hair) {
      const h = new THREE.Mesh(new THREE.SphereGeometry(0.215, 10, 8), m(spec.hair));
      h.scale.y = 0.7;
      h.position.y = 1.72;
      this.body.add(h);
      if (spec.dress) this.body.add(mesh(0.1, 0.5, 0.14, m(spec.hair), 0, 1.5, 0.18)); // ponytail
    }
    if (spec.headphones) {
      const hp = m(0x222226);
      this.body.add(mesh(0.06, 0.12, 0.1, hp, -0.22, 1.6, 0));
      this.body.add(mesh(0.06, 0.12, 0.1, hp, 0.22, 1.6, 0));
      this.body.add(mesh(0.46, 0.05, 0.08, hp, 0, 1.78, 0));
    }
    if (spec.backpack) {
      this.body.add(mesh(0.4, 0.5, 0.2, m(spec.backpack), 0, 1.15, 0.26));
    }

    const legMat = spec.dress ? skin : pants;
    const legLen = spec.dress ? 0.45 : 0.55;
    const legY = spec.dress ? 0.5 : 0.72;
    this.legL = limb(0.16, legLen, 0.18, legMat, -0.14, legY, 0);
    this.legR = limb(0.16, legLen, 0.18, legMat, 0.14, legY, 0);
    this.armL = limb(0.12, 0.5, 0.14, spec.dress ? skin : shirt, -0.34, 1.3, 0);
    this.armR = limb(0.12, 0.5, 0.14, spec.dress ? skin : shirt, 0.34, 1.3, 0);
    const shoeL = mesh(0.16, 0.1, 0.28, shoe, 0, -legLen + 0.03, 0.05);
    const shoeR = mesh(0.16, 0.1, 0.28, shoe, 0, -legLen + 0.03, 0.05);
    this.legL.add(shoeL);
    this.legR.add(shoeR);
    this.body.add(this.legL, this.legR, this.armL, this.armR);

    // jetpack (hidden until the power-up)
    this.jetpack = new THREE.Group();
    const tankMat = m(0x6d7680);
    for (const x of [-0.13, 0.13]) {
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.5, 10), tankMat);
      tank.position.set(x, 1.15, 0.3);
      this.jetpack.add(tank);
    }
    this.flameL = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.3, 8), m(0xffa02e));
    this.flameL.rotation.x = Math.PI;
    this.flameL.position.set(-0.13, 0.82, 0.3);
    this.flameR = this.flameL.clone();
    this.flameR.position.x = 0.13;
    this.jetpack.add(this.flameL, this.flameR);
    this.jetpack.visible = false;
    this.body.add(this.jetpack);
  }

  reset() {
    this.lane = 1;
    this.x = LANES[1];
    this.y = 0;
    this.vy = 0;
    this.grounded = true;
    this.sliding = 0;
    this.flying = 0;
    this.runPhase = 0;
    this.zOffset = 0;   // pushed forward when the black dog appears
    this.group.position.set(this.x, 0, 0);
    this.group.rotation.set(0, Math.PI, 0);
    this.body.rotation.set(0, 0, 0);
    this.body.position.y = 0;
    this.body.scale.set(1, 1, 1);
    this.body.visible = true;
    this.jetpack.visible = false;
  }

  moveLane(dir) {
    this.lane = THREE.MathUtils.clamp(this.lane + dir, 0, 2);
  }

  jump() {
    if (this.flying > 0) return;
    if (this.grounded) {
      this.vy = JUMP_V;
      this.grounded = false;
      this.sliding = 0;
    }
  }

  slide() {
    if (this.flying > 0) return;
    if (this.grounded) {
      this.sliding = SLIDE_TIME;
    } else {
      this.vy = -18; // slam down mid-air
      this.sliding = SLIDE_TIME * 0.7;
    }
  }

  startFlight(duration) {
    this.flying = duration;
    this.sliding = 0;
    this.jetpack.visible = true;
  }

  update(dt, speed) {
    const targetX = LANES[this.lane];
    const dx = targetX - this.x;
    const step = Math.sign(dx) * Math.min(Math.abs(dx), LANE_SPEED * dt);
    this.x += step;

    if (this.flying > 0) {
      this.flying -= dt;
      this.y += (FLY_HEIGHT - this.y) * Math.min(1, dt * 4);
      this.vy = 0;
      this.grounded = false;
      if (this.flying <= 0) this.jetpack.visible = false;
    } else if (!this.grounded) {
      this.vy -= GRAVITY * dt;
      this.y += this.vy * dt;
      if (this.y <= 0) { this.y = 0; this.vy = 0; this.grounded = true; }
    }
    if (this.sliding > 0) this.sliding -= dt;

    this.group.position.set(this.x, this.y, this.zOffset);

    // --- animation ---
    this.runPhase += dt * (6 + speed * 0.55);
    const swing = Math.sin(this.runPhase);
    this.body.scale.set(1, 1, 1);
    if (this.flying > 0) {
      this.body.rotation.x = 0.35;
      this.body.position.y = 0;
      this.legL.rotation.x = 0.25; this.legR.rotation.x = 0.15;
      this.armL.rotation.x = -2.6; this.armR.rotation.x = -2.6; // superman-ish
      const f = 0.22 + Math.random() * 0.16;
      this.flameL.scale.set(1, f * 4, 1);
      this.flameR.scale.set(1, f * 4, 1);
    } else if (!this.grounded) {
      this.legL.rotation.x = 0.5; this.legR.rotation.x = -0.4;
      this.armL.rotation.x = -0.9; this.armR.rotation.x = 0.7;
      this.body.rotation.x = 0.12;
      this.body.position.y = 0;
    } else if (this.sliding > 0) {
      // visible feet-first slide: low crouch, torso leaning back, arms up
      this.body.scale.set(1, 0.52, 1);
      this.body.rotation.x = -0.55;
      this.body.position.y = 0.1;
      this.legL.rotation.x = -1.4; this.legR.rotation.x = -1.1;
      this.armL.rotation.x = -2.4; this.armR.rotation.x = -2.2;
    } else {
      this.body.rotation.x = 0.14;
      this.body.position.y = Math.abs(Math.cos(this.runPhase)) * 0.06;
      this.legL.rotation.x = swing * 1.0;
      this.legR.rotation.x = -swing * 1.0;
      this.armL.rotation.x = -swing * 0.9;
      this.armR.rotation.x = swing * 0.9;
    }
    this.body.rotation.z = THREE.MathUtils.clamp(-dx * 0.18, -0.3, 0.3);
  }

  get bottom() { return this.y + 0.15; }
  get top() { return this.sliding > 0 ? this.y + 0.85 : this.y + 1.85; }
}
