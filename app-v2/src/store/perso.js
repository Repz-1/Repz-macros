import { signal, effect } from '@preact/signals';
import { identite } from '../services/firebase.js';
import { chargerDonnees, sauvegarder } from '../services/sync.js';
import { DB } from '../data/aliments.js';
import { customFoods } from '../components/Scanner.jsx';

// ============================================================
// FAVORIS ET PLATS ENREGISTRES
//
// Favoris : les aliments qu'on encode tout le temps. Ils remontent
// en tete de la recherche, et s'affichent avant meme de taper.
//
// Plats : une recette pesee une seule fois, a la cuisson, puis
// consommee en portions. Le batch cooking en pratique.
// ============================================================

export const favoris = signal([]);   // noms d'aliments
export const plats = signal([]);     // { id, nom, ings, portions }

let uid = null, pret = false;

effect(() => {
  const u = identite.value;
  if (!u) { uid = null; pret = false; return; }
  if (u === uid) return;
  uid = u; pret = false;
  chargerDonnees(u).then(d => {
    if (uid !== u) return;
    favoris.value = (d && d.favoris) || [];
    plats.value = (d && d.plats) || [];
    pret = true;
  });
});

effect(() => {
  const instantane = { favoris: favoris.value, plats: plats.value };
  const u = identite.value;
  if (!u || !pret) return;   // ne pas ecraser avant le chargement
  sauvegarder(u, instantane);
});

// ---------- Favoris ----------

export function estFavori(nom) {
  return favoris.value.includes(nom);
}

export function basculerFavori(nom) {
  favoris.value = estFavori(nom)
    ? favoris.value.filter(n => n !== nom)
    : [...favoris.value, nom];
}

// ---------- Plats ----------

/** Macros d'un ingredient, quelle que soit sa provenance. */
function macrosIngredient(ing) {
  const d = DB[ing.name] || customFoods.value[ing.name];
  if (!d) return { kcal: 0, prot: 0, carbs: 0, lip: 0 };
  const f = (ing.portion || 0) / 100;
  return {
    kcal: (d.kcal || 0) * f,
    prot: (d.prot || 0) * f,
    carbs: (d.carbs || 0) * f,
    lip: (d.lip || 0) * f,
  };
}

/** Macros du plat entier, tous ingredients confondus. */
export function totauxPlat(plat) {
  return (plat.ings || []).reduce((acc, i) => {
    const m = macrosIngredient(i);
    return {
      kcal: acc.kcal + m.kcal, prot: acc.prot + m.prot,
      carbs: acc.carbs + m.carbs, lip: acc.lip + m.lip,
    };
  }, { kcal: 0, prot: 0, carbs: 0, lip: 0 });
}

/** Macros d'UNE portion : c'est ce que l'utilisateur consomme. */
export function macrosPortion(plat) {
  const t = totauxPlat(plat);
  const n = Math.max(1, plat.portions || 1);
  return { kcal: t.kcal / n, prot: t.prot / n, carbs: t.carbs / n, lip: t.lip / n };
}

export function enregistrerPlat(plat) {
  const existe = plats.value.some(p => p.id === plat.id);
  plats.value = existe
    ? plats.value.map(p => (p.id === plat.id ? plat : p))
    : [...plats.value, { ...plat, id: plat.id || Date.now() }];
}

export function supprimerPlat(id) {
  plats.value = plats.value.filter(p => p.id !== id);
}
