// Test du vocabulaire du coach (23/09). Lancer depuis app-v2 : node ../tools/test-coach-vocab.mjs
import { parserLocal } from './src/services/coach-local.js';
import { DB } from './src/data/aliments.js';
import { ALIAS } from './src/data/alias-aliments.js';
let ko = 0;
const cas = [
  ['un fromage', ['Gouda']], ['du thon', ['Thon naturel boite']], ['un the', ['Thé noir']],
  ['un coca', ['Coca-Cola canette 33cl']], ['un jus d orange', ['Jus orange frais']],
  ['50 g de flocons d avoine', ['Flocons d\'avoine']], ['du pain complet', ['Pain complet']],
  ['un verre de lait', ['Lait 1/2 écrémé'], 250, 0], ['2 tasses de cafe', ['Café noir'], 300],
  ['une canette de fanta', ['Fanta Orange canette 33cl'], 330], ['un red bull', ['Red Bull canette 25cl']],
  ['une pizza et une biere', ['Pizza margherita', 'Bière blonde']], ['un steak hache', ['Boeuf hache 15% cuit']],
  ['un cappuccino', ['Café cappuccino']], ['un lait d amande', ['Lait d\'amande']],
  ['j ai bu 1 litre d eau', [], null, 1], ['1,5 l d eau', [], null, 1.5], ['une bouteille de spa', [], null, 0.5],
];
for (const [phrase, attendu, qte, eau] of cas) {
  const r = parserLocal(phrase, {});
  const noms = (r.aliments || []).map(a => a.aliment);
  const okNoms = noms.length === attendu.length && attendu.every(a => noms.includes(a));
  const okQ = qte == null || (r.aliments[0] && r.aliments[0].quantite === qte);
  const okE = eau == null || (r.eauLitres || 0) === eau;
  const ok = okNoms && okQ && okE;
  if (!ok) ko++;
  console.log(ok ? 'OK ' : 'KO ', phrase.padEnd(28), '->', (r.aliments || []).map(a => a.aliment + ' ' + a.quantite).join(' + '), r.eauLitres ? 'eau ' + r.eauLitres : '');
}
// Chaque alias pointe un aliment de la base
const norm = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const cles = new Set(Object.keys(DB).map(norm));
const orphelins = [...new Set(Object.values(ALIAS))].filter(v => !cles.has(norm(v)));
if (orphelins.length) { ko++; console.log('KO alias orphelins :', orphelins.join(', ')); }
console.log(ko ? `\n${ko} echec(s)` : '\nTout est OK');
process.exit(ko ? 1 : 0);
