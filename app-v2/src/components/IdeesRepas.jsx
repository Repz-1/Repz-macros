import { useState, useEffect } from 'preact/hooks';
import { signal } from '@preact/signals';
import { createPortal } from 'preact/compat';
import { EAT_IDEAS, CATEGORIES_IDEES } from '../data/idees.js';
import { DB } from '../data/aliments.js';
import { IDEA_PREP } from '../data/preparations.js';
import { objectifs, totauxJourAff, kcalRestantes } from '../store/journal.js';
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
// Decision Raci : les macros ne bloquent NI ne reduisent jamais une
// portion — la seule boussole est le reste calorique, et si une macro
// depasse, c'est a l'utilisateur d'ajuster. L'app se contente de le
// dire, sobrement. Seul garde-fou conserve : une recette qui, meme a
// portion minimale, exploserait largement le reste est ecartee.
function adapter(idee, restes, cible) {
  const base = quantites(idee, 1);
  const ratio = base.kcal > 0
    ? Math.max(RATIO_MIN, Math.min(RATIO_MAX, cible / base.kcal))
    : 1;
  const calc = quantites(idee, ratio);
  if (calc.kcal > cible * 1.35 + 60) return null;   // trop grosse, meme reduite

  // Portion revue a la baisse pour tenir dans le reste calorique :
  // c'est le badge d'origine, celui que l'utilisateur comprenait.
  const reduite = ratio <= 0.95;

  // Depassement de macro le plus marque, purement informatif.
  const over = ['prot', 'carbs', 'lip']
    .filter(mac => restes[mac] !== null && calc[mac] > restes[mac] + 2)
    .map(mac => ({ m: mac, n: Math.round(calc[mac] - restes[mac]) }))
    .sort((a, b) => b.n - a.n)[0] || null;

  return { ...calc, reduite, over };
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
    .replace(/œ/g, 'oe').replace(/æ/g, 'ae')            // ligatures
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
function FicheRecette({ nom, portion, kcal, prot, fermer, aPrec, aSuiv, prec, suiv, pos, total }) {
  const prep = IDEA_PREP[nom];
  const [photoOk, setPhotoOk] = useState(true);
  const minutes = dureeEstimee(prep);
  // La photo doit se re-tester quand on change de recette.
  useEffect(() => { setPhotoOk(true); }, [nom]);

  return createPortal(
    <div class="fr-plein">
      <div class="fr-defile">

        {/* Banniere : photo si elle existe, degrade sinon */}
        <div class={'fr-banniere' + (photoOk ? '' : ' fr-banniere--vide')}>
          {photoOk && (
            <img
              src={`/img/recettes/${fichierImage(nom)}`}
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

          {/* Navigation entre recettes retenues */}
          {total > 1 && (
            <>
              <button class="fr-nav fr-nav--prec" onClick={prec} disabled={!aPrec} aria-label="Recette précédente">‹</button>
              <button class="fr-nav fr-nav--suiv" onClick={suiv} disabled={!aSuiv} aria-label="Recette suivante">›</button>
              <span class="fr-compteur">{pos} / {total}</span>
            </>
          )}
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
  const [voirTout, setVoirTout] = useState(false);

  // MEME chiffre que la carte Calories (kcalRestantes, base sur les
  // totaux affiches) : le panneau disait 577 quand la carte disait 576,
  // car il recalculait depuis les totaux exacts non arrondis.
  const reste = kcalRestantes.value;

  // Etat contextuel de la pilule : au moins une recette rentre-t-elle
  // dans les macros restantes ? (premium uniquement, calcul leger)
  const suggestionPrete = (() => {
    if (!estPremium.value) return false;
    const obj = objectifs.value, tot = totauxJourAff.value;
    const restes = {
      prot:  obj.prot  > 0 ? obj.prot  - tot.prot  : null,
      carbs: obj.carbs > 0 ? obj.carbs - tot.carbs : null,
      lip:   obj.lip   > 0 ? obj.lip   - tot.lip   : null,
    };
    const cible = reste > 0 && reste <= 800
      ? Math.max(150, reste)
      : Math.max(250, Math.min(700, reste > 0 ? reste * 0.28 : 400));
    return CATEGORIES_IDEES.some(c =>
      EAT_IDEAS[c.k].some(idee => adapter(idee, restes, cible) !== null));
  })();

  // Rangee flottante : la pilule seule.
  if (pilulSeule) {
    return (
      <button class="eat-toggle" onClick={() => setOuvert(!ouvert)}>
        <svg viewBox="0 0 24 24" class="ic" aria-hidden="true">
          <path d="M12 3l1.7 4.6L18 9l-4.3 1.4L12 15l-1.7-4.6L6 9l4.3-1.4z" />
          <path d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" />
        </svg>
        <span>{t('eat_title')}</span>
        {suggestionPrete && (
          <>
            <span class="eat-sep"></span>
            <span class="eat-etat">{t('eat_etat')}</span>
          </>
        )}
        <span class="eat-fleche">{ouvert ? '\u25B4' : '\u25BE'}</span>
      </button>
    );
  }

  return (
    <div class="eat-zone-wrap">
      <div class="eat-zone" style={panneauSeul ? { display: 'none' } : null}>
        <button class="eat-toggle" onClick={() => setOuvert(!ouvert)}>
          <svg viewBox="0 0 24 24" class="ic" aria-hidden="true">
            <path d="M12 3l1.7 4.6L18 9l-4.3 1.4L12 15l-1.7-4.6L6 9l4.3-1.4z" />
            <path d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" />
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
                  onClick={() => { setVoirTout(false); setCat(cat === c.k ? null : c.k); }}>
            {c.label}
          </button>
        ))}
      </div>

      {cat && (() => {
        const obj = objectifs.value, tot = totauxJourAff.value;
        const restes = {
          prot:  obj.prot  > 0 ? obj.prot  - tot.prot  : null,
          carbs: obj.carbs > 0 ? obj.carbs - tot.carbs : null,
          lip:   obj.lip   > 0 ? obj.lip   - tot.lip   : null,
        };
        // Journee entamee, moins de ~800 kcal devant soi : la suggestion
        // doit FINIR la journee, pas en proposer un quart. Sinon, regle
        // du quart comme avant.
        const cible = reste > 0 && reste <= 800
          ? Math.max(150, reste)
          : Math.max(250, Math.min(700, reste > 0 ? reste * 0.28 : 400));

        const retenues = EAT_IDEAS[cat]
          .map(idee => ({ idee, p: adapter(idee, restes, cible) }))
          .filter(x => x.p !== null)
          // Priorite a ce qui remplit la cible calorique ; les proteines
          // departagent ensuite.
          .sort((a, b) => (Math.abs(a.p.kcal - cible) - Math.abs(b.p.kcal - cible)) || (b.p.prot - a.p.prot));

        if (!retenues.length) {
          return <div class="eat-note">{t('eat_none_fit')}</div>;
        }

        // Pile VERTICALE (Raci) : le carrousel horizontal se battait
        // avec le glissement de page entre onglets. Les trois
        // meilleures d'abord — le tri a deja fait le travail — et le
        // reste sur demande, dans le sens de defilement de la page.
        const visibles = voirTout ? retenues : retenues.slice(0, 3);
        const cachees = retenues.length - visibles.length;

        return (
        <div class="eat-une">
          <div class="eat-liste">
            {visibles.map(({ idee, p }, i) => (
              <div class="eat-idea" key={idee.nom} onClick={() => setFiche({ liste: retenues, pos: i })}>
                <div class="eat-idea-name">{idee.nom}</div>
                <div class="eat-idea-ex">{p.texte}</div>
                <div class="eat-idea-kcal">
                  ≈ {p.kcal} kcal · <span class="eat-prot ok">{p.prot} g prot</span>
                </div>
                {p.reduite && <div class="eat-adapt">✓ {t('eat_adapted')}</div>}
                {p.over && (
                  <div class="eat-over">
                    {t('eat_over').replace('{m}', t('macro_' + p.over.m)).replace('{n}', p.over.n)}
                  </div>
                )}
                <span class="eat-open">{t('eat_see')}</span>
              </div>
            ))}
          </div>

          {cachees > 0 && (
            <button class="eat-plus" onClick={() => setVoirTout(true)}>
              {t('eat_more').replace('{n}', cachees)}
            </button>
          )}
        </div>
        );
      })()}

      {fiche && (() => {
        const { liste, pos } = fiche;
        const { idee, p } = liste[pos];
        return (
          <FicheRecette
            nom={idee.nom} portion={p.texte} kcal={p.kcal} prot={p.prot}
            fermer={() => setFiche(null)}
            pos={pos + 1} total={liste.length}
            aPrec={pos > 0} aSuiv={pos < liste.length - 1}
            prec={() => setFiche({ liste, pos: pos - 1 })}
            suiv={() => setFiche({ liste, pos: pos + 1 })}
          />
        );
      })()}
    </div>
      )}
    </div>
  );
}
