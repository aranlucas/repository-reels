import { test } from "vitest";
import assert from "node:assert/strict";
import { embedSourceStill } from "@/source-still.js";

// SHA-256 published test vector for the three ASCII bytes "abc".
const still = {
  name: "example",
  sha256: "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
};

test("only screenshot bytes matching the pinned evidence can be embedded", () => {
  assert.equal(embedSourceStill(Buffer.from("abc"), still), "data:image/png;base64,YWJj");
  assert.throws(() => embedSourceStill(Buffer.from("replaced"), still), /hash mismatch/);
});
