import { DB } from '../data/aliments.js';
import { ALIAS, normNom, resoudreAliment } from '../data/alias-aliments.js';

const PORTION = {
  'Pain blanc': 120,
  'Frites four': 200,
  'Poulet cuit': 150,
  'Riz cuit': 200,
  'Pates blanches cuites': 200,
  Banane: 120,
  'Oeuf entier M (50g)': 50,
  Avoine: 40,
  'Whey Iso': 30,
  'Biere blonde': 330,
  "Huile d'olive": 10,
  "Huile d'arachide": 10,
  'Huile de colza': 10,
  'Pomme de terre cuite': 200,
  'Patate douce cuite': 200,
};

const STOP = new Set([
  'que', 'qui', 'une', 'des', 'les', 'aux', 'pour', 'avec', 'dans',
  'plus', 'mais', 'pas', 'rien', 'tout', 'tous', 'cette', 'cet',
  'manger', 'mange', 'pris', 'prise', 'avais',
  'repas', 'midi', 'soir', 'matin', 'aujourd', 'hui', 'hier',
  'dis', 'dit', 'jai', 'un', 'du', 'de', 'la', 'le',
  'cuillere', 'cuilleres', 'soupe', 'cafe', 'cas', 'cac',
  'grammes', 'gramme', 'blanc',
]);

const REPAS = [
  ['petit dejeuner', 'pdej'], ['breakfast', 'pdej'], ['matin', 'pdej'],
  ['dejeuner', 'dej'], ['midi', 'dej'], ['lunch', 'dej'],
  ['diner', 'diner'], ['soir', 'diner'], ['dinner', 'diner'],
  ['collation', 'snack'], ['snack', 'snack'],
];

function repasCle(phrase) {
  const n = normNom(phrase);
  for (const [mot, cle] of REPAS) {
    if (n.includes(normNom(mot))) return cle;
  }
  const h = new Date().getHours();
  if (h < 11) return 'pdej';
  if (h < 15) return 'dej';
  if (h < 21) return 'diner';
  return 'snack';
}

function extraireQuantite(n, apresMot) {
  const idx = apresMot ? n.indexOf(apresMot) : -1;
  const zone = idx >= 0 ? n.slice(0, idx + apresMot.length + 12) : n;
  const cas = zone.match(/(\d+[\.,]?\d*)\s*(cuillere(?:s)?(?: a soupe)?|cas)\b/);
  if (cas) {
    const nb = parseFloat(cas[1].replace(',', '.'));
    if (nb > 0) return nb * 10;
  }
  const cac = zone.match(/(\d+[\.,]?\d*)\s*(cuillere(?:s)? a cafe|cac)\b/);
  if (cac) {
    const nb = parseFloat(cac[1].replace(',', '.'));
    if (nb > 0) return nb * 5;
  }
  const g = zone.match(/(\d+[\.,]?\d*)\s*(g|gr|grammes?|ml)\b/);
  if (g) {
    const nb = parseFloat(g[1].replace(',', '.'));
    if (nb > 0) return nb;
  }
  return null;
}

export function parserLocal(message) {
  const brut = String(message || '').trim();
  const n = normNom(brut);
  if (!n) return { texte: '', aliments: [], local: true };

  const vus = new Set();
  const aliments = [];
  const cleRepas = repasCle(brut);

  const push = (cle, q) => {
    if (!cle || !DB[cle] || vus.has(cle)) return;
    vus.add(cle);
    aliments.push({
      aliment: cle,
      quantite: Math.round(q),
      unite: 'g',
      repasCle: cleRepas,
    });
  };

  // D'abord les alias les plus longs (patate douce avant patate).
  const cles = Object.keys(ALIAS).sort((a, b) => b.length - a.length);
  for (const a of cles) {
    if (STOP.has(a)) continue;
    const mot = '(?:^| )' + a + '(?: |$)';
    if (!new RegExp(mot).test(n)) continue;
    const cle = resoudreAliment(a);
    push(cle, extraireQuantite(n, a) || PORTION[cle] || 100);
  }

  if (!aliments.length) {
    return {
      texte: "Pas trouve dans la base. Essaie « patate », « 2 cas d'huile », « 200 g riz ».",
      aliments: [],
      local: true,
    };
  }

  const detail = aliments.map((a) => a.aliment + ' ' + a.quantite + ' g').join(', ');
  return {
    texte: 'Base BelFit : ' + detail + '. Verifie puis ajoute.',
    aliments,
    local: true,
  };
}
