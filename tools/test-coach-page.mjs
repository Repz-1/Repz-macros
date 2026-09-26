// Test de l'onglet Coach (26/09). Depuis la racine : node tools/test-coach-page.mjs
// Prerequis : apercu construit (npx vite build --config apercu.config.js dans app-v2).
import { spawn } from 'child_process';
import { createRequire } from 'module';
const { chromium } = createRequire(new URL('../app-v2/package.json', import.meta.url))('playwright');
const PORT = 8097;
const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', 'app-v2/apercu/construit'], { stdio: 'ignore', detached: true });
srv.unref(); await new Promise(r => setTimeout(r, 1500));
let code = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) code = 1; };
const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
async function ouvrir(plan) {
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, locale: 'fr-BE' });
  const p = await ctx.newPage(); p.setDefaultTimeout(8000);
  p.on('pageerror', e => ok(false, 'erreur JS ' + e.message));
  await p.goto(`http://localhost:${PORT}/app.html`);
  if (plan) await p.evaluate(pl => localStorage.setItem('belfit_v2_apercu_programme', JSON.stringify(pl)), plan);
  await p.reload(); await p.waitForTimeout(1800);
  await p.locator('.bn-item').last().tap(); await p.waitForTimeout(900);
  return p;
}
try {
  let p = await ouvrir(null);
  ok((await p.locator('.bn-item').last().innerText()).trim() === 'Coach', 'onglet nomme « Coach »');
  const txt = await p.locator('.pg-coach').innerText();
  ok(/Coach BelFit/.test(txt) && !/REPZ/.test(txt), 'profil « Coach BelFit »');
  ok(/80 €/.test(txt) && !/60 €/.test(txt), 'sans plan : premier plan 80 €, pas de mise a jour');
  await p.locator('.cp-bt', { hasText: 'Demander mon plan' }).tap();
  ok(await p.locator('.cp-modale .cp-bt--or').isDisabled(), 'paiement bloque tant que les conditions ne sont pas cochees');
  await p.locator('.cp-consent input').check();
  ok(!(await p.locator('.cp-modale .cp-bt--or').isDisabled()), 'paiement possible une fois coche');
  await p.context().close();
  const vieux = new Date(Date.now() - 34 * 86400000).toISOString();
  p = await ouvrir({ kcal: 2400, prot: 180, carbs: 250, lip: 70, livreLe: vieux, repas: [{ nom: 'Petit dejeuner', ings: [{ name: 'Skyr', portion: 200 }] }] });
  const t2 = await p.locator('.pg-coach').innerText();
  ok(/Mon plan coach/.test(t2) && /60 €/.test(t2) && !/80 €/.test(t2), 'avec plan : carte plan + mise a jour 60 €');
  ok(/34 jours/.test(t2), 'rappel apres 30 jours');
  await p.locator('.cp-bt', { hasText: 'Voir mon plan' }).tap(); await p.waitForTimeout(500);
  ok(await p.locator('.pg-prog').count() === 1, 'plan ouvert');
  ok(/Mettre à jour mon plan/.test(await p.locator('.pg-prog').innerText()), 'plus d\'ajustement gratuit : bouton mise a jour');
  await p.locator('.prog-action', { hasText: 'Mettre à jour' }).tap(); await p.waitForTimeout(400);
  ok(await p.locator('.pg-coach').count() === 1, 'retour sur la page Coach');
} catch (e) { ok(false, e.message.split('\n')[0]); }
await nav.close(); try { process.kill(-srv.pid); } catch {}
process.exit(code);
