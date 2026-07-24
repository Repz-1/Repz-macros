import { useState, useEffect, useRef } from 'preact/hooks';
import {
  utilisateur, adresseAConfirmer,
  envoyerMailVerification, rafraichirUtilisateur,
} from '../services/firebase.js';
import { t, langue } from '../i18n/index.js';

/**
 * Relance de confirmation d'adresse. Ni mur ni fenetre : une bande fine
 * et ecartable, qui laisse l'application entierement accessible — le
 * parti pris de Lifesum, MyFitnessPal et Foodvisor. Un blocage juste
 * apres l'inscription couterait des utilisateurs sans rien garantir.
 */
export function BandeauConfirmation() {
  const [masque, setMasque] = useState(() => {
    try { return sessionStorage.getItem('belfit_conf_masque') === '1'; } catch (e) { return false; }
  });
  const [texte, setTexte] = useState('');
  const [envoye, setEnvoye] = useState(false);
  const envoiFait = useRef(false);

  const visible = !masque && adresseAConfirmer(utilisateur.value);

  useEffect(() => {
    if (!visible) return undefined;
    // Premier envoi : la personne vient de s'inscrire, le message doit
    // partir sans qu'elle ait a le demander.
    if (!envoiFait.current) {
      envoiFait.current = true;
      envoyerMailVerification(langue.value).catch(() => {});
    }
    // La confirmation se fait souvent sur un autre appareil : on relit
    // l'etat du compte plutot que d'attendre un retour ici.
    const minuteur = setInterval(() => { rafraichirUtilisateur().catch(() => {}); }, 15000);
    return () => clearInterval(minuteur);
  }, [visible]);

  if (!visible) return null;

  const renvoyer = async () => {
    try {
      await envoyerMailVerification(langue.value);
      setTexte(t('conf_renvoye')); setEnvoye(true);
    } catch (e) {
      setTexte(e.message === 'trop_tot' ? t('conf_trop_tot') : t('conf_erreur'));
    }
  };

  const fermer = () => {
    try { sessionStorage.setItem('belfit_conf_masque', '1'); } catch (e) {}
    setMasque(true);
  };

  return (
    <div class="bandeau-conf">
      <span class="bc-txt">{texte || t('conf_bandeau')}</span>
      {!envoye && <button class="bc-action" onClick={renvoyer}>{t('conf_renvoyer')}</button>}
      <button class="bc-fermer" onClick={fermer} aria-label="Fermer">×</button>
    </div>
  );
}
