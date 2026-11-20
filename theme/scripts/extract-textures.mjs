#!/usr/bin/env node
// Extracts GUI / block / item textures from your own Minecraft: Java Edition client jar.
//
//   node scripts/extract-textures.mjs               auto-detects the newest installed version
//   node scripts/extract-textures.mjs --jar <path>  uses a specific client jar
//   MC_JAR=<path> node scripts/extract-textures.mjs
//
// Outputs
//   .cache/textures/**                     raw PNGs (+ .mcmeta); git-ignored working files
//   minecraft-textures.css                 curated sprites as data-URI CSS variables (+ nine-slice metadata)
//   .cache/minecraft-textures.json         manifest: size, nine-slice border, animation frames, CSS variable
//   .cache/minecraft-sprites.ts            typed sprite table and URL helpers (mcSprite, mcTextureUrl ...)
//
// Only mcTextureUrl() depends on where the site is deployed: a site served under a sub-path calls
// setMcTextureBase() once (see the generated minecraft-sprites.ts). The inlined sprites never do.
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { findMinecraftJar } from "./lib/find-jar.mjs"
import { COPY, EXCLUDE, INLINE, INLINE_BLOCKS, INLINE_ITEMS } from "./texture-config.mjs"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const TEXTURES_PREFIX = "assets/minecraft/textures/"
const OUT_PUBLIC = path.join(ROOT, ".cache", "textures")
const OUT_CSS = path.join(ROOT, "minecraft-textures.css")
const OUT_MANIFEST = path.join(ROOT, ".cache", "minecraft-textures.json")

const matches = (list, rel) => list.some((re) => re.test(rel))

function pngSize(buffer) {
  // PNG signature (8 bytes) + IHDR length/type (8 bytes), then width and height as big-endian uint32.
  if (buffer.readUInt32BE(0) !== 0x89504e47) throw new Error("not a PNG")
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }
}

/** gui/sprites/widget/button_highlighted.png -> widget-button-highlighted */
function cssName(rel) {
  return rel
    .replace(/\.png$/, "")
    .replace(/^gui\/sprites\//, "")
    .replace(/[/_]/g, "-")
}

function normalizeBorder(border) {
  if (typeof border === "number") return { top: border, right: border, bottom: border, left: border }
  return { top: border.top ?? 0, right: border.right ?? 0, bottom: border.bottom ?? 0, left: border.left ?? 0 }
}

const { jarPath, id: version, zip } = findMinecraftJar()
console.log(`Minecraft ${version}\n  ${jarPath}`)

const entries = new Map()
for (const entry of zip.getEntries()) {
  if (entry.isDirectory || !entry.entryName.startsWith(TEXTURES_PREFIX)) continue
  entries.set(entry.entryName.slice(TEXTURES_PREFIX.length), entry)
}

fs.rmSync(OUT_PUBLIC, { recursive: true, force: true })

const inlineBlocks = new Set(INLINE_BLOCKS.map((name) => `block/${name}.png`))
const inlineItems = new Set(INLINE_ITEMS.map((name) => `item/${name}.png`))
const manifest = {}
const cssLines = []
let copied = 0
let inlinedBytes = 0

for (const rel of [...entries.keys()].sort()) {
  if (!rel.endsWith(".png") || matches(EXCLUDE, rel) || !matches(COPY, rel)) continue

  const data = entries.get(rel).getData()
  const target = path.join(OUT_PUBLIC, rel)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, data)
  copied++

  const { width, height } = pngSize(data)
  const info = { path: `/minecraft/textures/${rel}`, width, height }

  const metaEntry = entries.get(`${rel}.mcmeta`)
  if (metaEntry) {
    fs.writeFileSync(`${target}.mcmeta`, metaEntry.getData())
    try {
      const meta = JSON.parse(metaEntry.getData().toString("utf8"))
      const scaling = meta.gui?.scaling
      if (scaling?.type === "nine_slice") {
        info.scaling = "nine_slice"
        info.border = normalizeBorder(scaling.border)
        if (scaling.stretch_inner) info.stretchInner = true
      } else if (scaling?.type === "tile") {
        info.scaling = "tile"
      }
      if (meta.animation) {
        // Animated textures are vertical strips of square (or frame-sized) frames.
        const frameHeight = meta.animation.height ?? width
        info.animation = {
          frames: Math.round(height / frameHeight),
          frameHeight,
          frametime: meta.animation.frametime ?? 1,
          ...(meta.animation.interpolate ? { interpolate: true } : {}),
        }
      }
    } catch {
      console.warn(`  ! could not parse ${rel}.mcmeta`)
    }
  }

  if (matches(INLINE, rel) || inlineBlocks.has(rel) || inlineItems.has(rel)) {
    const name = cssName(rel)
    info.cssVar = `--mc-${name}`
    const uri = `url("data:image/png;base64,${data.toString("base64")}")`
    inlinedBytes += uri.length
    cssLines.push(`  --mc-${name}: ${uri};`)
    if (info.border) {
      const { top, right, bottom, left } = info.border
      // Unitless on purpose: usable directly as border-image-slice, or multiplied by --mc-scale for widths.
      cssLines.push(`  --mc-${name}-slice: ${top} ${right} ${bottom} ${left};`)
      cssLines.push(`  --mc-${name}-border: ${top};`)
    }
  }

  manifest[rel.replace(/\.png$/, "")] = info
}

for (const name of INLINE_BLOCKS) if (!entries.has(`block/${name}.png`)) console.warn(`  ! block not in this version: ${name}`)
for (const name of INLINE_ITEMS) if (!entries.has(`item/${name}.png`)) console.warn(`  ! item not in this version: ${name}`)

const header = `/*
 * GENERATED by scripts/extract-textures.mjs from Minecraft ${version} — do not edit by hand.
 * Run \`pnpm mc:extract\` to regenerate from your own copy of the game.
 *
 * Minecraft textures are © Mojang AB. They are extracted from your licensed copy for your own
 * fan project; read https://www.minecraft.net/usage-guidelines before publishing a site with them.
 * NOT AN OFFICIAL MINECRAFT PRODUCT. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.
 */
`
fs.mkdirSync(path.dirname(OUT_CSS), { recursive: true })
fs.writeFileSync(OUT_CSS, `${header}:root {\n${cssLines.join("\n")}\n}\n`)

fs.mkdirSync(path.dirname(OUT_MANIFEST), { recursive: true })
fs.writeFileSync(OUT_MANIFEST, `${JSON.stringify({ version, textures: manifest }, null, 2)}\n`)

// Typed lookup table for the inlined sprites (small enough to bundle, unlike the full manifest).
const spriteRows = []
const blockNames = []
const itemNames = []
for (const [key, info] of Object.entries(manifest)) {
  if (!info.cssVar) continue
  if (key.startsWith("block/")) blockNames.push(key.slice(6))
  else if (key.startsWith("item/")) itemNames.push(key.slice(5))
  else {
    const name = key.replace(/^gui\/sprites\//, "")
    const border = info.border ? `, b: [${info.border.top}, ${info.border.right}, ${info.border.bottom}, ${info.border.left}]` : ""
    spriteRows.push(`  "${name}": { w: ${info.width}, h: ${info.height}${border} },`)
  }
}
const OUT_TS = path.join(ROOT, ".cache", "minecraft-sprites.ts")
fs.writeFileSync(
  OUT_TS,
  `// GENERATED by scripts/extract-textures.mjs from Minecraft ${version} — do not edit by hand.

export const MC_VERSION = ${JSON.stringify(version)}

/** GUI sprites inlined as CSS variables. w/h are texture pixels; b is the nine-slice border [top, right, bottom, left]. */
export const MC_SPRITES = {
${spriteRows.join("\n")}
} as const satisfies Record<string, { w: number; h: number; b?: readonly [number, number, number, number] }>

export type McSpriteName = keyof typeof MC_SPRITES

/** Block textures inlined as --mc-block-<name>. Any other block is still served from /minecraft/textures/block/<name>.png */
export const MC_BLOCKS = ${JSON.stringify(blockNames)} as const
export type McBlockName = (typeof MC_BLOCKS)[number]

/** Item textures inlined as --mc-item-<name>. Any other item is still served from /minecraft/textures/item/<name>.png */
export const MC_ITEMS = ${JSON.stringify(itemNames)} as const
export type McItemName = (typeof MC_ITEMS)[number]

const toCssName = (name: string) => name.replace(/[/_]/g, "-")

/** mcSprite("widget/button_highlighted") -> "var(--mc-widget-button-highlighted)" */
export const mcSprite = (name: McSpriteName) => \`var(--mc-\${toCssName(name)})\`
/** mcBlock("oak_planks") -> "var(--mc-block-oak-planks)" */
export const mcBlock = (name: McBlockName) => \`var(--mc-block-\${toCssName(name)})\`
/** mcItem("diamond_sword") -> "var(--mc-item-diamond-sword)" */
export const mcItem = (name: McItemName) => \`var(--mc-item-\${toCssName(name)})\`

let textureBase = "/minecraft/textures/"

/**
 * Where public/minecraft/textures/ is served from. The default fits a site deployed at the root of
 * its domain; a site under a sub-path (Vite \`base\`, Next \`basePath\`, GitHub project pages) must
 * say so, or every mcTextureUrl() request goes to the domain root:
 *   setMcTextureBase(\`\${import.meta.env.BASE_URL}minecraft/textures/\`)   // Vite
 * Call it from a module that the entry file imports FIRST, before any component: some modules build
 * their texture URLs once, when they are imported.
 */
export const setMcTextureBase = (base: string) => {
  textureBase = base.endsWith("/") ? base : \`\${base}/\`
}

/** Public URL of any extracted texture, inlined or not: mcTextureUrl("block/dirt") -> "/minecraft/textures/block/dirt.png" */
export const mcTextureUrl = (path: string) => \`\${textureBase}\${path}.png\`
`,
)

console.log(`  ${copied} textures -> theme/.cache/textures/`)
console.log(`  typed sprite table -> theme/.cache/minecraft-sprites.ts`)
console.log(`  ${cssLines.filter((l) => l.includes("url(")).length} sprites inlined -> theme/minecraft-textures.css (${(inlinedBytes / 1024).toFixed(0)} KB)`)
console.log(`  manifest -> theme/.cache/minecraft-textures.json`)
