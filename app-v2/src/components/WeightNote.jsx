import { useState } from 'preact/hooks';
import { createPortal } from 'preact/compat';
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
        <span class="wn-txt">
          <span class="wn-title">{t('weigh_note')}</span>
        </span>
        <span class="wn-cta">{t('weigh_add')}</span>
      </div>
      {modale && createPortal(<WeightModal fermer={() => setModale(false)} />, document.body)}
    </>
  );
}
