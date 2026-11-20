// Writes demo/sprites.json: every sprite variable of the theme (--mc-*) with its size in texture
// pixels, read from the PNG header of its data: URI. The demo uses it to size sprites and to list
// the whole library. Run by build.mjs; also usable alone: node tools/sprite-index.mjs
import fs from "node:fs"
import path from "node:path"

const ROOT = path.resolve(import.meta.dirname, "..")
const FILES = ["minecraft-textures.css", "minecraft-derived.css"]
const OUT = path.join(ROOT, "demo", "sprites.json")

export function indexSprites() {
  const sprites = {}
  for (const name of FILES) {
    const css = fs.readFileSync(path.join(ROOT, "theme", name), "utf8")
    const re = /--mc-([a-z0-9-]+):\s*url\("data:image\/png;base64,([A-Za-z0-9+/=]{0,64})/g
    for (const m of css.matchAll(re)) {
      const head = Buffer.from(m[2].slice(0, 32), "base64") // PNG signature + IHDR
      const w = head.readUInt32BE(16), h = head.readUInt32BE(20)
      sprites[m[1]] = [w, h, name === "minecraft-derived.css" ? 1 : 0]
    }
  }
  const json = JSON.stringify(sprites)
  // Only write on change: build.mjs --watch watches demo/ and would loop otherwise.
  if (!fs.existsSync(OUT) || fs.readFileSync(OUT, "utf8") !== json) fs.writeFileSync(OUT, json)
  return Object.keys(sprites).length
}

if (process.argv[1] && path.resolve(process.argv[1]) === import.meta.filename) {
  console.log(`demo/sprites.json  ${indexSprites()} sprites`)
}
