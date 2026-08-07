import { useState } from 'preact/hooks';
import { createPortal } from 'preact/compat';
import { MUSCLES, EXERCISES, FILTERS, NIVEAUX, IMG_BASE,
         NIVEAUX_PRATIQUE, PROTOCOLES } from '../data/exercices.js';
import { signal } from '@preact/signals';

// Niveau de pratique : un seul choix pour toute la seance. Retenu
// d'une seance a l'autre — il ne change pas d'un jour a l'autre.
export const niveauPratique = signal(
  (() => { try { return localStorage.getItem('belfit_niveau') || 'intermediaire'; } catch (e) { return 'intermediaire'; } })()
);
function choisirNiveau(k) {
  niveauPratique.value = k;
  try { localStorage.setItem('belfit_niveau', k); } catch (e) {}
}


import { retourEntrainer } from './Entrainer.jsx';
import '../legacy/selection-exercices.scoped.css';
// selectionExos vit dans MaSeance.jsx : en etat local ici, la
// selection disparaissait a chaque aller-retour vers la seance
// (bug V1/V2 confirme par Raci le 7/08).
import { seanceRefs, selectionExos } from './MaSeance.jsx';
import { allerVers } from './Entrainer.jsx';
import { ongletActif } from './BottomNav.jsx';

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
  // Vue locale du signal module (initialise les Sets au besoin).
  const selection = selectionExos.value;
  MUSCLES.forEach(m => { if (!selection[m.key]) selection[m.key] = new Set(); });

  const [recherche, setRecherche] = useState('');
  // Fiche d'exercice : index dans le groupe courant, ou null.
  // Toucher la vignette OUVRE la fiche au lieu d'ajouter — voir le
  // commentaire sur .ex-photo plus bas.
  const [fiche, setFiche] = useState(null);

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
    const prev = selectionExos.value;
    const copie = { ...prev, [mKey]: new Set(prev[mKey]) };
    if (copie[mKey].has(i)) copie[mKey].delete(i);
    else copie[mKey].add(i);
    selectionExos.value = copie;
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

      {/* Le niveau pilote le volume de TOUS les exercices : il se
          choisit une fois ici, pas exercice par exercice. */}
      <div class="niv-rangee" role="group" aria-label="Niveau de pratique">
        {NIVEAUX_PRATIQUE.map(n => (
          <button key={n.key}
            class={'niv-tab' + (niveauPratique.value === n.key ? ' active' : '')}
            onClick={() => choisirNiveau(n.key)}>{n.label}</button>
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
              {/* La vignette ouvre la FICHE, elle n'ajoute pas. Voir
                  l'exercice avant de le choisir est la premiere
                  chose qu'on veut faire ; il fallait auparavant
                  l'ajouter a sa seance pour decouvrir a quoi il
                  ressemblait, donc s'engager avant de savoir. */}
              <div class="ex-photo" style={bg} role="button" tabIndex={0}
                aria-label={'Voir ' + ex.nom}
                onClick={() => setFiche(i)} />
              <div class="ex-info" onClick={() => setFiche(i)}>
                <div class="ex-name">{ex.nom}</div>
                <div class="ex-equip">{equipLabel(ex.mat)}</div>
                <div class="ex-sets">Convient à tous les niveaux</div>
              </div>
              <button class="ex-add" onClick={() => basculer(i)} aria-label="Ajouter">{sel ? '✓' : '+'}</button>
            </div>
          );
        })}
      </div>

      <FicheExercice
        ex={fiche != null ? (EXERCISES[mKey] || [])[fiche] : null}
        choisi={fiche != null && selection[mKey].has(fiche)}
        basculer={() => { if (fiche != null) basculer(fiche); }}
        fermer={() => setFiche(null)} />

      {createPortal(
        <div class={'session-bar pg-selection-portail' + (nbSelectionnes === 0 || ongletActif.value !== 'entrainer' ? ' hidden' : '')}
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
        </div>,
        document.body
      )}
    </div>
  );
}


// ============================================================
// FICHE D'EXERCICE
// Photo en grand, identite, et l'ajout depuis ici : on decide en
// voyant le mouvement, pas en lisant son nom. La base fournit deux
// vues par exercice (depart et fin) — les montrer toutes les deux
// dit le mouvement, la que la vignette seule ne montre qu'une pose.
// ============================================================
function FicheExercice({ ex, choisi, basculer, fermer }) {
  if (!ex) return null;
  const vues = ex.imgId ? [0, 1] : [];
  return createPortal(
    <div class="exo-fiche" onClick={(e) => { if (e.target === e.currentTarget) fermer(); }}>
      <div class="exo-fiche-carte">
        <button class="exo-fiche-fermer" onClick={fermer} aria-label="Fermer">×</button>

        <div class="exo-fiche-vues">
          {vues.map(n => (
            <div key={n} class="exo-fiche-vue"
              style={{ backgroundImage: `url('${IMG_BASE}${ex.imgId}/${n}.jpg')` }} />
          ))}
        </div>

        <h2>{ex.nom}</h2>
        <div class="exo-fiche-meta">
          <span>{equipLabel(ex.mat)}</span>
        </div>

        {/* Le niveau se choisit aussi ici, devant l'exercice. Meme
            reglage global que la rangee du haut : un seul niveau pour
            la seance, modifiable d'ou l'on veut. Aucun choix n'est
            obligatoire — l'ajout marche dans tous les cas. */}
        <div class="exo-fiche-niveaux" role="group" aria-label="Niveau de pratique">
          {NIVEAUX_PRATIQUE.map(n => (
            <button key={n.key}
              class={'niv-tab' + (niveauPratique.value === n.key ? ' active' : '')}
              onClick={() => choisirNiveau(n.key)}>{n.label}</button>
          ))}
        </div>

        {/* Le detail serie par serie du niveau choisi. En Libre, pas
            de schema : la personne compose ses series elle-meme. */}
        {PROTOCOLES[niveauPratique.value] ? (
          <ol class="exo-series">
            {PROTOCOLES[niveauPratique.value].series.map((se, k) => (
              <li key={k} class={se.degressive ? 'degressive' : ''}>
                <b>{se.pct != null ? se.pct + ' %' : se.reps + ' reps'}</b>
                {se.note && <span>{se.note}</span>}
              </li>
            ))}
          </ol>
        ) : (
          <p class="exo-series-libre">Compose tes séries comme tu veux : ajoute, enlève, choisis tes charges.</p>
        )}

        <button class={'exo-fiche-ajout' + (choisi ? ' retire' : '')}
          onClick={() => { basculer(); fermer(); }}>
          {choisi ? 'Retirer de ma séance' : 'Ajouter à ma séance'}
        </button>
      </div>
    </div>,
    document.body
  );
}
