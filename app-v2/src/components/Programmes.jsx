import { useState } from 'preact/hooks';
import { signal, effect } from '@preact/signals';
import { PROGRAMMES, CATEGORIES } from '../data/programmes.js';
import { utilisateur } from '../services/firebase.js';
import { chargerDonnees, sauvegarder } from '../services/sync.js';

// Programme actif de l'utilisateur (sync cloud comme le reste)
export const programmeActif = signal(null);
let uidP = null, pretP = false;

effect(() => {
  const u = utilisateur.value;
  if (!u) { uidP = null; pretP = false; return; }
  if (u.uid === uidP) return;
  uidP = u.uid; pretP = false;
  chargerDonnees(u.uid).then(d => {
    if (uidP !== u.uid) return;
    programmeActif.value = (d && d.programmeActif) || null;
    pretP = true;
  });
});

effect(() => {
  const p = programmeActif.value;
  const u = utilisateur.value;
  if (!u || !pretP) return;
  sauvegarder(u.uid, { programmeActif: p });
});

export function Programmes() {
  const [cat, setCat] = useState(CATEGORIES[0].k);
  const [ouvert, setOuvert] = useState(null);
  const actif = programmeActif.value;

  return (
    <div class="carte">
      <h3 style={{ margin: '0 0 12px', fontSize: '19px', fontWeight: 800 }}>Programmes</h3>

      <div class="prog-onglets">
        {CATEGORIES.map(c => (
          <button key={c.k} class={cat === c.k ? 'actif' : ''} onClick={() => setCat(c.k)}>{c.label}</button>
        ))}
      </div>

      {(PROGRAMMES[cat] || []).map(p => {
        const estActif = actif === p.id;
        const deplie = ouvert === p.id;
        return (
          <div class={`prog-carte ${estActif ? 'choisi' : ''}`} key={p.id}>
            <div class="prog-tete" onClick={() => setOuvert(deplie ? null : p.id)}>
              <div class="prog-info">
                {p.tag && <span class="prog-tag">{p.tag}</span>}
                <div class="prog-nom">{p.name}</div>
                <div class="prog-meta">{p.badge} · {p.duree} · {p.niveau}</div>
              </div>
              <span class={`prog-chev ${deplie ? 'ouv' : ''}`}>▼</span>
            </div>

            {deplie && (
              <div class="prog-detail">
                <p class="prog-desc">{p.desc}</p>
                {p.seances.map((s, i) => (
                  <div class="prog-seance" key={i}>
                    <div class="prog-seance-t">{s.titre}</div>
                    <div class="prog-seance-s">{s.sub}</div>
                  </div>
                ))}
                <button
                  class={estActif ? 'prog-btn actif' : 'prog-btn'}
                  onClick={() => { programmeActif.value = estActif ? null : p.id; }}
                >{estActif ? '✓ Programme suivi' : 'Choisir ce programme'}</button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
