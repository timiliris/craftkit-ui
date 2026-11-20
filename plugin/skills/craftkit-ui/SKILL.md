---
name: craftkit-ui
description: Style web pages and apps like Minecraft's GUI with the CraftKit UI CSS theme (stone buttons, panels, slots, tooltips, HUD bars, sprites, pixel font, animations). Use when the user wants a Minecraft-style site, dashboard or component, or works in a project that uses CraftKit UI or mc-* classes.
---

# CraftKit UI: Minecraft GUI theme for the web

CraftKit UI is a Tailwind CSS v4 theme (shadcn/ui tokens) that recreates Minecraft: Java Edition's GUI on
the web: about 63 `mc-*` utilities, 613 game sprites as CSS variables, the Minecraft font, two modes
(Classic and Modern) and 27 `mc-anim-*` animations. It works in a Tailwind v4 / shadcn project, or as
one plain compiled stylesheet for any site (HTML, PHP, a CMS...).

## 1. Find the CraftKit UI folder

Everything is copied or compiled from the CraftKit UI source folder (it holds `build.mjs`, `theme/`,
`src/animations.css`, `tools/install.mjs`). Look in this order and use the first that exists:

1. the `CRAFTKIT_HOME` environment variable;
2. three levels above this skill's directory, when the skill runs from `<CraftKit UI>/plugin/skills/craftkit-ui`;
3. a `craftkit-ui` clone in the user's home folder (`~/craftkit-ui`).

If none exists, ask the user where CraftKit UI is, or offer to clone it:
`git clone https://github.com/timiliris/craftkit-ui.git`. Needs Node 20.11 or later.

The repository holds no Minecraft asset. Before installing, check that `<CraftKit UI>/node_modules/tailwindcss`
and `<CraftKit UI>/theme/minecraft-textures.css` exist. If not, run in `<CraftKit UI>`: `npm install`, then
`npm run mc:setup` (extracts the textures and the font from the user's own Minecraft: Java Edition
1.21.6+, which must have been launched once; `MC_JAR=<path>` picks a specific jar).

## 2. Install it into the user's project

Run the installer; it picks the mode from the project's `package.json`:

```bash
node "<CraftKit UI>/tools/install.mjs" <project>              # auto
node "<CraftKit UI>/tools/install.mjs" <project> --tailwind --patch [--dir=src/styles/craftkit-ui]
node "<CraftKit UI>/tools/install.mjs" <project> --css [--out=assets/craftkit-ui.css] [--watch]
```

- **Tailwind v4 project** (`--tailwind`): copies the 4 theme files and `animations.css` into the
  project, and with `--patch` adds `@import "./craftkit-ui/minecraft.css"; @import "./craftkit-ui/animations.css";`
  right after `@import "tailwindcss";`. Then delete shadcn's default `:root { --background: ... }` and
  `.dark { ... }` color blocks if the file has them: unlayered, they override the theme's tokens. The
  shadcn token names (`bg-background`, `text-primary`, `bg-card`...) keep working.
- **Any other site** (`--css`): compiles ONE stylesheet that holds only the classes found in the
  project's files, then `<link rel="stylesheet" href="craftkit-ui.css">` on every page. **Re-run the command
  after adding new classes** (or keep `--watch` running), otherwise new classes have no CSS.
  Write class names in full in the source (no `"mc-tint-" + color`): the scanner only sees literal text.

Tailwind v3 is not supported (the theme uses v4's `@utility` and `@theme`).

## 3. Page setup

```html
<html lang="en">            <!-- add class="dark" for Modern mode -->
<body>                       <!-- the theme already gives body the page background (mc-page) and the font -->
```

- **Modes**: `:root` = Classic (dimmed dirt page, light gray panels); `.dark` = Modern (dark page, dark panels).
- **Scale**: `mc-scale-2` is the default (1 texture px = 2 CSS px). `mc-scale-3` or `lg:mc-scale-3` on any subtree.
  Never set `--mc-scale` alone.
- **Sizes are GUI pixels**: 1 Tailwind spacing unit = 2 GUI px (`h-10` = 20 GUI px = a button's height).
  In arbitrary values write `calc(N*var(--mc-px))`. `border`, `ring`, `outline` are 1 GUI px; avoid
  `border-2`, `ring-1`, `h-px`: they are CSS pixels and break the grid.
- **No fractional transforms** on textured boxes or text (`-translate-x-1/2` smears them). Center with
  flex/grid, `mx-auto` or `mc-center` (fixed dialogs).
- **Type**: font sizes are multiples of 8px. `text-xs/sm/base` = 16px, `text-lg/xl` = 24px,
  `text-2xl/3xl` = 32px, then 40, 48, 64, 80px. Build hierarchy with color (`text-muted-foreground`,
  `text-mc-yellow`), and `font-medium` for titles. No italics.

## 4. Components (copy these patterns)

```html
<!-- Button: always pair the base with its states. -->
<button class="mc-button outline-none hover:mc-button-highlighted focus-visible:mc-button-highlighted disabled:mc-button-disabled pt-1 pb-1.5 px-4 text-xs">Singleplayer</button>
<button class="mc-button mc-tint-green ...">Create</button>      <!-- tints: red green gold blue purple -->

<!-- Text field -->
<input class="mc-text-field outline-none focus:mc-text-field-highlighted h-10 px-1.5" placeholder="Search...">

<!-- Panels: mc-panel follows the mode; -classic is light, -dark is the dark popup, -inset a black well -->
<div class="mc-panel p-2">...</div>
<div class="mc-panel-dark p-3">...</div>

<!-- Tabs -->
<button role="tab" aria-selected="true" class="mc-tab-selected outline-none hover:mc-tab-selected-highlighted focus-visible:mc-tab-selected-highlighted px-6 pb-1.5 text-xs">Game</button>
<button role="tab" class="mc-tab outline-none hover:mc-tab-highlighted focus-visible:mc-tab-highlighted px-6 pb-1.5 text-xs">World</button>

<!-- Slider: track + absolute handle -->
<div role="slider" tabindex="0" class="mc-slider-track outline-none hover:mc-slider-track-highlighted focus-visible:mc-slider-track-highlighted relative h-10 w-full">
  <div class="mc-slider-handle absolute top-[calc(-1*var(--mc-px))] h-10 w-4" style="left:40%"></div>
</div>

<!-- Inventory slot with an item sprite -->
<div class="mc-slot size-9 hover:mc-slot-highlight grid place-items-center">
  <span class="mc-sprite [--mc-sprite:var(--mc-item-diamond)]" role="img" aria-label="Diamond"></span>
</div>

<!-- Tooltip and toasts -->
<div class="mc-tooltip p-1"><p class="text-mc-aqua">Diamond Sword</p><p class="text-mc-gray">+7 Attack Damage</p></div>
<div class="mc-toast flex w-[calc(160*var(--mc-px))] items-center gap-3 p-2">...</div>   <!-- also mc-toast-system, mc-toast-tutorial -->

<!-- Progress bar (XP by default; boss bars via hooks) -->
<span class="mc-bar" role="progressbar" aria-valuenow="40" style="--mc-bar-value:0.4"></span>
<span class="mc-bar [--mc-bar-bg:var(--mc-boss-bar-pink-background)] [--mc-bar-fill:var(--mc-boss-bar-pink-progress)]" style="--mc-bar-value:.7"></span>

<!-- Block textures -->
<div class="mc-bg-stone p-4">...</div>                                  <!-- also mc-bg-dirt, -planks, -deepslate -->
<div class="mc-tile mc-tile-dim [--mc-tile:var(--mc-block-obsidian)]">...</div>

<!-- Any sprite as a nine-slice -->
<div class="mc-slice p-4 [--mc-slice-src:var(--mc-popup-background)] [--mc-slice-t:6] [--mc-slice-r:6] [--mc-slice-b:6] [--mc-slice-l:6]">...</div>
```

Other utilities: `mc-box-gold / -blue / -dark` (advancement boxes), `mc-scroller`, `mc-separator`,
`mc-separator-footer`, `mc-separator-vertical`, `mc-overlay` (dialog backdrop), `mc-splash` (title
screen text), `mc-focus-ring`, `mc-pixelated`, `mc-surface-light / -dark`, `mc-text-shadow / -none`,
`mc-bg-menu`, `mc-bg-list`. Colors: the 16 chat colors `text-mc-yellow`, `bg-mc-dark-red`... and the
GUI colors `mc-panel`, `mc-slot`, `mc-xp`, `mc-grass`...

## 5. Sprites

Every sprite is a CSS variable `--mc-<name>`: `item-*`, `block-*`, `hud-*`, `widget-*`, `container-*`,
`advancements-*`, `boss-bar-*`, `icon-*`, `toast-*`... Show one with `mc-sprite`; give its size in
texture px when it is not 16x16 and an integer zoom if needed:

```html
<span class="mc-sprite [--mc-sprite:var(--mc-hud-heart-full)] [--mc-sprite-w:9] [--mc-sprite-h:9]" aria-hidden="true"></span>
<span class="mc-sprite [--mc-sprite:var(--mc-item-nether-star)] [--mc-sprite-zoom:2]"></span>
```

A comma list in `--mc-sprite` stacks sprites (e.g. heart container + heart). Names and sizes:
`references/sprites.md`. Do not invent sprite names: check the list, or `grep -- "--mc-<name>:" <CraftKit UI>/theme/minecraft-textures.css`.

## 6. Animations (src/animations.css)

All move on whole pixels and stop under `prefers-reduced-motion`.

- Textures: `mc-anim-water`, `mc-anim-lava`, `mc-anim-magma`, `mc-anim-sculk` (tiled backgrounds);
  `mc-anim-music-notes`, `mc-anim-trial`, `mc-anim-locator-up/-down` (sprites); `mc-anim-strip` /
  `mc-anim-tile` for any frame strip.
- GUI: `mc-anim-toast-in` / `-out`, `mc-anim-shake` / `mc-anim-shake-row` (low health), `mc-anim-blink`
  (damage), `mc-anim-bob` (dropped item), `mc-anim-glint` (enchanted; set `--mc-glint-mask` to the sprite
  to keep the sheen inside its pixels).
- Progress: `mc-anim-fill` on an `mc-bar` (plays 0 to `--mc-bar-value`), `mc-anim-cook`, `mc-anim-burn`.
- Text: `mc-anim-title`, `mc-anim-chat`, `mc-anim-item-name`, `mc-anim-levelup`, `mc-anim-cursor`.
- `mc-anim-loading` (three-square loader), `mc-anim-paused` on an ancestor freezes everything inside.
- To replay a one-shot animation in JS: remove the class, read `el.offsetWidth`, add it back.

Details and hooks: `references/animations.md`.

## 7. Rules that avoid the common bugs

- On a nine-slice element (`mc-button`, `mc-panel*`, `mc-slot`, `mc-tooltip`, `mc-toast*`, `mc-tab*`,
  `mc-slice`...) remove `bg-*`, `border-*`, `rounded-*` and `shadow-*`: the sprite paints the box.
- Never leave `outline-none` alone on something focusable: add `focus-visible:mc-*-highlighted` or
  `focus-visible:mc-focus-ring`.
- `--primary` is a fill color, not a text color; links are `text-foreground underline`.
- Destructive actions: `mc-button mc-tint-red` or `bg-mc-dark-red text-white`, not `text-destructive` on a tint.
- `mc-tint` must not share an element with `overflow-hidden/auto`: scroll in an inner wrapper.
- `mc-sprite` has no text alternative: `aria-hidden="true"` as an icon, `role="img" aria-label` as content.
- The pixel font is about 1.7 times wider than usual: let text wrap (`min-w-0`, `flex-wrap`) and check
  the page at 390px wide.
- Textures and the font are Mojang assets extracted from the game: tell the user to check Mojang's
  usage guidelines before publishing or selling a site that ships them.

## 8. Full reference

- `references/theme.md`: the theme's complete reference (every utility, hook, token, contrast rule).
- `references/animations.md`, `references/sprites.md`.
- The live demo of every component: `node "<CraftKit UI>/serve.mjs"` then http://localhost:5173
  (source in `<CraftKit UI>/demo/index.html`, a good place to copy markup from).

If `references/` is not next to this file, read them from `<CraftKit UI>/plugin/skills/craftkit-ui/references/`.
