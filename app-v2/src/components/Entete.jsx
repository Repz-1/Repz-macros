import { signal } from '@preact/signals';

// Etat du volet profil, partage entre l'en-tete de chaque onglet.
export const voletProfil = signal(false);
export const ouvrirProfil = () => { voletProfil.value = !voletProfil.value; };

// En-tete commun : logo BELFIT a gauche, profil + reglages a droite.
// Transpose fidelement du v1 (.app-header dans entrainements.html).
export function Entete() {
  return (
    <header class="j-entete">
      <img class="j-logo" src="../belfit-logo-header.png" alt="BELFIT" />
      <div class="j-entete-actions">
        <button class="j-btn-icone" onClick={ouvrirProfil} aria-label="Profil">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.6" /><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" /></svg>
        </button>
        <a class="j-btn-icone" href="../parametres.html" aria-label="Réglages">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2" /><path d="M19.4 15a1.7 1.7 0 00.34 1.87l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.7 1.7 0 00-1.87-.34 1.7 1.7 0 00-1.03 1.56V21a2 2 0 11-4 0v-.09a1.7 1.7 0 00-1.11-1.56 1.7 1.7 0 00-1.87.34l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.7 1.7 0 00.34-1.87 1.7 1.7 0 00-1.56-1.03H3a2 2 0 110-4h.09a1.7 1.7 0 001.56-1.11 1.7 1.7 0 00-.34-1.87l-.06-.06a2 2 0 112.83-2.83l.06.06a1.7 1.7 0 001.87.34h.01A1.7 1.7 0 0010 4.09V4a2 2 0 114 0v.09a1.7 1.7 0 001.03 1.56h.01a1.7 1.7 0 001.87-.34l.06-.06a2 2 0 112.83 2.83l-.06.06a1.7 1.7 0 00-.34 1.87v.01a1.7 1.7 0 001.56 1.03H21a2 2 0 110 4h-.09a1.7 1.7 0 00-1.51 1.02z" /></svg>
        </a>
      </div>
    </header>
  );
}
