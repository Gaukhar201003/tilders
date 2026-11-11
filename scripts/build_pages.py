"""Build a standalone static site for a GitHub Pages root or repository subpath."""
from pathlib import Path
import os,re,shutil
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'site'
OUTPUT=ROOT/'_site'
base=os.environ.get('PAGES_BASE_PATH','').strip().strip('/')
if base and (not re.fullmatch(r'[A-Za-z0-9_.~%/-]+',base) or '..' in base.split('/')):
    raise ValueError('Invalid Pages base path')
prefix='/'+base if base else ''
if OUTPUT.exists():shutil.rmtree(OUTPUT)
shutil.copytree(SOURCE,OUTPUT)
pattern=re.compile(r"(?<![#A-Za-z0-9_/.:-])/(css|js|fonts|media|practice|camera|data)(?=[/\"'`?])")
root_hash=re.compile(r"(?<![#A-Za-z0-9_/.:-])/(?=#/)")
count=0
if prefix:
    for file in OUTPUT.rglob('*'):
        if file.suffix.lower() not in {'.html','.js','.css','.json'}:continue
        text=file.read_text(encoding='utf-8')
        changed=pattern.sub(lambda m:prefix+m.group(0),text)
        changed=root_hash.sub(prefix+'/',changed)
        if changed!=text:file.write_text(changed,encoding='utf-8');count+=1
(OUTPUT/'.nojekyll').touch()
print(f'Built {OUTPUT.name}; base path {prefix or "/"}; rewrote {count} text files')
