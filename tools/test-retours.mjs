// ============================================================
// TEST DURABLE — tous les chemins de retour de l'application.
// Ne sur le bug du 8/08 : l'ecran Reglages heritait du transform
// inline du rail (recyclage de noeud Preact) et sa fleche sortait
// de l'ecran des qu'on n'ouvrait pas depuis le Journal.
// Verifie : Reglages depuis les 4 onglets, sous-ecran Compte
// (une seule marche), Statistiques avancees, recalage du rail.
// Usage : node tools/test-retours.mjs  (apres build de l'apercu)
// ============================================================
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs'; import { extname, join } from 'path';
const R = new URL('../app-v2/apercu/construit', import.meta.url).pathname;
const M={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml'};
const srv=createServer((q,r)=>{let p=join(R,decodeURIComponent(q.url.split('?')[0]));if(!existsSync(p)||p.endsWith('/'))p=join(R,'app.html');
 try{r.writeHead(200,{'Content-Type':M[extname(p)]||'application/octet-stream'});r.end(readFileSync(p));}catch(e){r.writeHead(404);r.end();}});
srv.listen(8076);
const nav=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const pg=await (await nav.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true})).newPage();
const erreurs=[]; pg.on('pageerror',e=>erreurs.push(e.message));
await pg.goto('http://localhost:8076/app.html'); await pg.waitForTimeout(2600);
let echecs=0;
const ok=(n,c,d)=>{ if(!c) echecs++; console.log((c?'✓':'✗ ECHEC'),n,c?'':JSON.stringify(d)); };
const clicVisible=(sel,txt)=>pg.evaluate(([s,t])=>{
  const e=[...document.querySelectorAll(s)].find(el=>{const b=el.getBoundingClientRect();
    return b.x>=0&&b.x<390&&b.width>0&&(!t||el.textContent.includes(t));});
  if(e){e.click();return true;} return false;}, [sel,txt||null]);
const etat=()=>pg.evaluate(()=>({
  reglages: !!document.querySelector('.ecran-reglages'),
  statsav: !!document.querySelector('.pg-statsav'),
  onglet: [...document.querySelectorAll('.bn-item')].find(e=>/actif/.test(e.className))?.textContent.trim()||null }));

// Reglages depuis chaque onglet : ouverture, FLECHE VISIBLE (x>=0), fermeture, meme onglet
for (const nom of [['Journal','Journal'],['Train','Train'],['Stats','Stats'],[/BelFit\+/,'BelFit+']]) {
  await pg.locator('.bn-item',{hasText:nom[0]}).tap(); await pg.waitForTimeout(650);
  await clicVisible('button[aria-label="Réglages"]'); await pg.waitForTimeout(650);
  const pos=await pg.evaluate(()=>{const b=document.querySelector('.ecran-reglages .j-retour')?.getBoundingClientRect(); return b?Math.round(b.x):null;});
  await clicVisible('.ecran-reglages .j-retour'); await pg.waitForTimeout(650);
  const e=await etat();
  ok(`Reglages depuis ${nom[1]}`, pos!==null && pos>=0 && pos<60 && !e.reglages && e.onglet===nom[1], {posFleche:pos, apres:e});
}
// Sous-ecran Compte : une marche
await clicVisible('button[aria-label="Réglages"]'); await pg.waitForTimeout(650);
const t1=await pg.evaluate(()=>document.querySelector('.rg-titre')?.textContent.trim());
await pg.evaluate(()=>document.querySelectorAll('.rg-carte .rg-rangee')[0]?.click()); await pg.waitForTimeout(650);
const t2=await pg.evaluate(()=>document.querySelector('.rg-titre')?.textContent.trim());
await clicVisible('.ecran-reglages .j-retour'); await pg.waitForTimeout(650);
const t3=await pg.evaluate(()=>document.querySelector('.rg-titre')?.textContent.trim());
ok('Sous-ecran Compte -> menu (une marche)', t2!==t1 && t3===t1 && (await etat()).reglages, {t1,t2,t3});
await clicVisible('.ecran-reglages .j-retour'); await pg.waitForTimeout(600);
// Statistiques avancees
await pg.locator('.bn-item',{hasText:/BelFit\+/}).tap(); await pg.waitForTimeout(650);
await pg.evaluate(()=>{[...document.querySelectorAll('.pg-plus .bp-carte')].find(e=>/stat/i.test(e.textContent))?.click();}); await pg.waitForTimeout(650);
const posSA=await pg.evaluate(()=>{const b=document.querySelector('.pg-statsav .j-retour')?.getBoundingClientRect(); return b?Math.round(b.x):null;});
await clicVisible('.pg-statsav .j-retour'); await pg.waitForTimeout(650);
const eSA=await etat();
ok('StatsAvancees -> BelFit+', posSA!==null && posSA>=0 && posSA<60 && !eSA.statsav && eSA.onglet==='BelFit+', {posFleche:posSA, apres:eSA});
await nav.close(); srv.close();
if(erreurs.length){ console.log('ERREURS JS:', erreurs.join(' | ')); echecs++; }
console.log(echecs? `${echecs} echec(s)` : 'Tous les retours passent.');
process.exit(echecs?1:0);
