import type { Item, PlaceKind } from '../core/types';

/** Fictional neighbourhood prices. Hunger is fullness, from 0 to 100. */
export const ITEMS: Record<string, Item> = {
  chai: { id: 'chai', name: 'Masala chai', price: 15, hunger: 5, energy: 18, category: 'drink' },
  samosa: { id: 'samosa', name: 'Fresh samosa', price: 20, hunger: 18, category: 'food' },
  dosa: { id: 'dosa', name: 'Masala dosa', price: 80, hunger: 42, category: 'food' },
  thali: { id: 'thali', name: 'Home-style thali', price: 120, hunger: 65, health: 3, category: 'food' },
  biryani: { id: 'biryani', name: 'Vegetable biryani', price: 150, hunger: 58, category: 'food' },
  roti: { id: 'roti', name: 'Roti & dal', price: 60, hunger: 35, category: 'food' },
  rice: { id: 'rice', name: 'Steamed rice', price: 40, hunger: 25, category: 'food' },
  fruit: { id: 'fruit', name: 'Seasonal fruit', price: 35, hunger: 22, health: 3, category: 'food' },
  water: { id: 'water', name: 'Drinking water', price: 20, hunger: 3, energy: 10, category: 'drink' },
  biscuits: { id: 'biscuits', name: 'Elaichi biscuits', price: 25, hunger: 15, category: 'food' },
  groceries: { id: 'groceries', name: 'Weekly grocery bag', price: 240, hunger: 80, category: 'food' },
  medicine: { id: 'medicine', name: 'First aid supplies', price: 90, health: 35, category: 'health' },
  kurta: { id: 'kurta', name: 'Cotton kurta', price: 450, category: 'clothing' },
  umbrella: { id: 'umbrella', name: 'Monsoon umbrella', price: 180, category: 'equipment' },
  phone: { id: 'phone', name: 'Navatel mobile phone', price: 3500, category: 'electronics' },
  fuel: { id: 'fuel', name: 'Fuel can · 10 litres', price: 100, category: 'vehicle' },
  repair: { id: 'repair', name: 'Vehicle repair kit', price: 250, category: 'vehicle' },
};

export const SHOP_CATALOG: Partial<Record<PlaceKind, string[]>> = {
  chai: ['chai', 'samosa', 'biscuits', 'water'], kirana: ['fruit', 'water', 'biscuits', 'groceries', 'rice', 'umbrella'],
  restaurant: ['dosa', 'thali', 'biryani', 'roti', 'rice', 'water'], pharmacy: ['medicine', 'water'],
  clothing: ['kurta', 'umbrella'], electronics: ['phone'], mechanic: ['repair', 'fuel'], fuel: ['fuel', 'water'],
};

export const SHOP_HOURS: Partial<Record<PlaceKind, { open: number; close: number }>> = {
  chai: { open: 5 * 60, close: 23 * 60 }, kirana: { open: 7 * 60, close: 22 * 60 },
  restaurant: { open: 7 * 60, close: 23 * 60 }, pharmacy: { open: 0, close: 24 * 60 },
  clothing: { open: 10 * 60, close: 21 * 60 }, electronics: { open: 10 * 60, close: 21 * 60 },
  mechanic: { open: 8 * 60, close: 20 * 60 }, fuel: { open: 0, close: 24 * 60 },
};
