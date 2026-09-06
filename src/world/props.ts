import * as THREE from 'three';
import { CityBatch } from './batch';
import type { CityMaterials } from './materials';

type Random = () => number;

/* ------------------------------------------------------------------ */
/* Planting                                                            */
/* ------------------------------------------------------------------ */

const LEAF = ['#4c6742', '#5c7649', '#6b8352', '#3f5c3d', '#758a58', '#57713f'];

export type TreeKind = 'neem' | 'gulmohar' | 'palm' | 'banyan' | 'ashoka';

/** Five street trees you actually see in an Indian town, each with its own silhouette. */
export function tree(batch: CityBatch, m: CityMaterials, x: number, z: number, size: number, random: Random, kind: TreeKind = 'neem') {
  batch.box(m.concrete, x, 0.13, z, 2.1, 0.24, 2.1, '#a7a18c');
  batch.box(m.dirt, x, 0.27, z, 1.8, 0.06, 1.8, '#5f5443');

  if (kind === 'palm') {
    const height = size * 1.25;
    for (let segment = 0; segment < 7; segment++) {
      const t = segment / 7;
      batch.add('cylinder', m.wood, x + Math.sin(t * 2) * 0.16 * size * 0.1, 0.3 + t * height, z, size * (0.085 - t * 0.02), height / 7 + 0.04, size * (0.085 - t * 0.02), '#8a7a5c');
    }
    for (let frond = 0; frond < 9; frond++) {
      const angle = frond / 9 * Math.PI * 2;
      const reach = size * 0.62;
      batch.add('cone', m.foliage, x + Math.cos(angle) * reach * 0.5, 0.3 + height + Math.sin(frond) * 0.1 - 0.2, z + Math.sin(angle) * reach * 0.5,
        size * 0.16, reach, size * 0.16, LEAF[frond % 3], angle, 1.35);
    }
    return;
  }

  if (kind === 'ashoka') {
    batch.cylinder(m.wood, x, size * 0.35, z, size * 0.055, size * 0.7, size * 0.055, '#6d5c46');
    for (let tier = 0; tier < 5; tier++) {
      const t = tier / 5;
      batch.add('cone', m.foliage, x, size * (0.5 + t * 0.42), z, size * (0.34 - t * 0.2), size * 0.55, size * (0.34 - t * 0.2), LEAF[tier % LEAF.length]);
    }
    return;
  }

  const trunkHeight = size * (kind === 'banyan' ? 0.5 : 0.82);
  batch.add('cylinder', m.wood, x, trunkHeight * 0.5, z, size * 0.09, trunkHeight, size * 0.09, '#6b5a44');
  const branches = kind === 'banyan' ? 7 : 5;
  for (let branch = 0; branch < branches; branch++) {
    const angle = branch / branches * Math.PI * 2 + random() * 0.5;
    const spread = size * (kind === 'banyan' ? 0.42 : 0.24 + random() * 0.1);
    const bx = x + Math.cos(angle) * spread;
    const bz = z + Math.sin(angle) * spread;
    batch.line(m.wood, new THREE.Vector3(x, trunkHeight * 0.72, z), new THREE.Vector3(bx, trunkHeight + size * 0.1, bz), size * 0.03, '#6b5a44');
    // Two overlapping clumps per branch read as leaves rather than as a ball.
    batch.add('sphere', m.foliage, bx, trunkHeight + size * (0.12 + random() * 0.12), bz,
      size * (kind === 'banyan' ? 0.62 : 0.5), size * 0.42, size * 0.54, LEAF[branch % LEAF.length], angle);
    batch.add('lowSphere', m.foliage, bx + Math.cos(angle) * size * 0.16, trunkHeight + size * (0.24 + random() * 0.1), bz + Math.sin(angle) * size * 0.16,
      size * 0.38, size * 0.3, size * 0.36, LEAF[(branch + 2) % LEAF.length], angle * 1.7);
    batch.add('lowSphere', m.foliage, bx - Math.cos(angle) * size * 0.12, trunkHeight + size * 0.04, bz - Math.sin(angle) * size * 0.12,
      size * 0.34, size * 0.26, size * 0.32, LEAF[(branch + 4) % LEAF.length], angle * 0.6);
    if (kind === 'banyan') {
      // Aerial roots: the reason people gather under these.
      batch.add('cylinder', m.wood, bx, trunkHeight * 0.55, bz, 0.055, trunkHeight * 1.1, 0.055, '#7a6a52');
    }
    if (kind === 'gulmohar' && branch % 2 === 0) {
      batch.add('sphere', m.foliage, bx, trunkHeight + size * 0.26, bz, size * 0.3, size * 0.16, size * 0.28, '#c25a30', angle);
    }
  }
  batch.add('sphere', m.foliage, x, trunkHeight + size * (kind === 'banyan' ? 0.3 : 0.26), z, size * 0.56, size * 0.44, size * 0.54, LEAF[2]);
  batch.add('lowSphere', m.foliage, x, trunkHeight + size * 0.4, z, size * 0.36, size * 0.28, size * 0.34, LEAF[4]);
}

export function potPlant(batch: CityBatch, m: CityMaterials, x: number, y: number, z: number, scale = 1, color = '#a4522f') {
  batch.add('cylinder', m.tile, x, y + 0.16 * scale, z, 0.3 * scale, 0.34 * scale, 0.3 * scale, color);
  batch.add('cylinder', m.tile, x, y + 0.33 * scale, z, 0.34 * scale, 0.06 * scale, 0.34 * scale, color);
  for (let leaf = 0; leaf < 5; leaf++) {
    const angle = leaf / 5 * Math.PI * 2;
    batch.add('sphere', m.foliage, x + Math.cos(angle) * 0.12 * scale, y + (0.5 + (leaf % 2) * 0.12) * scale, z + Math.sin(angle) * 0.12 * scale,
      0.3 * scale, 0.24 * scale, 0.3 * scale, LEAF[leaf % LEAF.length], angle);
  }
}

/* ------------------------------------------------------------------ */
/* Street furniture                                                    */
/* ------------------------------------------------------------------ */

export function bench(batch: CityBatch, m: CityMaterials, x: number, z: number, angle = 0) {
  const sin = Math.sin(angle); const cos = Math.cos(angle);
  for (let slat = 0; slat < 3; slat++) {
    batch.box(m.wood, x - sin * (slat - 1) * 0.21, 0.52, z - cos * (slat - 1) * 0.21, 2.2, 0.07, 0.18, '#8a6a45', angle);
  }
  for (let slat = 0; slat < 3; slat++) {
    batch.box(m.wood, x + sin * -0.3, 0.76 + slat * 0.2, z + cos * -0.3, 2.2, 0.16, 0.07, '#94734b', angle);
  }
  for (const side of [-1, 1]) {
    batch.box(m.metal, x + side * cos * 0.9, 0.26, z - side * sin * 0.9, 0.1, 0.52, 0.5, '#40514b', angle);
    batch.box(m.metal, x + side * cos * 0.9 - sin * 0.3, 0.72, z - side * sin * 0.9 - cos * 0.3, 0.08, 0.62, 0.08, '#40514b', angle);
  }
}

export function dustbin(batch: CityBatch, m: CityMaterials, x: number, z: number, color = '#4c6b52') {
  batch.add('cylinder', m.metal, x, 0.44, z, 0.62, 0.88, 0.62, color);
  batch.add('cylinder', m.metal, x, 0.9, z, 0.7, 0.07, 0.7, '#8b9a90');
  batch.add('cylinder', m.metal, x, 0.96, z, 0.36, 0.08, 0.36, '#8b9a90');
  batch.box(m.metal, x, 0.2, z, 0.72, 0.06, 0.72, '#3d4b44');
}

export function streetLamp(batch: CityBatch, m: CityMaterials, x: number, z: number, direction: number, lamps: THREE.Mesh[], allowLight = true) {
  batch.cylinder(m.metal, x, 3.7, z, 0.15, 7.4, 0.15, '#5e6862');
  batch.add('cylinder', m.concrete, x, 0.34, z, 0.5, 0.68, 0.5, '#8f9080');
  batch.add('cylinder', m.metal, x, 7.05, z, 0.19, 0.16, 0.19, '#77837a');
  const dx = Math.sin(direction) * 1.55; const dz = Math.cos(direction) * 1.55;
  batch.line(m.metal, new THREE.Vector3(x, 7.2, z), new THREE.Vector3(x + dx, 7.62, z + dz), 0.09, '#6c766a');
  batch.box(m.metal, x + dx, 7.56, z + dz, 0.42, 0.16, 1.0, '#54605a', direction);
  batch.box(m.light, x + dx, 7.45, z + dz, 0.33, 0.05, 0.8, '#ffffff', direction);
  // Cabling, a civic notice and the inevitable poster, straight off a real pole.
  batch.box(m.dark, x + 0.16, 4.4, z, 0.05, 3, 0.05, '#2b2f2c');
  if (allowLight) {
    const light = new THREE.PointLight('#ffd5a0', 0, 38, 1.7);
    light.position.set(x + dx, 7.1, z + dz);
    batch.group.add(light);
    const marker = new THREE.Mesh(new THREE.SphereGeometry(0.02, 4, 3), m.light);
    marker.visible = false; marker.userData.light = light; lamps.push(marker);
  }
}

/** Signal head plus pole; the emissive aspect is swapped by the traffic system. */
export function trafficSignal(batch: CityBatch, m: CityMaterials, x: number, z: number, angle: number, signals: THREE.Mesh[]) {
  batch.add('cylinder', m.metal, x, 2.4, z, 0.11, 4.8, 0.11, '#4e5a54');
  batch.add('cylinder', m.concrete, x, 0.2, z, 0.4, 0.4, 0.4, '#9a9787');
  const sin = Math.sin(angle), cos = Math.cos(angle);
  batch.box(m.dark, x + sin * 0.2, 4.05, z + cos * 0.2, 0.42, 1.2, 0.3, '#2c3330', angle);
  const colors = ['#7d2a22', '#8a7422', '#256b39'];
  for (let light = 0; light < 3; light++) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.115, 10, 8), new THREE.MeshStandardMaterial({ color: colors[light], emissive: colors[light], emissiveIntensity: 0.1, roughness: 0.35 }));
    mesh.position.set(x + sin * 0.36, 4.44 - light * 0.39, z + cos * 0.36);
    mesh.scale.z = 0.6;
    mesh.userData.aspect = light;
    mesh.castShadow = false;
    batch.group.add(mesh);
    signals.push(mesh);
  }
}

export function busShelter(batch: CityBatch, m: CityMaterials, x: number, z: number, angle: number) {
  const sin = Math.sin(angle); const cos = Math.cos(angle);
  for (const side of [-1, 1]) batch.box(m.metal, x + side * cos * 2.6, 1.55, z - side * sin * 2.6, 0.09, 3.1, 0.09, '#46584d');
  batch.box(m.metal, x, 3.15, z, 5.8, 0.16, 2.4, '#4f6155', angle);
  batch.box(m.tile, x - sin * 0.1, 3.28, z - cos * 0.1, 5.9, 0.1, 2.5, '#8d5a3f', angle);
  batch.box(m.glass, x - sin * 0.85, 1.7, z - cos * 0.85, 5.3, 2.5, 0.05, '#93b0aa', angle);
  bench(batch, m, x, z, angle);
  batch.box(m.dark, x + cos * 2.35 - sin * 0.6, 1.7, z - sin * 2.35 - cos * 0.6, 0.1, 1.7, 1.1, '#2f3833', angle);
}

/** Big roadside hoarding: the loudest thing on any Indian high street. */
export function hoarding(batch: CityBatch, m: CityMaterials, x: number, z: number, angle: number, color: string) {
  for (const side of [-1, 1]) batch.add('cylinder', m.metal, x + Math.cos(angle) * side * 2.6, 2.6, z - Math.sin(angle) * side * 2.6, 0.16, 5.2, 0.16, '#59635c');
  batch.box(m.dark, x, 6.4, z, 7.4, 3.4, 0.16, '#3c443f', angle);
  batch.panel(m.paint, x + Math.sin(angle) * 0.1, 6.4, z + Math.cos(angle) * 0.1, 7, 3.1, color, angle);
  batch.box(m.metal, x, 4.6, z, 7.4, 0.14, 0.5, '#5d6961', angle);
  for (let lamp = -1; lamp <= 1; lamp++) batch.box(m.light, x + Math.cos(angle) * lamp * 2.4 + Math.sin(angle) * 0.4, 4.75, z - Math.sin(angle) * lamp * 2.4 + Math.cos(angle) * 0.4, 0.5, 0.14, 0.2, '#ffffff', angle);
}

export function barricade(batch: CityBatch, m: CityMaterials, x: number, z: number, angle: number) {
  batch.box(m.wood, x, 0.86, z, 2.2, 0.22, 0.1, '#d8d2c2', angle);
  batch.box(m.wood, x, 0.52, z, 2.2, 0.22, 0.1, '#c14b39', angle);
  for (const side of [-1, 1]) batch.box(m.wood, x + Math.cos(angle) * side * 0.95, 0.5, z - Math.sin(angle) * side * 0.95, 0.12, 1, 0.4, '#9a9384', angle);
}

export function tyreStack(batch: CityBatch, m: CityMaterials, x: number, z: number, count = 4) {
  for (let i = 0; i < count; i++) {
    batch.add('torus', m.dark, x + Math.sin(i * 2.1) * 0.05, 0.16 + i * 0.2, z + Math.cos(i * 1.7) * 0.05, 1.05, 1.05, 1.05, '#22262a', i * 0.6, Math.PI / 2);
  }
}

export function handCart(batch: CityBatch, m: CityMaterials, x: number, z: number, angle: number, color = '#7d6a4a') {
  const sin = Math.sin(angle), cos = Math.cos(angle);
  batch.box(m.wood, x, 0.86, z, 2.4, 0.12, 1.3, color, angle);
  for (let rail = 0; rail < 2; rail++) batch.box(m.wood, x + sin * (rail ? 0.62 : -0.62), 1.02, z + cos * (rail ? 0.62 : -0.62), 2.4, 0.2, 0.08, color, angle);
  for (const side of [-1, 1]) batch.add('torus', m.dark, x + cos * side * 0.68, 0.4, z - sin * side * 0.68, 0.86, 0.86, 0.86, '#1f2326', angle, Math.PI / 2);
  batch.add('cylinder', m.wood, x + sin * 1.35, 0.62, z + cos * 1.35, 0.05, 1.1, 0.05, '#6b5a3c', angle, 0.9);
}

export function speedBreaker(batch: CityBatch, m: CityMaterials, x: number, z: number, horizontal: boolean) {
  const length = 15;
  for (let stripe = -7; stripe <= 7; stripe++) {
    const color = stripe % 2 === 0 ? '#d9cf9f' : '#3a3a38';
    if (horizontal) batch.add('cylinder', m.paint, x + stripe * (length / 15), 0.02, z, 0.16, length / 15 * 0.95, 0.16, color, 0, 0, Math.PI / 2);
    else batch.add('cylinder', m.paint, x, 0.02, z + stripe * (length / 15), 0.16, length / 15 * 0.95, 0.16, color, Math.PI / 2, 0, Math.PI / 2);
  }
}

export function median(batch: CityBatch, m: CityMaterials, x1: number, z1: number, x2: number, z2: number, random: Random) {
  const steps = Math.max(2, Math.round(Math.hypot(x2 - x1, z2 - z1) / 6));
  const horizontal = Math.abs(x2 - x1) > Math.abs(z2 - z1);
  for (let i = 0; i < steps; i++) {
    const t = (i + 0.5) / steps;
    const x = x1 + (x2 - x1) * t; const z = z1 + (z2 - z1) * t;
    // A low painted kerb with a hedge, the way a divided carriageway really looks.
    batch.box(m.concrete, x, 0.17, z, horizontal ? 5.7 : 0.66, 0.34, horizontal ? 0.66 : 5.7, '#d6c99b');
    batch.box(m.paint, x, 0.18, z, horizontal ? 2.8 : 0.68, 0.345, horizontal ? 0.68 : 2.8, '#2f3330');
    if (i % 3 === 0) potPlant(batch, m, x, 0.34, z, 0.55, '#8d5a3a');
    else for (let clump = -1; clump <= 1; clump++) {
      batch.add('lowSphere', m.foliage, x + (horizontal ? clump * 1.5 : 0), 0.5, z + (horizontal ? 0 : clump * 1.5),
        0.62, 0.42, 0.62, LEAF[Math.floor(random() * LEAF.length)], clump);
    }
  }
}

/* ------------------------------------------------------------------ */
/* Trade                                                               */
/* ------------------------------------------------------------------ */

export function marketCart(batch: CityBatch, m: CityMaterials, x: number, z: number, angle: number, random: Random, chai = false) {
  const sin = Math.sin(angle); const cos = Math.cos(angle);
  const box = (mat: THREE.Material, lx: number, y: number, lz: number, sx: number, sy: number, sz: number, color: string) =>
    batch.box(mat, x + lx * cos + lz * sin, y, z - lx * sin + lz * cos, sx, sy, sz, color, angle);
  box(m.wood, 0, 0.9, 0, 2.5, 0.52, 1.2, chai ? '#8a5c3d' : '#69795c');
  box(m.wood, 0, 1.2, 0, 2.68, 0.11, 1.35, '#ac9570');
  for (const side of [-1, 1]) {
    batch.add('torus', m.dark, x + side * cos, 0.44, z - side * sin, 0.9, 0.9, 0.9, '#1e2225', angle, Math.PI / 2);
    box(m.metal, side * 1.14, 1.7, -0.47, 0.045, 2.7, 0.045, '#5b6355');
  }
  box(m.cloth, 0, 3.0, 0, 2.85, 0.1, 1.85, chai ? '#a8703f' : '#927750');
  box(m.cloth, 0, 2.86, 0.92, 2.85, 0.28, 0.025, chai ? '#a8703f' : '#927750');
  // A bare bulb on a wire: every stall has one.
  box(m.light, 0, 2.72, 0, 0.09, 0.14, 0.09, '#fff2cf');
  box(m.dark, 0, 2.88, 0, 0.02, 0.24, 0.02, '#2a2c28');
  if (chai) {
    batch.add('cylinder', m.metal, x - 0.7 * cos, 1.46, z + 0.7 * sin, 0.42, 0.5, 0.42, '#b0b2a4');
    batch.add('cylinder', m.metal, x + 0.35 * cos, 1.48, z - 0.35 * sin, 0.52, 0.52, 0.52, '#a9ab9d');
    batch.add('cylinder', m.dark, x + 0.35 * cos, 1.76, z - 0.35 * sin, 0.2, 0.06, 0.2, '#3a3d39');
    for (let cup = 0; cup < 6; cup++) box(m.tile, -0.45 + cup * 0.18, 1.38, 0.36, 0.1, 0.22, 0.1, '#b07a52');
    box(m.metal, 0.85, 1.4, -0.1, 0.42, 0.3, 0.5, '#8e9288');
  } else {
    for (let crate = 0; crate < 3; crate++) {
      box(m.wood, -0.82 + crate * 0.82, 1.31, 0, 0.75, 0.22, 1, '#8a764f');
      for (let fruit = 0; fruit < 12; fruit++) {
        const lx = -1.09 + crate * 0.82 + (fruit % 3) * 0.22; const lz = -0.32 + Math.floor(fruit / 3) * 0.21;
        batch.add('sphere', m.foliage, x + lx * cos + lz * sin, 1.52 + random() * 0.03, z - lx * sin + lz * cos, 0.2, 0.18, 0.2,
          ['#b4602f', '#c2b04a', '#5f8a52', '#8e3f36', '#d0912f'][(crate + fruit) % 5]);
      }
    }
    box(m.metal, 1.0, 1.45, -0.35, 0.34, 0.3, 0.34, '#9aa096');
  }
}

/** A tandoor stall: griddle, gas cylinder, stacked plates and a queue-worthy smell. */
export function foodStall(batch: CityBatch, m: CityMaterials, x: number, z: number, angle: number, color = '#8c4a34') {
  const sin = Math.sin(angle), cos = Math.cos(angle);
  const at = (lx: number, lz: number) => ({ x: x + lx * cos + lz * sin, z: z - lx * sin + lz * cos });
  batch.box(m.metal, x, 0.55, z, 3.1, 1.1, 1.4, '#9aa19a', angle);
  batch.box(m.dark, x, 1.14, z, 3.2, 0.09, 1.5, '#4b4f4a', angle);
  const griddle = at(-0.85, 0);
  batch.add('cylinder', m.dark, griddle.x, 1.2, griddle.z, 1.05, 0.08, 1.05, '#2c2f2c');
  const pot = at(0.7, 0.05);
  batch.add('cylinder', m.metal, pot.x, 1.34, pot.z, 0.62, 0.36, 0.62, '#b9bcb0');
  const cylinder = at(1.4, -0.5);
  batch.add('cylinder', m.paint, cylinder.x, 0.34, cylinder.z, 0.42, 0.68, 0.42, '#a83f33');
  for (const side of [-1, 1]) batch.box(m.metal, x + cos * side * 1.5, 1.9, z - sin * side * 1.5, 0.06, 1.7, 0.06, '#59635c', angle);
  batch.box(m.cloth, x, 2.72, z, 3.5, 0.1, 2.1, color, angle);
  batch.box(m.cloth, x + sin * 1.05, 2.58, z + cos * 1.05, 3.5, 0.3, 0.03, color, angle);
  batch.box(m.light, x, 2.5, z, 0.1, 0.15, 0.1, '#fff0c8');
  const plates = at(0.05, -0.5);
  for (let plate = 0; plate < 6; plate++) batch.add('cylinder', m.paint, plates.x, 1.2 + plate * 0.02, plates.z, 0.32, 0.02, 0.32, '#e2ddcf');
}

export function paanShop(batch: CityBatch, m: CityMaterials, x: number, z: number, angle: number) {
  const sin = Math.sin(angle), cos = Math.cos(angle);
  batch.box(m.wood, x, 0.9, z, 1.9, 1.8, 1.1, '#6f5a3d', angle);
  batch.box(m.glass, x + sin * 0.58, 1.35, z + cos * 0.58, 1.7, 0.75, 0.05, '#b7c9c2', angle);
  batch.box(m.corrugated, x, 1.92, z, 2.2, 0.09, 1.4, '#8d9691', angle);
  for (let jar = 0; jar < 4; jar++) batch.add('cylinder', m.glass, x + cos * (jar - 1.5) * 0.4, 2.1, z - sin * (jar - 1.5) * 0.4, 0.16, 0.34, 0.16, '#cbb27a');
  batch.box(m.light, x, 2.06, z, 0.09, 0.13, 0.09, '#ffeec2');
}

/* ------------------------------------------------------------------ */
/* Building dressing                                                   */
/* ------------------------------------------------------------------ */

export function acUnit(batch: CityBatch, m: CityMaterials, x: number, y: number, z: number, angle: number) {
  batch.box(m.metal, x, y, z, 0.72, 0.52, 0.34, '#c3c6bc', angle);
  batch.add('cylinder', m.dark, x + Math.sin(angle) * 0.18, y, z + Math.cos(angle) * 0.18, 0.36, 0.05, 0.36, '#5b615c', angle, Math.PI / 2);
  batch.box(m.metal, x, y - 0.32, z, 0.62, 0.06, 0.3, '#8a8f88', angle);
}

export function laundryLine(batch: CityBatch, m: CityMaterials, x: number, y: number, z: number, width: number, angle: number, random: Random) {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  batch.line(m.dark, new THREE.Vector3(x - cos * width / 2, y, z + sin * width / 2), new THREE.Vector3(x + cos * width / 2, y, z - sin * width / 2), 0.014, '#5a5750');
  const cloths = Math.max(2, Math.floor(width / 0.7));
  const palette = ['#c6553f', '#d8cdb2', '#4e7d84', '#b98a3f', '#7a8f5b', '#a4557c'];
  for (let i = 0; i < cloths; i++) {
    const t = (i + 0.5) / cloths - 0.5;
    batch.box(m.cloth, x + cos * width * t, y - 0.3 - random() * 0.16, z - sin * width * t,
      0.42, 0.6 + random() * 0.3, 0.02, palette[Math.floor(random() * palette.length)], angle);
  }
}

export function bunting(batch: CityBatch, m: CityMaterials, x1: number, z1: number, x2: number, z2: number, height: number) {
  const steps = 14;
  const palette = ['#d4913b', '#3f7f5d', '#b8453c', '#e0d7b6', '#4a6f9c'];
  let previous = new THREE.Vector3(x1, height, z1);
  for (let step = 1; step <= steps; step++) {
    const t = step / steps;
    const next = new THREE.Vector3(x1 + (x2 - x1) * t, height - Math.sin(t * Math.PI) * 1.1, z1 + (z2 - z1) * t);
    batch.line(m.dark, previous, next, 0.013, '#4a463f');
    batch.add('pyramid', m.cloth, (previous.x + next.x) / 2, (previous.y + next.y) / 2 - 0.19, (previous.z + next.z) / 2,
      0.3, 0.34, 0.02, palette[step % palette.length], Math.atan2(x2 - x1, z2 - z1), Math.PI);
    previous = next;
  }
}

export function posterWall(batch: CityBatch, m: CityMaterials, x: number, y: number, z: number, angle: number, random: Random, count = 5) {
  const palette = ['#c8452f', '#2f6b8c', '#d8a02c', '#3f7a4c', '#8a3f6e', '#d6cdb4'];
  for (let poster = 0; poster < count; poster++) {
    const offset = (poster - (count - 1) / 2) * 0.58 + (random() - 0.5) * 0.08;
    batch.panel(m.paint, x + Math.cos(angle) * offset, y + (random() - 0.5) * 0.4, z - Math.sin(angle) * offset,
      0.48, 0.68, palette[Math.floor(random() * palette.length)], angle);
  }
}

export function rangoli(batch: CityBatch, m: CityMaterials, x: number, z: number, scale = 1) {
  const palette = ['#d8493c', '#e6b33c', '#3f7f9c', '#e8e0cc', '#4c8a52'];
  batch.decal(m.paint, x, 0.075, z, 1.5 * scale, 1.5 * scale, '#e9e2cf');
  for (let ring = 0; ring < 3; ring++) {
    const petals = 6 + ring * 3;
    for (let petal = 0; petal < petals; petal++) {
      const angle = petal / petals * Math.PI * 2;
      const radius = (0.22 + ring * 0.22) * scale;
      batch.decal(m.paint, x + Math.cos(angle) * radius, 0.08 + ring * 0.002, z + Math.sin(angle) * radius,
        0.19 * scale, 0.19 * scale, palette[(ring + petal) % palette.length], angle);
    }
  }
}

export function waterTank(batch: CityBatch, m: CityMaterials, x: number, y: number, z: number, color = '#2c3f4a') {
  batch.add('cylinder', m.metal, x, y + 0.9, z, 1.7, 1.8, 1.7, color);
  batch.add('cylinder', m.metal, x, y + 1.84, z, 1.76, 0.12, 1.76, '#9aa19a');
  batch.add('cylinder', m.metal, x, y + 1.96, z, 0.55, 0.14, 0.55, '#8b9289');
  for (let leg = 0; leg < 4; leg++) {
    const angle = leg / 4 * Math.PI * 2 + 0.4;
    batch.box(m.metal, x + Math.cos(angle) * 0.72, y, z + Math.sin(angle) * 0.72, 0.09, y > 0 ? 0.4 : 0.4, 0.09, '#79807a');
  }
  batch.add('cylinder', m.metal, x + 1.1, y + 0.5, z, 0.05, 1.4, 0.05, '#a9ada4');
}

export function scaffolding(batch: CityBatch, m: CityMaterials, x: number, z: number, width: number, height: number, angle: number) {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const posts = Math.max(2, Math.round(width / 2.2));
  for (let post = 0; post <= posts; post++) {
    const offset = (post / posts - 0.5) * width;
    batch.add('cylinder', m.wood, x + cos * offset, height / 2, z - sin * offset, 0.07, height, 0.07, '#8a6f47');
  }
  for (let level = 1; level * 2.2 < height; level++) {
    batch.box(m.wood, x, level * 2.2, z, width, 0.07, 0.07, '#93784e', angle);
    batch.box(m.wood, x + sin * 0.3, level * 2.2 - 0.1, z + cos * 0.3, width, 0.06, 0.5, '#7d6540', angle);
  }
}

export function utilityWires(batch: CityBatch, m: CityMaterials, x1: number, z1: number, x2: number, z2: number) {
  for (let cable = 0; cable < 4; cable++) {
    let previous = new THREE.Vector3(x1 + cable * 0.15, 7.35 - cable * 0.12, z1);
    for (let step = 1; step <= 10; step++) {
      const t = step / 10;
      const next = new THREE.Vector3(
        x1 + (x2 - x1) * t + cable * 0.15,
        7.35 - cable * 0.12 - Math.sin(t * Math.PI) * (0.85 + cable * 0.12),
        z1 + (z2 - z1) * t,
      );
      batch.line(m.dark, previous, next, 0.02); previous = next;
    }
  }
}

/** The knot of cable every Indian pole carries, and it reads instantly. */
export function cableKnot(batch: CityBatch, m: CityMaterials, x: number, y: number, z: number) {
  for (let loop = 0; loop < 5; loop++) {
    batch.add('torus', m.dark, x + Math.sin(loop) * 0.1, y + loop * 0.07, z + Math.cos(loop * 1.7) * 0.08,
      0.5 + loop * 0.08, 0.5 + loop * 0.08, 0.5 + loop * 0.08, '#26292a', loop * 0.9, 0.4 + loop * 0.2);
  }
}

export function cycleRack(batch: CityBatch, m: CityMaterials, x: number, z: number, angle: number, count = 4) {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  for (let bike = 0; bike < count; bike++) {
    const offset = (bike - (count - 1) / 2) * 0.75;
    const bx = x + cos * offset; const bz = z - sin * offset;
    for (const wheel of [-0.52, 0.52]) {
      batch.add('torus', m.dark, bx + sin * wheel, 0.34, bz + cos * wheel, 0.72, 0.72, 0.72, '#1f2325', angle, Math.PI / 2);
    }
    batch.box(m.metal, bx, 0.62, bz, 0.05, 0.05, 1.05, '#4b5f6b', angle);
    batch.box(m.metal, bx + sin * 0.3, 0.78, bz + cos * 0.3, 0.05, 0.42, 0.05, '#4b5f6b', angle);
    batch.box(m.dark, bx - sin * 0.34, 0.8, bz - cos * 0.34, 0.11, 0.07, 0.28, '#2a2e2c', angle);
    batch.box(m.metal, bx + sin * 0.48, 0.98, bz + cos * 0.48, 0.42, 0.04, 0.04, '#59656b', angle);
  }
}
