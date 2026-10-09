# Repository reels

Private screening room for 56 source-pinned repository films, rendered locally with the real HyperFrames engine and encoded with MediaBunny. Each film is a silent, three-scene, 12-second VP8 WebM at 960×540 and 12 fps. Search the collection, play a film, download it, and inspect its immutable source links.

![Desktop screening room](evidence/browser/desktop.jpg)

## Technology stack

| Component | Version or requirement | Role |
| --- | --- | --- |
| React + React DOM | 19.3.0 | Screening-room interface, collection search and film selection. |
| Vite | 8.3.2 | Development server and production browser build. |
| HyperFrames engine + player | 0.8.107 | Deterministic HTML-to-frame rendering and embedded film playback. |
| MediaBunny | 1.61.0 | Local WebCodecs VP8 encoding, WebM muxing and media verification. |
| Node.js | 22.12 or newer | Local scripts and the built-in HTTP server, including video byte-range responses. |

The built screening room runs locally at **http://127.0.0.1:4313**. Source development with `npm run dev` uses Portless at the printed URL, normally `https://repository-reels.localhost`; see the setup below. It does not use Vercel hosting or the Vercel AI SDK, and it does not depend on TanStack Start or TanStack Router. Exact package versions are recorded in [package.json](package.json) and [package-lock.json](package-lock.json).

These stack details describe Repository Reels. The individual projects featured in the films have their own stacks; rendering a film does not change their frameworks or deployment setup.

## Open the collection

The portable collection in Lucas's Library includes a built screening room and all films. Extract these three ZIPs into the same parent directory; all share one `repository-reels/` folder:

- `repository-reels--collection-app.zip`
- `repository-reels--collection-films-A.zip`
- `repository-reels--collection-films-B.zip`

Enter that folder and run `node scripts/serve.mjs` with Node 22.12 or newer. Open **http://127.0.0.1:4313**. No package installation is needed for that bundle. Stop with Ctrl-C. If another instance owns port 4313, use that instance or stop it before starting another. A single complete ZIP is also available in the local `artifacts/` directory. Three separate Library preview films showcase the forms library, Shipshape and Lanternwake.

From this private repository's implementation branch:

```sh
npm ci --ignore-scripts --no-fund
npm run build
npm run serve
```

The films, posters, source stills, generated compositions and verification evidence are committed deliberately so a fresh clone works. `dist/` and the portable ZIP are build artifacts. Repository history begins with an honest bootstrap; implementation is delivered through its reviewable PR.

## Exact coverage

The source snapshot began **October 1, 2026 at 9:25:24 pm Pacific** (`2026-10-02T04:25:24.864Z`); PR states were captured at `04:26:16.775Z`. It covers the original 47 owned repositories plus nine new prototypes. **56/56 included films rendered and fully decoded.**

A later inventory audit at **10:09:40 pm Pacific** (`2026-10-02T05:09:40.159911Z`) found 61 owned repositories:

- 56 included films.
- Four pending source review/films: `framebreak`, `pocket-park`, `trailbraid`, `orthogonal-router-rust-lab`, created after this source snapshot.
- One excluded: `repository-reels`, the collection itself, to avoid recursive coverage.

This is a dated capture, not a claim of complete coverage of every repository subsequently created. The exact list, SHA, evidence, pending/excluded names and video hash are in [manifest.json](manifest.json) and [inventory audit](evidence/inventory-audit.json).

Five bootstrap-only prototypes use inspected implementation PR heads rather than describing an empty default branch: Elsewhere, Leavewell, Paper Options, Second Helping and Spoonworld. Their proposal state is historical. Later merges do not invalidate the pinned source but are not silently substituted into this capture. Four merged source changes were checked against their exact merge commits in [merge ancestry](evidence/merge-ancestry.json).

## What the films establish

Workflows are source-backed illustrations using synthetic data. Lanternwake, Elsewhere and Spoonworld additionally use inspected source screenshots pinned to their commits; their scenes explicitly say **SOURCE SCREENSHOT**. These films do not run, test or establish the deployment of the source applications. A merged source change and a live deployment are separate claims. Garmin remains labeled release blocked by its account/device migration.

Sensitive projects use purpose and metadata/structure only. Resumes, vault contents, corpus documents, medical details, financial values, holdings, credentials, private photos and location records are withheld. No external AI provider or new paid service is used. Nothing has been publicly released or deployed.

## Validation and browser evidence

```sh
npm run check
npm run verify
```

Seven contract/privacy regression tests and the production build pass. `verify` checks every file's composition/video hashes, container readability, VP8 track, dimensions, duration, 144 packets, timing, seekable keyframes and three PNG scene captures. It also requires a complete full-decode report tied to those exact media hashes.

`npm run decode` separately decodes **all 8,064 frames** through Chromium WebCodecs and MediaBunny, verifies frame order/dimensions/duration, and samples all three scenes for blank/black output. [Full decode evidence](evidence/verification-decode.json) and [media evidence](evidence/verification-media.json) are committed. Hosted CI verifies the hash-bound decode evidence; it does not download Chromium or rerun the browser decoder.

Actual in-app Chromium QA at 1440×960 and 390×844 covered search, selection, playback through 0:12, source disclosure, source-linked URLs and an actual downloaded film whose hash matched the manifest. Both viewports have no document-level horizontal overflow. Console error/warning capture was empty. A mobile poster-cropping defect in player 0.8.107 was found and fixed by sizing its shadow poster to the player bounds; library files are unmodified. [Desktop](evidence/browser/desktop.jpg), [mobile](evidence/browser/mobile.jpg), and [QA notes](docs/qa.md) are saved. Safari, Firefox and physical mobile devices were not tested. Desktop/landscape viewing makes the film's small source annotations easier to read.

## Refresh or render later

The browser renderer and full decoder use one existing Chromium process, no browser download, no browser pool, software GPU mode and a shared `.render.lock`. Set `REELS_CHROME` to a trusted installed Chromium executable on another machine; this Mac's existing Playwright headless shell is the default. Render work is sequential and bounded. Do not run render and decode together.

```sh
# Read-only GitHub capture using existing gh authorization. Never configure credentials here.
node scripts/refresh-evidence.mjs
# Inspect the new source evidence and add/review scripts/curation.mjs before composing.
npm run compose
# Review any source-still changes separately; protected projects cannot include screenshots.
npm run render
npm run decode
npm run verify
npm run check
```

`compose` refuses an uncurated repository and preserves a passed render only when the composition hash is unchanged. An explicit `npm run render -- name --force` rerenders one film. Capture and verification evidence must be refreshed together; old decode evidence cannot validate changed media. The refresh script updates a fixed set of relevant PRs plus bootstrap implementation PR heads; human review is still required for a newly relevant PR. Update the inventory audit for a new source snapshot.

## Libraries and research

[Research and ranked shortlist](docs/research.md) records fresh primary daily/weekly GitHub Trending captures, maintenance/release evidence, license observations, stale cached examples and the selection rationale. HyperFrames **0.8.107** and MediaBunny **1.61.0** are pinned. Registry installs disable lifecycle scripts. Browser assets include [third-party notices](public/THIRD_PARTY_NOTICES.md) and the actual upstream license texts under `public/licenses/`.

## Local URLs with Portless

The Vite development page gets an allocated backend port.
Portless supplies Vite's port and strict-port arguments.

The standard development command uses [Portless](https://github.com/vercel-labs/portless).
Install its pinned CLI once with Node.js 24 or newer, then run this repository's command after the
normal dependency and environment setup:

```sh
npm install -g portless@0.15.7
npm run dev
```

The main checkout uses `https://repository-reels.localhost` with the default proxy settings.
Use the URL printed by Portless if you have changed its proxy port, TLS, or TLD.
Linked Git worktrees get a branch prefix, so each checkout has its own origin.
The first HTTPS run can request local administrator permission to bind port 443,
trust its development certificate, and synchronize local hostnames. Ctrl+C stops
the child server and removes its route.

Rendering, composition,
verification, and `npm run serve` retain their existing commands and inputs; this
command only changes how the Vite preview is reached.
