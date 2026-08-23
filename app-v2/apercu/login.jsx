// Banc d'essai de l'ecran de connexion : verifie qu'aucune entree
// invite ne subsiste une fois le drapeau referme.
import { render } from 'preact';
import '../src/styles.css';
import '../src/styles/design-system.css';
import { langue } from '../src/i18n/index.js';
import { LoginScreen } from '../src/components/LoginScreen.jsx';
langue.value = 'fr';
render(<LoginScreen />, document.getElementById('app'));
