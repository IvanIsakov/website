import pathlib,sys,json
sys.path.insert(0,str(pathlib.Path('.import-tools').resolve()))
from PIL import Image,ImageOps
root=pathlib.Path('Assets/Projects').resolve();report=[]
for folder in root.iterdir():
 if not folder.is_dir():continue
 files=[p for p in folder.iterdir() if p.is_file() and p.stem.lower()=='thumbnail']
 if len(files)>1:raise RuntimeError('Multiple thumbnails need selection: '+str(folder))
 for source in files:
  before=source.stat().st_size
  with Image.open(source) as raw:
   im=ImageOps.exif_transpose(raw).convert('RGBA');im.thumbnail((1000,1000),Image.Resampling.LANCZOS)
   background=Image.new('RGB',im.size,'white');background.paste(im,mask=im.getchannel('A'))
   dest=folder/'thumbnail.jpg';temp=folder/'thumbnail-optimized.tmp'
   background.save(temp,format='JPEG',quality=85,optimize=True,progressive=True)
  with Image.open(temp) as check:check.verify()
  temp.replace(dest)
  if source!=dest:source.unlink()
  report.append({'project':folder.name,'before':before,'after':dest.stat().st_size,'dimensions':background.size})
pathlib.Path('Assets/thumbnail-optimization.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(len(report),'thumbnails;',round(sum(r['before'] for r in report)/1e6,2),'MB to',round(sum(r['after'] for r in report)/1e6,2),'MB')
