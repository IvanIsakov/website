import sys,pathlib,json,re,hashlib,subprocess,collections
ROOT=pathlib.Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'.import-tools'))
from bs4 import BeautifulSoup
from PIL import Image
manifest=ROOT/'Assets/Imported-source/manifest.json'
records=json.loads(manifest.read_text(encoding='utf-8'))
# Exact project sections supply the main prose; all other source text is retained in imported-text.txt.
sections={'Argil':('unityandvr','argil'),'EIR Training':('unityandvr','eir training'),'Eir bands':('valkyrie-industries','eir bands'),'Bifrost':('valkyrie-industries','valkyrie bifrost'),'V-health XR':('unityandvr','v-health'),'V-health mobile':('unityandvr','v-health'),'In search of Spider Consciousness':('interactivehardware','in search of spider consciousness. 2023'),'Ear of the universe':('ear-of-the-universe','ear of the universe'),'Amon-Ra':('interactivehardware','amon-ra. a vj controller. 2020'),'DJing':('dj','dj-ing')}
for project,(page,heading) in sections.items():
 soup=BeautifulSoup((ROOT/'.import-cache'/f'{page}.html').read_text(encoding='utf-8'),'html.parser')
 h=next(h for h in soup.select('main h1,main h2') if h.get_text(' ',strip=True).casefold()==heading)
 section=h.find_parent('section')
 while section.find_parent('section'):section=section.find_parent('section')
 paragraphs=[]
 for p in section.find_all(['p','h2']):
  if p is h:continue
  text=re.sub(r'\s+',' ',p.get_text(' ',strip=True).replace('\u200b','')).strip()
  text=re.sub(r'\s*link to video$','',text)
  if text and text not in paragraphs:paragraphs.append(text)
 dest=ROOT/'Assets/Projects'/project/'description.txt'
 # Only replace text written by this import, never pre-existing user prose.
 imported=dest.with_name('imported-text.txt')
 if dest.exists() and imported.exists() and dest.read_bytes()==imported.read_bytes():dest.write_text('\n\n'.join(paragraphs)+'\n',encoding='utf-8')
# Blog is a link on the source site, not an article archive.
blog=ROOT/'Assets/Projects/Blog'
(blog/'source-links.json').write_text(json.dumps([{'title':'Blog on original site','url':'https://medium.com/@ivanisakov/','source':'https://www.ivascht.com/'}],indent=2),encoding='utf-8')
if not (blog/'description.txt').read_text(encoding='utf-8-sig').strip():(blog/'description.txt').write_text('Blog\n\nhttps://medium.com/@ivanisakov/\n',encoding='utf-8')
# Explicit source hero images are preferable to video posters as covers.
preferred={'Eir bands':'1C6A6294','EIR Training':'491821568','Bifrost':'Valkyrie_Backpack','Argil':'Unity 3D projects','V-health XR':'Stroke recovery','In search of Spider Consciousness':'DSCF7897','Ear of the universe':'IMG_20190713','Amon-Ra':'IMG_20200202','Mooncows Fest':'Pyramid'}
covers=[]
for p in json.loads((ROOT/'Assets/projects.json').read_text(encoding='utf-8-sig')):
 name=p['folder'];target=ROOT/'Assets/Projects'/name/'thumbnail.png'
 if target.exists():continue
 candidates=[r for r in records if r['project']==name and r['kind']=='image' and r.get('status')=='downloaded']
 candidates.sort(key=lambda r:(0 if preferred.get(name,'\x00').casefold() in r['title'].casefold() else 1, 'poster' in r['title'].casefold()))
 if candidates:
  source=ROOT/candidates[0]['file']
  with Image.open(source) as im:
   im.convert('RGB').save(target,'PNG')
  covers.append({'project':name,'file':str(target.relative_to(ROOT)).replace('\\','/'),'derived_from':candidates[0]['file'],'source_url':candidates[0]['url']})
(ROOT/'Assets/Imported-source/covers.json').write_text(json.dumps(covers,ensure_ascii=False,indent=2),encoding='utf-8')
print('Prepared',len(covers),'project covers; main descriptions selected from matching source sections.')
