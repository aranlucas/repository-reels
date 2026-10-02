import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {Input,ALL_FORMATS,BufferSource,EncodedPacketSink} from 'mediabunny';
const manifest=JSON.parse(await readFile('manifest.json','utf8')),partial=process.argv.includes('--samples'),results=[];
if(!partial)assert.ok(manifest.clips.every(c=>c.render_status==='passed'),'Every included film must pass rendering');
const decoded=partial?null:JSON.parse(await readFile('evidence/verification-decode.json','utf8'));
if(decoded){assert.equal(decoded.complete,true);assert.equal(decoded.clips.length,manifest.clips.length);}
if(manifest.inventory_audit){
 const audit=manifest.inventory_audit;
 assert.equal(audit.total_owned_repositories,manifest.clips.length+audit.pending.length+audit.excluded.length);
 const names=[...manifest.clips,...audit.pending,...audit.excluded].map(c=>c.name);
 assert.equal(new Set(names).size,names.length,'Coverage categories cannot overlap');
}
for(const clip of manifest.clips.filter(c=>c.render_status==='passed')){
 const bytes=await readFile(`public/renders/${clip.name}.webm`),html=await readFile(`compositions/${clip.name}.html`);
 assert.equal(createHash('sha256').update(bytes).digest('hex'),clip.video_sha256,`${clip.name}: video hash`);
 assert.equal(createHash('sha256').update(html).digest('hex'),clip.composition_sha256,`${clip.name}: composition hash`);
 const input=new Input({formats:ALL_FORMATS,source:new BufferSource(bytes)});
 try{
  assert.equal(await input.canRead(),true);const track=await input.getPrimaryVideoTrack();assert.ok(track);
  const width=await track.getCodedWidth(),height=await track.getCodedHeight(),codec=await track.getCodec(),duration=await input.computeDuration(),stats=await track.computePacketStats();
  assert.equal(width,manifest.width);assert.equal(height,manifest.height);assert.equal(codec,'vp8');
  assert.ok(Math.abs(duration-manifest.duration)<.01,`${clip.name}: duration ${duration}`);
  assert.equal(stats.packetCount,manifest.fps*manifest.duration);assert.ok(Math.abs(stats.averagePacketRate-manifest.fps)<.01);
  const sink=new EncodedPacketSink(track);let previous=-1,keyframes=0;
  for await(const packet of sink.packets(undefined,undefined,{verifyKeyPackets:true})){
   assert.ok(packet.timestamp>previous,'Monotonic frame timestamps');previous=packet.timestamp;if(packet.type==='key')keyframes++;
  }
  assert.ok(keyframes>=3,'Seekable keyframes across all three scenes');
  for(const frame of [9,60,108]){
   const png=await readFile(`evidence/render/${clip.name}-${frame}.png`);assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.equal(png.readUInt32BE(16),manifest.width);assert.equal(png.readUInt32BE(20),manifest.height);
  }
  if(clip.review_mode==='metadata-and-structure-only'){assert.equal(clip.source_still,undefined);assert.ok(html.toString().includes('CONTENTS WITHHELD')||html.toString().includes('CONTENT WITHHELD'));}
  if(clip.capture_pr)assert.equal(clip.source_sha,clip.capture_pr.head_sha,'Prototype source is the inspected PR head');
  if(decoded){
   const record=decoded.clips.find(c=>c.name===clip.name);
   assert.ok(record,clip.name+': full decode evidence missing');assert.equal(record.status,'passed');
   assert.equal(record.video_sha256,clip.video_sha256,'Decode evidence must describe these exact video bytes');
   assert.equal(record.frames,144);assert.ok(Math.abs(record.last_end-12)<.01);assert.equal(record.samples.length,3);
  }
  results.push({name:clip.name,source_sha:clip.source_sha,video_sha256:clip.video_sha256,width,height,codec,duration,frames:stats.packetCount,keyframes,status:'passed'});
 }finally{input.dispose();}
}
const evidence={verified_at:new Date().toISOString(),complete:!partial,library:'mediabunny@1.61.0',clips:results};
await writeFile('evidence/verification-media.json',JSON.stringify(evidence,null,2)+'\n');
console.log(`Verified ${results.length} videos: VP8, 960×540, 12 seconds, 144 frames, source and media hashes.`);
