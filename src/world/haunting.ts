import * as T from 'three';
import { HAIR_STYLES, createPose, outfitFor, solvePose, type Outfit } from '../player/anatomy';
import { CrowdMeshes, createSkeleton, solveSkeleton, writePerson, type RootTransform } from '../player/figure';
import type { QualityProfile } from '../render/quality';

/**
 * A figure that is only ever half there: a rim of cold light where the body
 * turns away from you, feet that dissolve into the ground, and a slow flicker
 * that makes you doubt what you saw. Additive, unlit and depth-transparent, so
 * it never quite belongs to the street it is standing in.
 */
function apparitionMaterial() {
  return new T.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPresence: { value: 0 },
      uColour: { value: new T.Color('#a9e4dc') },
      uCore: { value: new T.Color('#2c6a66') },
    },
    vertexShader: /* glsl */`
      #include <common>
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      varying float vHeight;
      void main() {
        #include <begin_vertex>
        #include <beginnormal_vertex>
        #ifdef USE_INSTANCING
          mat4 instance = instanceMatrix;
          vec4 world = modelMatrix * instance * vec4(transformed, 1.0);
          vec3 worldNormal = normalize(mat3(modelMatrix) * mat3(instance) * objectNormal);
        #else
          vec4 world = modelMatrix * vec4(transformed, 1.0);
          vec3 worldNormal = normalize(mat3(modelMatrix) * objectNormal);
        #endif
        vHeight = world.y;
        vec4 view = viewMatrix * world;
        vNormalView = normalize(mat3(viewMatrix) * worldNormal);
        vViewDir = normalize(-view.xyz);
        gl_Position = projectionMatrix * view;
      }
    `,
    fragmentShader: /* glsl */`
      uniform float uTime;
      uniform float uPresence;
      uniform vec3 uColour;
      uniform vec3 uCore;
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      varying float vHeight;
      void main() {
        // Bright where the surface turns away: a rim, not a solid body.
        float facing = clamp(dot(normalize(vNormalView), normalize(vViewDir)), 0.0, 1.0);
        float rim = pow(1.0 - facing, 2.2);
        // The lower half melts into the ground.
        float rise = smoothstep(0.0, 1.15, vHeight);
        // Never quite steady.
        float flicker = 0.78 + 0.22 * sin(uTime * 7.3 + vHeight * 5.0) * sin(uTime * 2.1);
        float alpha = (rim * 0.9 + facing * 0.14) * rise * flicker * uPresence;
        vec3 colour = mix(uCore, uColour, rim);
        gl_FragColor = vec4(colour * (0.5 + rim * 1.5), alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: T.AdditiveBlending,
    side: T.DoubleSide,
  });
}

interface Ghost {
  outfit: Outfit;
  x: number; z: number; heading: number; phase: number; seed: number;
  presence: number;      // 0 unseen, 1 fully manifest
  state: 'gone' | 'arriving' | 'watching' | 'fading';
  timer: number;
  drift: number;
  behind: boolean;       // this one prefers to appear where you are not looking
}

export interface HauntingReport {
  /** 0 to 1: how strongly the night has taken hold. Drives grade, fog and sound. */
  intensity: number;
  /** Distance to the nearest manifest apparition, or Infinity. */
  nearest: number;
  /** True on the frame an apparition first becomes visible. */
  appeared: boolean;
  /** True on the frame one vanishes because you got too close. */
  vanished: boolean;
}

/**
 * Navapur after midnight. The city keeps its routine, but something else starts
 * keeping you company: figures at the edge of the lamplight, mist across the
 * road, and the feeling that the street behind you is not empty.
 */
export class Haunting {
  group = new T.Group();
  enabled = true;
  intensity = 0;

  private meshes: CrowdMeshes;
  private material = apparitionMaterial();
  private ghosts: Ghost[] = [];
  private skeleton = createSkeleton();
  private pose = createPose();
  private root: RootTransform = { x: 0, y: 0, z: 0, heading: 0, scale: 1, headScale: 1 };
  private mist: T.Points;
  private mistPositions: Float32Array;
  private report: HauntingReport = { intensity: 0, nearest: Infinity, appeared: false, vanished: false };

  constructor(profile: QualityProfile) {
    this.group.name = 'Navapur — after midnight';
    this.group.visible = false;
    const count = Math.max(2, Math.round(profile.crowd / 16));
    this.meshes = new CrowdMeshes({
      capacity: count, detail: Math.min(1, profile.characterDetail),
      hairStyles: HAIR_STYLES, accessories: ['none'],
      material: this.material, grounded: false,
    });
    this.group.add(this.meshes.group);
    this.meshes.group.renderOrder = 4;

    for (let i = 0; i < count; i++) {
      const outfit = outfitFor(90210 + i * 37, i % 4 === 0 ? 'Child' : 'Adult');
      outfit.accessory = 'none';
      outfit.hair = i % 2 === 0 ? 'braid' : 'wrap';
      this.ghosts.push({
        outfit, x: 0, z: 0, heading: 0, phase: i * 1.7, seed: i * 13.7,
        presence: 0, state: 'gone', timer: 4 + i * 5, drift: 0.28 + Math.random() * 0.5,
        behind: i % 2 === 0,
      });
    }

    // Ground mist: thin, slow, and always just below the knee.
    const motes = profile.characterDetail > 0 ? 900 : 400;
    this.mistPositions = new Float32Array(motes * 3);
    for (let i = 0; i < motes; i++) {
      this.mistPositions[i * 3] = (Math.random() - 0.5) * 90;
      this.mistPositions[i * 3 + 1] = Math.random() * 1.1;
      this.mistPositions[i * 3 + 2] = (Math.random() - 0.5) * 90;
    }
    const geometry = new T.BufferGeometry();
    geometry.setAttribute('position', new T.BufferAttribute(this.mistPositions, 3));
    this.mist = new T.Points(geometry, new T.PointsMaterial({
      color: '#b9cfcb', size: 1.5, transparent: true, opacity: 0, depthWrite: false,
      sizeAttenuation: true, blending: T.AdditiveBlending, fog: false,
    }));
    this.mist.frustumCulled = false;
    this.group.add(this.mist);
  }

  setQuality(profile: QualityProfile) { void profile; }

  /**
   * `time` is the city clock in minutes. The haunting rises after half eleven
   * and lets go before dawn.
   */
  update(dt: number, elapsed: number, time: number, player: { x: number; z: number }, cameraYaw: number): HauntingReport {
    const window = time >= 1410 || time <= 270 ? 1 : time > 270 && time < 330 ? (330 - time) / 60 : 0;
    const target = this.enabled ? window : 0;
    this.intensity += (target - this.intensity) * Math.min(1, dt * 0.4);
    if (this.intensity < 0.02) {
      this.group.visible = false;
      this.report.intensity = 0; this.report.nearest = Infinity;
      this.report.appeared = false; this.report.vanished = false;
      return this.report;
    }
    this.group.visible = true;
    this.material.uniforms.uTime.value = elapsed;

    let nearest = Infinity;
    let appeared = false;
    let vanished = false;

    for (const ghost of this.ghosts) {
      ghost.timer -= dt;
      const distance = Math.hypot(ghost.x - player.x, ghost.z - player.z);

      if (ghost.state === 'gone') {
        if (ghost.timer <= 0) {
          // Step out of the dark, by preference just outside the lamplight and
          // just outside your field of view.
          const spread = ghost.behind ? Math.PI * 0.55 : Math.PI * 2;
          const angle = cameraYaw + Math.PI + (Math.random() - 0.5) * spread;
          const range = 16 + Math.random() * 22;
          ghost.x = player.x + Math.sin(angle) * range;
          ghost.z = player.z + Math.cos(angle) * range;
          ghost.heading = Math.atan2(player.x - ghost.x, player.z - ghost.z);
          ghost.state = 'arriving';
          ghost.timer = 7 + Math.random() * 11;
          appeared = true;
        }
      } else if (ghost.state === 'arriving') {
        ghost.presence = Math.min(1, ghost.presence + dt * 0.45);
        if (ghost.presence >= 1) ghost.state = 'watching';
      } else if (ghost.state === 'watching') {
        if (ghost.timer <= 0 || distance < 5.5) {
          ghost.state = 'fading';
          if (distance < 5.5) vanished = true;
          ghost.timer = 0;
        }
      } else {
        ghost.presence -= dt * (distance < 5.5 ? 2.4 : 0.55);
        if (ghost.presence <= 0) {
          ghost.presence = 0;
          ghost.state = 'gone';
          ghost.timer = 6 + Math.random() * 22;
        }
      }

      if (ghost.presence <= 0.001) continue;

      // They never hurry. They simply keep being closer than they were.
      const toward = Math.atan2(player.x - ghost.x, player.z - ghost.z);
      const turn = Math.atan2(Math.sin(toward - ghost.heading), Math.cos(toward - ghost.heading));
      ghost.heading += Math.max(-dt * 0.9, Math.min(dt * 0.9, turn));
      if (distance > 6) {
        ghost.x += Math.sin(ghost.heading) * ghost.drift * dt;
        ghost.z += Math.cos(ghost.heading) * ghost.drift * dt;
      }
      ghost.phase += dt * 0.7;
      nearest = Math.min(nearest, distance);

      solvePose(this.pose, ghost.phase, 0.12, 0, elapsed, ghost.seed, 'idle');
      this.root.x = ghost.x; this.root.z = ghost.z;
      // They hover a hand's width off the ground.
      this.root.y = 0.09 + Math.sin(elapsed * 0.9 + ghost.seed) * 0.05;
      this.root.heading = ghost.heading;
      this.root.scale = ghost.outfit.scale * 1.02;
      this.root.headScale = ghost.outfit.headScale;
      solveSkeleton(this.skeleton, this.pose, this.root);
      writePerson(this.meshes, this.skeleton, ghost.outfit);
    }
    this.meshes.flush();

    // One presence uniform for the whole set: the strongest ghost wins.
    const strongest = this.ghosts.reduce((best, ghost) => Math.max(best, ghost.presence), 0);
    this.material.uniforms.uPresence.value = strongest * this.intensity;

    this.updateMist(dt, player);

    this.report.intensity = this.intensity;
    this.report.nearest = nearest;
    this.report.appeared = appeared;
    this.report.vanished = vanished;
    return this.report;
  }

  private updateMist(dt: number, player: { x: number; z: number }) {
    this.mist.position.set(player.x, 0, player.z);
    const count = this.mistPositions.length / 3;
    for (let i = 0; i < count; i++) {
      this.mistPositions[i * 3] += dt * 0.35;
      this.mistPositions[i * 3 + 2] += dt * 0.13;
      if (this.mistPositions[i * 3] > 45) this.mistPositions[i * 3] = -45;
      if (this.mistPositions[i * 3 + 2] > 45) this.mistPositions[i * 3 + 2] = -45;
    }
    this.mist.geometry.attributes.position.needsUpdate = true;
    (this.mist.material as T.PointsMaterial).opacity = this.intensity * 0.1;
  }

  dispose() {
    this.meshes.dispose();
    this.material.dispose();
    this.mist.geometry.dispose();
    (this.mist.material as T.Material).dispose();
  }
}
