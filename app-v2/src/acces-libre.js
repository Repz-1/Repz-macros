// ============================================================
// ACCES LIBRE — CONTOURNEMENT TEMPORAIRE DE LA CONNEXION
//
// Demande de Raci le 10/08 : « desactive la connexion par mot de
// passe jusqu'a nouvel ordre, j'ai besoin d'acceder momentanement
// sans passer par la page de connexion ».
//
// CE QUE CA FAIT
// Quand ACCES_LIBRE vaut true, l'application n'affiche plus l'ecran
// de connexion : elle ouvre une SESSION ANONYME Firebase et entre
// directement. La session anonyme n'est pas un contournement de la
// securite, c'est une vraie authentification sans mot de passe :
// Firebase delivre un jeton, les regles Firestore sont satisfaites,
// et tout fonctionne — journal, poids, seances, synchronisation.
//
// CE QUE CA NE FAIT PAS
// Ce n'est PAS le compte de Raci. Un compte anonyme a son propre uid
// et son propre document : le journal s'ouvre VIDE. Pour retrouver
// ses donnees, il faut se connecter une fois avec son mot de passe ;
// la session tient ensuite toute seule (persistance IndexedDB).
//
// POURQUOI PAS UNE SIMPLE SUPPRESSION DE L'ECRAN
// Les regles Firestore exigent request.auth != null sur chaque
// lecture et chaque ecriture. Sans session, l'interface s'afficherait
// mais aucune donnee ne se chargerait et rien ne s'enregistrerait :
// une coquille.
//
// CE QUE CA COUTE, TANT QUE C'EST ACTIF
// belfit.be/v2/ est public. Chaque visiteur entre sans compte et
// cree un document Firestore anonyme. Cela annule momentanement la
// decision produit « compte obligatoire, questionnaire avant
// inscription ». C'est pourquoi une banniere reste affichee en haut
// de l'ecran et pourquoi la regle R15 de tools/audit.mjs ECHOUE tant
// que le drapeau est a true : l'audit restera rouge jusqu'au nouvel
// ordre, pour que ceci ne parte jamais en production par oubli.
//
// PREALABLE COTE FIREBASE (a faire depuis le PC, une seule fois)
//   Console Firebase -> projet repz-baf60 -> Authentication ->
//   Sign-in method -> Anonymous -> Enable.
// Sans cette case, l'ouverture de session echoue et l'ecran de
// connexion revient, avec le message d'erreur affiche.
//
// POUR DESACTIVER : repasser ACCES_LIBRE a false. Rien d'autre.
// ============================================================
export const ACCES_LIBRE = true;
