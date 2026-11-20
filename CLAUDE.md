# CraftKit UI

Minecraft GUI theme for the web: Tailwind CSS v4 + shadcn tokens. Public repo: github.com/timiliris/craftkit-ui (demo on GitHub Pages).

- Never commit Mojang assets: theme/minecraft-{textures,derived,font}.css, dist/, theme/.cache/ are
  git-ignored and come from `npm run mc:setup` (your own jar). CI builds the demo from the official jar.

- `theme/minecraft.css` is synced from the author's minecraft-shadcn-theme (MIT, same author): change it there and copy it over whole. CraftKit UI's own CSS lives in `src/` (`animations.css`).
- `node build.mjs` compiles `dist/craftkit-ui.css` and regenerates `demo/sprites.json` and the skill
  references in `plugin/skills/craftkit-ui/references/` (never edit those by hand).
- Demo: `node serve.mjs` -> http://localhost:5173 (`demo/index.html`, `demo/demo.js`). Class names in
  `demo.js` must be written out in full, or the build does not see them.
- The demo is English first; every visible English string needs a French entry in `demo/i18n-fr.json`
  (keyed by the English text). Text rendered by JS goes through `t()` or `live()`.
- README is English first, then French. Keep both in sync.
- Check after a change: no console errors, no horizontal scroll at 390px, both languages.
- How to use the theme in another project: `plugin/skills/craftkit-ui/SKILL.md` (also a Claude Code plugin:
  `.claude-plugin/marketplace.json`).
