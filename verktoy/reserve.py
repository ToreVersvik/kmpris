"""Reservepriser: sko som ikke finnes på Prisjakt ennå og har ca.-pris fra en annen kilde (Prisradar).

Registeret ligger i kilde/reserve.json: {"Merke|Modell|G": {"kilde", "url", "dato"}}.
Radene i data.js har tom Prisjakt-id og approx = 1 (vises som «ca.» på siden).

Bruk:
  python3 verktoy/reserve.py liste
      JSON-liste over alle reserve-sko med pris, kilde, dato og alder i dager.
  python3 verktoy/reserve.py pris "Merke|Modell|G" <pris> [url]
      Ny ca.-pris (og eventuelt ny kilde-url). Setter dagens dato.
      Nekter endringer over 45 % (skriv dem i rapporten i stedet).
  python3 verktoy/reserve.py bytt "Merke|Modell|G" <prisjaktId> <pris>
      Modellen har kommet på Prisjakt: setter Prisjakt-id og ekte pris, fjerner ca.-merket
      og tar skoen ut av reserve.json.
Kjør verktoy/bygg.py etterpå hvis du ikke kjører oppdater.py.
"""
import json, os, re, sys, datetime

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
dpath = os.path.join(root, 'kilde', 'data.js')
rpath = os.path.join(root, 'kilde', 'reserve.json')
today = datetime.date.today()

def load():
    try: return json.load(open(rpath, encoding='utf-8'))
    except FileNotFoundError: return {}

def save(res):
    json.dump(res, open(rpath, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

def row_re(key):
    brand, name, g = key.split('|')
    return re.compile(r'\["' + re.escape(brand) + r'", "' + re.escape(name) + r'", "(\w+)", "' + re.escape(g)
                      + r'", (\d+), "", "([^"]*)", 1\]')

def fail(msg):
    print(msg); sys.exit(1)

if len(sys.argv) < 2:
    print(__doc__); sys.exit(1)
cmd, args = sys.argv[1], sys.argv[2:]
res = load()
data = open(dpath, encoding='utf-8').read()

if cmd == 'liste':
    out = []
    for key, v in res.items():
        m = row_re(key).search(data)
        brand, name, g = key.split('|')
        out.append({'nokkel': key, 'merke': brand, 'modell': name, 'kjonn': g,
                    'pris': int(m.group(2)) if m else None, 'kategori': m.group(1) if m else None,
                    'kilde': v['kilde'], 'url': v['url'], 'dato': v['dato'],
                    'dager': (today - datetime.date.fromisoformat(v['dato'])).days})
    print(json.dumps(out, ensure_ascii=False, indent=1))

elif cmd == 'pris' and len(args) in (2, 3):
    key, nok = args[0], args[1]
    if key not in res: fail(f'{key} står ikke i reserve.json')
    if not nok.isdigit() or not 300 <= int(nok) <= 6000: fail('Urimelig pris: ' + nok)
    m = row_re(key).search(data)
    if not m: fail(f'Fant ingen ca.-rad for {key} i data.js')
    old, new = int(m.group(2)), int(nok)
    if abs(new - old) / old > 0.45:
        fail(f'IKKE endret: {key} {old} -> {new} kr ({(new-old)/old:+.0%}). Sjekk manuelt.')
    data = data[:m.start(2)] + str(new) + data[m.end(2):]
    open(dpath, 'w', encoding='utf-8').write(data)
    res[key]['dato'] = today.isoformat()
    if len(args) == 3:
        if not args[2].startswith('https://'): fail('Ugyldig url: ' + args[2])
        res[key]['url'] = args[2]
    save(res)
    print(f'{key}: {old} -> {new} kr (ca.)')

elif cmd == 'bytt' and len(args) == 3:
    key, pj, nok = args
    if key not in res: fail(f'{key} står ikke i reserve.json')
    if not pj.isdigit(): fail('Ugyldig Prisjakt-id: ' + pj)
    if not nok.isdigit() or not 300 <= int(nok) <= 6000: fail('Urimelig pris: ' + nok)
    if f', "{pj}", ' in data: fail(f'Prisjakt-id {pj} finnes allerede')
    m = row_re(key).search(data)
    if not m: fail(f'Fant ingen ca.-rad for {key} i data.js')
    brand, name, g = key.split('|')
    row = f'["{brand}", "{name}", "{m.group(1)}", "{g}", {int(nok)}, "{pj}", "{m.group(3)}", 0]'
    data = data[:m.start()] + row + data[m.end():]
    open(dpath, 'w', encoding='utf-8').write(data)
    del res[key]; save(res)
    print('Byttet til Prisjakt:', row)

else:
    print(__doc__); sys.exit(1)
