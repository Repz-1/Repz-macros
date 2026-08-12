import { signal, effect } from '@preact/signals';
import { identite } from '../services/firebase.js';
import { chargerDonnees, sauvegarder } from '../services/sync.js';
import { PROGRAMMES } from '../data/programmes.js';

// `programmeParId` existe aussi dans data/programmes.js ; on garde un
// nom distinct pour eviter deux imports homonymes dans un composant.

// ============================================================
// PROGRAMME ACTIF
//
// Demande de Raci le 10/08 : « le programme créé dans Créer mon
// programme apparaît dans le calendrier, donc prévoir date lors de
// la création ».
//
// Cette notion n'existait NULLE PART avant : le questionnaire
// recommandait un programme, ouvrait sa fiche, et rien n'etait
// retenu. L'application ne savait pas quel programme on suivait, donc
// ne pouvait ni proposer la seance du jour ni colorer le calendrier a
// l'avance.
//
// Ce qui existait deja et n'est pas refait : les 86 seances avec
// leurs listes d'exercices (data/sessionExos.js, cles `{progId}-{n}`).
// Seul le lien manquait.
//
// FORME : { id, jours, depuis }
//   id     — identifiant du programme, ex. 'masse-3j'
//   jours  — jours de la semaine choisis, 0 = dimanche … 6 = samedi.
//            Autant de jours que le programme a de seances ; la
//            seance n de la semaine tombe sur le n-ieme jour coche.
//   depuis — date d'adoption (ISO), pour dater le calendrier.
//
// La date decide de la seance du jour. C'est plus simple qu'un
// compteur de rotation, et surtout ca survit a une semaine sautee :
// le mercredi reste le mercredi.
// ============================================================

const isoDuJour = (d) => d.getFullYear() + '-'
  + String(d.getMonth() + 1).padStart(2, '0') + '-'
  + String(d.getDate()).padStart(2, '0');

export const programmeActif = signal(null);

/** Nombre de seances hebdomadaires au-dela duquel il faut Premium. */
export const SEANCES_LIBRES = 4;

/** Le programme, retrouve par son identifiant. */
export function progParId(id) {
  for (const liste of Object.values(PROGRAMMES)) {
    const p = liste.find(x => x.id === id);
    if (p) return p;
  }
  return null;
}

/** Un programme depasse-t-il le quota gratuit ? */
export function exigePremium(id) {
  const p = progParId(id);
  return !!p && p.seances.length > SEANCES_LIBRES;
}

let uidP = null, pretP = false;

effect(() => {
  const u = identite.value;
  if (!u) { pretP = false; return; }
  if (u === uidP && pretP) return;
  if (u !== uidP) programmeActif.value = null;
  uidP = u; pretP = false;
  chargerDonnees(u).then(d => {
    if (uidP !== u) return;
    // Le local prime s'il a deja quelque chose : une adoption faite
    // hors ligne ne doit pas etre effacee par un nuage plus ancien.
    programmeActif.value = programmeActif.value || (d && d.programmeActif) || null;
    pretP = true;
  });
});

function ecrire(v) {
  programmeActif.value = v;
  const u = identite.value;
  if (u) sauvegarder(u, { programmeActif: v });
}

/** Adopter un programme, avec ses jours de la semaine. */
export function adopterProgramme(id, jours) {
  const p = progParId(id);
  if (!p) return null;
  const propres = [...new Set(jours)].filter(j => j >= 0 && j <= 6).sort((a, b) => a - b);
  const v = { id, jours: propres.slice(0, p.seances.length), depuis: isoDuJour(new Date()) };
  ecrire(v);
  return v;
}

/** Abandonner le programme en cours. */
export function abandonnerProgramme() { ecrire(null); }

/**
 * La seance prevue un jour donne, ou null si ce jour est un repos.
 * Retourne { seanceId, titre, sub, index, prog }.
 *
 * On ne planifie rien AVANT la date d'adoption : le calendrier ne
 * doit pas se remplir retroactivement de seances jamais prevues.
 */
export function seancePrevue(iso) {
  const a = programmeActif.value;
  if (!a || !a.jours || !a.jours.length) return null;
  if (a.depuis && iso < a.depuis) return null;
  const p = progParId(a.id);
  if (!p) return null;
  const parts = iso.split('-').map(Number);
  const jour = new Date(parts[0], parts[1] - 1, parts[2]).getDay();
  const index = a.jours.indexOf(jour);
  if (index === -1 || index >= p.seances.length) return null;
  const s = p.seances[index];
  return { seanceId: `${a.id}-${index}`, titre: s.titre, sub: s.sub, index, prog: p };
}

/** Les muscles d'une seance prevue, deduits de son titre. */
const MOTS = {
  pecs: ['pec', 'poitrine', 'push'], dos: ['dos', 'pull'], epaules: ['épaule', 'epaule'],
  biceps: ['biceps'], triceps: ['triceps'], jambes: ['jambe', 'legs', 'quadri', 'fessier'],
  abdos: ['abdo', 'gainage', 'core'], cardio: ['cardio', 'circuit', 'hiit'],
};
export function musclesPrevus(titre) {
  const t = (titre || '').toLowerCase();
  const out = [];
  for (const [k, mots] of Object.entries(MOTS)) {
    if (mots.some(m => t.includes(m))) out.push(k);
  }
  // « Full body » ne nomme aucun muscle mais les travaille tous :
  // sans ce cas, un programme full body laissait le calendrier vide.
  if (!out.length && /full|complet/.test(t)) return ['pecs', 'dos', 'jambes'];
  return out;
}
