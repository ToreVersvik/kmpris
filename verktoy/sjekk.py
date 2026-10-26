"""Kvalitetssjekk av index.html. Skriver 'OK' og avslutter med kode 0 hvis alt er i orden."""
import os, sys
from playwright.sync_api import sync_playwright
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
f = 'file://' + os.path.join(root, 'index.html')
ids = ['hjem','skoene','metode','velg','storrelse','kjop','om','personvern','red-hare-8-pro','red-hare-7-pro','feidian-challenge',
       'feidian-5-elite','xtep-airflow-2','xtep-pivot-3','xtep-360x-3-lite','xtep-260x-3','xtep-160x-7-pro']
problems = []
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width':1280,'height':1500}); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(f); pg.wait_for_timeout(400)
    for i in ids:
        pg.evaluate(f"location.hash='{i}'"); pg.wait_for_timeout(150)
        t = pg.inner_text('#app')
        if len(t) < 200: problems.append(f'{i}: siden er nesten tom')
        for bad in ['undefined','NaN','null','[object','Infinity']:
            if bad in t: problems.append(f'{i}: {bad}')
        for h in pg.eval_on_selector_all('#app a[href^="#"]','els=>els.map(e=>e.getAttribute("href"))'):
            if h[1:] not in ids: problems.append(f'{i}: lenke {h}')
    pg.evaluate("location.hash='skoene'"); pg.wait_for_timeout(300)
    for h in set(pg.eval_on_selector_all('a.lrow','e=>e.map(x=>x.getAttribute("href"))')):
        if not os.path.exists(os.path.join(root, h.strip('/'), 'index.html')): problems.append('mangler side: ' + h)
    count = pg.inner_text('.count')
    if 'av 324' not in count and 'sko' not in count: problems.append('rangering: ' + count)
    m = b.new_page(viewport={'width':375,'height':900})
    for i in ['hjem','skoene','kjop']:
        m.goto(f + '#' + i); m.wait_for_timeout(300)
        if m.evaluate('document.documentElement.scrollWidth>window.innerWidth+1'): problems.append(f'mobil {i}: sidescroll')
    import glob, re as _re
    pages = sorted(glob.glob(os.path.join(root, 'sko', '*', 'index.html')))
    if len(pages) < 150: problems.append(f'bare {len(pages)} skosider')
    pairs = sorted(glob.glob(os.path.join(root, 'sammenlign', '*-vs-*', 'index.html')))
    if len(pairs) < 100: problems.append(f'bare {len(pairs)} sammenligningssider')
    pages += pairs
    for fp in pages:
        t = open(fp, encoding='utf-8').read()
        for bad in ['undefined', 'NaN', 'Infinity', '[object']:
            if bad in _re.sub(r'<script>.*?</script>', '', t, flags=_re.S): problems.append(f'{os.path.basename(os.path.dirname(fp))}: {bad}')
    b.close()
problems += ['JS-feil: ' + e for e in errs]
if problems:
    print('FEIL:'); print('\n'.join(problems)); sys.exit(1)
print('OK')
