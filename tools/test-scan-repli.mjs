// Verifie le repli photo du scanner : caméra refusée (comme sur
// iPhone en PWA) -> le bouton photo devient le chemin principal,
// et l'input ouvre bien l'appareil arriere.
import { spawn } from 'child_process';
import { createRequire } from 'module';
const exiger = createRequire(new URL('../app-v2/package.json', import.meta.url));
const { chromium } = exiger('playwright');
const srv = spawn('python3',['-m','http.server','8095','--directory','app-v2/apercu/construit'],{stdio:'ignore',detached:true});
await new Promise(r=>setTimeout(r,1500));
let code=0; const echec=m=>{console.error('✗ '+m);code=1;};
const nav = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const ctx = await nav.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,locale:'fr-BE'});
const page = await ctx.newPage();
const errs=[]; page.on('pageerror',e=>errs.push(String(e)));

// Simuler un iPhone en PWA : getUserMedia refuse, comme WebKit le fait.
await page.addInitScript(() => {
  navigator.mediaDevices = navigator.mediaDevices || {};
  navigator.mediaDevices.getUserMedia = () => Promise.reject(new Error('NotAllowedError'));
  navigator.mediaDevices.enumerateDevices = () => Promise.reject(new Error('NotAllowedError'));
  localStorage.setItem('belfit_v2_apercu_premium','1');
});
await page.goto('http://localhost:8095/app.html'); await page.waitForTimeout(1800);

// La zone d'ajout (donc le bouton scan) vit dans MealPage : il faut
// d'abord ouvrir un repas depuis le Journal.
await page.locator('.mc-tete').first().tap();
await page.waitForTimeout(1200);
const scanBtn = page.locator('.mc-scan');
console.log('BOUTONS SCAN :', await scanBtn.count());
if (await scanBtn.count() === 0) { echec('bouton scan introuvable apres ouverture du repas'); }
else { await scanBtn.first().tap(); await page.waitForTimeout(2500); }

const modale = page.locator('.modale.montre');
if (await modale.count() === 0) { echec('la modale scan ne s\'ouvre pas'); }
else {
  const statut = await page.locator('.scan-statut').innerText();
  if (!statut.toLowerCase().includes('photo')) echec('le statut ne renvoie pas vers la photo : '+statut);

  const bouton = page.locator('.scan-photo');
  if (await bouton.count() !== 1) echec('bouton photo absent');
  else {
    const cls = await bouton.getAttribute('class');
    if (!cls.includes('primaire')) echec('le bouton photo ne passe pas en principal apres echec camera');
    const vis = await bouton.isVisible();
    if (!vis) echec('bouton photo invisible');
  }
  const inp = await page.locator('.scan-fichier').evaluate(el => ({accept: el.accept, capture: el.getAttribute('capture'), type: el.type}));
  if (inp.type !== 'file' || inp.capture !== 'environment' || !inp.accept.includes('image'))
    echec('input photo mal configure : '+JSON.stringify(inp));
  await page.screenshot({path:'/tmp/scan-fallback.png'});
}
if (errs.length) echec('erreurs JS : '+errs.join(' | '));
if (!code) console.log('✓ repli photo : camera refusee -> bouton photo principal, appareil arriere, statut explicite');
await nav.close(); try{process.kill(-srv.pid)}catch(e){}
process.exit(code);
