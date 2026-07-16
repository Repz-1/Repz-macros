import { signal, computed, effect } from '@preact/signals';
import { macrosOf } from '../data/aliments.js';

// ============================================================
// STORE DU JOURNAL v2
// - repas      : liste des repas du jour (source de verite)
// - objectifs  : kcal & macros cibles
// - totauxJour : derive automatiquement de repas
// - persistance localStorage 'belfit_v2_journal' (cle separee de
//   la v1 : le chantier ne touche jamais aux donnees du site live)
// ============================================================

const CLE_STOCKAGE = 'belfit_v2_journal';

const DEFAUTS = {
  objectifs: { kcal: 4300, prot: 217, carbs: 538, lip: 96 },
  repas: [
    { id: 1, nom: 'Petit déjeuner', type: 'repas', ings: [], ouvert: false },
    { id: 2, nom: 'Déjeuner',       type: 'repas', ings: [], ouvert: false },
    { id: 3, nom: 'Dîner',          type: 'repas', ings: [], ouvert: false },
  ],
};

function charger() {
  try {
    const brut = localStorage.getItem(CLE_STOCKAGE);
    if (brut) return JSON.parse(brut);
  } catch (e) { /* stockage corrompu -> defauts */ }
  return structuredClone(DEFAUTS);
}

const etat = charger();

export const repas = signal(etat.repas);
export const objectifs = signal(etat.objectifs);

// Sauvegarde automatique : des qu'un signal change, on persiste.
effect(() => {
  const instantane = { repas: repas.value, objectifs: objectifs.value };
  try { localStorage.setItem(CLE_STOCKAGE, JSON.stringify(instantane)); } catch (e) {}
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
}
