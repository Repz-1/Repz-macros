import { estPremium } from './PremiumPage.jsx';
import { ongletActif } from './BottomNav.jsx';
import { t } from '../i18n/index.js';

// ============================================================
// ACTIONS RAPIDES
// Une seule carte, trois colonnes de largeur egale separees par
// un trait vertical. Aucun titre : la carte commence directement
// par les boutons, comme sur la reference.
// ============================================================

export function ActionsRapides({ ouvrirCalc, ouvrirVocal, ouvrirPhoto }) {
  return (
    <div class="qa">
      <button class="qa-btn" onClick={ouvrirCalc}>
        <span class="qa-ic">
          <svg viewBox="0 0 24 24" class="ic">
            <rect x="5" y="2.5" width="14" height="19" rx="2.5" />
            <rect x="8" y="5.5" width="8" height="3.5" rx="1" />
            <circle cx="9" cy="13" r="1" /><circle cx="12" cy="13" r="1" /><circle cx="15" cy="13" r="1" />
            <circle cx="9" cy="17" r="1" /><circle cx="12" cy="17" r="1" /><circle cx="15" cy="17" r="1" />
          </svg>
        </span>
        <span class="qa-lb">{t('qa_calc')}</span>
      </button>

      <button class="qa-btn" onClick={() => { ongletActif.value = 'courses'; }}>
        <span class="qa-ic">
          <svg viewBox="0 0 24 24" class="ic">
            <path d="M2.5 3h2.2l2.3 11.2a1.8 1.8 0 001.8 1.4h8.6a1.8 1.8 0 001.8-1.4L21 7H6" />
            <circle cx="9.5" cy="20" r="1.4" /><circle cx="17" cy="20" r="1.4" />
          </svg>
        </span>
        <span class="qa-lb">{t('qa_shop')}</span>
      </button>

      <button class="qa-btn" onClick={ouvrirPhoto}>
        {!estPremium.value && <span class="qa-pro">PRO</span>}
        <span class="qa-ic">
          <svg viewBox="0 0 24 24" class="ic">
            <path d="M4 8.5A2.5 2.5 0 016.5 6h1.6l1.2-1.8A1.5 1.5 0 0110.6 3.5h2.8a1.5 1.5 0 011.3.7L15.9 6h1.6A2.5 2.5 0 0120 8.5v8A2.5 2.5 0 0117.5 19h-11A2.5 2.5 0 014 16.5v-8z" />
            <circle cx="12" cy="12.5" r="3.4" />
          </svg>
        </span>
        <span class="qa-lb">Photo</span>
      </button>

      <button class="qa-btn" onClick={ouvrirVocal}>
        {!estPremium.value && <span class="qa-pro">PRO</span>}
        <span class="qa-ic">
          <svg viewBox="0 0 24 24" class="ic">
            <rect x="10" y="2.5" width="4" height="9.5" rx="2" />
            <path d="M6.5 11.5a5.5 5.5 0 0011 0" />
            <path d="M12 17v3.5" /><path d="M9 20.5h6" />
          </svg>
        </span>
        <span class="qa-lb">{t('qa_voice')}</span>
      </button>
    </div>
  );
}
