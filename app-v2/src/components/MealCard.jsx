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
  const t = totauxRepas(r);
  const vide = r.ings.length === 0;
  const [edite, setEdite] = useState(false);

  return (
    <div class="carte">
      <div class="carte-tete" onClick={() => !edite && basculerRepas(r.id)}>
        <div class="carte-emoji">{EMOJIS[r.type] || '🍲'}</div>
        <div class="carte-titre">
          {edite ? (
            <input
              class="titre-edit"
              value={r.nom}
              onClick={e => e.stopPropagation()}
              onInput={e => renommerRepas(r.id, e.currentTarget.value)}
              onBlur={() => setEdite(false)}
              onKeyDown={e => e.key === 'Enter' && setEdite(false)}
              autoFocus
            />
          ) : (
            <h3 onClick={e => { e.stopPropagation(); setEdite(true); }} title="Renommer">{r.nom} <span class="crayon">✎</span></h3>
          )}
          <p>{vide ? t('vide') : `${t.kcal.toFixed(0)} kcal`}</p>
        </div>
        <button
          class="carte-suppr"
          onClick={e => { e.stopPropagation(); supprimerRepas(r.id); }}
          title="Supprimer"
        >✕</button>
        <span class={`carte-chevron ${r.ouvert ? 'ouvert' : ''}`}>▼</span>
      </div>

      {r.ouvert && (
        <div>
          {r.ings.map(ing => (
            <LigneIngredient key={ing.id} repasId={r.id} ing={ing} />
          ))}
          <Recherche repasId={r.id} />
          {!vide && (
            <div class="total-repas">
              {t.kcal.toFixed(0)} kcal | {t.prot.toFixed(1)}P | {t.carbs.toFixed(1)}C | {t.lip.toFixed(1)}L
            </div>
          )}
        </div>
      )}
    </div>
  );
}
