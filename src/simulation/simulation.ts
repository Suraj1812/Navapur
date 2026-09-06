import type { CityEvent, Place, PlayerState, Resident, Vec2, Weather } from '../core/types';
import { ITEMS, SHOP_CATALOG, SHOP_HOURS } from '../data/economy';
import { CLOTHING, FIRST_NAMES, LAST_NAMES, OCCUPATIONS } from '../data/residents';
import { distance, SidewalkNavigation } from './navigation';
import { scheduleFor } from './schedules';
import { validateSave } from './validation';

export interface ActionResult { ok: boolean; message: string; }
export interface Delivery { id: string; destinationId: string; reward: number; status: 'active'; }
export interface ResidentTask { goal: string; placeId: string; activity: string; path: Vec2[]; arrived: boolean; }
export interface SimulationSave {
  version: 1; seed: number; time: number; timeScale: number; day: number; weather: Weather; nextWeather: number;
  player: PlayerState; residents: Resident[]; events: CityEvent[]; completedEvents: string[];
  logs: string[]; law: string; shopStock: Record<string, Record<string, number>>;
  delivery: Delivery | null; nextEvent: number; eventSerial: number; elapsed: number;
  residentTasks: Record<string, ResidentTask>; accumulators: Record<string, number>;
}

const clamp = (n: number, max = 100) => Math.max(0, Math.min(max, n));
const result = (ok: boolean, message: string): ActionResult => ({ ok, message });
export const EVENT_TYPES = ['fire', 'collision', 'medical', 'disturbance', 'crime'] as const;

export class Simulation {
  player: PlayerState = { x: 10, z: 28, cash: 1250, bank: 5000, health: 100, stamina: 100, hunger: 82, inventory: { water: 1, biscuits: 1 }, ownedVehicles: [], purchases: [] };
  residents: Resident[] = [];
  time = 16 * 60 + 35;
  timeScale = 1;
  day = 1;
  weather: Weather = 'clear';
  events: CityEvent[] = [];
  logs: string[] = ['Welcome to Navapur. The evening market is beginning to fill.'];
  completedEvents: string[] = [];
  law = 'Peaceful';
  delivery: Delivery | null = null;
  shopStock: Record<string, Record<string, number>> = {};
  readonly navigation: SidewalkNavigation;
  private seed: number;
  private readonly placesById: Map<string, Place>;
  private tasks = new Map<string, ResidentTask>();
  private accumulators = new Map<string, number>();
  private nextWeather = 360;
  private nextEvent = 120;
  private eventSerial = 0;
  private elapsed = 0;

  constructor(readonly places: Place[], readonly roads: number[], seed = 42917) {
    if (!places.length) throw new Error('The simulation needs at least one place.');
    this.seed = seed >>> 0;
    this.navigation = new SidewalkNavigation(roads);
    this.placesById = new Map(places.map(p => [p.id, p]));
    this.restock();
    this.createPopulation();
  }

  private random(): number {
    this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }
  private choose<T>(array: T[]): T { return array[Math.floor(this.random() * array.length)]; }
  private addLog(message: string) { this.logs.unshift(message); if (this.logs.length > 40) this.logs.length = 40; }
  getPlace(id: string): Place | undefined { return this.placesById.get(id); }
  getShopStock(id: string): Record<string, number> { return { ...this.shopStock[id] }; }
  isShopOpen(id: string): boolean {
    const place = this.getPlace(id), hours = place && SHOP_HOURS[place.kind];
    return !!hours && this.time >= hours.open && this.time < hours.close;
  }
  private restock() {
    for (const place of this.places) {
      const catalog = SHOP_CATALOG[place.kind];
      if (catalog) this.shopStock[place.id] = Object.fromEntries(catalog.map(id => [id, 24 + Math.floor(this.random() * 24)]));
    }
  }
  private nearest(from: Vec2, filter: (p: Place) => boolean): Place {
    let nearest = this.places[0], bestDistance = Infinity;
    for (const place of this.places) if (filter(place)) {
      const d = distance(from, place.entrance);
      if (d < bestDistance) { bestDistance = d; nearest = place; }
    }
    return nearest;
  }

  private createPopulation() {
    const homes = this.places.filter(p => p.kind === 'home');
    for (let i = 0; i < 240; i++) {
      const profile = OCCUPATIONS[i % OCCUPATIONS.length];
      const home = this.choose(homes.length ? homes : this.places);
      const jobs = this.places.filter(p => profile.workplace.includes(p.kind));
      const job = this.choose(jobs.length ? jobs : this.places);
      const start = i < 18 ? this.navigation.project({ x: i < 10 ? 10 : -10, z: 12 + i * 2.9 }) : this.navigation.project({ x: (this.random() - .5) * 290, z: (this.random() - .5) * 290 });
      const resident: Resident = {
        id: `resident-${i}`, name: `${FIRST_NAMES[i % FIRST_NAMES.length]} ${LAST_NAMES[Math.floor(i / FIRST_NAMES.length) % LAST_NAMES.length]}`,
        age: profile.name === 'Student' ? (i % 2 ? 'Teenager' : 'Young adult') : profile.name === 'Retired resident' ? 'Senior' : i % 5 === 0 ? 'Young adult' : 'Adult',
        occupation: profile.name, color: CLOTHING[i % CLOTHING.length], home: home.id, workplace: job.id,
        ...start, destination: { ...job.entrance }, activity: 'Walking', goal: 'Begin daily routine', money: 300 + Math.floor(this.random() * 2400),
        hunger: 35 + this.random() * 55, energy: 45 + this.random() * 50, social: 40 + this.random() * 55,
        relationships: { [`resident-${(i + 1) % 240}`]: 65 }, inventory: { groceries: 1 }, memory: [], tier: 'far', heading: 0, moving: false,
      };
      this.residents.push(resident);
    }
    for (const resident of this.residents) {
      const family = this.residents.find(r => r.id !== resident.id && r.home === resident.home);
      const colleague = this.residents.find(r => r.id !== resident.id && r.workplace === resident.workplace);
      if (family) resident.relationships[family.id] = 85;
      if (colleague && colleague.id !== family?.id) resident.relationships[colleague.id] = 55;
    }
  }

  update(dt: number): void {
    if (!Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(dt, 3600);
    this.elapsed += dt;
    this.time += dt * this.timeScale;
    while (this.time >= 1440) {
      this.time -= 1440; this.day++; this.restock();
      for (const r of this.residents) {
        r.money = Math.min(1e8, r.money + (OCCUPATIONS.find(o => o.name === r.occupation)?.wage ?? 300));
        if (!(r.inventory.groceries > 0) && r.money >= ITEMS.groceries.price) { r.inventory.groceries = 1; r.money -= ITEMS.groceries.price; }
      }
      this.addLog(`Day ${this.day}: shops restocked; wages and pensions paid.`);
    }
    this.player.hunger = clamp(this.player.hunger - dt * .045);
    if (this.player.hunger < 8) this.player.health = clamp(this.player.health - dt * .035);
    this.nextWeather -= dt;
    if (this.nextWeather <= 0) { this.setWeather(this.choose<Weather>(['clear', 'cloudy', 'rain'])); this.nextWeather = 360 + this.random() * 240; }
    this.updateEvents(dt);
    for (const r of this.residents) {
      const d = distance(r, this.player);
      r.tier = d < 62 ? 'near' : d < 130 ? 'mid' : 'far';
      const accumulated = (this.accumulators.get(r.id) ?? 0) + dt;
      const interval = r.tier === 'near' ? 0 : r.tier === 'mid' ? .45 : 3.5;
      if (accumulated >= interval) { this.updateResident(r, accumulated); this.accumulators.set(r.id, 0); }
      else this.accumulators.set(r.id, accumulated);
    }
  }

  private updateResident(r: Resident, dt: number) {
    r.hunger = clamp(r.hunger - dt * .045);
    r.energy = clamp(r.energy + dt * (r.activity === 'Sleeping' ? .7 : -.017));
    r.social = clamp(r.social - dt * .012);
    const responder = /Police|Doctor|Nurse/.test(r.occupation);
    const incident = this.events.filter(e => !e.resolved && (responder || distance(r, e) < 32 + e.severity * 2)).sort((a, b) => distance(r, a) - distance(r, b))[0];
    if (incident) {
      const emergencyGoal = `${responder ? 'Respond to' : 'Move away from'} ${incident.id}`;
      const task = this.tasks.get(r.id);
      if (task?.goal !== emergencyGoal) {
        const safe = responder ? this.navigation.project(incident) : this.navigation.project({ x: r.x + (r.x - incident.x || 1) * 2.5, z: r.z + (r.z - incident.z || 1) * 2.5 });
        this.assign(r, emergencyGoal, responder ? 'Helping at emergency' : 'Waiting at a safe distance', '', safe);
        this.remember(r, responder ? `Responded to a ${incident.type}.` : `Saw a ${incident.type}; moved to safety.`);
      }
      r.activity = responder ? 'Responding to emergency' : 'Moving to safety';
      this.move(r, dt, responder ? 3.1 : 2.7);
      return;
    }
    let task = scheduleFor(r, this.time);
    if (r.hunger < 26) task = { activity: 'Eating', goal: 'Find a meal', destination: 'food' };
    if (r.energy < 12) task = { activity: 'Sleeping', goal: 'Rest at home', destination: 'home' };
    let destination: Place;
    if (this.weather === 'rain' && !['Sleeping', 'Working', 'Studying'].includes(task.activity)) {
      task = { activity: 'Sheltering from rain', goal: 'Find shelter', destination: 'home' };
      destination = this.nearest(r, p => p.kind !== 'park' && p.kind !== 'fuel');
    } else if (task.destination === 'home') destination = this.getPlace(r.home)!;
    else if (task.destination === 'work') destination = this.getPlace(r.workplace)!;
    else if (task.destination === 'food') destination = this.nearest(r, p => ['chai', 'restaurant', 'kirana'].includes(p.kind) && this.isShopOpen(p.id));
    else if (task.destination === 'shop') destination = this.nearest(r, p => p.kind === 'kirana' && this.isShopOpen(p.id));
    else destination = this.nearest(r, p => p.kind === 'park');
    const old = this.tasks.get(r.id);
    if (!old || old.goal !== task.goal || old.placeId !== destination.id) this.assign(r, task.goal, task.activity, destination.id, destination.entrance);
    this.move(r, dt, r.age === 'Senior' ? 1.05 : r.occupation === 'Student' ? 1.85 : 1.5);
  }

  private assign(r: Resident, goal: string, activity: string, placeId: string, destination: Vec2) {
    r.goal = goal; r.destination = { ...destination };
    this.tasks.set(r.id, { goal, activity, placeId, path: this.navigation.findPath(r, destination), arrived: false });
  }
  private move(r: Resident, dt: number, speed: number) {
    const task = this.tasks.get(r.id)!;
    let budget = speed * dt;
    r.moving = task.path.length > 0;
    if (r.moving && !/emergency|safety/.test(r.activity)) r.activity = task.goal === 'Find shelter' ? 'Seeking shelter' : `Walking · ${task.goal.toLowerCase()}`;
    while (task.path.length && budget > 0) {
      const next = task.path[0], d = distance(r, next);
      r.heading = Math.atan2(next.x - r.x, next.z - r.z);
      if (d <= budget) { r.x = next.x; r.z = next.z; task.path.shift(); budget -= d; }
      else { r.x += (next.x - r.x) / d * budget; r.z += (next.z - r.z) / d * budget; budget = 0; }
    }
    if (!task.path.length) {
      r.activity = task.activity; r.moving = false;
      if (!task.arrived) { task.arrived = true; this.arrive(r, task); }
    }
  }
  private arrive(r: Resident, task: ResidentTask) {
    if (/Eating|meal|lunch|dinner|breakfast/i.test(task.activity + task.goal)) {
      const place = this.getPlace(task.placeId);
      const food = (place && SHOP_CATALOG[place.kind] || []).filter(id => !!ITEMS[id].hunger && ITEMS[id].price <= r.money && (this.shopStock[task.placeId]?.[id] ?? 0) > 0).sort((a, b) => (ITEMS[b].hunger ?? 0) - (ITEMS[a].hunger ?? 0))[0];
      if (food && this.isShopOpen(task.placeId)) {
        r.money -= ITEMS[food].price; this.shopStock[task.placeId][food]--; r.hunger = clamp(r.hunger + ITEMS[food].hunger!);
        r.energy = clamp(r.energy + (ITEMS[food].energy ?? 5)); this.remember(r, `Ate ${ITEMS[food].name} at ${place!.name}.`);
      } else if (task.placeId === r.home && r.inventory.groceries > 0) { r.inventory.groceries--; r.hunger = clamp(r.hunger + 65); }
      else { r.activity = 'Waiting for food'; task.arrived = false; }
    }
    if (task.activity === 'Shopping' && (this.shopStock[task.placeId]?.fruit ?? 0) > 0 && r.money >= ITEMS.fruit.price && this.isShopOpen(task.placeId)) {
      r.money -= ITEMS.fruit.price; this.shopStock[task.placeId].fruit--; r.inventory.fruit = (r.inventory.fruit ?? 0) + 1; this.remember(r, 'Bought fresh fruit at the market.');
    }
    if (['Relaxing', 'Meeting neighbours'].includes(task.activity)) r.social = clamp(r.social + 25);
  }

  buy(placeId: string, itemId: string): ActionResult {
    const place = this.getPlace(placeId), item = ITEMS[itemId];
    if (!place || !Object.hasOwn(ITEMS, itemId) || !SHOP_CATALOG[place.kind]?.includes(itemId)) return result(false, 'This shop does not sell that item.');
    if (distance(this.player, place.entrance) > 18 && (!place.interior || distance(this.player, place.interior) > 18)) return result(false, 'Visit the shop to make a purchase.');
    if (!this.isShopOpen(placeId)) return result(false, `${place.name} is closed. Check its opening hours.`);
    if ((this.shopStock[placeId]?.[itemId] ?? 0) < 1) return result(false, 'Sold out today. Fresh stock arrives tomorrow.');
    if (this.player.cash < item.price) return result(false, `You need ₹${item.price - this.player.cash} more in cash.`);
    this.player.cash -= item.price; this.shopStock[placeId][itemId]--;
    this.player.inventory[itemId] = (this.player.inventory[itemId] ?? 0) + 1;
    this.player.purchases.push(`${this.day}:${placeId}:${itemId}`); this.player.purchases = this.player.purchases.slice(-150);
    const owner = this.residents.find(r => r.workplace === placeId);
    if (owner) { owner.money += item.price; owner.relationships.player = clamp((owner.relationships.player ?? 0) + 3); this.remember(owner, `The player purchased ${item.name}.`); }
    const message = `Bought ${item.name} for ₹${item.price}.`; this.addLog(message); return result(true, message);
  }

  eat(itemId: string): ActionResult {
    const item = ITEMS[itemId];
    if (!Object.hasOwn(ITEMS, itemId) || !item || (!item.hunger && !item.health && !item.energy)) return result(false, 'This item cannot be consumed.');
    if (!(this.player.inventory[itemId] > 0)) return result(false, 'You do not have this item.');
    this.consumeInventory(itemId);
    this.player.hunger = clamp(this.player.hunger + (item.hunger ?? 0));
    this.player.stamina = clamp(this.player.stamina + (item.energy ?? 0));
    this.player.health = clamp(this.player.health + (item.health ?? 0));
    return result(true, `${item.category === 'health' ? 'Used' : item.category === 'drink' ? 'Enjoyed' : 'Ate'} ${item.name}.`);
  }
  consumeInventory(itemId: string): boolean {
    if (!Object.hasOwn(ITEMS, itemId) || !(this.player.inventory[itemId] > 0)) return false;
    this.player.inventory[itemId]--; if (!this.player.inventory[itemId]) delete this.player.inventory[itemId]; return true;
  }
  sell(itemId: string): ActionResult {
    const item = ITEMS[itemId];
    if (!Object.hasOwn(ITEMS, itemId) || !item || !(this.player.inventory[itemId] > 0)) return result(false, 'There is no item to sell.');
    const place = this.places.find(p => SHOP_CATALOG[p.kind]?.includes(itemId) && this.isShopOpen(p.id) && (distance(this.player, p.entrance) <= 18 || !!p.interior && distance(this.player, p.interior) <= 18));
    if (!place) return result(false, 'Visit an open shop that stocks this item to sell it.');
    const value = Math.floor(item.price * .5); this.consumeInventory(itemId); this.player.cash += value; this.shopStock[place.id][itemId]++;
    return result(true, `Sold ${item.name} for ₹${value}.`);
  }
  deposit(amount: number): ActionResult {
    if (!Number.isSafeInteger(amount) || amount <= 0 || amount > this.player.cash) return result(false, 'Enter a positive amount within your available cash.');
    this.player.cash -= amount; this.player.bank += amount; return result(true, `Deposited ₹${amount}.`);
  }
  withdraw(amount: number): ActionResult {
    if (!Number.isSafeInteger(amount) || amount <= 0 || amount > this.player.bank) return result(false, 'Enter a positive amount within your account balance.');
    this.player.bank -= amount; this.player.cash += amount; return result(true, `Withdrew ₹${amount}.`);
  }

  talk(id: string, topic = 'greeting'): string {
    const r = this.residents.find(n => n.id === id);
    if (!r) return 'They have already moved on.';
    if (distance(this.player, r) > 14) return 'Move a little closer to talk.';
    const rapport = r.relationships.player ?? 0;
    const greeting = rapport >= 45 ? 'Arre, my friend! ' : rapport >= 10 ? 'Good to see you again. ' : 'Namaste! ';
    r.relationships.player = clamp(rapport + 4); r.social = clamp(r.social + 8); this.remember(r, `Player asked about ${topic.slice(0, 40)} on day ${this.day}.`);
    if (topic === 'weather') return this.weather === 'rain' ? `${greeting}The monsoon has caught us out. I’m ${r.activity.toLowerCase()}. The chai stalls have shelter.` : `${greeting}${this.weather === 'cloudy' ? 'Clouds are building. I would keep an umbrella handy.' : 'A beautiful day. The park is lovely when the evening cools down.'}`;
    if (topic === 'work') return `${greeting}I’m a ${r.occupation.toLowerCase()}. You’ll usually find me at ${this.getPlace(r.workplace)?.name ?? 'work'}. Right now I’m ${r.activity.toLowerCase()}.`;
    if (topic === 'directions' || topic === 'shopping') { const p = this.nearest(r, p => p.kind === 'chai'); return `${greeting}${p.name} is about ${Math.round(distance(r, p.entrance))} metres from here. Follow the pavements. The market has groceries and home-style food.`; }
    if (topic === 'news' || topic === 'events') { const e = this.events.find(e => !e.resolved); return e ? `${greeting}There’s a ${e.type} nearby. ${e.message} Please give the emergency team room.` : `${greeting}All quiet today. Evening deliveries pay well; check your city guide for a local job.`; }
    if (topic === 'traffic') return `${greeting}The main roads get busy near the station. Look for the zebra crossings and watch the signals.`;
    if (topic === 'help') return `${greeting}If you’re new here, buy a chai, speak to your neighbours and try a delivery. Small journeys are a good way to learn Navapur.`;
    const remembered = r.memory.find(m => m.includes('purchased'));
    return `${greeting}I’m ${r.name}.${remembered ? ' Thank you for visiting our shop earlier.' : ` I’m ${r.activity.toLowerCase()}.`} ${rapport >= 20 ? 'How has the city been treating you?' : 'Welcome to the neighbourhood.'}`;
  }
  private remember(r: Resident, memory: string) { if (r.memory.at(-1) !== memory) r.memory.push(memory); if (r.memory.length > 12) r.memory.shift(); }

  startDelivery(): ActionResult {
    if (this.delivery) return result(false, 'Finish your current delivery first.');
    const targets = this.places.filter(p => ['home', 'office', 'hospital', 'school', 'station'].includes(p.kind) && distance(this.player, p.entrance) > 55);
    if (!targets.length) return result(false, 'No deliveries are available nearby.');
    const destination = this.choose(targets);
    this.delivery = { id: `delivery-${this.day}-${Math.floor(this.elapsed)}-${Math.floor(this.random() * 10000)}`, destinationId: destination.id, reward: 180 + Math.floor(distance(this.player, destination.entrance) / 10) * 10, status: 'active' };
    const message = `Parcel collected. Deliver to ${destination.name} for ₹${this.delivery.reward}.`; this.addLog(message); return result(true, message);
  }
  completeDelivery(nearPlaceId: string): ActionResult {
    if (!this.delivery) return result(false, 'You do not have an active delivery.');
    const destination = this.getPlace(this.delivery.destinationId)!;
    if (nearPlaceId !== destination.id || distance(this.player, destination.entrance) > 18) return result(false, `Bring this parcel to the entrance of ${destination.name}.`);
    const reward = this.delivery.reward; this.player.cash += reward; this.completedEvents.push(this.delivery.id); this.completedEvents = this.completedEvents.slice(-100); this.delivery = null;
    const message = `Delivery completed. ₹${reward} paid in cash. Shukriya!`; this.addLog(message); return result(true, message);
  }

  setWeather(weather: Weather): void {
    if (!['clear', 'cloudy', 'rain'].includes(weather)) return;
    if (this.weather !== weather) { this.weather = weather; this.addLog(weather === 'rain' ? 'Monsoon shower: pedestrians seek shelter and traffic slows.' : weather === 'cloudy' ? 'Clouds gather over Navapur.' : 'The sky clears over the city.'); }
    this.nextWeather = 360;
  }
  triggerEvent(type: string, x: number, z: number): CityEvent | undefined {
    if (!EVENT_TYPES.includes(type as typeof EVENT_TYPES[number]) || !Number.isFinite(x) || !Number.isFinite(z) || Math.abs(x) > 220 || Math.abs(z) > 220 || this.events.filter(e => !e.resolved).length >= 5) return;
    const messages: Record<string, string> = { fire: 'Small electrical fire reported. Emergency teams dispatched.', collision: 'Minor road collision. Police and medical help are on the way.', medical: 'A neighbour needs medical help. A response team is on its way.', disturbance: 'Public disturbance reported. Police are checking the area.', crime: 'A theft has been reported. Police are investigating.' };
    const event: CityEvent = { id: `event-${++this.eventSerial}`, type, x, z, age: 0, severity: 1, resolved: false, message: messages[type] };
    this.events.push(event); this.events = this.events.slice(-24); this.addLog(event.message);
    this.law = type === 'disturbance' || type === 'crime' ? 'Police responding' : 'Emergency response';
    return event;
  }
  private updateEvents(dt: number) {
    this.nextEvent -= dt;
    if (this.nextEvent <= 0) {
      if (!this.events.some(e => !e.resolved)) { const point = this.navigation.project({ x: this.player.x + 32, z: this.player.z + 28 }); this.triggerEvent('collision', point.x, point.z); }
      this.nextEvent = 240 + this.random() * 120;
    }
    for (const e of this.events) {
      if (e.resolved) continue;
      e.age += dt;
      if (e.type === 'fire') {
        e.severity = Math.min(4, 1 + e.age / 25);
        if (distance(this.player, e) < 3 + e.severity) this.player.health = clamp(this.player.health - dt * e.severity * 1.8);
      }
      const helpArrived = e.age > 18 && this.residents.some(r => /Police|Doctor|Nurse/.test(r.occupation) && distance(r, e) < 15);
      if (helpArrived || e.age >= 110) {
        e.resolved = true; e.message = `${e.type === 'fire' ? 'Fire contained' : e.type === 'collision' ? 'Road cleared' : 'Incident resolved'} by the city response team.`;
        this.completedEvents.push(e.id); this.completedEvents = this.completedEvents.slice(-100); this.addLog(e.message);
      }
    }
    this.law = this.events.some(e => !e.resolved && ['crime', 'disturbance'].includes(e.type)) ? 'Police responding' : this.events.some(e => !e.resolved) ? 'Emergency response' : 'Peaceful';
  }

  save(): string {
    const state: SimulationSave = { version: 1, seed: this.seed, time: this.time, timeScale: this.timeScale, day: this.day, weather: this.weather, nextWeather: this.nextWeather, player: this.player, residents: this.residents, events: this.events, completedEvents: this.completedEvents, logs: this.logs, law: this.law, shopStock: this.shopStock, delivery: this.delivery, nextEvent: this.nextEvent, eventSerial: this.eventSerial, elapsed: this.elapsed, residentTasks: Object.fromEntries(this.tasks), accumulators: Object.fromEntries(this.accumulators) };
    return JSON.stringify(state);
  }
  load(raw: string): ActionResult {
    try {
      if (typeof raw !== 'string' || raw.length > 2_000_000) throw new Error('Save is too large.');
      const data = validateSave(JSON.parse(raw), this.places);
      this.seed = data.seed; this.time = data.time; this.timeScale = data.timeScale; this.day = data.day; this.weather = data.weather; this.nextWeather = data.nextWeather;
      Object.assign(this.player, data.player); this.residents.splice(0, this.residents.length, ...data.residents);
      this.events = data.events; this.completedEvents = data.completedEvents; this.logs = data.logs; this.law = data.law;
      this.shopStock = data.shopStock; this.delivery = data.delivery; this.nextEvent = data.nextEvent; this.eventSerial = data.eventSerial; this.elapsed = data.elapsed;
      this.tasks = new Map(Object.entries(data.residentTasks)); this.accumulators = new Map(Object.entries(data.accumulators));
      return result(true, `Welcome back. Day ${this.day} restored.`);
    } catch (error) { return result(false, `Could not load save: ${error instanceof Error ? error.message : 'invalid data'}`); }
  }
}
