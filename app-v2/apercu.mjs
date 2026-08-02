/* ============================================================
   APERCU — rend les vraies pages de la v2 et enregistre une capture.

   L'ancienne version s'appuyait sur un mode invite que firebase.js
   efface au demarrage : elle ne montrait plus que l'ecran de
   connexion tout en laissant croire qu'elle verifiait le reste.
   Celle-ci monte chaque page directement, sans session simulee.

     node apercu.mjs                  toutes les pages
     node apercu.mjs journal courses  seulement celles-la

   Sortie : apercu/captures/<page>.png, plus un rapport par page
   (hauteur, debordement horizontal, erreurs JS, ressources en
   echec). Un debordement ou une erreur fait sortir en code 1 :
   l'outil doit pouvoir dire non.
   ============================================================ */
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { execFileSync } from 'child_process';
import { extname, join } from 'path';

const PAGES = ['journal', 'besoins', 'courses', 'entrainer', 'stats',
               'statsav', 'plus', 'reglages', 'premium'];
const LARGEUR = 390, HAUTEUR = 844;
const RACINE = 'apercu/construit';
const CAPTURES = 'apercu/captures';
const TYPES = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css',
                '.json':'application/json', '.png':'image/png', '.jpg':'image/jpeg',
                '.webp':'image/webp', '.svg':'image/svg+xml' };

const demandees = process.argv.slice(2).filter(a => !a.startsWith('-'));
const liste = demandees.length ? demandees : PAGES;
const inconnues = liste.filter(p => !PAGES.includes(p));
if (inconnues.length) {
  console.error('Page inconnue : ' + inconnues.join(', ') + '\nConnues : ' + PAGES.join(', '));
  process.exit(1);
}

console.log("Construction de l'apercu…");
execFileSync('npx', ['vite', 'build', '--config', 'apercu.config.js', '--logLevel', 'warn'],
             { stdio: 'inherit' });

const serveur = createServer((req, res) => {
  let chemin = decodeURIComponent(req.url.split('?')[0]);
  if (chemin === '/' || chemin.endsWith('/')) chemin += 'index.html';
  let fichier = join(RACINE, chemin);
  // Images et polices vivent a la racine du site, deux crans au-dessus.
  // Images et polices vivent a la racine du site : app-v2/.. puis
  // app-v2/public, dans cet ordre.
  if (!existsSync(fichier)) fichier = join('..', chemin);
  if (!existsSync(fichier)) fichier = join('public', chemin);
  if (!existsSync(fichier)) { res.writeHead(404); res.end('404'); return; }
  res.writeHead(200, { 'Content-Type': TYPES[extname(fichier)] || 'application/octet-stream' });
  res.end(readFileSync(fichier));
});
await new Promise(r => serveur.listen(4173, r));
mkdirSync(CAPTURES, { recursive: true });

const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
let defauts = 0;

for (const p of liste) {
  const page = await nav.newPage({ viewport: { width: LARGEUR, height: HAUTEUR },
                                   deviceScaleFactor: 2, locale: 'fr-BE' });
  const erreurs = [], echecs = [];
  page.on('pageerror', e => erreurs.push(e.message.slice(0, 130)));
  // Un message de console « failed to load resource » double une reponse
  // deja comptee plus bas : on ne garde que les vraies erreurs de script.
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (/failed to load resource/i.test(t)) return;
    erreurs.push(t.slice(0, 130));
  });
  page.on('response', r => {
    // Les polices distantes sont hors sujet : leur absence ne dit rien
    // de la page, seulement que la machine est hors ligne.
    const u = r.url();
    if (r.status() >= 400 && !/fontshare|googleapis|gstatic/.test(u)) {
      echecs.push(r.status() + ' ' + u.replace('http://localhost:4173', ''));
    }
  });

  await page.goto('http://localhost:4173/?p=' + p, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);

  const m = await page.evaluate(() => {
    const d = document.documentElement;
    // Un element plus large que la fenetre : c'est ce qui produit la
    // barre de defilement horizontale qu'une capture ne montre jamais.
    const large = [...document.querySelectorAll('*')]
      .filter(e => e.getBoundingClientRect().right > innerWidth + 1)
      .slice(0, 4)
      .map(e => (e.tagName.toLowerCase() + '.' + String(e.className || '').split(' ')[0]).slice(0, 44));
    return { hauteur: d.scrollHeight, largeur: d.scrollWidth,
             vide: (document.getElementById('apercu').textContent || '').trim().length < 12,
             large };
  });

  await page.screenshot({ path: join(CAPTURES, p + '.png'), fullPage: true });

  const souci = [];
  if (m.largeur > LARGEUR) souci.push('deborde de ' + (m.largeur - LARGEUR) + ' px : ' + m.large.join(', '));
  if (m.vide) souci.push("page quasi vide — rien ne s'est monte");
  if (erreurs.length) souci.push(erreurs.length + ' erreur(s) JS : ' + erreurs[0]);
  if (echecs.length) souci.push(echecs.length + ' ressource(s) en echec : ' + echecs[0]);
  if (souci.length) defauts++;

  console.log((souci.length ? '✗ ' : '✓ ') + p.padEnd(10) + String(m.hauteur).padStart(5) + ' px'
              + (souci.length ? '  — ' + souci.join(' | ') : ''));
  await page.close();
}

await nav.close();
serveur.close();
console.log(defauts ? '\n' + defauts + ' page(s) a revoir. Captures dans ' + CAPTURES + '/'
                    : '\nToutes les pages sont saines. Captures dans ' + CAPTURES + '/');
process.exit(defauts ? 1 : 0);
