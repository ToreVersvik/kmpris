"""KmPris: oppdater priser fra prisjakt-priser.json og bygg index.html.

Bruk:  python3 verktoy/oppdater.py <prisfil.json>
Prisfilen er {"prisjaktId": [laveste_pris, "tittel"], ...} hentet fra Prisjakt.
Rader der tittelen ikke inneholder merkenavnet brukes ikke (feil produkt).
Endringer over +/-45 % brukes IKKE automatisk, men listes i rapporten for manuell sjekk.
"""
import json, re, sys, os, datetime

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
pfile = sys.argv[1]
src = os.path.join(root, 'kilde')
data = open(os.path.join(src, 'data.js'), encoding='utf-8').read()
prices = json.load(open(pfile, encoding='utf-8'))
today = datetime.date.today().strftime('%d.%m.%Y')

row_re = re.compile(r'\["([^"]+)", "([^"]+)", "(\w+)", "([HDUX])", (\d+), "(\d*)", "([^"]*)", (\d)\]')
changed, flagged, missing, same = [], [], [], 0
def fix(m):
    global same
    brand, name, cat, g, nok, pj, det, approx = m.groups()
    nok = int(nok)
    if not pj:
        return m.group(0)
    p = prices.get(pj)
    if not p or p[0] is None:
        missing.append(f'{brand} {name} ({g}) id {pj}: ingen pris funnet, beholdt {nok} kr')
        return m.group(0)
    norm = lambda x: re.sub(r'[^a-z0-9]', '', x.lower())
    if p[1] and norm(brand) not in norm(p[1]):
        flagged.append(f'{brand} {name} ({g}): tittel {p[1]!r} ser ut som feil produkt, ikke brukt')
        return m.group(0)
    new = int(p[0])
    if new == nok:
        same += 1
        return m.group(0)
    if abs(new - nok) / nok > 0.45:
        flagged.append(f'{brand} {name} ({g}): {nok} -> {new} kr ({(new-nok)/nok:+.0%}) IKKE brukt, sjekk {p[1]!r}')
        return m.group(0)
    changed.append((brand, name, g, nok, new))
    return f'["{brand}", "{name}", "{cat}", "{g}", {new}, "{pj}", "{det}", {approx}]'

data = row_re.sub(fix, data)
checked = len(changed) + same + len(flagged) + len(missing)
if checked and len(missing) > 0.2 * checked:
    print(f'AVBRUTT: {len(missing)} av {checked} rader mangler pris fra Prisjakt. Ingenting er endret eller publisert.')
    sys.exit(2)
data = re.sub(r'(updated:\s*")[\d.]+(")', r'\g<1>' + today + r'\2', data, count=1)
open(os.path.join(src, 'data.js'), 'w', encoding='utf-8').write(data)

head = open(os.path.join(src, 'head.html'), encoding='utf-8').read()
render = open(os.path.join(src, 'render.js'), encoding='utf-8').read()
html = ('<!doctype html><html lang="no"><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1">' + head + data + render)
open(os.path.join(root, 'index.html'), 'w', encoding='utf-8').write(html)
import subprocess
subprocess.run(['node', os.path.join(root, 'verktoy', 'sider.js')], check=True)
subprocess.run([sys.executable, os.path.join(root, 'verktoy', 'bilder.py')], check=True)

lines = [f'# Prisoppdatering {today}', '',
         f'- Rader med ny pris: {len(changed)}', f'- Uendret: {same}',
         f'- Store hopp holdt tilbake: {len(flagged)}', f'- Uten pris fra Prisjakt: {len(missing)}', '']
if changed:
    lines.append('## Største endringer')
    for b, n, g, o, nw in sorted(changed, key=lambda c: -abs(c[4] - c[3]))[:15]:
        lines.append(f'- {b} {n} ({g}): {o} -> {nw} kr')
    lines.append('')
for title, items in (('## Holdt tilbake (sjekk manuelt)', flagged), ('## Mangler pris', missing)):
    if items:
        lines.append(title); lines += ['- ' + x for x in items]; lines.append('')
os.makedirs(os.path.join(root, 'logg'), exist_ok=True)
rep = '\n'.join(lines)
open(os.path.join(root, 'logg', f'oppdatering-{datetime.date.today().isoformat()}.md'), 'w', encoding='utf-8').write(rep)
print(rep)
