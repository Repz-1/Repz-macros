import { DB, macrosOf } from '../data/aliments.js';
import { ALIAS, normNom, resoudreAliment, noterManque } from '../data/alias-aliments.js';
import { EAT_IDEAS } from '../data/idees.js';
import { limitesPortion } from '../data/portions.js';

const PORTION = {
  'Pain blanc': 120, 'Frites four': 200, 'Frites': 200, 'Poulet cuit': 150,
  'Riz cuit': 200, Banane: 120, 'Oeuf entier M (50g)': 50, Avoine: 40,
  'Whey Iso': 30, 'Biere blonde': 330, "Huile d'olive": 10,
  "Huile d'arachide": 10, 'Pomme de terre cuite': 200,
  'Viande de kebab': 150,
};

const STOP = new Set([
  'que','qui','une','des','les','aux','pour','avec','dans','plus','mais',
  'pas','rien','tout','manger','mange','pris','repas','midi','soir','matin',
  'dis','dit','jai','un','du','de','la','le','cuillere','cuilleres','soupe',
  'cas','cac','grammes','gramme','blanc','verre','verres','bouteille',
  'bouteilles','eau','bu','bois','boire','cl','ml',
]);

/** Plats belges qui sont PLUSIEURS aliments. Un durum n'est pas du pain. */
const COMBOS = [
  {
    re: /\b(durum|durums|doner kebab)\b/,
    skip: ['durum', 'durums', 'doner', 'kebab'],
    aliments: [
      { aliment: 'Pain blanc', quantite: 120 },
      { aliment: 'Viande de kebab', quantite: 150 },
    ],
  },
];

function repasCle(phrase) {
  const n = normNom(phrase);
  if (n.includes('matin') || n.includes('petit dejeuner')) return 'pdej';
  if (n.includes('midi') || n.includes('dejeuner') || n.includes('lunch')) return 'dej';
  if (n.includes('soir') || n.includes('diner')) return 'diner';
  if (n.includes('snack') || n.includes('collation')) return 'snack';
  const h = new Date().getHours();
  return h < 11 ? 'pdej' : h < 15 ? 'dej' : h < 21 ? 'diner' : 'snack';
}

function extraireQuantite(n, apresMot) {
  const idx = apresMot ? n.indexOf(apresMot) : -1;
  const zone = idx >= 0 ? n.slice(0, idx + apresMot.length + 12) : n;
  const cas = zone.match(/(\d+[\.,]?\d*)\s*(cuillere(?:s)?(?: a soupe)?|cas)\b/);
  if (cas) return parseFloat(cas[1].replace(',', '.')) * 10;
  const cac = zone.match(/(\d+[\.,]?\d*)\s*(cuillere(?:s)? a cafe|cac)\b/);
  if (cac) return parseFloat(cac[1].replace(',', '.')) * 5;
  const g = zone.match(/(\d+[\.,]?\d*)\s*(g|gr|grammes?)\b/);
  if (g) return parseFloat(g[1].replace(',', '.'));
  return null;
}

/** Litres d'eau dans la phrase, ou null. */
export function extraireEau(phrase) {
  const n = normNom(phrase);
  const parleEau = /\b(eau|bu|bois|boire|verre|verres|bouteille|hydrate)\b/.test(n);
  if (!parleEau) return null;

  const l = n.match(/(\d+[\.,]?\d*)\s*l\b/);
  if (l) return parseFloat(l[1].replace(',', '.'));
  const cl = n.match(/(\d+[\.,]?\d*)\s*cl\b/);
  if (cl) return parseFloat(cl[1].replace(',', '.')) / 100;
  const ml = n.match(/(\d+[\.,]?\d*)\s*ml\b/);
  if (ml) return parseFloat(ml[1].replace(',', '.')) / 1000;

  if (/\bbouteille/.test(n)) return 0.5;
  if (/\bverres\b/.test(n)) {
    const nb = n.match(/(\d+)\s*verres/);
    return (nb ? parseInt(nb[1], 10) : 2) * 0.25;
  }
  if (/\bverre\b/.test(n)) return 0.25;
  return 0.25;
}

export function macrosAliments(aliments) {
  return (aliments || []).reduce((t, a) => {
    const m = macrosOf({ name: a.aliment, portion: a.quantite });
    t.kcal += m.kcal; t.prot += m.prot; t.carbs += m.carbs; t.lip += m.lip;
    return t;
  }, { kcal: 0, prot: 0, carbs: 0, lip: 0 });
}

/**
 * Un diner qui rattrape le reste de la journee.
 * Une seule idee, portion calée, ou null si plus rien a rattraper.
 */
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
          return {
            aliment: i.n,
            quantite: Math.min(lim.max, Math.max(lim.min, Math.round(i.q * ratio))),
            unite: 'piece',
            repasCle: 'diner',
          };
        }
        const brut = Math.round((i.q * ratio) / lim.step) * lim.step;
        return {
          aliment: i.n,
          quantite: Math.min(lim.max, Math.max(lim.min, brut)),
          unite: 'g',
          repasCle: 'diner',
        };
      });
      const m = macrosAliments(ings);
      const score = Math.abs(m.kcal - cible);
      if (score < meilleurScore) {
        meilleurScore = score;
        meilleur = {
          nom: idee.nom,
          kcal: Math.round(m.kcal),
          prot: Math.round(m.prot),
          carbs: Math.round(m.carbs),
          lip: Math.round(m.lip),
          ings,
          resteApres: Math.round(resteKcal - m.kcal),
        };
      }
    }
  }
  return meilleur;
}

export function parserLocal(message, contexte = {}) {
  const brut = String(message || '').trim();
  const n = normNom(brut);
  if (!n) return { texte: '', aliments: [], local: true };

  const eauLitres = extraireEau(brut);
  const skip = new Set();
  const vus = new Set();
  const aliments = [];
  const cleRepas = repasCle(brut);
  const push = (cle, q) => {
    if (!cle || !DB[cle] || vus.has(cle)) return;
    vus.add(cle);
    aliments.push({ aliment: cle, quantite: Math.round(q), unite: 'g', repasCle: cleRepas });
  };

  for (const c of COMBOS) {
    if (!c.re.test(n)) continue;
    c.skip.forEach((s) => skip.add(s));
    c.aliments.forEach((a) => push(a.aliment, a.quantite));
  }

  const cles = Object.keys(ALIAS).sort((a, b) => b.length - a.length);
  for (const a of cles) {
    if (STOP.has(a) || skip.has(a) || a.length < 3) continue;
    if (!new RegExp('(?:^| )' + a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?: |$)').test(n)) continue;
    const cle = resoudreAliment(a);
    push(cle, extraireQuantite(n, a) || PORTION[cle] || 100);
  }

  if (!aliments.length && !eauLitres) {
    noterManque(brut);
    return {
      texte: "Pas trouve. Nourriture : « 200 g riz ». Eau : « j'ai bu 50 cl ».",
      aliments: [],
      local: true,
    };
  }

  const macros = macrosAliments(aliments);
  const bits = [];
  if (eauLitres) bits.push(eauLitres.toString().replace('.', ',') + ' L d\u2019eau');
  if (aliments.length) bits.push(aliments.map((a) => a.aliment + ' ' + a.quantite + ' g').join(', '));

  const obj = contexte.objectifs || {};
  const tot = contexte.totaux || {};
  let texte = 'Base BelFit : ' + bits.join(' + ') + '.';
  if (aliments.length) {
    texte += ' \u2248 ' + Math.round(macros.kcal) + ' kcal.';
    const reste = (obj.kcal || 0) - (tot.kcal || 0) - macros.kcal;
    if (obj.kcal) {
      texte += reste > 0
        ? ' Il te resterait ' + Math.round(reste) + ' kcal.'
        : ' Ca depasse l\u2019objectif de ' + Math.round(-reste) + ' kcal.';
    }
    texte += ' Verifie puis ajoute.';
  } else {
    texte += ' Verifie puis ajoute.';
  }

  return {
    texte,
    aliments,
    eauLitres: eauLitres || 0,
    macros: {
      kcal: Math.round(macros.kcal),
      prot: Math.round(macros.prot),
      carbs: Math.round(macros.carbs),
      lip: Math.round(macros.lip),
    },
    local: true,
  };
}
