import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, writeFile } from "node:fs/promises";

const run = promisify(execFile);

async function api(path) {
  const { stdout } = await run("gh", ["api", path], {
    timeout: 30000,
    maxBuffer: 1024 * 1024,
  });

  return JSON.parse(stdout);
}

const previous = JSON.parse(
  await readFile("evidence/source-review.json", "utf8"),
);

const oldPrs = JSON.parse(
  await readFile("evidence/pr-status.json", "utf8"),
).prs;

const { stdout } = await run(
  "gh",
  [
    "repo",
    "list",
    "aranlucas",
    "--limit",
    "100",
    "--json",
    "name,isPrivate,isFork,defaultBranchRef,url",
  ],
  { timeout: 30000 },
);

const owned = JSON.parse(stdout),
  captured_at = new Date().toISOString(),
  repos = [],
  omissions = [];

const protect = new Set(
  previous.repos
    .filter((r) => r.review_mode === "metadata-and-structure-only")
    .map((r) => r.name),
);

protect.add("oral-board-local-lab");

protect.add("paper-options-lab");

for (const repo of owned.sort((a, b) => a.name.localeCompare(b.name))) {
  if (repo.name === "repository-reels") {
    omissions.push({
      name: repo.name,
      reason:
        "This collection/pipeline itself; excluded to avoid recursive self-coverage.",
    });
    continue;
  }

  if (!repo.defaultBranchRef?.name) {
    omissions.push({
      name: repo.name,
      reason: "No default-branch source was available at this capture.",
    });
    continue;
  }

  const full_name = "aranlucas/" + repo.name;

  let branch = await api(
      `repos/${full_name}/branches/${encodeURIComponent(repo.defaultBranchRef.name)}`,
    ),
    source_sha = branch.commit.sha,
    capture_pr = null,
    root;

  const old = previous.repos.find((r) => r.name === repo.name);

  if (!old || (old.root_directory_count === 0 && old.root_file_count <= 2)) {
    root = await api(`repos/${full_name}/contents?ref=${source_sha}`);

    if (root.length <= 2 && !root.some((r) => r.type === "dir")) {
      const proposals = await api(
          `repos/${full_name}/pulls?state=open&per_page=10`,
        ),
        proposal = proposals.find((p) => p.head.repo?.full_name === full_name);

      if (!proposal) {
        omissions.push({
          name: repo.name,
          reason:
            "Default branch is a documentation bootstrap; no reviewable implementation PR was available.",
        });
        continue;
      }

      source_sha = proposal.head.sha;
      branch = await api(`repos/${full_name}/commits/${source_sha}`);
      branch = { commit: branch };
      root = await api(`repos/${full_name}/contents?ref=${source_sha}`);
      capture_pr = {
        repo: repo.name,
        number: proposal.number,
        url: proposal.html_url,
        state: proposal.state,
        draft: proposal.draft,
        merged: false,
        head_sha: source_sha,
        title: proposal.title,
      };
    }
  }

  let entry = {
    ...old,
    name: repo.name,
    full_name,
    visibility: repo.isPrivate ? "private" : "public",
    is_fork: repo.isFork,
    default_branch: repo.defaultBranchRef.name,
    source_sha,
    commit_date: branch.commit.commit.author.date,
    commit_message: branch.commit.commit.message.split("\n")[0],
    source_url: `https://github.com/${full_name}/commit/${source_sha}`,
    review_mode: protect.has(repo.name)
      ? "metadata-and-structure-only"
      : "README-and-structure",
    capture_pr,
  };

  if (old?.source_sha !== source_sha) {
    root ||= await api(`repos/${full_name}/contents?ref=${source_sha}`);
    entry.root_file_count = root.filter((r) => r.type === "file").length;
    entry.root_directory_count = root.filter((r) => r.type === "dir").length;
    entry.readme_path =
      root.find((r) => /^readme\.md$/i.test(r.name))?.path || null;
    entry.package_path =
      root.find((r) =>
        [
          "package.json",
          "go.mod",
          "pom.xml",
          "pyproject.toml",
          "Cargo.toml",
        ].includes(r.name),
      )?.path || null;

    if (!protect.has(repo.name)) entry.root_names = root.map((r) => r.name);
    else delete entry.root_names;

    if (entry.readme_path && !protect.has(repo.name)) {
      const readme = await api(
        `repos/${full_name}/contents/${entry.readme_path}?ref=${source_sha}`,
      );

      // A bounded local reviewer excerpt, not retained in the source evidence artifact.
      console.log(
        `REVIEW ${repo.name} ${source_sha}\n${Buffer.from(readme.content, "base64").toString("utf8").slice(0, 5000)}`,
      );
    }
  }

  entry.evidence_urls = [
    entry.source_url,
    `https://github.com/${full_name}/tree/${source_sha}`,
    ...(entry.readme_path && !protect.has(repo.name)
      ? [
          `https://github.com/${full_name}/blob/${source_sha}/${entry.readme_path}`,
        ]
      : []),
  ];
  repos.push(entry);
}

const prs = [];

for (const old of oldPrs) {
  const pr = await api(`repos/aranlucas/${old.repo}/pulls/${old.number}`);
  prs.push({
    repo: old.repo,
    number: pr.number,
    url: pr.html_url,
    state: pr.state,
    draft: pr.draft,
    merged: pr.merged,
    merged_at: pr.merged_at,
    head_sha: pr.head.sha,
    merge_commit_sha: pr.merge_commit_sha,
    title: pr.title,
  });
}

await writeFile(
  "evidence/source-review.json",
  JSON.stringify({ captured_at, repos, omissions }, null, 2) + "\n",
);

await writeFile(
  "evidence/inventory.json",
  JSON.stringify(
    {
      captured_at,
      repos: repos.map(
        ({ root_names: _rootNames, evidence_urls: _evidenceUrls, ...r }) => r,
      ),
      omissions,
    },
    null,
    2,
  ) + "\n",
);

await writeFile(
  "evidence/pr-status.json",
  JSON.stringify({ captured_at: new Date().toISOString(), prs }, null, 2) +
    "\n",
);

console.log(
  `Captured ${repos.length} source repositories; ${omissions.length} explicit omissions.`,
);
