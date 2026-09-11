import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = p => fs.readFileSync(path.join(root,p),'utf8').replace(/^\uFEFF/,'');
const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paragraphs = s => s.trim().split(/\n\s*\n/).filter(Boolean).map(p=>`<p>${esc(p).replace(/\n/g,'<br>')}</p>`).join('');
export function build() {
 const out = path.join(root,'dist'); fs.mkdirSync(out,{recursive:true});
 const projects = JSON.parse(read('Assets/projects.json')).map(p=>{
  const folder=path.join(root,'Assets','Projects',p.folder);
  const media=fs.readdirSync(folder).filter(f=>/\.(jpe?g|png|webp|gif|avif|svg|mp4|webm|ogv|mov)$/i.test(f)).sort((a,b)=>(Number(b.toLowerCase()==='thumbnail.png')-Number(a.toLowerCase()==='thumbnail.png'))||a.localeCompare(b,undefined,{numeric:true}));
  const dest=path.join(out,'media',p.slug); fs.mkdirSync(dest,{recursive:true});
  return {...p,description:read(`Assets/Projects/${p.folder}/description.txt`),media:media.map(f=>{fs.copyFileSync(path.join(folder,f),path.join(dest,f));return {url:`/media/${p.slug}/${encodeURIComponent(f)}`,name:f,video:/\.(mp4|webm|ogv|mov)$/i.test(f)};})};
 });
 const shell=(title,content,back='/')=>`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} | Ivan Isakov</title><meta name="description" content="Ivan Isakov — scientist, entrepreneur and creative technologist. Projects in hardware, software, immersive experiences, art and research."><link rel="stylesheet" href="/style.css"><script src="/app.js" defer></script></head><body><a class="skip" href="#main">Skip to content</a><header><a class="brand" href="/">DR IVAN ISAKOV<span>VR, Haptics, Interaction</span></a><nav aria-label="Main"><a href="/projects/" ${title==='Projects'?'aria-current="page"':''}>Projects</a><a href="/contact/" ${title==='Contact'?'aria-current="page"':''}>Contact</a></nav></header><main id="main">${title==='Home'?'':`<a class="back" data-back href="${back}">← Back</a>`}${content}</main><footer>© ${new Date().getFullYear()} Ivan Isakov</footer></body></html>`;
 const write=(route,html)=>{const dir=path.join(out,route);fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'index.html'),html)};
 const gallery=(p,card=false)=>{
  if(!p.media.length)return `<a class="placeholder" href="/projects/${p.slug}/" aria-label="View ${esc(p.name)}"><span>${esc(p.name)}</span></a>`;
  return `<section class="gallery ${card?'compact':''}" aria-label="${esc(p.name)} media" data-gallery>${p.media.map((m,i)=>`<figure ${i?'hidden':''}>${m.video?`<video controls playsinline preload="metadata" aria-label="${esc(m.name)}"><source src="${m.url}">Your browser cannot play this video. <a href="${m.url}">Download video</a></video>`:`<${card?'a href="/projects/'+p.slug+'/"':'div'}><img src="${m.url}" alt="${esc(p.name+' — '+m.name.replace(/\.[^.]+$/,'').replace(/[-_]/g,' '))}" loading="lazy"></${card?'a':'div'}>`}</figure>`).join('')}${p.media.length>1?`<div class="gallery-controls"><button type="button" data-step="-1" aria-label="Previous media">←</button><span aria-live="polite">1 / ${p.media.length}</span><button type="button" data-step="1" aria-label="Next media">→</button></div>`:''}</section>`;
 };
 const intro=read('Assets/Intro.txt').replace(/^ABOUT\s*/,'').replace(/[\u200B\uFEFF]/g,'');
 write('',shell('Home',`<section class="intro"><h1>IVAN ISAKOV, PHD</h1><div class="biography">${paragraphs(intro)}</div><div class="home-links"><a href="/projects/">Projects →</a><a href="/contact/">Contact →</a></div></section>`));
 const cats=[...new Set(projects.flatMap(p=>p.categories))];
 write('projects',shell('Projects',`<h1>PROJECTS</h1><div class="filters" aria-label="Filter projects"><button data-filter="All" aria-pressed="true">All</button>${cats.map(c=>`<button data-filter="${esc(c)}" aria-pressed="false">${esc(c)}</button>`).join('')}</div><div class="project-toolbar"><p class="count" aria-live="polite">${projects.length} projects</p><label for="project-sort">Sort by <select id="project-sort"><option value="original">Original order</option><option value="az">Name: A–Z</option><option value="za">Name: Z–A</option><option value="newest">Year: newest first</option><option value="oldest">Year: oldest first</option></select></label></div><div class="project-grid">${projects.map(p=>`<article class="project-card" data-name="${esc(p.name)}" data-year="${esc(p.year)}" data-categories="${esc(p.categories.join('|'))}" data-description="${esc(p.description.toLowerCase())}">${gallery(p,true)}<a class="project-title" href="/projects/${p.slug}/"><h2>${esc(p.name)}</h2><span>${esc(p.year)}</span></a><p class="meta">${p.categories.map(esc).join(' · ')}</p></article>`).join('')}</div>`));
 for(const p of projects)write(`projects/${p.slug}`,shell(p.name,`<section class="project-detail"><p class="meta">${p.categories.map(esc).join(' · ')}${p.year?' / '+esc(p.year):''}</p><h1>${esc(p.name)}</h1><div class="description">${p.description.trim()?paragraphs(p.description):'<p class="muted">Project details coming soon.</p>'}</div>${p.media.length?gallery(p):''}</section>`,'/projects/'));
 const contact=JSON.parse(read('Assets/Contact.json'));
 write('contact',shell('Contact',`<section class="contact"><h1>CONTACT</h1><div class="contact-links">${Object.entries(contact).map(([label,url])=>url?`<a href="${esc(label==='Email'&&!url.startsWith('mailto:')?'mailto:'+url:url)}">${esc(label)} <span>↗</span></a>`:`<div class="unavailable">${esc(label)} <small>Coming soon</small></div>`).join('')}</div></section>`));
 fs.writeFileSync(path.join(out,'404.html'),shell('Page not found','<h1>PAGE NOT FOUND</h1><p><a href="/projects/">Browse projects</a></p>'));
 for(const f of ['style.css','app.js'])fs.copyFileSync(path.join(root,'src',f),path.join(out,f));
 return projects;
}
if(process.argv[1]===fileURLToPath(import.meta.url))console.log(`Built ${build().length} project pages.`);
