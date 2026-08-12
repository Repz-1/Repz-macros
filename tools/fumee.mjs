#!/usr/bin/env node
// ============================================================
// TEST DE FUMEE — on OUVRE chaque ecran et on lit la console.
//
// Pourquoi ce fichier existe : le 10/08, Raci a signale que le
// questionnaire etait bloque a l'etape 2. Cause : une balise
// <Reglette> sans composant derriere, supprime le 27/07. L'ecran
// plantait au rendu depuis QUINZE JOURS et personne ne pouvait
// generer de programme.
//
// Ni `verif-js.js` (syntaxe) ni `audit.mjs` (lecture de fichiers)
// ne pouvaient le voir : aucun des deux ne lance l'application. Une
// erreur de rendu ne se trouve pas dans du texte, elle se trouve
// dans la console d'un navigateur.
//
// Ce test ouvre chaque ecran, clique ce qu'il faut pour avancer, et
// echoue a la moindre erreur de page. Il ne juge pas l'apparence :
// il verifie que ca ne casse pas.
//
// Prealable : construire l'apercu et le servir sur le port 8099.
//   cd app-v2
//   npx vite build --config apercu.config.js
//   (cd apercu/construit && python3 -m http.server 8099 &)
//   node ../tools/fumee.mjs
// ============================================================
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:8099';
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const ecrans = [
  {
    nom: 'Journal',
    url: 'app.html',
    // Le journal se contente de s'afficher : on ouvre chaque repas.
    parcours: async (p) => {
      const cartes = await p.$$('.mc-tete, .mc-carte');
      for (const c of cartes.slice(0, 4)) { await c.tap().catch(() => {}); await p.waitForTimeout(400); }
    },
  },
  {
    nom: 'Repas (encodage)',
    url: 'repas.html',
    parcours: async (p) => {
      const champ = await p.$('input[placeholder]');
      await champ.tap(); await p.waitForTimeout(500);
      await champ.type('poulet', { delay: 30 }); await p.waitForTimeout(600);
      const r = await p.$('.mc-res-choix');
      if (r) { await r.tap(); await p.waitForTimeout(600); }
    },
  },
  {
    nom: 'Stats',
    url: 'stats.html',
    parcours: async (p) => {
      // Chaque selecteur de periode redessine un graphe : on les passe tous.
      const pastilles = await p.$$('.pg-stats .per button');
      for (const b of pastilles) { await b.tap().catch(() => {}); await p.waitForTimeout(300); }
    },
  },
  {
    nom: 'Questionnaire programme',
    url: 'quiz.html',
    // Les neuf etapes. C'est ici que se cachait le composant fantome :
    // seul un parcours COMPLET le rencontrait, l'etape 1 s'affichant
    // parfaitement.
    parcours: async (p) => {
      for (let k = 0; k < 10; k++) {
        await p.evaluate(() => { const b = document.querySelector('.qz-opt'); if (b) b.click(); });
        await p.waitForTimeout(250);
        const btn = await p.$('.qz-btn');
        if (!btn || await p.evaluate(e => e.disabled, btn)) break;
        await btn.tap();
        await p.waitForTimeout(500);
      }
      await p.waitForTimeout(4500);   // la cinematique de fin
    },
  },
];

// Bruit de fond attendu : l'apercu n'a ni Firebase joignable ni
// service worker, et il est servi a la racine alors que les images
// sont referencees depuis /v2/ — elles existent bien dans le depot,
// verifie. Tout le reste est un vrai defaut.
const ATTENDU = /Firestore|firebase|identitytoolkit|googleapis|Failed to fetch|net::ERR|ServiceWorker|Manifest|favicon|Failed to load resource/i;

// Les ressources manquantes sont signalees a part, avec leur adresse :
// un 404 sur un fichier absent du depot serait un vrai probleme, un
// 404 du a la racine de l'apercu ne l'est pas. On les montre pour
// pouvoir trancher, sans faire echouer le test.
const RESSOURCES_APERCU = /belfit-logo-bf\.png|\/img\/plus-|google\.com/i;

const nav = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
let echecs = 0;

for (const e of ecrans) {
  const ctx = await nav.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
    hasTouch: true, isMobile: true, locale: 'fr-FR',
  });
  const p = await ctx.newPage();
  const soucis = [];
  p.on('pageerror', (err) => soucis.push('rendu : ' + err.message.split('\n')[0]));
  p.on('console', (m) => {
    if (m.type() !== 'error') return;
    const txt = m.text();
    if (!ATTENDU.test(txt)) soucis.push('console : ' + txt.slice(0, 160));
  });
  p.on('response', (r) => {
    if (r.status() < 400) return;
    const u = r.url();
    if (RESSOURCES_APERCU.test(u)) return;      // artefact connu de l'apercu
    if (/firestore|googleapis|firebase/i.test(u)) return;
    soucis.push(`ressource ${r.status()} : ${u.slice(0, 120)}`);
  });

  try {
    await p.goto(`${BASE}/${e.url}`, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(3200);
    // Un ecran blanc est un echec, meme sans erreur levee.
    const vide = await p.evaluate(() => document.body.innerText.trim().length < 20);
    if (vide) soucis.push('ecran vide apres chargement');
    await e.parcours(p);
    await p.waitForTimeout(400);
  } catch (err) {
    soucis.push('parcours : ' + err.message.split('\n')[0]);
  }

  if (soucis.length) {
    echecs++;
    console.log(`  ECHEC  ${e.nom}`);
    for (const s of [...new Set(soucis)]) console.log(`         ${s}`);
  } else {
    console.log(`  ok     ${e.nom}`);
  }
  await ctx.close();
}

await nav.close();
console.log(echecs
  ? `\n${echecs} ecran(s) en echec.`
  : `\n${ecrans.length} ecrans parcourus, aucune erreur.`);
process.exit(echecs ? 1 : 0);
