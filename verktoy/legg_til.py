"""Legg til en ny sko-rad i kilde/data.js.

Bruk: python3 verktoy/legg_til.py "Merke" "Modell" <kategori> <kjønn> <pris> <prisjaktId>
      python3 verktoy/legg_til.py "Merke" "Modell" <kategori> <kjønn> <pris> reserve <url>
  Med «reserve» legges skoen inn som ca.-pris (modellen finnes ikke på Prisjakt ennå).
  Kilden (for eksempel en Prisradar-side) lagres i kilde/reserve.json. Se verktoy/reserve.py.
  kategori: daglig | stabil | tempo | konk | terreng
  kjønn:    H (herre) | D (dame) | U (unisex)
Eksempel: python3 verktoy/legg_til.py "Nike" "Pegasus 42" daglig H 1499 19876543
Nekter duplikater (samme Prisjakt-id eller samme merke+modell+kjønn).
"""
import os, re, sys
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
path = os.path.join(root, 'kilde', 'data.js')
import json, datetime
from urllib.parse import urlparse
reserve_url = None
if len(sys.argv) == 8 and sys.argv[6] == 'reserve':
    reserve_url = sys.argv[7]
    if not reserve_url.startswith('https://'): sys.exit('Ugyldig kilde-url: ' + reserve_url)
    sys.argv = sys.argv[:6] + ['']
elif len(sys.argv) != 7:
    print(__doc__); sys.exit(1)
brand, name, cat, g, nok, pj = sys.argv[1:]
if cat not in ('daglig', 'stabil', 'tempo', 'konk', 'terreng'): sys.exit('Ugyldig kategori: ' + cat)
if g not in ('H', 'D', 'U'): sys.exit('Ugyldig kjønn: ' + g)
if not nok.isdigit() or not 300 <= int(nok) <= 6000: sys.exit('Urimelig pris: ' + nok)
if reserve_url is None and not pj.isdigit(): sys.exit('Ugyldig Prisjakt-id: ' + pj)
if '"' in brand + name: sys.exit('Ikke bruk anførselstegn i navn')
data = open(path, encoding='utf-8').read()
if pj and f', "{pj}", ' in data: sys.exit(f'Prisjakt-id {pj} finnes allerede')
if f'["{brand}", "{name}", ' in data and f'["{brand}", "{name}", "{cat}", "{g}"' in data:
    sys.exit(f'{brand} {name} ({g}) finnes allerede')
end = data.index('];', data.index('var SHOES_RAW = ['))
before = data[:end].rstrip()
row = f'["{brand}", "{name}", "{cat}", "{g}", {int(nok)}, "{pj}", "", {1 if reserve_url else 0}]'
data = before + (',' if not before.endswith(',') else '') + '\n' + row + '\n' + data[end:]
open(path, 'w', encoding='utf-8').write(data)
if reserve_url:
    rpath = os.path.join(root, 'kilde', 'reserve.json')
    try: res = json.load(open(rpath, encoding='utf-8'))
    except FileNotFoundError: res = {}
    host = urlparse(reserve_url).hostname.removeprefix('www.')
    kilde = {'prisradar.no': 'Prisradar'}.get(host, host)
    res[f'{brand}|{name}|{g}'] = {'kilde': kilde, 'url': reserve_url, 'dato': datetime.date.today().isoformat()}
    json.dump(res, open(rpath, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('Lagt til:', row)
