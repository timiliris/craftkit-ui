// Locates a Minecraft: Java Edition client jar on this machine.
// The textures are read from YOUR licensed copy of the game — nothing is downloaded.
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import AdmZip from "adm-zip"

const TEXTURES = "assets/minecraft/textures/"

// The newest sprites the theme draws with: both arrived in 1.21.6 (dialogs, "now playing" toast).
// Older versions are refused here, before any script deletes or writes a file. Otherwise 1.20.2 to
// 1.21.1 pass the extraction and only fail in build-derived-sprites.mjs (no tooltip sprites), and
// 1.21.2 to 1.21.5 build a theme with holes (sonner.tsx and mc-toast-now-playing use these two).
export const MIN_VERSION = "1.21.6"
const REQUIRED = [`${TEXTURES}gui/sprites/dialog/warning_button.png`, `${TEXTURES}gui/sprites/toast/now_playing.png`]

function launcherRoots() {
  const home = os.homedir()
  const appData =
    process.env.APPDATA ??
    (process.platform === "darwin"
      ? path.join(home, "Library", "Application Support")
      : path.join(home, ".local", "share"))
  const dotMinecraft =
    process.platform === "win32"
      ? path.join(appData, ".minecraft")
      : process.platform === "darwin"
        ? path.join(appData, "minecraft")
        : path.join(home, ".minecraft")

  return [
    // [directory, depth to search for *.jar]
    [path.join(dotMinecraft, "versions"), 2],
    [path.join(appData, "ModrinthApp", "meta", "versions"), 2],
    [path.join(appData, "com.modrinth.theseus", "meta", "versions"), 2],
    [path.join(home, "curseforge", "minecraft", "Install", "versions"), 2],
    [path.join(appData, "PrismLauncher", "libraries", "com", "mojang", "minecraft"), 2],
    [path.join(appData, "MultiMC", "libraries", "com", "mojang", "minecraft"), 2],
    [path.join(home, ".local", "share", "PrismLauncher", "libraries", "com", "mojang", "minecraft"), 2],
  ]
}

function walkJars(dir, depth, out = []) {
  if (depth < 0 || !fs.existsSync(dir)) return out
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walkJars(full, depth - 1, out)
    else if (entry.name.endsWith(".jar")) out.push(full)
  }
  return out
}

/**
 * Reads version info out of a jar. Returns null when the file is not a Minecraft client jar at all;
 * otherwise `missing` lists the required sprites this version does not have (empty = usable).
 */
function readJar(jarPath) {
  try {
    const zip = new AdmZip(jarPath)
    // Server jars and launcher libraries carry no vanilla textures.
    if (!zip.getEntries().some((entry) => entry.entryName.startsWith(TEXTURES))) return null
    let id = path.basename(jarPath, ".jar")
    let worldVersion = 0
    const versionEntry = zip.getEntry("version.json")
    if (versionEntry) {
      const info = JSON.parse(versionEntry.getData().toString("utf8"))
      id = info.id ?? info.name ?? id
      worldVersion = info.world_version ?? 0
    }
    return { jarPath, id, worldVersion, zip, missing: REQUIRED.filter((entry) => !zip.getEntry(entry)) }
  } catch {
    return null
  }
}

const usable = ({ missing, ...info }) => info

/** Reads version info out of a client jar; returns null if it is not a usable (MIN_VERSION or newer) client jar. */
export function inspectJar(jarPath) {
  const info = readJar(jarPath)
  return info && info.missing.length === 0 ? usable(info) : null
}

const REQUIREMENT = `${MIN_VERSION} or newer is required: the jar must contain ${REQUIRED.join(" and ")}`

/**
 * Resolution order: --jar <path> CLI flag, MC_JAR env var, then auto-detection
 * across known launchers (newest game version wins).
 */
export function findMinecraftJar(argv = process.argv.slice(2)) {
  const flagIndex = argv.indexOf("--jar")
  const explicit = flagIndex >= 0 ? argv[flagIndex + 1] : process.env.MC_JAR
  if (explicit) {
    const info = readJar(explicit)
    if (!info) {
      throw new Error(
        `"${explicit}" is not a Minecraft Java client jar: the file must exist and hold the game's textures (${MIN_VERSION} or newer is required).`,
      )
    }
    if (info.missing.length > 0) {
      throw new Error(`"${explicit}" is Minecraft ${info.id}, which is too old for this theme (${REQUIREMENT}).`)
    }
    return usable(info)
  }

  const found = launcherRoots()
    .flatMap(([dir, depth]) => walkJars(dir, depth))
    .map(readJar)
    .filter(Boolean)
    .sort((a, b) => b.worldVersion - a.worldVersion)
  const candidates = found.filter((info) => info.missing.length === 0)

  if (candidates.length === 0) {
    const help = [
      `Install and launch the game once (${MIN_VERSION} or newer), or pass the jar explicitly:`,
      "  node scripts/extract-textures.mjs --jar /path/to/minecraft/versions/1.21.10/1.21.10.jar",
    ]
    if (found.length > 0) {
      const versions = [...new Set(found.map((info) => info.id))].join(", ")
      throw new Error(
        [
          `No Minecraft: Java Edition client jar found for this theme: only older versions are installed (${versions}).`,
          `${REQUIREMENT}.`,
          ...help,
        ].join("\n"),
      )
    }
    throw new Error(["No Minecraft: Java Edition client jar found.", ...help].join("\n"))
  }
  return usable(candidates[0])
}
