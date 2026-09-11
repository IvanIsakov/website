// Capture YouTube's actual playback error instead of guessing from its generic screen.
(() => {
 const frames=[...document.querySelectorAll('.youtube-player')];
 if(!frames.length)return;
 for(const frame of frames){
  for(const attr of ['src','data-src']){
   const raw=frame.getAttribute(attr);if(!raw)continue;
   const url=new URL(raw);url.searchParams.set('enablejsapi','1');
   url.searchParams.set('origin',location.origin);
   frame.setAttribute(attr,url.href);
  }
 }
 const attached=new WeakSet();
 function attach(frame){
  if(!frame.hasAttribute('src')||attached.has(frame)||!window.YT?.Player)return;
  attached.add(frame);
  new YT.Player(frame,{events:{onError(event){
   let notice=frame.parentElement.querySelector('.youtube-error');
   if(!notice){notice=document.createElement('p');notice.className='youtube-error';notice.setAttribute('role','status');frame.after(notice);}
   const reasons={2:'YouTube rejected a video parameter.',5:'YouTube reported a browser playback error.',100:'YouTube reports this video as missing or private.',101:'YouTube refused playback in this embedded player.',150:'YouTube refused playback in this embedded player.',153:'YouTube did not receive the required website identification.'};
   notice.textContent=`YouTube error ${event.data}: ${reasons[event.data]||'Playback was refused by YouTube.'}`;
  }}});
 }
 window.onYouTubeIframeAPIReady=()=>frames.forEach(attach);
 for(const frame of frames)new MutationObserver(()=>attach(frame)).observe(frame,{attributes:true,attributeFilter:['src']});
 const script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';document.head.append(script);
})();
