// ------------------------------------------------------------
// Une seule commande pour monter de version.
//   node tools/sync-version.mjs        -> +1
//   node tools/sync-version.mjs 400    -> impose 400
//
// Trois fichiers doivent bouger ensemble, sinon le navigateur sert un
// melange d'ancien et de neuf. Les tenir a la main a deja produit un
// ecart (R6). C'est du travail de machine.
// ------------------------------------------------------------
import { readFileSync, writeFileSync } from 'fs';

const DECALAGE_SW_V2 = 232;   // valeur historique, verrouillee par R6

const F_VER = 'app-v2/src/version.js';
const F_SW  = 'sw.js';
const F_SW2 = 'app-v2/public/sw.js';

const lire = (p) => readFileSync(p, 'utf8');

const actuel = Number((lire(F_VER).match(/VERSION_APP\s*=\s*(\d+)/) || [])[1]);
if (!actuel) { console.error('VERSION_APP introuvable dans ' + F_VER); process.exit(1); }

const cible = process.argv[2] ? Number(process.argv[2]) : actuel + 1;
if (!Number.isInteger(cible) || cible <= 0) { console.error('Version invalide.'); process.exit(1); }
if (cible < actuel) console.warn('Attention : on redescend de ' + actuel + ' a ' + cible + '.');

const remplacer = (fichier, motif, valeur) => {
  const avant = lire(fichier);
  // On teste la PRESENCE du motif, pas la difference : rejouer la meme
  // version ne doit pas passer pour un fichier introuvable.
  if (!motif.test(avant)) { console.error('Motif introuvable dans ' + fichier); process.exit(1); }
  writeFileSync(fichier, avant.replace(motif, valeur));
};

remplacer(F_VER, /VERSION_APP\s*=\s*\d+/, 'VERSION_APP = ' + cible);
remplacer(F_SW,  /belfit-v\d+/,           'belfit-v' + cible);
remplacer(F_SW2, /belfit-v2-\d+/,         'belfit-v2-' + (cible - DECALAGE_SW_V2));

console.log('v' + actuel + ' -> v' + cible);
console.log('  ' + F_VER + '  VERSION_APP = ' + cible);
console.log('  ' + F_SW  + '          belfit-v' + cible);
console.log('  ' + F_SW2 + '  belfit-v2-' + (cible - DECALAGE_SW_V2));
