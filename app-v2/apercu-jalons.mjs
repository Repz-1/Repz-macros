/* Capture les deux ecrans jalons du questionnaire d'accueil. */
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { extname, join } from 'path';

const RACINE = '../v2';
const TYPES = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css',
                '.json':'application/json', '.png':'image/png', '.jpg':'image/jpeg',
                '.svg':'image/svg+xml' };

const serveur = createServer((req, res) => {
  let chemin = decodeURIComponent(req.url.split('?')[0]);
  if (chemin.startsWith('/v2/')) chemin = chemin.slice(3);
  if (chemin === '/' || chemin.endsWith('/')) chemin += 'index.html';
  let fichier = join(RACINE, chemin);
  if (!existsSync(fichier)) fichier = join(RACINE, '..', chemin);
  if (!existsSync(fichier)) { res.writeHead(404); res.end('404'); return; }
  res.writeHead(200, { 'Content-Type': TYPES[extname(fichier)] || 'application/octet-stream' });
  res.end(readFileSync(fichier));
});
await new Promise(r => serveur.listen(4173, r));

const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await nav.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'fr-BE' });
page.on('pageerror', e => console.log('ERREUR :', e.message.slice(0, 140)));

await page.goto('http://localhost:4173/v2/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
mkdirSync('apercu', { recursive: true });

const ou = () => page.evaluate(() => window.__ecran);
const cliquer = async (texte) => {
  await page.getByText(texte, { exact: false }).first().click();
  await page.waitForTimeout(300);
};
const suivant = async () => {
  await page.waitForFunction(() => {
    const b = document.querySelector('.bv-suivant');
    return b && !b.disabled;
  });
  await page.evaluate(() => document.querySelector('.bv-suivant').click());
  await page.waitForTimeout(350);
};

await cliquer('Commencer');
await page.fill('.bv-champ', 'Raci');
await suivant();
await cliquer('Prise propre');
await cliquer('Un homme');
await page.fill('input[min="14"]', '30');
await page.fill('input[min="120"]', '178');
await page.fill('input[min="35"]', '97');
await suivant();                            // corps -> cible (sautee) -> jalon 1
console.log('ecran :', await ou());
await page.waitForTimeout(400);
await page.screenshot({ path: 'apercu/jalon1.png' });

await suivant();                            // jalon 1 -> activite
await cliquer('Un peu de marche');
await cliquer('3');
await cliquer('4 repas');
await cliquer('Le sucre');                  // -> jalon 2
console.log('ecran :', await ou());
await page.waitForTimeout(400);
await page.screenshot({ path: 'apercu/jalon2.png' });

await nav.close(); serveur.close();
