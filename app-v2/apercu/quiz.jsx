// Banc d'essai du questionnaire de programme (onglet S'entrainer).
// Raci le 10/08 : etape 2/9, reponse choisie, appui sur Continuer,
// rien ne se passe.
import { render } from 'preact';
import '../src/styles.css';
import '../src/styles/design-system.css';
import '../src/styles/journal-socle.css';
import { utilisateur, authPrete } from '../src/services/firebase.js';
import { donneesPretes, calculBaseFait, objectifs } from '../src/store/journal.js';
import { App } from '../src/main.jsx';
import { estPremium } from '../src/components/PremiumPage.jsx';
import { ongletActif } from '../src/components/BottomNav.jsx';
import { vueEntrainer } from '../src/components/Entrainer.jsx';

utilisateur.value = { uid: 'test', email: 'coach@belfit.be', displayName: 'Raci', metadata: { creationTime: new Date(Date.now() - 40 * 864e5).toISOString() } };
objectifs.value = { kcal: 3562, prot: 222, carbs: 485, lip: 72 };
authPrete.value = true;
donneesPretes.value = true;
calculBaseFait.value = true;
ongletActif.value = 'entrainer';
vueEntrainer.value = { nom: 'questionnaire', params: null };

const faux = utilisateur.value;
setInterval(() => {
  if (!utilisateur.value) utilisateur.value = faux;
  authPrete.value = true;
  donneesPretes.value = true;
  calculBaseFait.value = true;
  estPremium.value = true;
  if (ongletActif.value !== 'entrainer') ongletActif.value = 'entrainer';
}, 100);

render(<App />, document.getElementById('app'));
