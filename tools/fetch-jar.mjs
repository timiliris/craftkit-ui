// CI helper: downloads the official Minecraft: Java Edition client jar from Mojang's own servers
// (the same file the launcher downloads), so the GitHub Pages demo can be built without committing
// any Mojang asset. Locally, use your installed game instead: `npm run mc:setup` finds it.
//
//   node tools/fetch-jar.mjs              latest release
//   MC_VERSION=26.2 node tools/fetch-jar.mjs
//
// Writes theme/.cache/jar/<version>.jar (git-ignored) and prints its path. Then:
//   MC_JAR=<that path> npm run mc:setup
import crypto from "node:crypto"
import fs from "node:fs"
import path from "node:path"

const MANIFEST = "https://piston-meta.mojang.com/mc/game/version_manifest_v2.json"
const OUT_DIR = path.join(import.meta.dirname, "..", "theme", ".cache", "jar")

async function get(url, as = "json") {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`)
  return as === "json" ? res.json() : Buffer.from(await res.arrayBuffer())
}

const manifest = await get(MANIFEST)
const id = process.env.MC_VERSION || manifest.latest.release
const entry = manifest.versions.find((v) => v.id === id)
if (!entry) throw new Error(`Minecraft version "${id}" is not in Mojang's version manifest.`)
const { downloads } = await get(entry.url)
const jar = await get(downloads.client.url, "buffer")
const sha1 = crypto.createHash("sha1").update(jar).digest("hex")
if (sha1 !== downloads.client.sha1) throw new Error(`Checksum mismatch for ${id}: ${sha1}`)

fs.mkdirSync(OUT_DIR, { recursive: true })
const out = path.join(OUT_DIR, `${id}.jar`)
fs.writeFileSync(out, jar)
console.log(out)
