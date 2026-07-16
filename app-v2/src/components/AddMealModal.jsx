import { ajouterRepas } from '../store/journal.js';

export function AddMealModal({ montre, fermer }) {
  const choisir = (type) => { ajouterRepas(type); fermer(); };

  return (
    <>
      <div class={`voile ${montre ? 'montre' : ''}`} onClick={fermer} />
      <div class={`modale ${montre ? 'montre' : ''}`}>
        <h3>Qu'est-ce que tu ajoutes ?</h3>
        <div class="types">
          <button onClick={() => choisir('repas')}><span class="ic">🍽️</span>Repas</button>
          <button onClick={() => choisir('collation')}><span class="ic">💡</span>Collation</button>
          <button onClick={() => choisir('boisson')}><span class="ic">🥤</span>Boisson</button>
        </div>
      </div>
    </>
  );
}
