// Etat du coaching partage entre la page Coach et le bandeau affiche
// en haut de chaque page (26/09). Une seule regle de calcul, pour que
// le bandeau et la page ne se contredisent jamais.
import { signal } from '@preact/signals';

// Delai pour remplir le questionnaire apres paiement (regle de Raci).
export const DELAI_QUESTIONNAIRE = 7;

// Demande d'ouverture du questionnaire depuis n'importe quelle page
// (appui sur le bandeau). La page Coach la consomme.
export const demandeQuestionnaire = signal(null);

export function payeLocal() {
  try { return JSON.parse(localStorage.getItem('belfit_qc_paye')); } catch (e) { return null; }
}

function jours(iso) {
  const j = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return isNaN(j) ? 0 : Math.max(0, j);
}
const avant = (a, b) => !a || (b && new Date(a) < new Date(b));

/**
 * @param dossier { commande, questionnaire } ; @param pr plan livre ou null
 * aRemplir : paye, questionnaire pas encore envoye depuis ce paiement.
 * enPrep   : questionnaire envoye, plan pas encore livre depuis.
 */
export function etatCoach(dossier, pr) {
  const { commande: cmd, questionnaire: q } = dossier || {};
  const local = payeLocal();
  const payeLe = (cmd && cmd.payeLe) || (local && local.le) || null;
  const type = (cmd && cmd.type) || (local && local.type) || 'plan';
  const aRemplir = !!payeLe && avant(q && q.envoyeLe, payeLe);
  const enPrep = !!payeLe && !aRemplir && avant(pr && pr.livreLe, q.envoyeLe);
  const ecoules = payeLe ? jours(payeLe) : 0;
  return {
    payeLe, type, aRemplir, enPrep,
    tardif: aRemplir && ecoules >= DELAI_QUESTIONNAIRE,
    restants: Math.max(0, DELAI_QUESTIONNAIRE - ecoules),
  };
}
