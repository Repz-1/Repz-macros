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
        <span class="wn-ic">
          <svg viewBox="0 0 24 24">
            <defs>
              <linearGradient id="wnOr" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#FFDF8E" />
                <stop offset="100%" stop-color="#F0A90A" />
              </linearGradient>
            </defs>
            {/* Plateaux remplis d'or, structure au trait */}
            <path d="M4 12a3 3 0 006 0z" fill="url(#wnOr)" stroke="none" />
            <path d="M14 12a3 3 0 006 0z" fill="url(#wnOr)" stroke="none" />
            <path d="M12 3.5v2M7 5.5h10M7 5.5l-3 6.5a3 3 0 006 0L7 5.5zM17 5.5l-3 6.5a3 3 0 006 0l-3-6.5zM9 20.5h6M12 5.5v15" />
          </svg>
        </span>
        <span class="wn-txt">
          <span class="wn-title">{t('weigh_note')}</span>
        </span>
        <span class="wn-cta">{t('weigh_add')}</span>
      </div>
      {modale && createPortal(<WeightModal fermer={() => setModale(false)} />, document.body)}
    </>
  );
}
