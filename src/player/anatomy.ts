import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * A single human rig shared by the instanced street crowd and the fully
 * articulated player avatar. Proportions are taken from a 1.72 m adult so that
 * doorways, bus steps, market counters and camera heights all agree.
 */
export const RIG = {
  height: 1.74,
  hipY: 0.90, hipX: 0.098,
  kneeY: 0.45, ankleY: 0.075,
  waistY: 1.00, chestY: 1.24,
  shoulderY: 1.425, shoulderX: 0.185,
  neckY: 1.455, headY: 1.545,
  thigh: 0.45, shin: 0.375, foot: 0.245,
  upperArm: 0.285, foreArm: 0.265,
  torso: 0.44,
};

export type PartName =
  | 'head' | 'features' | 'hair' | 'torso' | 'sash'
  | 'armUL' | 'armUR' | 'armLL' | 'armLR'
  | 'thighL' | 'thighR' | 'shinL' | 'shinR'
  | 'footL' | 'footR' | 'skirt' | 'prop';

export const PART_NAMES: PartName[] = [
  'head', 'features', 'hair', 'torso', 'sash',
  'armUL', 'armUR', 'armLL', 'armLR',
  'thighL', 'thighR', 'shinL', 'shinR',
  'footL', 'footR', 'skirt', 'prop',
];

/* ------------------------------------------------------------------ */
/* Geometry helpers                                                    */
/* ------------------------------------------------------------------ */

class PartBuilder {
  private pieces: T.BufferGeometry[] = [];
  add(geometry: T.BufferGeometry, tint: T.ColorRepresentation = '#ffffff') {
    const flat = geometry.index ? geometry.toNonIndexed() : geometry;
    if (flat !== geometry) geometry.dispose();
    const color = new T.Color(tint);
    const count = flat.getAttribute('position').count;
    const array = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) { array[i * 3] = color.r; array[i * 3 + 1] = color.g; array[i * 3 + 2] = color.b; }
    flat.setAttribute('color', new T.BufferAttribute(array, 3));
    for (const key of Object.keys(flat.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(key)) flat.deleteAttribute(key);
    if (!flat.getAttribute('uv')) flat.setAttribute('uv', new T.BufferAttribute(new Float32Array(count * 2), 2));
    this.pieces.push(flat);
    return this;
  }
  build(): T.BufferGeometry {
    if (!this.pieces.length) return new T.BufferGeometry();
    const merged = mergeGeometries(this.pieces) ?? this.pieces[0].clone();
    this.pieces.forEach(piece => piece.dispose());
    this.pieces = [];
    merged.computeBoundingSphere();
    return merged;
  }
}

/** A rounded, gently tapered limb whose origin sits exactly on its joint. */
function limb(radiusTop: number, radiusBottom: number, length: number, radial = 8, cap = 3) {
  const shaft = Math.max(0.004, length - radiusTop * 0.9 - radiusBottom * 0.9);
  const geometry = new T.CapsuleGeometry(1, shaft, cap, radial);
  const position = geometry.getAttribute('position') as T.BufferAttribute;
  const half = shaft / 2;
  const span = shaft + radiusTop * 0.9 + radiusBottom * 0.9;
  for (let i = 0; i < position.count; i++) {
    const y = position.getY(i);
    const t = T.MathUtils.clamp((half - y) / Math.max(shaft, 0.0001), -0.35, 1.35);
    const radius = radiusTop + (radiusBottom - radiusTop) * T.MathUtils.clamp(t, 0, 1);
    position.setX(i, position.getX(i) * radius);
    position.setZ(i, position.getZ(i) * radius);
    if (y > half) position.setY(i, half + (y - half) * radiusTop * 0.9);
    else if (y < -half) position.setY(i, -half + (y + half) * radiusBottom * 0.9);
  }
  geometry.translate(0, -(half + radiusTop * 0.9), 0);
  void span;
  geometry.computeVertexNormals();
  return geometry;
}

/** Torso silhouette: shoulders, a narrower waist and a flattened front-to-back section. */
function torsoGeometry(detail: number, female: boolean) {
  const profile: Array<[number, number]> = female
    ? [[0.020, -0.06], [0.150, -0.02], [0.163, 0.05], [0.150, 0.13], [0.132, 0.21], [0.147, 0.29], [0.171, 0.36], [0.176, 0.41], [0.160, 0.45], [0.108, 0.48], [0.020, 0.495]]
    : [[0.020, -0.06], [0.152, -0.02], [0.160, 0.05], [0.156, 0.13], [0.150, 0.21], [0.168, 0.29], [0.184, 0.36], [0.186, 0.41], [0.166, 0.45], [0.112, 0.48], [0.020, 0.495]];
  const points = profile.map(([r, y]) => new T.Vector2(r, y));
  const geometry = new T.LatheGeometry(points, detail > 0 ? 16 : 10);
  geometry.scale(1, 1, 0.7);
  geometry.computeVertexNormals();
  return geometry;
}

function headGeometry(detail: number) {
  const part = new PartBuilder();
  const skull = new T.SphereGeometry(0.101, detail > 0 ? 18 : 10, detail > 0 ? 14 : 8);
  skull.scale(0.95, 1.1, 1.0); skull.translate(0, 0.088, 0.004);
  part.add(skull);
  const jaw = new T.SphereGeometry(0.076, detail > 0 ? 14 : 8, detail > 0 ? 10 : 6);
  jaw.scale(0.9, 0.78, 0.96); jaw.translate(0, 0.036, 0.014);
  part.add(jaw);
  const neck = limb(0.045, 0.055, 0.075, detail > 0 ? 10 : 6);
  neck.translate(0, 0.012, 0); part.add(neck);
  if (detail > 0) {
    const nose = new T.ConeGeometry(0.021, 0.05, 6);
    nose.rotateX(Math.PI / 2); nose.rotateZ(Math.PI); nose.translate(0, 0.078, 0.088);
    part.add(nose, '#f0ded4');
    for (const side of [-1, 1]) {
      const ear = new T.SphereGeometry(0.026, 8, 6);
      ear.scale(0.4, 1.05, 0.72); ear.translate(side * 0.096, 0.088, -0.004);
      part.add(ear);
    }
  }
  return part.build();
}

/** Eyes, brows and lips ride on their own always-white instance colour. */
function featureGeometry(detail: number) {
  const part = new PartBuilder();
  if (detail < 1) return part.build();
  for (const side of [-1, 1]) {
    const white = new T.SphereGeometry(0.0165, 8, 6);
    white.scale(1, 0.86, 0.7); white.translate(side * 0.036, 0.104, 0.079);
    part.add(white, '#efe9e0');
    const iris = new T.SphereGeometry(0.0082, 8, 6);
    iris.scale(1, 1, 0.55); iris.translate(side * 0.036, 0.103, 0.0905);
    part.add(iris, '#2a1c12');
    const brow = new T.BoxGeometry(0.036, 0.0075, 0.012);
    brow.rotateZ(side * 0.09); brow.translate(side * 0.037, 0.131, 0.081);
    part.add(brow, '#241a13');
  }
  const lip = new T.SphereGeometry(0.021, 10, 6);
  lip.scale(1.28, 0.36, 0.55); lip.translate(0, 0.041, 0.077);
  part.add(lip, '#8e5347');
  return part.build();
}

export type HairStyle = 'short' | 'bun' | 'braid' | 'cap' | 'turban' | 'bald' | 'wrap';

function hairGeometry(style: HairStyle, detail: number) {
  const part = new PartBuilder();
  const segments = detail > 0 ? 16 : 8;
  if (style === 'bald') {
    const fringe = new T.SphereGeometry(0.1045, segments, 6, 0, Math.PI * 2, 0, Math.PI * 0.32);
    fringe.scale(0.96, 1.06, 1.0); fringe.translate(0, 0.086, 0.004);
    part.add(fringe);
    return part.build();
  }
  if (style === 'turban') {
    const wrap = new T.TorusGeometry(0.086, 0.043, 8, segments);
    wrap.rotateX(Math.PI / 2); wrap.scale(1, 1, 0.92); wrap.translate(0, 0.148, 0.006);
    part.add(wrap);
    const dome = new T.SphereGeometry(0.088, segments, 8, 0, Math.PI * 2, 0, Math.PI * 0.56);
    dome.translate(0, 0.148, 0.004); part.add(dome);
    return part.build();
  }
  if (style === 'cap') {
    const dome = new T.SphereGeometry(0.104, segments, 8, 0, Math.PI * 2, 0, Math.PI * 0.55);
    dome.scale(0.98, 0.92, 1.0); dome.translate(0, 0.092, 0.004); part.add(dome);
    const peak = new T.BoxGeometry(0.15, 0.012, 0.075);
    peak.rotateX(-0.14); peak.translate(0, 0.114, 0.098); part.add(peak);
    return part.build();
  }
  const cap = new T.SphereGeometry(0.1075, segments, 10, 0, Math.PI * 2, 0, Math.PI * (style === 'short' ? 0.56 : 0.68));
  cap.scale(0.98, 1.12, 1.0); cap.translate(0, 0.084, 0.002);
  part.add(cap);
  if (style === 'wrap') {
    const veil = new T.SphereGeometry(0.118, segments, 10, 0, Math.PI * 2, 0, Math.PI * 0.78);
    veil.scale(1.02, 1.16, 1.04); veil.translate(0, 0.078, -0.006);
    part.add(veil, '#f3ece0');
  }
  if (style === 'bun') {
    const bun = new T.SphereGeometry(0.05, segments, 8);
    bun.scale(1, 0.88, 0.9); bun.translate(0, 0.128, -0.096); part.add(bun);
  }
  if (style === 'braid') {
    for (let i = 0; i < 4; i++) {
      const link = new T.SphereGeometry(0.031 - i * 0.004, 8, 6);
      link.scale(1, 1.25, 1); link.translate(0, 0.05 - i * 0.062, -0.085 - i * 0.006);
      part.add(link);
    }
  }
  return part.build();
}

export type LegStyle = 'trouser' | 'skirt' | 'dhoti' | 'short';
export type Accessory = 'none' | 'bag' | 'umbrella' | 'basket' | 'phone' | 'tiffin';

function skirtGeometry(style: LegStyle, detail: number) {
  const part = new PartBuilder();
  const segments = detail > 0 ? 16 : 9;
  if (style === 'skirt') {
    const cloth = new T.CylinderGeometry(0.175, 0.29, 0.72, segments, 2, true);
    cloth.translate(0, -0.3, 0); part.add(cloth);
    const hem = new T.TorusGeometry(0.288, 0.012, 5, segments);
    hem.rotateX(Math.PI / 2); hem.translate(0, -0.66, 0); part.add(hem, '#e6d7b4');
  } else if (style === 'dhoti') {
    const cloth = new T.CylinderGeometry(0.17, 0.235, 0.42, segments, 1, true);
    cloth.translate(0, -0.19, 0); part.add(cloth);
  }
  return part.build();
}

function sashGeometry(detail: number) {
  const part = new PartBuilder();
  const segments = detail > 0 ? 14 : 8;
  const band = new T.CylinderGeometry(0.175, 0.2, 0.5, segments, 1, true, Math.PI * 0.15, Math.PI * 1.1);
  band.scale(1.06, 1, 0.78); band.translate(0, 0.2, 0);
  part.add(band);
  const drape = new T.BoxGeometry(0.16, 0.42, 0.012);
  drape.rotateZ(0.09); drape.translate(0.16, 0.06, -0.11);
  part.add(drape);
  return part.build();
}

function footGeometry(detail: number) {
  const part = new PartBuilder();
  const shoe = new T.SphereGeometry(0.06, detail > 0 ? 12 : 6, detail > 0 ? 8 : 5);
  shoe.scale(0.78, 0.62, 1.9); shoe.translate(0, -0.035, 0.055);
  part.add(shoe);
  const sole = new T.BoxGeometry(0.088, 0.018, 0.235);
  sole.translate(0, -0.066, 0.05);
  part.add(sole, '#c8c2b4');
  return part.build();
}

function handAndForearm(detail: number) {
  const part = new PartBuilder();
  part.add(limb(0.046, 0.032, RIG.foreArm, detail > 0 ? 9 : 6));
  const palm = new T.SphereGeometry(0.038, detail > 0 ? 10 : 6, detail > 0 ? 8 : 5);
  palm.scale(0.82, 1.5, 0.42); palm.translate(0, -RIG.foreArm - 0.048, 0.004);
  part.add(palm);
  if (detail > 1) {
    const thumb = new T.SphereGeometry(0.014, 6, 5);
    thumb.scale(1, 1.7, 1); thumb.translate(0.028, -RIG.foreArm - 0.042, 0.012);
    part.add(thumb);
  }
  return part.build();
}

function upperArmGeometry(sleeve: 'long' | 'short' | 'none', detail: number) {
  const part = new PartBuilder();
  part.add(limb(0.056, 0.043, RIG.upperArm, detail > 0 ? 9 : 6));
  if (sleeve !== 'none') {
    const cuff = new T.CylinderGeometry(0.05, 0.047, 0.02, detail > 0 ? 10 : 6);
    cuff.translate(0, -(sleeve === 'long' ? RIG.upperArm - 0.01 : RIG.upperArm * 0.55), 0);
    part.add(cuff, '#f2f2f2');
  }
  return part.build();
}

function propGeometry(kind: Accessory, detail: number) {
  const part = new PartBuilder();
  const segments = detail > 0 ? 12 : 6;
  if (kind === 'bag') {
    const body = new T.BoxGeometry(0.2, 0.24, 0.09);
    body.translate(0, -0.1, 0); part.add(body);
    const strap = new T.TorusGeometry(0.11, 0.008, 4, segments, Math.PI);
    strap.translate(0, 0.01, 0); part.add(strap, '#6a5a44');
  } else if (kind === 'umbrella') {
    const canopy = new T.SphereGeometry(0.32, segments, 7, 0, Math.PI * 2, 0, Math.PI * 0.42);
    canopy.translate(0, 0.34, 0); part.add(canopy);
    const shaft = new T.CylinderGeometry(0.008, 0.008, 0.62, 5);
    shaft.translate(0, 0.06, 0); part.add(shaft, '#4a4038');
  } else if (kind === 'basket') {
    const bowl = new T.CylinderGeometry(0.17, 0.12, 0.13, segments, 1, true);
    bowl.translate(0, 0.06, 0); part.add(bowl);
    const base = new T.CircleGeometry(0.12, segments); base.rotateX(Math.PI / 2);
    part.add(base);
    for (let i = 0; i < 5; i++) {
      const fruit = new T.SphereGeometry(0.037, 7, 5);
      fruit.translate(Math.cos(i * 1.3) * 0.07, 0.12, Math.sin(i * 1.3) * 0.07);
      part.add(fruit, ['#b4623a', '#8e9c4e', '#c9a24a', '#a45640', '#6f8a52'][i]);
    }
  } else if (kind === 'tiffin') {
    for (let i = 0; i < 3; i++) {
      const tin = new T.CylinderGeometry(0.062, 0.062, 0.048, segments);
      tin.translate(0, -0.06 + i * 0.052, 0); part.add(tin);
    }
    const handle = new T.TorusGeometry(0.05, 0.005, 4, segments, Math.PI);
    handle.translate(0, 0.05, 0); part.add(handle, '#9aa0a2');
  } else if (kind === 'phone') {
    const slab = new T.BoxGeometry(0.045, 0.088, 0.008);
    part.add(slab, '#20242a');
    const screen = new T.BoxGeometry(0.038, 0.078, 0.002);
    screen.translate(0, 0, 0.006); part.add(screen, '#cfe2e6');
  }
  return part.build();
}

/* ------------------------------------------------------------------ */
/* Outfits                                                             */
/* ------------------------------------------------------------------ */

export interface Outfit {
  skin: string; hairColor: string; hair: HairStyle;
  shirt: string; sleeve: 'long' | 'short' | 'none';
  legs: LegStyle; legColor: string; shoe: string;
  garment: string | null; sash: string | null;
  accessory: Accessory; female: boolean; scale: number; headScale: number;
}

export const SKIN_TONES = ['#f1cba6', '#e5b78f', '#d3a077', '#c08a5f', '#a97247', '#8d5c37', '#7a4c2c', '#e8c19c'];
export const HAIR_COLORS = ['#120e0b', '#1c1512', '#241a13', '#31241a', '#3d2c1e', '#6b6259', '#9a938a'];
const SHIRT_COLORS = ['#d9d2c2', '#8fa6a3', '#b8695a', '#5f7b86', '#c8a45c', '#77855f', '#a86f8c', '#4f5f6d', '#d8b98a', '#6a8f7c'];
const LEG_COLORS = ['#2f3a43', '#4a4438', '#6a6152', '#37424a', '#8a8271', '#22262b', '#5a5f52'];
const SAREE_COLORS = ['#a8324a', '#256b57', '#c0762a', '#5b3c7d', '#1f5f86', '#b4416b', '#8d6a1e', '#3f7d4a'];

/** Turns a stable id into a repeatable, plausible outfit. */
export function outfitFor(seed: number, age: 'Child' | 'Adult' | 'Elder', accent?: string): Outfit {
  const rand = (n: number) => {
    let x = Math.sin(seed * 127.1 + n * 311.7) * 43758.5453;
    return x - Math.floor(x);
  };
  const female = rand(1) < 0.48;
  const child = age === 'Child';
  const elder = age === 'Elder';
  const pick = <V>(list: V[], n: number) => list[Math.floor(rand(n) * list.length) % list.length];
  const traditional = female ? rand(2) < 0.62 : rand(2) < 0.3;
  const hair: HairStyle = child ? (female ? 'braid' : 'short')
    : female ? (traditional ? (rand(3) < 0.5 ? 'bun' : 'braid') : 'bun')
      : elder ? (rand(3) < 0.4 ? 'bald' : 'short')
        : rand(3) < 0.1 ? 'turban' : rand(3) < 0.2 ? 'cap' : 'short';
  const legs: LegStyle = female
    ? (traditional ? 'skirt' : 'trouser')
    : child ? 'short' : (traditional && rand(4) < 0.5 ? 'dhoti' : 'trouser');
  const garmentColor = pick(SAREE_COLORS, 5);
  return {
    skin: pick(SKIN_TONES, 6),
    hairColor: elder && rand(7) < 0.6 ? '#9a938a' : pick(HAIR_COLORS.slice(0, 5), 7),
    hair,
    shirt: accent || (traditional && female ? garmentColor : pick(SHIRT_COLORS, 8)),
    sleeve: rand(9) < 0.35 ? 'long' : rand(9) < 0.9 ? 'short' : 'none',
    legs,
    legColor: legs === 'skirt' ? garmentColor : pick(LEG_COLORS, 10),
    shoe: rand(11) < 0.3 ? '#6b5136' : rand(11) < 0.7 ? '#242628' : '#8d8577',
    garment: legs === 'skirt' || legs === 'dhoti' ? garmentColor : null,
    sash: female && traditional ? pick(SAREE_COLORS, 12) : null,
    accessory: rand(13) < 0.16 ? 'bag' : rand(13) < 0.22 ? 'basket' : rand(13) < 0.27 ? 'tiffin' : rand(13) < 0.32 ? 'phone' : 'none',
    female,
    scale: child ? 0.68 + rand(14) * 0.09 : elder ? 0.94 + rand(14) * 0.03 : 0.955 + rand(14) * 0.075,
    headScale: child ? 1.16 : 1,
  };
}

/* ------------------------------------------------------------------ */
/* Geometry cache                                                      */
/* ------------------------------------------------------------------ */

const cache = new Map<string, T.BufferGeometry>();
function memo(key: string, make: () => T.BufferGeometry) {
  let hit = cache.get(key);
  if (!hit) { hit = make(); cache.set(key, hit); }
  return hit;
}

function shinGeometry(detail: number) {
  const part = new PartBuilder();
  part.add(limb(0.058, 0.04, RIG.shin, detail > 0 ? 9 : 6));
  const calf = new T.SphereGeometry(0.052, detail > 0 ? 10 : 6, detail > 0 ? 8 : 5);
  calf.scale(0.9, 1.5, 1.05); calf.translate(0, -0.115, -0.016);
  part.add(calf);
  return part.build();
}

/**
 * Crowd instances share one geometry per body part and per visible variant, so a
 * street of a hundred people still costs a couple of dozen draw calls. Variation
 * comes from per-instance colour, outfit variant and pose - never unique meshes.
 */
export const geo = {
  head: (d: number) => memo(`head${d}`, () => headGeometry(d)),
  features: (d: number) => memo(`face${d}`, () => featureGeometry(d)),
  hair: (style: HairStyle, d: number) => memo(`hair${style}${d}`, () => hairGeometry(style, d)),
  torso: (female: boolean, d: number) => memo(`torso${female}${d}`, () => torsoGeometry(d, female)),
  sash: (d: number) => memo(`sash${d}`, () => sashGeometry(d)),
  upperArm: (sleeve: 'long' | 'short' | 'none', d: number) => memo(`arm${sleeve}${d}`, () => upperArmGeometry(sleeve, d)),
  foreArm: (d: number) => memo(`fore${d}`, () => handAndForearm(d)),
  thigh: (d: number) => memo(`thigh${d}`, () => limb(0.084, 0.061, RIG.thigh, d > 0 ? 10 : 6)),
  shin: (d: number) => memo(`shin${d}`, () => shinGeometry(d)),
  foot: (d: number) => memo(`foot${d}`, () => footGeometry(d)),
  skirt: (style: LegStyle, d: number) => memo(`skirt${style}${d}`, () => skirtGeometry(style, d)),
  prop: (kind: Accessory, d: number) => memo(`prop${kind}${d}`, () => propGeometry(kind, d)),
};

export const HAIR_STYLES: HairStyle[] = ['short', 'bun', 'braid', 'cap', 'turban', 'bald', 'wrap'];
export const ACCESSORIES: Accessory[] = ['none', 'bag', 'umbrella', 'basket', 'phone', 'tiffin'];
export const LEG_STYLES: LegStyle[] = ['trouser', 'skirt', 'dhoti', 'short'];

/* ------------------------------------------------------------------ */
/* Pose                                                                */
/* ------------------------------------------------------------------ */

export type Action = 'idle' | 'walk' | 'run' | 'sit' | 'talk' | 'carry' | 'drive';

export interface Pose {
  rootLift: number; rootRoll: number; rootYaw: number;
  spine: number; spineTwist: number; spineSide: number;
  neck: number; headYaw: number; headRoll: number;
  shoulder: [number, number]; shoulderOut: [number, number]; shoulderTwist: [number, number];
  elbow: [number, number];
  hip: [number, number]; hipOut: [number, number]; knee: [number, number]; ankle: [number, number];
}

export function createPose(): Pose {
  return {
    rootLift: 0, rootRoll: 0, rootYaw: 0,
    spine: 0, spineTwist: 0, spineSide: 0,
    neck: 0, headYaw: 0, headRoll: 0,
    shoulder: [0, 0], shoulderOut: [0, 0], shoulderTwist: [0, 0], elbow: [0, 0],
    hip: [0, 0], hipOut: [0, 0], knee: [0, 0], ankle: [0, 0],
  };
}

/**
 * A hand-tuned gait rather than a keyframe clip: the knee flexes just after
 * toe-off, the pelvis drops on the loaded leg, the shoulders counter-rotate
 * against the hips, and the whole body lifts twice per stride.
 */
export function solvePose(pose: Pose, phase: number, walk: number, run: number, time: number, seed: number, action: Action = 'walk') {
  const w = T.MathUtils.clamp(walk, 0, 1);
  const r = T.MathUtils.clamp(run, 0, 1);
  const breath = Math.sin(time * 1.35 + seed) * 0.013;
  const idleSway = Math.sin(time * 0.62 + seed * 2.1) * 0.045 * (1 - w);
  const fidget = Math.sin(time * 0.31 + seed * 5.3);

  if (action === 'sit' || action === 'drive') {
    pose.rootLift = -0.44; pose.rootRoll = 0; pose.rootYaw = 0;
    pose.spine = 0.1 + breath; pose.spineTwist = 0; pose.spineSide = 0;
    pose.neck = -0.06; pose.headYaw = idleSway * 0.8; pose.headRoll = 0;
    const wheel = action === 'drive' ? 1 : 0;
    pose.shoulder = [-0.85 * wheel - 0.1, -0.85 * wheel - 0.1];
    pose.shoulderOut = [0.16, -0.16];
    pose.shoulderTwist = [0, 0];
    pose.elbow = [1.35 - wheel * 0.45, 1.35 - wheel * 0.45];
    pose.hip = [1.42, 1.42]; pose.hipOut = [0.12, -0.12];
    pose.knee = [1.5, 1.5]; pose.ankle = [0.12, 0.12];
    return pose;
  }

  const stride = 0.58 + r * 0.42;
  const armSwing = 0.42 + r * 0.55;
  const leg = (offset: number, index: 0 | 1) => {
    const p = phase + offset;
    pose.hip[index] = Math.sin(p) * stride * w - 0.03 - r * 0.12;
    // The knee stays near-straight through stance and folds through swing.
    pose.knee[index] = 0.08 + Math.max(0, Math.sin(p + 2.35)) * (1.05 + r * 0.55) * w + Math.max(0, -Math.sin(p + 0.4)) * 0.12 * w;
    pose.ankle[index] = (Math.sin(p + 1.15) * 0.34 - 0.06) * w + 0.04;
    pose.hipOut[index] = (index === 0 ? 1 : -1) * (0.028 + 0.02 * w);
  };
  leg(0, 0);
  leg(Math.PI, 1);

  const arm = (offset: number, index: 0 | 1) => {
    const p = phase + offset;
    const relaxed = index === 0 ? -0.06 + idleSway * 0.4 : -0.06 - idleSway * 0.4;
    pose.shoulder[index] = -Math.sin(p) * armSwing * w + relaxed * (1 - w * 0.5);
    pose.shoulderOut[index] = (index === 0 ? 1 : -1) * (0.11 + 0.05 * w + r * 0.05);
    pose.shoulderTwist[index] = (index === 0 ? 1 : -1) * 0.1;
    pose.elbow[index] = 0.16 + w * (0.35 + r * 0.45) + Math.max(0, Math.sin(p)) * (0.42 + r * 0.4) * w;
  };
  arm(Math.PI, 0);
  arm(0, 1);

  if (action === 'carry') {
    pose.shoulder[1] = -0.34; pose.elbow[1] = 1.62; pose.shoulderOut[1] = -0.22;
  }
  if (action === 'talk') {
    const beat = Math.sin(time * 3.1 + seed);
    pose.shoulder[1] = -0.5 - beat * 0.22; pose.elbow[1] = 1.3 + beat * 0.35; pose.shoulderOut[1] = -0.3;
    pose.headYaw = beat * 0.14;
  }

  pose.rootLift = Math.abs(Math.sin(phase)) * 0.032 * w - 0.02 * w + breath * 0.4;
  pose.rootRoll = -Math.sin(phase) * 0.055 * w;
  pose.rootYaw = Math.sin(phase) * 0.11 * w;
  pose.spine = 0.045 + w * (0.06 + r * 0.2) + breath;
  pose.spineTwist = -Math.sin(phase) * (0.13 + r * 0.08) * w;
  pose.spineSide = Math.sin(phase) * 0.035 * w + idleSway * 0.3;
  pose.neck = -0.03 - w * 0.05 - r * 0.06;
  pose.headYaw = (pose.headYaw || 0) + idleSway * 0.9 + fidget * 0.08 * (1 - w);
  pose.headRoll = -Math.sin(phase) * 0.03 * w;
  return pose;
}
