import * as THREE from 'three';

/** Static city details share instanced geometry; individual buildings add no draw calls. */
export class CityBatch {
  private buckets = new Map<string, { geometry: THREE.BufferGeometry; material: THREE.Material; matrices: THREE.Matrix4[]; colors: THREE.Color[] }>();
  private matrix = new THREE.Matrix4();
  private rotation = new THREE.Quaternion();
  private position = new THREE.Vector3();
  private scale = new THREE.Vector3();
  private geometries = {
    box: new THREE.BoxGeometry(1, 1, 1),
    cylinder: new THREE.CylinderGeometry(0.5, 0.5, 1, 12),
    cone: new THREE.ConeGeometry(0.5, 1, 12),
    sphere: new THREE.IcosahedronGeometry(0.5, 2),
    lowSphere: new THREE.IcosahedronGeometry(0.5, 1),
    torus: new THREE.TorusGeometry(0.4, 0.1, 6, 16),
    plane: new THREE.PlaneGeometry(1, 1),
    capsule: new THREE.CapsuleGeometry(0.5, 1, 3, 8),
    tube: new THREE.CylinderGeometry(0.5, 0.5, 1, 8, 1, true),
    dome: new THREE.SphereGeometry(0.5, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    pyramid: new THREE.ConeGeometry(0.5, 1, 4),
  };
  constructor(public group: THREE.Group) {}
  add(shape: keyof CityBatch['geometries'], material: THREE.Material, x: number, y: number, z: number, sx: number, sy: number, sz: number, color: THREE.ColorRepresentation = '#ffffff', ry = 0, rx = 0, rz = 0) {
    const key = shape + material.uuid;
    let bucket = this.buckets.get(key);
    if (!bucket) { bucket = { geometry: this.geometries[shape], material, matrices: [], colors: [] }; this.buckets.set(key, bucket); }
    this.rotation.setFromEuler(new THREE.Euler(rx, ry, rz));
    this.matrix.compose(this.position.set(x, y, z), this.rotation, this.scale.set(sx, sy, sz));
    bucket.matrices.push(this.matrix.clone());
    bucket.colors.push(new THREE.Color(color));
  }
  box(material: THREE.Material, x: number, y: number, z: number, sx: number, sy: number, sz: number, color: THREE.ColorRepresentation = '#ffffff', ry = 0) { this.add('box', material, x, y, z, sx, sy, sz, color, ry); }
  cylinder(material: THREE.Material, x: number, y: number, z: number, sx: number, sy: number, sz: number, color: THREE.ColorRepresentation = '#ffffff') { this.add('cylinder', material, x, y, z, sx, sy, sz, color); }
  /** A flat decal lying on the ground - road paint, rangoli, spilled water. */
  decal(material: THREE.Material, x: number, y: number, z: number, sx: number, sz: number, color: THREE.ColorRepresentation = '#ffffff', ry = 0) { this.add('plane', material, x, y, z, sx, sz, 1, color, 0, -Math.PI / 2, ry); }
  /** A wall-facing panel - posters, notice boards, painted advertisements. */
  panel(material: THREE.Material, x: number, y: number, z: number, sx: number, sy: number, color: THREE.ColorRepresentation = '#ffffff', ry = 0) { this.add('plane', material, x, y, z, sx, sy, 1, color, ry); }
  line(material: THREE.Material, a: THREE.Vector3, b: THREE.Vector3, thickness: number, color: THREE.ColorRepresentation = '#ffffff') {
    const key = 'cylinder' + material.uuid;
    let bucket = this.buckets.get(key);
    if (!bucket) { bucket = { geometry: this.geometries.cylinder, material, matrices: [], colors: [] }; this.buckets.set(key, bucket); }
    const delta = new THREE.Vector3().subVectors(b, a);
    this.rotation.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.clone().normalize());
    this.matrix.compose(a.clone().add(b).multiplyScalar(0.5), this.rotation, this.scale.set(thickness, delta.length(), thickness));
    bucket.matrices.push(this.matrix.clone()); bucket.colors.push(new THREE.Color(color));
  }
  finish() {
    for (const bucket of this.buckets.values()) {
      const mesh = new THREE.InstancedMesh(bucket.geometry, bucket.material, bucket.matrices.length);
      bucket.matrices.forEach((matrix, index) => { mesh.setMatrixAt(index, matrix); mesh.setColorAt(index, bucket.colors[index]); });
      mesh.castShadow = true; mesh.receiveShadow = true;
      mesh.computeBoundingSphere();
      this.group.add(mesh);
    }
    this.buckets.clear();
  }
}

export function seededRandom(seed: number) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
