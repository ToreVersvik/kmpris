// KmPris: bygger én statisk side per skomodell (sko/<slug>/index.html),
// felles stilark (assets/kmpris.css), sitemap.xml og robots.txt.
// Bruk: node verktoy/sider.js   (kjøres automatisk av bygg.py og oppdater.py)
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const src = f => fs.readFileSync(path.join(root, 'kilde', f), 'utf8');
const ctx = {}; vm.createContext(ctx); vm.runInContext(src('data.js'), ctx);
const { SITE, MODELS, LIFE, SHOES, LIFE_ADJ, PRICES_SOURCE } = ctx;
const lifeKm = ctx.lifeKm, lifeAdj = ctx.lifeAdj, perKm = ctx.perKm, group = ctx.group;
let TESTS = {};
try { TESTS = JSON.parse(src('tester.json')); } catch (e) { /* valgfri fil */ }
// Reservepriser (sko som ikke finnes på Prisjakt ennå): {"Merke|Modell|G": {kilde, url, dato}}
let RESERVE = {};
try { RESERVE = JSON.parse(src('reserve.json')); } catch (e) { /* valgfri fil */ }
const resOf = s => (!s.pj && RESERVE[s.brand + '|' + s.name + '|' + s.g]) || null;
const datoNo = d => d ? d.split('-').reverse().join('.') : '';

const BASE = 'https://kmpris.no';
const CAT = {
  daglig: { label: 'Trening', one: 'treningssko', many: 'treningsskoene', color: 'var(--c-daglig)' },
  tempo: { label: 'Tempo', one: 'tempo- og platesko', many: 'tempo- og plateskoene', color: 'var(--c-plate)' },
  konk: { label: 'Konkurranse', one: 'konkurransesko', many: 'konkurranseskoene', color: 'var(--c-konk)' },
  terreng: { label: 'Terreng', one: 'terrengsko', many: 'terrengskoene', color: 'var(--c-terreng)' }
};
const GLABEL = { H: 'Herre', D: 'Dame', U: 'Unisex', X: 'Kjønn ikke oppgitt' };
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const kr = (n, d) => n.toLocaleString('nb-NO', { minimumFractionDigits: d, maximumFractionDigits: d }).replace(/ /g, ' ');
const slugify = s => s.toLowerCase().replace(/æ/g, 'ae').replace(/ø/g, 'o').replace(/å/g, 'a')
  .normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const slugOf = s => slugify(s.brand + ' ' + s.name);
const pjUrl = s => s.pj ? 'https://www.prisjakt.no/product.php?p=' + s.pj
  : 'https://www.prisjakt.no/search?query=' + encodeURIComponent(s.brand + ' ' + s.name);

// --- Stilark: CSS fra kilde/head.html + sidespesifikk CSS ---
const head = src('head.html');
const css = [...head.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n') + `
.crumb{font-size:14px;color:var(--muted);margin:28px 0 18px}.crumb a{color:inherit}
.m-head{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);gap:40px;align-items:center}
.m-head .brandline{display:flex;align-items:center;gap:8px;font-size:16px;color:var(--ink-2)}
.m-head .sw{width:10px;height:10px;border-radius:50%;display:inline-block}
.m-grid{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);gap:48px;margin-top:56px;align-items:start}
.m-grid .block{margin-top:0}.m-grid .block+.block{margin-top:48px}
.m-side{display:flex;flex-direction:column;gap:24px}
.facts{display:grid;grid-template-columns:auto 1fr;gap:6px 18px;font-size:15px}.facts dt{color:var(--muted)}.facts dd{margin:0;font-weight:600}
.links li a{font-weight:600}
@media (max-width:820px){.m-head,.m-grid{grid-template-columns:1fr;gap:28px}}
`;
fs.mkdirSync(path.join(root, 'assets'), { recursive: true });
fs.writeFileSync(path.join(root, 'assets', 'kmpris.css'), css);
const iconHref = (head.match(/<link rel="icon" href="([^"]+)"/) || [])[1] || '';

// --- Grupper rader per modell ---
const models = new Map();
for (const s of SHOES) {
  const k = s.brand + '|' + s.name;
  if (!models.has(k)) models.set(k, { key: k, brand: s.brand, name: s.name, slug: slugOf(s), rows: [] });
  models.get(k).rows.push(s);
}
if (process.argv.includes('--liste')) {
  console.log(JSON.stringify([...models.values()].map(m => { const g = group(m.rows[0].cat); return { slug: m.slug, name: m.name, brand: m.brand, g, cat: CAT[g].label + 'sko' }; })));
  process.exit(0);
}
const byGroup = {};
for (const s of SHOES) (byGroup[group(s.cat)] = byGroup[group(s.cat)] || []).push(s);
for (const g in byGroup) byGroup[g].sort((a, b) => perKm(a) - perKm(b));
const median = arr => { const v = arr.map(perKm).sort((a, b) => a - b); return v[Math.floor(v.length / 2)]; };

function page({ title, desc, url, body, img, nav }) {
  nav = nav || 'skoene';
  return `<!doctype html><html lang="no"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${url}">
<meta name="theme-color" content="#16201B"><meta property="og:type" content="article"><meta property="og:site_name" content="KmPris">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${url}"><meta property="og:locale" content="nb_NO">
<meta property="og:image" content="${BASE}/assets/og/${img || 'kmpris'}.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="${iconHref}"><link rel="stylesheet" href="/assets/kmpris.css"></head><body>
<header class="site-head"><div class="wrap"><a class="logo" href="/" aria-label="KmPris, til forsiden"><span class="km">Km</span>Pris</a>
<nav class="main" aria-label="Hovedmeny"><a href="/#skoene"${nav === 'skoene' ? ' aria-current="page"' : ''}>Rangering</a><a href="/#velg">Velg sko</a><a href="/sammenlign/"${nav === 'cmp' ? ' aria-current="page"' : ''}>Sammenlign</a><a href="/min-skopark/"${nav === 'skopark' ? ' aria-current="page"' : ''}>Min skopark</a><a href="/#kjop">Butikker</a><a href="/#om">Om KmPris</a></nav></div></header>
${body}
<footer><div class="wrap"><span>KmPris (Kilometerpris) er uavhengig og ikke tilknyttet merkene, distributørene eller butikkene som nevnes. Siden tjener ingen provisjon i dag. Hvis det endrer seg, merkes lenkene tydelig.</span>
<span>Laget av Tore i Telemark. <a href="/#personvern">Personvern</a> · <a href="/#om">Om KmPris</a> · <a href="mailto:post@kmpris.no">post@kmpris.no</a></span>
<span>Priser sist sjekket ${esc(SITE.updated)}.</span></div></footer>
<script data-goatcounter="https://kmpris.goatcounter.com/count" async src="//gc.zgo.at/count.js"></script></body></html>`;
}

const urls = [BASE + '/'];
let count = 0;
fs.rmSync(path.join(root, 'sko'), { recursive: true, force: true });
for (const m of models.values()) {
  const rows = m.rows.slice().sort((a, b) => perKm(a) - perKm(b));
  const best = rows[0], g = group(best.cat), c = CAT[g];
  const list = byGroup[g], rank = list.indexOf(best) + 1;
  const km = lifeKm(best), adj = lifeAdj(best), base = LIFE[best.cat].km;
  const rich = MODELS.find(x => x.id === best.detail) || null;
  const url = `${BASE}/sko/${m.slug}/`;
  const fullName = `${m.brand} ${m.name}`;
  const minPrice = Math.min(...rows.map(r => r.nok));
  const approx = rows.some(r => r.approx);
  const allApprox = rows.every(r => r.approx);

  const priceRows = rows.map(r => `<tr><td>${esc(GLABEL[r.g])}</td><td class="n">${r.approx ? 'ca. ' : ''}${kr(r.nok, 0)} kr</td><td class="n"><b>${kr(perKm(r), 2)}</b></td>
<td class="n"><a href="${rich && rich.shop && !r.pj ? esc(rich.shop) : resOf(r) ? esc(resOf(r).url) : pjUrl(r)}" rel="nofollow">${rich && rich.shop && !r.pj ? esc(rich.shopName || 'Butikken') : resOf(r) ? esc(resOf(r).kilde) : 'Prisjakt'} ↗</a></td></tr>`).join('');
  const res = rows.map(resOf).find(Boolean) || null;
  const resText = res ? `Ca.-pris fra ${esc(res.kilde)} ${esc(datoNo(res.dato))}, fordi modellen ikke finnes på Prisjakt ennå.` : '';

  const lifeText = adj
    ? `<p>Vi regner med <b>${km} km</b>. Standard for ${c.one} er ${base} km. Justert fordi en uavhengig lab-test målte yttersålen: ${kr(adj.t, 1)} mm tykk (snitt ${kr(adj.at, 1)} mm) og ${kr(adj.w, 1)} mm slitasje i slipetesten (snitt ${kr(adj.aw, 1)} mm, lavere er bedre). Kilde: <a href="${esc(adj.src)}">RunRepeat</a>.</p>`
    : `<p>Vi regner med <b>${km} km</b>, standardlevetiden for ${c.one}. Vi har ikke funnet lab-målinger av yttersålen på denne modellen ennå.</p>`;

  const tests = [];
  if (adj) tests.push(['RunRepeat: lab-test med målinger', adj.src]);
  if (rich) (rich.sources || []).forEach(s => tests.push(s));
  (TESTS[m.key] || []).forEach(s => tests.push(s));
  const seen = new Set(); const testList = tests.filter(t => !seen.has(t[1]) && seen.add(t[1]));
  const testsHtml = (testList.length ? '<ul class="plain links">' + testList.map(t => `<li><a href="${esc(t[1])}">${esc(t[0])}</a></li>`).join('') + '</ul>'
    : '<p class="small">Vi har ikke samlet tester av denne modellen ennå.</p>') +
    `<p class="small">Finn flere: <a href="https://www.google.com/search?q=${encodeURIComponent(fullName + ' review')}">søk etter tester av ${esc(fullName)}</a>.</p>`;

  const cheaper = list.filter(s => s.brand + '|' + s.name !== m.key && perKm(s) < perKm(best));
  const alts = cheaper.length ? cheaper : list.filter(s => s.brand + '|' + s.name !== m.key);
  const altTitle = cheaper.length ? 'Billigere per km blant ' + c.many : 'Nærmeste konkurrenter blant ' + c.many;
  const altSeen = new Set(), altPick = [];
  for (const s of alts) { const k = s.brand + '|' + s.name; if (!altSeen.has(k)) { altSeen.add(k); altPick.push(s); } if (altPick.length === 6) break; }
  const altHtml = '<table class="res"><thead><tr><th>Sko</th><th class="n">Pris</th><th class="n">kr/km</th></tr></thead><tbody>' +
    altPick.map(s => `<tr><td><a href="/sko/${slugOf(s)}/">${esc(s.brand)} ${esc(s.name)}</a><br><span class="small">${esc(GLABEL[s.g])} · ${lifeKm(s)} km</span></td><td class="n">${s.approx ? 'ca. ' : ''}${kr(s.nok, 0)}</td><td class="n"><b>${kr(perKm(s), 2)}</b></td></tr>`).join('') + '</tbody></table>';

  const richHtml = rich ? `<div class="block"><h2>Om skoen</h2><p>${esc(rich.about)}</p>
${rich.fits && rich.fits.length ? '<h3>Passer til</h3><ul class="plain">' + rich.fits.map(x => `<li>${esc(x)}</li>`).join('') + '</ul>' : ''}
${rich.know && rich.know.length ? '<h3>Verdt å vite</h3><ul class="plain">' + rich.know.map(x => `<li>${esc(x)}</li>`).join('') + '</ul>' : ''}
${rich.testers ? `<h3>Hva testerne sier</h3><p>${esc(rich.testers)}</p>` : ''}
${rich.specs && rich.specs.length ? '<dl class="facts">' + rich.specs.map(x => `<dt>${esc(x[0])}</dt><dd>${esc(x[1])}</dd>`).join('') + '</dl>' : ''}
</div>` : '';

  const med = median(list);
  const body = `<main class="wrap">
<p class="crumb"><a href="/#skoene">Rangering</a> › ${esc(c.label)} › ${esc(m.name)}</p>
<div class="m-head"><div class="stack">
<span class="brandline"><i class="sw" style="background:${c.color}"></i>${esc(c.label)}sko fra ${esc(m.brand)}</span>
<h1>${esc(m.name)}</h1>
<p class="lede">Fra ${approx ? 'ca. ' : ''}${kr(minPrice, 0)} kr. ${rows.length > 1 ? 'Egen pris for ' + rows.map(r => GLABEL[r.g].toLowerCase()).join(' og ') + '. ' : ''}${allApprox ? (res && !rich ? resText : 'Omregnet fra euro, se kilde under.') : 'Laveste pris på Prisjakt ' + esc(PRICES_SOURCE.date || SITE.updated) + '.' + (res ? ' ' + resText : '')}</p></div>
<div class="bib big-km"><div class="bib-top"><span>KmPris</span><span>${rows.length > 1 ? esc(GLABEL[best.g]) : ''}</span></div>
<div class="bib-num">${kr(perKm(best), 2)}<small>kr/km</small></div>
<p class="bib-foot">Plass ${rank} av ${list.length} blant ${c.many}, regnet med ${km} km levetid.</p></div></div>

<div class="m-grid"><div>
<div class="block"><h2>Priser</h2>
<table class="res"><thead><tr><th>Variant</th><th class="n">Laveste pris</th><th class="n">kr/km</th><th class="n">Se priser</th></tr></thead><tbody>${priceRows}</tbody></table>
<p class="small">${allApprox ? (res && !rich ? 'Modellen finnes ikke på Prisjakt ennå, så prisen er laveste treff på ' + esc(res.kilde) + ' og kan avvike.' : (rich && rich.priceSrc ? esc(rich.priceSrc) + '. ' : '') + 'Merket finnes ikke på Prisjakt, så prisen er omregnet fra euro og kan avvike.') : 'Prisen er laveste pris på Prisjakt, som ofte gjelder enkelte størrelser eller farger.'} Sjekk alltid prisen i din størrelse.</p></div>
<div class="block"><h2>Levetid</h2>${lifeText}
<p class="small">Hvor lenge en sko varer, avhenger mye av vekt, underlag og løpsstil. <a href="/#metode">Les hvordan vi regner</a>.</p></div>
${richHtml}
<div class="block"><h2>Tester og omtaler</h2>${testsHtml}</div>
</div>
<aside class="m-side">
<div class="fit"><b>Prøv før du kjøper.</b> En sko som ikke passer, er aldri billig, uansett pris per kilometer. Prøv den i butikk eller kjøp der det er enkelt å returnere. <a href="/#velg">Slik velger du riktig sko</a> · <a href="/#storrelse">Finn riktig størrelse</a>.</div>
<p class="small"><a href="/sammenlign/?sko=${m.slug}"><b>Sammenlign med andre sko</b></a></p>
<p class="small"><b>Har du denne skoen?</b> <a href="/min-skopark/?legg=${m.slug}">Legg den i Min skopark</a> og følg med på hva den faktisk koster deg per km.</p>
<div class="calc"><h3>Regn selv</h3><p class="small">Fant du et annet tilbud, eller tror du skoen varer lenger for deg?</p>
<div class="calc-inputs"><label for="cp">Pris i kr<input id="cp" type="number" min="1" inputmode="numeric" value="${best.nok}"></label>
<label for="ck">Levetid i km<input id="ck" type="number" min="1" step="10" inputmode="numeric" value="${km}"></label></div>
<p class="calc-result"><b id="cr">${kr(perKm(best), 2)}<small> kr/km</small></b></p>
<p class="small" id="cm">Midten av ${c.many} ligger på ${kr(med, 2)} kr/km.</p></div>
<div class="stack"><h3>${esc(altTitle)}</h3>${altHtml}<p class="small"><a href="/#skoene">Se hele rangeringen</a></p></div>
</aside></div></main>
<script>(function(){var p=document.getElementById('cp'),k=document.getElementById('ck'),r=document.getElementById('cr'),m=document.getElementById('cm'),med=${med.toFixed(4)};
function u(){var v=(+p.value)/(+k.value);if(!isFinite(v)||v<=0){r.innerHTML='–';return;}r.innerHTML=v.toLocaleString('nb-NO',{minimumFractionDigits:2,maximumFractionDigits:2})+'<small> kr/km</small>';
m.textContent=(v<=med?'Billigere':'Dyrere')+' enn midten av ${c.many} ('+med.toLocaleString('nb-NO',{minimumFractionDigits:2,maximumFractionDigits:2})+' kr/km).';}
p.addEventListener('input',u);k.addEventListener('input',u);})();</script>`;

  const desc = `${fullName} koster fra ${approx ? 'ca. ' : ''}${kr(minPrice, 0)} kr og ${kr(perKm(best), 2)} kr per kilometer med ${km} km levetid. Plass ${rank} av ${list.length} blant ${c.many}. Priser, levetid og tester.`;
  const html = page({ title: `${fullName}: ${kr(perKm(best), 2)} kr per km | KmPris`, desc, url, body, img: m.slug });
  fs.mkdirSync(path.join(root, 'sko', m.slug), { recursive: true });
  fs.writeFileSync(path.join(root, 'sko', m.slug, 'index.html'), html);
  urls.push(url); count++;
}

// --- Sammenlign ---
{
  const list = [...models.values()].map(m => {
    const rows = m.rows.slice().sort((a, b) => perKm(a) - perKm(b)); const best = rows[0]; const g = group(best.cat);
    const a = lifeAdj(best);
    return { slug: m.slug, label: m.brand + ' ' + m.name, brand: m.brand, name: m.name, cat: CAT[g].label,
      rank: byGroup[g].indexOf(best) + 1, of: byGroup[g].length, price: best.nok, approx: !!best.approx,
      variants: rows.map(r => ({ g: GLABEL[r.g], nok: r.nok })), life: lifeKm(best), perKm: +perKm(best).toFixed(4),
      adj: a ? { w: a.w, t: a.t, aw: a.aw, at: a.at, src: a.src } : null, pj: pjUrl(best) };
  }).sort((a, b) => a.label.localeCompare(b.label, 'nb'));
  const body = `<script>window.KM_CMP=${JSON.stringify(list).replace(/</g, '\\u003c')};</script>\n` + src('sammenlign.html');
  fs.mkdirSync(path.join(root, 'sammenlign'), { recursive: true });
  fs.writeFileSync(path.join(root, 'sammenlign', 'index.html'), page({ title: 'Sammenlign løpesko: pris, levetid og pris per km | KmPris',
    desc: 'Sammenlign 2 til 5 løpesko side om side: laveste pris, levetid, pris per kilometer og hva 1 000 km koster i hver sko.',
    url: BASE + '/sammenlign/', body, nav: 'cmp' }));
  urls.push(BASE + '/sammenlign/');
}
// --- Min skopark ---
{
  const list = [...models.values()].map(m => { const r = m.rows.slice().sort((a, b) => a.nok - b.nok)[0]; const g = group(r.cat);
    return { label: m.brand + ' ' + m.name, slug: m.slug, cat: CAT[g].label.toLowerCase(), price: r.nok, life: lifeKm(r) }; })
    .sort((a, b) => a.label.localeCompare(b.label, 'nb'));
  const body = `<script>window.KM_MODELS=${JSON.stringify(list).replace(/</g, '\\u003c')};</script>\n` + src('skopark.html');
  fs.mkdirSync(path.join(root, 'min-skopark'), { recursive: true });
  fs.writeFileSync(path.join(root, 'min-skopark', 'index.html'), page({ title: 'Min skopark: hva koster dine løpesko per km? | KmPris',
    desc: 'Hold oversikt over dine egne løpesko: kjøpspris, kilometer og faktisk pris per kilometer. Gratis, uten konto, lagres bare på din enhet.',
    url: BASE + '/min-skopark/', body, nav: 'skopark' }));
  urls.push(BASE + '/min-skopark/');
}
const today = new Date().toISOString().slice(0, 10);
fs.writeFileSync(path.join(root, 'sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  urls.map(u => `<url><loc>${u}</loc><lastmod>${today}</lastmod></url>`).join('\n') + '\n</urlset>\n');
fs.writeFileSync(path.join(root, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${BASE}/sitemap.xml\n`);
console.log(`${count} skosider bygget, sitemap med ${urls.length} adresser`);
