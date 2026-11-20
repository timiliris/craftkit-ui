#!/usr/bin/env node
// Builds the sprites the game composes at runtime and therefore never ships as standalone
// textures: the classic container window frame (cut out of a container screen as a nine-slice),
// biome-tinted blocks (grayscale texture multiplied by the biome color), the tooltip (frame over
// background) and the tiles of the nine-slice stone widgets (corners, edge strips, center).
//
//   node scripts/build-derived-sprites.mjs
//
// Reads the PNGs already extracted to .cache/textures/ (run extract-textures.mjs first).
// Every output pixel is a crop, a composite or a per-channel multiply of game pixels; nothing is drawn.
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import zlib from "node:zlib"
import { PNG } from "pngjs"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const TEXTURES = path.join(ROOT, ".cache/textures")
const OUT_DIR = path.join(TEXTURES, "derived")
const OUT_CSS = path.join(ROOT, "minecraft-derived.css")
const MANIFEST = path.join(ROOT, ".cache/minecraft-textures.json")

// Default (plains) biome colors, the ones the game uses for inventory icons.
const GRASS_TINT = [0x91, 0xbd, 0x59]
const FOLIAGE_TINT = [0x77, 0xab, 0x2f]
const WATER_TINT = [0x3f, 0x76, 0xe4]

const TICK_MS = 50

// ── tiny RGBA image toolkit ─────────────────────────────────────────────────────────────────
function load(rel) {
  const file = path.join(TEXTURES, rel)
  if (!fs.existsSync(file)) throw new Error(`Missing ${rel} — run scripts/extract-textures.mjs first.`)
  const { width, height, data } = PNG.sync.read(fs.readFileSync(file))
  return { width, height, data }
}

const blank = (width, height) => ({ width, height, data: Buffer.alloc(width * height * 4) })
const px = (img, x, y) => img.data.readUInt32BE((y * img.width + x) * 4)
const hex = (rgba) => `#${rgba.toString(16).padStart(8, "0")}`

function blit(dst, src, dx, dy, sx = 0, sy = 0, w = src.width, h = src.height) {
  for (let y = 0; y < h; y++) {
    const from = ((sy + y) * src.width + sx) * 4
    src.data.copy(dst.data, ((dy + y) * dst.width + dx) * 4, from, from + w * 4)
  }
  return dst
}

function crop(src, x, y, w, h) {
  if (x < 0 || y < 0 || x + w > src.width || y + h > src.height) throw new Error(`crop ${x},${y} ${w}x${h} out of bounds`)
  return blit(blank(w, h), src, 0, 0, x, y, w, h)
}

// The game tints by multiplying the texel with the biome color per channel; alpha is untouched.
function multiply(src, [r, g, b]) {
  const out = crop(src, 0, 0, src.width, src.height)
  for (let i = 0; i < out.data.length; i += 4) {
    out.data[i] = Math.round((out.data[i] * r) / 255)
    out.data[i + 1] = Math.round((out.data[i + 1] * g) / 255)
    out.data[i + 2] = Math.round((out.data[i + 2] * b) / 255)
  }
  return out
}

// Straight-alpha "source over".
function over(base, top) {
  const out = crop(base, 0, 0, base.width, base.height)
  for (let i = 0; i < out.data.length; i += 4) {
    const ta = top.data[i + 3] / 255
    const ba = out.data[i + 3] / 255
    const a = ta + ba * (1 - ta)
    for (let c = 0; c < 3; c++) {
      out.data[i + c] = a === 0 ? 0 : Math.round((top.data[i + c] * ta + out.data[i + c] * ba * (1 - ta)) / a)
    }
    out.data[i + 3] = Math.round(a * 255)
  }
  return out
}

function alphaBounds(img) {
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      if ((px(img, x, y) & 0xff) === 0) continue
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y)
    }
  }
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 }
}

// pngjs cannot write palette PNGs, and these sprites have few colors: an 8-bit indexed file is
// 2-6x smaller than RGBA, which matters because every sprite is inlined as base64 in the CSS.
// Falls back to truecolor above 256 colors.
function encodePng(img) {
  const palette = new Map()
  let opaque = true
  for (let i = 0; i < img.data.length; i += 4) {
    const rgba = img.data.readUInt32BE(i)
    if (!palette.has(rgba)) palette.set(rgba, palette.size)
    if (img.data[i + 3] !== 255) opaque = false
  }
  if (palette.size > 256) {
    return PNG.sync.write(img, { colorType: opaque ? 2 : 6, inputHasAlpha: true, deflateLevel: 9 })
  }

  const chunk = (type, body) => {
    const out = Buffer.alloc(body.length + 12)
    out.writeUInt32BE(body.length, 0)
    out.write(type, 4, "latin1")
    body.copy(out, 8)
    out.writeUInt32BE(zlib.crc32(out.subarray(4, body.length + 8)), body.length + 8)
    return out
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(img.width, 0)
  ihdr.writeUInt32BE(img.height, 4)
  ihdr.set([8, 3, 0, 0, 0], 8) // 8-bit, indexed, no interlace
  const plte = Buffer.alloc(palette.size * 3)
  const trns = Buffer.alloc(palette.size)
  for (const [rgba, i] of palette) {
    plte.set([rgba >>> 24, (rgba >>> 16) & 0xff, (rgba >>> 8) & 0xff], i * 3)
    trns[i] = rgba & 0xff
  }
  // One filter byte (0 = none) in front of every scanline.
  const rows = Buffer.alloc((img.width + 1) * img.height)
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) rows[y * (img.width + 1) + 1 + x] = palette.get(px(img, x, y))
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("PLTE", plte),
    ...(opaque ? [] : [chunk("tRNS", trns)]),
    chunk("IDAT", zlib.deflateSync(rows, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ])
}

// ── nine-slice helpers ──────────────────────────────────────────────────────────────────────
// A nine-slice is built from the four real corners of `rect`, each taken together with `spare`
// extra pixels of the adjacent edges and center, so every quadrant is one contiguous crop.
function nineSliceFromCorners(src, rect, border, spare, label) {
  const q = border + spare
  const out = blank(q * 2, q * 2)
  blit(out, src, 0, 0, rect.x, rect.y, q, q)
  blit(out, src, q, 0, rect.x + rect.w - q, rect.y, q, q)
  blit(out, src, 0, q, rect.x, rect.y + rect.h - q, q, q)
  blit(out, src, q, q, rect.x + rect.w - q, rect.y + rect.h - q, q, q)

  // The stretched parts must be constant along the stretch direction, otherwise the crop
  // positions above run through a slot, arrow or label and the sprite is not a valid nine-slice.
  const size = q * 2
  for (let i = border; i < size - border; i++) {
    for (let d = 0; d < size; d++) {
      const onEdge = d < border || d >= size - border
      const side = d < border ? ["top", "left"] : d >= size - border ? ["bottom", "right"] : ["center", "center"]
      if (px(out, i, d) !== px(out, border, d)) {
        throw new Error(`${label}: ${side[0]} ${onEdge ? "edge strip" : "area"} is not uniform at row ${d} (x=${i}): ${hex(px(out, i, d))} vs ${hex(px(out, border, d))}`)
      }
      if (px(out, d, i) !== px(out, d, border)) {
        throw new Error(`${label}: ${side[1]} ${onEdge ? "edge strip" : "area"} is not uniform at column ${d} (y=${i}): ${hex(px(out, d, i))} vs ${hex(px(out, d, border))}`)
      }
    }
  }
  return out
}

// What border-image does with the sprite, on the integer grid.
function renderNineSlice(sprite, border, w, h) {
  const out = blank(w, h)
  const map = (v, len, slen) => (v < border ? v : v >= len - border ? slen - (len - v) : border + ((v - border) % (slen - border * 2)))
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      out.data.writeUInt32BE(px(sprite, map(x, w, sprite.width), map(y, h, sprite.height)), (y * w + x) * 4)
    }
  }
  return out
}

// Re-render the sprite at the size of the source rect and compare it with the game pixels.
// `ringOnly` limits the comparison to the frame itself (the inside of a window holds slots).
function assertReproduces(sprite, border, src, rect, label, ringOnly) {
  const rebuilt = renderNineSlice(sprite, border, rect.w, rect.h)
  for (let y = 0; y < rect.h; y++) {
    for (let x = 0; x < rect.w; x++) {
      const inRing = x < border || y < border || x >= rect.w - border || y >= rect.h - border
      if (ringOnly && !inRing) continue
      const want = px(src, rect.x + x, rect.y + y)
      const got = px(rebuilt, x, y)
      if (want !== got) throw new Error(`${label}: nine-slice differs from the source at ${rect.x + x},${rect.y + y}: ${hex(got)} vs ${hex(want)}`)
    }
  }
}

// The border is minimal when shrinking it by one would cut into a corner: some pixel on the
// innermost corner row/column differs from what the center would put there.
function assertBorderIsMinimal(sprite, border, label) {
  const last = sprite.width - 1
  const center = px(sprite, border, border)
  const inner = border - 1
  for (let i = 0; i < border; i++) {
    for (const [x, y] of [[i, inner], [inner, i]]) {
      for (const [cx, cy] of [[x, y], [last - x, y], [x, last - y], [last - x, last - y]]) {
        if (px(sprite, cx, cy) !== center) return
      }
    }
  }
  throw new Error(`${label}: a ${border}px border is larger than the frame needs`)
}

// ── animations ──────────────────────────────────────────────────────────────────────────────
// Returns the frames of an animated texture in playback order, or null when the animation cannot
// be expressed as one CSS steps() timing (per-frame times, or frame interpolation).
function readAnimation(rel) {
  const img = load(rel)
  const metaFile = path.join(TEXTURES, `${rel}.mcmeta`)
  const anim = (fs.existsSync(metaFile) ? JSON.parse(fs.readFileSync(metaFile, "utf8")).animation : null) ?? {}
  const frameW = anim.width ?? img.width
  const frameH = anim.height ?? img.width
  const stored = Math.floor(img.height / frameH)
  const frametime = anim.frametime ?? 1
  const order = anim.frames ?? Array.from({ length: stored }, (_, i) => i)
  const steppable = !anim.interpolate && order.every((f) => typeof f === "number" || (f.time ?? frametime) === frametime)
  const frames = order.map((f) => crop(img, 0, (typeof f === "number" ? f : f.index) * frameH, frameW, frameH))
  return { frames, stored, frametime, steppable }
}

function verticalStrip(frames) {
  const out = blank(frames[0].width, frames[0].height * frames.length)
  frames.forEach((frame, i) => blit(out, frame, 0, i * frame.height))
  return out
}

// ── build ───────────────────────────────────────────────────────────────────────────────────
const version = JSON.parse(fs.readFileSync(MANIFEST, "utf8")).version
console.log(`Derived sprites for Minecraft ${version}`)

/** @type {{ file: string, img: ReturnType<typeof blank>, source: string, border?: number, anim?: { frames: number, ms: number } }[]} */
const sprites = []

// 1. Classic container window. The window sits at the top-left of the 256x256 sheet and the rest
//    is transparent, so its bounds are the bounds of the alpha channel.
{
  const rel = "gui/container/inventory.png"
  const sheet = load(rel)
  const win = alphaBounds(sheet)
  // 1px outline + 2px bevel + the one inner pixel of the clipped corners.
  const BORDER = 4
  const SPARE = 2
  const panel = nineSliceFromCorners(sheet, win, BORDER, SPARE, "panel-classic")
  assertBorderIsMinimal(panel, BORDER, "panel-classic")
  assertReproduces(panel, BORDER, sheet, win, "panel-classic", true)
  const q = BORDER + SPARE
  sprites.push({
    file: "panel_classic.png",
    img: panel,
    border: BORDER,
    source: `${rel} window ${win.x},${win.y} ${win.w}x${win.h}: its four ${q}x${q} corners`,
  })

  // 2. The recessed black box behind the player model: a slot-style 1px bevel around pure black.
  //    Its position is not discoverable from alpha, so it is pinned here and verified pixel by pixel.
  const well = { x: 25, y: 7, w: 51, h: 72 }
  const inset = nineSliceFromCorners(sheet, well, 1, 2, "panel-classic-inset")
  assertBorderIsMinimal(inset, 1, "panel-classic-inset")
  assertReproduces(inset, 1, sheet, well, "panel-classic-inset", false)
  sprites.push({
    file: "panel_classic_inset.png",
    img: inset,
    border: 1,
    source: `${rel} player box ${well.x},${well.y} ${well.w}x${well.h}: its four 3x3 corners`,
  })
}

// 3. Biome-tinted blocks.
{
  const tintName = (t) => `#${t.map((c) => c.toString(16).padStart(2, "0")).join("").toUpperCase()}`

  sprites.push({
    file: "block/grass_block_top_tinted.png",
    img: multiply(load("block/grass_block_top.png"), GRASS_TINT),
    source: `block/grass_block_top.png x ${tintName(GRASS_TINT)}`,
  })
  sprites.push({
    file: "block/grass_block_side_tinted.png",
    img: over(load("block/grass_block_side.png"), multiply(load("block/grass_block_side_overlay.png"), GRASS_TINT)),
    source: `block/grass_block_side.png + (block/grass_block_side_overlay.png x ${tintName(GRASS_TINT)}) on top`,
  })
  sprites.push({
    file: "block/oak_leaves_tinted.png",
    img: multiply(load("block/oak_leaves.png"), FOLIAGE_TINT),
    source: `block/oak_leaves.png x ${tintName(FOLIAGE_TINT)}, alpha kept`,
  })

  // 4. Fluids: first frame as a static sprite, plus the whole animation unrolled into a vertical
  //    strip in playback order so that one steps() animation plays it.
  const fluids = [
    { name: "water", rel: "block/water_still.png", tint: WATER_TINT },
    { name: "lava", rel: "block/lava_still.png", tint: null },
  ]
  for (const { name, rel, tint } of fluids) {
    const anim = readAnimation(rel)
    const frames = tint ? anim.frames.map((f) => multiply(f, tint)) : anim.frames
    const { width, height } = frames[0]
    const how = tint ? ` x ${tintName(tint)}, alpha kept` : ", untinted"
    sprites.push({ file: `block/${name}.png`, img: frames[0], source: `${rel} frame 0 (0,0 ${width}x${height})${how}` })
    if (!anim.steppable) {
      console.warn(`  ! ${rel}: animation needs per-frame times or interpolation, strip skipped`)
      continue
    }
    const ms = anim.frametime * TICK_MS
    sprites.push({
      file: `block/${name}_strip.png`,
      img: verticalStrip(frames),
      anim: { frames: frames.length, ms },
      source: `${rel}: ${frames.length} frames in .mcmeta order (${anim.stored} stored), frametime ${anim.frametime} ticks${how}`,
    })
  }
}

const cssName = (file) => file.replace(/\.png$/, "").replace(/[/_]/g, "-")

/** Variables that combine other variables: [name, value, one-line description]. */
const aliases = []

// 5. Tooltip: the game draws tooltip/background, then tooltip/frame on top of it, both nine-slice
//    at the same rectangle. A CSS box paints a single border-image, so the two are merged here.
{
  const bgRel = "gui/sprites/tooltip/background.png"
  const frameRel = "gui/sprites/tooltip/frame.png"
  const bg = load(bgRel)
  const frame = load(frameRel)
  const BORDER = 10 // the frame's border; the background declares 9
  if (bg.width !== frame.width || bg.height !== frame.height) throw new Error("tooltip: background and frame differ in size")

  // The background is tiled by the game. Slicing it one pixel further in and stretching it gives
  // the same pixels only if everything past its corners is constant along the stretch direction.
  for (let i = BORDER; i < bg.width - BORDER; i++) {
    for (let d = 0; d < bg.height; d++) {
      if (px(bg, i, d) !== px(bg, BORDER, d)) throw new Error(`tooltip: background row ${d} is not uniform at x=${i}`)
      if (px(bg, d, i) !== px(bg, d, BORDER)) throw new Error(`tooltip: background column ${d} is not uniform at y=${i}`)
    }
  }
  // The frame sets stretch_inner, so the game stretches it exactly like border-image "stretch".
  const frameMeta = JSON.parse(fs.readFileSync(path.join(TEXTURES, `${frameRel}.mcmeta`), "utf8")).gui.scaling
  if (frameMeta.border !== BORDER || !frameMeta.stretch_inner) throw new Error("tooltip: frame.png.mcmeta is no longer border 10 + stretch_inner")

  sprites.push({
    file: "tooltip.png",
    img: over(bg, frame),
    border: BORDER,
    source: `${bgRel} with ${frameRel} composited on top (straight alpha, within 1/255 of drawing both)`,
  })
}

// 6. Tiled nine-slice widgets. The game tiles the edges and the center of a nine-slice sprite from
//    the top-left corner, using the edge strip / the center of the texture as the tile. border-image
//    can only center its tiling ("repeat") or rescale it ("round"), which puts the stone grain half a
//    texel off the grid on every other size. So the noisy parts are cut out as their own images and
//    drawn as top-left anchored CSS backgrounds; border-image keeps the four corners only.
{
  const WIDGETS = ["button", "button_highlighted", "button_disabled", "slider", "slider_highlighted", "slider_handle", "slider_handle_highlighted"]

  // What the game draws for a nine-slice sprite at w x h (GuiGraphics.blitNineSlicedSprite).
  const gameNineSlice = (src, [t, r, b, l], w, h) => {
    const out = blank(w, h)
    const mapX = (x) => (x < l ? x : x >= w - r ? src.width - (w - x) : l + ((x - l) % (src.width - l - r)))
    const mapY = (y) => (y < t ? y : y >= h - b ? src.height - (h - y) : t + ((y - t) % (src.height - t - b)))
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) out.data.writeUInt32BE(px(src, mapX(x), mapY(y)), (y * w + x) * 4)
    }
    return out
  }

  // What the theme draws: center, then the four edge strips, each tiled from its top-left anchor
  // over the whole box, then the frame's corners (and its stretched edges when it has any).
  const cssLayers = (parts, [t, r, b, l], w, h) => {
    const out = blank(w, h)
    const put = (x, y, rgba) => out.data.writeUInt32BE(rgba, (y * w + x) * 4)
    const mod = (v, n) => ((v % n) + n) % n
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        put(x, y, px(parts.center, mod(x - l, parts.center.width), mod(y - t, parts.center.height)))
        if (parts.edges) {
          if (x < l) put(x, y, px(parts.edges.l, x, mod(y - t, parts.edges.l.height)))
          if (x >= w - r) put(x, y, px(parts.edges.r, x - (w - r), mod(y - t, parts.edges.r.height)))
          if (y < t) put(x, y, px(parts.edges.t, mod(x - l, parts.edges.t.width), y))
          if (y >= h - b) put(x, y, px(parts.edges.b, mod(x - l, parts.edges.b.width), y - (h - b)))
        }
        const cornerX = x < l ? x : x >= w - r ? parts.frame.width - (w - x) : -1
        const cornerY = y < t ? y : y >= h - b ? parts.frame.height - (h - y) : -1
        if (cornerX >= 0 && cornerY >= 0) put(x, y, px(parts.frame, cornerX, cornerY))
        else if (!parts.edges && (cornerX >= 0 || cornerY >= 0)) {
          // Flat edges stay in the border-image and are stretched: any pixel of the strip will do.
          put(x, y, px(parts.frame, cornerX >= 0 ? cornerX : l, cornerY >= 0 ? cornerY : t))
        }
      }
    }
    return out
  }

  for (const widget of WIDGETS) {
    const rel = `gui/sprites/widget/${widget}.png`
    const src = load(rel)
    const scaling = JSON.parse(fs.readFileSync(path.join(TEXTURES, `${rel}.mcmeta`), "utf8")).gui.scaling
    if (scaling.type !== "nine_slice" || scaling.stretch_inner) throw new Error(`${rel}: expected a tiled nine-slice`)
    const bd = scaling.border
    const border = typeof bd === "number" ? [bd, bd, bd, bd] : [bd.top, bd.right, bd.bottom, bd.left]
    const [t, r, b, l] = border
    const cw = src.width - l - r
    const ch = src.height - t - b
    const label = `widget/${widget}`

    // The layers run under the corners and under each other, so nothing may be translucent.
    for (let i = 3; i < src.data.length; i += 4) {
      if (src.data[i] !== 255) throw new Error(`${label}: not fully opaque, the tile layers would show through`)
    }

    const strips = {
      t: crop(src, l, 0, cw, t),
      b: crop(src, l, src.height - b, cw, b),
      l: crop(src, 0, t, l, ch),
      r: crop(src, src.width - r, t, r, ch),
    }
    const flat = (img, alongX) => {
      for (let y = 0; y < img.height; y++) {
        for (let x = 0; x < img.width; x++) {
          if (px(img, x, y) !== (alongX ? px(img, 0, y) : px(img, x, 0))) return false
        }
      }
      return true
    }
    const edgesAreFlat = flat(strips.t, true) && flat(strips.b, true) && flat(strips.l, false) && flat(strips.r, false)

    const base = `widget/${widget}`
    const center = crop(src, l, t, cw, ch)
    sprites.push({ file: `${base}_center.png`, img: center, source: `${rel} center ${l},${t} ${cw}x${ch}` })

    let parts
    if (edgesAreFlat) {
      // Stretching a flat strip equals tiling it: the original sprite stays the border-image.
      parts = { frame: src, center, edges: null }
      aliases.push([`--mc-${cssName(base)}-frame`, `var(--mc-${cssName(base)})`, `the sprite itself (flat edges, border ${border.join(" ")})`])
      aliases.push([`--mc-${cssName(base)}-tiles`, `none, none, none, none, var(--mc-${cssName(base)}-center)`, "center only"])
    } else {
      // Corners only: with nothing between the slices, border-image draws no edges and no center.
      const corners = blank(l + r, t + b)
      blit(corners, src, 0, 0, 0, 0, l, t)
      blit(corners, src, l, 0, src.width - r, 0, r, t)
      blit(corners, src, 0, t, 0, src.height - b, l, b)
      blit(corners, src, l, t, src.width - r, src.height - b, r, b)
      parts = { frame: corners, center, edges: strips }
      sprites.push({ file: `${base}_corners.png`, img: corners, source: `${rel}: its four corners (border ${border.join(" ")})` })
      for (const [side, img] of Object.entries(strips)) {
        sprites.push({ file: `${base}_edge_${side}.png`, img, source: `${rel} ${{ t: "top", b: "bottom", l: "left", r: "right" }[side]} edge strip ${img.width}x${img.height}` })
      }
      const v = (suffix) => `var(--mc-${cssName(base)}-${suffix})`
      aliases.push([`--mc-${cssName(base)}-frame`, v("corners"), `corners only (border ${border.join(" ")})`])
      aliases.push([`--mc-${cssName(base)}-tiles`, [v("edge-t"), v("edge-b"), v("edge-l"), v("edge-r"), v("center")].join(", "), "top, bottom, left, right, center"])
    }

    // The layers must reproduce the game at any size, odd ones and ones larger than the texture included.
    for (const [w, h] of [[src.width, src.height], [l + r + 1, t + b + 1], [101, 21], [src.width + 57, src.height + 31], [src.width * 2 + 3, src.height * 3 + 1]]) {
      const want = gameNineSlice(src, border, w, h)
      const got = cssLayers(parts, border, w, h)
      if (!want.data.equals(got.data)) throw new Error(`${label}: layers differ from the game's nine-slice at ${w}x${h}`)
    }
  }
}

// ── write PNGs + CSS ────────────────────────────────────────────────────────────────────────

fs.rmSync(OUT_DIR, { recursive: true, force: true })
const cssLines = []
const docLines = []
const summary = []
let inlinedBytes = 0

for (const sprite of sprites) {
  const { file, img, border, anim, source } = sprite
  const png = encodePng(img)

  // Decode what was just encoded: the file on disk must hold exactly the composed pixels.
  const check = PNG.sync.read(png)
  if (check.width !== img.width || check.height !== img.height || !check.data.equals(img.data)) {
    throw new Error(`${file}: PNG round-trip changed the pixels`)
  }

  const target = path.join(OUT_DIR, file)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, png)

  const name = `--mc-${cssName(file)}`
  const uri = `url("data:image/png;base64,${png.toString("base64")}")`
  inlinedBytes += uri.length
  cssLines.push(`  ${name}: ${uri};`)
  let note = `${img.width}x${img.height}`
  if (border) {
    // Unitless on purpose: usable directly as border-image-slice, or multiplied by --mc-scale for widths.
    cssLines.push(`  ${name}-slice: ${border} ${border} ${border} ${border};`)
    cssLines.push(`  ${name}-border: ${border};`)
    note += `, nine-slice border ${border}`
  }
  if (anim) {
    cssLines.push(`  ${name}-frames: ${anim.frames};`)
    cssLines.push(`  ${name}-duration: ${anim.frames * anim.ms}ms;`)
    note += `, ${anim.frames} frames x ${anim.ms}ms = ${anim.frames * anim.ms}ms loop`
  }
  docLines.push(` *   ${name}  (${note})`, ` *     ${source}`)
  summary.push(`  ${name.padEnd(36)} ${note}\n      <- ${source}`)
}

// Declared after the sprites they refer to; var() is substituted on :root, where both live.
const aliasDoc = aliases.length
  ? ` *
 * Tiled nine-slice widgets, ready for the theme's mc-slice-tiled mechanism (the game tiles edges and
 * center from the top-left corner; see minecraft.css):
 *   --mc-<widget>-frame  the border-image source: the four corners only, or the sprite itself when
 *                        its edge strips are flat
 *   --mc-<widget>-tiles  five background layers: top, bottom, left and right edge strips, then center
${aliases.map(([name, , note]) => ` *   ${name}: ${note}`).join("\n")}
`
  : ""
for (const [name, value] of aliases) cssLines.push(`  ${name}: ${value};`)

const strips = sprites.filter((s) => s.anim)
const animDoc = strips.length
  ? ` *
 * Animated strips are vertical, one square frame per step, already in playback order, with a
 * constant frame time and no interpolation (read from the .mcmeta, 1 tick = ${TICK_MS}ms):
${strips.map((s) => ` *   --mc-${cssName(s.file)}: ${s.anim.frames} frames, ${s.anim.ms}ms per frame, ${s.anim.frames * s.anim.ms}ms per loop -> steps(${s.anim.frames})`).join("\n")}
 * Each one also gets "-frames" (unitless) and "-duration" variables. To play one on a box of
 * --size (a length), with @keyframes mc-strip { to { background-position-y: var(--mc-strip-end) } }:
 *   background: var(--mc-block-water-strip) 0 0 / 100% auto;
 *   image-rendering: pixelated;
 *   --mc-strip-end: calc(var(--size) * var(--mc-block-water-strip-frames) * -1);
 *   animation: mc-strip var(--mc-block-water-strip-duration) steps(var(--mc-block-water-strip-frames)) infinite;
`
  : ""

const header = `/*
 * GENERATED by scripts/build-derived-sprites.mjs from Minecraft ${version} — do not edit by hand.
 * Run \`node scripts/build-derived-sprites.mjs\` to regenerate (after \`pnpm mc:extract\`).
 *
 * Sprites the game composes at runtime, rebuilt from the extracted textures by cropping,
 * compositing and per-channel tint multiplication only (round(texel * tint / 255)):
${docLines.join("\n")}
${aliasDoc}${animDoc} *
 * Minecraft textures are © Mojang AB. They are extracted from your licensed copy for your own
 * fan project; read https://www.minecraft.net/usage-guidelines before publishing a site with them.
 * NOT AN OFFICIAL MINECRAFT PRODUCT. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.
 */
`
fs.mkdirSync(path.dirname(OUT_CSS), { recursive: true })
fs.writeFileSync(OUT_CSS, `${header}:root {\n${cssLines.join("\n")}\n}\n`)

console.log(summary.join("\n"))
console.log(`  ${sprites.length} PNGs -> theme/.cache/textures/derived/`)
console.log(`  ${sprites.length} sprites inlined -> theme/minecraft-derived.css (${(inlinedBytes / 1024).toFixed(1)} KB)`)
