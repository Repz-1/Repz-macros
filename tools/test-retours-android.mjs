// Test durable : tous les chemins de retour (fleche + bouton Android).
// Lance : node tools/test-retours.mjs  (apercu construit requis)
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs'; import { extname, join } from 'path';
import { fileURLToPath } from 'url'; import { dirname } from 'path';
const ICI = dirname(fileURLToPath(import.meta.url));
const R = join(ICI, '../app-v2/apercu/construit');
const M={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};
const srv=createServer((q,r)=>{let p=join(R,decodeURIComponent(q.url.split('?')[0]));if(!existsSync(p)||p.endsWith('/'))p=join(R,'app.html');
 try{r.writeHead(200,{'Content-Type':M[extname(p)]||'application/octet-stream'});r.end(readFileSync(p));}catch(e){r.writeHead(404);r.end();}});
srv.listen(8082);
const nav=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const pg=await (await nav.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true})).newPage();
await pg.addInitScript(()=>localStorage.setItem('belfit_v2_apercu_premium','1'));
const erreurs=[]; pg.on('pageerror',e=>erreurs.push(e.message));
await pg.goto('http://localhost:8082/app.html'); await pg.waitForTimeout(2400);

let echecs = 0;
const verif = (nom, ok, detail='') => { console.log((ok?'  ✓ ':'  ✗ ')+nom+(ok?'':'  -> '+detail)); if(!ok) echecs++; };
const ecran = () => pg.evaluate(()=>{
  const el=document.elementFromPoint(195,300);
  const pgc=el?.closest('[class*="pg-"]');
  return pgc? pgc.className.match(/pg-[a-z-]+/)[0] : '?';
});
const onglet = () => pg.evaluate(()=>document.querySelector('.bn-item--actif')?.textContent.trim()||'');
const tap = (sel,txt) => pg.evaluate(([s,t])=>{
  const b=[...document.querySelectorAll(s)].find(e=>!t||new RegExp(t,'i').test(e.textContent));
  if(b){b.click(); return true;} return false; }, [sel,txt]);
const attendre = (ms=650) => pg.waitForTimeout(ms);

console.log('— Statistiques avancées —');
await tap('.bn-item','premium|belfit'); await attendre();
await tap('.bp-carte','stat'); await attendre();
verif('ouverture', (await ecran())==='pg-statsav');
await tap('.pg-statsav .j-retour'); await attendre();
verif('flèche -> BelFit+ (écran)', (await ecran())==='pg-plus', await ecran());
verif('flèche -> BelFit+ (onglet)', (await onglet())==='BelFit+', await onglet());
await tap('.bp-carte','stat'); await attendre();
await pg.goBack(); await attendre();
verif('retour Android ferme l\'écran', (await ecran())==='pg-plus', await ecran());
verif('retour Android garde l\'onglet', (await onglet())==='BelFit+', await onglet());

console.log('— Réglages —');
await tap('.j-btn-icone[aria-label="Réglages"]'); await attendre(900);
verif('ouverture', await pg.evaluate(()=>!!document.querySelector('.pg-reglages')));
await pg.goBack(); await attendre();
verif('retour Android ferme, onglet conservé', (await ecran())==='pg-plus' && (await onglet())==='BelFit+', (await ecran())+' / '+(await onglet()));
await tap('.j-btn-icone[aria-label="Réglages"]'); await attendre();
await tap('.pg-reglages .j-retour'); await attendre();
verif('flèche ferme, onglet conservé', (await ecran())==='pg-plus' && (await onglet())==='BelFit+', (await ecran())+' / '+(await onglet()));

console.log('— Programme BelFit+ —');
if(!(await tap('.bp-hero-cta',''))) await tap('.bp-carte','programme');
await attendre();
const surProg = await pg.evaluate(()=>!!document.querySelector('.pg-prog'));
verif('ouverture', surProg);
if (surProg){
  await pg.goBack(); await attendre();
  verif('retour Android -> BelFit+', await pg.evaluate(()=>!document.querySelector('.pg-prog') && !!document.querySelector('.pg-plus')));
}

console.log('— Rail depuis chaque onglet après un écran plein —');
for (const [nom, motif] of [['Journal','^Journal'],['S\'entraîner','Train|entra'],['Stats','^Stats']]){
  await tap('.bn-item', motif); await attendre();
  await tap('.j-btn-icone[aria-label="Réglages"]'); await attendre();
  await tap('.pg-reglages .j-retour'); await attendre();
  const e = await ecran(), o = await onglet();
  verif(`Réglages depuis ${nom} : écran et onglet cohérents`, o.includes(nom.slice(0,5)) || (nom==='S\'entraîner' && /entrainer/.test(e)), e+' / '+o);
}

console.log('— Double pression Android = accueil —');
await tap('.bn-item','premium|belfit'); await attendre();
await tap('.bp-carte','stat'); await attendre();
await pg.goBack(); await pg.waitForTimeout(120); await pg.goBack(); await attendre(900);
verif('double retour -> Journal', (await ecran())==='pg-journal' && (await onglet())==='Journal', (await ecran())+' / '+(await onglet()));

await nav.close(); srv.close();
if (erreurs.length){ console.log('ERREURS JS:', erreurs.join(' | ')); echecs++; }
console.log(echecs? `\n${echecs} ÉCHEC(S)` : '\nTOUS LES RETOURS VERTS');
process.exit(echecs?1:0);
