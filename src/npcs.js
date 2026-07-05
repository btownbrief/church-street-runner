// People and dogs: parametric low-poly builders shared by ambient walkers,
// diners, buskers, obstacle pedestrians and the black-dog chaser.
import * as THREE from 'three';
import { MAT } from './props.js';

const BOXG = new THREE.BoxGeometry(1, 1, 1);
const SPH = new THREE.SphereGeometry(1, 8, 6);
const CYLG = new THREE.CylinderGeometry(1, 1, 1, 8);

const SKIN = [0xe8b48a, 0xc98e62, 0x9c6b45, 0x6f4a30, 0xf0c9a4];
const SHIRT = [0x2f6b4f, 0x8e3b32, 0x35566e, 0xc7742c, 0x6c5b8f, 0x3d3d3d, 0xd8cfb8, 0x5b8fa8];
const PANTS = [0x3b3f4a, 0x5c4632, 0x2c2c30, 0x71675a, 0x46586a];

function m(mat) { return new THREE.MeshLambertMaterial({ color: mat }); }
function mesh(geo, mat, sx, sy, sz, x, y, z) {
  const o = new THREE.Mesh(geo, mat);
  o.scale.set(sx, sy, sz);
  o.position.set(x, y, z);
  o.castShadow = true;
  return o;
}
function limb(w, h, d, mat, x, y, z) {
  const pivot = new THREE.Group();
  pivot.position.set(x, y, z);
  const b = new THREE.Mesh(BOXG, mat);
  b.scale.set(w, h, d);
  b.position.y = -h / 2;
  b.castShadow = true;
  pivot.add(b);
  return pivot;
}
function pick(arr, rng = Math.random) { return arr[Math.floor(rng() * arr.length)]; }

// ---------------------------------------------------------------- person

// opts: {skin, shirt, pants, hat:'cap'|'brim'|'beanie'|null, dress, bags, coffee, scale}
export function makePerson(opts = {}) {
  const g = new THREE.Group();
  const skin = m(opts.skin ?? pick(SKIN));
  const shirt = m(opts.shirt ?? pick(SHIRT));
  const pants = m(opts.pants ?? pick(PANTS));
  const s = opts.scale ?? (0.85 + Math.random() * 0.2);

  if (opts.dress) {
    // tapered dress silhouette
    const dress = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.42, 0.85, 8), shirt);
    dress.position.y = 0.85;
    dress.castShadow = true;
    g.add(dress);
    g.add(mesh(BOXG, shirt, 0.42, 0.35, 0.26, 0, 1.35, 0));
  } else {
    g.add(mesh(BOXG, shirt, 0.48, 0.6, 0.28, 0, 1.05, 0));
  }
  const head = mesh(SPH, skin, 0.2, 0.22, 0.2, 0, 1.6, 0);
  g.add(head);

  // hats
  if (opts.hat === 'cap') {
    g.add(mesh(BOXG, m(opts.hatColor ?? 0xb03a30), 0.32, 0.14, 0.32, 0, 1.75, 0.02));
    g.add(mesh(BOXG, m(opts.hatColor ?? 0xb03a30), 0.3, 0.05, 0.4, 0, 1.68, -0.08));
  } else if (opts.hat === 'brim') {
    const brim = mesh(CYLG, m(opts.hatColor ?? 0xe4d6b0), 0.42, 0.05, 0.42, 0, 1.72, 0);
    g.add(brim);
    g.add(mesh(CYLG, m(opts.hatColor ?? 0xe4d6b0), 0.2, 0.15, 0.2, 0, 1.8, 0));
  } else if (opts.hat === 'beanie') {
    g.add(mesh(SPH, m(opts.hatColor ?? 0x8e3b32), 0.21, 0.16, 0.21, 0, 1.72, 0));
  } else {
    // hair
    g.add(mesh(SPH, m(opts.hair ?? pick([0x2c2118, 0x4a3823, 0x8a6a3a, 0x555555])), 0.21, 0.14, 0.21, 0, 1.72, 0));
  }

  const legMat = opts.dress ? skin : pants;
  const legL = limb(0.15, opts.dress ? 0.42 : 0.55, 0.16, legMat, -0.13, opts.dress ? 0.46 : 0.72, 0);
  const legR = limb(0.15, opts.dress ? 0.42 : 0.55, 0.16, legMat, 0.13, opts.dress ? 0.46 : 0.72, 0);
  const armL = limb(0.11, 0.48, 0.13, opts.dress ? skin : shirt, -0.32, 1.32, 0);
  const armR = limb(0.11, 0.48, 0.13, opts.dress ? skin : shirt, 0.32, 1.32, 0);
  g.add(legL, legR, armL, armR);

  if (opts.bags) {
    const bag = mesh(BOXG, m(0xc7a15c), 0.24, 0.3, 0.18, -0.42, 0.62, 0);
    armL.rotation.x = 0.1;
    g.add(bag);
    if (opts.bags > 1) g.add(mesh(BOXG, m(0xd8d2c4), 0.22, 0.28, 0.16, 0.44, 0.6, 0));
  }
  if (opts.coffee) {
    armR.rotation.x = -1.1;
    g.add(mesh(CYLG, m(0xf0ebe0), 0.05, 0.14, 0.05, 0.34, 1.12, -0.32));
  }
  if (opts.backpack) {
    g.add(mesh(BOXG, m(opts.backpackColor ?? 0xc7742c), 0.36, 0.45, 0.18, 0, 1.15, 0.24));
  }
  if (opts.mailbag) {
    g.add(mesh(BOXG, m(0x2f4d73), 0.2, 0.34, 0.3, -0.4, 0.95, 0));
    g.add(mesh(BOXG, m(0x2f4d73), 0.04, 0.5, 0.04, -0.28, 1.45, 0));
  }
  if (opts.phone) {
    armR.rotation.x = -1.35;
    g.add(mesh(BOXG, m(0x222226), 0.06, 0.14, 0.03, 0.33, 1.28, -0.4));
  }
  if (opts.afro) {
    const fro = mesh(SPH, m(0x1c1712), 0.32, 0.3, 0.32, 0, 1.78, 0);
    g.add(fro);
  }
  if (opts.basketball) {
    armR.rotation.x = -0.35;
    armR.rotation.z = -0.5;
    g.add(mesh(SPH, m(0xd2691e), 0.17, 0.17, 0.17, 0.48, 0.95, 0));
  }

  g.scale.setScalar(s);
  g.userData.limbs = { legL, legR, armL, armR };
  g.userData.phase = Math.random() * Math.PI * 2;
  return g;
}

export function animateWalk(person, t, rate = 7) {
  const L = person.userData.limbs;
  if (!L) return;
  const sw = Math.sin(t * rate + person.userData.phase) * 0.55;
  L.legL.rotation.x = sw;
  L.legR.rotation.x = -sw;
  if (L.armL.rotation.x > -0.9) L.armL.rotation.x = -sw * 0.7;
  if (L.armR.rotation.x > -0.9) L.armR.rotation.x = sw * 0.7;
}

export function makeSeatedPerson(opts = {}) {
  const p = makePerson({ ...opts, scale: opts.scale ?? 0.9 });
  const L = p.userData.limbs;
  // sit: thighs forward, shins down (single limb → just raise legs), lower body
  L.legL.rotation.x = -1.45;
  L.legR.rotation.x = -1.45;
  L.armL.rotation.x = -0.9;
  L.armR.rotation.x = -0.9;
  p.position.y = -0.32;
  p.userData.seated = true;
  return p;
}

// ---------------------------------------------------------------- dogs

// styles: 'black' lab, 'golden', 'small', 'shaggy', 'brown'
const DOG_STYLES = {
  black: { body: 0x1d1c1a, ear: 0x111110, s: 1.0 },
  golden: { body: 0xc99a52, ear: 0xb0823f, s: 1.0 },
  small: { body: 0xe4dccb, ear: 0xc4b89e, s: 0.55 },
  shaggy: { body: 0x8a7458, ear: 0x6e5a42, s: 0.95, shag: true },
  brown: { body: 0x6b4a2f, ear: 0x553a24, s: 0.9 },
};
export function makeDog(style = 'golden') {
  const cfg = DOG_STYLES[style] || DOG_STYLES.golden;
  const g = new THREE.Group();
  const body = m(cfg.body);
  const bodyMesh = mesh(BOXG, body, 0.7, 0.34, 0.3, 0, 0.42, 0);
  g.add(bodyMesh);
  if (cfg.shag) g.add(mesh(BOXG, m(cfg.ear), 0.72, 0.12, 0.32, 0, 0.28, 0));
  g.add(mesh(BOXG, body, 0.26, 0.24, 0.24, 0.42, 0.62, 0));          // head
  g.add(mesh(BOXG, body, 0.14, 0.1, 0.14, 0.56, 0.55, 0));           // snout
  g.add(mesh(BOXG, m(cfg.ear), 0.08, 0.14, 0.06, 0.36, 0.76, -0.1)); // ears
  g.add(mesh(BOXG, m(cfg.ear), 0.08, 0.14, 0.06, 0.36, 0.76, 0.1));
  const tail = mesh(BOXG, body, 0.26, 0.06, 0.06, -0.42, 0.56, 0);
  tail.rotation.z = 0.6;
  g.add(tail);
  const legs = [];
  for (const [x, z] of [[-0.24, -0.1], [-0.24, 0.1], [0.24, -0.1], [0.24, 0.1]]) {
    const leg = limb(0.09, 0.28, 0.09, body, x, 0.3, z);
    legs.push(leg);
    g.add(leg);
  }
  g.scale.setScalar(cfg.s);
  g.userData.legs = legs;
  g.userData.tail = tail;
  g.userData.phase = Math.random() * 6;
  return g;
}
export const DOG_STYLE_NAMES = Object.keys(DOG_STYLES);

export function animateDogRun(dog, t, rate = 10) {
  const { legs, tail, phase } = dog.userData;
  if (!legs) return;
  legs[0].rotation.x = Math.sin(t * rate + phase) * 0.7;
  legs[1].rotation.x = Math.sin(t * rate + phase) * 0.7;
  legs[2].rotation.x = -Math.sin(t * rate + phase) * 0.7;
  legs[3].rotation.x = -Math.sin(t * rate + phase) * 0.7;
  if (tail) tail.rotation.z = 0.6 + Math.sin(t * rate * 1.3 + phase) * 0.25;
}

// ---------------------------------------------------------------- buskers & band

export function makeBusker(kind = 'guitar') {
  const g = new THREE.Group();
  const p = makePerson({ scale: 0.95 });
  g.add(p);
  const L = p.userData.limbs;
  if (kind === 'guitar') {
    L.armL.rotation.x = -1.0; L.armR.rotation.x = -0.7;
    const gtr = mesh(BOXG, m(0x9c6b30), 0.14, 0.5, 0.34, 0, 1.0, -0.3);
    gtr.rotation.z = 0.5;
    g.add(gtr);
    g.add(mesh(BOXG, m(0x5c4020), 0.05, 0.5, 0.06, 0.2, 1.4, -0.3));
    // open case with tips
    const gcase = mesh(BOXG, m(0x33302c), 0.5, 0.08, 0.9, 0.9, 0.04, 0);
    g.add(gcase);
  } else if (kind === 'sax') {
    L.armL.rotation.x = -1.1; L.armR.rotation.x = -1.1;
    const sax = mesh(CYLG, m(0xc9a02e), 0.07, 0.5, 0.07, 0, 1.05, -0.28);
    sax.rotation.x = 0.5;
    g.add(sax);
    g.add(mesh(SPH, m(0xc9a02e), 0.12, 0.12, 0.12, 0, 0.78, -0.42));
  } else if (kind === 'violin') {
    L.armL.rotation.x = -1.3; L.armR.rotation.x = -1.2;
    const v = mesh(BOXG, m(0x8a4a20), 0.1, 0.32, 0.16, -0.15, 1.5, -0.25);
    v.rotation.z = 1.1;
    g.add(v);
  }
  return g;
}

// small band under the classic orange event canopy
export function makeBand() {
  const g = new THREE.Group();
  // orange pop-up tent
  const tentMat = m(0xd35b21);
  for (const [x, z] of [[-1.6, -1.4], [1.6, -1.4], [-1.6, 1.4], [1.6, 1.4]]) {
    g.add(mesh(CYLG, MAT.ironBlack, 0.05, 2.3, 0.05, x, 1.15, z));
  }
  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.6, 0.9, 4), tentMat);
  roof.rotation.y = Math.PI / 4;
  roof.position.y = 2.75;
  roof.castShadow = true;
  g.add(roof);
  g.add(mesh(BOXG, tentMat, 3.6, 0.35, 3.2, 0, 2.25, 0));
  // players
  const guitarist = makeBusker('guitar'); guitarist.position.set(-0.9, 0, 0.3); guitarist.rotation.y = Math.PI; g.add(guitarist);
  const bassist = makeBusker('guitar'); bassist.position.set(0.9, 0, 0.3); bassist.rotation.y = Math.PI; g.add(bassist);
  // drummer: seated person + kit
  const drummer = makeSeatedPerson({}); drummer.position.set(0, 0, 1.0); drummer.rotation.y = Math.PI; g.add(drummer);
  g.add(mesh(CYLG, m(0xb03a30), 0.32, 0.4, 0.32, 0, 0.35, 0.5));
  g.add(mesh(CYLG, m(0xd8d2c4), 0.2, 0.12, 0.2, -0.4, 0.62, 0.6));
  g.add(mesh(CYLG, m(0xc9a02e), 0.26, 0.02, 0.26, 0.45, 1.0, 0.6)); // cymbal
  g.add(mesh(CYLG, MAT.ironBlack, 0.02, 0.9, 0.02, 0.45, 0.55, 0.6));
  // speakers
  g.add(mesh(BOXG, m(0x222226), 0.5, 1.0, 0.5, -1.9, 0.5, 0.4));
  g.add(mesh(BOXG, m(0x222226), 0.5, 1.0, 0.5, 1.9, 0.5, 0.4));
  return g;
}

// ---------------------------------------------------------------- ambient walkers

const ROLES = [
  () => makePerson({ coffee: true }),
  () => makePerson({ bags: 2 }),
  () => makePerson({ phone: true }),
  () => makePerson({ dress: true, hat: 'brim' }),
  () => makePerson({ backpack: true, hat: 'beanie' }),
  () => makePerson({ hat: 'cap' }),
  () => makePerson({}),
];

export class AmbientPeople {
  constructor(scene, count = 10) {
    this.scene = scene;
    this.walkers = [];
    for (let i = 0; i < count; i++) {
      const person = ROLES[i % ROLES.length]();
      const grp = new THREE.Group();
      grp.add(person);
      // ~1/3 walk a leashed dog
      let dog = null;
      if (i % 3 === 0) {
        dog = makeDog(DOG_STYLE_NAMES[i % DOG_STYLE_NAMES.length]);
        dog.position.set(0.3, 0, -0.9);
        dog.rotation.y = -Math.PI / 2; // dog model faces +x; align with owner's walk
        grp.add(dog);
        const leash = new THREE.Mesh(BOXG, MAT.ironBlack);
        leash.scale.set(0.015, 0.015, 1.0);
        leash.position.set(0.2, 0.85, -0.45);
        leash.rotation.x = 0.5;
        grp.add(leash);
      }
      const side = i % 2 === 0 ? -1 : 1;
      const dir = Math.random() < 0.6 ? 1 : -1; // 1 = toward player (walks with world)
      grp.position.set(side * (5.0 + Math.random() * 1.0), 0, -20 - Math.random() * 120);
      grp.rotation.y = dir === 1 ? 0 : Math.PI;
      this.scene.add(grp);
      this.walkers.push({ grp, person, dog, dir, side, speed: 0.8 + Math.random() * 0.9 });
    }
  }

  update(dz, dt, t) {
    for (const w of this.walkers) {
      w.grp.position.z += dz + w.dir * w.speed * dt;
      animateWalk(w.person, t, 6);
      if (w.dog) animateDogRun(w.dog, t, 7);
      if (w.grp.position.z > 12) {
        w.grp.position.z = -140 - Math.random() * 30;
        w.side *= Math.random() < 0.4 ? -1 : 1;
        w.grp.position.x = w.side * (5.0 + Math.random() * 1.0);
      } else if (w.grp.position.z < -155) {
        w.grp.position.z = -20;
      }
    }
  }

  reset() {
    for (const w of this.walkers) {
      w.grp.position.z = -20 - Math.random() * 120;
    }
  }
}
