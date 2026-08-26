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
import { programmeActif } from '../store/programme.js';
import { t } from '../i18n/index.js';
import '../legacy/programmes.scoped.css';

// La barre orange du v1 (maison + Premium) a ete RETIREE le 26/08.
// Raci : « elle revient trop souvent et elle fait partie de la V1 ».
// Elle faisait un second en-tete au-dessus de celui de l'app, et son
// bouton maison sortait de la navigation par onglets. Ses deux
// destinations existent ailleurs : la fleche retour de chaque ecran,
// et l'onglet BelFit+ de la barre du bas. Rien n'est compense ici.

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
      <div class="top">
        <button class="back-btn" onClick={() => setEcran('progs')} aria-label="Retour">←</button>
        <h1>{prog ? prog.name : 'Séances'}</h1>
      </div>
      {prog && <p class="intro-txt">{prog.duree} · niveau {prog.niveau}. Choisis une séance pour voir les exercices.</p>}
      {/* Adopter le programme : c'est l'entree de la planification,
          qui n'existait pas. Sans elle, adopterProgramme() n'etait
          appelable que par le code et aucun programme ne pouvait
          devenir actif depuis l'interface. */}
      {prog && (
        <button class="prog-adopter" onClick={() => allerVers('planifier', { prog: prog.id })}>
          {programmeActif.value && programmeActif.value.id === prog.id
            ? t('pl_modifier_jours')
            : t('pl_adopter')}
        </button>
      )}

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
