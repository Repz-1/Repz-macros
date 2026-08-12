import { signal, effect } from '@preact/signals';
import { identite } from '../services/firebase.js';
import { chargerDonnees, sauvegarder } from '../services/sync.js';
import { DB } from '../data/aliments.js';
import { customFoods } from '../components/Scanner.jsx';

// ============================================================
// ALIMENTS COURANTS ET PLATS ENREGISTRES
//
// Aliments courants : ceux qu'on encode le plus souvent. Ils
// remontent en tete de la recherche et s'affichent avant meme de
// taper. Le comptage est automatique — l'app sait deja ce qu'on
// mange tous les jours, le declarer a la main faisait le travail
// deux fois. Une etoile a cocher tenait ce role jusqu'au 10/08 :
// collee au nom qu'on tape pour choisir l'aliment, elle se
// declenchait sans qu'on le veuille et rien ne disait ce qu'elle
// faisait.
//
// Plats : une recette pesee une seule fois, a la cuisson, puis
// consommee en portions. Le batch cooking en pratique.
// ============================================================

export const usages = signal({});    // { nom: nombre d'encodages }
export const favoris = signal([]);   // ancien systeme, lu pour la reprise
export const plats = signal([]);     // { id, nom, ings, portions }
// Prenom : synchronise avec le compte. localStorage seul le perdait
// des qu'on changeait d'appareil ou de navigateur.
export const prenom = signal('');

let uid = null, pret = false;

effect(() => {
  const u = identite.value;
  if (!u) { pret = false; return; }
  if (u === uid && pret) return;
  uid = u; pret = false;
  chargerDonnees(u).then(d => {
    if (uid !== u) return;
    const anciens = (d && d.favoris) || [];
    favoris.value = anciens;
    // Reprise : les etoiles posees a la main avant le 10/08 valent
    // trois encodages, pour qu'elles gardent leur rang le temps que
    // le comptage reel prenne le relais. Sans cela, une liste
    // d'habitudes construite pendant des semaines disparaissait.
    const compte = (d && d.usages) || null;
    usages.value = compte || Object.fromEntries(anciens.map(n => [n, 3]));
    plats.value = (d && d.plats) || [];
    // Le prenom du compte fait foi. S'il manque au cloud mais existe
    // en local (compte cree avant cette synchro), on le remonte.
    const local = (() => {
      try { return localStorage.getItem('repz_firstName') || ''; } catch (e) { return ''; }
    })();
    const duCompte = (d && d.prenom) || '';
    prenom.value = duCompte || local;
    if (!duCompte && local) sauvegarder(u, { prenom: local });
    // Miroir local : l'en-tete s'affiche sans attendre le reseau.
    try { if (prenom.value) localStorage.setItem('repz_firstName', prenom.value); } catch (e) {}
    pret = true;
  });
});

effect(() => {
  // `favoris` reste ecrit tel quel : on ne detruit pas la donnee
  // d'un systeme qu'on remplace, au cas ou il faudrait revenir.
  const instantane = {
    favoris: favoris.value, usages: usages.value,
    plats: plats.value, prenom: prenom.value,
  };
  const u = identite.value;
  if (!u || !pret) return;   // ne pas ecraser avant le chargement
  sauvegarder(u, instantane);
});

// ---------- Aliments courants ----------

/** Un encodage de plus pour cet aliment. */
export function noterUsage(nom) {
  usages.value = { ...usages.value, [nom]: (usages.value[nom] || 0) + 1 };
}

/** Les aliments les plus encodes, du plus frequent au moins frequent. */
export function alimentsCourants(max = 6) {
  return Object.entries(usages.value)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'fr'))
    .slice(0, max)
    .map(([nom]) => nom);
}

/**
 * Bonus de classement d'un aliment dans la recherche. Plafonne a 25,
 * la valeur que portaient les favoris : au-dela, un aliment tres
 * encode ecraserait un resultat exact et « riz » ne proposerait plus
 * « Riz au lait ». Il faut trois encodages pour atteindre le plafond.
 */
export function bonusUsage(nom) {
  return Math.min(25, (usages.value[nom] || 0) * 9);
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


/** Change le prenom : compte d'abord, miroir local ensuite. */
export function definirPrenom(v) {
  const p = String(v || '').trim();
  prenom.value = p;
  try { localStorage.setItem('repz_firstName', p); } catch (e) {}
}
