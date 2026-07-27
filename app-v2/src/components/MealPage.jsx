import { useState, useEffect } from 'preact/hooks';
import { repas, totauxRepas, fourchetteRepas, renommerRepas } from '../store/journal.js';
import { macrosOf } from '../data/aliments.js';
import { enregistrerPlat } from '../store/perso.js';
import { Recherche, LigneIngredient, repasOuvertId } from './MealCard.jsx';
import { DetailNutritionnel } from './DetailNutritionnel.jsx';
import { t } from '../i18n/index.js';

// ============================================================
// PAGE REPAS — encodage plein ecran.
// Toucher un repas dans le Journal ouvre cette page : la
// recherche, la liste des resultats et les aliments encodes
// disposent de tout l'ecran, le clavier ne recouvre plus rien.
// La logique (recherche, favoris, plats, scan, lignes) est
// reutilisee telle quelle depuis MealCard.
// ============================================================


// Anneau du resume : la part de la fourchette conseillee deja
// couverte par le repas. Sans fourchette, l'anneau reste neutre.
function AnneauRepas({ kcal, cible }) {
  const max = cible ? cible.max : 0;
  const part = max > 0 ? Math.min(1, kcal / max) : 0;
  const R = 32, C = 2 * Math.PI * R;
  return (
    <div class="rp-anneau">
      <svg viewBox="0 0 74 74">
        <circle cx="37" cy="37" r={R} fill="none" stroke="#F1ECE3" stroke-width="6" />
        <circle
          cx="37" cy="37" r={R} fill="none" stroke="#E0A21C" stroke-width="6"
          stroke-linecap="round"
          stroke-dasharray={`${(part * C).toFixed(1)} ${C.toFixed(1)}`}
        />
        {/* Repere du minimum recommande : sans lui l'anneau ne dit pas
            vers quoi il se remplit. Le maximum est la boucle complete. */}
        {cible && cible.min > 0 && (() => {
          const a = (cible.min / max) * 2 * Math.PI;
          const x1 = 37 + Math.cos(a) * (R - 5), y1 = 37 + Math.sin(a) * (R - 5);
          const x2 = 37 + Math.cos(a) * (R + 5), y2 = 37 + Math.sin(a) * (R + 5);
          return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#B7A98C" stroke-width="2" stroke-linecap="round" />;
        })()}
      </svg>
      <div class="rp-anneau-c"><span /></div>
    </div>
  );
}

export function MealPage() {
  const id = repasOuvertId.value;
  const r = repas.value.find(x => x.id === id);

  const [edite, setEdite] = useState(false);
  const [enrego, setEnrego] = useState(false);
  const [nomPlat, setNomPlat] = useState('');
  const [garde, setGarde] = useState(false);

  // Repas supprime ou page fermee : rien a afficher.
  useEffect(() => { if (id !== null && !r) repasOuvertId.value = null; }, [id, r]);
  if (!r) return null;

  const tot = totauxRepas(r);
  // Chaque ligne affiche des valeurs arrondies : l'en-tete doit etre LEUR
  // somme, pas l'arrondi de la somme exacte, sinon 6+1+11 « fait 19 » et
  // l'utilisateur qui verifie conclut que l'app compte mal.
  const totAff = { kcal: 0, prot: 0, carbs: 0, lip: 0 };
  for (const ing of r.ings) {
    const m = macrosOf(ing);
    totAff.kcal += Math.round(m.kcal); totAff.prot += Math.round(m.prot);
    totAff.carbs += Math.round(m.carbs); totAff.lip += Math.round(m.lip);
  }
  const vide = r.ings.length === 0;
  const f = fourchetteRepas(r.cle);

  const enregistrerCommePlat = () => {
    const nom = nomPlat.trim();
    if (!nom) return;
    enregistrerPlat({
      id: Date.now(),
      nom,
      portions: 1,
      ings: r.ings.map(i => ({ name: i.name, portion: i.portion })),
    });
    setEnrego(false); setNomPlat('');
    setGarde(true); setTimeout(() => setGarde(false), 2200);
  };

  return (
    <div class="app-scroll couche-repas pg-journal">
      <div class="rp-colonne">

        {/* Topbar : retour + titre (crayon pour renommer) */}
        <div class="rp-topbar">
          <button class="rp-retour" onClick={() => { repasOuvertId.value = null; }} aria-label="Retour">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          {edite ? (
            <input
              class="rp-titre-champ"
              value={r.nom}
              onInput={e => renommerRepas(r.id, e.currentTarget.value)}
              onBlur={() => setEdite(false)}
              onKeyDown={e => e.key === 'Enter' && setEdite(false)}
              autoFocus
            />
          ) : (
            <h1 class="rp-titre" onClick={() => setEdite(true)}>{r.nom}</h1>
          )}
          {/* Une seule sortie : la barre du bas. Un second « Terminer »
              ici laissait croire que la fleche retour annulait quelque
              chose — tout est sauve en continu, rien n'est annulable. */}
          <span class="rp-terminer-esp" />
        </div>

        {/* Resume : total du repas + repere recommande */}
        <div class="rp-resume">
          <AnneauRepas kcal={tot.kcal} cible={f} />
          <div class="rp-resume-txt">
            <div class="rp-kcal">{totAff.kcal}<span>kcal</span></div>
            <div class="rp-reco">{f ? <><span>{t('mc_reco')}</span><b>{f.min}–{f.max} kcal</b></> : ' '}</div>
          </div>
          <div class="rp-macros">
            <div class="rp-macro">
              <b>{totAff.prot}<i>g</i></b><em>{t('protein')}</em><s style="background:var(--proteines)" />
            </div>
            <div class="rp-macro">
              <b>{totAff.carbs}<i>g</i></b><em>{t('carbs')}</em><s style="background:var(--glucides)" />
            </div>
            <div class="rp-macro">
              <b>{totAff.lip}<i>g</i></b><em>{t('fat')}</em><s style="background:var(--lipides)" />
            </div>
          </div>
        </div>

        {/* Recherche : la meme brique que la carte, avec tout l'ecran pour elle */}
        <Recherche repasId={r.id} />

        {/* Aliments deja encodes */}
        {!vide && (
          <div class="rp-section">
            <div class="rp-section-titre">{t('rp_dans_repas')}</div>
            <div class="rp-liste">
              {r.ings.map(ing => (
                <LigneIngredient key={ing.id} repasId={r.id} ing={ing} />
              ))}
              <div class="rp-total">
                <span class="rp-total-lb">{t('rp_total')}</span>
                <span class="rp-total-val">{totAff.kcal}<span>kcal</span></span>
              </div>
            </div>
          </div>
        )}

        {/* Au-dela des macros : fibres, sucres, satures, sel */}
        {!vide && <DetailNutritionnel ings={r.ings} />}

        {/* Enregistrer la composition comme plat reutilisable */}
        {!vide && (
          <div class="mc-plat rp-plat">
            {garde ? (
              <div class="mc-plat-ok">{'\u2713'} {t('mc_plat_ok')}</div>
            ) : enrego ? (
              <div class="mc-plat-saisie">
                <input
                  class="mc-plat-champ"
                  placeholder={t('mc_plat_nom')}
                  value={nomPlat}
                  onInput={e => setNomPlat(e.currentTarget.value)}
                  onKeyDown={e => e.key === 'Enter' && enregistrerCommePlat()}
                  autoFocus
                />
                <button class="mc-plat-ok-btn" disabled={!nomPlat.trim()} onClick={enregistrerCommePlat}>
                  {t('save')}
                </button>
                <button class="mc-plat-annul" onClick={() => { setEnrego(false); setNomPlat(''); }}>✕</button>
              </div>
            ) : (
              <div class="rp-actions">
                <button class="rp-btn-plat" onClick={() => { setNomPlat(''); setEnrego(true); }}>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 21l-7-4-7 4V5a2 2 0 012-2h10a2 2 0 012 2z" /></svg>
                  {t('mc_plat_btn')}
                </button>
                <button class="rp-btn-fin" onClick={() => { repasOuvertId.value = null; }}>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M8.5 12.5l2.5 2.5 4.5-5" /></svg>
                  {t('rp_terminer')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
