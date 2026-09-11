import sys,pathlib,json,urllib.request,concurrent.futures,subprocess,os,time
ROOT=pathlib.Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'.import-tools'))
from PIL import Image
import imageio_ffmpeg
manifest=ROOT/'Assets/Imported-source/manifest.json';records=json.loads(manifest.read_text(encoding='utf-8'))
ffmpeg=imageio_ffmpeg.get_ffmpeg_exe();env=os.environ.copy();env['PYTHONPATH']=str(ROOT/'.import-tools')
logs=ROOT/'.import-cache/logs';logs.mkdir(exist_ok=True)
def download(r):
 if not r.get('url'):return r
 target=ROOT/r['file'];target.parent.mkdir(parents=True,exist_ok=True)
 if target.exists() and target.stat().st_size:r['status']='downloaded';r['bytes']=target.stat().st_size;return r
 try:
  if r['kind']=='video' and ('youtube.com' in r['url'] or 'vimeo.com' in r['url']):
   cmd=[sys.executable,'-m','yt_dlp','--no-playlist','--no-progress','--no-overwrites','--socket-timeout','30','--retries','2','--fragment-retries','2','--js-runtimes','node','--ffmpeg-location',ffmpeg,'--merge-output-format','mp4','--format','bv*[height<=1080][ext=mp4]+ba[ext=m4a]/b[ext=mp4]/best','-o',str(target.with_suffix(''))+'.%(ext)s',r['url']]
   result=subprocess.run(cmd,env=env,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,timeout=1200)
   (logs/(target.stem+'.log')).write_bytes(result.stdout)
   if result.returncode:raise RuntimeError(result.stdout.decode(errors='replace')[-1200:])
   if not target.exists():raise RuntimeError('Downloader returned without expected MP4 file; see log.')
  else:
   req=urllib.request.Request(r['url'],headers={'User-Agent':'Mozilla/5.0','Referer':r['source_page']})
   temp=target.with_suffix(target.suffix+'.part')
   with urllib.request.urlopen(req,timeout=60) as response,open(temp,'wb') as f:
    if 'text/html' in response.headers.get('Content-Type',''):raise RuntimeError('Expected media; received HTML')
    while chunk:=response.read(1024*1024):f.write(chunk)
   if r['kind']=='image':
    with Image.open(temp) as im:im.verify()
   elif temp.stat().st_size<1000:raise RuntimeError('Video response too small')
   temp.replace(target)
  r['status']='downloaded';r['bytes']=target.stat().st_size
 except Exception as error:r['status']='failed';r['error']=str(error)[-1200:]
 print(r['status'],r['project'],r['title'][:55],flush=True)
 return r
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
 futures={pool.submit(download,r):i for i,r in enumerate(records)}
 for future in concurrent.futures.as_completed(futures):
  records[futures[future]]=future.result()
  manifest.write_text(json.dumps(records,ensure_ascii=False,indent=2),encoding='utf-8')
print('Complete:',sum(r.get('status')=='downloaded' for r in records),'downloaded;',sum(r.get('status')!='downloaded' for r in records),'unavailable')
