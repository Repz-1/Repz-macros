// Test bout-en-bout : une seance libre terminee doit laisser une trace
// dans users/{uid}.v2Data.seances (miroir local belfit_v2_journal_{uid}).
// Prerequis : npx vite build --config apercu.config.js dans app-v2/.
// Usage : node tools/test-seance.mjs   (depuis la racine du depot)
// Playwright vit dans app-v2/node_modules : on le resout explicitement,
// le test etant range dans tools/ a la racine.
import { spawn } from 'child_process';
import { createRequire } from 'module';
const exiger = createRequire(new URL('../app-v2/package.json', import.meta.url));
const { chromium } = exiger('playwright');

const RACINE = 'app-v2/apercu/construit';
const PORT = 8099;
const serveur = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', RACINE],
  { stdio: 'ignore', detached: true });
await new Promise(r => setTimeout(r, 1500));

let code = 0;
const echec = (m) => { console.error('✗ ' + m); code = 1; };

const nav = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const ctx = await nav.newContext({
  viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, locale: 'fr-BE',
});
const page = await ctx.newPage();
const erreurs = [];
page.on('pageerror', e => erreurs.push(String(e)));

try {
  await page.goto(`http://localhost:${PORT}/app.html`);
  await page.waitForTimeout(1500);

  const onglet = (nom) => page.locator('nav button, .bottom-nav button, [class*=nav] button').filter({ hasText: nom });
  await onglet("S'entraîner").first().tap();
  await page.waitForTimeout(600);

  await page.locator('button, a').filter({ hasText: 'Créer ma séance' }).first().tap();
  await page.waitForTimeout(800);

  const plus = page.locator('button').filter({ hasText: /^\+$/ });
  await plus.nth(0).tap(); await page.waitForTimeout(300);
  await plus.nth(0).tap(); await page.waitForTimeout(300);

  await page.locator('.session-bar').first().tap();
  await page.waitForTimeout(900);

  await page.locator('button').filter({ hasText: /^Commencer$/ }).first().tap();
  await page.waitForTimeout(1200);

  const items = page.locator('.done-item');
  const n = await items.count();
  if (n !== 2) echec(`2 exercices attendus a l'ecran, ${n} trouves`);
  // Depuis le 7/08, le corps de l'exercice ouvre les series ;
  // c'est le petit cercle (.done-check) qui coche.
  const coches = page.locator('.done-check');
  await coches.nth(0).tap(); await page.waitForTimeout(400);
  await coches.nth(1).tap(); await page.waitForTimeout(1800);

  const stock = await page.evaluate(() => {
    const b = localStorage.getItem('belfit_v2_journal_test');
    return b ? (JSON.parse(b).seances || []) : null;
  });

  if (!stock) echec('aucune donnee locale pour le compte de test');
  else if (stock.length !== 1) echec(`1 seance attendue, ${stock.length} enregistree(s)`);
  else {
    const s = stock[0];
    if (!s.iso || !s.ts) echec('seance sans date');
    if (s.exos.length !== 2) echec(`2 exercices attendus dans la seance, ${s.exos.length} enregistre(s)`);
    if (!s.muscles.length) echec('aucun muscle rattache a la seance');
    if (typeof s.tonnage !== 'number') echec('tonnage absent');
    if (!code) console.log(`✓ seance enregistree : ${s.exos.length} exercices, muscles ${s.muscles.join('+')}, ${s.duree}s`);
  }

  if (erreurs.length) echec('erreurs JS : ' + erreurs.join(' | '));
} catch (e) {
  echec(String(e).split('\n')[0]);
} finally {
  await nav.close();
  try { process.kill(-serveur.pid); } catch (e) {}
}
process.exit(code);
