// SPDX-License-Identifier: Apache-2.0
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const assert=(ok,msg)=>{if(!ok)throw Error(msg);};
const fileHash=p=>hash(fs.readFileSync(p));
function verify(manifestPath,reviewPath){
  const base=path.dirname(path.resolve(manifestPath)),m=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
  assert(m.state==='awaiting_visual_review','Unsupported card manifest');
  assert(fileHash(m.spec_path)===m.spec_sha256,'Stale specification');
  for(const r of m.references)assert(fileHash(r.path)===r.sha256,'Stale reference');
  assert(fileHash(m.illustration.path)===m.illustration.sha256,'Stale illustration');
  if(m.exterior)assert(fileHash(m.exterior.path)===m.exterior.sha256,'Stale exterior');
  const names=new Set();
  for(const a of m.artifacts){
    const target=path.resolve(base,a.path),relative=path.relative(base,target);
    assert(!path.isAbsolute(a.path)&&relative&&!relative.startsWith('..')&&!path.isAbsolute(relative),'Artifact outside package');
    assert(!names.has(a.path),'Duplicate artifact');names.add(a.path);
    assert(fileHash(target)===a.sha256,`Stale artifact: ${a.path}`);
  }
  for(const name of ['card-A4-300dpi.png','preview.png','layout.svg','object-card.json','technical-checks.json'])assert(names.has(name),`Missing artifact: ${name}`);
  const binding={inputDigest:m.spec_sha256,artifacts:m.artifacts,illustration:m.illustration.sha256};
  if(m.exterior)binding.exterior=m.exterior.sha256;
  assert(hash(JSON.stringify(binding))===m.package_digest,'Invalid package digest');
  const r=JSON.parse(fs.readFileSync(reviewPath,'utf8'));
  assert(r.package_digest===m.package_digest,'Stale review digest');
  assert(typeof r.reviewer==='string'&&r.reviewer.trim(),'Reviewer required');
  assert(r.verdict==='accept','Review has unresolved changes');
  const spec=JSON.parse(fs.readFileSync(path.join(base,'object-card.json'),'utf8'));
  for(const key of ['style','character_identity','mechanism','number_placement','number_text_matching','readability','no_occlusion']){
    const c=r.checks?.[key],na=key==='character_identity'&&!spec.character;
    assert(c&&(c.status==='accept'||(na&&c.status==='not_applicable'))&&typeof c.reason==='string'&&c.reason.trim(),`Unfinished check: ${key}`);
  }
  return {integrity:'pass',review_record:'current',publication:'not_published'};
}
if(require.main===module){
  const args=process.argv.slice(2),get=n=>args[args.indexOf(n)+1];
  try {assert(args.includes('--manifest')&&args.includes('--review'),'Usage: node verify_review.cjs --manifest <json> --review <json>');console.log(JSON.stringify(verify(get('--manifest'),get('--review'))));}
  catch(e){console.error(e.message);process.exitCode=1;}
}
module.exports={verify};
