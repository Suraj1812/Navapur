import * as THREE from 'three';
import type { Collider, Place, World } from '../core/types';
import { CityBatch, seededRandom } from './batch';
import { building, type BuildingSpec } from './buildings';
import { blockDistrict, districts, storefronts, type Storefront } from './data';
import { createMaterials, SignAtlas } from './materials';
import { bench, marketCart, streetLamp, tree, utilityWires } from './props';

const ROADS = [-144, -72, 0, 72, 144];

export function createWorld(): World {
  const group = new THREE.Group(); group.name = 'Navapur — procedural city';
  const random = seededRandom(84172); const materials = createMaterials();
  const batch = new CityBatch(group); const signs = new SignAtlas();
  const colliders: Collider[] = []; const places: Place[] = []; const lamps: THREE.Mesh[] = [];
  const addPlace = (id: string, name: string, hindi: string, kind: Place['kind'], district: string, x: number, z: number) => {
    places.push({ id, name, hindi, kind, district, x, z, entrance: { x, z } });
  };
  batch.box(materials.concrete, 0, -0.2, 0, 1600, 0.3, 1600, '#8a9277');
  batch.box(materials.road, 0, -0.02, 0, 368, 0.08, 368);
  // Individual raised pavement blocks leave a connected 14 metre street grid.
  for (let iz = 0; iz < 4; iz++) for (let ix = 0; ix < 4; ix++) {
    const cx = ROADS[ix] + 36; const cz = ROADS[iz] + 36;
    batch.box(materials.paving, cx, 0.06, cz, 58, 0.12, 58);
    batch.box(materials.concrete, cx, 0.09, cz, 47.8, 0.12, 47.8, '#989984');
    // Alternating painted curb stones, storm drains and footpath joints.
    for (let edge = 0; edge < 4; edge++) for (let stone = 0; stone < 29; stone++) {
      const along = -28 + stone * 2;
      const x = edge < 2 ? cx + along : cx + (edge === 2 ? -29 : 29);
      const z = edge < 2 ? cz + (edge === 0 ? -29 : 29) : cz + along;
      batch.box(materials.concrete, x, 0.135, z, edge < 2 ? 1.98 : 0.18, 0.27, edge < 2 ? 0.18 : 1.98, stone % 2 ? '#d4c497' : '#575951');
      if (stone % 10 === 4) batch.box(materials.dark, x, 0.022, z, edge < 2 ? 0.8 : 0.35, 0.025, edge < 2 ? 0.35 : 0.8);
    }
  }
  for (const road of ROADS) {
    // Boundary pavements frame the inhabited outer streets.
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
      // Stop bars precede each pedestrian crossing in the left-driving lanes.
      batch.box(materials.paint, road + 3.5, 0.037, crossing + 12.5, 5.65, 0.019, 0.28);
      batch.box(materials.paint, road - 3.5, 0.037, crossing - 12.5, 5.65, 0.019, 0.28);
    }
  }

  const earthPalette = ['#bbae95', '#c7bea6', '#af9880', '#c4af91', '#9eaaa0', '#b9b4a1', '#c4baaa', '#a8afa4', '#baa28d', '#c9b295'];
  let buildingIndex = 0;
  const addBuilding = (spec: Omit<BuildingSpec, 'index'>) => building(batch, materials, signs, colliders, places, { ...spec, index: buildingIndex++ });
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
      batch.box(materials.foliage, cx, 0.14, cz, 47.6, 0.12, 47.6, '#718059');
      batch.box(materials.paving, cx, 0.22, cz, 3.8, 0.09, 48);
      batch.box(materials.paving, cx, 0.22, cz, 48, 0.09, 3.8);
      batch.cylinder(materials.concrete, cx, 0.47, cz, 10, 0.65, 10, '#b4ac96');
      batch.cylinder(materials.glass, cx, 0.82, cz, 8.8, 0.03, 8.8, '#86a3a1');
      batch.cylinder(materials.concrete, cx, 1.4, cz, 1.3, 1.25, 1.3, '#cbc0a3');
      batch.cylinder(materials.concrete, cx, 2.0, cz, 3, 0.23, 3, '#beb49c');
      for (let t = 0; t < 20; t++) {
        const tx = cx + (t % 5 - 2) * 8.3; const tz = cz + (Math.floor(t / 5) - 1.5) * 10;
        if (Math.abs(tx - cx) < 4 || Math.abs(tz - cz) < 4) continue;
        tree(batch, materials, tx, tz, 5.5 + random() * 3, random);
      }
      for (const side of [-1, 1]) { bench(batch, materials, cx + side * 6.5, cz - 7, side * Math.PI / 2); bench(batch, materials, cx - 8, cz + side * 7); }
      for (let edge = 0; edge < 4; edge++) for (let post = -21; post <= 21; post += 2) {
        if (Math.abs(post) < 3) continue;
        const px = edge < 2 ? cx + post : cx + (edge === 2 ? -23 : 23); const pz = edge < 2 ? cz + (edge === 0 ? -23 : 23) : cz + post;
        batch.box(materials.metal, px, 0.9, pz, 0.08, 1.5, 0.08, '#536450');
      }
      signs.add(group, 'Nehru Gardens', 'नेहरू उद्यान', 'OPEN DAILY • WALK • BREATHE • BELONG', '#46614b', cx, 2.65, top + 12, 8, 1.5, Math.PI);
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
      if (homes) {
        const ex = base.x + Math.sin(base.angle) * 1.2; const ez = base.z + Math.cos(base.angle) * 1.2;
        addPlace(`home-${ix}-${iz}-${slot}`, `${district.id === 'suburb' ? 'Shanti Villa' : 'Gulmohar Apartments'} ${slot + 1}`, 'अपना घर', 'home', district.name, ex, ez);
        if (enterable) places[places.length - 1].interior = { x: base.x - Math.sin(base.angle) * 3.7, z: base.z - Math.cos(base.angle) * 3.7 };
      }
      if (market && slot % 3 === 0) {
        const px = base.x + Math.sin(base.angle) * 2.65; const pz = base.z + Math.cos(base.angle) * 2.65;
        // Vendor stalls leave enough of the five metre pavement for foot traffic.
        marketCart(batch, materials, px, pz + 4.8, base.angle, random, slot === 0);
      }
    }
    // Quiet inner courts soften the dense street perimeter.
    if (district.id !== 'industrial') {
      tree(batch, materials, cx, cz, 6.5 + random() * 2.5, random);
      bench(batch, materials, cx + 4, cz + 2, Math.PI / 2);
    } else {
      for (let stack = 0; stack < 5; stack++) batch.box(materials.metal, cx - 6 + stack * 3, 1.4, cz, 2.7, 2.6, 6.5, ['#966a4d', '#647872', '#807961'][stack % 3]);
      batch.cylinder(materials.brick, cx + 6, 10, cz + 6, 1.4, 20, 1.4);
    }
  }

  // Religious and civic landmarks occupy open sites along the outer street edges.
  const templeX = -36; const templeZ = 165;
  batch.box(materials.concrete, templeX, 0.18, templeZ, 18, 0.3, 18, '#cbb89a');
  batch.box(materials.plaster, templeX, 2.4, templeZ, 9, 4.5, 8, '#c5a37e');
  batch.add('cone', materials.plaster, templeX, 8.3, templeZ, 8, 7.4, 8, '#d1ac79');
  batch.cylinder(materials.metal, templeX, 12.6, templeZ, 0.12, 2, 0.12, '#bca06d');
  batch.box(materials.cloth, templeX + 0.7, 13.2, templeZ, 1.4, 0.8, 0.025, '#bc7544');
  for (const side of [-1, 1]) batch.cylinder(materials.plaster, templeX + side * 3.5, 2.2, templeZ - 5.7, 0.55, 4.3, 0.55, '#c9b08b');
  batch.box(materials.plaster, templeX, 4.5, templeZ - 5.2, 9, 0.7, 3, '#c7ad85');
  signs.add(group, 'Shanti Mandir', 'शांति मंदिर', 'A PLACE FOR REFLECTION', '#85543c', templeX, 3.4, templeZ - 4.1, 6, 1, Math.PI);
  colliders.push({ minX: templeX - 4.5, maxX: templeX + 4.5, minZ: templeZ - 4, maxZ: templeZ + 4 });
  addPlace('shanti-mandir', 'Shanti Mandir', 'शांति मंदिर', 'temple', 'Shanti Vihar', templeX, 154);

  const mosqueX = -165; const mosqueZ = 36;
  batch.box(materials.plaster, mosqueX, 3, mosqueZ, 13, 6, 15, '#c4c7b3');
  batch.add('sphere', materials.plaster, mosqueX, 6.4, mosqueZ, 10, 8, 10, '#93a99c');
  for (const side of [-1, 1]) {
    batch.cylinder(materials.plaster, mosqueX, 6, mosqueZ + side * 6.5, 1.65, 12, 1.65, '#c6c6b2');
    batch.add('cone', materials.plaster, mosqueX, 12.8, mosqueZ + side * 6.5, 2.3, 2.5, 2.3, '#8da69b');
  }
  signs.add(group, 'Noor Masjid', 'नूर मस्जिद', 'NAVAPUR COMMUNITY', '#4c6c5a', -158.4, 3.8, mosqueZ, 9, 1.3, Math.PI / 2);
  colliders.push({ minX: -172, maxX: -158, minZ: mosqueZ - 8, maxZ: mosqueZ + 8 });
  addPlace('noor-masjid', 'Noor Masjid', 'नूर मस्जिद', 'mosque', 'Gulmohar Colony', -154, mosqueZ);

  const churchX = 165; const churchZ = -36;
  batch.box(materials.plaster, churchX, 4.5, churchZ, 12, 9, 18, '#b6b6a7');
  batch.box(materials.plaster, churchX - 1, 7, churchZ - 6, 4, 14, 4, '#c3bdad');
  batch.add('cone', materials.dark, churchX - 1, 15, churchZ - 6, 5, 4, 5, '#8d7b6a');
  batch.box(materials.metal, churchX - 1, 17.6, churchZ - 6, 0.17, 2, 0.15, '#655b4f');
  batch.box(materials.metal, churchX - 1, 18, churchZ - 6, 1.15, 0.17, 0.15, '#655b4f');
  colliders.push({ minX: 159, maxX: 171, minZ: churchZ - 9, maxZ: churchZ + 9 });
  addPlace('st-thomas', 'St Thomas Church', 'सेंट थॉमस चर्च', 'church', 'Sapphire Road', 154, churchZ);

  // Street infrastructure and foliage follow the same road grid as navigation.
  for (const road of ROADS) for (let segment = 0; segment < 4; segment++) {
    const start = ROADS[segment];
    for (const offset of [21, 51]) {
      for (const side of [-1, 1]) {
        streetLamp(batch, materials, road + side * 8.15, start + offset, -side * Math.PI / 2, lamps);
        streetLamp(batch, materials, start + offset, road + side * 8.15, side === 1 ? Math.PI : 0, lamps);
      }
    }
    // Street trees are concentrated away from the narrow old bazaar frontages.
    if (Math.abs(road) >= 72) for (const side of [-1, 1]) {
      tree(batch, materials, road + side * 10.5, start + 36, 5.3 + random() * 1.5, random);
      tree(batch, materials, start + 36, road + side * 10.5, 5.3 + random() * 1.5, random);
    }
    if (Math.abs(road) <= 72) {
      utilityWires(batch, materials, road + 8.15, start + 21, road + 8.15, start + 51);
      if (segment < 3) utilityWires(batch, materials, road + 8.15, start + 51, road + 8.15, start + 93);
    }
  }
  // Bus shelters, street maps, bins and parking paint give everyday spaces a purpose.
  for (const stop of [{ x: -9.8, z: 95, angle: -Math.PI / 2 }, { x: 95, z: 9.8, angle: 0 }, { x: 81.8, z: 111, angle: Math.PI / 2 }]) {
    const sin = Math.sin(stop.angle); const cos = Math.cos(stop.angle);
    for (const side of [-1, 1]) batch.box(materials.metal, stop.x + side * cos * 2.6, 1.55, stop.z - side * sin * 2.6, 0.08, 3.1, 0.08, '#4f665b');
    batch.box(materials.metal, stop.x, 3.15, stop.z, 5.8, 0.2, 2.3, '#596e60', stop.angle);
    batch.box(materials.glass, stop.x - sin * 0.82, 1.6, stop.z - cos * 0.82, 5.3, 2.45, 0.06, '#8caba6', stop.angle);
    bench(batch, materials, stop.x, stop.z, stop.angle);
    signs.add(group, 'Navapur City Bus', 'नवापुर नगर बस', 'FREQUENT LOCAL CONNECTIONS', '#3f6252', stop.x + sin * 1.18, 2.95, stop.z + cos * 1.18, 5.5, 0.65, stop.angle);
  }
  for (const pos of [{ x: 9, z: 42 }, { x: -9, z: -41 }, { x: 81, z: -30 }, { x: -81, z: 95 }]) {
    batch.cylinder(materials.concrete, pos.x, 0.57, pos.z, 0.65, 1.14, 0.65, '#5b715e');
    batch.cylinder(materials.metal, pos.x, 1.17, pos.z, 0.71, 0.08, 0.71, '#718776');
  }
  signs.add(group, 'Welcome to Purana Bazaar', 'पुराना बाज़ार में आपका स्वागत है', 'THE HEART OF NAVAPUR • EST. 1928', '#405e58', -12.1, 5.0, -36, 11, 1.75, Math.PI / 2);
  for (const board of [{ x: 28, z: -12.1, angle: 0 }, { x: -60.1, z: 35, angle: -Math.PI / 2 }]) {
    signs.add(group, 'A little less hurry', 'थोड़ा ठहरिए, चाय पीजिए', 'NAVAPUR • MAKE TIME FOR EVERYDAY LIFE', '#a08460', board.x, 7.4, board.z, 8, 3.6, board.angle);
  }

  // Distant, varied massing extends the horizon while the playable city remains bounded.
  for (let ring = 0; ring < 2; ring++) for (let side = 0; side < 4; side++) for (let i = 0; i < 12; i++) {
    const along = -195 + i * 35 + random() * 8; const away = 203 + ring * 60 + random() * 24;
    const x = side < 2 ? along : (side === 2 ? -away : away); const z = side < 2 ? (side === 0 ? -away : away) : along;
    const height = 15 + random() * (side === 0 ? 72 : 35);
    batch.box(materials.plaster, x, height / 2, z, 16 + random() * 13, height, 16 + random() * 15, earthPalette[i % earthPalette.length]);
    batch.box(materials.concrete, x, height + 0.8, z, 9, 1.6, 9, '#9b9e94');
  }

  batch.finish(); const signMaterial = signs.finish(group);
  // Keep eight unobtrusive wet patches pooled; the weather system adjusts opacity.
  const puddleMaterial = new THREE.MeshStandardMaterial({ color: '#7e8b8b', metalness: 0.75, roughness: 0.05, transparent: true, opacity: 0, depthWrite: false });
  const puddleGeometry = new THREE.CircleGeometry(1, 24); puddleGeometry.rotateX(-Math.PI / 2);
  for (const p of [{ x: 5.2, z: 29 }, { x: -5.7, z: -33 }, { x: 69, z: 26 }, { x: 23, z: -76 }, { x: -69, z: 112 }, { x: 111, z: 4.5 }]) {
    const puddle = new THREE.Mesh(puddleGeometry, puddleMaterial); puddle.position.set(p.x, 0.04, p.z); puddle.scale.set(1.4 + random(), 1, 3 + random() * 2); group.add(puddle);
  }
  return {
    group, places, colliders, districts, roadCoordinates: [...ROADS], lamps, roadMaterial: materials.road, bounds: 178,
    update(time, weather) {
      const night = time < 360 || time > 1110; const dusk = time > 1050 && time <= 1110;
      materials.light.emissiveIntensity = night ? 2.1 : dusk ? 0.85 : 0.15;
      materials.warmGlass.emissiveIntensity = night ? 0.55 : dusk ? 0.22 : 0.035;
      if (signMaterial) signMaterial.emissiveIntensity = night ? 0.45 : 0.14;
      for (const lamp of lamps) (lamp.userData.light as THREE.PointLight).intensity = night ? 65 : dusk ? 18 : 0;
      materials.road.roughness = weather === 'rain' ? 0.23 : 0.96;
      materials.road.metalness = weather === 'rain' ? 0.32 : 0.04;
      puddleMaterial.opacity = weather === 'rain' ? 0.36 : 0;
    },
  };
}
