import { initializeApp } from 'firebase/app';
import {
  getAuth, onAuthStateChanged,
  signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut,
  GoogleAuthProvider, signInWithPopup,
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
});

// --- Actions ---
export async function connexion(email, mdp) {
  return signInWithEmailAndPassword(auth, email, mdp);
}

export async function connexionGoogle() {
  // Meme flux que la v1 : popup Google avec choix du compte.
  // Le prenom sert a l'accueil personnalise, comme en v1.
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const cred = await signInWithPopup(auth, provider);
  try {
    const prenom = (cred.user.displayName || '').split(' ')[0] || '';
    if (prenom) localStorage.setItem('repz_firstName', prenom);
  } catch (e) {}
  quitterInvite();
  return cred.user;
}

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
