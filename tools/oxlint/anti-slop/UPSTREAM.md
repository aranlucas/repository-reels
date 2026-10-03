# Provenance

Source: https://github.com/dmmulroy/anti-slop

Exact commit: `c44ef22ca116d0ba62a3ff663a0bd13a3f3fa40b`. Production assets copied unmodified from `skills/install-anti-slop/assets/anti-slop/` to `tools/oxlint/anti-slop/`. Root MIT license and nested ESLint Stylistic LICENSE/UPSTREAM.md are preserved.

## Integration

Oxlint and @oxlint/plugins are both exactly 1.86.0. All 18 generic custom rules plus native oxc/no-accumulating-spread are enabled. No direct Effect dependency exists, so Effect remains unregistered. Existing package manager, CI triggers, security checks and formatting commands are preserved.

No lint exceptions. The status-count reducer now mutates only its fresh local accumulator. The generated-runtime contract test accepts whitespace while preserving its exact duration/seek assertions. Unit tests: 7 passed. Clean dependency install/full build/asset verification locally is blocked by npm dependency tarball HTTP403 and omitted large/binary assets; CI checks the intact repository.

Initial diagnostic counts: {"anti-slop(require-readable-spacing)": 182, "eslint(no-unused-vars)": 2, "oxc(no-accumulating-spread)": 1}. Final lint: zero diagnostics using the matching, already verified local toolchain. No deployment or merge.
