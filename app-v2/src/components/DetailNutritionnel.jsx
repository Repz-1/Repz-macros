import { detailTotal, CLES_DETAIL } from '../data/aliments.js';
import { accesDecouverte, joursRestantsDecouverte, enDecouverte } from '../services/decouverte.js';
import { ongletActif } from './BottomNav.jsx';
import { repasOuvertId } from './MealCard.jsx';

// ============================================================
// DETAIL NUTRITIONNEL D'UN REPAS
// Au-dela des quatre macros : fibres, sucres, graisses saturees,
// sel. Offert pendant la periode de decouverte, puis Premium.
//
// Parti pris : on n'affiche jamais un chiffre qu'on ne sait pas.
// Un aliment sans donnee n'est pas compte comme un zero, et si le
// total ne porte que sur une partie du repas, on le dit. Un « 0 g
// de fibres » faux vaut moins que pas de chiffre du tout.
// ============================================================

const LIBELLES = {
  fibres: 'Fibres',
  sucres: 'Sucres',
  satures: 'Graisses saturées',
  sel: 'Sel',
};

export function DetailNutritionnel({ ings }) {
  const { total, connus, nbAliments } = detailTotal(ings);
  const dispos = CLES_DETAIL.filter(k => connus[k] > 0);

  // Aucun aliment du repas ne porte l'information : plutot que
  // d'afficher un tableau de tirets, on explique ou la trouver.
  if (dispos.length === 0) {
    return (
      <div class="dn">
        <div class="dn-tete"><span class="dn-titre">Détail nutritionnel</span></div>
        <p class="dn-absent">
          Aucun aliment de ce repas ne porte encore ce détail. Les produits ajoutés
          par scan du code-barres l'apportent automatiquement.
        </p>
      </div>
    );
  }

  const ouvert = accesDecouverte.value;

  return (
    <div class="dn">
      <div class="dn-tete">
        <span class="dn-titre">Détail nutritionnel</span>
        {ouvert && enDecouverte.value && (
          <span class="dn-offert">
            Offert {joursRestantsDecouverte.value} j
          </span>
        )}
        {!ouvert && <span class="dn-pro">✦ PRO</span>}
      </div>

      <div class={'dn-lignes' + (ouvert ? '' : ' dn-lignes--verrou')}>
        {dispos.map(k => (
          <div class="dn-ligne" key={k}>
            <span class="dn-lb">{LIBELLES[k]}</span>
            {ouvert ? (
              <span class="dn-val">
                {total[k] < 10 ? total[k].toFixed(1) : Math.round(total[k])} g
              </span>
            ) : (
              <span class="dn-cadenas" aria-hidden="true">
                <svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" /></svg>
              </span>
            )}
          </div>
        ))}
      </div>

      {ouvert && dispos.some(k => connus[k] < nbAliments) && (
        <p class="dn-partiel">
          Calculé sur les aliments qui portent l'information — les autres ne sont pas comptés.
        </p>
      )}

      {!ouvert && (
        <button class="dn-cta" onClick={() => { repasOuvertId.value = null; ongletActif.value = 'premium'; }}>
          Débloquer le détail nutritionnel
        </button>
      )}
    </div>
  );
}
