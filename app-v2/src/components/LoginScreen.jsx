import { useState } from 'preact/hooks';
import { connexion, inscription, messageErreurAuth } from '../services/firebase.js';

// Ecran de connexion / inscription — sobre, palette BelFit.
export function LoginScreen() {
  const [mode, setMode] = useState('connexion');
  const [email, setEmail] = useState('');
  const [mdp, setMdp] = useState('');
  const [erreur, setErreur] = useState('');
  const [chargement, setChargement] = useState(false);

  const valider = async (e) => {
    e.preventDefault();
    setErreur('');
    setChargement(true);
    try {
      if (mode === 'connexion') await connexion(email.trim(), mdp);
      else await inscription(email.trim(), mdp);
      // onAuthStateChanged fera basculer l'app tout seul
    } catch (err) {
      setErreur(messageErreurAuth(err.code));
    }
    setChargement(false);
  };

  return (
    <div class="login-ecran">
      <img src="/belfit-logo-b.png" alt="BelFit" class="login-logo" />
      <h1 class="login-titre">
        {mode === 'connexion' ? 'Content de te revoir' : 'Crée ton compte'}
      </h1>

      <form onSubmit={valider} class="login-form">
        <input
          type="email" placeholder="Adresse e-mail" value={email}
          onInput={e => setEmail(e.currentTarget.value)} required autocomplete="email"
        />
        <input
          type="password" placeholder="Mot de passe" value={mdp}
          onInput={e => setMdp(e.currentTarget.value)} required
          autocomplete={mode === 'connexion' ? 'current-password' : 'new-password'}
        />
        {erreur && <div class="login-erreur">{erreur}</div>}
        <button type="submit" class="login-btn" disabled={chargement}>
          {chargement ? '…' : (mode === 'connexion' ? 'Se connecter' : 'Créer mon compte')}
        </button>
      </form>

      <button
        class="login-bascule"
        onClick={() => { setMode(mode === 'connexion' ? 'inscription' : 'connexion'); setErreur(''); }}
      >
        {mode === 'connexion' ? "Pas encore de compte ? S'inscrire" : 'Déjà un compte ? Se connecter'}
      </button>
    </div>
  );
}
