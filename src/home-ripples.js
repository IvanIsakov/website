// Home-only radial displacement of a rasterized copy of the live text.
// The real heading remains accessible and is restored whenever the waves settle.
(() => {
 if (!document.body.classList.contains('home-page')) return;
 const hero = document.querySelector('.home-hero');
 const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
 const canvas = document.createElement('canvas');
 canvas.className = 'home-ripples';
 canvas.setAttribute('aria-hidden', 'true');
 const gl = canvas.getContext('webgl', {alpha:true, premultipliedAlpha:false, antialias:false});
 if (!gl || !hero) return;
 const vertex = `attribute vec2 position; varying vec2 uv; void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}`;
 const fragment = `precision highp float;
 varying vec2 uv;
 uniform sampler2D textImage;
 uniform vec2 screen;
 uniform vec4 waves[8];
 uniform float now;
 void main(){
  vec2 p=vec2(uv.x,1.-uv.y)*screen;
  vec2 displacement=vec2(0.);
  float strain=0.;
  for(int i=0;i<8;i++){
   float age=now-waves[i].z;
   if(waves[i].w>0. && age>=0.){
    vec2 delta=p-waves[i].xy;
    float r=length(delta);
    float front=r-480.*age;
    float k=0.065;
    float envelope=exp(-front*front/11000.);
    float decay=exp(-age*1.6)/sqrt(1.+r*.003);
    float amplitude=7.*envelope*decay;
    float wave=amplitude*sin(k*front);
    vec2 direction=delta/max(r,1.);
    displacement+=direction*wave;
    // Divergence of radial displacement: positive dilation, negative compression.
    strain+=amplitude*(k*cos(k*front)-2.*front/11000.*sin(k*front))
      +wave/max(r,20.);
   }
  }
  vec2 source=p-displacement;
  vec2 sampleUV=vec2(source.x/screen.x,1.-source.y/screen.y);
  if(source.x<0. || source.y<0. || source.x>screen.x || source.y>screen.y){gl_FragColor=vec4(0.);return;}
  vec4 ink=texture2D(textImage,sampleUV);
  vec3 tint=strain>0.?vec3(0.5,0.,0.):vec3(0.,0.,0.5);
  vec3 color=mix(ink.rgb,tint,smoothstep(.008,.075,abs(strain)));
  gl_FragColor=vec4(color,ink.a);
 }`;
 function shader(type,source){
  const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);
  if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error('Ripple shader unavailable');
  return s;
 }
 let program;
 try {
  program=gl.createProgram();
  gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));
  gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));
  gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))return;
 } catch { return; }
 gl.useProgram(program);
 const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
 gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
 const position=gl.getAttribLocation(program,'position');
 gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
 const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
 gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
 const screenUniform=gl.getUniformLocation(program,'screen');
 const waveUniform=gl.getUniformLocation(program,'waves[0]');
 const timeUniform=gl.getUniformLocation(program,'now');
 const imageCanvas=document.createElement('canvas');
 const ctx=imageCanvas.getContext('2d');
 if(!ctx)return;
 let width=0,height=0,frame=0,dirty=true,available=true;
 let waves=[];
 const data=new Float32Array(32);
 document.body.append(canvas);
 function stop(){
  cancelAnimationFrame(frame);frame=0;waves=[];
  hero.classList.remove('ripple-active');canvas.classList.remove('active');
 }
 function snapshot(){
  width=innerWidth;height=innerHeight;
  const dpr=Math.min(devicePixelRatio||1,2);
  canvas.width=imageCanvas.width=Math.round(width*dpr);
  canvas.height=imageCanvas.height=Math.round(height*dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0);
  // DOM ranges retain the actual font, letter spacing, centering, and mobile line breaks.
  for(const element of hero.querySelectorAll('h1,p')){
   const style=getComputedStyle(element);
   ctx.font=`${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
   ctx.fillStyle=style.color;ctx.textBaseline='alphabetic';
   const walker=document.createTreeWalker(element,NodeFilter.SHOW_TEXT);
   let node;
   while(node=walker.nextNode()){
    for(let i=0;i<node.length;){
     const char=String.fromCodePoint(node.textContent.codePointAt(i));
     const range=document.createRange();range.setStart(node,i);range.setEnd(node,i+char.length);
     const rect=range.getBoundingClientRect();
     const metrics=ctx.measureText(char);
     const ascent=metrics.fontBoundingBoxAscent??parseFloat(style.fontSize)*.8;
     const descent=metrics.fontBoundingBoxDescent??parseFloat(style.fontSize)*.2;
     ctx.fillText(char,rect.left,rect.top+(rect.height-ascent-descent)/2+ascent);
     i+=char.length;
    }
   }
  }
  gl.viewport(0,0,canvas.width,canvas.height);
  gl.bindTexture(gl.TEXTURE_2D,texture);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,imageCanvas);
  gl.uniform2f(screenUniform,width,height);dirty=false;
 }
 function render(ms){
  frame=0;
  const now=ms/1000;
  waves=waves.filter(w=>now-w.time<3);
  if(!waves.length){stop();return;}
  data.fill(0);
  waves.forEach((w,i)=>data.set([w.x,w.y,w.time,1],i*4));
  gl.uniform4fv(waveUniform,data);gl.uniform1f(timeUniform,now);
  gl.drawArrays(gl.TRIANGLES,0,6);
  hero.classList.add('ripple-active');canvas.classList.add('active');
  frame=requestAnimationFrame(render);
 }
 document.addEventListener('pointerdown',event=>{
  if(!available||reducedMotion.matches||event.button!==0||event.target.closest('a,button,select,input,textarea'))return;
  if(dirty)snapshot();
  waves.push({x:event.clientX,y:event.clientY,time:performance.now()/1000});
  if(waves.length>8)waves.shift();
  if(!frame)frame=requestAnimationFrame(render);
 });
 const invalidate=()=>{stop();dirty=true;};
 addEventListener('resize',invalidate);
 addEventListener('scroll',invalidate,{passive:true});
 document.fonts?.ready.then(invalidate);
 document.fonts?.addEventListener('loadingdone',invalidate);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
 reducedMotion.addEventListener('change',invalidate);
 canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();available=false;stop();});
})();
