import { DB, NOMS_ALIMENTS } from '../data/aliments.js';

/**
 * Coach local. Compare chaque mot a la base d'aliments,
 * convertit les unites courantes, refuse les faux amis
 * (« cuillere a soupe » n'est pas une soupe).
 */

const ALIAS = {
  durum: 'Pain blanc',
  kebab: 'Pain blanc',
  doner: 'Pain blanc',
  frites: 'Frites four',
  frite: 'Frites four',
  friet: 'Frites four',
  fries: 'Frites four',
  poulet: 'Poulet cuit',
  chicken: 'Poulet cuit',
  riz: 'Riz cuit',
  rice: 'Riz cuit',
  pates: 'Pates blanches cuites',
  pasta: 'Pates blanches cuites',
  banane: 'Banane',
  banana: 'Banane',
  oeuf: 'Oeuf entier M (50g)',
  oeufs: 'Oeuf entier M (50g)',
  egg: 'Oeuf entier M (50g)',
  pain: 'Pain blanc',
  bread: 'Pain blanc',
  avoine: 'Avoine',
  whey: 'Whey Iso',
  biere: 'Biere blonde',
  beer: 'Biere blonde',
};

const HUILES = [
  ['arachide', "Huile d'arachide"],
  ['olive', "Huile d'olive"],
  ['colza', 'Huile de colza'],
  ['tournesol', 'Huile de tournesol'],
  ['coco', 'Huile de coco'],
  ['sesame', 'Huile de sesame'],
  ['noix', 'Huile de noix'],
  ['noisette', 'Huile de noisette'],
];

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
};

const STOP = new Set([
  'que', 'qui', 'une', 'des', 'les', 'aux', 'pour', 'avec', 'dans',
  'plus', 'mais', 'pas', 'rien', 'tout', 'tous', 'cette', 'cet',
  'manger', 'mange', 'pris', 'prise', 'avais',
  'repas', 'midi', 'soir', 'matin', 'aujourd', 'hui', 'hier',
  'dis', 'dit', 'jai', 'un', 'du', 'de', 'la', 'le',
  'cuillere', 'cuilleres', 'soupe', 'cafe', 'cas', 'cac',
  'grammes', 'gramme',
]);

const REPAS = [
  ['petit dejeuner', 'pdej'], ['breakfast', 'pdej'], ['matin', 'pdej'],
  ['dejeuner', 'dej'], ['midi', 'dej'], ['lunch', 'dej'],
  ['diner', 'diner'], ['soir', 'diner'], ['dinner', 'diner'],
  ['collation', 'snack'], ['snack', 'snack'],
];

function norm(s) {
  return String(s || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function dbKey(nom) {
  if (DB[nom]) return nom;
  const n = norm(nom);
  return Object.keys(DB).find((k) => norm(k) === n) || null;
}

function repasCle(phrase) {
  const n = norm(phrase);
  for (const [mot, cle] of REPAS) {
    if (n.includes(norm(mot))) return cle;
  }
  const h = new Date().getHours();
  if (h < 11) return 'pdej';
  if (h < 15) return 'dej';
  if (h < 21) return 'diner';
  return 'snack';
}

/** 1 c. a soupe = 10 g, 1 c. a cafe = 5 g. Sinon grammes explicites. */
function extraireQuantite(n, apresMot) {
  const zone = apresMot
    ? n.slice(0, n.indexOf(apresMot) + apresMot.length + 8)
    : n;

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
  const kg = zone.match(/(\d+[\.,]?\d*)\s*kg\b/);
  if (kg) {
    const nb = parseFloat(kg[1].replace(',', '.'));
    if (nb > 0) return nb * 1000;
  }
  return null;
}

function huileDans(n) {
  if (!/\bhuile\b/.test(n)) return null;
  for (const [mot, nom] of HUILES) {
    if (n.includes(mot)) return dbKey(nom);
  }
  return dbKey("Huile d'olive");
}

export function parserLocal(message) {
  const brut = String(message || '').trim();
  const n = norm(brut);
  if (!n) return { texte: '', aliments: [], local: true };

  const vus = new Set();
  const aliments = [];
  const cleRepas = repasCle(brut);

  const push = (cle, q) => {
    const k = dbKey(cle);
    if (!k || vus.has(k)) return;
    vus.add(k);
    aliments.push({
      aliment: k,
      quantite: Math.round(q),
      unite: 'g',
      repasCle: cleRepas,
    });
  };

  // Huile + cuillere : avant le reste, pour ne pas creer une soupe.
  const huile = huileDans(n);
  if (huile) {
    push(huile, extraireQuantite(n, 'huile') || PORTION[huile] || 10);
  }

  const tokens = n.split(' ').filter((t) => t.length > 2 && !STOP.has(t));
  for (const mot of tokens) {
    if (mot === 'huile' || HUILES.some(([m]) => m === mot)) continue;
    const alias = ALIAS[mot];
    if (!alias) continue;
    push(alias, extraireQuantite(n, mot) || PORTION[alias] || 100);
  }

  if (!aliments.length) {
    return {
      texte: "Je n'ai reconnu aucun aliment de la base. Exemple : « 2 cuilleres a soupe d'huile d'olive », « 200 g riz ».",
      aliments: [],
      local: true,
    };
  }

  const detail = aliments.map((a) => a.aliment + ' ' + a.quantite + ' g').join(', ');
  return {
    texte: 'Compare a la base BelFit : ' + detail + '. Verifie puis ajoute.',
    aliments,
    local: true,
  };
}
