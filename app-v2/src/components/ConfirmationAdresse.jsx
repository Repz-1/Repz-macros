import { useState, useEffect, useRef } from 'preact/hooks';
import {
  utilisateur, deconnexion,
  envoyerMailVerification, rafraichirUtilisateur,
} from '../services/firebase.js';
import { t, langue } from '../i18n/index.js';

/**
 * Barriere posee juste apres l'inscription : tant que l'adresse n'est
 * pas confirmee, l'application reste fermee. Le questionnaire, lui, est
 * deja derriere — le programme calcule attend sagement d'etre applique,
 * personne ne refait ses 8 questions.
 *
 * Reprend l'habillage de l'ecran de connexion : meme logo, meme titre,
 * memes boutons. Aucun style nouveau hormis le lien de sortie.
 */
export function ConfirmationAdresse() {
  const [chargement, setChargement] = useState(false);
  const [message, setMessage] = useState('');
  const [erreur, setErreur] = useState('');
  const envoiFait = useRef(false);

  const email = utilisateur.value ? utilisateur.value.email : '';

  useEffect(() => {
    // Premier envoi automatique : arriver sur cet ecran sans avoir recu
    // le message serait une impasse. Le garde-fou serveur (un envoi par
    // minute) protege des doublons si le composant se remonte.
    if (!envoiFait.current) {
      envoiFait.current = true;
      envoyerMailVerification(langue.value).catch(() => {});
    }
    // Sondage discret : la personne confirme souvent sur un autre
    // appareil, et n'aurait aucune raison de revenir cliquer ici.
    const minuteur = setInterval(() => { rafraichirUtilisateur().catch(() => {}); }, 5000);
    return () => clearInterval(minuteur);
  }, []);

  const verifier = async () => {
    setChargement(true); setErreur(''); setMessage('');
    const ok = await rafraichirUtilisateur().catch(() => false);
    if (!ok) setErreur(t('conf_pas_encore'));
    setChargement(false);
  };

  const renvoyer = async () => {
    setErreur(''); setMessage('');
    try {
      await envoyerMailVerification(langue.value);
      setMessage(t('conf_renvoye'));
    } catch (e) {
      setErreur(e.message === 'trop_tot' ? t('conf_trop_tot') : t('conf_erreur'));
    }
  };

  return (
    <div class="login-ecran">
      <img src="/belfit-logo-b.png" alt="BelFit" class="login-logo" />
      <h1 class="login-titre">{t('conf_titre')}</h1>

      <div class="login-form">
        {erreur && <div class="login-erreur">{erreur}</div>}
        {message && <div class="login-ok">{message}</div>}

        <p class="conf-texte">{t('conf_intro').replace('{email}', email)}</p>

        <button class="login-btn" onClick={verifier} disabled={chargement}>
          {chargement ? t('conf_verif') : t('conf_fait')}
        </button>
      </div>

      <button class="login-bascule" onClick={renvoyer}>{t('conf_renvoyer')}</button>
      <p class="conf-aide">{t('conf_spam')}</p>

      {/* Sortie de secours : une adresse mal tapee enfermerait sinon la
          personne dehors, sans aucun moyen de se rattraper. */}
      <button class="login-oubli" onClick={() => deconnexion()}>{t('conf_autre')}</button>
    </div>
  );
}
