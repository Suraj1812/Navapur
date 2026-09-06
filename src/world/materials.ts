import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { seededRandom } from './batch';

function surface(kind: 'plaster' | 'asphalt' | 'paving' | 'brick') {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
  const context = canvas.getContext('2d')!;
  const random = seededRandom(142 + kind.length);
  const data = context.createImageData(256, 256);
  for (let i = 0; i < data.data.length; i += 4) {
    const shade = (kind === 'asphalt' ? 176 : 225) + Math.floor((random() - 0.5) * (kind === 'asphalt' ? 72 : 28));
    data.data[i] = shade; data.data[i + 1] = shade; data.data[i + 2] = shade; data.data[i + 3] = 255;
  }
  context.putImageData(data, 0, 0);
  if (kind === 'paving' || kind === 'brick') {
    context.strokeStyle = kind === 'paving' ? '#898a88' : '#b4ada3'; context.lineWidth = 2;
    const height = kind === 'paving' ? 64 : 32;
    for (let y = 0; y < 256; y += height) {
      context.beginPath(); context.moveTo(0, y); context.lineTo(256, y); context.stroke();
      for (let x = (y / height % 2) * 32; x < 256; x += 64) { context.beginPath(); context.moveTo(x, y); context.lineTo(x, y + height); context.stroke(); }
    }
  }
  if (kind === 'plaster') {
    for (let i = 0; i < 12; i++) {
      context.fillStyle = `rgba(55,48,40,${random() * 0.07})`;
      context.fillRect(random() * 256, 0, random() * 12, 256);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace; texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}

export function createMaterials() {
  const plaster = surface('plaster'); const asphalt = surface('asphalt');
  asphalt.repeat.set(55, 55);
  const paving = surface('paving'); paving.repeat.set(8, 8);
  const brick = surface('brick'); brick.repeat.set(3, 3);
  return {
    plaster: new THREE.MeshStandardMaterial({ color: '#ffffff', map: plaster, roughness: 0.94, bumpMap: plaster, bumpScale: 0.045 }),
    concrete: new THREE.MeshStandardMaterial({ color: '#ffffff', map: plaster, roughness: 0.91 }),
    road: new THREE.MeshStandardMaterial({ color: '#33373a', map: asphalt, roughness: 0.96, metalness: 0.04, bumpMap: asphalt, bumpScale: 0.025 }),
    paving: new THREE.MeshStandardMaterial({ color: '#b5ab97', map: paving, roughness: 0.92, bumpMap: paving, bumpScale: 0.06 }),
    brick: new THREE.MeshStandardMaterial({ color: '#a16b50', map: brick, roughness: 0.9, bumpMap: brick, bumpScale: 0.045 }),
    metal: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.55, metalness: 0.65 }),
    dark: new THREE.MeshStandardMaterial({ color: '#252d2e', roughness: 0.77 }),
    glass: new THREE.MeshStandardMaterial({ color: '#354c55', roughness: 0.23, metalness: 0.6 }),
    warmGlass: new THREE.MeshStandardMaterial({ color: '#898476', emissive: '#ffc57b', emissiveIntensity: 0.04, roughness: 0.4 }),
    foliage: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1 }),
    cloth: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, side: THREE.DoubleSide }),
    paint: new THREE.MeshStandardMaterial({ color: '#eee6d2', roughness: 0.8 }),
    light: new THREE.MeshStandardMaterial({ color: '#e9e0c4', emissive: '#ffd4a0', emissiveIntensity: 0.15 }),
  };
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
      this.ctx.fillStyle = background; this.ctx.fillRect(cx, cy, 512, 128);
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
    const material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.77, emissiveMap: texture, emissive: '#fff2df', emissiveIntensity: 0.16, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(mergeGeometries(this.geometries), material); mesh.castShadow = true; group.add(mesh);
    this.geometries.forEach(geometry => geometry.dispose());
    return material;
  }
}
