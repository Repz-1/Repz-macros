import { parserLocal, extraireEau, proposerRepas } from '../src/services/coach-local.js';

const obj = { kcal: 2700, prot: 170, carbs: 300, lip: 80 };
const tot = { kcal: 0, prot: 0, carbs: 0, lip: 0 };
let fails = 0;
function ok(nom, cond, detail) {
  if (cond) console.log('ok  ' + nom);
  else { console.error('KO  ' + nom + (detail ? ' — ' + detail : '')); fails++; }
}

const d = parserLocal('jai mange un durum frites', { objectifs: obj, totaux: tot });
const noms = d.aliments.map((a) => a.aliment).sort().join(' | ');
ok('durum = pain + kebab, pas pain seul',
  noms.includes('Pain blanc') && noms.includes('Viande de kebab') && noms.includes('Frites') && d.aliments.length === 3,
  noms);
ok('durum a des kcal', d.macros && d.macros.kcal > 600, String(d.macros && d.macros.kcal));
ok('texte dit le reste', /resterait/.test(d.texte), d.texte);

const eau = extraireEau("j'ai bu 50 cl");
ok('50 cl = 0,5 L', eau === 0.5, String(eau));
ok('verre = 0,25 L', extraireEau('un verre eau') === 0.25);

const riz = parserLocal('200 g riz', { objectifs: obj, totaux: tot });
ok('riz cuit 200 g', riz.aliments.length === 1 && riz.aliments[0].aliment === 'Riz cuit' && riz.aliments[0].quantite === 200,
  JSON.stringify(riz.aliments));

const prop = proposerRepas(obj, tot, d.aliments);
ok('propose un diner apres durum', !!(prop && prop.nom && prop.ings.length), JSON.stringify(prop && { nom: prop.nom, kcal: prop.kcal }));

const vide = parserLocal('bonjour');
ok('bonjour sans aliment', vide.aliments.length === 0);

if (fails) { console.error(fails + ' echec(s)'); process.exit(1); }
console.log('tous les tests coach-local passent');
