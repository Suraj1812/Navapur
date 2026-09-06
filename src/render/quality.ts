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
    label: 'Performance', blurb: 'Smoothest on phones and older laptops.',
    maxPixelRatio: 1, shadows: false, shadowMapSize: 1024, shadowDistance: 55, softShadows: false,
    bloom: false, ambientOcclusion: false, antialias: 'none',
    crowd: 34, crowdRadius: 62, vehicles: 22, vehicleLights: false, characterDetail: 0, rainDrops: 900, anisotropy: 2,
    wetSurfaces: false, lampLights: 10, birds: 10, animals: 6, distantCity: false, environmentIntensity: 0.5,
  },
  balanced: {
    label: 'Balanced', blurb: 'A good picture with a long battery life.',
    maxPixelRatio: 1.25, shadows: true, shadowMapSize: 2048, shadowDistance: 75, softShadows: false,
    bloom: true, ambientOcclusion: false, antialias: 'smaa',
    crowd: 58, crowdRadius: 85, vehicles: 32, vehicleLights: true, characterDetail: 1, rainDrops: 1800, anisotropy: 4,
    wetSurfaces: true, lampLights: 22, birds: 16, animals: 12, distantCity: true, environmentIntensity: 0.55,
  },
  high: {
    label: 'Cinematic', blurb: 'Soft shadows, bloom and a full street crowd.',
    maxPixelRatio: 1.6, shadows: true, shadowMapSize: 3072, shadowDistance: 95, softShadows: true,
    bloom: true, ambientOcclusion: true, antialias: 'smaa',
    crowd: 88, crowdRadius: 110, vehicles: 44, vehicleLights: true, characterDetail: 2, rainDrops: 3200, anisotropy: 8,
    wetSurfaces: true, lampLights: 36, birds: 24, animals: 18, distantCity: true, environmentIntensity: 0.6,
  },
  ultra: {
    label: 'Ultra', blurb: 'Everything on. For a desktop with a real GPU.',
    maxPixelRatio: 2, shadows: true, shadowMapSize: 4096, shadowDistance: 125, softShadows: true,
    bloom: true, ambientOcclusion: true, antialias: 'smaa',
    crowd: 120, crowdRadius: 135, vehicles: 56, vehicleLights: true, characterDetail: 2, rainDrops: 4800, anisotropy: 16,
    wetSurfaces: true, lampLights: 48, birds: 34, animals: 26, distantCity: true, environmentIntensity: 0.62,
  },
};

export const QUALITY_ORDER: QualityTier[] = ['low', 'balanced', 'high', 'ultra'];

/** Best guess at what this device can carry, before a single frame has been drawn. */
export function detectQuality(): QualityTier {
  if (typeof navigator === 'undefined') return 'balanced';
  const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  const cores = navigator.hardwareConcurrency || 4;
  const memory = (navigator as unknown as { deviceMemory?: number }).deviceMemory || 4;
  let renderer = '';
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    const info = gl?.getExtension('WEBGL_debug_renderer_info');
    if (gl && info) renderer = String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)).toLowerCase();
  } catch { /* renderer strings are optional */ }
  if (/swiftshader|llvmpipe|software|basic render/.test(renderer)) return 'low';
  if (coarse) return /apple (a1[5-9]|a2|m[1-9])/.test(renderer) ? 'balanced' : 'low';
  const weak = /(intel).*(hd|uhd) graphics (5|6)\d\d/.test(renderer) || cores <= 4 || memory <= 4;
  if (weak) return 'balanced';
  const strong = /rtx|radeon rx|apple m[2-9]|arc a[57]/.test(renderer) && cores >= 8 && memory >= 8;
  return strong ? 'ultra' : 'high';
}

/**
 * Watches real frame times and quietly trims the render resolution before the city
 * ever feels sluggish, then hands the pixels back once there is headroom again.
 */
export class AdaptiveResolution {
  scale = 1;
  smoothedFps = 60;
  private cooldown = 1.5;
  private readonly floor: number;
  constructor(private target = 58, floor = 0.62) { this.floor = floor; }

  reset() { this.scale = 1; this.smoothedFps = this.target; this.cooldown = 1.5; }

  /** Returns true when the caller should apply the new scale. */
  update(dt: number): boolean {
    const fps = 1 / Math.max(dt, 0.0005);
    this.smoothedFps += (fps - this.smoothedFps) * (fps < this.smoothedFps ? 0.12 : 0.05);
    this.cooldown -= dt;
    if (this.cooldown > 0) return false;
    if (this.smoothedFps < this.target - 10 && this.scale > this.floor) {
      this.scale = Math.max(this.floor, this.scale - 0.1); this.cooldown = 1.4; return true;
    }
    if (this.smoothedFps > this.target + 14 && this.scale < 1) {
      this.scale = Math.min(1, this.scale + 0.05); this.cooldown = 3; return true;
    }
    return false;
  }
}

export function applyProfile(renderer: T.WebGLRenderer, profile: QualityProfile, scale = 1) {
  renderer.setPixelRatio(Math.min(devicePixelRatio, profile.maxPixelRatio) * scale);
  renderer.shadowMap.enabled = profile.shadows;
  renderer.shadowMap.type = profile.softShadows ? T.PCFSoftShadowMap : T.PCFShadowMap;
}
