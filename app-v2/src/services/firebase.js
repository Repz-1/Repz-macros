import { initializeApp } from 'firebase/app';
import {
  getAuth, onAuthStateChanged,
  signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut,
  signInWithCustomToken, updateProfile,
  GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult,
} from 'firebase/auth';
import { normPseudo, jetonParPseudo, reserverPseudo } from './pseudo.js';
import { signal, computed } from '@preact/signals';

// ============================================================
// FIREBASE v2 — SDK modulaire (leger, tree-shakable).
// MEME projet et MEMES comptes que le site actuel : un utilisateur
// existant se connecte avec ses identifiants habituels.
// ============================================================

const app = initializeApp({
  apiKey: 'AIzaSyAN07MM-t2wIPSwoo0shrV1OfMfIDC-Z0I',
  authDomain: 'repz-baf60.firebaseapp.com',
  projectId: 'repz-baf60',
  storageBucket: 'repz-baf60.firebasestorage.app',
  messagingSenderId: '403252293048',
  appId: '1:403252293048:web:e7db6aed4ba92f0ebfb34d',
});

export const auth = getAuth(app);

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

onAuthStateChanged(auth, (u) => {
  utilisateur.value = u;
  authPrete.value = true;
});

// --- Actions ---
/**
 * Connexion par identifiant : e-mail OU nom d'utilisateur.
 * Regle reprise de la v1 : un identifiant sans arobase est traite
 * comme un pseudo, resolu cote serveur (l'e-mail ne sort jamais).
 */
export async function connexion(identifiant, mdp) {
  const id = String(identifiant || '').trim();
  if (id.includes('@')) return signInWithEmailAndPassword(auth, id, mdp);
  const jeton = await jetonParPseudo(normPseudo(id), mdp);
  return signInWithCustomToken(auth, jeton);
}

function memoriserPrenom(user) {
  try {
    const prenom = (user.displayName || '').split(' ')[0] || '';
    if (prenom) localStorage.setItem('repz_firstName', prenom);
  } catch (e) {}
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
 * Inscription : e-mail + nom d'utilisateur + mot de passe.
 * Le pseudo est reserve cote serveur juste apres la creation du
 * compte. Si la reservation echoue (pseudo pris entre-temps), le
 * compte est supprime : pas de compte orphelin sans pseudo. Meme
 * enchainement qu'en v1 (index.html).
 */
export async function inscription(email, mdp, pseudo) {
  const cred = await createUserWithEmailAndPassword(auth, String(email).trim(), mdp);
  try {
    await reserverPseudo(cred.user, normPseudo(pseudo));
  } catch (e) {
    try { await cred.user.delete(); } catch (e2) {}
    throw { code: e.message === 'pris' ? 'pseudo/pris' : 'pseudo/invalide' };
  }
  try { await updateProfile(cred.user, { displayName: normPseudo(pseudo) }); } catch (e) {}
  try { localStorage.setItem('repz_firstName', normPseudo(pseudo)); } catch (e) {}
  return cred;
}

export async function deconnexion() {
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
  };
  return messages[code] || 'Erreur de connexion, réessaie';
}
