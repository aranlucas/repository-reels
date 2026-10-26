# Repository Reels feature roadmap

Updated 2026-10-26. Proposed improvements to the private collection, after
Digits/MCP priorities. Publishing a film or source screenshot requires a separate
deliberate selection; this plan authorizes no public release.

## Starting point

At `e7aa1a4308bac5d4250576e89798ad41fbdda4e3`, the [screening room](README.md)
contains 56 source-pinned films with search, playback, download and provenance.
That is a dated snapshot, not current portfolio coverage. The existing pipeline
renders and verifies media; a film illustrates a workflow and does not prove the
source application is deployed or working.

## Ordered releases

1. **Find a project by the problem it solves.** Add curated outcome tags and
   short audience/use-case descriptions, starting with the owned Digits/MCP
   products. Acceptance: tags and claims trace to the selected source version;
   a visitor can reach both the film and its evidence; search remains useful
   without inventing implementation or adoption claims.
2. **See what changed since a film was made.** Show a read-only freshness view
   comparing a film's pinned source with a newly reviewed owned-repository
   snapshot. Acceptance: changed, unavailable and unreviewed states differ;
   changed code does not automatically invalidate a film or establish a new
   feature. The existing film remains tied to its original evidence.
3. **Prepare a deliberate showcase selection.** Let the owner assemble a short
   playlist and export its reviewed films plus provenance as a portable pack.
   Acceptance: included files are previewed, sensitive projects retain their
   existing restrictions, and the pack records source/media hashes. Export does
   not upload, publish or grant redistribution rights.
4. **Refresh only the films that need it.** Add a clearer review queue around
   the existing compose/render/decode path, explaining which evidence or
   composition changed. Acceptance: unchanged validated renders remain reusable;
   changed media requires matching decode evidence; failed jobs leave a visible
   incomplete result. Preserve sequential bounded rendering.

## First slice and evaluation

Curate the outcome tags for five useful owned products before rendering more
films. Ask three collaborators to find a project for a specific task and explain
what is available versus illustrated. Record search time, misunderstood claims
and whether they follow the source or try the product. Views alone do not show
customer value.

Keep source capture, composition, rendering and validation responsibilities
distinct. Reuse the existing HyperFrames/MediaBunny pipeline and test runner;
add no parallel browser farm or generic refresh wrapper. Protected source
content remains excluded from both films and planning analytics.
