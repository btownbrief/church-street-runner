// Iconic Church Street landmarks: bronze statues, the BCA firehouse,
// City Hall, and the famous ice cream shop. Stylized, not exact replicas.
import * as THREE from 'three';
import { MAT, box, cyl } from './props.js';
import { makePerson, makeSeatedPerson } from './npcs.js';

const BOXG = new THREE.BoxGeometry(1, 1, 1);
const SPH = new THREE.SphereGeometry(1, 8, 6);
const CYLG = new THREE.CylinderGeometry(1, 1, 1, 8);

function bmesh(sx, sy, sz, x, y, z, mat = MAT.bronze, geo = BOXG) {
  const o = new THREE.Mesh(geo, mat);
  o.scale.set(sx, sy, sz);
  o.position.set(x, y, z);
  o.castShadow = true;
  return o;
}

function graniteBase(w = 1.6, h = 0.35, d = 1.6) {
  return bmesh(w, h, d, 0, h / 2, 0, MAT.granite);
}

// ---- Big Joe Burrell playing sax, on his granite block ----
export function makeJoeBurrell() {
  const g = new THREE.Group();
  g.add(graniteBase(1.7, 0.4, 1.7));
  const y0 = 0.4;
  // suit-clad figure, slightly hunched over the sax
  g.add(bmesh(0.56, 0.7, 0.34, 0, y0 + 1.05, 0));                    // torso
  g.add(bmesh(0.6, 0.12, 0.38, 0, y0 + 1.42, 0));                    // shoulders
  const head = bmesh(0.22, 0.24, 0.22, 0, y0 + 1.62, -0.06, MAT.bronze, SPH);
  head.rotation.x = 0.25;
  g.add(head);
  g.add(bmesh(0.3, 0.06, 0.3, 0, y0 + 1.74, -0.04, MAT.bronzeDark, CYLG)); // hat hint
  for (const sx of [-1, 1]) {
    g.add(bmesh(0.16, 0.75, 0.18, sx * 0.16, y0 + 0.38, 0));         // legs
    const arm = bmesh(0.13, 0.5, 0.14, sx * 0.36, y0 + 1.15, -0.15);
    arm.rotation.x = -0.9;
    g.add(arm);
  }
  // saxophone: curved body + bell
  const saxBody = bmesh(0.08, 0.6, 0.08, 0, y0 + 1.0, -0.3, MAT.bronzeDark, CYLG);
  saxBody.rotation.x = 0.35;
  g.add(saxBody);
  g.add(bmesh(0.16, 0.14, 0.16, 0.02, y0 + 0.66, -0.42, MAT.bronzeDark, SPH)); // bell
  // pointing left hand (his famous gesture)
  const point = bmesh(0.1, 0.34, 0.1, -0.42, y0 + 1.4, -0.28);
  point.rotation.x = -1.4;
  g.add(point);
  return g;
}

// ---- children playing leapfrog ----
export function makeLeapfrog() {
  const g = new THREE.Group();
  g.add(graniteBase(1.5, 0.22, 1.5));
  const y0 = 0.22;
  // crouched child (bent over)
  const bent = new THREE.Group();
  bent.add(bmesh(0.4, 0.3, 0.6, 0, 0.75, 0));                        // horizontal torso
  bent.add(bmesh(0.18, 0.2, 0.18, 0, 0.72, -0.38, MAT.bronze, SPH)); // head down
  bent.add(bmesh(0.14, 0.72, 0.16, -0.12, 0.36, 0.2));               // legs
  bent.add(bmesh(0.14, 0.72, 0.16, 0.12, 0.36, 0.2));
  for (const sx of [-1, 1]) {
    const arm = bmesh(0.1, 0.5, 0.1, sx * 0.2, 0.5, -0.25);
    arm.rotation.x = 0.35;
    bent.add(arm);
  }
  bent.position.y = y0;
  g.add(bent);
  // vaulting child (hands on the other's back, legs spread mid-leap)
  const vault = new THREE.Group();
  vault.add(bmesh(0.4, 0.55, 0.3, 0, 1.45, 0.1));
  vault.add(bmesh(0.19, 0.21, 0.19, 0, 1.85, 0.05, MAT.bronze, SPH));
  vault.add(bmesh(0.34, 0.1, 0.2, 0, 1.98, 0.02, MAT.bronzeDark));   // pigtail-ish hair
  for (const sx of [-1, 1]) {
    const arm = bmesh(0.1, 0.5, 0.1, sx * 0.26, 1.3, -0.05);
    arm.rotation.x = 0.9;
    vault.add(arm);
    const leg = bmesh(0.13, 0.6, 0.14, sx * 0.3, 1.05, 0.25);
    leg.rotation.z = sx * 0.8;
    vault.add(leg);
  }
  vault.position.y = y0;
  g.add(vault);
  return g;
}

// ---- deer sculpture on granite steps (City Hall Park fountain area) ----
export function makeDeerStatue() {
  const g = new THREE.Group();
  // stepped granite blocks
  g.add(bmesh(2.4, 0.3, 1.6, 0, 0.15, 0, MAT.granite));
  g.add(bmesh(1.6, 0.3, 1.2, -0.3, 0.45, 0, MAT.granite));
  const y0 = 0.6;
  const deer = new THREE.Group();
  deer.add(bmesh(0.9, 0.42, 0.34, 0, 1.0, 0));                       // body
  const neck = bmesh(0.18, 0.5, 0.2, 0.42, 1.3, 0);
  neck.rotation.z = -0.5;
  deer.add(neck);
  deer.add(bmesh(0.3, 0.18, 0.16, 0.62, 1.52, 0));                   // head
  // antlers
  for (const sz of [-1, 1]) {
    const a = bmesh(0.04, 0.34, 0.04, 0.58, 1.75, sz * 0.08);
    a.rotation.z = 0.3;
    deer.add(a);
    deer.add(bmesh(0.03, 0.18, 0.03, 0.64, 1.85, sz * 0.12));
  }
  // legs — one foreleg stepping down
  deer.add(bmesh(0.1, 0.65, 0.12, 0.32, 0.5, -0.1));
  const stepLeg = bmesh(0.1, 0.72, 0.12, 0.38, 0.42, 0.1);
  stepLeg.rotation.x = 0.25;
  deer.add(stepLeg);
  deer.add(bmesh(0.1, 0.6, 0.12, -0.34, 0.52, -0.1));
  deer.add(bmesh(0.1, 0.6, 0.12, -0.34, 0.52, 0.1));
  deer.position.y = y0 - 0.18;
  g.add(deer);
  return g;
}

// ---- mama bear + cub statue ----
export function makeBearStatue() {
  const g = new THREE.Group();
  g.add(bmesh(1.7, 0.35, 1.3, 0, 0.17, 0, MAT.granite));
  const y0 = 0.35;
  g.add(bmesh(0.95, 0.6, 0.6, 0, y0 + 0.42, 0, MAT.bronzeDark, SPH));   // round body
  g.add(bmesh(0.34, 0.3, 0.32, 0.5, y0 + 0.6, 0, MAT.bronzeDark, SPH)); // head
  g.add(bmesh(0.1, 0.1, 0.08, 0.68, y0 + 0.56, 0, MAT.bronzeDark, SPH));// snout
  for (const sz of [-1, 1]) g.add(bmesh(0.09, 0.09, 0.05, 0.48, y0 + 0.78, sz * 0.12, MAT.bronzeDark, SPH));
  g.add(bmesh(0.2, 0.4, 0.2, 0.35, y0 + 0.15, 0.2, MAT.bronzeDark));    // forepaw
  // cub climbing on back
  g.add(bmesh(0.4, 0.28, 0.3, -0.25, y0 + 0.85, 0, MAT.bronzeDark, SPH));
  g.add(bmesh(0.16, 0.15, 0.15, -0.05, y0 + 0.95, 0, MAT.bronzeDark, SPH));
  return g;
}

// ---- BCA Firehouse: tall red brick, giant arched windows, green trim, cupola ----
export function makeFirehouse() {
  const g = new THREE.Group();
  const W = 12, D = 7, H = 12.5;
  const trimG = new THREE.MeshLambertMaterial({ color: 0x3c5a52 });
  g.add(box(D, H, W, MAT.brickRedB, 0, H / 2, 0));
  g.add(box(D + 0.3, 0.7, W + 0.2, MAT.trimWhite, 0, H + 0.35, 0));   // corbelled cornice
  g.add(box(D + 0.1, 0.35, W + 0.1, MAT.stoneGray, 0, 3.1, 0));       // stone band
  const fx = -D / 2;
  // stone base + open glass ground floor
  g.add(box(0.2, 0.8, W * 0.9, MAT.stoneGray, fx - 0.05, 0.4, 0));
  g.add(box(0.15, 2.0, W * 0.82, MAT.glassWarm, fx - 0.08, 1.8, 0));
  for (const mz of [-W * 0.28, 0, W * 0.28]) g.add(box(0.2, 2.0, 0.25, MAT.stoneGray, fx - 0.06, 1.8, mz));
  // three tall arched windows with green trim (center tallest)
  const archXs = [[-W * 0.3, 5.2], [0, 6.4], [W * 0.3, 5.2]];
  for (const [z, ah] of archXs) {
    g.add(box(0.14, ah, 2.1, trimG, fx - 0.05, 3.6 + ah / 2, z));
    g.add(box(0.16, ah - 0.35, 1.75, MAT.glass, fx - 0.08, 3.6 + ah / 2, z));
    const arch = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 0.15, 12, 1, false, 0, Math.PI), trimG);
    arch.rotation.z = Math.PI / 2;
    arch.rotation.y = Math.PI / 2;
    arch.position.set(fx - 0.05, 3.6 + ah, z);
    arch.castShadow = true;
    g.add(arch);
    // vertical yellow art banners like the reference photo
    if (z !== 0) g.add(box(0.1, ah * 0.8, 0.35, new THREE.MeshLambertMaterial({ color: 0xe0b52e }), fx - 0.25, 3.6 + ah / 2, z + 1.2));
  }
  // carved name band
  g.add(box(0.18, 0.6, W * 0.85, MAT.stoneGray, fx - 0.07, 3.45, 0));
  // slate bell-tower cupola
  g.add(box(2.4, 1.8, 2.4, MAT.brickRedB, 0, H + 0.9, -W * 0.18));
  g.add(box(2.2, 1.6, 2.2, new THREE.MeshLambertMaterial({ color: 0x5a6670 }), 0, H + 2.4, -W * 0.18));
  const cap = new THREE.Mesh(new THREE.ConeGeometry(1.9, 1.3, 4), new THREE.MeshLambertMaterial({ color: 0x47525c }));
  cap.rotation.y = Math.PI / 4;
  cap.position.set(0, H + 3.8, -W * 0.18);
  cap.castShadow = true;
  g.add(cap);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

// ---- City Hall: brick + limestone pilasters + clock cupola ----
export function makeCityHall() {
  const g = new THREE.Group();
  const W = 22, D = 8, H = 10;
  g.add(box(D, H, W, MAT.brickRedA, 0, H / 2, 0));
  g.add(box(D + 0.4, 0.8, W + 0.4, MAT.trimWhite, 0, H + 0.4, 0));
  const fx = -D / 2;
  // limestone pilaster strips
  for (let i = 0; i < 7; i++) {
    const z = -W / 2 + 1.5 + i * (W - 3) / 6;
    g.add(box(0.25, H - 1.5, 0.9, MAT.cream, fx - 0.08, H / 2 + 0.4, z));
  }
  // windows between pilasters
  for (let i = 0; i < 6; i++) {
    const z = -W / 2 + 1.5 + (i + 0.5) * (W - 3) / 6;
    g.add(box(0.14, 1.8, 1.1, MAT.glass, fx - 0.12, 6.6, z));
    g.add(box(0.14, 1.8, 1.1, MAT.glass, fx - 0.12, 3.6, z));
  }
  // grand entrance: granite stairs + white door surround
  g.add(box(2.2, 1.1, 5.0, MAT.granite, fx - 1.0, 0.55, 0));
  g.add(box(1.2, 0.55, 6.4, MAT.granite, fx - 1.9, 0.27, 0));
  g.add(box(0.3, 2.6, 2.2, MAT.trimWhite, fx - 0.1, 2.5, 0));
  g.add(box(0.2, 2.1, 1.3, MAT.trimWhite, fx - 0.25, 2.2, 0));
  g.add(box(0.15, 1.9, 1.0, MAT.doorGreen, fx - 0.3, 2.05, 0));
  // iron rails
  for (const sz of [-1, 1]) g.add(box(1.6, 0.5, 0.08, MAT.ironBlack, fx - 1.4, 1.45, sz * 2.4));
  // clock cupola
  g.add(box(2.6, 2.2, 2.6, MAT.trimWhite, 0, H + 1.8, 0));
  const clock = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.1, 16), MAT.chalkWhite);
  clock.rotation.z = Math.PI / 2;
  clock.position.set(-1.35, H + 2.1, 0);
  g.add(clock);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.9, 10, 8), new THREE.MeshLambertMaterial({ color: 0xd9b23c }));
  dome.scale.y = 0.7;
  dome.position.set(0, H + 3.3, 0);
  g.add(dome);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

// ---- playful ice cream shop storefront (unbranded homage) ----
export function makeIceCreamShop() {
  const g = new THREE.Group();
  const W = 11, D = 7, H = 6.8;
  const teal = new THREE.MeshLambertMaterial({ color: 0x2a9db0 });
  const pink = new THREE.MeshLambertMaterial({ color: 0xe98ab8 });
  g.add(box(D, H, W, MAT.brickTan, 0, H / 2, 0));
  g.add(box(D + 0.3, 0.4, W + 0.2, MAT.trimDark, 0, H + 0.2, 0));
  const fx = -D / 2;
  // big teal sign band
  g.add(box(0.25, 1.1, W * 0.9, teal, fx - 0.1, 3.3, 0));
  g.add(box(0.28, 0.25, W * 0.6, MAT.chalkWhite, fx - 0.12, 3.3, 0)); // "lettering"
  // storefront glass with warm interior + counter
  g.add(box(0.1, 2.2, W * 0.8, MAT.interiorGlow, fx + 0.8, 1.25, 0));
  g.add(box(0.5, 0.9, W * 0.5, MAT.interiorProp, fx + 0.5, 0.45, 0.6)); // counter
  g.add(box(0.06, 2.2, W * 0.8, MAT.glassClear, fx - 0.02, 1.25, 0));
  // giant swirl cone sign
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.0, 8), MAT.cardboard);
  cone.rotation.x = Math.PI;
  cone.position.set(fx - 0.55, 4.7, W * 0.32);
  g.add(cone);
  const scoop = new THREE.Mesh(SPH, pink);
  scoop.scale.set(0.45, 0.5, 0.45);
  scoop.position.set(fx - 0.55, 5.5, W * 0.32);
  g.add(scoop);
  const swirl = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.55, 8), MAT.chalkWhite);
  swirl.position.set(fx - 0.55, 5.95, W * 0.32);
  g.add(swirl);
  // reclaimed-wood planter fence out front (like the photos)
  const fenceMats = [teal, MAT.chalkWhite, MAT.woodLight, pink];
  for (let i = 0; i < 6; i++) {
    g.add(box(0.35, 0.16, 1.5, fenceMats[i % 4], fx - 0.9, 0.15 + (i % 3) * 0.18, -W * 0.25 + Math.floor(i / 3) * 1.6));
  }
  for (let i = 0; i < 3; i++) {
    const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), MAT.leafGreenB);
    bush.scale.set(0.3, 0.22, 0.3);
    bush.position.set(fx - 0.9, 0.65, -W * 0.25 + i * 0.8);
    g.add(bush);
  }
  // upper windows
  for (let i = 0; i < 3; i++) {
    g.add(box(0.12, 1.3, 1.0, MAT.glass, fx - 0.04, 5.2, -W / 2 + (i + 0.5) * (W / 3)));
  }
  // customers with cones
  for (let i = 0; i < 2; i++) {
    const cust = makePerson({ coffee: false });
    cust.position.set(fx - 1.6, 0, 1.2 - i * 2.2);
    cust.rotation.y = Math.PI / 2;
    const cc = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.2, 6), MAT.cardboard);
    cc.rotation.x = Math.PI;
    cc.position.set(0.35, 1.2, -0.3);
    cust.add(cc);
    const sc = new THREE.Mesh(SPH, i ? pink : MAT.chalkWhite);
    sc.scale.setScalar(0.09);
    sc.position.set(0.35, 1.33, -0.3);
    cust.add(sc);
    g.add(cust);
  }
  g.traverse((o) => { if (o.isMesh && o.castShadow === undefined) o.castShadow = true; });
  return g;
}
