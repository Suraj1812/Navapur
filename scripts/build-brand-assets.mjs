/**
 * Generates the published brand artefacts from the single source of truth in
 * `src/ui/icons.ts`: a machine-readable icon catalogue, an SVG `<symbol>`
 * sprite, and a browsable contact sheet. Run with `npm run brand:assets`.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url)) + '/..';
const out = path.join(root, 'public/brand');
const { ICONS, ICON_NAMES, ICON_METADATA, iconSprite, icon } = await import(path.join(root, 'src/ui/icons.ts'));

await mkdir(out, { recursive: true });

const catalogue = {
  $schema: 'https://navapur.dev/schema/icon-catalogue.json',
  name: 'Navapur icon system',
  version: '1.0.0',
  description:
    'The complete Navapur interface icon set: one 24 x 24 optical grid, a 1.5 stroke weight, rounded caps and joins, drawn in currentColor so every glyph inherits its surroundings.',
  license: 'MIT',
  grid: { size: 24, strokeWidth: 1.5, cap: 'round', join: 'round', colour: 'currentColor' },
  categories: [...new Set(ICON_NAMES.map((n) => ICON_METADATA[n].category))].sort(),
  count: ICON_NAMES.length,
  icons: ICON_NAMES.map((name) => ({
    name,
    label: ICON_METADATA[name].label,
    description: ICON_METADATA[name].description,
    keywords: ICON_METADATA[name].keywords,
    category: ICON_METADATA[name].category,
    usage: ICON_METADATA[name].usage,
    accessibleName: ICON_METADATA[name].label,
    sprite: `#navapur-icon-${name}`,
    svg: icon(name),
  })),
};
await writeFile(path.join(out, 'icons.json'), JSON.stringify(catalogue, null, 2) + '\n');
await writeFile(path.join(out, 'icons-sprite.svg'), iconSprite() + '\n');

const cards = ICON_NAMES.map((name) => {
  const meta = ICON_METADATA[name];
  return `<figure class="card" data-category="${meta.category}">
    <div class="glyph">${icon(name, '', { label: true })}</div>
    <figcaption><b>${name}</b><span>${meta.label}</span><small>${meta.description}</small>
    <em>${meta.keywords.join(' · ')}</em></figcaption>
  </figure>`;
}).join('\n');

const sheet = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>Navapur icon system</title>
<meta name="description" content="${catalogue.description}">
<style>
:root{color-scheme:dark;--ink:#0E1917;--gold:#E9B875;--mint:#8FCFC1;--muted:#8AA49B}
body{margin:0;background:var(--ink);color:#EFE6D4;font:15px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;padding:48px}
header{max-width:64rem;margin:0 auto 40px}h1{font-size:2rem;margin:0 0 .3rem;letter-spacing:.04em}
p{color:var(--muted);max-width:46rem}
.grid{max-width:64rem;margin:0 auto;display:grid;gap:14px;grid-template-columns:repeat(auto-fill,minmax(230px,1fr))}
.card{margin:0;background:#16241F;border:1px solid #24382F;border-radius:14px;padding:16px;display:flex;gap:14px}
.glyph{flex:0 0 auto;width:44px;height:44px;display:grid;place-items:center;background:#0F1B18;border-radius:10px;color:var(--gold)}
.icon{width:24px;height:24px}
figcaption{display:flex;flex-direction:column;gap:2px;min-width:0}
b{color:var(--mint);font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.82rem}
span{font-weight:600}small{color:var(--muted);font-size:.78rem}em{color:#5F7A71;font-size:.7rem;font-style:normal;margin-top:4px}
</style></head><body>
<header><h1>Navapur icon system</h1><p>${catalogue.description} ${catalogue.count} icons across ${catalogue.categories.length} categories.</p></header>
<main class="grid">${cards}</main></body></html>`;
await writeFile(path.join(out, 'icons.html'), sheet + '\n');

console.log(`brand: wrote ${ICON_NAMES.length} icons to public/brand (icons.json, icons-sprite.svg, icons.html)`);
