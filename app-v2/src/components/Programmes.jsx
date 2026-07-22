import { useState } from 'preact/hooks';
import { PROGRAMMES, CATEGORIES } from '../data/programmes.js';
import { vueEntrainer } from './Entrainer.jsx';

/** Categorie a laquelle appartient un programme (pour l'ouverture directe). */
function categorieDuProgramme(id) {
  for (const k of Object.keys(PROGRAMMES)) {
    if ((PROGRAMMES[k] || []).some(p => p.id === id)) return k;
  }
  return null;
}
import { retourEntrainer, allerVers } from './Entrainer.jsx';
import { ongletActif } from './BottomNav.jsx';
import '../legacy/programmes.scoped.css';

// Barre du haut orange (maison -> accueil entrainement, Premium -> onglet Premium),
// transposee du v1 (topbar-app de programmes.html).
function TopBar() {
  return (
    <div class="topbar-app">
      <button class="topbar-home" onClick={retourEntrainer} aria-label="Accueil">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5L12 3l9 7.5" /><path d="M5 9.5V20a1 1 0 001 1h3v-6h6v6h3a1 1 0 001-1V9.5" /></svg>
      </button>
      <button class="premium-pill" onClick={() => { ongletActif.value = 'premium'; }}>✨ Premium</button>
    </div>
  );
}

// ==========================================================
// PAGE "Tous les programmes" — transposee du v1 (programmes.html).
// 3 ecrans : Categories -> Programmes -> Seances.
// Meme markup, meme CSS ; navigation en hooks.
// ==========================================================

const ORDRE_NIVEAUX = ['Débutant', 'Intermédiaire', 'Confirmé', 'Avancé'];

export function Programmes() {
  // Programme cible (arrive du questionnaire) : on ouvre directement
  // sa fiche, comme le lien programmes.html?cat=..&prog=.. de la v1.
  const vise = (vueEntrainer.value.params || {}).prog || null;
  const catVisee = vise ? categorieDuProgramme(vise) : null;

  // ecran : 'cats' | 'progs' | 'seances'
  const [ecran, setEcran] = useState(vise && catVisee ? 'seances' : 'cats');
  const [catKey, setCatKey] = useState(catVisee);
  const [progId, setProgId] = useState(vise);
  const [niveau, setNiveau] = useState('Tous');

  const cat = CATEGORIES.find(c => c.k === catKey);
  const progsCat = catKey ? (PROGRAMMES[catKey] || []) : [];
  const prog = progId ? progsCat.find(p => p.id === progId) : null;

  // Niveaux presents dans la categorie (pour les filtres)
  const niveauxPresents = ORDRE_NIVEAUX.filter(n => progsCat.some(p => p.niveau === n));

  const ouvrirCat = (k) => {
    setCatKey(k);
    const progs = PROGRAMMES[k] || [];
    const nivs = ORDRE_NIVEAUX.filter(n => progs.some(p => p.niveau === n));
    setNiveau(nivs[0] || 'Tous');   // premier niveau present, comme en v1
    setEcran('progs');
  };
  const ouvrirProg = (id) => { setProgId(id); setEcran('seances'); };

  const stat = (icone, valeur) => (
    <span>{icone}<b>{valeur}</b></span>
  );

  const carteProg = (p) => {
    const showNiv = niveauxPresents.length === 1;
    return (
      <div class="prog-card" key={p.id} onClick={() => ouvrirProg(p.id)}>
        {p.tag && <span class="prog-badge reco">⭐ {p.tag}</span>}
        <span class="prog-badge">{p.badge}</span>
        {p.lieu && <span class="prog-badge lieu">🏋️ {p.lieu}</span>}
        <div class="prog-name">{p.name}</div>
        <div class="prog-desc">{p.desc}</div>
        <div class="prog-stats">
          {stat(<svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="16" rx="2" /><path d="M4 9h16M8 3v4M16 3v4" /></svg>, p.duree)}
          {showNiv && stat(<svg viewBox="0 0 24 24"><path d="M5 20v-6M12 20V8M19 20V4" /></svg>, p.niveau)}
          {stat(<svg viewBox="0 0 24 24"><path d="M6.5 6.5v11M17.5 6.5v11M3 9.5v5M21 9.5v5M6.5 12h11" /></svg>, `${p.seances.length} séances`)}
        </div>
      </div>
    );
  };

  // ---- Ecran 1 : Categories ----
  if (ecran === 'cats') {
    return (
      <div class="pg-programmes">
        <TopBar />
        <div class="top">
          <button class="back-btn" onClick={retourEntrainer} aria-label="Retour">←</button>
          <h1>Tous les programmes</h1>
        </div>
        <p class="intro-txt">Parcours la bibliothèque complète par objectif.</p>
        <div class="cat-list">
          {CATEGORIES.map(c => (
            <div class="cat-card" key={c.k} onClick={() => ouvrirCat(c.k)}>
              <div class="cat-emoji">{c.emoji}</div>
              <div class="cat-info">
                <div class="cat-name">{c.name}</div>
                <div class="cat-sub">{c.sub}</div>
              </div>
              <div class="cat-arrow">→</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ---- Ecran 2 : Programmes de la categorie ----
  if (ecran === 'progs') {
    return (
      <div class="pg-programmes">
        <TopBar />
        <div class="top">
          <button class="back-btn" onClick={() => setEcran('cats')} aria-label="Retour">←</button>
          <h1>{cat ? cat.name : 'Programmes'}</h1>
        </div>
        {niveauxPresents.length > 1 && (
          <div class="niv-filter">
            {niveauxPresents.map(n => (
              <button key={n} class={'niv-pill' + (n === niveau ? ' active' : '')} onClick={() => setNiveau(n)}>{n}</button>
            ))}
          </div>
        )}
        <div class="prog-list">
          {progsCat.filter(p => p.niveau === niveau).map(carteProg)}
        </div>
      </div>
    );
  }

  // ---- Ecran 3 : Seances du programme ----
  return (
    <div class="pg-programmes">
      <TopBar />
      <div class="top">
        <button class="back-btn" onClick={() => setEcran('progs')} aria-label="Retour">←</button>
        <h1>{prog ? prog.name : 'Séances'}</h1>
      </div>
      {prog && <p class="intro-txt">{prog.duree} · niveau {prog.niveau}. Choisis une séance pour voir les exercices.</p>}
      <div class="seance-list">
        {prog && prog.seances.map((s, i) => (
          <div class="seance-card" key={i} onClick={() => allerVers('seanceDetail', { seanceId: prog.id + '-' + i, titre: s.titre })}>
            <div class="seance-num">J{i + 1}</div>
            <div class="seance-info">
              <div class="seance-title">{s.titre}</div>
              <div class="seance-sub">{s.sub}</div>
            </div>
            <div class="seance-arrow">→</div>
          </div>
        ))}
      </div>
    </div>
  );
}
