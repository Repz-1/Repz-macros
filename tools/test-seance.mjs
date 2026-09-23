// Test bout-en-bout : une seance libre terminee laisse une trace dans
// le journal local (belfit_v2_journal_*), avec un tonnage > 0.
// Reecrit le 23/09 : l'ancien test visait « Ma seance » (supprimee en
// v546). Le parcours passe desormais par le lecteur guide unique.
// Prerequis : npx vite build --config apercu.config.js dans app-v2/.
// Usage : node tools/test-seance.mjs   (depuis la racine du depot)
import { spawn } from 'child_process';
import { createRequire } from 'module';
const exiger = createRequire(new URL('../app-v2/package.json', import.meta.url));
const { chromium } = exiger('playwright');
const PORT = 8099;
const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', 'app-v2/apercu/construit'],
  { stdio: 'ignore', detached: true });
srv.unref();
await new Promise(r => setTimeout(r, 1500));
let code = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) code = 1; };
const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
try {
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, locale: 'fr-BE' });
  const page = await ctx.newPage();
  page.on('pageerror', e => { console.log('ERREUR JS', e.message); code = 1; });
  page.setDefaultTimeout(8000);
  await page.goto(`http://localhost:${PORT}/app.html`); await page.waitForTimeout(1800);
  await page.locator('nav button, .bottom-nav button, [class*=nav] button').filter({ hasText: /entra/i }).first().tap();
  await page.waitForTimeout(700);
  await page.locator('button').filter({ hasText: /Séance libre|Démarrer une séance|Créer ma séance/ }).first().tap();
  await page.waitForTimeout(700);
  ok(await page.locator('.ex-add').count() > 1, 'choix des exercices ouvert');
  await page.locator('.ex-add').nth(0).tap(); await page.waitForTimeout(200);
  await page.locator('.ex-add').nth(1).tap(); await page.waitForTimeout(200);
  await page.locator('.session-bar .go').click(); await page.waitForTimeout(800);
  ok(await page.locator('.sg').count() === 1, 'lecteur guide ouvert');
  await page.locator('.sg-ch input').first().fill('60');
  await page.locator('.sg-ch input').nth(1).fill('10');
  await page.locator('.sg-go').tap(); await page.waitForTimeout(300);
  await page.locator('.sg-sec button').filter({ hasText: 'Terminer la séance' }).tap(); await page.waitForTimeout(1000);
  ok(await page.locator('.sg').count() === 0, 'retour sur S\'entrainer');
  const tonnage = await page.evaluate(() => {
    let max = 0;
    for (const k of Object.keys(localStorage)) {
      if (!k.startsWith('belfit_v2_journal')) continue;
      const m = localStorage.getItem(k).match(/"(?:tonnage|volume|kg)"\s*:\s*(\d+)/g) || [];
      for (const x of m) max = Math.max(max, +x.split(':')[1]);
    }
    return max;
  });
  ok(tonnage >= 600, 'seance enregistree avec tonnage (' + tonnage + ' kg)');
} catch (e) { ok(false, e.message.split('\n')[0]); }
await nav.close(); try { process.kill(-srv.pid); } catch {}
process.exit(code);
