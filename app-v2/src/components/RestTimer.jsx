import { useState, useEffect } from 'preact/hooks';
import { t } from '../i18n/index.js';

// ============================================================
// CHRONO DE REPOS v2 — le temps restant est CALCULE depuis un
// horodatage de fin (jamais decremente) : la mise en veille ou
// l'arriere-plan ne peuvent pas le fausser. 3 actes d'intensite :
// 30s respiration / 10s battement / 5s sprint + vibrations.
// ============================================================

const PRESETS = [60, 90, 120, 180];
const CLE = 'belfit_v2_chrono';

export function RestTimer() {
  const [etat, setEtat] = useState(() => {
    try { return JSON.parse(localStorage.getItem(CLE)) || { endAt: null, preset: 90 }; }
    catch { return { endAt: null, preset: 90 }; }
  });
  const [, tick] = useState(0);

  // Re-render 4x/s quand le chrono tourne (rattrape vite apres veille)
  useEffect(() => {
    if (!etat.endAt) return;
    const it = setInterval(() => tick(t => t + 1), 250);
    return () => clearInterval(it);
  }, [etat.endAt]);

  useEffect(() => {
    try { localStorage.setItem(CLE, JSON.stringify(etat)); } catch {}
  }, [etat]);

  const restant = etat.endAt ? Math.max(0, Math.round((etat.endAt - Date.now()) / 1000)) : etat.preset;

  // Fin du chrono
  useEffect(() => {
    if (etat.endAt && restant <= 0) {
      if (navigator.vibrate) { try { navigator.vibrate([150, 80, 150]); } catch {} }
      setEtat(e => ({ ...e, endAt: null }));
    }
  }, [restant, etat.endAt]);

  // Vibrations reperes (30s, 10s) et sprint (<=5s)
  useEffect(() => {
    if (!etat.endAt || !navigator.vibrate) return;
    if (restant === 30 || restant === 10) { try { navigator.vibrate(25); } catch {} }
    else if (restant <= 5 && restant > 0) { try { navigator.vibrate(35); } catch {} }
  }, [restant]);

  const enCours = !!etat.endAt;
  const classe = !enCours ? '' :
    restant <= 5 ? 't-crit' : restant <= 10 ? 't-warn' : restant <= 30 ? 't-approche' : '';

  const mm = String(Math.floor(restant / 60)).padStart(2, '0');
  const ss = String(restant % 60).padStart(2, '0');

  const demarrer = () => setEtat(e => ({ ...e, endAt: Date.now() + e.preset * 1000 }));
  const arreter = () => setEtat(e => ({ ...e, endAt: null }));

  return (
    <div class="carte chrono">
      <div class={`chrono-aff ${classe} ${enCours && restant <= 10 ? 'tick-' + restant : ''}`}>{mm}:{ss}</div>
      <div class="chrono-presets">
        {PRESETS.map(p => (
          <button
            key={p}
            class={etat.preset === p && !enCours ? 'actif' : ''}
            disabled={enCours}
            onClick={() => setEtat(e => ({ ...e, preset: p }))}
          >{p >= 60 ? `${Math.floor(p / 60)}m${p % 60 ? (p % 60) : ''}` : `${p}s`}</button>
        ))}
      </div>
      <button class="chrono-go" onClick={enCours ? arreter : demarrer}>
        {enCours ? t('arreter') : t('demarrer')}
      </button>
    </div>
  );
}
