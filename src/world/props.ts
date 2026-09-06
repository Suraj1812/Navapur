import * as THREE from 'three';
import { CityBatch } from './batch';
import type { CityMaterials } from './materials';

export function tree(batch: CityBatch, m: CityMaterials, x: number, z: number, size: number, random: () => number) {
  batch.cylinder(m.plaster, x, size * 0.42, z, size * 0.075, size * 0.84, size * 0.075, '#685541');
  const leafColors = ['#526946', '#687c50', '#748456', '#415c43', '#7a895b'];
  for (let branch = 0; branch < 5; branch++) {
    const angle = branch / 5 * Math.PI * 2 + random() * 0.45;
    const spread = size * (0.2 + random() * 0.11);
    const bx = x + Math.cos(angle) * spread; const bz = z + Math.sin(angle) * spread;
    batch.line(m.plaster, new THREE.Vector3(x, size * 0.48, z), new THREE.Vector3(bx, size * 0.8, bz), size * 0.027, '#695944');
    batch.add('sphere', m.foliage, bx, size * (0.83 + random() * 0.13), bz, size * 0.63, size * 0.57, size * 0.66, leafColors[branch], angle);
  }
  batch.add('sphere', m.foliage, x, size * 1.13, z, size * 0.63, size * 0.57, size * 0.6, leafColors[2]);
  batch.box(m.concrete, x, 0.13, z, 2.1, 0.24, 2.1, '#a7a18c');
  batch.box(m.concrete, x, 0.27, z, 1.8, 0.05, 1.8, '#6c7051');
}

export function bench(batch: CityBatch, m: CityMaterials, x: number, z: number, angle = 0) {
  batch.box(m.concrete, x, 0.52, z, 2.2, 0.13, 0.68, '#846c4c', angle);
  batch.box(m.concrete, x + Math.sin(angle) * -0.3, 0.95, z + Math.cos(angle) * -0.3, 2.2, 0.58, 0.13, '#91754f', angle);
  for (const side of [-1, 1]) batch.box(m.metal, x + side * Math.cos(angle) * 0.85, 0.28, z - side * Math.sin(angle) * 0.85, 0.13, 0.53, 0.5, '#485650', angle);
}

export function marketCart(batch: CityBatch, m: CityMaterials, x: number, z: number, angle: number, random: () => number, chai = false) {
  const sin = Math.sin(angle); const cos = Math.cos(angle);
  const box = (mat: THREE.Material, lx: number, y: number, lz: number, sx: number, sy: number, sz: number, color: string) => batch.box(mat, x + lx * cos + lz * sin, y, z - lx * sin + lz * cos, sx, sy, sz, color, angle);
  box(m.concrete, 0, 0.9, 0, 2.5, 0.52, 1.2, chai ? '#936545' : '#69795c');
  box(m.concrete, 0, 1.2, 0, 2.68, 0.11, 1.35, '#ac9570');
  for (const side of [-1, 1]) {
    batch.add('cylinder', m.dark, x + side * cos, 0.45, z - side * sin, 0.69, 0.18, 0.69, '#ffffff', angle, 0, Math.PI / 2);
    box(m.metal, side * 1.14, 1.7, -0.47, 0.045, 2.7, 0.045, '#5b6355');
  }
  box(m.cloth, 0, 3.0, 0, 2.85, 0.1, 1.85, chai ? '#9b6841' : '#927750');
  box(m.cloth, 0, 2.87, 0.92, 2.85, 0.25, 0.025, chai ? '#9b6841' : '#927750');
  if (chai) {
    batch.cylinder(m.metal, x - 0.7 * cos, 1.44, z + 0.7 * sin, 0.4, 0.47, 0.4, '#b8b9ab');
    batch.cylinder(m.metal, x + 0.35 * cos, 1.47, z - 0.35 * sin, 0.5, 0.5, 0.5, '#b1b3a5');
    for (let cup = 0; cup < 5; cup++) box(m.concrete, -0.4 + cup * 0.2, 1.37, 0.35, 0.11, 0.23, 0.11, '#ab7751');
  } else {
    for (let crate = 0; crate < 3; crate++) {
      box(m.concrete, -0.82 + crate * 0.82, 1.31, 0, 0.75, 0.22, 1, '#8a764f');
      for (let fruit = 0; fruit < 12; fruit++) {
        const lx = -1.09 + crate * 0.82 + (fruit % 3) * 0.22; const lz = -0.32 + Math.floor(fruit / 3) * 0.21;
        batch.add('sphere', m.foliage, x + lx * cos + lz * sin, 1.52 + random() * 0.03, z - lx * sin + lz * cos, 0.2, 0.18, 0.2, ['#ad5f3a', '#b5a64c', '#658153'][crate]);
      }
    }
  }
}

export function streetLamp(batch: CityBatch, m: CityMaterials, x: number, z: number, direction: number, lamps: THREE.Mesh[]) {
  batch.cylinder(m.metal, x, 3.7, z, 0.16, 7.4, 0.16, '#626c62');
  batch.cylinder(m.concrete, x, 0.32, z, 0.48, 0.64, 0.48, '#969682');
  const dx = Math.sin(direction) * 1.55; const dz = Math.cos(direction) * 1.55;
  batch.line(m.metal, new THREE.Vector3(x, 7.2, z), new THREE.Vector3(x + dx, 7.56, z + dz), 0.095, '#707a6c');
  batch.box(m.metal, x + dx, 7.53, z + dz, 0.4, 0.15, 0.95, '#5a655d', direction);
  batch.box(m.light, x + dx, 7.435, z + dz, 0.32, 0.045, 0.76, '#ffffff', direction);
  // A small selection of pooled real lights complements emissive lamp geometry.
  if (Math.abs(x) < 12 && Math.abs(z) < 80) {
    const light = new THREE.PointLight('#ffd5a0', 0, 23, 2); light.position.set(x + dx, 7.2, z + dz); batch.group.add(light);
    const marker = new THREE.Mesh(new THREE.SphereGeometry(0.025, 4, 3), m.light); marker.visible = false; marker.userData.light = light; lamps.push(marker);
  }
}

export function utilityWires(batch: CityBatch, m: CityMaterials, x1: number, z1: number, x2: number, z2: number) {
  for (let cable = 0; cable < 3; cable++) {
    let previous = new THREE.Vector3(x1 + cable * 0.18, 7.35, z1);
    for (let step = 1; step <= 10; step++) {
      const t = step / 10;
      const next = new THREE.Vector3(x1 + (x2 - x1) * t + cable * 0.18, 7.35 - Math.sin(t * Math.PI) * 0.85, z1 + (z2 - z1) * t);
      batch.line(m.dark, previous, next, 0.022); previous = next;
    }
  }
}
