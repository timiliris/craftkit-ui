// Writes the reference files of the Claude Code skill (plugin/skills/craftkit-ui/references/) from the
// sources, so the skill never drifts from the theme: the REFERENCE comment of theme/minecraft.css,
// the header comment of src/animations.css and demo/sprites.json. Called by build.mjs; a file is only
// rewritten when its content changes (keeps `--watch` quiet).
import fs from "node:fs"
import path from "node:path"

const ROOT = path.join(import.meta.dirname, "..")
const OUT = path.join(ROOT, "plugin", "skills", "craftkit-ui", "references")

function firstComment(text, from = 0) {
  const start = text.indexOf("/*", from), end = text.indexOf("*/", start)
  return { body: text.slice(start + 2, end).split("\n").map((l) => l.replace(/^ ?\* ?/, "")).join("\n").trim(), end: end + 2 }
}

function write(name, content) {
  const file = path.join(OUT, name)
  if (fs.existsSync(file) && fs.readFileSync(file, "utf8") === content) return
  fs.mkdirSync(OUT, { recursive: true })
  fs.writeFileSync(file, content)
}

export function writeSkillRefs() {
  const theme = fs.readFileSync(path.join(ROOT, "theme", "minecraft.css"), "utf8")
  const origin = firstComment(theme) // the "vendored" note
  const ref = firstComment(theme, origin.end) // the theme's own reference
  write("theme.md", `# Theme reference (theme/minecraft.css)\n\nGenerated from the comment at the top of \`theme/minecraft.css\`. Do not edit: run \`node build.mjs\`.\n\n\`\`\`text\n${ref.body}\n\`\`\`\n`)

  const anim = firstComment(fs.readFileSync(path.join(ROOT, "src", "animations.css"), "utf8"))
  write("animations.md", `# Animation reference (src/animations.css)\n\nGenerated from the header of \`src/animations.css\`. Do not edit: run \`node build.mjs\`.\n\n\`\`\`text\n${anim.body}\n\`\`\`\n`)

  const spr = JSON.parse(fs.readFileSync(path.join(ROOT, "demo", "sprites.json"), "utf8"))
  const groups = {}
  for (const [name, [w, h, derived]] of Object.entries(spr).sort()) {
    const g = name.split("-")[0]
    ;(groups[g] ||= []).push(`${name} ${w}x${h}${derived ? " (derived)" : ""}`)
  }
  let md = `# Sprites (${Object.keys(spr).length})\n\nEvery sprite is a CSS variable \`--mc-<name>\` holding a data: PNG. Size is in texture px: pass it as\n\`--mc-sprite-w\` / \`--mc-sprite-h\` to \`mc-sprite\`. \`-strip\` sprites are animation frame strips (see animations.md).\nGenerated from \`demo/sprites.json\`. Do not edit: run \`node build.mjs\`.\n`
  for (const [g, list] of Object.entries(groups)) md += `\n## ${g} (${list.length})\n\n${list.join("\n")}\n`
  write("sprites.md", md)
}
