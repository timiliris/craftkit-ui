# Animation reference (src/animations.css)

Generated from the header of `src/animations.css`. Do not edit: run `node build.mjs`.

```text
CraftKit UI animations: the motion the game has, as Tailwind v4 utilities on top of theme/minecraft.css.
The vendored theme only animates mc-splash; everything below is CraftKit UI's own layer.

Rules kept from the theme: every movement lands on whole GUI pixels (steps() or round()), no
blur, no easing on sprites, and prefers-reduced-motion stops everything (the theme's base layer
already shortens animations to 0.01ms; the utilities here also set animation: none).

TEXTURE STRIPS (animated textures are vertical strips of frames)
  mc-anim-strip    a sprite box playing a strip. Hooks: --mc-anim-src (image), --mc-anim-frames,
                   --mc-anim-duration (one loop), --mc-anim-w / --mc-anim-h (one frame, texture px),
                   --mc-anim-zoom.
  mc-anim-tile     the same as a repeating background (any box size). Hooks: --mc-anim-src,
                   --mc-anim-frames, --mc-anim-duration, --mc-anim-size (one tile, a length).
  Presets: mc-anim-water, mc-anim-lava, mc-anim-magma, mc-anim-sculk (tiles),
           mc-anim-music-notes, mc-anim-trial, mc-anim-locator-up, mc-anim-locator-down (sprites).

GAME EFFECTS
  mc-anim-toast-in / mc-anim-toast-out   toast sliding in from / out to the right edge.
  mc-anim-shake        low-health jiggle (hearts at 2 HP or less, food at 0 saturation).
  mc-anim-shake-row    on a row of hearts/food: each child shakes out of phase.
  mc-anim-blink        damage flash: the container blinks white twice.
  mc-anim-bob          dropped-item float, 1 GUI px steps.
  mc-anim-glint        enchantment glint: a purple sheen sweeping over the element (::after).
  mc-anim-fill         plays an mc-bar from 0 to its --mc-bar-value (registered as a number).
  mc-anim-burn         furnace flame: --mc-bar-value from 1 to 0, loops (use on a vertical mc-bar).
  mc-anim-cook         furnace arrow: --mc-bar-value from 0 to 1, loops.
  mc-anim-title        /title: fade in, stay, fade out (--mc-anim-duration, default 3.5s).
  mc-anim-chat         chat line: visible 10s, then fades out in 1s like the game.
  mc-anim-item-name    the item name above the hotbar: visible, then fades.
  mc-anim-loading      three squares, the lit one stepping left to right (Kaizen portal).
  mc-anim-cursor       blinking text cursor "_" of the game's text fields (::after).
  mc-anim-levelup      the level number popping in green.
  mc-anim-paused       on any ancestor: freezes every animation inside.
```
