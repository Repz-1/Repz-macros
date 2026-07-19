import { useState } from 'preact/hooks';
import { signal } from '@preact/signals';
import { createPortal } from 'preact/compat';
import { EAT_IDEAS, CATEGORIES_IDEES } from '../data/idees.js';
import { DB } from '../data/aliments.js';
import { IDEA_PREP } from '../data/preparations.js';
import { objectifs, totauxJour } from '../store/journal.js';
import { estPremium } from './PremiumPage.jsx';
import { ongletActif } from './BottomNav.jsx';
import { t } from '../i18n/index.js';

// Macros d'une idee = somme reelle de ses aliments (base DB)
function macrosIdee(idee) {
  return idee.ings.reduce((acc, i) => {
    const d = DB[i.n];
    if (!d) return acc;
    const g = d.unit ? i.q * d.unit : i.q; // aliment a l'unite -> q = nb de pieces
    const f = g / 100;
    return {
      kcal: acc.kcal + d.kcal * f, prot: acc.prot + d.prot * f,
      carbs: acc.carbs + d.carbs * f, lip: acc.lip + d.lip * f, g,
    };
  }, { kcal: 0, prot: 0, carbs: 0, lip: 0 });
}

// Etat partage : la pilule est dans la rangee flottante, le panneau
// reste dans le flux de la page.

// ============================================================
// ADAPTATION DES RECETTES
// Reprise de la logique de la v1 : la portion est reduite tant
// qu'une macro deborde, et une recette qui ne rentre pas meme a
// portion minimale est ecartee. Proposer du gras a quelqu'un deja
// en exces de lipides est un contresens.
// ============================================================
const RATIO_MIN = 0.35;
const RATIO_MAX = 1.4;
const MARGE = { prot: 8, carbs: 10, lip: 6 };
// Quand une macro est deja depassee, on tolere un apport modere
// plutot que de ne rien proposer du tout.
const PLANCHER = { prot: 30, carbs: 20, lip: 8 };

function limite(reste, marge, plancher) {
  if (reste === null) return Infinity;          // objectif non defini
  return reste > 0 ? reste + marge : plancher;
}

/** Calcule les quantites d'une idee pour un ratio donne. */
function quantites(idee, ratio) {
  const parts = [];
  let kcal = 0, prot = 0, carbs = 0, lip = 0;
  idee.ings.forEach(i => {
    const d = DB[i.n];
    if (!d) return;
    let q, grammes, libelle;
    if (d.unit) {
      q = Math.max(1, Math.round(i.q * ratio));
      grammes = q * d.unit;
      libelle = q + ' ' + i.l + (q > 1 ? 's' : '');
    } else {
      q = Math.max(5, Math.round(i.q * ratio / 5) * 5);
      grammes = q;
      libelle = q + 'g ' + i.l;
    }
    const f = grammes / 100;
    kcal += d.kcal * f; prot += d.prot * f;
    carbs += (d.carbs || 0) * f; lip += (d.lip || 0) * f;
    parts.push(libelle);
  });
  return {
    texte: parts.join(' · '),
    kcal: Math.round(kcal), prot: Math.round(prot),
    carbs: Math.round(carbs), lip: Math.round(lip),
  };
}

/**
 * Adapte une idee aux macros restantes.
 * Retourne null si elle ne rentre pas, meme a portion minimale.
 */
function adapter(idee, restes, cible) {
  const respecte = (c) =>
    c.prot  <= limite(restes.prot,  MARGE.prot,  PLANCHER.prot) &&
    c.carbs <= limite(restes.carbs, MARGE.carbs, PLANCHER.carbs) &&
    c.lip   <= limite(restes.lip,   MARGE.lip,   PLANCHER.lip);

  const base = quantites(idee, 1);
  let ratio = base.kcal > 0
    ? Math.max(RATIO_MIN, Math.min(RATIO_MAX, cible / base.kcal))
    : 1;
  let calc = quantites(idee, ratio);
  let reduite = false;

  while (!respecte(calc) && ratio > RATIO_MIN) {
    ratio = Math.max(RATIO_MIN, ratio - 0.1);
    calc = quantites(idee, ratio);
    reduite = true;
  }

  if (!respecte(calc)) return null;             // ecartee
  return { ...calc, reduite };
}


/** Fiche detaillee d'une recette : ingredients peses et preparation. */
/**
 * Duree approximative d'une recette, deduite des temps cites dans ses
 * etapes (« 25 min au four », « 5-6 min par face »). On retient le plus
 * long, arrondi aux 5 minutes, avec un minimum de 10.
 * Aucune donnee inventee : si aucun temps n'est mentionne, on n'affiche rien.
 */
function dureeEstimee(prep) {
  if (!prep || !prep.steps) return null;
  const texte = prep.steps.join(' ');
  const trouves = [...texte.matchAll(/(\d+)(?:\s*[-–]\s*(\d+))?\s*min/gi)]
    .map(m => parseInt(m[2] || m[1], 10))
    .filter(n => !isNaN(n) && n < 240);
  if (!trouves.length) return null;
  const max = Math.max(...trouves);
  return Math.max(10, Math.round(max / 5) * 5);
}

/** Nom de fichier image d'une recette : sans accent ni espace. */
function fichierImage(nom) {
  return nom
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')   // accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') + '.webp';
}

/**
 * Fiche recette plein ecran.
 * Photo en banniere, informations essentielles dessous, puis le detail.
 * Tant qu'une photo manque, un fond degrade prend sa place : la mise
 * en page reste identique, sans trou ni image cassee.
 */
function FicheRecette({ nom, portion, kcal, prot, fermer }) {
  const prep = IDEA_PREP[nom];
  const [photoOk, setPhotoOk] = useState(true);
  const minutes = dureeEstimee(prep);

  return createPortal(
    <div class="fr-plein">
      <div class="fr-defile">

        {/* Banniere : photo si elle existe, degrade sinon */}
        <div class={'fr-banniere' + (photoOk ? '' : ' fr-banniere--vide')}>
          {photoOk && (
            <img
              src={`../img/recettes/${fichierImage(nom)}`}
              alt=""
              onError={() => setPhotoOk(false)}
            />
          )}
          {!photoOk && (
            <svg class="fr-embleme" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M7 3v7a2 2 0 002 2v9" /><path d="M5 3v4" /><path d="M9 3v4" />
              <path d="M17 3c-1.5 0-3 2-3 5v4h3v9" />
            </svg>
          )}
          <button class="fr-x" onClick={fermer} aria-label="Fermer">✕</button>
        </div>

        {/* En-tete : titre et informations essentielles */}
        <div class="fr-tete">
          <h2 class="fr-titre">{nom}</h2>
          <div class="fr-meta">
            {minutes && (
              <span>
                <svg viewBox="0 0 24 24" class="ic" aria-hidden="true">
                  <circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2M9 2h6" />
                </svg>
                {minutes} min
              </span>
            )}
            <span>
              <svg viewBox="0 0 24 24" class="ic" aria-hidden="true">
                <path d="M12 3C9 7 7 9 7 13a5 5 0 0010 0c0-2-1-3.6-2.5-5-.3 1.2-1 2-2 2.4C13 8 13 5.5 12 3z" />
              </svg>
              {kcal} kcal
            </span>
            <span>
              <svg viewBox="0 0 24 24" class="ic" aria-hidden="true">
                <path d="M6.5 6.5v11M17.5 6.5v11M3 9v6M21 9v6M6.5 12h11" />
              </svg>
              {prot} g prot
            </span>
          </div>
        </div>

        <div class="fr-sep" />

        <div class="fr-corps">
          <div class="fr-sec">{t('ingredients')}</div>
          <ul class="fr-ings">
            {portion.split(' · ').map((x, i) => <li key={i}>{x}</li>)}
          </ul>

          <div class="fr-sec">{t('preparation')}</div>
          <ol class="fr-steps">
            {(prep ? prep.steps : ['Assemble les ingrédients selon tes préférences.'])
              .map((x, i) => <li key={i}>{x}</li>)}
          </ol>

          {prep && prep.tip && <div class="fr-tip">{prep.tip}</div>}
        </div>
      </div>
    </div>,
    document.body
  );
}

export const ideesOuvertes = signal(false);

export function IdeesRepas({ pilulSeule, panneauSeul }) {
  const ouvert = ideesOuvertes.value;
  const setOuvert = (v) => { ideesOuvertes.value = v; };
  const [cat, setCat] = useState(null);
  const [fiche, setFiche] = useState(null);
  const [index, setIndex] = useState(0);

  const reste = Math.round(objectifs.value.kcal - totauxJour.value.kcal);

  // Rangee flottante : la pilule seule.
  if (pilulSeule) {
    return (
      <button class="eat-toggle" onClick={() => setOuvert(!ouvert)}>
        <svg viewBox="0 0 24 24" class="ic" aria-hidden="true">
          <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.2 1 2h6c0-.8.3-1.3 1-2A6 6 0 0 0 12 3z" />
        </svg>
        <span>{t('eat_title')}</span>
        <span class="eat-fleche">{ouvert ? '\u25B4' : '\u25BE'}</span>
      </button>
    );
  }

  return (
    <div class="eat-zone-wrap">
      <div class="eat-zone" style={panneauSeul ? { display: 'none' } : null}>
        <button class="eat-toggle" onClick={() => setOuvert(!ouvert)}>
          <svg viewBox="0 0 24 24" class="ic" aria-hidden="true">
            <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.2 1 2h6c0-.8.3-1.3 1-2A6 6 0 0 0 12 3z" />
          </svg>
          <span>{t('eat_title')}</span>
          <span class="eat-fleche">{ouvert ? '\u25B4' : '\u25BE'}</span>
        </button>
      </div>

      {ouvert && !estPremium.value && (
        <div class="eat-panneau" onClick={() => { ongletActif.value = 'premium'; }}>
          <p class="eat-intro">Des idées de repas calibrées sur tes macros restantes. <b>Passe en Premium</b> pour les débloquer.</p>
        </div>
      )}

      {ouvert && estPremium.value && (
    <div class="eat-panneau">
      <p class="eat-intro"
         dangerouslySetInnerHTML={{ __html: t('eat_left').replace('{n}', Math.max(0, reste)) }} />

      <div class="eat-cats">
        {CATEGORIES_IDEES.map(c => (
          <button key={c.k} class={'eat-cat' + (cat === c.k ? ' active' : '')}
                  onClick={() => { setIndex(0); setCat(cat === c.k ? null : c.k); }}>
            {c.label}
          </button>
        ))}
      </div>

      {cat && (() => {
        const obj = objectifs.value, tot = totauxJour.value;
        const restes = {
          prot:  obj.prot  > 0 ? obj.prot  - tot.prot  : null,
          carbs: obj.carbs > 0 ? obj.carbs - tot.carbs : null,
          lip:   obj.lip   > 0 ? obj.lip   - tot.lip   : null,
        };
        // Une portion vise environ un quart de ce qu'il reste sur la journee.
        const cible = Math.max(250, Math.min(700, reste > 0 ? reste * 0.28 : 400));

        const retenues = EAT_IDEAS[cat]
          .map(idee => ({ idee, p: adapter(idee, restes, cible) }))
          .filter(x => x.p !== null)
          .sort((a, b) => (a.p.reduite - b.p.reduite) || (b.p.prot - a.p.prot));

        if (!retenues.length) {
          return <div class="eat-note">{t('eat_none_fit')}</div>;
        }

        // Une seule suggestion a la fois : l'algorithme a deja classe
        // les recettes, autant assumer de proposer la meilleure.
        const { idee, p } = retenues[index % retenues.length];

        return (
        <div class="eat-une">
          <div class="eat-idea"
               onClick={() => setFiche({ nom: idee.nom, portion: p.texte, kcal: p.kcal, prot: p.prot })}>
            <div class="eat-idea-name">{idee.nom}</div>
            <div class="eat-idea-ex">{p.texte}</div>
            <div class="eat-idea-kcal">
              ≈ {p.kcal} kcal · <span class="eat-prot ok">{p.prot} g prot</span>
            </div>
            {p.reduite && <div class="eat-adapt">✓ {t('eat_adapted')}</div>}
            <span class="eat-open">{t('eat_see')}</span>
          </div>

          {retenues.length > 1 && (() => {
            const pos = index % retenues.length;
            return (
              <div class="eat-nav">
                <button
                  onClick={() => setIndex(index - 1)}
                  disabled={pos === 0}
                >← {t('eat_prev')}</button>
                <span class="eat-compteur">{pos + 1} / {retenues.length}</span>
                <button
                  onClick={() => setIndex(index + 1)}
                  disabled={pos === retenues.length - 1}
                >{t('eat_next')} →</button>
              </div>
            );
          })()}
        </div>
        );
      })()}

      {fiche && <FicheRecette {...fiche} fermer={() => setFiche(null)} />}
    </div>
      )}
    </div>
  );
}
