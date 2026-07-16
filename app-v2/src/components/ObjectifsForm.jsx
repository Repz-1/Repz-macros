import { useState } from 'preact/hooks';
import { objectifs, setObjectifs } from '../store/journal.js';

export function ObjectifsForm() {
  const [ouvert, setOuvert] = useState(false);
  const o = objectifs.value;

  if (!ouvert) {
    return <button class="obj-lien" onClick={() => setOuvert(true)}>Modifier mes objectifs</button>;
  }

  const champ = (label, cle) => (
    <label>{label}
      <input
        type="number"
        value={o[cle]}
        onInput={e => setObjectifs({ [cle]: parseFloat(e.currentTarget.value) || 0 })}
      />
    </label>
  );

  return (
    <div class="obj-form">
      {champ('Calories', 'kcal')}
      {champ('Protéines (g)', 'prot')}
      {champ('Glucides (g)', 'carbs')}
      {champ('Lipides (g)', 'lip')}
      <button class="obj-valider" onClick={() => setOuvert(false)}>Valider</button>
    </div>
  );
}
