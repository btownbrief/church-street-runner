// Pooled gameplay obstacles, independent of decor chunks.
// Every type belongs to one pattern cell:
//   J low prop (jump over)      S tall solid (go around)
//   G slide gate (duck under)   W walker (moving solid, go around)
//   D loose dog (jump over; trots side to side inside its lane)
// What gets spawned where is decided by course.js (authored patterns).
import * as THREE from 'three';
import {
  makeBarrier, makeSandwichBoard, makeBike, makeDeliveryBoxes,
  makeChair, makeUmbrellaTable, makeBannerGate, makeMailDolly,
  makeTrashCan, makeNewsBox, makeBoulder, makeBoxStack, makeTallPlanter,
} from './props.js';
import { makeDog, makePerson, animateDogRun, animateWalk } from './npcs.js';

export const LANES = [-2.1, 0, 2.1];

// Low props are collision-capped at this height whatever the model, so a
// normal jump always clears them with room to spare.
const JUMP_CAP = 0.8;
// Moving obstacles only start walking toward you once they are this close,
// so patterns keep the spacing they were authored with.
const WALK_START_Z = -32;

function jumpType(id, build, half, count = 3) {
  return { id, cell: 'J', build, count, half, minY: 0, maxY: JUMP_CAP };
}
function solidType(id, build, half, extra = {}) {
  return { id, cell: 'S', build, count: 4, half, minY: 0, maxY: 2.4, ...extra };
}
// A loose dog: jumpable, trots back and forth inside its lane.
function dogType(style) {
  return {
    id: 'dog-' + style, cell: 'D', build: () => makeDog(style), count: 3,
    half: { x: 0.55, z: 0.45 }, minY: 0, maxY: JUMP_CAP, move: 'wander',
  };
}
// Person walking a leashed dog: the owner is a solid you dodge, the dog
// trots beside them as a second (jumpable) collider.
function dogWalkerType(style) {
  return {
    id: 'walker-' + style, cell: 'W', count: 2,
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
      const leash = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.025, 0.025), new THREE.MeshLambertMaterial({ color: 0x24211f }));
      leash.position.set(0.5, 1.0, 0.18);
      leash.rotation.set(0, -0.3, -0.55);
      g.add(leash);
      g.userData.walker = owner;
      g.userData.dog = dog;
      return g;
    },
    half: { x: 0.36, z: 0.35 }, minY: 0, maxY: 2.5,
    move: 'walk',
    // group faces the player (rotation.y = PI), which mirrors the dog's
    // local (+0.95, +0.35) offset to world (-0.95, -0.35)
    sub: [{ dx: -0.95, dz: -0.35, half: { x: 0.5, z: 0.45 }, minY: 0, maxY: JUMP_CAP }],
  };
}
// Pedestrians are deliberately tall (scale 1.3, a head above the runner) so
// it reads instantly that you can't jump them.
function pedType(id, opts) {
  return {
    id, cell: 'W', count: 3,
    build: () => makePerson({ ...opts, scale: 1.3 }),
    half: { x: 0.36, z: 0.35 }, minY: 0, maxY: 2.5,
    move: 'walk',
  };
}

const TYPES = [
  // --- J: low props ---
  jumpType('boulder', makeBoulder, { x: 0.8, z: 0.65 }),
  jumpType('sandwich', makeSandwichBoard, { x: 0.55, z: 0.5 }),
  jumpType('boxes', makeDeliveryBoxes, { x: 0.55, z: 0.55 }),
  jumpType('bike', makeBike, { x: 0.6, z: 0.35 }),
  jumpType('chair', makeChair, { x: 0.5, z: 0.5 }),
  jumpType('trash', makeTrashCan, { x: 0.42, z: 0.42 }),
  jumpType('newsbox', makeNewsBox, { x: 0.4, z: 0.4 }),
  jumpType('barrier', makeBarrier, { x: 0.85, z: 0.35 }),
  // --- D: loose dogs ---
  dogType('small'), dogType('golden'), dogType('brown'), dogType('shaggy'),
  // --- W: walkers ---
  dogWalkerType('black'), dogWalkerType('golden'), dogWalkerType('shaggy'), dogWalkerType('brown'),
  pedType('mail', { mailbag: true, hat: 'cap', hatColor: 0x4a6a8a, shirt: 0x6d8fb0, pants: 0x35566e }),
  pedType('shopper', { bags: 2 }),
  pedType('texter', { phone: true }),
  pedType('baller', { afro: true, basketball: true, shirt: 0x2e8f8f, pants: 0x2c2c30, skin: 0x6f4a30 }),
  // --- S: tall solids ---
  solidType('umbrella', makeUmbrellaTable, { x: 0.8, z: 0.8 }),
  solidType('dolly', makeMailDolly, { x: 0.5, z: 0.45 }, { escort: true }),
  solidType('stack', makeBoxStack, { x: 0.5, z: 0.45 }),
  solidType('planter', makeTallPlanter, { x: 0.52, z: 0.52 }),
  // --- G: slide gate ---
  { id: 'gate', cell: 'G', build: makeBannerGate, count: 9, half: { x: 1.05, z: 1.1 }, minY: 1.35, maxY: 2.7 },
];

export class ObstacleManager {
  constructor(scene) {
    this.scene = scene;
    this.pool = [];
    for (const type of TYPES) {
      for (let i = 0; i < type.count; i++) {
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
  }

  reset() {
    for (const o of this.pool) { o.active = false; o.obj.visible = false; o.hint = null; }
    this.active = [];
  }

  // pick a free obstacle for a pattern cell, preferring the theme's models
  acquire(cell, prefer) {
    const free = this.pool.filter((o) => !o.active && o.type.cell === cell);
    if (!free.length) return null;
    let cands = prefer ? free.filter((o) => prefer.includes(o.type.id)) : free;
    if (!cands.length) cands = free;
    return cands[Math.floor(Math.random() * cands.length)];
  }

  spawn(cell, lane, z, prefer) {
    const slot = this.acquire(cell, prefer);
    if (!slot) return null;
    slot.active = true;
    slot.lane = lane;
    slot.hint = null;
    slot.teach = false;
    slot.wanderT = Math.random() * 6;
    slot.baseX = LANES[lane];
    slot.obj.position.set(slot.baseX, 0, z);
    if (slot.type.move === 'walk' || slot.type.escort) {
      // person models are built facing -z, so PI turns them toward the player
      slot.obj.rotation.y = Math.PI;
    } else if (slot.type.cell === 'G') {
      slot.obj.rotation.y = Math.PI / 2;
    } else if (slot.type.cell === 'J') {
      // mostly side-on so each prop shows its readable silhouette
      slot.obj.rotation.y = (Math.random() < 0.5 ? 0 : Math.PI) + (Math.random() - 0.5) * 0.5;
    } else {
      slot.obj.rotation.y = Math.random() * Math.PI * 2;
    }
    slot.obj.visible = true;
    this.active.push(slot);
    return slot;
  }

  update(dz, dt, t) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const o = this.active[i];
      o.obj.position.z += dz;
      const near = o.obj.position.z > WALK_START_Z;
      if (o.type.move === 'wander') {
        o.wanderT += dt;
        o.obj.position.x = o.baseX + Math.sin(o.wanderT * 1.4) * 0.5;
        // dog model faces +x; flip to face its direction of travel
        o.obj.rotation.y = Math.cos(o.wanderT * 1.4) >= 0 ? 0 : Math.PI;
        animateDogRun(o.inner, t, 6);
      } else if (o.type.move === 'walk') {
        if (near) o.obj.position.z += 1.6 * dt; // strolls toward the player
        animateWalk(o.inner.userData.walker || o.inner, t, 6);
        if (o.inner.userData.dog) animateDogRun(o.inner.userData.dog, t, 7);
      } else if (o.type.escort) {
        if (near) o.obj.position.z += 1.2 * dt;
        animateWalk(o.obj.userData.escortPerson, t, 5);
      }
      // gone once it is behind you: nothing big looms in the foreground
      if (o.obj.position.z > 3.2) {
        o.active = false;
        o.obj.visible = false;
        o.hint = null;
        this.active.splice(i, 1);
      }
    }
  }

  checkCollision(px, pBottom, pTop, pHalfW = 0.26, pHalfD = 0.3, pz = 0) {
    for (const o of this.active) {
      const oz = o.obj.position.z;
      const ox = o.obj.position.x;
      if (Math.abs(oz - pz) <= o.type.half.z + pHalfD &&
          Math.abs(ox - px) <= o.type.half.x + pHalfW &&
          pBottom < o.type.maxY && pTop > o.type.minY) return o;
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
