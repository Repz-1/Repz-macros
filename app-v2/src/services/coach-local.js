import { DB } from '../data/aliments.js';
import { ALIAS, normNom, resoudreAliment, noterManque } from '../data/alias-aliments.js';

const PORTION = {
  'Pain blanc': 120, 'Frites four': 200, 'Frites': 200, 'Poulet cuit': 150,
  'Riz cuit': 200, Banane: 120, 'Oeuf entier M (50g)': 50, Avoine: 40,
  'Whey Iso': 30, 'Biere blonde': 330, "Huile d'olive": 10,
  "Huile d'arachide": 10, 'Pomme de terre cuite': 200,
};

const STOP = new Set([
  'que','qui','une','des','les','aux','pour','avec','dans','plus','mais',
  'pas','rien','tout','manger','mange','pris','repas','midi','soir','matin',
  'dis','dit','jai','un','du','de','la','le','cuillere','cuilleres','soupe',
  'cas','cac','grammes','gramme','blanc','verre','verres','bouteille',
  'bouteilles','eau','bu','bois','boire','cl','ml',
]);

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

export function parserLocal(message) {
  const brut = String(message || '').trim();
  const n = normNom(brut);
  if (!n) return { texte: '', aliments: [], local: true };

  const eauLitres = extraireEau(brut);

  const vus = new Set();
  const aliments = [];
  const cleRepas = repasCle(brut);
  const push = (cle, q) => {
    if (!cle || !DB[cle] || vus.has(cle)) return;
    vus.add(cle);
    aliments.push({ aliment: cle, quantite: Math.round(q), unite: 'g', repasCle: cleRepas });
  };

  const cles = Object.keys(ALIAS).sort((a, b) => b.length - a.length);
  for (const a of cles) {
    if (STOP.has(a) || a.length < 4) continue;
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

  const bits = [];
  if (eauLitres) bits.push(eauLitres.toString().replace('.', ',') + ' L d\u2019eau');
  if (aliments.length) bits.push(aliments.map((a) => a.aliment + ' ' + a.quantite + ' g').join(', '));
  return {
    texte: 'Base BelFit : ' + bits.join(' + ') + '. Verifie puis ajoute.',
    aliments,
    eauLitres: eauLitres || 0,
    local: true,
  };
}
