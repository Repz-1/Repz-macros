import { useState } from 'preact/hooks';
import { useRetour } from '../services/retour.js';
import { signal } from '@preact/signals';
import { GROUPES, muscleLog, basculerMuscle, borneCalendrier } from '../store/entrainement.js';
import { compteDuJour, musclesParJour } from '../services/muscles-jour.js';
import { estPremium } from './PremiumPage.jsx';
import { enDecouverte } from '../services/decouverte.js';
import { ongletActif } from './BottomNav.jsx';
import { Entete } from './Entete.jsx';
import { createPortal } from 'preact/compat';
import { BodyMap } from './Stats.jsx';
import { BlocSeances, ToutesSeances, DetailSeance } from './Seances.jsx';
import { programmeActif, seancePrevue, musclesPrevus, planifierSeance, planifs, progParId } from '../store/programme.js';
import { seancesDuJour } from '../store/seances.js';

/** « 90 × 8 · 85 × 10 », ou rien si aucune serie notee. */
function resumeSeries(series) {
  if (!series || !series.length) return '';
  return series.slice(0, 3)
    .filter(x => x && (x.kg || x.reps))
    .map(x => `${x.kg || '—'} × ${x.reps || '—'}`)
    .join(' · ');
}
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

// Ouverture directe d'un ecran par l'adresse, pour partager un lien
// ou tester sans traverser l'accueil :
//   belfit.be/v2/?onglet=entrainer&vue=selection
// Liste FERMEE : une valeur inconnue laisse l'accueil, elle ne peut
// pas ouvrir un ecran vide. Les vues qui exigent des parametres
// (planifier, seanceDetail) en sont volontairement exclues — sans
// leur `prog` ou leur `seanceId` elles s'afficheraient a blanc.
// Lu une seule fois au chargement, et sans toucher a l'historique :
// le retour ramene a l'accueil comme depuis n'importe quel ecran.
const VUES_ADRESSABLES = ['demarrer', 'selection', 'questionnaire', 'programmes'];
{
  const demandee = new URLSearchParams(location.search).get('vue');
  if (VUES_ADRESSABLES.includes(demandee)) {
    vueEntrainer.value = { nom: demandee, params: null };
  }
}

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

/**
 * « aujourd'hui », « hier », « il y a 3 j », puis la date courte.
 * Raci le 12/08 : la pastille « Dernière » etait trop longue.
 */
function quandCourt(iso, isoAuj) {
  const jours = Math.round((wlIsoToDate(isoAuj) - wlIsoToDate(iso)) / 86400000);
  if (jours <= 0) return t('today').toLowerCase();
  if (jours === 1) return t('yesterday').toLowerCase();
  if (jours < 7) return t('days_ago', { n: jours });
  return jourCourt(wlIsoToDate(iso));
}

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
/**
 * Journal d'entrainement — desormais TOUTE la page S'entrainer.
 *
 * Refonte demandee par Raci le 10/08. Les deux cartes « Seance libre »
 * et « Creer mon programme » sont retirees : elles occupaient les deux
 * tiers du premier ecran pour deux liens, et reléguaient le calendrier
 * en troisieme position, replie derriere un bouton « Ouvrir ». La page
 * est maintenant le journal seul, dans un ordre d'action :
 *   1. pastilles de resume
 *   2. zone d'action — demarrer une seance, adapter son programme
 *   3. calendrier
 *   4. semaine + silhouette
 *   5. seances enregistrees
 * Les deux destinations retirees sont reprises par la zone d'action :
 * `selection` par le gros bouton, `questionnaire` par le lien.
 *
 * Plus d'etat replie : le calendrier est l'objet de la page, le
 * masquer derriere un bouton n'avait plus de sens une fois seul.
 */
function JournalEntrainement({ ouvrirJour, ouvrirSeance, voirToutesSeances }) {
  const [offset, setOffset] = useState(0);

  // Source unique : marquage manuel + seances enregistrees, reunis a
  // la lecture (services/muscles-jour.js). Le calendrier ne depend
  // plus d'une recopie faite a la fin de la seance.
  const log = musclesParJour();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayIso = wlIso(today);
  const ref = new Date(today.getFullYear(), today.getMonth() + offset, 1);
  const titre = t('months_long').split('|')[ref.getMonth()] + ' ' + ref.getFullYear();
  // Le calendrier ne retient plus que deux semaines : le mois de la
  // borne est le dernier qui contienne quelque chose. On compare sur
  // « AAAA-MM » plutot que sur des dates, la borne pouvant tomber au
  // milieu d'un mois.
  const avantBorne = wlIso(ref).slice(0, 7) <= borneCalendrier().slice(0, 7);

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
    let muscles = vals.filter(v => v !== 'repos');
    const futur = iso > todayIso;

    // Seances PREVUES par le programme actif (Raci, 10/08 : « le
    // programme apparait dans le calendrier »). Elles ne colorent que
    // les jours ou rien n'a encore ete note : ce qui a reellement ete
    // fait prime toujours sur ce qui etait prevu.
    let prevu = null;
    if (!muscles.length && !repos) {
      prevu = seancePrevue(iso);
      if (prevu) muscles = musclesPrevus(prevu.titre).filter(k => COULEUR[k]);
    }

    let cls = 'wlog-cell', style = {};
    if (muscles.length === 1) { cls += ' seance'; style = { background: COULEUR[muscles[0]] }; }
    else if (muscles.length > 1) {
      cls += ' seance';
      style = { background: `conic-gradient(${COULEUR[muscles[0]]} 0% 50%, ${COULEUR[muscles[1]]} 50% 100%)` };
    } else if (repos) cls += ' repos';

    // Un jour planifie se lit en CREUX : contour de la couleur du
    // muscle, interieur vide. Sans cette difference, le calendrier
    // affirmerait qu'une seance a eu lieu alors qu'elle est
    // seulement prevue. La couleur passe par le style en ligne :
    // `currentColor` dans la feuille ne la transporte pas.
    if (prevu) {
      cls += ' planifie';
      const c = COULEUR[muscles[0]] || '#736C63';
      style = { background: 'none', boxShadow: `inset 0 0 0 2px ${c}`, color: c };
    }
    if (iso === todayIso) cls += ' today';
    if (futur) cls += ' futur' + (muscles.length || repos ? ' prevu' : '');
    cellules.push(
      <div key={iso} class={cls} style={style}
        onClick={(e) => { e.stopPropagation(); ouvrirJour(iso); }}>
        {/* Jour de repos : une COCHE VERTE, pas le chiffre (Raci,
            10/08 — les trois nuances proposees se ressemblaient
            toutes). Le repos est une decision tenue, pas une case
            vide : la coche le dit d'un coup d'oeil. Le numero du
            jour se lit toujours par sa position dans la grille. */}
        {repos ? <i class="wlog-coche" aria-label={t('mus_repos')}>✓</i> : j}
        {muscles.length > 2 && <i class="wlog-more">+</i>}
      </div>
    );
  }

  // Silhouette de la semaine en cours, du lundi a aujourd'hui : la
  // meme lecture que dans la modale d'un jour, mais posee sur la page
  // pour qu'on la voie sans rien ouvrir.
  const lundi = new Date(today);
  lundi.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const compteSemaine = {};
  let seancesSemaine = 0;
  for (const d = new Date(lundi); wlIso(d) <= todayIso; d.setDate(d.getDate() + 1)) {
    const vals = (log[wlIso(d)] || []).filter(v => v !== 'repos');
    if (vals.length) seancesSemaine++;
    vals.forEach(k => { compteSemaine[k] = (compteSemaine[k] || 0) + 1; });
  }
  const travailles = GROUPES.filter(g => COULEUR[g.k] && compteSemaine[g.k]);
  const oublies = GROUPES.filter(g => COULEUR[g.k] && !compteSemaine[g.k]);

  return (
    <>
      {/* 1 — Le haut de page ne porte plus que l'accueil du premier
          jour. Les deux pastilles de resume flottaient ici, de largeurs
          inegales, au-dessus de la carte d'action : elles cassaient
          l'alignement du haut sans etre a leur place — elles parlent du
          MOIS AFFICHE au calendrier, pas de la journee. Elles sont
          descendues sous le titre du calendrier (Raci, 21/08). */}
      <div class="wlog-sum">
        {(nbSeancesMois || dernierIso) ? null : (
          /* Etat vide : le bandeau etait une pastille grise a coin
             arrondi, de la meme famille que les compteurs qui
             l'entourent d'habitude — sauf qu'ici il est seul, et que
             c'est la premiere chose qu'un nouveau venu lit. Il devient
             une ligne accueillante, avec un point d'accroche a gauche
             et la phrase coupee en deux : l'invitation d'abord, la
             precision ensuite, plus discrete. */
          <span class="wlog-sum-vide">
            <span class="wsv-ic" aria-hidden="true">👋</span>
            <span class="wsv-txt">
              <b>{t('first_session_t')}</b>
              <i>{t('first_session_s')}</i>
            </span>
          </span>
        )}
      </div>

      {/* 2 — Zone d'action. Elle reprend les deux destinations des
          cartes retirees : le gros bouton mene au choix d'exercices,
          le lien au questionnaire de programme. */}
      <div class="ent-action">
        <div class="ent-action-jour">{jourLong(today)}</div>
        {/* Schema de Raci du 10/08 : avec un programme actif on
            demande d'abord quoi faire, sans programme on entre
            directement en seance libre. L'ecran de choix n'apparait
            jamais avec une seule option. */}
        <button class="ent-go"
          onClick={() => allerVers(programmeActif.value ? 'demarrer' : 'selection')}>
          {t('tr_start_session')}
        </button>
        {/* Le lien souligne rouge est devenu une carte (Raci, 17/08) :
            souligner et rougir un texte le fait ressembler a une
            mention legale, pas a la seconde action de la page. La carte
            lui donne une surface a toucher, une icone qui annonce le
            sujet, et une ligne qui dit ce qui attend derriere — sans
            rivaliser avec le bouton jaune, seul aplat plein de la page. */}
        {/* Avec un programme actif, la carte mene a sa GESTION plutot
            qu'au questionnaire. C'est la qu'on replace les seances,
            qu'on en change, et qu'on supprime le programme — le bouton
            d'abandon existait mais n'etait atteignable qu'apres avoir
            refait les quatre questions, ce qui revient a le cacher
            (Raci, 17/08 : « je ne trouve pas comment supprimer »). */}
        <button class="ent-prog" onClick={() => (programmeActif.value
          ? allerVers('planifier', { prog: programmeActif.value.id })
          : allerVers('questionnaire'))}>
          <span class="ent-prog-ic" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 5.5A1.5 1.5 0 015.5 4H10l2 2.4h6.5A1.5 1.5 0 0120 7.9v10.6a1.5 1.5 0 01-1.5 1.5h-13A1.5 1.5 0 014 18.5z" />
              <path d="M12 11v5M9.5 13.5h5" />
            </svg>
          </span>
          {/* Titre seul (Raci, 21/08). Le sous-titre « Replacer les
              seances, en changer ou l'arreter » passait sur deux lignes
              et faisait de la carte secondaire le bloc le plus haut de
              la zone d'action — juste sous le bouton qui doit dominer.
              Ce qu'il annoncait se decouvre de toute facon en entrant. */}
          <span class="ent-prog-txt">
            <span class="ent-prog-t">
              {programmeActif.value ? t('tr_prog_gerer') : t('tr_adapt_prog')}
            </span>
          </span>
          <span class="ent-prog-fl" aria-hidden="true">&rsaquo;</span>
        </button>
      </div>

      {/* 3 — Calendrier */}
      <div class="ent-bloc">
        <h3>{t('tr_log_title')}</h3>
        <p class="ent-sous">{t('tr_log_sub')}</p>

        {/* Les deux resumes, descendus du haut de page : ils comptent
            les seances du MOIS AFFICHE, donc ils appartiennent au
            calendrier. Sans emoji — un halterophile et un biceps en
            couleur devant chaque ligne juraient avec le reste de la
            page, et ne disaient rien que le texte ne dise deja. */}
        {(nbSeancesMois || dernierIso) && (
          <div class="wlog-resume">
            <span class="wlog-sum-pill">
              {nbSeancesMois} {t(nbSeancesMois > 1 ? 'sessions' : 'session')} {t('in_month')} {t('months_long').split('|')[ref.getMonth()]}
            </span>
            {dernierTxt && (
              <span class="wlog-sum-pill">
                {/* « Dernière : Triceps · Ven 14 août » etait trop long
                    (Raci, 12/08). Quand c'est proche, le jour se dit en
                    un mot — aujourd'hui, hier — et la date complete ne
                    sert plus a rien. Elle ne revient qu'au-dela. */}
                {t('last_session')} : {dernierTxt} · {quandCourt(dernierIso, todayIso)}
              </span>
            )}
          </div>
        )}

        {/* Le calendrier ne retient plus que deux semaines (v355) :
            reculer au-dela n'ouvre que des mois vides, ce qui se lit
            comme une perte de donnees plutot que comme une limite.
            La fleche gauche s'eteint donc des que le mois affiche est
            celui de la borne. */}
        <div class="wlog-cal-head">
          <button class={'wlog-nav' + (avantBorne ? ' off' : '')}
            onClick={(e) => { e.stopPropagation(); if (!avantBorne) setOffset(offset - 1); }}>‹</button>
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

      {/* 4 — Semaine + silhouette. La meme lecture que dans la modale
          d'un jour, mais visible sans rien ouvrir : ce qui a ete
          travaille depuis lundi, et ce qui n'a pas ete touche. */}
      <div class="ent-bloc">
        <h3>{t('tr_week_title')}</h3>
        <p class="ent-sous">{t('tr_week_since')} {jourCourt(lundi)}</p>
        <div class="ent-semaine">
          <div class="ent-sem-txt">
            <div class="ent-sem-l">
              <span>{t('tr_week_sessions')}</span><b>{seancesSemaine}</b>
            </div>
            <div class="ent-sem-l">
              <span>{t('tr_week_worked')}</span>
              <b>{travailles.length} / {GROUPES.filter(g => COULEUR[g.k]).length}</b>
            </div>
            {oublies.length > 0 && (
              <div class="ent-sem-l">
                <span>{t('tr_week_missing')}</span>
                <b class="ent-sem-oubli">{oublies.slice(0, 3).map(g => nomMuscle(g.k)).join(', ')}</b>
              </div>
            )}
          </div>
          <div class="ent-mannequin"><BodyMap compte={compteSemaine} /></div>
        </div>
      </div>

      {/* 5 — Seances enregistrees */}
      <div class="ent-bloc">
        <BlocSeances ouvrir={ouvrirSeance} voirTout={voirToutesSeances} />
      </div>
    </>
  );
}

// ==========================================================
// Modale de selection des muscles d'une journee
// ==========================================================
/**
 * Fenetre d'un jour. Elle depend desormais du TYPE de jour.
 *
 * Raci le 10/08 : « on est le 12, et quand je clique jusqu'au 16 c'est
 * la page du 12 qui s'ouvre ». Mesure : seul le titre changeait. Le
 * corps — silhouette de la semaine et liste des huit muscles — etait
 * rigoureusement identique du 12 au 16, puisqu'ils appartiennent a la
 * meme semaine. Le titre fait une ligne, le corps occupe l'ecran :
 * c'etait bien la meme page.
 *
 * Trois cas, comme dans l'organigramme :
 *   passe      -> ce qui a ete fait, exercices et charges
 *   aujourd'hui-> la seance prevue, avec de quoi la demarrer
 *   a venir    -> ce qui est prevu
 * Le marquage manuel des muscles reste accessible dans les trois :
 * c'est lui qui colore le calendrier quand on s'entraine ailleurs.
 */
function ModaleMuscles({ iso, fermer }) {
  // Empilee dans la pile de retours : le bouton Android et la touche
  // Echap la ferment, au lieu de changer l'onglet SOUS elle. Le hook
  // doit etre appele avant tout retour anticipe — d'ou le `!!iso`
  // plutot qu'un `if (!iso) return null` place au-dessus.
  useRetour(!!iso, fermer);
  if (!iso) return null;
  const sel = muscleLog.value[iso] || [];
  const isoAuj = wlIso(new Date());
  const type = iso < isoAuj ? 'passe' : (iso === isoAuj ? 'auj' : 'futur');
  const faites = seancesDuJour(iso);
  const prevue = seancePrevue(iso);
  const [choixOuvert, setChoixOuvert] = useState(false);

  // Les seances proposables : celles du programme actif. Sans
  // programme, la liste est vide et on le dit plutot que d'ouvrir un
  // choix sans choix.
  const actif = programmeActif.value;
  const prog = actif ? progParId(actif.id) : null;
  const sessionsProgramme = prog
    ? prog.seances.map((sa, i) => ({ seanceId: `${actif.id}-${i}`, titre: sa.titre, sub: sa.sub }))
    : [];

  // La fiche ne montre QUE le jour ouvert (Raci, 16/08). Elle a
  // agrege la semaine entiere pendant un temps : on ouvrait mardi et
  // la silhouette se colorait de lundi, ce qui rend un jour vide
  // indiscernable d'un jour charge. La lecture hebdomadaire n'est pas
  // perdue pour autant — c'est exactement ce que porte la carte
  // « Ta semaine » de la page S'entrainer, avec sa propre silhouette.
  //
  // Deux sources pour un meme jour, reunies : les pastilles cochees a
  // la main, et les muscles DEDUITS des exercices des seances
  // enregistrees. Sans la deduction, faire une seance pecs sans
  // cocher la pastille laissait le corps gris.
  const jour = wlIsoToDate(iso);
  const compte = compteDuJour(iso);
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
        <div class="ml-type">
          {type === 'passe' ? t('ml_passe') : type === 'auj' ? t('ml_auj') : t('ml_futur')}
        </div>

        {/* ---- Ce qui a ete FAIT ce jour-la ---- */}
        {faites.length > 0 && (
          <div class="ml-fait">
            {faites.map(sa => (
              <div key={sa.id} class="ml-fait-s">
                <div class="ml-fait-t">
                  {sa.titre}
                  {sa.duree > 0 && <span class="ml-fait-d"> · {Math.max(1, Math.round(sa.duree / 60))} min</span>}
                </div>
                {(sa.exos || []).slice(0, 6).map((e, i) => (
                  <div key={i} class="ml-fait-e">
                    <i class="dot" style={{ background: COULEUR[e.mKey] || '#C9C3B8' }} />
                    <span class="ml-fait-n">{e.nom}</span>
                    <span class="ml-fait-v">{resumeSeries(e.series)}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* ---- Ce qui est PREVU ---- */}
        {!faites.length && prevue && (
          <div class="ml-prevu">
            <div class="ml-prevu-t">{prevue.titre}</div>
            <div class="ml-prevu-s">{prevue.sub}</div>
            {/* Jour passe : cette seance etait au programme, elle n'a
                jamais ete enregistree. Sans cette ligne, elle se lisait
                comme une seance FAITE — le titre du bloc dit « ce que
                tu as fait » — et contredisait les muscles affiches
                dessous (Raci, 22/08). */}
            {type === 'passe' && <div class="ml-prevu-non">{t('ml_prevu_non')}</div>}
            {type !== 'passe' && (
              <button class="ml-prevu-b" onClick={() => {
                fermer();
                allerVers('seanceDetail', { seanceId: prevue.seanceId, titre: prevue.titre, depuis: 'journal' });
              }}>{t('ml_demarrer')}</button>
            )}
          </div>
        )}

        {/* ---- Rien fait, rien prevu ---- */}
        {!faites.length && !prevue && (
          <p class="ml-rien">
            {type === 'passe' ? t('ml_rien_passe') : t('ml_rien_futur')}
          </p>
        )}

        {/* ---- Poser une seance sur CETTE date ----
            Raci le 10/08 : « en cliquant sur une des dates je
            pourrais programmer une seance ». Le programme donne un
            rythme regulier ; ceci sert a ce qui n'y rentre pas —
            rattraper, ajouter un jour, poser une seance enregistree.
            Reserve au present et au futur : on ne planifie pas hier. */}
        {type !== 'passe' && !faites.length && (
          choixOuvert ? (
            <div class="ml-choix">
              <div class="ml-choix-t">{t('ml_choisir')}</div>
              {sessionsProgramme.map(sa => (
                <button key={sa.seanceId} class="ml-choix-l"
                  onClick={() => { planifierSeance(iso, sa); setChoixOuvert(false); }}>
                  <span class="ml-choix-n">{sa.titre}</span>
                  <span class="ml-choix-s">{sa.sub}</span>
                </button>
              ))}
              {!sessionsProgramme.length && <p class="ml-rien">{t('ml_pas_de_prog')}</p>}
              <button class="ml-choix-annul" onClick={() => setChoixOuvert(false)}>{t('cancel')}</button>
            </div>
          ) : (
            <button class="ml-programmer" onClick={() => setChoixOuvert(true)}>
              {prevue ? t('ml_remplacer') : t('ml_programmer')}
            </button>
          )
        )}

        {/* Retirer une seance posee a la main sur cette date. */}
        {prevue && prevue.main && !faites.length && (
          <button class="ml-retirer" onClick={() => planifierSeance(iso, null)}>
            {t('ml_retirer')}
          </button>
        )}

        <div class="ml-corps">
          <BodyMap compte={compte} />
          <div class="ml-legende">
            {/* La legende ne liste plus les neuf groupes dont sept
                eteints : elle nomme ce qui a ete travaille, et le dit
                quand il n'y a rien. Une liste de gris demande de
                chercher les rares pastilles allumees. */}
            {/* Le titre ne s'affiche que s'il annonce quelque chose : un
                en-tete seul au-dessus du vide fait chercher ce qui
                manque (Raci, 22/08). La silhouette grise suffit. */}
            {GROUPES.some(g => COULEUR[g.k] && compte[g.k]) && (
              <div class="ml-legende-titre">{t('ml_ce_jour')}</div>
            )}
            {GROUPES.filter(g => COULEUR[g.k] && compte[g.k]).map(g => (
              <span key={g.k} class="fait">
                <i class="dot" style={{ background: COULEUR[g.k] }} />
                {nomMuscle(g.k)}
              </span>
            ))}
            {/* Pas de « rien de note » ici : le haut de la fiche le dit
                deja, et la silhouette entierement grise le montre. Trois
                fois la meme information sur un demi-ecran. */}
          </div>
        </div>
        <div class="ml-groups-titre">{t('ml_noter')}</div>
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

        {/* Fleche de retour (Raci, 17/08 ; descendue en bas a droite le
            22/08). En haut a gauche elle etait a l'opposé du pouce sur
            une fiche qui occupe tout l'ecran. Posee en dernier dans le
            DOM pour que l'ordre de lecture suive l'ordre visuel, elle
            est calee en fixe dans la reserve de 80 px que la fiche
            garde sous ses boutons. */}
        <button class="ml-retour" onClick={fermer} aria-label="Retour">←</button>
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
  // Vues internes a l'onglet : liste plein ecran et detail d'une
  // seance. Pas de detour par vueEntrainer — ces deux ecrans partent
  // du journal et y reviennent.
  const [seanceOuverte, setSeanceOuverte] = useState(null);
  const [toutesSeances, setToutesSeances] = useState(false);
  // Retour Android : un cran ferme l'ecran ouvert, dans l'ordre
  // d'empilement (detail par-dessus la liste).
  useRetour(toutesSeances, () => setToutesSeances(false));
  useRetour(!!seanceOuverte, () => setSeanceOuverte(null));

  if (seanceOuverte) {
    return (
      <div class="pg-entrainer pg-entrainer--carte">
        <Entete retour={() => setSeanceOuverte(null)} />
        <DetailSeance seance={seanceOuverte} apresSuppression={() => setSeanceOuverte(null)} />
      </div>
    );
  }
  if (toutesSeances) {
    return (
      <div class="pg-entrainer pg-entrainer--carte">
        <Entete retour={() => setToutesSeances(false)} />
        <ToutesSeances ouvrir={setSeanceOuverte} />
      </div>
    );
  }

  // DECISION RACI (26/07) : la partie entrainement est GRATUITE en
  // entier — questionnaire, programmes, seances. Les anciens verrous
  // (Premium jour 1 sur le sur-mesure, fenetre decouverte sur les
  // programmes) sont leves ; le Premium reste sur la nutrition.
  const verrou = (e, dest) => { e.preventDefault(); allerVers(dest); };
  const locked = '';

  return (
    <div class="pg-entrainer pg-entrainer--carte">
      <Entete />
      {/* Pas de bloc-titre sous la barre : comme le Journal, la barre
          puis le contenu. Le nom de l'onglet est deja dans la
          navigation du bas — le repeter en 31 px coutait un tiers
          d'ecran avant la premiere carte. */}

      {/* Les cartes « Seance libre » et « Creer mon programme » ont
          ete retirees le 10/08 a la demande de Raci. Elles occupaient
          les deux tiers du premier ecran pour deux liens et
          repoussaient le calendrier en troisieme position, replie.
          Leurs deux destinations vivent maintenant dans la zone
          d'action du journal, en haut : `selection` sur le gros
          bouton, `questionnaire` sur le lien. Aucune n'est perdue. */}
      <JournalEntrainement ouvrirJour={setJourOuvert}
        ouvrirSeance={setSeanceOuverte}
        voirToutesSeances={() => setToutesSeances(true)} />

      <ModaleMuscles iso={jourOuvert} fermer={() => setJourOuvert(null)} />
      <ModalePremium montre={premium} fermer={() => setPremium(false)} />
    </div>
  );
}
