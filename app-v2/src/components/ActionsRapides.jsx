import { estPremium } from './PremiumPage.jsx';
import { ongletActif } from './BottomNav.jsx';
import { t } from '../i18n/index.js';

// ============================================================
// ACTIONS RAPIDES
// Une seule carte, quatre colonnes separees par un filet.
// Icones d'apres la maquette du 25/07 : trait noir franc,
// accent dore en degrade sur un element de chaque pictogramme
// (ecran du calculateur, panier du caddie, objectif de
// l'appareil, capsule du micro).
// ============================================================

// Degrade dore partage : declare une seule fois, reference partout.
const Degrade = () => (
  <defs>
    <linearGradient id="qaOr" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FFDF8E" />
      <stop offset="100%" stop-color="#F0A90A" />
    </linearGradient>
  </defs>
);

export function ActionsRapides({ ouvrirCalc, ouvrirVocal, ouvrirPhoto }) {
  return (
    <div class="qa">
      <button class="qa-btn" onClick={ouvrirCalc}>
        <span class="qa-ic">
          <svg viewBox="0 0 24 24" class="ic">
            <Degrade />
            <rect x="5" y="2.5" width="14" height="19" rx="3" />
            <rect x="8" y="5.5" width="8" height="4" rx="1" fill="url(#qaOr)" stroke="none" />
            <circle cx="9" cy="13.5" r="1.1" fill="currentColor" stroke="none" />
            <circle cx="12" cy="13.5" r="1.1" fill="currentColor" stroke="none" />
            <circle cx="15" cy="13.5" r="1.1" fill="currentColor" stroke="none" />
            <circle cx="9" cy="17.5" r="1.1" fill="currentColor" stroke="none" />
            <circle cx="12" cy="17.5" r="1.1" fill="currentColor" stroke="none" />
            <circle cx="15" cy="17.5" r="1.1" fill="url(#qaOr)" stroke="none" />
          </svg>
        </span>
        <span class="qa-lb">{t('qa_calc')}</span>
      </button>

      <button class="qa-btn" onClick={() => { ongletActif.value = 'courses'; }}>
        <span class="qa-ic">
          <svg viewBox="0 0 24 24" class="ic">
            <Degrade />
            {/* Panier rempli d'or, roues et anse au trait */}
            <path d="M6.2 8.2h14L18.6 14a2 2 0 01-1.94 1.5H8.9a2 2 0 01-1.95-1.55z" fill="url(#qaOr)" stroke="none" />
            <path d="M2.8 3.5h2.3l2.6 12a2 2 0 001.95 1.55h7.75A2 2 0 0019.35 15.5L20.8 8.2H6.2" />
            <circle cx="9.6" cy="20.2" r="1.5" />
            <circle cx="17" cy="20.2" r="1.5" />
          </svg>
        </span>
        <span class="qa-lb">{t('qa_shop')}</span>
      </button>

      <button class="qa-btn" onClick={ouvrirPhoto}>
        {!estPremium.value && <span class="qa-pro">PRO</span>}
        <span class="qa-ic">
          <svg viewBox="0 0 24 24" class="ic">
            <Degrade />
            <path d="M3.5 8.5A2.5 2.5 0 016 6h1.9l1.2-1.9a1.6 1.6 0 011.36-.75h3.08c.55 0 1.06.28 1.36.75L16.1 6H18a2.5 2.5 0 012.5 2.5v8A2.5 2.5 0 0118 19H6a2.5 2.5 0 01-2.5-2.5v-8z" />
            <circle cx="12" cy="12.4" r="3.6" />
            <circle cx="12" cy="12.4" r="1.7" fill="url(#qaOr)" stroke="none" />
          </svg>
        </span>
        <span class="qa-lb">{t('qa_photo')}</span>
      </button>

      <button class="qa-btn" onClick={ouvrirVocal}>
        {!estPremium.value && <span class="qa-pro">PRO</span>}
        <span class="qa-ic">
          <svg viewBox="0 0 24 24" class="ic">
            <Degrade />
            <rect x="9.4" y="2.6" width="5.2" height="10.2" rx="2.6" />
            <circle cx="12" cy="7.7" r="1.6" fill="url(#qaOr)" stroke="none" />
            <path d="M6 11.5a6 6 0 0012 0" />
            <path d="M12 17.5v3.4" />
            <path d="M8.8 20.9h6.4" />
          </svg>
        </span>
        <span class="qa-lb">{t('qa_voice')}</span>
      </button>
    </div>
  );
}
