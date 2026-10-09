const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );

export function validateReel(reel) {
  if (!reel || !/^[a-zA-Z0-9_.-]+$/.test(reel.name)) throw new Error("Invalid repository name");

  if (!/^[a-f0-9]{40}$/.test(reel.source_sha)) throw new Error("A pinned source SHA is required");

  if (reel.visibility !== "private" && reel.visibility !== "public")
    throw new Error("Repository visibility is required");

  if (
    !reel.purpose ||
    !reel.description ||
    !Array.isArray(reel.workflow) ||
    reel.workflow.length !== 3
  )
    throw new Error("Reviewed purpose and workflow required");

  if (
    !Array.isArray(reel.evidence_urls) ||
    !reel.evidence_urls.length ||
    reel.evidence_urls.some((url) => !url.startsWith("https://github.com/aranlucas/"))
  )
    throw new Error("Owned-repository evidence links required");

  if (
    reel.source_still_data &&
    !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(reel.source_still_data)
  )
    throw new Error("Source still must be an embedded PNG");

  if (reel.source_still_data && reel.review_mode === "metadata-and-structure-only")
    throw new Error("Protected contents cannot have source screenshots");

  return reel;
}

function seekRuntime() {
  const scenes = [...document.querySelectorAll(".scene")],
    ticks = [...document.querySelectorAll(".tick")],
    root = document.querySelector("#reel");

  let time = 0,
    playing = false,
    raf,
    last = 0;

  function seek(t) {
    time = Math.max(0, Math.min(11.999, t));

    const index = Math.floor(time / 4),
      p = (time - index * 4) / 4;

    root.dataset.scene = String(index);
    scenes.forEach((el, i) => {
      el.style.display = i === index ? "flex" : "none";
    });
    const current = scenes[index];
    current.querySelectorAll("[data-move]").forEach((el, i) => {
      const progress = Math.max(0, Math.min(1, (p * 4 - i * 0.12) / 0.6));
      el.style.transform = `translateY(${(1 - progress) * 16}px)`;
      el.style.opacity = String(progress);
    });
    ticks.forEach((el, i) => {
      el.style.background = i <= index ? "var(--accent)" : "#777b71";
    });
    const marker = document.querySelector(".marker");

    if (marker)
      marker.style.transform = `translate(${Math.sin(p * Math.PI * 2) * 160}px,${Math.cos(p * Math.PI * 2) * 28}px) rotate(${Math.sin(p * Math.PI) * 6}deg)`;
    const still = document.querySelector(".source-still");

    if (still) still.style.transform = `scale(${1 + p * 0.025})`;
  }

  function tick(now) {
    if (!playing) return;
    const next = Math.min(12, time + (now - last) / 1000);
    last = now;
    seek(next);

    if (next >= 12) {
      playing = false;

      return;
    }

    raf = requestAnimationFrame(tick);
  }

  const timeline = {
    duration: () => 12,
    totalDuration: () => 12,
    time: () => time,
    seek: (t) => {
      seek(t);

      return timeline;
    },
    play: () => {
      if (playing) return timeline;
      playing = true;
      last = performance.now();
      raf = requestAnimationFrame(tick);

      return timeline;
    },
    pause: () => {
      playing = false;
      cancelAnimationFrame(raf);

      return timeline;
    },
    paused: () => !playing,
  };

  window.__timelines = { reel: timeline };
  window.__hf = { duration: 12, seek };
  window.__player = { getDuration: () => 12 };
  window.reelTimeline = timeline;
  seek(0.7);
}

function workflowGraphic(reel) {
  const nodes = reel.workflow
    .map((s, i) => `<div class="node ${i === 1 ? "active" : ""}">${escape(s)}</div>`)
    .join('<span class="arrow">→</span>');

  if (reel.name === "delivery-dash")
    return `<div class="game-map"><div class="road road-a"></div><div class="road road-b"></div><div class="block b1"></div><div class="block b2"></div><div class="block b3"></div><div class="marker">↗</div></div><div class="flow">${nodes}</div>`;

  if (reel.genre === "outdoors")
    return `<svg class="mountains" viewBox="0 0 700 120" aria-hidden="true"><path d="M0 120L110 32L180 84L300 0L410 95L505 33L700 120" fill="none" stroke="currentColor" stroke-width="2"/><path d="M0 110Q190 0 340 92T700 58" fill="none" stroke="var(--accent)" stroke-width="6" stroke-dasharray="8 8"/></svg><div class="flow">${nodes}</div>`;

  if (reel.genre === "hardware")
    return `<div class="hardware"><div class="device"><i></i><i></i><i></i><b></b></div><div class="flow">${nodes}</div></div>`;

  if (reel.genre === "structure")
    return `<div class="structure-lines"><span></span><span></span><span></span></div><div class="flow">${nodes}</div>`;

  return `<div class="flow">${nodes}</div>`;
}

export function makeReel(input) {
  const reel = validateReel(input),
    e = escape;

  const accent =
    {
      library: "#d8ed43",
      backend: "#a8c5ff",
      app: "#ffae88",
      game: "#d8ed43",
      outdoors: "#93cab2",
      hardware: "#d3b9ee",
      structure: "#cbcbbd",
    }[reel.genre] || "#d8ed43";

  const special = reel.name === "react-hook-form-mantine";

  const sample = special
    ? '&lt;TextInput<br>&nbsp; name="displayName"<br>&nbsp; control={control}<br>/&gt;'
    : reel.workflow.map((s) => e(s)).join('<br><span class="code-arrow">↓</span><br>');

  const privacy =
    reel.review_mode === "metadata-and-structure-only"
      ? "STRUCTURE ONLY · CONTENT WITHHELD"
      : "ILLUSTRATED WORKFLOW · SYNTHETIC DATA";

  const tonight = reel.change || "Follow the source.";

  const demo = reel.source_still_data
    ? `<img class="source-still" alt="Pinned source screenshot" src="${reel.source_still_data}"><div class="still-label">SOURCE SCREENSHOT · ${e(reel.source_sha.slice(0, 7))}</div><div class="still-caption">${e(reel.workflow.join(" → "))}</div>`
    : `<div class="mono" data-move>${e(privacy)}</div><h2 data-move>${e(reel.demo_title || "The useful moment.")}</h2><div data-move>${workflowGraphic(reel)}</div><p data-move>${e(reel.demo_note || "A source-backed explanation, without provider calls or personal data.")}</p>`;

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src data:; connect-src 'none'"><title>${e(reel.name)} · private reel</title><style>
  *{box-sizing:border-box}html,body{margin:0;width:960px;height:540px;overflow:hidden;background:#f4f1e9;color:#232720}body{font-family:Menlo,monospace}#reel{background:#f4f1e9;--accent:${accent};width:960px;height:540px;position:relative}.scene{background:#f4f1e9;height:100%;width:100%;position:absolute;display:none;flex-direction:column;padding:42px 40px 54px}.mono{font-size:15px;line-height:1.5}.repo{position:absolute;top:21px;left:40px;font-size:13px;z-index:5}.privacy{position:absolute;bottom:18px;left:40px;font-size:10px;z-index:5}.proof{position:absolute;bottom:18px;right:28px;font-size:10px;z-index:5}.ticks{position:absolute;right:26px;top:26px;display:flex;gap:6px;z-index:5}.tick{width:32px;height:3px}h1,h2{font-family:Impact,Haettenschweiler,'Arial Narrow',sans-serif;font-weight:500;letter-spacing:-1px;margin:24px 0;font-size:90px;line-height:1.05}h2{font-size:62px;max-width:830px}.intro h1{max-width:560px;font-size:${reel.purpose.length > 32 ? 76 : 90}px}.intro{padding-right:362px;justify-content:center}.intro p{max-width:525px;font-size:17px;line-height:1.5;margin:8px 0}.code{position:absolute;right:0;top:0;width:320px;height:100%;background:#232720;color:#f4f1e9;display:flex;align-items:center;justify-content:center;flex-direction:column;padding:28px;gap:24px;font-size:17px;line-height:1.8}.code code{max-width:264px;overflow-wrap:anywhere;color:var(--accent)}.code small{font-size:11px;line-height:1.6;opacity:.8}.code-arrow{color:#f4f1e9}.flow{display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;margin-top:24px}.node{flex:1;min-height:88px;display:flex;align-items:center;justify-content:center;text-align:center;border:1.5px solid #232720;padding:12px;font-size:18px;line-height:1.4}.active{background:var(--accent)}.arrow{font-size:30px}.intro .flow{gap:8px;margin-top:22px}.intro .node{font-size:12px;min-height:66px}.intro .arrow{font-size:22px}.demo{justify-content:center}.demo h2{margin:14px 0}.demo .flow{max-width:850px}.demo p{font-size:15px;line-height:1.5;max-width:780px}.change{background:#232720;color:#f4f1e9;justify-content:center}.change .state{color:var(--accent);font-size:15px;text-transform:uppercase;letter-spacing:1px}.change h2{font-size:60px;line-height:1.1}.change p{font-size:15px;line-height:1.6;max-width:810px}.change .tag{display:inline-block;border-top:1px solid #686d60;padding-top:12px}.mountains{height:110px;width:85%;margin:8px auto 0}.game-map{position:relative;width:610px;height:120px;background:#dbe3d3;margin:2px auto;overflow:hidden}.road{position:absolute;background:#232720;border:3px solid #f4f1e9}.road-a{height:48px;width:680px;top:37px;left:-30px;transform:rotate(-10deg)}.road-b{height:180px;width:60px;left:370px;top:-25px;transform:rotate(32deg)}.block{position:absolute;border:2px solid #232720;background:var(--accent)}.b1{left:80px;top:7px;width:60px;height:35px}.b2{left:240px;top:87px;width:90px;height:35px}.b3{left:480px;top:5px;width:85px;height:24px}.marker{position:absolute;left:280px;top:50px;width:32px;height:22px;background:var(--accent);font-size:24px;line-height:22px;text-align:center}.device{display:flex;align-items:center;justify-content:center;gap:14px;width:240px;height:110px;border:2px solid #232720;border-radius:12px;margin:10px auto;background:#232720}.device i{width:44px;height:44px;border:2px solid #f4f1e9;background:var(--accent)}.device b{width:32px;height:32px;border-radius:50%;background:#f4f1e9}.structure-lines{display:flex;justify-content:center;gap:20px;margin:20px auto}.structure-lines span{width:85px;height:52px;border:1px solid #232720;border-bottom:7px solid var(--accent)}
  #reel[data-scene="0"] .proof,#reel[data-scene="2"] .repo,#reel[data-scene="2"] .privacy,#reel[data-scene="2"] .proof{color:#f4f1e9}
  .with-still{padding:0;overflow:hidden;background:#232720}.source-still{position:absolute;inset:0;width:960px;height:540px;object-fit:cover}.still-label,.still-caption{position:absolute;left:40px;background:#232720;color:#f4f1e9;padding:12px 16px;z-index:3;font-size:13px}.still-label{top:65px}.still-caption{bottom:55px;max-width:860px;line-height:1.6}${reel.source_still_data ? '#reel[data-scene="1"] .repo,#reel[data-scene="1"] .privacy,#reel[data-scene="1"] .proof{color:#f4f1e9;background:#232720;padding:4px 8px;}' : ""}
  </style></head><body><main id="reel" data-composition-id="reel" data-width="960" data-height="540" data-duration="12"><div class="repo">${e(reel.full_name)} · PRIVATE DRAFT</div><div class="ticks"><i class="tick"></i><i class="tick"></i><i class="tick"></i></div><section class="scene intro"><h1 data-move>${e(reel.purpose)}</h1><p data-move>${e(reel.description)}</p><div class="flow" data-move>${reel.workflow.map((s, i) => `<div class="node ${i === 1 ? "active" : ""}">${e(s)}</div>`).join('<span class="arrow">→</span>')}</div><aside class="code"><code>${sample}</code><small>${special ? "Source example, shortened.<br>TextInput wrapper inspected." : "An abstract product workflow.<br>Not a running application."}</small></aside></section><section class="scene demo ${reel.source_still_data ? "with-still" : ""}">${demo}</section><section class="scene change"><div class="state" data-move>${e(reel.change_state || "SOURCE CAPTURE")}</div><h2 data-move>${e(tonight)}</h2><p class="tag" data-move>${e(reel.limit || "Default-branch code captured. Runtime and deployment status were not verified.")}</p></section><div class="privacy">${e(privacy)}</div><div class="proof">${e(reel.name)} / ${e(reel.source_sha.slice(0, 7))}</div></main><script>(${seekRuntime.toString()})();</script></body></html>`;
}
