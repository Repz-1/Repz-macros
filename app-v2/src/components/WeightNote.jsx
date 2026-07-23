import { useState } from 'preact/hooks';
import { weightLog } from '../store/stats.js';
import { WeightModal } from './Stats.jsx';
import { t } from '../i18n/index.js';

// ============================================================
// NOTE POIDS DU JOUR — copie de la v1 (app.html, renderWeightNote) :
// visible tant qu'aucune pesee n'est encodee aujourd'hui ;
// un appui ouvre le modal de pesee (le meme que sur Stats).
// ============================================================

export function WeightNote() {
  const [modale, setModale] = useState(false);
  const iso = new Date().toISOString().slice(0, 10);
  const dejaPese = (weightLog.value || []).some(w => w.iso === iso);
  if (dejaPese) return null;

  return (
    <>
      <div class="weight-note" onClick={() => setModale(true)}>
        <span class="wn-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v2M7 5h10M7 5l-3 7a3 3 0 0 0 6 0L7 5zM17 5l-3 7a3 3 0 0 0 6 0l-3-7zM9 21h6M12 5v16" /></svg></span>
        <span class="wn-txt">
          <span class="wn-title">{t('weigh_note')}</span>
        </span>
        <span class="wn-cta">{t('weigh_add')}</span>
      </div>
      {modale && <WeightModal fermer={() => setModale(false)} />}
    </>
  );
}
