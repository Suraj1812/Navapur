import * as T from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import type { CityEvent, Weather } from './core/types';
import { QUALITY_PROFILES, type QualityProfile } from './render/quality';

const DAY_HORIZON = new T.Color('#d9cbb2');
const DUSK_HORIZON = new T.Color('#e0a172');
const NIGHT_HORIZON = new T.Color('#16202e');
const RAIN_HORIZON = new T.Color('#8e9a9d');

/**
 * Sky, sun, moon, weather and the small living details that sell a place:
 * kite-height birds, drifting dust, monsoon splashes and distant lightning.
 */
export class Environment {
  sun = new T.DirectionalLight('#ffe3b5', 3.2);
  moon = new T.DirectionalLight('#93a9d6', 0);
  hemisphere = new T.HemisphereLight('#bfd6d7', '#8c7863', 2);
  bounce = new T.DirectionalLight('#c9a97e', 0.35);
  sky = new Sky();
  daylight = 1;
  nightAmount = 0;

  private rain!: T.Points;
  private rainPositions!: Float32Array;
  private rainSpeeds!: Float32Array;
  private splash!: T.InstancedMesh;
  private dust!: T.Points;
  private stars!: T.Points;
  private moonMesh!: T.Mesh;
  private clouds!: T.InstancedMesh;
  private birds!: T.InstancedMesh;
  private fire: T.InstancedMesh;
  private smoke: T.InstancedMesh;
  private fireLight = new T.PointLight('#ffa03d', 0, 34, 2);
  private lightning = new T.PointLight('#cfe0ff', 0, 900, 1.4);
  private lightningTimer = 6;
  private dummy = new T.Object3D();
  private lastLighting = -1;
  private sunTarget = new T.Object3D();

  constructor(private scene: T.Scene, private profile: QualityProfile = QUALITY_PROFILES.high) {
    scene.add(this.sun, this.moon, this.hemisphere, this.bounce, this.sunTarget, this.fireLight, this.lightning);
    this.sun.target = this.sunTarget;
    this.moon.target = this.sunTarget;
    this.configureShadow();

    this.sky.scale.setScalar(6000);
    const uniforms = this.sky.material.uniforms;
    uniforms.turbidity.value = 4.4;
    uniforms.rayleigh.value = 1.9;
    uniforms.mieCoefficient.value = 0.006;
    uniforms.mieDirectionalG.value = 0.86;
    scene.add(this.sky);
    scene.fog = new T.FogExp2('#c4bdad', 0.0026);

    this.buildRain();
    this.buildSkyProps();

    this.fire = new T.InstancedMesh(
      new T.IcosahedronGeometry(1, 1),
      new T.MeshBasicMaterial({ color: '#ffb058', transparent: true, opacity: 0.9, depthWrite: false, blending: T.AdditiveBlending }),
      96,
    );
    this.fire.frustumCulled = false;
    this.smoke = new T.InstancedMesh(
      new T.IcosahedronGeometry(1, 1),
      new T.MeshStandardMaterial({ color: '#5d5952', transparent: true, opacity: 0.24, depthWrite: false, roughness: 1 }),
      48,
    );
    this.smoke.frustumCulled = false;
    scene.add(this.fire, this.smoke);
  }

  private configureShadow() {
    const profile = this.profile;
    const size = profile.shadowMapSize;
    const reach = profile.shadowDistance;
    this.sun.castShadow = profile.shadows;
    this.sun.shadow.mapSize.set(size, size);
    const camera = this.sun.shadow.camera;
    camera.left = -reach; camera.right = reach; camera.top = reach; camera.bottom = -reach;
    camera.near = 1; camera.far = reach * 4.2;
    camera.updateProjectionMatrix();
    this.sun.shadow.bias = -0.00022;
    this.sun.shadow.normalBias = 0.032;
    this.sun.shadow.radius = profile.softShadows ? 3.4 : 1;
  }

  private buildRain() {
    const count = this.profile.rainDrops;
    this.rainPositions = new Float32Array(count * 3);
    this.rainSpeeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      this.rainPositions[i * 3] = (Math.random() - 0.5) * 120;
      this.rainPositions[i * 3 + 1] = Math.random() * 46;
      this.rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 120;
      this.rainSpeeds[i] = 18 + Math.random() * 14;
    }
    const geometry = new T.BufferGeometry();
    geometry.setAttribute('position', new T.BufferAttribute(this.rainPositions, 3));
    this.rain = new T.Points(geometry, new T.PointsMaterial({
      color: '#e2ecef', size: 0.11, transparent: true, opacity: 0.55, depthWrite: false, sizeAttenuation: true,
    }));
    this.rain.frustumCulled = false;
    this.rain.visible = false;
    this.scene.add(this.rain);

    const ring = new T.RingGeometry(0.05, 0.3, 10);
    ring.rotateX(-Math.PI / 2);
    this.splash = new T.InstancedMesh(ring, new T.MeshBasicMaterial({ color: '#dbe7ea', transparent: true, opacity: 0.3, depthWrite: false }), 64);
    this.splash.frustumCulled = false;
    this.splash.visible = false;
    this.scene.add(this.splash);
  }

  private buildSkyProps() {
    const profile = this.profile;
    // Stars
    const starCount = 900;
    const stars = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 0.92);
      const radius = 1800;
      stars[i * 3] = Math.sin(phi) * Math.cos(theta) * radius;
      stars[i * 3 + 1] = Math.cos(phi) * radius;
      stars[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * radius;
    }
    const starGeometry = new T.BufferGeometry();
    starGeometry.setAttribute('position', new T.BufferAttribute(stars, 3));
    this.stars = new T.Points(starGeometry, new T.PointsMaterial({ color: '#e8eefc', size: 5.5, sizeAttenuation: true, transparent: true, opacity: 0, depthWrite: false, fog: false }));
    this.stars.frustumCulled = false;
    this.scene.add(this.stars);

    this.moonMesh = new T.Mesh(
      new T.SphereGeometry(38, 20, 16),
      new T.MeshBasicMaterial({ color: '#eef1f6', fog: false, transparent: true, opacity: 0 }),
    );
    this.moonMesh.frustumCulled = false;
    this.scene.add(this.moonMesh);

    // Soft cumulus decks drifting far above the city.
    const cloudCount = profile.distantCity ? 26 : 10;
    this.clouds = new T.InstancedMesh(
      new T.IcosahedronGeometry(1, 2),
      new T.MeshStandardMaterial({ color: '#ffffff', roughness: 1, transparent: true, opacity: 0.55, depthWrite: false, fog: false }),
      cloudCount * 5,
    );
    this.clouds.frustumCulled = false;
    for (let i = 0; i < cloudCount; i++) {
      const cx = (Math.random() - 0.5) * 1500;
      const cz = (Math.random() - 0.5) * 1500;
      const cy = 210 + Math.random() * 130;
      const scale = 30 + Math.random() * 46;
      for (let puff = 0; puff < 5; puff++) {
        this.dummy.position.set(cx + (puff - 2) * scale * 0.62, cy + Math.sin(puff) * scale * 0.16, cz + Math.cos(puff * 2.1) * scale * 0.4);
        this.dummy.scale.set(scale * (0.75 + Math.random() * 0.4), scale * 0.42, scale * (0.6 + Math.random() * 0.3));
        this.dummy.rotation.set(0, Math.random() * 3, 0);
        this.dummy.updateMatrix();
        this.clouds.setMatrixAt(i * 5 + puff, this.dummy.matrix);
      }
    }
    this.clouds.instanceMatrix.needsUpdate = true;
    this.scene.add(this.clouds);

    const wing = new T.BufferGeometry();
    wing.setAttribute('position', new T.Float32BufferAttribute([0, 0, 0.34, -0.42, 0.1, -0.2, 0, 0, 0.34, 0.42, 0.1, -0.2, 0, 0, 0.34, 0, 0, -0.3], 3));
    wing.computeVertexNormals();
    this.birds = new T.InstancedMesh(wing, new T.MeshBasicMaterial({ color: '#3d423b', side: T.DoubleSide }), Math.max(1, profile.birds));
    this.birds.frustumCulled = false;
    this.scene.add(this.birds);

    // Fine dust catching the low sun over the bazaar.
    const motes = 420;
    const dust = new Float32Array(motes * 3);
    for (let i = 0; i < motes; i++) {
      dust[i * 3] = (Math.random() - 0.5) * 70;
      dust[i * 3 + 1] = Math.random() * 12;
      dust[i * 3 + 2] = (Math.random() - 0.5) * 70;
    }
    const dustGeometry = new T.BufferGeometry();
    dustGeometry.setAttribute('position', new T.BufferAttribute(dust, 3));
    this.dust = new T.Points(dustGeometry, new T.PointsMaterial({ color: '#ffe6c0', size: 0.055, transparent: true, opacity: 0, depthWrite: false }));
    this.dust.frustumCulled = false;
    this.scene.add(this.dust);
  }

  setQuality(profile: QualityProfile) {
    this.profile = profile;
    this.configureShadow();
    this.birds.count = Math.min(this.birds.instanceMatrix.count, profile.birds);
  }

  update(dt: number, elapsed: number, time: number, weather: Weather, player: { x: number; z: number }, events: CityEvent[]) {
    const angle = (time / 1440) * Math.PI * 2 - Math.PI / 2;
    const elevation = Math.sin(angle);
    const daylight = T.MathUtils.clamp((elevation + 0.14) * 2.1, 0, 1);
    this.daylight = daylight;
    this.nightAmount = 1 - T.MathUtils.clamp((elevation + 0.05) * 3.4, 0, 1);
    const golden = T.MathUtils.clamp(1 - Math.abs(elevation - 0.16) * 5, 0, 1);

    if (Math.abs(time - this.lastLighting) > 0.25 || this.lastLighting < 0) {
      this.lastLighting = time;
      const sunDirection = new T.Vector3(-0.62, elevation, 0.32).normalize();
      this.sky.material.uniforms.sunPosition.value.copy(sunDirection);
      const weatherScale = weather === 'clear' ? 1 : weather === 'cloudy' ? 0.5 : 0.24;
      this.sun.intensity = daylight * 3.5 * weatherScale + 0.02;
      this.sun.color.set(golden > 0.4 ? '#ffbe7d' : daylight > 0.5 ? '#fff0d4' : '#9cadd6');
      this.bounce.intensity = daylight * 0.45 * weatherScale;
      this.bounce.color.set('#d8b183');
      this.bounce.position.set(-40, 12, -30);
      this.moon.intensity = this.nightAmount * 0.55;
      this.hemisphere.intensity = 0.14 + daylight * (weather === 'rain' ? 0.95 : 1.55) + this.nightAmount * 0.1;
      this.hemisphere.color.set(weather === 'rain' ? '#93a3a7' : daylight > 0.35 ? '#bcd7e0' : '#41506b');
      this.hemisphere.groundColor.set(weather === 'rain' ? '#5c625f' : '#7d6b56');
      this.sky.material.uniforms.turbidity.value = weather === 'rain' ? 16 : weather === 'cloudy' ? 9.5 : 3.6 + golden * 5;
      this.sky.material.uniforms.rayleigh.value = daylight < 0.12 ? 0.14 : 1.4 + golden * 1.9;
      this.sky.material.uniforms.mieCoefficient.value = weather === 'rain' ? 0.012 : 0.005 + golden * 0.008;

      const fog = this.scene.fog as T.FogExp2;
      const horizon = weather === 'rain' ? RAIN_HORIZON : golden > 0.35 ? DUSK_HORIZON : daylight < 0.2 ? NIGHT_HORIZON : DAY_HORIZON;
      fog.color.copy(horizon).lerp(NIGHT_HORIZON, this.nightAmount * 0.72);
      fog.density = (weather === 'rain' ? 0.0085 : weather === 'cloudy' ? 0.0038 : 0.0026) + this.nightAmount * 0.0022;
      this.scene.environmentIntensity = this.profile.environmentIntensity * (0.35 + daylight * 0.85);

        (this.stars.material as T.PointsMaterial).opacity = this.nightAmount * (weather === 'clear' ? 0.85 : 0.15);
      (this.moonMesh.material as T.MeshBasicMaterial).opacity = this.nightAmount * (weather === 'rain' ? 0.15 : 0.9);
      (this.clouds.material as T.MeshStandardMaterial).opacity = weather === 'rain' ? 0.82 : weather === 'cloudy' ? 0.7 : 0.42;
      (this.clouds.material as T.MeshStandardMaterial).color.set(weather === 'rain' ? '#6f757a' : daylight < 0.25 ? '#3b4453' : golden > 0.4 ? '#ffd9b4' : '#fbfaf6');
    }

    // The shadow frustum follows the player so the map stays crisp everywhere.
    const reach = this.profile.shadowDistance;
    this.sun.position.set(player.x - reach * 0.85, reach * 1.25 + Math.max(0, elevation) * reach, player.z + reach * 0.7);
    this.moon.position.set(player.x + reach, reach * 1.3, player.z - reach * 0.6);
    this.sunTarget.position.set(player.x, 0, player.z);
    this.sky.position.set(player.x, 0, player.z);
    this.moonMesh.position.set(player.x + 780, 320 + Math.sin(angle + Math.PI) * 160, player.z - 620);
    this.stars.position.set(player.x, 0, player.z);
    this.clouds.position.x = (elapsed * 0.9) % 400;

    this.updateRain(dt, elapsed, weather, player);
    this.updateBirds(elapsed, daylight, weather, player);

    this.dust.position.set(player.x, 0, player.z);
    (this.dust.material as T.PointsMaterial).opacity = weather === 'clear' ? golden * 0.5 + daylight * 0.12 : 0;
    this.dust.rotation.y = elapsed * 0.012;

    this.updateFire(elapsed, events);

    // Monsoon lightning, sparingly.
    if (weather === 'rain') {
      this.lightningTimer -= dt;
      if (this.lightningTimer < 0) {
        this.lightningTimer = 7 + Math.random() * 16;
        this.lightning.position.set(player.x + (Math.random() - 0.5) * 260, 190, player.z + (Math.random() - 0.5) * 260);
        this.lightning.intensity = 26000;
      }
      this.lightning.intensity *= Math.exp(-dt * 11);
    } else this.lightning.intensity = 0;
  }

  private updateRain(dt: number, elapsed: number, weather: Weather, player: { x: number; z: number }) {
    const raining = weather === 'rain';
    this.rain.visible = raining;
    this.splash.visible = raining && this.profile.wetSurfaces;
    if (!raining) return;
    this.rain.position.set(player.x, 0, player.z);
    const count = this.rainSpeeds.length;
    for (let i = 0; i < count; i++) {
      this.rainPositions[i * 3 + 1] -= dt * this.rainSpeeds[i];
      this.rainPositions[i * 3] += dt * 2.6;
      if (this.rainPositions[i * 3 + 1] < 0) this.rainPositions[i * 3 + 1] = 44 + Math.random() * 4;
      if (this.rainPositions[i * 3] > 60) this.rainPositions[i * 3] = -60;
    }
    this.rain.geometry.attributes.position.needsUpdate = true;
    if (!this.splash.visible) return;
    for (let i = 0; i < this.splash.count; i++) {
      const phase = (elapsed * 2.4 + i * 0.61) % 1;
      const seed = Math.sin(i * 91.7) * 43758.5453;
      const ox = ((seed - Math.floor(seed)) - 0.5) * 26;
      const oz = ((Math.sin(i * 31.3) * 0.5 + 0.5) - 0.5) * 26;
      this.dummy.position.set(player.x + ox, 0.05, player.z + oz);
      this.dummy.scale.setScalar(0.2 + phase * 1.3);
      this.dummy.updateMatrix();
      this.splash.setMatrixAt(i, this.dummy.matrix);
    }
    (this.splash.material as T.MeshBasicMaterial).opacity = 0.26;
    this.splash.instanceMatrix.needsUpdate = true;
  }

  private updateBirds(elapsed: number, daylight: number, weather: Weather, player: { x: number; z: number }) {
    const count = this.birds.count || this.profile.birds;
    this.birds.visible = daylight > 0.12 && weather !== 'rain';
    if (!this.birds.visible) return;
    for (let i = 0; i < count; i++) {
      const lane = Math.floor(i / 6);
      const a = elapsed * (0.09 + lane * 0.015) + i * 0.9;
      const radius = 48 + lane * 26;
      const x = player.x + Math.sin(a) * radius;
      const z = player.z + Math.cos(a) * radius;
      const y = 22 + lane * 7 + Math.sin(elapsed * 0.7 + i) * 2.4;
      this.dummy.position.set(x, y, z);
      this.dummy.rotation.set(0, a + Math.PI / 2, Math.sin(elapsed * 9 + i) * 0.55);
      this.dummy.scale.setScalar(1.1);
      this.dummy.updateMatrix();
      this.birds.setMatrixAt(i, this.dummy.matrix);
    }
    this.birds.instanceMatrix.needsUpdate = true;
  }

  private updateFire(elapsed: number, events: CityEvent[]) {
    const active = events.filter(event => !event.resolved && event.type === 'fire').slice(0, 3);
    let flame = 0; let puff = 0;
    for (const event of active) {
      for (let i = 0; i < 28 && flame < this.fire.count + 28; i++) {
        const phase = (elapsed * 0.75 + i * 0.137) % 1;
        this.dummy.position.set(
          event.x + Math.sin(i * 2.4 + elapsed) * 1.5 * (1 - phase),
          0.3 + phase * 4.4,
          event.z + Math.cos(i * 1.6 + elapsed * 0.6) * 1.5 * (1 - phase),
        );
        const size = (1 - phase) * 0.62 + 0.08;
        this.dummy.scale.set(size, size * 1.8, size);
        this.dummy.rotation.set(0, i, 0);
        this.dummy.updateMatrix();
        this.fire.setMatrixAt(flame++, this.dummy.matrix);
      }
      for (let i = 0; i < 14; i++) {
        const phase = (elapsed * 0.13 + i / 14) % 1;
        this.dummy.position.set(event.x + phase * 6, 2.2 + phase * 13, event.z + Math.sin(i) * phase * 2.4);
        this.dummy.scale.setScalar(0.7 + phase * 2.4);
        this.dummy.rotation.set(phase * 2, i, 0);
        this.dummy.updateMatrix();
        this.smoke.setMatrixAt(puff++, this.dummy.matrix);
      }
    }
    this.fire.count = flame; this.smoke.count = puff;
    this.fire.instanceMatrix.needsUpdate = true;
    this.smoke.instanceMatrix.needsUpdate = true;
    if (active[0]) {
      this.fireLight.position.set(active[0].x, 2.4, active[0].z);
      this.fireLight.intensity = 60 + Math.sin(elapsed * 9) * 12;
    } else this.fireLight.intensity = 0;
  }
}
