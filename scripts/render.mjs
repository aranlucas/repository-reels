import { createServer } from "node:http";
import {
  createCaptureSession,
  initializeSession,
  captureFrameToBuffer,
  closeCaptureSession,
  closeBrowserPool,
} from "@hyperframes/engine";
import { readFile, writeFile, mkdir, open, unlink } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";

const manifest = JSON.parse(await readFile("manifest.json", "utf8"));

const args = process.argv.slice(2),
  requested = args.filter((arg) => !arg.startsWith("--"));

const selected = requested.length
  ? manifest.clips.filter((clip) => requested.includes(clip.name))
  : manifest.clips.filter(
      (clip) => clip.render_status !== "passed" || args.includes("--force"),
    );

if (
  requested.some((name) => !manifest.clips.some((clip) => clip.name === name))
)
  throw new Error("Unknown repository in selection");

const chrome =
  process.env.REELS_CHROME ||
  "/Users/lucas/Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell";

const encoderModule = await readFile(
  "node_modules/mediabunny/dist/bundles/mediabunny.mjs",
);

const encoderHtml = `<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self' 'unsafe-inline'; img-src data:; connect-src 'none'; style-src 'unsafe-inline'"><canvas width="${manifest.width}" height="${manifest.height}"></canvas><script type="module">
import { Output, WebMOutputFormat, BufferTarget, CanvasSource, Quality } from '/mediabunny.mjs';
const canvas = document.querySelector('canvas'), context = canvas.getContext('2d', {alpha:false});
const output = new Output({format:new WebMOutputFormat(), target:new BufferTarget()});
const source = new CanvasSource(canvas, {codec:'vp8', quality:new Quality({bitrate:1800000}), latencyMode:'realtime', hardwareAcceleration:'prefer-software', keyFrameInterval:1});
output.addVideoTrack(source, {frameRate:${manifest.fps}});
await output.start();
window.addReelFrame = async (base64, timestamp) => {
 const image = new Image(); image.src = 'data:image/png;base64,' + base64;
 await image.decode(); context.drawImage(image, 0, 0); await source.add(timestamp, 1/${manifest.fps});
};
window.finishReel = async () => {
 source.close(); await output.finalize(); const bytes = new Uint8Array(output.target.buffer), chunks = [];
 for(let offset=0;offset<bytes.length;offset+=8192) chunks.push(String.fromCharCode(...bytes.subarray(offset,offset+8192)));
 return btoa(chunks.join(''));
};
window.encoderReady = true;
</script>`;

for (const path of ["public/renders", "public/posters", "evidence/render"])
  await mkdir(path, { recursive: true });

let lock;

try {
  lock = await open(".render.lock", "wx");
  await lock.writeFile(String(process.pid));
} catch {
  throw new Error(
    "Another renderer owns .render.lock. Never run concurrent batches.",
  );
}

let currentHtml = "",
  session,
  encoderPage,
  stopping = false;

const server = createServer((req, res) => {
  if (req.url === "/index.html") {
    res.setHeader("Content-Type", "text/html");
    res.end(currentHtml);
  } else if (req.url === "/encoder.html") {
    res.setHeader("Content-Type", "text/html");
    res.end(encoderHtml);
  } else if (req.url === "/mediabunny.mjs") {
    res.setHeader("Content-Type", "text/javascript");
    res.end(encoderModule);
  } else {
    res.writeHead(404);
    res.end();
  }
});

await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolve);
}).catch(async (error) => {
  await lock.close();
  await unlink(".render.lock");
  throw error;
});

const origin = `http://127.0.0.1:${server.address().port}`;

const config = {
  chromePath: chrome,
  forceScreenshot: true,
  useDrawElement: false,
  enableBrowserPool: false,
  disableGpu: true,
  browserGpuMode: "software",
  staticFrameDedup: false,
  concurrency: 1,
  coresPerWorker: 1,
  lowMemoryMode: true,
  playerReadyTimeout: 8000,
  pageNavigationTimeout: 10000,
};

async function bounded(promise, label, ms = 30000) {
  let timer;

  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${label} exceeded ${ms}ms`)),
          ms,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function saveManifest() {
  const json = JSON.stringify(manifest, null, 2) + "\n";
  await writeFile("manifest.json", json);
  await writeFile("public/data/manifest.json", json);
}

process.on("SIGTERM", () => {
  stopping = true;
});

process.on("SIGINT", () => {
  stopping = true;
});

try {
  for (const [index, clip] of selected.entries()) {
    if (stopping) break;

    const started = Date.now(),
      output = resolve(`public/renders/${clip.name}.webm`),
      keyframes = [];

    console.log(`Rendering ${clip.name} (${index + 1}/${selected.length})`);
    currentHtml = await readFile(`compositions/${clip.name}.html`, "utf8");
    clip.composition_sha256 = createHash("sha256")
      .update(currentHtml)
      .digest("hex");

    try {
      session = await bounded(
        createCaptureSession(
          origin,
          "/tmp/task13-frames",
          {
            width: manifest.width,
            height: manifest.height,
            fps: { num: manifest.fps, den: 1 },
            format: "png",
            compositionDurationSeconds: manifest.duration,
          },
          null,
          config,
        ),
        "Browser launch",
      );
      await bounded(initializeSession(session), "Capture initialization");
      // One browser process. The second page only decodes and encodes captured frames.
      encoderPage = await session.page.browser().newPage();
      const browserErrors = [];
      encoderPage.on("pageerror", (error) => browserErrors.push(error.message));
      await encoderPage.goto(origin + "/encoder.html", {
        waitUntil: "domcontentloaded",
        timeout: 10000,
      });
      await encoderPage.waitForFunction("window.encoderReady === true", {
        timeout: 10000,
      });

      for (let frame = 0; frame < manifest.duration * manifest.fps; frame++) {
        if (stopping) throw new Error("Render interrupted");

        const { buffer } = await bounded(
          captureFrameToBuffer(session, frame, frame / manifest.fps),
          `Frame ${frame}`,
          15000,
        );

        if (!buffer?.length)
          throw new Error("HyperFrames captured an empty frame");

        if ([9, 60, 108].includes(frame)) {
          const path = `evidence/render/${clip.name}-${frame}.png`;
          await writeFile(path, buffer);
          keyframes.push(path);

          if (frame === 9)
            await writeFile(`public/posters/${clip.name}.png`, buffer);
        }

        await bounded(
          encoderPage.evaluate(
            (png, time) => window.addReelFrame(png, time),
            buffer.toString("base64"),
            frame / manifest.fps,
          ),
          "Encode frame",
          15000,
        );
      }

      const base64 = await bounded(
        encoderPage.evaluate(() => window.finishReel()),
        "Finalize video",
      );

      const diagnostics = session.browserConsoleBuffer.filter((line) =>
        /PAGEERROR|HTTPERROR|REQUESTFAIL/i.test(line),
      );

      if (browserErrors.length || diagnostics.length || session.warnings.length)
        throw new Error(
          `Capture diagnostics: ${JSON.stringify({ browserErrors, diagnostics, warnings: session.warnings })}`,
        );
      const bytes = Buffer.from(base64, "base64");
      await writeFile(output, bytes);
      Object.assign(clip, {
        render_status: "passed",
        video_bytes: bytes.length,
        video_sha256: createHash("sha256").update(bytes).digest("hex"),
        rendered_at: new Date().toISOString(),
        render_seconds: Number(((Date.now() - started) / 1000).toFixed(2)),
        keyframes,
        capture_engine: "@hyperframes/engine@0.8.107",
        encoder: "mediabunny@1.61.0 / WebCodecs",
        codec: "VP8 / WebM",
      });
      delete clip.render_error;
      console.log(
        `Passed ${clip.name}: ${bytes.length} bytes, ${clip.render_seconds}s`,
      );
    } catch (error) {
      clip.render_status = "failed";
      clip.render_error = error.message;
      await unlink(output).catch(() => {});
      console.error(`Failed ${clip.name}: ${error.message}`);
    } finally {
      if (encoderPage) {
        await bounded(encoderPage.close(), "Close encoder", 5000).catch(
          () => {},
        );
        encoderPage = null;
      }

      if (session) {
        await closeCaptureSession(session);
        session = null;
      }

      await saveManifest();
    }
  }
} finally {
  if (session) await closeCaptureSession(session);
  server.close();
  await closeBrowserPool();
  await lock.close();
  await unlink(".render.lock");
}

console.log(
  JSON.stringify(
    manifest.clips.reduce((counts, clip) => {
      counts[clip.render_status] = (counts[clip.render_status] || 0) + 1;

      return counts;
    }, {}),
  ),
);

if (selected.some((clip) => clip.render_status === "failed"))
  process.exitCode = 1;
