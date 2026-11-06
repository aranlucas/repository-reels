import type { E2EConfig } from "e2e";
import { web } from "@e2e-dev/web";

export default {
  targets: [
    {
      engine: web(),
      app: {
        url: "http://127.0.0.1:4313",
        command: { executable: "node", args: ["scripts/serve.mjs"] },
      },
    },
  ],
  tests: ["test/e2e/**/*.e2e.ts"],
  workers: 1,
  retries: 0,
  trace: "retain-on-failure",
  video: "retain-on-failure",
} satisfies E2EConfig;
