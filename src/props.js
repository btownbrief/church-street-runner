// Procedural placeholder props for Church Street. Every builder returns a
// THREE.Group / Mesh; swap any of them for a GLB via assets.loadModel later.
import * as THREE from 'three';

// ---------------------------------------------------------------- textures

export function makeBrickTexture(w = 256, h = 256, base = '#a5502f') {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#8a3f24'; // mortar joints
  ctx.fillRect(0, 0, w, h);
  const bw = 32, bh = 14, gap = 2;
  const tones = ['#a5502f', '#b05a36', '#9a4829', '#ad5433', '#a24d2c', '#b7623c'];
  for (let row = 0, y = 0; y < h; row++, y += bh) {
    const off = (row % 2) * (bw / 2);
    for (let x = -bw; x < w + bw; x += bw) {
      ctx.fillStyle = tones[Math.floor(Math.random() * tones.length)];
      ctx.fillRect(x + off + gap, y + gap, bw - gap * 2, bh - gap * 2);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function makeWallBrickTexture() {
  return makeBrickTexture(128, 128);
}

// ---------------------------------------------------------------- materials
// Shared everywhere for low draw-state churn.

export const MAT = {
  brickRedA: new THREE.MeshLambertMaterial({ color: 0xa04a2c }),
  brickRedB: new THREE.MeshLambertMaterial({ color: 0x8d3f26 }),
  brickTan: new THREE.MeshLambertMaterial({ color: 0xc8a878 }),
  cream: new THREE.MeshLambertMaterial({ color: 0xe8dcc4 }),
  stoneGray: new THREE.MeshLambertMaterial({ color: 0x9a948a }),
  trimWhite: new THREE.MeshLambertMaterial({ color: 0xf4efe4 }),
  trimDark: new THREE.MeshLambertMaterial({ color: 0x3d3a36 }),
  glass: new THREE.MeshLambertMaterial({ color: 0x5f7d90 }),
  glassWarm: new THREE.MeshLambertMaterial({ color: 0xe8c988, emissive: 0x664e1e }),
  ironBlack: new THREE.MeshLambertMaterial({ color: 0x24211f }),
  woodBrown: new THREE.MeshLambertMaterial({ color: 0x6b4a2f }),
  woodLight: new THREE.MeshLambertMaterial({ color: 0x9c7248 }),
  leafGreen: new THREE.MeshLambertMaterial({ color: 0x4d7c3a }),
  leafGreenB: new THREE.MeshLambertMaterial({ color: 0x5f9147 }),
  leafFall: new THREE.MeshLambertMaterial({ color: 0xc98a2e }),
  trunk: new THREE.MeshLambertMaterial({ color: 0x5c4632 }),
  awningRed: new THREE.MeshLambertMaterial({ color: 0xb03a30 }),
  awningGreen: new THREE.MeshLambertMaterial({ color: 0x2e5f43 }),
  awningBlue: new THREE.MeshLambertMaterial({ color: 0x2f4d73 }),
  awningBurg: new THREE.MeshLambertMaterial({ color: 0x6e2436 }),
  umbRed: new THREE.MeshLambertMaterial({ color: 0xc23b2e, side: THREE.DoubleSide }),
  umbGreen: new THREE.MeshLambertMaterial({ color: 0x2f6b4f, side: THREE.DoubleSide }),
  umbCream: new THREE.MeshLambertMaterial({ color: 0xe9e2cf, side: THREE.DoubleSide }),
  orange: new THREE.MeshLambertMaterial({ color: 0xe8722a }),
  safetyStripe: new THREE.MeshLambertMaterial({ color: 0xf5f0e6 }),
  cardboard: new THREE.MeshLambertMaterial({ color: 0xb08d5e }),
  planterClay: new THREE.MeshLambertMaterial({ color: 0x7d4b35 }),
  bikeBlue: new THREE.MeshLambertMaterial({ color: 0x3a6ea5 }),
  chalkWhite: new THREE.MeshLambertMaterial({ color: 0xf2ead8 }),
  lampGlow: new THREE.MeshLambertMaterial({ color: 0xfff2c8, emissive: 0xffe9a8, emissiveIntensity: 0.9 }),
  glassClear: new THREE.MeshLambertMaterial({ color: 0xb8d4de, transparent: true, opacity: 0.35 }),
  interiorGlow: new THREE.MeshLambertMaterial({ color: 0xf3d9a0, emissive: 0x9a7838, emissiveIntensity: 0.55 }),
  interiorDark: new THREE.MeshLambertMaterial({ color: 0x2e2620 }),
  interiorProp: new THREE.MeshLambertMaterial({ color: 0x453a30 }),
  doorGreen: new THREE.MeshLambertMaterial({ color: 0x2e5f43 }),
  doorRed: new THREE.MeshLambertMaterial({ color: 0x8e2f27 }),
  doorBlue: new THREE.MeshLambertMaterial({ color: 0x2f4d73 }),
  asphalt: new THREE.MeshLambertMaterial({ color: 0x4c4a48 }),
  curb: new THREE.MeshLambertMaterial({ color: 0xc4bcab }),
  boulder: new THREE.MeshLambertMaterial({ color: 0x6e4a3d }),
  boulderB: new THREE.MeshLambertMaterial({ color: 0x7d5a49 }),
  bronze: new THREE.MeshLambertMaterial({ color: 0x4f5a4a }),
  bronzeDark: new THREE.MeshLambertMaterial({ color: 0x3d463c }),
  granite: new THREE.MeshLambertMaterial({ color: 0xb5b0a5 }),
  flag: [
    new THREE.MeshLambertMaterial({ color: 0xd23b3b, side: THREE.DoubleSide }),
    new THREE.MeshLambertMaterial({ color: 0xe8a02a, side: THREE.DoubleSide }),
    new THREE.MeshLambertMaterial({ color: 0x2e8f5b, side: THREE.DoubleSide }),
    new THREE.MeshLambertMaterial({ color: 0x3a6ea5, side: THREE.DoubleSide }),
    new THREE.MeshLambertMaterial({ color: 0x9b59b6, side: THREE.DoubleSide }),
    new THREE.MeshLambertMaterial({ color: 0x40b8c4, side: THREE.DoubleSide }),
  ],
};

const wallBrickTex = makeWallBrickTexture();
MAT.brickTexA = new THREE.MeshLambertMaterial({ map: wallBrickTex });

// ---------------------------------------------------------------- helpers

const BOX = new THREE.BoxGeometry(1, 1, 1);
const CYL = new THREE.CylinderGeometry(1, 1, 1, 8);
const SPHERE = new THREE.SphereGeometry(1, 8, 6);
const ICO = new THREE.IcosahedronGeometry(1, 1);
const CONE = new THREE.ConeGeometry(1, 1, 8);

export function box(w, h, d, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(BOX, mat);
  m.scale.set(w, h, d);
  m.position.set(x, y, z);
  return m;
}
export function cyl(rTop, rBot, h, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(CYL, mat);
  m.scale.set(rTop || rBot, h, rTop || rBot);
  if (rTop !== rBot) {
    // need real tapered cylinder
    m.geometry = new THREE.CylinderGeometry(rTop, rBot, 1, 8);
    m.scale.set(1, h, 1);
  }
  m.position.set(x, y, z);
  return m;
}

function shadow(obj, cast = true, receive = false) {
  obj.traverse((o) => {
    if (o.isMesh) { o.castShadow = cast; o.receiveShadow = receive; }
  });
  return obj;
}

// ---------------------------------------------------------------- buildings

const AWNING_MATS = [MAT.awningRed, MAT.awningGreen, MAT.awningBlue, MAT.awningBurg];
const WALL_MATS = [MAT.brickRedA, MAT.brickRedB, MAT.brickTan, MAT.cream, MAT.stoneGray];

export function makeAwning(width, mat) {
  const g = new THREE.Group();
  const slope = new THREE.Mesh(BOX, mat);
  slope.scale.set(width, 0.08, 1.3);
  slope.rotation.x = 0.42;
  slope.position.set(0, 0, 0.55);
  g.add(slope);
  const valance = box(width, 0.28, 0.06, mat, 0, -0.32, 1.12);
  g.add(valance);
  return g;
}

// A multi-story Church-Street style storefront building facing the street.
// Pass an explicit width so neighbors can be packed without overlapping.
export function makeStorefront(rng = Math.random, width = 10) {
  const g = new THREE.Group();
  const floors = 2 + Math.floor(rng() * 2); // 2-3 stories
  const depth = 7;
  const floorH = 3.1;
  const h = floors * floorH + 0.6;
  const wall = WALL_MATS[Math.floor(rng() * WALL_MATS.length)];

  const body = box(depth, h, width - 0.15, wall, 0, h / 2, 0);
  g.add(body);
  // cornice — inset slightly so neighboring cornices never interpenetrate
  g.add(box(depth + 0.4, 0.5, width - 0.25, MAT.trimWhite, 0, h + 0.25, 0));

  // Street face is local -x; props sit at x = -depth/2.
  const fx = -depth / 2;

  // ---- ground floor: recessed lit interior behind display glass ----
  const shopW = width * 0.8;
  const lit = rng() < 0.75;
  // interior back wall (warm glow) set into the facade
  g.add(box(0.1, 2.3, shopW, lit ? MAT.interiorGlow : MAT.interiorDark, fx + 0.9, 1.3, 0));
  g.add(box(1.0, 0.1, shopW, MAT.interiorDark, fx + 0.45, 2.42, 0)); // ceiling of recess
  // interior silhouettes: shelves / racks / counter
  const style = Math.floor(rng() * 3);
  for (let i = 0; i < 3; i++) {
    const z = -shopW / 2 + (i + 0.5) * (shopW / 3);
    if (style === 0) g.add(box(0.5, 1.15, 1.0, MAT.interiorProp, fx + 0.55, 0.6, z));            // shelving
    else if (style === 1) { g.add(box(0.06, 1.25, 0.9, MAT.interiorProp, fx + 0.5, 0.65, z));    // clothing racks
      g.add(box(0.4, 0.08, 0.9, MAT.interiorProp, fx + 0.5, 1.28, z)); }
    else if (i === 1) g.add(box(0.55, 0.95, shopW * 0.55, MAT.interiorProp, fx + 0.6, 0.5, 0));  // café counter
  }
  // display glass — transparent so the interior reads through
  g.add(box(0.06, 2.3, shopW, MAT.glassClear, fx - 0.02, 1.3, 0));
  // glass mullions
  for (const mz of [-shopW / 2, 0, shopW / 2]) {
    g.add(box(0.1, 2.3, 0.1, MAT.trimDark, fx - 0.03, 1.3, mz));
  }
  // ---- door: recessed, with frame, kickplate and handle ----
  const doorZ = width * 0.5 - (width - shopW) / 4 - 0.6;
  const doorMats = [MAT.doorGreen, MAT.doorRed, MAT.doorBlue, MAT.trimDark];
  const doorMat = doorMats[Math.floor(rng() * doorMats.length)];
  g.add(box(0.3, 2.5, 1.3, wall, fx + 0.1, 1.25, doorZ));                 // door bay wall
  g.add(box(0.1, 2.45, 1.1, MAT.trimWhite, fx - 0.06, 1.22, doorZ));      // frame
  g.add(box(0.08, 2.25, 0.85, doorMat, fx - 0.1, 1.12, doorZ));           // door
  g.add(box(0.06, 0.8, 0.6, MAT.glass, fx - 0.14, 1.55, doorZ));          // door window
  g.add(box(0.05, 0.16, 0.06, MAT.trimWhite, fx - 0.15, 1.05, doorZ - 0.3)); // handle
  g.add(box(0.12, 0.06, 1.2, MAT.stoneGray, fx - 0.15, 0.03, doorZ));     // threshold step
  // storefront trim band above glass
  g.add(box(0.2, 0.45, width * 0.9, MAT.trimDark, fx - 0.05, 2.72, 0));

  // Awning over part of storefront
  if (rng() < 0.8) {
    const awn = makeAwning(shopW * (0.55 + rng() * 0.3), AWNING_MATS[Math.floor(rng() * AWNING_MATS.length)]);
    awn.rotation.y = -Math.PI / 2;
    awn.position.set(fx - 0.2, 2.55, (rng() - 0.5) * width * 0.15);
    g.add(awn);
  }

  // Upper windows with sills and lintels
  for (let f = 1; f < floors; f++) {
    const y = f * floorH + 1.5;
    const count = Math.max(2, Math.floor(width / 2.4));
    for (let i = 0; i < count; i++) {
      const z = -width / 2 + (i + 0.5) * (width / count);
      g.add(box(0.3, 1.5, 1.0, rng() < 0.2 ? MAT.glassWarm : MAT.glass, fx + 0.02, y, z));
      g.add(box(0.34, 0.14, 1.2, MAT.trimWhite, fx, y + 0.85, z));
      g.add(box(0.34, 0.12, 1.2, MAT.trimWhite, fx, y - 0.85, z));
    }
  }

  // Occasional vertical shop sign
  if (rng() < 0.4) {
    const sign = box(0.25, 2.2, 0.5, AWNING_MATS[Math.floor(rng() * AWNING_MATS.length)], fx - 0.5, floorH + 1.6, width * 0.3);
    g.add(sign);
  }
  return shadow(g);
}

// ---------------------------------------------------------------- street furniture

export function makeLampPost() {
  const g = new THREE.Group();
  g.add(cyl(0.07, 0.1, 4.4, MAT.ironBlack, 0, 2.2, 0));
  g.add(cyl(0.16, 0.16, 0.3, MAT.ironBlack, 0, 0.15, 0));
  // curved arm approximated with two segments
  const a1 = cyl(0.05, 0.05, 1.0, MAT.ironBlack, 0.32, 4.55, 0);
  a1.rotation.z = 1.25;
  g.add(a1);
  const a2 = cyl(0.05, 0.05, 0.5, MAT.ironBlack, 0.78, 4.42, 0);
  a2.rotation.z = 2.1;
  g.add(a2);
  const lamp = new THREE.Mesh(SPHERE, MAT.lampGlow);
  lamp.scale.set(0.22, 0.28, 0.22);
  lamp.position.set(0.95, 4.2, 0);
  g.add(lamp);
  const cap = cyl(0.3, 0.16, 0.14, MAT.ironBlack, 0.95, 4.42, 0);
  g.add(cap);
  return shadow(g);
}

// Church St public bench: ornate black cast-iron ends, slat seat/back.
// wood=true gives the brown-slat variant, false the all-black metal one.
export function makeBench(wood = true) {
  const g = new THREE.Group();
  const slat = wood ? MAT.woodBrown : MAT.ironBlack;
  for (let i = 0; i < 4; i++) {
    g.add(box(0.13, 0.035, 1.7, slat, -0.24 + i * 0.16, 0.46, 0));      // seat slats
    g.add(box(0.035, 0.13, 1.7, slat, -0.33 + i * 0.02, 0.62 + i * 0.15, 0)); // back slats
  }
  for (const z of [-0.78, 0.78]) {
    // cast-iron end frame: leg arcs + armrest
    g.add(box(0.5, 0.06, 0.06, MAT.ironBlack, 0, 0.44, z));
    const backr = box(0.06, 0.7, 0.06, MAT.ironBlack, -0.32, 0.75, z);
    backr.rotation.z = -0.12;
    g.add(backr);
    g.add(box(0.06, 0.44, 0.06, MAT.ironBlack, 0.22, 0.22, z));
    g.add(box(0.06, 0.44, 0.06, MAT.ironBlack, -0.24, 0.22, z));
    g.add(box(0.42, 0.05, 0.05, MAT.ironBlack, 0.02, 0.66, z)); // armrest
    g.add(box(0.3, 0.05, 0.06, MAT.ironBlack, 0, 0.02, z));     // foot
  }
  return shadow(g);
}

export function makeTree(fall = false) {
  const g = new THREE.Group();
  const trunkH = 2.4 + Math.random() * 0.8;
  g.add(cyl(0.13, 0.18, trunkH, MAT.trunk, 0, trunkH / 2, 0));
  const mats = fall ? [MAT.leafFall, MAT.leafGreenB] : [MAT.leafGreen, MAT.leafGreenB];
  const blobs = 3 + Math.floor(Math.random() * 2);
  for (let i = 0; i < blobs; i++) {
    const b = new THREE.Mesh(ICO, mats[i % mats.length]);
    const s = 1.0 + Math.random() * 0.7;
    b.scale.set(s, s * 0.85, s);
    b.position.set((Math.random() - 0.5) * 1.2, trunkH + 0.6 + Math.random() * 1.0, (Math.random() - 0.5) * 1.2);
    g.add(b);
  }
  // iron tree grate ring like on Church St
  g.add(cyl(0.55, 0.55, 0.06, MAT.ironBlack, 0, 0.03, 0));
  return shadow(g);
}

// low round flower pot — no more bush-on-a-box
export function makePlanter(big = false) {
  const g = new THREE.Group();
  const r = big ? 0.55 : 0.38, h = big ? 0.45 : 0.38;
  g.add(cyl(r * 0.92, r * 0.7, h, MAT.planterClay, 0, h / 2, 0));
  g.add(cyl(r, r, 0.09, MAT.planterClay, 0, h, 0));
  const flowerMats = [MAT.awningRed, MAT.flag[1], MAT.umbCream, MAT.flag[4]];
  for (let i = 0; i < (big ? 5 : 3); i++) {
    const f = new THREE.Mesh(ICO, flowerMats[i % flowerMats.length]);
    f.scale.setScalar(0.09 + Math.random() * 0.05);
    f.position.set((Math.random() - 0.5) * r * 1.1, h + 0.16 + Math.random() * 0.08, (Math.random() - 0.5) * r * 1.1);
    g.add(f);
    const leaf = new THREE.Mesh(ICO, MAT.leafGreenB);
    leaf.scale.set(0.12, 0.07, 0.12);
    leaf.position.set(f.position.x, h + 0.08, f.position.z);
    g.add(leaf);
  }
  return shadow(g);
}

export function makeSandwichBoard() {
  // proper A-frame: panels hinge at the top, feet spread on the ground
  const g = new THREE.Group();
  const a = box(0.05, 0.92, 0.62, MAT.woodBrown, -0.15, 0.44, 0);
  a.rotation.z = -0.3;
  const b = box(0.05, 0.92, 0.62, MAT.woodBrown, 0.15, 0.44, 0);
  b.rotation.z = 0.3;
  g.add(a, b);
  const face = box(0.02, 0.6, 0.48, MAT.chalkWhite, -0.19, 0.44, 0);
  face.rotation.z = -0.3;
  g.add(face);
  const scribble = box(0.015, 0.08, 0.34, MAT.trimDark, -0.225, 0.58, 0);
  scribble.rotation.z = -0.3;
  g.add(scribble);
  return shadow(g);
}

export function makeChair() {
  const g = new THREE.Group();
  g.add(box(0.45, 0.05, 0.45, MAT.ironBlack, 0, 0.45, 0));
  g.add(box(0.45, 0.5, 0.05, MAT.ironBlack, 0, 0.72, -0.2));
  for (const [x, z] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) {
    g.add(box(0.04, 0.45, 0.04, MAT.ironBlack, x, 0.22, z));
  }
  return shadow(g);
}

export function makeUmbrellaTable(mat) {
  const g = new THREE.Group();
  g.add(cyl(0.5, 0.5, 0.05, MAT.woodLight, 0, 0.72, 0));
  g.add(cyl(0.04, 0.04, 0.72, MAT.ironBlack, 0, 0.36, 0));
  g.add(cyl(0.03, 0.03, 1.5, MAT.ironBlack, 0, 1.5, 0));
  const canopy = new THREE.Mesh(CONE, mat || MAT.umbRed);
  canopy.scale.set(1.15, 0.45, 1.15);
  canopy.position.y = 2.25;
  g.add(canopy);
  return shadow(g);
}

export function makeBarrier() {
  // orange-striped construction barricade
  const g = new THREE.Group();
  for (const z of [-0.7, 0.7]) {
    const legA = box(0.07, 1.0, 0.07, MAT.orange, 0.2, 0.5, z);
    legA.rotation.z = -0.35;
    const legB = box(0.07, 1.0, 0.07, MAT.orange, -0.2, 0.5, z);
    legB.rotation.z = 0.35;
    g.add(legA, legB);
  }
  g.add(box(0.1, 0.28, 1.7, MAT.orange, 0, 0.82, 0));
  g.add(box(0.11, 0.09, 1.7, MAT.safetyStripe, 0, 0.82, 0));
  g.add(box(0.1, 0.2, 1.7, MAT.orange, 0, 0.35, 0));
  return shadow(g);
}

export function makeCone() {
  const g = new THREE.Group();
  g.add(box(0.5, 0.06, 0.5, MAT.orange, 0, 0.03, 0));
  const c = new THREE.Mesh(CONE, MAT.orange);
  c.scale.set(0.22, 0.62, 0.22);
  c.position.y = 0.34;
  g.add(c);
  const stripe = cyl(0.15, 0.18, 0.12, MAT.safetyStripe, 0, 0.35, 0);
  g.add(stripe);
  return shadow(g);
}

export function makeDeliveryBoxes() {
  const g = new THREE.Group();
  g.add(box(0.7, 0.5, 0.7, MAT.cardboard, 0, 0.25, 0));
  g.add(box(0.55, 0.4, 0.55, MAT.cardboard, 0.1, 0.7, 0.05));
  const b3 = box(0.4, 0.35, 0.4, MAT.cardboard, -0.15, 0.42, -0.35);
  b3.rotation.y = 0.4;
  g.add(b3);
  return shadow(g);
}

export function makeBike() {
  const g = new THREE.Group();
  const wheelGeo = new THREE.TorusGeometry(0.3, 0.035, 6, 14);
  for (const x of [-0.45, 0.45]) {
    const w = new THREE.Mesh(wheelGeo, MAT.ironBlack);
    w.position.set(x, 0.3, 0);
    g.add(w);
  }
  const bar1 = box(0.55, 0.05, 0.05, MAT.bikeBlue, 0, 0.62, 0);
  bar1.rotation.z = 0.25;
  const bar2 = box(0.5, 0.05, 0.05, MAT.bikeBlue, -0.2, 0.45, 0);
  bar2.rotation.z = -0.9;
  const bar3 = box(0.5, 0.05, 0.05, MAT.bikeBlue, 0.25, 0.45, 0);
  bar3.rotation.z = 1.1;
  g.add(bar1, bar2, bar3);
  g.add(box(0.05, 0.3, 0.05, MAT.ironBlack, -0.42, 0.75, 0));
  g.add(box(0.05, 0.04, 0.4, MAT.ironBlack, -0.42, 0.92, 0));
  g.add(box(0.25, 0.05, 0.12, MAT.trimDark, 0.42, 0.85, 0));
  return shadow(g);
}

// Overhead scaffold across one lane — slide under it.
export function makeScaffold() {
  const g = new THREE.Group();
  for (const z of [-0.9, 0.9]) {
    g.add(cyl(0.05, 0.05, 2.4, MAT.ironBlack, 0, 1.2, z));
    g.add(cyl(0.05, 0.05, 2.4, MAT.ironBlack, 0.8, 1.2, z));
  }
  g.add(box(1.6, 0.1, 2.2, MAT.woodLight, 0.4, 1.18, 0));
  g.add(box(1.7, 0.16, 2.3, MAT.orange, 0.4, 2.4, 0));
  const stripe = box(1.72, 0.05, 2.32, MAT.safetyStripe, 0.4, 2.4, 0);
  g.add(stripe);
  return shadow(g);
}

// The famous reddish-brown Church Street boulders.
export function makeBoulder(s = 1) {
  const g = new THREE.Group();
  const rock = new THREE.Mesh(ICO, MAT.boulder);
  rock.scale.set(s * (0.8 + Math.random() * 0.3), s * 0.62, s * (0.65 + Math.random() * 0.25));
  rock.rotation.set(Math.random() * 0.4, Math.random() * Math.PI, Math.random() * 0.3);
  rock.position.y = s * 0.5;
  g.add(rock);
  const rock2 = new THREE.Mesh(ICO, MAT.boulderB);
  rock2.scale.set(s * 0.5, s * 0.35, s * 0.45);
  rock2.rotation.y = Math.random() * Math.PI;
  rock2.position.set(s * 0.5, s * 0.22, s * 0.2);
  g.add(rock2);
  return shadow(g);
}

export function makeBoulderCluster() {
  const g = new THREE.Group();
  g.add(makeBoulder(1.3));
  const b = makeBoulder(0.8);
  b.position.set(1.4, 0, 0.8);
  g.add(b);
  return g;
}

// green metal mesh public trash can
export function makeTrashCan() {
  const g = new THREE.Group();
  g.add(cyl(0.34, 0.3, 0.85, MAT.awningGreen, 0, 0.43, 0));
  g.add(cyl(0.37, 0.37, 0.07, MAT.ironBlack, 0, 0.88, 0));
  g.add(cyl(0.12, 0.3, 0.1, MAT.ironBlack, 0, 0.97, 0));
  for (let i = 0; i < 5; i++) {
    const rib = box(0.03, 0.75, 0.03, MAT.ironBlack, Math.cos(i * 1.256) * 0.33, 0.43, Math.sin(i * 1.256) * 0.33);
    g.add(rib);
  }
  return shadow(g);
}

// black newspaper box with a paper-filled window
export function makeNewsBox() {
  const g = new THREE.Group();
  g.add(box(0.5, 0.75, 0.45, MAT.ironBlack, 0, 0.62, 0));
  g.add(box(0.36, 0.4, 0.03, MAT.chalkWhite, 0, 0.72, -0.225)); // window of papers
  g.add(box(0.3, 0.06, 0.02, MAT.trimDark, 0, 0.82, -0.24));    // headline strip
  g.add(box(0.44, 0.06, 0.4, MAT.ironBlack, 0, 1.02, 0));       // coin-slot top
  for (const [x, z] of [[-0.18, -0.15], [0.18, -0.15], [-0.18, 0.15], [0.18, 0.15]]) {
    g.add(box(0.05, 0.26, 0.05, MAT.ironBlack, x, 0.13, z));
  }
  return shadow(g);
}

// temporary event banner strung between two poles — slide under it
export function makeBannerGate() {
  const g = new THREE.Group();
  for (const z of [-1.0, 1.0]) {
    g.add(cyl(0.05, 0.07, 2.5, MAT.ironBlack, 0, 1.25, z));
    g.add(cyl(0.18, 0.2, 0.08, MAT.ironBlack, 0, 0.04, z));
  }
  const banner = box(0.06, 0.75, 2.2, MAT.flag[3], 0, 1.85, 0);
  g.add(banner);
  g.add(box(0.07, 0.1, 2.2, MAT.safetyStripe, 0, 2.26, 0));
  g.add(box(0.07, 0.1, 2.2, MAT.safetyStripe, 0, 1.46, 0));
  return shadow(g);
}

// delivery dolly with a tall stack of boxes + the worker pushing it (solid)
export function makeMailDolly() {
  const g = new THREE.Group();
  // dolly frame
  g.add(box(0.08, 1.7, 0.08, MAT.ironBlack, -0.3, 0.85, -0.28));
  g.add(box(0.08, 1.7, 0.08, MAT.ironBlack, 0.3, 0.85, -0.28));
  g.add(box(0.7, 0.06, 0.5, MAT.ironBlack, 0, 0.08, 0));
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.05, 6, 10), MAT.trimDark);
  wheel.position.set(-0.3, 0.14, -0.3); g.add(wheel);
  const wheel2 = wheel.clone(); wheel2.position.x = 0.3; g.add(wheel2);
  // box stack
  g.add(box(0.62, 0.5, 0.5, MAT.cardboard, 0, 0.4, 0));
  g.add(box(0.58, 0.45, 0.46, MAT.cardboard, 0.02, 0.88, -0.02));
  g.add(box(0.5, 0.42, 0.42, MAT.cardboard, -0.03, 1.3, 0.02));
  g.add(box(0.44, 0.38, 0.38, MAT.cardboard, 0.02, 1.7, 0));
  return shadow(g);
}

// festive little food cart (scenery) — string lights + chalkboard
export function makeFoodCart() {
  const g = new THREE.Group();
  g.add(box(1.9, 1.0, 1.0, MAT.awningBlue, 0, 0.85, 0));
  g.add(box(1.95, 0.08, 1.05, MAT.trimWhite, 0, 1.4, 0));
  g.add(box(0.5, 0.28, 0.02, MAT.trimWhite, -0.4, 0.85, -0.52)); // flag panel
  g.add(box(0.5, 0.28, 0.02, MAT.awningRed, 0.45, 0.85, -0.52));
  // canopy on posts
  for (const [x, z] of [[-0.9, -0.45], [0.9, -0.45], [-0.9, 0.45], [0.9, 0.45]]) {
    g.add(cyl(0.03, 0.03, 1.1, MAT.ironBlack, x, 1.95, z));
  }
  g.add(box(2.1, 0.09, 1.2, MAT.awningRed, 0, 2.5, 0));
  // string lights
  for (let i = 0; i < 7; i++) {
    const b = new THREE.Mesh(SPHERE, MAT.lampGlow);
    b.scale.setScalar(0.045);
    b.position.set(-0.9 + i * 0.3, 2.32 - Math.sin((i / 6) * Math.PI) * 0.12, -0.55);
    g.add(b);
  }
  const wheelG = new THREE.TorusGeometry(0.22, 0.06, 6, 12);
  for (const x of [-0.7, 0.7]) {
    const w = new THREE.Mesh(wheelG, MAT.ironBlack);
    w.position.set(x, 0.24, 0.4);
    g.add(w);
  }
  // chalkboard menu
  const menu = makeSandwichBoard();
  menu.position.set(1.5, 0, -0.4);
  menu.rotation.y = 0.6;
  g.add(menu);
  return shadow(g);
}

// simple sedan for intersection crossings
const CAR_COLORS = [0x8e3b32, 0x35566e, 0x717a6b, 0x2c2c30, 0xcfc8b8];
export function makeCar(colorIdx = Math.floor(Math.random() * CAR_COLORS.length)) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: CAR_COLORS[colorIdx % CAR_COLORS.length] });
  g.add(box(3.6, 0.55, 1.6, bodyMat, 0, 0.55, 0));
  g.add(box(1.9, 0.5, 1.45, bodyMat, -0.1, 1.05, 0));
  g.add(box(1.7, 0.4, 1.3, MAT.glass, -0.1, 1.1, 0));
  const wheelG = new THREE.CylinderGeometry(0.32, 0.32, 0.22, 10);
  for (const [x, z] of [[-1.15, -0.8], [1.15, -0.8], [-1.15, 0.8], [1.15, 0.8]]) {
    const w = new THREE.Mesh(wheelG, MAT.trimDark);
    w.rotation.x = Math.PI / 2;
    w.position.set(x, 0.32, z);
    g.add(w);
  }
  g.add(box(0.12, 0.14, 1.3, MAT.lampGlow, 1.82, 0.6, 0)); // headlights bar
  return shadow(g);
}

// tiny three-wheeled parking-enforcement cart — very Burlington
export function makeParkingCart() {
  const g = new THREE.Group();
  const white = new THREE.MeshLambertMaterial({ color: 0xe8e6df });
  g.add(box(1.7, 0.7, 1.1, white, 0, 0.6, 0));
  g.add(box(1.1, 0.85, 1.0, white, -0.15, 1.35, 0));
  g.add(box(0.95, 0.6, 0.9, MAT.glass, -0.15, 1.4, 0));
  g.add(box(0.5, 0.06, 0.5, MAT.orange, -0.15, 1.82, 0));
  const beacon = cyl(0.09, 0.11, 0.14, MAT.orange, -0.15, 1.92, 0);
  g.add(beacon);
  const wheelG = new THREE.CylinderGeometry(0.24, 0.24, 0.18, 10);
  for (const [x, z] of [[0.6, -0.55], [0.6, 0.55], [-0.65, 0]]) {
    const w = new THREE.Mesh(wheelG, MAT.trimDark);
    w.rotation.x = Math.PI / 2;
    w.position.set(x, 0.24, z);
    g.add(w);
  }
  g.add(box(0.35, 0.18, 0.9, MAT.awningBlue, 0.4, 0.85, 0)); // livery stripe
  return shadow(g);
}

// ---------------------------------------------------------------- festive bunting

export function makeBunting(span, y = 5.6) {
  const g = new THREE.Group();
  const triGeo = new THREE.BufferGeometry();
  triGeo.setAttribute('position', new THREE.Float32BufferAttribute(
    [-0.14, 0, 0, 0.14, 0, 0, 0, -0.34, 0], 3));
  triGeo.computeVertexNormals();
  const n = Math.floor(span / 0.55);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = -span / 2 + t * span;
    const sag = Math.sin(t * Math.PI) * -0.9;
    const tri = new THREE.Mesh(triGeo, MAT.flag[i % MAT.flag.length]);
    tri.position.set(x, y + sag, 0);
    g.add(tri);
  }
  return g;
}
