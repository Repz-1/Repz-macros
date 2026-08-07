import { spawn } from 'child_process';
import { createRequire } from 'module';
const exiger = createRequire(new URL('../app-v2/package.json', import.meta.url));
const { chromium } = exiger('playwright');
const srv = spawn('python3',['-m','http.server','8079','--directory','app-v2/apercu/construit'],{stdio:'ignore',detached:true});
await new Promise(r=>setTimeout(r,1500));
let code=0; const echec=m=>{console.error('✗ '+m);code=1;};
const nav = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const ctx = await nav.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,locale:'fr-BE',deviceScaleFactor:2});
const page = await ctx.newPage();
const errs=[]; page.on('pageerror',e=>errs.push(String(e)));

const semer = async (pesees) => {
  await page.goto('http://localhost:8079/app.html');
  await page.evaluate((p) => {
    localStorage.setItem('belfit_v2_apercu_premium','1');
    // Cle d'apercu dediee du store stats : elle court-circuite la
    // synchronisation, sinon le chargement ecrase la semence.
    localStorage.setItem('belfit_v2_apercu_stats', JSON.stringify({ weightLog: p, histoJours: {} }));
  }, pesees);
  await page.reload(); await page.waitForTimeout(1700);
  await page.locator('nav button, .bottom-nav button, [class*=nav] button').filter({hasText:'Stats'}).first().tap();
  await page.waitForTimeout(1200);


};

// 1. Les 6 pesées de Raci : courbe simple + message de tendance
await semer([
  {iso:'2026-07-24',weight:99.1},{iso:'2026-07-29',weight:99.1},{iso:'2026-08-03',weight:97},
  {iso:'2026-08-04',weight:96.5},{iso:'2026-08-05',weight:96.6},{iso:'2026-08-06',weight:96.6},
]);
if (await page.locator('.chart-bar').count()) echec('des barres subsistent');
if (!(await page.locator('.gr-ligne').count())) echec('pas de courbe');
if (await page.locator('.gr-tendance').count()) echec('tendance affichee avec 6 pesées');
const note = await page.locator('.gr-note').innerText();
if (!/10/.test(note)) echec('message de seuil absent : '+note);
console.log('MESSAGE :', note.trim());
// axe proportionnel au temps : 24→29 juil (5 j) plus large que 5→6 août (1 j)
const xs = await page.locator('.gr-pt').evaluateAll(els => els.map(e => +e.getAttribute('cx')));
const e1 = xs[1]-xs[0], e2 = xs[5]-xs[4];
if (!(e1 > e2*3)) echec(`axe non proportionnel : 5 jours = ${e1.toFixed(0)}, 1 jour = ${e2.toFixed(0)}`);
console.log('AXE : 5 jours =', e1.toFixed(0), 'px | 1 jour =', e2.toFixed(0), 'px');
await page.locator('.pg-stats .stat-card').first().screenshot({path:'/tmp/courbe-6.png'});

// 2. Sélecteur : 1 semaine ne garde que les pesées récentes
await page.locator('.per button').first().tap(); await page.waitForTimeout(600);
const pts1s = await page.locator('.gr-pt').count();
if (pts1s !== 4) echec('1 sem devrait garder 4 pesées, en montre '+pts1s);
console.log('1 SEMAINE :', pts1s, 'pesées');

// 3. Période libre
await page.locator('.per-libre').tap(); await page.waitForTimeout(400);
if (!(await page.locator('.per-panneau').count())) echec('le panneau de période ne s\'ouvre pas');
await page.locator('.per-panneau input').first().fill('2026-07-24');
await page.locator('.per-panneau input').nth(1).fill('2026-08-03');
await page.locator('.per-ok').tap(); await page.waitForTimeout(600);
const ptsLibre = await page.locator('.gr-pt').count();
if (ptsLibre !== 3) echec('période libre : 3 pesées attendues, '+ptsLibre);
console.log('PERIODE LIBRE 24/7→3/8 :', ptsLibre, 'pesées');

// 4. Avec 12 pesées : la tendance apparaît
const douze = [];
for (let i=0;i<12;i++) douze.push({iso:'2026-07-'+String(26+i).padStart(2,'0').replace(/^(3[2-9]|[4-9]\d)$/,'31'), weight: 97+Math.sin(i)*0.5});
const vraies = [];
for (let i=0;i<12;i++) { const d=new Date('2026-07-26'); d.setDate(d.getDate()+i);
  vraies.push({iso:d.toISOString().slice(0,10), weight: +(97+Math.sin(i)*0.5).toFixed(1)}); }
await semer(vraies);
if (!(await page.locator('.gr-tendance').count())) echec('tendance absente avec 12 pesées');
if (await page.locator('.gr-note').count()) echec('message de seuil encore affiché avec 12 pesées');
console.log('12 PESEES : tendance affichée');
await page.locator('.pg-stats .stat-card').first().screenshot({path:'/tmp/courbe-12.png'});

if (errs.length) echec('erreurs JS : '+errs.join(' | '));
if (!code) console.log('✓ courbe, axe temporel, sélecteur, période libre, seuil de tendance');
await nav.close(); try{process.kill(-srv.pid)}catch(e){}
process.exit(code);
