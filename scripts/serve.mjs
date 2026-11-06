import { print } from "./output.mjs";
import { createServer } from "node:http";
import { open } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { resolve, extname, sep } from "node:path";

const root = resolve("dist");

const mime = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".webm": "video/webm",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

const server = createServer(async (req, res) => {
  let handle;

  try {
    const url = new URL(req.url, "http://127.0.0.1");

    const file = resolve(
      root,
      "." + decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname),
    );

    if (!file.startsWith(root + sep)) {
      res.writeHead(403);
      res.end();

      return;
    }

    handle = await open(file);
    const info = await handle.stat();

    if (!info.isFile()) {
      res.writeHead(404);
      res.end("Not found");

      return;
    }

    const size = info.size;

    res.setHeader("Content-Type", mime[extname(file)] || "application/octet-stream");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Accept-Ranges", "bytes");

    let start = 0;
    let end = size - 1;

    // send would require dependencies in the documented zero-install delivery bundle.
    // Keep only its single-byte-range contract here; Node owns streaming and cleanup.
    if (req.headers.range && req.method !== "HEAD") {
      const match = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);

      if (match && (match[1] || match[2])) {
        if (match[1]) {
          start = Number(match[1]);
          end = match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
        } else {
          start = Math.max(0, size - Number(match[2]));
        }

        if (start >= size || end < start || size === 0) {
          res.writeHead(416, { "Content-Range": `bytes */${size}` });
          res.end();

          return;
        }

        res.statusCode = 206;
        res.setHeader("Content-Range", `bytes ${start}-${end}/${size}`);
      }
    }

    res.setHeader("Content-Length", Math.max(0, end - start + 1));

    if (req.method === "HEAD" || size === 0) {
      res.end();

      return;
    }

    await pipeline(handle.createReadStream({ start, end, autoClose: false }), res);
  } catch {
    if (!res.headersSent && !res.destroyed) {
      res.writeHead(404);
      res.end("Not found");
    } else {
      res.destroy();
    }
  } finally {
    await handle?.close();
  }
});

server.listen(4313, "127.0.0.1", () => print("Private screening room: http://127.0.0.1:4313"));
