import { useState } from 'preact/hooks';
import { createPortal } from 'preact/compat';
import { eau, ajouterEau, resetEau, tailleBouteille } from '../store/journal.js';
import { t } from '../i18n/index.js';

// ============================================================
// HYDRATATION — copie de la v1 (app.html) :
// capsule flottante + modale bouteille. 1 appui sur la
// bouteille = 75 ml ; a 1,5 L la bouteille se vide et repart.
// ============================================================

const PAR_APPUI = 0.075;   // v1 : WATER_PER_TAP = 75 ml
// Contenances proposees (litres). La bouteille v1 etait figee a 1,5 L ;
// le choix est desormais persiste avec le journal (tailleBouteille).
const TAILLES = [0.5, 1, 1.5, 2];

/** « 0 L », « 0,3 L », « 1,8 L », « 0,075 L ».
 *  L'ancien format v1 figeait trois decimales des que le compte
 *  n'etait pas rond : 24 appuis de 75 ml donnaient « 1,800 L » —
 *  qui se lit comme mille huit cents litres, la virgule passant
 *  pour un separateur de milliers. Les zeros de fin sont coupes. */
function litresTxt(l) {
  const ml = Math.round(l * 1000);
  return String(parseFloat((ml / 1000).toFixed(3))).replace('.', ',') + ' L';
}

export function WaterTracker() {
  const [ouvert, setOuvert] = useState(false);
  // Bouteille qui vient d'etre terminee : on la montre pleine 450 ms
  // avant de la faire repartir a zero (v1 updateWaterUI(animate)).
  const [pleine, setPleine] = useState(false);

  const total = eau.value;
  const taille = tailleBouteille.value;
  const dansBouteille = Math.round((total % taille) * 1000) / 1000;
  const pct = pleine ? 100 : (dansBouteille / taille) * 100;

  const appui = () => {
    ajouterEau(PAR_APPUI);
    const apres = Math.round((eau.value % taille) * 1000) / 1000;
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

            <div class="wb-tailles" role="group" aria-label="Contenance">
              {TAILLES.map(v => (
                <button
                  key={v}
                  class={'wbt' + (taille === v ? ' active' : '')}
                  onClick={() => { tailleBouteille.value = v; }}
                >
                  {String(v).replace('.', ',')} L
                </button>
              ))}
            </div>

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
