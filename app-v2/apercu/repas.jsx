// Banc d'essai de la page REPAS, pour reproduire le doublon signale
// par Raci le 10/08 : Avoine deja encode, un appui dans la liste en
// ajoute une seconde ligne identique.
import { render } from 'preact';
import '../src/styles.css';
import '../src/styles/design-system.css';
import '../src/styles/journal-socle.css';
import { utilisateur, authPrete } from '../src/services/firebase.js';
import { donneesPretes, objectifs, repas, calculBaseFait } from '../src/store/journal.js';
import { usages } from '../src/store/perso.js';
import { App } from '../src/main.jsx';
import { estPremium } from '../src/components/PremiumPage.jsx';
import { ongletActif } from '../src/components/BottomNav.jsx';
import { repasOuvertId } from '../src/components/MealCard.jsx';

utilisateur.value = { uid: 'test', email: 'coach@belfit.be', displayName: 'Raci', metadata: { creationTime: new Date(Date.now() - 40 * 864e5).toISOString() } };
objectifs.value = { kcal: 3562, prot: 222, carbs: 485, lip: 72 };

// Le repas de Raci tel qu'a l'ecran : Avoine deja encode une fois.
// La forme doit correspondre EXACTEMENT aux defauts du store
// (type, cle, fixe, ouvert), sinon MealPage ne trouve pas son repas.
const REPAS = [
  { id: 1, nom: 'Petit déjeuner', type: 'repas', cle: 'pdej', fixe: true, ouvert: false,
    ings: [{ id: 101, name: 'Avoine', portion: 100 }] },
  { id: 2, nom: 'Déjeuner', type: 'repas', cle: 'dej', fixe: true, ings: [], ouvert: false },
  { id: 3, nom: 'Dîner', type: 'repas', cle: 'diner', fixe: true, ings: [], ouvert: false },
  { id: 4, nom: 'Collations', type: 'collation', cle: 'snack', fixe: true, ings: [], ouvert: false },
];
repas.value = structuredClone(REPAS);
// Comptages d'encodage : ce sont eux qui font la liste des courants.
const USAGES = { 'Avoine': 12, 'Riz cru': 9, 'Poulet cuit': 8, 'Banane': 2 };
usages.value = { ...USAGES };

authPrete.value = true;
donneesPretes.value = true;
calculBaseFait.value = true;
ongletActif.value = 'journal';
repasOuvertId.value = 1;

const faux = utilisateur.value;
setInterval(() => {
  if (!utilisateur.value) utilisateur.value = faux;
  authPrete.value = true;
  donneesPretes.value = true;
  calculBaseFait.value = true;
  estPremium.value = true;
  // La synchronisation Firestore repond en differe et remet le
  // journal a vide : on le maintient le temps du test.
  if (!repas.value.some(r => r.ings.length)) repas.value = structuredClone(REPAS);
  if (!Object.keys(usages.value).length) usages.value = { ...USAGES };
  if (repasOuvertId.value === null) repasOuvertId.value = 1;
}, 100);

render(<App />, document.getElementById('app'));
