import { useState, useEffect } from 'preact/hooks';
import { DB, NOMS_ALIMENTS, macrosOf } from '../data/aliments.js';
import { customFoods, Scanner } from './Scanner.jsx';
import { estPremium } from './PremiumPage.jsx';
import { ongletActif } from './BottomNav.jsx';
import { t } from '../i18n/index.js';
import {
  totauxRepas, setPortion, ajouterIngredient,
  supprimerIngredient, supprimerRepas, basculerRepas, renommerRepas,
} from '../store/journal.js';

const EMOJIS = { repas: '🍲', collation: '🍏', boisson: '🥛' };

function LigneIngredient({ repasId, ing }) {
  const d = DB[ing.name] || customFoods.value[ing.name] || {};
  const m = macrosOf(ing);
  const [saisie, setSaisie] = useState(String(ing.portion));

  // La valeur peut changer ailleurs (vocal, scan) : on resynchronise.
  useEffect(() => { setSaisie(String(ing.portion)); }, [ing.portion]);

  return (
    <div class="mc-ing">
      <div class="mc-ing-info">
        <div class="mc-ing-nom">{ing.name}</div>
        <div class="mc-ing-base">
          {d.unit
            ? `1 ${d.unitLabel || 'pièce'} = ${Math.round((d.kcal || 0) * d.unit / 100)} kcal`
            : `100g = ${d.kcal ?? '?'} kcal`}
        </div>
      </div>

      <div class="mc-ing-champ">
        <input
          type="number" inputMode="decimal" min="0"
          value={saisie}
          onFocus={e => e.currentTarget.select()}
          onInput={e => {
            const v = e.currentTarget.value;
            setSaisie(v);                       // champ vide autorise pendant la frappe
            if (v !== '') setPortion(repasId, ing.id, v);
          }}
          onBlur={() => {
            if (saisie === '') { setSaisie('0'); setPortion(repasId, ing.id, 0); }
          }}
        />
      </div>
      <span class="mc-ing-unite">g</span>

      <div class="mc-ing-macros">
        <div class="mc-ing-kcal">{m.kcal.toFixed(0)} kcal</div>
        <div class="mc-ing-sub">
          {m.prot.toFixed(0)}P · {m.carbs.toFixed(0)}C · {m.lip.toFixed(0)}L
        </div>
      </div>

      <button class="mc-ing-del" onClick={() => supprimerIngredient(repasId, ing.id)} aria-label="Retirer">✕</button>
    </div>
  );
}

function Recherche({ repasId }) {
  const [q, setQ] = useState('');
  const [scan, setScan] = useState(false);
  const noms = [...Object.keys(customFoods.value), ...NOMS_ALIMENTS];
  const resultats = q.length < 2 ? [] :
    noms.filter(n => n.toLowerCase().includes(q.toLowerCase())).slice(0, 8);

  const choisir = (nom) => {
    const d = DB[nom] || customFoods.value[nom] || {};
    // Aliment "a la piece" (burger, oeuf...) : portion par defaut = 1 piece
    ajouterIngredient(repasId, nom, d.unit || 100);
    setQ('');
  };

  return (
    <div class="mc-ajout-zone">
      <div class="mc-ajout">
        <input
          placeholder={t('mc_add_ph')}
          value={q}
          onInput={e => setQ(e.currentTarget.value)}
        />
        <button
          class="mc-scan"
          onClick={() => { if (estPremium.value) setScan(true); else ongletActif.value = 'premium'; }}
          aria-label="Scanner un code-barres"
        >
          <svg viewBox="0 0 24 24" class="ic" aria-hidden="true">
            <path d="M3 5v14M6.5 5v14M10 5v14M13.5 5v14M17 5v14M20.5 5v14" />
          </svg>
          {!estPremium.value && <i class="mc-scan-pro">✦</i>}
        </button>
      </div>

      {resultats.length > 0 && (
        <div class="mc-resultats">
          {resultats.map(nom => (
            <button key={nom} onClick={() => choisir(nom)}>
              <span>{nom}</span>
              <span class="kc">{(DB[nom] || customFoods.value[nom]).kcal} kcal/100g</span>
            </button>
          ))}
        </div>
      )}

      {scan && <Scanner repasId={repasId} fermer={() => setScan(false)} />}
    </div>
  );
}

export function MealCard({ r }) {
  const tot = totauxRepas(r);
  const vide = r.ings.length === 0;
  const [edite, setEdite] = useState(false);

  // Trois zones : vignette, contenu, actions.
  // Le crayon et le chevron sont regroupes dans la zone d'actions,
  // centres sur la meme ligne : places separement, ils se retrouvaient
  // l'un en haut, l'autre au milieu.
  return (
    <div class={'mc' + (r.ouvert ? ' mc--ouvert' : '')}>
      <div class="mc-tete" onClick={() => !edite && basculerRepas(r.id)}>

        <div class="mc-vignette">{EMOJIS[r.type] || '🍲'}</div>

        <div class="mc-info">
          {edite ? (
            <input
              class="mc-titre-champ"
              value={r.nom}
              onClick={e => e.stopPropagation()}
              onInput={e => renommerRepas(r.id, e.currentTarget.value)}
              onBlur={() => setEdite(false)}
              onKeyDown={e => e.key === 'Enter' && setEdite(false)}
              autoFocus
            />
          ) : (
            <h3 class="mc-titre">{r.nom}</h3>
          )}
          <p class="mc-sous">{vide ? t('mc_empty') : `${tot.kcal.toFixed(0)} kcal`}</p>
        </div>

        <div class="mc-actions">
          <button
            class="mc-crayon"
            onClick={e => { e.stopPropagation(); setEdite(true); }}
            aria-label="Renommer"
          >
            <svg viewBox="0 0 24 24"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" /></svg>
          </button>
          <span class="mc-chevron" aria-hidden="true">▾</span>
        </div>
      </div>

      {r.ouvert && (
        <div class="mc-corps">
          {/* Carte vide : le champ d'ajout vient directement sous l'en-tete,
              aucune ligne fictive n'est affichee. */}
          {r.ings.map(ing => (
            <LigneIngredient key={ing.id} repasId={r.id} ing={ing} />
          ))}
          <Recherche repasId={r.id} />
        </div>
      )}

      {/* Bandeau recapitulatif : suit l'arrondi bas de la carte */}
      {r.ouvert && !vide && (
        <div class="mc-bandeau">
          {tot.kcal.toFixed(0)} kcal | {tot.prot.toFixed(1)}P | {tot.carbs.toFixed(1)}C | {tot.lip.toFixed(1)}L
        </div>
      )}
    </div>
  );
}
