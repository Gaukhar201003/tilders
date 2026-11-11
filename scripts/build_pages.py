"""Build Tildes for GitHub Pages without changing hash routes."""
from pathlib import Path
import os,re,shutil,json
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'site'
OUTPUT=ROOT/'_site'
base=os.environ.get('PAGES_BASE_PATH','').strip().strip('/')
if base and (not re.fullmatch(r'[A-Za-z0-9_.~%/-]+',base) or '..' in base.split('/')):
    raise ValueError('Invalid Pages base path')
prefix='/'+base if base else ''
version='routefix-'+os.environ.get('GITHUB_SHA','20261111')[:10]
if OUTPUT.exists():shutil.rmtree(OUTPUT)
shutil.copytree(SOURCE,OUTPUT)
# Only URLs beginning after a quote or opening parenthesis are asset paths.
# A route beginning with '#/' cannot match this expression.
assets=re.compile(r"(?P<quote>['\"(])/(?P<dir>css|js|fonts|media|practice|camera|data)(?=[/\"'`?])")
for file in OUTPUT.rglob('*'):
    if file.suffix.lower() not in {'.html','.js','.css','.json'}:continue
    text=file.read_text(encoding='utf-8')
    if prefix:
        text=text.replace('#'+prefix+'/', '#/')
        text=assets.sub(lambda m:m['quote']+prefix+'/'+m['dir'],text)
        text=text.replace('${location.origin}/#/', '${location.origin}'+prefix+'/#/')
        text=text.replace('href="/#/', 'href="'+prefix+'/#/')
    text=re.sub(r'(?<=[?&])v=[A-Za-z0-9_-]+','v='+version,text)
    file.write_text(text,encoding='utf-8')
# Accept shared links created by the earlier exporter, even if opened directly.
if prefix:
    slug=json.dumps(prefix.strip('/')+'/')
    fix="""<script>(function(){var bad=%s;function clean(h){var s=h.slice(2);while(s.indexOf(bad)===0)s=s.slice(bad.length);return '#/'+s;}function repair(){if(location.hash.indexOf('#/')===0){var h=clean(location.hash);if(h!==location.hash)location.replace(h);}}repair();window.addEventListener('hashchange',repair);document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a');if(a){var h=a.getAttribute('href');if(h&&h.indexOf('#/')===0)a.setAttribute('href',clean(h));}},true);})();</script>"""%slug
    page=OUTPUT/'index.html'
    page.write_text(page.read_text(encoding='utf-8').replace('</head>',fix+'\n</head>'),encoding='utf-8')
(OUTPUT/'.nojekyll').touch()
print('Built Tildes at',prefix or '/', 'version',version)
