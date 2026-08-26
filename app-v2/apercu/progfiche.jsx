// Banc d'essai : la fiche du programme ACTIF, ouverte directement.
import { render } from 'preact';
import '../src/styles.css';
import '../src/styles/design-system.css';
import '../src/legacy/programmes.scoped.css';
import { langue } from '../src/i18n/index.js';
import { programmeActif } from '../src/store/programme.js';
import { estPremium } from '../src/components/PremiumPage.jsx';
import { Programmes } from '../src/components/Programmes.jsx';
import { vueEntrainer } from '../src/components/Entrainer.jsx';
langue.value = 'fr';
estPremium.value = true;
programmeActif.value = { id: 'masse-4j', jours: { 1: 0, 3: 1, 5: 2, 6: 3 }, depuis: '2026-08-17' };
setInterval(() => { estPremium.value = true; }, 120);
vueEntrainer.value = { nom: 'programmes', params: { prog: 'masse-4j' } };
render(<Programmes />, document.getElementById('app'));
