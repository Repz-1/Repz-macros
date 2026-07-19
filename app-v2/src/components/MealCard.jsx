import { useState } from 'preact/hooks';
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
  const d = DB[ing.name] || {};
  const m = macrosOf(ing);
  return (
    <div class="ligne-ing">
      <div class="infos">
        <div class="nom">{ing.name}</div>
        <div class="ref">
          {d.unit
            ? `≈ ${(ing.portion / d.unit).toFixed(1).replace('.0', '')} ${d.unitLabel || 'pièce'}${ing.portion / d.unit >= 2 ? 's' : ''} · ${d.kcal} kcal/100g`
            : `100g = ${d.kcal ?? '?'} kcal`}
        </div>
      </div>
      <input
        type="number"
        value={ing.portion}
        onInput={e => setPortion(repasId, ing.id, e.currentTarget.value)}
      />
      <span class="unite">g</span>
      <div class="macros">
        <div class="k">{m.kcal.toFixed(0)} kcal</div>
        <div class="d">{m.prot.toFixed(0)}P · {m.carbs.toFixed(0)}C · {m.lip.toFixed(0)}L</div>
      </div>
      <button class="suppr" onClick={() => supprimerIngredient(repasId, ing.id)}>✕</button>
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
    <div class="recherche">
      <div style={{display:'flex',gap:'6px'}}>
        <input
          style={{flex:1}}
          placeholder={t("ajouter_aliment")}
          value={q}
          onInput={e => setQ(e.currentTarget.value)}
        />
        <button
          class="ing-scan"
          onClick={() => { if (estPremium.value) setScan(true); else ongletActif.value = 'premium'; }}
          title="Scanner un code-barres"
        >▮▯▮{!estPremium.value && <i class="pro-mini">✦</i>}</button>
      </div>
      {resultats.length > 0 && (
        <div class="resultats">
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
          <p class="mc-sous">{vide ? t('vide') : `${tot.kcal.toFixed(0)} kcal`}</p>
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
        <div>
          {r.ings.map(ing => (
            <LigneIngredient key={ing.id} repasId={r.id} ing={ing} />
          ))}
          <Recherche repasId={r.id} />
          {!vide && (
            <div class="total-repas">
              {tot.kcal.toFixed(0)} kcal | {tot.prot.toFixed(1)}P | {tot.carbs.toFixed(1)}C | {tot.lip.toFixed(1)}L
            </div>
          )}
        </div>
      )}
    </div>
  );
}
