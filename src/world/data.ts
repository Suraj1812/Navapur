import type { District, PlaceKind } from '../core/types';

export const districts: District[] = [
  { id: 'market', name: 'Purana Bazaar', subtitle: 'The old heart of Navapur', x: 0, z: 0, color: '#bb7451' },
  { id: 'downtown', name: 'Naya Nagar', subtitle: 'Offices & city skyline', x: 108, z: -108, color: '#76969a' },
  { id: 'residential', name: 'Gulmohar Colony', subtitle: 'Homes, courtyards & everyday life', x: -108, z: -36, color: '#b6a986' },
  { id: 'shopping', name: 'Sapphire Road', subtitle: 'Shops & evening promenades', x: 108, z: -36, color: '#af827d' },
  { id: 'industrial', name: 'Udyog Nagar', subtitle: 'Workshops & logistics', x: -108, z: -108, color: '#9c8e7a' },
  { id: 'government', name: 'Civic Quarter', subtitle: 'Public services & institutions', x: 36, z: -108, color: '#bbab89' },
  { id: 'education', name: 'Vidya Campus', subtitle: 'Schools & college life', x: -36, z: -108, color: '#a6a786' },
  { id: 'transport', name: 'Navapur Junction', subtitle: 'The city on the move', x: 108, z: 108, color: '#989fb0' },
  { id: 'park', name: 'Nehru Gardens', subtitle: 'A quieter corner of the city', x: -108, z: 36, color: '#91a077' },
  { id: 'suburb', name: 'Shanti Vihar', subtitle: 'Tree-lined residential streets', x: -108, z: 108, color: '#afae8a' },
];

export interface Storefront { title: string; hindi: string; kind: PlaceKind; caption: string; color: string; owner: string; }
export const storefronts: Storefront[] = [
  { title: 'Sharma Chai', hindi: 'शर्मा चाय भंडार', kind: 'chai', caption: 'FRESH CHAI • SAMOSA • SINCE 1984', color: '#6b3030', owner: 'Ramesh Sharma' },
  { title: 'Gupta Kirana', hindi: 'गुप्ता किराना स्टोर', kind: 'kirana', caption: 'GROCERIES • DAILY ESSENTIALS • HOME DELIVERY', color: '#355956', owner: 'Sunita Gupta' },
  { title: 'Annapurna Kitchen', hindi: 'अन्नपूर्णा भोजनालय', kind: 'restaurant', caption: 'THALI • DOSA • FRESHLY PREPARED', color: '#9a562e', owner: 'Meena Nair' },
  { title: 'Sehat Pharmacy', hindi: 'सेहत मेडिकल स्टोर', kind: 'pharmacy', caption: 'YOUR NEIGHBOURHOOD HEALTH PARTNER', color: '#3e6a57', owner: 'Farah Khan' },
  { title: 'Rang Mahal', hindi: 'रंग महल वस्त्रालय', kind: 'clothing', caption: 'SAREES • KURTAS • EVERYDAY FAVOURITES', color: '#733e4b', owner: 'Kavita Shah' },
  { title: 'Bharat Electronics', hindi: 'भारत इलेक्ट्रॉनिक्स', kind: 'electronics', caption: 'MOBILES • ACCESSORIES • REPAIRS', color: '#344e68', owner: 'Vivek Desai' },
  { title: 'Iqbal Motors', hindi: 'इकबाल मोटर्स', kind: 'mechanic', caption: 'TWO WHEELER SERVICE • TYRES • REPAIRS', color: '#46574d', owner: 'Iqbal Ansari' },
  { title: 'Navapur Fuel', hindi: 'नवापुर पेट्रोल पंप', kind: 'fuel', caption: 'PETROL • DIESEL • AIR • WATER', color: '#7a543b', owner: 'Manoj Yadav' },
  { title: 'Sagar South Indian', hindi: 'सागर दक्षिण भारतीय', kind: 'restaurant', caption: 'IDLI • DOSA • FILTER COFFEE', color: '#44716d', owner: 'Arun Pillai' },
  { title: 'Fresh Harvest', hindi: 'ताज़ा फल और सब्ज़ियाँ', kind: 'kirana', caption: 'FRESH FROM THE MANDI • EVERY MORNING', color: '#627344', owner: 'Lakshmi Rao' },
  { title: 'Azad Tea House', hindi: 'आज़ाद चाय घर', kind: 'chai', caption: 'TAKE A BREAK • CHAI & CONVERSATION', color: '#794c3a', owner: 'Salim Ali' },
  { title: 'New City Tailors', hindi: 'न्यू सिटी टेलर्स', kind: 'clothing', caption: 'TAILORING • ALTERATIONS • SCHOOL UNIFORMS', color: '#565277', owner: 'Suresh Mishra' },
];

export function blockDistrict(ix: number, iz: number) {
  const grid = [
    ['industrial', 'education', 'government', 'downtown'],
    ['residential', 'market', 'market', 'shopping'],
    ['park', 'market', 'market', 'shopping'],
    ['suburb', 'residential', 'government', 'transport'],
  ];
  return districts.find(district => district.id === grid[iz][ix])!;
}
