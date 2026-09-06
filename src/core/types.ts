import type * as THREE from 'three';
import type { QualityProfile } from '../render/quality';
export type Vec2 = { x: number; z: number };
export type Weather = 'clear' | 'cloudy' | 'rain';
export type PlaceKind = 'chai' | 'kirana' | 'restaurant' | 'pharmacy' | 'clothing' | 'electronics' | 'mechanic' | 'fuel' | 'home' | 'hospital' | 'police' | 'school' | 'office' | 'park' | 'station' | 'temple' | 'mosque' | 'church';
export interface Place extends Vec2 { id: string; name: string; hindi: string; kind: PlaceKind; district: string; entrance: Vec2; interior?: Vec2; owner?: string; }
export interface Collider { minX: number; maxX: number; minZ: number; maxZ: number; }
export interface District extends Vec2 { id: string; name: string; subtitle: string; color: string; }
export interface World {
  group: THREE.Group;
  places: Place[];
  colliders: Collider[];
  districts: District[];
  roadCoordinates: number[];
  lamps: THREE.Mesh[];
  signals: THREE.Mesh[];
  roadMaterial: THREE.MeshStandardMaterial;
  bounds: number;
  update(time: number, weather: Weather, elapsed: number): void;
  setQuality(profile: QualityProfile): void;
}
export interface Item { id:string; name:string; price:number; hunger?:number; energy?:number; health?:number; category:string; }
export interface PlayerState extends Vec2 { cash:number; bank:number; health:number; stamina:number; hunger:number; inventory:Record<string,number>; ownedVehicles:string[]; purchases:string[]; }
export interface Resident extends Vec2 { id:string; name:string; age:string; occupation:string; color:string; home:string; workplace:string; activity:string; goal:string; destination:Vec2; money:number; hunger:number; energy:number; social:number; relationships:Record<string,number>; inventory:Record<string,number>; memory:string[]; tier:'near'|'mid'|'far'; heading:number; moving:boolean; }
export interface CityEvent extends Vec2 { id:string; type:string; message:string; age:number; severity:number; resolved:boolean; }
