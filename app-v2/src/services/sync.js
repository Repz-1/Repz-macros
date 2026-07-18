import { getFirestore, doc, getDoc, setDoc, enableIndexedDbPersistence } from 'firebase/firestore';
import { auth } from './firebase.js';
import { initializeApp, getApps } from 'firebase/app';

// ============================================================
// SYNC v2 — local-first.
// - Ecriture : localStorage immediat, puis Firestore en arriere-plan
//   (debounce 2s pour grouper les frappes rapides).
// - Lecture : Firestore au demarrage, fallback local si hors-ligne.
// - Conflits : le plus recent gagne (champ ts).
// - Les donnees v2 vivent dans users/{uid}.v2Data (champ dedie :
//   n'ecrase JAMAIS les donnees du site actuel appData/premium/etc).
// ============================================================

const db = getFirestore(getApps()[0]);

// Persistance hors-ligne native de Firestore (cache IndexedDB).
// Echec silencieux possible (plusieurs onglets ouverts) : pas grave,
// notre localStorage couvre deja le local-first.
enableIndexedDbPersistence(db).catch(() => {});

let timerEnvoi = null;
// Etat complet en memoire : les differents stores (journal, entrainement...)
// sauvegardent chacun LEURS champs ; on fusionne ici pour ne jamais
// ecraser les champs des autres.
let etatComplet = {};

export function cleLocale(uid) {
  return `belfit_v2_journal_${uid}`;
}

// ---- Lecture au demarrage : cloud d'abord, local en secours ----
export async function chargerDonnees(uid) {
  const localBrut = localStorage.getItem(cleLocale(uid));
  const local = localBrut ? JSON.parse(localBrut) : null;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    const cloud = snap.exists() && snap.data().v2Data ? snap.data().v2Data : null;
    let resultat;
    if (cloud && local) {
      // Conflit : le plus recent gagne
      resultat = (cloud.ts || 0) >= (local.ts || 0) ? cloud : local;
    } else {
      resultat = cloud || local || null;
    }
    etatComplet = resultat ? { ...resultat } : {};
    return resultat;
  } catch (e) {
    // Hors-ligne ou erreur reseau -> copie locale
    etatComplet = local ? { ...local } : {};
    return local || null;
  }
}

// ---- Ecriture : local immediat + cloud differe ----
export function sauvegarder(uid, champsPartiels) {
  // Fusion : chaque store n'ecrit que ses champs, sans toucher aux autres
  etatComplet = { ...etatComplet, ...champsPartiels };
  const instantane = { ...etatComplet, ts: Date.now() };
  try { localStorage.setItem(cleLocale(uid), JSON.stringify(instantane)); } catch (e) {}
  // Debounce : on n'envoie au cloud qu'apres 2s de calme (groupe les frappes)
  clearTimeout(timerEnvoi);
  timerEnvoi = setTimeout(() => {
    setDoc(doc(db, 'users', uid), { v2Data: instantane }, { merge: true })
      .catch(() => {/* hors-ligne : Firestore rejouera a la reconnexion */});
  }, 2000);
}
