# Verification record

Source capture: 2026-10-02T04:25:24.864Z (October 1, 9:25:24 pm Pacific). PR states: 04:26:16.775Z. Inventory audit: 05:09:40.159911Z (10:09:40 pm Pacific), 61 owned repositories, 56 included, four pending, pipeline excluded.

## Media

- 56/56 films passed rendering, container/hash/timing checks, and actual full-frame decoding.
- 56 × 144 = 8,064 decoded frames, 960×540 VP8, 12 seconds each, 12 fps.
- Full decoder: MediaBunny 1.61.0 and existing Chromium WebCodecs, one browser process; exact version recorded in `verification-decode.json`.
- Scene samples at frames 9, 60, 108 decoded without blank/black frames. This is a corruption/blank-frame check, not a substitute for human visual review.
- Visually inspected representative form/library, Shipshape backend, and Lanternwake game scenes, including source and status text. Source screenshots for all three game-image films were inspected separately.
- Four merged-change films pin their exact merge commits; GitHub comparisons are identical. No deployed-runtime claims.

## Actual browser flows

In-app Chromium, desktop 1440×960 and mobile layout 390×844:

- Search `lantern` selected Lanternwake; search `shipshape` returned Shipshape.
- Selecting a film changed the source SHA, evidence links and `?repo=` URL.
- Desktop form film Play changed to Pause and finished at 0:12 / 0:12 with Play restored.
- Mobile Shipshape playback also completed at 0:12 / 0:12.
- Inspect sources exposed exact commit/tree/blob links for the selected film.
- Downloaded `lanternwake.webm` through the visible download link; SHA-256 matched its manifest entry.
- Document scroll width equaled viewport width at both sizes (1440 and 390).
- Captured browser warning/error log was empty.
- Poster CSS in upstream player 0.8.107 omitted image width/height. Mobile QA exposed cropping; app-owned shadow styling now gives the poster 100% width/height. Corrected desktop/mobile screenshots are saved.
- Temporary viewport override reset after testing. Existing source project tabs and files were not changed.

Screenshots are actual browser output, not generated design imagery: `evidence/browser/desktop.jpg` and `mobile.jpg`. `docs/design-concept.png` is explicitly a generated concept.

Limitations: no Safari/Firefox or physical-device QA; no source application runtime, authenticated-device workflow, live provider or deployment verification. Small film annotations are best viewed on desktop/landscape. Source and PR states are frozen snapshots; newer repositories are pending, not silently called complete.
