// Parcours complet coach -> lecteur guide unique -> fin (23/09, v546).
import { spawn } from 'child_process';
import { createRequire } from 'module';
const exiger = createRequire(new URL('../app-v2/package.json', import.meta.url));
const { chromium } = exiger('playwright');
const srv = spawn('python3',['-m','http.server','8077','--directory','app-v2/apercu/construit'],{stdio:'ignore',detached:true});
await new Promise(r=>setTimeout(r,1500));
let code=0; const ok=(c,m)=>{console.log((c?'✓ ':'✗ ')+m); if(!c) code=1;};
const nav = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const ctx = await nav.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,locale:'fr-BE'});
const page = await ctx.newPage();
page.on('pageerror', e => { console.log('ERREUR JS', e.message); code=1; });
await page.goto('http://localhost:8077/app.html'); await page.waitForTimeout(1800);
const dire = async (txt) => {
  await page.fill('.coach-bar-champ', txt);
  await page.locator('.coach-bar-go').tap(); await page.waitForTimeout(400);
  return page.locator('.coach-bar-diner').innerText().catch(()=> '');
};
const a = await dire('ce soir séance dos (lourd et court)');
const b = await dire('séance dos endurance');
ok(a !== b, 'lourd/court et endurance different');
ok(/Force/.test(a) && /5×5/.test(a), 'lourd = Force 5×5');
ok(/Endurance/.test(b) && /3×15/.test(b), 'endurance = 3×15');

// Autre jour : part au calendrier
const d = await dire('demain séance jambes');
ok(/Poser pour demain/.test(d), 'bouton « Poser pour demain »');
await page.locator('.coach-bar-ajout').tap(); await page.waitForTimeout(300);
const planif = await page.evaluate(() => Object.keys(localStorage).map(k => localStorage.getItem(k)).join(' '));
ok(/posée pour demain/.test(await page.locator('.coach-bar-msg').innerText()), 'message « posée pour demain »');

// Ce soir : brouillon puis lecteur guide
await dire('ce soir séance dos lourd et court');
await page.locator('.coach-bar-ajout').tap(); await page.waitForTimeout(300);
await page.locator('.coach-bar-ajout').tap(); await page.waitForTimeout(900);
ok(await page.locator('.sg').count() === 1, 'Commencer ouvre le lecteur guide');
ok(await page.locator('.sg-pts > *').count() === 5, '5 series attendues (schema force)');
ok(await page.locator('.sg-ch input').nth(1).inputValue() === '5', 'reps preremplies a 5');
await page.locator('.sg-ch input').first().fill('100');
await page.locator('.sg-go').tap(); await page.waitForTimeout(300);
ok(/3:0|2:5/.test(await page.locator('.sg-repos-c').innerText()), 'repos 3 min lance');
await page.locator('.sg-sec button').filter({hasText:'Terminer la séance'}).tap(); await page.waitForTimeout(900);
ok(await page.locator('text=Aucun exercice').count() === 0, 'pas d\'ecran vide');
ok(await page.locator('.sg-scene-fin').count() === 0, 'pas d\'ecran Bravo');
const bande = await page.locator('.sj-meta, .cp-tuile-fait').first().innerText().catch(()=> '');
ok(/✓/.test(bande) && /500 kg/.test(bande), 'bande recap sur S\'entrainer (' + bande + ')');
const log = await page.evaluate(() => JSON.stringify(localStorage));
ok(/Dos · Force/.test(log), 'seance enregistree sous son titre');

// Seance libre -> lecteur guide direct
await page.locator('button').filter({hasText:/Séance libre|Démarrer une séance/}).first().tap().catch(()=>{});
await page.waitForTimeout(700);
if (await page.locator('.ex-add').count()) {
  await page.locator('.ex-add').first().tap(); await page.waitForTimeout(300);
  await page.locator('.session-bar .go').click(); await page.waitForTimeout(700);
  ok(await page.locator('.sg').count() === 1, 'seance libre -> lecteur guide');
} else ok(false, 'choix des exercices introuvable');
await page.screenshot({path:'/tmp/fin.png'});
await nav.close(); try { process.kill(-srv.pid); } catch {} srv.kill(); process.exit(code);
