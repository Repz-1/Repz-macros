import { useState } from 'preact/hooks';
import { DB, NOMS_ALIMENTS, macrosOf } from '../data/aliments.js';
import {
  totauxRepas, setPortion, ajouterIngredient,
  supprimerIngredient, supprimerRepas, basculerRepas,
} from '../store/journal.js';

const EMOJIS = { repas: '🍽️', collation: '🍎', boisson: '🥤' };

function LigneIngredient({ repasId, ing }) {
  const d = DB[ing.name] || {};
  const m = macrosOf(ing);
  return (
    <div class="ligne-ing">
      <div class="infos">
        <div class="nom">{ing.name}</div>
        <div class="ref">100g = {d.kcal ?? '?'} kcal</div>
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
  const resultats = q.length < 2 ? [] :
    NOMS_ALIMENTS.filter(n => n.toLowerCase().includes(q.toLowerCase())).slice(0, 8);

  const choisir = (nom) => {
    const d = DB[nom];
    // Aliment "a la piece" (burger, oeuf...) : portion par defaut = 1 piece
    ajouterIngredient(repasId, nom, d.unit || 100);
    setQ('');
  };

  return (
    <div class="recherche">
      <input
        placeholder="Ajouter un aliment…"
        value={q}
        onInput={e => setQ(e.currentTarget.value)}
      />
      {resultats.length > 0 && (
        <div class="resultats">
          {resultats.map(nom => (
            <button key={nom} onClick={() => choisir(nom)}>
              <span>{nom}</span>
              <span class="kc">{DB[nom].kcal} kcal/100g</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function MealCard({ r }) {
  const t = totauxRepas(r);
  const vide = r.ings.length === 0;

  return (
    <div class="carte">
      <div class="carte-tete" onClick={() => basculerRepas(r.id)}>
        <div class="carte-emoji">{EMOJIS[r.type] || '🍽️'}</div>
        <div class="carte-titre">
          <h3>{r.nom}</h3>
          <p>{vide ? 'Vide' : `${t.kcal.toFixed(0)} kcal`}</p>
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
