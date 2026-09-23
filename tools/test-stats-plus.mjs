import { spawn } from 'child_process';
import { createRequire } from 'module';
const exiger = createRequire(new URL('../app-v2/package.json', import.meta.url));
const { chromium } = exiger('playwright');
const srv = spawn('python3',['-m','http.server','8079','--directory','app-v2/apercu/construit'],{stdio:'ignore',detached:true});
await new Promise(r=>setTimeout(r,1500));
let code=0; const ok=(c,m)=>{console.log((c?'✓ ':'✗ ')+m); if(!c) code=1;};
const nav = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const page = await (await nav.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,locale:'fr-BE'})).newPage();
page.on('pageerror', e => { console.log('ERREUR JS', e.message); code=1; });
await page.goto('http://localhost:8079/app.html'); await page.waitForTimeout(1800);
const onglet = n => page.locator('nav button, .bottom-nav button, [class*=nav] button').filter({hasText:n}).first();
const actif = () => page.evaluate(() => [...document.querySelectorAll('nav button, [class*=nav] button')].filter(b => /actif|active|on/.test(b.className)).map(b=>b.innerText.trim()).join(','));
// BelFit+ -> Courses -> retour
await onglet('BelFit+').tap(); await page.waitForTimeout(700);
ok(/Mon plan coach/.test(await page.locator('.bp-hero-cta').innerText()), 'renomme Mon plan coach');
await page.locator('.bp-carte').filter({hasText:'courses'}).tap(); await page.waitForTimeout(700);
await page.locator('.crs-rond').first().tap(); await page.waitForTimeout(700);
ok(await page.locator('.bp-hero').isVisible(), 'courses: retour vers BelFit+');
// Recettes -> retour BelFit+
await page.locator('.bp-carte').filter({hasText:'Recettes'}).tap(); await page.waitForTimeout(700);
ok(await page.locator('.eat-retour-plus').count() === 1, 'lien retour BelFit+ dans les idees');
await page.locator('.eat-retour-plus').tap(); await page.waitForTimeout(700);
ok(await page.locator('.bp-hero').isVisible(), 'idees: retour vers BelFit+');
// Stats
await onglet('Stats').tap(); await page.waitForTimeout(700);
ok(await page.locator('.stat-card.acc-blue').count() === 1, 'carte Entrainement presente');
ok(await page.locator('.st-avancees').count() === 1, 'lien stats avancees');
await page.locator('.st-avancees').tap(); await page.waitForTimeout(600);
ok(/Statistiques avancées/.test(await page.locator('body').innerText()), 'ouvre les stats avancees');
await page.goBack().catch(()=>{}); await page.waitForTimeout(600);
await onglet('Stats').tap(); await page.waitForTimeout(600);
if (!(await page.locator('.score-bloc--lien').count())) { console.log('pas de score (etat vide)'); }
else { await page.locator('.score-bloc--lien').nth(2).tap(); await page.waitForTimeout(500);
  ok(await page.locator('.wm2-voile').count() > 0, 'barre Poids ouvre la pesee'); await page.locator('.wm2-annuler').tap(); await page.waitForTimeout(300);
  await page.locator('.score-bloc--lien').nth(1).tap(); await page.waitForTimeout(700);
  ok(await page.locator('.pg-entrainer').count() > 0, 'barre Entrainement ouvre S\'entrainer'); await onglet('Stats').tap(); await page.waitForTimeout(600); }
await page.locator('.stat-card.acc-blue').scrollIntoViewIfNeeded();
await page.evaluate(()=>{}); 
await page.screenshot({path:'/tmp/s1.png', fullPage:false});
await nav.close(); try{process.kill(-srv.pid)}catch{} srv.kill(); process.exit(code);
