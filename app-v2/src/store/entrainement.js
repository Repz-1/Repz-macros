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
  // Trapezes ajoutes le 10/08 a la demande de Raci. Aucun exercice de
  // la base n'y est rattache (EXERCISES ne compte que sept groupes) :
  // ils se notent donc a la main, comme le cardio. Teinte prise entre
  // l'orange du dos et l'or des epaules, entre lesquels ils vivent.
  { k: 'trapezes', label: 'Trapèzes', c: '#EA8C00' },
  { k: 'biceps',  label: 'Biceps',  c: '#10B981' },
  { k: 'triceps', label: 'Triceps', c: '#06B6D4' },
  { k: 'jambes',  label: 'Jambes',  c: '#3B82F6' },
  { k: 'abdos',   label: 'Abdos',   c: '#8B5CF6' },
  { k: 'cardio',  label: 'Cardio',  c: '#EC4899' },
  { k: 'repos',   label: 'Repos',   c: '#E9DCC0' },
];

export const muscleLog = signal({});
let uidM = null, pretM = false;

effect(() => {
  const u = identite.value;

  // Identite momentanement nulle = rafraichissement de jeton, pas une
  // deconnexion : on garde uidM, sinon chaque clignotement relancait
  // un chargement dont la reponse PERIMEE ecrasait les jours notes
  // entre-temps — c'est le « ca efface mes couleurs » du 7/08.
  if (!u) { pretM = false; return; }
  if (u === uidM && pretM) return;
  if (u !== uidM) muscleLog.value = {};

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
    // Les jours tapes PENDANT que la lecture etait en vol priment sur
    // la reponse : elle a ete prise avant eux. Fusion jour par jour,
    // memoire prioritaire.
    muscleLog.value = { ...(fusion || charge), ...muscleLog.value };
    pretM = true;
    // Fusion effective : on la persiste tout de suite, sinon elle
    // serait refaite a chaque demarrage.
    if (fusion) sauvegarder(u, { muscleLog: muscleLog.value });
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

/**
 * Ajoute des muscles a un jour sans effacer ce qui y est deja.
 *
 * C'est la liaison qui manquait dans l'organigramme de Raci (10/08) :
 * « Fin de seance -> Mannequin + Calendrier mis a jour ». Une seance
 * terminee etait bien enregistree dans la liste, mais le calendrier
 * restait blanc et le mannequin gris — seul muscleLog les alimente,
 * et rien n'y ecrivait a la fin d'une seance.
 *
 * On FUSIONNE plutot qu'on ne remplace : un jour peut porter deux
 * seances, ou des muscles notes a la main avant l'entrainement.
 * « Repos » saute des qu'une seance est enregistree — on ne s'est pas
 * repose le jour ou l'on s'est entraine.
 */
export function noterMuscles(iso, liste) {
  const propres = [...new Set((liste || []).filter(k => k && k !== 'repos'))];
  if (!propres.length) return;
  const log = { ...muscleLog.value };
  const jour = new Set((log[iso] || []).filter(k => k !== 'repos'));
  propres.forEach(k => jour.add(k));
  log[iso] = [...jour];
  muscleLog.value = log;
}

export function viderJourMuscles(iso) {
  // v1 : viderJourMuscles() — efface toute la journee
  const log = { ...muscleLog.value };
  delete log[iso];
  muscleLog.value = log;
}
