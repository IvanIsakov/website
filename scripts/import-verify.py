import sys,pathlib,json,subprocess,concurrent.futures,hashlib,collections
ROOT=pathlib.Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'.import-tools'))
from PIL import Image
import imageio_ffmpeg
manifest=ROOT/'Assets/Imported-source/manifest.json';records=json.loads(manifest.read_text(encoding='utf-8'))
ffmpeg=imageio_ffmpeg.get_ffmpeg_exe()
def verify(r):
 if r.get('status')!='downloaded':return r
 file=ROOT/r['file']
 try:
  if r['kind']=='image':
   with Image.open(file) as image:r['dimensions']=[image.width,image.height];image.verify()
  else:
   result=subprocess.run([ffmpeg,'-v','error','-i',str(file),'-t','1','-f','null','-'],capture_output=True,timeout=60)
   if result.returncode:raise RuntimeError(result.stderr.decode(errors='replace')[-500:])
  r['sha256']=hashlib.file_digest(open(file,'rb'),'sha256').hexdigest();r['verified']=True
 except Exception as e:r['verified']=False;r['verification_error']=str(e)
 return r
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:records=list(pool.map(verify,records))
manifest.write_text(json.dumps(records,ensure_ascii=False,indent=2),encoding='utf-8')
projects=json.loads((ROOT/'Assets/projects.json').read_text(encoding='utf-8-sig'))
known={p['folder'] for p in projects}
for name in {r['project'] for r in records}:
 folder=ROOT/('Assets/About' if name=='About' else 'Assets/Projects/'+name if name in known else 'Assets/Import-review/'+name)
 folder.mkdir(exist_ok=True,parents=True)
 items=[r for r in records if r['project']==name]
 (folder/'import-sources.json').write_text(json.dumps(items,ensure_ascii=False,indent=2),encoding='utf-8')
 notes=[]
 for r in items:
  if r['kind']=='video':notes.append(r['title']+'\n'+r.get('description','')+'\nSource: '+r.get('url',r['source_page'])+'\nStatus: '+r.get('status','unknown'))
 if notes:(folder/'video-notes.txt').write_text('\n\n'.join(notes)+'\n',encoding='utf-8')
# Human-readable inventory and explicitly unresolved content.
counts=collections.Counter(r['kind'] for r in records if r.get('status')=='downloaded')
lines=['# Import from ivascht.com','',f"Downloaded {counts['image']} images and {counts['video']} videos ({sum(r.get('bytes',0) for r in records)/1e9:.2f} GB), plus 16 PNG covers.",'','Source: https://www.ivascht.com/ and all seven pages in its sitemap. Imported 2026-09-11.','', 'Original text snapshots and gallery captions are in `pages/`. `manifest.json` records every media URL, destination, checksum and verification status. Each populated folder also has `import-sources.json`, original extra prose in `imported-text.txt`, and video captions in `video-notes.txt` where applicable. Existing Intro.txt and contact details were preserved.','', '## Project coverage','','| Project | Images | Videos | Description |','| --- | ---: | ---: | --- |']
for p in projects:
 items=[r for r in records if r['project']==p['folder'] and r.get('status')=='downloaded']
 c=collections.Counter(r['kind'] for r in items)
 text=(ROOT/'Assets/Projects'/p['folder']/'description.txt').read_text(encoding='utf-8-sig').strip()
 lines.append(f"| {p['name']} | {c['image']} | {c['video']} | {'Imported' if text else 'Not found on old site'} |")
lines+=['','Counts exclude generated thumbnail.png covers. Two About photographs were imported into Assets/About. The old biography is archived there; the newer Assets/Intro.txt remains the displayed biography. The shared v-health description was copied to XR and mobile, but the XR photograph was assigned only to XR.','', '## Content needing a project decision','','`Assets/Import-review` preserves older items that do not have an unambiguous matching project in the current catalog:','']
for folder in sorted((ROOT/'Assets/Import-review').iterdir()):lines.append('- '+folder.name)
lines+=['','Generative art includes Processing experiments, AI video, 3D pigeon, Blobs and Meditation circles. These are not labelled as Compute shaders or Daria’s face on the source, so no match was invented. Moon crater path and Around the World in 80 Washing Lines are separate works not listed in the current catalog. Site template media contains the old page’s stock/demo channel assets. These review folders are not published by the site builder.','', '## Videos unavailable for download','']
for r in records:
 if r.get('status')!='downloaded':
  reason='Vimeo page requires login; public embedded player check also failed for the teleoperation video.' if r['project']=='Bifrost' else 'Old site stock/demo video; no working public download URL.'
  lines.append('- '+r['project']+' — '+r['title']+': '+reason+' Source: '+r.get('url',r['source_page']))
lines+=['','No login credentials, browser cookies, or restricted access were used.','', '## Local preview','','Run `npm.cmd run dev` and refresh the page. Videos are local MP4 files, including long recordings; no files were published or pushed to GitHub as part of this import.']
(ROOT/'Assets/Imported-source/IMPORT-REPORT.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
print(dict(counts),'verified',sum(r.get('verified',False) for r in records),'failures',[r.get('verification_error') for r in records if r.get('verified') is False])
