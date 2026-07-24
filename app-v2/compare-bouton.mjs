/* Compare le bouton du parcours en or et en noir, sur un jalon et
   sur un ecran de question — pour trancher sur pieces. */
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { extname, join } from 'path';

const RACINE = '../v2';
const TYPES = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css',
                '.json':'application/json', '.png':'image/png', '.jpg':'image/jpeg', '.svg':'image/svg+xml' };
const serveur = createServer((req, res) => {
  let chemin = decodeURIComponent(req.url.split('?')[0]);
  if (chemin.startsWith('/v2/')) chemin = chemin.slice(3);
  if (chemin === '/' || chemin.endsWith('/')) chemin += 'index.html';
  let f = join(RACINE, chemin);
  if (!existsSync(f)) f = join(RACINE, '..', chemin);
  if (!existsSync(f)) { res.writeHead(404); res.end('404'); return; }
  res.writeHead(200, { 'Content-Type': TYPES[extname(f)] || 'application/octet-stream' });
  res.end(readFileSync(f));
});
await new Promise(r => serveur.listen(4174, r));

const NOIR = `.bv-suivant{background:#191919!important;color:#fff!important;
  box-shadow:0 1px 2px rgba(24,24,24,.10),0 10px 26px rgba(24,24,24,.22)!important}`;

const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
mkdirSync('apercu', { recursive: true });

for (const [nom, css] of [['or', ''], ['noir', NOIR]]) {
  const page = await nav.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'fr-BE' });
  await page.goto('http://localhost:4174/v2/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  if (css) await page.addStyleTag({ content: css });

  const clic = async (t) => { await page.getByText(t, { exact: false }).first().click(); await page.waitForTimeout(280); };
  const suiv = async () => {
    await page.waitForFunction(() => { const b = document.querySelector('.bv-suivant'); return b && !b.disabled; });
    await page.evaluate(() => document.querySelector('.bv-suivant').click());
    await page.waitForTimeout(320);
  };

  await clic('Commencer');
  await page.click('.bv-champ');
  await page.type('.bv-champ', 'Raci', { delay: 40 });
  // Attendre que le bouton redevienne actif : sinon on capture son
  // etat desactive (opacite 38 %), qui fausse toute comparaison.
  await page.waitForFunction(() => { const b = document.querySelector('.bv-suivant'); return b && !b.disabled; });
  await page.waitForTimeout(300);
  if (css) await page.addStyleTag({ content: css });
  await page.screenshot({ path: `apercu/question-${nom}.png` });   // ecran de question

  await suiv(); await clic('Prise propre'); await clic('Un homme');
  await page.fill('input[min="14"]', '30');
  await page.fill('input[min="120"]', '178');
  await page.fill('input[min="35"]', '97');
  await suiv();
  await page.waitForTimeout(400);
  if (css) await page.addStyleTag({ content: css });
  await page.screenshot({ path: `apercu/jalon-${nom}.png` });      // ecran jalon
  await page.close();
}
await nav.close(); serveur.close();
console.log('4 captures faites');
