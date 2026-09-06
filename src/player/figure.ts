import * as T from 'three';
import { contactShadowGeometry, contactShadowMaterial } from '../world/materials';
import {
  RIG, geo, createPose, solvePose,
  type Accessory, type Action, type HairStyle, type Outfit, type Pose,
} from './anatomy';

/* ------------------------------------------------------------------ */
/* Shared joint solver                                                 */
/* ------------------------------------------------------------------ */

export interface Skeleton {
  root: T.Matrix4; pelvis: T.Matrix4; torso: T.Matrix4; neck: T.Matrix4;
  shoulder: [T.Matrix4, T.Matrix4]; elbow: [T.Matrix4, T.Matrix4];
  hip: [T.Matrix4, T.Matrix4]; knee: [T.Matrix4, T.Matrix4]; ankle: [T.Matrix4, T.Matrix4];
}

export function createSkeleton(): Skeleton {
  const m = () => new T.Matrix4();
  return {
    root: m(), pelvis: m(), torso: m(), neck: m(),
    shoulder: [m(), m()], elbow: [m(), m()],
    hip: [m(), m()], knee: [m(), m()], ankle: [m(), m()],
  };
}

const _euler = new T.Euler();
const _quaternion = new T.Quaternion();
const _position = new T.Vector3();
const _scale = new T.Vector3();

function node(out: T.Matrix4, parent: T.Matrix4 | null, x: number, y: number, z: number, rx: number, ry: number, rz: number, scale = 1) {
  _euler.set(rx, ry, rz, 'YXZ');
  _quaternion.setFromEuler(_euler);
  out.compose(_position.set(x, y, z), _quaternion, _scale.setScalar(scale));
  if (parent) out.premultiply(parent);
  return out;
}

export interface RootTransform { x: number; y: number; z: number; heading: number; scale: number; headScale: number; }

/** Walks the joint chain once and leaves every bone in world space. */
export function solveSkeleton(skeleton: Skeleton, pose: Pose, root: RootTransform) {
  const s = root.scale;
  node(skeleton.root, null, root.x, root.y, root.z, 0, root.heading, 0, s);
  node(skeleton.pelvis, skeleton.root, 0, RIG.hipY + pose.rootLift, 0, 0, pose.rootYaw, pose.rootRoll);
  node(skeleton.torso, skeleton.pelvis, 0, RIG.waistY - RIG.hipY, 0, pose.spine, pose.spineTwist, pose.spineSide);
  node(skeleton.neck, skeleton.torso, 0, RIG.neckY - RIG.waistY, 0.006, pose.neck, pose.headYaw, pose.headRoll, root.headScale);
  for (let i = 0; i < 2; i++) {
    const side = i === 0 ? 1 : -1;
    node(skeleton.shoulder[i], skeleton.torso, side * RIG.shoulderX, RIG.shoulderY - RIG.waistY, 0,
      pose.shoulder[i], pose.shoulderTwist[i], pose.shoulderOut[i]);
    node(skeleton.elbow[i], skeleton.shoulder[i], 0, -RIG.upperArm, 0, pose.elbow[i], 0, 0);
    node(skeleton.hip[i], skeleton.pelvis, side * RIG.hipX, -0.02, 0, pose.hip[i], 0, pose.hipOut[i]);
    node(skeleton.knee[i], skeleton.hip[i], 0, -RIG.thigh, 0, pose.knee[i], 0, 0);
    node(skeleton.ankle[i], skeleton.knee[i], 0, -RIG.shin, 0, pose.ankle[i], 0, 0);
  }
  return skeleton;
}

/* ------------------------------------------------------------------ */
/* Instanced crowd meshes                                              */
/* ------------------------------------------------------------------ */

class Slot {
  mesh: T.InstancedMesh;
  used = 0;
  constructor(geometry: T.BufferGeometry, material: T.Material, capacity: number, parent: T.Group, castShadow = true) {
    this.mesh = new T.InstancedMesh(geometry, material, capacity);
    this.mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
    this.mesh.castShadow = castShadow;
    this.mesh.receiveShadow = true;
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    parent.add(this.mesh);
  }
  write(matrix: T.Matrix4, color: T.Color) {
    if (this.used >= this.mesh.instanceMatrix.count) return;
    this.mesh.setMatrixAt(this.used, matrix);
    this.mesh.setColorAt(this.used, color);
    this.used++;
  }
  flush() {
    this.mesh.count = this.used;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    this.used = 0;
  }
}

export interface CrowdMeshOptions {
  capacity: number; detail: number; hairStyles: HairStyle[]; accessories: Accessory[];
  /** Override every body material - used by the night apparitions. */
  material?: T.Material;
  /** Apparitions cast no shadow and need no contact patch. */
  grounded?: boolean;
}

/**
 * One instanced mesh per body part and per visible variant. The whole street -
 * every hairstyle, saree, satchel and pair of sandals - is a couple of dozen
 * draw calls.
 */
export class CrowdMeshes {
  group = new T.Group();
  skin: Slot; features: Slot; torsoM: Slot; torsoF: Slot; sash: Slot;
  hair = new Map<HairStyle, Slot>();
  prop = new Map<Accessory, Slot>();
  skirt = new Map<'skirt' | 'dhoti', Slot>();
  armU: [Slot, Slot]; armL: [Slot, Slot];
  thigh: [Slot, Slot]; shin: [Slot, Slot]; foot: [Slot, Slot];
  shadow: Slot;
  private materials: T.Material[] = [];

  constructor(private options: CrowdMeshOptions) {
    const { capacity, detail } = options;
    this.group.name = 'Navapur crowd';
    const make = (roughness: number, metalness = 0) => {
      if (options.material) return options.material;
      const material = new T.MeshStandardMaterial({ vertexColors: true, roughness, metalness });
      this.materials.push(material);
      return material;
    };
    const grounded = options.grounded !== false;
    const skinMaterial = make(0.58);
    const clothMaterial = make(0.92);
    const hairMaterial = make(0.66);
    const shoeMaterial = make(0.72, 0.05);
    const slot = (geometry: T.BufferGeometry, material: T.Material, cap = capacity) => new Slot(geometry, material, cap, this.group, grounded);

    this.skin = slot(geo.head(detail), skinMaterial);
    this.features = new Slot(geo.features(detail), skinMaterial, capacity, this.group, false);
    this.torsoM = slot(geo.torso(false, detail), clothMaterial);
    this.torsoF = slot(geo.torso(true, detail), clothMaterial);
    this.sash = slot(geo.sash(detail), clothMaterial, Math.ceil(capacity * 0.6));
    for (const style of options.hairStyles) this.hair.set(style, new Slot(geo.hair(style, detail), hairMaterial, Math.ceil(capacity * 0.55), this.group, false));
    for (const kind of options.accessories) if (kind !== 'none') this.prop.set(kind, slot(geo.prop(kind, detail), clothMaterial, Math.ceil(capacity * 0.35)));
    for (const style of ['skirt', 'dhoti'] as const) this.skirt.set(style, slot(geo.skirt(style, detail), clothMaterial, Math.ceil(capacity * 0.7)));
    this.armU = [slot(geo.upperArm('short', detail), clothMaterial), slot(geo.upperArm('short', detail), clothMaterial)];
    this.armL = [slot(geo.foreArm(detail), skinMaterial), slot(geo.foreArm(detail), skinMaterial)];
    this.thigh = [slot(geo.thigh(detail), clothMaterial), slot(geo.thigh(detail), clothMaterial)];
    this.shin = [slot(geo.shin(detail), clothMaterial), slot(geo.shin(detail), clothMaterial)];
    this.foot = [slot(geo.foot(detail), shoeMaterial), slot(geo.foot(detail), shoeMaterial)];
    this.shadow = new Slot(contactShadowGeometry(), contactShadowMaterial(), capacity, this.group, false);
    this.shadow.mesh.receiveShadow = false;
    this.shadow.mesh.renderOrder = 1;
    this.shadow.mesh.visible = grounded;
  }

  get detail() { return this.options.detail; }

  flush() {
    this.skin.flush(); this.features.flush(); this.torsoM.flush(); this.torsoF.flush(); this.sash.flush();
    this.hair.forEach(slot => slot.flush());
    this.prop.forEach(slot => slot.flush());
    this.skirt.forEach(slot => slot.flush());
    this.shadow.flush();
    for (let i = 0; i < 2; i++) { this.armU[i].flush(); this.armL[i].flush(); this.thigh[i].flush(); this.shin[i].flush(); this.foot[i].flush(); }
  }

  dispose() {
    this.group.traverse(object => { if ((object as T.InstancedMesh).isInstancedMesh) (object as T.InstancedMesh).dispose(); });
    this.materials.forEach(material => material.dispose());
    this.group.clear();
  }
}

const _color = new T.Color();
const _propMatrix = new T.Matrix4();
const _offset = new T.Matrix4();
const _shadowScale = new T.Vector3();

/** Writes one posed person into the shared instanced meshes. */
export function writePerson(meshes: CrowdMeshes, skeleton: Skeleton, outfit: Outfit, root?: RootTransform) {
  const detail = meshes.detail;
  if (root) {
    // A soft patch on the ground, so nobody floats when real shadows are off.
    _offset.makeRotationY(root.heading);
    _offset.scale(_shadowScale.set(0.95 * root.scale, 1, 1.25 * root.scale));
    _offset.setPosition(root.x, root.y + 0.035, root.z);
    meshes.shadow.write(_offset, _color.setRGB(1, 1, 1));
  }
  meshes.skin.write(skeleton.neck, _color.set(outfit.skin));
  if (detail > 0) meshes.features.write(skeleton.neck, _color.setRGB(1, 1, 1));
  const hair = meshes.hair.get(outfit.hair);
  if (hair) hair.write(skeleton.neck, _color.set(outfit.hair === 'wrap' || outfit.hair === 'turban' ? outfit.shirt : outfit.hairColor));
  (outfit.female ? meshes.torsoF : meshes.torsoM).write(skeleton.torso, _color.set(outfit.shirt));
  if (outfit.sash) meshes.sash.write(skeleton.torso, _color.set(outfit.sash));
  if (outfit.garment && (outfit.legs === 'skirt' || outfit.legs === 'dhoti')) {
    const skirt = meshes.skirt.get(outfit.legs);
    if (skirt) skirt.write(skeleton.pelvis, _color.set(outfit.garment));
  }
  const sleeveColor = outfit.sleeve === 'none' ? outfit.skin : outfit.shirt;
  const legColor = outfit.legs === 'short' ? outfit.skin : outfit.legColor;
  const shinColor = outfit.legs === 'short' || outfit.legs === 'dhoti' || outfit.legs === 'skirt' ? outfit.skin : outfit.legColor;
  for (let i = 0; i < 2; i++) {
    meshes.armU[i].write(skeleton.shoulder[i], _color.set(sleeveColor));
    meshes.armL[i].write(skeleton.elbow[i], _color.set(outfit.skin));
    meshes.thigh[i].write(skeleton.hip[i], _color.set(legColor));
    meshes.shin[i].write(skeleton.knee[i], _color.set(shinColor));
    meshes.foot[i].write(skeleton.ankle[i], _color.set(outfit.shoe));
  }
  if (outfit.accessory !== 'none') {
    const prop = meshes.prop.get(outfit.accessory);
    if (prop) {
      const carriedOnHead = outfit.accessory === 'basket';
      _offset.makeTranslation(carriedOnHead ? 0 : 0.01, carriedOnHead ? 0.24 : -RIG.foreArm - 0.075, carriedOnHead ? 0 : 0.03);
      _propMatrix.multiplyMatrices(carriedOnHead ? skeleton.neck : skeleton.elbow[1], _offset);
      prop.write(_propMatrix, _color.set(outfit.accessory === 'umbrella' ? '#2c3b44' : outfit.accessory === 'phone' ? '#ffffff' : outfit.shirt));
    }
  }
}

/* ------------------------------------------------------------------ */
/* Hierarchical figure (player and close-up characters)                */
/* ------------------------------------------------------------------ */

interface Joint { object: T.Object3D; }

/**
 * The player avatar uses the same rig as the crowd but as a real object
 * hierarchy, so it can be lit with a nicer material set, carry props and be
 * inspected from thirty centimetres away in first person.
 */
export class HumanFigure {
  group = new T.Group();
  pose: Pose = createPose();
  phase = 0;
  private joints: Record<string, Joint> = {};
  private materials: T.Material[] = [];
  private torsoMesh: T.Mesh;
  private meshes: T.Mesh[] = [];

  constructor(public outfit: Outfit, detail = 2) {
    const d = detail;
    const standard = (color: string, roughness: number, extra: Partial<T.MeshPhysicalMaterialParameters> = {}) => {
      const material = new T.MeshPhysicalMaterial({ color, roughness, ...extra });
      this.materials.push(material);
      return material;
    };
    const skin = standard(outfit.skin, 0.56, { sheen: 0.22, sheenRoughness: 0.75, sheenColor: new T.Color('#ffd9c4') });
    const cloth = standard(outfit.shirt, 0.94, { sheen: 0.45, sheenRoughness: 0.85, sheenColor: new T.Color('#ffffff') });
    const legCloth = standard(outfit.legs === 'short' ? outfit.skin : outfit.legColor, 0.93, { sheen: 0.3 });
    const shinCloth = standard(outfit.legs === 'trouser' ? outfit.legColor : outfit.skin, outfit.legs === 'trouser' ? 0.93 : 0.56);
    const hairMaterial = standard(outfit.hair === 'turban' || outfit.hair === 'wrap' ? outfit.shirt : outfit.hairColor, 0.5, { clearcoat: 0.25, clearcoatRoughness: 0.4 });
    const shoe = standard(outfit.shoe, 0.62);
    const featureMaterial = standard('#ffffff', 0.5);
    featureMaterial.vertexColors = true;
    const garment = standard(outfit.garment || outfit.shirt, 0.95, { sheen: 0.6, sheenColor: new T.Color('#fff3e0') });

    const joint = (name: string, parent: T.Object3D, x = 0, y = 0, z = 0) => {
      const object = new T.Object3D();
      object.position.set(x, y, z);
      parent.add(object);
      this.joints[name] = { object };
      return object;
    };
    const mesh = (geometry: T.BufferGeometry, material: T.Material, parent: T.Object3D, x = 0, y = 0, z = 0) => {
      const item = new T.Mesh(geometry, material);
      item.position.set(x, y, z);
      item.castShadow = true; item.receiveShadow = true;
      parent.add(item);
      this.meshes.push(item);
      return item;
    };

    this.group.scale.setScalar(outfit.scale);
    const shadow = new T.Mesh(contactShadowGeometry(), contactShadowMaterial());
    shadow.scale.set(0.95, 1, 1.25);
    shadow.position.y = 0.035;
    shadow.renderOrder = 1;
    this.group.add(shadow);
    const pelvis = joint('pelvis', this.group, 0, RIG.hipY, 0);
    const torso = joint('torso', pelvis, 0, RIG.waistY - RIG.hipY, 0);
    const neck = joint('neck', torso, 0, RIG.neckY - RIG.waistY, 0.006);
    neck.scale.setScalar(outfit.headScale);

    this.torsoMesh = mesh(geo.torso(outfit.female, d), cloth, torso);
    if (outfit.sash) mesh(geo.sash(d), standard(outfit.sash, 0.95, { sheen: 0.7 }), torso, 0, 0.02, 0);
    if (outfit.legs === 'skirt' || outfit.legs === 'dhoti') mesh(geo.skirt(outfit.legs, d), garment, pelvis);
    mesh(geo.head(d), skin, neck);
    mesh(geo.features(d), featureMaterial, neck);
    mesh(geo.hair(outfit.hair, d), hairMaterial, neck);

    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? 1 : -1;
      const shoulder = joint(`shoulder${i}`, torso, side * RIG.shoulderX, RIG.shoulderY - RIG.waistY, 0);
      mesh(geo.upperArm(outfit.sleeve, d), outfit.sleeve === 'none' ? skin : cloth, shoulder);
      const elbow = joint(`elbow${i}`, shoulder, 0, -RIG.upperArm, 0);
      mesh(geo.foreArm(d), skin, elbow);
      const hip = joint(`hip${i}`, pelvis, side * RIG.hipX, -0.02, 0);
      mesh(geo.thigh(d), legCloth, hip);
      const knee = joint(`knee${i}`, hip, 0, -RIG.thigh, 0);
      mesh(geo.shin(d), shinCloth, knee);
      const ankle = joint(`ankle${i}`, knee, 0, -RIG.shin, 0);
      mesh(geo.foot(d), shoe, ankle);
    }
    if (outfit.accessory !== 'none') {
      const parent = outfit.accessory === 'basket' ? neck : this.joints.elbow1.object;
      const item = mesh(geo.prop(outfit.accessory, d), standard(outfit.accessory === 'umbrella' ? '#2c3b44' : outfit.shirt, 0.9), parent);
      item.position.set(outfit.accessory === 'basket' ? 0 : 0.01, outfit.accessory === 'basket' ? 0.24 : -RIG.foreArm - 0.075, outfit.accessory === 'basket' ? 0 : 0.03);
    }
  }

  /** Recolours the shirt when the player changes clothes in the wardrobe panel. */
  setShirtColor(color: string) {
    this.outfit.shirt = color;
    (this.torsoMesh.material as T.MeshPhysicalMaterial).color.set(color);
  }

  update(dt: number, speed: number, action: Action, time: number, headingDelta = 0, crouch = 0) {
    const walk = T.MathUtils.clamp(speed / 3.4, 0, 1);
    const run = T.MathUtils.clamp((speed - 3.6) / 3.6, 0, 1);
    // Stride length scales with speed so the feet stay planted instead of skating.
    const cadence = speed > 0.05 ? (speed / (0.78 + run * 0.5)) * Math.PI : 0;
    this.phase = (this.phase + (cadence || 0) * dt) % (Math.PI * 2);
    if (speed <= 0.05) this.phase += dt * 0.0;
    solvePose(this.pose, this.phase, walk, run, time, 1.7, action);
    const p = this.pose;

    const set = (name: string, rx: number, ry: number, rz: number) => {
      const joint = this.joints[name];
      if (joint) joint.object.rotation.set(rx, ry, rz);
    };
    if (crouch > 0) {
      for (let i = 0; i < 2; i++) { p.hip[i] += crouch * 0.95; p.knee[i] += crouch * 1.6; p.ankle[i] -= crouch * 0.55; }
      p.spine += crouch * 0.22;
    }
    this.joints.pelvis.object.position.y = RIG.hipY + p.rootLift - crouch * 0.32;
    set('pelvis', 0, p.rootYaw - headingDelta * 0.4, p.rootRoll);
    set('torso', p.spine, p.spineTwist, p.spineSide);
    set('neck', p.neck, p.headYaw + headingDelta * 0.8, p.headRoll);
    for (let i = 0; i < 2; i++) {
      set(`shoulder${i}`, p.shoulder[i], p.shoulderTwist[i], p.shoulderOut[i]);
      set(`elbow${i}`, p.elbow[i], 0, 0);
      set(`hip${i}`, p.hip[i], 0, p.hipOut[i]);
      set(`knee${i}`, p.knee[i], 0, 0);
      set(`ankle${i}`, p.ankle[i], 0, 0);
    }
  }

  dispose() {
    this.materials.forEach(material => material.dispose());
    this.meshes.length = 0;
  }
}
