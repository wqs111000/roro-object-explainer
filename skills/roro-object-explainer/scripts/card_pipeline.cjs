#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
// Adapted from Roro Story Studio: portable references and dependency lookup; hash-bound checks.
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const hash = x => crypto.createHash('sha256').update(x).digest('hex');
const esc = x => String(x).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
function fail(msg) { throw new Error(msg); }
function assert(ok,msg) { if (!ok) fail(msg); }
const args=process.argv.slice(2), mode=args.shift();
function arg(name) { const i=args.indexOf(name); return i<0?null:args[i+1]; }
const specArg=arg('--spec'), outArg=arg('--out');
if (!['plan','render'].includes(mode)||!specArg||!outArg) {
  console.error('Usage: node card_pipeline.cjs plan|render --spec <json> --out <new-directory>'); process.exit(2);
}
const specPath=path.resolve(specArg), specDir=path.dirname(specPath), out=path.resolve(outArg);
const resolve=p=>path.resolve(specDir,p);
function text(value,label,max) {
  assert(typeof value==='string'&&value.trim(),`${label}: nonempty text required`);
  assert([...value].length<=max,`${label}: shorten text (maximum ${max} characters)`);
}
function refs(spec) {
  assert(Array.isArray(spec.references),'references must be an array (empty is allowed without a character)');
  if(spec.character) { text(spec.character.name,'character name',30); text(spec.character.description,'character description',300); assert(spec.references.some(r=>r.role==='character_identity'),'A character requires an inspected identity reference'); }
  return spec.references.map(r=>{
    assert(r.reviewed===true&&r.approved===true,'References must be approved and visually inspected');
    assert(typeof r.path==='string','Reference path required');
    const p=resolve(r.path), digest=hash(fs.readFileSync(p));
    assert(r.sha256===digest,`Stale/missing reference SHA-256: ${r.path}`);
    return {...r,path:p,sha256:digest};
  });
}
function validate(s) {
  assert(s.version===1,'Unsupported specification version'); text(s.object,'object',40); text(s.object_type,'object_type',60);
  text(s.title,'title',18); text(s.subtitle,'subtitle',40); text(s.mechanism,'mechanism',700);
  assert(Array.isArray(s.parts)&&s.parts.length>=3&&s.parts.length<=6,'Use 3–6 visible parts');
  s.parts.forEach((p,i)=>{text(p.name,`part ${i+1} name`,7);text(p.function,`part ${i+1} function`,10);});
  assert(Array.isArray(s.steps)&&s.steps.length>=1&&s.steps.length<=5,'Use 1–5 short mechanism steps');
  s.steps.forEach((v,i)=>text(v,`step ${i+1}`,15));
  if(s.observation) text(s.observation,'observation',35);
  assert(Array.isArray(s.sources)&&s.sources.length,'Record mechanism sources');
  s.sources.forEach(x=>{assert(/^https:\/\//.test(x.url),'Source needs HTTPS URL'); const host=new URL(x.url).hostname; assert(!/^(.*\.)?example\.(org|com|net)$/.test(host),'Replace the example source with a verified primary source');text(x.supports,'source supports',200);});
  assert(typeof s.illustration==='object'&&s.illustration,'Illustration settings required');
  text(s.illustration.composition,'composition',400);
  if(s.print_layout) assert(['single','a5-spread'].includes(s.print_layout.mode),'Unsupported print_layout mode');
}
function loadSharp() {
  const candidates=[process.env.RORO_SHARP_MODULE,'sharp'].filter(Boolean);
  for(const p of candidates) {try{return require(p);}catch(e){if(e.code!=='MODULE_NOT_FOUND')throw e;}}
  fail('sharp unavailable: run npm install in the repository, or install sharp in this skill folder');
}
function fresh(names) {
  for(const n of names) assert(!fs.existsSync(path.join(out,n)),`Output exists; choose a new revision directory: ${n}`);
  fs.mkdirSync(out,{recursive:true});
}
function save(name,obj) {fs.writeFileSync(path.join(out,name),JSON.stringify(obj,null,2)+'\n',{encoding:'utf8',flag:'wx'});}
function prompt(s) {
  return `原创四岁儿童科普绘本插画。物品：${s.object_type}。核心问题：${s.title}\n媒介：温暖的纸张和彩铅质感，轻水彩铺色，圆润清晰轮廓，柔和日光，暖奶油色与低饱和自然背景。金属为哑光插画质感，机械结构比背景清楚，不用摄影反光、塑料玩具渲染或CAD画面。\n关键部件：${s.parts.map(p=>p.name).join('、')}。真实工作关系：${s.mechanism}\n构图：${s.illustration.composition}\n${s.character ? `角色：${s.character.name}，${s.character.description}。身份以附带参考为准；完整角色在安全处观察，不裁切。` : "不添加人物或吉祥物。"}风格参考只用于纸张、笔触、色彩和光线，不复制人物、物件或场景。一个主要物品。\n3:2横版全画幅场景，环境与地面自然延伸到四边。无文字、数字、徽章、箭头、引线、边框、横幅、淡色底条、空白标题区或排版占位。标签与文字将在独立排版层添加。`;
}
async function main() {
  const raw=fs.readFileSync(specPath),s=JSON.parse(raw.toString('utf8').replace(/^\uFEFF/,'')); validate(s); const references=refs(s);
  const inputDigest=hash(raw), common={spec_path:specPath,spec_sha256:inputDigest,references,sources:s.sources};
  if(mode==='plan') {
    fresh(['generation-input.json']); save('generation-input.json',{...common,prompt:prompt(s),reference_attachment_paths:references.map(r=>r.path),state:'ready_for_generation',visual_acceptance:false});
    console.log(JSON.stringify({output:path.join(out,'generation-input.json')}));return;
  }
  const sharp=loadSharp(); const artPath=resolve(s.illustration.path||''),artBytes=fs.readFileSync(artPath),meta=await sharp(artBytes).metadata();
  assert(meta.width&&meta.height,'Image dimensions unavailable');
  assert(s.illustration.sha256===hash(artBytes),'Stale/missing illustration SHA-256');
  if(s.print_layout?.mode==='a5-spread') {
    await require('./spread_layout.cjs').renderSpread({s,sharp,out,resolve,artPath,artBytes,meta,common,inputDigest,hash,assert,fresh,save});
    return;
  }
  const W=1600,H=1132, panel={x:40,y:202,w:1088,h:726};
  const ratio=Math.min(panel.w/meta.width,panel.h/meta.height), artW=Math.round(meta.width*ratio),artH=Math.round(meta.height*ratio);
  const artX=panel.x+Math.round((panel.w-artW)/2),artY=panel.y+Math.round((panel.h-artH)/2);
  const colors=['#D87536','#3C9C98','#6687B9','#83A751','#B77AA1','#B79940'];
  const points=s.parts.map((p,i)=>{
    assert(Array.isArray(p.target_box)&&p.target_box.length===4&&p.target_box.every(Number.isFinite),`Part ${i+1}: target_box required`);
    const [x,y,w,h]=p.target_box;
    assert(x>=0&&y>=0&&w>0&&h>0&&x+w<=1&&y+h<=1,`Part ${i+1}: target_box out of bounds`);
    assert(Array.isArray(p.badge)&&p.badge.length===2&&p.badge.every(v=>Number.isFinite(v)&&v>=0&&v<=1),`Part ${i+1}: badge out of bounds`);
    const [bx,by]=p.badge;
    const dx=Math.max(x-bx,0,bx-x-w)*artW,dy=Math.max(y-by,0,by-y-h)*artH;
    assert(Math.hypot(dx,dy)<=38,`Part ${i+1}: badge too far from target box`);
    const point={x:artX+bx*artW,y:artY+by*artH};
    assert(point.x>=panel.x+26&&point.x<=panel.x+panel.w-26&&point.y>=panel.y+26&&point.y<=panel.y+panel.h-26,`Part ${i+1}: badge would be clipped`);
    return point;
  });
  points.forEach((p,i)=>points.slice(i+1).forEach(q=>assert(Math.hypot(p.x-q.x,p.y-q.y)>=54,'Number badges overlap; reposition them')));
  const cardX=1170,rowH=748/s.parts.length;
  const markers=points.map((p,i)=>`<circle cx="${p.x}" cy="${p.y}" r="25" fill="${colors[i]}" stroke="#fffaf0" stroke-width="5"/><text x="${p.x}" y="${p.y+10}" text-anchor="middle" font-size="28" font-weight="700" fill="white">${i+1}</text>`).join('');
  const labels=s.parts.map((p,i)=>{const y=214+i*rowH;return `<circle cx="${cardX+25}" cy="${y+37}" r="24" fill="${colors[i]}"/><text x="${cardX+25}" y="${y+47}" text-anchor="middle" fill="white" font-size="28" font-weight="700">${i+1}</text><text x="${cardX+65}" y="${y+36}" font-size="36" font-weight="700">${esc(p.name)}</text><text x="${cardX+65}" y="${y+82}" font-size="31" fill="#735c48">${esc(p.function)}</text><path d="M${cardX+65} ${y+rowH-14}h310" stroke="#dac8ab" stroke-width="2" stroke-dasharray="3 7"/>`;}).join('');
  const seq=s.steps.join(' → '); assert([...seq].length<=45,'Shorten mechanism steps to fit the A4 ribbon');
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><g font-family="Microsoft YaHei, Noto Sans CJK SC, sans-serif" fill="#513a27"><text x="45" y="95" font-size="65" font-weight="700">${esc(s.title)}</text><text x="46" y="150" font-size="29" fill="#7a624d">${esc(s.subtitle)}</text><text x="1360" y="120" font-size="20" fill="#997f5c">小小发现课</text>${markers}${labels}<path d="M45 995H1555" stroke="#e2cfaa" stroke-width="3"/><text x="48" y="1042" font-size="31" font-weight="700">${esc(seq)}</text>${s.observation?`<text x="48" y="1091" font-size="30" fill="#7a624d">${esc(s.observation)}</text>`:''}</g></svg>`;
  const files=['card-A4-300dpi.png','preview.png','layout.svg','manifest.json','technical-checks.json','object-card.json'];fresh(files);
  const art=await sharp(artBytes).resize(artW,artH,{fit:'fill'}).png().toBuffer();
  const canvas=await sharp({create:{width:W,height:H,channels:4,background:'#FFF8E9'}}).composite([{input:art,left:artX,top:artY},{input:Buffer.from(svg),left:0,top:0}]).png().toBuffer();
  await sharp(canvas).resize(3508,2480).withMetadata({density:300}).png().toFile(path.join(out,files[0]));
  await sharp(canvas).resize(1200,849).png().toFile(path.join(out,'preview.png'));
  fs.writeFileSync(path.join(out,'layout.svg'),svg,{encoding:'utf8',flag:'wx'});
  const snapshot=structuredClone(s);
  snapshot.illustration.path=path.relative(out,artPath);
  snapshot.references=references.map(r=>({...r,path:path.relative(out,r.path)}));
  save('object-card.json',snapshot);
  const m=await sharp(path.join(out,files[0])).metadata();assert(m.width===3508&&m.height===2480&&m.density===300,'Print metadata mismatch');
  save('technical-checks.json',{print_size:[m.width,m.height],dpi:m.density,source_dimensions:[meta.width,meta.height],layout_transform:{fit:'contain',x:artX,y:artY,width:artW,height:artH},normalized_coordinates:'pass',badge_proximity:'pass',badge_collisions:'pass',visual_checks:'not_checked'});
  const artifacts=[...files.slice(0,3),'object-card.json','technical-checks.json'].map(n=>({path:n,sha256:hash(fs.readFileSync(path.join(out,n)))}));
  save('manifest.json',{...common,illustration:{path:artPath,sha256:hash(artBytes),native_size:[meta.width,meta.height]},artifacts,package_digest:hash(JSON.stringify({inputDigest,artifacts,illustration:hash(artBytes)})),state:'awaiting_visual_review',publication:'not_published'});
  console.log(JSON.stringify({out,artifacts,visual_review:'required'}));
}
main().catch(e=>{console.error(e.message);process.exit(1);});
