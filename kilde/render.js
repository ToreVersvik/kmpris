/* ============ RENDER ============ */
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];});}
function brandName(id){for(var i=0;i<BRANDS.length;i++){if(BRANDS[i].id===id)return BRANDS[i].name;}return id;}
function model(id){for(var i=0;i<MODELS.length;i++){if(MODELS[i].id===id)return MODELS[i];}return null;}
var CAT = {
  daglig:{label:"Trening", one:"Treningssko", many:"treningsskoene", color:"var(--c-daglig)"},
  tempo:{label:"Tempo", one:"Tempo- og platesko", many:"tempo- og plateskoene", color:"var(--c-plate)"},
  konk:{label:"Konkurranse", one:"Konkurransesko", many:"konkurranseskoene", color:"var(--c-konk)"},
  terreng:{label:"Terreng", one:"Terrengsko", many:"terrengskoene", color:"var(--c-terreng)"}
};
var GLABEL = {H:"Herre", D:"Dame", U:"Unisex", X:"Kjønn ikke oppgitt"};
var BRAND_LIST = SHOES.map(function(s){return s.brand;}).filter(function(b,i,a){return a.indexOf(b)===i;}).sort(function(a,b){return a.localeCompare(b,'nb');});
var MODEL_COUNT = SHOES.map(function(s){return s.brand+'|'+s.name;}).filter(function(b,i,a){return a.indexOf(b)===i;}).length;
var AX = 14;
function setAxis(list){ var mx=Math.max.apply(null, list.map(perKm).concat([1])); AX = mx<=4 ? Math.ceil(mx*2)/2 : (mx<=8 ? Math.ceil(mx) : Math.ceil(mx/2)*2); }
function axisStep(){ return AX<=4 ? 0.5 : (AX<=8 ? 1 : 2); }
var PAGE = 60;
var state = { cat:"alle", g:"alle", brand:"alle", q:"", sort:"km", limit:PAGE };
var animateNext = true;

function pct(v){ return Math.min(100, v/AX*100); }
function shoeHref(s){ return s.detail ? '#'+s.detail : (s.pj ? 'https://www.prisjakt.no/product.php?p='+s.pj : 'https://www.prisjakt.no/search?query='+encodeURIComponent(s.brand+' '+s.name)); }
function axisRow(){
  var st=axisStep(), ticks=[], n=Math.round(AX/st);
  for(var k=0;k<=n;k++){ var t=k*st, last=k===n; var minor=!last&&(k%2===1||n-k<2&&k!==0); ticks.push('<span class="tick'+(minor?' minor':'')+'" style="left:'+pct(t)+'%">'+kr(t,st<1?1:0)+(last?' kr/km':'')+'</span>'); }
  return '<div class="lrow axis" aria-hidden="true"><span>Plass</span><span class="r-name">Sko</span><span class="r-cat">Type</span><span class="r-price">Laveste pris</span><span class="track" style="background:none">'+ticks.join('')+'</span></div>';
}
function row(s, opts){
  opts=opts||{};
  var c=CAT[group(s.cat)], v=perKm(s), x=pct(v), start=opts.animate?0:x, flip=x>82;
  var tag=opts.current?'div':'a', href=opts.current?'':' href="'+shoeHref(s)+'"';
  var grid='background-size:'+(axisStep()/AX*100)+'% 100%';
  return '<'+tag+' class="lrow'+(opts.current?' me':'')+(opts.dim?' dim':'')+'"'+href+' style="--cat:'+c.color+'" aria-label="'+esc(s.brand+' '+s.name+', '+GLABEL[s.g]+', '+kr(v,2)+' kroner per kilometer, '+kr(s.nok,0)+' kroner')+'">'+
    '<span class="r-pl">'+(opts.rank||'')+'</span>'+
    '<span class="r-name"><b>'+esc(s.name)+'</b><span class="g">'+esc(s.brand)+', '+GLABEL[s.g].toLowerCase()+'</span></span>'+
    '<span class="r-cat"><i class="sw" style="background:'+c.color+'"></i>'+(s.cat==='stabil'?'Stabilitet':c.label)+'</span>'+
    '<span class="r-price">'+(s.approx?'ca. ':'')+kr(s.nok,0)+' kr</span>'+
    '<span class="track" style="'+grid+'"><span class="stem" style="width:'+start+'%" data-x="'+x+'"></span>'+
      '<span class="dot'+(s.detail?'':' ring')+'" style="left:'+start+'%" data-x="'+x+'"></span>'+
      '<span class="val" data-x="'+x+'" data-flip="'+(flip?1:0)+'" style="left:calc('+start+'% '+(flip?'- 52px':'+ 12px')+')">'+kr(v,2)+'</span></span>'+
  '</'+tag+'>';
}
function settle(){
  var els=document.querySelectorAll('.track [data-x]');
  requestAnimationFrame(function(){requestAnimationFrame(function(){
    Array.prototype.forEach.call(els,function(el){
      var x=el.dataset.x;
      if(el.classList.contains('stem')) el.style.width=x+'%';
      else if(el.classList.contains('val')) el.style.left='calc('+x+'% '+(el.dataset.flip==='1'?'- 52px':'+ 12px')+')';
      else el.style.left=x+'%';
    });
  });});
}
function norm(t){ return t.toLowerCase().replace(/[^a-z0-9æøå+.]/g,''); }
function filtered(){
  var q=norm(state.q);
  return SHOES.filter(function(s){
    return (state.cat==='alle'||group(s.cat)===state.cat) &&
      (state.g==='alle'||s.g===state.g||(state.g!=='U'&&(s.g==='U'||s.g==='X'))) &&
      (state.brand==='alle'||s.brand===state.brand) &&
      (!q||norm(s.brand+s.name).indexOf(q)>-1);
  }).sort(function(a,b){ return state.sort==='km' ? perKm(a)-perKm(b) : a.nok-b.nok; });
}
function seg(name, label, items){
  return '<div class="seg" role="group" aria-label="'+label+'">'+items.map(function(it){
    return '<button type="button" id="'+name+'-'+it[0]+'" data-'+name+'="'+it[0]+'" aria-pressed="'+(state[name]===it[0])+'">'+it[1]+'</button>';
  }).join('')+'</div>';
}
function ladderHtml(){
  var all=filtered(), shown=all.slice(0,state.limit); setAxis(all.length?all:SHOES);
  var h='<p class="count" aria-live="polite">Viser '+shown.length+' av '+all.length+' sko'+(all.length!==SHOES.length?' (filtrert fra '+SHOES.length+')':'')+'.</p>';
  h+='<div class="ladder">'+axisRow()+(shown.length?shown.map(function(s,i){return row(s,{animate:animateNext,rank:i+1});}).join(''):'<p class="small" style="padding:16px 8px">Ingen sko passer filteret. Prøv et annet merke eller fjern søket.</p>')+'</div>';
  if(all.length>shown.length) h+='<button type="button" class="more" id="more">Vis alle '+all.length+'</button>';
  return h;
}

function home(){
  var h='<main class="wrap">';
  h+='<div class="intro"><h1>Alle løpesko, billigst per kilometer</h1>'+
     '<p class="lede">'+MODEL_COUNT+' løpesko fra '+BRAND_LIST.length+' merker, asfalt og terreng, med egen rad for herre og dame. Filtrer på type, kjønn eller merke, eller søk etter modellen du vurderer.</p></div>';
  h+='<div class="controls">'+
     seg('cat','Type sko',[['alle','Alle'],['daglig','Trening'],['tempo','Tempo'],['konk','Konkurranse'],['terreng','Terreng']])+
     seg('g','Kjønn',[['alle','Alle'],['H','Herre'],['D','Dame']])+
     '<label class="ctl" for="brand">Merke<select id="brand" class="field-input"><option value="alle">Alle merker</option>'+BRAND_LIST.map(function(b){return '<option value="'+esc(b)+'"'+(state.brand===b?' selected':'')+'>'+esc(b)+'</option>';}).join('')+'</select></label>'+
     '<label class="ctl" for="q">Søk<input id="q" class="field-input" type="search" placeholder="F.eks. Clifton" value="'+esc(state.q)+'" autocomplete="off"></label>'+
     seg('sort','Sortering',[['km','Billigst per km'],['pris','Lavest pris']])+
     '</div>';
  h+='<div id="ladder">'+ladderHtml()+'</div>';
  h+='<div class="legend"><span><i class="lg-dot"></i>Egen side hos KmPris</span><span><i class="lg-ring"></i>Lenker til Prisjakt</span>'+
     Object.keys(CAT).map(function(k){return '<span><i class="sw" style="background:'+CAT[k].color+'"></i>'+CAT[k].label+'</span>';}).join('')+'</div>';
  h+='<p class="small" style="margin-top:12px">Prisen er laveste pris på '+PRICES_SOURCE.name+' '+PRICES_SOURCE.date+', som ofte gjelder tilbud i enkelte størrelser. Li-Ning finnes ikke på Prisjakt, så de prisene er omregnet fra euro med Norges Banks kurs '+SITE.eurNok.rate+' (sjekket 27.09.2026). Vanntette (GTX), piggede og barnemodeller er ikke med. Kjønnsfilteret viser også unisexmodeller.</p>';
  h+='</main>';
  h+='<section class="field" id="metode"><div class="wrap"><div class="method">'+
     '<div class="stack"><h2>Slik regner vi</h2>'+
     '<p class="formula">Pris delt på antall kilometer skoen holder.</p>'+
     '<p>En konkurransesko til 2 000 kr som holder 300 km, koster 6,67 kr per km. En treningssko til 1 600 kr som holder 650 km, koster 2,46 kr per km. Den dyreste prislappen er ikke alltid den dyreste skoen, og omvendt.</p>'+
     '<p class="small">Levetiden ligger omtrent midt i publiserte tommelfingerregler for hver skotype. Den er ikke målt på hver modell. Vekt, underlag og løpsstil gir store utslag. Skotypen er vår egen vurdering av hva modellen er laget for. Kilder: '+LIFE_SOURCES.map(function(s){return '<a href="'+s[1]+'">'+esc(s[0])+'</a>';}).join(', ')+'.</p></div>'+
     '<table class="life"><thead><tr><th>Skotype</th><th>Kildenes spenn</th><th style="text-align:right">Vi bruker</th></tr></thead><tbody>'+
     Object.keys(LIFE).map(function(k){var l=LIFE[k];return '<tr><td>'+esc(l.label)+'</td><td class="muted">'+esc(l.range)+'</td><td class="n">'+l.km+' km</td></tr>';}).join('')+
     '</tbody></table></div></div></section>';
  return h;
}

function topIn(g,n){ var seen={}; return SHOES.filter(function(s){return group(s.cat)===g;}).sort(function(a,b){return perKm(a)-perKm(b);}).filter(function(s){var k=s.brand+'|'+s.name; if(seen[k])return false; seen[k]=1; return true;}).slice(0,n); }
function countIn(g){ return SHOES.filter(function(s){return group(s.cat)===g;}).length; }
function frontPage(){
  var h='<main class="wrap">';
  var best=topIn('daglig',1)[0];
  h+='<div class="front-hero"><div class="stack"><h1>Hva koster skoen per kilometer?</h1>'+
     '<p class="lede">Prislappen sier lite om hvor mye du får for pengene. KmPris deler prisen på hvor langt skoen holder, og rangerer '+MODEL_COUNT+' løpesko fra '+BRAND_LIST.length+' merker.</p>'+
     '<form class="qform" id="qform" role="search"><label for="fq" class="sr">Søk etter sko</label><input id="fq" class="field-input" type="search" placeholder="Søk etter modell" autocomplete="off"><button type="submit" class="btn">Søk</button></form>'+
     '<p class="small">Eller <a href="#skoene" data-go="reset">se hele rangeringen</a>. Usikker på hva du trenger? <a href="#velg">Svar på tre spørsmål</a>.</p></div>'+
     '<div class="bib" aria-label="Billigste treningssko per kilometer"><div class="bib-top"><span>Billigst akkurat nå</span><span>Trening</span></div>'+
     '<div class="bib-num">'+kr(perKm(best),2)+'<small>kr/km</small></div>'+
     '<p class="bib-foot"><a href="'+shoeHref(best)+'">'+esc(best.brand+' '+best.name)+'</a>, '+GLABEL[best.g].toLowerCase()+', '+kr(best.nok,0)+' kr</p></div></div>';
  h+='<section class="block"><h2>Resultatlister</h2><p class="muted">De tre billigste per kilometer i hver klasse. Laveste pris på Prisjakt '+PRICES_SOURCE.date+'.</p><div class="results-grid">'+
     Object.keys(CAT).map(function(g){
       var c=CAT[g];
       return '<section><h3><i class="sw" style="background:'+c.color+'"></i>'+c.label+'</h3><table class="res"><thead><tr><th>Pl.</th><th>Sko</th><th class="n">Pris</th><th class="n">kr/km</th></tr></thead><tbody>'+
         topIn(g,3).map(function(s,i){
           return '<tr><td class="pl">'+(i+1)+'</td><td><a href="'+shoeHref(s)+'">'+esc(s.name)+'</a><br><span class="small">'+esc(s.brand)+', '+GLABEL[s.g].toLowerCase()+'</span></td><td class="n">'+(s.approx?'ca. ':'')+kr(s.nok,0)+'</td><td class="n"><b>'+kr(perKm(s),2)+'</b></td></tr>';
         }).join('')+'</tbody></table>'+
         '<a class="seeall" href="#skoene" data-go-cat="'+g+'">Hele listen, '+countIn(g)+' '+c.many+'</a></section>';
     }).join('')+'</div></section>';
  h+='<section class="block"><h2>Merker fra A til Å</h2><div class="brand-index">'+
     BRAND_LIST.map(function(b){ var n=SHOES.filter(function(s){return s.brand===b;}).length; return '<a href="#skoene" data-go-brand="'+esc(b)+'">'+esc(b)+'<span>'+n+'</span></a>'; }).join('')+
     '</div></section>';
  h+='<section class="block"><h2>Nye merker i Norge</h2><p class="muted">Li-Ning og Xtep har egne sider med testsammendrag, spesifikasjoner og kalkulator.</p><div class="newlist">'+
     MODELS.map(function(m){ var p=primary(m); return '<a href="#'+m.id+'"><span><b>'+esc(m.name)+'</b><br><span class="small">'+esc(brandName(m.brand))+', '+LIFE[p.cat].label.toLowerCase()+'</span></span><span class="km">'+kr(perKm(p),2)+' <small>kr/km</small></span></a>'; }).join('')+
     '</div></section>';
  h+='</main>';
  h+='<section class="field"><div class="wrap"><h2>Før du kjøper</h2><div class="guide">'+
     '<a href="#velg"><h3>Slik velger du løpesko</h3><p>Tre spørsmål gir deg forslag. Pluss det viktigste å se etter, ordliste og vanlige spørsmål.</p></a>'+
     '<a href="#storrelse"><h3>Størrelse og passform</h3><p>Mål foten i centimeter og bruk merkets tabell. Særlig viktig for merker du ikke har prøvd.</p></a>'+
     '<a href="#kjop"><h3>Her får du kjøpt løpesko</h3><p>Løpebutikker med løpetest, sportskjeder, nettbutikker og rettighetene dine.</p></a>'+
     '</div></div></section>';
  return h;
}

function detailRows(m){ var o='HDUX'; return SHOES.filter(function(s){return s.detail===m.id;}).sort(function(a,b){return o.indexOf(a.g)-o.indexOf(b.g);}); }
function primary(m){ var r=detailRows(m); return r.filter(function(s){return s.g==='H';})[0]||r[0]; }
function peersFor(s, n){
  var g=group(s.cat);
  var list=SHOES.filter(function(o){return group(o.cat)===g && o.detail!==s.detail;}).sort(function(a,b){return perKm(a)-perKm(b);});
  return list.slice(0,n);
}

function modelPage(m){
  var rows=detailRows(m), p=primary(m), c=CAT[group(p.cat)], v=perKm(p);
  var groupList=SHOES.filter(function(o){return group(o.cat)===group(p.cat);}).sort(function(a,b){return perKm(a)-perKm(b);});
  var rank=groupList.indexOf(p)+1;
  var h='<main class="wrap"><a class="back" href="#skoene">Tilbake til rangeringen</a>';
  h+='<div class="mhead" style="margin-top:18px"><div class="stack">'+
     '<span class="brandline"><i class="sw" style="background:'+c.color+'"></i>'+LIFE[p.cat].label+' fra '+esc(brandName(m.brand))+'</span>'+
     '<h1>'+esc(m.name)+'</h1>'+
     '<p class="muted">'+rows.map(function(s){return GLABEL[s.g]+' '+(s.approx?'ca. ':'')+kr(s.nok,0)+' kr';}).join(', ')+'. '+esc(m.priceSrc)+'.</p></div>'+
     '<div class="bib big-km"><div class="bib-top"><span>KmPris</span><span>'+(rows.length>1?GLABEL[p.g]:'')+'</span></div><div class="bib-num">'+kr(v,2)+'<small>kr/km</small></div><p class="bib-foot">Plass '+rank+' av '+groupList.length+' blant '+c.many+', regnet med '+LIFE[p.cat].km+' km levetid.</p></div></div>';
  var top=peersFor(p,8); setAxis(top.concat(rows));
  h+='<div class="block" style="margin-top:28px"><h3>Slik står den seg mot de billigste '+c.many+'</h3><div class="ladder">'+axisRow()+
     top.concat(rows).sort(function(a,b){return perKm(a)-perKm(b);}).map(function(o){return row(o,{current:o.detail===m.id,dim:o.detail!==m.id,rank:groupList.indexOf(o)+1});}).join('')+'</div>'+
     '<p class="small">Viser de 8 billigste per kilometer i samme skotype, pluss denne skoen. <a href="#skoene">Se hele rangeringen</a>.</p></div>';
  h+='<div class="cols"><div class="stack-lg">'+
     '<div class="stack"><p>'+esc(m.about)+'</p></div>'+
     '<div class="stack"><h3>Passer for</h3><ul class="plain">'+m.fits.map(function(x){return '<li>'+esc(x)+'</li>';}).join('')+'</ul></div>'+
     '<div class="stack"><h3>Verdt å vite</h3><ul class="plain">'+m.know.map(function(x){return '<li>'+esc(x)+'</li>';}).join('')+'</ul></div>'+
     '<div class="note-box"><h3>Hva testerne sier</h3><p>'+esc(m.testers)+'</p><p class="small">Kilder: '+m.sources.map(function(s){return '<a href="'+s[1]+'">'+esc(s[0])+'</a>';}).join(', ')+'</p></div>'+
     (m.ownTest ? '<div class="note-box own"><h3>Vår egen test</h3>'+m.ownTest+'</div>'
                : '<div class="note-box own"><h3>Vår egen test</h3><p class="muted">Ikke testet av KmPris ennå. Egne tester skrives bare av den som faktisk har løpt i skoen.</p></div>')+
     '</div><div class="stack-lg">'+
     '<div class="calc"><h3>Regn selv</h3><p class="small" style="color:var(--ink-2)">Endre pris eller levetid. Maks pris er det skoen kan koste og fortsatt være billigere per kilometer enn skoen i samme rad.</p>'+
       '<div class="calc-inputs">'+
         '<label for="calc-pris">Pris i kr<input id="calc-pris" type="number" min="1" step="1" inputmode="numeric" value="'+p.nok+'"></label>'+
         '<label for="calc-km">Levetid i km<input id="calc-km" type="number" min="1" step="10" inputmode="numeric" value="'+LIFE[p.cat].km+'"></label>'+
         '<label for="ukekm">Km i uka<input id="ukekm" type="number" min="1" max="300" inputmode="numeric" value="30"></label>'+
       '</div>'+
       '<div class="calc-result"><b id="calc-perkm"></b><p class="small" id="calc-weeks" style="margin-top:6px"></p></div>'+
       '<div class="tablewrap"><table class="cmp"><thead><tr><th>De 10 billigste '+c.many+'</th><th>kr/km</th><th>Maks pris</th></tr></thead><tbody id="calc-rows"></tbody></table></div>'+
     '</div>'+
     '<table class="specs">'+m.specs.map(function(r){return '<tr><th>'+esc(r[0])+'</th><td>'+esc(r[1])+'</td></tr>';}).join('')+'</table>'+
     '<p class="small">'+esc(m.specNote)+'</p>'+
     '<a class="btn" href="'+m.shop+'">'+(m.shopName==='Prisjakt'?'Se priser på Prisjakt':'Se skoen hos '+esc(m.shopName))+'</a>'+
     '<p class="small">Flere forhandlere under <a href="#kjop">Butikker</a>.</p>'+
     '</div></div></main>';
  return h;
}

function updateCalc(){
  var m=model((location.hash||'').slice(1)); if(!m)return;
  var p=primary(m);
  var pris=parseFloat(document.getElementById('calc-pris').value), km=parseFloat(document.getElementById('calc-km').value), uke=parseFloat(document.getElementById('ukekm').value);
  var ok=pris>0&&km>0, per=ok?pris/km:NaN;
  document.getElementById('calc-perkm').innerHTML = ok ? kr(per,2)+' <small>kr/km</small>' : 'Fyll inn pris og levetid';
  document.getElementById('calc-weeks').textContent = (km>0&&uke>0) ? 'Holder i ca. '+Math.round(km/uke)+' uker med '+kr(uke,0)+' km i uka.' : '';
  document.getElementById('calc-rows').innerHTML = peersFor(p,10).map(function(o){
    var r=perKm(o), beats=ok&&per<r, maks=Math.floor(r*km);
    return '<tr><td><a href="'+shoeHref(o)+'">'+esc(o.brand+' '+o.name)+'</a> <span class="muted small">'+GLABEL[o.g].toLowerCase()+'</span></td><td>'+kr(r,2)+'</td><td>'+(km>0?kr(maks,0)+' kr':'–')+(ok?'<span class="verdict '+(beats?'win':'lose')+'">'+(beats?'Slår den':'Taper')+'</span>':'')+'</td></tr>';
  }).join('');
}

/* ============ BUTIKKER ============ */
var STORES = {
  spesial: [
    { name:"Löplabbet", url:"https://loplabbet.no/vare-tjenester/slik-tester-vi-deg", where:"Blant annet Oslo sentrum, Ski, Strømmen, Skien, Bergen, Stavanger, Sandnes og Trondheim (to butikker).",
      note:"Løpebutikk-kjede med løpetest på drop-in: samtale, 3D-skanning av foten og videoanalyse på tredemølle." },
    { name:"Anton Sport (Anton Lab)", url:"https://www.antonsport.no/anton-lab", where:"Anton Lab finnes på Bekkestua, CC Vest, Sandvika, Bogstadveien, Moa og i Haugesund.",
      note:"Sportskjede med egne testbutikker der du kan måle foten og prøve sko på tredemølle." },
    { name:"Torshov Sport", url:"https://www.torshovsport.no/lop", where:"Egen løpebutikk på Torshov i Oslo, og butikker i Bergen, Drammen, Fredrikstad, Sandvika, Stavanger og Tromsø.",
      note:"Kaller seg løpespesialist. Nettbutikk med klikk og hent i butikk." },
    { name:"Drevelin Aktiv", url:"https://drevelinaktiv.no/lopsanalyse-bergen/", where:"Møllendalsbakken i Bergen.",
      note:"Løpebutikk med løpsanalyse på video (ca. 60 minutter, 1 185 kr). Fører også Xtep." }
  ],
  kjeder: [
    { name:"XXL", url:"https://www.xxl.no/", note:"Landsdekkende sportskjede med stort utvalg og nettbutikk." },
    { name:"Intersport", url:"https://www.intersport.no/", note:"Landsdekkende sportskjede med nettbutikk." },
    { name:"Sport 1", url:"https://www.sport1.no/", note:"Landsdekkende kjede av sportsbutikker, mange av dem lokalt eide." },
    { name:"G-Sport og G-Max (Gresvig)", url:"https://www.gsport.no/", note:"Landsdekkende sportskjede. Spør butikken om de tilbyr løpetest." }
  ],
  nett: [
    { name:"Løpeshop.no", url:"https://www.loepeshop.no/", note:"Nettbutikk bare for løping, med de fleste store merkene." },
    { name:"Olympia Sport", url:"https://www.olympiasport.no/", note:"Nettbutikk og butikker. Bredt utvalg, også Xtep." },
    { name:"Outnorth", url:"https://www.outnorth.com/no/aktiviteter/loping/lopesko", note:"Nordisk nettbutikk for friluft og løping, sterk på terrengsko." },
    { name:"Unisport", url:"https://www.unisportstore.no/", note:"Nettbutikk for fotball og løping." },
    { name:"Sport 24", url:"https://www.sport24.no/", note:"Dansk sportskjede med norsk nettbutikk. Lover 365 dagers retur." }
  ]
};
function storeList(list, withWhere){
  return '<ul class="stores">'+list.map(function(s){
    return '<li><h3><a href="'+s.url+'">'+esc(s.name)+'</a></h3><p>'+esc(s.note)+'</p>'+(withWhere&&s.where?'<p class="small">'+esc(s.where)+'</p>':'')+'</li>';
  }).join('')+'</ul>';
}
function wherePage(){
  var h='<main class="wrap"><div class="intro"><h1>Her får du kjøpt løpesko</h1>'+
    '<p class="lede">Løpebutikker der du kan teste skoene, sportskjeder, nettbutikker, og hvor du finner de nye merkene. Usikker på størrelse eller type? Da er en butikk med løpetest et godt sted å starte.</p></div>';
  h+='<div class="block" style="margin-top:12px"><h2>Løpebutikker med løpetest</h2><p class="muted">Her får du målt foten og prøvd skoene i bevegelse. Lurt hvis du er ny, har hatt skader eller vurderer et merke du ikke har brukt før.</p>'+storeList(STORES.spesial,true)+'</div>';
  h+='<div class="block"><h2>Sportskjeder</h2><p class="muted">Bredt utvalg og mange butikker over hele landet. Hvor mye løpekunnskap de ansatte har, varierer fra butikk til butikk.</p>'+storeList(STORES.kjeder,false)+'</div>';
  h+='<div class="block"><h2>Nettbutikker</h2><p class="muted">Ofte lavest pris. Bestill gjerne to størrelser og send den ene i retur. Sjekk returvilkårene før du kjøper.</p>'+storeList(STORES.nett,false)+
     '<p class="small">Vil du ha beste pris akkurat nå? <a href="https://www.prisjakt.no/c/lopesko">Prisjakt</a> sammenligner butikkene, og du kan sette prisvarsel på skoen du vil ha. Alle sko i <a href="#skoene">rangeringen</a> lenker dit.</p></div>';
  h+='<div class="block"><h2>De nye merkene</h2><div class="where">';
  h+=BRANDS.map(function(b){
    return '<article><h3 class="h-brand">'+esc(b.name)+'</h3><span class="status '+b.status+'">'+esc(b.statusText)+'</span><p>'+esc(b.text)+'</p>'+
      '<ul class="plain">'+b.where.map(function(w){return '<li><a href="'+w.url+'">'+esc(w.name)+'</a>. '+esc(w.note)+'</li>';}).join('')+'</ul></article>';
  }).join('');
  h+='</div></div>';
  h+='<div class="block"><h2>Rettighetene dine</h2><ul class="plain">'+
     '<li><b>Netthandel:</b> du har angrerett når du kjøper på nett, normalt 14 dager. Prøv skoene innendørs, så du fortsatt kan returnere dem.</li>'+
     '<li><b>Bytte i butikk:</b> det finnes ingen lovfestet bytterett i vanlige butikker. De fleste lar deg bytte ubrukte sko, men det er service, ikke en rett.</li>'+
     '<li><b>Reklamasjon:</b> slites skoene unormalt fort eller går i stykker, kan du klage i to år. For varer som skal vare vesentlig lenger, som vintersko, er fristen fem år.</li></ul>'+
     '<p class="small">Kilde: <a href="https://www.forbrukerradet.no/tips-og-rettar/varer-og-tjenester/klaer-og-sko/">Forbrukerrådet, klær og sko</a>. Butikkinformasjonen er hentet fra butikkenes egne sider '+SITE.updated+'. Mangler en butikk? Si fra, så legger vi den til.</p></div></main>';
  return h;
}

/* ============ VELG SKO ============ */
var chooser = { surface:null, use:null, support:null };
function choiceBtns(key, opts){
  return '<div class="choices" role="group">'+opts.map(function(o){
    return '<button type="button" class="opt" data-ch="'+key+'" data-v="'+o[0]+'" aria-pressed="'+(chooser[key]===o[0])+'">'+o[1]+'</button>';
  }).join('')+'</div>';
}
function chooserResult(){
  var c=chooser, cat=null, filter=null, title='', text='';
  if(c.surface==='terreng'){ cat='terreng'; title='Terrengsko'; text='Grovere såle for grep på sti, røtter og våt grunn. Terrengsko holder litt kortere enn asfaltsko, vi regner med 550 km.'; }
  else if(c.surface==='asfalt' && c.use==='fart'){ cat='tempo'; title='Tempo- og platesko'; text='Lette og spenstige sko for intervaller og tempoøkter. Mange har plate i mellomsålen. Bruk dem som et par nummer to, ikke til alt.'; }
  else if(c.surface==='asfalt' && c.use==='konk'){ cat='konk'; title='Konkurransesko'; text='De raskeste skoene, men også de som slites raskest. Vi regner med 300 km, så kilometerprisen blir høy. Spar dem til løp og de viktigste øktene.'; }
  else if(c.surface==='asfalt' && c.use==='rolig' && c.support){
    cat='daglig';
    if(c.support==='ja'){ filter='stabil'; title='Stabilitetssko'; text='Sko med ekstra støtte for deg som overpronerer eller vil ha et mer styrt steg.'; }
    else if(c.support==='nei'){ filter='daglig'; title='Nøytrale treningssko'; text='Én god treningssko dekker de fleste løperes behov. Velg demping etter hvor langt du løper.'; }
    else { title='Treningssko, og en løpetest'; text='Er du usikker på om du trenger støtte, får du svar på en løpetest i butikk. Her er de billigste treningsskoene per kilometer i mellomtiden.'; }
  }
  if(!cat) return '<p class="muted">Svar på spørsmålene over, så får du forslag her.</p>';
  var list=SHOES.filter(function(s){ return group(s.cat)===cat && (!filter||s.cat===filter); }).sort(function(a,b){return perKm(a)-perKm(b);});
  var seen={}, top=list.filter(function(s){var k=s.brand+s.name; if(seen[k])return false; seen[k]=1; return true;}).slice(0,5);
  return '<div class="result"><h3>Forslag: '+title+'</h3><p>'+text+'</p><ol class="top3">'+top.map(function(s,i){
      return '<li><span class="rank">'+(i+1)+'</span><span><a href="'+shoeHref(s)+'">'+esc(s.brand+' '+s.name)+'</a><br><span class="small">'+GLABEL[s.g].toLowerCase()+', '+(s.approx?'ca. ':'')+kr(s.nok,0)+' kr</span></span><span class="km">'+kr(perKm(s),2)+' <small>kr/km</small></span></li>';
    }).join('')+'</ol><a class="seeall" href="#skoene" data-go-cat="'+cat+'">Se alle '+CAT[cat].many+' i rangeringen</a>'+
    (c.support==='usikker'||filter==='stabil'?'<p class="small">Tips: <a href="#kjop">løpebutikker med løpetest</a> kan se på steget ditt.</p>':'')+'</div>';
}
function chooserHtml(){
  var h='<div class="q"><h3>Hvor løper du mest?</h3>'+choiceBtns('surface',[['asfalt','Asfalt og grusvei'],['terreng','Sti og terreng']])+'</div>';
  if(chooser.surface==='asfalt') h+='<div class="q"><h3>Hva skal skoen brukes til?</h3>'+choiceBtns('use',[['rolig','Rolige turer og langturer'],['fart','Intervaller og tempo'],['konk','Konkurranser']])+'</div>';
  if(chooser.surface==='asfalt'&&chooser.use==='rolig') h+='<div class="q"><h3>Trenger du støtte?</h3>'+choiceBtns('support',[['nei','Nei, nøytral'],['ja','Ja, jeg vil ha støtte'],['usikker','Vet ikke']])+'</div>';
  return h+'<div class="q-result" aria-live="polite">'+chooserResult()+'</div>';
}
function guidePage(){
  var h='<main class="wrap"><div class="intro"><h1>Slik velger du løpesko</h1>'+
    '<p class="lede">Svar på tre spørsmål, så får du forslag med lavest pris per kilometer. Under finner du det viktigste å se etter, hvordan du finner riktig størrelse og svar på det folk lurer mest på.</p></div>';
  h+='<section class="chooser" id="chooser">'+chooserHtml()+'</section>';
  h+='<div class="block"><h2>Seks ting å se etter</h2><div class="sixgrid">'+
    '<div><h3>Underlag</h3><p>Asfaltsko er laget for vei og grus. Terrengsko har grovere såle for sti. Bruk dem helst der de hører hjemme.</p></div>'+
    '<div><h3>Støtte</h3><p>Nøytrale sko passer de fleste. Stabilitetssko er laget for løpere som overpronerer, altså ruller foten innover. En løpetest kan avklare det.</p></div>'+
    '<div><h3>Demping</h3><p>Mer demping på langturer, lettere og mer spenstige sko til fart. Høye sko med mye skum kan være mindre stabile.</p></div>'+
    '<div><h3>Dropp</h3><p>Høydeforskjellen mellom hæl og forfot. 8–12 mm avlaster legg og akilles, 4–6 mm gir oftere landing på midtfoten. Bytt gradvis.</p></div>'+
    '<div><h3>Passform</h3><p>Skoen skal holde hæl og midtfot uten å stramme, med omtrent en tommels bredde foran tærne.</p></div>'+
    '<div><h3>Bruk</h3><p>Én treningssko holder for de fleste. Løper du mye, kan to par med ulik bruk være lurt, for eksempel ett til rolige turer og ett til fart.</p></div>'+
    '</div><p class="small">Kilde: <a href="https://www.runnersneed.com/expert-advice/gear-guides/choosing-the-right-running-shoes.html">Runners Need, valg av løpesko</a>.</p></div>';
  h+='<div class="block" id="storrelse"><h2>Størrelse og passform</h2><ol class="steps">'+
    '<li><h3>Mål foten i cm</h3><p>EU- og US-størrelser varierer mellom merkene. Fotlengden i centimeter er den samme uansett merke.</p></li>'+
    '<li><h3>Bruk merkets tabell</h3><p>Finn fotlengden i størrelsestabellen til merket. Tabellen har som regel regnet inn plass foran tærne, så ikke legg til ekstra selv.</p></li>'+
    '<li><h3>Sjekk bredden</h3><p>Lengde er bare halve passformen. Mange kinesiske modeller er smalere i forfoten. Har du bred fot, vurder en halv størrelse opp.</p></li>'+
    '<li><h3>Test inne</h3><p>Løp noen korte turer innendørs først, så kan du fortsatt returnere.</p></li></ol>'+
    '<h3 style="margin-top:12px">Slik måler du foten</h3><ul class="plain">'+
    '<li>Mål på kvelden. Føttene hovner litt opp i løpet av dagen.</li>'+
    '<li>Ta på løpesokken, og stå på et ark med hælen inntil en vegg.</li>'+
    '<li>Merk av ytterste punkt på lengste tå, og mål fra veggen til merket.</li>'+
    '<li>Mål begge føttene og bruk den lengste.</li></ul>'+
    '<details class="more-info"><summary>EU- og US-størrelser hos Li-Ning</summary><div class="tablewrap size"><table class="size"><thead><tr><th>EU</th><th>US herre</th><th>EU</th><th>US herre</th></tr></thead><tbody>'+
    '<tr><td>39</td><td>6,5</td><td>43</td><td>9,5</td></tr><tr><td>39⅔</td><td>7</td><td>43⅔</td><td>10</td></tr><tr><td>40⅓</td><td>7,5</td><td>44⅓</td><td>10,5</td></tr>'+
    '<tr><td>41</td><td>8</td><td>45</td><td>11</td></tr><tr><td>41⅔</td><td>8,5</td><td>46⅓</td><td>12</td></tr><tr><td>42⅓</td><td>9</td><td></td><td></td></tr></tbody></table></div>'+
    '<p class="small">Fra herremodellene hos Li-Ning Scandinavia. Se også butikkens <a href="https://li-ningfamily.com/pages/storrelsesguide">størrelsesguide</a>.</p></details></div>';
  h+='<div class="block"><h2>Når bør du bytte sko?</h2><ul class="plain">'+
    '<li>Yttersålen er slitt ned, særlig under hæl eller forfot.</li>'+
    '<li>Dempingen føles flat, eller skoen har fått rynker i mellomsålen.</li>'+
    '<li>Du får nye vondter i legger, knær eller føtter uten annen forklaring.</li>'+
    '<li>Som tommelfingerregel holder treningssko 500–800 km, terrengsko 400–700 km og konkurransesko 250–400 km. <a href="#metode">Se hvordan vi bruker tallene</a>.</li></ul>'+
    '<p class="small">Bruker du Strava eller en GPS-klokke, kan du registrere skoene som utstyr. Da teller klokka kilometerne for deg.</p></div>';
  h+='<div class="block"><h2>Ordliste</h2><dl class="glossary">'+
    '<dt>Dropp</dt><dd>Høydeforskjellen mellom hæl og forfot, i millimeter.</dd>'+
    '<dt>Sålehøyde (stack)</dt><dd>Hvor tykk sålen er under hælen og forfoten. Over 35 mm regnes som høyt.</dd>'+
    '<dt>Plate</dt><dd>En stiv plate i mellomsålen, av karbon, glassfiber eller nylon. Gir fraspark og stivhet.</dd>'+
    '<dt>Superskum (PEBA)</dt><dd>Lett og spenstig skum som brukes i de fleste konkurransesko. Gir mye energi tilbake, men slites ofte raskere.</dd>'+
    '<dt>Overpronasjon</dt><dd>At foten ruller mye innover når den lander. Stabilitetssko er laget for å bremse det.</dd>'+
    '<dt>GTX</dt><dd>Vanntett membran (Gore-Tex). Varmere og tyngre, men god til vinter og våte stier. Ikke med i rangeringen.</dd>'+
    '</dl></div>';
  h+='<div class="block"><h2>Vanlige spørsmål</h2>'+
    faq('Trenger jeg sko med karbonplate?','Nei. Karbonplate gjør mest nytte i konkurranse og raske økter. Til vanlig trening gir en god treningssko lavere kilometerpris og ofte bedre stabilitet.')+
    faq('Er dyre sko bedre?','Ikke nødvendigvis. En dyr konkurransesko kan koste fire–fem ganger så mye per kilometer som en rimelig treningssko, fordi den slites raskere. Det er derfor vi regner kilometerpris.')+
    faq('Hva bør jeg løpe med om vinteren?','Vanlige løpesko holder på bar asfalt. På is og snø trenger du sko med pigger eller brodder. Noen løpebutikker kan skru pigger i vanlige sko.')+
    faq('Kan jeg bruke terrengsko på asfalt?','Det går, men grov såle slites raskt på asfalt og gir en mer klumpete følelse. Til blandet bruk finnes egne sko for både vei og sti.')+
    faq('Hvor mange par trenger jeg?','Ett par holder for de fleste. Løper du mye, kan to par med ulik bruk gi variasjon for kroppen og fordele slitasjen.')+
    faq('Hvorfor er prisene lavere enn i butikken?','Vi viser laveste pris på Prisjakt. Den gjelder ofte tilbud i enkelte størrelser og farger. Sjekk alltid prisen i din størrelse.')+
    '</div></main>';
  return h;
}
function faq(q,a){ return '<details class="faq"><summary>'+esc(q)+'</summary><p>'+esc(a)+'</p></details>'; }

function aboutPage(){
  var src=[]; MODELS.forEach(function(m){(m.sources||[]).forEach(function(s){if(!src.some(function(x){return x[1]===s[1];}))src.push(s);});});
  src.push(["Prisjakt, løpesko","https://www.prisjakt.no/c/lopesko"]);
  src.push(["Norges Banks kurs EUR/NOK","https://www.valuta-kurser.no/en/eur-to-nok"]);
  LIFE_SOURCES.forEach(function(s){src.push(s);});
  return '<main class="wrap"><div class="intro"><h1>Om KmPris</h1>'+
  '<p class="lede">KmPris rangerer løpesko etter det som betyr noe for lommeboka: hva skoen koster per kilometer. Både kjente merker og nye merker som få i Norge har prøvd.</p></div>'+
  '<div class="block" style="margin-top:12px"><h2>Hvem står bak</h2>'+
  '<p>Jeg heter Tore og bor i Telemark. Jeg løper som amatør, både på asfalt og i terrenget, og har som mange andre fått litt oppheng i løpesko. Forskjellen gode sko gjør, merkes. Det gjør prislappen også.</p>'+
  '<p style="margin-top:12px">Derfor begynte jeg å lete etter kupp: sko som gir mye løping for pengene. Det er det kilometerprisen måler. Underveis så jeg hvor mye spennende som kommer fra Østen. Merker som Li-Ning og Xtep er nesten ukjente i Norge, men mange av skoene deres står ikke tilbake for de kjente merkene når det kommer til kvalitet.</p>'+
  '<p style="margin-top:12px">KmPris er et hobbyprosjekt jeg driver på fritiden. Har du tips, ser du en feil eller savner du en sko, skriv til <a href="mailto:post@kmpris.no">post@kmpris.no</a>.</p></div>'+
  '<div class="block"><h2>Slik lages innholdet</h2><ul class="plain">'+
  '<li>Rangeringen dekker '+MODEL_COUNT+' gjeldende modeller fra '+BRAND_LIST.length+' merker. Prisen er laveste pris på Prisjakt for herre- og damemodellen hver for seg.</li>'+
  '<li>Kilometerprisen er pris delt på anslått levetid for skotypen. <a href="#metode">Se metoden</a>.</li>'+
  '<li>Skotypen er vår vurdering av hva modellen er laget for. Si fra hvis du mener en sko står i feil kategori.</li>'+
  '<li>«Hva testerne sier» er sammendrag av uavhengige tester og butikkinformasjon, alltid med kilde.</li>'+
  '<li>«Vår egen test» skrives bare av den som faktisk har løpt i skoen.</li>'+
  '<li>KmPris tjener ingen provisjon i dag. Hvis det endrer seg, merkes lenkene tydelig.</li>'+
  '<li>Ingen merker eller butikker betaler for å bli omtalt eller for plassering i rangeringen.</li>'+
  '<li>Prisene og butikkinformasjonen ble sist sjekket '+SITE.updated+'. Datoen står alltid under rangeringen.</li></ul></div>'+
  '<div class="block"><h2>Kilder</h2><ul class="plain">'+src.map(function(s){return '<li><a href="'+s[1]+'">'+esc(s[0])+'</a></li>';}).join('')+'</ul></div></main>';
}

function privacyPage(){
  return '<main class="wrap"><div class="intro"><h1>Personvern</h1>'+
  '<p class="lede">Kort fortalt: KmPris samler ikke inn opplysninger om deg, setter ingen informasjonskapsler og bruker ingen analyseverktøy.</p></div>'+
  '<div class="block" style="margin-top:12px"><h2>Hva siden gjør og ikke gjør</h2><ul class="plain">'+
  '<li>Ingen informasjonskapsler (cookies), ingen sporing og ingen annonser.</li>'+
  '<li>Søk, filtre, kalkulatoren og spørsmålene i «Velg sko» kjøres bare i nettleseren din. Ingenting av det sendes til oss.</li>'+
  '<li>Skrifttypene ligger på selve siden, så nettleseren din henter ingenting fra Google eller andre.</li>'+
  '<li>Det finnes ingen skjemaer, kontoer eller nyhetsbrev.</li></ul></div>'+
  '<div class="block"><h2>Serverlogg hos webhotellet</h2>'+
  '<p>Siden ligger hos Domene AS i Norge. Som alle webhotell fører de en teknisk logg over besøk: IP-adresse, tidspunkt, hvilken side som ble åpnet og hvilken nettleser som ble brukt. Loggen brukes til drift og sikkerhet, ikke til å kartlegge deg, og slettes etter webhotellets faste rutiner.</p></div>'+
  '<div class="block"><h2>Lenker til andre nettsteder</h2>'+
  '<p>Når du klikker deg videre til Prisjakt, en butikk eller et merke, er det deres personvernregler som gjelder der. Hvis KmPris senere tar i bruk annonselenker (provisjon ved kjøp), merkes lenkene tydelig og denne siden oppdateres før det skjer.</p></div>'+
  '<div class="block"><h2>Spørsmål og rettigheter</h2>'+
  '<p>Du kan spørre hva som er lagret om deg og be om at det slettes. Skriv til <a href="mailto:post@kmpris.no">post@kmpris.no</a>. Mener du at personopplysninger behandles feil, kan du klage til <a href="https://www.datatilsynet.no/">Datatilsynet</a>.</p>'+
  '<p class="small" style="margin-top:14px">Sist oppdatert 20.10.2026.</p></div></main>';
}

function render(){
  var id=(location.hash||'#hjem').slice(1); if(!id)id='hjem';
  var app=document.getElementById('app'), nav='', target=null;
  var m=model(id);
  if(m){app.innerHTML=modelPage(m);updateCalc();}
  else if(id==='kjop'){app.innerHTML=wherePage();nav='kjop';}
  else if(id==='velg'||id==='storrelse'){app.innerHTML=guidePage();nav='velg'; if(id==='storrelse')target='storrelse';}
  else if(id==='om'){app.innerHTML=aboutPage();nav='om';}
  else if(id==='personvern'){app.innerHTML=privacyPage();}
  else if(id==='skoene'||id==='metode'){app.innerHTML=home();nav='skoene'; if(id==='metode')target='metode'; if(animateNext){settle();animateNext=false;}}
  else {app.innerHTML=frontPage();}
  if(m)nav='skoene';
  Array.prototype.forEach.call(document.querySelectorAll('nav.main a'),function(a){
    if(a.getAttribute('href')==='#'+nav)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');
  });
  if(target){var el=document.getElementById(target);if(el)el.scrollIntoView();}else{window.scrollTo(0,0);}
}
function refreshLadder(){
  document.getElementById('ladder').innerHTML=ladderHtml();
  ['cat','g','sort'].forEach(function(n){Array.prototype.forEach.call(document.querySelectorAll('[data-'+n+']'),function(b){b.setAttribute('aria-pressed',String(b.dataset[n]===state[n]));});});
}
function resetState(){ state.cat='alle'; state.g='alle'; state.brand='alle'; state.q=''; state.sort='km'; state.limit=PAGE; }
document.addEventListener('click',function(e){
  var opt=e.target.closest('.opt');
  if(opt){ var k=opt.dataset.ch; chooser[k]=opt.dataset.v; if(k==='surface'){chooser.use=null;chooser.support=null;} if(k==='use'){chooser.support=null;} document.getElementById('chooser').innerHTML=chooserHtml(); return; }
  var go=e.target.closest('[data-go],[data-go-cat],[data-go-brand]');
  if(go){ resetState(); if(go.dataset.goCat)state.cat=go.dataset.goCat; if(go.dataset.goBrand)state.brand=go.dataset.goBrand; animateNext=true; if(location.hash==='#skoene'){ e.preventDefault(); render(); } return; }
  if(e.target.id==='more'){ state.limit=1e9; refreshLadder(); return; }
  var b=e.target.closest('.seg button'); if(!b)return;
  if(b.dataset.cat)state.cat=b.dataset.cat;
  if(b.dataset.g)state.g=b.dataset.g;
  if(b.dataset.sort)state.sort=b.dataset.sort;
  state.limit=PAGE; refreshLadder();
});
document.addEventListener('submit',function(e){
  if(e.target.id!=='qform')return; e.preventDefault();
  resetState(); state.q=document.getElementById('fq').value.trim(); animateNext=true; location.hash='skoene';
});
document.addEventListener('change',function(e){ if(e.target.id==='brand'){ state.brand=e.target.value; state.limit=PAGE; refreshLadder(); } });
document.addEventListener('input',function(e){
  if(e.target.id==='q'){ state.q=e.target.value; state.limit=PAGE; refreshLadder(); return; }
  if(['calc-pris','calc-km','ukekm'].indexOf(e.target.id)>-1) updateCalc();
});
document.getElementById('updated').textContent='Priser og forhandlere sist sjekket '+SITE.updated+'.';
window.addEventListener('hashchange',render);
render();
</script>
