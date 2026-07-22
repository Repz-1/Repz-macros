import { useState } from 'preact/hooks';
import { calculerBesoins, NIVEAUX_ACTIVITE, OBJECTIFS } from '../data/tdee.js';
import { setObjectifs } from '../store/journal.js';
import { createPortal } from 'preact/compat';

// Calculateur de besoins. Le resultat se recalcule a chaque frappe (pas de bouton
// "Calculer" : reactif). "Appliquer" pousse le resultat dans les objectifs du jour.
export function TdeeCalculator({ montre, fermer }) {
  const [f, setF] = useState({
    sexe: 'h', age: 25, poids: 75, taille: 175, masseGrasse: '',
    activiteBase: 1.3, joursEntrainement: 4, intensiteEntrainement: 0.03, ajustement: 300,
  });
  const [applique, setApplique] = useState(false);

  const maj = (cle, val) => setF(o => ({ ...o, [cle]: val }));
  const num = (cle, val) => maj(cle, val === '' ? '' : parseFloat(val));

  const r = calculerBesoins({
    ...f,
    age: +f.age || 25, poids: +f.poids || 75, taille: +f.taille || 175,
    masseGrasse: f.masseGrasse === '' ? NaN : +f.masseGrasse,
    joursEntrainement: Math.max(0, +f.joursEntrainement || 0),
  });

  const appliquer = () => {
    setObjectifs({ kcal: r.kcal, prot: r.prot, carbs: r.carbs, lip: r.lip });
    setApplique(true);
    setTimeout(() => { setApplique(false); fermer(); }, 1100);
  };

  return createPortal(
    <>
      <div class={`voile ${montre ? 'montre' : ''}`} onClick={fermer} />
      <div class={`modale modale-calc ${montre ? 'montre' : ''}`}>
        <h3>Calculer mes besoins</h3>

        <div class="calc-grille">
          <label>Sexe
            <select value={f.sexe} onChange={e => maj('sexe', e.currentTarget.value)}>
              <option value="h">Homme</option>
              <option value="f">Femme</option>
            </select>
          </label>
          <label>Âge
            <input type="number" value={f.age} onInput={e => num('age', e.currentTarget.value)} />
          </label>
          <label>Poids (kg)
            <input type="number" value={f.poids} onInput={e => num('poids', e.currentTarget.value)} />
          </label>
          <label>Taille (cm)
            <input type="number" value={f.taille} onInput={e => num('taille', e.currentTarget.value)} />
          </label>
          <label>% Masse grasse <span class="opt">(optionnel)</span>
            <input type="number" value={f.masseGrasse} placeholder="—" onInput={e => num('masseGrasse', e.currentTarget.value)} />
          </label>
          <label>Jours d'entraînement / sem.
            <input type="number" value={f.joursEntrainement} onInput={e => num('joursEntrainement', e.currentTarget.value)} />
          </label>
          <label class="pleine">Activité quotidienne
            <select value={f.activiteBase} onChange={e => num('activiteBase', e.currentTarget.value)}>
              {NIVEAUX_ACTIVITE.map(n => <option value={n.val}>{n.label}</option>)}
            </select>
          </label>
          <label class="pleine">Objectif
            <select value={f.ajustement} onChange={e => num('ajustement', e.currentTarget.value)}>
              {OBJECTIFS.map(o => <option value={o.val}>{o.label}</option>)}
            </select>
          </label>
        </div>

        <div class="calc-res">
          <div class="calc-res-ligne"><span>Métabolisme de base</span><span>{r.bmr} kcal</span></div>
          <div class="calc-res-ligne"><span>Dépense totale (TDEE)</span><span>{r.tdee} kcal</span></div>
          <div class="calc-res-ligne cible"><span>Objectif</span><span>{r.kcal} kcal</span></div>
        </div>

        <div class="calc-macros">
          <div class="cm"><div class="cm-v">{r.prot}g</div><div class="cm-l">Protéines</div></div>
          <div class="cm"><div class="cm-v">{r.carbs}g</div><div class="cm-l">Glucides</div></div>
          <div class="cm"><div class="cm-v">{r.lip}g</div><div class="cm-l">Lipides</div></div>
        </div>

        <button class="calc-appliquer" onClick={appliquer}>
          {applique ? '✓ Appliqué !' : 'Appliquer comme objectif'}
        </button>
      </div>
    </>
  , document.body);
}
