import { DB, macrosOf } from '../data/aliments.js';
import { ALIAS, normNom, resoudreAliment, noterManque } from '../data/alias-aliments.js';
import { EAT_IDEAS } from '../data/idees.js';
import { limitesPortion } from '../data/portions.js';
import { proposerAdaptation } from '../store/adaptations.js';
import { EXERCISES } from '../data/exercices.js';

const PORTION = {
  'Pain blanc': 120, 'Frites': 200, 'Poulet cuit': 150,
  'Riz cuit': 200, Banane: 120, 'Oeuf entier M (50g)': 50,
  'Whey Iso': 30, "Huile d'olive": 10, 'Pomme de terre cuite': 200,
  'Viande de kebab': 150,
};

const STOP = new Set([
  'que','qui','une','des','les','aux','pour','avec','dans','plus','mais',
  'pas','rien','tout','manger','mange','pris','repas','midi','soir','matin',
  'dis','dit','jai','un','du','de','la','le','cuillere','cuilleres','soupe',
  'cas','cac','grammes','gramme','blanc','verre','verres','bouteille',
  'eau','bu','bois','boire','cl','ml','genou','genoux',
]);

const COMBOS = [
  {
    re: /\b(durum|durums|doner|doner kebab)\b/,
    skip: ['durum', 'durums', 'doner', 'kebab', 'pain'],
    aliments: [
      { aliment: 'Pain blanc', quantite: 120 },
      { aliment: 'Viande de kebab', quantite: 150 },
    ],
    extra: [
      { si: /\b(frite|frites|friet|frieten|fries)\b/, aliment: 'Frites', quantite: 200 },
    ],
  },
];

function repasCle(phrase) {
  const n = normNom(phrase);
  if (n.includes('matin') || n.includes('petit dejeuner')) return 'pdej';
  if (n.includes('midi') || n.includes('dejeuner') || n.includes('lunch')) return 'dej';
  if (n.includes('soir') || n.includes('diner')) return 'diner';
  if (n.includes('snack') || n.includes('collation')) return 'snack';
  const h = new Date().getHours();
  return h < 11 ? 'pdej' : h < 15 ? 'dej' : h < 21 ? 'diner' : 'snack';
}

function extraireQuantite(n, apresMot) {
  const idx = apresMot ? n.indexOf(apresMot) : -1;
  const zone = idx >= 0 ? n.slice(0, idx + apresMot.length + 12) : n;
  const cas = zone.match(/(\d+[\.,]?\d*)\s*(cuillere(?:s)?(?: a soupe)?|cas)\b/);
  if (cas) return parseFloat(cas[1].replace(',', '.')) * 10;
  const cac = zone.match(/(\d+[\.,]?\d*)\s*(cuillere(?:s)? a cafe|cac)\b/);
  if (cac) return parseFloat(cac[1].replace(',', '.')) * 5;
  const g = zone.match(/(\d+[\.,]?\d*)\s*(g|gr|grammes?)\b/);
  if (g) return parseFloat(g[1].replace(',', '.'));
  return null;
}

export function extraireEau(phrase) {
  const n = normNom(phrase);
  const parleEau = /\b(eau|bu|bois|boire|verre|verres|bouteille|hydrate)\b/.test(n);
  if (!parleEau) return null;
  const l = n.match(/(\d+[\.,]?\d*)\s*l\b/);
  if (l) return parseFloat(l[1].replace(',', '.'));
  const cl = n.match(/(\d+[\.,]?\d*)\s*cl\b/);
  if (cl) return parseFloat(cl[1].replace(',', '.')) / 100;
  const ml = n.match(/(\d+[\.,]?\d*)\s*ml\b/);
  if (ml) return parseFloat(ml[1].replace(',', '.')) / 1000;
  if (/\bbouteille/.test(n)) return 0.5;
  if (/\bverre/.test(n)) return 0.25;
  return 0.25;
}
