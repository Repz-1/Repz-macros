// Banc d'essai : ecran « Replacer, changer ou arreter » sur un
// programme DEJA actif. Raci, 26/08 : « je ne peux rien modifier ».
import { render } from 'preact';
import '../src/styles.css';
import '../src/styles/design-system.css';
import '../src/legacy/planifier.scoped.css';
import { langue } from '../src/i18n/index.js';
import { programmeActif } from '../src/store/programme.js';
import { estPremium } from '../src/components/PremiumPage.jsx';
import { PlanifierProgramme } from '../src/components/PlanifierProgramme.jsx';
langue.value = 'fr';
estPremium.value = true;
const d = new Date(); d.setDate(d.getDate() - 8);
programmeActif.value = { id: 'masse-4j', jours: { 1: 0, 3: 1, 5: 2, 6: 3 }, depuis: d.toISOString().slice(0, 10) };
setInterval(() => { estPremium.value = true; }, 120);
render(<PlanifierProgramme progId="masse-4j" />, document.getElementById('app'));
