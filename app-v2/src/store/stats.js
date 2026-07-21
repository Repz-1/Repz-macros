import { signal, computed, effect } from '@preact/signals';
import { identite } from '../services/firebase.js';
import { chargerDonnees, sauvegarder } from '../services/sync.js';
import { muscleLog } from './entrainement.js';

// ============================================================
// STORE STATS v2
// weightLog : [{iso:'2026-07-17', kg:97}]  (pesees)
// histoJours : {'2026-07-17': {kcal, prot, carbs, lip}}  (journees cloturees)
// ============================================================

export const weightLog = signal([]);
export const histoJours = signal({});
let uidSt = null, pretSt = false;

effect(() => {
  const u = identite.value;
  if (!u) { uidSt = null; pretSt = false; return; }
  if (u === uidSt) return;
  uidSt = u; pretSt = false;
  chargerDonnees(u).then(d => {
    if (uidSt !== u) return;
    weightLog.value = (d && d.weightLog) || [];
    histoJours.value = (d && d.histoJours) || {};
    pretSt = true;
  });
});

effect(() => {
  const w = weightLog.value, h = histoJours.value;
  const u = identite.value;
  if (!u || !pretSt) return;
  sauvegarder(u, { weightLog: w, histoJours: h });
});

export function ajouterPesee(kg) {
  // Meme format d'entree que la v1 (app.html / saveWeightNutri) :
  // { iso, date (jj mois court fr), weight }
  const val = parseFloat(kg) || 0;
  const iso = new Date().toISOString().slice(0, 10);
  const date = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  const sansAuj = weightLog.value.filter(p => p.iso !== iso);
  weightLog.value = [...sansAuj, { iso, date, weight: val }]
    .sort((a, b) => a.iso.localeCompare(b.iso));
  // v1 : goal.weight = val (sert au score « Poids » de la page Stats)
  try {
    const g = JSON.parse(localStorage.getItem('repz_goal') || '{}') || {};
    g.weight = val;
    localStorage.setItem('repz_goal', JSON.stringify(g));
  } catch (e) {}
}

export function enregistrerJour(totaux) {
  const iso = new Date().toISOString().slice(0, 10);
  histoJours.value = { ...histoJours.value, [iso]: {
    kcal: Math.round(totaux.kcal), prot: Math.round(totaux.prot),
    carbs: Math.round(totaux.carbs), lip: Math.round(totaux.lip),
  }};
}

// --- Derives ---
export const tendancePoids = computed(() => {
  const l = weightLog.value;
  if (l.length < 2) return null;
  const p = (e) => parseFloat(e.weight ?? e.kg) || 0;
  return Math.round((p(l[l.length - 1]) - p(l[0])) * 10) / 10;
});

export const seancesParMois = computed(() => {
  const compte = {};
  Object.entries(muscleLog.value).forEach(([iso, groupes]) => {
    if (!groupes.some(g => g !== 'repos')) return;
    const mois = iso.slice(0, 7);
    compte[mois] = (compte[mois] || 0) + 1;
  });
  return compte;
});
