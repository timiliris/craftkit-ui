// Builds the Minecraft web fonts from the bitmap font of YOUR licensed copy of the game.
//
//   node scripts/build-font.mjs [--jar /path/to/client.jar]
//
// Output:
//   .cache/fonts/minecraft-{regular,bold,enchant,illager}.woff2
//   minecraft-font.css              (@font-face rules with the WOFF2 embedded as data URIs)
//
// The game draws text from PNG glyph sheets on an integer pixel grid. Each glyph is converted
// to a vector outline whose corners all sit on that grid, so at font sizes that are a multiple
// of 8px every glyph pixel covers a whole number of CSS pixels and no edge needs anti-aliasing.
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import opentype from "opentype.js"
import { PNG } from "pngjs"
import wawoff2 from "wawoff2"
import { findMinecraftJar } from "./lib/find-jar.mjs"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const FONT_DIR = path.join(ROOT, ".cache", "fonts")
const CSS_FILE = path.join(ROOT, "minecraft-font.css")

// 1 GUI pixel = 125 font units, so 1em = 8 GUI pixels: `font-size: 16px` gives 2 CSS px per pixel.
const UNITS_PER_EM = 1000
const PX = 125
// 8 px above the baseline + 1 px below = the game's 9 px line height.
const ASCENDER = 8 * PX
const DESCENDER = -1 * PX

// Not part of the game's bitmap font (it would use Unifont there). Added because web text is full
// of them (French punctuation spacing, &nbsp;) and a fallback font's space is not a whole number
// of GUI pixels wide, which would push the rest of the line off the pixel grid.
const WEB_SPACE_ALIASES = {
  0x00a0: 4, // NO-BREAK SPACE, same advance as the game's space
  0x202f: 2, // NARROW NO-BREAK SPACE
}

const FACES = [
  { file: "minecraft-regular", font: "minecraft:default", family: "Minecraft", style: "Regular", weight: 400, bold: false },
  { file: "minecraft-bold", font: "minecraft:default", family: "Minecraft", style: "Bold", weight: 700, bold: true },
  { file: "minecraft-enchant", font: "minecraft:alt", family: "Minecraft Enchant", style: "Regular", weight: 400, bold: false },
  { file: "minecraft-illager", font: "minecraft:illageralt", family: "Minecraft Illager", style: "Regular", weight: 400, bold: false },
]

// ---------------------------------------------------------------------------------------------
// Reading the game's font definitions
// ---------------------------------------------------------------------------------------------

/** "minecraft:font/ascii.png" + "textures" -> "assets/minecraft/textures/font/ascii.png" */
function assetPath(id, folder, extension = "") {
  const [namespace, name] = id.includes(":") ? id.split(":") : ["minecraft", id]
  return `assets/${namespace}/${folder}/${name}${extension}`
}

function readEntry(zip, entryName) {
  const entry = zip.getEntry(entryName)
  if (!entry) throw new Error(`${entryName} is missing from the jar.`)
  return entry.getData()
}

/** Flattens a font definition into its bitmap and space providers, in the game's lookup order. */
function resolveProviders(zip, fontId, seen = new Set()) {
  if (seen.has(fontId)) return []
  seen.add(fontId)
  const definition = JSON.parse(readEntry(zip, assetPath(fontId, "font", ".json")).toString("utf8"))
  const providers = []
  for (const provider of definition.providers ?? []) {
    // "uniform: true" providers are only active with the Force Unicode option.
    if (provider.filter?.uniform === true) continue
    if (provider.type === "reference") providers.push(...resolveProviders(zip, provider.id, seen))
    else if (provider.type === "bitmap" || provider.type === "space") providers.push(provider)
    // unihex / ttf providers (Unifont) are deliberately left out.
  }
  return providers
}

/**
 * Returns Map<codePoint, { advance, ascent, scale, bitmap? }> in GUI pixels.
 * When several providers define a code point the first one wins, like in the game.
 */
function loadGlyphs(zip, fontId) {
  const glyphs = new Map()
  for (const provider of resolveProviders(zip, fontId)) {
    if (provider.type === "space") {
      for (const [char, advance] of Object.entries(provider.advances)) {
        const codePoint = char.codePointAt(0)
        if (!glyphs.has(codePoint)) glyphs.set(codePoint, { advance, ascent: 0, scale: 1 })
      }
      continue
    }

    const png = PNG.sync.read(readEntry(zip, assetPath(provider.file, "textures")))
    // Spread by code point: a row may contain characters outside the BMP.
    const rows = provider.chars.map((row) => [...row])
    const cellWidth = Math.floor(png.width / rows[0].length)
    const cellHeight = Math.floor(png.height / rows.length)
    const scale = (provider.height ?? 8) / cellHeight

    rows.forEach((row, rowIndex) => {
      row.forEach((char, columnIndex) => {
        const codePoint = char.codePointAt(0)
        if (codePoint === 0 || glyphs.has(codePoint)) return

        const alphaAt = (x, y) =>
          png.data[((rowIndex * cellHeight + y) * png.width + columnIndex * cellWidth + x) * 4 + 3]
        // Ink width = right-most column that has any non-transparent pixel, + 1.
        let inkWidth = cellWidth
        for (; inkWidth > 0; inkWidth--) {
          let hasInk = false
          for (let y = 0; y < cellHeight && !hasInk; y++) hasInk = alphaAt(inkWidth - 1, y) > 0
          if (hasInk) break
        }
        const data = new Uint8Array(inkWidth * cellHeight)
        for (let y = 0; y < cellHeight; y++) {
          for (let x = 0; x < inkWidth; x++) data[y * inkWidth + x] = alphaAt(x, y) > 0 ? 1 : 0
        }
        glyphs.set(codePoint, {
          advance: Math.floor(0.5 + inkWidth * scale) + 1,
          ascent: provider.ascent,
          scale,
          bitmap: { width: inkWidth, height: cellHeight, data },
        })
      })
    })
  }
  return glyphs
}

/** The game's "missing glyph": a 5x8 hollow box, generated in code there too (not a texture). */
function missingGlyph() {
  const width = 5
  const height = 8
  const data = new Uint8Array(width * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      data[y * width + x] = x === 0 || x === width - 1 || y === 0 || y === height - 1 ? 1 : 0
    }
  }
  return { advance: 6, ascent: 7, scale: 1, bitmap: { width, height, data } }
}

// ---------------------------------------------------------------------------------------------
// Bitmap -> outline
// ---------------------------------------------------------------------------------------------

/** The game's bold: the glyph drawn twice, the second time 1 GUI pixel to the right. */
function embolden(glyph) {
  if (!glyph.bitmap) return { ...glyph, advance: glyph.advance + 1 }
  const { width, height, data } = glyph.bitmap
  // 1 GUI pixel expressed in texture pixels (1 for every vanilla sheet).
  const shift = Math.max(1, Math.round(1 / glyph.scale))
  const bold = new Uint8Array((width + shift) * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!data[y * width + x]) continue
      bold[y * (width + shift) + x] = 1
      bold[y * (width + shift) + x + shift] = 1
    }
  }
  return { ...glyph, advance: glyph.advance + 1, bitmap: { width: width + shift, height, data: bold } }
}

/**
 * Traces the union of the filled pixels into closed rectilinear contours.
 *
 * One square per pixel would leave coincident edges between neighbours, which rasterizers show
 * as hairline seams. Here only the edges between a filled and an empty pixel are kept, so no
 * edge is ever shared. Contours run clockwise around ink (y down), holes come out reversed.
 * Pixels that only touch by a corner stay in separate turns of the walk (always turn right),
 * so contours may share a vertex but never cross.
 *
 * Returns arrays of [x, y] corners in bitmap coordinates.
 */
export function traceContours({ width, height, data }) {
  const filled = (x, y) => x >= 0 && y >= 0 && x < width && y < height && data[y * width + x] === 1
  // Directions: 0 = east, 1 = south, 2 = west, 3 = north.
  const DX = [1, 0, -1, 0]
  const DY = [0, 1, 0, -1]
  const stride = width + 1
  // edges[vertex * 4 + direction] = 1 when a boundary edge leaves that vertex in that direction.
  const edges = new Uint8Array(stride * (height + 1) * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!filled(x, y)) continue
      if (!filled(x, y - 1)) edges[(y * stride + x) * 4 + 0] = 1
      if (!filled(x + 1, y)) edges[(y * stride + x + 1) * 4 + 1] = 1
      if (!filled(x, y + 1)) edges[((y + 1) * stride + x + 1) * 4 + 2] = 1
      if (!filled(x - 1, y)) edges[((y + 1) * stride + x) * 4 + 3] = 1
    }
  }

  const contours = []
  for (let start = 0; start < edges.length; start++) {
    if (!edges[start]) continue
    const points = []
    let x = (start >> 2) % stride
    let y = Math.floor((start >> 2) / stride)
    let direction = start & 3
    let previousDirection = -1
    for (;;) {
      const edge = (y * stride + x) * 4 + direction
      if (!edges[edge]) throw new Error("Open contour while tracing a glyph.")
      edges[edge] = 0
      // Only corners are emitted; straight runs collapse into one segment.
      if (direction !== previousDirection) points.push([x, y])
      previousDirection = direction
      x += DX[direction]
      y += DY[direction]
      const vertex = (y * stride + x) * 4
      const right = (direction + 1) & 3
      const left = (direction + 3) & 3
      if (vertex + right === start || vertex + direction === start || vertex + left === start) {
        // Back on the first edge. If it continues straight, the first point is not a corner.
        if (vertex + direction === start) points.shift()
        break
      }
      direction = edges[vertex + right] ? right : edges[vertex + direction] ? direction : left
    }
    contours.push(points)
  }
  return contours
}

/** Contours of a glyph in font units, clockwise around ink (the TrueType convention). */
function glyphContours(glyph) {
  if (!glyph.bitmap) return []
  const unit = glyph.scale * PX
  return traceContours(glyph.bitmap).map((contour) =>
    // The top row of the bitmap sits `ascent` GUI pixels above the baseline.
    contour.map(([x, y]) => [Math.round(x * unit), Math.round(glyph.ascent * PX - y * unit)]),
  )
}

// ---------------------------------------------------------------------------------------------
// Font assembly
// ---------------------------------------------------------------------------------------------

function glyphName(codePoint) {
  const hex = codePoint.toString(16).toUpperCase()
  return codePoint > 0xffff ? `u${hex}` : `uni${hex.padStart(4, "0")}`
}

function buildFont(face, sourceGlyphs, version) {
  const outlines = []
  const toGlyph = (name, unicode, source) => {
    const glyph = face.bold ? embolden(source) : source
    const contours = glyphContours(glyph)
    outlines.push(contours)
    const outline = new opentype.Path()
    for (const contour of contours) {
      contour.forEach(([x, y], i) => (i === 0 ? outline.moveTo(x, y) : outline.lineTo(x, y)))
      outline.close()
    }
    return new opentype.Glyph({
      name,
      unicode,
      advanceWidth: glyph.advance * PX,
      // TrueType rasterizers shift the outline by (lsb - xMin), so the two must be equal.
      leftSideBearing: contours.length > 0 ? Math.min(...contours.flat().map(([x]) => x)) : 0,
      path: outline,
    })
  }

  const codePoints = [...sourceGlyphs.keys()].sort((a, b) => a - b)
  const notdef = toGlyph(".notdef", undefined, missingGlyph())
  const glyphs = [notdef, ...codePoints.map((cp) => toGlyph(glyphName(cp), cp, sourceGlyphs.get(cp)))]

  const font = new opentype.Font({
    familyName: face.family,
    styleName: face.style,
    postScriptName: `${face.family.replace(/\s/g, "")}-${face.style}`,
    version: `Version 1.0 (Minecraft ${version})`,
    description: "Generated from the Minecraft client jar by scripts/build-font.mjs",
    unitsPerEm: UNITS_PER_EM,
    ascender: ASCENDER,
    descender: DESCENDER,
    weightClass: face.weight,
    // Bit 7 = USE_TYPO_METRICS, bit 6 = REGULAR, bit 5 = BOLD.
    fsSelection: 0x80 | (face.bold ? 0x20 : 0x40),
    glyphs,
    tables: {
      os2: {
        // USE_TYPO_METRICS only exists from OS/2 version 4 (same layout as version 3).
        version: 4,
        achVendID: "    ",
        // hhea, typo and win metrics are identical so every browser computes the same line box,
        // whichever set it reads. Taller accented glyphs simply overflow it, like in the game.
        sTypoAscender: ASCENDER,
        sTypoDescender: DESCENDER,
        sTypoLineGap: 0,
        usWinAscent: ASCENDER,
        usWinDescent: -DESCENDER,
        sxHeight: 5 * PX,
        sCapHeight: 7 * PX,
        // The game strikes through 3.5 to 2.5 px above the baseline.
        yStrikeoutSize: PX,
        yStrikeoutPosition: Math.round(3.5 * PX),
      },
      // The game underlines from 1 to 2 px below the baseline.
      post: { underlinePosition: -1 * PX, underlineThickness: PX },
    },
  })

  // No designer / manufacturer / copyright records: this script claims nothing about the glyphs.
  for (const platform of Object.values(font.names)) {
    for (const key of ["designer", "designerURL", "manufacturer", "manufacturerURL", "license", "licenseURL", "copyright", "trademark"]) {
      delete platform[key]
    }
    platform.uniqueID = { en: `${face.family} ${face.style} (Minecraft ${version})` }
  }
  return { font, outlines }
}

// ---------------------------------------------------------------------------------------------
// TrueType output
// ---------------------------------------------------------------------------------------------

/** Appends one coordinate delta in the glyf encoding and returns the flag bits that describe it. */
function pushDelta(bytes, delta, shortBit, sameOrPositiveBit) {
  if (delta === 0) return sameOrPositiveBit // "same as the previous point": no data at all
  if (Math.abs(delta) <= 255) {
    bytes.push(Math.abs(delta))
    return shortBit | (delta > 0 ? sameOrPositiveBit : 0)
  }
  bytes.push((delta >> 8) & 0xff, delta & 0xff)
  return 0
}

/** Encodes a TrueType simple glyph whose points are all on-curve. No hinting instructions. */
function encodeGlyph(contours) {
  if (contours.length === 0) return Buffer.alloc(0) // a blank glyph is a zero-length loca entry
  const points = contours.flat()
  const flags = []
  const xBytes = []
  const yBytes = []
  let previous = [0, 0]
  for (const point of points) {
    flags.push(
      0x01 | // ON_CURVE_POINT
        pushDelta(xBytes, point[0] - previous[0], 0x02, 0x10) |
        pushDelta(yBytes, point[1] - previous[1], 0x04, 0x20),
    )
    previous = point
  }
  const xs = points.map(([x]) => x)
  const ys = points.map(([, y]) => y)
  // numberOfContours, bounding box, endPtsOfContours[], instructionLength (left at 0).
  const header = Buffer.alloc(10 + contours.length * 2 + 2)
  header.writeInt16BE(contours.length, 0)
  header.writeInt16BE(Math.min(...xs), 2)
  header.writeInt16BE(Math.min(...ys), 4)
  header.writeInt16BE(Math.max(...xs), 6)
  header.writeInt16BE(Math.max(...ys), 8)
  let endPoint = -1
  contours.forEach((contour, i) => header.writeUInt16BE((endPoint += contour.length), 10 + i * 2))
  const glyph = Buffer.concat([header, Buffer.from(flags), Buffer.from(xBytes), Buffer.from(yBytes)])
  return Buffer.concat([glyph, Buffer.alloc((4 - (glyph.length % 4)) % 4)])
}

function tableChecksum(table) {
  let sum = 0
  for (let i = 0; i < table.length; i += 4) sum = (sum + table.readUInt32BE(i)) >>> 0
  return sum
}

/**
 * opentype.js can only write CFF (PostScript) outlines. Chromium on Windows smears those to the
 * right (measured: a ~35% grey column after every stem), whereas TrueType outlines are filled on
 * the pixel grid and only get the platform's own symmetric LCD filter. So the CFF table is
 * swapped for glyf/loca here; every other table (cmap, hmtx, name, OS/2, ...) is kept as
 * opentype.js encoded it.
 *
 * The head timestamps are replaced too (opentype.js stamps "now") so that the same jar always
 * gives byte-identical files and an unchanged generated stylesheet.
 */
function toTrueType(otf, outlines, unixSeconds) {
  const pad = (table) => Buffer.concat([table, Buffer.alloc((4 - (table.length % 4)) % 4)])
  const tables = new Map()
  for (let i = 0; i < otf.readUInt16BE(4); i++) {
    const record = 12 + i * 16
    const offset = otf.readUInt32BE(record + 8)
    const table = Buffer.from(otf.subarray(offset, offset + otf.readUInt32BE(record + 12)))
    tables.set(otf.toString("latin1", record, record + 4), table)
  }
  tables.delete("CFF ")

  const glyphs = outlines.map(encodeGlyph)
  const loca = Buffer.alloc((glyphs.length + 1) * 4)
  let glyphOffset = 0
  glyphs.forEach((glyph, i) => loca.writeUInt32BE((glyphOffset += glyph.length), (i + 1) * 4))
  tables.set("glyf", Buffer.concat(glyphs))
  tables.set("loca", loca)

  // maxp 1.0. Every field after the contour counts stays 0: no composites, no instructions.
  const maxp = Buffer.alloc(32)
  maxp.writeUInt32BE(0x00010000, 0)
  maxp.writeUInt16BE(outlines.length, 4)
  maxp.writeUInt16BE(Math.max(...outlines.map((contours) => contours.flat().length)), 6) // maxPoints
  maxp.writeUInt16BE(Math.max(...outlines.map((contours) => contours.length)), 8) // maxContours
  maxp.writeUInt16BE(1, 14) // maxZones
  tables.set("maxp", maxp)

  const head = tables.get("head")
  const macSeconds = BigInt(unixSeconds) + 2082844800n
  head.writeUInt32BE(0, 8) // checkSumAdjustment, filled in once the whole file is laid out
  head.writeBigUInt64BE(macSeconds, 20) // created
  head.writeBigUInt64BE(macSeconds, 28) // modified
  head.writeInt16BE(1, 50) // indexToLocFormat: 32-bit loca offsets

  const tags = [...tables.keys()].sort()
  const directory = Buffer.alloc(12 + tags.length * 16)
  const entrySelector = Math.floor(Math.log2(tags.length))
  directory.writeUInt32BE(0x00010000, 0) // sfnt version: TrueType outlines
  directory.writeUInt16BE(tags.length, 4)
  directory.writeUInt16BE(2 ** entrySelector * 16, 6)
  directory.writeUInt16BE(entrySelector, 8)
  directory.writeUInt16BE((tags.length - 2 ** entrySelector) * 16, 10)
  const chunks = [directory]
  let offset = directory.length
  let headOffset = 0
  tags.forEach((tag, i) => {
    const table = pad(tables.get(tag))
    const record = 12 + i * 16
    directory.write(tag, record, "latin1")
    directory.writeUInt32BE(tableChecksum(table), record + 4)
    directory.writeUInt32BE(offset, record + 8)
    directory.writeUInt32BE(tables.get(tag).length, record + 12)
    if (tag === "head") headOffset = offset
    chunks.push(table)
    offset += table.length
  })
  const ttf = Buffer.concat(chunks)
  ttf.writeUInt32BE((0xb1b0afba - tableChecksum(ttf)) >>> 0, headOffset + 8)
  return ttf
}

// ---------------------------------------------------------------------------------------------
// CSS
// ---------------------------------------------------------------------------------------------

function unicodeRange(codePoints) {
  const sorted = [...codePoints].sort((a, b) => a - b)
  const ranges = []
  for (let i = 0; i < sorted.length; i++) {
    const start = sorted[i]
    while (i + 1 < sorted.length && sorted[i + 1] === sorted[i] + 1) i++
    const hex = (n) => n.toString(16).toUpperCase()
    ranges.push(start === sorted[i] ? `U+${hex(start)}` : `U+${hex(start)}-${hex(sorted[i])}`)
  }
  return ranges
}

function fontFaceRule(face, woff2, codePoints) {
  return [
    "@font-face {",
    `  font-family: "${face.family}";`,
    "  font-style: normal;",
    `  font-weight: ${face.weight};`,
    // A pixel UI must never flash a fallback font; the data URI makes the block period ~0 anyway.
    "  font-display: block;",
    `  src: url("data:font/woff2;base64,${Buffer.from(woff2).toString("base64")}") format("woff2");`,
    `  unicode-range: ${unicodeRange(codePoints).join(", ")};`,
    "}",
  ].join("\n")
}

function cssHeader(version) {
  return `/*
 * GENERATED by scripts/build-font.mjs from Minecraft ${version} — do not edit by hand.
 * Run \`pnpm mc:font\` to regenerate from your own copy of the game.
 *
 * The Minecraft font is © Mojang AB. Its glyphs are converted from your licensed copy for your own
 * fan project; read https://www.minecraft.net/usage-guidelines before publishing a site with them.
 * NOT AN OFFICIAL MINECRAFT PRODUCT. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.
 *
 * Metrics: 1em = 8 GUI pixels, line height 9 GUI pixels (1.125). Use font sizes that are a
 * multiple of 8px (16px = GUI scale 2) so that every glyph pixel lands on whole CSS pixels.
 */`
}

// ---------------------------------------------------------------------------------------------

async function main() {
  const { jarPath, id: version, zip } = findMinecraftJar()
  console.log(`Minecraft ${version} — ${jarPath}`)

  let timestamp = Date.UTC(2020, 0, 1) / 1000
  try {
    const buildTime = Date.parse(JSON.parse(readEntry(zip, "version.json").toString("utf8")).build_time)
    if (Number.isFinite(buildTime)) timestamp = Math.floor(buildTime / 1000)
  } catch {
    // Old jars have no version.json; the fixed fallback date keeps the output reproducible.
  }

  fs.mkdirSync(FONT_DIR, { recursive: true })
  const glyphCache = new Map()
  const rules = []
  for (const face of FACES) {
    if (!glyphCache.has(face.font)) {
      const glyphs = loadGlyphs(zip, face.font)
      for (const [codePoint, advance] of Object.entries(WEB_SPACE_ALIASES)) {
        if (!glyphs.has(Number(codePoint))) glyphs.set(Number(codePoint), { advance, ascent: 0, scale: 1 })
      }
      glyphCache.set(face.font, glyphs)
    }
    const glyphs = glyphCache.get(face.font)

    const { font, outlines } = buildFont(face, glyphs, version)
    const ttf = toTrueType(Buffer.from(font.toArrayBuffer()), outlines, timestamp)
    const woff2 = await wawoff2.compress(ttf)
    fs.writeFileSync(path.join(FONT_DIR, `${face.file}.woff2`), woff2)
    rules.push(fontFaceRule(face, woff2, glyphs.keys()))

    const blank = [...glyphs.values()].filter((glyph) => !glyph.bitmap).length
    console.log(
      `  ${`${face.file}.woff2`.padEnd(24)} "${face.family}" ${face.weight}  ` +
        `${glyphs.size} glyphs (${blank} blank) + .notdef  ` +
        `${(ttf.length / 1024).toFixed(1)} kB ttf -> ${(woff2.length / 1024).toFixed(1)} kB woff2`,
    )
  }

  const css = `${cssHeader(version)}\n${rules.join("\n\n")}\n`
  fs.mkdirSync(path.dirname(CSS_FILE), { recursive: true })
  fs.writeFileSync(CSS_FILE, css)
  console.log(`  ${path.relative(ROOT, CSS_FILE)}  ${(css.length / 1024).toFixed(1)} kB`)
}

// Only build when run directly, so that the tracer can be imported on its own.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
}
