#!/usr/bin/env node
// Bascule la periode de test ouverte, DES DEUX COTES a la fois (R73).
//   node tools/periode-test.mjs fermer   -> Premium payant (lancement)
//   node tools/periode-test.mjs ouvrir   -> acces complet pour tous
//   node tools/periode-test.mjs          -> affiche l'etat
// Apres « fermer » : commit + push (interface) ET `firebase deploy
// --only functions` (serveur). Sans le deploy, le micro et la photo
// restent gratuits cote serveur.
import { readFileSync, writeFileSync } from 'fs';
const FICHIERS = ['app-v2/src/acces-libre.js', 'functions/index.js'];
const MOTIF = /(const PREMIUM_OUVERT = )(true|false);/;
const act = process.argv[2];
const cible = act === 'fermer' ? 'false' : act === 'ouvrir' ? 'true' : null;
for (const f of FICHIERS) {
  const s = readFileSync(f, 'utf8');
  const m = MOTIF.exec(s);
  if (!m) { console.error('✗ interrupteur introuvable dans ' + f); process.exit(1); }
  if (cible && m[2] !== cible) writeFileSync(f, s.replace(MOTIF, `$1${cible};`));
  console.log(`${f.padEnd(28)} PREMIUM_OUVERT = ${cible || m[2]}`);
}
if (cible === 'false') console.log('\nA faire : build, commit, push, puis `firebase deploy --only functions`.');
