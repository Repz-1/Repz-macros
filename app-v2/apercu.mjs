/* Rend la v2 dans un vrai navigateur et enregistre une capture.
   Sans cela, chaque correction est un pari : on ne voit pas le
   resultat avant que Raci le teste sur son telephone. */
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { extname, join } from 'path';

const RACINE = '../v2';
const TYPES = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css',
                '.json':'application/json', '.png':'image/png', '.jpg':'image/jpeg',
                '.svg':'image/svg+xml', '.webmanifest':'application/manifest+json' };

const serveur = createServer((req, res) => {
  let chemin = decodeURIComponent(req.url.split('?')[0]);
  // L'app est construite pour vivre sous /v2/ : ses chemins sont absolus.
  if (chemin.startsWith('/v2/')) chemin = chemin.slice(3);
  if (chemin === '/' || chemin.endsWith('/')) chemin += 'index.html';
  let fichier = join(RACINE, chemin);
  // Images et polices vivent a la racine du site, un cran au-dessus.
  if (!existsSync(fichier)) fichier = join(RACINE, '..', chemin);
  if (!existsSync(fichier)) { res.writeHead(404); res.end('404'); return; }
  res.writeHead(200, { 'Content-Type': TYPES[extname(fichier)] || 'application/octet-stream' });
  res.end(readFileSync(fichier));
});

await new Promise(r => serveur.listen(4173, r));

const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await nav.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'fr-BE' });

const bavures = [];
page.on('console', m => { if (m.type() === 'error') bavures.push(m.text().slice(0, 140)); });
const req404 = [];
page.on('response', r => { if (r.status() >= 400) req404.push(r.status() + ' ' + r.url().replace('http://localhost:4173','')); });
page.on('pageerror', e => bavures.push('ERREUR : ' + e.message.slice(0, 140)));

// Session simulee + un repas rempli, pour voir l'ecran en usage reel
await page.addInitScript(() => {
  localStorage.setItem('belfit_v2_invite', '1');   // evite l'ecran de connexion
  localStorage.setItem('belfit_v2_journal___invite__', JSON.stringify({
    objectifs: { kcal: 4300, prot: 217, carbs: 538, lip: 96 },
    eau: 0,
    repas: [
      { id: 1, nom: 'Petit déjeuner', type:'repas', cle:'pdej',  fixe:true, ouvert:false, ings: [] },
      { id: 2, nom: 'Déjeuner',       type:'repas', cle:'dej',   fixe:true, ouvert:false, ings: [] },
      { id: 3, nom: 'Dîner',          type:'repas', cle:'diner', fixe:true, ouvert:false, ings: [] },
      { id: 4, nom: 'Collations',     type:'collation', cle:'snack', fixe:true, ouvert:false, ings: [] },
    ],
  }));
});

await page.goto('http://localhost:4173/v2/', { waitUntil: 'networkidle' });
await page.waitForTimeout(3000);
console.log('titre visible :', (await page.evaluate(() => document.body.innerText.slice(0,200).replace(/\s+/g,' '))) || '(vide)');

mkdirSync('apercu', { recursive: true });
await page.screenshot({ path: 'apercu/journal.png', fullPage: true });

// Debordements horizontaux : la cause la plus frequente de mise en page cassee
const debords = await page.evaluate(() => {
  const larg = document.documentElement.clientWidth;
  return [...document.querySelectorAll('*')]
    .filter(e => e.getBoundingClientRect().right > larg + 1)
    .slice(0, 8)
    .map(e => `${e.tagName.toLowerCase()}.${(e.className || '').toString().split(' ')[0]} → ${Math.round(e.getBoundingClientRect().right)}px`);
});

console.log('largeur page :', await page.evaluate(() => document.documentElement.clientWidth));
console.log('debordements :', debords.length ? debords : 'aucun');
console.log('404/erreurs  :', req404.slice(0,8));

await nav.close();
serveur.close();
