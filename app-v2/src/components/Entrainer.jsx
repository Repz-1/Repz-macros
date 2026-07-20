import { useState } from 'preact/hooks';
import { signal } from '@preact/signals';
import { GROUPES, muscleLog, basculerMuscle } from '../store/entrainement.js';
import { estPremium } from './PremiumPage.jsx';
import { ongletActif } from './BottomNav.jsx';
import { t } from '../i18n/index.js';
import '../legacy/entrainer.scoped.css';

// ==========================================================
// PAGE S'ENTRAINER — portage a l'identique de entrainements.html.
// Meme markup, memes classes, meme CSS : seul l'etat passe en signals.
// ==========================================================

// Pile de vues, equivalent de la navigation par URL de la v1
// ('accueil' -> 'programmes' -> 'seance'), avec fleche retour.
export const vueEntrainer = signal({ nom: 'accueil', params: null });

export function allerVers(nom, params = null) {
  vueEntrainer.value = { nom, params };
  window.scrollTo(0, 0);
}
export function retourEntrainer() {
  vueEntrainer.value = { nom: 'accueil', params: null };
  window.scrollTo(0, 0);
}

// ---- Utilitaires de date, repris tels quels de la v1 ----
const wlIso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const wlIsoToDate = (iso) => { const p = iso.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); };
const COULEUR = Object.fromEntries(GROUPES.filter(g => g.k !== 'repos').map(g => [g.k, g.c]));

function jourCourt(d) {
  return `${t('days_short').split('|')[d.getDay()]} ${d.getDate()} ${t('months_min').split('|')[d.getMonth()]}`;
}
function jourLong(d) {
  return `${t('days_long').split('|')[d.getDay()]} ${d.getDate()} ${t('months_long').split('|')[d.getMonth()]}`;
}
const nomMuscle = (k) => t('mus_' + k);

// ==========================================================
// Journal d'entrainement : calendrier mensuel (classes wlog-*)
// ==========================================================
function JournalEntrainement({ ouvrirJour }) {
  const [ouvert, setOuvert] = useState(false);
  const [offset, setOffset] = useState(0);
  const [legende, setLegende] = useState(false);

  const log = muscleLog.value;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayIso = wlIso(today);
  const ref = new Date(today.getFullYear(), today.getMonth() + offset, 1);
  const titre = t('months_long').split('|')[ref.getMonth()] + ' ' + ref.getFullYear();

  // Resume : seances du mois affiche + derniere seance notee
  const prefixeMois = wlIso(ref).slice(0, 7);
  let nbSeancesMois = 0, dernierIso = null;
  Object.keys(log).forEach(iso => {
    const vals = (log[iso] || []).filter(v => v !== 'repos');
    if (!vals.length) return;
    if (iso.slice(0, 7) === prefixeMois && iso <= todayIso) nbSeancesMois++;
    if (iso <= todayIso && (!dernierIso || iso > dernierIso)) dernierIso = iso;
  });

  let dernierTxt = null;
  if (dernierIso) {
    const dm = (log[dernierIso] || []).filter(v => v !== 'repos').map(nomMuscle);
    dernierTxt = dm.slice(0, 2).join(', ') + (dm.length > 2 ? ' +' + (dm.length - 2) : '');
  }

  // Grille du mois, semaine demarrant le lundi
  const njours = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate();
  const decal = (new Date(ref.getFullYear(), ref.getMonth(), 1).getDay() + 6) % 7;
  const cellules = [];
  for (let i = 0; i < decal; i++) cellules.push(<div key={'v' + i} />);
  for (let j = 1; j <= njours; j++) {
    const iso = wlIso(new Date(ref.getFullYear(), ref.getMonth(), j));
    const vals = (log[iso] || []).filter(v => COULEUR[v] || v === 'repos');
    const repos = vals.includes('repos');
    const muscles = vals.filter(v => v !== 'repos');
    const futur = iso > todayIso;
    let cls = 'wlog-cell', style = {};
    if (muscles.length === 1) { cls += ' seance'; style = { background: COULEUR[muscles[0]] }; }
    else if (muscles.length > 1) {
      cls += ' seance';
      style = { background: `conic-gradient(${COULEUR[muscles[0]]} 0% 50%, ${COULEUR[muscles[1]]} 50% 100%)` };
    } else if (repos) cls += ' repos';
    if (iso === todayIso) cls += ' today';
    if (futur) cls += ' futur';
    cellules.push(
      <div key={iso} class={cls} style={style}
        onClick={futur ? undefined : (e) => { e.stopPropagation(); ouvrirJour(iso); }}>
        {j}{muscles.length > 2 && <i class="wlog-more">+</i>}
      </div>
    );
  }

  return (
    <div class="choice ph sm" style="margin-top:24px; background-image:url('img/card-journal.jpg')">
      <div class="ch-icon">
        <svg viewBox="0 0 24 24"><path d="M8 2v4" /><path d="M16 2v4" /><rect x="3" y="4" width="18" height="18" rx="3" /><path d="M3 10h18" /><path d="M9 16l2 2 4-4" /></svg>
      </div>
      <h3>{t('tr_log_title')}</h3>
      <p>{t('tr_log_sub')}</p>
      <button class="cta" onClick={(e) => { e.stopPropagation(); setOuvert(!ouvert); }}>
        {ouvert ? t('collapse') : t('open')}
      </button>

      <div class={'wlog-list' + (ouvert ? ' expanded' : '')}>
        <div class="wlog-sum">
          {(nbSeancesMois || dernierIso) ? (
            <>
              <span class="wlog-sum-pill">
                🏋️ {nbSeancesMois} {t(nbSeancesMois > 1 ? 'sessions' : 'session')} {t('in_month')} {t('months_long').split('|')[ref.getMonth()]}
              </span>
              {dernierTxt && (
                <span class="wlog-sum-pill">
                  💪 {t('last_session')} : {dernierTxt} · {jourCourt(wlIsoToDate(dernierIso))}
                </span>
              )}
            </>
          ) : <span class="wlog-sum-pill">{t('first_session_hint')}</span>}
        </div>

        <div class="wlog-cal-head">
          <button class="wlog-nav" onClick={(e) => { e.stopPropagation(); setOffset(offset - 1); }}>‹</button>
          <div class="wlog-cal-titre">{titre}</div>
          <div style="display:flex;gap:6px;">
            <button class={'wlog-nav info' + (legende ? ' actif' : '')}
              onClick={(e) => { e.stopPropagation(); setLegende(!legende); }}>i</button>
            <button class={'wlog-nav' + (offset === 0 ? ' off' : '')}
              onClick={(e) => { e.stopPropagation(); if (offset < 0) setOffset(offset + 1); }}>›</button>
          </div>
        </div>

        <div class="wlog-grid">
          {t('days_min').split('|').map((j, i) => <div key={'wd' + i} class="wlog-wd">{j}</div>)}
          {cellules}
        </div>

        {legende && (
          <div class="wlog-legende">
            {GROUPES.filter(g => COULEUR[g.k]).map(g => (
              <span key={g.k}><i class="dot" style={{ background: COULEUR[g.k] }} />{nomMuscle(g.k)}</span>
            ))}
            <span><i class="dot repos" />{t('mus_repos')}</span>
            <span><i class="dot today" />{t('today')}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================================
// Modale de selection des muscles d'une journee
// ==========================================================
function ModaleMuscles({ iso, fermer }) {
  if (!iso) return null;
  const sel = muscleLog.value[iso] || [];
  return (
    <div class="ml-overlay show" onClick={(e) => { if (e.target.classList.contains('ml-overlay')) fermer(); }}>
      <div class="ml-modal">
        <h3 class="ml-date">{jourLong(wlIsoToDate(iso))}</h3>
        <div class="ml-stats" />
        <div class="ml-groups">
          {GROUPES.map(g => (
            <button key={g.k}
              class={'ml-chip' + (sel.includes(g.k) ? ' on' : '')}
              style={sel.includes(g.k) && g.k !== 'repos' ? { background: g.c, borderColor: g.c, color: '#fff' } : {}}
              onClick={() => basculerMuscle(iso, g.k)}>
              {nomMuscle(g.k)}
            </button>
          ))}
        </div>
        <div class="ml-btns">
          <button class="ml-clear" onClick={() => {
            (muscleLog.value[iso] || []).slice().forEach(k => basculerMuscle(iso, k));
            fermer();
          }}>{t('clear')}</button>
          <button class="ml-save" onClick={fermer}>{t('save')}</button>
        </div>
      </div>
    </div>
  );
}

// ==========================================================
// Modale Premium bienveillante (identique v1)
// ==========================================================
function ModalePremium({ montre, fermer }) {
  if (!montre) return null;
  return (
    <div class="premium-overlay show" onClick={(e) => { if (e.target.classList.contains('premium-overlay')) fermer(); }}>
      <div class="premium-modal">
        <div class="pm-icon">💪</div>
        <h3>{t('tr_prem_title')}</h3>
        <p>{t('tr_prem_body')}</p>
        <button class="pm-btn" onClick={() => { fermer(); ongletActif.value = 'premium'; }}>
          {t('support_unlock')}
        </button>
        <button class="pm-close" onClick={fermer}>{t('later')}</button>
      </div>
    </div>
  );
}

// ==========================================================
// Page
// ==========================================================
export function Entrainer() {
  const [jourOuvert, setJourOuvert] = useState(null);
  const [premium, setPremium] = useState(false);

  const verrou = (e, dest) => {
    e.preventDefault();
    if (!estPremium.value) { setPremium(true); return; }
    allerVers(dest);
  };
  const locked = estPremium.value ? '' : ' locked';

  return (
    <div class="pg-entrainer">
      <div class="intro">
        <span class="intro-eyebrow">BelFit <em>Training</em></span>
      </div>

      <div class="choices">
        {/* Carte vedette : programme sur mesure (Premium) */}
        <a href="#" class={'choice ph featured' + locked} style="background-image:url('img/card-creer.jpg')"
          onClick={(e) => verrou(e, 'questionnaire')}>
          {!estPremium.value && <span class="pro-badge">✦ PRO</span>}
          <span class="ch-icon"><svg viewBox="0 0 24 24"><path d="M12 3l1.6 4.9H19l-4.3 3.1 1.6 5-4.3-3.1L7.7 16l1.6-5L5 7.9h5.4z" /></svg></span>
          <span class="badge">{t('tr_badge_custom')}</span>
          <h3>{t('tr_create_title')}</h3>
          <p>{t('tr_create_sub')}</p>
          <span class="cta">{t('tr_start')}</span>
        </a>

        {/* Seance libre (gratuit) */}
        <a href="#" class="choice ph md" style="background-image:url('img/card-libre.jpg')"
          onClick={(e) => { e.preventDefault(); allerVers('seance'); }}>
          <span class="ch-icon"><svg viewBox="0 0 24 24"><path d="M6.5 6.5v11M17.5 6.5v11M3 9.5v5M21 9.5v5M6.5 12h11" /></svg></span>
          <h3>{t('tr_free_title')}</h3>
          <p>{t('tr_free_sub')}</p>
          <span class="cta">{t('tr_free_cta')}</span>
        </a>

        {/* Mes programmes (Premium) */}
        <a href="#" class={'choice ph sm' + locked} style="background-image:url('img/card-programmes.jpg')"
          onClick={(e) => verrou(e, 'programmes')}>
          {!estPremium.value && <span class="pro-badge">✦ PRO</span>}
          <span class="ch-icon"><svg viewBox="0 0 24 24"><rect x="3.5" y="4.5" width="17" height="16" rx="2.5" /><path d="M3.5 9h17M8 2.5v4M16 2.5v4" /></svg></span>
          <h3>{t('tr_progs_title')}</h3>
          <p>{t('tr_progs_sub')}</p>
          <span class="cta">{t('open')}</span>
        </a>
      </div>

      <JournalEntrainement ouvrirJour={setJourOuvert} />

      <p class="note">{t('tr_note')}</p>
      <div class="bottom-gradient" />

      <ModaleMuscles iso={jourOuvert} fermer={() => setJourOuvert(null)} />
      <ModalePremium montre={premium} fermer={() => setPremium(false)} />
    </div>
  );
}
