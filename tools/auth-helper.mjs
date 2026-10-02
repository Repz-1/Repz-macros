// Copie les pages d'aide de connexion Firebase sur belfit.be (01/10).
// Pourquoi : la fenetre Google affichait « repz-baf60.firebaseapp.com ».
// Avec ces fichiers servis par belfit.be, authDomain peut valoir
// 'belfit.be' et Google affiche notre domaine.
// Lance au build (GitHub Actions a acces a Internet, pas le bac a sable).
// GitHub Pages sert « handler.html » a l'adresse /__/auth/handler.
// En cas d'echec : le build s'arrete, la production precedente reste en ligne.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = 'https://repz-baf60.firebaseapp.com';
const FICHIERS = [
  ['/__/auth/handler', '__/auth/handler.html'],
  ['/__/auth/handler.js', '__/auth/handler.js'],
  ['/__/auth/experiments.js', '__/auth/experiments.js', 'facultatif'],
  ['/__/auth/iframe', '__/auth/iframe.html'],
  ['/__/auth/iframe.js', '__/auth/iframe.js'],
  ['/__/firebase/init.json', '__/firebase/init.json', 'facultatif'],
];

// « ::error:: » / « ::warning:: » : message visible dans le resume GitHub.
let echec = false;
for (const [chemin, cible, facultatif] of FICHIERS) {
  let statut = '', texte = '';
  try {
    const r = await fetch(SOURCE + chemin);
    statut = 'HTTP ' + r.status;
    if (r.ok) texte = await r.text();
  } catch (e) { statut = String(e && e.message || e); }
  if (texte.length < 20) {
    console.log(`::${facultatif ? 'warning' : 'error'}::auth-helper ${chemin} : ${statut}, ${texte.length} o`);
    if (!facultatif) echec = true;
    continue;
  }
  const dest = join(RACINE, cible);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, texte);
  console.log(`::notice::auth-helper ${cible} : ${texte.length} o`);
}
if (echec) process.exit(1);
