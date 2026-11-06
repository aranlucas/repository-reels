# Reliability audit — 2026-11-06

## Baseline and inventory (before implementation)

Clean isolated worktree at remote main 44b4916 after merged untangle PR #21.
No local tests, browser runs, media processing or builds are authorized.

Reviewed all source, executable commands, existing tests, manifest contracts,
documentation, dependency lifecycle hooks and CI. Public interfaces are the
screening-room search/selection/deep links, Hyperframes video playback, film
and manifest downloads, deterministic composition capture protocol, and
compose/render/decode/verify/refresh/source-stills CLIs.

The app has no account, tenant, database or remote write API. The HTTP server
binds loopback; private delivery depends on keeping that boundary. GitHub refresh
uses read-only gh requests with bounded subprocess deadlines. Trusted local
capture inputs and explicit editorial curation govern evidence. Generated media
and composition bytes have pinned hashes; screenshots cannot be embedded in
protected films. Rendering/decoding share an exclusive lock, run serially and
close browser resources in finally blocks. CI verifies committed media and decode
evidence without external services. Refresh inputs are deliberately absent and
must not be fabricated.

## Findings

1. **Medium, high confidence — valid partial downloads fail.**
   scripts/serve.mjs accepts only ranges starting with a decimal offset. A client
   requesting the final bytes using `bytes=-1024` gets 416 instead of the final
   bytes and a 206 Content-Range response. HTTP suffix ranges are part of the
   single-range contract used by seeking/downloading clients. Cover suffix,
   ordinary/clamped ranges, unsatisfiable ranges, HEAD and missing files through
   the real CLI in Vitest. Retain loopback binding, port, root boundary and no-store caching.
2. **Medium, high confidence — every request buffers an entire film.**
   scripts/serve.mjs stat/readFile runs before examining Range or HEAD. Multiple
   seek requests allocate the full film repeatedly, even for one requested byte;
   aborted requests do not cancel disk reads. Node file streams and pipeline stream requested bytes,
   handle HEAD without reading a body and clean up on disconnect. Protocol
   tests protect observable behavior; no local benchmark is needed.

## Rejected hypotheses and bounded risks

- No server authentication defect: README promises a private loopback bundle,
  not an internet multi-tenant service. Do not invent accounts or change APIs.
- URL path traversal is already checked after percent decoding and resolution.
  Symlinks and capture files are trusted local bundle inputs, not uploads.
- Render manifests only preserve passed evidence on matching composition hashes;
  new media needs exact-byte decode evidence. This is not a live deployment claim.
- Metadata-only screenshot rejection, owned citations and HTML escaping already
  have meaningful tests. Retain them and pinned generated artifacts.
- A crashed process may leave the render lock; documented manual recovery avoids
  unsafe automatic unlock races. Resource cleanup improvements without a proven
  trigger are deferred, not reported as established bugs.
- Missing manifest HTTP responses already surface an alert. E2E will verify that
  failure path as well as search, selection, reload, source and media URLs.

## Framework and validation plan

Read current published quickstart, CI and GitHub Actions docs at e2e.com and the
requested upstream Vite example. Registry confirms real tester-army `e2e` 0.23.0
requires Node ^22.22.3 or >=24.8; repository Node 24.22.1 is compatible.
Use pinned `e2e` and `@e2e-dev/web` for deterministic locators/actions/assertions,
with no agents, model keys, paid providers or production services. The built
screening room is an honest web target. Existing Vitest and media checks remain.
CI must establish pre-fix suffix-range failure, fixed HTTP contracts, existing
regressions, media verification, build and browser journeys. Independent review
and exact CI/PR evidence will be recorded below.

### Library choice and independent review

Considered maintained `send` 1.2.1, then rejected it during independent review:
its runtime dependency breaks the documented zero-install dist/scripts bundle.
Native Node FileHandle streams and pipeline provide streaming/disconnect cleanup;
the remaining narrow single-range HTTP glue preserves that delivery contract.
No new executable scripts or server bundling are introduced. Invalid or unsupported
range syntax is ignored with a full 200 response; valid unsatisfiable single
ranges receive 416 and the resource length. HEAD ignores Range per HTTP semantics.

### Initial implementation review

Independent reviewer confirmed both findings and the native streaming fix, and
requested empty-file/invalid-range coverage and honest playback evidence. Added
those HTTP contracts and an event-based check that Hyperframes currentTime advances
after clicking Play. No remaining concrete server objections were reported.
Pinned published @e2e-dev/web 0.15.5 (peer e2e >=0.22.1 <1) with e2e 0.23.0.
Read the installed skill, setup, writing-tests and running guides. All installs
used --ignore-scripts; no local tests/builds/browser runs occurred. Local static
lint and formatting are allowed; CI results remain pending.

### CI evidence and final independent review

[CI run 42305982457](https://github.com/aranlucas/repository-reels/actions/runs/42305982457)
passed for implementation head a31842e: pre-audit server produced the expected
416-versus-206 suffix regression; all 21 Vitest tests passed; media verification
checked 56 exact-byte films; production build passed; both deterministic e2e
journeys passed, including actual playback advancement. The report artifact was
uploaded. Read the job logs; no local tests or builds were run.

Final independent static review checked range arithmetic, FileHandle/pipeline
cleanup, standalone delivery, pre-fix report assertions, installed e2e APIs and
Hyperframes Play/timeupdate behavior. It reported no further concrete findings.
[PR #22](https://github.com/aranlucas/repository-reels/pull/22) carries this audit.
Vercel deployment failure is excluded by user policy; no deployment is attempted.
