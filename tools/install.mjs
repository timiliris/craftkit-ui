// CraftKit UI installer: puts the theme into another project.
//
//   node tools/install.mjs <project> [--tailwind | --css] [options]
//
// Mode (picked from the project's package.json when not given):
//   --tailwind   the project already uses Tailwind CSS v4 (shadcn/ui, Vite, Next...). Copies the theme
//                files into the project (default folder: src/styles/craftkit-ui, or --dir=<folder>) and
//                prints the @import lines. --patch also adds them to the CSS file that imports
//                "tailwindcss" (when there is exactly one).
//   --css        any other site (plain HTML, PHP, a CMS...). Compiles ONE stylesheet holding only the
//                classes the project uses (default <project>/craftkit-ui.css, or --out=<file>) with the
//                Tailwind bundled in CraftKit UI. Re-run after adding classes, or add --watch.
import fs from "node:fs"
import path from "node:path"
import { spawnSync } from "node:child_process"

const ROOT = path.join(import.meta.dirname, "..")
const args = process.argv.slice(2)
const opt = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=")
const flag = (name) => args.includes(`--${name}`)
const project = args.find((a) => !a.startsWith("--"))

if (!project || !fs.existsSync(project)) {
  console.error("Usage: node tools/install.mjs <project> [--tailwind [--dir=src/styles/craftkit-ui] [--patch] | --css [--out=craftkit-ui.css] [--watch]]")
  process.exit(1)
}
const PROJECT = path.resolve(project)

function usesTailwind4() {
  const pkg = path.join(PROJECT, "package.json")
  if (!fs.existsSync(pkg)) return false
  const p = JSON.parse(fs.readFileSync(pkg, "utf8"))
  const v = { ...p.dependencies, ...p.devDependencies }.tailwindcss
  return Boolean(v && /(^|[^\d])4\./.test(v))
}

function findTailwindEntries(dir, depth = 0, out = []) {
  if (depth > 5) return out
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name.startsWith(".") || e.name === "dist" || e.name === "build") continue
    const full = path.join(dir, e.name)
    if (e.isDirectory()) findTailwindEntries(full, depth + 1, out)
    else if (e.name.endsWith(".css") && /@import\s+["']tailwindcss["']/.test(fs.readFileSync(full, "utf8"))) out.push(full)
  }
  return out
}

const mode = flag("tailwind") ? "tailwind" : flag("css") ? "css" : usesTailwind4() ? "tailwind" : "css"

if (mode === "tailwind") {
  const dest = path.resolve(PROJECT, opt("dir") || "src/styles/craftkit-ui")
  fs.mkdirSync(dest, { recursive: true })
  for (const f of ["minecraft.css", "minecraft-textures.css", "minecraft-derived.css", "minecraft-font.css"]) fs.copyFileSync(path.join(ROOT, "theme", f), path.join(dest, f))
  fs.copyFileSync(path.join(ROOT, "src", "animations.css"), path.join(dest, "animations.css"))
  console.log(`Copied the theme to ${path.relative(PROJECT, dest) || "."}/ (5 files).`)

  const entries = findTailwindEntries(PROJECT)
  const lines = (entry) => {
    let rel = path.relative(path.dirname(entry), dest).split(path.sep).join("/")
    if (!rel.startsWith(".")) rel = `./${rel}`
    return `@import "${rel}/minecraft.css";\n@import "${rel}/animations.css";`
  }
  if (entries.length === 1 && flag("patch")) {
    const entry = entries[0], css = fs.readFileSync(entry, "utf8")
    if (css.includes("minecraft.css")) console.log(`${path.relative(PROJECT, entry)} already imports the theme.`)
    else {
      fs.writeFileSync(entry, css.replace(/(@import\s+["']tailwindcss["'][^;]*;)/, `$1\n${lines(entry)}`))
      console.log(`Added the theme imports to ${path.relative(PROJECT, entry)}.`)
    }
  } else {
    const entry = entries[0] || path.join(PROJECT, "src", "app.css")
    console.log(`\nAdd right after @import "tailwindcss"; in ${entries.length ? entries.map((e) => path.relative(PROJECT, e)).join(" or ") : "your main CSS file"}:\n\n${lines(entry)}\n`)
  }
  console.log("Classic mode is the default; add class=\"dark\" on <html> for Modern. If the file has shadcn's default :root { --background: ... } and .dark { ... } color blocks, delete them: written outside a layer, they override the theme's tokens.")
} else {
  const out = path.resolve(PROJECT, opt("out") || "craftkit-ui.css")
  const run = spawnSync(process.execPath, [path.join(ROOT, "build.mjs"), PROJECT, `--out=${out}`, ...(flag("watch") ? ["--watch"] : [])], { stdio: "inherit" })
  if (run.status) process.exit(run.status)
  let href = path.relative(PROJECT, out).split(path.sep).join("/")
  console.log(`\nLink it from every page (path relative to the page):\n\n<link rel="stylesheet" href="${href}">\n\nIt holds only the classes found in ${PROJECT}. Run this command again after adding classes (or keep --watch running).`)
}
