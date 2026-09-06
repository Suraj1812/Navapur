<p align="center">
  <img src="public/logo.svg" alt="Navapur — a city, a thousand stories" width="620">
</p>

<p align="center">
  <b>An interactive 3D Indian city that runs in a browser tab.</b><br>
  Walk the markets, meet the neighbours, drive an auto-rickshaw, and watch a whole day pass over Navapur.
</p>

---

## What it is

Navapur is a real-time city built with [Three.js](https://threejs.org) and [Vite](https://vitejs.dev). Nothing is downloaded at
runtime — every street, storefront, texture, person and vehicle is generated in the browser at load time from about
200 KB of gzipped JavaScript.

- **A city with a routine.** Two hundred and forty residents have homes, workplaces, schedules, money and moods. They
  open shops, walk to work, queue for chai and go home again. Traffic obeys the signals you can see change colour.
- **People who look like people.** One articulated rig — pelvis, spine, neck, shoulders, elbows, hips, knees, ankles —
  shared between the crowd and the player. The gait is driven by distance travelled rather than wall time, so feet stay
  planted instead of skating. Outfits, hair, skin tones and carried props vary per resident and stay stable across
  sessions.
- **Weather and a full day.** A physical sky, a moving sun and moon, monsoon rain with splashes and lightning, wet
  asphalt, lit shopfronts after dark and street lamps that come on at dusk.
- **Adaptive quality.** The renderer sizes itself to the device — shadow resolution, ambient occlusion, bloom, crowd
  density and draw distance — and quietly trims render resolution before frames start dropping.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server with hot reload |
| `npm run build` | Regenerates brand assets, typechecks, and builds to `dist/` |
| `npm run preview` | Serves the production build locally |
| `npm test` | Simulation and save-validation unit tests |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run verify` | Typecheck, tests and a production build in one go |
| `npm run brand:assets` | Rebuilds `public/brand/icons.json`, the sprite and the contact sheet |

## Controls

| Key | Action |
| --- | --- |
| `W` `A` `S` `D` / arrows | Walk or drive |
| `Shift` / `Ctrl` | Sprint / crouch |
| `Space` | Jump, or brake in a vehicle |
| Mouse drag, or double-click to lock | Look around |
| `E` | Talk, shop, enter, inspect |
| `V` · `L` · `H` | Enter or leave a vehicle · headlights · horn |
| `C` | First-person and third-person camera |
| `I` `M` `J` | Bag · city map · journal |
| `F5` `F9` `F3` | Save · load · performance overlay |

## Deploying

The build is a static folder. `vite.config.ts` uses a relative `base`, so one build works at a domain root, in a
subdirectory or behind a path prefix without rebuilding.

```bash
npm run build      # → dist/
```

**GitHub Pages** — `.github/workflows/deploy-pages.yml` builds and publishes on every push to `main`. Enable Pages with
the "GitHub Actions" source once, and it runs itself.

**Vercel** — import the repository. `vercel.json` sets the build command, the output directory, immutable caching for
hashed assets and a baseline set of security headers.

**Netlify** — import the repository. `netlify.toml` carries the same settings plus an SPA fallback.

**Docker / self-hosted** — a multi-stage build serves the static output from nginx with gzip, long-lived asset caching
and a health check.

```bash
docker compose up --build   # → http://localhost:8080
```

**Anywhere else** — copy `dist/` to any static host or CDN. There is no server component and no runtime configuration.

`.github/workflows/ci.yml` runs the typecheck, tests and a production build on every push and pull request.

## Project layout

```
src/
  core/        game loop, camera, interactions, save and load
  render/      quality tiers, adaptive resolution, post-processing
  player/      the human rig: anatomy, pose solver, crowd instancing, controls
  world/       procedural city, buildings, props, materials, animals
  vehicles/    vehicle models and traffic simulation
  simulation/  residents, schedules, economy, navigation, events
  ui/          heads-up display, panels, and the icon system
  world-effects.ts   sky, sun, moon, weather, birds, fire
public/brand/  logos, the icon catalogue, the sprite and a contact sheet
```

## Brand and icons

The identity and the interface icons are documented and machine-readable:

- `public/brand/brand.json` — palette, typography, clear space and every logo asset with its description, keywords,
  accessible label and usage note.
- `public/brand/icons.json` — all 58 interface icons with the same metadata, generated from `src/ui/icons.ts`.
- `public/brand/icons.html` — a browsable contact sheet.
- `public/brand/icons-sprite.svg` — an SVG `<symbol>` sprite for use outside the app.

Inside the app, import from `src/ui/icons.ts`:

```ts
import { icon, placeIcon, findIcons } from './ui/icons';

icon('rickshaw');                        // decorative, aria-hidden
icon('settings', '', { label: true });   // labelled from the icon's own metadata
placeIcon('chai');                       // the icon that represents a place kind
findIcons('monsoon');                    // → ['rain']
```

## Licence

MIT.
