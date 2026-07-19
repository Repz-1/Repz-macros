import { ajouterRepas } from '../store/journal.js';
import { t } from '../i18n/index.js';

// ============================================================
// FENETRE « QU'EST-CE QUE TU AJOUTES ? »
// Trois cartes de largeur egale sur une seule ligne.
// Chaque carte est un bouton entier. Fermeture par appui
// en dehors de la zone blanche, aucun bouton de fermeture.
// ============================================================

const TYPES = [
  {
    k: 'repas', label: 'type_meal', teinte: '#F7B500',
    trace: ['M7 3v7a2 2 0 002 2v9', 'M5 3v4', 'M9 3v4', 'M17 3c-1.5 0-3 2-3 5v4h3v9'],
  },
  {
    k: 'collation', label: 'type_snack', teinte: '#F59E0B',
    trace: ['M12 3a6 6 0 00-4 10.5c.7.7 1 1.2 1 2h6c0-.8.3-1.3 1-2A6 6 0 0012 3z', 'M9 18h6M10 21h4'],
  },
  {
    k: 'boisson', label: 'type_drink', teinte: '#0EA5E9',
    trace: ['M6 3h12l-1.5 17a1.8 1.8 0 01-1.8 1.6H9.3a1.8 1.8 0 01-1.8-1.6L6 3z', 'M6.6 10h10.8', 'M17.5 3.5L19 2'],
  },
];

export function AddMealModal({ montre, fermer }) {
  if (!montre) return null;

  const choisir = (type) => { ajouterRepas(type); fermer(); };

  return (
    <div class="mtype" onClick={e => { if (e.target === e.currentTarget) fermer(); }}>
      <div class="mtype-boite">
        <div class="mtype-titre">{t('mtype_title')}</div>
        <div class="mtype-grille">
          {TYPES.map(o => (
            <button key={o.k} class="mtype-opt" onClick={() => choisir(o.k)}>
              <span class="mt-ic">
                <svg viewBox="0 0 24 24" stroke={o.teinte} aria-hidden="true">
                  {o.trace.map((d, i) => <path key={i} d={d} />)}
                </svg>
              </span>
              <span>{t(o.label)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
