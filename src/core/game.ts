import * as T from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createWorld } from '../world/city';
import { Simulation } from '../simulation/simulation';
import { PlayerController } from '../player/controller';
import { Crowd } from '../player/characters';
import { Animals } from '../world/animals';
import { Traffic } from '../vehicles/traffic';
import { Environment } from '../world-effects';
import { Soundscape } from '../audio/soundscape';
import { GameUI } from '../ui/ui';
import { Interactions, escapeHtml } from './interactions';
import { distance } from './geometry';
import { PostFX } from '../render/postfx';
import {
  AdaptiveResolution, QUALITY_PROFILES, QualityWatchdog, applyProfile, detectQuality,
  type QualityProfile, type QualityTier,
} from '../render/quality';
import type { Place, Resident } from './types';
import { SHOP_CATALOG } from '../data/economy';

const SAVE_KEY = 'navapur.save.v1';
const QUALITY_KEY = 'navapur.quality';

export class Game {
  scene = new T.Scene();
  camera = new T.PerspectiveCamera(58, innerWidth / innerHeight, 0.15, 4000);
  renderer: T.WebGLRenderer;
  world: ReturnType<typeof createWorld>;
  sim: Simulation;
  traffic: Traffic;
  crowd: Crowd;
  animals: Animals;
  audio = new Soundscape();
  environment: Environment;
  player: PlayerController;
  ui: GameUI;
  interactions: Interactions;
  postfx: PostFX;

  started = false;
  debug = false;
  timeScale = 1;
  quality: QualityTier;
  autoQuality: boolean;
  waypoint: { x: number; z: number; name: string } | null = null;
  progress = { bought: false, ate: false, talked: false, drove: false };
  elapsed = 0;

  private profile: QualityProfile;
  private adaptive = new AdaptiveResolution();
  private watchdog = new QualityWatchdog();
  private last = 0;
  private fps = 60;
  private uiClock = 0;
  private autoSave = 0;
  private lastCollision = -100;
  private nearby: { type: 'shop' | 'person' | 'place' | 'vehicle'; label: string; target: Place | Resident | null } | null = null;
  private marker: T.Group;
  private headlights: T.SpotLight[] = [];
  private navLines: T.LineSegments;
  private nameLayer: HTMLDivElement;
  private notices = 0;
  private booted = false;
  private shadowTick = 0;

  /** Start-up timings, printed to the console with `?perf=1`. */
  readonly bootTiming: Array<[string, number]> = [];
  private stage<V>(label: string, build: () => V): V {
    const started = performance.now();
    const value = build();
    this.bootTiming.push([label, Math.round(performance.now() - started)]);
    return value;
  }

  constructor() {
    const bootStarted = performance.now();
    const requested = this.requestedQuality();
    this.quality = requested ?? this.readSavedQuality() ?? detectQuality();
    this.autoQuality = !requested && this.readSavedQuality() === null;
    this.profile = QUALITY_PROFILES[this.quality];
    this.world = this.stage('city', () => createWorld(this.profile));
    this.traffic = this.stage('traffic', () => new Traffic(this.profile));
    this.sim = this.stage('simulation', () => new Simulation(this.world.places, this.world.roadCoordinates));

    this.renderer = new T.WebGLRenderer({ antialias: this.profile.antialias === 'none', powerPreference: 'high-performance', stencil: false });
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.94;
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    applyProfile(this.renderer, this.profile);
    const canvas = this.renderer.domElement;
    canvas.className = 'city-canvas';
    canvas.setAttribute('aria-label', 'Navapur interactive 3D city. Use W A S D to walk and drag to look around.');
    canvas.tabIndex = 0;
    document.getElementById('app')!.prepend(canvas);

    // A tiny indoor probe gives every material believable bounced light for free.
    this.stage('environment probe', () => {
      const room = new RoomEnvironment();
      const pmrem = new T.PMREMGenerator(this.renderer);
      const generated = pmrem.fromScene(room, 0.04);
      this.scene.environment = generated.texture;
      this.scene.environmentIntensity = this.profile.environmentIntensity;
      room.dispose(); pmrem.dispose();
    });

    this.crowd = this.stage('crowd', () => new Crowd(this.profile));
    this.animals = this.stage('animals', () => new Animals(this.profile, this.world.roadCoordinates));
    this.scene.add(this.world.group, this.traffic.group, this.crowd.group, this.animals.group);
    this.environment = this.stage('sky and weather', () => new Environment(this.scene, this.profile));
    this.player = new PlayerController(this.camera, canvas, this.world.colliders, this.world.bounds);
    this.scene.add(this.player.avatar.group);
    this.player.reset(this.sim.player);
    this.postfx = new PostFX(this.renderer, this.scene, this.camera, this.profile);
    this.postfx.setSize(innerWidth, innerHeight);
    this.postfx.setPixelRatio(this.renderer.getPixelRatio());

    this.ui = this.stage('interface', () => new GameUI({
      onAction: (a, v) => {
        if (a === 'rest') {
          this.sim.player.stamina = 100;
          this.sim.player.health = Math.min(100, this.sim.player.health + 8);
          this.sim.time = (this.sim.time + 30) % 1440;
          this.ui.toast('A quiet half-hour. You feel refreshed.');
          this.ui.closePanel();
        } else this.interactions.act(a, v);
      },
      hasSave: this.hasSave(),
    }));
    this.ui.setMap(this.world.places, this.world.roadCoordinates, this.world.bounds);
    this.interactions = new Interactions(this);

    this.marker = new T.Group();
    const ring = new T.Mesh(new T.TorusGeometry(0.8, 0.045, 8, 40), new T.MeshBasicMaterial({ color: '#e9b875', depthTest: false, transparent: true, opacity: 0.9 }));
    ring.rotation.x = Math.PI / 2;
    this.marker.add(ring);
    const beam = new T.Mesh(new T.CylinderGeometry(0.13, 0.28, 3.4, 10, 1, true), new T.MeshBasicMaterial({ color: '#e9b875', transparent: true, opacity: 0.16, depthWrite: false, side: T.DoubleSide }));
    beam.position.y = 1.7;
    this.marker.add(beam);
    const pin = new T.Mesh(new T.OctahedronGeometry(0.26), new T.MeshBasicMaterial({ color: '#f0c98d', depthTest: false }));
    pin.position.y = 2.9;
    this.marker.add(pin);
    this.scene.add(this.marker);
    this.marker.visible = false;

    for (let i = 0; i < 2; i++) {
      const light = new T.SpotLight('#fff0ce', 0, 55, 0.5, 0.55, 1.2);
      light.target = new T.Object3D();
      this.scene.add(light, light.target);
      this.headlights.push(light);
    }

    const vertices: number[] = [];
    for (const x of this.world.roadCoordinates) for (const z of this.world.roadCoordinates) {
      vertices.push(x - 10, 0.1, z - 10, x - 10, 0.1, z + 10, x - 10, 0.1, z - 10, x + 10, 0.1, z - 10);
    }
    const navGeometry = new T.BufferGeometry();
    navGeometry.setAttribute('position', new T.Float32BufferAttribute(vertices, 3));
    this.navLines = new T.LineSegments(navGeometry, new T.LineBasicMaterial({ color: '#91d2c5', transparent: true, opacity: 0.7 }));
    this.navLines.visible = false;
    this.scene.add(this.navLines);
    this.nameLayer = document.createElement('div');
    this.nameLayer.className = 'npc-debug-layer';
    document.getElementById('app')!.append(this.nameLayer);

    addEventListener('resize', () => this.resize());
    addEventListener('keydown', e => this.key(e));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.player.keys.clear();
        if (this.started && !this.ui.isPanelOpen) this.interactions.pause();
      }
    });
    canvas.addEventListener('webglcontextlost', e => {
      e.preventDefault();
      this.ui.toast('The graphics context paused. Reload to continue from your last save.');
    });
    addEventListener('beforeunload', () => { if (this.started) this.save(false); });
    this.bootTiming.push(['total', Math.round(performance.now() - bootStarted)]);
    try {
      if (new URLSearchParams(location.search).has('perf')) {
        console.info('[navapur] start-up', Object.fromEntries(this.bootTiming));
      }
    } catch { /* query strings are optional */ }
    (window as unknown as { __navapur: Game }).__navapur = this;
    requestAnimationFrame(t => this.frame(t));
  }

  private resize() {
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(innerWidth, innerHeight);
    this.postfx.setSize(innerWidth, innerHeight);
  }

  /** `?quality=low` is a one-URL escape hatch when a machine is struggling. */
  private requestedQuality(): QualityTier | null {
    try {
      const value = new URLSearchParams(location.search).get('quality');
      return value && value in QUALITY_PROFILES ? value as QualityTier : null;
    } catch { return null; }
  }

  private readSavedQuality(): QualityTier | null {
    try {
      const value = localStorage.getItem(QUALITY_KEY);
      return value && value in QUALITY_PROFILES ? value as QualityTier : null;
    } catch { return null; }
  }

  private hasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch { return false; } }

  get qualityProfile() { return this.profile; }

  start() {
    this.started = true;
    this.ui.setStarted(true);
    this.ui.closePanel();
    this.player.reset(this.sim.player);
    void this.audio.start().catch(() => this.ui.toast('City sounds are unavailable in this browser.'));
    this.ui.toast('Welcome to Purana Bazaar. Drag to look around; W A S D to walk.');
  }

  /** Switches the whole render stack: shadows, post-processing, crowd size and draw distance. */
  setQuality(tier: QualityTier | 'auto') {
    if (tier === 'auto') {
      this.autoQuality = true;
      tier = detectQuality();
      try { localStorage.removeItem(QUALITY_KEY); } catch { /* storage may be blocked */ }
    } else {
      this.autoQuality = false;
      try { localStorage.setItem(QUALITY_KEY, tier); } catch { /* storage may be blocked */ }
    }
    this.quality = tier;
    this.profile = QUALITY_PROFILES[tier];
    this.adaptive.reset();
    applyProfile(this.renderer, this.profile);
    this.renderer.setSize(innerWidth, innerHeight);
    this.crowd.setQuality(this.profile);
    this.environment.setQuality(this.profile);
    this.scene.environmentIntensity = this.profile.environmentIntensity;
    this.postfx.build(this.profile);
    this.postfx.setSize(innerWidth, innerHeight);
    this.postfx.setPixelRatio(this.renderer.getPixelRatio());
  }

  private key(e: KeyboardEvent) {
    if ((e.target as HTMLElement).matches('input,select,textarea') || e.repeat) return;
    if (['F3', 'F5', 'F9', 'KeyI', 'KeyM', 'Tab'].includes(e.code)) e.preventDefault();
    if (e.code === 'Escape') {
      if (this.ui.isPanelOpen) this.ui.closePanel();
      else if (this.started) this.interactions.pause();
      return;
    }
    if (!this.started) return;
    if (e.code === 'F5') { this.save(); return; }
    if (e.code === 'F9') { this.load(); return; }
    if (e.code === 'F3') { this.debug = !this.debug; return; }
    if (this.ui.isPanelOpen) return;
    const action: Record<string, string> = { KeyI: 'inventory', KeyM: 'map', KeyJ: 'journal', KeyE: 'interact', KeyV: 'vehicle', KeyP: 'pause' };
    if (action[e.code]) this.interactions.act(action[e.code]);
    if (e.code === 'KeyC') this.player.firstPerson = !this.player.firstPerson;
    if (e.code === 'KeyH') this.audio.horn();
    if (e.code === 'KeyL' && this.traffic.controlled) {
      this.traffic.controlled.headlights = !this.traffic.controlled.headlights;
      this.ui.toast(this.traffic.controlled.headlights ? 'Headlights on' : 'Headlights off');
    }
  }

  toggleVehicle() {
    if (this.traffic.controlled) {
      if (!this.traffic.exit(this.sim.player, (x, z, r) => this.player.blocked(x, z, r))) this.ui.toast('There is no clear space to exit. Move the vehicle a little.');
      else { this.player.inVehicle = false; this.ui.toast('Back on foot.'); }
    } else {
      const v = this.traffic.nearest(this.sim.player);
      if (!v) { this.ui.toast('Stand beside a stopped vehicle to drive.'); return; }
      this.traffic.enter(v, this.sim.player);
      this.player.inVehicle = true;
      this.player.yaw = v.heading;
      this.progress.drove = true;
      this.ui.toast(`${v.kind === 'auto' ? 'Auto-rickshaw' : v.kind} · W accelerate · S reverse · Space brake · V leave`);
    }
  }

  private findInteraction() {
    const p = this.sim.player;
    this.nearby = null;
    if (this.traffic.controlled) { this.nearby = { type: 'vehicle', label: 'Leave vehicle', target: null }; return; }
    const candidates: Array<{ d: number; type: 'shop' | 'person' | 'place'; label: string; target: Place | Resident }> = [];
    for (const place of this.world.places) {
      const d = distance(p, place.entrance);
      const inside = place.interior && distance(p, place.interior) < 4;
      if (d < 5 || inside) candidates.push({ d: inside ? 1 : d, type: SHOP_CATALOG[place.kind] ? 'shop' : 'place', label: SHOP_CATALOG[place.kind] ? `Visit ${place.name}` : `Explore ${place.name}`, target: place });
    }
    for (const r of this.sim.residents) {
      const d = distance(p, r);
      if (d < 3) candidates.push({ d: d + 0.8, type: 'person', label: `Talk to ${r.name.split(' ')[0]}`, target: r });
    }
    candidates.sort((a, b) => a.d - b.d);
    this.nearby = candidates[0] ?? null;
    if (!this.nearby && this.traffic.nearest(p)) this.nearby = { type: 'vehicle', label: 'Drive nearby vehicle', target: null };
  }

  interact() {
    this.findInteraction();
    if (!this.nearby) { this.ui.toast('Walk closer to a neighbour, storefront or vehicle.'); return; }
    const n = this.nearby;
    if (n.type === 'person') this.interactions.talk(n.target as Resident);
    else if (n.type === 'shop') this.interactions.openShop(n.target as Place);
    else if (n.type === 'vehicle') this.toggleVehicle();
    else {
      const p = n.target as Place;
      const descriptions: Partial<Record<Place['kind'], string>> = {
        home: 'A quiet courtyard and a place to catch your breath.',
        park: 'Shade, birdsong and a welcome break from the city streets.',
        school: 'Students and teachers gather here through the working day.',
        hospital: 'Navapur’s medical team responds when residents need help.',
        police: 'The neighbourhood police patrol the streets and respond to city incidents.',
        station: 'A busy meeting point for commuters, drivers and the next journey.',
        temple: 'A neighbourhood place of worship and quiet reflection.',
        mosque: 'A community place of worship in the heart of the neighbourhood.',
        church: 'A peaceful place of worship shared by the local community.',
      };
      this.ui.openPanel(p.name, `<p class="panel-intro">${escapeHtml(p.hindi)}<br>${descriptions[p.kind] || 'Part of the everyday rhythm of Navapur.'}</p>${['home', 'park', 'hospital'].includes(p.kind) ? '<button class="panel-button" data-action="rest">Rest for 30 minutes</button>' : ''}<button class="panel-button" data-action="job">Ask about delivery work</button>`, p.kind.toUpperCase());
    }
  }

  save(notify = true) {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        version: 1,
        simulation: this.sim.save(),
        vehicles: this.traffic.serialize(),
        controlled: this.traffic.controlled?.id ?? null,
        progress: this.progress,
        settings: { quality: this.quality, timeScale: this.timeScale, audio: this.audio.enabled },
        waypoint: this.waypoint,
      }));
      if (notify) this.ui.toast('Journey saved on this device.');
    } catch {
      if (notify) this.ui.toast('Saving is unavailable. Check this browser’s storage settings.');
    }
  }

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) { this.ui.toast('No saved journey yet.'); return; }
      const data = JSON.parse(raw);
      if (data.version !== 1 || typeof data.simulation !== 'string' || !Array.isArray(data.vehicles) || data.vehicles.length !== this.traffic.vehicles.length) throw new Error('Invalid save');
      const ids = new Set<string>();
      for (const v of data.vehicles) {
        if (typeof v !== 'object' || !v || !this.traffic.vehicles.some(t => t.id === v.id) || ids.has(v.id)
          || !['x', 'z', 'heading', 'fuel', 'damage', 'target'].every(k => Number.isFinite(v[k]))
          || Math.abs(v.x) > this.world.bounds + 10 || Math.abs(v.z) > this.world.bounds + 10
          || v.fuel < 0 || v.fuel > 100 || v.damage < 0 || v.damage > 100
          || !Number.isInteger(v.target) || v.target < 0 || v.target > 3 || typeof v.parked !== 'boolean') throw new Error('Invalid vehicle save');
        ids.add(v.id);
      }
      if (data.controlled !== null && !ids.has(data.controlled)) throw new Error('Invalid controlled vehicle');
      if (!data.progress || !['bought', 'ate', 'talked', 'drove'].every(k => typeof data.progress[k] === 'boolean')) throw new Error('Invalid progress');
      const parsed = JSON.parse(data.simulation);
      if (Math.abs(parsed.player?.x) > this.world.bounds || Math.abs(parsed.player?.z) > this.world.bounds) throw new Error('Invalid location');
      const r = this.sim.load(data.simulation);
      if (!r.ok) { this.ui.toast(r.message); return; }
      this.traffic.restore(data.vehicles);
      this.progress = data.progress;
      this.waypoint = data.waypoint && Number.isFinite(data.waypoint.x) && Number.isFinite(data.waypoint.z) && typeof data.waypoint.name === 'string' ? data.waypoint : null;
      const savedQuality = data.settings?.quality;
      this.setQuality(savedQuality in QUALITY_PROFILES ? savedQuality as QualityTier : savedQuality === 'balanced' ? 'balanced' : this.quality);
      this.timeScale = [0.5, 1, 10].includes(data.settings?.timeScale) ? data.settings.timeScale : 1;
      this.audio.setEnabled(data.settings?.audio !== false);
      this.player.inVehicle = false;
      if (data.controlled) {
        this.traffic.controlled = this.traffic.vehicles.find(v => v.id === data.controlled)!;
        this.player.inVehicle = true;
      }
      this.start();
      this.ui.toast('Welcome back. Your journey has been restored.');
    } catch {
      this.ui.toast('That save could not be read. Your current journey is unchanged.');
    }
  }

  private frame(timestamp: number) {
    requestAnimationFrame(t => this.frame(t));
    const dt = Math.min(0.05, (timestamp - this.last) / 1000 || 0.016);
    this.last = timestamp;
    this.fps += (1 / Math.max(dt, 0.001) - this.fps) * 0.04;
    const paused = this.started && this.ui.isPanelOpen;
    const tick = paused ? 0 : dt;
    this.elapsed += tick;

    if (!paused) {
      this.sim.timeScale = this.timeScale;
      this.sim.update(dt);
      this.traffic.update(dt, this.elapsed, this.sim.weather, this.sim.player, this.player.keys, this.started,
        (x, z, r) => this.player.blocked(x, z, r),
        (x, z) => {
          if (this.elapsed - this.lastCollision > 6) {
            this.lastCollision = this.elapsed;
            this.sim.triggerEvent('collision', x, z);
            this.audio.horn();
          }
        });
    }

    if (this.started) this.player.update(dt, this.sim.player, this.elapsed, !paused);
    else {
      this.camera.position.set(-5.5, 4.8, 43);
      this.camera.lookAt(10, 3.1, -7);
      this.player.avatar.group.position.set(this.sim.player.x, 0, this.sim.player.z);
      this.player.avatar.group.rotation.y = Math.PI;
      this.player.avatar.animate(dt, 0, 'idle', this.elapsed);
    }

    this.environment.update(tick, this.elapsed, this.sim.time, this.sim.weather, this.sim.player, this.sim.events);
    this.world.update(this.sim.time, this.sim.weather, this.elapsed);
    this.crowd.update(this.sim.residents, this.sim.player, this.elapsed, Math.max(tick, 0.0001), this.sim.weather);
    this.animals.update(tick, this.elapsed, this.sim.player, (x, z, r) => this.player.blocked(x, z, r));
    this.postfx.setNight(this.environment.nightAmount);
    this.traffic.setNight(this.environment.nightAmount);

    const v = this.traffic.controlled;
    for (let i = 0; i < this.headlights.length; i++) {
      const light = this.headlights[i];
      light.intensity = v?.headlights ? 46 : 0;
      if (v?.headlights) {
        const side = (i === 0 ? -1 : 1) * 0.55;
        const sin = Math.sin(v.heading), cos = Math.cos(v.heading);
        light.position.set(v.x + sin * 1.1 + cos * side, 0.85, v.z + cos * 1.1 - sin * side);
        light.target.position.set(v.x + sin * 18 + cos * side, 0, v.z + cos * 18 - sin * side);
      }
    }

    this.marker.visible = !!this.waypoint;
    if (this.waypoint) {
      this.marker.position.set(this.waypoint.x, 0.17, this.waypoint.z);
      this.marker.children[2].rotation.y = this.elapsed;
      this.marker.children[2].position.y = 2.8 + Math.sin(this.elapsed * 2) * 0.18;
      this.marker.children[0].rotation.z = this.elapsed * 0.6;
    }

    const district = [...this.world.districts].sort((a, b) => distance(a, this.sim.player) - distance(b, this.sim.player))[0];
    this.audio.update(tick, this.elapsed, this.sim.weather, this.sim.time, this.player.moving, v?.speed ?? 0, district.name);
    this.uiClock += dt;
    this.autoSave += tick;

    if (this.uiClock > 0.12) {
      this.uiClock = 0;
      this.findInteraction();
      const minutes = Math.floor(this.sim.time);
      const hour = Math.floor(minutes / 60);
      const time = `${String(hour % 12 || 12).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`;
      this.ui.update({
        district: district.name, subtitle: district.subtitle, time, day: this.sim.day, weather: this.sim.weather,
        cash: this.sim.player.cash, health: this.sim.player.health, stamina: this.sim.player.stamina, hunger: this.sim.player.hunger,
        x: this.sim.player.x, z: this.sim.player.z, heading: this.player.yaw,
        speed: v ? Math.round(Math.abs(v.speed) * 3.6) : undefined,
        mode: v ? `${v.kind} · Fuel ${Math.round(v.fuel)}% · Condition ${Math.round(100 - v.damage)}%` : 'on foot',
        interaction: this.nearby?.label, fuel: v?.fuel,
        residents: this.crowd.activeCount, vehicles: this.traffic.vehicles.length,
        activeAI: this.sim.residents.filter(r => r.tier === 'near').length,
        fps: Math.round(this.fps), debug: this.debug, waypoint: this.waypoint,
        quests: [
          { label: 'Find your first cup of chai', done: this.progress.bought },
          { label: 'Meet someone from the neighbourhood', done: this.progress.talked },
          { label: 'Take an auto for a spin', done: this.progress.drove },
        ],
      });
      this.updateDebug();
      if (this.sim.completedEvents.length > this.notices) {
        this.notices = this.sim.completedEvents.length;
        this.ui.toast('City services have resolved an incident. Life returns to its rhythm.');
      }
    }

    if (this.started && this.autoSave > 60 && !paused) { this.autoSave = 0; this.save(false); }

    // Trim resolution before frames start dropping, then hand the pixels back.
    if (this.adaptive.update(dt)) {
      applyProfile(this.renderer, this.profile, this.adaptive.scale);
      this.postfx.setPixelRatio(this.renderer.getPixelRatio());
    }
    // If that is not enough, step the whole tier down rather than stutter.
    const drop = this.watchdog.update(dt, this.adaptive.smoothedFps, this.quality, this.adaptive.scale);
    if (drop) {
      const wasAuto = this.autoQuality;
      this.setQuality(drop);
      this.autoQuality = wasAuto;
      if (wasAuto) { try { localStorage.removeItem(QUALITY_KEY); } catch { /* storage may be blocked */ } }
      this.ui.toast(`Graphics eased to ${QUALITY_PROFILES[drop].label} to keep the city smooth. Change it any time in settings.`);
    }

    // Redrawing the shadow map every frame is the single most expensive thing
    // the city does; two frames of lag on a moving shadow is invisible.
    this.renderer.shadowMap.needsUpdate = this.profile.shadows && this.shadowTick++ % this.profile.shadowInterval === 0;

    this.postfx.render(dt, this.elapsed);

    if (!this.booted) {
      this.booted = true;
      document.getElementById('boot')?.classList.add('boot--done');
      setTimeout(() => document.getElementById('boot')?.remove(), 900);
    }
  }

  private updateDebug() {
    this.navLines.visible = this.debug;
    this.nameLayer.hidden = !this.debug;
    if (!this.debug) return;
    const labels = this.sim.residents.filter(r => distance(r, this.sim.player) < 28).slice(0, 15).map(r => {
      const p = new T.Vector3(r.x, 2.35, r.z).project(this.camera);
      if (p.z > 1 || p.z < 0) return '';
      return `<span style="left:${(p.x * 0.5 + 0.5) * innerWidth}px;top:${(-p.y * 0.5 + 0.5) * innerHeight}px">${escapeHtml(r.name)} · ${escapeHtml(r.activity)}<small>${r.tier} · ${escapeHtml(r.goal)}</small></span>`;
    });
    const info = this.renderer.info.render;
    this.nameLayer.innerHTML = `<div class="debug-stats">${info.calls} draw calls · ${Math.round(info.triangles / 1000)}k triangles<br>${QUALITY_PROFILES[this.quality].label} · render scale ${Math.round(this.adaptive.scale * 100)}%<br>${this.sim.residents.length} residents · ${this.crowd.activeCount} drawn · ${this.traffic.vehicles.length} vehicles<br>${escapeHtml(this.sim.law)} · ${this.sim.events.filter(e => !e.resolved).length} active incidents</div>${labels.join('')}`;
  }
}
