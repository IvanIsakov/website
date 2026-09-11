import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {build,root} from './build.mjs';
build({copyAssets:false});
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.avif':'image/avif','.gif':'image/gif','.mp4':'video/mp4','.webm':'video/webm','.mov':'video/quicktime','.ogv':'video/ogg'};
http.createServer((req,res)=>{
 try{
  if(req.url==='/favicon.ico'){res.writeHead(204);res.end();return;}
  const url=new URL(req.url,'http://localhost');let file=path.resolve(root,'dist','.'+decodeURIComponent(url.pathname));
  if(!file.startsWith(path.join(root,'dist')+path.sep)&&file!==path.join(root,'dist')){res.writeHead(403);res.end();return;}
  if(!path.extname(file)){build({copyAssets:false});if(!url.pathname.endsWith('/')){res.writeHead(302,{Location:url.pathname+'/'+url.search});res.end();return;}file=path.join(file,'index.html');}
  if(url.pathname.startsWith('/media/')){
   const parts=decodeURIComponent(url.pathname).split('/');
   if(parts.length!==4 || !parts[3] || /[\\/]/.test(parts[3]) || parts[3]==='..' || !mime[path.extname(parts[3]).toLowerCase()] || /\.(html|css|js)$/i.test(parts[3])){res.writeHead(404);res.end();return;}
   const catalog=JSON.parse(fs.readFileSync(path.join(root,'Assets/projects.json'),'utf8').replace(/^\uFEFF/,''));
   const project=catalog.find(p=>p.slug===parts[2]);
   const base=parts[2]==='about'?path.join(root,'Assets/About'):project?path.join(root,'Assets/Projects',project.folder):null;
   if(!base){res.writeHead(404);res.end();return;}
   file=path.resolve(base,parts[3]);
   if(path.dirname(file)!==path.resolve(base)){res.writeHead(403);res.end();return;}
  }
  if(!fs.existsSync(file)){res.writeHead(404,{'Content-Type':'text/html'});res.end(fs.readFileSync(path.join(root,'dist/404.html')));return;}
  const size=fs.statSync(file).size;const headers={'Content-Type':mime[path.extname(file).toLowerCase()]||'application/octet-stream','Accept-Ranges':'bytes','Cache-Control':'no-cache'};
  if(req.headers.range){const m=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range);if(!m){res.writeHead(416);res.end();return;}const start=Number(m[1]),end=m[2]?Math.min(Number(m[2]),size-1):size-1;if(start>end||start>=size){res.writeHead(416,{'Content-Range':`bytes */${size}`});res.end();return;}res.writeHead(206,{...headers,'Content-Range':`bytes ${start}-${end}/${size}`,'Content-Length':end-start+1});fs.createReadStream(file,{start,end}).pipe(res);return;}
  res.writeHead(200,{...headers,'Content-Length':size});fs.createReadStream(file).pipe(res);
 }catch(error){console.error(error);res.writeHead(500);res.end('Unable to load page.');}
}).listen(Number(process.env.PORT||4321),'127.0.0.1',()=>console.log('Portfolio preview: http://127.0.0.1:'+ (process.env.PORT||4321)));
