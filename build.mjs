// CraftKit UI build: compiles the Minecraft theme (theme/minecraft.css, Tailwind CSS v4) into one plain
// stylesheet, dist/craftkit-ui.css, that any HTML page can link without Tailwind.
//
//   node build.mjs            build once
//   node build.mjs --watch    rebuild when a page or the theme changes
//
// Classes are collected from every page, script or template file (.html .js .jsx .tsx .vue .svelte
// .astro .php ...) under the folders listed in
// SCAN_DIRS (default: demo/). Add your own project folders there, or pass them on the command line:
//   node build.mjs ../my-site/src
//   node build.mjs ../my-site --out=../my-site/css/craftkit-ui.css   (write the stylesheet elsewhere)
import fs from "node:fs"
import path from "node:path"
import { compile } from "tailwindcss"
import { indexSprites } from "./tools/sprite-index.mjs"
import { writeSkillRefs } from "./tools/skill-refs.mjs"

const ROOT = import.meta.dirname
const ENTRY = path.join(ROOT, "src", "craftkit-ui.css")
const args = process.argv.slice(2)
const outArg = args.find((a) => a.startsWith("--out="))
const OUT = outArg ? path.resolve(outArg.slice(6)) : path.join(ROOT, "dist", "craftkit-ui.css")
const watch = args.includes("--watch")
// With --out the stylesheet is for another project: the demo's classes are left out.
const SCAN_DIRS = [...(outArg ? [] : [path.join(ROOT, "demo")]), ...args.filter((a) => !a.startsWith("--")).map((a) => path.resolve(a))]
const SCAN_EXT = new Set([".html", ".htm", ".js", ".mjs", ".cjs", ".jsx", ".ts", ".tsx", ".vue", ".svelte", ".astro", ".php", ".erb", ".twig", ".hbs", ".njk", ".liquid", ".md", ".mdx"])

function tailwindFile(id) {
  // "tailwindcss" -> index.css, "tailwindcss/theme.css" -> theme.css
  const pkg = path.join(ROOT, "node_modules", "tailwindcss")
  const rest = id === "tailwindcss" ? "index.css" : id.slice("tailwindcss/".length)
  return path.join(pkg, rest)
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else if (SCAN_EXT.has(path.extname(entry.name))) out.push(full)
  }
  return out
}

function candidates() {
  const set = new Set()
  for (const file of SCAN_DIRS.flatMap((d) => walk(d))) {
    const text = fs.readFileSync(file, "utf8")
    for (const token of text.split(/[\s"'`<>{}]+/)) if (token) set.add(token)
  }
  return [...set]
}

async function build() {
  const started = Date.now()
  indexSprites()
  writeSkillRefs()
  const compiler = await compile(fs.readFileSync(ENTRY, "utf8"), {
    base: path.dirname(ENTRY),
    async loadStylesheet(id, base) {
      const file = id.startsWith("tailwindcss") ? tailwindFile(id) : path.resolve(base, id)
      return { path: file, base: path.dirname(file), content: fs.readFileSync(file, "utf8") }
    },
  })
  const css = compiler.build(candidates())
  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  fs.writeFileSync(OUT, css)
  console.log(`${path.relative(process.cwd(), OUT)}  ${(css.length / 1024).toFixed(0)} kB  (${Date.now() - started} ms)`)
}

await build()

if (watch) {
  let timer
  const rebuild = () => {
    clearTimeout(timer)
    timer = setTimeout(() => build().catch((e) => console.error(e.message)), 100)
  }
  // Pages: only files that can hold classes (the written stylesheet may sit inside a scanned folder).
  for (const dir of SCAN_DIRS) {
    if (fs.existsSync(dir)) fs.watch(dir, { recursive: true }, (_, f) => { if (f && SCAN_EXT.has(path.extname(f)) && !f.endsWith("sprites.json")) rebuild() })
  }
  for (const dir of [path.join(ROOT, "theme"), path.join(ROOT, "src")]) {
    if (fs.existsSync(dir)) fs.watch(dir, { recursive: true }, rebuild)
  }
  console.log("watching for changes...")
}
