import { signal } from '@preact/signals';
import { t } from '../i18n/index.js';
import { repasOuvertId } from './MealCard.jsx';
import { estPremium } from './PremiumPage.jsx';
import { useState, useEffect } from 'preact/hooks';

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
  // La page repas (plein ecran) recouvre le rail : sans cette
  // fermeture, taper un autre onglet changeait bien l'onglet actif
  // mais l'ecran restait bloque sur l'encodage du repas.
  if (repasOuvertId.value !== null) repasOuvertId.value = null;
  if (cle === ongletActif.value) return;
  scrollSortant.value = lireScroll();
  ongletActif.value = cle;
}

// ============================================================
// BARRE DE NAVIGATION
// Quatre onglets de largeur egale. L'etat actif se marque par un
// blanc plein et un point jaune BelFit de 4 px sous le libelle :
// l'accent designe, il ne colore pas. Trace des icones inchange.
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
    // Une fois l'abonnement actif, l'onglet cesse d'etre une offre
    // pour devenir un espace : « Premium » -> « BelFit+ ». L'ETOILE
    // NE CHANGE PAS — la barre garde son rythme, et l'utilisateur
    // retrouve son onglet a la meme place, sous un autre nom.
    // Le libelle est resolu au rendu, pas ici : ONGLETS est une
    // constante de module, elle serait figee au chargement.
    k: 'premium', label: 'nav_premium',
    trace: ['M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19.6l1-5.8L3.5 9.7l5.9-.9z'],
  },
];

export function BottomNav() {
  // La barre s'efface quand on descend et revient des qu'on remonte ou
  // qu'on s'arrete (Raci, 9/08 : « la barre en bas gene un peu »). Elle
  // revient toujours de son propre chef : on ne peut jamais se retrouver
  // sans navigation. Seuil de 8px pour ne pas clignoter au moindre
  // tremblement du doigt, et retour automatique apres 900ms d'arret.
  const [cachee, setCachee] = useState(false);
  useEffect(() => {
    let dernier = 0, minuteur = null, cible = null;
    const suivre = () => {
      const y = cible ? cible.scrollTop : 0;
      const ecart = y - dernier;
      if (Math.abs(ecart) > 8) {
        setCachee(ecart > 0 && y > 60);
        dernier = y;
      }
      clearTimeout(minuteur);
      minuteur = setTimeout(() => setCachee(false), 900);
    };
    // Le panneau visible change d'un onglet a l'autre : on ecoute au
    // niveau du document, en phase de capture, plutot que de s'accrocher
    // a un element qui sera remplace.
    const surDefilement = (e) => {
      if (e.target && e.target.classList && e.target.classList.contains('pan-scroll')) {
        cible = e.target; suivre();
      }
    };
    document.addEventListener('scroll', surDefilement, true);
    return () => { document.removeEventListener('scroll', surDefilement, true); clearTimeout(minuteur); };
  }, []);

  return (
    <nav class={'bn' + (cachee ? ' bn--escamotee' : '')}>
      {ONGLETS.map(o => {
        const actif = ongletActif.value === o.k;
        return (
          <button
            key={o.k}
            class={'bn-item bn-item--' + o.k + (actif ? ' bn-item--actif' : '')}
            onClick={() => allerOnglet(o.k)}
            aria-current={actif ? 'page' : undefined}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              {o.trace.map((d, i) => <path key={i} d={d} />)}
            </svg>
            <span>{o.k === 'premium' && estPremium.value ? t('nav_belfitplus') : t(o.label)}</span>
            <i class="bn-point" aria-hidden="true" />
          </button>
        );
      })}
    </nav>
  );
}
