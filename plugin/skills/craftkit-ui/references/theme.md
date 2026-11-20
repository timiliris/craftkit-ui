# Theme reference (theme/minecraft.css)

Generated from the comment at the top of `theme/minecraft.css`. Do not edit: run `node build.mjs`.

```text
Minecraft GUI theme for shadcn/ui (Tailwind CSS v4). Unofficial fan theme, hand-written.
Sprites come from ./minecraft-textures.css and ./minecraft-derived.css (generated), the font
from ./minecraft-font.css (generated). Sprite sizes/borders: src/lib/minecraft-sprites.ts.

============================== REFERENCE (keep in sync with the code) ==============================

GRID
  --mc-scale   CSS pixels per texture ("GUI") pixel, integer, default 2.
  --mc-px      1 GUI pixel as a length. It is computed where --mc-scale is DECLARED, so never set
               --mc-scale alone: use mc-scale-N (any integer: mc-scale-1 .. mc-scale-4 ...), which
               re-declares --mc-px and the base font size for its subtree. A text-* utility on the
               same element still wins (mc-scale-3 text-2xl = 40px). Responsive use is fine
               (mc-scale-2 lg:mc-scale-3). mc-scale-1 makes text 8px: decorative or HUD-like blocks
               only, never content or controls; on small screens wrap or scroll instead.
  Tailwind spacing follows the grid: 1 spacing unit = 2 GUI px (4px at scale 2), resolved at the use
  site, so h-10 = 20 GUI px, p-0.5 = 1 GUI px, w-4.5 = 9 GUI px, and all of it scales with mc-scale-N.
  In arbitrary values write calc(N * var(--mc-px)) or --spacing(N), e.g. h-[calc(13*var(--mc-px))];
  a raw var(--spacing) is the :root value and does not follow mc-scale-N.
  Line widths: the bare border, border-x/y/t/r/b/l, divide-x/y, ring and outline are 1 GUI px and
  follow the scale. Everything with a number or "px" in its name is in CSS pixels (half a GUI pixel
  at scale 2) and ignores the scale: border-2, ring-1, ring-3, outline-2, h-px, w-px, p-px ...
  Write border-[calc(2*var(--mc-px))], h-0.5, w-0.5 instead, and mc-focus-ring instead of ring-N.
  NO FRACTIONAL TRANSFORMS on anything textured or holding text: a transform that lands on half a
  CSS pixel is resampled, the backdrop shows through nine-slice seams and the font smears.
  "left-1/2 -translate-x-1/2" does exactly that on every box with an odd width or height (and
  text-lg, text-xl and text-4xl lines are an odd number of CSS px high). Center with layout:
  mc-center, flex/grid, or margin auto. If a translate is unavoidable, snap it:
  [translate:round(-50%,var(--mc-px))_round(-50%,var(--mc-px))].

TYPE
  font-sans / font-heading / font-mono = "Minecraft" (400 and 700 only; 500 renders as 400, 600 as
  700; no italic). font-enchant, font-illager = the two alternate scripts.
  1em = 8 font pixels. Sizes are multiples of 8px so glyph pixels stay whole, and follow --mc-scale:
    text-xs / text-sm / text-base   8px * scale        (16px)   line-height 9 / 11 / 13 font px
    text-lg / text-xl               8px * (scale + 1)  (24px)   line-height 11 / 9 font px
    text-2xl / text-3xl             8px * (scale + 2)  (32px)   line-height 11 / 9 font px
    text-4xl 40px, 5xl 48px, 6xl 64px, 7xl 80px, 8xl 96px, 9xl 128px (at scale 2), line-height 9
  xs/sm/base differ only by line-height: build hierarchy with color (text-muted-foreground, text-mc-*).
  On light surfaces color is not enough (#404040 text, #505050 muted text): there font-medium is
  bold (--font-weight-medium is 700 in mc-surface-light, 500 everywhere else), so a title written
  "font-medium" is regular white over gray on dark surfaces and bold over regular on light ones.
  Use font-medium for titles and group labels, font-bold for what must be bold everywhere.
  Use leading-* in eighths (1.125, 1.375, 1.625) to keep lines on the font grid. tracking-* is 0 or
  whole font pixels. Box shadows (shadow-2xs..2xl) and radii (rounded, rounded-<side>, rounded-xs..4xl,
  all 0) are zeroed theme-wide; rounded-full and arbitrary values still work.
  Text shadow: every element draws the game's shadow (1 font pixel down-right, text color x 0.25)
  in the color held by --mc-shadow-color, which is inherited: "on" on the page and dark surfaces,
  transparent on light surfaces.
    mc-text-shadow        turn the shadow on for this subtree
    mc-text-shadow-none   turn it off for this subtree (use it with text-transparent)
  shadcn's "shimmer" utility is patched to turn the shadow off (it fills the glyphs with a background).

COLORS (Tailwind colors: text-mc-gold, bg-mc-slot, border-mc-bevel-dark ...; also var(--color-mc-*))
  chat: mc-black mc-dark-blue mc-dark-green mc-dark-aqua mc-dark-red mc-dark-purple mc-gold mc-gray
        mc-dark-gray mc-blue mc-green mc-aqua mc-red mc-light-purple mc-yellow mc-white
  gui:  mc-panel #C6C6C6, mc-slot #8B8B8B, mc-label #404040, mc-bevel-dark #373737, mc-bevel-light
        #FFFFFF, mc-button-text, mc-button-text-disabled #A0A0A0, mc-text-field-text #E0E0E0,
        mc-text-field-disabled #707070, mc-text-field-hint #808080, mc-tooltip #100010, mc-xp #80FF20,
        mc-splash #FFFF00, mc-stone #6F6F6F, mc-popup #303030, mc-toast #212121
  grass (--primary): mc-grass #3C8527, mc-grass-light #52A535 (bevel highlight), mc-grass-dark
        #2A641C (hover), mc-grass-darker #1D4D13 (active)

MODES AND SURFACES
  :root = Classic (dimmed dirt page, light gray panels), .dark = Modern (dark menu page, dark popup
  panels). The page is dark in both, so page-level tokens are light-on-dark. Tokens are re-declared
  per surface; put one of these on every element that paints a surface (they also set color,
  color-scheme and the text shadow), nested surfaces work:
    mc-surface-light   tokens for the #C6C6C6 panel: #404040 text, no shadow, bold font-medium
    mc-surface-dark    tokens for the #303030 popup and any dark fill: white text, shadow
  Not restyled yet? An element with the plain class bg-card or bg-popover (and a styled sonner
  toast; toast.custom() and unstyled toasts paint nothing and keep the page tokens) gets
  the mode's surface set by itself: light in Classic, dark in Modern. That is a zero-specificity
  fallback: it does not see variants or opacity modifiers (hover:bg-card, bg-card/50), any
  mc-surface-* / mc-panel* on the element overrides it, and inside an explicit mc- surface it is off
  (there --card and --popover are that surface's own color).
  .dark carries the complete page-level set, so a .dark subtree works anywhere, even inside a light
  panel; it sets the text color but paints nothing: give it bg-background or mc-page.
  Every foreground/background pair of a set is at least 4.5:1, on the surface whose tokens are in
  scope only. --primary is a fill color (white label, 4.6:1), not a text color (3.4:1 on the page,
  2.7:1 on the light panel): use foreground plus an underline for links.
  --destructive is a text color for the plain surface (--background, --muted) only: 4.5 to 6.2:1
  there, but 3 to 4:1 on its own tint (bg-destructive/10, /20) and 2.6 to 3.8:1 on --accent (page and
  dark surfaces). The stock destructive button and badge variants do exactly that: replace them with a
  solid fill and a white label, "mc-button mc-tint-red" or "bg-mc-dark-red text-white" (7.7:1).
  --muted is a darker recess on dark surfaces and a lighter area (#DEDEDE) on the light panel; for a
  recessed well use mc-slot or mc-panel-inset. The sidebar tokens are dark in both modes.
  --chart-1..5 are the bright chat colors on dark surfaces and dark ones on light surfaces (3:1 or
  more against the surface and its --muted).
  mc-page              the mode's page background (what <body> gets): tile + dim, 32 GUI px tiles.
                       Hooks (inherited, set on :root/.dark): --mc-page-base, --mc-page-tile,
                       --mc-page-shade, --mc-page-tile-px.

NINE-SLICE UTILITIES (border-image). "border" = GUI px of layout the border takes on top/right/
bottom/left; padding is yours to add. Remove bg-* (bg-clip-padding included: it would cut the edges
off the stone widgets), border-*, rounded-* and shadow-* from the element: the sprite's center is
painted over any background. The box must be at least "min" GUI px or the browser shrinks the
corners. State utilities marked (state) only swap the sprite and do nothing alone: use them with a
variant on top of their base (hover:mc-button-highlighted focus-visible:mc-button-highlighted
disabled:mc-button-disabled). Every state comes after its base in the stylesheet, so
"mc-button mc-button-highlighted" also works; between two states the variant decides (disabled: is
emitted after hover: and focus-visible:, so a disabled button stays disabled).
Focus: a control with a highlighted sprite shows focus through it, so "outline-none
focus-visible:mc-*-highlighted" is the pattern (the states bring their own outline in forced-colors
mode, and the variant makes it win over outline-none). A control without one takes
"outline-none focus-visible:mc-focus-ring". Never leave a focusable element with outline-none alone.
mc-slot, mc-tint* and mc-bar set position: relative; absolute, fixed and sticky still win.
  mc-button                  stone button. border 3, min 6x6. White shadowed text. Game size 200x20.
                             The game puts the 9 px text line 5 px from the top: pt-1 pb-1.5 around a
                             text-xs line (centering a 9 px line in 20 px lands half a GUI px lower).
                             Any width and height, odd ones included: the stone is tiled from the
                             top-left corner exactly like the game (see mc-slice-tiled).
  mc-button-highlighted      (state) white outline.
  mc-button-disabled         (state) dark flat button, text #A0A0A0. Border stays 3.
  mc-text-field              black field, #A0A0A0 outline. border 1. Text #E0E0E0, shadowed,
                             placeholder #808080. Game size 200x20, text inset 3 GUI px more (px-1.5).
  mc-text-field-highlighted  (state) white outline; on light surfaces it adds a 1 GUI px black
                             outline outside the box (no layout shift), since white on #C6C6C6 is
                             too faint. Use it with focus: (a text field shows focus on click too).
  mc-slider-track            dark track. border 1. White shadowed text. Game size 200x20 (150x20 in
                             options). Any size, tiled like the button.
  mc-slider-track-highlighted (state) white outline.
  mc-slider-handle           stone handle. border 2 2 3 2, min 4x5. Game size 8x20, as tall as the
                             track (an absolute child starts inside the track's border: top -1 px).
  mc-slider-handle-highlighted (state) white outline.
  mc-tab                     unselected tab. border 6 2 3 2, min 4x9 (the top 4 px are the transparent
                             gap that makes it sit lower than the selected tab). Game size 130x24.
                             86% black: meant to sit on mc-bg-list or the page. White shadowed text.
  mc-tab-highlighted, mc-tab-selected, mc-tab-selected-highlighted   (state) same borders; the
                             selected sprites are an outline open at the bottom, transparent inside.
                             A selected tab needs both hover: and focus-visible:
                             mc-tab-selected-highlighted.
  mc-panel                   the mode's surface: mc-panel-classic under :root, mc-panel-dark under .dark.
  mc-panel-classic           light container panel + mc-surface-light. border 4 (1 outline, 2 bevel,
                             1 corner), min 8x8. The game insets content 3-4 px more (p-1.5 / p-2).
  mc-panel-dark              dark popup panel + mc-surface-dark. border 6, min 12x12.
  mc-panel-inset             black well with a slot bevel + mc-surface-dark. border 1.
  mc-tooltip                 purple tooltip, background and frame in one sprite (--mc-tooltip), no
                             pseudo-element: overflow-hidden / overflow-auto on it are fine. border 2;
                             the game pads 2 px more (p-1). Dark tokens, 94% opaque.
  mc-toast                   advancement toast (#212121) + dark tokens. border 4, min 8x8. Game size
                             160x32, icon at 8,8, text at x 30.
  mc-toast-system            navy system toast + dark tokens. border 3 3 3 17 (the left border holds
                             the "!" icon); min 21x34, set by the utility. Game text starts 4 px down
                             and 1 px in (pt-2 pl-0.5).
  mc-toast-tutorial          light toast (#DEDEDE) + light tokens. border 3, min 6x6.
  mc-box-gold                advancement "obtained" box (#B98F2C). border 2, min 20x14. Game size
                             200x20. Black unshadowed text (7.0:1). The game's white shadowed text is
                             2.99:1 and fails AA at any size: "text-white mc-text-shadow" is for
                             decoration only.
  mc-box-blue                advancement "unobtained" box (it is blue). border 2, min 20x14. White
                             shadowed text.
  mc-box-dark                advancement title box (#212121). border 2, min 20x14. White shadowed text.
  mc-slot                    inventory slot, #8B8B8B. border 1. Game size 18x18 (size-9), item 16x16.
  mc-slot-highlight          (state, on mc-slot) the hover overlay: white 38% under the content and
                             white 13% over it (::after), inside the bevel.
  mc-scroller                scrollbar thumb. border 1. Game width 6 (w-3).
  mc-scroller-track          scrollbar track (black). border 1.
  mc-slice                   the mechanism itself, for any other sprite. Hooks (not inherited):
                               --mc-slice-src             image, e.g. var(--mc-toast-now-playing)
                               --mc-slice-t/-r/-b/-l      slice in texture px (default 0)
                               --mc-bw-t/-r/-b/-l         layout border in GUI px (default: the slice)
                               --mc-slice-outset          border-image-outset (default 0)
                               --mc-slice-repeat          stretch (default) | repeat (centered
                                                          tiling: half a texel off on odd sizes)
                               --mc-slice-mask            mask image for mc-tint (default: the src)
                             class="mc-slice [--mc-slice-src:var(--mc-toast-now-playing)]
                                    [--mc-slice-t:4] [--mc-slice-r:4] [--mc-slice-b:4] [--mc-slice-l:4]"
  mc-slice-tiled             mc-slice for OPAQUE sprites with a noisy texture, tiled from the top-left
                             corner like the game (what mc-button, mc-slider-track and
                             mc-slider-handle use). Extra hooks (not inherited):
                               --mc-slice-src             var(--mc-widget-<name>-frame)
                               --mc-slice-tiles           var(--mc-widget-<name>-tiles): five images,
                                                          top/bottom/left/right edge strips + center
                               --mc-slice-w, --mc-slice-h the sprite's size in texture px
                             -frame and -tiles exist for widget/button, button_highlighted,
                             button_disabled, slider, slider_highlighted, slider_handle and
                             slider_handle_highlighted (scripts/build-derived-sprites.mjs).
  Not provided: mc-effect (container/inventory/effect_background is not inlined as a variable).

TEXTURES
  mc-pixelated      image-rendering: pixelated on the element and everything inside it. Elsewhere
                    only img[src*="/minecraft/"] and the mc- utilities are pixelated.
  mc-tile           tiled texture background. Hooks (not inherited):
                      --mc-tile        image:  class="mc-tile [--mc-tile:var(--mc-block-obsidian)]"
                      --mc-tile-size   one tile, default calc(16 * var(--mc-px))
                      --mc-tile-shade  color drawn over the tile, default transparent
  mc-tile-dim       25% brightness (classic options background)     } modifiers for mc-tile and
  mc-tile-dimmer    12.5% brightness (classic list background)      } mc-bg-*; they only set a hook
  mc-tile-bright    no shade
  mc-tile-2x        32 GUI px tiles, the size the game uses for screen backgrounds
  mc-bg-dirt, mc-bg-stone, mc-bg-planks, mc-bg-deepslate   ready-made block tiles (mc-tile included)
  mc-bg-menu, mc-bg-list   gui/menu_background (black 25%) and gui/menu_list_background (black 44%):
                    flat translucent textures that darken whatever is behind them.
  mc-sprite         inline-block showing one whole sprite. Hooks (not inherited): --mc-sprite (image;
                    a comma list stacks sprites), --mc-sprite-w, --mc-sprite-h (texture px, default
                    16), --mc-sprite-zoom (integer, default 1).
                      class="mc-sprite [--mc-sprite:var(--mc-hud-heart-full)] [--mc-sprite-w:9] [--mc-sprite-h:9]"
                    It has no text alternative: as an icon give it aria-hidden and put an aria-label
                    on the control; as content give it role="img" and an aria-label.
  mc-tint           multiplies the element's own background/border-image by --mc-tint (a color, not
                    inherited), under its content. Uses ::before and isolation: isolate. Follows the
                    shape of the nine-slice utilities (not in Firefox); on other elements it tints
                    the whole box, so use it on opaque textures.
                    NOT with overflow-hidden/auto/scroll/clip on the same element: overflow clips
                    the tint at the padding box and the border stays untinted. Scroll or clip in an
                    inner wrapper instead.
  mc-tint-red, -green, -gold, -blue, -purple   mc-tint with a ready-made color.
  mc-bar            a background/progress sprite pair, 182x5 by default, progress clipped to
                    --mc-bar-value (0..1) on whole GUI pixels. Uses ::after. Hooks: --mc-bar-bg,
                    --mc-bar-fill (default: the experience bar), --mc-bar-w, --mc-bar-h (texture px).
                      class="mc-bar [--mc-bar-bg:var(--mc-boss-bar-pink-background)]
                             [--mc-bar-fill:var(--mc-boss-bar-pink-progress)]" style={{ "--mc-bar-value": 0.4 }}
                    Purely visual: put role="progressbar" and aria-value* on it.
  mc-separator, mc-separator-footer   gui/header_separator and gui/footer_separator, 2 GUI px high.
  mc-separator-vertical               the same two lines, 2 GUI px wide.

MISC
  mc-focus-ring     1 GUI px square outline in --ring (white on dark surfaces, black on light ones),
                    no layout shift (focus-visible:mc-focus-ring).
  mc-center         centers a position: fixed box in the viewport with auto margins instead of a
                    transform (see GRID): replaces "top-1/2 left-1/2 -translate-x-1/2
                    -translate-y-1/2" on dialogs. Sets inset 0, margin auto, fit-content size and
                    100% max size; w-full, max-w-*, max-h-* and absolute still apply on top.
  mc-splash         title-screen splash text: yellow, shadowed, rotated -20deg, pulsing.
  mc-overlay        the in-game screen dim gradient, for dialog backdrops.

BASE LAYER (nothing to add in components)
  Native scrollbars are the game's scroller (6 GUI px, black track, #C0C0C0 thumb). ::selection is
  white on #0000FF. Underlines use the font's own 1 px line. prefers-reduced-motion stops animations
  and transitions.
  Highlighted rows: --accent is under 2:1 against every surface (a hover tint, not an indicator), so
  the highlighted item of a menu, select, combobox or command list also gets a 1 GUI px --ring line
  inside its box. It is matched on what Radix, Base UI and cmdk render ([data-highlighted] on a
  menuitem* in a role=menu or an option in a role=listbox, [cmdk-item][data-selected="true"]), so
  items need no class; "outline-none!" on an item removes it. Group labels of those lists
  (data-slot *-menu-label, menubar-label, select-label, combobox-label, [cmdk-group-heading]) take
  font-medium's weight by themselves: bold on light surfaces.
  In forced-colors mode sprites are dropped so that system text colors stay
  readable: the nine-slice utilities keep a plain ButtonBorder border of the same width, the
  highlighted states draw a 1 GUI px Highlight outline, selected tabs and highlighted slots a
  Highlight border, the disabled button a GrayText border, and scrollbars use system colors.

====================================================================================================
```
