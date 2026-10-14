import type { OxfmtConfig } from "oxfmt";
import base from "@aranlucas/oxforge/format-config";

const config: OxfmtConfig = {
  ...base,
  // The composition pipeline owns these generated artifacts and their byte hashes.
  ignorePatterns: [
    ...(base.ignorePatterns ?? []),
    "compositions/**",
    "manifest.json",
    "public/data/manifest.json",
  ],
};

export default config;
