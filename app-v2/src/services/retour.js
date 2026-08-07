// ============================================================
// PILE DE RETOURS — un seul endroit qui sait « qu'est-ce qui est
// ouvert par-dessus le reste, et comment le fermer ».
//
// Origine (Raci, 8/08) : le retour Android ne connaissait que les
// repas, les vues d'entrainement et les onglets. Statistiques
// avancees, Reglages, le detail d'une seance, la liste des seances
// et le programme BelFit+ vivent dans des etats que main.jsx ne
// voyait pas : une pression changeait l'onglet SOUS l'ecran ouvert
// (rien de visible), et la fleche fermait ensuite sur le mauvais
// onglet — le « comme si je clique 2x » du journal alimentaire.
//
// Chaque ecran superpose s'enregistre a l'ouverture et se retire a
// la fermeture. Le retour Android depile le dernier ouvert : l'ordre
// d'empilement EST l'ordre de fermeture, sans que main.jsx ait a
// connaitre chaque ecran.
// ============================================================
import { useEffect } from 'preact/hooks';

const pile = [];

/** Enregistre un fermeur ; renvoie la fonction de retrait. */
export function empilerRetour(fermer) {
  pile.push(fermer);
  return () => {
    const i = pile.indexOf(fermer);
    if (i >= 0) pile.splice(i, 1);
  };
}

/** Ferme le dernier ecran ouvert. Vrai si quelque chose a ete ferme. */
export function depilerRetour() {
  const fermer = pile[pile.length - 1];
  if (!fermer) return false;
  fermer();
  return true;
}

export function retourEnAttente() { return pile.length > 0; }

/** Hook : empile `fermer` tant que `ouvert` est vrai.
 *  Le tableau de dependances ne porte que `ouvert` : le fermeur est
 *  fige a l'ouverture, ce qui est voulu — c'est celui de l'ecran
 *  qui vient de s'ouvrir. */
export function useRetour(ouvert, fermer) {
  useEffect(() => {
    if (!ouvert) return undefined;
    return empilerRetour(fermer);
  }, [ouvert]);
}
