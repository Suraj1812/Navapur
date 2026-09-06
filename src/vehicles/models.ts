import * as T from 'three';
import { ModelBuilder } from '../core/geometry';

export type VehicleKind = 'auto' | 'car' | 'bus' | 'truck' | 'motorcycle' | 'scooter' | 'van' | 'ambulance' | 'bicycle' | 'rickshaw' | 'tempo';

/** Lamps and lenses share one unlit material so night traffic costs nothing extra. */
export const LIGHT_MATERIAL = new T.MeshBasicMaterial({ vertexColors: true, toneMapped: false, transparent: true, opacity: 0 });

const METAL = '#8a9394';
const BLACK = '#232a28';
const GLASS = '#5b7a7c';
const RUBBER = '#15191a';
const CHROME = '#c3c9c6';

export interface VehicleModel { group: T.Group; length: number; width: number; }

/**
 * Every vehicle is one merged mesh plus one tiny light mesh, so a street full of
 * traffic stays cheap. The shapes are deliberately specific: a three-wheeler's
 * canopy ribs, a bus's roof rack, the painted tailgate of a goods truck.
 */
export function vehicleModel(kind: VehicleKind, color = '#d7d3c5'): VehicleModel {
  const b = new ModelBuilder();
  const lights = new ModelBuilder();
  let length = 3.9, width = 1.7;

  if (kind === 'auto') {
    length = 2.75; width = 1.48;
    b.box(1.4, 0.45, 2.55, '#2c5b48', 0, 0.7, 0);
    b.box(1.44, 0.55, 0.68, '#d4ae43', 0, 1.0, 1.0);
    b.box(1.5, 0.16, 2.1, '#d7b349', 0, 2.0, -0.2);
    for (let rib = -2; rib <= 2; rib++) b.box(1.46, 0.05, 0.05, '#b8963c', 0, 1.98, rib * 0.42);
    b.box(1.38, 0.85, 0.08, '#254d39', 0, 1.4, -1.2);
    b.box(1.25, 0.45, 0.08, GLASS, 0, 1.62, 0.86, -0.16);
    for (const x of [-0.67, 0.67]) {
      b.box(0.055, 0.9, 0.055, BLACK, x, 1.5, 0.82, -0.17);
      b.box(0.06, 0.92, 0.06, BLACK, x, 1.5, -1.13);
      b.box(0.06, 0.13, 1.75, '#c9a64b', x, 1.13, -0.22);
      b.box(0.55, 0.11, 0.15, METAL, x, 1.0, 0.85);
      b.box(0.07, 0.07, 0.07, CHROME, x * 1.05, 1.44, 0.9);
    }
    b.box(1.13, 0.17, 0.6, BLACK, 0, 0.97, -0.6);
    b.box(1.13, 0.53, 0.1, '#3a4a42', 0, 1.21, -0.9);
    b.box(0.6, 0.15, 0.5, BLACK, 0, 1.0, 0.48);
    b.box(0.15, 0.5, 0.1, BLACK, 0, 1.26, 0.62);
    b.box(0.52, 0.05, 0.05, CHROME, 0, 1.5, 0.7);
    b.cylinder(0.05, 0.05, 0.5, CHROME, 0, 1.34, 0.66, 0, 0, Math.PI / 2);
    b.box(0.55, 0.11, 0.03, '#e8c959', 0, 0.65, 1.32);
    b.box(0.4, 0.2, 0.02, '#e2d7bb', 0, 1.72, -1.24);
    for (const x of [-0.45, 0.45]) lights.box(0.19, 0.15, 0.05, '#fff3d2', x, 0.94, 1.35);
    for (const x of [-0.5, 0.5]) lights.box(0.14, 0.1, 0.04, '#ff5a3c', x, 0.96, -1.27);
  } else if (kind === 'bicycle' || kind === 'rickshaw') {
    const cycle = kind === 'bicycle';
    length = cycle ? 1.85 : 2.9; width = cycle ? 0.6 : 1.3;
    b.cylinder(0.028, 0.028, 1.0, color, 0, 0.66, 0.05, 0, 0, 1.15);
    b.cylinder(0.026, 0.026, 0.62, color, 0, 0.62, 0.46, 0.5);
    b.cylinder(0.024, 0.024, 0.66, color, 0, 0.55, -0.3, -0.6);
    b.box(0.24, 0.07, 0.3, BLACK, 0, 0.94, -0.28);
    b.box(0.5, 0.035, 0.035, BLACK, 0, 1.02, 0.52);
    b.cylinder(0.02, 0.02, 0.42, METAL, 0, 0.82, 0.5);
    b.cylinder(0.09, 0.09, 0.03, CHROME, 0.06, 0.28, 0.05, 0, 0, Math.PI / 2);
    if (!cycle) {
      b.box(1.2, 0.12, 1.05, '#7d5a3c', 0, 0.78, -1.0);
      b.box(1.2, 0.6, 0.1, '#6d4f34', 0, 1.08, -1.5);
      for (const x of [-0.58, 0.58]) b.cylinder(0.035, 0.035, 1.1, METAL, x, 1.4, -1.35);
      b.box(1.35, 0.1, 1.25, '#2d5b48', 0, 1.95, -1.2);
      b.box(1.35, 0.45, 0.05, '#2d5b48', 0, 1.72, -1.78);
      for (const x of [-0.6, 0.6]) b.cylinder(0.33, 0.33, 0.06, RUBBER, x, 0.33, -1.15, 0, 0, Math.PI / 2);
    }
    for (const z of cycle ? [-0.62, 0.62] : [0.68] as number[]) b.cylinder(0.34, 0.34, 0.05, RUBBER, 0, 0.34, z, 0, 0, Math.PI / 2);
    lights.box(0.09, 0.07, 0.03, '#fff0c8', 0, 0.72, 0.72);
  } else if (kind === 'motorcycle' || kind === 'scooter') {
    length = 2.05; width = 0.7;
    b.box(0.3, 0.32, 1.24, color, 0, 0.79, 0);
    b.box(0.44, 0.14, 0.9, BLACK, 0, 1.02, -0.25);
    b.box(0.2, 0.8, 0.2, METAL, 0, 0.83, 0.64, 0.24);
    b.box(0.68, 0.06, 0.07, BLACK, 0, 1.33, 0.53);
    b.box(0.44, 0.32, 0.16, color, 0, 1.14, 0.68);
    b.cylinder(0.16, 0.16, 0.1, CHROME, 0, 1.16, 0.78, Math.PI / 2);
    b.box(0.14, 0.14, 0.6, METAL, 0.25, 0.53, -0.5);
    b.box(0.05, 0.24, 0.05, METAL, 0, 1.5, -0.5);
    if (kind === 'scooter') { b.box(0.48, 0.66, 0.2, color, 0, 0.76, 0.37, -0.1); b.box(0.36, 0.1, 0.36, color, 0, 1.06, -0.62); }
    for (const z of [-0.73, 0.74]) b.cylinder(0.3, 0.3, 0.14, RUBBER, 0, 0.3, z, 0, 0, Math.PI / 2);
    lights.box(0.2, 0.14, 0.04, '#fff2d6', 0, 1.16, 0.8);
    lights.box(0.12, 0.08, 0.03, '#ff5c3a', 0, 1.02, -0.72);
  } else {
    const large = kind === 'bus' || kind === 'truck';
    length = kind === 'bus' ? 8.8 : kind === 'truck' ? 6.4 : kind === 'tempo' ? 4.2 : kind === 'van' || kind === 'ambulance' ? 4.8 : 4.0;
    width = large ? 2.32 : kind === 'tempo' ? 1.6 : 1.78;
    b.box(width, 0.5, length, color, 0, 0.7, 0);
    b.box(width + 0.06, 0.16, length + 0.06, BLACK, 0, 0.41, 0);
    b.box(width * 0.98, 0.14, length - 0.05, color, 0, 1.0, 0);

    if (kind === 'bus') {
      b.box(width, 1.95, length - 0.25, '#cbbcaf', 0, 1.92, -0.05);
      b.box(width + 0.03, 0.52, length - 0.22, '#ad563c', 0, 1.13, -0.05);
      b.box(width, 0.16, length, '#e2d8c3', 0, 2.94, 0);
      b.box(width - 0.3, 0.12, length - 1.6, METAL, 0, 3.06, -0.4);
      for (let rack = 0; rack < 4; rack++) b.box(width - 0.5, 0.28, 0.5, ['#8a6a45', '#6a7a6a', '#9a8a5a'][rack % 3], 0, 3.2, -2.4 + rack * 1.3);
      b.box(width - 0.2, 0.95, 0.04, GLASS, 0, 2.2, length / 2 - 0.16);
      b.box(width - 0.24, 0.42, 0.05, '#2b3a33', 0, 2.78, length / 2 - 0.14);
      for (let z = -3.6; z < 3.4; z += 1.07) for (const x of [-width / 2 - 0.014, width / 2 + 0.014]) {
        b.box(0.026, 0.92, 0.88, GLASS, x, 2.14, z);
        b.box(0.045, 0.04, 0.9, METAL, x, 1.86, z);
      }
      b.box(0.1, 1.8, 0.9, '#3a4a44', width / 2 - 0.02, 1.9, length / 2 - 1.4);
      for (const x of [-0.85, 0.85]) lights.box(0.32, 0.22, 0.04, '#fff1cd', x, 0.95, length / 2 + 0.02);
      for (const x of [-0.9, 0.9]) lights.box(0.28, 0.18, 0.04, '#ff5233', x, 0.95, -length / 2 - 0.02);
    } else if (kind === 'truck') {
      b.box(width, 1.68, 2.0, '#b2744f', 0, 1.78, 2.0);
      b.box(width - 0.2, 0.68, 0.04, GLASS, 0, 2.1, 3.0);
      b.box(width - 0.1, 1.9, 3.9, '#968c73', 0, 1.8, -0.95);
      b.box(width, 0.9, 0.1, '#c25f3a', 0, 1.4, -2.92);
      b.box(width - 0.4, 0.4, 0.03, '#e8dcb4', 0, 1.42, -2.98);
      for (let z = -2.7; z < 1; z += 0.5) for (const x of [-1.17, 1.17]) b.box(0.045, 1.7, 0.08, '#655e52', x, 1.8, z);
      b.box(width + 0.2, 0.18, 0.6, CHROME, 0, 2.86, 2.6);
      for (const x of [-0.8, 0.8]) lights.box(0.3, 0.2, 0.04, '#fff0c9', x, 0.9, length / 2 + 0.02);
      for (const x of [-0.9, 0.9]) lights.box(0.24, 0.3, 0.04, '#ff5233', x, 1.0, -length / 2 - 0.02);
      for (let i = -2; i <= 2; i++) lights.box(0.08, 0.06, 0.03, '#ffb648', i * 0.4, 2.94, 2.62);
    } else {
      const van = kind === 'van' || kind === 'ambulance' || kind === 'tempo';
      const cabinHeight = van ? 1.1 : 0.72;
      b.box(width - 0.18, cabinHeight, van ? length - 0.8 : 2.15, color, 0, van ? 1.56 : 1.33, van ? -0.2 : -0.25);
      // A softened roof line reads far better than a plain box.
      b.box(width - 0.5, 0.18, van ? length - 1.4 : 1.7, color, 0, van ? 2.14 : 1.72, van ? -0.2 : -0.3);
      b.box(width - 0.32, 0.52, 0.04, GLASS, 0, van ? 1.55 : 1.48, van ? length / 2 - 0.6 : 0.84, -0.2);
      b.box(width - 0.32, 0.46, 0.04, GLASS, 0, van ? 1.52 : 1.47, van ? -length / 2 + 0.21 : -1.34, 0.12);
      for (const x of [-width / 2 + 0.07, width / 2 - 0.07]) {
        b.box(0.04, 0.46, 0.86, GLASS, x, 1.5, 0.24);
        b.box(0.04, 0.46, 0.82, GLASS, x, 1.5, -0.72);
        b.box(0.17, 0.12, 0.26, BLACK, x * 1.14, 1.3, 0.68);
        b.box(0.05, 0.05, 1.9, CHROME, x, 1.02, -0.2);
      }
      if (kind === 'ambulance') {
        b.box(1.0, 0.16, 0.32, '#c2cbd1', 0, 2.24, 0.5);
        for (const x of [-0.9, 0.9]) { b.box(0.02, 0.5, 0.18, '#c64332', x, 1.66, -1.25); b.box(0.02, 0.18, 0.5, '#c64332', x, 1.66, -1.25); }
        lights.box(0.32, 0.17, 0.3, '#5aa8ff', -0.38, 2.3, 0.5);
        lights.box(0.32, 0.17, 0.3, '#ff4a35', 0.38, 2.3, 0.5);
      }
      if (kind === 'tempo') {
        b.box(width + 0.1, 0.1, 2.2, '#8a9a8f', 0, 2.3, -0.6);
        b.box(width + 0.1, 0.7, 0.05, '#c2703c', 0, 1.98, -length / 2 + 0.1);
      }
      for (const x of [-width * 0.34, width * 0.34]) lights.box(0.3, 0.14, 0.04, '#fff2d4', x, 0.87, length / 2 + 0.015);
      for (const x of [-width * 0.36, width * 0.36]) lights.box(0.26, 0.12, 0.04, '#ff4f31', x, 0.8, -length / 2 - 0.02);
    }
    b.box(0.46, 0.1, 0.03, CHROME, 0, 0.58, length / 2 + 0.04);
    b.box(width * 0.7, 0.2, 0.04, CHROME, 0, 0.68, length / 2 + 0.02);
    b.box(width * 0.7, 0.18, 0.04, CHROME, 0, 0.68, -length / 2 - 0.02);
  }

  const wheels: [number, number][] = kind === 'auto' ? [[-0.68, -0.8], [0.68, -0.8], [0, 0.89]]
    : kind === 'motorcycle' || kind === 'scooter' || kind === 'bicycle' || kind === 'rickshaw' ? []
      : [[-width * 0.49, -length * 0.31], [width * 0.49, -length * 0.31], [-width * 0.49, length * 0.31], [width * 0.49, length * 0.31]];
  const radius = kind === 'bus' || kind === 'truck' ? 0.46 : 0.33;
  for (const [wx, wz] of wheels) {
    b.cylinder(radius, radius, 0.22, RUBBER, wx, radius, wz, 0, 0, Math.PI / 2);
    b.cylinder(radius * 0.5, radius * 0.5, 0.235, CHROME, wx, radius, wz, 0, 0, Math.PI / 2);
    for (let spoke = 0; spoke < 4; spoke++) b.box(radius * 0.7, 0.06, 0.24, METAL, wx, radius, wz, 0, 0, spoke * 0.8);
  }

  const group = new T.Group();
  group.add(b.build());
  const lightMesh = lights.buildWith(LIGHT_MATERIAL);
  if (lightMesh) { lightMesh.castShadow = false; lightMesh.receiveShadow = false; group.add(lightMesh); }
  return { group, length, width };
}
