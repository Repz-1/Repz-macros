import { signal, effect } from '@preact/signals';
import { identite } from '../services/firebase.js';
import { chargerDonnees, sauvegarder } from '../services/sync.js';

// ============================================================
// STORE DES SEANCES ENREGISTREES
// Une seance = ce qui reste une fois l'entrainement termine :
//   { id, iso, ts, titre, duree, muscles, exos, nbSeries, tonnage, records }
//   - duree   : secondes
//   - exos    : [{ nom, mKey, sets:[{w,r}] }]
//   - records : noms des exercices ou un nouveau max a ete pose
// Persiste dans users/{uid}.v2Data.seances, meme mecanique
// local-first que le journal et le calendrier des muscles.
// ============================================================

export const seances = signal([]);
export const seancesPretes = signal(false);

// Plafond : une seance pese ~400 octets, 300 tiennent largement
// dans le document Firestore sans menacer la limite de 1 Mo.
const MAX_SEANCES = 300;

// L'ancien journal v1 vivait sous une cle localStorage GLOBALE,
// donc partagee par tous les comptes de l'appareil. On ne la reprend
// qu'une seule fois, pour le premier compte qui se connecte : sans ce
// marqueur, un deuxieme compte heriterait des seances du premier.
const CLE_V1 = 'repz_sessionLog';
const MARQUE_REPRISE = 'belfit_v2_seances_reprises';

function tonnageDe(exos) {
  let t = 0;
  (exos || []).forEach(e => (e.sets || []).forEach(s => {
    const w = parseFloat(s.w), r = parseInt(s.r, 10);
    if (!isNaN(w) && !isNaN(r)) t += w * r;
  }));
  return Math.round(t);
}

function nbSeriesDe(exos) {
  return (exos || []).reduce((n, e) => n + ((e.sets || []).length), 0);
}

/** Seances du journal v1, converties au format v2. */
function reprendreV1() {
  try {
    if (localStorage.getItem(MARQUE_REPRISE)) return [];
    const brut = localStorage.getItem(CLE_V1);
    localStorage.setItem(MARQUE_REPRISE, '1');
    if (!brut) return [];
    const vieilles = JSON.parse(brut);
    if (!Array.isArray(vieilles)) return [];
    return vieilles.map((s, i) => ({
      id: 'v1-' + (s.ts || i),
      iso: s.iso || new Date(s.ts || Date.now()).toISOString().slice(0, 10),
      ts: s.ts || Date.now(),
      titre: s.titre || 'Séance',
      duree: s.duree || 0,
      muscles: [],           // le format v1 ne les portait pas
      exos: s.exos || [],
      nbSeries: nbSeriesDe(s.exos),
      tonnage: tonnageDe(s.exos),
      records: [],
    }));
  } catch (e) { return []; }
}

let uidSe = null, pretSe = false;

effect(() => {
  const u = identite.value;
  if (!u) { uidSe = null; pretSe = false; seancesPretes.value = false; return; }
  if (u === uidSe) return;
  uidSe = u; pretSe = false; seancesPretes.value = false;
  chargerDonnees(u).then(d => {
    if (uidSe !== u) return;
    const chargees = (d && Array.isArray(d.seances)) ? d.seances : null;
    const reprises = chargees ? [] : reprendreV1();
    seances.value = chargees || reprises;
    pretSe = true;
    seancesPretes.value = true;
    // La reprise n'a lieu qu'une fois : on la persiste tout de suite,
    // sinon le marqueur la rendrait irrecuperable au prochain demarrage.
    if (reprises.length) sauvegarder(u, { seances: reprises });
  });
});

effect(() => {
  const l = seances.value;
  const u = identite.value;
  if (!u || !pretSe) return;
  sauvegarder(u, { seances: l });
});

/**
 * Enregistre une seance terminee. Les champs derives (tonnage,
 * nombre de series) sont calcules ici : l'ecran de liste n'aura
 * rien a recalculer.
 */
export function enregistrerSeance(s) {
  const seance = {
    id: String(Date.now()) + '-' + Math.random().toString(36).slice(2, 7),
    iso: s.iso || new Date().toISOString().slice(0, 10),
    ts: Date.now(),
    titre: s.titre || 'Séance',
    duree: s.duree || 0,
    muscles: s.muscles || [],
    exos: s.exos || [],
    nbSeries: nbSeriesDe(s.exos),
    tonnage: typeof s.tonnage === 'number' ? s.tonnage : tonnageDe(s.exos),
    records: s.records || [],
  };
  // La plus recente en tete : c'est l'ordre d'affichage attendu.
  seances.value = [seance, ...seances.value].slice(0, MAX_SEANCES);
  return seance;
}

export function supprimerSeance(id) {
  seances.value = seances.value.filter(s => s.id !== id);
}

export function seancesDuJour(iso) {
  return seances.value.filter(s => s.iso === iso);
}
