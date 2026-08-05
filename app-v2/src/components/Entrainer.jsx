import { useState } from 'preact/hooks';
import { signal } from '@preact/signals';
import { GROUPES, muscleLog, basculerMuscle } from '../store/entrainement.js';
import { estPremium } from './PremiumPage.jsx';
import { enDecouverte } from '../services/decouverte.js';
import { ongletActif } from './BottomNav.jsx';
import { Entete } from './Entete.jsx';
import { createPortal } from 'preact/compat';
import { BodyMap } from './Stats.jsx';
import { t } from '../i18n/index.js';

/* ------------------------------------------------------------
   Fonds de cartes : charges a la PREMIERE visite de l'onglet.
   Les quatre panneaux du rail sont montes des le demarrage — c'est
   ce qui rend le glissement lateral instantane — donc ces quatre
   jpg (658 ko) partaient au chargement du Journal, pour un ecran
   que l'utilisateur n'avait pas encore ouvert.
   On ne demonte pas le composant (cela casserait le geste) : on
   retarde seulement l'attribut background-image.
   Le drapeau est pose au niveau module et ne retombe jamais :
   revenir sur l'onglet ne doit rien recharger ni reafficher de
   fondu. loading="lazy" n'existe pas pour un fond CSS, d'ou ce
   passage par le signal deja importe.
   ------------------------------------------------------------ */
let fondsVus = false;
function fond(fichier) {
  if (!fondsVus && ongletActif.value === 'entrainer') fondsVus = true;
  return fondsVus ? `background-image:url('/img/${fichier}')` : '';
}
import '../legacy/entrainer.scoped.css';
import '../styles/entrainer-carte.css';

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
    <div class="choice ph sm ch-journal" style={fond('card-journal.jpg')}>
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
          <button class={'wlog-nav' + (offset === 0 ? ' off' : '')}
            onClick={(e) => { e.stopPropagation(); if (offset < 0) setOffset(offset + 1); }}>›</button>
        </div>

        <div class="wlog-grid">
          {t('days_min').split('|').map((j, i) => <div key={'wd' + i} class="wlog-wd">{j}</div>)}
          {cellules}
        </div>

        {/* Toujours affichee : neuf pastilles de couleur ne disent rien
            tant qu'on ne peut pas les nommer. Le bouton « i » qui la
            repliait a ete retire — sa seule action etait de retirer
            une information utile. */}
        <div class="wlog-legende">
          {GROUPES.filter(g => COULEUR[g.k]).map(g => (
            <span key={g.k}><i class="dot" style={{ background: COULEUR[g.k] }} />{nomMuscle(g.k)}</span>
          ))}
          <span><i class="dot repos" />{t('mus_repos')}</span>
          <span><i class="dot today" />{t('today')}</span>
        </div>
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

  // La silhouette ne montre plus le seul jour ouvert mais TOUTE LA
  // SEMAINE, du lundi jusqu'a ce jour : c'est la question qu'on se
  // pose devant un calendrier d'entrainement — qu'est-ce que j'ai
  // deja travaille, qu'est-ce qui manque. Un jour isole n'y repond
  // pas. Semaine ISO, donc lundi ; (getDay()+6)%7 vaut 0 le lundi.
  const jour = wlIsoToDate(iso);
  const lundi = new Date(jour);
  lundi.setDate(jour.getDate() - ((jour.getDay() + 6) % 7));
  const joursSemaine = [];
  for (let d = new Date(lundi); wlIso(d) <= iso; d.setDate(d.getDate() + 1)) {
    joursSemaine.push(wlIso(d));
  }
  const compte = {};
  joursSemaine.forEach(j => {
    (muscleLog.value[j] || []).forEach(k => {
      if (k !== 'repos') compte[k] = (compte[k] || 0) + 1;
    });
  });
  // PORTAIL VERS document.body. Le rail des onglets porte
  // will-change:transform et z-index:1 : il cree un contexte
  // d'empilement, donc le z-index 100 de la modale ne valait que
  // DEDANS, et la barre de navigation (z-index 80, mais hors du
  // rail) passait devant ses boutons. Montee au niveau du corps,
  // elle recouvre tout ce qu'elle doit recouvrir.
  return createPortal(
    <div class="ml-overlay show" onClick={(e) => { if (e.target.classList.contains('ml-overlay')) fermer(); }}>
      <div class="ml-modal">
        <h3 class="ml-date">{jourLong(jour)}</h3>
        <div class="ml-corps">
          <BodyMap compte={compte} />
          <div class="ml-legende">
            <div class="ml-legende-titre">
              {t('tr_week_since')} {jourCourt(lundi)}
            </div>
            {GROUPES.filter(g => COULEUR[g.k]).map(g => (
              <span key={g.k} class={compte[g.k] ? 'fait' : ''}>
                <i class="dot" style={{ background: compte[g.k] ? COULEUR[g.k] : '#E9EBEF' }} />
                {nomMuscle(g.k)}
              </span>
            ))}
          </div>
        </div>
        <div class="ml-groups">
          {GROUPES.map(g => (
            <button key={g.k}
              class={'ml-chip' + (sel.includes(g.k) ? ' on' : '')}
              style={sel.includes(g.k) && g.k !== 'repos' ? { background: g.c, borderColor: g.c, color: '#fff' } : {}}
              onClick={() => basculerMuscle(iso, g.k)}>
              {COULEUR[g.k] && <i class="ml-pt" style={{ background: COULEUR[g.k] }} aria-hidden="true" />}
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
    </div>,
    document.body
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

  // DECISION RACI (26/07) : la partie entrainement est GRATUITE en
  // entier — questionnaire, programmes, seances. Les anciens verrous
  // (Premium jour 1 sur le sur-mesure, fenetre decouverte sur les
  // programmes) sont leves ; le Premium reste sur la nutrition.
  const verrou = (e, dest) => { e.preventDefault(); allerVers(dest); };
  const verrouProgs = verrou;
  const locked = '';
  const lockedProgs = '';

  return (
    <div class="pg-entrainer pg-entrainer--carte">
      <Entete retour />
      {/* Pas de bloc-titre sous la barre : comme le Journal, la barre
          puis le contenu. Le nom de l'onglet est deja dans la
          navigation du bas — le repeter en 31 px coutait un tiers
          d'ecran avant la premiere carte. */}

      <div class="choices">
        {/* Seance libre EN PREMIER, et c'est elle qui porte le dore.
            Decision de Raci (4 aout) : c'est la rubrique que les
            utilisateurs emploieront le plus — l'entree la plus
            frequente passe en tete et recoit l'accent, le programme
            sur mesure descend en second. Le dore suit la carte de
            tete : deux hierarchies contraires sur le meme ecran
            (premiere carte sobre, deuxieme doree) ne hierarchisent
            rien. */}
        <a href="#" class="choice ph featured ch-libre" style={fond('card-libre.jpg')}
          onClick={(e) => { e.preventDefault(); allerVers('selection'); }}>
          <h3>{t('tr_free_title')}</h3>
          <p>{t('tr_free_sub')}</p>
          <span class="cta">{t('tr_free_cta')}</span>
        </a>

        {/* Programme sur mesure (Premium), en second */}
        {/* La photo du disque a son propre calque : elle doit etre
            DECOUPEE en chevron et arrondie, avec une marge creme
            autour. En fond de carte, elle collait aux quatre bords
            et aucune forme n'etait possible. */}
        <a href="#" class={'choice ph md ch-prog' + locked}
          onClick={(e) => verrou(e, 'questionnaire')}>
          <span class="ch-photo" aria-hidden="true" style={fond('card-creer.jpg')} />
          <h3>{t('tr_create_title')}</h3>
          <p>{t('tr_create_sub')}</p>
          <span class="cta">{t('tr_start')}</span>
        </a>

        {/* Mes programmes (Premium) */}
        <a href="#" class={'choice ph sm ch-archives' + lockedProgs} style={fond('card-programmes.jpg')}
          onClick={(e) => verrouProgs(e, 'programmes')}>
          <h3>{t('tr_progs_title')}</h3>
          <p>{t('tr_progs_sub')}</p>
          <span class="cta">{t('open')}</span>
        </a>

        <JournalEntrainement ouvrirJour={setJourOuvert} />
      </div>

      <p class="note">{t('tr_note')}</p>

      <ModaleMuscles iso={jourOuvert} fermer={() => setJourOuvert(null)} />
      <ModalePremium montre={premium} fermer={() => setPremium(false)} />
    </div>
  );
}
