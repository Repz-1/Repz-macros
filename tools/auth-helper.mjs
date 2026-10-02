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
  ['/__/auth/experiments.js', '__/auth/experiments.js'],
  ['/__/auth/iframe', '__/auth/iframe.html'],
  ['/__/auth/iframe.js', '__/auth/iframe.js'],
  ['/__/firebase/init.json', '__/firebase/init.json'],
];

for (const [chemin, cible] of FICHIERS) {
  const r = await fetch(SOURCE + chemin);
  if (!r.ok) throw new Error(`auth-helper : ${chemin} -> HTTP ${r.status}`);
  const texte = await r.text();
  if (texte.length < 20) throw new Error(`auth-helper : ${chemin} vide`);
  const dest = join(RACINE, cible);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, texte);
  console.log(`auth-helper : ${cible} (${texte.length} o)`);
}
