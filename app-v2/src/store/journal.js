import { signal, computed } from '@preact/signals';

// ============================================================
// STORE DU JOURNAL — le coeur de la reactivite.
//
// Un signal = une variable qui previent l'ecran quand elle change.
// Un computed = une valeur DERIVEE d'autres signaux, recalculee
// automatiquement (ex: les totaux d'un repas).
//
// Demo : un mini-repas. La vraie DB et les vrais repas arriveront
// a l'etape suivante — ici on prouve juste que la mecanique marche.
// ============================================================

export const ingredients = signal([
  { id: 1, nom: 'Avoine',   portion: 70,  kcal100: 380, prot100: 13,  carbs100: 66, lip100: 8 },
  { id: 2, nom: 'Whey Iso', portion: 25,  kcal100: 360, prot100: 92,  carbs100: 4,  lip100: 0 },
]);

// Les totaux se RECALCULENT SEULS des qu'un ingredient change.
// C'est ca qui rend impossible le bug "en-tete fige a 626 kcal" :
// il n'y a plus personne a prevenir, tout le monde est abonne.
export const totaux = computed(() => {
  let kcal = 0, prot = 0, carbs = 0, lip = 0;
  for (const ing of ingredients.value) {
    const f = ing.portion / 100;
    kcal  += ing.kcal100  * f;
    prot  += ing.prot100  * f;
    carbs += ing.carbs100 * f;
    lip   += ing.lip100   * f;
  }
  return { kcal, prot, carbs, lip };
});

// La seule "action" : modifier une portion. Pas de dispatch, pas de reducer.
export function setPortion(id, portion) {
  ingredients.value = ingredients.value.map(ing =>
    ing.id === id ? { ...ing, portion: parseFloat(portion) || 0 } : ing
  );
}
