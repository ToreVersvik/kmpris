"""Lager delingsbilder (1200x630) for forsiden og hver skomodell i assets/og/.

Bildene viser bare ting som ikke endrer seg hver uke (modell, merke, kategori),
så de lages bare når de mangler. Prisen per km står i delingsteksten i stedet.
Bruk: python3 verktoy/bilder.py   (kjøres automatisk av bygg.py og oppdater.py)
"""
import json, os, subprocess, sys
from playwright.sync_api import sync_playwright

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out = os.path.join(root, 'assets', 'og')
os.makedirs(out, exist_ok=True)
models = json.loads(subprocess.run(['node', os.path.join(root, 'verktoy', 'sider.js'), '--liste'],
                                   capture_output=True, text=True, check=True).stdout)
css_url = 'file://' + os.path.join(root, 'assets', 'kmpris.css')
COLORS = {'daglig': '#1E8A5A', 'tempo': '#2F5BD3', 'konk': '#C2378F', 'terreng': '#B86A00'}

def esc(s):
    return str(s).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')

def card(top, title, sub, color):
    size = 150 if len(title) <= 14 else 120 if len(title) <= 20 else 96 if len(title) <= 28 else 78
    return f'''<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="{css_url}">
<style>html,body{{margin:0;width:1200px;height:630px;background:#16201B;overflow:hidden}}
.og{{position:absolute;inset:40px;background:#fff;border:4px solid #16201B;border-radius:14px;padding:46px 64px;display:flex;flex-direction:column;justify-content:space-between;color:#16201B}}
.og:before,.og:after,.og i:before,.og i:after{{content:"";position:absolute;width:22px;height:22px;border:4px solid #16201B;border-radius:50%;background:#EEF0ED}}
.og:before{{top:22px;left:22px}}.og:after{{top:22px;right:22px}}.og i:before{{bottom:22px;left:22px}}.og i:after{{bottom:22px;right:22px}}
.top{{display:flex;justify-content:space-between;align-items:center;font-family:var(--font);font-weight:700;font-size:30px;color:#59645E;padding:0 24px}}
.top .c{{display:flex;align-items:center;gap:12px}}.top .c b{{width:20px;height:20px;border-radius:50%;background:{color}}}
h1{{font-family:var(--display);font-weight:900;font-size:{size}px;line-height:.92;margin:0;color:#16201B;text-align:center}}
.sub{{font-family:var(--font);font-size:34px;text-align:center;color:#3A4540}}
.mark{{color:#16201B;font-family:var(--display);font-weight:900;font-size:46px;text-align:center}}.mark span{{color:#C8202A}}</style></head>
<body><div class="og"><i></i><div class="top"><span class="c"><b></b>{esc(top)}</span><span class="mark"><span>Km</span>Pris</span></div>
<h1>{esc(title)}</h1><div class="sub">{esc(sub)}</div></div></body></html>'''

jobs = [('kmpris', card('Løpesko', 'Hva koster skoen per kilometer?', 'Nesten 200 løpesko rangert etter pris per km', '#C8202A'))]
for m in models:
    jobs.append((m['slug'], card(m['cat'], m['name'], f"{m['brand']} · pris per kilometer på kmpris.no", COLORS.get(m['g'], '#C8202A'))))

todo = [(s, h) for s, h in jobs if not os.path.exists(os.path.join(out, s + '.png'))]
if not todo:
    print('Delingsbilder: alle finnes'); sys.exit(0)
tmp = os.path.join(out, '_tmp.html')
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 1200, 'height': 630})
    for slug, html in todo:
        open(tmp, 'w', encoding='utf-8').write(html)
        pg.goto('file://' + tmp); pg.wait_for_timeout(120)
        pg.screenshot(path=os.path.join(out, slug + '.png'))
    b.close()
os.remove(tmp)
print(f'Delingsbilder: {len(todo)} nye')
