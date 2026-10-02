import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const json = async path => JSON.parse(await readFile(new URL('../' + path, import.meta.url), 'utf8'));
const manifest = await json('manifest.json');
const baseline = await json('evidence/follow-up/original-film-hashes.json');
const followUp = await json('evidence/follow-up/source-review.json');

test('a follow-up preserves the original source pins, composition hashes and actual video bytes', async () => {
  assert.equal(baseline.films.length, 56);
  assert.equal(manifest.captured_at, baseline.captured_at);
  for (const old of baseline.films) {
    const clip = manifest.clips.find(c => c.name === old.name);
    assert.ok(clip, old.name + ' missing');
    for (const field of ['source_sha', 'composition_sha256', 'video_sha256']) assert.equal(clip[field], old[field]);
    assert.equal(clip.snapshot_id, 'original');
    assert.equal(clip.captured_at, baseline.captured_at);
    const bytes = await readFile(new URL('../public/renders/' + old.name + '.webm', import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), old.video_sha256);
  }
});

test('follow-up films use separately dated exact merged sources and matching main CI evidence', async () => {
  const statuses = (await json('evidence/follow-up/pr-status.json')).prs;
  const captures = (await json('evidence/follow-up/remote-capture.json')).repos;
  captures.push(await json('evidence/follow-up/rust-lab-capture.json'));
  assert.equal(followUp.repos.length, 4);
  assert.deepEqual(manifest.snapshots.map(s => s.names.length), [56, 4]);
  for (const source of followUp.repos) {
    const clip = manifest.clips.find(c => c.name === source.name);
    const status = statuses.find(s => s.repo === source.name);
    const capture = captures.find(c => c.name === source.name);
    assert.equal(clip.snapshot_id, 'follow-up-1');
    assert.equal(clip.captured_at, source.captured_at);
    assert.ok(Date.parse(clip.captured_at) > Date.parse(baseline.captured_at));
    assert.equal(clip.source_sha, status.merge_commit_sha);
    assert.equal(clip.source_sha, capture.sha);
    assert.equal(status.merged, true);
    assert.ok(capture.main_ci.some(c => c.head_sha === clip.source_sha && c.conclusion === 'success'));
    assert.match(clip.change_state, /DEPLOYMENT UNVERIFIED/);
  }
});

test('coverage resolves the four dated pending names without rewriting the historical inventory', async () => {
  const audit = await json('evidence/inventory-audit.json');
  assert.equal(audit.included_films, 56);
  assert.equal(audit.pending.length, 4);
  assert.equal(manifest.inventory_audit.captured_at, audit.captured_at);
  assert.equal(manifest.inventory_audit.included_films, 60);
  assert.deepEqual(manifest.inventory_audit.pending, []);
  assert.equal(manifest.inventory_audit.total_owned_repositories, 61);
  assert.deepEqual(manifest.inventory_audit.excluded, audit.excluded);
  assert.equal(new Set(manifest.clips.map(c => c.name)).size, 60);
});

test('local screenshots retain exact image hashes and do not invent upstream screenshot paths', async () => {
  const stills = (await json('evidence/follow-up/source-stills.json')).stills;
  assert.equal(stills.length, 3);
  for (const still of stills) {
    const bytes = await readFile(new URL('../' + still.path, import.meta.url));
    const clip = manifest.clips.find(c => c.name === still.name);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), still.sha256);
    assert.equal(still.source_sha, clip.source_sha);
    assert.equal(still.url, clip.source_url);
    assert.match(still.kind, /not committed upstream/);
  }
});
