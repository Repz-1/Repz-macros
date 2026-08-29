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
  // Le violet #8B5CF6 plafonnait a 4,31 de contraste, texte blanc ou
  // noir : c'etait la seule couleur illisible dans les deux sens.
  // Assombri d'un cran, meme famille, 5,46.
  { k: 'abdos',   label: 'Abdos',   c: '#7A45E8' },
  { k: 'cardio',  label: 'Cardio',  c: '#EC4899' },
  { k: 'repos',   label: 'Repos',   c: '#26654B' },
];

/**
 * Couleur du chiffre a poser SUR un disque de couleur.
 *
 * Mesure du 26/08 : le chiffre etait blanc sur les dix couleurs. Sur
 * le jaune des epaules cela donnait 1,82 de contraste — illisible.
 * Sur neuf couleurs sur dix, le chiffre sombre est meilleur, souvent
 * de loin (10,06 contre 1,82 pour les epaules). On choisit donc au
 * cas par cas, par la luminance relative, au lieu de repeindre la
 * palette : les couleurs sont l'identite du calendrier et de la
 * legende, c'est le texte pose dessus qui etait mal choisi.
 */
export function texteSur(hex) {
  const v = (i) => parseInt(hex.slice(i, i + 2), 16) / 255;
  const f = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const lum = 0.2126 * f(v(1)) + 0.7152 * f(v(3)) + 0.0722 * f(v(5));
  const surBlanc = 1.05 / (lum + 0.05);
  const surNoir = (lum + 0.05) / 0.0575;  // luminance de #151515 + 0,05
  return surNoir > surBlanc ? '#151515' : '#FFFFFF';
}

export const muscleLog = signal({});

// Le calendrier ne retient que la semaine en cours et celle qui la
// precede (Raci, 17/08). Au-dela, les jours notes sont effaces a
// chaque chargement et ne repartent pas vers le compte.
//
// Le futur n'est JAMAIS elague : on y planifie des seances, et une
// purge qui les emporterait viderait le programme de la semaine a
// venir.
//
// Semaine ISO, donc lundi. (getDay() + 6) % 7 vaut 0 le lundi : on
// remonte au lundi courant, puis sept jours de plus.
export function borneCalendrier(aujourdhui = new Date()) {
  const d = new Date(aujourdhui);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7) - 7);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function elaguerCalendrier(log, borne = borneCalendrier()) {
  const garde = {};
  for (const [jour, vals] of Object.entries(log || {})) {
    if (jour >= borne) garde[jour] = vals;
  }
  return garde;
}
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
    const complet = { ...(fusion || charge), ...muscleLog.value };
    const elague = elaguerCalendrier(complet);
    muscleLog.value = elague;
    pretM = true;
    // Les jours tombes hors fenetre sont effaces AUSSI cote compte,
    // sinon ils reviendraient au prochain chargement.
    if (Object.keys(complet).length !== Object.keys(elague).length) {
      sauvegarder(u, { muscleLog: elague });
    }
    // Fusion effective : on la persiste tout de suite, sinon elle
    // serait refaite a chaque demarrage.
    else if (fusion) sauvegarder(u, { muscleLog: muscleLog.value });
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
