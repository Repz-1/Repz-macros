import { DB, macrosOf } from '../data/aliments.js';
import { EAT_IDEAS } from '../data/idees.js';
import { limitesPortion } from '../data/portions.js';
import { EXERCISES } from '../data/exercices.js';
import { normNom } from '../data/alias-aliments.js';

export function macrosAliments(aliments) {
  return (aliments || []).reduce((t, a) => {
    const m = macrosOf({ name: a.aliment, portion: a.quantite });
    t.kcal += m.kcal; t.prot += m.prot; t.carbs += m.carbs; t.lip += m.lip;
    return t;
  }, { kcal: 0, prot: 0, carbs: 0, lip: 0 });
}

export function proposerRepas(objectifs, totaux, dejaAjoutes = []) {
  const obj = objectifs || {};
  const tot = totaux || {};
  const extra = macrosAliments(dejaAjoutes);
  const resteKcal = (obj.kcal || 0) - (tot.kcal || 0) - extra.kcal;
  if (resteKcal < 280) return null;
  const plafond = (obj.kcal || 2000) * 0.28;
  const cible = Math.max(280, Math.min(resteKcal, plafond));
  let meilleur = null;
  let meilleurScore = Infinity;
  for (const cat of Object.values(EAT_IDEAS)) {
    for (const idee of cat) {
      if (!idee.ings || idee.ings.some((i) => !DB[i.n])) continue;
      const baseKcal = idee.ings.reduce((s, i) => {
        const d = DB[i.n];
        const g = d.unit ? i.q * d.unit : i.q;
        return s + d.kcal * (g / 100);
      }, 0);
      if (baseKcal < 80) continue;
      const ratio = Math.max(0.5, Math.min(1.6, cible / baseKcal));
      const ings = idee.ings.map((i) => {
        const d = DB[i.n];
        const lim = limitesPortion(i.n);
        if (d.unit) {
          return { aliment: i.n, quantite: Math.min(lim.max, Math.max(lim.min, Math.round(i.q * ratio))), unite: 'piece', repasCle: 'diner' };
        }
        const brut = Math.round((i.q * ratio) / lim.step) * lim.step;
        return { aliment: i.n, quantite: Math.min(lim.max, Math.max(lim.min, brut)), unite: 'g', repasCle: 'diner' };
      });
      const m = macrosAliments(ings);
      const score = Math.abs(m.kcal - cible);
      if (score < meilleurScore) {
        meilleurScore = score;
        meilleur = { nom: idee.nom, kcal: Math.round(m.kcal), prot: Math.round(m.prot), carbs: Math.round(m.carbs), lip: Math.round(m.lip), ings };
      }
    }
  }
  return meilleur;
}
