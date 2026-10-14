import { defineConfig } from "vitest/config";

export default defineConfig({
  tsconfig: "./jsconfig.json",
  resolve: { tsconfigPaths: true },
});
