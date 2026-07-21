import { useState } from 'preact/hooks';
import { weightLog, histoJours, ajouterPesee } from '../store/stats.js';
import { muscleLog, basculerMuscle, viderJourMuscles } from '../store/entrainement.js';
import { setLog } from './SeanceTracker.jsx';
import { estPremium } from './PremiumPage.jsx';
import { ongletActif } from './BottomNav.jsx';
import { t } from '../i18n/index.js';
import { ouvrirProfil } from './Entete.jsx';
import '../legacy/stats.scoped.css';

// ==========================================================
// PAGE MES STATS — portage a l'identique de mes-stats.html (v1).
// Regle : la v1 est la reference absolue. Memes cartes, meme
// silhouette (dos, avant-bras, mains inclus), memes graphiques,
// meme modale « muscles du jour », meme bouton pesee.
// ==========================================================

const LIMITE_GRATUIT = 7;
// v1 renderRepartition : ordre + couleurs des groupes
const GROUPES_REP = [
  { k: 'pecs', c: '#EF4444' }, { k: 'dos', c: '#F97316' },
  { k: 'epaules', c: '#F7B500' }, { k: 'biceps', c: '#10B981' },
  { k: 'triceps', c: '#06B6D4' }, { k: 'jambes', c: '#3B82F6' },
  { k: 'abdos', c: '#8B5CF6' }, { k: 'cardio', c: '#EC4899' },
];
const COL = { pecs: '#EF4444', dos: '#F97316', epaules: '#F7B500', biceps: '#10B981', triceps: '#06B6D4', jambes: '#3B82F6', abdos: '#8B5CF6' };
// v1 rendreEditMuscles : cles de la modale (repos inclus)
const CLES_ML = ['pecs', 'dos', 'epaules', 'biceps', 'triceps', 'jambes', 'abdos', 'cardio', 'repos'];

const isoNDaysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };
const isoDuJour = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
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
function BodyMap({ compte, onClick }) {
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

// ---------- Modale « muscles du jour » : copie v1 (ml-overlay) ----------
function MlModal({ iso, setIso, fermer }) {
  const sel = muscleLog.value[iso] || [];
  const d = new Date(iso + 'T00:00');
  const jours = t('days_long').split('|');
  const mois = t('months_long').split('|');
  const aujIso = isoDuJour(new Date());

  const decaler = (n) => {
    const dd = new Date(iso + 'T00:00');
    dd.setDate(dd.getDate() + n);
    const cible = isoDuJour(dd);
    if (cible > aujIso) return; // pas de saisie dans le futur (v1)
    setIso(cible);
  };

  return (
    <div class="ml-overlay show" onClick={(e) => { if (e.target === e.currentTarget) fermer(); }}>
      <div class="ml-modal">
        <div class="ml-nav">
          <button onClick={() => decaler(-1)} aria-label="Jour precedent">&lsaquo;</button>
          <div style="flex:1;text-align:center;">
            <h3 class="ml-date">{jours[d.getDay()]} {d.getDate()} {mois[d.getMonth()]}</h3>
            <div class="ml-sub">{sel.length ? sel.map(k => t('mus_' + k)).join(' · ') : t('st_repart_empty')}</div>
          </div>
          <button disabled={iso >= aujIso} onClick={() => decaler(1)} aria-label="Jour suivant">&rsaquo;</button>
        </div>
        <div class="ml-groups">
          {CLES_ML.map(k => (
            <button
              key={k}
              class={'ml-chip ' + (k === 'repos' ? 'repos ' : '') + (sel.includes(k) ? 'on' : '')}
              onClick={() => basculerMuscle(iso, k)}
            >{t('mus_' + k)}</button>
          ))}
        </div>
        <div class="ml-btns">
          <button class="ml-clear" onClick={() => viderJourMuscles(iso)}>{t('clear')}</button>
          <button class="ml-save" onClick={fermer}>{t('save')}</button>
        </div>
      </div>
    </div>
  );
}

// ---------- Modale poids : copie v1 (weightModal, app.html) ----------
function WeightModal({ fermer }) {
  const [val, setVal] = useState('');
  const l = weightLog.value || [];
  const last = l.length ? poidsDe([...l].sort((a, b) => a.iso.localeCompare(b.iso))[l.length - 1]) : '';

  const enregistrer = () => {
    const v = parseFloat(val);
    if (!v || v <= 0) { alert(t('js_weight_invalid')); return; }
    ajouterPesee(v);
    fermer();
  };

  return (
    <div class="modal-overlay show" onClick={(e) => { if (e.target === e.currentTarget) fermer(); }}>
      <div class="modal">
        <h3 class="modal-h3-ic">
          <svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v3M6 6h12M6 6l-3 7a3 3 0 0 0 6 0L6 6zM18 6l-3 7a3 3 0 0 0 6 0l-3-7zM9 21h6M12 6v15" /></svg>
          {' '}<span>{t('wm_title')}</span>
        </h3>
        <label>{t('weight_kg')}</label>
        <input type="number" step="0.1" placeholder="kg" inputMode="decimal" value={val} onInput={(e) => setVal(e.target.value)} />
        {last ? <div class="wm-last">{t('prev_weight')} : <b>{last} kg</b></div> : null}
        <div class="modal-btns">
          <button class="modal-cancel" onClick={fermer}>{t('cancel')}</button>
          <button class="modal-save" onClick={enregistrer}>{t('save')}</button>
        </div>
      </div>
    </div>
  );
}

export function Stats() {
  const [exoSel, setExoSel] = useState(null);
  const [mlIso, setMlIso] = useState(null);          // modale muscles ouverte si non null
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
  const totalPesees = poidsTri.length;
  let sousTitrePoids;
  if (!prem && poidsTri.length > LIMITE_GRATUIT) {
    poidsTri = poidsTri.slice(-LIMITE_GRATUIT);
    sousTitrePoids = t('st_last_weighins', { n: LIMITE_GRATUIT, total: totalPesees });
  } else sousTitrePoids = totalPesees + ' ' + t(totalPesees > 1 ? 'weighins' : 'weighin');

  const poidsActuel = poidsTri.length ? poidsDe(poidsTri[poidsTri.length - 1]) : 0;
  const poidsDebut = poidsTri.length ? poidsDe(poidsTri[0]) : 0;
  const diff = (poidsActuel - poidsDebut).toFixed(1);

  // ================= Calories (v1 renderKcal) =================
  let kcalTri = [...histoire].sort((a, b) => (a.iso || '').localeCompare(b.iso || ''));
  const totalJours = kcalTri.length;
  let sousTitreKcal;
  if (!prem && kcalTri.length > LIMITE_GRATUIT) {
    kcalTri = kcalTri.slice(-LIMITE_GRATUIT);
    sousTitreKcal = t('st_last_days', { n: LIMITE_GRATUIT, total: totalJours });
  } else sousTitreKcal = totalJours + ' ' + t(totalJours > 1 ? 'days' : 'day');
  const moyKcal = kcalTri.length ? Math.round(kcalTri.reduce((s, d) => s + parseInt(d.kcal || 0), 0) / kcalTri.length) : 0;
  const derniereKcal = kcalTri.length ? parseInt(kcalTri[kcalTri.length - 1].kcal || 0) : 0;

  // ================= Repartition musculaire (v1 renderRepartition) =================
  // Toujours la semaine en cours (lundi -> aujourd'hui)
  const auj = new Date();
  const lundi = new Date(auj); lundi.setDate(auj.getDate() - ((auj.getDay() + 6) % 7));
  const depuis = lundi.toISOString().slice(0, 10);
  const compte = {};
  Object.keys(mLog).forEach(iso => {
    if (iso < depuis) return;
    (mLog[iso] || []).forEach(m => { if (m !== 'repos') compte[m] = (compte[m] || 0) + 1; });
  });
  const totalRepart = Object.values(compte).reduce((a, b) => a + b, 0);
  const maxRepart = Math.max(...GROUPES_REP.map(g => compte[g.k] || 0));

  const aujIso = new Date().toISOString().slice(0, 10);
  const joursDepuis = (k) => {
    let dernier = null;
    Object.keys(mLog).forEach(iso => { if ((mLog[iso] || []).includes(k) && (!dernier || iso > dernier)) dernier = iso; });
    return dernier ? Math.round((new Date(aujIso) - new Date(dernier)) / 86400000) : Infinity;
  };
  // v1 : grands muscles negliges depuis 8 jours ou plus
  const negliges = ['pecs', 'dos', 'jambes', 'epaules'].map(k => ({ k, j: joursDepuis(k) })).filter(x => x.j >= 8);
  // v1 : suggestion = memes muscles que le meme jour la semaine passee,
  // MAIS uniquement ceux pas retravailles depuis (fenetre 8 jours)
  const FENETRE_JOURS = 8;
  const dSem = new Date(aujIso); dSem.setDate(dSem.getDate() - 7);
  const isoSem = dSem.toISOString().slice(0, 10);
  const memesJour = (mLog[isoSem] || [])
    .filter(v => v !== 'repos')
    .filter(k => joursDepuis(k) >= FENETRE_JOURS)
    .map(k => t('mus_' + k).toLowerCase());
  const aujFait = (mLog[aujIso] || []).length > 0;

  let noteTexte = '', noteCheck = false;
  if (memesJour.length && !aujFait) {
    const jourNom = t('days_long').split('|')[new Date(aujIso).getDay()].toLowerCase();
    noteTexte = t('st_suggestion', { muscles: memesJour.join(', '), day: jourNom });
  } else if (negliges.length) {
    const items = negliges.map(x => {
      const nom = t('mus_' + x.k).toLowerCase();
      return x.j === Infinity ? nom : `${nom} (${x.j} j)`;
    });
    noteTexte = `${t('st_next_hint')} ${items.join(', ')}.`;
  } else {
    noteTexte = t('st_balanced');
    noteCheck = true;
  }

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
        <header class="app-header">
          <img src="../belfit-logo-header.png" class="ah-logo" alt="BELFIT" />
          <div class="ah-actions">
            <button class="ah-btn" onClick={ouvrirProfil} aria-label="Profil" style="background:none;border:none;cursor:pointer;">
              <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.6" /><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" /></svg>
            </button>
            <a href="../parametres.html" class="ah-btn" aria-label="Réglages">
              <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2" /><path d="M19.4 15a1.7 1.7 0 00.34 1.87l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.7 1.7 0 00-1.87-.34 1.7 1.7 0 00-1.03 1.56V21a2 2 0 11-4 0v-.09a1.7 1.7 0 00-1.11-1.56 1.7 1.7 0 00-1.87.34l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.7 1.7 0 00.34-1.87 1.7 1.7 0 00-1.56-1.03H3a2 2 0 110-4h.09a1.7 1.7 0 001.56-1.11 1.7 1.7 0 00-.34-1.87l-.06-.06a2 2 0 112.83-2.83l.06.06a1.7 1.7 0 001.87.34h.01A1.7 1.7 0 0010 4.09V4a2 2 0 114 0v.09a1.7 1.7 0 001.03 1.56h.01a1.7 1.7 0 001.87-.34l.06-.06a2 2 0 112.83 2.83l-.06.06a1.7 1.7 0 00-.34 1.87v.01a1.7 1.7 0 001.56 1.03H21a2 2 0 110 4h-.09a1.7 1.7 0 00-1.51 1.02z" /></svg>
            </a>
          </div>
        </header>
        <div class="page-title">{t('st_title')}</div>
        <div class="page-sub">{t('st_sub')}</div>

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
          <div class="card-sub">{poidsTri.length ? sousTitrePoids : t('st_weight_sub')}</div>
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
          <div class="card-sub">{kcalTri.length ? sousTitreKcal : t('st_kcal_sub')}</div>
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
                    const jour = d.date ? d.date.split(' ').slice(0, 2).join(' ') : jourCourt(d.iso);
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

        {/* REPARTITION MUSCULAIRE */}
        <div class="stat-card acc-red">
          <h2><svg class="h2ic" viewBox="0 0 24 24"><path d="M20.5 6.5a4.5 4.5 0 00-7.5-3.3 4.5 4.5 0 00-7.5 3.3c0 4.5 7.5 10 7.5 10s7.5-5.5 7.5-10z" /></svg><span>{t('st_repart')}</span></h2>
          <div class="rep-head">
            <div class="repart-periode">{t('st_this_week')}</div>
            <button class="rep-edit" onClick={() => setMlIso(isoDuJour(new Date()))}>
              <svg viewBox="0 0 24 24"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" /></svg>
              <span>{t('st_edit_muscles')}</span>
            </button>
          </div>
          {totalRepart ? (
            <>
              <div class="repart-layout">
                <BodyMap compte={compte} onClick={() => setMlIso(isoDuJour(new Date()))} />
                <div class="repart-body">
                  {GROUPES_REP.filter(g => compte[g.k]).sort((a, b) => (compte[b.k] || 0) - (compte[a.k] || 0)).map(g => (
                    <div class="rep-row" key={g.k}>
                      <div class="rep-lbl">{t('mus_' + g.k)}</div>
                      <div class="rep-track">
                        <div class="rep-fill" style={{ width: Math.max(18, Math.round((compte[g.k] || 0) / maxRepart * 100)) + '%', background: g.c }} />
                      </div>
                      <div class="rep-val">{compte[g.k] || 0}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div class="repart-note">
                <svg class="rn-ic" viewBox="0 0 24 24">
                  <path d={noteCheck ? 'M20 6L9 17l-5-5' : 'M9 18V5l12-2v13M9 9l12-2'} />
                </svg>
                {noteTexte}
              </div>
            </>
          ) : (
            <div class="repart-layout">
              <BodyMap compte={{}} onClick={() => setMlIso(isoDuJour(new Date()))} />
              <div class="repart-body"><div class="repart-vide">{t('st_repart_empty')}</div></div>
            </div>
          )}
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

      {mlIso && <MlModal iso={mlIso} setIso={setMlIso} fermer={() => setMlIso(null)} />}
      {modalePoids && <WeightModal fermer={() => setModalePoids(false)} />}
    </div>
  );
}
