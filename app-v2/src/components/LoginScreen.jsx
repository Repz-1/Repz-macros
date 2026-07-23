import { useState, useEffect, useRef } from 'preact/hooks';
import { connexion, connexionGoogle, inscription, messageErreurAuth } from '../services/firebase.js';
import { normPseudo, formePseudo, pseudoDisponible } from '../services/pseudo.js';
import { t } from '../i18n/index.js';

// Ecran de connexion / inscription — sobre, palette BelFit.
export function LoginScreen() {
  const [mode, setMode] = useState('connexion');
  const [email, setEmail] = useState('');
  const [pseudo, setPseudo] = useState('');
  const [mdp, setMdp] = useState('');
  const [erreur, setErreur] = useState('');
  const [chargement, setChargement] = useState(false);

  // Etat du nom d'utilisateur : 'vide' | 'invalide' | 'verif' | 'libre' | 'pris'
  const [etatPseudo, setEtatPseudo] = useState('vide');
  const [notePseudo, setNotePseudo] = useState('');
  const dernierePseudo = useRef('');

  // Disponibilite verifiee au fil de la frappe, avec un temps mort de
  // 450 ms (v1) : on n'interroge pas le serveur a chaque lettre.
  useEffect(() => {
    if (mode !== 'inscription') return;
    const p = normPseudo(pseudo);
    dernierePseudo.current = p;

    const forme = formePseudo(p);
    if (forme === 'vide') { setEtatPseudo('vide'); setNotePseudo(t('register_pseudo_hint')); return; }
    if (forme === 'trop_court') { setEtatPseudo('invalide'); setNotePseudo(t('pseudo_court')); return; }
    if (forme) { setEtatPseudo('invalide'); setNotePseudo(t('pseudo_caracteres')); return; }

    setEtatPseudo('verif'); setNotePseudo(t('pseudo_verif'));
    const id = setTimeout(async () => {
      const d = await pseudoDisponible(p);
      if (dernierePseudo.current !== p) return;   // la frappe a continue
      if (d.disponible) { setEtatPseudo('libre'); setNotePseudo(d.horsLigne ? t('register_pseudo_hint') : t('pseudo_libre')); }
      else { setEtatPseudo('pris'); setNotePseudo(t(d.raison === 'reserve' ? 'pseudo_reserve' : 'pseudo_pris')); }
    }, 450);
    return () => clearTimeout(id);
  }, [pseudo, mode]);

  const valider = async (e) => {
    e.preventDefault();
    setErreur('');
    if (mode === 'inscription' && etatPseudo !== 'libre') {
      setErreur(t('pseudo_invalide'));
      return;
    }
    setChargement(true);
    try {
      if (mode === 'connexion') await connexion(email.trim(), mdp);
      else await inscription(email.trim(), mdp, pseudo);
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

      <button
        class="login-google"
        onClick={async () => {
          setErreur('');
          try { await connexionGoogle(); }
          catch (e) { setErreur(messageErreurAuth(e)); }
        }}
      >
        <svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.2-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.1 18.9 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.6 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2C41 35.4 44 30.2 44 24c0-1.2-.1-2.4-.4-3.5z"/></svg>
        {t('auth_google')}
      </button>
      <div class="login-ou"><span>{t('ou')}</span></div>

      <form onSubmit={valider} class="login-form">
        <input
          type={mode === 'connexion' ? 'text' : 'email'}
          placeholder={mode === 'connexion' ? t('login_identifiant') : t('email')}
          value={email}
          onInput={e => setEmail(e.currentTarget.value)} required
          autocomplete={mode === 'connexion' ? 'username' : 'email'}
          autocapitalize="none" spellcheck={false}
        />

        {mode === 'inscription' && (
          <>
            <input
              type="text" placeholder={t('register_pseudo')} value={pseudo}
              onInput={e => setPseudo(e.currentTarget.value)} required
              autocomplete="username" autocapitalize="none" spellcheck={false}
              maxLength={20}
            />
            <div class={'login-pseudo-note login-pseudo-note--' + etatPseudo}>{notePseudo}</div>
          </>
        )}
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
    </div>
  );
}
