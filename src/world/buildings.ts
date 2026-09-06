import * as THREE from 'three';
import type { Collider, Place } from '../core/types';
import { CityBatch } from './batch';
import type { CityMaterials } from './materials';
import { SignAtlas } from './materials';
import type { Storefront } from './data';
import { acUnit, laundryLine, potPlant, waterTank } from './props';

export interface BuildingSpec {
  x: number; z: number; width: number; depth: number; height: number; angle: number; color: string;
  district: string; index: number; shop?: Storefront; enterable?: boolean; modern?: boolean; residential?: boolean;
}

const SHUTTER_COLORS = ['#7d827a', '#4f6f6f', '#82796c', '#6a5b4c', '#57666b'];
const BALCONY_CLOTH = ['#b49b6d', '#6f9790', '#b67e77', '#8f9a63', '#a67f9b'];

/**
 * One procedural building: shopfront or doorway at street level, occupied
 * floors above with balconies, grilles, air conditioners and washing, and a
 * roof carrying the water tank, stairwell and dish that make an Indian skyline
 * instantly readable.
 */
export function building(
  batch: CityBatch, materials: CityMaterials, signs: SignAtlas,
  colliders: Collider[], places: Place[], spec: BuildingSpec, random: () => number,
) {
  const { x, z, width: w, depth: d, height: h, angle, color, index } = spec;
  const sin = Math.sin(angle); const cos = Math.cos(angle);
  const point = (lx: number, lz: number) => ({ x: x + lx * cos + lz * sin, z: z - lx * sin + lz * cos });
  const box = (mat: THREE.Material, lx: number, y: number, lz: number, sx: number, sy: number, sz: number, tint: THREE.ColorRepresentation = '#ffffff') => {
    const p = point(lx, lz); batch.box(mat, p.x, y, p.z, sx, sy, sz, tint, angle);
  };
  const collider = (lx: number, lz: number, sx: number, sz: number) => {
    const p = point(lx, lz);
    const aw = Math.abs(sx * cos) + Math.abs(sz * sin);
    const ad = Math.abs(sx * sin) + Math.abs(sz * cos);
    colliders.push({ minX: p.x - aw / 2, maxX: p.x + aw / 2, minZ: p.z - ad / 2, maxZ: p.z + ad / 2 });
  };
  const roomHeight = 3.55;

  /* ---------------------------------------------- ground floor */
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
        for (let bar = 0; bar < 5; bar++) box(materials.metal, side * w * 0.3 - 0.84 + bar * 0.42, 1.9, 0.3, 0.05, 1.5, 0.05, '#5f6155');
      }
      box(materials.plaster, 0, 3.15, 0, door, 0.7, 0.35, color);
      box(materials.wood, 0, 1.55, 0.02, door - 0.35, 3.1, 0.1, '#6d4c2f');
      box(materials.metal, 0.6, 1.5, 0.1, 0.1, 0.1, 0.1, '#c0a869');
      // Courtyard: cot, water drum, kitchen platform, floor mat.
      box(materials.cloth, -w * 0.26, 0.52, -5.5, 3.4, 0.7, 1.3, '#74827a');
      box(materials.cloth, -w * 0.26, 1.02, -6, 3.4, 0.85, 0.28, '#64776d');
      box(materials.wood, -w * 0.26, 0.55, -3.5, 2.2, 0.15, 1.2, '#967858');
      collider(-w * 0.26, -5.5, 3.4, 1.3);
      box(materials.concrete, w * 0.24, 0.36, -d + 3.6, 2.5, 0.62, 3.5, '#967b57');
      box(materials.cloth, w * 0.24, 0.72, -d + 3.6, 2.5, 0.2, 3.5, '#c1b293');
      box(materials.cloth, w * 0.24, 0.9, -d + 2.5, 1.6, 0.2, 0.7, '#d5cfb7');
      collider(w * 0.24, -d + 3.6, 2.5, 3.5);
      box(materials.concrete, -w * 0.26, 0.9, -d + 1, 4, 1.8, 1.3, '#aea18a');
      box(materials.metal, -w * 0.26, 1.83, -d + 1, 4.05, 0.08, 1.36, '#c0c3b8');
      collider(-w * 0.26, -d + 1, 4, 1.3);
      box(materials.cloth, 0, 0.17, -6.5, 5, 0.03, 4.3, '#a88b66');
      const drum = point(w * 0.36, -1.4);
      batch.add('cylinder', materials.paint, drum.x, 0.44, drum.z, 0.62, 0.88, 0.62, '#3f6a7d');
      const plant = point(-w * 0.42, -1.2);
      potPlant(batch, materials, plant.x, 0.16, plant.z, 0.85);
    } else {
      // A shop you can walk into: counter, shelving, a fan and a chair.
      box(materials.wood, -w * 0.28, 0.62, -2.7, w * 0.3, 1.24, 1.15, '#7d6448');
      box(materials.marble, -w * 0.28, 1.28, -2.7, w * 0.32, 0.09, 1.26, '#ddd4bf');
      collider(-w * 0.28, -2.7, w * 0.32, 1.26);
      for (let shelf = 0; shelf < 3; shelf++) {
        box(materials.wood, 0, 0.7 + shelf * 0.72, -d + 1, w - 1.4, 0.08, 0.65, '#7a6146');
        for (let item = 0; item < 12; item++) {
          const palette = ['#ac603d', '#b19b65', '#6c8769', '#d2bb83', '#8c4240', '#777b8b'];
          box(materials.cloth, -w / 2 + 1.1 + item * (w - 2.2) / 12, 0.95 + shelf * 0.72, -d + 0.95, (w - 2.8) / 16, 0.45, 0.35, palette[(item + shelf + index) % palette.length]);
        }
      }
      const fan = point(w * 0.2, -d + 2.6);
      batch.add('cylinder', materials.metal, fan.x, 3.18, fan.z, 0.09, 0.3, 0.09, '#7b8079');
      for (let blade = 0; blade < 3; blade++) {
        batch.add('box', materials.metal, fan.x, 3.02, fan.z, 1.5, 0.03, 0.28, '#b7bcb2', blade * 2.1);
      }
      box(materials.wood, w * 0.3, 0.42, -1.6, 0.5, 0.85, 0.5, '#8a6b46');
    }
    box(materials.light, 0, 3.3, -3, 2.2, 0.06, 0.22);
    for (const side of [-1, 1]) box(materials.metal, side * (w / 2 - 0.4), 1.6, 0.05, 0.13, 3.2, 0.12, '#646058');
  } else {
    box(materials.plaster, 0, roomHeight / 2, -d / 2, w, roomHeight, d, color);
    collider(0, -d / 2, w, d);
    const shutter = spec.modern ? materials.glass : materials.metal;
    for (let slot = 0; slot < 3; slot++) {
      const xx = (slot - 1) * w / 3;
      box(shutter, xx, 1.45, 0.03, w / 3 - 0.65, 2.7, 0.12, spec.modern ? '#7b9499' : SHUTTER_COLORS[(index + slot) % SHUTTER_COLORS.length]);
      if (!spec.modern) {
        for (let slat = 0; slat < 11; slat++) box(materials.metal, xx, 0.28 + slat * 0.24, 0.11, w / 3 - 0.67, 0.022, 0.055, '#555e58');
        box(materials.concrete, xx, 0.09, 0.42, w / 3 - 0.5, 0.18, 0.7, '#b3aa96');
        box(materials.metal, xx, 1.55, 0.18, 0.1, 0.1, 0.1, '#8d9188');
      } else {
        box(materials.metal, xx, 0.06, 0.4, w / 3 - 0.5, 0.12, 0.7, '#9aa19a');
      }
    }
  }

  /* ---------------------------------------------- mass and roof line */
  if (h > roomHeight) box(materials.plaster, 0, roomHeight + (h - roomHeight) / 2, -d / 2, w, h - roomHeight, d, color);
  box(materials.concrete, 0, h + 0.07, -d / 2, w + 0.5, 0.3, d + 0.4, '#c1b9a8');
  box(materials.plaster, 0, h + 0.49, -0.05, w + 0.12, 0.72, 0.2, color);
  box(materials.plaster, 0, h + 0.49, -d, w + 0.12, 0.72, 0.2, color);
  box(materials.plaster, -w / 2, h + 0.49, -d / 2, 0.2, 0.72, d, color);
  box(materials.plaster, w / 2, h + 0.49, -d / 2, 0.2, 0.72, d, color);

  /* ---------------------------------------------- floors */
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
      if (!spec.modern) {
        // Window grille: the single most recognisable Indian facade detail.
        for (let bar = 0; bar < 4; bar++) box(materials.metal, xx - 0.54 + bar * 0.36, y - 0.35, 0.24, 0.04, 0.85, 0.04, '#59605a');
        box(materials.metal, xx, y - 0.78, 0.24, 1.3, 0.04, 0.04, '#59605a');
      }
      if (col % 2 === index % 2 && !spec.modern) {
        const unit = point(xx + 0.94, 0.42);
        acUnit(batch, materials, unit.x, y - 0.87, unit.z, angle);
      }
    }
    if (!spec.modern && floor % 2 === index % 2) {
      // Balcony slab, railing, plants and washing.
      box(materials.concrete, 0, y - 1.25, 0.54, w - 1, 0.18, 1.22, '#b7b09e');
      box(materials.metal, 0, y - 0.45, 1.12, w - 1, 0.075, 0.07, '#525b56');
      box(materials.metal, 0, y - 0.95, 1.12, w - 1, 0.05, 0.07, '#525b56');
      for (let bar = 0; bar <= Math.floor((w - 1) / 0.75); bar++) box(materials.metal, -(w - 1) / 2 + bar * 0.75, y - 0.87, 1.12, 0.045, 0.87, 0.045, '#525b56');
      if ((index + floor) % 3 === 0) {
        const line = point(0, 1.02);
        laundryLine(batch, materials, line.x, y + 0.1, line.z, w - 1.4, angle + Math.PI / 2, random);
      } else if ((index + floor) % 3 === 1) {
        for (let cloth = 0; cloth < 3; cloth++) box(materials.cloth, -1.2 + cloth * 0.95, y - 0.72, 1.18, 0.6, 0.7, 0.025, BALCONY_CLOTH[cloth % BALCONY_CLOTH.length]);
      }
      const pot = point(-(w - 1) / 2 + 0.45, 0.9);
      potPlant(batch, materials, pot.x, y - 1.16, pot.z, 0.5);
      const pot2 = point((w - 1) / 2 - 0.45, 0.9);
      potPlant(batch, materials, pot2.x, y - 1.16, pot2.z, 0.45);
    }
    for (const side of [-1, 1]) for (let slot = 0; slot < 3; slot++) {
      box(materials.glass, side * (w / 2 + 0.025), y, -2.5 - slot * (d - 4) / 3, 0.07, 1.42, 1.18);
      box(materials.concrete, side * (w / 2 + 0.1), y + 0.85, -2.5 - slot * (d - 4) / 3, 0.35, 0.12, 1.6, '#bcb09b');
    }
  }

  /* ---------------------------------------------- roof */
  const tank = point(w * 0.27, -d * 0.65);
  waterTank(batch, materials, tank.x, h + 0.5, tank.z, ['#2f4550', '#3e5a4b', '#4a4038'][index % 3]);
  box(materials.plaster, -w * 0.27, h + 1.13, -d * 0.73, 2.8, 2.1, 2.8, color);
  box(materials.tile, -w * 0.27, h + 2.28, -d * 0.73, 3.1, 0.3, 3.1, '#9a5539');
  box(materials.metal, w / 2 - 0.13, h / 2, 0.12, 0.075, h, 0.075, '#676c61');
  box(materials.dark, -w / 2 + 0.13, h / 2, 0.12, 0.06, h, 0.06, '#3a3d38');
  if (index % 3 === 0) {
    const dish = point(-w * 0.1, -d * 0.4);
    batch.add('sphere', materials.concrete, dish.x, h + 1.25, dish.z, 1.25, 0.2, 1.25, '#bdbfb5', angle, 0.55);
    batch.add('cylinder', materials.metal, dish.x, h + 0.6, dish.z, 0.07, 1.2, 0.07, '#737f79');
  }
  if (index % 4 === 1) {
    const line = point(0, -d * 0.35);
    laundryLine(batch, materials, line.x, h + 1.9, line.z, w - 2, angle + Math.PI / 2, random);
  }
  if (spec.residential && spec.district.includes('Shanti')) {
    // Suburban houses get a pitched tiled roof instead of a flat terrace.
    box(materials.tile, 0, h + 1.4, -d / 2, w + 0.9, 0.2, d + 0.9, '#9c5537');
    batch.add('pyramid', materials.tile, point(0, -d / 2).x, h + 2.2, point(0, -d / 2).z, Math.max(w, d) + 1.2, 2.4, Math.max(w, d) + 1.2, '#96502f', angle + Math.PI / 4);
  }

  /* ---------------------------------------------- shop fascia */
  if (spec.shop) {
    const p = point(0, 0.22);
    signs.add(batch.group, spec.shop.title, spec.shop.hindi, spec.shop.caption, spec.shop.color, p.x, 3.12, p.z, w - 0.45, 1.32, angle);
    const awning = point(0, 0.87);
    batch.add('box', materials.cloth, awning.x, 3.91, awning.z, w - 0.3, 0.11, 1.85, spec.shop.color, angle, -0.13);
    box(materials.cloth, 0, 3.73, 1.75, w - 0.3, 0.26, 0.08, spec.shop.color);
    for (const side of [-1, 1]) box(materials.metal, side * (w / 2 - 0.65), 3.22, 1.56, 0.045, 1.3, 0.045, '#57594d');
    // A strip light under the fascia and a small hanging board.
    box(materials.light, 0, 3.62, 0.42, w - 1.4, 0.06, 0.12, '#fff0cd');
    box(materials.wood, w / 2 - 1.1, 2.55, 0.62, 0.9, 0.55, 0.05, '#6c4f33');
    const entrance = point(0, 1.15); const interior = point(0, -3.7);
    places.push({
      id: `place-${index}`, name: spec.shop.title, hindi: spec.shop.hindi, kind: spec.shop.kind,
      district: spec.district, x: entrance.x, z: entrance.z, entrance,
      interior: spec.enterable ? interior : undefined, owner: spec.shop.owner,
    });
  }
}
