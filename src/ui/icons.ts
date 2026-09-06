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
