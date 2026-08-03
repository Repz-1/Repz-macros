import { signal, effect } from '@preact/signals';
import { identite } from '../services/firebase.js';
import { chargerDonnees, sauvegarder } from '../services/sync.js';
import { recupererMuscleLogV1 } from '../services/migration.js';

// ============================================================
// STORE ENTRAINEMENT v2 — calendrier des muscles travailles.
// muscleLog : { '2026-07-17': ['pecs','triceps'], ... }
// Persiste dans users/{uid}.v2Data.muscleLog (meme mecanique
// local-first que le journal).
// ============================================================

export const GROUPES = [
  { k: 'pecs',    label: 'Pecs',    c: '#EF4444' },
  { k: 'dos',     label: 'Dos',     c: '#F97316' },
  { k: 'epaules', label: 'Épaules', c: '#F7B500' },
  { k: 'biceps',  label: 'Biceps',  c: '#10B981' },
  { k: 'triceps', label: 'Triceps', c: '#06B6D4' },
  { k: 'jambes',  label: 'Jambes',  c: '#3B82F6' },
  { k: 'abdos',   label: 'Abdos',   c: '#8B5CF6' },
  { k: 'cardio',  label: 'Cardio',  c: '#EC4899' },
  { k: 'repos',   label: 'Repos',   c: '#D6D3CB' },
];

export const muscleLog = signal({});
let uidM = null, pretM = false;

effect(() => {
  const u = identite.value;
  if (!u) { uidM = null; pretM = false; return; }
  if (u === uidM) return;
  uidM = u; pretM = false;
  chargerDonnees(u).then(async d => {
    if (uidM !== u) return;
    const charge = (d && d.muscleLog) ? d.muscleLog : {};
    // Rattrapage v1 : le calendrier vivait a la racine du document et
    // n'a jamais ete importe par la migration, qui ne part que sur un
    // compte totalement vierge de donnees v2. On ne remonte que les
    // jours absents — un jour deja note en v2 fait foi.
    const fusion = await recupererMuscleLogV1(u, charge);
    if (uidM !== u) return;
    muscleLog.value = fusion || charge;
    pretM = true;
    // Fusion effective : on la persiste tout de suite, sinon elle
    // serait refaite a chaque demarrage.
    if (fusion) sauvegarder(u, { muscleLog: fusion });
  });
});

effect(() => {
  const log = muscleLog.value;
  const u = identite.value;
  if (!u || !pretM) return;
  sauvegarder(u, { muscleLog: log });
});

export function basculerMuscle(iso, k) {
  const log = { ...muscleLog.value };
  const jour = new Set(log[iso] || []);
  if (k === 'repos') {
    // Repos est exclusif
    log[iso] = jour.has('repos') ? [] : ['repos'];
  } else {
    jour.delete('repos');
    jour.has(k) ? jour.delete(k) : jour.add(k);
    log[iso] = [...jour];
  }
  if (!log[iso].length) delete log[iso];
  muscleLog.value = log;
}

export function viderJourMuscles(iso) {
  // v1 : viderJourMuscles() — efface toute la journee
  const log = { ...muscleLog.value };
  delete log[iso];
  muscleLog.value = log;
}
