import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = p => fs.readFileSync(path.join(root,p),'utf8').replace(/^\uFEFF/,'');
const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const thumbnailPattern=/^thumbnail\.(jpe?g|jfif|png|webp|gif|avif|svg|bmp|tiff?)$/i;
function linkify(text){
 const pattern=/https?:\/\/[^\s<>]+/g;let result='',last=0;
 for(const match of text.matchAll(pattern)){
  const url=match[0].replace(/[.,;!?)]+$/,'');
  result+=esc(text.slice(last,match.index))+`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(url)}</a>`;
  last=match.index+url.length;
 }
 return result+esc(text.slice(last));
}
function youtubeVideos(folder){
 const file=path.join(folder,'videos.txt');if(!fs.existsSync(file))return [];
 const ids=[];
 for(const match of fs.readFileSync(file,'utf8').matchAll(/https?:\/\/[^\s<>]+/g)){
  try{
   const url=new URL(match[0].replace(/[),.;]+$/,''));const host=url.hostname.toLowerCase();let id;
   if(host==='youtu.be')id=url.pathname.split('/')[1];
   else if(['youtube.com','www.youtube.com','m.youtube.com','youtube-nocookie.com','www.youtube-nocookie.com'].includes(host))id=url.searchParams.get('v')||url.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/)?.[1];
   if(id&&/^[A-Za-z0-9_-]{11}$/.test(id)&&!ids.includes(id))ids.push(id);
  }catch{}
 }
 return ids.map(id=>({name:'YouTube video',youtube:true,url:`https://www.youtube.com/embed/${id}?feature=oembed`}));
}
function instagramVideos(folder){
 const file=path.join(folder,'videos.txt');if(!fs.existsSync(file))return [];
 const posts=new Map();
 for(const match of fs.readFileSync(file,'utf8').matchAll(/https?:\/\/(?:www\.)?instagram\.com\/(p|reel|tv)\/([A-Za-z0-9_-]+)(?=[/?"'\s<]|$)/g)){
  const permalink=`https://www.instagram.com/${match[1]}/${match[2]}/`;
  posts.set(match[2],{instagram:true,name:'Instagram post',url:permalink+'embed/',permalink});
 }
 return [...posts.values()];
}
const paragraphs = s => s.trim().split(/\n\s*\n/).filter(Boolean).map(p=>`<p>${linkify(p).replace(/\n/g,'<br>')}</p>`).join('');
// Avoid copying large, unchanged videos on every local page refresh.
function copyMedia(source,destination) {
 const original=fs.statSync(source);
 if(fs.existsSync(destination)) {
  const cached=fs.statSync(destination);
  if(cached.size===original.size && cached.mtimeMs>=original.mtimeMs)return;
 }
 fs.copyFileSync(source,destination);
}
export function build({copyAssets=true,basePath=process.env.BASE_PATH||'',outputDir=path.join(root,'dist')}={}) {
 const prefix=basePath.replace(/^\/+|\/+$/g,'');
 const publicHtml=html=>prefix?html.replace(/\b(href|src|data-src)="\/(?!\/)/g,(_,attribute)=>`${attribute}="/${esc(prefix)}/`):html;
 const out = path.resolve(outputDir); fs.mkdirSync(out,{recursive:true});
 const projects = JSON.parse(read('Assets/projects.json')).map(p=>{
  const folder=path.join(root,'Assets','Projects',p.folder);
  const media=(fs.existsSync(folder)?fs.readdirSync(folder):[]).filter(f=>/\.(jpe?g|jfif|png|webp|gif|avif|svg)$/i.test(f)).sort((a,b)=>(Number(b.toLowerCase()==='thumbnail.png')-Number(a.toLowerCase()==='thumbnail.png'))||a.localeCompare(b,undefined,{numeric:true}));
  const dest=path.join(out,'media',p.slug); if(copyAssets)fs.mkdirSync(dest,{recursive:true});
  return {...p,description:fs.existsSync(path.join(folder,'description.txt'))?read(`Assets/Projects/${p.folder}/description.txt`):'',youtube:youtubeVideos(folder),instagram:instagramVideos(folder),media:media.map(f=>{if(copyAssets)copyMedia(path.join(folder,f),path.join(dest,f));return {url:`/media/${p.slug}/${encodeURIComponent(f)}`,name:f,video:/\.(mp4|webm|ogv|mov)$/i.test(f)};})};
 });
 const shell=(title,content,back='/')=>`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} | Dr Ivan Isakov</title><meta name="description" content="Dr Ivan Isakov — scientist, entrepreneur and creative technologist. Projects in hardware, software, immersive experiences, art and research."><link rel="stylesheet" href="/style.css"><script src="/app.js" defer></script><script src="/youtube-player.js" defer></script>${title==='Home'?'<script src="/home-ripples.js" defer></script>':''}</head><body class="${title==='Home'?'home-page':'inner-page'}"><a class="skip" href="#main">Skip to content</a><header><a class="brand" href="/">DR IVAN ISAKOV<span>Wearables, Immersion, Interaction</span></a><nav aria-label="Main"><a href="/projects/" ${title==='Projects'?'aria-current="page"':''}>Projects</a><a href="/about/" ${title==='About'?'aria-current="page"':''}>About</a><a href="/contact/" ${title==='Contact'?'aria-current="page"':''}>Contact</a></nav></header><main id="main">${title==='Home'?'':`<a class="back" data-back href="${back}">← Back</a>`}${content}</main><footer>© ${new Date().getFullYear()} Ivan Isakov</footer></body></html>`;
 const write=(route,html)=>{const dir=path.join(out,route);fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'index.html'),publicHtml(html))};
 const gallery=(p,card=false)=>{
  if(card){
   const thumbnail=p.media.find(m=>thumbnailPattern.test(m.name));
   return thumbnail
    ? `<a class="project-thumbnail" href="/projects/${p.slug}/"><img src="${thumbnail.url}" alt="${esc(p.name)}" loading="lazy"></a>`
    : `<a class="placeholder" href="/projects/${p.slug}/" aria-label="View ${esc(p.name)}"><span>${esc(p.name)}</span></a>`;
  }
  const assets=[...p.youtube,...p.instagram,...p.media.filter(m=>!thumbnailPattern.test(m.name)&&!m.video)];
  if(!assets.length)return '';
  return `<section class="gallery" aria-label="${esc(p.name)} media" data-gallery>${assets.map((m,i)=>`<figure ${i?'hidden':''}>${m.instagram?`<iframe class="instagram-player" title="${esc(p.name)} — Instagram post" ${i?'data-src':'src'}="${m.url}" allow="autoplay; encrypted-media; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe><a class="instagram-link" href="${m.permalink}" target="_blank" rel="noopener noreferrer">View on Instagram ↗</a>`:m.youtube?`<iframe class="youtube-player" title="${esc(p.name)} — YouTube video ${i+1}" ${i?'data-src':'src'}="${m.url}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`:m.video?`<video controls playsinline preload="metadata" aria-label="${esc(m.name)}"><source src="${m.url}">Your browser cannot play this video. <a href="${m.url}">Download video</a></video>`:`<img src="${m.url}" alt="${esc(p.name+' — '+m.name.replace(/\.[^.]+$/,'').replace(/[-_]/g,' '))}" loading="lazy">`}</figure>`).join('')}${assets.length>1?`<div class="gallery-controls"><button type="button" data-step="-1" aria-label="Previous media">←</button><span aria-live="polite">1 / ${assets.length}</span><button type="button" data-step="1" aria-label="Next media">→</button></div>`:''}</section>`;
 };
 const intro=read('Assets/Intro.txt').replace(/^ABOUT\s*/,'').replace(/[\u200B\uFEFF]/g,'');
 write('',shell('Home',`<section class="home-hero"><h1>IVAN ISAKOV</h1><p class="home-subtitle">Immersive Technology, Haptics, Wearables, Interaction Design, Creative Technology</p></section>`));
 const aboutFolder=path.join(root,'Assets/About');
 const aboutImages=fs.existsSync(aboutFolder)?fs.readdirSync(aboutFolder).filter(f=>/\.(jpe?g|png|webp|gif|avif|svg)$/i.test(f)).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})):[];
 const aboutMedia=aboutImages.map(f=>{
  const dest=path.join(out,'media/about');if(copyAssets)fs.mkdirSync(dest,{recursive:true});if(copyAssets)copyMedia(path.join(aboutFolder,f),path.join(dest,f));
  return `<figure><img src="/media/about/${encodeURIComponent(f)}" alt="${esc(f.replace(/\.[^.]+$/,'').replace(/^\d+[-_ ]*/,'').replace(/[-_]/g,' '))}" loading="lazy"></figure>`;
 }).join('');
 write('about',shell('About',`<section class="about-page"><h1>ABOUT</h1><div class="biography">${paragraphs(intro)}</div>${aboutMedia?`<div class="about-images">${aboutMedia}</div>`:''}</section>`));
 const cats=[...new Set(projects.flatMap(p=>p.categories))];
 write('projects',shell('Projects',`<h1>PROJECTS</h1><div class="filters" aria-label="Filter projects"><button data-filter="All" aria-pressed="true">All</button>${cats.map(c=>`<button data-filter="${esc(c)}" aria-pressed="false">${esc(c)}</button>`).join('')}</div><div class="project-toolbar"><label for="project-sort">Sort by <select id="project-sort"><option value="original">Original order</option><option value="az">Name: A–Z</option><option value="za">Name: Z–A</option><option value="newest">Year: newest first</option><option value="oldest">Year: oldest first</option></select></label></div><div class="project-grid">${projects.map(p=>`<article class="project-card" data-name="${esc(p.name)}" data-year="${esc(p.year)}" data-categories="${esc(p.categories.join('|'))}" data-description="${esc(p.description.toLowerCase())}">${gallery(p,true)}<a class="project-title" href="/projects/${p.slug}/"><h2>${esc(p.name)}</h2><span>${esc(p.year)}</span></a>${p.subtitle?`<p class="project-subtitle" title="${esc(p.subtitle)}">${esc(p.subtitle)}</p>`:''}</article>`).join('')}</div>`));
 const projectNavigation=index=>{
  if(projects.length<2)return '';
  const previous=projects[(index-1+projects.length)%projects.length],next=projects[(index+1)%projects.length];
  return `<nav class="project-navigation" aria-label="Project navigation"><a href="/projects/${previous.slug}/" aria-label="Previous project: ${esc(previous.name)}">← Previous</a><a href="/projects/${next.slug}/" aria-label="Next project: ${esc(next.name)}">Next →</a></nav>`;
 };
 for(const [index,p] of projects.entries())write(`projects/${p.slug}`,shell(p.name,`<section class="project-detail"><p class="meta">${p.categories.map(esc).join(' · ')}${p.year?' / '+esc(p.year):''}</p><h1>${esc(p.name)}</h1><div class="description">${p.description.trim()?paragraphs(p.description):'<p class="muted">Project details coming soon.</p>'}</div>${gallery(p)}${projectNavigation(index)}</section>`,'/projects/'));
 const contact=JSON.parse(read('Assets/Contact.json'));
 write('contact',shell('Contact',`<section class="contact"><h1>CONTACT</h1><div class="contact-links">${Object.entries(contact).map(([label,url])=>url?`<a href="${esc(label==='Email'&&!url.startsWith('mailto:')?'mailto:'+url:url)}">${esc(label)} <span>↗</span></a>`:`<div class="unavailable">${esc(label)} <small>Coming soon</small></div>`).join('')}</div></section>`));
 fs.writeFileSync(path.join(out,'404.html'),publicHtml(shell('Page not found','<h1>PAGE NOT FOUND</h1><p><a href="/projects/">Browse projects</a></p>')));
 for(const f of ['style.css','app.js','home-ripples.js','youtube-player.js'])fs.copyFileSync(path.join(root,'src',f),path.join(out,f));
 return projects;
}
if(process.argv[1]===fileURLToPath(import.meta.url))console.log(`Built ${build().length} project pages.`);
