import { useState } from 'preact/hooks';
import { MUSCLES, EXERCISES, FILTERS, NIVEAUX, IMG_BASE } from '../data/exercices.js';
import { retourEntrainer } from './Entrainer.jsx';
import '../legacy/selection-exercices.scoped.css';

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

  const mKey = MUSCLES[muscle].key;
  const f = FILTERS.find(x => x.key === filtre);
  const exoVisible = (ex) => !f.mats || f.mats.includes(ex.mat);

  const liste = (EXERCISES[mKey] || [])
    .map((ex, i) => ({ ex, i }))
    .filter(o => exoVisible(o.ex));

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

      <p class="section-hint">Touche un exercice pour l'ajouter.</p>

      <div class="ex-list">
        {liste.length === 0 ? (
          <div style="text-align:center;color:#6b7280;font-size:14px;padding:34px 20px;line-height:1.5">
            <span style="display:block;font-size:44px;margin-bottom:10px">💪</span>
            Aucun exercice pour ce matériel.
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

      <div class={'session-bar' + (nbSelectionnes === 0 ? ' hidden' : '')}>
        <span class="count">{nbSelectionnes} exercices sélectionnés</span>
        <span class="go">Ma séance →</span>
      </div>
    </div>
  );
}
