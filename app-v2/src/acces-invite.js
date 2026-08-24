// ============================================================
// ACCES INVITE — ENTREE PROVISOIRE SANS MOT DE PASSE
//
// Demande de Raci le 10/08 : acceder au site en ligne sans mot de
// passe, tout de suite, sans passer par le PC. Il n'a pas besoin de
// ses donnees, seulement de parcourir la version en ligne.
//
// COMMENT
// L'ecran de connexion RESTE en place et reste le chemin par defaut
// (« laisse l'App avec la page connexion »). Il porte simplement un
// lien de plus, « Entrer sans compte », qui ouvre l'application sous
// l'identifiant local `__invite__`.
//
// POURQUOI CET IDENTIFIANT
// services/sync.js le connait deja : chargerDonnees() et
// sauvegarder() court-circuitent Firestore pour lui et travaillent
// uniquement dans localStorage. C'est un reste du mode invite
// supprime en juillet — le chemin de donnees etait toujours la,
// seule l'entree manquait. Rien de neuf n'a donc ete invente, et
// aucune regle Firestore n'est contournee : Firestore n'est jamais
// appele pour cet identifiant.
//
// PAS DE CONSOLE FIREBASE A OUVRIR. C'est ce qui distingue cette
// solution de la session anonyme tentee juste avant, qui exigeait
// d'activer « Anonymous » depuis le PC.
//
// CE QUE CA DONNE
// L'application entiere : journal, encodage, seances, stats,
// programmes. Les donnees vivent dans le navigateur du telephone,
// rien ne monte au cloud, rien n'en descend. Ce n'est pas le compte
// de Raci et ca ne le deviendra pas : se connecter ensuite avec son
// mot de passe rouvre ses vraies donnees sans melange, les cles
// localStorage etant separees par identifiant.
//
// CE QUE CA COUTE, TANT QUE C'EST ACTIF
// belfit.be/v2/ est public : n'importe qui peut entrer sans compte.
// Cela suspend la decision produit « compte obligatoire,
// questionnaire avant inscription ». D'ou la banniere permanente et
// la regle R15 de tools/audit.mjs, qui ECHOUE tant que le drapeau
// est a true : l'audit restera rouge jusqu'au nouvel ordre.
//
// POUR REFERMER : repasser ACCES_INVITE a false. Rien d'autre.
// ============================================================
// Rouvert le 24/08, PROVISOIREMENT, a la demande de Raci : nouvelle
// serie d'essais publics. Pour refermer : repasser a false, rien
// d'autre. Le drapeau commande aussi l'onglet d'ouverture (voir
// ONGLET_VITRINE plus bas).
export const ACCES_INVITE = true;

// Le temps des essais publics, l'application s'ouvre sur S'entrainer
// plutot que sur le Journal : c'est la page que Raci veut montrer en
// premier. Adosse a ACCES_INVITE pour qu'il n'y ait qu'un interrupteur
// a remettre a false — aucun reglage ne peut rester en arriere.
export const ONGLET_VITRINE = ACCES_INVITE ? 'entrainer' : 'journal';

// Identifiant local reconnu par services/sync.js (UID_INVITE).
export const UID_INVITE = '__invite__';
