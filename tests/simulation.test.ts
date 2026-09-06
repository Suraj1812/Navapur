import test from 'node:test';
import assert from 'node:assert/strict';
import type { Place, PlaceKind } from '../src/core/types';
import { Simulation } from '../src/simulation/simulation';
import { SidewalkNavigation } from '../src/simulation/navigation';
import { scheduleFor } from '../src/simulation/schedules';
import { ITEMS } from '../src/data/economy';

const roads = [-144, -72, 0, 72, 144];
const fixture = (): Place[] => {
  const kinds: PlaceKind[] = ['chai', 'kirana', 'restaurant', 'pharmacy', 'clothing', 'electronics', 'mechanic', 'fuel', 'home', 'hospital', 'police', 'school', 'office', 'park', 'station'];
  return kinds.map((kind, i) => ({ id: `${kind}-1`, name: `Navapur ${kind}`, hindi: 'नवापुर', kind, district: 'central', x: i < 8 ? 18 : 90, z: i < 8 ? 28 + i * 4 : -120 + (i - 8) * 34, entrance: { x: i < 8 ? 12 : 82, z: i < 8 ? 28 + i * 4 : -120 + (i - 8) * 34 } }));
};
const setup = () => new Simulation(fixture(), roads, 12345);
const visit = (s: Simulation, placeId: string) => Object.assign(s.player, s.getPlace(placeId)!.entrance);

test('seeded population has 240 unique residents with homes, jobs and a lively spawn', () => {
  const a = setup(), b = setup();
  assert.equal(a.residents.length, 240); assert.equal(new Set(a.residents.map(r => r.name)).size, 240);
  assert.deepEqual(a.residents, b.residents);
  assert.ok(a.residents.filter(r => Math.hypot(r.x - 10, r.z - 28) < 50).length >= 15);
  assert.ok(a.residents.every(r => a.getPlace(r.home) && a.getPlace(r.workplace)));
});

test('shop purchase transfers money, stock, inventory, and purchase memory atomically', () => {
  const s = setup(); visit(s, 'chai-1');
  const stock = s.getShopStock('chai-1').chai, cash = s.player.cash;
  assert.equal(s.buy('chai-1', 'chai').ok, true);
  assert.equal(s.player.cash, cash - ITEMS.chai.price); assert.equal(s.player.inventory.chai, 1);
  assert.equal(s.getShopStock('chai-1').chai, stock - 1); assert.equal(s.player.purchases.length, 1);
  assert.ok(s.residents.some(r => r.memory.some(m => m.includes('purchased'))));
});

test('invalid purchases, closed shops, stock exhaustion and insufficient funds do not mutate state', () => {
  const s = setup(); visit(s, 'chai-1');
  for (const id of ['phone', 'missing', '__proto__']) { const before = s.save(); assert.equal(s.buy('chai-1', id).ok, false); assert.equal(s.save(), before); }
  s.time = 3 * 60; const closed = s.save(); assert.equal(s.buy('chai-1', 'chai').ok, false); assert.equal(s.save(), closed);
  s.time = 16 * 60; s.shopStock['chai-1'].chai = 0; const empty = s.save(); assert.equal(s.buy('chai-1', 'chai').ok, false); assert.equal(s.save(), empty);
  s.shopStock['chai-1'].chai = 10; s.player.cash = 0; const poor = s.save(); assert.equal(s.buy('chai-1', 'chai').ok, false); assert.equal(s.save(), poor);
  s.player.x = -120; assert.equal(s.buy('chai-1', 'chai').ok, false);
});

test('consumption applies item effects and prevents negative inventory and overfilled needs', () => {
  const s = setup(); s.player.hunger = 95; s.player.stamina = 96;
  assert.equal(s.eat('water').ok, true); assert.equal(s.player.hunger, 98); assert.equal(s.player.stamina, 100);
  assert.equal(s.player.inventory.water, undefined); assert.equal(s.eat('water').ok, false);
  s.player.inventory.medicine = 1; s.player.health = 20; assert.equal(s.eat('medicine').ok, true); assert.equal(s.player.health, 55);
  s.player.inventory.kurta = 1; assert.equal(s.eat('kurta').ok, false);
});

test('selling requires an appropriate nearby shop and returns half price with inventory removal', () => {
  const s = setup(); s.player.inventory.kurta = 1; s.player.x = -140; assert.equal(s.sell('kurta').ok, false);
  visit(s, 'clothing-1'); const cash = s.player.cash;
  assert.equal(s.sell('kurta').ok, true); assert.equal(s.player.cash, cash + 225); assert.equal(s.player.inventory.kurta, undefined);
  assert.equal(s.sell('kurta').ok, false);
});

test('cash/account transfers conserve total wealth and reject negative or fractional transfers', () => {
  const s = setup(), total = s.player.cash + s.player.bank;
  assert.equal(s.deposit(250).ok, true); assert.equal(s.withdraw(1000).ok, true);
  assert.equal(s.player.cash + s.player.bank, total);
  for (const value of [-5, 0, .5, Infinity, NaN, 1e8]) { assert.equal(s.deposit(value).ok, false); assert.equal(s.withdraw(value).ok, false); }
  assert.equal(s.player.cash + s.player.bank, total);
});

test('navigation crosses roads at real corners and does not cut diagonally through blocks', () => {
  const nav = new SidewalkNavigation(roads), from = { x: 10, z: 28 }, to = { x: -10, z: 40 };
  const path = [from, ...nav.findPath(from, to)];
  assert.deepEqual(path.at(-1), to);
  assert.ok(path.some(p => Math.abs(p.z) === 10));
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i];
    assert.ok(a.x === b.x || a.z === b.z, `Diagonal path edge ${JSON.stringify({ a, b })}`);
    if (a.x !== b.x) assert.ok(roads.some(r => Math.abs(a.z - r) === 10));
    if (a.z !== b.z) assert.ok(roads.some(r => Math.abs(a.x - r) === 10));
  }
});

test('navigation connects distant blocks and projects entrances onto pavements', () => {
  const nav = new SidewalkNavigation(roads);
  assert.deepEqual(nav.project({ x: 12, z: 28 }), { x: 10, z: 28 });
  const route = nav.findPath({ x: -154, z: -130 }, { x: 154, z: 130 });
  assert.ok(route.length > 8); assert.deepEqual(route.at(-1), { x: 154, z: 130 });
});

test('occupations use distinct schedules and all residents return home at night', () => {
  const s = setup(), office = s.residents[0], cook = s.residents.find(r => r.occupation === 'Restaurant cook')!;
  assert.equal(scheduleFor(office, 10 * 60).activity, 'Working');
  assert.notEqual(scheduleFor(cook, 10 * 60).activity, 'Working');
  assert.equal(scheduleFor(cook, 22 * 60).activity, 'Working');
  assert.ok(s.residents.every(r => scheduleFor(r, 2 * 60).activity === 'Sleeping'));
});

test('hunger overrides the schedule, and nearby residents walk towards a real food business', () => {
  const s = setup(), r = s.residents[0]; r.hunger = 5; r.energy = 80;
  s.update(.1); assert.equal(r.goal, 'Find a meal');
  assert.ok(['chai-1', 'restaurant-1', 'kirana-1'].some(id => JSON.stringify(s.getPlace(id)!.entrance) === JSON.stringify(r.destination)));
  s.update(20); assert.ok(r.hunger > 5); assert.ok(r.memory.some(m => m.startsWith('Ate')));
});

test('weather affects resident goals and simulation tiers depend on player distance', () => {
  const s = setup(); s.time = 18.5 * 60; s.setWeather('rain');
  s.update(.1); assert.equal(s.weather, 'rain');
  assert.ok(s.residents.some(r => r.goal === 'Find shelter'));
  assert.ok(s.residents.some(r => r.tier === 'near')); assert.ok(s.residents.some(r => r.tier === 'far'));
  s.setWeather('clear'); s.update(1); assert.ok(s.residents.some(r => r.goal !== 'Find shelter'));
});

test('clock wraps correctly, pays wages and restocks shops at dawn', () => {
  const s = setup(); s.time = 1439; s.timeScale = 1; s.shopStock['chai-1'].chai = 0;
  const cash = s.residents[0].money; s.update(2);
  assert.equal(s.day, 2); assert.equal(s.time, 1); assert.ok(s.shopStock['chai-1'].chai > 0); assert.ok(s.residents[0].money > cash);
  const before = s.time; s.update(NaN); s.update(-2); assert.equal(s.time, before);
});

test('dialogue responds to weather, occupation, familiarity and bounded memory', () => {
  const s = setup(), r = s.residents[0]; Object.assign(s.player, { x: r.x, z: r.z });
  assert.match(s.talk(r.id, 'work'), /office worker/i);
  s.setWeather('rain'); assert.match(s.talk(r.id, 'weather'), /monsoon/i);
  for (let i = 0; i < 40; i++) s.talk(r.id, `greeting ${i}`);
  assert.equal(r.memory.length, 12); assert.equal(r.relationships.player, 100); assert.match(s.talk(r.id), /my friend/);
});

test('delivery destination is real, pays once, and cannot be completed remotely', () => {
  const s = setup(); assert.equal(s.startDelivery().ok, true); assert.equal(s.startDelivery().ok, false);
  const job = { ...s.delivery! }, cash = s.player.cash;
  assert.ok(s.getPlace(job.destinationId)); assert.equal(s.completeDelivery(job.destinationId).ok, false); assert.equal(s.player.cash, cash);
  visit(s, job.destinationId); assert.equal(s.completeDelivery(job.destinationId).ok, true); assert.equal(s.player.cash, cash + job.reward);
  assert.equal(s.delivery, null); assert.ok(s.completedEvents.includes(job.id)); assert.equal(s.completeDelivery(job.destinationId).ok, false);
});

test('fire causes escape, dispatches responders, grows danger radius and is eventually resolved', () => {
  const s = setup(), r = s.residents[0], e = s.triggerEvent('fire', r.x, r.z)!;
  s.update(.2); assert.match(r.goal, /Move away/); assert.ok(s.residents.some(r => r.goal.startsWith('Respond to')));
  s.update(10); assert.ok(e.severity > 1); assert.equal(s.law, 'Emergency response');
  s.update(105); assert.equal(e.resolved, true); assert.ok(s.completedEvents.includes(e.id)); assert.equal(s.law, 'Peaceful');
});

test('event inputs are bounded and police restore order after a disturbance', () => {
  const s = setup(); assert.equal(s.triggerEvent('unknown', 0, 0), undefined); assert.equal(s.triggerEvent('fire', Infinity, 0), undefined);
  const e = s.triggerEvent('disturbance', 10, 28)!; assert.equal(s.law, 'Police responding'); s.update(111);
  assert.equal(e.resolved, true); assert.equal(s.law, 'Peaceful');
});

test('save/load preserves the complete simulation and deterministic continuation', () => {
  const a = setup(); a.buy('chai-1', 'chai'); a.startDelivery(); a.setWeather('rain'); a.triggerEvent('fire', 70, 70); a.update(4);
  const raw = a.save(), b = setup(), originalPlayer = b.player;
  assert.equal(b.load(raw).ok, true); assert.equal(b.player, originalPlayer); assert.equal(b.save(), raw);
  a.update(.5); b.update(.5); assert.equal(a.save(), b.save());
});

test('malformed saves never partially mutate live state', () => {
  const s = setup(), good = s.save();
  const mutations: ((d: any) => void)[] = [
    d => d.version = 999, d => d.player.cash = -10, d => d.player.bank = null, d => d.player.inventory.bad = 10,
    d => d.player.health = 101, d => d.player.x = 9999, d => d.weather = 'snow', d => d.time = 1440,
    d => d.residents[0].home = 'missing', d => d.residents[0].relationships.unknown = 50,
    d => d.residents[0].id = d.residents[1].id, d => d.residents[0].memory = Array(13).fill('test'),
    d => d.shopStock['chai-1'].chai = -1, d => d.shopStock['chai-1'].free = 1,
    d => d.delivery = { id: 'delivery-test', destinationId: 'missing', reward: 500, status: 'active' },
    d => d.residentTasks['ghost'] = { path: [] },
  ];
  for (const mutate of mutations) { const data = JSON.parse(good); mutate(data); assert.equal(s.load(JSON.stringify(data)).ok, false); assert.equal(s.save(), good); }
  for (const raw of ['{bad', 'null', '[]', good.replace('"cash":1250', '"__proto__":{"polluted":true},"cash":1250')]) { assert.equal(s.load(raw).ok, false); assert.equal(s.save(), good); }
});

test('save validation rejects malformed event state and unsafe navigation data', () => {
  const s = setup(); s.triggerEvent('collision', 10, 10); s.update(.1); const good = s.save();
  const bad = JSON.parse(good); bad.events[0].severity = 'huge'; assert.equal(s.load(JSON.stringify(bad)).ok, false);
  const path = JSON.parse(good); path.residentTasks['resident-0'].path = [{ x: 1e9, z: 0 }]; assert.equal(s.load(JSON.stringify(path)).ok, false);
  assert.equal(s.save(), good);
});
