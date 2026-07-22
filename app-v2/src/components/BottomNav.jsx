import { signal } from '@preact/signals';
import { t } from '../i18n/index.js';

// Onglet actif de l'app. Signal global : n'importe quel composant
// peut naviguer (ex : le bouton « Premium » d'une modale).
export const ongletActif = signal('journal');

// Hauteur de defilement de la page que l'on quitte. Le deck de
// transition est en position fixe : sans cette valeur, la page
// sortante repartirait de son sommet et sauterait verticalement.
export const scrollSortant = signal(0);

// L'app defile dans son propre conteneur (comme les iframes de la v1) :
// le document ne bouge jamais, la barre du navigateur reste stable.
export const defileur = { el: null };
const lireScroll = () => (defileur.el ? defileur.el.scrollTop : (window.scrollY || 0));

/** Changement d'onglet : memorise le defilement avant de basculer. */
export function allerOnglet(cle) {
  if (cle === ongletActif.value) return;
  scrollSortant.value = lireScroll();
  ongletActif.value = cle;
}

// ============================================================
// BARRE DE NAVIGATION
// Quatre onglets de largeur egale. L'etat actif se marque
// uniquement par un assombrissement : ni pastille, ni fond,
// ni soulignement. Trace des icones repris a l'identique.
// ============================================================
const ONGLETS = [
  {
    k: 'journal', label: 'nav_journal',
    trace: ['M7 3v7a2 2 0 002 2v9', 'M5 3v4', 'M9 3v4', 'M17 3c-1.5 0-3 2-3 5v4h3v9'],
  },
  {
    k: 'entrainer', label: 'nav_train',
    trace: ['M6.5 6.5v11', 'M17.5 6.5v11', 'M3 9v6', 'M21 9v6', 'M6.5 12h11'],
  },
  {
    k: 'stats', label: 'nav_stats',
    trace: ['M4 20V10', 'M10 20V4', 'M16 20v-8', 'M22 20H2'],
  },
  {
    k: 'premium', label: 'nav_premium',
    trace: ['M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19.6l1-5.8L3.5 9.7l5.9-.9z'],
  },
];

export function BottomNav() {
  return (
    <nav class="bn">
      {ONGLETS.map(o => {
        const actif = ongletActif.value === o.k;
        return (
          <button
            key={o.k}
            class={'bn-item' + (actif ? ' bn-item--actif' : '') + (o.k === 'premium' ? ' bn-item--premium' : '')}
            onClick={() => allerOnglet(o.k)}
            aria-current={actif ? 'page' : undefined}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              {o.trace.map((d, i) => <path key={i} d={d} />)}
            </svg>
            <span>{t(o.label)}</span>
          </button>
        );
      })}
    </nav>
  );
}
