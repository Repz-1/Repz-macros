import { useState, useEffect, useRef } from 'preact/hooks';
import { connexion, connexionGoogle, inscription, messageErreurAuth, envoyerLienReinitialisation } from '../services/firebase.js';
import { normPseudo, formePseudo, pseudoDisponible } from '../services/pseudo.js';
import { t, langue } from '../i18n/index.js';
import { programmeEnAttente, prenomEnAttente, relancerBienvenue } from './Bienvenue.jsx';

// Force du mot de passe : memes regles qu'en v1 (index.html).
// 8 caracteres minimum, avec majuscule, minuscule, chiffre et symbole.
function mdpValide(pw) {
  return pw.length >= 8 && /[a-z]/.test(pw) && /[A-Z]/.test(pw)
    && /[0-9]/.test(pw) && /[^a-zA-Z0-9]/.test(pw);
}
function scoreMdp(pw) {
  let s = 0;
  if (/[a-z]/.test(pw)) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^a-zA-Z0-9]/.test(pw)) s++;
  if (pw.length < 8) s = Math.min(s, 2);   // longueur insuffisante = plafonne
  return Math.min(s, 4);
}
/** Ce qui manque encore, enonce simplement. */
function manquesMdp(pw) {
  const m = [];
  if (pw.length < 8) m.push('8 caractères');
  if (!/[A-Z]/.test(pw)) m.push('majuscule');
  if (!/[a-z]/.test(pw)) m.push('minuscule');
  if (!/[0-9]/.test(pw)) m.push('chiffre');
  if (!/[^a-zA-Z0-9]/.test(pw)) m.push('symbole');
  return m;
}

// Un message d'accueil tire au sort a l'ouverture, comme une salutation
// qui ne se repete pas mot pour mot chaque jour. Fige au montage : il ne
// doit pas changer sous les yeux pendant que la personne tape.
const ACCUEILS = ['hello_1', 'hello_2', 'hello_3', 'hello_4', 'hello_5', 'hello_6'];

// Ecran de connexion / inscription — sobre, palette BelFit.
export function LoginScreen() {
  // Un programme construit pendant l'accueil attend d'etre sauvegarde :
  // on ouvre directement l'inscription, prenom deja rempli.
  const [mode, setMode] = useState(() => programmeEnAttente() ? 'inscription' : 'connexion');
  const [accueil] = useState(() => ACCUEILS[Math.floor(Math.random() * ACCUEILS.length)]);
  const [email, setEmail] = useState('');
  const [prenom, setPrenom] = useState(() => prenomEnAttente());
  const [pseudo, setPseudo] = useState('');
  const [mdp, setMdp] = useState('');
  const [mdp2, setMdp2] = useState('');
  const [consent, setConsent] = useState(false);
  const [erreur, setErreur] = useState('');
  const [chargement, setChargement] = useState(false);
  // Recuperation de mot de passe : champ dedie et message de reussite,
  // comme le formulaire separe de la v1 (recoveryForm).
  const [emailRecup, setEmailRecup] = useState('');
  const [msgOk, setMsgOk] = useState('');

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
    if (mode === 'inscription') {
      if (etatPseudo !== 'libre') { setErreur(t('pseudo_invalide')); return; }
      if (!mdpValide(mdp)) {
        setErreur('Mot de passe trop faible : 8 caractères min avec majuscule, minuscule, chiffre et symbole');
        return;
      }
      if (mdp !== mdp2) { setErreur('Les deux mots de passe ne correspondent pas'); return; }
      if (!prenom.trim()) { setErreur(t('js_enter_firstname')); return; }
      if (!consent) { setErreur("Merci d'accepter la politique de confidentialité pour créer ton compte"); return; }
    }
    setChargement(true);
    try {
      if (mode === 'connexion') await connexion(email.trim(), mdp);
      else await inscription(email.trim(), mdp, pseudo, prenom.trim());
      // onAuthStateChanged fera basculer l'app tout seul
    } catch (err) {
      setErreur(messageErreurAuth(err.code));
    }
    setChargement(false);
  };

  // La v1 remplace le formulaire de connexion par celui-ci dans la meme
  // carte : ni bouton Google, ni separateur, juste l'adresse et l'envoi.
  if (mode === 'recuperation') {
    const envoyer = async (e) => {
      e.preventDefault();
      setErreur(''); setMsgOk(''); setChargement(true);
      try {
        await envoyerLienReinitialisation(emailRecup, langue.value);
        setMsgOk(t('recup_ok'));
        // Retour automatique a la connexion apres 3 s, comme en v1.
        setTimeout(() => { setMode('connexion'); setMsgOk(''); }, 3000);
      } catch (err) {
        setErreur(t('recup_erreur'));
      }
      setChargement(false);
    };

    return (
      <div class="login-ecran">
        <img src="/belfit-logo-b.png" alt="BelFit" class="login-logo" />
        <h1 class="login-titre">{t('recup_titre')}</h1>

        <form onSubmit={envoyer} class="login-form">
          {erreur && <div class="login-erreur">{erreur}</div>}
          {msgOk && <div class="login-ok">{msgOk}</div>}
          <input
            type="email" placeholder={t('email')} value={emailRecup}
            onInput={e => setEmailRecup(e.currentTarget.value)} required
            autocomplete="email" autocapitalize="none" spellcheck={false}
          />
          <button type="submit" class="login-btn" disabled={chargement}>
            {chargement ? t('recup_envoi') : t('recup_envoyer')}
          </button>
        </form>

        <button
          class="login-bascule"
          onClick={() => { setMode('connexion'); setErreur(''); setMsgOk(''); }}
        >
          {t('recup_retour')}
        </button>
      </div>
    );
  }

  return (
    <div class="login-ecran">
      <img src="/belfit-logo-b.png" alt="BelFit" class="login-logo" />
      <h1 class="login-titre">
        {mode === 'connexion' ? t(accueil)
          : (prenom ? `Garde ton programme, ${prenom}` : t('hello_new'))}
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
        {mode === 'inscription' && (
          <input
            type="text" placeholder={t('register_firstname_ph')} value={prenom}
            onInput={e => setPrenom(e.currentTarget.value)} required
            autocomplete="given-name" maxLength={30}
          />
        )}
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

        {mode === 'inscription' && (
          <>
            <div class="login-pw-jauge">
              <div
                class="login-pw-bar"
                style={{
                  width: mdp ? ['25%', '45%', '70%', '100%'][Math.max(0, scoreMdp(mdp) - 1)] : '0',
                  background: ['#DC2626', '#F97316', '#F7B500', '#10B981'][Math.max(0, scoreMdp(mdp) - 1)],
                }}
              />
            </div>
            <div class={'login-pseudo-note' + (mdp && mdpValide(mdp) ? ' login-pseudo-note--libre' : '')}>
              {!mdp
                ? '8 caractères min, avec majuscule, minuscule, chiffre et symbole.'
                : mdpValide(mdp) ? '✓ Mot de passe solide' : 'Manque : ' + manquesMdp(mdp).join(', ')}
            </div>

            <input
              type="password" placeholder="Confirmer le mot de passe" value={mdp2}
              onInput={e => setMdp2(e.currentTarget.value)} required autocomplete="new-password"
            />

            <label class="login-consent">
              <input
                type="checkbox" checked={consent}
                onChange={e => setConsent(e.currentTarget.checked)}
              />
              <span>
                {t('register_consent').split('{link}')[0]}
                <a href="https://www.belfit.be/confidentialite.html" target="_blank" rel="noopener">{t('privacy_policy')}</a>
                {t('register_consent').split('{link}')[1]}
              </span>
            </label>
          </>
        )}

        {erreur && <div class="login-erreur">{erreur}</div>}
        <button type="submit" class="login-btn" disabled={chargement || (mode === 'inscription' && !consent)}>
          {chargement ? '…' : (mode === 'connexion' ? t('connexion') : t('inscription'))}
        </button>
      </form>

      <button
        class="login-bascule"
        onClick={() => {
          // Toute inscription passe par le questionnaire : « S'inscrire »
          // le lance, sauf si un programme tout juste construit attend
          // deja — le formulaire s'ouvre alors directement.
          if (mode === 'connexion' && !programmeEnAttente()) { relancerBienvenue(); return; }
          setMode(mode === 'connexion' ? 'inscription' : 'connexion');
          setErreur(''); setMdp2(''); setConsent(false);
        }}
      >
        {mode === 'connexion' ? t('pas_compte') : t('deja_compte')}
      </button>

      {/* « Mot de passe oublie » reste volontairement en retrait (v1). */}
      {mode === 'connexion' && (
        <button
          class="login-oubli"
          onClick={() => { setMode('recuperation'); setErreur(''); setMsgOk(''); }}
        >
          {t('mdp_oublie')}
        </button>
      )}
    </div>
  );
}
