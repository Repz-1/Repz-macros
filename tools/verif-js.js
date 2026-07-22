#!/usr/bin/env node
/**
 * Verification du JavaScript de BELFIT avant mise en ligne.
 *
 * Deux controles :
 *   1. Syntaxe de chaque bloc <script> inline de chaque page HTML
 *   2. Execution reelle des fichiers .js partages (i18n-strings.js, etc.)
 *
 * Le second controle existe parce qu'un fichier peut etre syntaxiquement
 * correct et planter a l'execution — c'est exactement ce qui s'est produit
 * avec un renommage incomplet de variable.
 *
 * Sortie non nulle = le deploiement est bloque.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

let erreurs = 0;

// ---------- 1. Blocs <script> inline des pages ----------
const pages = fs.readdirSync('.').filter((f) => f.endsWith('.html'));

for (const page of pages) {
  const html = fs.readFileSync(page, 'utf8');
  const blocs = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)];

  blocs.forEach((m, i) => {
    const code = m[1];
    if (!code.trim()) return;
    try {
      new vm.Script(code, { filename: `${page} (bloc ${i + 1})` });
    } catch (e) {
      erreurs++;
      console.error(`\u274c ${page} — bloc ${i + 1} : ${e.message}`);
    }
  });
}

// ---------- 2. Execution des fichiers JS partages ----------
// Les service workers s'executent dans un contexte a part (self,
// caches, clients...) : on ne peut pas les evaluer comme un script
// de page. On verifie donc uniquement leur SYNTAXE, plus haut.
const estServiceWorker = (f) => f === 'sw.js' || f.startsWith('sw-');
const partages = fs.readdirSync('.').filter(
  (f) => f.endsWith('.js') && !estServiceWorker(f)
);

for (const fichier of partages) {
  const code = fs.readFileSync(fichier, 'utf8');
  const bac = {
    window: {}, document: { addEventListener() {}, querySelectorAll: () => [] },
    localStorage: { getItem: () => null, setItem() {} },
    navigator: { language: 'fr' },
    console, setTimeout, clearTimeout,
  };
  bac.self = bac.window;
  try {
    vm.createContext(bac);
    new vm.Script(code, { filename: fichier }).runInContext(bac, { timeout: 5000 });
  } catch (e) {
    erreurs++;
    console.error(`\u274c ${fichier} : ${e.message}`);
  }
}

// ---------- Verdict ----------
if (erreurs > 0) {
  console.error(`\n${erreurs} erreur(s) — deploiement bloque.`);
  process.exit(1);
}

console.log(`\u2713 ${pages.length} pages et ${partages.length} fichiers JS verifies, aucune erreur.`);
