import { estPremium } from './PremiumPage.jsx';
import { ongletActif } from './BottomNav.jsx';
import { t } from '../i18n/index.js';

// ============================================================
// ACTIONS RAPIDES
// Une seule carte, trois colonnes de largeur egale separees par
// un trait vertical. Aucun titre : la carte commence directement
// par les boutons, comme sur la reference.
// ============================================================

export function ActionsRapides({ ouvrirCalc, ouvrirVocal, ouvrirPlats }) {
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

      <button class="qa-btn" onClick={ouvrirPlats}>
        <span class="qa-ic">
          <svg viewBox="0 0 24 24" class="ic">
            <path d="M3 11h18M4.5 11a7.5 7.5 0 0115 0" />
            <path d="M3 11v1a4 4 0 004 4h10a4 4 0 004-4v-1" />
            <path d="M9 7.5c0-1 1.5-1.2 1.5-2.5M14 7.5c0-1 1.5-1.2 1.5-2.5" />
          </svg>
        </span>
        <span class="qa-lb">{t('mp_court')}</span>
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
