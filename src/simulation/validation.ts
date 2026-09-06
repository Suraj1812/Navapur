import type { Place } from '../core/types';
import { ITEMS, SHOP_CATALOG } from '../data/economy';
import { OCCUPATIONS } from '../data/residents';
import type { SimulationSave } from './simulation';

type RecordValue = Record<string, unknown>;
function fail(message: string): never { throw new Error(message); }
function object(value: unknown, label: string): RecordValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`Invalid ${label}.`);
  return value as RecordValue;
}
function number(value: unknown, min: number, max: number, label: string, integer = false): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max || integer && !Number.isSafeInteger(value)) fail(`Invalid ${label}.`);
}
function string(value: unknown, max: number, label: string): asserts value is string {
  if (typeof value !== 'string' || value.length > max) fail(`Invalid ${label}.`);
}
function array(value: unknown, max: number, label: string): unknown[] {
  if (!Array.isArray(value) || value.length > max) fail(`Invalid ${label}.`);
  return value;
}
function strings(value: unknown, maxCount: number, maxLength: number, label: string) {
  for (const item of array(value, maxCount, label)) string(item, maxLength, label);
}
function coordinate(value: unknown, label: string) {
  const v = object(value, label); number(v.x, -240, 240, `${label} x`); number(v.z, -240, 240, `${label} z`);
}
function inventory(value: unknown, label: string) {
  const record = object(value, label);
  for (const [key, count] of Object.entries(record)) {
    if (!Object.hasOwn(ITEMS, key)) fail(`Unknown item in ${label}.`);
    number(count, 0, 100000, `${label} quantity`, true);
  }
}

/** Validate the entire graph before exposing any data to the live simulation. */
export function validateSave(value: unknown, places: Place[]): SimulationSave {
  const data = object(value, 'save');
  const rejectPoisonKeys = (v: unknown, depth = 0) => {
    if (depth > 30) fail('Save nesting is too deep.');
    if (!v || typeof v !== 'object') return;
    for (const [key, child] of Object.entries(v)) {
      if (['__proto__', 'constructor', 'prototype'].includes(key)) fail('Unsafe save property.');
      rejectPoisonKeys(child, depth + 1);
    }
  };
  rejectPoisonKeys(data);
  if (data.version !== 1) fail('Unsupported save version.');
  const placeIds = new Set(places.map(p => p.id));
  number(data.seed, 0, 4294967295, 'random seed', true);
  number(data.time, 0, 1439.999999999, 'time'); number(data.day, 1, 1e7, 'day', true);
  number(data.timeScale, 0, 120, 'time speed'); number(data.nextWeather, -3600, 3600, 'weather timer');
  number(data.nextEvent, -3600, 3600, 'event timer'); number(data.eventSerial, 0, 1e9, 'event counter', true);
  number(data.elapsed, 0, 1e12, 'elapsed time');
  if (!['clear', 'cloudy', 'rain'].includes(String(data.weather))) fail('Invalid weather.');
  if (!['Peaceful', 'Police responding', 'Emergency response'].includes(String(data.law))) fail('Invalid law state.');
  const player = object(data.player, 'player'); coordinate(player, 'player');
  number(player.cash, 0, 1e9, 'cash', true); number(player.bank, 0, 1e9, 'bank balance', true);
  for (const key of ['health', 'stamina', 'hunger']) number(player[key], 0, 100, key);
  inventory(player.inventory, 'player inventory'); strings(player.ownedVehicles, 100, 100, 'owned vehicles'); strings(player.purchases, 150, 240, 'purchase history');
  const residents = array(data.residents, 10000, 'residents');
  if (residents.length !== 240) fail('Save population does not match this city.');
  const ids = new Set<string>();
  for (const entry of residents) {
    const r = object(entry, 'resident');
    string(r.id, 40, 'resident id');
    if (!/^resident-\d+$/.test(r.id) || ids.has(r.id)) fail('Invalid or duplicate resident id.');
    ids.add(r.id);
    for (const key of ['name', 'age', 'occupation', 'color', 'activity', 'goal', 'home', 'workplace']) string(r[key], 240, `resident ${key}`);
    if (!placeIds.has(r.home as string) || !placeIds.has(r.workplace as string)) fail('Resident refers to an unknown place.');
    if (!OCCUPATIONS.some(p => p.name === r.occupation)) fail('Unknown resident occupation.');
    if (!/^#[0-9a-fA-F]{6}$/.test(r.color as string)) fail('Invalid resident colour.');
    coordinate(r, 'resident'); coordinate(r.destination, 'resident destination');
    number(r.money, 0, 1e9, 'resident cash', true);
    for (const key of ['hunger', 'energy', 'social']) number(r[key], 0, 100, `resident ${key}`);
    number(r.heading, -Math.PI * 2, Math.PI * 2, 'resident heading');
    if (typeof r.moving !== 'boolean' || !['near', 'mid', 'far'].includes(String(r.tier))) fail('Invalid resident movement.');
    inventory(r.inventory, 'resident inventory'); strings(r.memory, 12, 300, 'resident memory');
    const relationships = object(r.relationships, 'relationships');
    if (Object.keys(relationships).length > 256) fail('Too many relationships.');
    for (const [key, relation] of Object.entries(relationships)) {
      if (key !== 'player' && !/^resident-\d+$/.test(key)) fail('Invalid relationship.');
      number(relation, 0, 100, 'relationship value');
    }
  }
  for (const entry of residents) for (const id of Object.keys((entry as RecordValue).relationships as RecordValue)) if (id !== 'player' && !ids.has(id)) fail('Unknown relationship target.');
  const tasks = object(data.residentTasks, 'resident tasks');
  for (const [id, value] of Object.entries(tasks)) {
    if (!ids.has(id)) fail('Unknown resident task owner.');
    const task = object(value, 'resident task');
    string(task.goal, 240, 'task goal'); string(task.activity, 240, 'task activity'); string(task.placeId, 100, 'task place');
    if (task.placeId !== '' && !placeIds.has(task.placeId)) fail('Unknown task destination.');
    if (typeof task.arrived !== 'boolean') fail('Invalid task progress.');
    for (const point of array(task.path, 150, 'task path')) coordinate(point, 'path point');
  }
  const accumulators = object(data.accumulators, 'resident timers');
  for (const [id, elapsed] of Object.entries(accumulators)) {
    if (!ids.has(id)) fail('Unknown resident timer owner.');
    number(elapsed, 0, 10, 'resident timer');
  }
  const events = array(data.events, 24, 'events'), eventIds = new Set<string>();
  for (const entry of events) {
    const event = object(entry, 'event'); string(event.id, 100, 'event id');
    if (!/^event-\d+$/.test(event.id) || eventIds.has(event.id) || Number(event.id.slice(6)) > (data.eventSerial as number)) fail('Invalid event id.');
    eventIds.add(event.id);
    if (!['fire', 'collision', 'medical', 'disturbance', 'crime'].includes(String(event.type))) fail('Unknown event type.');
    string(event.message, 400, 'event message'); coordinate(event, 'event'); number(event.age, 0, 1e12, 'event age'); number(event.severity, 0, 10, 'event severity');
    if (typeof event.resolved !== 'boolean') fail('Invalid event status.');
  }
  strings(data.completedEvents, 100, 100, 'completed events'); strings(data.logs, 40, 500, 'event log');
  const stock = object(data.shopStock, 'shop stock');
  const shops = places.filter(p => SHOP_CATALOG[p.kind]);
  if (Object.keys(stock).length !== shops.length || Object.keys(stock).some(id => !shops.some(p => p.id === id))) fail('Shop list does not match this city.');
  for (const place of shops) {
    const shop = object(stock[place.id], 'shop inventory'), catalog = SHOP_CATALOG[place.kind]!;
    if (Object.keys(shop).length !== catalog.length || Object.keys(shop).some(id => !catalog.includes(id))) fail('Shop catalogue does not match.');
    for (const count of Object.values(shop)) number(count, 0, 100000, 'shop quantity', true);
  }
  if (data.delivery !== null) {
    const delivery = object(data.delivery, 'delivery'); string(delivery.id, 100, 'delivery id');
    if (!/^delivery-/.test(delivery.id) || !placeIds.has(String(delivery.destinationId)) || delivery.status !== 'active') fail('Invalid delivery destination or status.');
    number(delivery.reward, 1, 10000, 'delivery reward', true);
  }
  return data as unknown as SimulationSave;
}
