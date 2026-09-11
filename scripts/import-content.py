"""Import public ivascht.com content. Requires tools installed in .import-tools.
Run discovery first; raw snapshots stay in .import-cache. Existing descriptions are preserved.
"""
import sys,pathlib,json,re,urllib.request,urllib.parse,concurrent.futures,hashlib,shutil,subprocess
ROOT=pathlib.Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'.import-tools'))
from bs4 import BeautifulSoup
from PIL import Image
CACHE=ROOT/'.import-cache';ARCHIVE=ROOT/'Assets/Imported-source';ARCHIVE.mkdir(exist_ok=True)
projects=json.loads((ROOT/'Assets/projects.json').read_text(encoding='utf-8-sig'))
known={p['name'].casefold():p['folder'] for p in projects}
records=[];texts={};links={};seen=set()
def folder(name):
 if name=='About':return ROOT/'Assets/About'
 if name.casefold() in known:return ROOT/'Assets/Projects'/known[name.casefold()]
 return ROOT/'Assets/Import-review'/name

def norm(t):return re.sub(r'\s+',' ',t.replace('\u200b','')).strip()
def slug(t):return re.sub(r'[^a-zA-Z0-9]+','-',t).strip('-')[:85] or 'image'
def addtext(project,text,page):
 text=norm(text)
 if text and text not in [x['text'] for x in texts.get(project,[])]:texts.setdefault(project,[]).append({'text':text,'source':page})
def addlink(project,url,title,page):
 if url.startswith(('http://','https://','mailto:')):links.setdefault(project,[]).append({'title':title,'url':url,'source':page})
def canonical(url):
 if url.startswith('//'):url='https:'+url
 if 'static.wixstatic.com/media/' in url:return url.split('/v1/')[0]
 if 'youtube.com/embed/' in url:return 'https://www.youtube.com/watch?v='+url.split('/embed/')[1].split('?')[0]
 if 'youtu.be/' in url:return 'https://www.youtube.com/watch?v='+url.split('youtu.be/')[1].split('?')[0]
 if 'player.vimeo.com/video/' in url:return 'https://vimeo.com/'+url.split('/video/')[1].split('?')[0]
 return url

def add(project,url,title,page,kind='image',description=''):
 url=canonical(url)
 key=(project,url)
 if key in seen:return
 seen.add(key)
 ext=pathlib.Path(urllib.parse.urlparse(url).path).suffix.lower()
 if kind=='video':ext='.mp4'
 elif ext not in ['.jpg','.jpeg','.png','.webp','.avif','.gif','.svg']:ext='.jpg'
 filename='import-'+slug(title)+'-'+hashlib.sha256(url.encode()).hexdigest()[:8]+ext
 records.append({'project':project,'source_page':page,'url':url,'title':title,'description':description,'kind':kind,'file':str((folder(project)/filename).relative_to(ROOT)).replace('\\','/')})

def mapping(title):
 low=title.casefold().strip()
 exact={'a portal':'Portal','covid party':'Covid party','ear of the universe':'Ear of the universe','gamified muscle haptic experiences':'Eir bands','animals enjoying xr':'Argil','immersive robotic teleoperation haptic demo':'Bifrost','valkyrie industries bifrost demo':'Bifrost','pyramid':'Mooncows Fest','interactive hardware projects':'Ear of the universe','unity 3d projects':'Argil','stroke recovery using xr & real-time functional electrical stimulation':'V-health XR'}
 return exact.get(low) or known.get(low) or ('Generative art' if low=='generative art' else title)

def walk(x):
 if isinstance(x,dict):
  yield x
  for v in x.values():yield from walk(v)
 elif isinstance(x,list):
  for v in x:yield from walk(v)

for file in sorted(CACHE.glob('*.html')):
 page='https://www.ivascht.com/'+('' if file.stem=='home' else file.stem)
 soup=BeautifulSoup(file.read_text(encoding='utf-8'),'html.parser');main=soup.find('main') or soup
 # Archive all readable source text and gallery metadata, including unassigned works.
 dest=ARCHIVE/'pages';dest.mkdir(exist_ok=True)
 shutil.copyfile(CACHE/(file.stem+'.txt'),dest/(file.stem+'.txt'))
 warm=json.loads(soup.find('script',id='wix-warmup-data').string)
 gallery_items=[]
 for group in warm.get('appsWarmupData',{}).values():
  if not isinstance(group,dict):continue
  for groupid,data in group.items():
   if not isinstance(data,dict):continue
   for item in data.get('items',[]):
    if not isinstance(item,dict) or 'metaData' not in item:continue
    m=item['metaData'];gallery_items.append(item)
    if 'comp-lkx0to53' in groupid:project='In search of Spider Consciousness'
    elif 'comp-lbe39jok' in groupid or file.stem=='ear-of-the-universe':project='Ear of the universe'
    elif file.stem=='generative-art':project='Generative art'
    else:project=mapping(m.get('title') or 'Unlabelled '+file.stem)
    title=m.get('title') or m.get('fileName') or m.get('name') or project
    description=m.get('description','')
    if description:addtext(project,description,page)
    elif file.stem=='generative-art':addtext(project,title,page)
    link=m.get('link',{});url=link.get('data',{}).get('url') or link.get('text','')
    if url:addlink(project,url,title,page)
    if m.get('type')=='video':
     if m.get('isExternal'):video=m.get('videoUrl')
     else:
      quality=max(m.get('qualities',[{'height':0,'quality':'1080p'}]),key=lambda q:q.get('height',0))['quality']
      video='https://video.wixstatic.com/video/'+item['mediaUrl']+'/'+quality+'/mp4/file.mp4'
     if video:add(project,video,title,page,'video',description)
     posters=m.get('posters',[]);custom=m.get('customPoster')
     if isinstance(custom,dict) and custom.get('url'):posters=posters+[custom]
     # Preserve the poster used on the page and any distinct custom cover.
     if posters:
      for p in [posters[-1]]:add(project,'https://static.wixstatic.com/media/'+p['url'],title+' poster',page)
    else:add(project,'https://static.wixstatic.com/media/'+item['mediaUrl'],title,page)
 (dest/(file.stem+'-gallery.json')).write_text(json.dumps(gallery_items,ensure_ascii=False,indent=2),encoding='utf-8')
 # Top-level sections group text and leading photos correctly even where photos precede headings.
 current=None
 for section in main.find_all('section'):
  if section.find_parent('section'):continue
  heading=section.find(['h1','h2']);h=norm(heading.get_text(' ',strip=True)).casefold() if heading else ''
  if h.startswith('in search of spider'):current='In search of Spider Consciousness'
  elif h.startswith('ear of the universe'):current='Ear of the universe'
  elif h.startswith('amon-ra'):current='Amon-Ra'
  elif h=='argil':current='Argil'
  elif h=='eir training':current='EIR Training'
  elif h=='eir bands':current='Eir bands'
  elif h=='valkyrie bifrost':current='Bifrost'
  elif h=='v-health':current='V-health XR'
  elif h=='valkyrie industries':current='Valkyrie overview'
  elif h=='generative art':current='Generative art'
  elif h=='dj-ing':current='DJing'
  elif file.stem=='home' and (h=='about' or h.startswith('ivan isakov')):current='About'
  elif h in ['other projects','contact']:current=None
  if not current:continue
  # Gallery and video descriptions are imported independently, avoiding player UI text.
  for p in section.find_all(['p','h2']):
   if p is heading or p.find_parent(attrs={'data-hook':True}):continue
   text=norm(p.get_text(' ',strip=True))
   if text and text.casefold() not in ['contact','about','link to video']:addtext(current,text,page)
  if current=='V-health XR':
   for entry in texts.get(current,[]):addtext('V-health mobile',entry['text'],page)
  for a in section.find_all('a',href=True):addlink(current,a['href'],norm(a.get_text(' ',strip=True)),page)
  for img in section.find_all('img'):
   if img.get('id'):continue # Gallery handled from full data, not lazy first-page DOM.
   url=img.get('src','');alt=img.get('alt','')
   if 'static.wixstatic.com/media/' not in url:continue
   if alt=='Video Channel':add('Site template media',url.split(' ')[0],alt,page);continue
   add(current,url.split(' ')[0],alt or current,page)
 # Video widgets expose all videos through schema.org, including ones outside initial carousel view.
 for script in soup.select('script[type="application/ld+json"]'):
  for item in walk(json.loads(script.string)):
   if item.get('@type')!='VideoObject':continue
   title=item.get('name','Video');url=item.get('embedUrl') or item.get('contentUrl')
   if file.stem=='unityandvr':project='Argil'
   elif file.stem=='interactivehardware':project='Ear of the universe' if 'ear of' in title.lower() else 'Amon-Ra'
   elif file.stem=='valkyrie-industries':project='Bifrost' if 'vimeo' in (url or '') else 'Eir bands'
   else:project='Site template media'
   if url:
    if 'video.wixstatic.com/video/' in url:
     vid=url.split('video.wixstatic.com/video/')[1].split('/')[0];url=f'https://video.wixstatic.com/video/{vid}/1080p/mp4/file.mp4'
    add(project,url,title,page,'video',item.get('description',''))
   else:records.append({'project':project,'source_page':page,'title':title,'kind':'video','status':'no_public_video_url','description':item.get('description','')})
   if item.get('thumbnailUrl'):add(project,item['thumbnailUrl'],title+' poster',page)
 # Archive full video metadata without expiring transport URLs.

# Store source-specific text, filling only previously empty descriptions.
for project,entries in texts.items():
 target=folder(project);target.mkdir(parents=True,exist_ok=True)
 full='\n\n'.join(x['text'] for x in entries)+'\n'
 (target/'imported-text.txt').write_text(full,encoding='utf-8')
 description=target/'description.txt'
 if project!='About' and (not description.exists() or not description.read_text(encoding='utf-8-sig').strip()):description.write_text(full,encoding='utf-8')
for project,items in links.items():
 target=folder(project);target.mkdir(parents=True,exist_ok=True)
 unique={x['url']:x for x in items}
 (target/'source-links.json').write_text(json.dumps(list(unique.values()),ensure_ascii=False,indent=2),encoding='utf-8')
(ARCHIVE/'manifest.json').write_text(json.dumps(records,ensure_ascii=False,indent=2),encoding='utf-8')
print('Prepared',len(records),'media records for',len(set(r['project'] for r in records)),'folders.')
