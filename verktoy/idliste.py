"""Skriv ut alle Prisjakt-id-er som skal prissjekkes, som JSON: [[id, "Merke Modell (kjønn)"], ...]"""
import re, json, os
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
data = open(os.path.join(root, 'kilde', 'data.js'), encoding='utf-8').read()
rows = re.findall(r'\["([^"]+)", "([^"]+)", "\w+", "([HDUX])", \d+, "(\d+)"', data)
seen, out = set(), []
for brand, name, g, pj in rows:
    if pj not in seen:
        seen.add(pj); out.append([pj, f'{brand} {name} ({g})'])
print(json.dumps(out, ensure_ascii=False))
