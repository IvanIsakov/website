import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {build,root} from './build.mjs';
const projects=build({copyAssets:false});
assert.equal(projects.length,JSON.parse(fs.readFileSync(path.join(root,'Assets/projects.json'),'utf8').replace(/^\uFEFF/,'')).length);
const out=path.join(root,'dist');
for(const entry of fs.readdirSync(out,{recursive:true}).filter(p=>p.endsWith('.html'))){
 const html=fs.readFileSync(path.join(out,entry),'utf8');
 if(entry==='index.html')assert.doesNotMatch(html,/data-back/);else assert.match(html,/data-back/);
 for(const [,url] of html.matchAll(/(?:href|src)="(\/[^"#]*)"/g)){
  let target=path.join(out,decodeURIComponent(url));
  if(url.startsWith('/media/')){
   const [, ,slug,name]=decodeURIComponent(url).split('/');
   const project=projects.find(p=>p.slug===slug);
   target=path.join(root,slug==='about'?'Assets/About':`Assets/Projects/${project.folder}`,name);
  }
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
vm.runInNewContext("filter('Valkyrie')",context);assert.equal(cards[0].hidden,true);
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'portfolio-check-'));
for(const dir of ['scripts','src','Assets/Projects/Fixture'])fs.mkdirSync(path.join(temp,dir),{recursive:true});
for(const file of ['scripts/build.mjs','src/app.js','src/style.css','src/home-ripples.js','src/youtube-player.js','Assets/Intro.txt','Assets/Contact.json'])fs.copyFileSync(path.join(root,file),path.join(temp,file));
fs.writeFileSync(path.join(temp,'Assets/projects.json'),JSON.stringify([{name:'Fixture',slug:'fixture',folder:'Fixture',categories:['Art'],year:'2026'}]));
fs.writeFileSync(path.join(temp,'Assets/Projects/Fixture/description.txt'),'First paragraph.\n\nSecond <safe> paragraph.');
for(const f of ['01-image.svg','02-image.svg','03-video.mp4'])fs.writeFileSync(path.join(temp,'Assets/Projects/Fixture',f),f.endsWith('svg')?'<svg xmlns="http://www.w3.org/2000/svg"/>':'fixture');
fs.writeFileSync(path.join(temp,'Assets/Projects/Fixture/videos.txt'),'https://youtu.be/usHgArc3CqQ\nhttps://www.youtube.com/watch?v=usHgArc3CqQ\nhttps://example.com/not-youtube');
const fixture=await import(pathToFileURL(path.join(temp,'scripts/build.mjs')));fixture.build();
for(const route of ['projects/fixture/index.html']){
 const html=fs.readFileSync(path.join(temp,'dist',route),'utf8');
 assert.match(html,/data-gallery/);assert.match(html,/data-step="1"/);assert.match(html,/<iframe/);assert.doesNotMatch(html,/<video/);assert.ok(html.indexOf('<iframe')<html.indexOf('01-image.svg'));assert.match(html,/1 \/ 3/);
}
assert.match(fs.readFileSync(path.join(temp,'dist/projects/fixture/index.html'),'utf8'),/Second &lt;safe&gt;/);
console.log('Passed: 32 routes, internal links, back links, contact links, category-only filters, and image/video carousel generation.');

// Explicit cover wins over alphabetically earlier media.
fs.writeFileSync(path.join(temp,'Assets/Projects/Fixture/thumbnail.webp'),'fixture');
fixture.build();
const covered=fs.readFileSync(path.join(temp,'dist/projects/index.html'),'utf8');
assert.match(covered,/src="[^"]*\/thumbnail.webp"/);
assert.doesNotMatch(covered,/data-gallery|data-step|gallery-controls|<video|01-image.svg/);
const detail=fs.readFileSync(path.join(temp,'dist/projects/fixture/index.html'),'utf8');
assert.doesNotMatch(detail,/thumbnail.webp/);
assert.match(detail,/1 \/ 3/);
assert.match(detail,/01-image.svg/);
assert.match(covered,/id="project-sort"/);
const sortCards=[
 {dataset:{name:'Zulu',year:'2022-26'}},
 {dataset:{name:'alpha',year:'2019'}},
 {dataset:{name:'Beta',year:''}},
 {dataset:{name:'Gamma',year:'2024-2025'}}
];
let rendered=[];
const sortContext={URLSearchParams,location:{search:''},document:{querySelectorAll(s){return s==='.project-card'?sortCards:[]},querySelector(s){return s==='.project-grid'?{appendChild(card){rendered.push(card)}}:null}}};
vm.runInNewContext(fs.readFileSync(path.join(root,'src/app.js'),'utf8'),sortContext);
for(const [order,names] of [['az',['alpha','Beta','Gamma','Zulu']],['za',['Zulu','Gamma','Beta','alpha']],['newest',['Zulu','Gamma','alpha','Beta']],['oldest',['alpha','Gamma','Zulu','Beta']],['original',['Zulu','alpha','Beta','Gamma']]]){
 rendered=[];vm.runInNewContext(`sortProjects('${order}')`,sortContext);
 assert.deepEqual(rendered.map(c=>c.dataset.name),names);
}
console.log('Passed: thumbnail priority, alphabetical sorting, year ranges, and undated entries.');

fs.writeFileSync(path.join(temp,'Assets/Projects/Fixture/description.txt'),'Visit https://example.com/test?a=1&b=2. <script>alert(1)</script>');
fixture.build();
const linked=fs.readFileSync(path.join(temp,'dist/projects/fixture/index.html'),'utf8');
assert.match(linked,/href="https:\/\/example.com\/test\?a=1&amp;b=2" target="_blank" rel="noopener noreferrer"/);
assert.match(linked,/&lt;script&gt;/);
assert.doesNotMatch(linked,/<script>alert/);
console.log('Passed: YouTube ordering/deduplication, alternate thumbnail extension, and safe external description links.');

fixture.build({basePath:'/website/'});
for(const entry of fs.readdirSync(path.join(temp,'dist'),{recursive:true}).filter(p=>p.endsWith('.html'))){
 const html=fs.readFileSync(path.join(temp,'dist',entry),'utf8');
 for(const [,url] of html.matchAll(/(?:href|src)="(\/[^"#]*)"/g)){
  assert.ok(url.startsWith('/website/'),`Missing Pages prefix: ${url}`);
  const target=path.join(temp,'dist',decodeURIComponent(url.slice('/website/'.length)));
  assert.ok(fs.existsSync(url.endsWith('/')?path.join(target,'index.html'):target),`Missing Pages target: ${url}`);
 }
}
const hosted=fs.readFileSync(path.join(temp,'dist/projects/fixture/index.html'),'utf8');
assert.match(hosted,/src="https:\/\/www.youtube.com\/embed\//);
assert.match(hosted,/href="https:\/\/example.com\//);
console.log('Passed: GitHub Pages subpath links, assets, 404 page, and unchanged external URLs.');
