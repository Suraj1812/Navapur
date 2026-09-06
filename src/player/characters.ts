import * as T from 'three';
import type { Resident, Weather } from '../core/types';
import { QUALITY_PROFILES, type QualityProfile } from '../render/quality';
import {
  ACCESSORIES, HAIR_STYLES, createPose, outfitFor, solvePose,
  type Action, type Outfit,
} from './anatomy';
import {
  CrowdMeshes, HumanFigure, createSkeleton, solveSkeleton, writePerson,
  type RootTransform,
} from './figure';

interface CrowdEntry { outfit: Outfit; phase: number; x: number; z: number; speed: number; heading: number; seed: number; }

/**
 * Every person you can see on the street. Residents nearest the player are
 * drawn with the full rig; the rest of the simulation keeps running invisibly
 * and fades in as you walk towards it.
 */
export class Crowd {
  readonly group = new T.Group();
  activeCount = 0;
  private meshes: CrowdMeshes;
  private entries = new Map<string, CrowdEntry>();
  private pose = createPose();
  private skeleton = createSkeleton();
  private root: RootTransform = { x: 0, y: 0, z: 0, heading: 0, scale: 1, headScale: 1 };
  private profile: QualityProfile;
  /** Surface height under a point, so the crowd walks on the kerb, not through it. */
  ground: (x: number, z: number) => number = () => 0;

  constructor(profile: QualityProfile = QUALITY_PROFILES.high) {
    this.profile = profile;
    this.meshes = this.createMeshes(profile);
  }

  private createMeshes(profile: QualityProfile) {
    const meshes = new CrowdMeshes({
      capacity: profile.crowd,
      detail: profile.characterDetail,
      hairStyles: HAIR_STYLES,
      accessories: ACCESSORIES,
    });
    this.group.add(meshes.group);
    return meshes;
  }

  setQuality(profile: QualityProfile) {
    if (profile.crowd === this.profile.crowd && profile.characterDetail === this.profile.characterDetail) { this.profile = profile; return; }
    this.group.remove(this.meshes.group);
    this.meshes.dispose();
    this.profile = profile;
    this.meshes = this.createMeshes(profile);
  }

  private entryFor(resident: Resident): CrowdEntry {
    let entry = this.entries.get(resident.id);
    if (!entry) {
      let seed = 0;
      for (let i = 0; i < resident.id.length; i++) seed = (seed * 31 + resident.id.charCodeAt(i)) % 100000;
      const age = resident.age === 'Child' ? 'Child' : resident.age === 'Elder' || resident.age === 'Senior' ? 'Elder' : 'Adult';
      entry = { outfit: outfitFor(seed + 1, age, undefined), phase: (seed % 100) / 15.9, x: resident.x, z: resident.z, speed: 0, heading: resident.heading, seed };
      // The simulation's own accent colour keeps a resident recognisable in dialogue.
      entry.outfit.shirt = resident.color;
      this.entries.set(resident.id, entry);
    }
    return entry;
  }

  private actionFor(resident: Resident): Action {
    const activity = resident.activity.toLowerCase();
    if (activity.includes('sitting') || activity.includes('resting') || activity.includes('eating') || activity.includes('waiting')) return 'sit';
    if (activity.includes('talking') || activity.includes('chatting') || activity.includes('meeting')) return 'talk';
    if (activity.includes('carrying') || activity.includes('delivering') || activity.includes('shopping')) return 'carry';
    return resident.moving ? 'walk' : 'idle';
  }

  update(residents: Resident[], player: { x: number; z: number }, elapsed: number, dtOrWeather: number | Weather, nextWeather?: Weather) {
    const dt = typeof dtOrWeather === 'number' ? dtOrWeather : 1 / 60;
    const weather = typeof dtOrWeather === 'string' ? dtOrWeather : nextWeather ?? 'clear';
    const radius = this.profile.crowdRadius;
    const selected: Resident[] = [];
    for (const resident of residents) {
      if (resident.activity === 'Sleeping') continue;
      const dx = resident.x - player.x, dz = resident.z - player.z;
      if (dx * dx + dz * dz > radius * radius) continue;
      selected.push(resident);
    }
    selected.sort((a, b) => (a.x - player.x) ** 2 + (a.z - player.z) ** 2 - ((b.x - player.x) ** 2 + (b.z - player.z) ** 2));
    if (selected.length > this.profile.crowd) selected.length = this.profile.crowd;
    this.activeCount = selected.length;

    const step = Math.max(dt, 0.0001);
    for (const resident of selected) {
      const entry = this.entryFor(resident);
      const moved = Math.hypot(resident.x - entry.x, resident.z - entry.z);
      const instant = Math.min(moved / step, 9);
      entry.speed += (instant - entry.speed) * Math.min(1, step * 9);
      entry.x = resident.x; entry.z = resident.z;
      // Feet stay planted: the stride advances with distance covered, not with wall time.
      const run = T.MathUtils.clamp((entry.speed - 3.4) / 3.6, 0, 1);
      entry.phase = (entry.phase + (entry.speed / (0.78 + run * 0.5)) * Math.PI * step) % (Math.PI * 2);
      const heading = resident.heading;
      entry.heading = heading;

      const action = this.actionFor(resident);
      const walk = T.MathUtils.clamp(entry.speed / 3.4, 0, 1);
      solvePose(this.pose, entry.phase, action === 'sit' ? 0 : walk, run, elapsed, entry.seed * 0.017, action);
      this.root.x = resident.x; this.root.z = resident.z;
      this.root.y = this.ground(resident.x, resident.z);
      this.root.heading = heading;
      this.root.scale = entry.outfit.scale;
      this.root.headScale = entry.outfit.headScale;
      solveSkeleton(this.skeleton, this.pose, this.root);

      const outfit = entry.outfit;
      const wetSwap = weather === 'rain' && outfit.accessory === 'none' && entry.seed % 3 === 0;
      if (wetSwap) outfit.accessory = 'umbrella';
      else if (weather !== 'rain' && outfit.accessory === 'umbrella' && entry.seed % 3 === 0) outfit.accessory = 'none';
      writePerson(this.meshes, this.skeleton, outfit, this.root);
    }
    this.meshes.flush();
  }
}

/** The player's own body, shared rig, nicer materials. */
export function createPlayer() {
  const outfit = outfitFor(4242, 'Adult');
  outfit.shirt = '#d8c8ae';
  outfit.legColor = '#334342';
  outfit.legs = 'trouser';
  outfit.hair = 'short';
  outfit.hairColor = '#201d1b';
  outfit.skin = '#c08a5f';
  outfit.accessory = 'bag';
  outfit.sash = null;
  outfit.garment = null;
  outfit.female = false;
  outfit.scale = 1;
  const figure = new HumanFigure(outfit, 2);
  return {
    group: figure.group,
    figure,
    animate: (dtOrElapsed: number, speedOrMoving: number | boolean, action: Action = 'walk', time = dtOrElapsed, turn = 0, crouch = 0) => {
      const legacyCall = typeof speedOrMoving === 'boolean';
      figure.update(legacyCall ? 1 / 60 : dtOrElapsed, legacyCall ? (speedOrMoving ? 3.6 : 0) : speedOrMoving, legacyCall ? (speedOrMoving ? 'walk' : 'idle') : action, legacyCall ? dtOrElapsed : time, turn, crouch);
    },
    setShirtColor: (color: string) => figure.setShirtColor(color),
  };
}
