import { signal } from '@preact/signals';
import { seancePrevue } from './programme.js';
import { SESSION_EXOS } from '../data/sessionExos.js';

/** Adaptations du JOUR seulement. Le programme ne bouge pas. */
export const adaptationsJour = signal(lire());

function isoJour() {
  return new Date().toISOString().slice(0, 10);
}

function lire() {
  try {
    const brut = JSON.parse(localStorage.getItem('belfit_adapt_seance') || 'null');
    if (!brut || brut.iso !== isoJour()) return null;
    return brut;
  } catch (e) {
    return null;
  }
}

export function enregistrerAdaptations(swaps, motif) {
  const doc = { iso: isoJour(), motif: motif || 'genou', swaps: swaps || [] };
  adaptationsJour.value = doc;
  try { localStorage.setItem('belfit_adapt_seance', JSON.stringify(doc)); } catch (e) {}
  return doc;
}

export function appliquerAdaptations(refs) {
  const doc = adaptationsJour.value || lire();
  if (!doc || doc.iso !== isoJour() || !doc.swaps || !doc.swaps.length) return refs;
  const map = {};
  doc.swaps.forEach((s) => { if (s.de && s.vers) map[s.de] = s.vers; });
  return (refs || []).map((r) => map[r] || r);
}

const RISQUE_GENOU = /squat|fente|presse a cuisses|hack squat|extension jambes|fentes/i;
const REMPLACE_GENOU = 'jambes:Leg Curl Assis (Machine)';
const REMPLACE_GENOU_2 = 'jambes:Leg Curl Allongé (Machine)';

function nomRef(ref) {
  const i = String(ref).indexOf(':');
  return i >= 0 ? String(ref).slice(i + 1) : String(ref);
}

/**
 * Propose des remplacements pour la seance DU JOUR.
 * Ne reecrit pas le programme. Null si rien a changer.
 */
export function proposerAdaptation(phrase) {
  const n = String(phrase || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const genou = /\b(genou|genoux|knee)\b/.test(n) && /\b(mal|douleur|blesse|evite|eviter|proteger)\b/.test(n)
    || /\bmal au genou/.test(n);
  if (!genou) return null;

  const iso = isoJour();
  const prevue = seancePrevue(iso);
  if (!prevue) {
    return {
      motif: 'genou',
      titre: 'Pas de seance prevue aujourd\u2019hui',
      swaps: [],
      texte: 'Rien a adapter : aucun programme pose sur ce jour. Le plan ne change pas.',
    };
  }
  const refs = SESSION_EXOS[prevue.seanceId] || [];
  const swaps = [];
  let alt = REMPLACE_GENOU;
  refs.forEach((ref) => {
    if (!RISQUE_GENOU.test(nomRef(ref))) return;
    const vers = alt;
    alt = alt === REMPLACE_GENOU ? REMPLACE_GENOU_2 : REMPLACE_GENOU;
    if (vers === ref) return;
    swaps.push({ de: ref, vers, deNom: nomRef(ref), versNom: nomRef(vers) });
  });
  if (!swaps.length) {
    return {
      motif: 'genou',
      titre: prevue.titre,
      swaps: [],
      texte: 'Seance du jour : ' + prevue.titre + '. Rien a retirer pour le genou. Le programme reste tel quel.',
    };
  }
  return {
    motif: 'genou',
    titre: prevue.titre,
    swaps,
    texte: 'Seance du jour : ' + prevue.titre + '. On change seulement ces mouvements, pas le programme.',
  };
}
