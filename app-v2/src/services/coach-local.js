import { DB, macrosOf } from '../data/aliments.js';
import { ALIAS, normNom, resoudreAliment, noterManque } from '../data/alias-aliments.js';
import { EAT_IDEAS } from '../data/idees.js';
import { limitesPortion } from '../data/portions.js';
import { proposerAdaptation } from '../store/adaptations.js';
import { EXERCISES } from '../data/exercices.js';

const PORTION = {
  'Pain blanc': 120, 'Frites': 200, 'Poulet cuit': 150,
  'Riz cuit': 200, Banane: 120, 'Oeuf entier M (50g)': 50,
  'Whey Iso': 30, "Huile d'olive": 10, 'Pomme de terre cuite': 200,
  'Viande de kebab': 150,
};

const STOP = new Set([
  'que','qui','une','des','les','aux','pour','avec','dans','plus','mais',
  'pas','rien','tout','manger','mange','pris','repas','midi','soir','matin',
  'dis','dit','jai','un','du','de','la','le','cuillere','cuilleres','soupe',
  'cas','cac','grammes','gramme','blanc','verre','verres','bouteille',
  'eau','bu','bois','boire','cl','ml','genou','genoux',
]);

const COMBOS = [
  {
    re: /\b(durum|durums|doner|doner kebab)\b/,
    skip: ['durum', 'durums', 'doner', 'kebab', 'pain'],
    aliments: [
      { aliment: 'Pain blanc', quantite: 120 },
      { aliment: 'Viande de kebab', quantite: 150 },
    ],
    extra: [
      { si: /\b(frite|frites|friet|frieten|fries)\b/, aliment: 'Frites', quantite: 200 },
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
  if (/\bverre/.test(n)) return 0.25;
  return 0.25;
}

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

const MUSCLE_ALIAS = [
  { k: 'pecs', re: /\b(pecs?|pectoraux?|chest)\b/ },
  { k: 'biceps', re: /\b(biceps?)\b/ },
  { k: 'triceps', re: /\b(triceps?)\b/ },
  { k: 'dos', re: /\b(dos|dorsaux?|back|lats?)\b/ },
  { k: 'epaules', re: /\b(epaules?|shoulders?|delts?)\b/ },
  { k: 'jambes', re: /\b(jambes?|cuisses?|legs?|quads?|quadriceps?)\b/ },
  { k: 'abdos', re: /\b(abdos?|abdominaux?|abs)\b/ },
  { k: 'trapezes', re: /\b(trapezes?|shrugs?)\b/ },
];

const COMBOS_CORPS = [
  { re: /\b(full ?body|tout le corps|corps entier)\b/, ks: ['pecs', 'dos', 'jambes'] },
  { re: /\b(haut du corps|upper)\b/, ks: ['pecs', 'dos', 'epaules'] },
  { re: /\b(bas du corps|lower)\b/, ks: ['jambes'] },
  { re: /\bpush\b/, ks: ['pecs', 'epaules', 'triceps'] },
  { re: /\bpull\b/, ks: ['dos', 'biceps'] },
];

const LABEL_MUSCLE = {
  pecs: 'Pecs', biceps: 'Biceps', triceps: 'Triceps', dos: 'Dos',
  epaules: 'Épaules', jambes: 'Jambes', abdos: 'Abdos', trapezes: 'Trapèzes',
};

/**
 * Trois listes par muscle, dans l'ordre de priorite (23/09).
 * Raci : « Dos lourd et court » et « Dos endurance » sortaient le meme
 * trio. Le style choisit maintenant la liste, le nombre d'exercices et
 * le schema series × reps × repos, qui suit la seance jusqu'au bout.
 */
const PACKS = {
  pecs: {
    force: ['Développé Couché (Barre)', 'Développé Couché Incliné (Barre)', 'Développé Couché (Haltère)', 'Dips', 'Chest Press (Machine)'],
    hyper: ['Développé Couché (Barre)', 'Développé Couché Incliné (Haltère)', 'Chest Press (Machine)', 'Écarté (Pec Deck) (Machine)', 'Écarté (Poulie)', 'Pompes'],
    endu: ['Pompes', 'Chest Press (Machine)', 'Écarté (Poulie)', 'Écarté (Pec Deck) (Machine)', 'Pompes Inclinées', 'Chest Press Incliné (Machine)'],
  },
  dos: {
    force: ['Soulevé de Terre (Barre)', 'Tractions', 'Rowing Penché (Barre)', 'Tirage Poitrine (Poulie)', 'Rowing Un Bras (Haltère)'],
    hyper: ['Tractions', 'Rowing Penché (Barre)', 'Tirage Poitrine Prise Large (Poulie)', 'Rowing Assis (Poulie)', 'Rowing Un Bras (Haltère)', 'Pull-Over (Barre)'],
    endu: ['Tirage Poitrine (Poulie)', 'Rowing Assis (Poulie)', 'Rowing (Machine)', 'Tirage Poitrine Prise Serrée Avant (Poulie)', 'Extension Dos', 'Superman'],
  },
  epaules: {
    force: ['Développé Militaire Debout (Barre)', 'Push Press (Barre)', 'Presse Épaules (Haltère)', 'Élévation Latérale (Haltère)'],
    hyper: ['Développé Militaire Assis (Barre)', 'Élévation Latérale (Haltère)', 'Oiseau Penché Arrière (Haltère)', 'Tirage vers Visage (Poulie)', 'Presse Épaules (Machine)'],
    endu: ['Presse Épaules (Machine)', 'Élévation Latérale (Poulie)', 'Écarté Inversé (Machine)', 'Tirage vers Visage (Poulie)', 'Élévation Latérale (Haltère)'],
  },
  biceps: {
    force: ['Curl Biceps (Barre)', 'Curl Marteau (Haltère)', 'Curl Pupitre (Barre)'],
    hyper: ['Curl Biceps (Barre)', 'Curl Biceps Incliné (Haltère)', 'Curl Marteau (Haltère)', 'Curl Pupitre (Machine)'],
    endu: ['Curl Biceps (Poulie)', 'Curl Marteau Corde (Poulie)', 'Curl Concentré (Haltère)', 'Curl Biceps (Machine)'],
  },
  triceps: {
    force: ['Développé Couché Prise Serrée (Barre)', 'Dips', 'Barre au Front (Barre EZ)'],
    hyper: ['Barre au Front (Barre EZ)', 'Extension Triceps Corde (Poulie)', 'Dips (Machine)', 'Extension Triceps au-dessus de la Tête Corde (Poulie)'],
    endu: ['Extension Triceps Corde (Poulie)', 'Extension Triceps (Machine)', 'Kickback Triceps (Haltère)', 'Pompes Prise Serrée'],
  },
  jambes: {
    force: ['Squat (Barre)', 'Soulevé de Terre Jambes Tendues (Barre)', 'Presse à Cuisses (Machine)', 'Fentes (Barre)', 'Hip Thrust (Barre)'],
    hyper: ['Squat (Barre)', 'Presse à Cuisses (Machine)', 'Leg Curl Allongé (Machine)', 'Extension Jambes (Machine)', 'Fentes (Haltère)', 'Extension Mollets Debout (Machine)'],
    endu: ['Goblet Squat (Kettlebell)', 'Fentes (Haltère)', 'Extension Jambes (Machine)', 'Leg Curl Assis (Machine)', 'Presse à Cuisses (Machine)', 'Extension Mollets Debout (Machine)'],
  },
  abdos: {
    force: ['Relevé de Jambes Suspendu', 'Rollout à Genoux (Barre)', 'Crunch (Poulie)'],
    hyper: ['Crunch (Poulie)', 'Relevé de Jambes Suspendu', 'Planche', 'Rotation Russe'],
    endu: ['Planche', 'Crunch Bicyclette', 'Gainage Latéral', 'Ramené de Genoux', 'Crunch'],
  },
  trapezes: {
    force: ['Shrug (Barre)', 'Shrug (Haltère)'],
    hyper: ['Shrug (Barre)', 'Shrug (Haltère)', 'Shrug (Machine)'],
    endu: ['Shrug (Poulie)', 'Shrug (Machine)', 'Shrug (Haltère)'],
  },
};

export const SCHEMAS = {
  force: { cle: 'force', label: 'Force', series: 5, reps: 5, repos: 180, resume: '5 × 5 · repos 3 min' },
  hyper: { cle: 'hyper', label: 'Volume', series: 4, reps: 10, repos: 90, resume: '4 × 10 · repos 1 min 30' },
  endu: { cle: 'endu', label: 'Endurance', series: 3, reps: 15, repos: 45, resume: '3 × 15 · repos 45 s' },
};

function lireStyle(n) {
  const style = /\b(endurance|endu|cardio|leger|legere|circuit|pump|tonifier|tonif\w*|seche)\b/.test(n) ? 'endu'
    : /\b(lourd|lourde|force|forte|max|maxi|puissance|strength|heavy|5x5)\b/.test(n) ? 'force'
      : 'hyper';
  const duree = /\b(court|courte|rapide|express|vite|30 ?min|20 ?min)\b/.test(n) ? 'court'
    : /\b(long|longue|complete|complet|intense|60 ?min|1h|1 ?heure)\b/.test(n) ? 'long'
      : 'normal';
  return { style, duree };
}

function nbParGroupe(nMuscles, style, duree) {
  const base = nMuscles === 1 ? 4 : nMuscles === 2 ? 3 : 2;
  let n = base;
  if (style === 'endu') n += 1;
  if (duree === 'court') n = Math.max(nMuscles === 1 ? 3 : 1, base - 1);
  if (duree === 'long') n = base + 2;
  return n;
}

function refParNom(mKey, nom) {
  const n = normNom(nom);
  const dans = (k) => {
    const liste = EXERCISES[k] || [];
    const i = liste.findIndex((e) => normNom(e.nom) === n);
    return i >= 0 ? { mKey: k, i, nom: liste[i].nom } : null;
  };
  return dans(mKey) || Object.keys(EXERCISES).reduce((trouve, k) => trouve || dans(k), null);
}

function extraireMuscles(n) {
  const ks = [];
  for (const c of COMBOS_CORPS) {
    if (c.re.test(n)) c.ks.forEach((k) => { if (!ks.includes(k)) ks.push(k); });
  }
  for (const a of MUSCLE_ALIAS) {
    if (a.re.test(n) && !ks.includes(a.k)) ks.push(a.k);
  }
  return ks;
}

export function composerSeance(phrase) {
  const n = normNom(phrase);
  const muscles = extraireMuscles(n);
  if (!muscles.length) return null;
  const veut = /\b(seance|session|workout|entrainement|entraine|train|composer)\b/.test(n)
    || /\bje (veux|vais) faire\b/.test(n)
    || /\bfais[- ]moi\b/.test(n)
    || /\b(une|la) seance\b/.test(n);
  if (!veut) return null;

  const { style, duree } = lireStyle(n);
  const schema = SCHEMAS[style];
  const parGroupe = nbParGroupe(muscles.length, style, duree);
  const refs = [];
  const vus = new Set();
  muscles.forEach((k) => {
    const liste = (PACKS[k] && PACKS[k][style]) || [];
    const mk = k === 'trapezes' ? 'trapezes' : k;
    let pris = 0;
    for (const nom of liste) {
      if (pris >= parGroupe) break;
      const r = refParNom(mk, nom);
      if (!r || vus.has(r.mKey + ':' + r.i)) continue;
      vus.add(r.mKey + ':' + r.i);
      refs.push(r);
      pris += 1;
    }
  });
  if (!refs.length) return null;

  const muscleTitre = muscles.map((k) => LABEL_MUSCLE[k] || k).join(' + ');
  const titre = style === 'hyper' ? muscleTitre : muscleTitre + ' · ' + schema.label;
  return {
    action: 'composerSeance',
    titre,
    muscles,
    style,
    duree,
    schema,
    refs: refs.map((r) => ({ mKey: r.mKey, i: r.i })),
    noms: refs.map((r) => r.nom),
    texte: titre + ' — ' + refs.length + ' exercices · ' + schema.resume + '.',
    aliments: [],
    local: true,
  };
}

/**
 * Liste de courses tiree du journal — v539, reconstruite le 22/09.
 *
 * Le code d'origine n'a jamais ete sauvegarde : le commit a91652c a
 * remplace les 317 lignes de ce fichier par le mot « placeholder », et
 * les quatre restaurations suivantes n'ont remis que des fragments.
 * La fonction est reconstruite a partir de ses tests
 * (tools/test-coach-local.mjs), qui en decrivaient le comportement
 * complet — rien n'est invente au-dela d'eux.
 *
 * Renvoie { action: 'majCourses', jours, pers, noms } :
 *   - jours : « semaine » = 7, « 3 jours » = 3 ; 7 par defaut ;
 *   - pers  : « 2 personnes » = 2 ; 1 par defaut ;
 *   - noms  : les aliments du journal, sans doublon, debarrasses de
 *     leur etat de cuisson — on achete du riz, pas du « riz cuit ».
 */
const DECLENCHEURS_COURSES = /\b(courses?|liste de courses|shopping|boodschappen)\b/;

export function proposerCourses(message, repas = []) {
  const n = normNom(String(message || ''));
  if (!DECLENCHEURS_COURSES.test(n)) return null;

  const mJours = n.match(/(\d+)\s*(jours?|j\b|dagen?|days?)/);
  const jours = mJours ? +mJours[1] : 7;       // « semaine » et defaut
  const mPers = n.match(/(\d+)\s*(personnes?|pers\b|people|personen)/);
  const pers = mPers ? +mPers[1] : 1;

  const vus = new Set();
  const noms = [];
  (repas || []).forEach((r) => {
    ((r && r.ings) || []).forEach((ing) => {
      const nom = String((ing && ing.name) || '')
        .replace(/\s*\((?:cuit|cru)[^)]*\)\s*$/i, '')
        .replace(/\s+(cuit|cuite|cuits|cuites|cru|crue|crus|crues)$/i, '')
        .trim();
      const cle = nom.toLowerCase();
      if (nom && !vus.has(cle)) { vus.add(cle); noms.push(nom); }
    });
  });

  return {
    texte: noms.length
      ? `Ta liste pour ${jours} jour${jours > 1 ? 's' : ''}${pers > 1 ? `, ${pers} personnes` : ''} : ${noms.length} article${noms.length > 1 ? 's' : ''} tires de ton journal.`
      : 'Ton journal est vide : rien a mettre dans la liste pour l\'instant.',
    aliments: [],
    action: 'majCourses',
    jours, pers, noms,
    local: true,
  };
}

export function parserLocal(message, contexte = {}) {
  const brut = String(message || '').trim();
  const n = normNom(brut);
  if (!n) return { texte: '', aliments: [], local: true };

  if (/\b(supprime|supprimer|jette|jeter|annule|annuler|abandonne|abandonner|drop|delete|weggooien)\b/.test(n)
      && /\b(seance|séance|session|workout|entrainement|entraînement)\b/.test(n)) {
    return {
      texte: 'On jette cette séance. Rien ne part au journal.',
      aliments: [],
      action: 'abandonnerSeance',
      local: true,
    };
  }

  if ((/\b(demarre|demarrer|commence|commencer|lance|lancer|start)\b/.test(n)
      && /\b(seance|séance|session|workout)\b/.test(n)
      && !extraireMuscles(n).length)
      || /\bje m.?entraine\b/.test(n)
      || /\btime to (train|workout)\b/.test(n)) {
    return {
      texte: 'On ouvre ta séance du jour.',
      aliments: [],
      action: 'demarrerSeance',
      local: true,
    };
  }

  // Les courses se testent avant la seance : « liste de courses » ne
  // contient aucun muscle, et une phrase de seance ne contient pas le
  // mot « courses » — les deux ne se marchent pas dessus.
  const courses = proposerCourses(brut, contexte.repas);
  if (courses) return courses;

  const composee = composerSeance(brut);
  const seance = composee ? null : proposerAdaptation(brut, contexte.seanceRefs);

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
    (c.extra || []).forEach((e) => { if (e.si.test(n)) push(e.aliment, e.quantite); });
  }

  const cles = Object.keys(ALIAS).sort((a, b) => b.length - a.length);
  for (const a of cles) {
    if (STOP.has(a) || skip.has(a) || a.length < 3) continue;
    if (!new RegExp('(?:^| )' + a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?: |$)').test(n)) continue;
    const cle = resoudreAliment(a);
    push(cle, extraireQuantite(n, a) || PORTION[cle] || 100);
  }

  if (composee) {
    const extra = aliments.length
      ? ' Aussi : ' + aliments.map((a) => a.aliment + ' ' + a.quantite + ' g').join(', ') + '.'
      : '';
    return { ...composee, aliments, eauLitres: eauLitres || 0, texte: composee.texte + extra };
  }

  if (seance) {
    return { texte: seance.texte, aliments, eauLitres: eauLitres || 0, seance, local: true };
  }

  if (!aliments.length && !eauLitres) {
    noterManque(brut);
    return {
      texte: "Pas trouve. Nourriture, eau, ou « j'ai mal au genou ».",
      aliments: [],
      local: true,
    };
  }

  const macros = macrosAliments(aliments);
  const bits = [];
  if (eauLitres) bits.push(String(eauLitres).replace('.', ',') + ' L d\u2019eau');
  if (aliments.length) bits.push(aliments.map((a) => a.aliment + ' ' + a.quantite + ' g').join(', '));
  let texte = 'Base BelFit : ' + bits.join(' + ') + '.';
  if (aliments.length) {
    texte += ' \u2248 ' + Math.round(macros.kcal) + ' kcal.';
    const obj = contexte.objectifs || {};
    const tot = contexte.totaux || {};
    const reste = (obj.kcal || 0) - (tot.kcal || 0) - macros.kcal;
    if (obj.kcal) {
      texte += reste > 0
        ? ' Il te resterait ' + Math.round(reste) + ' kcal.'
        : ' Ca depasse l\u2019objectif de ' + Math.round(-reste) + ' kcal.';
    }
    texte += ' Verifie puis ajoute.';
  } else texte += ' Verifie puis ajoute.';

  return {
    texte,
    aliments,
    eauLitres: eauLitres || 0,
    macros: { kcal: Math.round(macros.kcal), prot: Math.round(macros.prot), carbs: Math.round(macros.carbs), lip: Math.round(macros.lip) },
    local: true,
  };
}
