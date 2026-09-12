// ============================================================
// CALCUL DES BESOINS (TDEE) — formules reprises A L'IDENTIQUE d'app.html.
// Aucune formule reinventee : Mifflin-St Jeor (ou Katch-McArdle si %MG),
// facteur d'activite = base quotidienne + jours d'entrainement x intensite,
// puis ajustement objectif (prise / seche / maintien).
// ============================================================

export function calculerBesoins({ sexe, age, poids, taille, masseGrasse, activiteBase, joursEntrainement, intensiteEntrainement, ajustement }) {
  let bmr, lbm = null;

  // Si %masse grasse valide -> Katch-McArdle (plus precis), sinon Mifflin-St Jeor
  if (!isNaN(masseGrasse) && masseGrasse > 0 && masseGrasse < 70) {
    lbm = poids * (1 - masseGrasse / 100);
    bmr = 370 + 21.6 * lbm;
  } else {
    bmr = 10 * poids + 6.25 * taille - 5 * age + (sexe === 'h' ? 5 : -161);
  }

  // Multiplicateur d'activite, plafonne a 2.2 comme dans l'app d'origine
  let mult = activiteBase + joursEntrainement * intensiteEntrainement;
  if (mult > 2.2) mult = 2.2;

  const tdee = bmr * mult;
  const cible = Math.round(tdee + ajustement);

  // Macros : proteines selon masse maigre si dispo, sinon poids ; lipides 25% ; glucides = reste
  const prot = Math.round(lbm ? lbm * 2.4 : poids * 2.2);
  const lip = Math.round((cible * 0.25) / 9);
  const carbs = Math.max(0, Math.round((cible - prot * 4 - lip * 9) / 4));

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    kcal: cible,
    prot, carbs, lip,
  };
}

// Options d'activite quotidienne (hors sport)
export const NIVEAUX_ACTIVITE = [
  { val: 1.2,  label: 'Sédentaire (bureau, peu de marche)' },
  { val: 1.3,  label: 'Légèrement actif' },
  { val: 1.45, label: 'Actif (debout, marche régulière)' },
  { val: 1.6,  label: 'Très actif (travail physique)' },
];

/**
 * Intensite d'une seance, en points de multiplicateur par seance.
 *
 * Raci, 9/09 : « je demanderais s'il fait du sport et la frequence, et
 * ainsi calculer en fonction de tous ces parametres ». Les deux
 * variables existaient deja — joursEntrainement et
 * intensiteEntrainement — mais elles etaient enterrees dans les
 * options avancees, avec une intensite figee a 0,03 que personne ne
 * voyait. Une seance de musculation d'une heure et un footing de
 * trente minutes ne coutent pas la meme chose : on le demande.
 *
 * Les valeurs encadrent celle d'origine (0,03) plutot que de la
 * remplacer : le calcul d'avant tombe exactement sur « Modérée ».
 */
export const INTENSITES = [
  { val: 0.02, label: 'Légère — cardio doux, 30 min' },
  { val: 0.03, label: 'Modérée — muscu ou cardio, 1 h' },
  { val: 0.045, label: 'Intense — lourd ou long, 1 h 30' },
];

// Ajustements d'objectif (kcal/jour ajoutees ou retirees au TDEE)
export const OBJECTIFS = [
  { val: 500,  label: 'Prise de masse (+500)' },
  { val: 300,  label: 'Prise propre (+300)' },
  { val: 0,    label: 'Maintien' },
  { val: -300, label: 'Sèche légère (−300)' },
  { val: -500, label: 'Sèche (−500)' },
];
