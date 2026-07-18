import { signal } from '@preact/signals';

// Onglet actif de l'app. Signal global : n'importe quel composant
// peut naviguer (ex: le bouton "Premium" d'une modale).
export const ongletActif = signal('journal');

const ONGLETS = [
  { k: 'journal',  label: 'Journal',    ic: 'M6 3v18M6 3c1.5 0 2 1 2 2v4c0 1-.5 2-2 2M10 3v18M14 3v6c0 1 .5 2 2 2h2M18 3v18' },
  { k: 'entrainer', label: "S'entraîner", ic: 'M6 9v6M18 9v6M3 11v2M21 11v2M6 12h12' },
  { k: 'courses',  label: 'Courses',    ic: 'M3 4h2l2.4 11.2a2 2 0 002 1.6h7.7a2 2 0 002-1.6L21 8H6M9 21a1 1 0 100-2 1 1 0 000 2zM18 21a1 1 0 100-2 1 1 0 000 2z' },
  { k: 'stats',    label: 'Stats',      ic: 'M5 20V10M12 20V4M19 20v-7' },
  { k: 'premium',  label: 'Premium',    ic: 'M12 3l2.6 5.6 6.1.8-4.5 4.2 1.2 6.1L12 16.8 6.6 19.7l1.2-6.1L3.3 9.4l6.1-.8z' },
];

export function BottomNav() {
  return (
    <nav class="nav-bas">
      {ONGLETS.map(o => (
        <button
          key={o.k}
          class={ongletActif.value === o.k ? 'actif' : ''}
          onClick={() => { ongletActif.value = o.k; window.scrollTo(0, 0); }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d={o.ic} />
          </svg>
          <span>{o.label}</span>
        </button>
      ))}
    </nav>
  );
}
