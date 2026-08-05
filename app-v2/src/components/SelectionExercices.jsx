import { useState } from 'preact/hooks';
import { MUSCLES, EXERCISES, FILTERS, NIVEAUX, IMG_BASE } from '../data/exercices.js';
import { retourEntrainer } from './Entrainer.jsx';
import '../legacy/selection-exercices.scoped.css';
import { seanceRefs } from './MaSeance.jsx';
import { allerVers } from './Entrainer.jsx';

// ==========================================================
// ECRAN "Choisir mes exercices" — transpose a l'identique du v1
// (ma-seance.html, ecran 1). Meme markup, meme CSS ; l'etat
// (muscle courant, filtre, selection) passe en hooks Preact.
// ==========================================================

const EQUIP = {
  barre: 'Barre', halteres: 'Haltères', machine: 'Machine / poulie',
  poulie: 'Poulie', rien: 'Poids du corps', traction: 'Poids du corps',
  kettlebell: 'Kettlebell', elastique: 'Élastique',
};
const equipLabel = (mat) => EQUIP[mat] || (mat ? mat[0].toUpperCase() + mat.slice(1) : '—');

export function SelectionExercices() {
  const [muscle, setMuscle] = useState(0);          // index dans MUSCLES
  const [filtre, setFiltre] = useState('tout');     // key dans FILTERS
  // Selection : { muscleKey: Set(index) }
  const [selection, setSelection] = useState(() => {
    const o = {};
    MUSCLES.forEach(m => { o[m.key] = new Set(); });
    return o;
  });

  const [recherche, setRecherche] = useState('');

  const mKey = MUSCLES[muscle].key;
  const f = FILTERS.find(x => x.key === filtre);
  const exoVisible = (ex) => !f.mats || f.mats.includes(ex.mat);

  // Recherche par MOTS, insensible aux accents, a la casse et a
  // l'ordre : « couche incline » trouve « Developpe Couche Incline
  // (Haltere) », « poulie triceps » trouve « Extension Triceps
  // (Poulie) ». Meme principe que la recherche d'aliments.
  const normaliser = (x) => x.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ');
  const mots = normaliser(recherche).split(/\s+/).filter(Boolean);
  const correspond = (ex) => {
    if (!mots.length) return true;
    const cible = normaliser(ex.nom);
    return mots.every(m => cible.includes(m));
  };

  const liste = (EXERCISES[mKey] || [])
    .map((ex, i) => ({ ex, i }))
    .filter(o => exoVisible(o.ex) && correspond(o.ex));

  // Une recherche porte sur TOUT le catalogue, pas sur le seul muscle
  // affiche : chercher « squat » depuis l'onglet Pecs ne doit pas
  // renvoyer une liste vide. On indique alors ou se trouvent les
  // resultats plutot que de laisser l'ecran muet.
  const ailleurs = mots.length && !liste.length
    ? MUSCLES.filter(m => m.key !== mKey)
        .map(m => ({ m, n: (EXERCISES[m.key] || []).filter(correspond).length }))
        .filter(o => o.n > 0)
    : [];

  const nbSelectionnes = Object.values(selection).reduce((n, s) => n + s.size, 0);

  const basculer = (i) => {
    setSelection(prev => {
      const copie = { ...prev, [mKey]: new Set(prev[mKey]) };
      if (copie[mKey].has(i)) copie[mKey].delete(i);
      else copie[mKey].add(i);
      return copie;
    });
  };

  const stars = (lvl) => {
    lvl = lvl || 2;
    return (
      <div class="ex-stars">
        {[1, 2, 3].map(k => <span key={k} class={k <= lvl ? 'on' : ''}>★</span>)}
        <em>{NIVEAUX[lvl]}</em>
      </div>
    );
  };

  return (
    <div class="pg-selection">
      <div class="top">
        <button class="back-btn" onClick={retourEntrainer} aria-label="Retour">←</button>
        <h1>Choisir mes exercices</h1>
      </div>

      <div class="muscle-tabs">
        {MUSCLES.map((m, i) => (
          <button key={m.key} class={'muscle-tab' + (i === muscle ? ' active' : '')}
            onClick={() => setMuscle(i)}>{m.label}</button>
        ))}
      </div>

      <div class="filter-tabs">
        {FILTERS.map(ft => (
          <button key={ft.key} class={'filter-tab' + (ft.key === filtre ? ' active' : '')}
            onClick={() => setFiltre(ft.key)}>{ft.label}</button>
        ))}
      </div>

      <div class="ex-recherche">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.6-3.6" />
        </svg>
        <input type="search" value={recherche} placeholder="Chercher un exercice"
          onInput={(e) => setRecherche(e.currentTarget.value)} />
        {recherche && (
          <button class="ex-recherche-vider" onClick={() => setRecherche('')}
            aria-label="Effacer">×</button>
        )}
      </div>

      <p class="section-hint">
        {mots.length
          ? `${liste.length} exercice${liste.length > 1 ? 's' : ''} trouvé${liste.length > 1 ? 's' : ''}`
          : "Touche un exercice pour l'ajouter."}
      </p>

      <div class="ex-list">
        {liste.length === 0 ? (
          <div style="text-align:center;color:#6b7280;font-size:14px;padding:34px 20px;line-height:1.5">
            <span style="display:block;font-size:44px;margin-bottom:10px">💪</span>
            {mots.length ? 'Aucun exercice ne correspond.' : 'Aucun exercice pour ce matériel.'}
            {ailleurs.length > 0 && (
              <div class="ex-ailleurs">
                {ailleurs.map(o => (
                  <button key={o.m.key} onClick={() => setMuscle(MUSCLES.indexOf(o.m))}>
                    {o.m.label} ({o.n})
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : liste.map(({ ex, i }) => {
          const sel = selection[mKey].has(i);
          const bg = ex.imgId ? { backgroundImage: `url('${IMG_BASE}${ex.imgId}/0.jpg')` } : {};
          const sets = (ex.meta || '').replace(/\s*×\s*/g, ' • ');
          return (
            <div class={'ex-item' + (sel ? ' selected' : '')} key={mKey + '-' + i}>
              <div class="ex-photo" style={bg} />
              <div class="ex-info">
                <div class="ex-name">{ex.nom}</div>
                <div class="ex-equip">{equipLabel(ex.mat)}</div>
                {stars(ex.lvl)}
                <div class="ex-sets">{sets}</div>
              </div>
              <button class="ex-add" onClick={() => basculer(i)} aria-label="Ajouter">{sel ? '✓' : '+'}</button>
            </div>
          );
        })}
      </div>

      <div class={'session-bar' + (nbSelectionnes === 0 ? ' hidden' : '')}
        onClick={() => {
          // Ordre v1 : muscle par muscle, index croissant.
          const refs = [];
          MUSCLES.forEach(m => {
            [...(selection[m.key] || [])].sort((a, b) => a - b)
              .forEach(i => refs.push({ mKey: m.key, i }));
          });
          if (!refs.length) return;
          seanceRefs.value = refs;
          allerVers('maseance');
        }}>
        <span class="count">{nbSelectionnes} exercices sélectionnés</span>
        <span class="go">Ma séance →</span>
      </div>
    </div>
  );
}
