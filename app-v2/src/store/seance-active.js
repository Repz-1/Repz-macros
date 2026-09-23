import { signal, effect } from '@preact/signals';
import { seancesDuJour, supprimerSeance } from './seances.js';
import { seancePrevue } from './programme.js';

/**
 * UNE seance, quatre etats. C'est la source de verite unique.
 *
 *   BROUILLON  — exercices choisis, pas encore commencee
 *   PREVUE     — posee par le programme / le calendrier, pas ouverte
 *   EN_COURS   — chrono lance (libre ou guidee)
 *   FAITE      — enregistree dans le journal
 *
 * Les deux players (Ma seance / seance guidee) lisent et ecrivent
 * ici. Abandonner un brouillon ou un en-cours ne touche JAMAIS
 * l'historique. Supprimer une faite n'efface que le log du jour :
 * le creneau du programme reste, c'est un autre verbe.
 */

export const ETAT = {
  VIDE: 'vide',
  BROUILLON: 'brouillon',
  PREVUE: 'prevue',
  EN_COURS: 'en_cours',
  FAITE: 'faite',
};

const CLE_LIBRE = 'belfit_seance_libre';
const CLE_COURS = 'belfit_seance_en_cours';
const CLE_ACTIVE = 'belfit_seance_active';

function isoJour() {
  const d = new Date();
  return d.getFullYear() + '-'
    + String(d.getMonth() + 1).padStart(2, '0') + '-'
    + String(d.getDate()).padStart(2, '0');
}

function lireJson(cle) {
  try { return JSON.parse(localStorage.getItem(cle) || 'null'); }
  catch { return null; }
}

function ecrireJson(cle, v) {
  try {
    if (v == null) localStorage.removeItem(cle);
    else localStorage.setItem(cle, JSON.stringify(v));
  } catch { /* stockage plein : la seance continue en memoire */ }
}

function lireLibre() {
  try {
    const e = lireJson(CLE_LIBRE);
    if (!e) return { refs: [], selection: {} };
    const sel = {};
    Object.keys(e.selection || {}).forEach((k) => { sel[k] = new Set(e.selection[k]); });
    return { refs: e.refs || [], selection: sel };
  } catch { return { refs: [], selection: {} }; }
}

const reprise = lireLibre();
const repriseActive = lireJson(CLE_ACTIVE);

export const seanceRefs = signal(reprise.refs);
export const selectionExos = signal(reprise.selection);

/**
 * { id, etat, origine: 'libre'|'programme', titre, seanceId?,
 *   iso, tsDebut? }
 */
export const seanceActive = signal(
  repriseActive && ['brouillon', 'en_cours'].includes(repriseActive.etat)
    ? repriseActive
    : (reprise.refs.length
      ? { id: 'libre', etat: ETAT.BROUILLON, origine: 'libre', titre: 'Séance libre', iso: isoJour() }
      : null)
);

effect(() => {
  const refs = seanceRefs.value;
  const sel = selectionExos.value;
  const vide = !refs.length && !Object.values(sel).some((x) => x && x.size);
  if (vide) {
    ecrireJson(CLE_LIBRE, null);
    return;
  }
  const plat = {};
  Object.keys(sel).forEach((k) => { if (sel[k] && sel[k].size) plat[k] = [...sel[k]]; });
  ecrireJson(CLE_LIBRE, { refs, selection: plat });
});

effect(() => {
  const a = seanceActive.value;
  if (!a || a.etat === ETAT.FAITE || a.etat === ETAT.PREVUE) {
    ecrireJson(CLE_ACTIVE, null);
    return;
  }
  ecrireJson(CLE_ACTIVE, a);
});

export function poserBrouillon({ titre, refs, origine, seanceId, schema }) {
  if (refs) seanceRefs.value = refs;
  if (refs && !refs.length) {
    const cur = seanceActive.value;
    if (!cur || cur.etat !== ETAT.EN_COURS) seanceActive.value = null;
    return;
  }
  const orig = origine || 'libre';
  const cur = seanceActive.value;
  const meme = cur
    && cur.origine === orig
    && cur.etat !== ETAT.FAITE
    && (seanceId ? cur.seanceId === seanceId : orig === 'libre');
  seanceActive.value = {
    id: meme ? cur.id : (seanceId || ('libre-' + Date.now())),
    etat: meme && cur.etat === ETAT.EN_COURS ? ETAT.EN_COURS : ETAT.BROUILLON,
    origine: orig,
    titre: titre || (cur && cur.titre) || 'Séance libre',
    seanceId: seanceId || (meme ? cur.seanceId : null),
    iso: (meme && cur.iso) || isoJour(),
    tsDebut: meme ? cur.tsDebut : undefined,
    // Schema series × reps × repos pose par le coach (23/09). Garde
    // quand on retouche la selection, remplace quand le coach repose.
    schema: schema !== undefined ? schema : (meme ? cur.schema || null : null),
  };
}

export function demarrerSeanceActive() {
  const a = seanceActive.value;
  if (!a) {
    if (!seanceRefs.value.length) return false;
    poserBrouillon({ titre: 'Séance libre', refs: seanceRefs.value, origine: 'libre' });
  }
  const cur = seanceActive.value;
  if (!cur) return false;
  seanceActive.value = { ...cur, etat: ETAT.EN_COURS, tsDebut: cur.tsDebut || Date.now() };
  return true;
}

/**
 * Jette brouillon et en-cours. Ne touche pas au journal des seances
 * faites. Retourne ce qui a ete abandonne, ou null.
 */
export function abandonnerSeance() {
  const avant = seanceActive.value;
  seanceRefs.value = [];
  selectionExos.value = {};
  seanceActive.value = null;
  ecrireJson(CLE_LIBRE, null);
  ecrireJson(CLE_ACTIVE, null);
  ecrireJson(CLE_COURS, null);
  return avant;
}

/**
 * Efface le log du jour (seance FAITE). Le creneau du programme
 * n'est pas touche : le jour redevient prevu, c'est honnete.
 */
export function supprimerSeanceFaite(id) {
  if (id) supprimerSeance(id);
  const a = seanceActive.value;
  if (a && a.etat === ETAT.FAITE) seanceActive.value = null;
}

export function marquerFaite() {
  const a = seanceActive.value;
  seanceRefs.value = [];
  selectionExos.value = {};
  ecrireJson(CLE_LIBRE, null);
  ecrireJson(CLE_COURS, null);
  seanceActive.value = a
    ? { ...a, etat: ETAT.FAITE }
    : null;
  ecrireJson(CLE_ACTIVE, null);
}

/**
 * Portrait du jour : ce que l'ecran-roi et le coach doivent voir.
 * Priorite : en-cours > brouillon > faite > prevue > vide.
 */
export function portraitSeanceDuJour(iso = isoJour()) {
  const a = seanceActive.value;
  if (a && a.iso === iso && (a.etat === ETAT.EN_COURS || a.etat === ETAT.BROUILLON)) {
    return {
      etat: a.etat,
      titre: a.titre,
      origine: a.origine,
      seanceId: a.seanceId,
      nExos: seanceRefs.value.length,
      idLog: null,
    };
  }
  const faites = seancesDuJour(iso);
  if (faites.length) {
    const s = faites[0];
    return {
      etat: ETAT.FAITE,
      titre: s.titre,
      origine: 'log',
      seanceId: null,
      nExos: (s.exos || []).length,
      idLog: s.id,
    };
  }
  if (seanceRefs.value.length) {
    return {
      etat: ETAT.BROUILLON,
      titre: (a && a.titre) || 'Séance libre',
      origine: 'libre',
      seanceId: null,
      nExos: seanceRefs.value.length,
      idLog: null,
    };
  }
  const prevue = seancePrevue(iso);
  if (prevue) {
    return {
      etat: ETAT.PREVUE,
      titre: prevue.titre,
      origine: prevue.main ? 'planif' : 'programme',
      seanceId: prevue.seanceId,
      nExos: 0,
      idLog: null,
    };
  }
  return { etat: ETAT.VIDE, titre: null, origine: null, seanceId: null, nExos: 0, idLog: null };
}

export function aUneSeanceJetable() {
  const p = portraitSeanceDuJour();
  return p.etat === ETAT.BROUILLON || p.etat === ETAT.EN_COURS;
}

/** Le coach (et Aujourd'hui) demandent une vue S'entrainer sans importer Entrainer — evite un cycle. */
export const demandeVueEntrainer = signal(null);
