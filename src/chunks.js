// Modular, recycled street chunks. Each chunk is a THREE.Group CHUNK_LEN long
// containing buildings + sidewalk decor for both sides of the street.
// Chunks slide toward the camera and are recycled to the back.
// Every 10th chunk is a cross street: the gate between two blocks (blocks.js).
// The cars there wait at the crosswalk; they are scenery, not hazards.
import * as THREE from 'three';
import {
  makeStorefront, makeLampPost, makeBench, makeTree, makePlanter,
  makeSandwichBoard, makeChair, makeUmbrellaTable, makeBarrier, makeCone,
  makeBike, makeBunting, makeTrashCan, makeNewsBox, makeBoulderCluster,
  makeFoodCart, makeCar, makeParkingCart, MAT,
} from './props.js';
import {
  makeSeatedPerson, makeBusker, makeBand, makePerson,
} from './npcs.js';
import {
  makeJoeBurrell, makeLeapfrog, makeDeerStatue, makeBearStatue,
  makeFirehouse, makeCityHall, makeIceCreamShop,
} from './landmarks.js';
import { BLOCK_LEN } from './blocks.js';

export const CHUNK_LEN = 30;
export const NUM_CHUNKS = 7;
const BUILD_X = 8.2;   // building face distance from center
const DECOR_X = 6.4;   // sidewalk decor line, well clear of the lanes
// props that double as lane hazards (bikes, boulders, sandwich boards) sit
// back by the shop fronts, so nothing that looks like a hazard is near a lane
const SHOP_X = 7.5;

// Pack storefronts along a side with explicit widths so nothing overlaps.
function addBuildings(g, rng, side, from = -CHUNK_LEN / 2, to = CHUNK_LEN / 2) {
  let z = from;
  while (z < to - 3) {
    const w = Math.min(8 + rng() * 5, to - z);
    const b = makeStorefront(rng, w);
    b.rotation.y = side === -1 ? 0 : Math.PI;
    b.position.set(side * (BUILD_X + 3.5), 0, z + w / 2);
    g.add(b);
    z += w;
  }
}
function addBothSides(g, rng) {
  addBuildings(g, rng, -1);
  addBuildings(g, rng, 1);
}

function addLamps(g, offset = 0) {
  for (const side of [-1, 1]) {
    const lamp = makeLampPost();
    lamp.rotation.y = side === -1 ? 0 : Math.PI;
    lamp.position.set(side * DECOR_X, 0, offset);
    g.add(lamp);
  }
}

function put(g, obj, x, z, ry = 0) {
  obj.position.set(x, 0, z);
  obj.rotation.y = ry;
  g.add(obj);
  return obj;
}

// --- chunk builders (decor only; gameplay obstacles are pooled separately) ---

function chunkStorefront(rng) {
  const g = new THREE.Group();
  addBothSides(g, rng);
  addLamps(g, -6);
  for (const side of [-1, 1]) {
    if (rng() < 0.8) put(g, makeTree(), side * DECOR_X, 8 + rng() * 4);
    if (rng() < 0.7) put(g, makeBench(rng() < 0.5), side * (DECOR_X - 0.4), -12 + rng() * 6, side === -1 ? 0 : Math.PI);
    if (rng() < 0.5) put(g, makeSandwichBoard(), side * SHOP_X, rng() * 10 - 2, Math.PI / 2 + (rng() - 0.5) * 0.4);
    if (rng() < 0.5) put(g, makeTrashCan(), side * (DECOR_X + 0.4), 3 + rng() * 4);
  }
  put(g, makeNewsBox(), (rng() < 0.5 ? -1 : 1) * (DECOR_X + 0.3), -9);
  return g;
}

// storefront variant with Big Joe + a busker performing
function chunkStorefrontJazz(rng) {
  const g = chunkStorefront(rng);
  put(g, makeJoeBurrell(), -DECOR_X + 0.6, 1, Math.PI - 0.35); // Joe faces up the street toward the runner
  put(g, makeBusker(rng() < 0.5 ? 'sax' : 'violin'), DECOR_X - 0.6, -7, -0.8);
  // small audience
  put(g, makePerson({ coffee: true }), DECOR_X - 1.4, -5.2, -2.2);
  put(g, makePerson({ bags: 1 }), DECOR_X - 0.2, -4.6, -2.6);
  return g;
}

function chunkPatio(rng) {
  const g = new THREE.Group();
  addBothSides(g, rng);
  addLamps(g, 10);
  // outdoor restaurant seating with diners on one side
  const side = rng() < 0.5 ? -1 : 1;
  const umbMats = [MAT.umbRed, MAT.umbGreen, MAT.umbCream];
  for (let i = 0; i < 3; i++) {
    const z = -10 + i * 8;
    put(g, makeUmbrellaTable(umbMats[Math.floor(rng() * umbMats.length)]), side * DECOR_X, z);
    for (let c = 0; c < 2; c++) {
      const ch = makeChair();
      const cx = side * (DECOR_X + (c ? 0.9 : -0.9));
      put(g, ch, cx, z + (rng() - 0.5), c ? -Math.PI / 2 : Math.PI / 2);
      if (rng() < 0.7) {
        const diner = makeSeatedPerson({ coffee: c === 0 });
        put(g, diner, cx, z + 0.1, c ? -Math.PI / 2 : Math.PI / 2);
      }
    }
  }
  // a standing server
  put(g, makePerson({ shirt: 0x222226, pants: 0x222226 }), side * (DECOR_X - 1.2), -2, side * 1.2);
  // other side gets planters + a tree + trash can
  put(g, makePlanter(true), -side * DECOR_X, -8);
  put(g, makeTrashCan(), -side * DECOR_X, 4);
  put(g, makeTree(), -side * DECOR_X, 10);
  return g;
}

// ---- intersection: full asphalt roadway, curbs, crossing cars ----
function chunkIntersection(rng) {
  const g = new THREE.Group();
  const ROAD_W = 11; // road width along z
  // buildings only on the outer thirds
  for (const side of [-1, 1]) {
    addBuildings(g, rng, side, -CHUNK_LEN / 2, -ROAD_W / 2 - 1.5);
    addBuildings(g, rng, side, ROAD_W / 2 + 1.5, CHUNK_LEN / 2);
  }
  // asphalt covers the whole street width and beyond
  const road = new THREE.Mesh(new THREE.BoxGeometry(46, 0.08, ROAD_W), MAT.asphalt);
  road.receiveShadow = true;
  road.position.set(0, 0.035, 0);
  g.add(road);
  // curbs on both sides of the roadway
  for (const zs of [-1, 1]) {
    const curb = new THREE.Mesh(new THREE.BoxGeometry(46, 0.14, 0.5), MAT.curb);
    curb.receiveShadow = true;
    curb.position.set(0, 0.07, zs * (ROAD_W / 2 + 0.2));
    g.add(curb);
  }
  // crosswalk stripes across the runner's path
  for (let i = -2; i <= 2; i++) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.02, ROAD_W - 1.6), MAT.safetyStripe);
    stripe.position.set(i * 2.1, 0.09, 0);
    stripe.receiveShadow = true;
    g.add(stripe);
  }
  // center line on the road
  const line = new THREE.Mesh(new THREE.BoxGeometry(46, 0.02, 0.18), new THREE.MeshLambertMaterial({ color: 0xc9b23a }));
  line.position.set(0, 0.09, 0);
  g.add(line);
  // bollards at the marketplace corners
  for (const bside of [-1, 1]) {
    for (const zc of [-ROAD_W / 2 - 0.8, ROAD_W / 2 + 0.8]) {
      const bol = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.9, 8), MAT.ironBlack);
      bol.castShadow = true;
      bol.position.set(bside * 6.4, 0.45, zc);
      g.add(bol);
    }
  }
  addLamps(g, -ROAD_W / 2 - 2.5);
  addLamps(g, ROAD_W / 2 + 2.5);


  // cars (or a parking-enforcement cart) waiting at the crosswalk
  for (let i = 0; i < 2; i++) {
    const car = rng() < 0.25 ? makeParkingCart() : makeCar();
    const side = i === 0 ? -1 : 1;
    car.position.set(side * 9.6, 0, side * 2.6);
    car.rotation.y = i === 0 ? 0 : Math.PI;
    g.add(car);
  }
  return g;
}

function chunkTrees(rng) {
  const g = new THREE.Group();
  addBothSides(g, rng);
  addLamps(g, 0);
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      put(g, makeTree(rng() < 0.3), side * (DECOR_X + rng() * 0.6), -11 + i * 10 + rng() * 3);
    }
    if (rng() < 0.7) put(g, makePlanter(), side * (DECOR_X - 0.8), rng() * 16 - 8);
  }
  put(g, makeBike(), (rng() < 0.5 ? -1 : 1) * SHOP_X, 13, Math.PI / 2);
  put(g, makeBoulderCluster(), -SHOP_X, -4, Math.PI / 2);
  put(g, makeBench(true), DECOR_X - 0.4, -2, Math.PI);
  return g;
}

// construction kept for variety but only one instance in the whole pool
function chunkConstruction(rng) {
  const g = new THREE.Group();
  addBothSides(g, rng);
  addLamps(g, -10);
  const side = rng() < 0.5 ? -1 : 1;
  for (let i = 0; i < 2; i++) {
    put(g, makeBarrier(), side * (DECOR_X - 0.6), -6 + i * 6, Math.PI / 2);
  }
  put(g, makeCone(), side * (DECOR_X - 1.4), -8);
  put(g, makeCone(), side * (DECOR_X - 1.8), -2);
  // workers standing around, very authentic
  put(g, makePerson({ shirt: 0xe8722a, hat: 'cap', hatColor: 0xe8c22a }), side * (DECOR_X - 1.0), -4, 1.5);
  put(g, makePerson({ shirt: 0xe8722a, phone: true }), side * (DECOR_X - 0.4), -9, -1.2);
  return g;
}

// Festival block — bunting + the band under the orange tent + food cart.
function chunkFestival(rng) {
  const g = new THREE.Group();
  addBothSides(g, rng);
  addLamps(g, -5);
  addLamps(g, 12);
  for (const z of [-10, 10]) {
    // strung above the portrait camera (6.6 m), so the flags pass over the
    // top of the screen instead of sweeping across the runner
    const b = makeBunting(16.5, 8.8);
    b.position.set(0, 0, z);
    g.add(b);
  }
  put(g, makeBand(), -DECOR_X - 1.2, 2, 1.35);
  // small crowd watching the band from the sidewalk edge
  for (let i = 0; i < 3; i++) {
    put(g, makePerson({}), -DECOR_X + 1.0 + rng() * 0.5, -1 + i * 2.2, -1.6);
  }
  put(g, makeFoodCart(), DECOR_X + 0.6, -8, -Math.PI / 2 - 0.2);
  put(g, makeTrashCan(), DECOR_X - 0.5, -3);
  return g;
}

// ---- City Hall Park: lawns, park trees, statues, City Hall itself ----
function chunkPark(rng) {
  const g = new THREE.Group();
  // lawns instead of buildings
  for (const side of [-1, 1]) {
    const lawn = new THREE.Mesh(new THREE.BoxGeometry(14, 0.12, CHUNK_LEN), new THREE.MeshLambertMaterial({ color: 0x5d8a44 }));
    lawn.receiveShadow = true;
    lawn.position.set(side * 11, 0.02, 0);
    g.add(lawn);
    // gravel park path curving through
    const path = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.14, CHUNK_LEN * 0.8), new THREE.MeshLambertMaterial({ color: 0xcabf9f }));
    path.receiveShadow = true;
    path.rotation.y = side * 0.25;
    path.position.set(side * 9, 0.03, 0);
    g.add(path);
    for (let i = 0; i < 4; i++) {
      put(g, makeTree(rng() < 0.25), side * (7 + rng() * 5), -13 + i * 8 + rng() * 3);
    }
    put(g, makeBench(false), side * (DECOR_X - 0.2), -6 + rng() * 4, side === -1 ? 0 : Math.PI);
  }
  // City Hall sits back on the left
  const hall = makeCityHall();
  hall.rotation.y = 0;
  hall.position.set(-16, 0, 4);
  g.add(hall);
  // the fountain statues
  // deer & bear models face +x, so -PI/2 turns them toward the runner
  put(g, makeDeerStatue(), -DECOR_X - 1.6, -10, -Math.PI / 2 + 0.3);
  put(g, makeBearStatue(), DECOR_X + 1.8, 6, -Math.PI / 2 - 0.3);
  // park life
  put(g, makeSeatedPerson({ coffee: true }), -DECOR_X - 0.2, -5.9, 0.3);
  put(g, makePerson({ dress: true, hat: 'brim' }), DECOR_X + 2, -4, -2.0);
  put(g, makeFoodCart(), DECOR_X + 2.4, 12, -Math.PI / 2);
  addLamps(g, 2);
  return g;
}

// ---- BCA Firehouse block ----
function chunkFirehouse(rng) {
  const g = new THREE.Group();
  // firehouse dominates the left side
  const fh = makeFirehouse();
  fh.position.set(-(BUILD_X + 3.5), 0, -4);
  g.add(fh);
  addBuildings(g, rng, -1, 8, CHUNK_LEN / 2);
  addBuildings(g, rng, 1);
  addLamps(g, -2);
  // the leapfrog kids play out front
  put(g, makeLeapfrog(), -DECOR_X + 0.4, 6, Math.PI + 0.4); // kids face the runner
  // boulders + bench, straight out of the reference photo
  put(g, makeBoulderCluster(), SHOP_X, -8, Math.PI / 2);
  put(g, makeBench(true), DECOR_X - 0.6, -4.5, Math.PI);
  put(g, makeTree(), DECOR_X + 0.4, -12);
  put(g, makeTree(), -DECOR_X - 0.4, 12);
  // art-fair sandwich board
  put(g, makeSandwichBoard(), -SHOP_X, -1, Math.PI / 2);
  return g;
}

// ---- ice cream shop block ----
function chunkIceCream(rng) {
  const g = new THREE.Group();
  const shop = makeIceCreamShop();
  shop.position.set(-(BUILD_X + 3.5), 0, -6);
  g.add(shop);
  addBuildings(g, rng, -1, 1, CHUNK_LEN / 2);
  addBuildings(g, rng, 1);
  addLamps(g, 8);
  // line of customers
  for (let i = 0; i < 3; i++) {
    put(g, makePerson(i === 1 ? { bags: 1 } : {}), -DECOR_X + 0.3 + i * 0.35, -3 + i * 1.4, 2.6);
  }
  put(g, makeTree(), DECOR_X, -10);
  put(g, makeBench(true), DECOR_X - 0.4, 0, Math.PI);
  put(g, makeTrashCan(), -DECOR_X - 0.6, 2);
  put(g, makePlanter(true), DECOR_X + 0.4, 8);
  return g;
}

const BUILDERS = [
  ['storefront', chunkStorefront, 2],
  ['jazz', chunkStorefrontJazz, 1],
  ['patio', chunkPatio, 2],
  ['trees', chunkTrees, 2],
  ['construction', chunkConstruction, 2],
  ['festival', chunkFestival, 2],
  ['park', chunkPark, 1],
  ['firehouse', chunkFirehouse, 1],
  ['icecream', chunkIceCream, 1],
];
export const CORNER_EVERY = BLOCK_LEN / CHUNK_LEN; // chunks per block (10)

export class ChunkManager {
  constructor(scene) {
    this.scene = scene;
    this.pending = shuffle(BUILDERS.flatMap(([id, build, n]) => Array.from({ length: n }, () => ({ id, build }))));
    this.pool = [];
    this.spare = [];
    this.corners = [chunkIntersection(Math.random), chunkIntersection(Math.random)];
    for (const c of this.corners) c.userData.kind = 'corner';
    // build just enough to lay out the street now, the rest in idle time
    while (this.pool.length < NUM_CHUNKS) this.#buildOne();
    this.biasFor = null; // (chunk sequence index) => { kind: weight }
    this.chunks = [];
    this.#layout();
    this.#idleBuild();
  }

  #buildOne() {
    const p = this.pending.shift();
    if (!p) return null;
    const g = p.build(Math.random);
    g.userData.kind = p.id;
    this.pool.push(g);
    return g;
  }

  #idleBuild() {
    const ric = window.requestIdleCallback || ((fn) => setTimeout(fn, 120));
    const step = () => {
      const g = this.#buildOne();
      if (!g) return;
      this.spare.push(g);
      ric(step, { timeout: 1500 });
    };
    ric(step, { timeout: 1500 });
  }

  #pick(seq) {
    if (seq % CORNER_EVERY === 0) {
      return this.corners.find((c) => !this.chunks.includes(c)) || this.corners[0];
    }
    const bias = this.biasFor?.(seq) || {};
    const total = this.spare.reduce((s, c) => s + (bias[c.userData.kind] || 1), 0);
    let r = Math.random() * total;
    for (let i = 0; i < this.spare.length; i++) {
      r -= bias[this.spare[i].userData.kind] || 1;
      if (r <= 0) return this.spare.splice(i, 1)[0];
    }
    return this.spare.pop();
  }

  #layout() {
    for (const c of this.chunks) this.scene.remove(c);
    this.chunks = [];
    this.spare = shuffle([...this.pool]);
    this.seq = 0;
    for (let i = 0; i < NUM_CHUNKS; i++) this.#append(-i * CHUNK_LEN);
  }

  #append(z) {
    const chunk = this.#pick(this.seq);
    this.seq += 1;
    chunk.position.z = z;
    this.scene.add(chunk);
    this.chunks.push(chunk);
    return chunk;
  }

  update(dz) {
    let farthestZ = Infinity;
    for (const c of this.chunks) {
      c.position.z += dz;
      farthestZ = Math.min(farthestZ, c.position.z);
    }
    for (let i = this.chunks.length - 1; i >= 0; i--) {
      const c = this.chunks[i];
      if (c.position.z > CHUNK_LEN * 1.2) {
        this.chunks.splice(i, 1);
        this.scene.remove(c);
        if (c.userData.kind !== 'corner') this.spare.push(c);
        const incoming = this.#append(farthestZ - CHUNK_LEN);
        farthestZ = incoming.position.z;
      }
    }
  }

  reset() {
    this.#layout();
  }
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
