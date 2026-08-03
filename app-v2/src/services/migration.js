import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { getApps } from 'firebase/app';
import { rayonDe } from '../data/rayons.js';

// ============================================================
// MIGRATION v1 -> v2
// Convertit les donnees de l'app actuelle (champ appData, JSON
// stringifie dans users/{uid}) vers le format v2 (champ v2Data).
//
// Regles de securite absolues :
//  - LECTURE SEULE sur appData : on n'ecrit ni ne supprime jamais
//    les donnees v1. En cas de rollback, elles sont intactes.
//  - Ne s'execute QUE si l'utilisateur n'a pas deja des donnees v2
//    (jamais d'ecrasement d'un journal v2 existant).
//  - Chaque bloc est converti isolement : si l'un echoue, les
//    autres passent quand meme.
// ============================================================

const FORMAT_V1 = {
  // v1 : recipes = [{id, name, mult, ings:[{id, name, portion}], fixed, fixedKey}]
  // v2 : repas   = [{id, nom, type, ings:[{id, name, portion}], ouvert}]
  typeDepuisCle(fixedKey, nom) {
    const n = (nom || '').toLowerCase();
    if (fixedKey === 'snack' || n.includes('collation') || n.includes('snack')) return 'collation';
    if (n.includes('boisson') || n.includes('shake')) return 'boisson';
    return 'repas';
  },
};

function convertirV1versV2(v1) {
  const out = {};

  // --- Repas du jour ---
  try {
    if (Array.isArray(v1.recipes)) {
      out.repas = v1.recipes.map(r => ({
        id: r.id,
        nom: r.name || 'Repas',
        type: FORMAT_V1.typeDepuisCle(r.fixedKey, r.name),
        ings: Array.isArray(r.ings)
          ? r.ings.map(i => ({ id: i.id, name: i.name, portion: parseFloat(i.portion) || 0 }))
          : [],
        ouvert: false,
      }));
    }
  } catch (e) { /* bloc ignore */ }

  // --- Objectifs ---
  try {
    if (v1.goal) {
      out.objectifs = {
        kcal: Math.round(v1.goal.kcal) || 2000,
        prot: Math.round(v1.goal.prot ?? v1.goal.proteines) || 150,
        carbs: Math.round(v1.goal.carbs ?? v1.goal.glucides) || 200,
        lip: Math.round(v1.goal.lip ?? v1.goal.lipides) || 70,
      };
    }
  } catch (e) {}

  // --- Pesees ---
  try {
    if (Array.isArray(v1.weightLog)) {
      out.weightLog = v1.weightLog
        .filter(w => w && w.iso)
        .map(w => ({ iso: w.iso, date: w.date || '', weight: parseFloat(w.weight ?? w.kg ?? w.poids) || 0 }))
        .sort((a, b) => a.iso.localeCompare(b.iso));
    }
  } catch (e) {}

  // --- Historique des journees -> histoJours ---
  try {
    if (Array.isArray(v1.history)) {
      const h = {};
      v1.history.forEach(j => {
        if (!j || !j.iso) return;
        h[j.iso] = {
          kcal: Math.round(j.kcal || 0), prot: Math.round(j.prot || 0),
          carbs: Math.round(j.carbs || 0), lip: Math.round(j.lip || 0),
        };
      });
      out.histoJours = h;
    }
  } catch (e) {}

  // --- Aliments perso (scannes) : v1 = tableau, v2 = objet indexe par nom ---
  try {
    const cf = v1.customFoods;
    if (Array.isArray(cf)) {
      const obj = {};
      cf.forEach(f => {
        if (!f || !f.name) return;
        obj[f.name] = {
          kcal: f.kcal || 0, prot: f.prot || 0,
          carbs: f.carbs || 0, lip: f.lip || 0,
          ...(f.unit ? { unit: f.unit, unitLabel: f.unitLabel } : {}),
        };
      });
      out.customFoods = obj;
    } else if (cf && typeof cf === 'object') {
      out.customFoods = cf;
    }
  } catch (e) {}

  // --- Calendrier des muscles (stocke a part en v1) ---
  try {
    if (v1.muscleLog && typeof v1.muscleLog === 'object') out.muscleLog = v1.muscleLog;
  } catch (e) {}

  return out;
}

// Recupere appData depuis Firestore et le convertit. Ne renvoie rien
// si l'utilisateur a deja des donnees v2 (protection anti-ecrasement).
export async function migrerSiNecessaire(uid) {
  try {
    const db = getFirestore(getApps()[0]);
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    const d = snap.data();

    // Deja migre / deja des donnees v2 -> on ne touche a rien
    if (d.v2Data && (d.v2Data.repas || d.v2Data.objectifs)) return null;
    if (!d.appData) return null;

    const v1 = typeof d.appData === 'string' ? JSON.parse(d.appData) : d.appData;
    const converti = convertirV1versV2(v1);
    // muscleLog vit a la racine du document en v1
    if (d.muscleLog) converti.muscleLog = d.muscleLog;

    converti.migreDepuisV1 = true;
    converti.ts = Date.now();
    return converti;
  } catch (e) {
    console.warn('Migration v1->v2 impossible', e);
    return null;
  }
}

// ============================================================
// RATTRAPAGE DU CALENDRIER DES MUSCLES
//
// migrerSiNecessaire() ne s'execute que si le compte n'a AUCUNE
// donnee v2. Des que la v2 a ecrit les premiers repas, elle ne part
// plus. Or le calendrier des muscles ne vit pas dans appData : il est
// a la racine du document, dans users/{uid}.muscleLog. Resultat, tout
// utilisateur passe a la v2 avant ce correctif a garde un historique
// v1 present dans Firestore mais jamais importe — sa page
// S'entrainer affiche des mois vides alors que la donnee existe.
//
// Cette fonction repare ce cas precis, et seulement lui :
// - elle ne LIT que users/{uid}.muscleLog ;
// - elle n'ecrase JAMAIS un jour deja present en v2 ;
// - elle ne supprime rien, ni en v1 ni en v2.
// Elle renvoie le journal fusionne, ou null s'il n'y a rien a faire.
// ============================================================
export async function recupererMuscleLogV1(uid, logV2) {
  try {
    const db = getFirestore(getApps()[0]);
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    // Trois sources possibles, fusionnees dans cet ordre de priorite
    // croissante : appData (le plus ancien), la racine du document
    // (ce que la v1 poussait), puis le localStorage du telephone
    // (la v1 y ecrivait en premier, donc c'est souvent le plus
    // complet — et le seul a survivre si le cloud a ete tronque).
    const d = snap.data();
    let appData = null;
    try {
      const brut = typeof d.appData === 'string' ? JSON.parse(d.appData) : d.appData;
      appData = brut && brut.muscleLog;
    } catch (e) {}
    let local = null;
    try { local = JSON.parse(localStorage.getItem('repz_muscleLog') || 'null'); } catch (e) {}
    const v1 = Object.assign({}, appData || {}, d.muscleLog || {}, local || {});
    if (!Object.keys(v1).length) return null;

    const dejaLa = logV2 && typeof logV2 === 'object' ? logV2 : {};
    const fusion = { ...dejaLa };
    let repris = 0;
    for (const iso of Object.keys(v1)) {
      // Un jour deja note en v2 fait foi : il est plus recent.
      if (fusion[iso]) continue;
      const jour = v1[iso];
      const liste = Array.isArray(jour) ? jour
        : (jour && typeof jour === 'object') ? Object.values(jour) : null;
      if (!liste || !liste.length) continue;
      fusion[iso] = liste.filter(v => typeof v === 'string');
      repris++;
    }
    return repris ? fusion : null;
  } catch (e) {
    return null;
  }
}
