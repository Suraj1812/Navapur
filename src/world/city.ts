import * as THREE from 'three';
import type { Collider, Place, World } from '../core/types';
import type { QualityProfile } from '../render/quality';
import { CityBatch, seededRandom } from './batch';
import { building, type BuildingSpec } from './buildings';
import { blockDistrict, districts, storefronts, type Storefront } from './data';
import { createMaterials, SignAtlas } from './materials';
import {
  acUnit, barricade, bench, bunting, busShelter, cableKnot, cycleRack, dustbin, foodStall, handCart,
  backCourt, hoarding, laundryLine, marketCart, median, paanShop, posterWall, potPlant, rangoli, scaffolding,
  speedBreaker, streetLamp, trafficSignal, tree, tyreStack, utilityWires, waterTank, type TreeKind,
} from './props';

const ROADS = [-144, -72, 0, 72, 144];

export function createWorld(profile: QualityProfile): World {
  const group = new THREE.Group(); group.name = 'Navapur — procedural city';
  const random = seededRandom(84172); const materials = createMaterials(profile);
  const colliders: Collider[] = []; const places: Place[] = [];
  const batch = new CityBatch(group, colliders); const signs = new SignAtlas();
  const lamps: THREE.Mesh[] = []; const signals: THREE.Mesh[] = [];
  let lampBudget = profile.lampLights;
  const addPlace = (id: string, name: string, hindi: string, kind: Place['kind'], district: string, x: number, z: number) => {
    places.push({ id, name, hindi, kind, district, x, z, entrance: { x, z } });
  };

  /* -------------------------------------------------- ground & roads */
  // Big flat areas get their own meshes at a true texel density; instancing a
  // unit cube here would stretch one tile across sixty metres.
  const surface = (material: THREE.Material, size: number, y: number, x = 0, z = 0, tint?: string) => {
    const geometry = new THREE.PlaneGeometry(size, size);
    geometry.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.receiveShadow = true;
    if (tint) (material as THREE.MeshStandardMaterial).color.set(tint);
    group.add(mesh);
    return mesh;
  };
  const groundMaterial = materials.scaled(materials.dirt, 260);
  const roadSurface = materials.scaled(materials.road, 92);
  const pavingSurface = materials.scaled(materials.paving, 29);
  const courtSurface = materials.scaled(materials.concrete, 24);
  courtSurface.color.set('#9a9b86');
  surface(groundMaterial, 1900, -0.06);
  surface(roadSurface, 368, 0.015);

  for (let iz = 0; iz < 4; iz++) for (let ix = 0; ix < 4; ix++) {
    const cx = ROADS[ix] + 36; const cz = ROADS[iz] + 36;
    batch.box(materials.paving, cx, 0.06, cz, 58, 0.12, 58);
    surface(pavingSurface, 58, 0.121, cx, cz);
    batch.box(materials.concrete, cx, 0.09, cz, 47.8, 0.12, 47.8, '#9a9b86');
    surface(courtSurface, 47.8, 0.151, cx, cz);
    // Painted curb stones, storm drains and footpath joints.
    for (let edge = 0; edge < 4; edge++) for (let stone = 0; stone < 29; stone++) {
      const along = -28 + stone * 2;
      const x = edge < 2 ? cx + along : cx + (edge === 2 ? -29 : 29);
      const z = edge < 2 ? cz + (edge === 0 ? -29 : 29) : cz + along;
      batch.box(materials.concrete, x, 0.135, z, edge < 2 ? 1.98 : 0.18, 0.27, edge < 2 ? 0.18 : 1.98, stone % 2 ? '#d4c497' : '#575951');
      if (stone % 10 === 4) {
        batch.box(materials.dark, x, 0.022, z, edge < 2 ? 0.8 : 0.35, 0.025, edge < 2 ? 0.35 : 0.8);
        batch.add('cylinder', materials.metal, x, 0.145, z, 0.62, 0.03, 0.62, '#5c635c');
      }
    }
  }

  for (const road of ROADS) {
    batch.box(materials.paving, road, 0.04, -155, 14, 0.08, 8);
    batch.box(materials.paving, road, 0.04, 155, 14, 0.08, 8);
    batch.box(materials.paving, -155, 0.04, road, 8, 0.08, 14);
    batch.box(materials.paving, 155, 0.04, road, 8, 0.08, 14);
    for (let along = -178; along <= 178; along += 7) {
      if (ROADS.some(c => Math.abs(c - along) < 13)) continue;
      batch.box(materials.paint, road, 0.034, along, 0.12, 0.016, 3, '#e5d49c');
      batch.box(materials.paint, along, 0.034, road, 3, 0.016, 0.12, '#e5d49c');
    }
    for (const crossing of ROADS) {
      for (const side of [-1, 1]) for (let stripe = -5; stripe <= 5; stripe += 2) {
        batch.box(materials.paint, road + stripe, 0.041, crossing + side * 10, 0.94, 0.025, 2.45);
        batch.box(materials.paint, crossing + side * 10, 0.043, road + stripe, 2.45, 0.025, 0.94);
      }
      batch.box(materials.paint, road + 3.5, 0.037, crossing + 12.5, 5.65, 0.019, 0.28);
      batch.box(materials.paint, road - 3.5, 0.037, crossing - 12.5, 5.65, 0.019, 0.28);
      // Signals face oncoming traffic on the two busiest approaches.
      if (Math.abs(road) <= 72 && Math.abs(crossing) <= 72) {
        trafficSignal(batch, materials, road + 9.4, crossing + 9.4, Math.PI, signals);
        trafficSignal(batch, materials, road - 9.4, crossing - 9.4, 0, signals);
      }
    }
    // Speed breakers before every school and market crossing, and a painted median.
    for (const segment of ROADS) {
      if (Math.abs(road) > 72 || Math.abs(segment) > 72) continue;
      speedBreaker(batch, materials, road, segment + 30, false);
      speedBreaker(batch, materials, segment + 30, road, true);
    }
    for (let segment = 0; segment < 4; segment++) {
      // Only the arterial roads are divided; the old bazaar street stays open.
      if (Math.abs(road) !== 72) continue;
      median(batch, materials, road, ROADS[segment] + 16, road, ROADS[segment] + 56, random);
      median(batch, materials, ROADS[segment] + 16, road, ROADS[segment] + 56, road, random);
    }
  }

  /* -------------------------------------------------- blocks */
  const earthPalette = ['#a89a7e', '#bdb298', '#9a836a', '#b5a07f', '#8b9a92', '#aca592', '#b6ab99', '#98a094', '#a98f78', '#c0a684'];
  const treeKinds: TreeKind[] = ['neem', 'gulmohar', 'ashoka', 'banyan', 'palm'];
  let buildingIndex = 0;
  const addBuilding = (spec: Omit<BuildingSpec, 'index'>) => building(batch, materials, signs, colliders, places, { ...spec, index: buildingIndex++ }, random);
  const institution = (title: string, hindi: string, kind: Place['kind'], caption: string, color: string): Storefront => ({ title, hindi, kind, caption, color, owner: 'Navapur Civic Trust' });
  const school = institution('Vidya Public School', 'विद्या पब्लिक स्कूल', 'school', 'LEARN • DISCOVER • GROW', '#5a6656');
  const hospital = institution('Navapur City Hospital', 'नवापुर सिटी अस्पताल', 'hospital', 'EMERGENCY • OPD • COMMUNITY CARE', '#527268');
  const police = institution('Navapur Police', 'नवापुर पुलिस', 'police', 'CIVIC QUARTER • SERVICE & SAFETY', '#4d6071');
  const office = institution('Naya Business Centre', 'नया व्यापार केंद्र', 'office', 'WORKSPACES • LOCAL ENTERPRISE', '#52666b');
  const station = institution('Navapur Junction', 'नवापुर जंक्शन', 'station', 'CITY BUS TERMINAL • LOCAL CONNECTIONS', '#63624f');

  for (let iz = 0; iz < 4; iz++) for (let ix = 0; ix < 4; ix++) {
    const left = ROADS[ix]; const top = ROADS[iz]; const district = blockDistrict(ix, iz);
    const cx = left + 36; const cz = top + 36;

    if (district.id === 'park') {
      buildPark(batch, materials, signs, group, cx, cz, top, random, colliders);
      addPlace('nehru-gardens', 'Nehru Gardens', 'नेहरू उद्यान', 'park', district.name, cx, top + 10.5);
      continue;
    }

    const market = district.id === 'market'; const modern = ['downtown', 'shopping'].includes(district.id);
    const homes = ['residential', 'suburb'].includes(district.id);
    const layout = [
      { x: left + 12, z: top + 20, width: 15.4, depth: 14, angle: -Math.PI / 2 },
      { x: left + 12, z: top + 36, width: 15.4, depth: 14, angle: -Math.PI / 2 },
      { x: left + 12, z: top + 52, width: 15.4, depth: 14, angle: -Math.PI / 2 },
      { x: left + 60, z: top + 20, width: 15.4, depth: 14, angle: Math.PI / 2 },
      { x: left + 60, z: top + 36, width: 15.4, depth: 14, angle: Math.PI / 2 },
      { x: left + 60, z: top + 52, width: 15.4, depth: 14, angle: Math.PI / 2 },
      { x: left + 36, z: top + 12, width: 19.1, depth: 13, angle: Math.PI },
      { x: left + 36, z: top + 60, width: 19.1, depth: 13, angle: 0 },
    ];
    if (ix === 2 && iz === 2) { layout[1].z = top + 35.7; }
    for (let slot = 0; slot < layout.length; slot++) {
      const base = layout[slot];
      let height = 3.85 + (market ? 2 + Math.floor(random() * 3) : modern ? 4 + Math.floor(random() * 7) : homes ? 1 + Math.floor(random() * 3) : 2 + Math.floor(random() * 3)) * 3.2;
      if (district.id === 'industrial') height = 5.4 + Math.floor(random() * 2) * 3.2;
      if (district.id === 'suburb') height = 7.05;
      let shop: Storefront | undefined = homes ? undefined : storefronts[(slot + ix * 3 + iz * 5) % storefronts.length];
      if (ix === 2 && iz === 2 && slot < 3) shop = storefronts[slot];
      if (district.id === 'government' && slot === 6) shop = iz === 0 ? hospital : police;
      if (district.id === 'education' && slot === 6) shop = school;
      if (district.id === 'downtown' && (slot === 6 || slot === 7)) shop = office;
      if (district.id === 'transport' && slot === 6) shop = station;
      const enterable = (!!shop && (market || slot === 6 || slot === 1)) || (homes && slot === 1);
      addBuilding({ ...base, height, color: earthPalette[Math.floor(random() * earthPalette.length)], district: district.name, shop, enterable, modern, residential: homes });

      const facing = { x: base.x + Math.sin(base.angle), z: base.z + Math.cos(base.angle) };
      if (homes) {
        const ex = base.x + Math.sin(base.angle) * 1.2; const ez = base.z + Math.cos(base.angle) * 1.2;
        addPlace(`home-${ix}-${iz}-${slot}`, `${district.id === 'suburb' ? 'Shanti Villa' : 'Gulmohar Apartments'} ${slot + 1}`, 'अपना घर', 'home', district.name, ex, ez);
        if (enterable) places[places.length - 1].interior = { x: base.x - Math.sin(base.angle) * 3.7, z: base.z - Math.cos(base.angle) * 3.7 };
        // A doorstep rangoli, a potted tulsi and somebody's washing.
        if (slot % 2 === 0) rangoli(batch, materials, facing.x + Math.sin(base.angle) * 1.5, facing.z + Math.cos(base.angle) * 1.5, 0.85);
        potPlant(batch, materials, base.x + Math.sin(base.angle) * 1.9 + Math.cos(base.angle) * 2, 0.14, base.z + Math.cos(base.angle) * 1.9 - Math.sin(base.angle) * 2, 0.9);
      }
      if (market && slot % 3 === 0) {
        const px = base.x + Math.sin(base.angle) * 2.65; const pz = base.z + Math.cos(base.angle) * 2.65;
        marketCart(batch, materials, px, pz + 4.8, base.angle, random, slot === 0);
      }
      if (market && slot === 4) foodStall(batch, materials, base.x + Math.sin(base.angle) * 3.4, base.z + Math.cos(base.angle) * 3.4 - 3, base.angle, random() > 0.5 ? '#8c4a34' : '#3f6a58');
      if (market && slot === 7) paanShop(batch, materials, base.x + Math.sin(base.angle) * 3.2 + 4, base.z + Math.cos(base.angle) * 3.2, base.angle);
      if (!homes && slot % 4 === 1) {
        posterWall(batch, materials, base.x + Math.sin(base.angle) * 0.14 + Math.cos(base.angle) * (base.width / 2 - 1.4), 2.0,
          base.z + Math.cos(base.angle) * 0.14 - Math.sin(base.angle) * (base.width / 2 - 1.4), base.angle, random, 3);
      }
      if (district.id === 'shopping' && slot === 3) cycleRack(batch, materials, base.x + Math.sin(base.angle) * 3.6, base.z + Math.cos(base.angle) * 3.6 + 3.5, base.angle + Math.PI / 2, 4);
      if (district.id === 'industrial' && slot === 2) { tyreStack(batch, materials, base.x + Math.sin(base.angle) * 3, base.z + Math.cos(base.angle) * 3 + 2, 5); handCart(batch, materials, base.x + Math.sin(base.angle) * 3.4, base.z + Math.cos(base.angle) * 3.4 - 3, base.angle); }
      if (slot === 5 && random() < 0.35) scaffolding(batch, materials, base.x + Math.sin(base.angle) * 0.85, base.z + Math.cos(base.angle) * 0.85, base.width - 1.6, Math.min(height, 9), base.angle);
      if (!homes && slot % 3 === 2) dustbin(batch, materials, base.x + Math.sin(base.angle) * 3.5 + Math.cos(base.angle) * 6, base.z + Math.cos(base.angle) * 3.5 - Math.sin(base.angle) * 6);
    }

    // The inside of the block is a working yard, not an empty plaza.
    backCourt(batch, materials, cx, cz, random, district.id === 'industrial');
    if (district.id !== 'industrial') {
      tree(batch, materials, cx - 6, cz + 6, 6.5 + random() * 2.5, random, treeKinds[Math.floor(random() * treeKinds.length)]);
      bench(batch, materials, cx + 6.5, cz - 2, Math.PI / 2);
      if (market) bunting(batch, materials, cx - 14, cz - 4, cx + 14, cz - 4, 6.4);
    } else {
      for (let stack = 0; stack < 5; stack++) batch.box(materials.corrugated, cx - 6 + stack * 3, 1.4, cz, 2.7, 2.6, 6.5, ['#966a4d', '#647872', '#807961'][stack % 3]);
      batch.add('cylinder', materials.brick, cx + 6, 10, cz + 6, 1.4, 20, 1.4);
      batch.add('cylinder', materials.dark, cx + 6, 20.4, cz + 6, 1.5, 0.5, 1.5, '#3c3a35');
      handCart(batch, materials, cx - 9, cz + 8, 0.7);
      barricade(batch, materials, cx + 11, cz - 6, 0.3);
    }
  }

  /* -------------------------------------------------- landmarks */
  buildTemple(batch, materials, signs, group, colliders, addPlace);
  buildMosque(batch, materials, signs, colliders, addPlace);
  buildChurch(batch, materials, colliders, addPlace);
  const ghatSmoke = buildGhat(batch, materials, signs, group, colliders, addPlace, random);

  /* -------------------------------------------------- street furniture */
  for (const road of ROADS) for (let segment = 0; segment < 4; segment++) {
    const start = ROADS[segment];
    for (const offset of [21, 51]) for (const side of [-1, 1]) {
      const allowA = lampBudget-- > 0;
      streetLamp(batch, materials, road + side * 8.15, start + offset, -side * Math.PI / 2, lamps, allowA);
      const allowB = lampBudget-- > 0;
      streetLamp(batch, materials, start + offset, road + side * 8.15, side === 1 ? Math.PI : 0, lamps, allowB);
    }
    if (Math.abs(road) >= 72) for (const side of [-1, 1]) {
      tree(batch, materials, road + side * 10.5, start + 36, 5.3 + random() * 1.5, random, treeKinds[Math.floor(random() * 3)]);
      tree(batch, materials, start + 36, road + side * 10.5, 5.3 + random() * 1.5, random, treeKinds[Math.floor(random() * 3)]);
    }
    if (Math.abs(road) <= 72) {
      utilityWires(batch, materials, road + 8.15, start + 21, road + 8.15, start + 51);
      cableKnot(batch, materials, road + 8.15, 6.6, start + 21);
      if (segment < 3) utilityWires(batch, materials, road + 8.15, start + 51, road + 8.15, start + 93);
    }
  }

  for (const stop of [{ x: -9.8, z: 95, angle: -Math.PI / 2 }, { x: 95, z: 9.8, angle: 0 }, { x: 81.8, z: 111, angle: Math.PI / 2 }, { x: -95, z: -9.8, angle: Math.PI }]) {
    busShelter(batch, materials, stop.x, stop.z, stop.angle);
    signs.add(group, 'Navapur City Bus', 'नवापुर नगर बस', 'FREQUENT LOCAL CONNECTIONS', '#3f6252',
      stop.x + Math.sin(stop.angle) * 1.22, 2.95, stop.z + Math.cos(stop.angle) * 1.22, 5.5, 0.65, stop.angle);
  }
  for (const pos of [{ x: 9, z: 42 }, { x: -9, z: -41 }, { x: 81, z: -30 }, { x: -81, z: 95 }, { x: 42, z: 9 }, { x: -42, z: 81 }]) dustbin(batch, materials, pos.x, pos.z);

  for (const board of [{ x: 26, z: -20, a: 0 }, { x: -26, z: 92, a: Math.PI }, { x: 92, z: 26, a: -Math.PI / 2 }, { x: -92, z: -26, a: Math.PI / 2 }]) {
    hoarding(batch, materials, board.x, board.z, board.a, ['#b8452f', '#2f6b8c', '#d8a02c', '#3f7a4c'][Math.floor(random() * 4)]);
  }

  signs.add(group, 'Welcome to Purana Bazaar', 'पुराना बाज़ार में आपका स्वागत है', 'THE HEART OF NAVAPUR • EST. 1928', '#405e58', -12.1, 5.0, -36, 11, 1.75, Math.PI / 2);
  for (const board of [{ x: 28, z: -12.1, angle: 0 }, { x: -60.1, z: 35, angle: -Math.PI / 2 }]) {
    signs.add(group, 'A little less hurry', 'थोड़ा ठहरिए, चाय पीजिए', 'NAVAPUR • MAKE TIME FOR EVERYDAY LIFE', '#a08460', board.x, 7.4, board.z, 8, 3.6, board.angle);
  }

  /* -------------------------------------------------- horizon */
  if (profile.distantCity) {
    for (let ring = 0; ring < 3; ring++) for (let side = 0; side < 4; side++) for (let i = 0; i < 12; i++) {
      const along = -195 + i * 35 + random() * 8; const away = 203 + ring * 62 + random() * 26;
      const x = side < 2 ? along : (side === 2 ? -away : away); const z = side < 2 ? (side === 0 ? -away : away) : along;
      const height = 15 + random() * (side === 0 ? 78 : 38);
      batch.box(materials.plaster, x, height / 2, z, 16 + random() * 13, height, 16 + random() * 15, earthPalette[i % earthPalette.length]);
      batch.box(materials.concrete, x, height + 0.8, z, 9, 1.6, 9, '#9b9e94');
      if (random() < 0.4) waterTank(batch, materials, x + 4, height + 1.6, z + 3, '#33454f');
      if (random() < 0.3) batch.add('cylinder', materials.metal, x - 5, height + 6, z - 4, 0.2, 12, 0.2, '#7b837c');
    }
  }

  batch.finish();
  const signMaterial = signs.finish(group);

  /* -------------------------------------------------- wet weather */
  const puddleMaterial = new THREE.MeshPhysicalMaterial({ color: '#75868a', metalness: 0.4, roughness: 0.04, transparent: true, opacity: 0, depthWrite: false, clearcoat: 1 });
  const puddleGeometry = new THREE.CircleGeometry(1, 26); puddleGeometry.rotateX(-Math.PI / 2);
  const puddles: THREE.Mesh[] = [];
  for (const p of [{ x: 5.2, z: 29 }, { x: -5.7, z: -33 }, { x: 69, z: 26 }, { x: 23, z: -76 }, { x: -69, z: 112 }, { x: 111, z: 4.5 }, { x: -33, z: 47 }, { x: 76, z: -101 }]) {
    const puddle = new THREE.Mesh(puddleGeometry, puddleMaterial);
    puddle.position.set(p.x, 0.045, p.z);
    puddle.scale.set(1.4 + random(), 1, 3 + random() * 2);
    puddle.receiveShadow = false;
    group.add(puddle); puddles.push(puddle);
  }

  const signalMaterials = signals.map(mesh => mesh.material as THREE.MeshStandardMaterial);

  return {
    group, places, colliders, districts, roadCoordinates: [...ROADS], lamps, signals,
    roadMaterial: materials.road, bounds: 178,
    /**
     * People stand on the ground, not through it. Every block is a raised
     * platform: a kerb at the edge and a slightly higher court inside, with the
     * carriageway between them.
     */
    groundHeight(x, z) {
      for (let iz = 0; iz < 4; iz++) {
        const cz = ROADS[iz] + 36;
        if (Math.abs(z - cz) > 29) continue;
        for (let ix = 0; ix < 4; ix++) {
          const cx = ROADS[ix] + 36;
          if (Math.abs(x - cx) > 29) continue;
          const inside = Math.abs(x - cx) < 23.9 && Math.abs(z - cz) < 23.9;
          return inside ? 0.151 : 0.121;
        }
      }
      return 0.015;
    },
    update(time, weather, elapsed, haunting = 0) {
      ghatSmoke(elapsed, haunting);
      const night = time < 360 || time > 1110; const dusk = time > 1050 && time <= 1110;
      materials.light.emissiveIntensity = (night ? 2.4 : dusk ? 0.95 : 0.15) * (1 - haunting * 0.45);
      materials.warmGlass.emissiveIntensity = night ? 0.62 : dusk ? 0.24 : 0.035;
      materials.neon.emissiveIntensity = night ? 1.6 : dusk ? 0.7 : 0.12;
      if (signMaterial) signMaterial.emissiveIntensity = night ? 0.5 : 0.14;
      for (const lamp of lamps) (lamp.userData.light as THREE.PointLight).intensity = night ? 95 : dusk ? 26 : 0;
      // Signals share the traffic system's own phase so the lights never lie.
      const phase = Math.floor(elapsed / 13) % 2;
      const amber = (elapsed % 13) > 11.6;
      for (let i = 0; i < signals.length; i++) {
        const aspect = signals[i].userData.aspect as number;
        const greenNow = (i % 2 === 0 ? 0 : 1) === phase;
        const active = amber ? aspect === 1 : greenNow ? aspect === 2 : aspect === 0;
        signalMaterials[i].emissiveIntensity = active ? 3.4 : 0.04;
      }
      materials.road.roughness = weather === 'rain' ? 0.16 : 0.95;
      materials.road.metalness = weather === 'rain' ? 0.42 : 0.02;
      materials.paving.roughness = weather === 'rain' ? 0.32 : 0.9;
      puddleMaterial.opacity = weather === 'rain' ? 0.55 : 0;
    },
    setQuality(next) {
      materials.setQuality(next as QualityProfile);
      for (const puddle of puddles) puddle.visible = next.wetSurfaces;
    },
  };
}

/* ------------------------------------------------------------------ */
/* Landmarks                                                           */
/* ------------------------------------------------------------------ */

function buildPark(batch: CityBatch, m: ReturnType<typeof createMaterials>, signs: SignAtlas, group: THREE.Group, cx: number, cz: number, top: number, random: () => number, colliders: Collider[]) {
  batch.box(m.foliage, cx, 0.14, cz, 47.6, 0.12, 47.6, '#6c7c53');
  batch.box(m.paving, cx, 0.22, cz, 3.8, 0.09, 48);
  batch.box(m.paving, cx, 0.22, cz, 48, 0.09, 3.8);

  // Bandstand at the crossing of the two paths.
  batch.add('cylinder', m.marble, cx, 0.47, cz, 10, 0.66, 10, '#ded5c0');
  batch.add('cylinder', m.marble, cx, 0.86, cz, 8.8, 0.14, 8.8, '#cfc6b0');
  for (let column = 0; column < 8; column++) {
    const angle = column / 8 * Math.PI * 2;
    batch.add('cylinder', m.marble, cx + Math.cos(angle) * 3.9, 2.2, cz + Math.sin(angle) * 3.9, 0.26, 2.6, 0.26, '#eae3d2');
  }
  batch.add('cone', m.tile, cx, 4.4, cz, 9.6, 2.2, 9.6, '#a1573c');
  batch.add('sphere', m.metal, cx, 5.8, cz, 0.6, 0.7, 0.6, '#b39a63');
  colliders.push({ minX: cx - 5, maxX: cx + 5, minZ: cz - 5, maxZ: cz + 5 });

  // A pond with a low wall, and a cricket strip where the kids play.
  const px = cx - 13; const pz = cz + 12;
  batch.add('cylinder', m.concrete, px, 0.18, pz, 15.4, 0.36, 12.4, '#b3ab95');
  batch.add('cylinder', m.dirt, px, 0.22, pz, 14, 0.3, 11, '#4a4436');
  const pond = new THREE.Mesh(new THREE.CircleGeometry(1, 30), m.water);
  pond.geometry.rotateX(-Math.PI / 2);
  pond.position.set(px, 0.3, pz); pond.scale.set(6.9, 1, 5.4);
  group.add(pond);
  for (let lily = 0; lily < 7; lily++) {
    batch.decal(m.foliage, px + Math.cos(lily * 2.2) * 4, 0.33, pz + Math.sin(lily * 1.7) * 3, 1.1, 1.1, '#4f7145', lily);
  }
  batch.box(m.dirt, cx + 12, 0.2, cz - 10, 4, 0.06, 20, '#a89272');
  for (const end of [-1, 1]) for (let stump = -1; stump <= 1; stump++) {
    batch.add('cylinder', m.wood, cx + 12 + stump * 0.25, 0.55, cz - 10 + end * 9, 0.05, 0.72, 0.05, '#c8b48e');
  }

  const kinds: TreeKind[] = ['neem', 'gulmohar', 'banyan', 'ashoka', 'palm'];
  for (let t = 0; t < 22; t++) {
    const tx = cx + (t % 5 - 2) * 8.3; const tz = cz + (Math.floor(t / 5) - 1.6) * 9.4;
    if (Math.abs(tx - cx) < 4 || Math.abs(tz - cz) < 4) continue;
    if (Math.hypot(tx - px, tz - pz) < 10) continue;
    tree(batch, m, tx, tz, 5.5 + random() * 3.4, random, kinds[t % kinds.length]);
  }
  for (const side of [-1, 1]) { bench(batch, m, cx + side * 6.5, cz - 7, side * Math.PI / 2); bench(batch, m, cx - 8, cz + side * 7); }
  bench(batch, m, px + 8, pz - 2, Math.PI / 2);
  dustbin(batch, m, cx + 5, cz + 12);
  potPlant(batch, m, cx - 4, 0.14, cz + 12, 1.1);

  for (let edge = 0; edge < 4; edge++) for (let post = -21; post <= 21; post += 2) {
    if (Math.abs(post) < 3) continue;
    const ppx = edge < 2 ? cx + post : cx + (edge === 2 ? -23 : 23);
    const ppz = edge < 2 ? cz + (edge === 0 ? -23 : 23) : cz + post;
    batch.box(m.metal, ppx, 0.92, ppz, 0.07, 1.55, 0.07, '#4b5c4a');
    if (post % 6 === 0) batch.box(m.metal, ppx, 1.62, ppz, edge < 2 ? 6 : 0.07, 0.07, edge < 2 ? 0.07 : 6, '#4b5c4a');
  }
  signs.add(group, 'Nehru Gardens', 'नेहरू उद्यान', 'OPEN DAILY • WALK • BREATHE • BELONG', '#46614b', cx, 2.65, top + 12, 8, 1.5, 0);
}

function buildTemple(batch: CityBatch, m: ReturnType<typeof createMaterials>, signs: SignAtlas, group: THREE.Group, colliders: Collider[], addPlace: (id: string, name: string, hindi: string, kind: Place['kind'], district: string, x: number, z: number) => void) {
  const x = -36; const z = 165;
  batch.box(m.marble, x, 0.18, z, 20, 0.34, 20, '#e5dcc6');
  for (let step = 0; step < 3; step++) batch.box(m.marble, x, 0.34 + step * 0.16, z + 6.4 - step * 0.4, 11 - step, 0.16, 1.2, '#efe7d3');
  batch.box(m.plaster, x, 2.5, z, 9.4, 4.7, 8.4, '#d8b48a');
  batch.add('cone', m.plaster, x, 8.6, z, 8.4, 7.8, 8.4, '#dcb47c');
  for (let ring = 0; ring < 5; ring++) batch.add('torus', m.plaster, x, 5.6 + ring * 1.35, z, 8 - ring * 1.5, 8 - ring * 1.5, 8 - ring * 1.5, '#c99f6d', 0, Math.PI / 2);
  batch.add('sphere', m.metal, x, 12.4, z, 1.1, 0.9, 1.1, '#c9a758');
  batch.add('cylinder', m.metal, x, 13.4, z, 0.11, 2, 0.11, '#c9a758');
  batch.box(m.cloth, x + 0.75, 14, z, 1.5, 0.85, 0.02, '#c1743f');
  for (const side of [-1, 1]) {
    batch.add('cylinder', m.marble, x + side * 3.6, 2.3, z + 5.6, 0.58, 4.5, 0.58, '#eae1cd');
    batch.add('cylinder', m.metal, x + side * 3.6, 4.75, z + 5.6, 0.32, 0.3, 0.32, '#bda164');
    batch.add('cylinder', m.metal, x + side * 1.9, 3.9, z + 4.2, 0.16, 0.34, 0.16, '#c8ac6a');
  }
  batch.box(m.plaster, x, 4.8, z + 5.2, 9.4, 0.75, 3, '#d5aa7d');
  batch.box(m.wood, x, 1.8, z + 4.15, 2.4, 3.4, 0.14, '#7a4f2d');
  // Bells at the entrance and a marigold garland over the door.
  for (const side of [-0.9, 0.9]) batch.add('cone', m.metal, x + side, 4.05, z + 4.3, 0.34, 0.42, 0.34, '#c4a25f', 0, Math.PI);
  for (let flower = 0; flower < 12; flower++) {
    batch.add('sphere', m.foliage, x - 1.3 + flower * 0.24, 3.62 - Math.sin(flower / 11 * Math.PI) * 0.28, z + 4.28, 0.16, 0.16, 0.16, flower % 2 ? '#d8942c' : '#c8552c');
  }
  signs.add(group, 'Shanti Mandir', 'शांति मंदिर', 'A PLACE FOR REFLECTION', '#85543c', x, 3.4, z - 4.1, 6, 1, Math.PI);
  colliders.push({ minX: x - 4.7, maxX: x + 4.7, minZ: z - 4.2, maxZ: z + 4.2 });
  addPlace('shanti-mandir', 'Shanti Mandir', 'शांति मंदिर', 'temple', 'Shanti Vihar', x, 154);
}

function buildMosque(batch: CityBatch, m: ReturnType<typeof createMaterials>, signs: SignAtlas, colliders: Collider[], addPlace: (id: string, name: string, hindi: string, kind: Place['kind'], district: string, x: number, z: number) => void) {
  const x = -165; const z = 36;
  batch.box(m.marble, x, 0.2, z, 22, 0.4, 24, '#e8e3d3');
  batch.box(m.plaster, x, 3.1, z, 13, 6.2, 15.4, '#ccd0bb');
  batch.add('dome', m.plaster, x, 6.2, z, 10.4, 8.4, 10.4, '#93a99c');
  batch.add('sphere', m.metal, x, 11.2, z, 0.7, 0.9, 0.7, '#c2ae72');
  for (const side of [-1, 1]) {
    batch.add('cylinder', m.plaster, x, 6.2, z + side * 6.6, 1.7, 12.4, 1.7, '#cfcfbb');
    batch.add('cylinder', m.metal, x, 12.5, z + side * 6.6, 2, 0.24, 2, '#b6a374');
    batch.add('dome', m.plaster, x, 12.7, z + side * 6.6, 2.4, 2.6, 2.4, '#8da69b');
    batch.add('cylinder', m.metal, x, 14.4, z + side * 6.6, 0.09, 1.3, 0.09, '#c2ae72');
    // Arched openings along the prayer hall.
    for (let arch = -1; arch <= 1; arch++) {
      batch.add('dome', m.dark, x + 6.55, 3.4, z + arch * 4.4, 2.4, 2.4, 2.4, '#3d4a44');
      batch.box(m.dark, x + 6.55, 2, z + arch * 4.4, 0.12, 2.8, 2.4, '#3d4a44');
    }
  }
  signs.add(undefined as unknown as THREE.Group, 'Noor Masjid', 'नूर मस्जिद', 'NAVAPUR COMMUNITY', '#4c6c5a', -158.3, 3.8, z, 9, 1.3, Math.PI / 2);
  colliders.push({ minX: -172, maxX: -158, minZ: z - 8, maxZ: z + 8 });
  addPlace('noor-masjid', 'Noor Masjid', 'नूर मस्जिद', 'mosque', 'Gulmohar Colony', -154, z);
}

function buildChurch(batch: CityBatch, m: ReturnType<typeof createMaterials>, colliders: Collider[], addPlace: (id: string, name: string, hindi: string, kind: Place['kind'], district: string, x: number, z: number) => void) {
  const x = 165; const z = -36;
  batch.box(m.paving, x, 0.16, z, 20, 0.32, 26, '#c5bda8');
  batch.box(m.plaster, x, 4.6, z, 12, 9.2, 18, '#c4c2b2');
  batch.box(m.tile, x, 9.6, z, 12.8, 1.1, 18.6, '#8f5238');
  batch.box(m.plaster, x - 1, 7.2, z - 6, 4.2, 14.4, 4.2, '#cfc9b8');
  batch.add('pyramid', m.tile, x - 1, 15.4, z - 6, 5.2, 4.4, 5.2, '#8a6a52');
  batch.box(m.metal, x - 1, 18, z - 6, 0.17, 2.1, 0.15, '#655b4f');
  batch.box(m.metal, x - 1, 18.4, z - 6, 1.15, 0.17, 0.15, '#655b4f');
  for (let window = -2; window <= 2; window++) {
    batch.box(m.warmGlass, x + 6.05, 5.2, z + window * 3.4, 0.1, 3, 1.3, '#7f6a52');
    batch.box(m.warmGlass, x - 6.05, 5.2, z + window * 3.4, 0.1, 3, 1.3, '#7f6a52');
  }
  batch.box(m.wood, x - 1, 2.2, z - 8.15, 2.8, 4.4, 0.16, '#6f4c30');
  colliders.push({ minX: 159, maxX: 171, minZ: z - 9, maxZ: z + 9 });
  addPlace('st-thomas', 'St Thomas Church', 'सेंट थॉमस चर्च', 'church', 'Sapphire Road', 154, z);
}

export { acUnit, laundryLine };

/**
 * The burning ghat at the edge of town: a low wall, three brick pyres, a bamboo
 * bier under a white shroud with its marigolds, and a thread of smoke that never
 * quite stops. Nothing is shown that a passer-by would not see; the quiet does
 * the work.
 */
function buildGhat(
  batch: CityBatch, m: ReturnType<typeof createMaterials>, signs: SignAtlas, group: THREE.Group,
  colliders: Collider[],
  addPlace: (id: string, name: string, hindi: string, kind: Place['kind'], district: string, x: number, z: number) => void,
  random: () => number,
) {
  const x = 150; const z = 152;
  batch.box(m.dirt, x, 0.1, z, 40, 0.2, 34, '#8f8168');
  batch.box(m.paving, x, 0.16, z, 26, 0.14, 22, '#b0a892');
  // A boundary wall with a gate, and a peepal at the corner.
  for (const side of [-1, 1]) {
    batch.box(m.brick, x + side * 13, 1.1, z, 0.6, 2.2, 22, '#9a7358');
    batch.box(m.concrete, x + side * 13, 2.28, z, 0.8, 0.18, 22, '#b8b1a0');
  }
  batch.box(m.brick, x, 1.1, z - 11, 26, 2.2, 0.6, '#9a7358');
  batch.box(m.concrete, x, 2.28, z - 11, 26.4, 0.18, 0.8, '#b8b1a0');
  colliders.push({ minX: x - 13.4, maxX: x - 12.6, minZ: z - 11, maxZ: z + 11 });
  colliders.push({ minX: x + 12.6, maxX: x + 13.4, minZ: z - 11, maxZ: z + 11 });
  tree(batch, m, x - 15.5, z - 13, 8.4, random, 'banyan');
  tree(batch, m, x + 16, z + 12, 7.2, random, 'neem');

  const pyres = [-7.5, 0, 7.5];
  pyres.forEach((offset, index) => {
    const px = x + offset; const pz = z + 2;
    batch.box(m.brick, px, 0.45, pz, 5.2, 0.6, 3.4, '#8d6a52');
    batch.box(m.concrete, px, 0.78, pz, 5.6, 0.1, 3.8, '#a49b88');
    batch.contact(m.contact, px, pz, 3.4, 1, 0.19);
    if (index === 1) {
      // The bier: bamboo poles, a white cloth, and the marigolds someone brought.
      for (const rail of [-0.62, 0.62]) batch.add('cylinder', m.wood, px, 0.95, pz + rail, 0.06, 4.4, 0.06, '#c2ac74', 0, 0, Math.PI / 2);
      for (let rung = -2; rung <= 2; rung++) batch.add('cylinder', m.wood, px + rung * 0.85, 0.95, pz, 0.05, 1.5, 0.05, '#c2ac74');
      batch.add('capsule', m.cloth, px, 1.18, pz, 0.62, 2.5, 0.62, '#efe9de', 0, 0, Math.PI / 2);
      batch.box(m.cloth, px, 1.02, pz, 4.3, 0.1, 1.5, '#e6dfd2');
      for (let flower = 0; flower < 16; flower++) {
        batch.add('lowSphere', m.foliage, px - 1.8 + flower * 0.24, 1.34 - Math.abs(flower - 7.5) * 0.012, pz + (flower % 2 ? 0.2 : -0.2),
          0.14, 0.14, 0.14, flower % 3 === 0 ? '#c8552c' : '#d8942c');
      }
    } else {
      for (let log = 0; log < 5; log++) {
        batch.add('cylinder', m.dark, px - 1.6 + log * 0.8, 0.94, pz, 0.16, 3, 0.16, log % 2 ? '#3b332c' : '#2c2723', 0, 0, Math.PI / 2);
      }
      batch.add('lowSphere', m.dirt, px, 0.86, pz, 3.4, 0.4, 2.4, '#5a5248');
    }
  });

  // Water pot, a broom, the small ordinary things.
  batch.add('cylinder', m.tile, x - 10, 0.55, z + 8, 0.7, 0.9, 0.7, '#8d5a3a');
  batch.add('cylinder', m.metal, x - 10, 1.02, z + 8, 0.76, 0.06, 0.76, '#a8ab9f');
  batch.contact(m.contact, x - 10, z + 8, 0.8, 1, 0.2);
  signs.add(group, 'Shanti Ghat', 'शांति घाट', 'A PLACE TO SAY GOODBYE', '#5a4a3c', x, 2.9, z - 11.4, 7, 1.2, Math.PI);
  addPlace('shanti-ghat', 'Shanti Ghat', 'शांति घाट', 'temple', 'Navapur Junction', x, z - 13);

  // A thread of smoke, always. It thickens when the night turns.
  const count = 90;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = x + (i % 3 - 1) * 7.5;
    positions[i * 3 + 1] = (i / count) * 14;
    positions[i * 3 + 2] = z + 2;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const smoke = new THREE.Points(geometry, new THREE.PointsMaterial({
    color: '#8d8478', size: 1.9, transparent: true, opacity: 0.16, depthWrite: false, sizeAttenuation: true,
  }));
  smoke.frustumCulled = false;
  group.add(smoke);

  return (elapsed: number, haunting: number) => {
    for (let i = 0; i < count; i++) {
      let y = positions[i * 3 + 1] + 0.0075 * (1 + (i % 5) * 0.2);
      if (y > 15) y -= 15;
      positions[i * 3 + 1] = y;
      positions[i * 3] = x + (i % 3 - 1) * 7.5 + Math.sin(elapsed * 0.3 + i) * (0.4 + y * 0.16);
      positions[i * 3 + 2] = z + 2 + Math.cos(elapsed * 0.22 + i * 1.7) * (0.3 + y * 0.12);
    }
    geometry.attributes.position.needsUpdate = true;
    (smoke.material as THREE.PointsMaterial).opacity = 0.14 + haunting * 0.16;
  };
}
