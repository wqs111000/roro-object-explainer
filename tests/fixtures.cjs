// SPDX-License-Identifier: Apache-2.0
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),sharp=require('sharp');
const hash=data=>crypto.createHash('sha256').update(data).digest('hex');
const json=(file,data)=>fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n');
function wav(file,{rate=8000,frames=800,width=2}={}){
  const data=Buffer.alloc(frames*width),header=Buffer.alloc(44);
  // A quiet synthetic tone for a tool self-check, not generated narration.
  if(width===2)for(let i=0;i<frames;i++)data.writeInt16LE(Math.round(Math.sin(i*2*Math.PI*440/rate)*500),i*2);
  header.write('RIFF');header.writeUInt32LE(36+data.length,4);header.write('WAVEfmt ',8);header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);header.writeUInt16LE(1,22);header.writeUInt32LE(rate,24);header.writeUInt32LE(rate*width,28);header.writeUInt16LE(width,32);header.writeUInt16LE(width*8,34);header.write('data',36);header.writeUInt32LE(data.length,40);fs.writeFileSync(file,Buffer.concat([header,data]));
}
async function fixture(dir){
  fs.mkdirSync(dir,{recursive:true});
  const svg='<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="1200" height="800" fill="#f5e8c9"/><path d="M220 400H980" stroke="#96714e" stroke-width="18"/><rect x="260" y="320" width="160" height="160" rx="25" fill="#d87536"/><circle cx="600" cy="400" r="90" fill="#3c9c98"/><rect x="780" y="320" width="160" height="160" rx="25" fill="#6687b9"/></svg>';
  const art=await sharp(Buffer.from(svg)).png().toBuffer();fs.writeFileSync(path.join(dir,'art.png'),art);
  const exterior=await sharp({create:{width:1200,height:800,channels:4,background:'#edd7b5'}}).png().toBuffer();fs.writeFileSync(path.join(dir,'outside.png'),exterior);
  const spec={version:1,object:'工具自检',object_type:'测试用抽象示意，不是科学教学图',title:'工具能正确排版吗？',subtitle:'这是排版测试，不是儿童教学内容。',mechanism:'三个几何形状仅用于测试坐标、文件绑定和排版，不表达真实物理机制。',parts:[{name:'测试块',function:'检查编号一',target_box:[.21,.4,.14,.2],badge:[.28,.5]},{name:'测试圆',function:'检查编号二',target_box:[.42,.36,.16,.28],badge:[.5,.5]},{name:'测试片',function:'检查编号三',target_box:[.65,.4,.14,.2],badge:[.72,.5]}],steps:['读取规格','渲染画面','检查结果'],observation:'此图仅用于工具自检。',illustration:{path:'art.png',sha256:hash(art),composition:'三个几何图形横向排列；纯测试示意。'},references:[],sources:[{url:'https://www.w3.org/TR/SVG2/',supports:'仅用于说明测试图形格式，不作为儿童科普事实来源。'}],print_layout:{mode:'a5-spread',exterior:{path:'outside.png',sha256:hash(exterior)}}};
  json(path.join(dir,'card.json'),spec);wav(path.join(dir,'one.wav'));wav(path.join(dir,'two.wav'));
  const lesson={title:'工具自检：短测试音',paragraph_gap:.9,voice:'synthetic-test-tone',engine:'test-fixture',segments:[{id:'outside',view:'exterior',part:null,text:'测试外观段。',caption:'外观测试',wav:'one.wav',pause_after:.8},{id:'inside',view:'interior',part:1,text:'测试内部段。',caption:'内部测试',wav:'two.wav'}]};json(path.join(dir,'script.json'),lesson);
  return {spec,lesson};
}
module.exports={fixture,hash,json,wav};
