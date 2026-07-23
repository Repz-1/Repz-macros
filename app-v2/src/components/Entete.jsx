import { signal } from '@preact/signals';
import { utilisateur } from '../services/firebase.js';

// Etat du volet profil, partage entre l'en-tete de chaque onglet.
export const voletProfil = signal(false);
export const ouvrirProfil = () => { voletProfil.value = !voletProfil.value; };

/** Prenom de la personne connectee, sinon rien. */
function prenom() {
  const u = utilisateur.value;
  const nom = (u && u.displayName) || '';
  if (nom) return nom.split(' ')[0];
  try { return localStorage.getItem('repz_firstName') || ''; } catch (e) { return ''; }
}

// En-tete commun : marque a gauche, prenom au centre, profil + reglages
// a droite. Le prenom au centre donne le sentiment d'une application qui
// appartient a la personne, plutot que d'un service qui l'accueille.
// Trois colonnes (1fr / auto / 1fr) : le centre reste centre quelle que
// soit la largeur des deux bords.
export function Entete() {
  const p = prenom();
  return (
    <header class={'j-entete' + (p ? ' j-entete--perso' : '')}>
      <img
        class={p ? 'j-symbole' : 'j-logo'}
        src={p ? '../logo-symbol.png' : '../belfit-logo-header.png'}
        alt="BELFIT"
      />

      {p && <div class="j-prenom">{p}</div>}

      <div class="j-entete-actions">
        <button class="j-btn-icone" onClick={ouvrirProfil} aria-label="Profil">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.6" /><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" /></svg>
        </button>
        <a class="j-btn-icone" href="../parametres.html?de=v2" aria-label="Réglages">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2" /><path d="M19.4 15a1.7 1.7 0 00.34 1.87l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.7 1.7 0 00-1.87-.34 1.7 1.7 0 00-1.03 1.56V21a2 2 0 11-4 0v-.09a1.7 1.7 0 00-1.11-1.56 1.7 1.7 0 00-1.87.34l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.7 1.7 0 00.34-1.87 1.7 1.7 0 00-1.56-1.03H3a2 2 0 110-4h.09a1.7 1.7 0 001.56-1.11 1.7 1.7 0 00-.34-1.87l-.06-.06a2 2 0 112.83-2.83l.06.06a1.7 1.7 0 001.87.34h.01A1.7 1.7 0 0010 4.09V4a2 2 0 114 0v.09a1.7 1.7 0 001.03 1.56h.01a1.7 1.7 0 001.87-.34l.06-.06a2 2 0 112.83 2.83l-.06.06a1.7 1.7 0 00-.34 1.87v.01a1.7 1.7 0 001.56 1.03H21a2 2 0 110 4h-.09a1.7 1.7 0 00-1.51 1.02z" /></svg>
        </a>
      </div>
    </header>
  );
}
