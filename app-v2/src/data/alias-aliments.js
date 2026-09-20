import { DB, NOMS_ALIMENTS } from './aliments.js';

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
  patate: 'Pomme de terre cuite', patates: 'Pomme de terre cuite', pdt: 'Pomme de terre cuite',
  'pomme de terre': 'Pomme de terre cuite', 'pommes de terre': 'Pomme de terre cuite',
  potato: 'Pomme de terre cuite', potatoes: 'Pomme de terre cuite',
  aardappel: 'Pomme de terre cuite', aardappelen: 'Pomme de terre cuite',
  stoemp: 'Stoemp', puree: 'Puree de pommes de terre', mousline: 'Puree de pommes de terre',
  'patate douce': 'Patate douce cuite', 'patates douces': 'Patate douce cuite', 'sweet potato': 'Patate douce cuite',
  riz: 'Riz cuit', rice: 'Riz cuit', rijst: 'Riz cuit', 'riz blanc': 'Riz cuit',
  'riz basmati': 'Riz basmati cru', 'riz complet': 'Riz complet cuit',
  pates: 'Pates blanches cuites', pate: 'Pates blanches cuites', pasta: 'Pates blanches cuites',
  spaghetti: 'Pates blanches cuites', spaghettis: 'Pates blanches cuites', nouilles: 'Pates blanches cuites',
  tagliatelles: 'Pates blanches cuites', penne: 'Pates blanches cuites', macaroni: 'Pates blanches cuites',
  coquillettes: 'Pates blanches cuites', fusilli: 'Pates blanches cuites', 'pates completes': 'Pates completes cuites',
  quinoa: 'Quinoa cuit', semoule: 'Semoule', couscous: 'Couscous cuit',
  boulgour: 'Boulgour cuit', bulgur: 'Boulgour cuit', polenta: 'Polenta cuite',
  gnocchi: 'Gnocchi', gnocchis: 'Gnocchi', ebly: 'Ble tendre cuit (Ebly)',
  pain: 'Pain blanc', brood: 'Pain blanc', bread: 'Pain blanc', baguette: 'Baguette',
  pistolet: 'Pistolet (petit pain)', 'petit pain': 'Pistolet (petit pain)', pita: 'Pain pita',
  wrap: 'Wrap/Tortilla', tortilla: 'Wrap/Tortilla', durum: 'Pain blanc',
  kebab: 'Viande de kebab', 'viande kebab': 'Viande de kebab', doner: 'Viande de kebab',
  frites: 'Frites', frite: 'Frites', friet: 'Frites', frieten: 'Frites', fries: 'Frites',
  'frites four': 'Frites four', 'frites friterie': 'Frites de friterie', chips: 'Chips',
  wedges: 'Wedges (quartiers epices)', avoine: 'Avoine', oatmeal: 'Avoine',
  flocons: 'Flocons avoine', porridge: 'Flocons avoine', muesli: 'Muesli', granola: 'Muesli',
  cornflakes: 'Cornflakes', 'galette riz': 'Galette de riz',
  poulet: 'Poulet cuit', chicken: 'Poulet cuit', kip: 'Poulet cuit',
  'blanc de poulet': 'Blanc de poulet (cuit)', aiguillettes: 'Aiguillette de poulet (cuite)',
  'cuisse poulet': 'Cuisse de poulet cuite', tenders: 'Tenders poulet', wings: 'Chicken wings',
  dinde: 'Blanc de dinde (cuit)', turkey: 'Blanc de dinde (cuit)', 'blanc de dinde': 'Blanc de dinde (cuit)',
  boeuf: 'Steak cuit', beef: 'Steak cuit', rund: 'Steak cuit', steak: 'Steak cuit', bavette: 'Bavette cuite',
  hache: 'Boeuf hache 15% cuit', 'steak hache': 'Steak hache 15 pourcent', 'viande hachee': 'Boeuf hache 15% cuit',
  'boeuf bourguignon': 'Boeuf bourguignon', carbonnade: 'Carbonnade flamande', stoofvlees: 'Carbonnade flamande',
  agneau: 'Agneau cuit', lamb: 'Agneau cuit', veau: 'Veau escalope cuite', 'escalope veau': 'Veau escalope cuite',
  porc: 'Filet de porc', pork: 'Filet de porc', 'filet porc': 'Filet de porc', travers: 'Travers de porc',
  canard: 'Canard magret cuit', magret: 'Canard magret cuit', duck: 'Canard magret cuit',
  jambon: 'Jambon blanc', ham: 'Jambon blanc', bacon: 'Bacon', lardons: 'Lardons',
  chorizo: 'Chorizo', merguez: 'Merguez', chipolata: 'Chipolata',
  saucisse: 'Saucisse de Toulouse', knack: 'Saucisse de Strasbourg (knack)', saucisson: 'Saucisson',
  boudin: 'Boudin noir', 'boudin noir': 'Boudin noir', 'boudin blanc': 'Boudin blanc',
  'boudin liege': 'Boudin de Liege', boulets: 'Boulets liegeois', 'boulets liegeois': 'Boulets liegeois',
  boulettes: 'Boulettes viande', andouillette: 'Andouillette', andouille: 'Andouille',
  saumon: 'Saumon cuit', salmon: 'Saumon cuit', 'saumon fume': 'Saumon fume',
  thon: 'Thon naturel boite', tuna: 'Thon naturel boite', 'thon boite': 'Thon naturel boite',
  cabillaud: 'Cabillaud cuit', cod: 'Cabillaud cuit', morue: 'Cabillaud cuit',
  crevettes: 'Crevettes', shrimp: 'Crevettes', scampi: 'Crevettes', moules: 'Moules', mussels: 'Moules',
  sardines: 'Sardines', maquereau: 'Maquereau', truite: 'Truite', sole: 'Sole cuite',
  bar: 'Bar/Loup cuit', loup: 'Bar/Loup cuit', dorade: 'Dorade cuite',
  calamar: 'Calamar', encornet: 'Calamar', surimi: 'Surimi', crabe: 'Crabe',
  'saint jacques': 'Saint-Jacques', anchois: 'Anchois', hareng: 'Hareng',
  oeuf: 'Oeuf entier M (50g)', oeufs: 'Oeuf entier M (50g)', egg: 'Oeuf entier M (50g)',
  eggs: 'Oeuf entier M (50g)', ei: 'Oeuf entier M (50g)', eieren: 'Oeuf entier M (50g)',
  omelette: 'Oeuf entier M (50g)',
  whey: 'Whey Iso', proteine: 'Whey Iso', caseine: 'Caseine', skyr: 'Skyr',
  yaourt: 'Yaourt nature', yogurt: 'Yaourt nature', yogourt: 'Yaourt nature', yoghurt: 'Yaourt nature',
  'yaourt grec': 'Yaourt grec', 'yaourt 0': 'Yaourt 0%', 'fromage blanc': 'Fromage blanc 0%',
  'petit suisse': 'Petit suisse 0%', lait: 'Lait 1/2 ecreme', milk: 'Lait 1/2 ecreme', melk: 'Lait 1/2 ecreme',
  'lait ecreme': 'Lait ecreme', 'lait entier': 'Lait entier', 'lait amande': 'Lait amande',
  mozzarella: 'Mozzarella', burrata: 'Burrata', parmesan: 'Parmesan', comte: 'Comte',
  emmental: 'Emmental', gruyere: 'Gruyere', cheddar: 'Cheddar', gouda: 'Gouda',
  feta: 'Feta', ricotta: 'Ricotta', halloumi: 'Halloumi', brie: 'Brie', camembert: 'Camembert',
  roquefort: 'Roquefort', chevre: 'Chevre frais', 'vache qui rit': 'Vache qui rit',
  babybel: 'Babybel', boursin: 'Boursin ail et fines herbes', mascarpone: 'Mascarpone',
  beurre: 'Beurre', butter: 'Beurre', 'beurre de cacahuete': 'Beurre de cacahuete',
  'beurre cacahuete': 'Beurre de cacahuete', 'peanut butter': 'Beurre de cacahuete',
  cottage: 'Cottage cheese', 'cottage cheese': 'Cottage cheese',
  huile: "Huile d'olive", 'huile olive': "Huile d'olive", 'huile d olive': "Huile d'olive",
  'huile arachide': "Huile d'arachide", 'huile d arachide': "Huile d'arachide",
  'huile colza': 'Huile de colza', 'huile coco': 'Huile de coco', 'huile tournesol': 'Huile de tournesol',
  mayo: 'Mayonnaise', mayonnaise: 'Mayonnaise', ketchup: 'Ketchup', moutarde: 'Moutarde', mustard: 'Moutarde',
  samourai: 'Sauce samourai', andalouse: 'Sauce andalouse', 'sauce tomate': 'Sauce tomate', 'sauce soja': 'Sauce soja',
  lentilles: 'Lentilles cuites', lentille: 'Lentilles cuites',
  'pois chiches': 'Pois chiches cuits', 'pois chiche': 'Pois chiches cuits',
  hummus: 'Houmous', houmous: 'Houmous', 'haricots rouges': 'Haricots rouges',
  edamame: 'Edamame', tofu: 'Tofu', tempeh: 'Tempeh', seitan: 'Seitan',
  brocoli: 'Brocoli', broccoli: 'Brocoli', epinards: 'Epinards', spinach: 'Epinards',
  courgette: 'Courgette', zucchini: 'Courgette', tomate: 'Tomate', tomates: 'Tomate', tomato: 'Tomate',
  'tomates cerises': 'Tomates cerises', carotte: 'Carotte', carottes: 'Carotte', carrot: 'Carotte',
  salade: 'Salade verte', lettuce: 'Salade verte',
  chicon: 'Chicons au jambon (gratin)', endive: 'Chicons au jambon (gratin)', witloof: 'Chicons au jambon (gratin)',
  'chou de bruxelles': 'Chou de Bruxelles', 'choux de bruxelles': 'Chou de Bruxelles',
  chou: 'Chou', 'chou fleur': 'Chou-fleur', poivron: 'Poivron', poivrons: 'Poivron',
  aubergine: 'Aubergine', champignons: 'Champignons', mushrooms: 'Champignons',
  concombre: 'Concombre', cucumber: 'Concombre', 'haricots verts': 'Haricots verts',
  'petits pois': 'Petits pois', asperges: 'Asperges', betterave: 'Betterave',
  oignon: 'Oignon', oignons: 'Oignon', onion: 'Oignon', echalote: 'Echalote', ail: 'Ail', garlic: 'Ail',
  mais: 'Mais', corn: 'Mais', butternut: 'Butternut', artichaut: 'Artichaut cuit', poireau: 'Poireau',
  avocat: 'Avocat', avocado: 'Avocat', banane: 'Banane', banana: 'Banane',
  pomme: 'Pomme', apple: 'Pomme', appel: 'Pomme', orange: 'Orange',
  fraise: 'Fraises', fraises: 'Fraises', strawberry: 'Fraises',
  myrtille: 'Myrtilles', myrtilles: 'Myrtilles', blueberry: 'Myrtilles',
  poire: 'Poire', pear: 'Poire', peche: 'Peche', peach: 'Peche', abricot: 'Abricot frais',
  kiwi: 'Kiwi', mangue: 'Mangue', mango: 'Mangue', ananas: 'Ananas', pineapple: 'Ananas',
  pasteque: 'Pasteque', melon: 'Melon', raisin: 'Raisins secs', dattes: 'Dattes', pruneaux: 'Pruneaux', cerises: 'Cerises',
  amandes: 'Amandes', almond: 'Amandes', almonds: 'Amandes', noix: 'Noix', walnuts: 'Noix',
  'noix de cajou': 'Noix de cajou', cajou: 'Noix de cajou', cashew: 'Noix de cajou',
  noisettes: 'Noisettes', pistaches: 'Pistaches', cacahuetes: 'Cacahuetes', peanuts: 'Cacahuetes',
  chia: 'Graines de chia', 'graines de lin': 'Graines de lin',
  waterzooi: 'Waterzooi de poulet', 'vol au vent': 'Vol-au-vent', volauvent: 'Vol-au-vent',
  speculoos: 'Speculoos', speculaas: 'Speculoos',
  pizza: 'Pizza margherita', 'pizza 4 fromages': 'Pizza 4 fromages',
  burger: 'Burger classique', hamburger: 'Burger classique', cheeseburger: 'Cheeseburger',
  'big mac': 'Big Mac (McDo)', burrito: 'Burrito', tacos: 'Tacos francais', sushi: 'Sushi 6 pieces',
  'chili con carne': 'Chili con carne', blanquette: 'Blanquette de veau', tajine: 'Tajine de poulet',
  coca: 'Coca-cola', coke: 'Coca-cola', 'coca cola': 'Coca-cola', 'coca zero': 'Coca zero',
  sprite: 'Sprite', biere: 'Biere blonde', beer: 'Biere blonde', pintje: 'Biere blonde',
  cafe: 'Cafe noir', coffee: 'Cafe noir', koffie: 'Cafe noir', cappuccino: 'Cafe cappuccino', latte: 'Cafe latte',
  the: 'The noir', tea: 'The noir', miel: 'Miel', honey: 'Miel',
  chocolat: 'Chocolat noir 70%', chocolate: 'Chocolat noir 70%', 'chocolat au lait': 'Chocolat au lait',
  snickers: 'Snickers', twix: 'Twix', sucre: 'Sucre blanc', sugar: 'Sucre blanc', confiture: 'Confiture',
};

export const ALIAS = {};
for (const [k, v] of Object.entries(ALIAS_BRUT)) ALIAS[normNom(k)] = v;

export function resoudreAliment(dit) {
  const n = normNom(dit);
  if (!n) return null;
  if (ALIAS[n]) return cleDb(ALIAS[n]) || ALIAS[n];
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
    return nn === n || nn.startsWith(n + ' ');
  }) || null;
}
