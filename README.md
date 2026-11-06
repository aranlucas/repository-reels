# Repository reels

Private screening room for source-pinned repository films. Search the collection,
play or download a film, and inspect its source links. The films illustrate
workflows with synthetic data; they do not test source applications or establish
deployment. A merged source change is a separate claim from a working deployment.

## Run locally

Use the Node version in [.node-version](.node-version) and the pnpm version in
[package.json](package.json).

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm build
pnpm serve
```

Open **http://127.0.0.1:4313**. Stop with Ctrl-C. The server requires a built
`dist/` directory and serves video byte ranges. A prebuilt bundle containing
`dist/` and `scripts/` can run with `node scripts/serve.mjs` without installing
packages. If port 4313 is occupied, use or stop the existing instance.

For the three-part Library delivery, extract `repository-reels--collection-app.zip`,
`repository-reels--collection-films-A.zip` and `repository-reels--collection-films-B.zip`
into the same parent directory. They share a `repository-reels/` folder; run the
server from there. These delivery ZIPs are not tracked in this repository.

For development, `pnpm dev` uses Portless at
**https://repository-reels.localhost**. Its first run may request `sudo` for the
HTTPS proxy and local certificate trust.

## Source and privacy boundaries

[manifest.json](manifest.json) records the dated source snapshot, source SHAs,
review modes, media hashes and pending/excluded repositories. It is not a live
portfolio inventory. Prototype films may pin an inspected implementation PR head
rather than a bootstrap default branch; later merges do not replace that source.

Sensitive projects use purpose and metadata/structure only. Keep resumes, vault
contents, corpus documents, medical details, financial values, holdings,
credentials, private photos and location records out of films and source stills.
Source screenshots must match the pinned commit and be labeled as screenshots;
they do not establish live application behavior. Preserve project-specific
release blockers recorded in the manifest.

Keep the collection private. Publishing a film or source screenshot requires a
separate deliberate selection. Source repositories retain their licenses and
visibility; see [third-party notices](public/THIRD_PARTY_NOTICES.md).

## Validate and refresh

`pnpm check` runs lint, formatting, tests and the browser build. `pnpm verify`
checks composition/video hashes, container metadata, packet timing, seekable
keyframes and scene PNGs, and requires hash-matched full-decode evidence.
It writes `evidence/verification-media.json`; it does not decode frames itself.
`pnpm decode` uses Chromium to decode every frame and replaces
[the decode report](evidence/verification-decode.json). Neither check verifies
the source applications or replaces visual review of the films.

A fresh clone can play the committed collection, but cannot refresh source
capture or recompose it without restoring trusted `evidence/source-review.json`
and `evidence/pr-status.json`. These inputs are absent from this checkout.
Restore `evidence/source-stills.json` as well to preserve the screenshot mappings
when composing; the PNGs alone are insufficient.

Once those inputs are restored, the refresh order is:

1. Run `node scripts/refresh-evidence.mjs` using existing read-only GitHub access.
   It reads GitHub and replaces local capture files. Review changed sources and
   PR states; its fixed PR list does not discover every newly relevant change.
2. Review `scripts/curation.mjs` and any source-still changes. `pnpm compose`
   rejects uncurated repositories and preserves passed renders only when their
   composition hashes match. Reconcile the inventory audit for the new snapshot;
   composition does not carry the previous audit forward.
3. Run `pnpm render`, then `pnpm decode`, `pnpm verify` and `pnpm check`.
   `pnpm render name --force` explicitly rerenders one film. Changed media needs
   new decode evidence tied to its exact bytes.

Rendering and decoding share `.render.lock` and must run sequentially. Both use
one local Chromium process in software GPU mode. Set `REELS_CHROME` to a trusted
installed Chromium executable; the default is a machine-specific Playwright
headless-shell path in the scripts. They do not download a browser. If a job
leaves a lock behind, confirm its recorded process is no longer running before
removing it.

HyperFrames captures deterministic HTML scenes as PNG frames. Opaque scene
backgrounds are explicit because its PNG capture clears root backgrounds.
MediaBunny uses local WebCodecs for VP8 encoding and WebM muxing: it was chosen
to avoid requiring a separate FFmpeg runtime with PNG decoding support.
New renders and verification reports record the installed engine/encoder
versions. Historical evidence retains the versions used for its original capture.

Product priorities and proposed acceptance criteria are in [ROADMAP.md](ROADMAP.md).
