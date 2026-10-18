// SPDX-License-Identifier: Apache-2.0
// Adapted from Roro Story Studio: neutral labels and hash-bound technical checks.
'use strict';
const fs=require('node:fs'),path=require('node:path');
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const colors=['#D87536','#3C9C98','#6687B9','#83A751','#B77AA1','#B79940'];
// One text unit is approximately 0.526 pt on the final 300-dpi print.
function lines(text,max){
  const chars=Array.from(text),rows=[];
  while(chars.length){let n=Math.min(max,chars.length);if(chars[n]&&'，。？！：；、）》'.includes(chars[n]))n++;rows.push(chars.splice(0,n).join(''));}
  return rows;
}
function textBlock(text,x,y,size,max,{fill='#513a27',weight=400,leading=size*1.35}={}){
  return `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" font-weight="${weight}">${lines(text,max).map((row,i)=>`<tspan x="${x}" dy="${i?leading:0}">${escape(row)}</tspan>`).join('')}</text>`;
}
function contain(meta,box){const ratio=Math.min(box.w/meta.width,box.h/meta.height);const width=Math.round(meta.width*ratio),height=Math.round(meta.height*ratio);return{x:box.x+Math.round((box.w-width)/2),y:box.y+Math.round((box.h-height)/2),width,height};}
function sequenceLines(steps,max=24){const rows=[];let current='';for(const step of steps){const next=current?current+' → '+step:step;if(Array.from(next).length>max&&current){rows.push(current);current='→ '+step;}else current=next;}if(current)rows.push(current);return rows;}
async function renderSpread(c){
  const {s,sharp,out,resolve,artPath,artBytes,meta,common,inputDigest,hash,assert,fresh,save}=c;
  const exterior=s.print_layout.exterior;
  assert(exterior?.path&&exterior?.sha256,'The two-page print needs a hash-bound exterior view');
  const exteriorPath=resolve(exterior.path),exteriorBytes=fs.readFileSync(exteriorPath),exteriorMeta=await sharp(exteriorBytes).metadata();
  assert(hash(exteriorBytes)===exterior.sha256,'Stale/missing exterior SHA-256');
  assert(exteriorMeta.width&&exteriorMeta.height,'Exterior dimensions unavailable');
  const left=contain(exteriorMeta,{x:44,y:312,w:712,h:540}),right=contain(meta,{x:844,y:168,w:712,h:537});
  const points=s.parts.map((p,i)=>{
    assert(Array.isArray(p.target_box)&&p.target_box.length===4&&p.target_box.every(Number.isFinite),`Part ${i+1}: target_box required`);
    const [x,y,w,h]=p.target_box;assert(x>=0&&y>=0&&w>0&&h>0&&x+w<=1&&y+h<=1,`Part ${i+1}: target_box out of bounds`);
    assert(Array.isArray(p.badge)&&p.badge.length===2&&p.badge.every(v=>Number.isFinite(v)&&v>=0&&v<=1),`Part ${i+1}: badge out of bounds`);
    const [bx,by]=p.badge,dx=Math.max(x-bx,0,bx-x-w)*right.width,dy=Math.max(y-by,0,by-y-h)*right.height;
    assert(Math.hypot(dx,dy)<=38,`Part ${i+1}: badge too far from target`);
    return{x:right.x+bx*right.width,y:right.y+by*right.height};
  });
  points.forEach((p,i)=>{assert(p.x>=822&&p.x<=1578&&p.y>=147&&p.y<=727,`Part ${i+1}: number clipped`);points.slice(i+1).forEach(q=>assert(Math.hypot(p.x-q.x,p.y-q.y)>=43,'Number badges overlap in A5 layout'));});
  const markers=points.map((p,i)=>`<circle cx="${p.x}" cy="${p.y}" r="21" fill="${colors[i]}" stroke="#fffaf0" stroke-width="4"/><text x="${p.x}" y="${p.y+9}" text-anchor="middle" fill="white" font-size="27" font-weight="700">${i+1}</text>`).join('');
  const labels=s.parts.map((p,i)=>{const x=844+(i%2)*360,y=754+Math.floor(i/2)*96;return `<circle cx="${x+18}" cy="${y-11}" r="18" fill="${colors[i]}"/><text x="${x+18}" y="${y-3}" text-anchor="middle" fill="white" font-size="24" font-weight="700">${i+1}</text>${textBlock(p.name,x+50,y,33,8,{weight:700})}${textBlock(p.function,x+50,y+37,30,9,{fill:'#735c48',leading:32})}`;}).join('');
  const sequence=sequenceLines(s.steps);assert(sequence.length<=2&&sequence.every(row=>Array.from(row).length<=24),'Shorten the working sequence for the two-page print');
  const observation=s.observation||'看一看：外面和里面，哪里不一样？';assert(lines(observation,21).length<=2,'Shorten the observation for the A5 page');
  const flowText=`<text x="844" y="1066" font-size="29" font-weight="700">${sequence.map((row,i)=>`<tspan x="844" dy="${i?37:0}">${escape(row)}</tspan>`).join('')}</text>`;
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1132"><g font-family="Microsoft YaHei, Noto Sans CJK SC, sans-serif" fill="#513a27"><path d="M800 20V1112" stroke="#d9cbb5" stroke-width="1.5" stroke-dasharray="4 9"/><text x="44" y="61" font-size="24" letter-spacing="2" fill="#637760">01 · 看看外面</text>${textBlock(s.title,44,137,50,13,{weight:700,leading:62})}${textBlock(s.subtitle,46,239,31,22,{fill:'#735c48',leading:40})}<text x="44" y="903" font-size="30" fill="#735c48">从外面看到里面，发现工作的小秘密。</text><path d="M44 941H756" stroke="#dbc8a8" stroke-width="2"/>${textBlock(observation,44,991,32,21,{weight:700,leading:44})}<text x="844" y="61" font-size="24" letter-spacing="2" fill="#637760">02 · 看看里面</text><text x="844" y="125" font-size="42" font-weight="700">${s.parts.length} 位小帮手，一起工作</text>${markers}${labels}<path d="M844 1030H1556" stroke="#dbc8a8" stroke-width="2"/>${flowText}<text x="44" y="1112" font-size="19" fill="#967e60">小小发现</text><text x="756" y="1112" font-size="19" text-anchor="end" fill="#967e60">1</text><text x="1556" y="1112" font-size="19" text-anchor="end" fill="#967e60">2</text></g></svg>`;
  const files=['card-A4-300dpi.png','card-A5-01-300dpi.png','card-A5-02-300dpi.png','preview.png','layout.svg','manifest.json','technical-checks.json','object-card.json'];fresh(files);
  const composite=await sharp({create:{width:1600,height:1132,channels:4,background:'#FFF8E9'}}).composite([
    {input:await sharp(exteriorBytes).resize(left.width,left.height).png().toBuffer(),left:left.x,top:left.y},
    {input:await sharp(artBytes).resize(right.width,right.height).png().toBuffer(),left:right.x,top:right.y},
    {input:Buffer.from(svg),left:0,top:0},
  ]).png().toBuffer();
  const print=await sharp(composite).resize(3508,2480).withMetadata({density:300}).png().toBuffer();
  fs.writeFileSync(path.join(out,files[0]),print,{flag:'wx'});
  for(let i=0;i<2;i++)await sharp(print).extract({left:i*1754+3,top:0,width:1748,height:2480}).withMetadata({density:300}).png().toFile(path.join(out,files[i+1]));
  await sharp(composite).resize(1600,1132).png().toFile(path.join(out,'preview.png'));
  fs.writeFileSync(path.join(out,'layout.svg'),svg,{encoding:'utf8',flag:'wx'});
  const snapshot=structuredClone(s);snapshot.illustration.path=path.relative(out,artPath);snapshot.print_layout.exterior.path=path.relative(out,exteriorPath);snapshot.references=common.references.map(r=>({...r,path:path.relative(out,r.path)}));save('object-card.json',snapshot);
  const printMeta=await sharp(print).metadata();assert(printMeta.width===3508&&printMeta.height===2480&&printMeta.density===300,'A4 print metadata mismatch');
  save('technical-checks.json',{print_size:[3508,2480],dpi:300,layout:'two-a5-portrait-on-a4-landscape',a5_size:[1748,2480],fold_x:1754,page_order:['exterior','interior'],layout_transform:{exterior:{fit:'contain',...left},interior:{fit:'contain',...right}},minimum_body_font_pt:15.25,normalized_coordinates:'pass',badge_proximity:'pass',badge_collisions:'pass',visual_checks:'not_checked'});
  const artifacts=files.filter(n=>n!=='manifest.json').map(n=>({path:n,sha256:hash(fs.readFileSync(path.join(out,n)))}));
  const exteriorRecord={path:exteriorPath,sha256:hash(exteriorBytes),native_size:[exteriorMeta.width,exteriorMeta.height]};
  save('manifest.json',{...common,illustration:{path:artPath,sha256:hash(artBytes),native_size:[meta.width,meta.height]},exterior:exteriorRecord,artifacts,package_digest:hash(JSON.stringify({inputDigest,artifacts,illustration:hash(artBytes),exterior:exteriorRecord.sha256})),state:'awaiting_visual_review',publication:'not_published'});
  console.log(JSON.stringify({out,layout:'a5-spread',visual_review:'required'}));
}
module.exports={renderSpread,lines,contain,sequenceLines};
