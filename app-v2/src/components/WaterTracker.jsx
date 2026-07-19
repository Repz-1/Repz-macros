import { useState } from 'preact/hooks';
import { createPortal } from 'preact/compat';
import { eau, ajouterEau } from '../store/journal.js';
import { t } from '../i18n/index.js';

// ============================================================
// HYDRATATION
// Capsule flottante : goutte a gauche, volume a droite.
// Le reglage se fait dans une petite feuille, pour que la
// capsule reste compacte comme sur la reference.
// ============================================================

export function WaterTracker() {
  const [ouvert, setOuvert] = useState(false);
  const litres = eau.value.toFixed(2).replace(/\.?0+$/, '');

  return (
    <>
      <button class="water-fab" onClick={() => setOuvert(true)} aria-label={t('water_title')}>
        <span class="wf-goutte">💧</span>
        <span class="wf-count">{litres} L</span>
      </button>

      {ouvert && createPortal(
        <div class="water-overlay" onClick={e => { if (e.target === e.currentTarget) setOuvert(false); }}>
          <div class="water-feuille">
            <button class="modal-x" onClick={() => setOuvert(false)} aria-label="Fermer">✕</button>
            <h3>{t('water_title')}</h3>
            <div class="water-total">{litres} L</div>
            <div class="water-btns">
              <button onClick={() => ajouterEau(-0.25)}>−&nbsp;0,25&nbsp;L</button>
              <button onClick={() => ajouterEau(0.25)}>+&nbsp;0,25&nbsp;L</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
