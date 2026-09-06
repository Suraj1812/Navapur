import type { Item, Place, Weather } from '../core/types';
import './style.css';
import './brand.css';

export interface UIView {
  district: string; subtitle?: string; time: string; day?: number; weather: Weather;
  cash: number; health: number; stamina: number; hunger: number; x: number; z: number;
  heading?: number; speed?: number; mode?: string; interaction?: string;
  quests?: { label: string; done: boolean }[];
  residents?: number; fps?: number; debug?: boolean;
  vehicles?: number; activeAI?: number; fuel?: number;
  waypoint?: { x: number; z: number; name?: string } | null;
}

export interface UIOptions {
  onAction: (action: string, value?: string) => void;
  hasSave?: boolean;
}

export interface UISettings {
  weather: Weather; time: number; timeScale: number; audio: boolean; quality: string; debug: boolean;
}

const icons: Record<string, string> = {
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  cloud: '<path d="M6 18a5 5 0 1 1 .8-9.94A6 6 0 0 1 18.6 9 4.5 4.5 0 0 1 18 18Z"/>',
  rain: '<path d="M5 15a4 4 0 0 1 1.8-7.6A5 5 0 0 1 17 8a4 4 0 0 1 2 7M8 18l-1 3m6-3-1 3m6-3-1 3"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  settings: '<path d="m9.8 3-.6 2-2 .9-1.9-.5-2.1 3.4 1.5 1.5v2.4l-1.5 1.5 2.1 3.4 1.9-.5 2 .9.6 2h4.4l.6-2 2-.9 1.9.5 2.1-3.4-1.5-1.5v-2.4l1.5-1.5-2.1-3.4-1.9.5-2-.9-.6-2Z"/><circle cx="12" cy="11.5" r="3"/>',
  arrow: '<path d="M4 12h15m-5-5 5 5-5 5"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m16 8-2 6-6 2 2-6Z"/>',
  pin: '<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2"/>',
  bag: '<path d="M5 8h14l1 13H4L5 8Zm3 0V6a4 4 0 0 1 8 0v2"/>',
  heart: '<path d="M20 5c-2-2-5-2-8 1-3-3-6-3-8-1s-2 5 0 7l8 8 8-8c2-2 2-5 0-7Z"/>',
  bolt: '<path d="m13 2-8 12h6l-1 8 9-13h-7l1-7Z"/>',
  food: '<path d="M5 3v7m3-7v7m3-7v7M5 7h6m-3 3v11M19 3c-4 2-4 7 0 8v10m0-18v8"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  save: '<path d="M5 3h12l4 4v14H3V3h2Zm2 0v6h10V3M7 21v-8h10v8"/>',
  volume: '<path d="M3 9h4l5-4v14l-5-4H3V9Zm12-2a7 7 0 0 1 0 10m3-13a11 11 0 0 1 0 16"/>',
  book: '<path d="M3 4h6c2 0 3 1 3 2 0-1 1-2 3-2h6v16h-6c-2 0-3 1-3 1s-1-1-3-1H3V4Zm9 2v15"/>',
  car: '<path d="m5 7 2-4h10l2 4 2 3v8H3v-8l2-3Zm0 0h14M7 12h1m8 0h1M5 18v3m14-3v3"/>',
};

export const icon = (name: string, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] ?? icons.pin}</svg>`;
export const escapeHTML = (value: unknown) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
const money = (value: number) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value);

export class GameUI {
  readonly element: HTMLDivElement;
  private refs: Record<string, HTMLElement> = {};
  private options: UIOptions;
  private places: Place[] = [];
  private roads: number[] = [];
  private bounds = 300;
  private currentView?: UIView;
  private _panelOpen = false;
  private previousFocus: HTMLElement | null = null;
  private previousQuestKey = '';
  private lastMapAt = 0;
  private map?: HTMLCanvasElement;
  private mapBase = document.createElement('canvas');
  private activeToast: ReturnType<typeof setTimeout> | undefined;
  private started = false;

  constructor(options: UIOptions) {
    this.options = options;
    this.element = document.createElement('div');
    this.element.id = 'game-ui';
    this.element.className = 'game-ui is-welcome';
    this.element.innerHTML = `
      <div class="cinema-shade" aria-hidden="true"></div>
      <header class="topbar">
        <div class="brand"><img class="brand-mark" src="/Navapur/logo-mark.svg" alt="" aria-hidden="true"><div class="brand-type"><span>NAVAPUR<span class="brand-hindi">नवापुर</span></span><small>A CITY. A THOUSAND LIVES.</small></div><span class="live-badge"><i></i> LIVE CITY</span></div>
        <div class="location-heading">${icon('pin')}<div><strong data-ref="district">Old Market</strong><span data-ref="subtitle">NAVAPUR, INDIA</span></div></div>
        <div class="topbar-right"><div class="world-clock"><span class="weather-icon" data-ref="weatherIcon">${icon('sun')}</span><div><b data-ref="time">08:30</b><span><span data-ref="weather">Clear skies</span><i>·</i> DAY <span data-ref="day">1</span></span></div></div><div class="topbar-divider"></div><button class="icon-button" data-action="pause" aria-label="Pause game" title="Pause · Esc">${icon('pause')}</button><button class="icon-button" data-action="settings" aria-label="Open settings" title="Settings">${icon('settings')}</button></div>
      </header>

      <section class="welcome" data-ref="welcome" aria-label="Welcome to Navapur">
        <div class="eyebrow"><span></span> WELCOME TO NAVAPUR</div>
        <h1>Every street<br>has a <em>story.</em></h1>
        <p>The first chai of the morning. The familiar hum of an auto. A thousand lives unfolding around you.</p>
        <p class="welcome-invitation">Step outside. Find your own way.</p>
        <button class="primary-button explore-button" data-action="start"><span>Explore Navapur</span>${icon('arrow')}</button>
        ${options.hasSave ? `<button class="continue-button" data-action="load">${icon('save')} Continue saved game <span>↗</span></button>` : ''}
        <div class="welcome-note"><span class="tiny-dot"></span> An open city. An ordinary, extraordinary life.</div>
      </section>

      <section class="journey-card" data-ref="journal" aria-label="Your city journal">
        <button class="journey-heading" data-action="journal"><span class="eyebrow">YOUR FIRST MORNING</span>${icon('book')}</button>
        <h2>A little chai, a little city.</h2>
        <div class="quest-list" data-ref="quests"></div>
        <span class="journey-footnote">Take your time. The city is going nowhere.</span>
      </section>

      <div class="crosshair" aria-hidden="true"><i></i></div>
      <div class="interaction-prompt" data-ref="interaction" hidden><kbd>E</kbd><span data-ref="interactionText"></span></div>

      <section class="minimap-widget" aria-label="City minimap">
        <div class="minimap-heading"><span>N</span><button data-action="map" aria-label="Open full city map">${icon('compass')}<span>CITY MAP</span><kbd>M</kbd></button></div>
        <button class="map-open-button" data-action="map" aria-label="Open navigation map"><canvas data-ref="minimap" width="480" height="320" aria-label="Map showing roads, places, and your current location"></canvas><span class="map-corner corner-tl"></span><span class="map-corner corner-br"></span></button>
        <div class="minimap-footer"><span class="map-location-dot"></span><strong data-ref="mapDistrict">Old Market</strong><span data-ref="coordinates">NAVAPUR</span></div>
        <div class="waypoint-caption" data-ref="waypoint" hidden></div>
      </section>

      <nav class="controls" aria-label="Game controls"><span class="control-item movement"><span class="keys"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></span><span>Move</span></span><span class="control-separator"></span><button class="control-item" data-action="interact"><kbd>E</kbd><span>Interact</span></button><button class="control-item" data-action="vehicle"><kbd>V</kbd><span>Drive</span></button><button class="control-item" data-action="inventory"><kbd>I</kbd><span>Bag</span></button><button class="control-help" data-action="help" aria-label="Show all controls">?</button></nav>

      <section class="player-status" aria-label="Player status"><div class="cash"><span>IN YOUR POCKET</span><strong>₹ <b data-ref="cash">1,500</b></strong><span class="cash-detail">A little goes a long way.</span></div><div class="vitals"><div class="vital" title="Health"><span>${icon('heart')}<span>Health</span></span><div class="vital-track"><i data-ref="healthBar"></i></div><b data-ref="health">100</b></div><div class="vital stamina" title="Stamina"><span>${icon('bolt')}<span>Energy</span></span><div class="vital-track"><i data-ref="staminaBar"></i></div><b data-ref="stamina">100</b></div><div class="vital hunger" title="Food needs"><span>${icon('food')}<span>Fullness</span></span><div class="vital-track"><i data-ref="hungerBar"></i></div><b data-ref="hunger">100</b></div></div></section>
      <section class="vehicle-hud" data-ref="vehicle" hidden><span data-ref="vehicleName">AUTO-RICKSHAW</span><div><strong data-ref="speed">0</strong><small>KM/H</small></div><p><span data-ref="fuel">100% fuel</span><span><kbd>H</kbd> Horn <kbd>V</kbd> Exit</span></p></section>

      <div class="toast" data-ref="toast" role="status" aria-live="polite"></div>
      <div class="debug-overlay" data-ref="debug" hidden></div>
      <div class="modal-layer" data-ref="modalLayer" hidden>
        <section class="game-panel" data-ref="panel" role="dialog" aria-modal="true" aria-labelledby="panel-title"><header class="panel-header"><div><span class="eyebrow" data-ref="panelSubtitle">YOUR LIFE IN NAVAPUR</span><h2 id="panel-title" data-ref="panelTitle"></h2></div><button class="icon-button panel-close" data-action="ui-close" aria-label="Close panel">${icon('close')}</button></header><div class="panel-content" data-ref="panelContent"></div><footer class="panel-footer"><span>NAVAPUR <span class="footer-dot">·</span> A LIVING CITY</span><span><kbd>ESC</kbd> Back to the city</span></footer></section>
      </div>`;
    document.body.appendChild(this.element);
    this.element.querySelectorAll<HTMLElement>('[data-ref]').forEach((el) => { this.refs[el.dataset.ref!] = el; });
    this.map = this.refs.minimap as HTMLCanvasElement;
    this.element.addEventListener('click', (event) => {
      const target = (event.target as HTMLElement).closest<HTMLElement>('button[data-action]');
      if (target) {
        const action = target.dataset.action!;
        if (action === 'ui-close') { this.closePanel(); return; }
        this.options.onAction(action, target.dataset.value);
      } else if (event.target === this.refs.modalLayer) this.closePanel();
    });
    this.element.addEventListener('change', (event) => {
      const input = event.target as HTMLInputElement;
      if (input.dataset.action) this.options.onAction(input.dataset.action, input.type === 'checkbox' ? String(input.checked) : input.value);
    });
    this.element.addEventListener('keydown', (event) => {
      if (!this._panelOpen) return;
      if (event.key === 'Escape') { event.stopPropagation(); this.closePanel(); }
      if (event.key === 'Tab') {
        const focusable = [...this.refs.panel.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input, select, textarea, [tabindex="0"]')];
        const first = focusable[0]; const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    });
  }

  get isPanelOpen() { return this._panelOpen; }

  setStarted(started = true) {
    this.started = started;
    this.element.classList.toggle('is-welcome', !started);
    this.element.classList.toggle('has-started', started);
    this.refs.welcome.setAttribute('aria-hidden', String(started));
    if (started && document.activeElement instanceof HTMLElement) document.activeElement.blur();
  }

  setMap(places: Place[], roads: number[], bounds: number) {
    this.places = places;
    this.roads = roads;
    this.bounds = bounds;
    this.createMapBase();
  }

  update(view: UIView) {
    this.currentView = view;
    this.setText('district', view.district);
    this.setText('mapDistrict', view.district);
    this.setText('subtitle', view.subtitle || 'NAVAPUR, INDIA');
    this.setText('time', view.time);
    this.setText('day', String(view.day ?? 1));
    this.setText('weather', view.weather === 'clear' ? 'Clear skies' : view.weather === 'cloudy' ? 'Overcast' : 'Monsoon rain');
    const weatherIcon = view.weather === 'clear' ? 'sun' : view.weather === 'cloudy' ? 'cloud' : 'rain';
    if (this.refs.weatherIcon.dataset.weather !== weatherIcon) {
      this.refs.weatherIcon.innerHTML = icon(weatherIcon);
      this.refs.weatherIcon.dataset.weather = weatherIcon;
    }
    this.setText('cash', money(view.cash));
    for (const key of ['health', 'stamina', 'hunger'] as const) {
      const value = Math.max(0, Math.min(100, view[key]));
      this.setText(key, String(Math.round(value)));
      this.refs[`${key}Bar`].style.transform = `scaleX(${value / 100})`;
      this.refs[`${key}Bar`].classList.toggle('is-low', value < 25);
    }
    this.refs.interaction.hidden = !view.interaction || !this.started || this._panelOpen;
    this.setText('interactionText', view.interaction || '');
    const driving = Boolean(view.mode && view.mode !== 'walking' && view.mode !== 'walk' && view.mode !== 'on foot');
    this.refs.vehicle.hidden = !driving || !this.started;
    this.element.classList.toggle('is-driving', driving);
    if (driving) {
      this.setText('vehicleName', view.mode!.replaceAll('-', ' ').toUpperCase());
      this.setText('speed', String(Math.round(Math.abs(view.speed ?? 0))));
      this.setText('fuel', `${Math.round(view.fuel ?? 100)}% fuel`);
    }
    if (view.quests) {
      const questKey = JSON.stringify(view.quests);
      if (questKey !== this.previousQuestKey) {
        this.refs.quests.innerHTML = view.quests.map((q) => `<div class="quest ${q.done ? 'completed' : ''}"><span class="quest-check">${q.done ? icon('check') : ''}</span><span>${escapeHTML(q.label)}</span></div>`).join('');
        this.previousQuestKey = questKey;
      }
    }
    this.refs.debug.hidden = !view.debug;
    if (view.debug) this.refs.debug.textContent = `${Math.round(view.fps ?? 0)} FPS · ${view.residents ?? 0} residents · ${view.activeAI ?? 0} nearby · ${view.vehicles ?? 0} vehicles\n${view.x.toFixed(1)}, ${view.z.toFixed(1)} · ${view.weather} · ${view.time}`;
    this.refs.waypoint.hidden = !view.waypoint;
    if (view.waypoint) this.setText('waypoint', `${view.waypoint.name || 'Waypoint'} · ${Math.round(Math.hypot(view.x - view.waypoint.x, view.z - view.waypoint.z))} m`);
    if (performance.now() - this.lastMapAt > 100) {
      this.lastMapAt = performance.now();
      if (this.map) this.drawMap(this.map);
      const fullMap = this.refs.panelContent.querySelector<HTMLCanvasElement>('.full-map');
      if (fullMap) this.drawMap(fullMap);
    }
  }

  private setText(ref: string, text: string) {
    if (this.refs[ref].textContent !== text) this.refs[ref].textContent = text;
  }

  toast(message: string) {
    if (this.activeToast) clearTimeout(this.activeToast);
    this.refs.toast.innerHTML = `${icon('check')}<span>${escapeHTML(message)}</span>`;
    this.refs.toast.classList.add('visible');
    this.activeToast = setTimeout(() => this.refs.toast.classList.remove('visible'), 4300);
  }

  openPanel(title: string, html: string, subtitle = 'YOUR LIFE IN NAVAPUR') {
    if (!this._panelOpen) this.previousFocus = document.activeElement as HTMLElement;
    this._panelOpen = true;
    this.refs.modalLayer.hidden = false;
    this.element.classList.add('panel-open');
    this.setText('panelTitle', title);
    this.setText('panelSubtitle', subtitle);
    this.refs.panelContent.innerHTML = html;
    this.refs.panelContent.scrollTop = 0;
    this.refs.panel.querySelector<HTMLButtonElement>('button')?.focus();
    this.refs.interaction.hidden = true;
  }

  closePanel() {
    if (!this._panelOpen) return;
    this._panelOpen = false;
    this.refs.modalLayer.hidden = true;
    this.element.classList.remove('panel-open');
    this.previousFocus?.focus();
    this.options.onAction('panel-close');
  }

  pausePanel() {
    this.openPanel('A moment to yourself.', `<p class="panel-description">The city can wait. Pick up where you left off.</p><div class="menu-actions"><button class="primary-button" data-action="ui-close">Back to the city ${icon('arrow')}</button><button class="secondary-button" data-action="save">${icon('save')} Save your journey</button><button class="secondary-button" data-action="load">${icon('compass')} Load saved journey</button><button class="secondary-button" data-action="settings">${icon('settings')} Settings</button><button class="text-button" data-action="help">View controls & city guide</button></div>`, 'PAUSED · NAVAPUR');
  }

  settingsPanel(settings: UISettings) {
    this.openPanel('Make yourself at home.', `
      <p class="panel-description">Set the mood of your city.</p>
      <div class="settings-group"><h3>THE WORLD</h3>
        <label class="setting-row"><span>Weather<small>A different feeling on every street.</small></span><select data-action="weather" aria-label="Weather"><option value="clear" ${settings.weather === 'clear' ? 'selected' : ''}>Clear skies</option><option value="cloudy" ${settings.weather === 'cloudy' ? 'selected' : ''}>Overcast</option><option value="rain" ${settings.weather === 'rain' ? 'selected' : ''}>Monsoon rain</option></select></label>
        <label class="setting-row"><span>Time of day<small>Watch the city find its rhythm.</small></span><select data-action="time" aria-label="Time of day">${[[6.5, 'Early morning · 06:30'], [9, 'Morning · 09:00'], [13, 'Afternoon · 13:00'], [17.5, 'Golden hour · 17:30'], [20, 'Evening · 20:00'], [0, 'Midnight · 00:00']].map(([value, label]) => `<option value="${value}" ${Math.abs(settings.time - Number(value)) < 1.5 ? 'selected' : ''}>${label}</option>`).join('')}</select></label>
        <label class="setting-row"><span>Pace of the day<small>How quickly city time moves.</small></span><select data-action="timescale" aria-label="Time speed">${[[0, 'Hold this moment'], [1, 'Real time'], [30, 'Leisurely · 30×'], [60, 'City rhythm · 60×'], [180, 'Fast forward · 180×']].map(([value, label]) => `<option value="${value}" ${settings.timeScale === value ? 'selected' : ''}>${label}</option>`).join('')}</select></label>
      </div>
      <div class="settings-group"><h3>THE EXPERIENCE</h3>
        <label class="setting-row"><span>City sounds<small>Traffic, birds, footsteps, and rain.</small></span><span class="toggle"><input type="checkbox" data-action="audio" ${settings.audio ? 'checked' : ''} aria-label="City sounds"><i></i></span></label>
        <label class="setting-row"><span>Visual quality<small>Adjust detail for your device.</small></span><select data-action="quality" aria-label="Visual quality"><option value="high" ${settings.quality === 'high' ? 'selected' : ''}>Cinematic</option><option value="low" ${settings.quality !== 'high' ? 'selected' : ''}>Performance</option></select></label>
        <label class="setting-row"><span>Simulation details<small>Show performance and population.</small></span><span class="toggle"><input type="checkbox" data-action="debug" ${settings.debug ? 'checked' : ''} aria-label="Simulation details"><i></i></span></label>
      </div><button class="text-button" data-action="help">Explore the controls ${icon('arrow')}</button>`, 'SETTINGS');
  }

  inventoryPanel(items: { item: Item; quantity: number }[]) {
    this.openPanel('The things you carry.', `<p class="panel-description">A few essentials for wherever the day takes you.</p>${items.length ? `<div class="item-list">${items.map(({ item, quantity }) => `<article class="item-row"><span class="item-symbol">${icon(item.category === 'food' || item.hunger ? 'food' : 'bag')}</span><div class="item-info"><h3>${escapeHTML(item.name)} <span>× ${quantity}</span></h3><p>${escapeHTML(item.category)}${item.hunger ? ` · +${item.hunger} fullness` : ''}${item.energy ? ` · +${item.energy} energy` : ''}${item.health ? ` · +${item.health} health` : ''}</p></div><div class="item-actions">${item.hunger || item.energy || item.health ? `<button class="small-button" data-action="eat" data-value="${escapeHTML(item.id)}">${item.category === 'medicine' ? 'Use' : 'Enjoy'}</button>` : ''}<button class="text-button" data-action="sell" data-value="${escapeHTML(item.id)}">Sell ₹${Math.floor(item.price * 0.5)}</button></div></article>`).join('')}</div>` : `<div class="empty-state">${icon('bag')}<h3>A little room for possibility.</h3><p>Your bag is empty. Stop by a chai stall or a kirana store to pick up something for the road.</p><button class="secondary-button" data-action="map">Find a nearby shop ${icon('arrow')}</button></div>`}`, 'YOUR BAG');
  }

  mapPanel() {
    this.openPanel('Find your next little adventure.', `<p class="panel-description">Choose a destination. There is always something along the way.</p><div class="full-map-wrap"><canvas class="full-map" width="1000" height="650" aria-label="Full city map"></canvas><span class="full-map-north">N ↑</span><div class="map-legend"><span><i></i> You are here</span><span><i></i> Places to discover</span></div></div><div class="map-list-heading"><h3>AROUND THE CITY</h3><button class="text-button" data-action="clear-waypoint">Clear route</button></div><div class="place-list">${this.places.map((p) => `<button class="place-row" data-action="waypoint" data-value="${escapeHTML(p.id)}"><span class="place-icon">${icon(p.kind === 'park' ? 'sun' : p.kind === 'chai' || p.kind === 'restaurant' ? 'food' : p.kind === 'home' ? 'pin' : 'bag')}</span><span><strong>${escapeHTML(p.name)}</strong><small>${escapeHTML(p.district)} · ${escapeHTML(p.hindi)}</small></span><span class="place-distance">${this.currentView ? `${Math.round(Math.hypot(p.x - this.currentView.x, p.z - this.currentView.z))} m` : ''}${icon('arrow')}</span></button>`).join('')}</div>`, 'NAVAPUR · CITY MAP');
    const fullMap = this.refs.panelContent.querySelector<HTMLCanvasElement>('.full-map');
    if (fullMap) this.drawMap(fullMap);
  }

  helpPanel() {
    this.openPanel('A city at your own pace.', `<p class="panel-description">There is no hurry. Explore, meet your neighbours, and make a life in Navapur.</p><div class="controls-guide">${[['W A S D / ↑ ↓ ← →', 'Walk / steer a vehicle'], ['SHIFT', 'Run'], ['SPACE', 'Jump / brake in a vehicle'], ['Drag mouse / Q & R', 'Look around'], ['Mouse wheel', 'Adjust camera distance'], ['E', 'Talk, shop, or enter a place'], ['V', 'Enter or leave a nearby vehicle'], ['H / L', 'Horn / vehicle headlights'], ['I', 'Open your bag'], ['M', 'Explore the city map'], ['ESC', 'Pause or close a panel'], ['F3', 'Show simulation details']].map(([key, action]) => `<div><kbd>${key}</kbd><span>${action}</span></div>`).join('')}</div><div class="guide-note"><strong>Your first morning</strong><p>Find a chai stall, enjoy something from your bag, and say namaste to a neighbour. Choose any place on the map to set a waypoint. Your money, purchases, location, and relationships stay with your saved journey.</p></div>`, 'THE CITY GUIDE');
  }

  private createMapBase() {
    this.mapBase.width = 1000; this.mapBase.height = 1000;
    const ctx = this.mapBase.getContext('2d')!;
    const size = 1000;
    const scale = size / (this.bounds * 2);
    const project = (v: number) => (v + this.bounds) * scale;
    ctx.fillStyle = '#182220'; ctx.fillRect(0, 0, size, size);
    const ordered = [-this.bounds, ...this.roads, this.bounds].sort((a, b) => a - b);
    for (let a = 0; a < ordered.length - 1; a++) {
      for (let b = 0; b < ordered.length - 1; b++) {
        const x = project(ordered[a]) + 11; const y = project(ordered[b]) + 11;
        const w = (ordered[a + 1] - ordered[a]) * scale - 22;
        const h = (ordered[b + 1] - ordered[b]) * scale - 22;
        if (w > 0 && h > 0) {
          ctx.fillStyle = (a + b) % 3 === 0 ? '#27332e' : '#24302c';
          ctx.fillRect(x, y, w, h);
          ctx.strokeStyle = '#2c3730'; ctx.lineWidth = 2; ctx.strokeRect(x + 4, y + 4, w - 8, h - 8);
          ctx.fillStyle = '#1b2622';
          ctx.fillRect(x + w * .45, y, Math.max(2, w * .08), h);
          ctx.fillRect(x, y + h * .49, w, Math.max(2, h * .08));
        }
      }
    }
    ctx.strokeStyle = '#65706a'; ctx.lineWidth = Math.max(2, scale * 2);
    this.roads.forEach((r) => {
      ctx.beginPath(); ctx.moveTo(project(r), 0); ctx.lineTo(project(r), size); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, project(r)); ctx.lineTo(size, project(r)); ctx.stroke();
    });
    this.places.forEach((p) => {
      ctx.fillStyle = p.kind === 'park' ? '#637a58' : '#bda276';
      ctx.globalAlpha = p.kind === 'park' ? .7 : .6;
      const s = p.kind === 'park' ? 30 : 12;
      ctx.fillRect(project(p.x) - s / 2, project(p.z) - s / 2, s, s);
    });
    ctx.globalAlpha = 1;
  }

  private drawMap(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { width, height } = canvas;
    const isFull = canvas.classList.contains('full-map');
    const size = isFull ? height * .94 : Math.max(width, height) * .96;
    const scale = size / (this.bounds * 2);
    const ox = (width - size) / 2; const oy = (height - size) / 2;
    const px = (x: number) => ox + (x + this.bounds) * scale;
    const py = (z: number) => oy + (z + this.bounds) * scale;
    ctx.fillStyle = '#182220'; ctx.fillRect(0, 0, width, height);
    ctx.drawImage(this.mapBase, ox, oy, size, size);
    const view = this.currentView;
    if (!view) return;
    if (view.waypoint) {
      ctx.save(); ctx.setLineDash([5, 7]); ctx.strokeStyle = '#edbd7b'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(px(view.x), py(view.z)); ctx.lineTo(px(view.waypoint.x), py(view.waypoint.z)); ctx.stroke(); ctx.restore();
      ctx.fillStyle = '#edbd7b'; ctx.beginPath(); ctx.arc(px(view.waypoint.x), py(view.waypoint.z), isFull ? 8 : 5, 0, Math.PI * 2); ctx.fill();
      if (isFull && view.waypoint.name) { ctx.font = '18px system-ui'; ctx.fillText(view.waypoint.name, px(view.waypoint.x) + 15, py(view.waypoint.z) - 12); }
    }
    const x = px(view.x); const y = py(view.z);
    ctx.fillStyle = '#eab97a20'; ctx.beginPath(); ctx.arc(x, y, isFull ? 27 : 23, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#eab97a50'; ctx.lineWidth = 1; ctx.stroke();
    ctx.save(); ctx.translate(x, y); ctx.rotate(view.heading ?? 0);
    ctx.fillStyle = '#f4d29e'; ctx.shadowColor = '#f7bb6b'; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(7, 8); ctx.lineTo(0, 4); ctx.lineTo(-7, 8); ctx.closePath(); ctx.fill(); ctx.restore();
    if (isFull) {
      ctx.fillStyle = '#b8bdb6'; ctx.font = '15px system-ui';
      const named = new Set<string>();
      this.places.forEach((p) => { if (!named.has(p.district)) { named.add(p.district); ctx.fillText(p.district.toUpperCase(), px(p.x) - 15, py(p.z) - 22); } });
    }
  }
}
