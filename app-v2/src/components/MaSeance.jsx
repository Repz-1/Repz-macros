import { useState, useEffect, useRef } from 'preact/hooks';
import { createPortal } from 'preact/compat';
import { signal } from '@preact/signals';
import { EXERCISES, IMG_BASE, PROTOCOLES } from '../data/exercices.js';
import { niveauPratique } from './SelectionExercices.jsx';
import { retourEntrainer, allerVers } from './Entrainer.jsx';
import { ongletActif } from './BottomNav.jsx';
import { t } from '../i18n/index.js';
import { enregistrerSeance } from '../store/seances.js';
import '../legacy/maseance.scoped.css';

// ==========================================================
// ECRAN « MA SEANCE » — transpose de ma-seance.html (v1, ecran 2).
// Banniere, progression, Commencer, pause, liste d'exercices
// cochables, series kg x reps, confirmation d'arret, ecran de
// felicitations avec bilan et confettis.
// Le markup et le CSS sont repris de la v1 ; seule la logique
// (variables globales, innerHTML, onclick) passe en signals/hooks.
// ==========================================================

// Exercices choisis dans SelectionExercices : [{mKey, i}]
export const seanceRefs = signal([]);
// Selection d'exercices de l'ecran precedent. Vit ICI (module deja
// importe par SelectionExercices — l'inverse creerait un cycle) pour
// survivre a l'aller-retour selection <-> seance, comme en v1.
// Videe uniquement quand la seance se TERMINE.
export const selectionExos = signal({});

const NOMS_MUSCLES = {
  pecs: 'Pecs', dos: 'Dos', epaules: 'Épaules', biceps: 'Biceps',
  triceps: 'Triceps', jambes: 'Jambes', abdos: 'Abdos',
  etirements: 'Étirements', cardio: 'Cardio',
};

function lireSetLog() {
  try { return JSON.parse(localStorage.getItem('repz_setLog') || '{}'); } catch (e) { return {}; }
}

/** Derniere performance connue pour un exercice, formatee (v1 : getLastPerf). */
function dernierePerf(nom) {
  const hist = lireSetLog()[nom];
  if (!hist || !hist.length) return null;
  const sets = hist[hist.length - 1].sets.filter(s => s.w !== '' || s.r !== '');
  if (!sets.length) return null;
  const w = sets[0].w;
  const memeW = sets.every(s => s.w === w);
  if (memeW && w !== '') return `${w} kg × ${sets.map(s => s.r || '?').join(' · ')}`;
  return sets.map(s => `${s.w || '?'}kg×${s.r || '?'}`).join(' · ');
}

function protocole() {
  // Libre (null) reste null : rien n'est prerempli ni conseille.
  const p = PROTOCOLES[niveauPratique.value];
  return p === undefined ? PROTOCOLES.intermediaire : p;
}
function nbSeriesPrevues() {
  const p = protocole();
  return p ? p.series.length : 1;
}
// Pourcentage conseille pour la n-ieme serie. Au-dela du protocole,
// les series ajoutees a la main n'en portent pas : c'est le
// pratiquant qui decide, l'app ne prescrit rien qu'elle n'ait prevu.
function pctSerie(j) {
  const p = protocole();
  const se = p && p.series[j];
  return se ? se : null;
}

function calculerBilan(exos) {
  let tonnage = 0;
  const records = [];
  const anciens = lireSetLog();
  exos.forEach(e => {
    let bestAvant = 0;
    (anciens[e.nom] || []).forEach(h => h.sets.forEach(s => {
      const w = parseFloat(s.w); if (!isNaN(w) && w > bestAvant) bestAvant = w;
    }));
    e.sets.forEach(s => {
      const w = parseFloat(s.w), r = parseInt(s.r, 10);
      if (!isNaN(w) && !isNaN(r)) tonnage += w * r;
      const dw = parseFloat(s.dw), dr = parseInt(s.dr, 10);
      if (!isNaN(dw) && !isNaN(dr)) tonnage += dw * dr;
      if (!isNaN(w) && bestAvant > 0 && w > bestAvant && !records.includes(e.nom)) records.push(e.nom);
    });
  });
  return { tonnage: Math.round(tonnage), records };
}

function sauverSeries(exos) {
  if (!exos.length) return;
  try {
    const log = lireSetLog();
    const iso = new Date().toISOString().slice(0, 10);
    exos.forEach(e => {
      if (!log[e.nom]) log[e.nom] = [];
      log[e.nom].push({ iso, sets: e.sets });
      if (log[e.nom].length > 30) log[e.nom] = log[e.nom].slice(-30);
    });
    localStorage.setItem('repz_setLog', JSON.stringify(log));
  } catch (e) {}
}

function lancerConfettis() {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cols = ['var(--or)', '#181818', '#ffffff', 'var(--or-trait)', 'var(--or-pale)'];
  for (let i = 0; i < 60; i++) {
    const c = document.createElement('div');
    c.className = 'confetti';
    const taille = 6 + Math.random() * 7;
    c.style.cssText = `left:${Math.random() * 100}vw; width:${taille}px; height:${taille * 0.45}px;`
      + `background:${cols[Math.floor(Math.random() * cols.length)]};`
      + `animation-duration:${2 + Math.random() * 2}s; animation-delay:${Math.random() * 0.6}s;`
      + `transform:rotate(${Math.random() * 360}deg);`;
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 5000);
  }
}

export function MaSeance() {
  const refs = seanceRefs.value;
  const exos = refs.map(r => EXERCISES[r.mKey] && EXERCISES[r.mKey][r.i]).filter(Boolean);

  const [demarree, setDemarree] = useState(false);
  const [enPause, setEnPause] = useState(false);
  const [chrono, setChrono] = useState(0);              // secondes ecoulees
  const [faits, setFaits] = useState(() => new Set());  // index coches
  const [ouverts, setOuverts] = useState(() => new Set());
  const [series, setSeries] = useState({});             // { i: [{w,r}] }
  const [arret, setArret] = useState(false);
  const [fini, setFini] = useState(null);               // { min, tonnage, records }

  const debut = useRef(0);
  const pauseA = useRef(0);
  const enregistre = useRef(false);

  // Chronometre de seance : gele pendant la pause (v1 : dureeInterval)
  useEffect(() => {
    if (!demarree || fini) return;
    const it = setInterval(() => {
      if (enPause) return;
      setChrono(Math.floor((Date.now() - debut.current) / 1000));
    }, 1000);
    return () => clearInterval(it);
  }, [demarree, enPause, fini]);

  const mmss = (s) => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');

  const demarrer = () => {
    if (demarree) return;
    debut.current = Date.now();
    setChrono(0); setDemarree(true);
  };

  const basculerPause = () => {
    if (!demarree) return;
    if (!enPause) { pauseA.current = Date.now(); setEnPause(true); }
    else {
      debut.current += (Date.now() - pauseA.current);
      setEnPause(false);
    }
  };

  const nettoyerSet = (x) => {
    const o = { w: x.w === '' ? '' : parseFloat(x.w), r: x.r === '' ? '' : parseInt(x.r, 10) };
    if (x.dw || x.dr) {
      o.dw = x.dw ? parseFloat(x.dw) : '';
      o.dr = x.dr ? parseInt(x.dr, 10) : '';
    }
    return o;
  };
  const collecter = () => {
    const out = [];
    exos.forEach((ex, i) => {
      const s = (series[i] || []).filter(x => x.w !== '' || x.r !== '' || x.dw || x.dr)
        .map(nettoyerSet);
      if (s.length) out.push({ nom: ex.nom, sets: s });
    });
    return out;
  };

  // Ce qui part au journal d'entrainement : tout exercice fait, avec ses
  // series s'il en a. Un exercice coche sans chiffres reste une trace.
  const collecterPourJournal = (coches) => {
    const out = [];
    const faitsFinaux = coches || faits;
    exos.forEach((ex, i) => {
      const s = (series[i] || []).filter(x => x.w !== '' || x.r !== '' || x.dw || x.dr)
        .map(nettoyerSet);
      if (s.length || faitsFinaux.has(i)) {
        out.push({ nom: ex.nom, mKey: refs[i] ? refs[i].mKey : null, sets: s });
      }
    });
    return out;
  };

  const felicitations = (coches) => {
    if (enregistre.current) return;
    enregistre.current = true;
    lancerConfettis();
    if (enPause) { debut.current += (Date.now() - pauseA.current); setEnPause(false); }
    const listeExos = collecter();
    const bilan = calculerBilan(listeExos);
    const duree = debut.current ? Math.floor((Date.now() - debut.current) / 1000) : 0;
    // Journal d'entrainement : la seance est enregistree par compte et
    // synchronisee (users/{uid}.v2Data.seances), plus en localStorage global.
    const exosJournal = collecterPourJournal(coches);
    enregistrerSeance({
      duree,
      titre: t('tr_free_title'),
      muscles: [...new Set(exosJournal.map(e => e.mKey).filter(Boolean))],
      exos: exosJournal,
      tonnage: bilan.tonnage,
      records: bilan.records,
    });
    sauverSeries(listeExos);
    setFini({ min: duree ? Math.max(1, Math.round(duree / 60)) : 0, ...bilan });
  };

  const terminer = () => {
    if (faits.size === exos.length && exos.length > 0) { felicitations(); return; }
    setArret(true);
  };

  const confirmerArret = () => {
    setArret(false);
    if (faits.size > 0) felicitations();
    else { seanceRefs.value = []; selectionExos.value = {}; ongletActif.value = 'journal'; retourEntrainer(); }
  };

  const cocher = (i) => {
    const s = new Set(faits);
    if (s.has(i)) s.delete(i); else s.add(i);
    setFaits(s);
    if (exos.length > 0 && s.size === exos.length) setTimeout(() => felicitations(s), 400);
  };

  const basculerSeries = (i) => {
    const o = new Set(ouverts);
    if (o.has(i)) o.delete(i);
    else {
      o.add(i);
      if (!series[i] || !series[i].length) {
        const nb = nbSeriesPrevues();
        // Les schemas en repetitions (3×10, 4×12) preremplissent la
        // colonne reps — modifiable, comme tout le reste.
        setSeries(p => ({ ...p, [i]: Array.from({ length: nb }, (_, j) => {
          const se = pctSerie(j);
          return { w: '', r: se && se.reps != null ? se.reps : '' };
        }) }));
      }
    }
    setOuverts(o);
  };

  const majSerie = (i, j, champ, val) => {
    setSeries(p => {
      const l = (p[i] || []).map((s, k) => k === j ? { ...s, [champ]: val } : s);
      return { ...p, [i]: l };
    });
  };
  const ajouterSerie = (i) => setSeries(p => ({ ...p, [i]: [...(p[i] || []), { w: '', r: '' }] }));
  const retirerSerie = (i, j) => setSeries(p => ({ ...p, [i]: (p[i] || []).filter((_, k) => k !== j) }));

  const pct = exos.length ? (faits.size / exos.length) * 100 : 0;

  if (!exos.length) {
    return (
      <div class="pg-maseance">
        <div class="sess-hero">
          <button class="sh-back" onClick={() => allerVers('selection')} aria-label="Retour">←</button>
          <h1 class="sh-title">{t('ms_session')}</h1>
        </div>
        {/* L'etat vide n'offrait qu'une phrase : « Aucun exercice
            selectionne. » On y arrivait sans savoir quoi faire — la
            seule issue etait la fleche retour, en haut a gauche, qui
            ressemble a un abandon plutot qu'a la suite du parcours.
            Le bouton nomme l'action manquante. */}
        <div class="empty-session">
          <p class="empty-session-txt">{t('ms_empty')}</p>
          <button class="empty-session-cta" onClick={() => allerVers('selection')}>
            {t('ms_ajouter')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div class="pg-maseance">

      <div class="sess-hero">
        <button class="sh-back" onClick={() => allerVers('selection')} aria-label="Retour">←</button>
        <h1 class="sh-title">{t('ms_session')}</h1>
      </div>

      <div class="session-progress">
        <div class="sp-line">
          <span><b>{faits.size}</b><span class="sp-dim">/{exos.length} {t('ms_exercises')}</span></span>
          <span class={'sp-timer' + (enPause ? ' paused' : '')}>{mmss(chrono)}</span>
        </div>
        <div class="bar"><div class="fill" style={{ width: pct + '%' }} /></div>
      </div>

      {!demarree && (
        <button class="start-session-btn" onClick={demarrer}>{t('tr_start')}</button>
      )}

      <div class={'session-controls' + (demarree ? ' visible' : '')}>
        <button class={'sc-pause' + (enPause ? ' paused' : '')} onClick={basculerPause}>
          {enPause ? t('ms_resume') : t('ms_pause')}
        </button>
        <button class="sc-stop" onClick={terminer}>{t('ms_finish')}</button>
      </div>

      <div class={'session-list' + (demarree ? '' : ' locked')}>
        {exos.map((ex, i) => {
          const last = dernierePerf(ex.nom);
          const muscle = NOMS_MUSCLES[refs[i].mKey] || '';
          const ouvert = ouverts.has(i);
          return (
            <div key={i} class={'done-item' + (faits.has(i) ? ' done' : '')}
              style="flex-wrap:wrap" onClick={() => basculerSeries(i)}>
              <div class="done-photo">
                <img src={IMG_BASE + ex.imgId + '/0.jpg'} alt={ex.nom} loading="lazy"
                  onError={(e) => e.currentTarget.parentElement.classList.add('no-img')} />
              </div>
              <div class="done-info">
                <div class="done-name">{ex.nom}</div>
                {/* Le sous-titre montrait « 4 séries × 8-10 reps », un
                    texte fige de la v1, pendant que le protocole du
                    niveau disait autre chose juste en dessous. Une
                    seule verite : celle du niveau choisi. */}
                <div class="done-meta">{protocole() ? protocole().resume : 'Séries libres'}</div>
                {(muscle || last) && (
                  <div class="ex-chips">
                    {muscle && <span class="ex-chip">{muscle}</span>}
                    {last && <span class="ex-chip gold">{last}</span>}
                  </div>
                )}
                <button class={'sets-btn' + (ouvert ? ' open' : '')}
                  onClick={(e) => { e.stopPropagation(); basculerSeries(i); }}>
                  {t('ms_sets_btn')}
                </button>
              </div>
              <div class="done-check" role="button" aria-label="Marquer comme fait"
                onClick={(e) => { e.stopPropagation(); cocher(i); }}>✓</div>
              <div class={'sets-panel' + (ouvert ? ' open' : '')} onClick={(e) => e.stopPropagation()}>
                {last && <div class="sets-last">{t('ms_last_time')} : <b>{last}</b></div>}
                {protocole() && <div class="sets-proto">{protocole().resume}</div>}
                <div>
                  {(series[i] || []).map((s, j) => (
                    <div class={'set-row' + (pctSerie(j) && pctSerie(j).degressive ? ' degressive' : '')} key={j}>
                      <div class="set-num">{j + 1}</div>
                      {/* Le pourcentage conseille, en face de la ligne
                          qu'on remplit : plus besoin de rouvrir la
                          fiche pour se souvenir du plan. */}
                      <div class="set-pct">{pctSerie(j) ? (pctSerie(j).pct != null ? pctSerie(j).pct + ' %' : '× ' + pctSerie(j).reps) : '—'}</div>
                      <input type="number" inputMode="decimal" step="0.5" min="0" placeholder="××"
                        value={s.w} onInput={(e) => majSerie(i, j, 'w', e.currentTarget.value)} />
                      <span class="set-unit">kg</span>
                      <span class="set-x">×</span>
                      <input type="number" inputMode="numeric" min="0" placeholder="××"
                        value={s.r} onInput={(e) => majSerie(i, j, 'r', e.currentTarget.value)} />
                      <span class="set-unit">reps</span>
                      <button class="set-del" onClick={() => retirerSerie(i, j)} aria-label="Retirer">×</button>
                    </div>
                  ))}
                  {(series[i] || []).map((s, j) => (
                    pctSerie(j) && pctSerie(j).degressive ? (
                      <div class="set-row set-deg" key={'d' + j}>
                        <div class="set-num deg">D</div>
                        <div class="set-pct">dégr.</div>
                        <input type="number" inputMode="decimal" step="0.5" min="0" placeholder="××"
                          value={s.dw || ''} onInput={(e) => majSerie(i, j, 'dw', e.currentTarget.value)} />
                        <span class="set-unit">kg</span>
                        <span class="set-x">×</span>
                        <input type="number" inputMode="numeric" min="0" placeholder="××"
                          value={s.dr || ''} onInput={(e) => majSerie(i, j, 'dr', e.currentTarget.value)} />
                        <span class="set-unit">reps</span>
                      </div>
                    ) : null
                  ))}
                </div>
                <button class="set-add" onClick={() => ajouterSerie(i)}>＋ {t('ms_add_set')}</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirmation d'arret (seance incomplete) */}
      {createPortal(
      <div class={'congrats-overlay pg-maseance' + (arret ? ' show' : '')}>
        <div class="congrats-card">
          <div class="congrats-emoji">🤔</div>
          <div class="congrats-title">{t('ms_stop_title')}</div>
          <div class="congrats-text">
            {faits.size > 0
              ? `Tu as fait ${faits.size} exercice${faits.size > 1 ? 's' : ''} sur ${exos.length}. Ta séance sera quand même comptée 💪`
              : `Tu n'as coché aucun exercice. La séance ne sera pas enregistrée.`}
          </div>
          <button class="congrats-btn" onClick={confirmerArret}>{t('ms_stop_yes')}</button>
          <button class="sc-cancel" onClick={() => setArret(false)}>{t('ms_stop_no')}</button>
        </div>
      </div>, document.body)}

      {/* Felicitations + bilan */}
      {createPortal(
      <div class={'congrats-overlay pg-maseance' + (fini ? ' show' : '')}>
        {fini && (
          <div class="congrats-card">
            <div class="congrats-emoji">🎉</div>
            <div class="congrats-title">{t('ms_done_title')}</div>
            <div class="congrats-text">{t('ms_done_text')}</div>
            <div>
              <div class="cg-stats">
                {fini.min > 0 && (
                  <div class="cg-box"><div class="v">{fini.min} min</div><div class="l">{t('ms_duration')}</div></div>
                )}
                {fini.tonnage > 0 && (
                  <div class="cg-box"><div class="v">{fini.tonnage.toLocaleString('fr-FR')} kg</div><div class="l">{t('ms_total_lifted')}</div></div>
                )}
                <div class="cg-box"><div class="v">{exos.length}</div><div class="l">{t('ms_exercises_cap')}</div></div>
              </div>
              {fini.records && fini.records.length > 0 && (
                <div class="cg-record">🏆 {t('ms_new_record')} : {fini.records.join(', ')} !</div>
              )}
            </div>
            <button class="congrats-btn" onClick={() => { seanceRefs.value = []; selectionExos.value = {}; retourEntrainer(); ongletActif.value = 'journal'; }}>
              {t('ms_back_journal')}
            </button>
          </div>
        )}
      </div>, document.body)}

    </div>
  );
}
