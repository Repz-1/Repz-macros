import { useState } from 'preact/hooks';
import { weightLog, histoJours } from '../store/stats.js';
import { muscleLog } from '../store/entrainement.js';
import { estPremium } from './PremiumPage.jsx';
import { ongletActif } from './BottomNav.jsx';
import { t } from '../i18n/index.js';
import '../legacy/stats.scoped.css';

// ==========================================================
// PAGE MES STATS — portage a l'identique de mes-stats.html.
// Memes cartes (acc-green / acc-orange / acc-blue / acc-red / acc-violet),
// meme silhouette, memes graphiques en barres.
// ==========================================================

const LIMITE_GRATUIT = 7;
const COL = { pecs:'#EF4444', dos:'#F97316', epaules:'#F7B500', biceps:'#10B981',
              triceps:'#06B6D4', jambes:'#3B82F6', abdos:'#8B5CF6', cardio:'#EC4899' };
const CLES = ['pecs','dos','epaules','biceps','triceps','jambes','abdos','cardio'];

const isoIlYA = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };
const lire = (cle, def) => { try { return JSON.parse(localStorage.getItem(cle) || def); } catch (e) { return JSON.parse(def); } };
const jourCourt = (iso) => new Date(iso + 'T00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

// ---------- Graphique en barres, identique v1 ----------
function Chart({ points, classeBarre }) {
  const vals = points.map(p => p.v);
  const max = Math.max(...vals), min = Math.min(...vals);
  return (
    <div class="chart">
      {points.map((p, i) => {
        const h = classeBarre === 'weight'
          ? (((p.v - (min - 1)) / (((max + 1) - (min - 1)) || 1)) * 100)
          : (max > 0 ? (p.v / (max * 1.1)) * 100 : 0);
        return (
          <div class="chart-bar-wrap" key={i}>
            <div class="chart-val">{p.v}</div>
            <div class={'chart-bar ' + classeBarre} style={{ height: Math.max(6, h) + '%' }} />
            <div class="chart-day">{p.j}</div>
          </div>
        );
      })}
    </div>
  );
}

function Vide({ texte, cta, onCta }) {
  return (
    <div class="chart-empty">
      <div>{texte}<br /><button class="ce-btn" onClick={onCta}>{cta}</button></div>
    </div>
  );
}

// ---------- Silhouette : chaque zone prend la couleur de son muscle ----------
function BodyMap({ compte }) {
  const col = (k) => (compte[k] > 0 ? (COL[k] || '#F7B500') : '#E9EBEF');
  return (
    <svg viewBox="0 0 100 200">
      <circle cx="50" cy="16" r="11" class="bp" />
      <rect x="42" y="27" width="16" height="8" rx="3" class="bp" />
      <path class="bp" style={{ fill: col('epaules') }} d="M30 37 q-8 1 -10 8 l4 6 q6 -6 12 -6z" />
      <path class="bp" style={{ fill: col('epaules') }} d="M70 37 q8 1 10 8 l-4 6 q-6 -6 -12 -6z" />
      <path class="bp" style={{ fill: col('pecs') }} d="M36 37 h28 q3 0 3 4 v10 q0 4 -4 4 h-26 q-4 0 -4 -4 v-10 q0 -4 3 -4z" />
      <path class="bp" style={{ fill: col('abdos') }} d="M39 60 h22 q2 0 2 3 v20 q0 3 -3 3 h-20 q-3 0 -3 -3 v-20 q0 -3 2 -3z" />
      <path class="bp" style={{ fill: col('biceps') }} d="M22 47 q-4 8 -4 18 l6 2 q2 -10 4 -16z" />
      <path class="bp" style={{ fill: col('biceps') }} d="M78 47 q4 8 4 18 l-6 2 q-2 -10 -4 -16z" />
      <path class="bp" style={{ fill: col('triceps') }} d="M17 66 q-2 8 -1 16 l6 -1 q0 -8 1 -14z" />
      <path class="bp" style={{ fill: col('triceps') }} d="M83 66 q2 8 1 16 l-6 -1 q0 -8 -1 -14z" />
      <path class="bp" style={{ fill: col('jambes') }} d="M40 89 h9 v40 q0 6 -5 6 q-5 0 -5 -6 z" />
      <path class="bp" style={{ fill: col('jambes') }} d="M60 89 h-9 v40 q0 6 5 6 q5 0 5 -6 z" />
      <path class="bp" style={{ fill: col('jambes') }} d="M39 137 h10 v34 q0 4 -5 4 q-5 0 -5 -4z" />
      <path class="bp" style={{ fill: col('jambes') }} d="M61 137 h-10 v34 q0 4 5 4 q5 0 5 -4z" />
    </svg>
  );
}

export function Stats() {
  const [exoSel, setExoSel] = useState(null);
  const prem = estPremium.value;

  const poidsData = weightLog.value || [];
  const histoire = Object.values(histoJours.value || {});
  const mLog = muscleLog.value || {};
  const sessionLog = lire('repz_sessionLog', '[]');
  const setLogAll = lire('repz_setLog', '{}');
  const objectif = lire('repz_goal', 'null') || { kcal: 0, weight: 0 };

  // ================= Score global sur 7 jours =================
  const j7 = Array.from({ length: 7 }, (_, i) => isoIlYA(i));
  const jourActif = (iso) =>
    histoire.some(e => e.iso === iso) ||
    (mLog[iso] && mLog[iso].length && !(mLog[iso].length === 1 && mLog[iso][0] === 'repos')) ||
    sessionLog.some(s => s.iso === iso) ||
    poidsData.some(w => w.iso === iso);

  const nutrition = Math.round(j7.filter(iso => histoire.some(e => e.iso === iso)).length / 7 * 100);
  const trainJours = j7.filter(iso =>
    (mLog[iso] && mLog[iso].length && !(mLog[iso].length === 1 && mLog[iso][0] === 'repos')) ||
    sessionLog.some(s => s.iso === iso)).length;
  const entrainement = Math.min(100, Math.round(trainJours / 4 * 100));

  const p14 = poidsData.filter(w => w.iso >= isoIlYA(14)).sort((a, b) => a.iso.localeCompare(b.iso));
  let scorePoids;
  if (!p14.length) scorePoids = poidsData.length ? 40 : 0;
  else if (p14.length === 1) scorePoids = 60;
  else {
    const first = parseFloat(p14[0].weight), last = parseFloat(p14[p14.length - 1].weight);
    const cible = parseFloat(objectif.weight || 0);
    scorePoids = cible > 0 ? (Math.abs(last - cible) <= Math.abs(first - cible) ? 100 : 65) : 90;
  }
  const regularite = Math.round(j7.filter(jourActif).length / 7 * 100);
  const global = Math.round((nutrition + entrainement + scorePoids + regularite) / 4);
  const rienDuTout = !histoire.length && !poidsData.length && !sessionLog.length && !Object.keys(mLog).length;

  // ================= Poids =================
  let poidsTri = [...poidsData].sort((a, b) => a.iso.localeCompare(b.iso));
  const totalPesees = poidsTri.length;
  let sousTitrePoids;
  if (!prem && poidsTri.length > LIMITE_GRATUIT) {
    poidsTri = poidsTri.slice(-LIMITE_GRATUIT);
    sousTitrePoids = `${LIMITE_GRATUIT} / ${totalPesees}`;
  } else sousTitrePoids = totalPesees + ' ' + t(totalPesees > 1 ? 'weighins' : 'weighin');

  const poidsActuel = poidsTri.length ? parseFloat(poidsTri[poidsTri.length - 1].weight) : 0;
  const poidsDebut = poidsTri.length ? parseFloat(poidsTri[0].weight) : 0;
  const diff = (poidsActuel - poidsDebut).toFixed(1);

  // ================= Calories =================
  let kcalTri = [...histoire].sort((a, b) => (a.iso || '').localeCompare(b.iso || ''));
  const totalJours = kcalTri.length;
  let sousTitreKcal;
  if (!prem && kcalTri.length > LIMITE_GRATUIT) {
    kcalTri = kcalTri.slice(-LIMITE_GRATUIT);
    sousTitreKcal = `${LIMITE_GRATUIT} / ${totalJours}`;
  } else sousTitreKcal = totalJours + ' ' + t(totalJours > 1 ? 'days' : 'day');
  const moyKcal = kcalTri.length ? Math.round(kcalTri.reduce((s, d) => s + parseInt(d.kcal || 0), 0) / kcalTri.length) : 0;
  const derniereKcal = kcalTri.length ? parseInt(kcalTri[kcalTri.length - 1].kcal || 0) : 0;

  // ================= Records =================
  const prs = [];
  Object.keys(setLogAll).forEach(nom => {
    let best = 0, reps = 0, dateBest = '';
    (setLogAll[nom] || []).forEach(e => (e.sets || []).forEach(s => {
      const w = parseFloat(s.w);
      if (!isNaN(w) && w > best) { best = w; reps = s.r || 0; dateBest = e.iso; }
    }));
    if (best > 0) prs.push({ nom, best, reps, dateBest });
  });
  prs.sort((a, b) => b.best - a.best);
  const recent = [...prs].sort((a, b) => (b.dateBest || '').localeCompare(a.dateBest || ''))[0];

  // ================= Repartition musculaire (semaine en cours) =================
  const auj = new Date();
  const lundi = new Date(auj); lundi.setDate(auj.getDate() - ((auj.getDay() + 6) % 7));
  const depuis = lundi.toISOString().slice(0, 10);
  const compte = {};
  Object.keys(mLog).forEach(iso => {
    if (iso < depuis) return;
    (mLog[iso] || []).forEach(m => { if (m !== 'repos') compte[m] = (compte[m] || 0) + 1; });
  });
  const totalRepart = Object.values(compte).reduce((a, b) => a + b, 0);
  const maxRepart = Math.max(1, ...CLES.map(k => compte[k] || 0));

  const aujIso = new Date().toISOString().slice(0, 10);
  const joursDepuis = (k) => {
    let dernier = null;
    Object.keys(mLog).forEach(iso => { if ((mLog[iso] || []).includes(k) && (!dernier || iso > dernier)) dernier = iso; });
    return dernier ? Math.round((new Date(aujIso) - new Date(dernier)) / 86400000) : Infinity;
  };
  const negliges = ['pecs', 'dos', 'jambes', 'epaules'].map(k => ({ k, j: joursDepuis(k) })).filter(x => x.j > 6);
  const dSem = new Date(aujIso); dSem.setDate(dSem.getDate() - 7);
  const memesJour = (mLog[dSem.toISOString().slice(0, 10)] || [])
    .filter(v => v !== 'repos').map(k => t('mus_' + k).toLowerCase());
  const aujFait = (mLog[aujIso] || []).length > 0;

  // ================= Progression par exercice =================
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
              <Chart classeBarre="weight" points={poidsTri.map(d => ({
                v: parseFloat(d.weight),
                j: d.date ? d.date.split(' ').slice(0, 2).join(' ') : jourCourt(d.iso),
              }))} />
            </>
          ) : <Vide texte={t('st_no_weight')} cta={t('st_add_weight')} onCta={() => { ongletActif.value = 'journal'; }} />}
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
              <Chart classeBarre="kcalbar" points={kcalTri.map(d => ({
                v: parseInt(d.kcal || 0),
                j: d.date ? d.date.split(' ').slice(0, 2).join(' ') : jourCourt(d.iso),
              }))} />
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
          <div class="repart-periode">{t('st_this_week')}</div>
          <div class="repart-layout">
            <div class="bodymap">
              <BodyMap compte={compte} />
              <div class="bodymap-legend"><i style="background:#E9EBEF" />{t('st_not_worked')}</div>
            </div>
            <div class="repart-body">
              {totalRepart ? CLES.filter(k => compte[k]).sort((a, b) => compte[b] - compte[a]).map(k => (
                <div class="rep-row" key={k}>
                  <div class="rep-lbl">{t('mus_' + k)}</div>
                  <div class="rep-track">
                    <div class="rep-fill" style={{ width: Math.max(18, Math.round(compte[k] / maxRepart * 100)) + '%', background: COL[k] }} />
                  </div>
                  <div class="rep-val">{compte[k]}</div>
                </div>
              )) : <div class="repart-vide">{t('st_repart_empty')}</div>}
            </div>
          </div>
          {totalRepart > 0 && (
            <div class="repart-note">
              <svg class="rn-ic" viewBox="0 0 24 24">
                <path d={((memesJour.length && !aujFait) || negliges.length) ? 'M9 18V5l12-2v13M9 9l12-2' : 'M20 6L9 17l-5-5'} />
              </svg>
              {(memesJour.length && !aujFait)
                ? `${t('st_next_hint')} ${memesJour.join(', ')}.`
                : negliges.length
                  ? `${t('st_next_hint')} ${negliges.map(x => t('mus_' + x.k).toLowerCase() + (x.j === Infinity ? '' : ` (${x.j} j)`)).join(', ')}.`
                  : t('st_balanced')}
            </div>
          )}
        </div>

        {/* RECORDS PERSONNELS */}
        <div class="stat-card acc-violet">
          <h2><svg class="h2ic" viewBox="0 0 24 24"><path d="M8 21h8" /><path d="M12 17v4" /><path d="M7 4h10v6a5 5 0 01-10 0V4z" /><path d="M7 6H4a2 2 0 002 4h1" /><path d="M17 6h3a2 2 0 01-2 4h-1" /></svg><span>{t('st_records')}</span></h2>
          <div class="card-sub">{t('st_records_sub')}</div>
          {prs.length ? (
            <>
              {prs.slice(0, 5).map((p, i) => (
                <div class="pr-row" key={p.nom}>
                  <span class={'pr-rank' + (i === 0 ? ' r1' : '')}>{i + 1}</span>
                  <span class="pr-name">{p.nom}</span>
                  <span class="pr-val">{p.best} kg{p.reps ? ` × ${p.reps}` : ''}</span>
                </div>
              ))}
              {recent && recent.dateBest && (
                <div class="pr-recent">
                  Dernier record : <b>{recent.nom}</b> — {recent.best} kg, le{' '}
                  {new Date(recent.dateBest + 'T00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                </div>
              )}
            </>
          ) : <Vide texte={t('st_no_records')} cta={t('st_start_session')} onCta={() => { ongletActif.value = 'entrainer'; }} />}
        </div>

        {/* INVITATION PREMIUM */}
        {!prem && (
          <div class="premium-invite">
            <div class="pi-icon"><svg viewBox="0 0 24 24"><path d="M6.5 6.5v11M17.5 6.5v11M3 9v6M21 9v6M6.5 12h11" /></svg></div>
            <h3>{t('st_prem_title')}</h3>
            <p>{t('st_prem_body')}</p>
            <button class="pi-btn" onClick={() => { ongletActif.value = 'premium'; }}>{t('support_unlock')}</button>
            <div class="locked-note">{t('st_locked_note')}</div>
          </div>
        )}
      </div>
    </div>
  );
}
