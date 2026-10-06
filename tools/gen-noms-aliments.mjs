// Liste des noms d'aliments de la base, pour le coach IA du serveur
// (functions/aliments-noms.json). A relancer quand data/aliments.js change.
import { writeFileSync } from 'node:fs';
const { DB } = await import('../app-v2/src/data/aliments.js');
const noms = Object.keys(DB).map((n) => (DB[n].unit ? n + ' [piece ' + DB[n].unit + ' g]' : n));
writeFileSync(new URL('../functions/aliments-noms.json', import.meta.url), JSON.stringify(noms));
console.log(noms.length + ' aliments ecrits dans functions/aliments-noms.json');
