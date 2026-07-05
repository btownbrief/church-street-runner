// Pooled gameplay obstacles, independent of decor chunks so spawn patterns
// can be tuned without touching the environment.
// kinds: 'jump' = low, hop over. 'slide' = overhead, duck under.
// 'solid' = tall, must change lanes. Some obstacles move (dogs, pedestrians).
import * as THREE from 'three';
import {
  makeBarrier, makeSandwichBoard, makeBike, makeDeliveryBoxes,
  makeChair, makeUmbrellaTable, makeBannerGate, makeMailDolly,
  makeTrashCan, makeNewsBox, makeBoulder,
} from './props.js';
import { makeDog, makePerson, animateDogRun, animateWalk } from './npcs.js';

export const LANES = [-2.1, 0, 2.1];

// A rare loose dog (escaped the leash) — jumpable, wanders across lanes.
function dogType(style, weight) {
  return {
    build: () => makeDog(style), kind: 'jump', weight,
    half: { x: 0.6, z: 0.45 }, minY: 0, maxY: style === 'small' ? 0.75 : 1.0,
    move: 'wander',
  };
}
// Person walking a leashed dog: the owner is a solid you dodge, the dog
// trots beside them as a second (jumpable) collider.
function dogWalkerType(style, weight) {
  return {
    build: () => {
      const g = new THREE.Group();
      const owner = makePerson({ scale: 1.3 });
      g.add(owner);
      const dog = makeDog(style);
      dog.position.set(0.95, 0, 0.35);
      // group is spawned facing the player (rotation.y = PI), so the dog's
      // +x-built body needs +PI/2 to face the same way as its owner
      dog.rotation.y = Math.PI / 2;
      g.add(dog);
      // leash: slack line from the owner's hand down to the dog's collar
      const leash = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.025, 0.025), new THREE.MeshLambertMaterial({ color: 0x24211f }));
      leash.position.set(0.5, 1.0, 0.18);
      leash.rotation.set(0, -0.3, -0.55);
      g.add(leash);
      g.userData.walker = owner;
      g.userData.dog = dog;
      return g;
    },
    kind: 'solid', weight,
    half: { x: 0.42, z: 0.35 }, minY: 0, maxY: 2.5,
    move: 'walk',
    // group faces the player (rotation.y = PI), which mirrors the dog's
    // local (+0.95, +0.35) offset to world (-0.95, -0.35)
    sub: [{ dx: -0.95, dz: -0.35, half: { x: 0.6, z: 0.45 }, minY: 0, maxY: style === 'small' ? 0.75 : 1.0 }],
  };
}
// Pedestrians are deliberately super tall (scale 1.3 ≈ a head above the
// runner) so it reads instantly that you can't jump them.
function pedType(opts, weight) {
  return {
    build: () => makePerson({ ...opts, scale: 1.3 }), kind: 'solid', weight,
    half: { x: 0.42, z: 0.35 }, minY: 0, maxY: 2.5,
    move: 'walk',
  };
}

const TYPES = [
  // --- jumpables ---
  { build: makeBoulder,       kind: 'jump', weight: 3, half: { x: 0.85, z: 0.7 }, minY: 0, maxY: 0.85 },
  { build: makeSandwichBoard, kind: 'jump', weight: 2, half: { x: 0.6, z: 0.55 }, minY: 0, maxY: 1.05 },
  { build: makeDeliveryBoxes, kind: 'jump', weight: 2, half: { x: 0.55, z: 0.55 }, minY: 0, maxY: 0.95 },
  { build: makeBike,          kind: 'jump', weight: 2, half: { x: 0.65, z: 0.35 }, minY: 0, maxY: 1.0 },
  { build: makeChair,         kind: 'jump', weight: 1, half: { x: 0.5, z: 0.5 },  minY: 0, maxY: 1.0 },
  { build: makeTrashCan,      kind: 'jump', weight: 2, half: { x: 0.45, z: 0.45 }, minY: 0, maxY: 1.0 },
  { build: makeNewsBox,       kind: 'jump', weight: 2, half: { x: 0.4, z: 0.4 }, minY: 0, maxY: 1.05 },
  { build: makeBarrier,       kind: 'jump', weight: 1, half: { x: 0.9, z: 0.35 }, minY: 0, maxY: 1.0 }, // construction, kept rare
  // --- dogs: almost always leashed to an owner, like real Church St ---
  dogWalkerType('black', 2), dogWalkerType('golden', 2),
  dogWalkerType('shaggy', 1), dogWalkerType('brown', 1),
  dogType('small', 1), // the one rare escaped dog
  // --- solids: dodge around ---
  { build: makeUmbrellaTable, kind: 'solid', weight: 2, half: { x: 0.85, z: 0.85 }, minY: 0, maxY: 2.4 },
  { build: makeMailDolly,     kind: 'solid', weight: 2, half: { x: 0.5, z: 0.45 }, minY: 0, maxY: 2.0, escort: true },
  pedType({ mailbag: true, hat: 'cap', hatColor: 0x2f4d73, shirt: 0x4a6a8a, pants: 0x35566e }, 2), // mail carrier
  pedType({ bags: 2 }, 2),          // loaded-up shopper
  pedType({ phone: true }, 1),      // distracted texter
  pedType({ afro: true, basketball: true, shirt: 0xe8722a, pants: 0x2c2c30, skin: 0x6f4a30 }, 2), // baller
  // --- slide-unders ---
  { build: makeBannerGate,    kind: 'slide', weight: 3, half: { x: 1.05, z: 1.1 }, minY: 1.35, maxY: 2.7 },
];

const POOL_PER_TYPE = 3;

export class ObstacleManager {
  constructor(scene) {
    this.scene = scene;
    this.pool = [];
    for (const type of TYPES) {
      for (let i = 0; i < POOL_PER_TYPE; i++) {
        const mesh = type.build();
        const wrapper = new THREE.Group();
        wrapper.add(mesh);
        if (type.escort) {
          // the delivery worker pushing the dolly
          const worker = makePerson({ shirt: 0x6b4a2f, hat: 'cap', hatColor: 0x6b4a2f });
          worker.position.set(0, 0, 0.85);
          wrapper.add(worker);
          wrapper.userData.escortPerson = worker;
        }
        wrapper.visible = false;
        scene.add(wrapper);
        this.pool.push({ obj: wrapper, inner: mesh, type, active: false, lane: 0, wanderT: 0 });
      }
    }
    this.active = [];
    this.nextSpawnZ = -60;
    // build weighted pick tables per kind
    this.byKind = {};
    for (const o of this.pool) {
      (this.byKind[o.type.kind] ||= []).push(o);
    }
  }

  reset() {
    for (const o of this.pool) { o.active = false; o.obj.visible = false; }
    this.active = [];
    this.nextSpawnZ = -60;
  }

  acquire(kindBias) {
    const cands = this.pool.filter((o) => !o.active && (kindBias === null || o.type.kind === kindBias));
    if (!cands.length) return null;
    const total = cands.reduce((s, o) => s + o.type.weight, 0);
    let r = Math.random() * total;
    for (const o of cands) {
      r -= o.type.weight;
      if (r <= 0) return o;
    }
    return cands[cands.length - 1];
  }

  spawnGap(difficulty) {
    return 20 - difficulty * 8 + Math.random() * 9; // ~29 → ~12
  }

  spawnRow(z, difficulty) {
    const lanes = shuffle([0, 1, 2]);
    const blockCount = Math.random() < difficulty * 0.7 ? 2 : 1;
    for (let i = 0; i < blockCount; i++) {
      const kindRoll = Math.random();
      let bias;
      if (i > 0) bias = 'jump'; // second obstacle in a row stays escapable
      else if (kindRoll < 0.2 && difficulty > 0.2) bias = 'slide';
      else if (kindRoll < 0.42 && difficulty > 0.1) bias = 'solid';
      else bias = 'jump';
      const slot = this.acquire(bias) || this.acquire(null);
      if (!slot) return;
      slot.active = true;
      slot.lane = lanes[i];
      slot.wanderT = Math.random() * 6;
      slot.baseX = LANES[lanes[i]];
      slot.obj.position.set(slot.baseX, 0, z);
      if (slot.type.move === 'walk') {
        // person models are built facing -z, so PI turns them toward the player
        slot.obj.rotation.y = Math.PI;
      } else if (slot.type.kind === 'slide') {
        slot.obj.rotation.y = Math.PI / 2;
      } else if (slot.type.escort) {
        slot.obj.rotation.y = Math.PI; // dolly pushed toward the player
      } else {
        slot.obj.rotation.y = Math.random() * Math.PI * 2;
      }
      slot.obj.visible = true;
      this.active.push(slot);
    }
  }

  update(dz, dt, t, difficulty) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const o = this.active[i];
      o.obj.position.z += dz;
      // movement behaviours
      if (o.type.move === 'wander') {
        o.wanderT += dt;
        o.obj.position.x = o.baseX + Math.sin(o.wanderT * 1.4) * 0.55;
        // dog model faces +x; flip to face its direction of travel
        o.obj.rotation.y = Math.cos(o.wanderT * 1.4) >= 0 ? 0 : Math.PI;
        animateDogRun(o.inner, t, 6);
      } else if (o.type.move === 'walk') {
        o.obj.position.z += 1.6 * dt; // strolls toward the player
        animateWalk(o.inner.userData.walker || o.inner, t, 6);
        if (o.inner.userData.dog) animateDogRun(o.inner.userData.dog, t, 7);
      } else if (o.type.escort) {
        o.obj.position.z += 1.2 * dt;
        animateWalk(o.obj.userData.escortPerson, t, 5);
      }
      if (o.obj.position.z > 12) {
        o.active = false;
        o.obj.visible = false;
        this.active.splice(i, 1);
      }
    }
    this.nextSpawnZ += dz;
    if (this.nextSpawnZ > -55) {
      this.spawnRow(-140 + Math.random() * 10, difficulty);
      this.nextSpawnZ = -55 - this.spawnGap(difficulty);
    }
  }

  checkCollision(px, pBottom, pTop, pHalfW = 0.32, pHalfD = 0.3, pz = 0) {
    for (const o of this.active) {
      const oz = o.obj.position.z;
      const ox = o.obj.position.x;
      // primary collider
      if (Math.abs(oz - pz) <= o.type.half.z + pHalfD &&
          Math.abs(ox - px) <= o.type.half.x + pHalfW &&
          pBottom < o.type.maxY && pTop > o.type.minY) return o;
      // secondary colliders (e.g. the leashed dog beside its owner)
      if (o.type.sub) {
        for (const s of o.type.sub) {
          if (Math.abs(oz + s.dz - pz) <= s.half.z + pHalfD &&
              Math.abs(ox + s.dx - px) <= s.half.x + pHalfW &&
              pBottom < s.maxY && pTop > s.minY) return o;
        }
      }
    }
    return null;
  }
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
