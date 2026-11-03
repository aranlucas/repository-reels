# Third-party notices

These notices record the libraries used for the original October 2, 2026 capture
and screening-room build. Installed upstream library files were unmodified.
Current dependency versions and registry package integrity are recorded in
`package.json` and `pnpm-lock.yaml`. The original browser bundle included:

- React / React DOM 19.3.0 — MIT; copies in `licenses/react-LICENSE.txt` and `licenses/react-dom-LICENSE.txt`. Source: https://github.com/facebook/react.
- HyperFrames player/core 0.8.107 — upstream repository Apache-2.0 license copied from its version tag to `licenses/hyperframes-Apache-2.0.txt`. The player README's MIT footer conflicts with the repository license; use the actual upstream license. Source: https://github.com/heygen-com/hyperframes/tree/v0.8.107.

The original local media production used HyperFrames engine 0.8.107 and MediaBunny 1.61.0. MediaBunny is MPL-2.0; its upstream license is copied to `licenses/mediabunny-LICENSE.txt`, and unchanged source is available at https://github.com/Vanilagy/mediabunny/tree/v1.61.0. It is not part of the screening room's browser bundle.

This private prototype's code and media are not offered under an open-source license. Source repositories keep their own licenses and visibility; a private film is not a relicensing of its source.
