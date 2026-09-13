// Load the HLS library only on pages containing streams.
(()=>{
 let library;
 function loadLibrary(){
  if(window.Hls)return Promise.resolve(window.Hls);
  return library??=new Promise((resolve,reject)=>{
   const script=document.createElement('script');
   script.src='https://cdn.jsdelivr.net/npm/hls.js@1/dist/hls.min.js';
   script.onload=()=>window.Hls?resolve(window.Hls):reject(new Error('HLS unavailable'));
   script.onerror=reject;document.head.appendChild(script);
  });
 }
 document.querySelectorAll('video[data-hls]').forEach(video=>{
  const figure=video.closest('figure'),error=figure.querySelector('.hls-error');
  let player=null,active=false,generation=0;
  const fail=()=>{error.hidden=false;};
  video.addEventListener('error',()=>{if(active)fail();});
  async function update(){
   const visible=!figure.hidden;if(visible===active)return;
   active=visible;const token=++generation;
   if(!visible){
    video.pause();player?.destroy();player=null;
    video.removeAttribute('src');video.load();return;
   }
   error.hidden=true;
   try{
    // Prefer native playback on modern Safari; elsewhere use HLS.js first.
    if(video.canPlayType('application/vnd.apple.mpegurl')&&'ManagedMediaSource' in window){video.src=video.dataset.hls;return;}
    const Hls=await loadLibrary();if(token!==generation||!active)return;
    if(Hls.isSupported()){
     player=new Hls();
     player.on(Hls.Events.ERROR,(_,data)=>{if(data.fatal){player?.destroy();player=null;fail();}});
     player.loadSource(video.dataset.hls);player.attachMedia(video);
    }else if(video.canPlayType('application/vnd.apple.mpegurl'))video.src=video.dataset.hls;
    else fail();
   }catch{
    if(token!==generation||!active)return;
    if(video.canPlayType('application/vnd.apple.mpegurl'))video.src=video.dataset.hls;else fail();
   }
  }
  new MutationObserver(update).observe(figure,{attributes:true,attributeFilter:['hidden']});
  update();
 });
})();
