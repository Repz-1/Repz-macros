import { useState } from 'preact/hooks';
import { t } from '../i18n/index.js';
import { estPremium } from './PremiumPage.jsx';
import { ongletActif } from './BottomNav.jsx';
import { VocalModal } from './VocalModal.jsx';

// Rangee compacte d'actions rapides — meme disposition que l'app actuelle
// (une ligne, 3 actions), bien plus econome en hauteur que des boutons empiles.
export function ActionsRapides({ ouvrirCalc }) {
  const [vocal, setVocal] = useState(false);

  const Action = ({ ic, label, onClick, pro }) => (
    <button class="qa-btn" onClick={onClick}>
      <span class="qa-ic">{ic}</span>
      <span class="qa-lb">{label}</span>
      {pro && !estPremium.value && <i class="qa-pro">✦</i>}
    </button>
  );

  return (
    <>
      <div class="qa-rangee">
        <Action
          ic={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h3M8 15h3M15 11v6"/></svg>}
          label={t('calc_besoins_court')} onClick={ouvrirCalc}
        />
        <Action
          ic={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h2l2.4 11.2a2 2 0 002 1.6h7.7a2 2 0 002-1.6L21 8H6"/><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/></svg>}
          label={t('nav_courses')} onClick={() => { ongletActif.value = 'courses'; }}
        />
        <Action
          ic={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/></svg>}
          label={t('vocal_court')} pro
          onClick={() => { if (estPremium.value) setVocal(true); else ongletActif.value = 'premium'; }}
        />
      </div>
      {vocal && <VocalModal fermer={() => setVocal(false)} />}
    </>
  );
}
