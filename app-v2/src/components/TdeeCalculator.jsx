import { useState } from 'preact/hooks';
import { calculerBesoins, NIVEAUX_ACTIVITE, OBJECTIFS } from '../data/tdee.js';
import { setObjectifs, calculBaseFait, poidsCalcul, objectifs } from '../store/journal.js';
import { estPremium } from './PremiumPage.jsx';
import { ongletActif } from './BottomNav.jsx';
import { createPortal } from 'preact/compat';

// Calculateur de besoins. Le resultat se recalcule a chaque frappe (pas de bouton
// "Calculer" : reactif). "Appliquer" pousse le resultat dans les objectifs du jour.
export function TdeeCalculator({ montre, fermer }) {
  const [f, setF] = useState({
    sexe: 'h', age: 25, poids: 75, taille: 175, masseGrasse: '',
    activiteBase: 1.3, joursEntrainement: 4, intensiteEntrainement: 0.03, ajustement: 300,
  });
  const [applique, setApplique] = useState(false);
  // 'calc' : formule Mifflin-St Jeor. 'manuel' : saisie directe des
  // 4 valeurs — reserve Premium, toujours (ajustement fin continu).
  const [mode, setMode] = useState('calc');
  const [man, setMan] = useState(() => ({ ...objectifs.value }));
  const majMan = (cle, val) => setMan(o => ({ ...o, [cle]: val === '' ? '' : Math.max(0, parseFloat(val) || 0) }));
  const kcalMacros = Math.round((+man.prot || 0) * 4 + (+man.carbs || 0) * 4 + (+man.lip || 0) * 9);

  const choisirMode = (m) => {
    if (m === 'manuel' && !estPremium.value) {
      fermer();
      ongletActif.value = 'premium';
      return;
    }
    setMode(m);
  };

  const maj = (cle, val) => setF(o => ({ ...o, [cle]: val }));
  const num = (cle, val) => maj(cle, val === '' ? '' : parseFloat(val));

  const r = calculerBesoins({
    ...f,
    age: +f.age || 25, poids: +f.poids || 75, taille: +f.taille || 175,
    masseGrasse: f.masseGrasse === '' ? NaN : +f.masseGrasse,
    joursEntrainement: Math.max(0, +f.joursEntrainement || 0),
  });

  const appliquer = () => {
    if (mode === 'manuel') {
      setObjectifs({ kcal: +man.kcal || 0, prot: +man.prot || 0, carbs: +man.carbs || 0, lip: +man.lip || 0 });
      // Pas de calculBaseFait ni de poidsCalcul : la saisie manuelle
      // n'est ni le calcul offert, ni une base pour le rappel de recalcul.
    } else {
      setObjectifs({ kcal: r.kcal, prot: r.prot, carbs: r.carbs, lip: r.lip });
      calculBaseFait.value = true;   // le calcul offert est consomme
      poidsCalcul.value = +f.poids || null;
    }
    setApplique(true);
    setTimeout(() => { setApplique(false); fermer(); }, 1100);
  };

  return createPortal(
    <>
      <div class={`voile ${montre ? 'montre' : ''}`} onClick={fermer} />
      <div class={`modale modale-calc ${montre ? 'montre' : ''}`}>
        {/* La feuille occupe quasi tout l'ecran : le voile n'est plus une
            sortie atteignable, il faut une croix explicite. */}
        <button class="calc-fermer" onClick={fermer} aria-label="Fermer">✕</button>
        <h3>Mes besoins</h3>

        <div class="calc-modes" role="group">
          <button class={mode === 'calc' ? 'active' : ''} onClick={() => choisirMode('calc')}>Calculé</button>
          <button class={mode === 'manuel' ? 'active' : ''} onClick={() => choisirMode('manuel')}>
            Manuel{!estPremium.value && <span class="calc-pro">PRO</span>}
          </button>
        </div>

        {mode === 'manuel' ? (
          <div class="calc-grille">
            <label class="pleine">Calories (kcal)
              <input type="number" value={man.kcal} onInput={e => majMan('kcal', e.currentTarget.value)} />
            </label>
            <label>Protéines (g)
              <input type="number" value={man.prot} onInput={e => majMan('prot', e.currentTarget.value)} />
            </label>
            <label>Glucides (g)
              <input type="number" value={man.carbs} onInput={e => majMan('carbs', e.currentTarget.value)} />
            </label>
            <label>Lipides (g)
              <input type="number" value={man.lip} onInput={e => majMan('lip', e.currentTarget.value)} />
            </label>
            <div class="calc-note pleine">
              P×4 + G×4 + L×9 = <b>{kcalMacros} kcal</b>
              {Math.abs(kcalMacros - (+man.kcal || 0)) > 50 ? ' — écart avec tes calories' : ''}
            </div>
          </div>
        ) : (
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
        )}

        {mode === 'calc' && (
        <div class="calc-res">
          <div class="calc-res-ligne"><span>Métabolisme de base</span><span>{r.bmr} kcal</span></div>
          <div class="calc-res-ligne"><span>Dépense totale (TDEE)</span><span>{r.tdee} kcal</span></div>
          <div class="calc-res-ligne cible"><span>Objectif</span><span>{r.kcal} kcal</span></div>
        </div>
        )}

        {mode === 'calc' && (
        <div class="calc-macros">
          <div class="cm"><div class="cm-v">{r.prot}g</div><div class="cm-l">Protéines</div></div>
          <div class="cm"><div class="cm-v">{r.carbs}g</div><div class="cm-l">Glucides</div></div>
          <div class="cm"><div class="cm-v">{r.lip}g</div><div class="cm-l">Lipides</div></div>
        </div>
        )}

        <div class="calc-barre">
          <button class="calc-appliquer" onClick={appliquer}>
            {applique ? '✓ Appliqué !' : 'Appliquer comme objectif'}
          </button>
        </div>
      </div>
    </>
  , document.body);
}
