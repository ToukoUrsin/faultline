import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../web",
);
const port = Number(process.env.PORT || 8777);
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".wasm": "application/wasm",
  ".json": "application/json; charset=utf-8",
};
http
  .createServer(async (req, res) => {
    try {
      const name = decodeURIComponent(
          new URL(req.url, "http://localhost").pathname,
        ),
        file = path.resolve(root, `.${name === "/" ? "/index.html" : name}`);
      if (!file.startsWith(root + path.sep)) {
        res.writeHead(403).end();
        return;
      }
      const bytes = await fs.readFile(file);
      res.writeHead(200, {
        "Content-Type": types[path.extname(file)] || "application/octet-stream",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-cache",
        "Content-Security-Policy":
          "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
      });
      res.end(bytes);
    } catch {
      res.writeHead(404).end("Not found");
    }
  })
  .listen(port, "127.0.0.1", () =>
    console.log(`Faultline at http://127.0.0.1:${port}`),
  );
