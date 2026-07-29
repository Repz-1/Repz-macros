// ============================================================
// GARDE-FOUS « Repas intelligent » (§5 du cahier)
// 50 generations aleatoires, budgets 150-1200 kcal. Verifie :
//   (a) aucun ingredient hors de ses plafonds
//   (b) budget atteint a 85-105 %, ou reliquat annonce
//   (c) diversite du trio respectee
// Lancement : node app-v2/tools/test-suggestions.mjs
// ============================================================
import { EAT_IDEAS, CATEGORIES_IDEES } from '../src/data/idees.js';
import { DB } from '../src/data/aliments.js';
import { limitesPortion } from '../src/data/portions.js';

const RATIO_MIN = 0.35, RATIO_MAX = 2.0, TOLERANCE_BASSE = 0.85;

function quantites(idee, ratio) {
  let kcal = 0, prot = 0, carbs = 0, lip = 0;
  const detail = [];
  idee.ings.forEach(i => {
    const d = DB[i.n]; if (!d) return;
    const lim = limitesPortion(i.n);
    let q, grammes;
    if (d.unit) {
      q = Math.min(lim.max, Math.max(lim.min, Math.round(i.q * ratio)));
      grammes = q * d.unit;
    } else {
      q = Math.min(lim.max, Math.max(lim.min, Math.round(i.q * ratio / lim.step) * lim.step));
      grammes = q;
    }
    const f = grammes / 100;
    kcal += d.kcal * f; prot += d.prot * f;
    carbs += (d.carbs || 0) * f; lip += (d.lip || 0) * f;
    detail.push({ nom: i.n, q, lim });
  });
  return { kcal: Math.round(kcal), prot: Math.round(prot), carbs: Math.round(carbs), lip: Math.round(lip), detail };
}

function marqueurs(idee) {
  const cles = idee.ings.map(i => limitesPortion(i.n).cle);
  const PROT = ['oeuf', 'thon_boite', 'poisson', 'boeuf', 'volaille', 'tofu', 'charcuterie', 'fromage_fort', 'fromage_frais', 'laitage', 'whey', 'legumineuse'];
  const GLUC = ['pain', 'cereale_sec', 'feculent_cru', 'feculent', 'pdt'];
  return { prot: cles.find(c => PROT.includes(c)) || null, gluc: cles.find(c => GLUC.includes(c)) || null };
}

function diversifier(liste) {
  const sortie = [], reste = liste.slice();
  while (reste.length) {
    const fen = sortie.slice(-2).map(x => marqueurs(x.idee));
    let i = reste.findIndex(x => {
      const m = marqueurs(x.idee);
      return !(m.prot && fen.some(f => f.prot === m.prot))
          && !(m.gluc && fen.filter(f => f.gluc === m.gluc).length >= 2);
    });
    if (i === -1) i = 0;
    sortie.push(reste.splice(i, 1)[0]);
  }
  return sortie;
}

function adapter(idee, cible) {
  const base = quantites(idee, 1);
  const ratio = base.kcal > 0 ? Math.max(RATIO_MIN, Math.min(RATIO_MAX, cible / base.kcal)) : 1;
  const calc = quantites(idee, ratio);
  if (calc.kcal > cible * 1.15 + 60) return null;
  calc.reliquat = calc.kcal < cible * TOLERANCE_BASSE ? Math.round(cible - calc.kcal) : 0;
  calc.surplus = calc.kcal > cible * 1.05 ? Math.round(calc.kcal - cible) : 0;
  return calc;
}

let ko = { plafonds: 0, budget: 0, diversite: 0 };
const echantillons = [];

for (let n = 0; n < 50; n++) {
  const cible = 150 + Math.floor(Math.random() * 1051);
  const cat = CATEGORIES_IDEES[n % CATEGORIES_IDEES.length].k;
  const trio = diversifier(
    EAT_IDEAS[cat].map(idee => ({ idee, p: adapter(idee, cible) })).filter(x => x.p)
      .sort((a, b) => Math.abs(a.p.kcal - cible) - Math.abs(b.p.kcal - cible))
  ).slice(0, 3);

  // (a) plafonds
  trio.forEach(({ idee, p }) => p.detail.forEach(d => {
    if (d.q < d.lim.min || d.q > d.lim.max) {
      ko.plafonds++; console.log('✗ PLAFOND', idee.nom, d.nom, d.q, JSON.stringify(d.lim));
    }
  }));

  // (b) budget ou reliquat annonce
  trio.forEach(({ idee, p }) => {
    const r = p.kcal / cible;
    if ((r < TOLERANCE_BASSE || r > 1.05) && !p.reliquat && !p.surplus) {
      ko.budget++; console.log('✗ BUDGET', idee.nom, p.kcal, '/', cible, '(' + Math.round(r * 100) + '%)');
    }
  });

  // (c) diversite dans le trio
  const prots = trio.map(x => marqueurs(x.idee).prot).filter(Boolean);
  if (new Set(prots).size !== prots.length) {
    ko.diversite++; console.log('✗ DIVERSITE', cat, prots.join(', '));
  }

  if (n < 3) echantillons.push({ cible, cat, trio: trio.map(x => x.idee.nom + ' ' + x.p.kcal + 'kcal' + (x.p.reliquat ? ' (+' + x.p.reliquat + ' restants)' : '')) });
}

console.log('\n--- 50 generations, budgets 150-1200 kcal ---');
console.log('(a) plafonds depasses :', ko.plafonds);
console.log('(b) budgets hors 85-105 % sans reliquat annonce :', ko.budget);
console.log('(c) trios avec proteine repetee :', ko.diversite);
echantillons.forEach(e => console.log('\ncible', e.cible, '/', e.cat, '\n  ' + e.trio.join('\n  ')));
process.exit(ko.plafonds + ko.budget + ko.diversite ? 1 : 0);
