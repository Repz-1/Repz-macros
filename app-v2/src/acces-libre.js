/**
 * PERIODE DE TEST OUVERTE
 * =======================
 *
 * Un seul interrupteur. A `true`, tout le monde a l'acces complet :
 * pas de page de vente, pas de badges PRO, aucune fonction verrouillee.
 * A `false`, l'application redevient exactement ce qu'elle etait — le
 * paiement, les formules et les verrous reprennent leur place sans
 * qu'aucun autre fichier ait bouge.
 *
 * Raci, 26/08 : « donner le full acces a tous ceux qui telechargent
 * l'appli, le temps qu'ils testent ».
 *
 * DEUX COTES A BASCULER ENSEMBLE.
 * Celui-ci ouvre l'interface. Le serveur a le sien, dans
 * functions/index.js (PREMIUM_OUVERT) : sans lui, le micro et la photo
 * repondraient toujours 403, parce qu'ils verifient premium dans
 * Firestore et non dans le navigateur. Les deux doivent porter la meme
 * valeur, et le serveur demande un `firebase deploy`.
 *
 * CE QUE CA COUTE. Le scan, le vocal et la photo appellent Gemini a
 * chaque usage, sur le plan Blaze, sans plafond. Ouverts a tout le
 * monde, ils sont factures a chaque test. Poser une alerte de budget
 * sur le projet AVANT d'ouvrir.
 *
 * CE QUE CA NE CHANGE PAS. Les comptes reellement Premium (paiement
 * ou code) gardent `premium:true` dans Firestore. Refermer
 * l'interrupteur ne leur retire rien.
 */
export const PREMIUM_OUVERT = true;

/** Date indicative de fin de test, affichee nulle part. Sert de repere. */
export const OUVERT_DEPUIS = '2026-08-26';
