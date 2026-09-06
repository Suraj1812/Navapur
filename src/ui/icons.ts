/**
 * The Navapur icon system.
 *
 * One optical grid (24 x 24), one stroke weight (1.5), rounded caps and joins,
 * and `currentColor` throughout, so every glyph sits at the same visual weight
 * next to the brand mark. Each icon carries metadata - an accessible label, a
 * description, keywords, a category and a usage note - so the set stays
 * searchable and self-documenting as it grows.
 */

export type IconCategory =
  | 'brand' | 'weather' | 'time' | 'navigation' | 'player'
  | 'places' | 'transport' | 'commerce' | 'system' | 'status';

export interface IconMeta {
  /** Accessible name, used verbatim for aria-label and <title>. */
  label: string;
  /** What the glyph depicts and what it signals in the interface. */
  description: string;
  /** Search terms, including synonyms a designer might type. */
  keywords: string[];
  category: IconCategory;
  /** Where this icon is meant to be used, and where it should not be. */
  usage: string;
}

interface IconDefinition { path: string; meta: IconMeta; fill?: boolean; }

const define = (
  path: string, label: string, description: string, category: IconCategory,
  keywords: string[], usage: string, fill = false,
): IconDefinition => ({ path, meta: { label, description, keywords, category, usage }, fill });

export const ICONS = {
  /* ------------------------------------------------ weather and time */
  sun: define(
    '<circle cx="12" cy="12" r="4"/><path d="M12 2.6v2.2m0 14.4v2.2M2.6 12h2.2m14.4 0h2.2M5.3 5.3l1.6 1.6m10.2 10.2 1.6 1.6M5.3 18.7l1.6-1.6m10.2-10.2 1.6-1.6"/>',
    'Clear skies', 'A sun with eight rays, used for clear daytime weather and for sunlit outdoor places.',
    'weather', ['sun', 'clear', 'day', 'sunny', 'bright', 'weather'],
    'Weather readout in the top bar; park and outdoor entries in the city map.'),
  moon: define(
    '<path d="M20 14.2A8.4 8.4 0 0 1 9.8 4 8.4 8.4 0 1 0 20 14.2Z"/>',
    'Night', 'A crescent moon marking night hours and the night-time lighting preset.',
    'time', ['moon', 'night', 'evening', 'dark', 'sleep'],
    'Time-of-day controls and any night indicator. Never used for weather.'),
  cloud: define(
    '<path d="M6.6 18.5a4.6 4.6 0 0 1 .6-9.16A6 6 0 0 1 18.5 9.2a4.65 4.65 0 0 1-.4 9.3Z"/>',
    'Overcast', 'A soft cumulus outline for cloudy weather.',
    'weather', ['cloud', 'overcast', 'cloudy', 'grey', 'weather'],
    'Weather readout and the weather selector in settings.'),
  rain: define(
    '<path d="M6.8 15.4a4.3 4.3 0 0 1 .7-8.5 5.7 5.7 0 0 1 10.6.8 4.3 4.3 0 0 1 .7 7.7"/><path d="M8.4 18.1 7.6 21m5-2.9-.8 2.9m5-2.9-.8 2.9"/>',
    'Monsoon rain', 'A cloud with three falling drops, for rain and the monsoon weather state.',
    'weather', ['rain', 'monsoon', 'wet', 'shower', 'storm', 'weather'],
    'Weather readout, weather selector, and wet-street messaging.'),
  wind: define(
    '<path d="M3 8h9.5a2.5 2.5 0 1 0-2.5-2.5M3 12h13a2.6 2.6 0 1 1-2.6 2.6M3 16h7.5a2.2 2.2 0 1 1-2.2 2.2"/>',
    'Breeze', 'Three drifting air lines, used for wind and ventilation cues.',
    'weather', ['wind', 'breeze', 'air', 'draft'],
    'Ambient detail in weather panels. Not a primary weather state.'),
  clock: define(
    '<circle cx="12" cy="12" r="8.6"/><path d="M12 7.2V12l3.3 2"/>',
    'City clock', 'A clock face reading ten past, for the in-world time and time-scale controls.',
    'time', ['clock', 'time', 'hour', 'schedule', 'day'],
    'The world clock in the top bar and the time-scale setting.'),
  calendar: define(
    '<rect x="3.6" y="5.2" width="16.8" height="15.2" rx="2.4"/><path d="M3.6 10h16.8M8.4 3.4v3.4m7.2-3.4v3.4"/>',
    'Day', 'A calendar page marking the simulated day counter.',
    'time', ['calendar', 'day', 'date', 'schedule'],
    'Day counter beside the clock; journal entries by day.'),

  /* ------------------------------------------------ navigation */
  pin: define(
    '<path d="M19 10.2c0 5.1-7 10.9-7 10.9S5 15.3 5 10.2a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10.1" r="2.4"/>',
    'Location', 'A map pin, used for the current district and for any single place on the map.',
    'navigation', ['pin', 'location', 'place', 'marker', 'here', 'map'],
    'District heading, place rows, waypoint confirmations.'),
  compass: define(
    '<circle cx="12" cy="12" r="8.6"/><path d="m15.6 8.4-2 5.2-5.2 2 2-5.2Z"/>',
    'City map', 'A compass rose inside a ring, opening the full city map.',
    'navigation', ['compass', 'map', 'direction', 'north', 'navigate', 'explore'],
    'The minimap header button and the map panel.'),
  map: define(
    '<path d="M9 4.4 3.6 6.8v12.8L9 17.2m0-12.8 6 2.4m-6-2.4v12.8m6-10.4 5.4-2.4v12.8L15 19.6m0-12.8v12.8m0 0-6-2.4"/>',
    'Neighbourhood map', 'A folded paper map for the full-city view.',
    'navigation', ['map', 'atlas', 'city', 'plan', 'districts'],
    'Full map panel heading and map shortcuts.'),
  route: define(
    '<circle cx="6" cy="6.4" r="2.4"/><circle cx="18" cy="17.6" r="2.4"/><path d="M8.4 6.4h5.2a3.4 3.4 0 0 1 0 6.8h-3.2a3.4 3.4 0 0 0 0 6.8"/>',
    'Route', 'A path winding between two nodes, for a set destination.',
    'navigation', ['route', 'path', 'directions', 'waypoint', 'journey'],
    'Active waypoint chip and delivery instructions.'),
  flag: define(
    '<path d="M6 21V4.2m0 0h11.4l-2.6 4.2 2.6 4.2H6"/>',
    'Destination', 'A pennant on a pole, marking a destination or a completed goal.',
    'navigation', ['flag', 'destination', 'goal', 'target', 'finish'],
    'Waypoint markers and quest destinations.'),
  arrow: define(
    '<path d="M4.2 12h14.4m-5.2-5.2L18.6 12l-5.2 5.2"/>',
    'Continue', 'A right-pointing arrow for forward actions and links.',
    'system', ['arrow', 'next', 'forward', 'continue', 'go', 'right'],
    'Primary buttons and list rows. Mirrors automatically in right-to-left layouts.'),
  back: define(
    '<path d="M19.8 12H5.4m5.2-5.2L5.4 12l5.2 5.2"/>',
    'Back', 'A left-pointing arrow for returning to the previous view.',
    'system', ['arrow', 'back', 'previous', 'return', 'left'],
    'Panel back links and breadcrumb navigation.'),

  /* ------------------------------------------------ player */
  heart: define(
    '<path d="M20.2 5.6c-2-2-5.1-2-8.2 1-3.1-3-6.2-3-8.2-1s-2 5.1 0 7.2l8.2 8 8.2-8c2-2.1 2-5.2 0-7.2Z"/>',
    'Health', 'A heart, showing the resident&apos;s health.',
    'player', ['heart', 'health', 'life', 'vitality', 'wellbeing'],
    'The health vital bar and any healing item.'),
  bolt: define(
    '<path d="M13.2 2.4 5.4 14.1h5.6l-1 7.5 8-11.9h-5.5Z"/>',
    'Energy', 'A lightning bolt for stamina and energy.',
    'player', ['bolt', 'energy', 'stamina', 'sprint', 'power'],
    'The energy vital bar, sprinting hints and energy-restoring items.'),
  food: define(
    '<path d="M5 2.8v7.4m3-7.4v7.4m3-7.4v7.4M5 6.6h6m-3 3.6V21M19 2.8c-3.7 1.9-3.7 6.9 0 8v10.2m0-18.2v8"/>',
    'Fullness', 'A fork and knife, for hunger, food items and eateries.',
    'player', ['food', 'hunger', 'eat', 'meal', 'fullness', 'restaurant'],
    'The fullness vital bar, food items in the bag, and restaurant places.'),
  bag: define(
    '<path d="M5.2 8h13.6l1 12.4H4.2Zm3-.2V6a3.8 3.8 0 0 1 7.6 0v1.8"/>',
    'Your bag', 'A shopping bag with handles, for the inventory.',
    'player', ['bag', 'inventory', 'items', 'carry', 'shopping'],
    'Inventory panel, item rows and the empty-bag state.'),
  user: define(
    '<circle cx="12" cy="8" r="3.6"/><path d="M4.8 20.4a7.2 7.2 0 0 1 14.4 0"/>',
    'Resident', 'A single person, used for an individual resident.',
    'player', ['user', 'person', 'resident', 'profile', 'neighbour'],
    'Dialogue headers and resident profiles.'),
  users: define(
    '<circle cx="9.4" cy="8.2" r="3.2"/><path d="M3.4 19.8a6 6 0 0 1 12 0M16.4 5.4a3.2 3.2 0 0 1 0 6.2m1.4 2.6a6 6 0 0 1 3 5.6"/>',
    'Neighbours', 'Two overlapping figures, for crowds and community.',
    'player', ['users', 'people', 'crowd', 'community', 'residents'],
    'Population counters and community panels.'),
  chat: define(
    '<path d="M20.4 12.6c0 3.9-3.8 7-8.4 7a10 10 0 0 1-2.6-.34L4.2 21l1.3-3.6a6.5 6.5 0 0 1-2-4.8c0-3.9 3.8-7 8.5-7s8.4 3.1 8.4 7Z"/>',
    'Talk', 'A speech bubble, for conversation with residents.',
    'player', ['chat', 'talk', 'speak', 'dialogue', 'conversation', 'message'],
    'The interact prompt when facing a resident, and dialogue panels.'),
  book: define(
    '<path d="M3.4 4.4h5.2c1.9 0 3.4.9 3.4 2 0-1.1 1.5-2 3.4-2h5.2v15h-5.2c-1.9 0-3.4.9-3.4.9s-1.5-.9-3.4-.9H3.4Zm8.6 2v13.5"/>',
    'Journal', 'An open book, for the journal and the day&apos;s goals.',
    'player', ['book', 'journal', 'diary', 'quests', 'notes', 'story'],
    'The journal button and quest lists.'),
  quest: define(
    '<circle cx="12" cy="12" r="8.6"/><path d="m8.4 12.2 2.5 2.5 4.7-5"/>',
    'Goal complete', 'A tick inside a circle, marking a finished goal.',
    'status', ['quest', 'goal', 'complete', 'done', 'achievement', 'tick'],
    'Completed quest rows. Use check for inline confirmations instead.'),
  star: define(
    '<path d="m12 3.4 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.9l6.1-.9Z"/>',
    'Favourite', 'A five-point star for favourites and highlights.',
    'status', ['star', 'favourite', 'bookmark', 'rating', 'highlight'],
    'Saved places and highlighted moments.'),

  /* ------------------------------------------------ transport */
  rickshaw: define(
    '<path d="M4.6 16.6V11l2.4-4.2h7.2V16.6"/><path d="M14.2 6.8h2.6l2.6 5v4.8"/><circle cx="7" cy="18.4" r="2"/><circle cx="17.4" cy="18.4" r="2"/><path d="M9 18.4h6.4M4.6 11h9.6"/>',
    'Auto-rickshaw', 'A three-wheeler in profile, the signature vehicle of the city.',
    'transport', ['rickshaw', 'auto', 'tuk tuk', 'three wheeler', 'drive', 'taxi'],
    'The drive prompt, vehicle panels and transport places.'),
  car: define(
    '<path d="m5 10.6 1.9-4.2h10.2l1.9 4.2 1.6 2.4v5.4H3.4V13Z"/><path d="M5 10.6h14M6.8 15.4h1.4m7.6 0h1.4M4.6 18.4v2.2m14.8-2.2v2.2"/>',
    'Car', 'A small hatchback in profile, for cars and driving.',
    'transport', ['car', 'vehicle', 'drive', 'traffic', 'automobile'],
    'Vehicle lists and driving controls.'),
  bus: define(
    '<rect x="4" y="4.4" width="16" height="12.4" rx="2.2"/><path d="M4 10.4h16M7.6 16.8v2.8m8.8-2.8v2.8"/><circle cx="8" cy="13.6" r="1"/><circle cx="16" cy="13.6" r="1"/>',
    'City bus', 'A bus front with windows and lamps, for public transport.',
    'transport', ['bus', 'transport', 'transit', 'stop', 'station', 'commute'],
    'Bus stops, the junction district and transit directions.'),
  bike: define(
    '<circle cx="6" cy="16.6" r="3.4"/><circle cx="18" cy="16.6" r="3.4"/><path d="m6 16.6 4-8.4h5l3 8.4M10 8.2h4.4M9.4 16.6h5"/>',
    'Two-wheeler', 'A bicycle silhouette, for cycles and scooters.',
    'transport', ['bike', 'bicycle', 'cycle', 'scooter', 'two wheeler'],
    'Cycle racks, scooters and two-wheeler prompts.'),
  fuel: define(
    '<path d="M4.6 20.6V5.4a2 2 0 0 1 2-2h5.2a2 2 0 0 1 2 2v15.2M3.6 20.6h11.2M5.4 10.2h7.6"/><path d="M13.8 8.2h2.6a1.8 1.8 0 0 1 1.8 1.8v5.6a1.6 1.6 0 0 0 3.2 0V9.4l-2-2.6"/>',
    'Fuel', 'A petrol pump beside a tank, for fuel level and filling stations.',
    'transport', ['fuel', 'petrol', 'diesel', 'pump', 'refill', 'tank'],
    'The fuel gauge while driving and fuel-station places.'),
  wrench: define(
    '<path d="M15.4 3.6a5.4 5.4 0 0 0-4.9 7.6L3.6 18.1l2.3 2.3 6.9-6.9a5.4 5.4 0 0 0 6.8-7.2l-3 3-2.4-2.4 3-3a5.4 5.4 0 0 0-1.8-.3Z"/>',
    'Repairs', 'A spanner, for mechanics, repairs and vehicle condition.',
    'transport', ['wrench', 'spanner', 'repair', 'mechanic', 'garage', 'service'],
    'Mechanic shops, damage readouts and repair items.'),
  gauge: define(
    '<path d="M4 17.4a8.6 8.6 0 1 1 16 0"/><path d="m12 17.4 4.2-5.6"/><circle cx="12" cy="17.4" r="1.4"/>',
    'Speed', 'A speedometer needle, for speed and performance readouts.',
    'transport', ['gauge', 'speed', 'speedometer', 'performance', 'fps'],
    'Driving speed, and the performance overlay.'),

  /* ------------------------------------------------ places and trade */
  home: define(
    '<path d="M3.8 10.4 12 3.6l8.2 6.8v9.2a1.4 1.4 0 0 1-1.4 1.4H5.2a1.4 1.4 0 0 1-1.4-1.4Z"/><path d="M9.4 21v-6.6h5.2V21"/>',
    'Home', 'A house with a door, for homes and residential places.',
    'places', ['home', 'house', 'residence', 'colony', 'rest', 'live'],
    'Home places on the map and rest actions.'),
  shop: define(
    '<path d="M4 9.4h16v10.2a1.4 1.4 0 0 1-1.4 1.4H5.4A1.4 1.4 0 0 1 4 19.6Z"/><path d="M3.2 9.4 5 4.2h14l1.8 5.2M8.6 9.4c0 1.6-1.2 2.8-2.7 2.8m5.4-2.8c0 1.6 1.2 2.8 2.7 2.8m2.7-2.8c0 1.6 1.2 2.8 2.7 2.8"/>',
    'Shop', 'An awning over a storefront, for shops and markets.',
    'commerce', ['shop', 'store', 'market', 'kirana', 'bazaar', 'retail'],
    'Shop places, the buy panel and market districts.'),
  chai: define(
    '<path d="M4.6 8.4h11.2v5.4a5.6 5.6 0 0 1-11.2 0Z"/><path d="M15.8 9.6h1.8a2.6 2.6 0 0 1 0 5.2h-1.8M4 20.6h13"/><path d="M8 5.4c.9-.9.9-1.7 0-2.6m3.6 2.6c.9-.9.9-1.7 0-2.6"/>',
    'Chai', 'A steaming cup, for tea stalls and a moment&apos;s rest.',
    'commerce', ['chai', 'tea', 'cup', 'stall', 'break', 'drink'],
    'Chai stalls, the first-cup goal and rest prompts.'),
  rupee: define(
    '<path d="M6.6 4.6h10.8M6.6 8.6h10.8M6.6 12.6h5.2c3 0 5.2-1.8 5.2-4M6.6 12.6l8.4 7.8"/>',
    'Rupees', 'The rupee sign, for cash, prices and the wallet.',
    'commerce', ['rupee', 'money', 'cash', 'price', 'wallet', 'inr'],
    'Cash readout, prices and any transaction confirmation.'),
  hospital: define(
    '<rect x="3.6" y="5.2" width="16.8" height="15.2" rx="2.2"/><path d="M12 9v7.4M8.4 12.7h7.2"/>',
    'Hospital', 'A cross inside a building, for medical services.',
    'places', ['hospital', 'clinic', 'medical', 'health', 'emergency', 'pharmacy'],
    'Hospital and pharmacy places, and health-related events.'),
  police: define(
    '<path d="M12 3.2 19.4 6v6c0 4.4-3.1 7.6-7.4 9-4.3-1.4-7.4-4.6-7.4-9V6Z"/><path d="m9.4 12.2 1.9 1.9 3.6-3.9"/>',
    'Police', 'A shield with a tick, for the police and civic safety.',
    'places', ['police', 'safety', 'shield', 'law', 'civic', 'security'],
    'Police stations and incident notices.'),
  school: define(
    '<path d="M12 4 3 8.4l9 4.4 9-4.4Z"/><path d="M6.6 10.6v5.2c0 1.8 2.4 3.2 5.4 3.2s5.4-1.4 5.4-3.2v-5.2M20.4 8.8v5"/>',
    'School', 'A graduation cap, for schools and the campus district.',
    'places', ['school', 'college', 'campus', 'education', 'students', 'learning'],
    'School places and the Vidya Campus district.'),
  temple: define(
    '<path d="M12 2.6 15.6 8H8.4Z"/><path d="M6.4 8h11.2v12.6H6.4Z"/><path d="M10 20.6v-5a2 2 0 0 1 4 0v5M4.4 20.6h15.2"/>',
    'Place of worship', 'A shikhara over a plinth, for temples and other places of worship.',
    'places', ['temple', 'mandir', 'worship', 'shrine', 'faith', 'mosque', 'church'],
    'Temple, mosque and church places, and quiet-reflection prompts.'),
  park: define(
    '<path d="M12 3.4c3.2 0 5.6 2.4 5.6 5.2 0 3-2.6 5.4-5.6 5.4S6.4 11.6 6.4 8.6c0-2.8 2.4-5.2 5.6-5.2Z"/><path d="M12 14v7M8.6 21h6.8"/>',
    'Park', 'A round-canopied tree, for gardens and green space.',
    'places', ['park', 'garden', 'tree', 'green', 'nature', 'shade'],
    'Nehru Gardens and any green place on the map.'),
  bank: define(
    '<path d="M3.6 9.6 12 4.4l8.4 5.2M5.6 9.6v8.2m4.2-8.2v8.2m4.4-8.2v8.2m4.2-8.2v8.2M3.6 20.4h16.8"/>',
    'Bank', 'A columned facade, for banking, savings and deposits.',
    'commerce', ['bank', 'savings', 'deposit', 'withdraw', 'account', 'finance'],
    'Deposit and withdraw actions in the inventory panel.'),

  /* ------------------------------------------------ system */
  settings: define(
    '<path d="m9.9 3 .6 2.1 2 .9 2-.6 2.1 3.4-1.5 1.5v2.4l1.5 1.5-2.1 3.4-2-.6-2 .9-.6 2.1H9.9l-.6-2.1-2-.9-2 .6-2.1-3.4L4.7 13v-2.4L3.2 9.1l2.1-3.4 2 .6 2-.9Z"/><circle cx="10.9" cy="11.8" r="2.9"/>',
    'Settings', 'A cog, for graphics, sound, weather and time settings.',
    'system', ['settings', 'options', 'preferences', 'gear', 'cog', 'configure'],
    'The top bar settings button and the pause menu.'),
  pause: define('<path d="M8.6 4.8v14.4M15.4 4.8v14.4"/>',
    'Pause', 'Two upright bars, pausing the city.',
    'system', ['pause', 'stop', 'hold', 'break', 'menu'],
    'The top bar pause button; Escape does the same thing.'),
  play: define('<path d="M7.6 4.8 19 12 7.6 19.2Z"/>',
    'Resume', 'A forward triangle, resuming play.',
    'system', ['play', 'resume', 'start', 'continue', 'go'],
    'Resume buttons in the pause menu.'),
  close: define('<path d="m6.4 6.4 11.2 11.2M6.4 17.6 17.6 6.4"/>',
    'Close', 'A cross, dismissing a panel or dialogue.',
    'system', ['close', 'dismiss', 'cancel', 'exit', 'x'],
    'Panel close buttons. Escape does the same thing.'),
  check: define('<path d="m5 12.4 4.4 4.4L19 6.8"/>',
    'Done', 'A tick, confirming an action.',
    'status', ['check', 'tick', 'done', 'confirm', 'success', 'saved'],
    'Toasts and inline confirmations.'),
  save: define(
    '<path d="M5 3.4h11.6L20.6 7.4v13.2H3.4V3.4Z"/><path d="M7.4 3.4v6h9.2v-6M7.4 20.6v-7.4h9.2v7.4"/>',
    'Save', 'A floppy disk, writing the journey to this device.',
    'system', ['save', 'store', 'write', 'persist', 'progress'],
    'Save actions in the pause menu; F5 does the same thing.'),
  load: define(
    '<path d="M20.4 12a8.4 8.4 0 1 1-2.5-6"/><path d="M20.4 3.6v4.8h-4.8"/>',
    'Load', 'A restore arrow, bringing back a saved journey.',
    'system', ['load', 'restore', 'continue', 'resume', 'reload'],
    'Continue and load actions; F9 does the same thing.'),
  volume: define(
    '<path d="M3.4 9.2h3.8L12 5v14l-4.8-4.2H3.4Z"/><path d="M15.2 8.6a4.8 4.8 0 0 1 0 6.8m2.9-9.7a8.9 8.9 0 0 1 0 12.6"/>',
    'City sounds on', 'A speaker with sound waves, for the ambient soundscape.',
    'system', ['volume', 'sound', 'audio', 'speaker', 'on', 'unmute'],
    'The audio toggle in settings.'),
  'volume-off': define(
    '<path d="M3.4 9.2h3.8L12 5v14l-4.8-4.2H3.4Z"/><path d="m16 9.6 4.6 4.8m0-4.8L16 14.4"/>',
    'City sounds off', 'A muted speaker, with the soundscape switched off.',
    'system', ['mute', 'silent', 'off', 'audio', 'sound'],
    'The audio toggle in settings when sound is off.'),
  keyboard: define(
    '<rect x="2.6" y="6.4" width="18.8" height="11.2" rx="2.2"/><path d="M6.4 10h.01M9.6 10h.01M12.8 10h.01M16 10h.01M6.4 13.4h.01M9.6 13.4h.01M12.8 13.4h.01M16 13.4h.01M8.4 16.4h7.2"/>',
    'Controls', 'A keyboard, opening the controls and help panel.',
    'system', ['keyboard', 'controls', 'keys', 'help', 'shortcuts', 'input'],
    'The controls and help panel.'),
  help: define(
    '<circle cx="12" cy="12" r="8.6"/><path d="M9.6 9.6a2.4 2.4 0 1 1 3.2 2.3c-.6.2-.8.7-.8 1.3v.5"/><path d="M12 17h.01"/>',
    'Help', 'A question mark in a circle, for guidance and hints.',
    'system', ['help', 'question', 'guide', 'hint', 'support', 'faq'],
    'Help affordances and the controls panel trigger.'),
  info: define(
    '<circle cx="12" cy="12" r="8.6"/><path d="M12 11v5.4M12 7.8h.01"/>',
    'Information', 'An information mark, for neutral explanatory notes.',
    'status', ['info', 'about', 'note', 'detail', 'explain'],
    'Panel notes and non-urgent messages.'),
  alert: define(
    '<path d="M12 3.6 21.4 20H2.6Z"/><path d="M12 10v4.2M12 17.2h.01"/>',
    'Attention', 'A warning triangle, for incidents and urgent notices.',
    'status', ['alert', 'warning', 'incident', 'caution', 'danger', 'emergency'],
    'City incidents, fire drills and collision notices.'),
  camera: define(
    '<rect x="2.8" y="7" width="18.4" height="13" rx="2.4"/><circle cx="12" cy="13.5" r="3.8"/><path d="M8.6 7 10 4.2h4L15.4 7"/>',
    'Photo mode', 'A camera body with a lens, for capture and photo mode.',
    'system', ['camera', 'photo', 'screenshot', 'capture', 'picture'],
    'Photo mode and screenshot affordances.'),
  eye: define(
    '<path d="M2.4 12S6 5.8 12 5.8 21.6 12 21.6 12 18 18.2 12 18.2 2.4 12 2.4 12Z"/><circle cx="12" cy="12" r="3.2"/>',
    'View', 'An eye, for visibility, first-person view and preview toggles.',
    'system', ['eye', 'view', 'visible', 'preview', 'look', 'camera'],
    'First-person toggle and visibility switches.'),
  layers: define(
    '<path d="m12 3.4 8.6 4.6L12 12.6 3.4 8Z"/><path d="m3.4 12.4 8.6 4.6 8.6-4.6M3.4 16.6 12 21.2l8.6-4.6"/>',
    'Detail level', 'Stacked planes, for graphics quality and level of detail.',
    'system', ['layers', 'quality', 'graphics', 'detail', 'performance', 'stack'],
    'The graphics quality selector.'),
  sparkle: define(
    '<path d="M12 3.4 13.7 9 19.4 10.6 13.7 12.3 12 18 10.3 12.3 4.6 10.6 10.3 9Z"/><path d="M18.4 16.2 19 18l1.8.6-1.8.6-.6 1.8-.6-1.8-1.8-.6 1.8-.6Z"/>',
    'Highlight', 'A four-point sparkle, for new, generated or highlighted content.',
    'status', ['sparkle', 'new', 'shine', 'magic', 'highlight', 'featured'],
    'New-feature badges and highlighted moments. Use sparingly.'),
} as const satisfies Record<string, IconDefinition>;

export type IconName = keyof typeof ICONS;

export const ICON_NAMES = Object.keys(ICONS) as IconName[];

/** The searchable metadata for every icon, keyed by name. */
export const ICON_METADATA: Record<IconName, IconMeta> =
  Object.fromEntries(ICON_NAMES.map(name => [name, ICONS[name].meta])) as Record<IconName, IconMeta>;

/** All icons in one category, for design references and pickers. */
export const iconsByCategory = (category: IconCategory) =>
  ICON_NAMES.filter(name => ICONS[name].meta.category === category);

/** Free-text search across names, labels, descriptions and keywords. */
export function findIcons(query: string): IconName[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return ICON_NAMES;
  return ICON_NAMES.filter(name => {
    const meta = ICONS[name].meta;
    return name.includes(needle)
      || meta.label.toLowerCase().includes(needle)
      || meta.description.toLowerCase().includes(needle)
      || meta.keywords.some(keyword => keyword.includes(needle));
  });
}

const escapeAttribute = (value: string) => value.replace(/[&<>"']/g, char =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));

let titleSequence = 0;

export interface IconOptions {
  /** Give the icon an accessible name; omit for decorative icons. */
  label?: string | true;
  /** Stroke width override, in the 24-unit grid. */
  weight?: number;
  size?: number;
}

/**
 * Renders an icon as inline SVG. Icons are decorative by default - pass
 * `{ label: true }` to use the icon's own accessible name, or a string to
 * override it, whenever the icon is the only thing describing a control.
 */
export function icon(name: IconName | string, cls = '', options: IconOptions = {}): string {
  const definition = (ICONS as Record<string, IconDefinition>)[name] ?? ICONS.pin;
  const label = options.label === true ? definition.meta.label : options.label;
  const id = label ? `icon-title-${++titleSequence}` : '';
  const accessibility = label
    ? ` role="img" aria-labelledby="${id}"`
    : ' aria-hidden="true" focusable="false"';
  const size = options.size ? ` width="${options.size}" height="${options.size}"` : '';
  return `<svg class="icon ${cls}" viewBox="0 0 24 24"${size} fill="${definition.fill ? 'currentColor' : 'none'}" `
    + `stroke="currentColor" stroke-width="${options.weight ?? 1.5}" stroke-linecap="round" stroke-linejoin="round"${accessibility}>`
    + (label ? `<title id="${id}">${escapeAttribute(label)}</title>` : '')
    + `${definition.path}</svg>`;
}

/** Maps a city place to the icon that represents it, so map, panels and prompts agree. */
export function placeIcon(kind: string): IconName {
  const map: Record<string, IconName> = {
    chai: 'chai', restaurant: 'food', kirana: 'shop', clothing: 'shop', electronics: 'shop',
    pharmacy: 'hospital', hospital: 'hospital', police: 'police', school: 'school',
    office: 'bank', park: 'park', station: 'bus', home: 'home',
    temple: 'temple', mosque: 'temple', church: 'temple', mechanic: 'wrench', fuel: 'fuel',
  };
  return map[kind] ?? 'pin';
}

/** Maps a weather state to its icon. */
export function weatherIconName(weather: string): IconName {
  return weather === 'rain' ? 'rain' : weather === 'cloudy' ? 'cloud' : 'sun';
}

/**
 * A `<symbol>` sprite of the whole set, for documentation pages or anywhere the
 * icons should be referenced with `<use href="#navapur-icon-name">`.
 */
export function iconSprite(): string {
  const symbols = ICON_NAMES.map(name => {
    const definition = ICONS[name];
    return `<symbol id="navapur-icon-${name}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">`
      + `<title>${escapeAttribute(definition.meta.label)}</title><desc>${escapeAttribute(definition.meta.description)}</desc>`
      + `${definition.path}</symbol>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">${symbols}</svg>`;
}
