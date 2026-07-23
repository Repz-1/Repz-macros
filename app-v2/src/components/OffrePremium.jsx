import { signal } from '@preact/signals';
import { ongletActif } from './BottomNav.jsx';

// ============================================================
// OFFRE PREMIUM — montree UNE fois, juste apres la creation du
// compte (l'ordre qui convertit : programme -> compte -> offre).
// « Plus tard » en haut a droite : refuser est simple et sans
// suite — les prochains contacts seront les moments naturels.
// ============================================================

const CLE = 'belfit_v2_offre_premium';
export const offrePremiumVisible = signal(false);

export function verifierOffrePremium() {
  try {
    if (localStorage.getItem(CLE) === '1') offrePremiumVisible.value = true;
  } catch (e) {}
}
function fermer() {
  try { localStorage.removeItem(CLE); } catch (e) {}
  offrePremiumVisible.value = false;
}

export function OffrePremium() {
  if (!offrePremiumVisible.value) return null;
  return (
    <div class="bv-ecran op-ecran">
      <button class="op-plustard" onClick={fermer}>Plus tard</button>

      <div class="bv-corps bv-corps--resultat">
        <h1 class="bv-titre">Ton programme est prêt.<br />Premium l'encode pour toi.</h1>
        <p class="bv-just">
          Tout reste complet en standard — Premium enlève le travail qui reste :
        </p>

        <div class="bv-prem">
          <div class="bv-prem-l"><span class="bv-emo">{'\u{1F4F7}'}</span><span><b>Scan de code-barres</b><i>Le produit s'encode tout seul, valeurs de l'étiquette</i></span></div>
          <div class="bv-prem-l"><span class="bv-emo">{'\u{1F399}\u{FE0F}'}</span><span><b>Ajout vocal</b><i>« 125 g de riz et un blanc de poulet » — c'est noté</i></span></div>
          <div class="bv-prem-l"><span class="bv-emo">{'\u{1F9EA}'}</span><span><b>Détail nutritionnel</b><i>Fibres, sucres, graisses saturées, sel — sur tout le journal</i></span></div>
        </div>

        <div class="bv-prem-prix">
          dès <b>3,99 €</b>/mois
          <span>Moins qu'un seul café latte par mois.</span>
        </div>

        <button class="bv-suivant bv-suivant--or" onClick={() => { fermer(); ongletActif.value = 'premium'; }}>
          Voir les formules
        </button>
        <p class="bv-note">Le détail nutritionnel t'est offert les 7 premiers jours, quoi que tu choisisses.</p>
      </div>
    </div>
  );
}
