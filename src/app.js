const filters=[...document.querySelectorAll('[data-filter]')];
function filter(category){
 if(!filters.some(b=>b.dataset.filter===category))category='All';
 document.querySelectorAll('.project-card').forEach(card=>{card.hidden=category!=='All'&&!card.dataset.categories.split('|').includes(category);if(card.hidden)card.querySelectorAll('video').forEach(v=>v.pause());});
 filters.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter===category)));
}
if(filters.length){filter(new URLSearchParams(location.search).get('category')||'All');filters.forEach(b=>b.addEventListener('click',()=>{const url=new URL(location.href);if(b.dataset.filter==='All')url.searchParams.delete('category');else url.searchParams.set('category',b.dataset.filter);history.replaceState(null,'',url);filter(b.dataset.filter);}));}
document.querySelectorAll('[data-gallery]').forEach(g=>{
 const slides=[...g.querySelectorAll('figure')];let index=0,start=null;
 function move(step){
  if(slides.length<2)return;
  slides[index].querySelector('video')?.pause();
  const oldFrame=slides[index].querySelector('iframe');
  if(oldFrame?.hasAttribute('src')){oldFrame.dataset.src=oldFrame.getAttribute('src');oldFrame.removeAttribute('src');}
  slides[index].hidden=true;index=(index+step+slides.length)%slides.length;slides[index].hidden=false;
  const nextFrame=slides[index].querySelector('iframe');if(nextFrame?.dataset.src)nextFrame.src=nextFrame.dataset.src;
  g.querySelector('[aria-live]').textContent=`${index+1} / ${slides.length}`;
 }
 g.querySelectorAll('[data-step]').forEach(b=>b.addEventListener('click',()=>move(Number(b.dataset.step))));
 // Images accept horizontal swipes; scrolling and embedded player controls keep their normal gestures.
 g.querySelectorAll('figure img').forEach(img=>{
  img.draggable=false;
  img.addEventListener('pointerdown',e=>{
   if(!e.isPrimary||e.button!==0)return;
   start={x:e.clientX,y:e.clientY,id:e.pointerId};img.setPointerCapture(e.pointerId);
  });
  img.addEventListener('pointerup',e=>{
   if(!start||start.id!==e.pointerId)return;
   const dx=e.clientX-start.x,dy=e.clientY-start.y;start=null;
   if(Math.abs(dx)>=45&&Math.abs(dx)>Math.abs(dy)*1.5)move(dx<0?1:-1);
  });
  img.addEventListener('pointercancel',()=>{start=null;});
  img.addEventListener('lostpointercapture',()=>{start=null;});
 });
});

// Sorting preserves the selected category and keeps undated projects last.
const sortSelect=document.querySelector('#project-sort');
const originalCards=[...document.querySelectorAll('.project-card')];
function projectYear(value){
 const match=value.match(/^(\d{4})(?:[-–](\d{2,4}))?/);
 if(!match)return null;
 return match[2]?Number(match[2].length===2?match[1].slice(0,2)+match[2]:match[2]):Number(match[1]);
}
function sortProjects(order){
 const cards=[...originalCards];
 cards.sort((a,b)=>{
  const name=()=>a.dataset.name.localeCompare(b.dataset.name,undefined,{sensitivity:'base',numeric:true});
  if(order==='az')return name();
  if(order==='za')return -name();
  if(order==='newest'||order==='oldest'){
   const ay=projectYear(a.dataset.year),by=projectYear(b.dataset.year);
   if(ay===null||by===null)return ay===by?name():ay===null?1:-1;
   return (order==='newest'?by-ay:ay-by)||name();
  }
  return originalCards.indexOf(a)-originalCards.indexOf(b);
 });
 const grid=document.querySelector('.project-grid');
 cards.forEach(card=>grid.appendChild(card));
}
if(sortSelect){
 const saved=new URLSearchParams(location.search).get('sort');
 sortSelect.value=['az','za','newest','oldest'].includes(saved)?saved:'original';
 sortProjects(sortSelect.value);
 sortSelect.addEventListener('change',()=>{const url=new URL(location.href);if(sortSelect.value==='original')url.searchParams.delete('sort');else url.searchParams.set('sort',sortSelect.value);history.replaceState(null,'',url);sortProjects(sortSelect.value);});
}
