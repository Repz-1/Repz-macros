import { signal, computed, effect } from '@preact/signals';
import { macrosOf } from '../data/aliments.js';
import { identite } from '../services/firebase.js';
import { chargerDonnees, sauvegarder } from '../services/sync.js';

// ============================================================
// STORE DU JOURNAL v2
// - repas      : liste des repas du jour (source de verite)
// - objectifs  : kcal & macros cibles
// - totauxJour : derive automatiquement de repas
// - persistance localStorage 'belfit_v2_journal' (cle separee de
//   la v1 : le chantier ne touche jamais aux donnees du site live)
// ============================================================

const DEFAUTS = {
  eau: 0, // litres bus aujourd'hui
  objectifs: { kcal: 4300, prot: 217, carbs: 538, lip: 96 },
  repas: [
    { id: 1, nom: 'Petit déjeuner', type: 'repas', cle: 'pdej',  fixe: true, ings: [], ouvert: false },
    { id: 2, nom: 'Déjeuner',       type: 'repas', cle: 'dej',   fixe: true, ings: [], ouvert: false },
    { id: 3, nom: 'Dîner',          type: 'repas', cle: 'diner', fixe: true, ings: [], ouvert: false },
    { id: 4, nom: 'Collations',     type: 'collation', cle: 'snack', fixe: true, ings: [], ouvert: false },
  ],
};

export const repas = signal(structuredClone(DEFAUTS.repas));
export const objectifs = signal(structuredClone(DEFAUTS.objectifs));
export const eau = signal(0);
export const donneesPretes = signal(false);

// --- Chargement par compte : quand l'utilisateur change (connexion),
// on charge SES donnees (cloud d'abord, local en secours). ---
let uidCharge = null;
effect(() => {
  const u = identite.value;
  if (!u) { uidCharge = null; donneesPretes.value = false; return; }
  if (u === uidCharge) return;
  uidCharge = u;
  donneesPretes.value = false;
  chargerDonnees(u).then(d => {
    if (uidCharge !== u) return; // changement de compte entre-temps
    repas.value = migrerRepas(d && d.repas ? d.repas : structuredClone(DEFAUTS.repas));
    objectifs.value = d && d.objectifs ? d.objectifs : structuredClone(DEFAUTS.objectifs);
    eau.value = d && typeof d.eau === 'number' ? d.eau : 0;
    donneesPretes.value = true;
  });
});


// ============================================================
// MIGRATION DES DONNEES EXISTANTES
// Les repas enregistres avant l'ajout des cles n'en ont pas :
// sans cle, ni illustration ni fourchette recommandee. On les
// rattache par leur nom, et on complete les repas fixes absents.
// ============================================================
const CLE_PAR_NOM = {
  'petit dejeuner': 'pdej', 'petit déjeuner': 'pdej', 'breakfast': 'pdej', 'ontbijt': 'pdej',
  'dejeuner': 'dej', 'déjeuner': 'dej', 'lunch': 'dej',
  'diner': 'diner', 'dîner': 'diner', 'dinner': 'diner', 'avondeten': 'diner',
  'snacks': 'snack', 'collations': 'snack', 'collation': 'snack', 'tussendoortjes': 'snack',
};

function migrerRepas(liste) {
  const sortie = liste.map(r => {
    if (r.cle) return r;
    const cle = CLE_PAR_NOM[(r.nom || '').trim().toLowerCase()];
    return cle ? { ...r, cle, fixe: true } : r;
  });

  // Les quatre repas fixes doivent exister : un ancien enregistrement
  // n'en contenait que trois.
  const presentes = new Set(sortie.map(r => r.cle).filter(Boolean));
  DEFAUTS.repas.forEach(def => {
    if (def.cle && !presentes.has(def.cle)) {
      const id = Math.max(0, ...sortie.map(r => r.id || 0)) + 1;
      sortie.push({ ...structuredClone(def), id });
    }
  });

  // Ordre de la reference : petit dejeuner, dejeuner, diner, collations,
  // puis les repas libres ajoutes par l'utilisateur.
  const rang = { pdej: 0, dej: 1, diner: 2, snack: 3 };
  return sortie.sort((a, b) => (rang[a.cle] ?? 99) - (rang[b.cle] ?? 99));
}

// --- Sauvegarde automatique par compte : local immediat + cloud differe. ---
effect(() => {
  const instantane = { repas: repas.value, objectifs: objectifs.value, eau: eau.value };
  const u = identite.value;
  if (!u || !donneesPretes.value) return; // ne pas ecraser avant le chargement
  sauvegarder(u, instantane);
});

// ---------- Derives ----------

export function totauxRepas(r) {
  const t = { kcal: 0, prot: 0, carbs: 0, lip: 0 };
  for (const ing of r.ings) {
    const m = macrosOf(ing);
    t.kcal += m.kcal; t.prot += m.prot; t.carbs += m.carbs; t.lip += m.lip;
  }
  return t;
}

export const totauxJour = computed(() => {
  const t = { kcal: 0, prot: 0, carbs: 0, lip: 0 };
  for (const r of repas.value) {
    const tr = totauxRepas(r);
    t.kcal += tr.kcal; t.prot += tr.prot; t.carbs += tr.carbs; t.lip += tr.lip;
  }
  return t;
});

export const kcalRestantes = computed(() =>
  Math.max(0, objectifs.value.kcal - totauxJour.value.kcal)
);

// ---------- Actions ----------
// Chaque action remplace repas.value par une NOUVELLE liste :
// ce remplacement declenche la reactivite. Aucune mise a jour
// manuelle de l'ecran n'existe nulle part.

let prochainId = Date.now();

export function setPortion(repasId, ingId, portion) {
  repas.value = repas.value.map(r =>
    r.id !== repasId ? r : {
      ...r,
      ings: r.ings.map(i => i.id !== ingId ? i : { ...i, portion: parseFloat(portion) || 0 })
    }
  );
}

export function ajouterIngredient(repasId, name, portion = 100) {
  repas.value = repas.value.map(r =>
    r.id !== repasId ? r : { ...r, ings: [...r.ings, { id: ++prochainId, name, portion }] }
  );
}

/**
 * Ajoute un plat enregistre a un repas, en portions.
 * Chaque ingredient entre au prorata : le journal reste une liste
 * d'aliments reels, donc les macros et la liste de courses restent
 * justes sans traitement particulier.
 */
export function ajouterPlat(repasId, plat, nbPortions = 1) {
  const part = nbPortions / Math.max(1, plat.portions || 1);
  const lignes = (plat.ings || []).map(i => ({
    id: ++prochainId,
    name: i.name,
    portion: Math.round((i.portion || 0) * part),
    plat: plat.nom,           // trace l'origine, utile a l'affichage
  }));
  repas.value = repas.value.map(r =>
    r.id !== repasId ? r : { ...r, ings: [...r.ings, ...lignes] }
  );
}

export function supprimerIngredient(repasId, ingId) {
  repas.value = repas.value.map(r =>
    r.id !== repasId ? r : { ...r, ings: r.ings.filter(i => i.id !== ingId) }
  );
}

export function ajouterRepas(type) {
  const noms = { repas: 'Repas', collation: 'Collation', boisson: 'Boisson' };
  const nb = repas.value.filter(r => r.type === type).length + 1;
  repas.value = [...repas.value, {
    id: ++prochainId,
    nom: `${noms[type] || 'Repas'} ${nb}`,
    type,
    ings: [],
    ouvert: true,
  }];
}

export function supprimerRepas(repasId) {
  repas.value = repas.value.filter(r => r.id !== repasId);
}

export function renommerRepas(repasId, nom) {
  repas.value = repas.value.map(r => r.id !== repasId ? r : { ...r, nom });
}

export function basculerRepas(repasId) {
  repas.value = repas.value.map(r => r.id !== repasId ? r : { ...r, ouvert: !r.ouvert });
}

export function nouvelleJournee() {
  repas.value = structuredClone(DEFAUTS.repas);
  eau.value = 0;
}

export function ajouterEau(litres) {
  // Precision au millieme : le pas v1 est de 75 ml (0,075 L).
  eau.value = Math.max(0, Math.round((eau.value + litres) * 1000) / 1000);
}

export function resetEau() {
  eau.value = 0;
}

export function setObjectifs(nouveaux) {
  objectifs.value = { ...objectifs.value, ...nouveaux };
}

// Part de l'objectif quotidien attribuee a chaque repas fixe.
// Valeurs reprises de la reference.
const PART_REPAS = {
  pdej:  [0.20, 0.30],
  dej:   [0.30, 0.40],
  diner: [0.30, 0.40],
  snack: [0.05, 0.10],
};

/** Fourchette recommandee d'un repas, ou null si le repas est libre. */
export function fourchetteRepas(cle) {
  const part = PART_REPAS[cle];
  if (!part) return null;
  const g = objectifs.value.kcal || 0;
  return { min: Math.round(g * part[0]), max: Math.round(g * part[1]) };
}
