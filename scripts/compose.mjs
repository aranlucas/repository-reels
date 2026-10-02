import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { makeReel } from '../src/reel.js';
import { curation, changes } from './curation.mjs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
async function optionalJson(path, fallback) {
  try { return JSON.parse(await readFile(path, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return fallback; throw error; }
}
const previous=JSON.parse(await readFile('manifest.json','utf8').catch(()=>'{"clips":[]}'));
const capture=JSON.parse(await readFile('evidence/source-review.json','utf8'));
const followUp=await optionalJson('evidence/follow-up/source-review.json',{repos:[]});
const sources=[...capture.repos,...followUp.repos];
assert.equal(new Set(sources.map(s=>s.name)).size,sources.length,'A follow-up must not replace or duplicate the original capture');
const statuses=[...JSON.parse(await readFile('evidence/pr-status.json','utf8')).prs,...(await optionalJson('evidence/follow-up/pr-status.json',{prs:[]})).prs];
const missing=sources.filter(source=>!curation[source.name]).map(source=>source.name);
if(missing.length)throw new Error(`Review curation before composing: ${missing.join(', ')}`);
const stills=[...(await optionalJson('evidence/source-stills.json',{stills:[]})).stills,...(await optionalJson('evidence/follow-up/source-stills.json',{stills:[]})).stills];
const manifest={version:1,private_delivery:true,captured_at:capture.captured_at,width:960,height:540,fps:12,duration:12,source:'Connected GitHub read-only inspection',omissions:capture.omissions||[],clips:[]};
manifest.snapshots=[{id:'original',captured_at:capture.captured_at,names:capture.repos.map(s=>s.name)}];
if(followUp.repos.length)manifest.snapshots.push({id:followUp.id,captured_at:followUp.captured_at,names:followUp.repos.map(s=>s.name)});
const audit=await optionalJson('evidence/inventory-audit.json',null);
if(audit){
  const additions=new Set(followUp.repos.map(s=>s.name));
  for(const name of additions)assert.ok(audit.pending.some(s=>s.name===name),'Follow-up must resolve a repository from the dated audit: '+name);
  manifest.inventory_audit={...audit,included_films:sources.length,pending:audit.pending.filter(s=>!additions.has(s.name)),...(additions.size?{reconciled_at:followUp.completed_capture_at||followUp.captured_at,note:'Film coverage reconciled against the original dated inventory; not a fresh account inventory.'}:{})};
}
await mkdir('compositions',{recursive:true});await mkdir('public/data',{recursive:true});
for(const source of sources){
  const tuple=curation[source.name];if(!tuple)throw new Error(`No reviewed curation for ${source.name}`);
  const [purpose,description,workflow,genre]=tuple,pr=statuses.find(p=>p.repo===source.name)||source.capture_pr;
  const protectedContent=source.review_mode==='metadata-and-structure-only';
  const clip={...source,purpose,description,workflow,genre,render_status:'pending',render_url:`/renders/${source.name}.webm`,poster_url:`/posters/${source.name}.png`,demo_title:protectedContent?'The structure, without the contents.':'The useful moment.',demo_note:protectedContent?'Metadata and repository structure only. Private content is not shown.':'Illustrated source workflow. Synthetic data; no live application or provider call.',change:changes[source.name],change_state:pr?(pr.merged?'MERGED SOURCE CHANGE · DEPLOYMENT UNVERIFIED':'PROPOSAL · UNMERGED'):'SOURCE CAPTURE · DEPLOYMENT UNVERIFIED',pr:pr||null,limit:source.name==='garmin-friend-finder'?'RELEASE BLOCKED: secure account/device migration is missing. No authenticated device flow is demonstrated.':protectedContent?'Sensitive contents withheld. This film describes purpose and structure only.':'Code and README captured at the pinned SHA. A merge is not evidence of deployment.',evidence_urls:[...source.evidence_urls,...(pr?[pr.url]:[])]};
  if(protectedContent&&source.name==='trading-mcp'){clip.change='A proposal changes unavailable-data handling.';clip.limit='No financial values, holdings, trades or live providers are shown. Proposal remains unmerged.';}
  clip.captured_at=source.captured_at||capture.captured_at;clip.snapshot_id=source.snapshot_id||'original';
  const followUpLimits={'orthogonal-router-rust-lab':'675 synthetic diagrams matched the reference exactly. Sampled checks do not prove all-input equivalence. Production routing is unchanged.',trailbraid:'Synthetic GPX routes. Raw ascent is unsmoothed; no navigation or hazard assessment. Deployment unverified.',framebreak:'Synthetic practice video. Silent exports depend on browser codecs; time stepping is not source-frame detection. Deployment unverified.','pocket-park':'Five abstract puck puzzles, not a skating simulation. Progress is local. Deployment unverified.'};
  if(followUpLimits[source.name])clip.limit=followUpLimits[source.name];
  if(source.name==='react-hook-form-mantine')clip.evidence_urls.push(`https://github.com/${source.full_name}/blob/${source.source_sha}/src/TextInput/TextInput.tsx`);
  if(source.name==='shipshape-mcp')clip.evidence_urls.push(`https://github.com/${source.full_name}/blob/${source.source_sha}/src/mcp.ts`);
  const still=stills.find(s=>s.name===clip.name&&s.source_sha===clip.source_sha);
  let stillData;
  if(still){clip.source_still=still;if(!clip.evidence_urls.includes(still.url))clip.evidence_urls.push(still.url);stillData='data:image/png;base64,'+(await readFile(`public/source-stills/${clip.name}.png`)).toString('base64');clip.demo_note=still.fit?still.kind:'Pinned source screenshot. The film does not run or verify the application.';}
  const html=makeReel({...clip,source_still_data:stillData}),hash=createHash('sha256').update(html).digest('hex'),old=previous.clips.find(c=>c.name===clip.name);
  if(old?.render_status==='passed'&&old.composition_sha256===hash){for(const key of ['render_status','video_bytes','video_sha256','rendered_at','render_seconds','keyframes','capture_engine','encoder','codec','composition_sha256'])clip[key]=old[key];}
  await writeFile(`compositions/${source.name}.html`,html);manifest.clips.push(clip);
}
await writeFile('manifest.json',JSON.stringify(manifest,null,2)+'\n');await writeFile('public/data/manifest.json',JSON.stringify(manifest,null,2)+'\n');
console.log(`Composed ${manifest.clips.length} private, source-pinned reels.`);
