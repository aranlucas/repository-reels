import { test } from "vitest";
import assert from "node:assert/strict";
import { runInNewContext } from "node:vm";
import { makeReel, validateReel } from "@/reel.js";

const reel = {
  name: "safe-repo",
  full_name: "aranlucas/safe-repo",
  visibility: "private",
  source_sha: "a".repeat(40),
  purpose: "A useful project.",
  description: "A source-backed description.",
  workflow: ["Read", "Review", "Use"],
  genre: "library",
  evidence_urls: ["https://github.com/aranlucas/safe-repo/tree/" + "a".repeat(40)],
};

test("requires a pinned SHA and owned source citations", () => {
  assert.throws(() => validateReel({ ...reel, source_sha: "main" }));
  assert.throws(() => validateReel({ ...reel, evidence_urls: ["https://example.com"] }));
});

test("content cannot break out of markup or inject a script", () => {
  const html = makeReel({
    ...reel,
    purpose: "<script>secret()</script>",
    description: '" & <iframe src=https://evil.test>',
  });

  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(!html.includes("<script>secret()"));
  assert.ok(html.includes("connect-src 'none'"));
  assert.ok(!html.includes("<iframe src="));
});

test("all source-state claims remain separate from deployment", () => {
  const html = makeReel({
    ...reel,
    change: "A proposed edit.",
    change_state: "PROPOSAL · UNMERGED",
    limit: "Deployment not verified.",
  });

  assert.ok(html.includes("PROPOSAL · UNMERGED"));
  assert.ok(html.includes("Deployment not verified."));
});

test("exactly three deterministic twelve-second scenes", () => {
  const html = makeReel(reel);
  assert.equal((html.match(/section class="scene /g) || []).length, 3);
  assert.match(html, /__hf:\s*\{\s*duration:\s*12,\s*seek\s*\}/);
  assert.ok(html.includes('data-duration="12"'));
});

test("metadata-only clips label withheld contents", () => {
  const html = makeReel({
    ...reel,
    review_mode: "metadata-and-structure-only",
  });

  assert.ok(html.includes("STRUCTURE ONLY · CONTENT WITHHELD"));
});

test("source screenshots must be embedded PNGs and never protected contents", () => {
  assert.throws(() => makeReel({ ...reel, source_still_data: "https://evil.test/image.png" }));
  assert.throws(() =>
    makeReel({
      ...reel,
      review_mode: "metadata-and-structure-only",
      source_still_data: "data:image/png;base64,YQ==",
    }),
  );
});

test("opaque scene backgrounds survive the engine PNG transparency rule", () => {
  assert.ok(makeReel(reel).includes(".scene{background:#f4f1e9;"));
});

test("generated runtime preserves the capture protocol and deterministic scene selection", () => {
  const moving = [{ style: {} }, { style: {} }];

  const scenes = Array.from({ length: 3 }, () => ({
    style: {},
    querySelectorAll: () => moving,
  }));

  const ticks = Array.from({ length: 3 }, () => ({ style: {} }));
  const root = { dataset: {} };

  const context = {
    window: {},
    document: {
      querySelectorAll: (selector) => (selector === ".scene" ? scenes : ticks),
      querySelector: (selector) => (selector === "#reel" ? root : null),
    },
  };

  const script = makeReel(reel).match(/<script>([\s\S]*?)<\/script>/);

  assert.ok(script);
  runInNewContext(script[1], context);

  const {
    __hf: capture,
    __timelines: timelines,
    __player: player,
    reelTimeline: timeline,
  } = context.window;

  assert.equal(capture.duration, 12);
  assert.equal(player.getDuration(), 12);
  assert.equal(timelines.reel, timeline);
  assert.equal(timeline.duration(), 12);
  assert.equal(root.dataset.scene, "0");
  capture.seek(4.5);
  assert.equal(root.dataset.scene, "1");
  assert.equal(scenes[0].style.display, "none");
  assert.equal(scenes[1].style.display, "flex");
  assert.equal(ticks[1].style.background, "var(--accent)");
  assert.equal(timeline.time(), 4.5);
  capture.seek(12);
  assert.equal(root.dataset.scene, "2");
  assert.equal(timeline.time(), 11.999);
  capture.seek(-1);
  assert.equal(root.dataset.scene, "0");
  assert.equal(timeline.time(), 0);
});
