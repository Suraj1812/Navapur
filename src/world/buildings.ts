import * as THREE from 'three';
import type { Collider, Place } from '../core/types';
import { CityBatch } from './batch';
import type { CityMaterials } from './materials';
import { SignAtlas } from './materials';
import type { Storefront } from './data';

export interface BuildingSpec {
  x: number; z: number; width: number; depth: number; height: number; angle: number; color: string;
  district: string; index: number; shop?: Storefront; enterable?: boolean; modern?: boolean; residential?: boolean;
}

export function building(batch: CityBatch, materials: CityMaterials, signs: SignAtlas, colliders: Collider[], places: Place[], spec: BuildingSpec) {
  const { x, z, width: w, depth: d, height: h, angle, color, index } = spec;
  const sin = Math.sin(angle); const cos = Math.cos(angle);
  const point = (lx: number, lz: number) => ({ x: x + lx * cos + lz * sin, z: z - lx * sin + lz * cos });
  const box = (mat: THREE.Material, lx: number, y: number, lz: number, sx: number, sy: number, sz: number, tint: THREE.ColorRepresentation = '#ffffff') => {
    const p = point(lx, lz); batch.box(mat, p.x, y, p.z, sx, sy, sz, tint, angle);
  };
  const collider = (lx: number, lz: number, sx: number, sz: number) => {
    const p = point(lx, lz); const aw = Math.abs(sx * cos) + Math.abs(sz * sin); const ad = Math.abs(sx * sin) + Math.abs(sz * cos);
    colliders.push({ minX: p.x - aw / 2, maxX: p.x + aw / 2, minZ: p.z - ad / 2, maxZ: p.z + ad / 2 });
  };
  const roomHeight = 3.55;
  if (spec.enterable) {
    box(materials.plaster, -w / 2 + 0.2, roomHeight / 2, -d / 2, 0.4, roomHeight, d, color);
    box(materials.plaster, w / 2 - 0.2, roomHeight / 2, -d / 2, 0.4, roomHeight, d, color);
    box(materials.plaster, 0, roomHeight / 2, -d + 0.2, w, roomHeight, 0.4, color);
    box(materials.concrete, 0, 0.08, -d / 2, w, 0.16, d, '#c2b7a0');
    box(materials.concrete, 0, roomHeight + 0.06, -d / 2, w, 0.2, d, '#d2c6b3');
    collider(-w / 2 + 0.2, -d / 2, 0.4, d); collider(w / 2 - 0.2, -d / 2, 0.4, d); collider(0, -d + 0.2, w, 0.4);
    if (spec.residential) {
      const door = 2.2; const wallWidth = (w - door) / 2;
      for (const side of [-1, 1]) {
        box(materials.plaster, side * (door + wallWidth) / 2, 1.75, 0, wallWidth, 3.5, 0.35, color);
        collider(side * (door + wallWidth) / 2, 0, wallWidth, 0.35);
        box(materials.glass, side * w * 0.3, 1.9, 0.22, 2.1, 1.55, 0.1);
        box(materials.metal, side * w * 0.3, 1.9, 0.29, 2.25, 0.06, 0.08, '#676857');
      }
      box(materials.plaster, 0, 3.15, 0, door, 0.7, 0.35, color);
      box(materials.cloth, -w * 0.26, 0.52, -5.5, 3.4, 0.7, 1.3, '#74827a');
      box(materials.cloth, -w * 0.26, 1.02, -6, 3.4, 0.85, 0.28, '#64776d');
      box(materials.concrete, -w * 0.26, 0.55, -3.5, 2.2, 0.15, 1.2, '#967858');
      collider(-w * 0.26, -5.5, 3.4, 1.3);
      box(materials.concrete, w * 0.24, 0.36, -d + 3.6, 2.5, 0.62, 3.5, '#967b57');
      box(materials.cloth, w * 0.24, 0.72, -d + 3.6, 2.5, 0.2, 3.5, '#c1b293');
      box(materials.cloth, w * 0.24, 0.9, -d + 2.5, 1.6, 0.2, 0.7, '#d5cfb7');
      collider(w * 0.24, -d + 3.6, 2.5, 3.5);
      box(materials.concrete, -w * 0.26, 0.9, -d + 1, 4, 1.8, 1.3, '#aea18a');
      box(materials.metal, -w * 0.26, 1.83, -d + 1, 4.05, 0.08, 1.36, '#c0c3b8');
      collider(-w * 0.26, -d + 1, 4, 1.3);
      box(materials.cloth, 0, 0.17, -6.5, 5, 0.03, 4.3, '#a88b66');
    } else {
      // Shop rooms have a clear central aisle from the pavement all the way inside.
      box(materials.concrete, -w * 0.28, 0.62, -2.7, w * 0.3, 1.24, 1.15, '#8e7860');
      box(materials.metal, -w * 0.28, 1.28, -2.7, w * 0.32, 0.09, 1.26, '#c5c0ab');
      collider(-w * 0.28, -2.7, w * 0.32, 1.26);
      for (let shelf = 0; shelf < 3; shelf++) {
        box(materials.concrete, 0, 0.7 + shelf * 0.72, -d + 1, w - 1.4, 0.08, 0.65, '#806851');
        for (let item = 0; item < 12; item++) {
          const palette = ['#ac603d', '#b19b65', '#6c8769', '#d2bb83', '#8c4240', '#777b8b'];
          box(materials.cloth, -w / 2 + 1.1 + item * (w - 2.2) / 12, 0.95 + shelf * 0.72, -d + 0.95, (w - 2.8) / 16, 0.45, 0.35, palette[(item + shelf + index) % palette.length]);
        }
      }
    }
    box(materials.light, 0, 3.3, -3, 2.2, 0.06, 0.22);
    for (const side of [-1, 1]) { box(materials.metal, side * (w / 2 - 0.4), 1.6, 0.05, 0.13, 3.2, 0.12, '#646058'); }
  } else {
    box(materials.plaster, 0, roomHeight / 2, -d / 2, w, roomHeight, d, color);
    collider(0, -d / 2, w, d);
    const shutter = spec.modern ? materials.glass : materials.metal;
    for (let slot = 0; slot < 3; slot++) {
      const xx = (slot - 1) * w / 3;
      box(shutter, xx, 1.45, 0.03, w / 3 - 0.65, 2.7, 0.12, spec.modern ? '#7b9499' : ['#7d827a', '#577676', '#82796c'][index % 3]);
      if (!spec.modern) for (let slat = 0; slat < 11; slat++) box(materials.metal, xx, 0.28 + slat * 0.24, 0.11, w / 3 - 0.67, 0.022, 0.055, '#555e58');
    }
  }
  if (h > roomHeight) box(materials.plaster, 0, roomHeight + (h - roomHeight) / 2, -d / 2, w, h - roomHeight, d, color);
  box(materials.concrete, 0, h + 0.07, -d / 2, w + 0.5, 0.3, d + 0.4, '#c1b9a8');
  box(materials.plaster, 0, h + 0.49, -0.05, w + 0.12, 0.72, 0.2, color);
  box(materials.plaster, 0, h + 0.49, -d, w + 0.12, 0.72, 0.2, color);
  box(materials.plaster, -w / 2, h + 0.49, -d / 2, 0.2, 0.72, d, color);
  box(materials.plaster, w / 2, h + 0.49, -d / 2, 0.2, 0.72, d, color);

  const floors = Math.floor((h - 3.55) / 3.2);
  const columns = Math.max(2, Math.floor(w / 3.3));
  for (let floor = 0; floor < floors; floor++) {
    const y = 5.05 + floor * 3.2;
    box(materials.concrete, 0, y - 1.28, 0.12, w + 0.26, 0.14, 0.3, '#b6ac99');
    for (let col = 0; col < columns; col++) {
      const xx = -w / 2 + (col + 0.5) * w / columns;
      box(materials.concrete, xx, y, 0.04, 1.67, 1.83, 0.15, '#b6aa94');
      box((index + floor + col) % 5 === 0 ? materials.warmGlass : materials.glass, xx, y, 0.13, 1.43, 1.55, 0.07);
      box(materials.metal, xx, y, 0.2, 0.045, 1.6, 0.06, '#625f54');
      box(materials.metal, xx, y, 0.2, 1.5, 0.045, 0.06, '#625f54');
      box(materials.concrete, xx, y + 1.02, 0.32, 1.9, 0.13, 0.85, '#c0b69f');
      if (col % 2 === index % 2 && !spec.modern) {
        box(materials.concrete, xx + 0.94, y - 0.87, 0.42, 0.7, 0.46, 0.6, '#a8a89d');
        box(materials.dark, xx + 0.94, y - 0.87, 0.75, 0.44, 0.29, 0.018);
      }
    }
    if (!spec.modern && floor % 2 === index % 2) {
      box(materials.concrete, 0, y - 1.25, 0.54, w - 1, 0.18, 1.22, '#b7b09e');
      box(materials.metal, 0, y - 0.45, 1.12, w - 1, 0.075, 0.07, '#525b56');
      box(materials.metal, 0, y - 0.95, 1.12, w - 1, 0.05, 0.07, '#525b56');
      for (let bar = 0; bar <= Math.floor((w - 1) / 0.75); bar++) box(materials.metal, -(w - 1) / 2 + bar * 0.75, y - 0.87, 1.12, 0.045, 0.87, 0.045, '#525b56');
      if ((index + floor) % 3 === 0) for (let cloth = 0; cloth < 3; cloth++) box(materials.cloth, -1.2 + cloth * 0.95, y - 0.72, 1.18, 0.6, 0.7, 0.025, ['#b49b6d', '#6f9790', '#b67e77'][cloth]);
    }
    for (const side of [-1, 1]) for (let slot = 0; slot < 3; slot++) {
      box(materials.glass, side * (w / 2 + 0.025), y, -2.5 - slot * (d - 4) / 3, 0.07, 1.42, 1.18);
      box(materials.concrete, side * (w / 2 + 0.1), y + 0.85, -2.5 - slot * (d - 4) / 3, 0.35, 0.12, 1.6, '#bcb09b');
    }
  }
  // Water storage, plumbing and small roof structures anchor a recognisable skyline.
  const tank = point(w * 0.27, -d * 0.65);
  batch.cylinder(materials.dark, tank.x, h + 1.35, tank.z, 1.75, 1.8, 1.75);
  batch.cylinder(materials.dark, tank.x, h + 2.28, tank.z, 1.8, 0.12, 1.8);
  box(materials.plaster, -w * 0.27, h + 1.13, -d * 0.73, 2.8, 2.1, 2.8, color);
  box(materials.concrete, -w * 0.27, h + 2.22, -d * 0.73, 3.1, 0.17, 3.1, '#aaa493');
  box(materials.metal, w / 2 - 0.13, h / 2, 0.12, 0.075, h, 0.075, '#676c61');
  if (index % 3 === 0) {
    const dish = point(-w * 0.1, -d * 0.4);
    batch.add('sphere', materials.concrete, dish.x, h + 1.25, dish.z, 1.25, 0.18, 1.25, '#bdbfb5', angle, 0.55);
    batch.cylinder(materials.metal, dish.x, h + 0.6, dish.z, 0.07, 1.2, 0.07, '#737f79');
  }

  if (spec.shop) {
    const p = point(0, 0.22);
    signs.add(batch.group, spec.shop.title, spec.shop.hindi, spec.shop.caption, spec.shop.color, p.x, 3.12, p.z, w - 0.45, 1.32, angle);
    // Faded fabric canopies cast real shadows over the pavement.
    const awning = point(0, 0.87);
    batch.add('box', materials.cloth, awning.x, 3.91, awning.z, w - 0.3, 0.11, 1.85, spec.shop.color, angle, -0.13);
    box(materials.cloth, 0, 3.73, 1.75, w - 0.3, 0.26, 0.08, spec.shop.color);
    for (const side of [-1, 1]) box(materials.metal, side * (w / 2 - 0.65), 3.22, 1.56, 0.045, 1.3, 0.045, '#57594d');
    const entrance = point(0, 1.15); const interior = point(0, -3.7);
    places.push({ id: `place-${index}`, name: spec.shop.title, hindi: spec.shop.hindi, kind: spec.shop.kind, district: spec.district, x: entrance.x, z: entrance.z, entrance, interior: spec.enterable ? interior : undefined, owner: spec.shop.owner });
  }
}
