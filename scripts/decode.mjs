import { createServer } from "node:http";
import { readFile, writeFile, open, unlink } from "node:fs/promises";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { createCaptureSession, closeCaptureSession, closeBrowserPool } from "@hyperframes/engine";

// Media processing only: decode every frame, in one local browser, without playing any source application.
const manifest = JSON.parse(await readFile("manifest.json", "utf8"));

const module = await readFile("node_modules/mediabunny/dist/bundles/mediabunny.mjs");

const html = `<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self' 'unsafe-inline'; connect-src 'self'"><script type="module">
import {Input,ALL_FORMATS,UrlSource,CanvasSink} from '/mediabunny.mjs';
window.decodeReel=async name=>{
 const input=new Input({formats:ALL_FORMATS,source:new UrlSource('/video/'+encodeURIComponent(name))});
 try {
  const track=await input.getPrimaryVideoTrack();
  if(!track||!await track.canDecode())throw new Error('Video decoder unavailable');
  const sink=new CanvasSink(track,{poolSize:1,alpha:false});
  let frames=0,previous=-1,lastEnd=0;const samples=[];
  for await(const frame of sink.canvases()){
   if(frame.timestamp<=previous)throw new Error('Decoded timestamps are not increasing');
   if(frame.canvas.width!==960||frame.canvas.height!==540)throw new Error('Decoded dimensions differ');
   previous=frame.timestamp;lastEnd=frame.timestamp+frame.duration;
   if([9,60,108].includes(frames)){
    const pixels=frame.canvas.getContext('2d').getImageData(0,0,960,540).data;
    let sum=0,min=255,max=0;
    for(let i=0;i<pixels.length;i+=128){const value=(pixels[i]+pixels[i+1]+pixels[i+2])/3;sum+=value;min=Math.min(min,value);max=Math.max(max,value);}
    const luminance=sum/(pixels.length/128);
    if(max-min<20||luminance<4)throw new Error('Decoded scene is blank or black');
    samples.push({frame:frames,timestamp:frame.timestamp,mean_luminance:Number(luminance.toFixed(2))});
   }
   frames++;
  }
  return {frames,last_end:lastEnd,samples};
 } finally {input.dispose();}
};window.decoderReady=true;
</script>`;

let lock;

try {
  lock = await open(".render.lock", "wx");
  await lock.writeFile(String(process.pid));
} catch {
  throw new Error("Renderer or decoder already holds .render.lock");
}

const names = new Set(manifest.clips.map((c) => c.name));

const server = createServer(async (req, res) => {
  try {
    if (req.url === "/index.html") {
      res.setHeader("Content-Type", "text/html");
      res.end(html);
    } else if (req.url === "/mediabunny.mjs") {
      res.setHeader("Content-Type", "text/javascript");
      res.end(module);
    } else if (req.url.startsWith("/video/")) {
      const name = decodeURIComponent(req.url.slice(7));

      if (!names.has(name)) {
        res.writeHead(404);
        res.end();

        return;
      }

      res.setHeader("Content-Type", "video/webm");
      res.end(await readFile(`public/renders/${name}.webm`));
    } else {
      res.writeHead(404);
      res.end();
    }
  } catch {
    res.writeHead(404);
    res.end();
  }
});

let session;

const results = [];

async function bounded(promise, label, ms = 30000) {
  let timer;

  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(label + " timed out")), ms);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

try {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const origin = `http://127.0.0.1:${server.address().port}`;
  session = await bounded(
    createCaptureSession(
      origin,
      "/tmp/task13-decode",
      {
        width: 960,
        height: 540,
        fps: { num: 12, den: 1 },
        format: "png",
        compositionDurationSeconds: 12,
      },
      null,
      {
        chromePath:
          process.env.REELS_CHROME ||
          "/Users/lucas/Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell",
        enableBrowserPool: false,
        disableGpu: true,
        browserGpuMode: "software",
        concurrency: 1,
        coresPerWorker: 1,
        lowMemoryMode: true,
      },
    ),
    "Browser launch",
  );
  await session.page.goto(origin + "/index.html", {
    waitUntil: "domcontentloaded",
    timeout: 10000,
  });
  await session.page.waitForFunction("window.decoderReady===true", {
    timeout: 10000,
  });

  for (const clip of manifest.clips) {
    const bytes = await readFile(`public/renders/${clip.name}.webm`),
      hash = createHash("sha256").update(bytes).digest("hex");

    assert.equal(hash, clip.video_sha256);

    const result = await bounded(
      session.page.evaluate((name) => window.decodeReel(name), clip.name),
      clip.name,
    );

    assert.equal(result.frames, 144, clip.name + " decoded frame count");
    assert.ok(Math.abs(result.last_end - 12) < 0.01);
    assert.equal(result.samples.length, 3);
    results.push({
      name: clip.name,
      video_sha256: hash,
      ...result,
      status: "passed",
    });
    console.log(
      `Decoded ${results.length}/${manifest.clips.length}: ${clip.name}, ${result.frames} frames`,
    );
  }

  await writeFile(
    "evidence/verification-decode.json",
    JSON.stringify(
      {
        verified_at: new Date().toISOString(),
        complete: true,
        decoder: "MediaBunny 1.61.0 / Chromium WebCodecs VP8",
        browser_version: await session.page.browser().version(),
        clips: results,
      },
      null,
      2,
    ) + "\n",
  );
} finally {
  if (session) await closeCaptureSession(session);
  server.close();
  await closeBrowserPool();
  await lock.close();
  await unlink(".render.lock");
}
