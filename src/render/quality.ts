import * as T from 'three';

export type QualityTier = 'low' | 'balanced' | 'high' | 'ultra';

export interface QualityProfile {
  label: string;
  blurb: string;
  maxPixelRatio: number;
  shadows: boolean;
  shadowMapSize: number;
  shadowDistance: number;
  softShadows: boolean;
  /** Re-render the shadow map every Nth frame. Two frames of lag is invisible. */
  shadowInterval: number;
  bloom: boolean;
  ambientOcclusion: boolean;
  antialias: 'none' | 'smaa' | 'msaa';
  crowd: number;
  crowdRadius: number;
  vehicles: number;
  vehicleLights: boolean;
  characterDetail: 0 | 1 | 2;
  rainDrops: number;
  anisotropy: number;
  wetSurfaces: boolean;
  lampLights: number;
  birds: number;
  animals: number;
  distantCity: boolean;
  environmentIntensity: number;
}

export const QUALITY_PROFILES: Record<QualityTier, QualityProfile> = {
  low: {
    label: 'Performance', blurb: 'Smoothest on phones, older laptops and battery.',
    maxPixelRatio: 0.85, shadows: false, shadowMapSize: 1024, shadowDistance: 45, softShadows: false, shadowInterval: 4,
    bloom: false, ambientOcclusion: false, antialias: 'none',
    crowd: 26, crowdRadius: 55, vehicles: 18, vehicleLights: false, characterDetail: 0, rainDrops: 700, anisotropy: 1,
    wetSurfaces: false, lampLights: 6, birds: 8, animals: 5, distantCity: false, environmentIntensity: 0.5,
  },
  balanced: {
    label: 'Balanced', blurb: 'The default. Soft light, full city, long battery life.',
    maxPixelRatio: 1, shadows: true, shadowMapSize: 1536, shadowDistance: 58, softShadows: false, shadowInterval: 3,
    bloom: true, ambientOcclusion: false, antialias: 'smaa',
    crowd: 42, crowdRadius: 72, vehicles: 26, vehicleLights: true, characterDetail: 1, rainDrops: 1400, anisotropy: 4,
    wetSurfaces: true, lampLights: 14, birds: 12, animals: 9, distantCity: true, environmentIntensity: 0.55,
  },
  high: {
    label: 'Cinematic', blurb: 'Soft shadows, bloom and a full street crowd. Wants a real GPU.',
    maxPixelRatio: 1.25, shadows: true, shadowMapSize: 2560, shadowDistance: 80, softShadows: true, shadowInterval: 2,
    bloom: true, ambientOcclusion: false, antialias: 'smaa',
    crowd: 64, crowdRadius: 92, vehicles: 36, vehicleLights: true, characterDetail: 2, rainDrops: 2400, anisotropy: 8,
    wetSurfaces: true, lampLights: 24, birds: 18, animals: 14, distantCity: true, environmentIntensity: 0.6,
  },
  ultra: {
    label: 'Ultra', blurb: 'Ambient occlusion and everything else on. Desktop graphics cards only.',
    maxPixelRatio: 1.6, shadows: true, shadowMapSize: 3072, shadowDistance: 105, softShadows: true, shadowInterval: 1,
    bloom: true, ambientOcclusion: true, antialias: 'smaa',
    crowd: 92, crowdRadius: 118, vehicles: 48, vehicleLights: true, characterDetail: 2, rainDrops: 3600, anisotropy: 16,
    wetSurfaces: true, lampLights: 34, birds: 26, animals: 20, distantCity: true, environmentIntensity: 0.62,
  },
};

export const QUALITY_ORDER: QualityTier[] = ['low', 'balanced', 'high', 'ultra'];

/**
 * A deliberately cautious guess at what this device can carry before a single
 * frame has been drawn. Guessing low costs a little fidelity; guessing high
 * costs the first impression, so integrated graphics and laptops start at
 * Balanced and only a desktop graphics card is trusted with Ultra.
 */
export function detectQuality(): QualityTier {
  if (typeof navigator === 'undefined') return 'balanced';
  const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  const cores = navigator.hardwareConcurrency || 4;
  const memory = (navigator as unknown as { deviceMemory?: number }).deviceMemory || 4;
  const density = typeof devicePixelRatio === 'number' ? devicePixelRatio : 1;
  let renderer = '';
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    const info = gl?.getExtension('WEBGL_debug_renderer_info');
    if (gl && info) renderer = String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)).toLowerCase();
  } catch { /* renderer strings are optional */ }

  if (/swiftshader|llvmpipe|software|basic render/.test(renderer)) return 'low';
  if (coarse) return 'low';
  if (cores <= 4 || memory <= 4) return 'low';

  // A discrete desktop card, and only then, gets the heavy tier.
  const discrete = /(rtx|gtx 1[06-9]|radeon rx|arc a[57])/.test(renderer);
  if (discrete && cores >= 8 && memory >= 8) return 'ultra';

  // Apple silicon and modern integrated graphics are quick, but they are
  // usually driving a very dense display, which is where the cost really is.
  const capable = /apple m[1-9]|iris xe|radeon 7|uhd graphics 7|arc/.test(renderer);
  if (capable && density <= 1.5 && cores >= 8) return 'high';
  if (capable || cores >= 8) return 'balanced';
  return 'balanced';
}

/**
 * Watches real frame times and quietly trims the render resolution before the city
 * ever feels sluggish, then hands the pixels back once there is headroom again.
 */
export class AdaptiveResolution {
  scale = 1;
  smoothedFps = 60;
  private cooldown = 1.2;
  private readonly floor: number;
  constructor(private target = 55, floor = 0.55) { this.floor = floor; }

  reset() { this.scale = 1; this.smoothedFps = this.target; this.cooldown = 1.5; }

  /** Returns true when the caller should apply the new scale. */
  update(dt: number): boolean {
    const fps = 1 / Math.max(dt, 0.0005);
    this.smoothedFps += (fps - this.smoothedFps) * (fps < this.smoothedFps ? 0.12 : 0.05);
    this.cooldown -= dt;
    if (this.cooldown > 0) return false;
    if (this.smoothedFps < this.target - 8 && this.scale > this.floor) {
      this.scale = Math.max(this.floor, this.scale - 0.12); this.cooldown = 0.9; return true;
    }
    if (this.smoothedFps > this.target + 16 && this.scale < 1) {
      this.scale = Math.min(1, this.scale + 0.05); this.cooldown = 3.5; return true;
    }
    return false;
  }
}

export function applyProfile(renderer: T.WebGLRenderer, profile: QualityProfile, scale = 1) {
  renderer.setPixelRatio(Math.min(devicePixelRatio, profile.maxPixelRatio) * scale);
  renderer.shadowMap.enabled = profile.shadows;
  renderer.shadowMap.type = profile.softShadows ? T.PCFSoftShadowMap : T.PCFShadowMap;
  // The shadow map is redrawn on our schedule rather than on every frame.
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
}

/**
 * If trimming resolution is not enough, the whole tier steps down. Two steps at
 * most, several seconds apart, so a brief hitch never costs the picture.
 */
export class QualityWatchdog {
  private slowFor = 0;
  private grace = 6;
  steps = 0;

  /** Returns the tier to drop to, or null to stay put. */
  update(dt: number, fps: number, tier: QualityTier, resolutionScale: number): QualityTier | null {
    if (this.grace > 0) { this.grace -= dt; return null; }
    if (this.steps >= 2) return null;
    const struggling = fps < 34 && resolutionScale <= 0.72;
    this.slowFor = struggling ? this.slowFor + dt : Math.max(0, this.slowFor - dt * 2);
    if (this.slowFor < 4) return null;
    const index = QUALITY_ORDER.indexOf(tier);
    if (index <= 0) { this.steps = 2; return null; }
    this.slowFor = 0; this.grace = 10; this.steps++;
    return QUALITY_ORDER[index - 1];
  }
}
