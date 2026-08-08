import { render } from 'preact';

// ============================================================
// APERCU — rend UNE page reelle de la v2 dans un navigateur.
//
// L'ancien apercu passait par un mode invite (`belfit_v2_invite`)
// que firebase.js efface desormais a chaque demarrage : il ne
// pouvait plus montrer que l'ecran de connexion, tout en donnant
// l'illusion de verifier les autres. Des « verifications visuelles »
// ne prouvaient donc plus rien.
//
// Ici on ne simule aucune session. On ne touche jamais au signal
// `utilisateur` : tant qu'il est nul, l'effet de chargement du store
// sort immediatement et n'ecrase pas les donnees posees, et l'effet
// de sauvegarde n'ecrit rien. On se contente de remplir les signaux
// puis de monter la page demandee.
//
//   node apercu.mjs                 -> toutes les pages
//   node apercu.mjs journal courses -> seulement celles-la
// ============================================================

import '../src/styles.css';
import '../src/styles/design-system.css';
import '../src/styles/journal-socle.css';

import { repas, objectifs, eau, donneesPretes, poidsCalcul, calculBaseFait }
  from '../src/store/journal.js';
import { weightLog, histoJours } from '../src/store/stats.js';
import { OngletJournal, OngletEntrainer } from '../src/main.jsx';
import { Besoins } from '../src/components/Besoins.jsx';
import { Courses } from '../src/components/Courses.jsx';
import { Stats } from '../src/components/Stats.jsx';
import { StatsAvancees } from '../src/components/StatsAvancees.jsx';
import { BelfitPlus } from '../src/components/BelfitPlus.jsx';
import { Reglages } from '../src/components/Reglages.jsx';
import { PremiumPage, estPremium } from '../src/components/PremiumPage.jsx';
import { ongletActif } from '../src/components/BottomNav.jsx';
import { TdeeCalculator } from '../src/components/TdeeCalculator.jsx';
import { BottomNav } from '../src/components/BottomNav.jsx';

// --- Donnees d'exemple : une journee a moitie remplie, pas un ecran
//     vide. Un etat vide ne prouve pas qu'une page fonctionne. ---
function semer() {
  try {
    localStorage.setItem('repz_firstName', 'Raci');
    localStorage.setItem('belfit_v2_apercu_premium', '1');
  } catch (e) {}

  objectifs.value = { kcal: 2712, prot: 165, carbs: 344, lip: 75 };
  poidsCalcul.value = 75;
  calculBaseFait.value = true;
  eau.value = 1.1;
  estPremium.value = true;

  // La forme compte autant que le contenu : un ingredient est
  // { id, name, portion } et les macros se relisent dans la base par
  // le nom. Une fixture aux mauvaises cles produit des erreurs qui
  // ressemblent a des bugs de l'application et n'en sont pas.
  let n = 0;
  const ing = (name, portion) => ({ id: ++n, name, portion });
  repas.value = [
    { id: 1, nom: 'Petit déjeuner', type: 'repas', cle: 'pdej', fixe: true, ouvert: false,
      ings: [ing('Avoine', 70), ing('Whey', 30)] },
    { id: 2, nom: 'Déjeuner', type: 'repas', cle: 'dej', fixe: true, ouvert: false,
      ings: [ing('Riz cuit', 125), ing('Poulet cuit', 95)] },
    { id: 3, nom: 'Dîner', type: 'repas', cle: 'diner', fixe: true, ouvert: false, ings: [] },
    { id: 4, nom: 'Collations', type: 'collation', cle: 'snack', fixe: true, ouvert: false, ings: [] },
  ];

  // weightLog : [{ iso, kg }] — pas { date, weight }.
  const jour = (d) => new Date(Date.now() - d * 86400000).toISOString().slice(0, 10);
  weightLog.value = [78.4, 78.0, 77.6, 77.1, 76.8, 76.2, 75.9, 75.4, 75.1, 75.0]
    .map((kg, i) => ({ iso: jour(27 - i * 3), kg }));
  // histoJours : { iso: { kcal, prot, carbs, lip } } — sans quoi les
  // graphiques de Stats n'ont rien a tracer.
  const h = {};
  for (let d = 1; d <= 14; d++) {
    h[jour(d)] = { kcal: 2500 + ((d * 137) % 400), prot: 150 + (d % 30),
                   carbs: 300 + ((d * 11) % 60), lip: 70 + (d % 12) };
  }
  histoJours.value = h;

  donneesPretes.value = true;
}

/* Certaines pages ne montrent leur contenu que si leur onglet est
   actif : S'entrainer ne charge ses photos de fond qu'a la condition
   ongletActif === 'entrainer'. Sans ca l'apercu rendait la page
   entierement sans images — et declarait « photo nette : jamais »
   avant comme apres correction. Une fixture qui ne reproduit pas le
   contexte ne mesure rien. */
const ONGLET = { journal: 'journal', entrainer: 'entrainer', stats: 'stats',
                 courses: 'courses', plus: 'plus', premium: 'premium' };

const PAGES = {
  journal:   () => <OngletJournal />,
  besoins:   () => <Besoins />,
  courses:   () => <Courses />,
  // Rendu AVEC la barre de navigation : c'est sa superposition avec
  // les feuilles qui a masque des boutons deux fois aujourd'hui.
  entrainer: () => (<><OngletEntrainer /><BottomNav /></>),
  stats:     () => <Stats />,
  statsav:   () => <StatsAvancees retour={() => {}} />,
  plus:      () => <BelfitPlus />,
  reglages:  () => <Reglages />,
  premium:   () => <PremiumPage />,
  // Le calculateur est rendu AVEC la barre de navigation : c'est leur
  // superposition qui a masque le bouton Appliquer, un rendu sans
  // barre n'aurait rien montre du probleme.
  calcul:    () => (<><TdeeCalculator montre={true} retour="Mon programme" fermer={() => {}} /><BottomNav /></>),
};
export const NOMS = Object.keys(PAGES);

semer();
const demande = new URLSearchParams(location.search).get('p') || 'journal';
ongletActif.value = ONGLET[demande] || 'journal';
const page = PAGES[demande];
const cible = document.getElementById('apercu');
if (!page) {
  cible.textContent = 'Page inconnue : ' + demande + '. Connues : ' + NOMS.join(', ');
} else {
  render(page(), cible);
}
