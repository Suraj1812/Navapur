# Navapur brand assets

Everything here is generated or hand-drawn as SVG, carries embedded metadata, and is safe to use unmodified.

| File | What it is |
| --- | --- |
| `../logo-mark.svg` | Primary mark — the torana arch, skyline and rising sun |
| `../logo.svg` | Horizontal lockup: mark, wordmark, नवापुर and tagline |
| `logo-stacked.svg` | Vertical lockup for splash screens and square placements |
| `logo-mono.svg` | Single-colour mark, inherits `currentColor` |
| `mark-solid.svg` | Flat mark without gradients or clip paths, for rasterisers and print |
| `wordmark.svg` | Wordmark and tagline alone |
| `../favicon.svg` | Simplified mark that survives 16 px |
| `../icon.svg` | Maskable app icon, inset to the 72 % safe zone |
| `../social-preview.png` | 1200 × 630 link preview card |
| `brand.json` | Palette, typography, clear space and per-asset metadata |
| `icons.json` | The full interface icon catalogue with metadata |
| `icons-sprite.svg` | `<symbol>` sprite: `<use href="icons-sprite.svg#navapur-icon-chai">` |
| `icons.html` | Browsable contact sheet of every icon |

## Rules

- **Clear space.** Around any lockup, leave the height of the wordmark's `N`. Around the mark alone, leave 96 units of
  the 512 grid.
- **Minimum size.** Mark 24 px, horizontal lockup 240 px, stacked lockup 160 px. Below 64 px use `favicon.svg`.
- **Colour.** Gold `#E9B875` on ink `#13201E`, with mint `#8FCFC1` as the single accent. Do not recolour the mark; use
  `logo-mono.svg` when one colour is all you have.
- **Don't.** Rotate it, stretch it, add a drop shadow, place it on a busy photograph without a scrim, or rebuild the
  wordmark in another typeface.

## Regenerating

`icons.json`, `icons-sprite.svg` and `icons.html` are generated from `src/ui/icons.ts` — the single source of truth for
the icon set. `npm run brand:assets` rebuilds them, and `npm run build` does it automatically.

PNG exports are rasterised from `mark-solid.svg` and `favicon.svg`; regenerate them whenever the mark changes.
