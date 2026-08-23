// Banc d'essai : carte « Évolution du poids » en etat VIDE, aucune
// pesee enregistree. C'est la que R5 voit deux boutons.
import { render } from 'preact';
import '../src/styles.css';
import '../src/styles/design-system.css';
import { langue } from '../src/i18n/index.js';
import { weightLog } from '../src/store/stats.js';
import { utilisateur, authPrete } from '../src/services/firebase.js';
import { Stats } from '../src/components/Stats.jsx';

langue.value = 'fr';
// ?cas=plein : une pesee existe -> le bouton permanent doit revenir.
const PLEIN = new URLSearchParams(location.search).get('cas') === 'plein';
const donnees = PLEIN ? [{ iso: '2026-08-16', kg: 97.4 }, { iso: '2026-08-20', kg: 97.0 }, { iso: '2026-08-22', kg: 96.8 }] : [];
weightLog.value = donnees;
utilisateur.value = { uid: 'test', email: 'coach@belfit.be', displayName: 'Raci', metadata: { creationTime: new Date().toISOString() } };
authPrete.value = true;
setInterval(() => { authPrete.value = true; weightLog.value = donnees; }, 150);
render(<Stats />, document.getElementById('app'));
