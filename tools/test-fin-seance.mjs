import { spawn } from 'child_process';
import { createRequire } from 'module';
const exiger = createRequire(new URL('../app-v2/package.json', import.meta.url));
const { chromium } = exiger('playwright');
const srv = spawn('python3',['-m','http.server','8076','--directory','app-v2/apercu/construit'],{stdio:'ignore',detached:true});
await new Promise(r=>setTimeout(r,1500));
let code=0; const echec=m=>{console.error('✗ '+m);code=1;};
const nav = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const ctx = await nav.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,locale:'fr-BE'});
const page = await ctx.newPage();
await page.goto('http://localhost:8076/app.html');
await page.evaluate(() => localStorage.setItem('belfit_v2_apercu_premium','1'));
await page.reload(); await page.waitForTimeout(1700);
const onglet=n=>page.locator('nav button, .bottom-nav button, [class*=nav] button').filter({hasText:n});

// BUG 4 : l'ecran de fin doit couvrir l'ecran, pas cheval sur deux panneaux
await onglet("S'entraîner").first().tap(); await page.waitForTimeout(600);
await page.locator('button, a').filter({hasText:'Créer ma séance'}).first().tap(); await page.waitForTimeout(700);
await page.locator('.ex-add').first().tap(); await page.waitForTimeout(300);
await page.locator('.session-bar').click(); await page.waitForTimeout(700);
await page.locator('button').filter({hasText:/^Commencer$/}).first().tap(); await page.waitForTimeout(900);
await page.locator('.done-check').first().tap(); await page.waitForTimeout(1800);
const ov = await page.locator('.congrats-overlay.show').evaluate(el => {
  const r = el.getBoundingClientRect();
  return { x: Math.round(r.left), w: Math.round(r.width), parent: el.parentElement.tagName,
    ecran: innerWidth };
});
console.log('ECRAN DE FIN :', JSON.stringify(ov));
if (ov.x !== 0 || ov.w !== ov.ecran) echec('la surcouche ne couvre pas l\'ecran');
if (ov.parent !== 'BODY') echec('la surcouche n\'est pas en portail (parent '+ov.parent+')');
const carte = await page.locator('.congrats-overlay.show .congrats-card').evaluate(el => {
  const r = el.getBoundingClientRect();
  return { centre: Math.round(r.left + r.width/2), ecran: Math.round(innerWidth/2) };
});
console.log('CARTE :', JSON.stringify(carte));
if (Math.abs(carte.centre - carte.ecran) > 2) echec('carte non centrée');
await page.screenshot({path:'/tmp/fin-seance.png'});
await page.locator('.congrats-btn:visible').last().click(); await page.waitForTimeout(800);

// BUG 3 : la fleche des Statistiques avancees revient a BelFit+
await onglet('BelFit+').first().tap(); await page.waitForTimeout(700);
// Le rail monte les quatre panneaux : on clique la carte visible.
const av = await page.evaluateHandle(() => [...document.querySelectorAll('button.bp-carte')]
  .find(b => /statistiques/i.test(b.textContent)
    && b.getBoundingClientRect().left >= 0 && b.getBoundingClientRect().right <= innerWidth));
if (!av.asElement()) echec('carte Statistiques avancées introuvable');
else { await av.asElement().scrollIntoViewIfNeeded(); await av.asElement().click(); await page.waitForTimeout(900); }
if (!(await page.locator('.pg-statsav').count())) echec('Statistiques avancées ne s\'ouvre pas');
if (await page.locator('.sa-retour').count()) echec('la seconde flèche est encore là');
await page.locator('.pg-statsav .j-retour').click(); await page.waitForTimeout(800);
if (await page.locator('.pg-statsav').count()) echec('la flèche ne ferme pas les Statistiques avancées');
const ongletFin = await page.evaluate(() => {
  const a = document.querySelector('nav .actif, .bottom-nav .actif, [class*=nav] [class*=actif]');
  return a ? a.textContent.trim() : document.body.innerText.slice(0,40);
});
console.log('RETOUR SUR :', ongletFin);
if (!(await page.locator('.bp-hero').count())) echec('le retour ne ramène pas sur BelFit+');
if (!code) console.log('✓ écran de fin centré en portail, flèche des stats avancées OK');
await nav.close(); try{process.kill(-srv.pid)}catch(e){}
process.exit(code);
