import { initializeApp } from 'firebase/app';
import {
  getAuth, onAuthStateChanged,
  signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut,
  GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult,
} from 'firebase/auth';
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

// Mode invite : essai sans compte. Les donnees restent LOCALES
// (aucune sync cloud) jusqu'a la creation d'un vrai compte.
const CLE_INVITE = 'belfit_v2_invite';
export const invite = signal(localStorage.getItem(CLE_INVITE) === '1');

export function entrerInvite() {
  try { localStorage.setItem(CLE_INVITE, '1'); } catch (e) {}
  invite.value = true;
}
export function quitterInvite() {
  try { localStorage.removeItem(CLE_INVITE); } catch (e) {}
  invite.value = false;
}

// Identite courante : uid du compte, '__invite__' si mode invite, sinon null.
// Les stores s'y branchent : le meme code marche pour les deux cas.
export const identite = computed(() =>
  utilisateur.value ? utilisateur.value.uid : (invite.value ? '__invite__' : null)
);

onAuthStateChanged(auth, (u) => {
  utilisateur.value = u;
  authPrete.value = true;
  // Un vrai compte prend le dessus sur l'essai sans compte, quelle que
  // soit la voie empruntee (e-mail, Google, Apple, session retrouvee).
  // Sans cela, le bandeau « Mode decouverte » restait affiche a un
  // utilisateur pourtant connecte.
  if (u && invite.value) quitterInvite();
});

// --- Actions ---
export async function connexion(email, mdp) {
  return signInWithEmailAndPassword(auth, email, mdp);
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
    quitterInvite();
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
  if (cred && cred.user) { memoriserPrenom(cred.user); quitterInvite(); }
}).catch(() => {});

export async function inscription(email, mdp) {
  return createUserWithEmailAndPassword(auth, email, mdp);
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
  };
  return messages[code] || 'Erreur de connexion, réessaie';
}
