"""Bygg index.html fra kilde/ uten å endre priser. Bruk: python3 verktoy/bygg.py"""
import os
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = os.path.join(root, 'kilde')
parts = [open(os.path.join(src, f), encoding='utf-8').read() for f in ('head.html', 'data.js', 'render.js')]
html = '<!doctype html><html lang="no"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' + ''.join(parts)
open(os.path.join(root, 'index.html'), 'w', encoding='utf-8').write(html)
print('index.html bygget,', len(html) // 1024, 'kB')
import subprocess
subprocess.run(['node', os.path.join(root, 'verktoy', 'sider.js')], check=True)
