import { createHash } from "node:crypto";

export function embedSourceStill(bytes, still) {
  if (createHash("sha256").update(bytes).digest("hex") !== still.sha256) {
    throw new Error(`Source screenshot hash mismatch: ${still.name}`);
  }

  return "data:image/png;base64," + bytes.toString("base64");
}
