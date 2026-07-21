import { useState, useEffect, useRef } from 'preact/hooks';
import { EXERCISES, IMG_BASE } from '../data/exercices.js';
import { SESSION_EXOS } from '../data/sessionExos.js';
import { retourEntrainer } from './Entrainer.jsx';
import { ongletActif } from './BottomNav.jsx';
import '../legacy/seance.scoped.css';

// ==========================================================
// ECRAN "Ma seance" — transpose du v1 (seance.body.html, ecran 2).
// Banniere + progression + Commencer + liste d'exercices avec
// checkbox de completion et depliage des series (kg x reps).
// props: seanceId ('deb-full-3j-1'), titre, retour (fn optionnelle)
// ==========================================================

const NOMS_MUSCLES = {
  pecs: 'Pecs', dos: 'Dos', epaules: 'Épaules', biceps: 'Biceps',
  triceps: 'Triceps', jambes: 'Jambes', abdos: 'Abdos',
  etirements: 'Étirements', cardio: 'Cardio',
};

// Resout un seanceId -> liste d'exercices (ordre impose du programme)
function resoudreExercices(seanceId) {
  const bruts = SESSION_EXOS[seanceId];
  if (!bruts) return [];
  const refs = [];
  bruts.forEach(ref => {
    const [mKey, idx] = ref.split(':');
    const i = parseInt(idx, 10);
    if (EXERCISES[mKey] && EXERCISES[mKey][i]) {
      refs.push({ mKey, ex: EXERCISES[mKey][i] });
    }
  });
  return refs;
}

function lireSetLog() {
  try { return JSON.parse(localStorage.getItem('repz_setLog') || '{}'); } catch { return {}; }
}
function ecrireSetLog(log) {
  try { localStorage.setItem('repz_setLog', JSON.stringify(log)); } catch {}
}
function dernierePerf(nom) {
  const hist = lireSetLog()[nom];
  if (!hist || !hist.length) return null;
  const sets = hist[hist.length - 1].sets.filter(s => s.w !== '' || s.r !== '');
  if (!sets.length) return null;
  const w = sets[0].w;
  const sameW = sets.every(s => s.w === w);
  if (sameW && w !== '') return `${w} kg × ${sets.map(s => s.r || '?').join(' · ')}`;
  return sets.map(s => `${s.w || '?'}kg×${s.r || '?'}`).join(' · ');
}

export function SeanceDetail({ seanceId, titre, retour }) {
  const refs = resoudreExercices(seanceId);
  const total = refs.length;

  const [demarree, setDemarree] = useState(false);
  const [faits, setFaits] = useState(() => new Set());       // index coches
  const [ouverts, setOuverts] = useState(() => new Set());   // panneaux series ouverts
  const [secondes, setSecondes] = useState(0);
  // series[i] = [{w:'',r:''}, ...]
  const [series, setSeries] = useState({});

  const revenir = retour || retourEntrainer;

  // Chrono de seance
  useEffect(() => {
    if (!demarree) return;
    const it = setInterval(() => setSecondes(s => s + 1), 1000);
    return () => clearInterval(it);
  }, [demarree]);

  const mmss = `${Math.floor(secondes / 60)}:${String(secondes % 60).padStart(2, '0')}`;
  const done = faits.size;
  const pct = total ? Math.round((done / total) * 100) : 0;

  const basculerFait = (i) => {
    if (!demarree) return;               // exercices verrouilles tant que pas commence
    setFaits(prev => {
      const s = new Set(prev);
      s.has(i) ? s.delete(i) : s.add(i);
      return s;
    });
  };

  const basculerSeries = (i) => {
    setOuverts(prev => {
      const s = new Set(prev);
      s.has(i) ? s.delete(i) : s.add(i);
      return s;
    });
    setSeries(prev => {
      if (prev[i] && prev[i].length) return prev;
      return { ...prev, [i]: [{ w: '', r: '' }, { w: '', r: '' }, { w: '', r: '' }] };
    });
  };

  const majSerie = (i, k, champ, val) => {
    setSeries(prev => {
      const lignes = (prev[i] || []).map((l, idx) => idx === k ? { ...l, [champ]: val } : l);
      return { ...prev, [i]: lignes };
    });
  };
  const ajouterSerie = (i) => {
    setSeries(prev => ({ ...prev, [i]: [...(prev[i] || []), { w: '', r: '' }] }));
  };

  return (
    <div class="pg-seance">
      <div class="topbar-app">
        <button class="topbar-home" onClick={revenir} aria-label="Accueil">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5L12 3l9 7.5" /><path d="M5 9.5V20a1 1 0 001 1h3v-6h6v6h3a1 1 0 001-1V9.5" /></svg>
        </button>
        <button class="premium-pill" onClick={() => { ongletActif.value = 'premium'; }}>✨ Premium</button>
      </div>

      <div class="sess-hero">
        <button class="sh-back" onClick={revenir} aria-label="Retour">←</button>
        <h1 class="sh-title">{titre || 'Ma séance'}</h1>
        <div class="sh-meta show">{total} exercices · 45-60 min</div>
      </div>

      <div class="session-progress">
        <div class="sp-line">
          <span><b>{done}</b><span class="sp-dim">/{total} exercices</span></span>
          <span class="sp-timer">{mmss}</span>
        </div>
        <div class="bar"><div class="fill" style={{ width: pct + '%' }} /></div>
      </div>

      {!demarree && (
        <button class="start-session-btn" onClick={() => setDemarree(true)}>Commencer</button>
      )}

      <div id="sessionList" class={demarree ? '' : 'locked'}>
        {refs.map(({ mKey, ex }, i) => {
          const last = dernierePerf(ex.nom);
          const estFait = faits.has(i);
          const panOuvert = ouverts.has(i);
          const meta = (ex.meta || '').replace(/\s*×\s*/g, ' × ');
          return (
            <div class={'done-item' + (estFait ? ' done' : '')} key={i} onClick={() => basculerFait(i)} style="flex-wrap:wrap">
              <div class="done-photo">
                <img src={`${IMG_BASE}${ex.imgId}/0.jpg`} alt={ex.nom} loading="lazy"
                  onError={(e) => e.currentTarget.parentElement.classList.add('no-img')} />
              </div>
              <div class="done-info">
                <div class="done-name">{ex.nom}</div>
                <div class="done-meta">{meta}</div>
                <div class="ex-chips">
                  {NOMS_MUSCLES[mKey] && <span class="ex-chip">{NOMS_MUSCLES[mKey]}</span>}
                  {last && <span class="ex-chip gold">Dernier {last}</span>}
                </div>
                <button class="sets-btn" onClick={(e) => { e.stopPropagation(); basculerSeries(i); }}>Séries</button>
              </div>
              <div class="done-check">✓</div>
              {panOuvert && (
                <div class="sets-panel open" onClick={(e) => e.stopPropagation()}>
                  {last && <div class="sets-last">Dernière fois : <b>{last}</b></div>}
                  <div>
                    {(series[i] || []).map((l, k) => (
                      <div class="set-row" key={k}>
                        <span class="set-num">{k + 1}</span>
                        <input type="number" inputMode="numeric" placeholder="kg" value={l.w}
                          onInput={(e) => majSerie(i, k, 'w', e.currentTarget.value)} />
                        <span class="set-x">×</span>
                        <input type="number" inputMode="numeric" placeholder="reps" value={l.r}
                          onInput={(e) => majSerie(i, k, 'r', e.currentTarget.value)} />
                      </div>
                    ))}
                  </div>
                  <button class="set-add" onClick={() => ajouterSerie(i)}>＋ Ajouter une série</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
