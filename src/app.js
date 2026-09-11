const filters=[...document.querySelectorAll('[data-filter]')];
function filter(category){
 if(!filters.some(b=>b.dataset.filter===category))category='All';
 let count=0;
 document.querySelectorAll('.project-card').forEach(card=>{card.hidden=category!=='All'&&!card.dataset.categories.split('|').includes(category)&&!card.dataset.description.includes(category.toLowerCase());if(!card.hidden)count++;else card.querySelectorAll('video').forEach(v=>v.pause());});
 filters.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter===category)));
 const counter=document.querySelector('.count');if(counter)counter.textContent=`${count} project${count===1?'':'s'}`;
}
if(filters.length){filter(new URLSearchParams(location.search).get('category')||'All');filters.forEach(b=>b.addEventListener('click',()=>{const url=new URL(location.href);if(b.dataset.filter==='All')url.searchParams.delete('category');else url.searchParams.set('category',b.dataset.filter);history.replaceState(null,'',url);filter(b.dataset.filter);}));}
document.querySelectorAll('[data-gallery]').forEach(g=>{const slides=[...g.querySelectorAll('figure')];let index=0;g.querySelectorAll('[data-step]').forEach(b=>b.addEventListener('click',()=>{slides[index].querySelector('video')?.pause();slides[index].hidden=true;index=(index+Number(b.dataset.step)+slides.length)%slides.length;slides[index].hidden=false;g.querySelector('[aria-live]').textContent=`${index+1} / ${slides.length}`;}));});
document.querySelector('[data-back]')?.addEventListener('click',e=>{if(document.referrer&&new URL(document.referrer).origin===location.origin&&history.length>1){e.preventDefault();history.back();}});
