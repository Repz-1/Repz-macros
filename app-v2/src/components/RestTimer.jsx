import { useState, useEffect, useRef, useCallback } from 'preact/hooks';
import { t } from '../i18n/index.js';

// ============================================================
// CHRONO DE REPOS v2 — reproduit fidelement le chrono v1 :
//   • bouton flottant (FAB) deplaçable, aimante au bord
//   • panneau qui monte avec molettes min/sec (scroll-snap)
//   • affichage 3 actes : 30s respiration / 10s battement / 5s sprint
// Le temps restant est CALCULE depuis un horodatage de fin
// (jamais decremente) : la veille / l'arriere-plan ne le faussent pas.
// ============================================================

const CLE = 'belfit_v2_chrono';
const CLE_POS = 'belfit_v2_chronoPos';
const MINUTES = Array.from({ length: 61 }, (_, i) => i);
const SECONDES = Array.from({ length: 12 }, (_, i) => i * 5);

function chargerEtat() {
  try {
    const s = JSON.parse(localStorage.getItem(CLE));
    if (s && typeof s.preset === 'number') return s;
  } catch {}
  return { endAt: null, preset: 90, total: 90 };
}

export function RestTimer() {
  const [etat, setEtat] = useState(chargerEtat);
  const [ouvert, setOuvert] = useState(false);
  const [, tick] = useState(0);

  const fabRef = useRef(null);
  const wheelMinRef = useRef(null);
  const wheelSecRef = useRef(null);
  const verrouRef = useRef(false);      // scroll programmatique en cours → on ignore les onChange
  const scrollTimerRef = useRef({ min: null, sec: null });

  const enCours = !!etat.endAt;
  const restant = enCours
    ? Math.max(0, Math.round((etat.endAt - Date.now()) / 1000))
    : etat.total;

  // Persistance
  useEffect(() => {
    try { localStorage.setItem(CLE, JSON.stringify(etat)); } catch {}
  }, [etat]);

  // Re-render 4x/s tant que le chrono tourne
  useEffect(() => {
    if (!enCours) return;
    const it = setInterval(() => tick(x => x + 1), 250);
    return () => clearInterval(it);
  }, [enCours]);

  // Fin du chrono
  useEffect(() => {
    if (enCours && restant <= 0) {
      if (navigator.vibrate) { try { navigator.vibrate([150, 80, 150]); } catch {} }
      setEtat(e => ({ ...e, endAt: null, total: e.preset }));
    }
  }, [restant, enCours]);

  // Vibrations reperes (30s, 10s) + sprint (<=5s)
  useEffect(() => {
    if (!enCours || !navigator.vibrate) return;
    if (restant === 30 || restant === 10) { try { navigator.vibrate(25); } catch {} }
    else if (restant <= 5 && restant > 0) { try { navigator.vibrate(35); } catch {} }
  }, [restant, enCours]);

  const mm = String(Math.floor(restant / 60)).padStart(2, '0');
  const ss = String(restant % 60).padStart(2, '0');
  const classe = !enCours ? '' :
    restant <= 5 ? 't-crit' : restant <= 10 ? 't-warn' : restant <= 30 ? 't-approche' : '';

  // ---- Molettes : positionne sur une valeur (scroll programmatique) ----
  const calerMolettes = useCallback((total) => {
    const wm = wheelMinRef.current, ws = wheelSecRef.current;
    if (!wm || !ws) return;
    verrouRef.current = true;
    const mi = MINUTES.indexOf(Math.floor(total / 60));
    const si = SECONDES.indexOf(total % 60);
    wm.scrollTop = (mi < 0 ? 0 : mi) * 50;
    ws.scrollTop = (si < 0 ? 0 : si) * 50;
    setTimeout(() => { verrouRef.current = false; }, 350);
  }, []);

  // Cale les molettes a l'ouverture du panneau
  useEffect(() => {
    if (ouvert) setTimeout(() => calerMolettes(etat.preset), 40);
  }, [ouvert]);

  // Applique le choix des molettes (vraie manip utilisateur)
  const appliquer = useCallback(() => {
    if (verrouRef.current) return;
    const wm = wheelMinRef.current, ws = wheelSecRef.current;
    if (!wm || !ws) return;
    const mi = Math.round(wm.scrollTop / 50);
    const si = Math.round(ws.scrollTop / 50);
    const min = MINUTES[Math.max(0, Math.min(MINUTES.length - 1, mi))] || 0;
    const sec = SECONDES[Math.max(0, Math.min(SECONDES.length - 1, si))] || 0;
    const duree = min * 60 + sec;
    if (duree <= 0) return;
    setEtat(e => e.endAt
      // Chrono en cours : on le RELANCE sur la nouvelle duree (plus courte OU plus longue)
      ? { ...e, preset: duree, total: duree, endAt: Date.now() + duree * 1000 }
      : { ...e, preset: duree, total: duree }
    );
  }, []);

  // Listeners de scroll sur les molettes (snap → applique apres 120ms d'inactivite)
  useEffect(() => {
    if (!ouvert) return;
    const attach = (el, key) => {
      if (!el) return () => {};
      const onScroll = () => {
        clearTimeout(scrollTimerRef.current[key]);
        scrollTimerRef.current[key] = setTimeout(appliquer, 120);
      };
      el.addEventListener('scroll', onScroll, { passive: true });
      return () => el.removeEventListener('scroll', onScroll);
    };
    const d1 = attach(wheelMinRef.current, 'min');
    const d2 = attach(wheelSecRef.current, 'sec');
    return () => { d1(); d2(); };
  }, [ouvert, appliquer]);

  // ---- Boutons ----
  const startPause = () => {
    setEtat(e => {
      if (e.endAt) {
        // Pause : on fige le restant
        const r = Math.max(0, Math.round((e.endAt - Date.now()) / 1000));
        return { ...e, endAt: null, total: r };
      }
      const base = e.total > 0 ? e.total : e.preset;
      return { ...e, endAt: Date.now() + base * 1000, total: base };
    });
  };
  const reset = () => setEtat(e => ({ ...e, endAt: null, total: e.preset }));

  // ---- FAB deplaçable ----
  useEffect(() => {
    const fab = fabRef.current;
    if (!fab) return;
    try {
      const p = JSON.parse(localStorage.getItem(CLE_POS) || 'null');
      if (p) {
        const w = fab.offsetWidth || 60;
        const snapX = (p.x + w / 2 < window.innerWidth / 2) ? 16 : window.innerWidth - w - 16;
        poser(snapX, p.y);
      }
    } catch {}

    let sx = 0, sy = 0, ox = 0, oy = 0, drag = false;

    function poser(x, y) {
      const maxX = window.innerWidth - fab.offsetWidth - 4;
      const maxY = window.innerHeight - fab.offsetHeight - 4;
      x = Math.min(Math.max(4, x), maxX);
      y = Math.min(Math.max(4, y), maxY);
      fab.style.left = x + 'px'; fab.style.top = y + 'px';
      fab.style.right = 'auto'; fab.style.bottom = 'auto';
      return { x, y };
    }
    const ts = (e) => {
      const tc = e.touches[0]; sx = tc.clientX; sy = tc.clientY;
      const r = fab.getBoundingClientRect(); ox = r.left; oy = r.top; drag = false;
    };
    const tm = (e) => {
      const tc = e.touches[0];
      const dx = tc.clientX - sx, dy = tc.clientY - sy;
      if (!drag && Math.hypot(dx, dy) > 10) drag = true;
      if (drag) { e.preventDefault(); poser(ox + dx, oy + dy); }
    };
    const te = () => {
      if (drag) {
        const r = fab.getBoundingClientRect();
        const snapX = (r.left + r.width / 2 < window.innerWidth / 2) ? 16 : window.innerWidth - r.width - 16;
        const p = poser(snapX, r.top);
        fab.style.transition = 'left .22s ease, top .22s ease';
        setTimeout(() => { fab.style.transition = ''; }, 250);
        try { localStorage.setItem(CLE_POS, JSON.stringify(p)); } catch {}
      } else {
        setOuvert(o => !o);
      }
    };
    fab.addEventListener('touchstart', ts, { passive: true });
    fab.addEventListener('touchmove', tm, { passive: false });
    fab.addEventListener('touchend', te);
    const clic = (e) => { if (e.detail && !('ontouchstart' in window)) setOuvert(o => !o); };
    fab.addEventListener('click', clic);
    return () => {
      fab.removeEventListener('touchstart', ts);
      fab.removeEventListener('touchmove', tm);
      fab.removeEventListener('touchend', te);
      fab.removeEventListener('click', clic);
    };
  }, []);

  const fabTime = enCours ? `${mm}:${ss}` : '';

  return (
    <>
      {ouvert && <div class="v2-timer-overlay show" onClick={() => setOuvert(false)} />}

      <div class={'v2-timer-container' + (ouvert ? ' show' : '')}>
        <div class="v2-timer-display">
          <div class={'v2-timer-big ' + classe}>{mm}:{ss}</div>
          <div class="v2-timer-label">{t('chrono_titre')}</div>
        </div>
        <div class="v2-timer-wheels">
          <div class="v2-wheel-col">
            <div class="v2-wheel" ref={wheelMinRef}>
              <div style="height:50px" />
              {MINUTES.map(v => <div key={'m' + v} class="v2-wheel-item">{String(v).padStart(2, '0')}</div>)}
              <div style="height:50px" />
            </div>
            <div class="v2-wheel-unit">{t('chrono_min')}</div>
          </div>
          <div class="v2-wheel-sep">:</div>
          <div class="v2-wheel-col">
            <div class="v2-wheel" ref={wheelSecRef}>
              <div style="height:50px" />
              {SECONDES.map(v => <div key={'s' + v} class="v2-wheel-item">{String(v).padStart(2, '0')}</div>)}
              <div style="height:50px" />
            </div>
            <div class="v2-wheel-unit">{t('chrono_sec')}</div>
          </div>
          <div class="v2-wheel-highlight" />
        </div>
        <div class="v2-timer-controls">
          <button class="v2-timer-btn start" onClick={startPause}>
            {enCours ? t('chrono_pause') : (etat.total !== etat.preset && etat.total > 0 ? t('chrono_reprendre') : t('demarrer'))}
          </button>
          <button class="v2-timer-btn reset" onClick={reset}>{t('chrono_reset')}</button>
          <button class="v2-timer-btn reset" onClick={() => setOuvert(false)}>{t('chrono_fermer')}</button>
        </div>
      </div>

      <button ref={fabRef} class={'v2-chrono-fab' + (enCours ? ' running' : '') + (enCours && restant <= 5 ? ' crit' : '')} aria-label={t('chrono_titre')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8" /><path d="M12 13V9" /><path d="M9 2h6" /></svg>
        {fabTime && <span class="v2-chrono-fab-time">{fabTime}</span>}
      </button>
    </>
  );
}
