import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const run=promisify(execFile),review=JSON.parse(await readFile('evidence/source-review.json','utf8'));
const candidates={'lanternwake':'evidence/first-echo.png','elsewhere-by-post':'evidence/desktop-echo-map.png','spoonworld':'evidence/desktop-bubble-ferry.png'};
await mkdir('public/source-stills',{recursive:true});const stills=[];
for(const [name,path] of Object.entries(candidates)){
 const source=review.repos.find(r=>r.name===name);if(!source)continue;
 const {stdout}=await run('gh',['api',`repos/${source.full_name}/contents/${path}?ref=${source.source_sha}`],{timeout:30000,maxBuffer:12*1024*1024});
 const asset=JSON.parse(stdout);let content=asset.content;
 if(asset.encoding!=='base64'){const blob=await run('gh',['api',`repos/${source.full_name}/git/blobs/${asset.sha}`],{timeout:30000,maxBuffer:12*1024*1024});content=JSON.parse(blob.stdout).content;}
 const bytes=Buffer.from(content,'base64');
 if(bytes.length>8*1024*1024||bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw new Error('Invalid or oversized source PNG');
 await writeFile(`public/source-stills/${name}.png`,bytes);
 stills.push({name,path,source_sha:source.source_sha,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,url:`https://github.com/${source.full_name}/blob/${source.source_sha}/${path}`,kind:'Source screenshot; local illustration, not a live application capture'});
 console.log(name,bytes.length);
}
await writeFile('evidence/source-stills.json',JSON.stringify({captured_at:new Date().toISOString(),stills},null,2)+'\n');
