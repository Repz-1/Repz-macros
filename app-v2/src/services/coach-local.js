import { DB, NOMS_ALIMENTS } from '../data/aliments.js';

/**
 * Coach local : sans serveur. On cherche des NOMS dans la phrase,
 * pas des bouts de mots au hasard.
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
};

const STOP = new Set([
  'que', 'qui', 'une', 'des', 'les', 'une', 'aux', 'pour', 'avec', 'dans',
  'plus', 'mais', 'pas', 'rien', 'tout', 'tous', 'cette', 'cet',
  'manger', 'mange', 'mange', 'pris', 'prise', 'eu', 'avais', 'ete',
  'repas', 'midi', 'soir', 'matin', 'aujourd', 'hui', 'hier',
  'dis', 'dit', 'jai', 'jai', 'un', 'une', 'du', 'de', 'la', 'le',
  'soupe', 'huile', 'blanc', 'legumes', 'legume',
]);

const REPAS = [
  ['petit dejeuner', 'pdej'], ['petit-dejeuner', 'pdej'], ['breakfast', 'pdej'],
  ['matin', 'pdej'], ['dejeuner', 'dej'], ['midi', 'dej'], ['lunch', 'dej'],
  ['diner', 'diner'], ['soir', 'diner'], ['dinner', 'diner'],
  ['collation', 'snack'], ['snack', 'snack'],
];

function norm(s) {
  return String(s || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function motEntier(phrase, mot) {
  return new RegExp('(?:^| )' + mot + '(?: |$)').test(phrase);
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

function quantiteDevant(phrase, mot) {
  const re = new RegExp('(\\d+[\\.,]?\\d*)\\s*(g|gr|grammes?|ml|kg)?\\s*(de )?' + mot);
  const m = phrase.match(re);
  if (!m) return null;
  let q = parseFloat(m[1].replace(',', '.'));
  if (!isFinite(q) || q <= 0) return null;
  if (m[2] && m[2] === 'kg') q *= 1000;
  return q;
}

function resoudreAlias(mot) {
  const cle = ALIAS[mot];
  if (cle && DB[cle]) return cle;
  const sansAccent = Object.keys(DB).find((k) => norm(k) === norm(cle || ''));
  return sansAccent || null;
}

export function parserLocal(message) {
  const brut = String(message || '').trim();
  const n = norm(brut);
  if (!n) return { texte: '', aliments: [], local: true };

  const vus = new Set();
  const aliments = [];
  const cleRepas = repasCle(brut);

  const ajouter = (cle, mot) => {
    if (!cle || vus.has(cle) || !DB[cle]) return;
    vus.add(cle);
    const q = quantiteDevant(n, mot) || PORTION[cle] || 100;
    aliments.push({
      aliment: cle,
      quantite: Math.round(q),
      unite: 'g',
      repasCle: cleRepas,
    });
  };

  // 1. Alias connus, mot entier uniquement.
  const tokens = n.split(' ').filter((t) => t.length > 2 && !STOP.has(t));
  for (const mot of tokens) {
    if (!motEntier(n, mot)) continue;
    ajouter(resoudreAlias(mot), mot);
  }

  // 2. Noms complets de la base, du plus long au plus court (min 5 lettres).
  if (!aliments.length) {
    const noms = NOMS_ALIMENTS
      .filter((a) => norm(a).length >= 5)
      .sort((a, b) => norm(b).length - norm(a).length);
    for (const nom of noms) {
      const nn = norm(nom);
      if (n.includes(nn)) ajouter(nom, nn.split(' ')[0]);
      if (aliments.length >= 4) break;
    }
  }

  if (!aliments.length) {
    return {
      texte: "Je n'ai reconnu aucun aliment. Ecris les noms simples : « riz poulet », « durum frites », « 200 g riz ».",
      aliments: [],
      local: true,
    };
  }

  const noms = aliments.map((a) => a.aliment).join(', ');
  return {
    texte: 'Version locale : ' + noms + '. Verifie les quantites puis ajoute.',
    aliments,
    local: true,
  };
}
