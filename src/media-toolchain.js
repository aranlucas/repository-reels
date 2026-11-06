import { readFile } from "node:fs/promises";

const engine = JSON.parse(
  await readFile(
    new URL("../node_modules/@hyperframes/engine/package.json", import.meta.url),
    "utf8",
  ),
);
const mediabunny = JSON.parse(
  await readFile(new URL("../node_modules/mediabunny/package.json", import.meta.url), "utf8"),
);

export const captureEngine = `@hyperframes/engine@${engine.version}`;
export const mediaLibrary = `mediabunny@${mediabunny.version}`;
