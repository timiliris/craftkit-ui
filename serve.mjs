// Zero-dependency static server for the demo: node serve.mjs [port]  ->  http://localhost:5173
import http from "node:http"
import fs from "node:fs"
import path from "node:path"

const ROOT = import.meta.dirname
const PORT = Number(process.argv[2] || process.env.PORT || 5173)
const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml",
  ".woff2": "font/woff2", ".ico": "image/x-icon",
}

http.createServer((req, res) => {
  let url = decodeURIComponent(new URL(req.url, "http://x").pathname)
  if (url === "/") url = "/demo/index.html"
  const file = path.normalize(path.join(ROOT, url))
  if (!file.startsWith(ROOT)) return res.writeHead(403).end()
  fs.readFile(file, (err, data) => {
    if (err) return res.writeHead(404, { "content-type": "text/plain" }).end("404")
    res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream", "cache-control": "no-store" })
    res.end(data)
  })
}).listen(PORT, "127.0.0.1", () => console.log(`CraftKit UI demo: http://localhost:${PORT}`))
