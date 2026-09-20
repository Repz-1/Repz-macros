import { DB, NOMS_ALIMENTS } from '../data/aliments.js';

/**
 * Coach local : marche sans Cloud Function ni compte Firebase.
 * Ce n'est PAS Gemini. C'est assez pour tester le geste
 * « je dis → je vérifie → c'est dans le journal » depuis le téléphone.
 */

const ALIAS = {
  durum: 'Pain blanc',
  dürüm: 'Pain blanc',
  kebab: 'Pain blanc',
  döner: 'Pain blanc',
  doner: 'Pain blanc',
  frites: 'Frites four',
  frite: 'Frites four',
  friet: 'Frites four',
  fries: 'Frites four',
  poulet: 'Poulet cuit',
  chicken: 'Poulet cuit',
  riz: 'Riz cuit',
  rice: 'Riz cuit',
  pates: 'Pâtes blanches cuites',
  pâtes: 'Pâtes blanches cuites',
  pasta: 'Pâtes blanches cuites',
  banane: 'Banane',
  banana: 'Banane',
  oeuf: 'Œuf',
  oeufs: 'Œuf',
  'œuf': 'Œuf',
  'œufs': 'Œuf',
  egg: 'Œuf',
  pain: 'Pain blanc',
  bread: 'Pain blanc',
  avoine: 'Avoine',
  whey: 'Whey Iso',
  biere: 'Bière blonde',
  bière: 'Bière blonde',
  beer: 'Bière blonde',
  eau: 'Eau',
  water: 'Eau',
};

const PORTION = {
  'Pain blanc': 120,
  'Frites four': 200,
  'Poulet cuit': 150,
  'Riz cuit': 200,
  'Pâtes blanches cuites': 200,
  Banane: 120,
  'Œuf': 60,
  Avoine: 40,
  'Whey Iso': 30,
  'Bière blonde': 330,
  Eau: 250,
};

const REPAS = [
  ['petit dejeuner', 'pdej'], ['petit-dejeuner', 'pdej'], ['petit déjeuner', 'pdej'],
  ['breakfast', 'pdej'], ['matin', 'pdej'], ['ontbijt', 'pdej'],
  ['dejeuner', 'dej'], ['déjeuner', 'dej'], ['midi', 'dej'], ['lunch', 'dej'],
  ['diner', 'diner'], ['dîner', 'diner'], ['soir', 'diner'], ['dinner', 'diner'],
  ['collation', 'snack'], ['snack', 'snack'], ['encas', 'snack'],
];

function norm(s) {
  return String(s || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
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

function quantiteDevant(n, alias) {
  const re = new RegExp('(\\d+[\\.,]?\\d*)\\s*(g|gr|grammes?|ml|kilo|kg)?\\s*' + alias);
  const m = n.match(re);
  if (!m) return null;
  let q = parseFloat(m[1].replace(',', '.'));
  if (!isFinite(q) || q <= 0) return null;
  if (m[2] && /kg|kilo/.test(m[2])) q *= 1000;
  return q;
}

function trouverCle(mot) {
  if (ALIAS[mot] && DB[ALIAS[mot]]) return ALIAS[mot];
  const exact = NOMS_ALIMENTS.find((a) => norm(a) === mot);
  if (exact) return exact;
  return NOMS_ALIMENTS.find((a) => {
    const na = norm(a);
    return na === mot || na.startsWith(mot + ' ') || mot.startsWith(na);
  }) || null;
}

export function parserLocal(message) {
  const brut = String(message || '').trim();
  const n = norm(brut);
  if (!n) return { texte: '', aliments: [], local: true };

  const vus = new Set();
  const aliments = [];
  const tokens = n.split(' ').filter((t) => t.length > 2);

  for (const mot of tokens) {
    const cle = trouverCle(mot);
    if (!cle || vus.has(cle)) continue;
    vus.add(cle);
    const q = quantiteDevant(n, mot) || PORTION[cle] || 100;
    aliments.push({
      aliment: cle,
      quantite: Math.round(q),
      unite: 'g',
      repasCle: repasCle(brut),
    });
  }

  if (!aliments.length) {
    return {
      texte: 'Je n\u2019ai pas reconnu d\u2019aliment. Essaie « 200 g de riz » ou « durum frites ».',
      aliments: [],
      local: true,
    };
  }

  const noms = aliments.map((a) => a.aliment.toLowerCase()).join(', ');
  return {
    texte: 'Version locale (sans serveur) : ' + noms + '. Vérifie les quantités puis ajoute.',
    aliments,
    local: true,
  };
}
