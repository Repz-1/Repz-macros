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
      {/* Refonte densite : la carte devient une ligne discrete —
          l'information conditionnelle ne merite pas une carte. */}
      <div class="pesee-ligne" onClick={() => setModale(true)}>
        <span>{t('weigh_note')}</span>
        <b>{t('weigh_add')}</b>
      </div>
      {modale && createPortal(<WeightModal fermer={() => setModale(false)} />, document.body)}
    </>
  );
}
