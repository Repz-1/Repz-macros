import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { extname, join } from 'path';
const T = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const srv = createServer((q,r)=>{
  let c = decodeURIComponent(q.url.split('?')[0]);
  if (c.startsWith('/v2/')) c = c.slice(3);
  if (c.endsWith('/')) c += 'index.html';
  let f = join('../v2', c);
  if (!existsSync(f)) f = join('../v2/..', c);
  if (!existsSync(f)) { r.writeHead(404); r.end(); return; }
  r.writeHead(200, {'Content-Type': T[extname(f)]||'application/octet-stream'});
  r.end(readFileSync(f));
});
await new Promise(r=>srv.listen(4175,r));
const nav = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await nav.newPage({ viewport:{width:390,height:844}, locale:'fr-BE' });
await p.addInitScript(() => {
  localStorage.setItem('belfit_v2_invite','1');
  localStorage.setItem('belfit_v2_journal___invite__', JSON.stringify({
    objectifs:{kcal:4300,prot:216,carbs:538,lip:96}, eau:0,
    repas:[
      {id:1,nom:'Petit déjeuner',type:'repas',cle:'pdej',fixe:true,ouvert:false,ings:[]},
      {id:2,nom:'Déjeuner',type:'repas',cle:'dej',fixe:true,ouvert:false,ings:[]},
      {id:3,nom:'Dîner',type:'repas',cle:'diner',fixe:true,ouvert:false,ings:[]},
      {id:4,nom:'Collations',type:'collation',cle:'snack',fixe:true,ouvert:false,ings:[]},
    ]}));
});
await p.goto('http://localhost:4175/v2/', {waitUntil:'networkidle'});
await p.waitForTimeout(1200);

const m = await p.evaluate(() => {
  const r = s => { const e = document.querySelector(s); if (!e) return null;
    const b = e.getBoundingClientRect();
    const c = getComputedStyle(e);
    return { h: Math.round(b.height), l: Math.round(b.width), y: Math.round(b.top),
             taille: c.fontSize, poids: c.fontWeight, coul: c.color };
  };
  return {
    'logo':            r('.j-logo'),
    'carte calories':  r('.cal'),
    'anneau':          r('.cal-anneau'),
    'chiffre':         r('.cal-num'),
    'cote gauche':     r('.cal-cote'),
    'raccourcis':      r('.qa'),
    'pilule recettes': r('.eat-toggle'),
    'carte repas 1':   r('.mc'),
    'vignette':        r('.mc-vignette'),
    'titre repas':     r('.mc-titre'),
    'sous-titre':      r('.mc-sous'),
  };
});
console.table(m);
await nav.close(); srv.close();
