import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

const manifest=JSON.parse(await fs.readFile(new URL('./assets-manifest.json',import.meta.url),'utf8'));
const source='https://osnova-architecture.pages.dev/assets/';
const hash=data=>createHash('sha256').update(data).digest('hex');
await fs.mkdir('assets',{recursive:true});
let cursor=0;
await Promise.all(Array.from({length:4},async()=>{
 while(cursor<manifest.length){
  const item=manifest[cursor++];
  if(path.basename(item.name)!==item.name)throw Error('Invalid asset path');
  const target=path.join('assets',item.name);
  let current;try{current=await fs.readFile(target)}catch{}
  if(current&&hash(current)===item.sha256)continue;
  const response=await fetch(source+encodeURIComponent(item.name),{signal:AbortSignal.timeout(90000)});
  if(!response.ok)throw Error(item.name+': HTTP '+response.status);
  const data=Buffer.from(await response.arrayBuffer());
  if(hash(data)!==item.sha256)throw Error(item.name+': checksum mismatch');
  await fs.writeFile(target,data);
  console.log('Imported '+item.name);
 }
}));
await fs.mkdir('_site',{recursive:true});
for(const name of ['index.html','app.js','style.css','responsive.css','fonts.css','.nojekyll']){
 await fs.copyFile(name,path.join('_site',name));
}
await fs.cp('assets','_site/assets',{recursive:true});
console.log('Static site ready: '+manifest.length+' verified local assets.');
