import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "@hyperframes/player";
import "./style.css";

function ScreeningRoom() {
  const [manifest, setManifest] = useState(null),
    [selected, setSelected] = useState(
      new URLSearchParams(location.search).get("repo") ||
        "react-hook-form-mantine",
    ),
    [query, setQuery] = useState(""),
    [error, setError] = useState(""),
    player = useRef(null);

  useEffect(() => {
    fetch("/data/manifest.json")
      .then((r) => {
        if (!r.ok) throw new Error("The coverage manifest is unavailable.");

        return r.json();
      })
      .then(setManifest)
      .catch((e) => setError(e.message));
  }, []);

  const clip =
    manifest?.clips.find((c) => c.name === selected) || manifest?.clips[0];

  useEffect(() => {
    const element = player.current;

    if (!element) return;
    const posterStyle = document.createElement("style");
    posterStyle.textContent = ".hfp-poster{width:100%;height:100%}";
    element.shadowRoot?.append(posterStyle);

    const onError = (e) =>
      setError(e.detail?.message || "This film could not be played.");

    element.addEventListener("error", onError);

    return () => {
      element.removeEventListener("error", onError);
      posterStyle.remove();
    };
  }, [clip?.name]);

  const count =
    manifest?.clips.filter((c) => c.render_status === "passed").length || 0;

  const priority = [
    "react-hook-form-mantine",
    "shipshape-mcp",
    "delivery-dash",
    "janella-cookbook",
    "agents",
  ];

  const clips = manifest
    ? [...manifest.clips].sort((a, b) => {
        const ai = priority.indexOf(a.name),
          bi = priority.indexOf(b.name);

        return (
          (ai < 0 ? 100 : ai) - (bi < 0 ? 100 : bi) ||
          a.name.localeCompare(b.name)
        );
      })
    : [];

  return (
    <div className="room">
      <header>
        <span className="brand">Repository reels</span>
        <span>
          Private drafts /{" "}
          {manifest
            ? new Date(manifest.captured_at).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                timeZone: "America/Los_Angeles",
              })
            : "Loading"}
        </span>
      </header>
      <div className="layout">
        <aside className="collection">
          <h2>The collection</h2>
          <label className="search">
            <span className="sr-only">Find a repository</span>
            <input
              placeholder="Find a repository"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <span aria-hidden="true">⌕</span>
          </label>
          <nav aria-label="Repository films">
            {clips
              .filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
              .map((c) => (
                <button
                  key={c.name}
                  className={clip?.name === c.name ? "selected" : ""}
                  aria-current={clip?.name === c.name ? "true" : undefined}
                  onClick={() => {
                    setSelected(c.name);
                    setError("");
                    const url = new URL(location.href);
                    url.searchParams.set("repo", c.name);
                    history.replaceState(null, "", url);
                  }}
                >
                  <span>{c.name}</span>
                  <span
                    aria-label={
                      c.render_status === "passed"
                        ? "render passed"
                        : "not rendered"
                    }
                  >
                    {c.render_status === "passed" ? "↗" : "·"}
                  </span>
                </button>
              ))}
          </nav>
          <p>
            {count} / {manifest?.clips.length || 0} included films rendered
            {manifest?.inventory_audit && (
              <>
                <br />
                {manifest.inventory_audit.pending.length} newer repositories
                awaiting films.
              </>
            )}
          </p>
        </aside>
        <main>
          <h1>Source. Into motion.</h1>
          <p className="lead">
            Short, truthful films about what each project does.
          </p>
          {error && (
            <div role="alert" className="error">
              {error}
            </div>
          )}
          {clip && (
            <>
              <div className="screen">
                {clip.render_status === "passed" ? (
                  <hyperframes-player
                    key={clip.name}
                    ref={player}
                    type="video/webm"
                    src={clip.render_url}
                    poster={clip.poster_url}
                    width="960"
                    height="540"
                    controls
                    low-power-idle
                    audio-locked
                  />
                ) : (
                  <div className="waiting">
                    <h2>{clip.purpose}</h2>
                    <p>
                      {clip.render_status === "failed"
                        ? "Render needs attention."
                        : "This film is queued for a local render."}
                    </p>
                    <p>{clip.render_error}</p>
                  </div>
                )}
              </div>
              <div className="download-row">
                <span>
                  {clip.genre} / {clip.source_sha.slice(0, 7)} /{" "}
                  {clip.review_mode === "metadata-and-structure-only"
                    ? "contents withheld"
                    : clip.source_still
                      ? "source screenshot"
                      : "synthetic workflow"}
                </span>
                {clip.render_status === "passed" && (
                  <a download href={clip.render_url}>
                    ↓ Download WebM
                  </a>
                )}
              </div>
              <div className="details">
                <section>
                  <h2>Evidence</h2>
                  <p>
                    {clip.review_mode === "metadata-and-structure-only"
                      ? "Pinned metadata + structure."
                      : "Pinned README + source structure."}
                  </p>
                  <details>
                    <summary>Inspect sources</summary>
                    <ul>
                      {clip.evidence_urls.map((url, i) => (
                        <li key={url}>
                          <a href={url} target="_blank" rel="noreferrer">
                            {i === 0
                              ? "Captured commit"
                              : i === 1
                                ? "Pinned tree"
                                : url.includes("/pull/")
                                  ? "Change status"
                                  : "Source evidence"}{" "}
                            ↗
                          </a>
                        </li>
                      ))}
                    </ul>
                  </details>
                </section>
                <section>
                  <h2>State</h2>
                  <p>
                    {clip.change_state.replaceAll(" · ", " / ").toLowerCase()}.
                  </p>
                  <p className="limit">{clip.limit}</p>
                  <p className="limit">
                    Source snapshot:{" "}
                    {new Date(manifest.captured_at).toLocaleString("en-GB", {
                      timeZone: "America/Los_Angeles",
                    })}{" "}
                    Pacific.
                  </p>
                </section>
              </div>
            </>
          )}
          <footer>
            <span>Local rendering · one process</span>
            <a href="/data/manifest.json" target="_blank" rel="noreferrer">
              Open coverage manifest ↗
            </a>
          </footer>
        </main>
      </div>
    </div>
  );
}

createRoot(document.querySelector("#root")).render(<ScreeningRoom />);
