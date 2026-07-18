import { ajouterRepas } from '../store/journal.js';
import { t } from '../i18n/index.js';

export function AddMealModal({ montre, fermer }) {
  const choisir = (type) => { ajouterRepas(type); fermer(); };

  return (
    <>
      <div class={`voile ${montre ? 'montre' : ''}`} onClick={fermer} />
      <div class={`modale ${montre ? 'montre' : ''}`}>
        <h3>{t('quoi_ajouter')}</h3>
        <div class="types">
          <button onClick={() => choisir('repas')}><span class="ic">🍲</span>{t('repas')}</button>
          <button onClick={() => choisir('collation')}><span class="ic">🍏</span>{t('collation')}</button>
          <button onClick={() => choisir('boisson')}><span class="ic">🥛</span>{t('boisson')}</button>
        </div>
      </div>
    </>
  );
}
