import { useState } from 'preact/hooks';
import { connexion, inscription, messageErreurAuth, entrerInvite } from '../services/firebase.js';
import { t } from '../i18n/index.js';

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
        {mode === 'connexion' ? t('revoir') : t('creer_compte')}
      </h1>

      <form onSubmit={valider} class="login-form">
        <input
          type="email" placeholder={t("email")} value={email}
          onInput={e => setEmail(e.currentTarget.value)} required autocomplete="email"
        />
        <input
          type="password" placeholder={t("mdp")} value={mdp}
          onInput={e => setMdp(e.currentTarget.value)} required
          autocomplete={mode === 'connexion' ? 'current-password' : 'new-password'}
        />
        {erreur && <div class="login-erreur">{erreur}</div>}
        <button type="submit" class="login-btn" disabled={chargement}>
          {chargement ? '…' : (mode === 'connexion' ? t('connexion') : t('inscription'))}
        </button>
      </form>

      <button
        class="login-bascule"
        onClick={() => { setMode(mode === 'connexion' ? 'inscription' : 'connexion'); setErreur(''); }}
      >
        {mode === 'connexion' ? t('pas_compte') : t('deja_compte')}
      </button>

      <div class="login-sep"><span>ou</span></div>
      <button class="login-invite" onClick={entrerInvite}>{t('essayer_sans_compte')}</button>
      <p class="login-invite-note">{t('invite_note')}</p>
    </div>
  );
}
