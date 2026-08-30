// ------------------------------------------------------------
// Cree un code Premium a usage unique.
//
//   node tools/creer-code.mjs                 -> code aleatoire, a vie
//   node tools/creer-code.mjs CADEAU2026      -> code choisi
//   node tools/creer-code.mjs CADEAU2026 3    -> 3 mois au lieu d'a vie
//
// Sort la commande a coller dans la console Firebase (Firestore ->
// codesPremium -> Ajouter un document). Rien ici ne touche au projet :
// le container n'a pas les droits admin.
// ------------------------------------------------------------
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sans I, O, 0, 1

const aleatoire = (n = 10) => Array.from(
  { length: n },
  () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)],
).join('');

const code = (process.argv[2] || aleatoire()).toUpperCase().replace(/[^A-Z0-9]/g, '');
const mois = process.argv[3] ? Number(process.argv[3]) : null;

if (code.length < 4) { console.error('Code trop court.'); process.exit(1); }

const doc = {
  utilise: false,
  uid: null,
  le: null,
  mois,
  cree: new Date().toISOString(),
};

console.log('\nCODE : ' + code + (mois ? '   (' + mois + ' mois)' : '   (sans limite de duree)'));
console.log('\nDans la console Firebase -> Firestore -> collection « codesPremium »');
console.log('Document ID : ' + code);
console.log('Champs :');
for (const [k, v] of Object.entries(doc)) {
  const type = v === null ? 'null' : typeof v === 'number' ? 'number' : typeof v === 'boolean' ? 'boolean' : 'string';
  console.log('  ' + k.padEnd(8) + ' (' + type + ')  ' + (v === null ? '—' : v));
}
console.log('\nOu en une ligne, depuis un shell avec la CLI Firebase :');
console.log("  firebase firestore:documents:set codesPremium/" + code + " '" + JSON.stringify(doc) + "' --project repz-baf60\n");
