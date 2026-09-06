import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { seededRandom } from './batch';
import type { QualityProfile } from '../render/quality';

type Kind = 'cow' | 'dog' | 'goat';

interface Beast {
  kind: Kind; x: number; z: number; heading: number; speed: number;
  homeX: number; homeZ: number; targetX: number; targetZ: number;
  rest: number; scale: number; tint: T.Color; seed: number;
}

class Shape {
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
  build() {
    const merged = mergeGeometries(this.pieces)!;
    this.pieces.forEach(piece => piece.dispose());
    return merged;
  }
}

function leg(x: number, z: number, length: number, radius: number, shape: Shape, tint: string) {
  const upper = new T.CapsuleGeometry(radius, length * 0.55, 2, 6);
  upper.translate(x, length * 0.62, z);
  shape.add(upper, tint);
  const hoof = new T.CylinderGeometry(radius * 1.1, radius * 0.9, 0.06, 6);
  hoof.translate(x, 0.03, z);
  shape.add(hoof, '#3a332b');
}

/** A humped zebu: the calm, unbothered centre of any Indian street. */
function cowBody() {
  const shape = new Shape();
  const barrel = new T.SphereGeometry(0.46, 14, 10);
  barrel.scale(0.82, 0.92, 1.55); barrel.translate(0, 0.82, 0);
  shape.add(barrel);
  const hump = new T.SphereGeometry(0.2, 10, 8);
  hump.scale(0.9, 1.1, 1.2); hump.translate(0, 1.18, 0.36);
  shape.add(hump, '#e8e2d6');
  const chest = new T.SphereGeometry(0.3, 10, 8);
  chest.scale(0.9, 1.05, 0.9); chest.translate(0, 0.78, 0.6);
  shape.add(chest);
  const dewlap = new T.SphereGeometry(0.17, 8, 6);
  dewlap.scale(0.55, 1.5, 1.1); dewlap.translate(0, 0.62, 0.76);
  shape.add(dewlap, '#efe8dc');
  for (const side of [-0.28, 0.28]) { leg(side, 0.56, 0.72, 0.075, shape, '#ffffff'); leg(side, -0.52, 0.74, 0.08, shape, '#ffffff'); }
  const tail = new T.CylinderGeometry(0.024, 0.014, 0.72, 5);
  tail.rotateX(0.22); tail.translate(0, 0.72, -0.72);
  shape.add(tail, '#d9d1c2');
  const tuft = new T.SphereGeometry(0.055, 6, 5);
  tuft.translate(0, 0.38, -0.83); shape.add(tuft, '#4a4239');
  return shape.build();
}

function cowHead() {
  const shape = new Shape();
  const skull = new T.SphereGeometry(0.19, 12, 9);
  skull.scale(0.86, 0.95, 1.35); skull.translate(0, 0, 0.13);
  shape.add(skull);
  const muzzle = new T.SphereGeometry(0.11, 10, 8);
  muzzle.scale(0.9, 0.82, 1); muzzle.translate(0, -0.05, 0.32);
  shape.add(muzzle, '#d9c8bc');
  for (const side of [-1, 1]) {
    const ear = new T.SphereGeometry(0.07, 8, 6);
    ear.scale(0.35, 0.7, 1.25); ear.rotateY(side * 0.7); ear.translate(side * 0.19, 0.03, -0.02);
    shape.add(ear);
    const horn = new T.ConeGeometry(0.035, 0.24, 6);
    horn.rotateZ(side * 0.75); horn.rotateX(-0.25); horn.translate(side * 0.12, 0.2, -0.01);
    shape.add(horn, '#c9b992');
    const eye = new T.SphereGeometry(0.026, 7, 6);
    eye.translate(side * 0.135, 0.045, 0.19);
    shape.add(eye, '#241a14');
  }
  return shape.build();
}

function dogBody() {
  const shape = new Shape();
  const barrel = new T.SphereGeometry(0.19, 12, 9);
  barrel.scale(0.82, 0.9, 1.65); barrel.translate(0, 0.38, 0);
  shape.add(barrel);
  for (const side of [-0.11, 0.11]) { leg(side, 0.2, 0.32, 0.032, shape, '#ffffff'); leg(side, -0.2, 0.32, 0.034, shape, '#ffffff'); }
  const tail = new T.CylinderGeometry(0.016, 0.008, 0.34, 5);
  tail.rotateX(-0.9); tail.translate(0, 0.46, -0.33);
  shape.add(tail);
  return shape.build();
}

function dogHead() {
  const shape = new Shape();
  const skull = new T.SphereGeometry(0.095, 10, 8);
  skull.scale(0.9, 0.95, 1.1); shape.add(skull);
  const snout = new T.SphereGeometry(0.055, 8, 6);
  snout.scale(0.8, 0.72, 1.5); snout.translate(0, -0.026, 0.115);
  shape.add(snout, '#e0d2bd');
  const nose = new T.SphereGeometry(0.022, 6, 5);
  nose.translate(0, -0.018, 0.18); shape.add(nose, '#211b16');
  for (const side of [-1, 1]) {
    const ear = new T.ConeGeometry(0.04, 0.1, 5);
    ear.rotateZ(side * 0.25); ear.translate(side * 0.062, 0.095, -0.012);
    shape.add(ear, '#b08c63');
    const eye = new T.SphereGeometry(0.014, 6, 5);
    eye.translate(side * 0.05, 0.02, 0.078); shape.add(eye, '#1d160f');
  }
  return shape.build();
}

function goatBody() {
  const shape = new Shape();
  const barrel = new T.SphereGeometry(0.2, 11, 8);
  barrel.scale(0.8, 0.92, 1.4); barrel.translate(0, 0.44, 0);
  shape.add(barrel);
  for (const side of [-0.11, 0.11]) { leg(side, 0.19, 0.36, 0.026, shape, '#ffffff'); leg(side, -0.19, 0.36, 0.028, shape, '#ffffff'); }
  const tail = new T.ConeGeometry(0.03, 0.1, 5);
  tail.rotateX(-1.6); tail.translate(0, 0.55, -0.27); shape.add(tail);
  return shape.build();
}

function goatHead() {
  const shape = new Shape();
  const skull = new T.SphereGeometry(0.085, 10, 8);
  skull.scale(0.82, 0.92, 1.35); skull.translate(0, 0, 0.05); shape.add(skull);
  for (const side of [-1, 1]) {
    const horn = new T.ConeGeometry(0.022, 0.17, 5);
    horn.rotateX(0.8); horn.rotateZ(side * 0.25); horn.translate(side * 0.045, 0.1, -0.05);
    shape.add(horn, '#a8977a');
    const ear = new T.SphereGeometry(0.045, 7, 5);
    ear.scale(0.28, 0.55, 1.1); ear.rotateZ(side * 0.5); ear.translate(side * 0.085, 0.02, -0.02);
    shape.add(ear, '#e3ddd0');
  }
  const beard = new T.ConeGeometry(0.022, 0.09, 5);
  beard.rotateX(Math.PI); beard.translate(0, -0.07, 0.02); shape.add(beard, '#efe9dc');
  return shape.build();
}

const PALETTES: Record<Kind, string[]> = {
  cow: ['#f2ece0', '#e3d6c1', '#cbb79c', '#efe6d6', '#b39a7c'],
  dog: ['#c99a63', '#b08050', '#d9b98a', '#8a6a48', '#e0cbaa'],
  goat: ['#f0ece3', '#cfc7b8', '#8d8579', '#e7dccb'],
};

/**
 * Street animals that keep to their own patch of pavement, graze, doze and
 * amble out of the way when a person walks past.
 */
export class Animals {
  group = new T.Group();
  private beasts: Beast[] = [];
  private bodies = new Map<Kind, T.InstancedMesh>();
  private heads = new Map<Kind, T.InstancedMesh>();
  private pigeons: T.InstancedMesh;
  private dummy = new T.Object3D();
  private colour = new T.Color();
  private pigeonSettle = 0;

  constructor(profile: QualityProfile, roads: number[]) {
    this.group.name = 'Navapur street life';
    const random = seededRandom(9182);
    const material = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.86 });
    const geometries: Record<Kind, [T.BufferGeometry, T.BufferGeometry]> = {
      cow: [cowBody(), cowHead()],
      dog: [dogBody(), dogHead()],
      goat: [goatBody(), goatHead()],
    };
    const counts: Record<Kind, number> = {
      cow: Math.round(profile.animals * 0.34),
      dog: Math.round(profile.animals * 0.4),
      goat: Math.round(profile.animals * 0.26),
    };
    for (const kind of ['cow', 'dog', 'goat'] as Kind[]) {
      const [body, head] = geometries[kind];
      const count = Math.max(1, counts[kind]);
      for (const [geometry, target] of [[body, this.bodies], [head, this.heads]] as const) {
        const mesh = new T.InstancedMesh(geometry, material, count);
        mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
        mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false;
        (target as Map<Kind, T.InstancedMesh>).set(kind, mesh);
        this.group.add(mesh);
      }
      for (let i = 0; i < count; i++) {
        const road = roads[Math.floor(random() * roads.length)];
        const other = roads[Math.floor(random() * roads.length)];
        const along = other + 14 + random() * 44;
        const flip = random() < 0.5;
        const x = flip ? road + (random() < 0.5 ? -11 : 11) : along;
        const z = flip ? along : road + (random() < 0.5 ? -11 : 11);
        this.beasts.push({
          kind, x, z, homeX: x, homeZ: z, targetX: x, targetZ: z,
          heading: random() * Math.PI * 2, speed: 0,
          rest: random() * 12, scale: kind === 'cow' ? 0.95 + random() * 0.16 : 0.9 + random() * 0.25,
          tint: new T.Color(PALETTES[kind][Math.floor(random() * PALETTES[kind].length)]),
          seed: random() * 100,
        });
      }
    }

    const pigeon = new Shape();
    const bird = new T.SphereGeometry(0.062, 8, 6);
    bird.scale(0.8, 0.85, 1.5); pigeon.add(bird, '#8d939c');
    const pigeonHead = new T.SphereGeometry(0.032, 7, 6);
    pigeonHead.translate(0, 0.045, 0.075); pigeon.add(pigeonHead, '#6f7783');
    const beak = new T.ConeGeometry(0.008, 0.03, 4);
    beak.rotateX(Math.PI / 2); beak.translate(0, 0.042, 0.105); pigeon.add(beak, '#c0a06a');
    this.pigeons = new T.InstancedMesh(pigeon.build(), material, profile.birds + 12);
    this.pigeons.instanceMatrix.setUsage(T.DynamicDrawUsage);
    this.pigeons.castShadow = true; this.pigeons.frustumCulled = false;
    this.group.add(this.pigeons);
  }

  update(dt: number, elapsed: number, player: { x: number; z: number }, blocked: (x: number, z: number, r?: number) => boolean) {
    const counters: Record<string, number> = {};
    for (const beast of this.beasts) {
      const key = beast.kind;
      const index = counters[key] = (counters[key] ?? 0);
      counters[key] = index + 1;

      beast.rest -= dt;
      const distanceToPlayer = Math.hypot(beast.x - player.x, beast.z - player.z);
      const startled = distanceToPlayer < (beast.kind === 'cow' ? 2.4 : 3.2);
      if (beast.rest < 0) {
        beast.rest = beast.kind === 'cow' ? 8 + Math.random() * 22 : 4 + Math.random() * 12;
        const angle = Math.random() * Math.PI * 2;
        const reach = beast.kind === 'dog' ? 9 : 5;
        beast.targetX = beast.homeX + Math.cos(angle) * reach * Math.random();
        beast.targetZ = beast.homeZ + Math.sin(angle) * reach * Math.random();
      }
      let tx = beast.targetX, tz = beast.targetZ;
      if (startled) { tx = beast.x + (beast.x - player.x) * 2; tz = beast.z + (beast.z - player.z) * 2; }
      const dx = tx - beast.x, dz = tz - beast.z;
      const distance = Math.hypot(dx, dz);
      const wants = distance > 0.6 ? (startled ? (beast.kind === 'cow' ? 1.4 : 2.6) : beast.kind === 'cow' ? 0.5 : 0.95) : 0;
      beast.speed += (wants - beast.speed) * Math.min(1, dt * 2.4);
      if (distance > 0.05) {
        const desired = Math.atan2(dx, dz);
        let diff = Math.atan2(Math.sin(desired - beast.heading), Math.cos(desired - beast.heading));
        beast.heading += Math.max(-dt * 2.4, Math.min(dt * 2.4, diff));
      }
      const nx = beast.x + Math.sin(beast.heading) * beast.speed * dt;
      const nz = beast.z + Math.cos(beast.heading) * beast.speed * dt;
      if (!blocked(nx, nz, 0.5)) { beast.x = nx; beast.z = nz; }
      else { beast.rest = 0; beast.speed = 0; }

      const grazing = beast.speed < 0.1;
      const bob = Math.sin(elapsed * (2.6 + beast.seed * 0.01) + beast.seed) * (grazing ? 0.012 : 0.03);
      const gait = Math.sin(elapsed * 7 + beast.seed) * beast.speed * 0.045;

      const body = this.bodies.get(beast.kind)!;
      const head = this.heads.get(beast.kind)!;
      this.dummy.position.set(beast.x, bob, beast.z);
      this.dummy.rotation.set(gait * 0.4, beast.heading, gait);
      this.dummy.scale.setScalar(beast.scale);
      this.dummy.updateMatrix();
      body.setMatrixAt(index, this.dummy.matrix);
      body.setColorAt(index, this.colour.copy(beast.tint));

      const neck = beast.kind === 'cow' ? { y: 1.05, z: 0.78 } : beast.kind === 'dog' ? { y: 0.46, z: 0.32 } : { y: 0.52, z: 0.3 };
      const graze = grazing ? Math.max(0, Math.sin(elapsed * 0.5 + beast.seed)) * (beast.kind === 'cow' ? 0.85 : 0.7) : 0;
      const lift = neck.y - graze * (neck.y - (beast.kind === 'cow' ? 0.28 : 0.16));
      const forward = neck.z + graze * 0.22;
      this.dummy.position.set(
        beast.x + Math.sin(beast.heading) * forward,
        lift + bob,
        beast.z + Math.cos(beast.heading) * forward,
      );
      this.dummy.rotation.set(graze * 1.1 + Math.sin(elapsed * 1.4 + beast.seed) * 0.05, beast.heading + Math.sin(elapsed * 0.6 + beast.seed) * 0.22, 0);
      this.dummy.scale.setScalar(beast.scale);
      this.dummy.updateMatrix();
      head.setMatrixAt(index, this.dummy.matrix);
      head.setColorAt(index, this.colour.copy(beast.tint));
    }
    for (const mesh of [...this.bodies.values(), ...this.heads.values()]) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    this.updatePigeons(dt, elapsed, player);
  }

  /** A flock that pecks around the square, then scatters when you walk into it. */
  private updatePigeons(dt: number, elapsed: number, player: { x: number; z: number }) {
    const count = this.pigeons.instanceMatrix.count;
    const centreX = Math.round(player.x / 72) * 72 + 24;
    const centreZ = Math.round(player.z / 72) * 72 + 24;
    const scattered = Math.hypot(player.x - centreX, player.z - centreZ) < 8;
    this.pigeonSettle = T.MathUtils.clamp(this.pigeonSettle + (scattered ? dt * 1.6 : -dt * 0.5), 0, 1);
    for (let i = 0; i < count; i++) {
      const a = i * 2.4;
      const radius = 2.2 + (i % 5) * 0.9;
      const groundX = centreX + Math.cos(a) * radius;
      const groundZ = centreZ + Math.sin(a) * radius;
      const flightAngle = elapsed * 1.5 + i * 0.7;
      const flyX = centreX + Math.cos(flightAngle) * (7 + (i % 4) * 2);
      const flyZ = centreZ + Math.sin(flightAngle) * (7 + (i % 4) * 2);
      const t = this.pigeonSettle;
      this.dummy.position.set(
        groundX + (flyX - groundX) * t,
        0.09 + t * (3.4 + Math.sin(elapsed * 2 + i) * 0.8),
        groundZ + (flyZ - groundZ) * t,
      );
      const peck = Math.sin(elapsed * 4 + i * 1.7);
      this.dummy.rotation.set(t > 0.1 ? 0.2 : Math.max(0, peck) * 0.7, t > 0.1 ? flightAngle + Math.PI / 2 : a * 3, Math.sin(elapsed * 16 + i) * t * 0.5);
      this.dummy.scale.setScalar(1);
      this.dummy.updateMatrix();
      this.pigeons.setMatrixAt(i, this.dummy.matrix);
      this.pigeons.setColorAt(i, this.colour.setHex(i % 4 === 0 ? 0x7c8490 : i % 3 === 0 ? 0x9aa0a8 : 0x6d7480));
    }
    this.pigeons.instanceMatrix.needsUpdate = true;
    if (this.pigeons.instanceColor) this.pigeons.instanceColor.needsUpdate = true;
  }
}
