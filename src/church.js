// The iconic Unitarian Universalist church at the head of Church Street.
// Its materials have fog disabled so the white steeple is ALWAYS visible
// floating at the top of the street, with clouds drifting around it.
import * as THREE from 'three';

function noFog(color, extra = {}) {
  return new THREE.MeshLambertMaterial({ color, fog: false, ...extra });
}

const M = {
  brick: noFog(0x96422a),
  brickDark: noFog(0x7e3722),
  white: noFog(0xf5f1e6),
  whiteShade: noFog(0xe4ddca),
  roof: noFog(0x4a4a52),
  spire: noFog(0xe9e4d5),
  clock: noFog(0xfdfaf2),
  clockHand: noFog(0x2b2b2b),
  door: noFog(0x274a2d),
  gold: noFog(0xd9b23c, { emissive: 0x4a3a10 }),
  window: noFog(0xdfe8ea),
};

function box(w, h, d, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  return m;
}

export function makeChurch() {
  const g = new THREE.Group();
  const S = 2.2; // overall scale multiplier

  // Main hall — red brick with white pediment front
  g.add(box(11, 9, 16, M.brick, 0, 4.5, -6));
  // front face detail
  g.add(box(11.4, 0.7, 0.7, M.white, 0, 9.0, 1.6));
  // pediment (triangle) — approximated with a rotated box behind trim
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 6.4, 3.2, 3, 1), M.white);
  ped.rotation.y = Math.PI;
  ped.scale.z = 0.28;
  ped.position.set(0, 10.6, 1.3);
  g.add(ped);
  // roof
  const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 8.1, 3.4, 3, 1), M.roof);
  roof.rotation.y = Math.PI;
  roof.scale.z = 2.1;
  roof.position.set(0, 10.7, -6);
  g.add(roof);

  // front doors + windows
  g.add(box(1.6, 3.0, 0.3, M.door, 0, 1.5, 2.1));
  g.add(box(1.2, 2.6, 0.3, M.door, -3.4, 1.3, 2.1));
  g.add(box(1.2, 2.6, 0.3, M.door, 3.4, 1.3, 2.1));
  g.add(box(1.4, 2.2, 0.3, M.window, -3.4, 6.2, 2.05));
  g.add(box(1.4, 2.2, 0.3, M.window, 3.4, 6.2, 2.05));
  g.add(box(1.6, 2.4, 0.3, M.window, 0, 6.4, 2.05));

  // --- Steeple ---
  // Stage 1: square brick tower rising through the roof
  g.add(box(4.6, 8, 4.6, M.brickDark, 0, 12, -1));
  // white band + clock stage
  g.add(box(4.9, 0.6, 4.9, M.white, 0, 16.2, -1));
  g.add(box(4.2, 3.4, 4.2, M.white, 0, 18.2, -1));
  // clock faces on 4 sides
  for (const [rx, rz, ry] of [[0, 2.15, 0], [0, -2.15, 0], [2.15, 0, Math.PI / 2], [-2.15, 0, Math.PI / 2]]) {
    const face = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 0.15, 20), M.clock);
    face.rotation.x = Math.PI / 2;
    face.rotation.z = ry;
    face.position.set(rx, 18.3, -1 + rz);
    g.add(face);
    const hand = box(0.12, 0.75, 0.06, M.clockHand, rx * 1.04, 18.55, -1 + rz * 1.04);
    hand.rotation.z = 0.5;
    g.add(hand);
  }
  g.add(box(4.6, 0.5, 4.6, M.whiteShade, 0, 20.1, -1));

  // Stage 2: octagonal belfry with arched openings
  const belfry = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 2.1, 3.4, 8), M.white);
  belfry.position.set(0, 22, -1);
  g.add(belfry);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const arch = box(0.55, 1.8, 0.2, M.roof, Math.cos(a) * 1.95, 22, -1 + Math.sin(a) * 1.95);
    arch.rotation.y = -a + Math.PI / 2;
    g.add(arch);
  }
  const belfryCap = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 0.4, 8), M.whiteShade);
  belfryCap.position.set(0, 23.9, -1);
  g.add(belfryCap);

  // Stage 3: smaller octagonal lantern
  const lantern = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.35, 2.2, 8), M.white);
  lantern.position.set(0, 25.2, -1);
  g.add(lantern);

  // Tapered spire
  const spire = new THREE.Mesh(new THREE.ConeGeometry(1.35, 6.5, 8), M.spire);
  spire.position.set(0, 29.5, -1);
  g.add(spire);

  // gold weathervane
  const vane = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.6, 6), M.gold);
  vane.position.set(0, 33.4, -1);
  g.add(vane);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), M.gold);
  ball.position.set(0, 33.0, -1);
  g.add(ball);

  // small green in front of the church
  const green = new THREE.Mesh(new THREE.BoxGeometry(30, 0.2, 12), noFog(0x55803f));
  green.position.set(0, 0.05, 6);
  g.add(green);

  // Pearl St runs right past the church — show the roadway + occasional car
  const road = new THREE.Mesh(new THREE.BoxGeometry(60, 0.22, 4), noFog(0x4c4a48));
  road.position.set(0, 0.05, 13.6);
  g.add(road);
  const carMats = [noFog(0x8e3b32), noFog(0x35566e), noFog(0xcfc8b8)];
  const car = new THREE.Group();
  const cb = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.55, 1.4), carMats[0]);
  cb.position.y = 0.55;
  car.add(cb);
  const ct = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.5, 1.3), carMats[0]);
  ct.position.set(-0.1, 1.05, 0);
  car.add(ct);
  const cw = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.35, 1.15), noFog(0x8fb2c4));
  cw.position.set(-0.1, 1.08, 0);
  car.add(cw);
  car.position.set(-40, 0.15, 13.6);
  g.add(car);
  g.userData.passingCar = car;
  g.userData.carMats = carMats;
  g.userData.carBody = [cb, ct];

  g.scale.setScalar(S);
  return g;
}

// Drive the little car past the church every so often.
export function updateChurch(church, t) {
  const car = church.userData.passingCar;
  if (!car) return;
  const cycle = 14; // seconds between passes
  const phase = (t % cycle) / cycle;
  if (phase < 0.4) {
    car.visible = true;
    car.position.x = -40 + (phase / 0.4) * 80;
  } else {
    car.visible = false;
    // swap color for the next pass
    if (!church.userData.swapped && phase > 0.5) {
      const mats = church.userData.carMats;
      const next = mats[Math.floor(t / cycle) % mats.length];
      for (const part of church.userData.carBody) part.material = next;
      church.userData.swapped = true;
    }
  }
  if (phase < 0.5) church.userData.swapped = false;
}

// Soft puffy clouds that hover around the steeple (fog disabled so they read
// against the sky at any distance).
export function makeClouds() {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffffff, fog: false, transparent: true, opacity: 0.92,
  });
  const geo = new THREE.IcosahedronGeometry(1, 1);
  const clouds = [];
  for (let i = 0; i < 7; i++) {
    const cloud = new THREE.Group();
    const puffs = 3 + Math.floor(Math.random() * 3);
    for (let p = 0; p < puffs; p++) {
      const m = new THREE.Mesh(geo, mat);
      const s = 3.5 + Math.random() * 4;
      m.scale.set(s * (1.2 + Math.random() * 0.8), s * 0.55, s);
      m.position.set(p * 4 - puffs * 2 + Math.random() * 2, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 3);
      cloud.add(m);
    }
    const side = i % 2 === 0 ? -1 : 1;
    cloud.position.set(
      side * (16 + Math.random() * 30),
      52 + Math.random() * 26,
      (Math.random() - 0.5) * 40
    );
    cloud.userData.driftSpeed = 0.4 + Math.random() * 0.6;
    cloud.userData.baseX = cloud.position.x;
    clouds.push(cloud);
    g.add(cloud);
  }
  g.userData.clouds = clouds;
  return g;
}

export function updateClouds(group, t) {
  for (const c of group.userData.clouds) {
    c.position.x = c.userData.baseX + Math.sin(t * 0.08 * c.userData.driftSpeed + c.userData.baseX) * 6;
  }
}
