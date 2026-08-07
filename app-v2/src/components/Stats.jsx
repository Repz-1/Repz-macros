import { useState, useRef, useEffect } from 'preact/hooks';
import { weightLog, histoJours, ajouterPesee } from '../store/stats.js';
import { muscleLog } from '../store/entrainement.js';
import { setLog } from './SeanceTracker.jsx';
import { estPremium } from './PremiumPage.jsx';
import { ongletActif } from './BottomNav.jsx';
import { t } from '../i18n/index.js';
import { Entete } from './Entete.jsx';
import '../legacy/stats.scoped.css';

// ==========================================================
// PAGE MES STATS — portage a l'identique de mes-stats.html (v1).
// Regle : la v1 est la reference absolue. Memes cartes, meme
// silhouette (dos, avant-bras, mains inclus), memes graphiques,
// meme modale « muscles du jour », meme bouton pesee.
// ==========================================================

const LIMITE_GRATUIT = 7;
const COL = { pecs: '#EF4444', dos: '#F97316', epaules: '#F7B500', biceps: '#10B981', triceps: '#06B6D4', jambes: '#3B82F6', abdos: '#8B5CF6' };

const isoNDaysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };
const jourCourt = (iso) => new Date(iso + 'T00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
// Pesees : v1 = {iso, date, weight} ; tolere l'ancien format v2 {iso, kg}
const poidsDe = (e) => parseFloat(e.weight ?? e.kg) || 0;

// ---------- Etat vide (v1 .chart-empty) ----------
function Vide({ texte, cta, onCta }) {
  return (
    <div class="chart-empty">
      <div>{texte}<br /><button class="ce-btn" onClick={onCta}>{cta}</button></div>
    </div>
  );
}

// ---------- Silhouette : copie exacte de bodyMapSVG (v1) ----------
// v1 : <div class="bodymap">svg + legende</div> — la legende vit DANS .bodymap (118px)
/* Exportee : la modale des muscles de S'entrainer l'affiche aussi,
   pour qu'on voie sur le corps ce qu'on est en train de cocher. */
export function BodyMap({ compte, onClick }) {
  // Travaille sur la periode -> couleur du muscle ; sinon gris
  const col = (k) => (compte[k] > 0 ? (COL[k] || '#F7B500') : '#E9EBEF');
  // Avant-bras et mains : rattaches visuellement au bras (v1)
  const colBras = () => {
    if (compte.biceps > 0) return COL.biceps;
    if (compte.triceps > 0) return COL.triceps;
    return '#E9EBEF';
  };
  return (
    <div class="bodymap" onClick={onClick}>
      <svg viewBox="0 0 100 200" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="16" r="11" class="bp" />
        <rect x="42" y="27" width="16" height="8" rx="3" class="bp" />
        <path class="bp" style={{ fill: col('epaules') }} d="M30 37 q-8 1 -10 8 l4 6 q6 -6 12 -6z" />
        <path class="bp" style={{ fill: col('epaules') }} d="M70 37 q8 1 10 8 l-4 6 q-6 -6 -12 -6z" />
        <path class="bp" style={{ fill: col('dos') }} d="M33 40 q-4 3 -4 9 l0 8 q0 3 3 3 l3 0 q-2 -10 -1 -20z" />
        <path class="bp" style={{ fill: col('dos') }} d="M67 40 q4 3 4 9 l0 8 q0 3 -3 3 l-3 0 q2 -10 1 -20z" />
        <path class="bp" style={{ fill: col('pecs') }} d="M36 37 h28 q3 0 3 4 v10 q0 4 -4 4 h-26 q-4 0 -4 -4 v-10 q0 -4 3 -4z" />
        <path class="bp" style={{ fill: col('abdos') }} d="M39 60 h22 q2 0 2 3 v20 q0 3 -3 3 h-20 q-3 0 -3 -3 v-20 q0 -3 2 -3z" />
        <path class="bp" style={{ fill: col('biceps') }} d="M22 47 q-4 8 -4 18 l6 2 q2 -10 4 -16z" />
        <path class="bp" style={{ fill: col('biceps') }} d="M78 47 q4 8 4 18 l-6 2 q-2 -10 -4 -16z" />
        <path class="bp" style={{ fill: col('triceps') }} d="M17 66 q-2 8 -1 16 l6 -1 q0 -8 1 -14z" />
        <path class="bp" style={{ fill: col('triceps') }} d="M83 66 q2 8 1 16 l-6 -1 q0 -8 -1 -14z" />
        <path class="bp" style={{ fill: colBras() }} d="M15 83 q-2 8 -1 15 l6 -1 q0 -7 1 -13z" />
        <path class="bp" style={{ fill: colBras() }} d="M85 83 q2 8 1 15 l-6 -1 q0 -7 -1 -13z" />
        <ellipse class="bp" style={{ fill: colBras() }} cx="16.5" cy="102" rx="3.6" ry="5" />
        <ellipse class="bp" style={{ fill: colBras() }} cx="83.5" cy="102" rx="3.6" ry="5" />
        <path class="bp" style={{ fill: col('jambes') }} d="M40 89 h9 v40 q0 6 -5 6 q-5 0 -5 -6 z" />
        <path class="bp" style={{ fill: col('jambes') }} d="M60 89 h-9 v40 q0 6 5 6 q5 0 5 -6 z" />
        <path class="bp" style={{ fill: col('jambes') }} d="M39 137 h10 v34 q0 4 -5 4 q-5 0 -5 -4z" />
        <path class="bp" style={{ fill: col('jambes') }} d="M61 137 h-10 v34 q0 4 5 4 q5 0 5 -4z" />
      </svg>
      <div class="bodymap-legend"><i style="background:#E9EBEF" />{t('st_not_worked')}</div>
    </div>
  );
}

// ---------- Modale poids : copie v1 (weightModal, app.html) ----------
export function WeightModal({ fermer }) {
  const l = weightLog.value || [];
  const last = l.length ? parseFloat(poidsDe([...l].sort((a, b) => a.iso.localeCompare(b.iso))[l.length - 1])) : null;

  const MIN = 30, MAX = 150;
  const borne = (v) => Math.min(MAX, Math.max(MIN, Math.round(v * 10) / 10));
  const [val, setVal] = useState(borne(last || 80));
  const [manuel, setManuel] = useState(false);
  const [texte, setTexte] = useState('');
  const repete = useRef(null);

  // Appui long : premiere marche tout de suite, puis repetition rapide.
  const demarrerPas = (sens) => {
    setVal(v => borne(v + sens * 0.1));
    let delai = setTimeout(function tourne() {
      setVal(v => borne(v + sens * 0.1));
      delai = setTimeout(tourne, 70);
      repete.current = delai;
    }, 420);
    repete.current = delai;
  };
  const arreterPas = () => { clearTimeout(repete.current); repete.current = null; };
  useEffect(() => () => clearTimeout(repete.current), []);

  const validerManuel = () => {
    const v = parseFloat(String(texte).replace(',', '.'));
    setManuel(false);
    if (!isNaN(v)) setVal(borne(v));
  };

  const enregistrer = () => {
    if (!val || val <= 0) { alert(t('js_weight_invalid')); return; }
    ajouterPesee(val);
    fermer();
  };

  const delta = last !== null ? +(val - last).toFixed(1) : null;

  return (
    <div class="modal-overlay show wm2-voile" onClick={(e) => { if (e.target === e.currentTarget) fermer(); }}>
      <div class="wm2">
        <div class="wm2-poignee" />

        <div class="wm2-rang">
          <button
            class="wm2-pas" aria-label="Moins"
            onPointerDown={() => demarrerPas(-1)}
            onPointerUp={arreterPas} onPointerLeave={arreterPas} onPointerCancel={arreterPas}
          ><svg viewBox="0 0 24 24"><path d="M5.5 12h13" /></svg></button>

          {manuel ? (
            <div class="wm2-valeur wm2-valeur--champ">
              <input
                type="number" inputMode="decimal" step="0.1" min={MIN} max={MAX}
                value={texte} autoFocus
                onInput={(e) => setTexte(e.currentTarget.value)}
                onBlur={validerManuel}
                onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
              />
            </div>
          ) : (
            <button class="wm2-valeur wm2-valeur--btn"
              onClick={() => { setTexte(val.toFixed(1)); setManuel(true); }}>
              {val.toFixed(1).replace('.', ',')}<span>kg</span>
            </button>
          )}

          <button
            class="wm2-pas" aria-label="Plus"
            onPointerDown={() => demarrerPas(1)}
            onPointerUp={arreterPas} onPointerLeave={arreterPas} onPointerCancel={arreterPas}
          ><svg viewBox="0 0 24 24"><path d="M12 5.5v13M5.5 12h13" /></svg></button>
        </div>

        <div class="wm2-delta-zone">
          {delta !== null && delta !== 0 ? (
            <span class={'wm2-delta' + (delta < 0 ? ' baisse' : ' hausse')}>
              {delta > 0 ? '+' : '\u2212'}{Math.abs(delta).toFixed(1)} kg {t('wm2_depuis')}
            </span>
          ) : <span class="wm2-delta neutre">{last !== null ? t('wm2_pareil') : '\u00a0'}</span>}
        </div>

        <button class="wm2-ok" onClick={enregistrer}>{t('save')}</button>
        <button class="wm2-annuler" onClick={fermer}>{t('cancel')}</button>
      </div>
    </div>
  );
}

export function Stats() {
  const [exoSel, setExoSel] = useState(null);
  const [modalePoids, setModalePoids] = useState(false);
  const prem = estPremium.value;

  const poidsData = weightLog.value || [];
  const histoBrut = histoJours.value || {};
  // v1 : history = [{iso, date, kcal, ...}] ; store v2 = {iso: {kcal,...}}
  const histoire = Object.entries(histoBrut).map(([iso, v]) => ({ iso, ...(v || {}) }));
  const mLog = muscleLog.value || {};
  // setLog v2 : { iso: [{ex, series:[{kg,reps}]}] }
  // -> vue par exercice, meme forme que la v1 : { nom: [{iso, sets:[{w,r}]}] }
  const setLogJours = setLog.value || {};
  const setLogAll = {};
  Object.keys(setLogJours).sort().forEach(iso => {
    (setLogJours[iso] || []).forEach(e => {
      if (!e || !e.ex) return;
      const sets = (e.series || []).map(s => ({ w: s.kg, r: s.reps }));
      if (!sets.length) return;
      (setLogAll[e.ex] = setLogAll[e.ex] || []).push({ iso, sets });
    });
  });
  // « Seance faite ce jour » (remplace le sessionLog v1) : au moins une serie notee
  const seanceFaite = (iso) => (setLogJours[iso] || []).some(e => (e.series || []).length);

  // ================= Score global sur 7 jours (v1 calcScores) =================
  const j7 = Array.from({ length: 7 }, (_, i) => isoNDaysAgo(i));
  const jourActif = (iso) =>
    histoire.some(e => e.iso === iso) ||
    (mLog[iso] && mLog[iso].length && !(mLog[iso].length === 1 && mLog[iso][0] === 'repos')) ||
    seanceFaite(iso) ||
    poidsData.some(w => w.iso === iso);

  const nutrition = Math.round(j7.filter(iso => histoire.some(e => e.iso === iso)).length / 7 * 100);
  const trainJours = j7.filter(iso =>
    (mLog[iso] && mLog[iso].length && !(mLog[iso].length === 1 && mLog[iso][0] === 'repos')) ||
    seanceFaite(iso)).length;
  const entrainement = Math.min(100, Math.round(trainJours / 4 * 100));

  const p14 = poidsData.filter(w => w.iso >= isoNDaysAgo(14)).sort((a, b) => a.iso.localeCompare(b.iso));
  let scorePoids;
  if (!p14.length) scorePoids = poidsData.length ? 40 : 0;
  else if (p14.length === 1) scorePoids = 60;
  else {
    const first = poidsDe(p14[0]), last = poidsDe(p14[p14.length - 1]);
    // v1 : goal.weight = derniere pesee saisie -> meme cible ici, sans localStorage
    const cible = poidsData.length ? poidsDe([...poidsData].sort((a, b) => a.iso.localeCompare(b.iso))[poidsData.length - 1]) : 0;
    scorePoids = cible > 0 ? (Math.abs(last - cible) <= Math.abs(first - cible) ? 100 : 65) : 90;
  }
  const regularite = Math.round(j7.filter(jourActif).length / 7 * 100);
  const global = Math.round((nutrition + entrainement + scorePoids + regularite) / 4);
  const rienDuTout = !histoire.length && !poidsData.length && !Object.keys(setLogJours).length && !Object.keys(mLog).length;

  // ================= Poids (v1 renderWeight) =================
  let poidsTri = [...poidsData].sort((a, b) => a.iso.localeCompare(b.iso));
  if (!prem && poidsTri.length > LIMITE_GRATUIT) poidsTri = poidsTri.slice(-LIMITE_GRATUIT);

  const poidsActuel = poidsTri.length ? poidsDe(poidsTri[poidsTri.length - 1]) : 0;
  const poidsDebut = poidsTri.length ? poidsDe(poidsTri[0]) : 0;
  const diff = (poidsActuel - poidsDebut).toFixed(1);

  // ================= Calories (v1 renderKcal) =================
  let kcalTri = [...histoire].sort((a, b) => (a.iso || '').localeCompare(b.iso || ''));
  if (!prem && kcalTri.length > LIMITE_GRATUIT) kcalTri = kcalTri.slice(-LIMITE_GRATUIT);
  const moyKcal = kcalTri.length ? Math.round(kcalTri.reduce((s, d) => s + parseInt(d.kcal || 0), 0) / kcalTri.length) : 0;
  const derniereKcal = kcalTri.length ? parseInt(kcalTri[kcalTri.length - 1].kcal || 0) : 0;


  // ================= Progression par exercice (v1 renderExoProg) =================
  const topSet = (sets) => {
    let best = null;
    (sets || []).forEach(s => {
      const w = (s.w === '' || s.w == null) ? null : parseFloat(s.w);
      if (w != null && (best == null || w > best.w)) best = { w, r: s.r };
    });
    return best;
  };
  const nomsExos = Object.keys(setLogAll)
    .filter(n => (setLogAll[n] || []).some(e => (e.sets || []).some(s => s.w !== '' && s.w != null))).sort();
  const nomExo = (exoSel && nomsExos.includes(exoSel)) ? exoSel : nomsExos[0];
  let histExo = [], pr = 0, prReps = 0, deltaStr = '—';
  if (nomExo) {
    histExo = setLogAll[nomExo].filter(e => (e.sets || []).some(s => s.w !== '' && s.w != null)).slice(-7);
    setLogAll[nomExo].forEach(e => (e.sets || []).forEach(s => {
      const w = parseFloat(s.w);
      if (!isNaN(w) && w > pr) { pr = w; prReps = s.r || 0; }
    }));
    const premiere = topSet((setLogAll[nomExo].find(e => topSet(e.sets)) || {}).sets);
    const derniere = histExo.length ? topSet(histExo[histExo.length - 1].sets) : null;
    const delta = (premiere && derniere) ? (derniere.w - premiere.w) : 0;
    deltaStr = delta > 0 ? `+${delta} kg` : (delta < 0 ? `${delta} kg` : '—');
  }

  return (
    <div class="pg-stats">
      <div class="container">
        {/* Meme en-tete que le Journal et S'entrainer : fleche
            retour, prenom, profil et reglages — une seule source.
            L'ancien app-header (logo-bandeau 55 px, boutons 27) et
            le bloc-titre « Mes stats » disparaissent, comme sur
            S'entrainer : le nom de l'onglet est deja dans la
            navigation du bas. */}
        <Entete />

        {/* NOTE DE PROGRESSION GLOBALE */}
        {!rienDuTout && (
          <div class="score-card">
            <div class="score-head"><div>
              <div class="score-title">{t('st_score_title')}</div>
              <div class="score-val">
                <span>{global}</span><small> %</small>
                <span class="score-dot" style={{ background: global >= 70 ? '#10B981' : (global >= 40 ? '#F97316' : '#DC2626') }} />
              </div>
            </div></div>
            <div class="score-note">
              {global >= 85 ? t('st_note_a') : global >= 70 ? t('st_note_b') : global >= 40 ? t('st_note_c') : t('st_note_d')}
            </div>
            <div class="score-rows">
              {[[t('st_row_nutrition'), nutrition], [t('st_row_training'), entrainement],
                [t('st_row_weight'), scorePoids], [t('st_row_regularity'), regularite]].map(([l, v]) => (
                <div class="score-row" key={l}>
                  <div class="sr-lbl">{l}</div>
                  <div class="sr-bar"><div class="sr-fill" style={{ width: v + '%' }} /></div>
                  <div class="sr-val">{v}%</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* POIDS */}
        <div class="stat-card acc-green">
          <h2><svg class="h2ic" viewBox="0 0 24 24"><path d="M4 4v16h16" /><path d="M7 14l3-3 2.5 2L20 7" /></svg><span>{t('st_weight')}</span></h2>
          <div class="card-sub">{t('st_weight_sub')}</div>
          {poidsTri.length ? (
            <>
              <div class="stat-summary">
                <div class="stat-box"><div class="sb-val">{poidsActuel} kg</div><div class="sb-lbl">{t('st_cur_weight')}</div></div>
                <div class="stat-box"><div class="sb-val">{diff > 0 ? '+' + diff : diff} kg</div><div class="sb-lbl">{t('st_variation')}</div></div>
              </div>
              <div class="chart">
                {(() => {
                  const vals = poidsTri.map(poidsDe);
                  const min = Math.min(...vals) - 1, max = Math.max(...vals) + 1;
                  return poidsTri.map(d => {
                    const p = poidsDe(d);
                    const h = max > min ? ((p - min) / (max - min)) * 100 : 50;
                    const jour = d.date ? d.date.split(' ').slice(0, 2).join(' ') : jourCourt(d.iso);
                    return (
                      <div class="chart-bar-wrap" key={d.iso}>
                        <div class="chart-val">{p}</div>
                        <div class="chart-bar weight" style={{ height: Math.max(6, h) + '%' }} />
                        <div class="chart-day">{jour}</div>
                      </div>
                    );
                  });
                })()}
              </div>
            </>
          ) : <Vide texte={t('st_no_weight')} cta={t('st_add_weight')} onCta={() => setModalePoids(true)} />}
          <button class="weight-add-btn" onClick={() => setModalePoids(true)}>{t('st_weight_add')}</button>
        </div>

        {/* CALORIES */}
        <div class="stat-card acc-orange">
          <h2><svg class="h2ic" viewBox="0 0 24 24"><path d="M12 3C9 7 7 9 7 13a5 5 0 0010 0c0-2-1-3.6-2.5-5-.3 1.2-1 2-2 2.4C13 8 13 5.5 12 3z" /></svg><span>{t('st_kcal')}</span></h2>
          <div class="card-sub">{t('st_kcal_sub')}</div>
          {kcalTri.length ? (
            <>
              <div class="stat-summary">
                <div class="stat-box"><div class="sb-val">{moyKcal}</div><div class="sb-lbl">{t('st_avg_kcal')}</div></div>
                <div class="stat-box"><div class="sb-val">{derniereKcal}</div><div class="sb-lbl">{t('st_last_day')}</div></div>
              </div>
              <div class="chart">
                {(() => {
                  const kcals = kcalTri.map(d => parseInt(d.kcal || 0));
                  const max = Math.max(...kcals) * 1.1;
                  return kcalTri.map(d => {
                    const k = parseInt(d.kcal || 0);
                    const h = max > 0 ? (k / max) * 100 : 0;
                    // v1 : « mer. 15 » (champ date de history) — reconstruit depuis l'iso
                    const jour = d.date ? d.date.split(' ').slice(0, 2).join(' ')
                      : new Date(d.iso + 'T00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });
                    return (
                      <div class="chart-bar-wrap" key={d.iso}>
                        <div class="chart-val">{k}</div>
                        <div class="chart-bar kcalbar" style={{ height: Math.max(6, h) + '%' }} />
                        <div class="chart-day">{jour}</div>
                      </div>
                    );
                  });
                })()}
              </div>
            </>
          ) : <Vide texte={t('st_no_day')} cta={t('st_save_day')} onCta={() => { ongletActif.value = 'journal'; }} />}
        </div>

        {/* PROGRESSION PAR EXERCICE */}
        <div class="stat-card acc-blue">
          <h2><svg class="h2ic" viewBox="0 0 24 24"><path d="M6 20V10M12 20V4M18 20v-7" /></svg><span>{t('st_exo')}</span></h2>
          <div class="card-sub">{t('st_exo_sub')}</div>
          {nomExo ? (
            <>
              <select class="exo-select" value={nomExo} onChange={(e) => setExoSel(e.target.value)}>
                {nomsExos.map(n => <option value={n} key={n}>{n}</option>)}
              </select>
              <div class="exo-pr">
                <div class="exo-pr-box"><div class="v">{pr} kg</div><div class="l">{t('st_record')}{prReps ? ` × ${prReps}` : ''}</div></div>
                <div class="exo-pr-box"><div class="v">{deltaStr}</div><div class="l">{t('st_since_start')}</div></div>
                <div class="exo-pr-box"><div class="v">{histExo.length}</div><div class="l">{t('st_sessions_tracked')}</div></div>
              </div>
              <div class="chart">
                {(() => {
                  const vals = histExo.map(e => topSet(e.sets).w);
                  const mx = Math.max(...vals), mn = Math.min(...vals), span = (mx - mn) || 1;
                  return histExo.map(e => {
                    const ts = topSet(e.sets);
                    return (
                      <div class="chart-bar-wrap" key={e.iso}>
                        <div class="chart-val">{ts.w}</div>
                        <div class="chart-bar charge" style={{ height: (25 + ((ts.w - mn) / span) * 75) + '%' }} />
                        <div class="chart-day">{jourCourt(e.iso)}</div>
                      </div>
                    );
                  });
                })()}
              </div>
            </>
          ) : <Vide texte={t('st_no_sets')} cta={t('st_start_session')} onCta={() => { ongletActif.value = 'entrainer'; }} />}
        </div>

        {/* INVITATION PREMIUM */}
        {!prem && (
          <div class="premium-invite">
            <div class="pi-icon"><svg viewBox="0 0 24 24"><path d="M6.5 6.5v11M17.5 6.5v11M3 9v6M21 9v6M6.5 12h11" /></svg></div>
            <h3>{t('st_prem_title')}</h3>
            <p dangerouslySetInnerHTML={{ __html: t('st_prem_body') }} />
            <button class="pi-btn" onClick={() => { ongletActif.value = 'premium'; }}>{t('support_unlock')}</button>
            <div class="locked-note">{t('st_locked_note')}</div>
          </div>
        )}
      </div>

      {modalePoids && <WeightModal fermer={() => setModalePoids(false)} />}
    </div>
  );
}
