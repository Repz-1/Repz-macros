// Banc d'essai « Mes besoins » en mode Manuel, avec un ecart
// macros/calories volontaire : 4000 kcal annonces, 3448 dans les
// grammes. Verifie que l'ecart se chiffre et se comble.
import { render } from 'preact';
import '../src/styles.css';
import '../src/styles/design-system.css';
import { objectifs } from '../src/store/journal.js';
import { estPremium } from '../src/components/PremiumPage.jsx';
import { TdeeCalculator } from '../src/components/TdeeCalculator.jsx';

objectifs.value = { kcal: 4000, prot: 218, carbs: 428, lip: 96 };
estPremium.value = true;
setInterval(() => { estPremium.value = true; }, 100);

render(<TdeeCalculator montre={true} fermer={() => {}} />, document.getElementById('app'));
