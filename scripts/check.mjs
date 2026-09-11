import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {build,root} from './build.mjs';
const projects=build();
assert.equal(projects.length,32);
const out=path.join(root,'dist');
for(const entry of fs.readdirSync(out,{recursive:true}).filter(p=>p.endsWith('.html'))){
 const html=fs.readFileSync(path.join(out,entry),'utf8');
 assert.match(html,/data-back/);
 for(const [,url] of html.matchAll(/(?:href|src)="(\/[^"#]*)"/g)){
  const target=path.join(out,decodeURIComponent(url));
  assert.ok(fs.existsSync(url.endsWith('/')?path.join(target,'index.html'):target),`Missing ${url} in ${entry}`);
 }
}
const contact=fs.readFileSync(path.join(out,'contact/index.html'),'utf8');
assert.match(contact,/mailto:ivan.isakov@gmail.com/);assert.match(contact,/https:\/\/ivascht.substack.com\//);
const buttons=['All','Valkyrie','Hardware'].map(c=>({dataset:{filter:c},setAttribute(){},addEventListener(){}}));
const cards=projects.map(p=>({dataset:{categories:p.categories.join('|'),description:p.description.toLowerCase()},querySelectorAll(){return []}}));
const count={};
const context={URLSearchParams,location:{search:'?category=Valkyrie'},document:{querySelectorAll(s){return s==='[data-filter]'?buttons:s==='.project-card'?cards:[]},querySelector(s){return s==='.count'?count:null}}};
vm.runInNewContext(fs.readFileSync(path.join(root,'src/app.js'),'utf8'),context);
assert.equal(cards.filter(c=>!c.hidden).length,projects.filter(p=>p.categories.includes('Valkyrie')).length);
vm.runInNewContext("filter('All')",context);assert.ok(cards.every(c=>!c.hidden));
cards[0].dataset.categories='Art';cards[0].dataset.description='A Valkyrie collaboration'.toLowerCase();
vm.runInNewContext("filter('Valkyrie')",context);assert.equal(cards[0].hidden,false);
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'portfolio-check-'));
for(const dir of ['scripts','src','Assets/Projects/Fixture'])fs.mkdirSync(path.join(temp,dir),{recursive:true});
for(const file of ['scripts/build.mjs','src/app.js','src/style.css','Assets/Intro.txt','Assets/Contact.json'])fs.copyFileSync(path.join(root,file),path.join(temp,file));
fs.writeFileSync(path.join(temp,'Assets/projects.json'),JSON.stringify([{name:'Fixture',slug:'fixture',folder:'Fixture',categories:['Art'],year:'2026'}]));
fs.writeFileSync(path.join(temp,'Assets/Projects/Fixture/description.txt'),'First paragraph.\n\nSecond <safe> paragraph.');
for(const f of ['01-image.svg','02-image.svg','03-video.mp4'])fs.writeFileSync(path.join(temp,'Assets/Projects/Fixture',f),f.endsWith('svg')?'<svg xmlns="http://www.w3.org/2000/svg"/>':'fixture');
const fixture=await import(pathToFileURL(path.join(temp,'scripts/build.mjs')));fixture.build();
for(const route of ['projects/index.html','projects/fixture/index.html']){
 const html=fs.readFileSync(path.join(temp,'dist',route),'utf8');
 assert.match(html,/data-gallery/);assert.match(html,/data-step="1"/);assert.match(html,/<video controls playsinline/);assert.match(html,/1 \/ 3/);
}
assert.match(fs.readFileSync(path.join(temp,'dist/projects/fixture/index.html'),'utf8'),/Second &lt;safe&gt;/);
console.log('Passed: 32 routes, internal links, back links, contact links, category/description filters, and image/video carousel generation.');
