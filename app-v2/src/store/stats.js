import { signal, computed, effect } from '@preact/signals';
import { utilisateur } from '../services/firebase.js';
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
  const u = utilisateur.value;
  if (!u) { uidSt = null; pretSt = false; return; }
  if (u.uid === uidSt) return;
  uidSt = u.uid; pretSt = false;
  chargerDonnees(u.uid).then(d => {
    if (uidSt !== u.uid) return;
    weightLog.value = (d && d.weightLog) || [];
    histoJours.value = (d && d.histoJours) || {};
    pretSt = true;
  });
});

effect(() => {
  const w = weightLog.value, h = histoJours.value;
  const u = utilisateur.value;
  if (!u || !pretSt) return;
  sauvegarder(u.uid, { weightLog: w, histoJours: h });
});

export function ajouterPesee(kg) {
  const iso = new Date().toISOString().slice(0, 10);
  const sansAuj = weightLog.value.filter(p => p.iso !== iso);
  weightLog.value = [...sansAuj, { iso, kg: parseFloat(kg) || 0 }]
    .sort((a, b) => a.iso.localeCompare(b.iso));
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
  return Math.round((l[l.length - 1].kg - l[0].kg) * 10) / 10;
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
