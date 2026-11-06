import { afterAll, beforeAll, test } from "vitest";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

let child;

let temporary;

const origin = "http://127.0.0.1:4313";

beforeAll(async () => {
  temporary = await mkdtemp(join(tmpdir(), "reels-http-"));
  await mkdir(join(temporary, "dist"));
  await writeFile(join(temporary, "dist", "film.webm"), "0123456789");
  await writeFile(join(temporary, "dist", "index.html"), "Screening room");
  await writeFile(join(temporary, "dist", "empty.webm"), "");
  child = spawn(process.execPath, [resolve("scripts/serve.mjs")], {
    cwd: temporary,
    stdio: ["ignore", "pipe", "pipe"],
  });

  await Promise.race([
    once(child.stdout, "data"),
    once(child, "exit").then(([code]) => {
      throw new Error(`Server exited before startup: ${code}`);
    }),
  ]);
});

afterAll(async () => {
  if (child && child.exitCode === null && child.signalCode === null) {
    const exited = once(child, "exit");
    child.kill();
    await exited;
  }

  if (temporary) {
    await rm(temporary, { recursive: true, force: true });
  }
});

test("suffix byte ranges return the final bytes for media clients", async () => {
  const response = await fetch(origin + "/film.webm", { headers: { Range: "bytes=-3" } });

  assert.equal(response.status, 206);
  assert.equal(response.headers.get("content-range"), "bytes 7-9/10");
  assert.equal(await response.text(), "789");
});

test("ordinary and clamped ranges preserve byte positions", async () => {
  const response = await fetch(origin + "/film.webm", { headers: { Range: "bytes=2-4" } });

  assert.equal(response.status, 206);
  assert.equal(response.headers.get("content-length"), "3");
  assert.equal(await response.text(), "234");
  const clamped = await fetch(origin + "/film.webm", { headers: { Range: "bytes=8-99" } });

  assert.equal(clamped.status, 206);
  assert.equal(await clamped.text(), "89");
});

test("unsatisfiable ranges advertise the representation length", async () => {
  const response = await fetch(origin + "/film.webm", { headers: { Range: "bytes=10-" } });

  assert.equal(response.status, 416);
  assert.equal(response.headers.get("content-range"), "bytes */10");
});

test("HEAD describes the file without a body and missing files stay missing", async () => {
  const response = await fetch(origin + "/film.webm", { method: "HEAD" });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "video/webm");
  assert.equal(response.headers.get("content-length"), "10");
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(await response.text(), "");
  const missing = await fetch(origin + "/missing");

  assert.equal(missing.status, 404);
  assert.equal(await missing.text(), "Not found");
  assert.equal(await (await fetch(origin + "/")).text(), "Screening room");
});

test("empty files have no body and cannot satisfy a byte range", async () => {
  const empty = await fetch(origin + "/empty.webm");

  assert.equal(empty.status, 200);
  assert.equal(empty.headers.get("content-length"), "0");
  assert.equal(await empty.text(), "");
  const range = await fetch(origin + "/empty.webm", { headers: { Range: "bytes=-3" } });

  assert.equal(range.status, 416);
  assert.equal(range.headers.get("content-range"), "bytes */0");
});

test("unsupported or malformed ranges fall back to the full representation", async () => {
  await Promise.all(
    ["bytes=0-1,4-5", "bytes=-", "items=1-3"].map(async (range) => {
      const response = await fetch(origin + "/film.webm", { headers: { Range: range } });

      assert.equal(response.status, 200);
      assert.equal(await response.text(), "0123456789");
    }),
  );
});
