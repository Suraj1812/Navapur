import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { seededRandom } from './batch';
import type { QualityProfile } from '../render/quality';

type Surface = 'plaster' | 'asphalt' | 'paving' | 'brick' | 'concrete' | 'corrugated' | 'wood' | 'tile' | 'marble' | 'dirt' | 'fabric';

function canvas2d(size: number) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  return { canvas, ctx: canvas.getContext('2d', { willReadFrequently: true })! };
}

/** Sobel-derives a tangent-space normal map from a grayscale height canvas. */
function normalFromHeight(source: HTMLCanvasElement, strength: number) {
  const size = source.width;
  const { canvas, ctx } = canvas2d(size);
  const src = source.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, size, size).data;
  const out = ctx.createImageData(size, size);
  const at = (x: number, y: number) => src[(((y + size) % size) * size + ((x + size) % size)) * 4] / 255;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = (at(x - 1, y - 1) + 2 * at(x - 1, y) + at(x - 1, y + 1)) - (at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1));
    const dy = (at(x - 1, y - 1) + 2 * at(x, y - 1) + at(x + 1, y - 1)) - (at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1));
    let nx = dx * strength, ny = dy * strength, nz = 1;
    const length = Math.hypot(nx, ny, nz) || 1;
    nx /= length; ny /= length; nz /= length;
    const index = (y * size + x) * 4;
    out.data[index] = (nx * 0.5 + 0.5) * 255;
    out.data[index + 1] = (ny * 0.5 + 0.5) * 255;
    out.data[index + 2] = (nz * 0.5 + 0.5) * 255;
    out.data[index + 3] = 255;
  }
  ctx.putImageData(out, 0, 0);
  return canvas;
}

interface SurfaceMaps { color: HTMLCanvasElement; height: HTMLCanvasElement; }

/**
 * Every surface in Navapur is generated at load time: an albedo pass and a
 * height pass, from which the normal and roughness maps are derived. No image
 * downloads, no loading spinner, and the whole city ships in the JS bundle.
 */
function paint(kind: Surface, size = 256): SurfaceMaps {
  const albedo = canvas2d(size);
  const bump = canvas2d(size);
  const random = seededRandom(1201 + kind.length * 37);
  const a = albedo.ctx; const h = bump.ctx;

  const base: Record<Surface, string> = {
    plaster: '#ded7c6', asphalt: '#3f3d39', paving: '#b6ae9a', brick: '#a86a4d', concrete: '#cfcabb',
    corrugated: '#9aa3a1', wood: '#8a6440', tile: '#a5573c', marble: '#f0ece1', dirt: '#b9a184', fabric: '#e6e1d5',
  };
  a.fillStyle = base[kind]; a.fillRect(0, 0, size, size);
  h.fillStyle = '#808080'; h.fillRect(0, 0, size, size);

  // Shared grain.
  const grain = a.getImageData(0, 0, size, size);
  const grainHeight = h.getImageData(0, 0, size, size);
  const amount = kind === 'asphalt' ? 46 : kind === 'marble' ? 8 : kind === 'dirt' ? 34 : 20;
  for (let i = 0; i < grain.data.length; i += 4) {
    const n = (random() - 0.5) * amount;
    grain.data[i] = Math.max(0, Math.min(255, grain.data[i] + n));
    grain.data[i + 1] = Math.max(0, Math.min(255, grain.data[i + 1] + n));
    grain.data[i + 2] = Math.max(0, Math.min(255, grain.data[i + 2] + n));
    const g = 128 + n * (kind === 'asphalt' ? 1.5 : 0.7);
    grainHeight.data[i] = grainHeight.data[i + 1] = grainHeight.data[i + 2] = Math.max(0, Math.min(255, g));
  }
  a.putImageData(grain, 0, 0);
  h.putImageData(grainHeight, 0, 0);

  const bricks = (rowHeight: number, gap: string, mortar: number) => {
    a.strokeStyle = gap; h.strokeStyle = `rgba(0,0,0,${mortar})`;
    a.lineWidth = h.lineWidth = size / 128;
    for (let y = 0; y < size; y += rowHeight) {
      a.beginPath(); a.moveTo(0, y); a.lineTo(size, y); a.stroke();
      h.beginPath(); h.moveTo(0, y); h.lineTo(size, y); h.stroke();
      const offset = (y / rowHeight % 2) * rowHeight;
      for (let x = offset; x < size; x += rowHeight * 2) {
        a.beginPath(); a.moveTo(x, y); a.lineTo(x, y + rowHeight); a.stroke();
        h.beginPath(); h.moveTo(x, y); h.lineTo(x, y + rowHeight); h.stroke();
      }
    }
  };

  if (kind === 'plaster') {
    for (let i = 0; i < 26; i++) {
      a.fillStyle = `rgba(70,60,48,${random() * 0.06})`;
      a.fillRect(random() * size, 0, random() * size * 0.06, size);
    }
    // Damp streaks below window lines and hairline cracks.
    for (let i = 0; i < 12; i++) {
      const x = random() * size; const y = random() * size;
      a.strokeStyle = `rgba(64,58,48,${0.05 + random() * 0.1})`;
      h.strokeStyle = 'rgba(0,0,0,0.4)';
      a.lineWidth = h.lineWidth = 1 + random() * 2;
      a.beginPath(); h.beginPath();
      a.moveTo(x, y); h.moveTo(x, y);
      let cx = x, cy = y;
      for (let step = 0; step < 6; step++) { cx += (random() - 0.5) * 40; cy += random() * 30; a.lineTo(cx, cy); h.lineTo(cx, cy); }
      a.stroke(); h.stroke();
    }
  } else if (kind === 'asphalt') {
    for (let i = 0; i < 220; i++) {
      const x = random() * size, y = random() * size, r = random() * 3.4 + 0.6;
      a.fillStyle = `rgba(${120 + random() * 60 | 0},${120 + random() * 60 | 0},${118 + random() * 50 | 0},${random() * 0.1})`;
      a.beginPath(); a.arc(x, y, r, 0, Math.PI * 2); a.fill();
      h.fillStyle = `rgba(255,255,255,${random() * 0.16})`;
      h.beginPath(); h.arc(x, y, r, 0, Math.PI * 2); h.fill();
    }
    for (let i = 0; i < 7; i++) {
      a.strokeStyle = 'rgba(24,24,24,0.22)'; h.strokeStyle = 'rgba(0,0,0,0.16)';
      a.lineWidth = h.lineWidth = 1.2 + random() * 1.6;
      let cx = random() * size, cy = random() * size;
      a.beginPath(); h.beginPath(); a.moveTo(cx, cy); h.moveTo(cx, cy);
      for (let step = 0; step < 8; step++) { cx += (random() - 0.5) * 90; cy += (random() - 0.5) * 90; a.lineTo(cx, cy); h.lineTo(cx, cy); }
      a.stroke(); h.stroke();
    }
  } else if (kind === 'paving') {
    const cell = size / 4;
    for (let y = 0; y < size; y += cell) for (let x = 0; x < size; x += cell) {
      const shade = 190 + random() * 40 | 0;
      a.fillStyle = `rgb(${shade},${shade - 6},${shade - 22})`;
      a.fillRect(x + 2, y + 2, cell - 4, cell - 4);
      h.fillStyle = `rgb(${150 + random() * 60 | 0},0,0)`;
      h.fillStyle = `rgba(255,255,255,${0.35 + random() * 0.3})`;
      h.fillRect(x + 2, y + 2, cell - 4, cell - 4);
    }
  } else if (kind === 'brick') {
    bricks(size / 12, 'rgba(196,186,168,0.85)', 0.55);
  } else if (kind === 'corrugated') {
    for (let x = 0; x < size; x += size / 32) {
      const gradient = a.createLinearGradient(x, 0, x + size / 32, 0);
      gradient.addColorStop(0, 'rgba(60,66,66,0.5)');
      gradient.addColorStop(0.5, 'rgba(215,220,218,0.35)');
      gradient.addColorStop(1, 'rgba(60,66,66,0.5)');
      a.fillStyle = gradient; a.fillRect(x, 0, size / 32, size);
      const bumpGradient = h.createLinearGradient(x, 0, x + size / 32, 0);
      bumpGradient.addColorStop(0, '#101010'); bumpGradient.addColorStop(0.5, '#f0f0f0'); bumpGradient.addColorStop(1, '#101010');
      h.fillStyle = bumpGradient; h.fillRect(x, 0, size / 32, size);
    }
    for (let i = 0; i < 40; i++) {
      a.fillStyle = `rgba(${120 + random() * 50 | 0},${60 + random() * 30 | 0},30,${random() * 0.3})`;
      a.beginPath(); a.arc(random() * size, random() * size, random() * 18, 0, Math.PI * 2); a.fill();
    }
  } else if (kind === 'wood') {
    for (let i = 0; i < 90; i++) {
      a.strokeStyle = `rgba(${60 + random() * 40 | 0},${40 + random() * 30 | 0},20,${random() * 0.35})`;
      a.lineWidth = random() * 3 + 0.5;
      const y = random() * size;
      a.beginPath(); a.moveTo(0, y);
      for (let x = 0; x < size; x += 32) a.lineTo(x, y + Math.sin(x * 0.05 + i) * 3);
      a.stroke();
    }
    h.drawImage(albedo.canvas, 0, 0);
  } else if (kind === 'tile') {
    const rowHeight = size / 10;
    for (let y = 0; y < size; y += rowHeight) for (let x = 0; x < size; x += rowHeight) {
      const shade = random() * 30;
      a.fillStyle = `rgb(${160 + shade | 0},${84 + shade | 0},${60 + shade | 0})`;
      a.beginPath(); a.ellipse(x + rowHeight / 2, y + rowHeight / 2, rowHeight * 0.52, rowHeight * 0.6, 0, 0, Math.PI * 2); a.fill();
      h.fillStyle = `rgba(255,255,255,${0.4 + random() * 0.3})`;
      h.beginPath(); h.ellipse(x + rowHeight / 2, y + rowHeight / 2, rowHeight * 0.48, rowHeight * 0.56, 0, 0, Math.PI * 2); h.fill();
    }
  } else if (kind === 'marble') {
    for (let i = 0; i < 26; i++) {
      a.strokeStyle = `rgba(${150 + random() * 60 | 0},${150 + random() * 50 | 0},${140 + random() * 50 | 0},${0.12 + random() * 0.2})`;
      a.lineWidth = random() * 2.6 + 0.4;
      let cx = random() * size, cy = random() * size;
      a.beginPath(); a.moveTo(cx, cy);
      for (let step = 0; step < 10; step++) { cx += (random() - 0.5) * 90; cy += (random() - 0.4) * 70; a.lineTo(cx, cy); }
      a.stroke();
    }
  } else if (kind === 'dirt') {
    for (let i = 0; i < 300; i++) {
      const r = random() * 5 + 1;
      a.fillStyle = `rgba(${90 + random() * 70 | 0},${70 + random() * 50 | 0},${45 + random() * 40 | 0},${random() * 0.35})`;
      a.beginPath(); a.arc(random() * size, random() * size, r, 0, Math.PI * 2); a.fill();
      h.fillStyle = `rgba(255,255,255,${random() * 0.5})`;
      h.beginPath(); h.arc(random() * size, random() * size, r, 0, Math.PI * 2); h.fill();
    }
  } else if (kind === 'fabric') {
    for (let i = 0; i < size; i += 3) {
      a.strokeStyle = `rgba(120,110,96,${0.05 + random() * 0.05})`;
      a.lineWidth = 1;
      a.beginPath(); a.moveTo(i, 0); a.lineTo(i, size); a.stroke();
      a.beginPath(); a.moveTo(0, i); a.lineTo(size, i); a.stroke();
    }
    h.drawImage(albedo.canvas, 0, 0);
  } else if (kind === 'concrete') {
    for (let i = 0; i < 60; i++) {
      a.fillStyle = `rgba(120,116,104,${random() * 0.12})`;
      a.beginPath(); a.arc(random() * size, random() * size, random() * 40, 0, Math.PI * 2); a.fill();
    }
  }

  return { color: albedo.canvas, height: bump.canvas };
}

function textureFrom(source: HTMLCanvasElement, repeat: number, srgb: boolean, anisotropy: number) {
  const texture = new THREE.CanvasTexture(source);
  if (srgb) texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.anisotropy = anisotropy;
  return texture;
}


/**
 * A cluster of individual leaves with a soft alpha edge. Crossed quads carrying
 * this read as real foliage from any angle, which a smooth green sphere never
 * does - and it is the single biggest thing standing between a procedural city
 * and a photograph.
 */
function leafTexture(size = 256) {
  const { canvas, ctx } = canvas2d(size);
  const random = seededRandom(6041);
  ctx.clearRect(0, 0, size, size);
  const greens = ['#3f5c33', '#4d6b38', '#5c7c42', '#6b8c4c', '#37502c', '#79994f'];
  for (let leaf = 0; leaf < 170; leaf++) {
    // Cluster towards the middle so the quad's edges fade out naturally.
    const angle = random() * Math.PI * 2;
    const spread = Math.pow(random(), 0.62) * size * 0.46;
    const cx = size / 2 + Math.cos(angle) * spread;
    const cy = size / 2 + Math.sin(angle) * spread * 0.92;
    const length = size * (0.055 + random() * 0.06);
    const width = length * (0.36 + random() * 0.24);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(random() * Math.PI * 2);
    ctx.fillStyle = greens[Math.floor(random() * greens.length)];
    ctx.globalAlpha = 0.72 + random() * 0.28;
    ctx.beginPath();
    ctx.moveTo(0, -length / 2);
    ctx.quadraticCurveTo(width, 0, 0, length / 2);
    ctx.quadraticCurveTo(-width, 0, 0, -length / 2);
    ctx.fill();
    // A lighter midrib catches the sun.
    ctx.globalAlpha *= 0.5;
    ctx.strokeStyle = '#8aa763';
    ctx.lineWidth = Math.max(1, length * 0.06);
    ctx.beginPath(); ctx.moveTo(0, -length / 2); ctx.lineTo(0, length / 2); ctx.stroke();
    ctx.restore();
  }
  return canvas;
}

/** A soft radial patch used as a contact shadow beneath anything that sits on the ground. */
function contactTexture(size = 128) {
  const { canvas, ctx } = canvas2d(size);
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(0,0,0,0.85)');
  gradient.addColorStop(0.45, 'rgba(0,0,0,0.5)');
  gradient.addColorStop(0.78, 'rgba(0,0,0,0.16)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return canvas;
}

let sharedContact: THREE.MeshBasicMaterial | null = null;

/**
 * One shared contact-shadow material for the whole city. Cheap, always present,
 * and it is what stops people, carts and cars looking like stickers hovering a
 * centimetre above the road.
 */
export function contactShadowMaterial() {
  if (sharedContact) return sharedContact;
  const texture = new THREE.CanvasTexture(contactTexture());
  texture.colorSpace = THREE.SRGBColorSpace;
  sharedContact = new THREE.MeshBasicMaterial({
    map: texture, transparent: true, opacity: 0.46, depthWrite: false,
    color: '#000000', polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3,
  });
  return sharedContact;
}

/** The ground-facing unit quad every contact shadow is drawn on. */
export function contactShadowGeometry() {
  const quad = new THREE.PlaneGeometry(1, 1);
  quad.rotateX(-Math.PI / 2);
  return quad;
}

export function createMaterials(profile: QualityProfile) {
  const anisotropy = profile.anisotropy;
  const made: THREE.Texture[] = [];

  const build = (kind: Surface, repeat: number, normalStrength: number, size = 256) => {
    const maps = paint(kind, size);
    const map = textureFrom(maps.color, repeat, true, anisotropy);
    const normalMap = textureFrom(normalFromHeight(maps.height, normalStrength), repeat, false, anisotropy);
    const roughnessMap = textureFrom(maps.height, repeat, false, anisotropy);
    made.push(map, normalMap, roughnessMap);
    return { map, normalMap, roughnessMap };
  };

  const plasterMaps = build('plaster', 6, 1.6, 384);
  const asphaltMaps = build('asphalt', 46, 0.9, 384);
  const pavingMaps = build('paving', 9, 3, 256);
  const brickMaps = build('brick', 8, 3.4, 256);
  const concreteMaps = build('concrete', 6, 1.2, 256);
  const corrugatedMaps = build('corrugated', 6, 3.2, 192);
  const woodMaps = build('wood', 4, 1.6, 192);
  const tileMaps = build('tile', 7, 3, 192);
  const marbleMaps = build('marble', 4, 0.8, 192);
  const dirtMaps = build('dirt', 12, 2, 192);
  const fabricMaps = build('fabric', 3, 1, 128);

  const standard = (parameters: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(parameters);

  const leafMap = new THREE.CanvasTexture(leafTexture());
  leafMap.colorSpace = THREE.SRGBColorSpace;
  leafMap.anisotropy = anisotropy;
  made.push(leafMap);
  const contactMap = new THREE.CanvasTexture(contactTexture());
  contactMap.colorSpace = THREE.SRGBColorSpace;
  made.push(contactMap);

  const materials = {
    plaster: standard({ color: '#ffffff', ...plasterMaps, roughness: 0.95, normalScale: new THREE.Vector2(0.55, 0.55) }),
    concrete: standard({ color: '#ffffff', ...concreteMaps, roughness: 0.92 }),
    road: standard({ color: '#514e48', ...asphaltMaps, roughness: 0.95, metalness: 0.02, normalScale: new THREE.Vector2(0.22, 0.22) }),
    paving: standard({ color: '#aaa38f', ...pavingMaps, roughness: 0.9, normalScale: new THREE.Vector2(0.85, 0.85) }),
    brick: standard({ color: '#a97256', ...brickMaps, roughness: 0.92, normalScale: new THREE.Vector2(0.9, 0.9) }),
    metal: standard({ color: '#ffffff', roughness: 0.48, metalness: 0.72 }),
    corrugated: standard({ color: '#ffffff', ...corrugatedMaps, roughness: 0.56, metalness: 0.6, normalScale: new THREE.Vector2(1.1, 1.1) }),
    dark: standard({ color: '#252d2e', roughness: 0.74 }),
    glass: standard({ color: '#3d545d', roughness: 0.12, metalness: 0.55, envMapIntensity: 1.4 }),
    warmGlass: standard({ color: '#8b8577', emissive: '#ffc57b', emissiveIntensity: 0.04, roughness: 0.28, metalness: 0.05 }),
    foliage: standard({ color: '#ffffff', roughness: 0.96 }),
    cloth: standard({ color: '#ffffff', ...fabricMaps, roughness: 0.98, side: THREE.DoubleSide }),
    paint: standard({ color: '#eee6d2', roughness: 0.66, metalness: 0.02 }),
    light: standard({ color: '#e9e0c4', emissive: '#ffd4a0', emissiveIntensity: 0.15, roughness: 0.4 }),
    wood: standard({ color: '#ffffff', ...woodMaps, roughness: 0.82 }),
    tile: standard({ color: '#ffffff', ...tileMaps, roughness: 0.78, normalScale: new THREE.Vector2(0.9, 0.9) }),
    marble: standard({ color: '#ffffff', ...marbleMaps, roughness: 0.24, metalness: 0.04 }),
    dirt: standard({ color: '#ffffff', ...dirtMaps, roughness: 1 }),
    rust: standard({ color: '#8a5232', roughness: 0.86, metalness: 0.35 }),
    neon: standard({ color: '#2b2f33', emissive: '#ff8a4b', emissiveIntensity: 0.2, roughness: 0.5 }),
    water: new THREE.MeshPhysicalMaterial({ color: '#6d7f83', roughness: 0.06, metalness: 0.2, transparent: true, opacity: 0.6, clearcoat: 1 }),
    leaf: standard({ map: leafMap, alphaTest: 0.42, side: THREE.DoubleSide, roughness: 0.94, metalness: 0, color: '#ffffff' }),
    contact: contactShadowMaterial(),
  };

  /**
   * A copy of a surface at a different texel density. Large flat areas - the
   * road, the pavements, the open ground - need their texture repeated per
   * metre, not stretched once across sixty of them, which is the difference
   * between a surface and a sheet of coloured plastic.
   */
  const scaled = (source: THREE.MeshStandardMaterial, repeat: number) => {
    const copy = source.clone();
    for (const key of ['map', 'normalMap', 'roughnessMap'] as const) {
      const texture = source[key];
      if (!texture) continue;
      const cloned = texture.clone();
      cloned.needsUpdate = true;
      cloned.wrapS = cloned.wrapT = THREE.RepeatWrapping;
      cloned.repeat.set(repeat, repeat);
      cloned.anisotropy = anisotropy;
      made.push(cloned);
      copy[key] = cloned;
    }
    return copy;
  };

  const all = Object.values(materials) as THREE.Material[];
  return Object.assign(materials, {
    scaled,
    setQuality(next: QualityProfile) {
      for (const texture of made) texture.anisotropy = next.anisotropy;
      for (const texture of made) texture.needsUpdate = true;
    },
    dispose() { all.forEach(material => material.dispose()); made.forEach(texture => texture.dispose()); },
  });
}
export type CityMaterials = ReturnType<typeof createMaterials>;

/** A single atlas keeps all bilingual shop fascia signs in a single draw call. */
export class SignAtlas {
  private canvas = document.createElement('canvas');
  private ctx: CanvasRenderingContext2D;
  private geometries: THREE.BufferGeometry[] = [];
  private labels = new Map<string, number>();
  private count = 0;
  constructor() { this.canvas.width = 2048; this.canvas.height = 4096; this.ctx = this.canvas.getContext('2d')!; }
  add(group: THREE.Group, title: string, hindi: string, caption: string, background: string, x: number, y: number, z: number, width: number, height: number, angle = 0) {
    void group;
    const key = title + hindi + caption + background;
    let index = this.labels.get(key);
    if (index === undefined) {
      index = this.count++; this.labels.set(key, index);
      const cx = index % 4 * 512; const cy = Math.floor(index / 4) * 128;
      const gradient = this.ctx.createLinearGradient(cx, cy, cx, cy + 128);
      gradient.addColorStop(0, background);
      gradient.addColorStop(1, new THREE.Color(background).multiplyScalar(0.68).getStyle());
      this.ctx.fillStyle = gradient; this.ctx.fillRect(cx, cy, 512, 128);
      this.ctx.strokeStyle = '#e4cba0'; this.ctx.lineWidth = 2; this.ctx.strokeRect(cx + 7, cy + 7, 498, 114);
      this.ctx.textAlign = 'center'; this.ctx.fillStyle = '#f5ead2';
      this.ctx.font = 'bold 37px Arial, sans-serif'; this.ctx.fillText(hindi, cx + 256, cy + 48, 480);
      this.ctx.font = 'bold 27px Arial, sans-serif'; this.ctx.fillText(title.toUpperCase(), cx + 256, cy + 82, 480);
      this.ctx.fillStyle = '#dfcdaa'; this.ctx.font = '15px Arial, sans-serif'; this.ctx.fillText(caption, cx + 256, cy + 108, 480);
    }
    const geometry = new THREE.PlaneGeometry(width, height);
    const uv = geometry.getAttribute('uv');
    const u = index % 4 / 4; const v = Math.floor(index / 4) / 32;
    for (let i = 0; i < uv.count; i++) { uv.setXY(i, u + (0.004 + uv.getX(i) * 0.992) / 4, 1 - v - (0.012 + (1 - uv.getY(i)) * 0.976) / 32); }
    geometry.rotateY(angle); geometry.translate(x, y, z); this.geometries.push(geometry);
  }
  finish(group: THREE.Group) {
    if (!this.geometries.length) return;
    const texture = new THREE.CanvasTexture(this.canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 8;
    const material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.72, metalness: 0.05, emissiveMap: texture, emissive: '#fff2df', emissiveIntensity: 0.16, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(mergeGeometries(this.geometries), material); mesh.castShadow = true; group.add(mesh);
    this.geometries.forEach(geometry => geometry.dispose());
    return material;
  }
}
