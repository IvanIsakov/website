import sys,pathlib,urllib.request,concurrent.futures,xml.etree.ElementTree as ET,json
ROOT=pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'.import-tools'))
from bs4 import BeautifulSoup
cache=ROOT/'.import-cache';cache.mkdir(exist_ok=True)
urls=[e.text for e in ET.parse(ROOT/'Assets/pages-sitemap.xml').iter() if e.tag.endswith('loc')]
def fetch(url):
 name=url.rstrip('/').rsplit('/',1)[-1] if url.rstrip('/')!='https://www.ivascht.com' else 'home'
 data=urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'}),timeout=40).read()
 (cache/(name+'.html')).write_bytes(data)
 soup=BeautifulSoup(data,'html.parser');main=soup.find('main') or soup
 for e in main.select('script,style'):e.decompose()
 (cache/(name+'.txt')).write_text(main.get_text('\n',strip=True),encoding='utf-8')
 items=[]
 for e in main.find_all(['h1','h2','h3','p','img','iframe','video']):
  items.append({'tag':e.name,'id':e.get('id'),'text':e.get_text(' ',strip=True) if e.name not in ['img','iframe','video'] else '', 'src':e.get('src'),'alt':e.get('alt'),'parent':e.parent.get('id')})
 (cache/(name+'.items.json')).write_text(json.dumps(items,ensure_ascii=False,indent=2),encoding='utf-8')
 return name,len(data)
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
 for result in pool.map(fetch,urls):print(result)
