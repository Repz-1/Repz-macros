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
