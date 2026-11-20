// Captures the README's screenshots (PNG) and animation clips (GIF) from the running demo.
// Run by the Pages workflow after the build: the images are published with the demo under /media/
// and never committed, since they show Minecraft textures.
//
//   node serve.mjs &                      the demo on http://localhost:5173
//   node tools/capture-media.mjs [outDir] [baseUrl]      default: _site/media  http://localhost:5173/
//
// Needs Playwright (with Chromium) and ffmpeg on the PATH. They are not dependencies of the theme:
//   npm i --no-save playwright && npx playwright install chromium
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { execFileSync } from "node:child_process"
import { chromium } from "playwright"

const OUT = path.resolve(process.argv[2] || "_site/media")
const BASE = process.argv[3] || "http://localhost:5173/"
fs.mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch()

async function open({ width, height, dpr = 1, lang = "en", modern = false }) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: dpr })
  await page.addInitScript((l) => { try { localStorage.setItem("craftkit-lang", l) } catch {} }, lang)
  await page.goto(BASE)
  await page.waitForSelector("#sprite-grid > *")
  if (modern) await page.evaluate(() => document.querySelector("[data-action=mode]").click())
  await page.waitForTimeout(400)
  return page
}

const shot = async (page, name, opts = {}) => { await page.screenshot({ path: path.join(OUT, name), ...opts }); console.log(name) }

// The first panel of a section whose title starts with `title`.
const panel = (page, section, title) =>
  page.locator(`#${section} .mc-panel-dark`).filter({ has: page.locator("p.font-medium", { hasText: title }) }).first()

async function sectionShot(page, id, name, maxHeight = 900) {
  const box = await page.locator(`#${id}`).boundingBox()
  await shot(page, name, { fullPage: true, clip: { x: box.x - 16, y: box.y - 16, width: box.width + 32, height: Math.min(box.height + 32, maxHeight) } })
}

// Records `seconds` of an element as a GIF (screenshots in a loop, timed, then ffmpeg).
// `steps` = [[delay ms, button text], ...]: buttons of the panel clicked while recording.
async function clip(page, locator, name, { seconds = 3, steps = [] } = {}) {
  await locator.scrollIntoViewIfNeeded()
  await page.mouse.move(0, 0)
  await page.waitForTimeout(200)
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "clip-"))
  const press = async (text) => {
    await locator.locator("button", { hasText: text }).first().evaluate((b) => { b.click(); b.blur() })
  }
  const actions = (async () => { for (const [delay, text] of steps) { await page.waitForTimeout(delay); await press(text) } })()
  const start = Date.now(); let n = 0
  while (Date.now() - start < seconds * 1000) await locator.screenshot({ path: path.join(dir, `${String(n++).padStart(4, "0")}.png`) })
  await actions
  const fps = Math.max(4, Math.round(n / ((Date.now() - start) / 1000)))
  execFileSync("ffmpeg", ["-v", "error", "-y", "-framerate", String(fps), "-i", path.join(dir, "%04d.png"),
    "-vf", "split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=none", "-loop", "0", path.join(OUT, name)])
  fs.rmSync(dir, { recursive: true, force: true })
  console.log(`${name}  ${n} frames @ ${fps} fps`)
}

// ---------------------------------------------------------------- desktop
{
  const page = await open({ width: 1280, height: 800 })
  await shot(page, "desktop-classic.png")
  for (const [id, name] of [["boutons", "section-buttons.png"], ["inventaire", "section-inventory.png"], ["hud", "section-hud.png"], ["dashboard", "section-dashboard.png"], ["conteneurs", "section-panels.png"]]) {
    await sectionShot(page, id, name)
  }

  for (const [title, name, seconds, steps] of [
    ["Toasts", "anim-toasts.gif", 4, [[100, "Slide in"], [2200, "Slide out"]]],
    ["Health", "anim-health.gif", 3, [[300, "Take damage"], [1300, "Take damage"]]],
    ["Items", "anim-items.gif", 3],
    ["Progress", "anim-progress.gif", 4, [[100, "Refill"]]],
    ["Title, chat", "anim-title.gif", 6, [[100, "/title"], [3000, "Chat"], [1200, "Item name"]]],
    ["Loading", "anim-loading.gif", 3, [[300, "Level up"]]],
    ["Animated textures", "anim-textures.gif", 3],
    ["Animated sprites", "anim-sprites.gif", 3],
  ]) await clip(page, panel(page, "animations", title), name, { seconds, steps })
  await page.close()
}
{
  const page = await open({ width: 1280, height: 800, modern: true })
  await shot(page, "desktop-modern.png")
  await page.close()
}

// ---------------------------------------------------------------- phone
{
  const page = await open({ width: 390, height: 844, dpr: 2 })
  await shot(page, "mobile-title.png")
  await page.click("#menu-toggle"); await page.waitForTimeout(200)
  await shot(page, "mobile-menu.png")
  await page.click('#nav-mobile a[href="#inventaire"]'); await page.waitForTimeout(600)
  await shot(page, "mobile-inventory.png")
  await page.close()
}

await browser.close()
