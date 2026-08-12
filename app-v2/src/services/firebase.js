import { initializeApp } from 'firebase/app';
import {
  initializeAuth, indexedDBLocalPersistence, browserLocalPersistence,
  onAuthStateChanged,
  signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut,
  signInAnonymously,
  updateProfile,
  sendPasswordResetEmail,
  GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult,
} from 'firebase/auth';
import { signal, computed } from '@preact/signals';

// ============================================================
// FIREBASE v2 — SDK modulaire (leger, tree-shakable).
// MEME projet et MEMES comptes que le site actuel : un utilisateur
// existant se connecte avec ses identifiants habituels.
// ============================================================

export const app = initializeApp({
  apiKey: 'AIzaSyAN07MM-t2wIPSwoo0shrV1OfMfIDC-Z0I',
  authDomain: 'repz-baf60.firebaseapp.com',
  projectId: 'repz-baf60',
  storageBucket: 'repz-baf60.firebasestorage.app',
  messagingSenderId: '403252293048',
  appId: '1:403252293048:web:e7db6aed4ba92f0ebfb34d',
});

// getAuth() laissait Firebase choisir seul ou ranger la session. Si
// IndexedDB est indisponible une seule fois — Chrome Android sous
// pression de stockage, onglet restaure, quota atteint — il retombe
// SILENCIEUSEMENT en memoire : la session meurt au rechargement
// suivant, et l'application demande de se reconnecter sans que
// personne se soit deconnecte. On impose donc la chaine, avec
// localStorage en second : il reste un magasin durable, jamais la
// memoire vive.
export const auth = initializeAuth(app, {
  persistence: [indexedDBLocalPersistence, browserLocalPersistence],
});


// --- Signaux d'etat : toute l'app peut reagir a la connexion ---
// utilisateur : null = deconnecte, objet = connecte
// authPrete   : false tant que Firebase n'a pas repondu (evite le flash ecran login)
export const utilisateur = signal(null);
export const authPrete = signal(false);

// Le mode invite a ete retire : on ouvre desormais un compte des le
// depart. Le drapeau des anciennes sessions est purge au chargement
// pour qu'aucun appareil ne reste bloque dans un etat qui n'existe plus.
try { localStorage.removeItem('belfit_v2_invite'); } catch (e) {}

// Identite courante : uid du compte, sinon null.
export const identite = computed(() => utilisateur.value ? utilisateur.value.uid : null);

// Ordre de deconnexion porte par l'URL (venu de la page reglages v1,
// dont la session ne partage pas le meme magasin que la notre) : on
// coupe notre propre session avant toute chose, puis on nettoie l'URL.
try {
  if (new URLSearchParams(window.location.search).get('logout') === '1') {
    signOut(auth).catch(() => {});
    history.replaceState(null, '', window.location.pathname);
  }
} catch (e) { /* URL intouchable : tant pis, l'ecran de connexion suffira */ }

onAuthStateChanged(auth, (u) => {
  utilisateur.value = u;
  authPrete.value = true;
});

// --- Actions ---
/**
 * Connexion par e-mail. La connexion par pseudo a ete abandonnee
 * (decision Raci 25/07) : le prenom suffit, l'inscription est plus
 * courte. Les Cloud Functions du pseudo restent deployees mais ne
 * sont plus appelees.
 */
function memoriserPrenom(user) {
  try {
    const prenom = (user.displayName || '').split(' ')[0] || '';
    if (prenom) localStorage.setItem('repz_firstName', prenom);
  } catch (e) {}
}

export async function connexion(identifiant, mdp) {
  const cred = await signInWithEmailAndPassword(auth, String(identifiant || '').trim(), mdp);
  // Seules l'inscription et Google memorisaient le prenom : apres une
  // simple reconnexion l'en-tete disait « Bonjour » tout court.
  memoriserPrenom(cred.user);
  return cred;
}

export async function connexionGoogle() {
  // Meme flux que la v1 : Google avec choix du compte. Popup d'abord ;
  // si le navigateur mobile la bloque, on bascule en redirection
  // (le resultat est recupere au rechargement, voir ci-dessous).
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    const cred = await signInWithPopup(auth, provider);
    memoriserPrenom(cred.user);
    return cred.user;
  } catch (e) {
    if (e && (e.code === 'auth/popup-blocked' || e.code === 'auth/popup-closed-by-user'
      || e.code === 'auth/operation-not-supported-in-this-environment'
      || e.code === 'auth/cancelled-popup-request')) {
      await signInWithRedirect(auth, provider);
      return null;   // la page va se recharger
    }
    throw e;
  }
}

// Retour de redirection Google : recupere la session au chargement.
getRedirectResult(auth).then(cred => {
  if (cred && cred.user) { memoriserPrenom(cred.user); }
}).catch(() => {});

/**
 * Code de parrainage : tire au sort, sans aucun lien avec le pseudo,
 * le prenom ou l'e-mail — un code ne doit rien reveler de son porteur
 * ni pouvoir etre devine. Alphabet sans caracteres ambigus (ni O/0,
 * ni I/1/L) : le code se dicte a voix haute sans erreur.
 */
function genererCodeParrainage() {
  const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return 'BF-' + code.slice(0, 4) + '-' + code.slice(4);
}

/**
 * Inscription : prenom + e-mail + mot de passe (le pseudo a ete
 * abandonne le 25/07 — moins de champs, moins de friction).
 */
export async function inscription(email, mdp, prenom) {
  const cred = await createUserWithEmailAndPassword(auth, String(email).trim(), mdp);
  // Le prenom sert a s'adresser a la personne (en-tete, page Premium,
  // e-mails du coach) : displayName = prenom, comme en v1.
  const p = String(prenom || '').trim();
  try { await updateProfile(cred.user, { displayName: p }); } catch (e) {}
  try { localStorage.setItem('repz_firstName', p); } catch (e) {}

  // RGPD : preuve du consentement (horodatage + version de la politique),
  // et code de parrainage tire au sort. Non bloquant : un echec reseau
  // ne doit pas priver l'utilisateur du compte qu'il vient de creer.
  try {
    const { getFirestore, doc, setDoc } = await import('firebase/firestore');
    await setDoc(
      doc(getFirestore(app), 'users', cred.user.uid),
      {
        prenom: p,
        consentRGPD: { accepte: true, date: new Date().toISOString(), version: '2026-07' },
        mon_code_parrainage: genererCodeParrainage(),
      },
      { merge: true }
    );
  } catch (e) { /* non bloquant */ }

  return cred;
}

/**
 * Session anonyme — contournement temporaire de l'ecran de connexion
 * (voir src/acces-libre.js). Firebase delivre un vrai jeton sans mot
 * de passe : les regles Firestore sont satisfaites et l'application
 * fonctionne entierement, mais sur un compte NEUF, pas celui de
 * l'utilisateur. Necessite « Anonymous » active dans la console.
 */
export async function connexionAnonyme() {
  const cred = await signInAnonymously(auth);
  return cred.user;
}

export async function deconnexion() {
  adresseConfirmee.value = false;
  return signOut(auth);
}

// Messages d'erreur en francais
export function messageErreurAuth(code) {
  const messages = {
    'auth/invalid-email': 'Adresse e-mail invalide',
    'auth/user-not-found': 'Aucun compte avec cet e-mail',
    'auth/wrong-password': 'Mot de passe incorrect',
    'auth/invalid-credential': 'E-mail ou mot de passe incorrect',
    'auth/email-already-in-use': 'Un compte existe déjà avec cet e-mail',
    'auth/weak-password': 'Mot de passe trop court (6 caractères min.)',
    'auth/too-many-requests': 'Trop de tentatives, réessaie dans un moment',
    'auth/network-request-failed': 'Pas de connexion internet',
    // Identifiant sans arobase : la resolution du pseudo a echoue.
    'pseudo/pris': 'Ce nom d\'utilisateur est déjà pris',
    'pseudo/invalide': 'Choisis un nom d\'utilisateur valide et disponible',
    'pseudo/reseau': 'Le serveur ne repond pas. Ton compte n\'a pas ete cree — reessaie dans un instant.',
  };
  return messages[code] || 'Erreur de connexion, réessaie';
}

/**
 * Envoi du lien de reinitialisation — meme chaine qu'en v1 (index.html).
 * On passe d'abord par la Cloud Function : le courriel part alors de
 * belfit.be, aux couleurs de la marque, et renvoie vers notre propre
 * page. Si ce service ne repond pas, Firebase prend le relais : moins
 * beau, mais personne ne reste bloque devant un ecran muet.
 */
export async function envoyerLienReinitialisation(email, lang) {
  const lg = lang || 'fr';
  let envoye = false;
  try {
    const r = await fetch('https://europe-west1-repz-baf60.cloudfunctions.net/mailReinitialisation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, langue: lg }),
    });
    envoye = r.ok;
  } catch (e) { envoye = false; }

  if (!envoye) {
    try { auth.languageCode = lg; } catch (e) {}
    await sendPasswordResetEmail(auth, email);
  }
}

/** Mise en service de la confirmation d'adresse. Les comptes anterieurs
 *  portent tous emailVerified = false, faute d'avoir jamais ete
 *  sollicites : les bloquer reviendrait a mettre dehors l'integralite
 *  des inscrits d'un coup. Ils restent donc acquis. */
const DEBUT_CONFIRMATION = Date.parse('2026-07-24T00:00:00Z');

/** L'adresse reste-t-elle a confirmer ? Les comptes Google arrivent
 *  deja verifies par Google : on ne leur demande rien. */
export function adresseAConfirmer(u) {
  if (!u || u.emailVerified || adresseConfirmee.value) return false;
  const parMdp = (u.providerData || []).some((p) => p.providerId === 'password');
  if (!parMdp) return false;
  const cree = u.metadata && u.metadata.creationTime;
  if (!cree) return false;              // date illisible : on laisse passer
  return Date.parse(cree) >= DEBUT_CONFIRMATION;
}

/** Demande l'envoi du courriel de confirmation. La Cloud Function
 *  exige le jeton de session : personne ne peut declencher un envoi
 *  vers une adresse qui n'est pas la sienne. */
export async function envoyerMailVerification(lang) {
  const u = auth.currentUser;
  if (!u) throw new Error('pas de session');
  const jeton = await u.getIdToken();
  const r = await fetch('https://europe-west1-repz-baf60.cloudfunctions.net/mailVerification', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${jeton}` },
    body: JSON.stringify({ langue: lang || 'fr' }),
  });
  if (r.status === 429) throw new Error('trop_tot');
  if (!r.ok) throw new Error('envoi');
}

/** Confirmation constatee pendant la session. Le SDK garde en memoire
 *  un instantane du compte et ne le remplace pas apres reload() : sans
 *  ce drapeau, l'ecran d'attente resterait affiche indefiniment. */
export const adresseConfirmee = signal(false);

/** Relit l'etat du compte cote serveur. */
export async function rafraichirUtilisateur() {
  const u = auth.currentUser;
  if (!u) return false;
  await u.reload();
  if (auth.currentUser && auth.currentUser.emailVerified) {
    adresseConfirmee.value = true;
    return true;
  }
  return false;
}
