import { parserLocal, extraireEau, proposerRepas, composerSeance, proposerCourses } from '../src/services/coach-local.js';

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

const jet = parserLocal('jette cette séance');
ok('jette cette séance', jet.action === 'abandonnerSeance', jet.action);
ok('jette sans aliment', !jet.aliments.length, JSON.stringify(jet.aliments));
const drop = parserLocal('annule cette session');
ok('annule session', drop.action === 'abandonnerSeance', drop.action);
const start = parserLocal('démarre la séance');
ok('démarre la séance', start.action === 'demarrerSeance', start.action);
const train = parserLocal("je m'entraine");
ok("je m'entraine", train.action === 'demarrerSeance', train.action);

const pec = parserLocal('Je veux faire une séance PEC plus bicep');
ok('pecs + biceps compose', pec.action === 'composerSeance', pec.action);
ok('titre pecs biceps', pec.titre === 'Pecs + Biceps', pec.titre);
ok('au moins 4 exos', pec.refs && pec.refs.length >= 4, JSON.stringify(pec.noms));
ok('noms developpe + curl',
  (pec.noms || []).some((n) => /D[ée]velopp[ée] Couché/.test(n))
  && (pec.noms || []).some((n) => /Curl/.test(n)),
  JSON.stringify(pec.noms));
const pec2 = composerSeance('seance pecs biceps');
ok('seance pecs biceps', pec2 && pec2.action === 'composerSeance', pec2 && pec2.action);

const mix = parserLocal('séance pecs, une pomme', { objectifs: obj, totaux: tot });
ok('mix séance + pomme', mix.action === 'composerSeance' && (mix.aliments || []).some((a) => /pomme/i.test(a.aliment)), JSON.stringify(mix.aliments));

const journal = [
  { ings: [{ name: 'Riz cuit', portion: 200 }, { name: 'Poulet cuit', portion: 150 }] },
  { ings: [{ name: 'Banane', portion: 120 }] },
];
const c7 = parserLocal('fais-moi les courses de la semaine', { repas: journal });
ok('courses semaine', c7.action === 'majCourses', c7.action);
ok('courses 7 jours', c7.jours === 7, String(c7.jours));
ok('courses 3 articles journal', c7.noms && c7.noms.length === 3, JSON.stringify(c7.noms));
ok('courses noms sans cuit', c7.noms && c7.noms.includes('Riz') && c7.noms.includes('Poulet'), JSON.stringify(c7.noms));
const c2 = proposerCourses('courses pour 2 personnes 3 jours', journal);
ok('courses 3j x2', c2 && c2.jours === 3 && c2.pers === 2, JSON.stringify(c2 && { j: c2.jours, p: c2.pers }));
const cvide = parserLocal('liste de courses', { repas: [] });
ok('courses journal vide', cvide.action === 'majCourses' && !(cvide.noms || []).length, JSON.stringify(cvide.noms));
const pasCourse = parserLocal('séance pecs');
ok('seance n est pas courses', pasCourse.action === 'composerSeance', pasCourse.action);

if (fails) { console.error(fails + ' echec(s)'); process.exit(1); }
console.log('tous les tests coach-local passent');
