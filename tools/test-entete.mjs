import { spawn } from 'child_process';
import { createRequire } from 'module';
const exiger = createRequire(new URL('../app-v2/package.json', import.meta.url));
const { chromium } = exiger('playwright');
const srv = spawn('python3',['-m','http.server','8083','--directory','app-v2/apercu/construit'],{stdio:'ignore',detached:true});
await new Promise(r=>setTimeout(r,1500));
let code=0; const echec=m=>{console.error('✗ '+m);code=1;};
const nav = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const ctx = await nav.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,locale:'fr-BE'});
const page = await ctx.newPage();
await page.goto('http://localhost:8083/app.html');
await page.evaluate(() => localStorage.setItem('belfit_v2_apercu_premium','1'));
await page.reload(); await page.waitForTimeout(1600);
const onglet=n=>page.locator('nav button, .bottom-nav button, [class*=nav] button').filter({hasText:n});
const lire = () => page.evaluate(() => {
  const e = [...document.querySelectorAll('.j-entete--perso')]
    .find(x => { const r=x.getBoundingClientRect(); return r.left>=0 && r.right<=innerWidth && r.height>0; });
  if (!e) return null;
  const p = e.querySelector('.j-prenom'), c = getComputedStyle(p), r = p.getBoundingClientRect();
  return { centre: Math.round(r.left+r.width/2), ecran: Math.round(innerWidth/2),
    police: c.fontFamily.split(',')[0], corps: c.fontSize, graisse: c.fontWeight, couleur: c.color,
    gauche: e.querySelector('.j-retour') ? 'fleche' : (e.querySelector('.j-symbole') ? 'symbole' : 'rien'),
    icones: e.querySelectorAll('.j-entete-actions .j-btn-icone').length,
    droite: Math.round(e.getBoundingClientRect().right - e.querySelector('.j-entete-actions').getBoundingClientRect().right) };
});
// 1. Les quatre onglets principaux : tout identique, symbole a gauche
const ref = {};
for (const o of ['Journal',"S'entraîner",'Stats','Premium','BelFit+']) {
  const b = onglet(o); if (!(await b.count())) continue;
  await b.first().tap(); await page.waitForTimeout(700);
  const m = await lire();
  if (!m) { echec(o+' : aucune en-tete visible'); continue; }
  if (m.centre !== m.ecran) echec(o+' : prenom a '+m.centre+' au lieu de '+m.ecran);
  if (m.gauche !== 'symbole') echec(o+' : '+m.gauche+' a gauche au lieu du symbole');
  if (m.icones !== 2) echec(o+' : '+m.icones+' icones a droite au lieu de 2');
  // Position ABSOLUE du logo et des icones : c'est ce que l'oeil
  // compare quand on glisse d'un onglet a l'autre.
  const pos = await page.evaluate(() => {
    const e = [...document.querySelectorAll('.j-entete--perso')]
      .find(x => { const r=x.getBoundingClientRect(); return r.left>=0 && r.right<=innerWidth && r.height>0; });
    const g = e.querySelector('.j-symbole, .j-retour').getBoundingClientRect();
    const a = e.querySelector('.j-entete-actions').getBoundingClientRect();
    return { g: Math.round(g.left), d: Math.round(innerWidth - a.right) };
  });
  if (pos.g !== 16) echec(o+' : symbole a '+pos.g+' px du bord au lieu de 16');
  if (pos.d !== 8) echec(o+' : icones a '+pos.d+' px du bord au lieu de 8');
  const sig = m.police+'|'+m.corps+'|'+m.graisse+'|'+m.couleur;
  if (!ref.sig) ref.sig = sig; else if (sig !== ref.sig) echec(o+' : en-tete different -> '+sig+' vs '+ref.sig);
}
// 2. Un ecran secondaire garde sa fleche : les Reglages, joignables
// depuis n'importe quel onglet par la roue dentee.
await page.locator('.j-entete-actions .j-btn-icone').last().click();
await page.waitForTimeout(900);
const sec = await lire();
if (sec && sec.gauche !== 'fleche') echec('reglages : fleche de retour absente (' + sec.gauche + ')');

if (!code) console.log('✓ en-tete identique sur les 4 onglets ('+ref.sig+'), fleche conservee en secondaire');
await nav.close(); try{process.kill(-srv.pid)}catch(e){}
process.exit(code);
