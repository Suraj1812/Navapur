import * as T from 'three';
import { LIGHT_MATERIAL, vehicleModel, type VehicleKind } from './models';
import { clamp, distance } from '../core/geometry';
import type { Vec2, PlayerState, Weather } from '../core/types';
import type { QualityProfile } from '../render/quality';

export interface Vehicle extends Vec2 {
  id: string; kind: VehicleKind; group: T.Group; heading: number; speed: number;
  fuel: number; damage: number; route: Vec2[]; target: number; parked: boolean;
  length: number; headlights: boolean; lean: number; pitch: number; active: boolean;
}

const ROADS = [-144, -72, 0, 72, 144];
const FLEET: VehicleKind[] = ['auto', 'car', 'motorcycle', 'scooter', 'car', 'bus', 'auto', 'van', 'truck', 'ambulance', 'bicycle', 'rickshaw', 'tempo', 'car', 'auto', 'scooter'];
const TOP_SPEED: Partial<Record<VehicleKind, number>> = { bus: 6.4, truck: 6.0, auto: 7.4, bicycle: 3.6, rickshaw: 3.2, tempo: 7.0 };
const PLAYER_TOP: Partial<Record<VehicleKind, number>> = { auto: 16, scooter: 19, bicycle: 8, rickshaw: 7, bus: 21, truck: 20 };

/**
 * City traffic that obeys the same signal phase the street lights show, keeps a
 * gap to the vehicle ahead, yields to anyone crossing, and lets the player take
 * the wheel of anything standing still.
 */
export class Traffic {
  group = new T.Group();
  vehicles: Vehicle[] = [];
  controlled: Vehicle | null = null;
  signalPhase = 0;
  private lightLevel = 0;

  constructor(profile: QualityProfile) {
    const moving = 44;
    for (let i = 0; i < moving; i++) {
      const ax = i % 4, az = Math.floor(i / 4) % 4;
      const x = ROADS[ax], z = ROADS[az];
      const x1 = ROADS[Math.min(4, ax + 1 + (i % 3 === 0 ? 1 : 0))], z1 = ROADS[Math.min(4, az + 1)];
      const route = [{ x: x - 2.8, z: z - 2.8 }, { x: x1 + 2.8, z: z - 2.8 }, { x: x1 + 2.8, z: z1 + 2.8 }, { x: x - 2.8, z: z1 + 2.8 }];
      const seg = i % 4;
      const p = route[seg]; const q = route[(seg + 1) % 4];
      const frac = 0.12 + (i % 6) * 0.14;
      this.add(FLEET[i % FLEET.length], { x: p.x + (q.x - p.x) * frac, z: p.z + (q.z - p.z) * frac }, route, (seg + 1) % 4, false, i);
    }
    this.add('auto', { x: 4.7, z: 26 }, [], 0, true, moving);
    this.add('car', { x: -5, z: 43 }, [], 0, true, moving + 1);
    this.add('scooter', { x: 8.6, z: 39 }, [], 0, true, moving + 2);
    this.add('bicycle', { x: -8.4, z: 30 }, [], 0, true, moving + 3);
    this.setQuality(profile);
  }

  private add(kind: VehicleKind, p: Vec2, route: Vec2[], target: number, parked: boolean, i: number) {
    const palette = ['#d4cbb8', '#a6b4b0', '#975b43', '#555f60', '#d8d9cf', '#7c8f96', '#c2a06a', '#8f6b78'];
    const model = vehicleModel(kind, palette[i % palette.length]);
    const v: Vehicle = {
      id: 'vehicle-' + i, kind, group: model.group, x: p.x, z: p.z, route, target, parked,
      length: model.length, heading: Math.PI, speed: 0, fuel: 100, damage: 0,
      headlights: false, lean: 0, pitch: 0, active: true,
    };
    v.group.position.set(p.x, 0, p.z);
    v.group.traverse(object => { if ((object as T.Mesh).isMesh && (object as T.Mesh).material !== LIGHT_MATERIAL) { object.castShadow = true; object.receiveShadow = true; } });
    this.group.add(v.group);
    this.vehicles.push(v);
  }

  /** Thins moving traffic on weaker devices without changing the saved fleet. */
  setQuality(profile: QualityProfile) {
    let budget = profile.vehicles;
    for (const vehicle of this.vehicles) {
      const keep = vehicle.parked || budget-- > 0 || vehicle === this.controlled;
      vehicle.active = keep;
      vehicle.group.visible = keep;
    }
    LIGHT_MATERIAL.visible = profile.vehicleLights;
  }

  /** Headlights and tail lamps come up with the evening. */
  setNight(amount: number) {
    this.lightLevel += (amount - this.lightLevel) * 0.08;
    LIGHT_MATERIAL.opacity = Math.min(1, this.lightLevel * 1.6);
  }

  nearest(p: Vec2) {
    return this.vehicles.filter(v => v.active && distance(v, p) < 4.6 && Math.abs(v.speed) < 2).sort((a, b) => distance(a, p) - distance(b, p))[0];
  }

  enter(v: Vehicle, p: PlayerState) {
    this.controlled = v; v.parked = true; v.speed = 0; v.active = true; v.group.visible = true;
    p.x = v.x; p.z = v.z;
    if (!p.ownedVehicles.includes(v.id)) p.ownedVehicles.push(v.id);
  }

  exit(p: PlayerState, blocked: (x: number, z: number, r?: number) => boolean) {
    if (!this.controlled) return false;
    const v = this.controlled;
    for (const side of [1, -1]) for (const offset of [2.2, 3.5, 5]) {
      const x = v.x + Math.cos(v.heading) * offset * side;
      const z = v.z - Math.sin(v.heading) * offset * side;
      if (!blocked(x, z)) { p.x = x; p.z = z; v.speed = 0; this.controlled = null; return true; }
    }
    return false;
  }

  update(dt: number, t: number, weather: Weather, player: PlayerState, keys: Set<string>, enabled: boolean,
    blocked: (x: number, z: number, r?: number) => boolean, onCollision: (x: number, z: number) => void) {
    this.signalPhase = Math.floor(t / 13) % 2;
    const grip = weather === 'rain' ? 0.78 : 1;

    for (const v of this.vehicles) {
      if (!v.active && v !== this.controlled) continue;

      if (v === this.controlled) {
        const acceleration = v.kind === 'bus' || v.kind === 'truck' ? 4 : v.kind === 'auto' ? 6 : v.kind === 'bicycle' || v.kind === 'rickshaw' ? 3.4 : 8;
        const forward = enabled ? Number(keys.has('KeyW') || keys.has('ArrowUp')) - Number(keys.has('KeyS') || keys.has('ArrowDown')) : 0;
        const turn = enabled ? Number(keys.has('KeyA') || keys.has('ArrowLeft')) - Number(keys.has('KeyD') || keys.has('ArrowRight')) : 0;
        const max = PLAYER_TOP[v.kind] ?? 27;
        const before = v.speed;
        if (v.fuel > 0 || v.kind === 'bicycle' || v.kind === 'rickshaw') v.speed += forward * acceleration * dt;
        v.speed *= Math.exp(-dt * (forward ? 0.13 : 1.05));
        if (keys.has('Space')) v.speed *= Math.exp(-dt * 5);
        v.speed = clamp(v.speed, -6, max * grip);
        v.heading += turn * dt * 1.45 * clamp(v.speed / 5, -1, 1);
        v.lean += (-turn * clamp(v.speed / max, 0, 1) * 0.11 - v.lean) * Math.min(1, dt * 6);
        v.pitch += ((v.speed - before) / Math.max(dt, 0.001) * -0.006 - v.pitch) * Math.min(1, dt * 5);
        const x = v.x + Math.sin(v.heading) * v.speed * dt;
        const z = v.z + Math.cos(v.heading) * v.speed * dt;
        const obstacle = this.vehicles.some(o => o !== v && o.active && distance(o, { x, z }) < (o.length + v.length) * 0.32);
        if (blocked(x, z, 0.8) || obstacle) {
          if (Math.abs(v.speed) > 3) {
            v.damage = clamp(v.damage + Math.abs(v.speed) * 0.5, 0, 100);
            player.health = clamp(player.health - Math.abs(v.speed) * 0.13, 0, 100);
            onCollision(v.x, v.z);
          }
          v.speed *= -0.22;
        } else { v.x = x; v.z = z; }
        if (v.kind !== 'bicycle' && v.kind !== 'rickshaw') v.fuel = Math.max(0, v.fuel - Math.abs(v.speed) * dt * 0.007);
        player.x = v.x; player.z = v.z;
      } else if (!v.parked) {
        const q = v.route[v.target];
        const dist = distance(v, q);
        if (dist < 1.5) v.target = (v.target + 1) % v.route.length;
        const desired = Math.atan2(q.x - v.x, q.z - v.z);
        const diff = Math.atan2(Math.sin(desired - v.heading), Math.cos(desired - v.heading));
        const steer = clamp(diff, -dt * 3.5, dt * 3.5);
        v.heading += steer;
        let speed = (TOP_SPEED[v.kind] ?? 9.8) * grip;
        const horizontal = Math.abs(Math.sin(v.heading)) > 0.7;
        if (dist < 12 && dist > 4.2 && Number(horizontal) !== this.signalPhase) speed = 0;
        for (const o of this.vehicles) {
          if (o === v || !o.active) continue;
          const dx = o.x - v.x, dz = o.z - v.z;
          const ahead = dx * Math.sin(v.heading) + dz * Math.cos(v.heading);
          const side = Math.abs(dx * Math.cos(v.heading) - dz * Math.sin(v.heading));
          if (ahead > 0 && ahead < (v.length + o.length) / 2 + 3.6 && side < 1.65) speed = 0;
        }
        const pdx = player.x - v.x, pdz = player.z - v.z;
        if (!this.controlled && pdx * Math.sin(v.heading) + pdz * Math.cos(v.heading) > 0 && distance(v, player) < 7
          && Math.abs(pdx * Math.cos(v.heading) - pdz * Math.sin(v.heading)) < 2) speed = 0;
        v.speed += (speed - v.speed) * Math.min(1, dt * (speed === 0 ? 7 : 1.5));
        v.x += Math.sin(v.heading) * v.speed * dt;
        v.z += Math.cos(v.heading) * v.speed * dt;
        v.lean += (-steer / Math.max(dt, 0.001) * 0.04 * clamp(v.speed / 9, 0, 1) - v.lean) * Math.min(1, dt * 5);
      }

      v.group.position.set(v.x, 0, v.z);
      v.group.rotation.set(v.pitch, v.heading, v.lean);
      // Two-wheelers lean into the corner properly.
      if (v.kind === 'motorcycle' || v.kind === 'scooter' || v.kind === 'bicycle') v.group.rotation.z = v.lean * 2.4;
    }
  }

  serialize() { return this.vehicles.map(({ id, x, z, heading, fuel, damage, parked, target }) => ({ id, x, z, heading, fuel, damage, parked, target })); }

  restore(data: ReturnType<Traffic['serialize']>) {
    for (const saved of data) {
      const v = this.vehicles.find(v => v.id === saved.id);
      if (v) Object.assign(v, saved, { speed: 0, lean: 0, pitch: 0 });
    }
    this.controlled = null;
  }
}
