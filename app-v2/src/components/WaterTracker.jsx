import { useState } from 'preact/hooks';
import { createPortal } from 'preact/compat';
import { eau, ajouterEau, resetEau } from '../store/journal.js';
import { t } from '../i18n/index.js';

// ============================================================
// HYDRATATION — copie de la v1 (app.html) :
// capsule flottante + modale bouteille. 1 appui sur la
// bouteille = 75 ml ; a 1,5 L la bouteille se vide et repart.
// ============================================================

const PAR_APPUI = 0.075;   // v1 : WATER_PER_TAP = 75 ml
const BOUTEILLE = 1.5;     // v1 : WATER_BOTTLE = 1500 ml

/** Format v1 : « 0 L », « 0,300 L », « 1,5 L » */
function litresTxt(l) {
  const ml = Math.round(l * 1000);
  return (ml / 1000).toFixed(ml % 1000 === 0 ? 0 : 3).replace('.', ',') + ' L';
}

export function WaterTracker() {
  const [ouvert, setOuvert] = useState(false);
  // Bouteille qui vient d'etre terminee : on la montre pleine 450 ms
  // avant de la faire repartir a zero (v1 updateWaterUI(animate)).
  const [pleine, setPleine] = useState(false);

  const total = eau.value;
  const dansBouteille = Math.round((total % BOUTEILLE) * 1000) / 1000;
  const pct = pleine ? 100 : (dansBouteille / BOUTEILLE) * 100;

  const appui = () => {
    ajouterEau(PAR_APPUI);
    const apres = Math.round((eau.value % BOUTEILLE) * 1000) / 1000;
    if (apres === 0 && eau.value > 0) {
      setPleine(true);
      setTimeout(() => setPleine(false), 450);
    }
  };

  return (
    <>
      <button class="water-fab" onClick={() => setOuvert(true)} aria-label={`${t('water_title')} — ${litresTxt(total)}`}>
        <span style={{ fontSize: '18px' }}>💧</span>
        <span class="wf-count">{litresTxt(total)}</span>
      </button>

      {ouvert && createPortal(
        <div class="water-modal show" onClick={e => { if (e.target === e.currentTarget) setOuvert(false); }}>
          <div class="water-box">
            <h3>{t('water_title')}</h3>
            <div class="wb-sub">{t('water_sub')}</div>

            <div class="bottle" onClick={appui}>
              <div class="bottle-cap"></div>
              <div class="bottle-neck"></div>
              <div class="bottle-body">
                <div class="bottle-fill" style={{ height: pct + '%' }}></div>
                <div class="bottle-pct">{Math.round(pct)}%</div>
              </div>
            </div>
            <div class="water-tap-hint">{t('water_hint')}</div>

            <div class="water-total">
              <div class="wt-v">{litresTxt(total)}</div>
              <div class="wt-l">{t('water_today')}</div>
            </div>

            <div class="water-actions">
              <button class="wa-reset" onClick={resetEau}>{t('reset')}</button>
              <button class="wa-close" onClick={() => setOuvert(false)}>{t('close')}</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
