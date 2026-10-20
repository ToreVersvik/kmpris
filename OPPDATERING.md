# Ukentlig prisoppdatering av KmPris

Denne fila er oppskriften den planlagte mandagsjobben følger. Siden publiseres
automatisk av GitHub Pages fra `main` til https://kmpris.no.

## Filer

- `kilde/head.html`, `kilde/data.js`, `kilde/render.js`: kildene. Prisene ligger i `SHOES_RAW` i `data.js`.
- `index.html`: ferdig bygget side. Lages av verktøyene, skal aldri redigeres for hånd.
- `verktoy/idliste.py`: lister Prisjakt-id-ene som skal sjekkes.
- `verktoy/oppdater.py <prisfil.json>`: legger inn nye priser, setter dato og bygger `index.html`.
  Holder tilbake hopp over 45 % og treff der tittelen ikke inneholder merkenavnet.
  Avbryter uten å endre noe (kode 2) hvis over 20 % av radene mangler pris.
- `verktoy/bygg.py`: bygger `index.html` uten å endre priser.
- `verktoy/sjekk.py`: kvalitetssjekk i Playwright. Skriver `OK` når alt er i orden.
- `logg/`: én rapport og én prisfil per oppdatering.

## Fremgangsmåte

1. `git pull` i repoet.
2. `python3 verktoy/idliste.py` gir lista `[[id, "Merke Modell (kjønn)"], ...]` (rundt 320 id-er).
3. For hver id: hent `https://www.prisjakt.no/product.php?p=<id>` med WebFetch og prompten
   `Svar bare med JSON på én linje: {"pris": <laveste NÅVÆRENDE pris i hele kroner som heltall, ikke 3-måneders laveste>, "tittel": "<produktnavnet øverst på siden>"}. Finnes ingen nåværende pris, bruk null.`
   Kjør mange kall parallelt (for eksempel 10–15 per runde). Feiler et kall, prøv det én gang til og gå videre.
   Lagre alt som `logg/priser-ÅÅÅÅ-MM-DD.json` på formen `{"<id>": [pris, "tittel"], ...}`.
   Er nesten alle kall blokkert (for eksempel 403 eller robots), stopp og meld fra. Ikke prøv andre veier rundt sperren.
4. `python3 verktoy/oppdater.py logg/priser-ÅÅÅÅ-MM-DD.json`. Ved kode 2: ikke publiser, meld fra.
5. `pip install playwright` hvis den mangler, deretter `python3 verktoy/sjekk.py`. Hvis ikke `OK`: `git checkout -- kilde index.html`, ikke publiser, meld fra med feilene.
6. Commit `kilde/data.js`, `index.html` og `logg/` med meldingen `Prisoppdatering ÅÅÅÅ-MM-DD` og push til `main`.
7. Send Tore en kort rapport på norsk: antall endrede priser, de 5 største endringene,
   hva som ble holdt tilbake og hvorfor, og om billigste sko per kategori har endret seg.

## Ikke gjør

- Ikke endre tekst, design, kategorier eller levetider. Bare priser og dato.
- Ikke legg til eller fjern sko. Foreslå det heller i rapporten.
- Ikke rør `CNAME`.
