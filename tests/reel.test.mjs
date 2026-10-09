import test from "node:test";
import assert from "node:assert/strict";
import { makeReel, validateReel } from "../src/reel.js";

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
  assert.match(html, /window\.__hf\s*=\s*\{\s*duration:\s*12,\s*seek\s*\}/);
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
