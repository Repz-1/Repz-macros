#!/usr/bin/env node
/**
 * ============================================================
 * GENERATION DES PHOTOS D'ALIMENTS (option 1 : une image par aliment)
 *
 * Lit la base app-v2/src/data/aliments.js, genere une photo par
 * aliment via l'API Gemini, et l'ecrit dans img/aliments/<slug>.webp
 *
 * A LANCER DEPUIS LE PC (l'API Google n'est pas joignable depuis
 * l'environnement de developpement de Claude) :
 *
 *   set GEMINI_API_KEY=xxxx           (Windows)
 *   node tools/generer-images-aliments.mjs --lot 20      -> test
 *   node tools/generer-images-aliments.mjs               -> tout
 *
 * Options :
 *   --lot N      ne traite que les N premiers aliments manquants
 *   --force      regenere meme si l'image existe deja
 *   --liste a,b  ne traite que ces aliments (noms exacts)
 *
 * Le script est REPRENABLE : il saute ce qui existe deja. Une
 * coupure ne fait rien perdre.
 * ============================================================
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const RACINE = path.join(ICI, '..');
const SORTIE = path.join(RACINE, 'img', 'aliments');

const CLE = process.env.GEMINI_API_KEY;
if (!CLE) {
  console.error('GEMINI_API_KEY absente. Pose-la avant de lancer le script.');
  process.exit(1);
}

// Google retire regulierement ses modeles : liste de repli, comme
// pour transcrireVocal.
const MODELES = [
  'gemini-3-flash-image',
  'gemini-2.5-flash-image',
  'imagen-4.0-generate-001',
];

/** 'Blanc de poulet cru' -> 'blanc-de-poulet-cru' */
export function slug(nom) {
  return nom
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function lireAliments() {
  const src = fs.readFileSync(path.join(RACINE, 'app-v2/src/data/aliments.js'), 'utf8');
  return [...src.matchAll(/^\s*'([^']+)':\s*\{/gm)].map(m => m[1]);
}

/**
 * Le prompt est la piece maitresse : il impose un cadrage et un fond
 * identiques pour toutes les images, sinon la liste part dans tous les
 * sens. Fond creme #FAF7F0 = celui des cartes de l'app.
 */
function prompt(nom) {
  return `Photographie culinaire d'un seul ingredient : ${nom}.
Vue de dessus, l'aliment seul, centre, sur un fond uni creme tres clair (#FAF7F0).
Lumiere douce et naturelle, ombre portee tres legere.
Portion realiste presentee simplement (dans un petit bol blanc si l'aliment est en vrac, a meme le fond sinon).
Aucun texte, aucun couvert, aucune main, aucune decoration, aucun accessoire.
Style epure et appetissant, coherent avec une application de nutrition.
Cadrage carre.`;
}

async function genererUne(nom, modele) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modele}:generateContent?key=${CLE}`;
  const rep = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt(nom) }] }],
      generationConfig: { responseModalities: ['IMAGE'] },
    }),
  });
  if (!rep.ok) {
    const txt = (await rep.text()).slice(0, 200);
    return { erreur: `${rep.status} ${txt}` };
  }
  const data = await rep.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const img = parts.find(p => p.inlineData || p.inline_data);
  if (!img) return { erreur: 'pas d\'image dans la reponse' };
  const inline = img.inlineData || img.inline_data;
  return { base64: inline.data, type: inline.mimeType || inline.mime_type || 'image/png' };
}

async function principal() {
  const args = process.argv.slice(2);
  const lot = args.includes('--lot') ? parseInt(args[args.indexOf('--lot') + 1], 10) : Infinity;
  const force = args.includes('--force');
  const filtre = args.includes('--liste')
    ? args[args.indexOf('--liste') + 1].split(',').map(s => s.trim())
    : null;

  fs.mkdirSync(SORTIE, { recursive: true });
  let aliments = lireAliments();
  if (filtre) aliments = aliments.filter(a => filtre.includes(a));

  const aFaire = aliments.filter(a => {
    const f = path.join(SORTIE, slug(a) + '.png');
    return force || !fs.existsSync(f);
  }).slice(0, lot);

  console.log(`${aliments.length} aliments, ${aFaire.length} a generer.`);
  if (!aFaire.length) return;

  let modele = null;
  let ok = 0, ko = 0;

  for (const [i, nom] of aFaire.entries()) {
    let res = null;
    // Premier appel : on cherche un modele qui repond.
    for (const m of (modele ? [modele] : MODELES)) {
      res = await genererUne(nom, m);
      if (!res.erreur) { modele = m; break; }
      console.warn(`  ${m} -> ${res.erreur}`);
      if (!String(res.erreur).startsWith('404')) break;
    }
    if (res?.erreur) {
      ko++;
      console.error(`✗ ${nom} : ${res.erreur}`);
    } else {
      fs.writeFileSync(path.join(SORTIE, slug(nom) + '.png'), Buffer.from(res.base64, 'base64'));
      ok++;
      console.log(`✓ [${i + 1}/${aFaire.length}] ${nom}`);
    }
    // Respiration : evite de saturer le quota par minute.
    await new Promise(r => setTimeout(r, 1200));
  }

  console.log(`\nTermine : ${ok} generees, ${ko} echecs. Dossier : img/aliments/`);
  console.log('Pense a convertir en WebP 96x96 avant de commiter (voir tools/convertir-images-aliments.mjs).');
}

principal().catch(e => { console.error(e); process.exit(1); });
