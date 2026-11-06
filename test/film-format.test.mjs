import { test } from "vitest";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { compositionFormat, sceneSampleFrames } from "@/film-format.js";

test("scene evidence samples remain at the reviewed times when the frame rate changes", () => {
  assert.deepEqual(sceneSampleFrames(12), [9, 60, 108]);
  assert.deepEqual(sceneSampleFrames(24), [18, 120, 216]);
});

test("the published collection matches the pipeline manifest and composition format", async () => {
  const manifest = JSON.parse(await readFile("manifest.json", "utf8"));
  const published = JSON.parse(await readFile("public/data/manifest.json", "utf8"));

  assert.deepEqual(published, manifest);
  assert.equal(manifest.width, compositionFormat.width);
  assert.equal(manifest.height, compositionFormat.height);
  assert.equal(manifest.fps, compositionFormat.fps);
  assert.equal(manifest.duration, compositionFormat.duration);
});
