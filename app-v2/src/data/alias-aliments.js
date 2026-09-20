import { DB, NOMS_ALIMENTS } from './aliments.js';

/**
 * Variantes de langage → nom canonique de la base.
 * On n'ajoute pas de calories ici : on pointe vers une ligne existante.
 */

export function normNom(s) {
  return String(s || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function cleDb(nom) {
  if (!nom) return null;
  if (DB[nom]) return nom;
  const n = normNom(nom);
  return Object.keys(DB).find((k) => normNom(k) === n) || null;
}

const ALIAS_BRUT = {
  // Feculents
  patate: 'Pomme de terre cuite',
  patates: 'Pomme de terre cuite',
  pdt: 'Pomme de terre cuite',
  'pomme de terre': 'Pomme de terre cuite',
  'pommes de terre': 'Pomme de terre cuite',
  potato: 'Pomme de terre cuite',
  potatoes: 'Pomme de terre cuite',
  'patate douce': 'Patate douce cuite',
  'patates douces': 'Patate douce cuite',
  riz: 'Riz cuit',
  rice: 'Riz cuit',
  'riz blanc': 'Riz cuit',
  pates: 'Pates blanches cuites',
  pate: 'Pates blanches cuites',
  pasta: 'Pates blanches cuites',
  spaghetti: 'Pates blanches cuites',
  spaghettis: 'Pates blanches cuites',
  nouilles: 'Pates blanches cuites',
  quinoa: 'Quinoa cuit',
  semoule: 'Semoule',
  couscous: 'Couscous cuit',
  pain: 'Pain blanc',
  baguette: 'Baguette',
  'pistolet': 'Pistolet (petit pain)',
  pita: 'Pain pita',
  wrap: 'Wrap/Tortilla',
  tortilla: 'Wrap/Tortilla',
  durum: 'Pain blanc',
  durum: 'Pain blanc',
  kebab: 'Pain blanc',
  doner: 'Pain blanc',
  frites: 'Frites four',
  frite: 'Frites four',
  friet: 'Frites four',
  frieten: 'Frites four',
  fries: 'Frites four',
  avoine: 'Avoine',
  flocons: 'Flocons avoine',
  porridge: 'Flocons avoine',

  // Proteines
  poulet: 'Poulet cuit',
  chicken: 'Poulet cuit',
  blanc: 'Poulet cuit',
  'blanc de poulet': 'Poulet cuit',
  dinde: 'Dinde escalope cuite',
  turkey: 'Dinde escalope cuite',
  boeuf: 'Steak cuit',
  steak: 'Steak cuit',
  hache: 'Hache de boeuf 15% cuit',
  'steak hache': 'Hache de boeuf 15% cuit',
  saumon: 'Saumon cuit',
  salmon: 'Saumon cuit',
  thon: 'Thon naturel boite',
  tuna: 'Thon naturel boite',
  cabillaud: 'Cabillaud cuit',
  oeuf: 'Oeuf entier M (50g)',
  oeufs: 'Oeuf entier M (50g)',
  egg: 'Oeuf entier M (50g)',
  eggs: 'Oeuf entier M (50g)',
  jambon: 'Jambon blanc',
  crevettes: 'Crevettes',
  shrimp: 'Crevettes',

  // Laitiers
  whey: 'Whey Iso',
  proteine: 'Whey Iso',
  skyr: 'Skyr',
  yaourt: 'Yaourt nature',
  yogurt: 'Yaourt nature',
  yogourt: 'Yaourt nature',
  'yaourt grec': 'Yaourt grec',
  'fromage blanc': 'Fromage blanc 0%',
  lait: 'Lait 1/2 ecreme',
  mozzarella: 'Mozzarella',
  parmesan: 'Parmesan',
  comte: 'Comte',
  beurre: 'Beurre',

  // Huiles
  huile: "Huile d'olive",
  'huile olive': "Huile d'olive",
  'huile d olive': "Huile d'olive",
  'huile d olive': "Huile d'olive",
  'huile arachide': "Huile d'arachide",
  'huile d arachide': "Huile d'arachide",
  'huile colza': 'Huile de colza',

  // Legumineuses / legumes / fruits
  lentilles: 'Lentilles cuites',
  lentille: 'Lentilles cuites',
  'pois chiches': 'Pois chiches cuits',
  'pois chiche': 'Pois chiches cuits',
  brocoli: 'Brocoli',
  epinards: 'Epinards',
  courgette: 'Courgette',
  tomate: 'Tomate',
  tomates: 'Tomate',
  carotte: 'Carotte',
  carottes: 'Carotte',
  salade: 'Salade verte',
  avocat: 'Avocat',
  banane: 'Banane',
  banana: 'Banane',
  pomme: 'Pomme',
  apple: 'Pomme',
  orange: 'Orange',
  fraise: 'Fraises',
  fraises: 'Fraises',

  // Boissons / extra
  coca: 'Coca-cola',
  coke: 'Coca-cola',
  'coca zero': 'Coca zero',
  biere: 'Biere blonde',
  beer: 'Biere blonde',
  cafe: 'Cafe noir',
  coffee: 'Cafe noir',
  miel: 'Miel',
  chocolat: 'Chocolat noir 70%',
};

export const ALIAS = {};
for (const [k, v] of Object.entries(ALIAS_BRUT)) {
  ALIAS[normNom(k)] = v;
}

/**
 * Transforme ce que l'utilisateur a dit en cle de DB, ou null.
 */
export function resoudreAliment(dit) {
  const n = normNom(dit);
  if (!n) return null;
  if (ALIAS[n]) return cleDb(ALIAS[n]) || ALIAS[n];

  // Plus long alias contenu dans la phrase.
  const aliasTries = Object.keys(ALIAS).sort((a, b) => b.length - a.length);
  for (const a of aliasTries) {
    if (n === a || n.includes(' ' + a + ' ') || n.startsWith(a + ' ') || n.endsWith(' ' + a)) {
      return cleDb(ALIAS[a]) || ALIAS[a];
    }
  }

  const exact = NOMS_ALIMENTS.find((nom) => normNom(nom) === n);
  if (exact) return exact;
  if (DB[dit]) return dit;

  return NOMS_ALIMENTS.find((nom) => {
    const nn = normNom(nom);
    return nn.includes(n) || n.includes(nn);
  }) || null;
}
