import { auth } from './firebase.js';
import { initializeApp, getApps } from 'firebase/app';

/* Firestore pese 170 Ko gzip : importe en statique ici, il entrait
   dans le graphe de demarrage via Courses/Scanner/SeanceTracker et
   retardait le premier affichage de toute l'app. On le charge donc
   a la premiere lecture/ecriture cloud — le local-first ne l'attend
   jamais : localStorage repond d'abord dans tous les cas. */
let _fsPromesse = null;
function firestore() {
  if (!_fsPromesse) {
    _fsPromesse = import('firebase/firestore').then((fs) => {
      const db = fs.getFirestore(getApps()[0]);
      // Cache hors-ligne natif ; echec silencieux possible (multi-onglets)
      fs.enableIndexedDbPersistence(db).catch(() => {});
      return { fs, db };
    });
  }
  return _fsPromesse;
}

// ============================================================
// SYNC v2 — local-first.
// - Ecriture : localStorage immediat, puis Firestore en arriere-plan
//   (debounce 2s pour grouper les frappes rapides).
// - Lecture : Firestore au demarrage, fallback local si hors-ligne.
// - Conflits : le plus recent gagne (champ ts).
// - Les donnees v2 vivent dans users/{uid}.v2Data (champ dedie :
//   n'ecrase JAMAIS les donnees du site actuel appData/premium/etc).
// ============================================================

let timerEnvoi = null;
// Etat complet en memoire : les differents stores (journal, entrainement...)
// sauvegardent chacun LEURS champs ; on fusionne ici pour ne jamais
// ecraser les champs des autres.
let etatComplet = {};
// A quel compte appartient `etatComplet`. Au changement de compte il
// faut repartir de zero : sans ca, les donnees du precedent seraient
// reecrites dans le document du suivant.
let uidEtat = null;

function cleLocale(uid) {
  return `belfit_v2_journal_${uid}`;
}

// L'invite n'a pas de compte : pas de cloud, uniquement le local
const UID_INVITE = '__invite__';

// ---- Lecture au demarrage : cloud d'abord, local en secours ----
export async function chargerDonnees(uid) {
  if (uid !== uidEtat) { etatComplet = {}; uidEtat = uid; }
  const localBrut = localStorage.getItem(cleLocale(uid));
  const local = localBrut ? JSON.parse(localBrut) : null;
  if (uid === UID_INVITE) { etatComplet = { ...(local || {}), ...etatComplet }; return local; }
  try {
    const { fs, db } = await firestore();
    const snap = await fs.getDoc(fs.doc(db, 'users', uid));
    const cloud = snap.exists() && snap.data().v2Data ? snap.data().v2Data : null;
    let resultat;
    if (cloud && local) {
      // Conflit : le plus recent gagne
      resultat = (cloud.ts || 0) >= (local.ts || 0) ? cloud : local;
    } else {
      resultat = cloud || local || null;
    }
    // Aucune donnee v2 : premier passage d'un utilisateur v1 -> on convertit
    // ses donnees existantes (lecture seule sur v1, rien n'est efface).
    if (!resultat) {
      const { migrerSiNecessaire } = await import('./migration.js');
      const migre = await migrerSiNecessaire(uid);
      if (migre) {
        resultat = migre;
        try { localStorage.setItem(cleLocale(uid), JSON.stringify(migre)); } catch (e) {}
        fs.setDoc(fs.doc(db, 'users', uid), { v2Data: migre }, { merge: true }).catch(() => {});
      }
    }
    etatComplet = { ...(resultat || {}), ...etatComplet };
    return resultat;
  } catch (e) {
    // Hors-ligne ou erreur reseau -> copie locale
    etatComplet = { ...(local || {}), ...etatComplet };
    return local || null;
  }
}

// ---- Ecriture : local immediat + cloud differe ----
export function sauvegarder(uid, champsPartiels) {
  // Fusion : chaque store n'ecrit que ses champs, sans toucher aux autres
  etatComplet = { ...etatComplet, ...champsPartiels };
  const instantane = { ...etatComplet, ts: Date.now() };
  try { localStorage.setItem(cleLocale(uid), JSON.stringify(instantane)); } catch (e) {}
  if (uid === UID_INVITE) return; // pas de cloud pour un invite
  // Debounce : on n'envoie au cloud qu'apres 2s de calme (groupe les frappes)
  clearTimeout(timerEnvoi);
  timerEnvoi = setTimeout(() => {
    firestore().then(({ fs, db }) =>
      fs.setDoc(fs.doc(db, 'users', uid), { v2Data: instantane }, { merge: true })
    ).catch(() => {/* hors-ligne : Firestore rejouera a la reconnexion */});
  }, 2000);
}
