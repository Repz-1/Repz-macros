import { useState, useEffect } from 'preact/hooks';
import { repas, totauxRepas, fourchetteRepas, renommerRepas } from '../store/journal.js';
import { enregistrerPlat } from '../store/perso.js';
import { Recherche, LigneIngredient, illustration, repasOuvertId } from './MealCard.jsx';
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
          <button class="rp-crayon" onClick={() => setEdite(true)} aria-label="Renommer">
            <svg viewBox="0 0 24 24"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" /></svg>
          </button>
        </div>

        {/* Resume : total du repas + repere recommande */}
        <div class="rp-resume">
          <div class="rp-vignette" dangerouslySetInnerHTML={{ __html: illustration(r) }} />
          <div class="rp-resume-txt">
            <div class="rp-kcal">{tot.kcal.toFixed(0)} <span>kcal</span></div>
            <div class="rp-reco">{f ? `${t('mc_reco')} ${f.min} – ${f.max} kcal` : ' '}</div>
          </div>
          <div class="rp-macros">
            <span><b>{tot.prot.toFixed(0)}</b>P</span>
            <span><b>{tot.carbs.toFixed(0)}</b>C</span>
            <span><b>{tot.lip.toFixed(0)}</b>L</span>
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
              <button class="mc-plat-btn" onClick={() => { setNomPlat(''); setEnrego(true); }}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" /><path d="M17 21v-8H7v8M7 3v5h8" /></svg>
                {t('mc_plat_btn')}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
