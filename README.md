# CraftKit UI · Minecraft CSS Theme

**English** · [Français](#français) · **[Live demo](https://timiliris.github.io/craftkit-ui/)**

> Unofficial fan project. NOT AN OFFICIAL MINECRAFT PRODUCT. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR
> MICROSOFT. This repository contains **no Minecraft asset**: the textures and the font are extracted on
> your machine from your own copy of Minecraft: Java Edition (see [Setup](#setup)).

A Minecraft GUI theme for the web (original project **minecraft-shadcn-theme v0.1.0**). It recreates the game's GUI:
stone buttons, black text fields, bevelled panels, inventory slots, tabs, tooltips, toasts, XP and boss
bars, block textures and the pixel font. CraftKit UI adds the game's animations on top.

## Screenshots

<p align="center">
  <img src="https://timiliris.github.io/craftkit-ui/media/desktop-classic.png" alt="Title screen, Classic mode" width="49%">
  <img src="https://timiliris.github.io/craftkit-ui/media/desktop-modern.png" alt="Title screen, Modern mode" width="49%">
</p>

### Components

<p align="center">
  <img src="https://timiliris.github.io/craftkit-ui/media/section-inventory.png" alt="Inventory and containers" width="49%">
  <img src="https://timiliris.github.io/craftkit-ui/media/section-hud.png" alt="HUD" width="49%">
  <img src="https://timiliris.github.io/craftkit-ui/media/section-buttons.png" alt="Buttons" width="49%">
  <img src="https://timiliris.github.io/craftkit-ui/media/section-dashboard.png" alt="Dashboard" width="49%">
</p>

### Animations

| | | |
|:-:|:-:|:-:|
| <img src="https://timiliris.github.io/craftkit-ui/media/anim-toasts.gif" alt="Toasts" width="260"><br>`mc-anim-toast-in / -out` | <img src="https://timiliris.github.io/craftkit-ui/media/anim-title.gif" alt="/title" width="260"><br>`mc-anim-title / -chat / -item-name` | <img src="https://timiliris.github.io/craftkit-ui/media/anim-progress.gif" alt="Progress" width="260"><br>`mc-anim-fill / -cook / -burn` |
| <img src="https://timiliris.github.io/craftkit-ui/media/anim-health.gif" alt="Health" width="260"><br>`mc-anim-shake-row / -blink` | <img src="https://timiliris.github.io/craftkit-ui/media/anim-items.gif" alt="Items" width="260"><br>`mc-anim-bob / -glint` | <img src="https://timiliris.github.io/craftkit-ui/media/anim-loading.gif" alt="Loading" width="260"><br>`mc-anim-loading / -levelup` |
| <img src="https://timiliris.github.io/craftkit-ui/media/anim-textures.gif" alt="Animated textures" width="260"><br>`mc-anim-water / -lava ...` | <img src="https://timiliris.github.io/craftkit-ui/media/anim-sprites.gif" alt="Animated sprites" width="260"><br>`mc-anim-strip` | |

### On a phone

<p align="center">
  <img src="https://timiliris.github.io/craftkit-ui/media/mobile-title.png" alt="Title screen on a phone" width="30%">
  <img src="https://timiliris.github.io/craftkit-ui/media/mobile-menu.png" alt="Menu on a phone" width="30%">
  <img src="https://timiliris.github.io/craftkit-ui/media/mobile-inventory.png" alt="Inventory on a phone" width="30%">
</p>

Captured automatically from the [live demo](https://timiliris.github.io/craftkit-ui/) on every push.

## Setup

Requirements: Node 20.11 or later and Minecraft: Java Edition 1.21.6 or later, launched at least once.

```bash
git clone https://github.com/timiliris/craftkit-ui.git
cd craftkit-ui
npm install
npm run mc:setup   # extracts the textures and the font from your game into theme/
npm run build      # writes dist/craftkit-ui.css
```

`mc:setup` finds the newest client jar in the usual launcher folders (see
[Regenerate the textures and the font](#regenerate-the-textures-and-the-font)).

## Install

Once CraftKit UI is set up, install it into your project:

**1. Tailwind v4 project** (shadcn/ui, Vite, Next.js...):

```bash
node tools/install.mjs ../my-app --tailwind --patch
```

This copies the 4 theme files and `animations.css` into `../my-app/src/styles/craftkit-ui/` (change it with
`--dir=`) and adds two lines after `@import "tailwindcss";` in your main CSS file:

```css
@import "tailwindcss";
@import "./craftkit-ui/minecraft.css";
@import "./craftkit-ui/animations.css";
```

Without `--patch` it prints the lines instead. If that file still has shadcn's default
`:root { --background: ... }` and `.dark { ... }` color blocks, delete them: they override the theme's
tokens. The shadcn names (`bg-background`, `text-primary`, `bg-card`...) keep working.

**2. Any other site** (plain HTML, PHP, a CMS, a static generator):

```bash
node tools/install.mjs ../my-site --css            # writes ../my-site/craftkit-ui.css
node tools/install.mjs ../my-site --css --watch    # rebuilds while you edit
```

Then link it from every page: `<link rel="stylesheet" href="craftkit-ui.css">`. The stylesheet only holds the
classes found in your files (.html, .js, .jsx, .tsx, .vue, .svelte, .astro, .php, templates...), so
run it again after adding classes. Write class names in full in your code: `"mc-tint-" + color` cannot
be found. `--out=assets/css/craftkit-ui.css` writes it elsewhere.

**3. With Claude Code**: this folder is also a Claude Code plugin whose `craftkit-ui` skill knows the install
steps and every class. In Claude Code:

```
/plugin marketplace add timiliris/craftkit-ui
/plugin install craftkit-ui@craftkit-ui
```

The skill installs the theme from your local CraftKit UI folder (set up as above). Then ask, in any project, "add the Minecraft theme" or "make this page look like Minecraft". If CraftKit UI
moves, set the `CRAFTKIT_HOME` environment variable to its folder.

## Usage

```html
<html lang="en">                <!-- class="dark" = Modern mode, none = Classic -->
<body>                          <!-- page background and font come from the theme -->
  <div class="mc-panel mx-auto flex max-w-md flex-col gap-2 p-2">
    <p class="font-medium">Options</p>
    <input class="mc-text-field outline-none focus:mc-text-field-highlighted h-10 px-1.5" placeholder="Search...">
    <button class="mc-button outline-none hover:mc-button-highlighted focus-visible:mc-button-highlighted disabled:mc-button-disabled pt-1 pb-1.5 text-xs">Done</button>
    <span class="mc-bar mc-anim-fill max-w-full" style="--mc-bar-value:.6"></span>
    <span class="mc-sprite mc-anim-bob [--mc-sprite:var(--mc-item-diamond)]" role="img" aria-label="Diamond"></span>
  </div>
</body>
```

- **Sizes are game pixels**: 1 spacing unit = 2 GUI px (`h-10` = 20 px, a button's height). `mc-scale-3`
  on any element makes its subtree bigger. Avoid `border-2`, `ring-1`, `-translate-x-1/2`: they break the
  pixel grid.
- **States**: always pair a base with its states (`hover:` / `focus-visible:` / `disabled:` + the
  `-highlighted` / `-disabled` utility), as above.
- **Sprites**: `mc-sprite` + `--mc-sprite:var(--mc-<name>)` (+ `--mc-sprite-w/-h` when not 16x16). The
  demo's Sprites section lists all 613 names; click one to copy it.
- **Where to look**: the demo shows every component with its markup (`demo/index.html`); the full
  reference is the comment at the top of `theme/minecraft.css`, the animations are documented at the
  top of `src/animations.css`, and the Claude Code skill (`plugin/skills/craftkit-ui/SKILL.md`) has a short
  cheat sheet with the common mistakes.

## Run the demo

Double-click `start.bat` (or `npm run dev`), then open http://localhost:5173.

The demo is a full showcase in 15 sections: title screen, get started (install and usage), foundations (type, colors, tokens, surfaces,
scales), buttons (states, tints, the game's sprite buttons), forms, navigation (tabs, menus, advancements),
panels and popups (tooltips, dialog, toasts), inventory and containers (crafting table, furnace,
enchanting, villager, recipe book, anvil), HUD (hearts, food, armor, air, boss bars, interactive hotbar),
**animations**, game lists (servers, worlds, players, stats), dashboard patterns, textures, the library of
all 613 sprites (search and copy) and the utility reference.

The page is in English by default. The **EN | FR** button in the header switches it to French (the choice
is remembered). Translations live in `demo/i18n-fr.json`, keyed by the English text.

Run [Setup](#setup) first. The same demo is online at https://timiliris.github.io/craftkit-ui/.

## Animations

The theme itself only animates `mc-splash`. `src/animations.css` adds 27 `mc-anim-*` utilities, all
stepped on whole pixels and turned off by `prefers-reduced-motion`:

- **Animated textures**: `mc-anim-strip` / `mc-anim-tile` play any frame strip; presets `mc-anim-water`,
  `-lava`, `-magma`, `-sculk`, `-music-notes`, `-trial`, `-locator-up`, `-locator-down`.
- **GUI motion**: `mc-anim-toast-in` / `-out`, `mc-anim-shake`, `mc-anim-shake-row`, `mc-anim-blink`,
  `mc-anim-bob`, `mc-anim-glint` (enchantment sheen, masked by `--mc-glint-mask`).
- **Progress**: `mc-anim-fill` (animates `--mc-bar-value` on any `mc-bar`), `mc-anim-cook`, `mc-anim-burn`.
- **Text**: `mc-anim-title`, `mc-anim-chat`, `mc-anim-item-name`, `mc-anim-levelup`, `mc-anim-cursor`.
- **Misc**: `mc-anim-loading` (three-square loader from the Kaizen skin), `mc-anim-paused` (freezes
  every animation inside).

## Contents

```
theme/                      the theme (vendored, do not edit)
  minecraft.css             Tailwind v4 source: shadcn tokens, @utility mc-*, base layer, full docs at the top
  minecraft-textures.css    ~630 game sprites as data: PNGs (--mc-block-*, --mc-item-*, --mc-hud-* ...)
  minecraft-derived.css     derived sprites (tiled buttons, slider)
  minecraft-font.css        "Minecraft" font (regular, bold, enchant, illager) as inline WOFF2
  scripts/                  rebuilds the 3 files above from your Minecraft jar (npm run mc:setup)
  .cache/                   raw textures + minecraft-sprites.ts (typed sprite table), not versioned
src/craftkit-ui.css             entry point: Tailwind + the theme + animations
src/animations.css          CraftKit UI animation utilities (mc-anim-*)
build.mjs                   compiles dist/craftkit-ui.css (scans demo/ or the folders passed as arguments)
tools/sprite-index.mjs      writes demo/sprites.json (name and size of every sprite)
tools/install.mjs           installs the theme into another project (see Install)
tools/fetch-jar.mjs         CI only: downloads the official client jar for the demo build
tools/capture-media.mjs     CI only: captures the README screenshots and GIFs from the demo
.github/workflows/pages.yml builds the demo and the README media, deploys to GitHub Pages
tools/skill-refs.mjs        writes the skill's reference files (run by build.mjs)
plugin/                     Claude Code plugin: skills/craftkit-ui/SKILL.md + references/
.claude-plugin/             makes this folder a Claude Code plugin marketplace
CLAUDE.md                   notes for Claude Code when working on CraftKit UI itself
dist/craftkit-ui.css            the standalone stylesheet, link it from any page
demo/                       demo page (index.html, demo.js, i18n-fr.json)
serve.mjs, start.bat        dependency-free local server
```

## Regenerate the textures and the font

`theme/minecraft-textures.css`, `minecraft-derived.css` and `minecraft-font.css` are not in the
repository: `npm run mc:setup` builds them from your own game (it needs the dev dependencies:
`npm install`). It takes the newest client jar it finds in the usual
launcher folders (official launcher, Modrinth, CurseForge, Prism, MultiMC); set `MC_JAR` to use a
specific jar (each script in `theme/scripts/` also takes `--jar <path>`). Minecraft 1.21.6 or newer.
The raw textures and the typed sprite table (`theme/.cache/minecraft-sprites.ts`, sizes and borders of
every sprite, handy in TypeScript) go to `theme/.cache/`. The same jar gives byte-identical files.
Then run `node build.mjs`.

## Licensing & Minecraft assets

CraftKit UI's code (CSS, scripts, tools, demo) is released under the [MIT License](LICENSE). This
repository contains **no Mojang assets**: textures and the font are extracted locally by
`npm run mc:setup` from *your own* copy of Minecraft: Java Edition. The MIT License does not cover these
assets, which remain © Mojang AB / Microsoft. The hosted demo and README images are generated from the
official client for illustration, in line with the
[Minecraft Usage Guidelines](https://www.minecraft.net/usage-guidelines).

NOT AN OFFICIAL MINECRAFT PRODUCT. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.

---

## Français

> Projet de fan non officiel. Ce dépôt ne contient **aucun asset Minecraft** : les textures et la police
> sont extraites sur ta machine depuis ta propre copie de Minecraft: Java Edition. **[Démo en ligne](https://timiliris.github.io/craftkit-ui/)**.

Un thème web reprenant le GUI de Minecraft (projet d'origine **minecraft-shadcn-theme v0.1.0**). Il reproduit le GUI du jeu :
boutons en pierre, champs noirs, panneaux biseautés, slots d'inventaire, onglets, tooltips, toasts,
barres d'XP et de boss, textures de blocs et police pixel. CraftKit UI y ajoute les animations du jeu.

### Captures

<p align="center">
  <img src="https://timiliris.github.io/craftkit-ui/media/desktop-classic.png" alt="Écran titre, mode Classic" width="49%">
  <img src="https://timiliris.github.io/craftkit-ui/media/desktop-modern.png" alt="Écran titre, mode Modern" width="49%">
</p>

#### Composants

<p align="center">
  <img src="https://timiliris.github.io/craftkit-ui/media/section-inventory.png" alt="Inventaire et conteneurs" width="49%">
  <img src="https://timiliris.github.io/craftkit-ui/media/section-hud.png" alt="HUD" width="49%">
  <img src="https://timiliris.github.io/craftkit-ui/media/section-buttons.png" alt="Boutons" width="49%">
  <img src="https://timiliris.github.io/craftkit-ui/media/section-dashboard.png" alt="Dashboard" width="49%">
</p>

#### Animations

| | | |
|:-:|:-:|:-:|
| <img src="https://timiliris.github.io/craftkit-ui/media/anim-toasts.gif" alt="Toasts" width="260"><br>`mc-anim-toast-in / -out` | <img src="https://timiliris.github.io/craftkit-ui/media/anim-title.gif" alt="/title" width="260"><br>`mc-anim-title / -chat / -item-name` | <img src="https://timiliris.github.io/craftkit-ui/media/anim-progress.gif" alt="Progression" width="260"><br>`mc-anim-fill / -cook / -burn` |
| <img src="https://timiliris.github.io/craftkit-ui/media/anim-health.gif" alt="Santé" width="260"><br>`mc-anim-shake-row / -blink` | <img src="https://timiliris.github.io/craftkit-ui/media/anim-items.gif" alt="Objets" width="260"><br>`mc-anim-bob / -glint` | <img src="https://timiliris.github.io/craftkit-ui/media/anim-loading.gif" alt="Chargement" width="260"><br>`mc-anim-loading / -levelup` |
| <img src="https://timiliris.github.io/craftkit-ui/media/anim-textures.gif" alt="Textures animées" width="260"><br>`mc-anim-water / -lava ...` | <img src="https://timiliris.github.io/craftkit-ui/media/anim-sprites.gif" alt="Sprites animés" width="260"><br>`mc-anim-strip` | |

#### Sur téléphone

<p align="center">
  <img src="https://timiliris.github.io/craftkit-ui/media/mobile-title.png" alt="Écran titre sur téléphone" width="30%">
  <img src="https://timiliris.github.io/craftkit-ui/media/mobile-menu.png" alt="Menu sur téléphone" width="30%">
  <img src="https://timiliris.github.io/craftkit-ui/media/mobile-inventory.png" alt="Inventaire sur téléphone" width="30%">
</p>

Capturées automatiquement depuis la [démo en ligne](https://timiliris.github.io/craftkit-ui/) à chaque push.

### Mise en place

Il faut Node 20.11 ou plus et Minecraft: Java Edition 1.21.6 ou plus, lancé au moins une fois.

```bash
git clone https://github.com/timiliris/craftkit-ui.git
cd craftkit-ui
npm install
npm run mc:setup   # extrait les textures et la police de ton jeu dans theme/
npm run build      # écrit dist/craftkit-ui.css
```

### Installation

Une fois CraftKit UI en place, installe-le dans ton projet :

**1. Projet Tailwind v4** (shadcn/ui, Vite, Next.js...) :

```bash
node tools/install.mjs ../mon-app --tailwind --patch
```

Copie les 4 fichiers du thème et `animations.css` dans `../mon-app/src/styles/craftkit-ui/` (modifiable avec
`--dir=`) et ajoute deux lignes après `@import "tailwindcss";` dans ton CSS principal :
`@import "./craftkit-ui/minecraft.css";` et `@import "./craftkit-ui/animations.css";`. Sans `--patch`, il
affiche les lignes à ajouter. Si ce fichier contient encore les blocs de couleurs par défaut de shadcn
(`:root { --background: ... }` et `.dark { ... }`), supprime-les : ils écrasent les tokens du thème.

**2. N'importe quel autre site** (HTML simple, PHP, CMS, générateur statique) :

```bash
node tools/install.mjs ../mon-site --css            # écrit ../mon-site/craftkit-ui.css
node tools/install.mjs ../mon-site --css --watch    # recompile pendant que tu modifies
```

Puis `<link rel="stylesheet" href="craftkit-ui.css">` dans chaque page. La feuille ne contient que les classes
trouvées dans tes fichiers : relance la commande après en avoir ajouté. Écris les noms de classe en
entier (`"mc-tint-" + couleur` est introuvable).

**3. Avec Claude Code** : ce dossier est aussi un plugin Claude Code, dont le skill `craftkit-ui` connaît
l'installation et toutes les classes :

```
/plugin marketplace add timiliris/craftkit-ui
/plugin install craftkit-ui@craftkit-ui
```

Le skill installe le thème depuis ton dossier CraftKit UI local (mis en place comme ci-dessus). Ensuite, dans n'importe quel projet, demande « ajoute le thème Minecraft » ou « fais ressembler cette page
à Minecraft ». Si le dossier CraftKit UI change de place, mets son chemin dans la variable d'environnement
`CRAFTKIT_HOME`.

### Utilisation

Le mode Classic est `:root`, le mode Modern est la classe `.dark` sur `<html>`. Les tailles sont en
pixels du jeu (1 unité d'espacement = 2 px GUI, `h-10` = 20 px) et `mc-scale-3` agrandit un bloc. Associe
toujours une base et ses états (`hover:mc-button-highlighted`...). Un sprite s'affiche avec `mc-sprite` et
`--mc-sprite:var(--mc-<nom>)`. L'exemple complet est dans la partie anglaise ci-dessus. La démo montre
chaque composant avec son code (`demo/index.html`) ; la référence complète est en tête de
`theme/minecraft.css`, les animations en tête de `src/animations.css`.

### Lancer la démo

Double-clique sur `start.bat` (ou `npm run dev`), puis ouvre http://localhost:5173.

La démo est une vitrine complète en 15 sections : écran titre, démarrer (installation et utilisation), fondations, boutons, formulaires,
navigation, panneaux et popups, inventaire et conteneurs, HUD, **animations**, listes du jeu, motifs de
dashboard, textures, bibliothèque des 613 sprites et référence des utilitaires.

La page est en anglais par défaut. Le bouton **EN | FR** de l'en-tête la passe en français (le choix est
mémorisé). Les traductions sont dans `demo/i18n-fr.json`, indexées par le texte anglais.

Fais d'abord la [mise en place](#mise-en-place). La même démo est en ligne : https://timiliris.github.io/craftkit-ui/.

### Animations

Le thème n'anime que `mc-splash`. `src/animations.css` ajoute 27 utilitaires `mc-anim-*`, toujours au
pixel près et coupés par `prefers-reduced-motion` : textures animées (eau, lave, magma, sculk, notes de
musique, clé des épreuves, flèches du localisateur), notifications qui glissent, cœurs qui tremblent,
flash de dégâts, objet qui flotte, reflet d'enchantement, barres qui se remplissent, flèche et flamme du
four, /title, fondu du chat, nom d'objet de la barre, niveau supérieur, chargeur, curseur, et
`mc-anim-paused` pour tout figer. La liste détaillée est dans la partie anglaise ci-dessus.

### Régénérer les textures et la police

Les trois fichiers générés ne sont pas dans le dépôt : `npm install` puis `npm run mc:setup` les
construisent depuis ton propre jeu. Le script prend le jar client le plus récent trouvé
dans les dossiers des launchers habituels (officiel, Modrinth, CurseForge, Prism, MultiMC), ou celui de
la variable `MC_JAR`. Minecraft 1.21.6 ou plus. La table typée des sprites
(`theme/.cache/minecraft-sprites.ts`) arrive dans `theme/.cache/`. Relance ensuite `node build.mjs`.

### Licence et assets Minecraft

Le code de CraftKit UI (CSS, scripts, outils, démo) est sous [licence MIT](LICENSE). Ce dépôt ne contient
**aucun asset Mojang** : les textures et la police sont extraites localement par `npm run mc:setup` depuis
*votre propre* copie de Minecraft: Java Edition. La licence MIT ne couvre pas ces assets, qui restent
© Mojang AB / Microsoft. La démo en ligne et les images du README sont générées depuis le client officiel
à titre d'illustration, conformément aux
[Minecraft Usage Guidelines](https://www.minecraft.net/usage-guidelines).

NOT AN OFFICIAL MINECRAFT PRODUCT. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.
