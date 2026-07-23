import { computed } from '@preact/signals';
import { utilisateur } from './firebase.js';
import { estPremium } from '../components/PremiumPage.jsx';

// ============================================================
// PERIODE DE DECOUVERTE
// Les 7 premiers jours suivant la creation du compte, les
// fonctions Premium « de confort » (detail nutritionnel) sont
// ouvertes a tous. On ne stocke rien : Firebase Auth date deja
// chaque compte (metadata.creationTime), et cette date vient du
// serveur — elle ne peut pas etre falsifiee en changant l'heure
// du telephone, contrairement a un compteur local.
// ============================================================

export const JOURS_DECOUVERTE = 7;

/** Jours ecoules depuis la creation du compte (0 le premier jour). */
export const joursDepuisInscription = computed(() => {
  const u = utilisateur.value;
  const brut = u && u.metadata && u.metadata.creationTime;
  if (!brut) return null;
  const cree = new Date(brut).getTime();
  if (!cree || Number.isNaN(cree)) return null;
  return Math.floor((Date.now() - cree) / 86400000);
});

/** Jours restants avant la fin de la periode (0 si terminee). */
export const joursRestantsDecouverte = computed(() => {
  const j = joursDepuisInscription.value;
  if (j == null) return 0;
  return Math.max(0, JOURS_DECOUVERTE - j);
});

/** Vrai pendant la fenetre d'ouverture, faux ensuite. */
export const enDecouverte = computed(() => joursRestantsDecouverte.value > 0);

/**
 * Acces a une fonction offerte pendant la decouverte : soit la
 * personne est abonnee, soit elle est encore dans sa fenetre.
 */
export const accesDecouverte = computed(() => estPremium.value || enDecouverte.value);
