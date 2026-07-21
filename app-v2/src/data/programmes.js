// Programmes d'entrainement BelFit — copie EXACTE de programmes.html (v1).
// Structure : { categorie: [ {id, tag?, badge, name, desc, duree, niveau, lieu?, seances:[{titre,sub}]} ] }

export const PROGRAMMES = {
    masse: [
        {
            tag:'Le plus populaire', id:'masse-3j', badge:'3 jours/semaine', name:'Prise de masse — 3 jours',
            desc:'Le classique pour construire du muscle. La base solide pour progresser.',
            duree:'8 semaines', niveau:'Intermédiaire',
            seances:[
                {titre:'Jour 1 — Pecs / Triceps', sub:'6 exercices · ~60 min'},
                {titre:'Jour 2 — Dos / Biceps', sub:'6 exercices · ~60 min'},
                {titre:'Jour 3 — Jambes / Épaules', sub:'6 exercices · ~65 min'},
            ]
        },
        {
            id:'masse-4j', badge:'4 jours/semaine', name:'Prise de masse — 4 jours',
            desc:'Plus de volume par muscle pour progresser plus vite. Pour pratiquants réguliers.',
            duree:'10 semaines', niveau:'Confirmé',
            seances:[
                {titre:'Jour 1 — Pecs', sub:'5 exercices · ~55 min'},
                {titre:'Jour 2 — Dos', sub:'5 exercices · ~55 min'},
                {titre:'Jour 3 — Jambes', sub:'5 exercices · ~60 min'},
                {titre:'Jour 4 — Épaules / Bras', sub:'6 exercices · ~55 min'},
            ]
        },
        {
            tag:'Volume maximal', id:'masse-5j', badge:'5 jours/semaine', name:'Prise de masse — 5 jours (split)',
            desc:'Un muscle par jour pour un volume maximal. Pour les confirmés qui veulent pousser fort.',
            duree:'12 semaines', niveau:'Confirmé',
            seances:[
                {titre:'Jour 1 — Pecs', sub:'5 exercices · ~55 min'},
                {titre:'Jour 2 — Dos', sub:'5 exercices · ~60 min'},
                {titre:'Jour 3 — Jambes', sub:'6 exercices · ~65 min'},
                {titre:'Jour 4 — Épaules', sub:'5 exercices · ~50 min'},
                {titre:'Jour 5 — Bras (biceps/triceps)', sub:'6 exercices · ~50 min'},
            ]
        },
        {
            id:'masse-2j', badge:'2 jours/semaine', name:'Prise de masse — 2 jours',
            desc:'Deux séances haut/bas par semaine. Un rythme tenable pour progresser même avec peu de temps.',
            duree:'8 semaines', niveau:'Intermédiaire',
            seances:[
                {titre:'Jour 1 — Haut du corps', sub:'7 exercices · ~60 min'},
                {titre:'Jour 2 — Bas du corps', sub:'6 exercices · ~55 min'},
            ]
        },
        {
            id:'salle-ppl-3j', badge:'3 jours/semaine', name:'Push / Pull / Legs',
            desc:'Le grand classique en salle : pousser, tirer, jambes. Efficace et structuré.',
            duree:'10 semaines', niveau:'Intermédiaire',
            seances:[
                {titre:'Push — Pecs / Épaules / Triceps', sub:'6 exercices · ~60 min'},
                {titre:'Pull — Dos / Biceps', sub:'6 exercices · ~60 min'},
                {titre:'Legs — Jambes complètes', sub:'6 exercices · ~65 min'},
            ]
        },
        {
            id:'salle-half-4j', badge:'4 jours/semaine', name:'Half body',
            desc:'Le corps en deux moitiés, travaillées deux fois par semaine. Bon compromis volume/récup.',
            duree:'10 semaines', niveau:'Intermédiaire',
            seances:[
                {titre:'Jour 1 — Haut du corps', sub:'6 exercices · ~60 min'},
                {titre:'Jour 2 — Bas du corps', sub:'6 exercices · ~60 min'},
                {titre:'Jour 3 — Haut du corps', sub:'6 exercices · ~60 min'},
                {titre:'Jour 4 — Bas du corps', sub:'6 exercices · ~60 min'},
            ]
        },
        {
            id:'salle-ppl-6j', badge:'6 jours/semaine', name:'Push / Pull / Legs ×2',
            desc:'Push/Pull/Legs répété deux fois par semaine. Pour les confirmés très assidus.',
            duree:'12 semaines', niveau:'Confirmé',
            seances:[
                {titre:'Jour 1 — Push', sub:'6 exercices · ~60 min'},
                {titre:'Jour 2 — Pull', sub:'6 exercices · ~60 min'},
                {titre:'Jour 3 — Legs', sub:'6 exercices · ~65 min'},
                {titre:'Jour 4 — Push', sub:'6 exercices · ~60 min'},
                {titre:'Jour 5 — Pull', sub:'6 exercices · ~60 min'},
                {titre:'Jour 6 — Legs', sub:'6 exercices · ~65 min'},
            ]
        },
    ],
    forme: [
        {
            tag:'Le plus populaire', id:'deb-full-3j', badge:'3 jours/semaine', name:'Full body',
            desc:'Tout le corps à chaque séance. La meilleure façon de démarrer la musculation en douceur.',
            duree:'6 semaines', niveau:'Débutant',
            seances:[
                {titre:'Séance A — Corps complet', sub:'5 exercices · ~50 min'},
                {titre:'Séance B — Corps complet', sub:'5 exercices · ~50 min'},
                {titre:'Séance C — Corps complet', sub:'5 exercices · ~50 min'},
            ]
        },
        {
            id:'deb-2j', badge:'2 jours/semaine', name:'Remise en route',
            desc:'Deux séances par semaine pour reprendre le sport sans se blesser. Parfait pour bien commencer.',
            duree:'4 semaines', niveau:'Débutant',
            seances:[
                {titre:'Séance A — Haut du corps', sub:'5 exercices · ~40 min'},
                {titre:'Séance B — Bas du corps + gainage', sub:'5 exercices · ~40 min'},
            ]
        },
    ],
    seche: [
        {
            tag:'Le plus équilibré', id:'seche-full-3j', badge:'3 jours/semaine', name:'Perte de poids — Full body',
            desc:'Des séances complètes et dynamiques qui brûlent un maximum de calories.',
            duree:'8 semaines', niveau:'Intermédiaire',
            seances:[
                {titre:'Séance A — Full body + cardio', sub:'7 exercices · ~50 min'},
                {titre:'Séance B — Full body + cardio', sub:'7 exercices · ~50 min'},
                {titre:'Séance C — Full body + cardio', sub:'7 exercices · ~50 min'},
            ]
        },
        {
            id:'seche-circuit-4j', badge:'4 jours/semaine', name:'Perte de poids — 4 jours',
            desc:'Quatre séances qui combinent renforcement et cardio pour fondre plus vite.',
            duree:'8 semaines', niveau:'Intermédiaire',
            seances:[
                {titre:'Jour 1 — Haut du corps', sub:'6 exercices · ~45 min'},
                {titre:'Jour 2 — Bas du corps', sub:'6 exercices · ~45 min'},
                {titre:'Jour 3 — Full body', sub:'6 exercices · ~50 min'},
                {titre:'Jour 4 — Cardio + abdos', sub:'5 exercices · ~40 min'},
            ]
        },
        {
            id:'seche-2j', badge:'2 jours/semaine', name:'Perte de poids — 2 jours',
            desc:'Deux séances full body par semaine pour relancer la machine. Idéal pour reprendre en douceur.',
            duree:'8 semaines', niveau:'Débutant',
            seances:[
                {titre:'Séance A — Full body + cardio', sub:'6 exercices · ~45 min'},
                {titre:'Séance B — Full body + cardio', sub:'6 exercices · ~45 min'},
            ]
        },
        {
            id:'seche-5j', badge:'5 jours/semaine', name:'Perte de poids — 5 jours',
            desc:'Un rythme soutenu qui combine musculation et cardio pour maximiser la dépense.',
            duree:'10 semaines', niveau:'Confirmé',
            seances:[
                {titre:'Jour 1 — Haut du corps', sub:'5 exercices · ~45 min'},
                {titre:'Jour 2 — Bas du corps', sub:'5 exercices · ~45 min'},
                {titre:'Jour 3 — Full body', sub:'6 exercices · ~50 min'},
                {titre:'Jour 4 — Cardio + abdos', sub:'5 exercices · ~45 min'},
                {titre:'Jour 5 — HIIT + gainage', sub:'5 exercices · ~40 min'},
            ]
        },
        {
            id:'seche-6j', badge:'6 jours/semaine', name:'Perte de poids — 6 jours',
            desc:'Programme intense pour les confirmés qui veulent pousser fort. Récupération et nutrition essentielles.',
            duree:'12 semaines', niveau:'Confirmé',
            seances:[
                {titre:'Jour 1 — Haut du corps', sub:'5 exercices · ~45 min'},
                {titre:'Jour 2 — Bas du corps', sub:'5 exercices · ~45 min'},
                {titre:'Jour 3 — Full body', sub:'6 exercices · ~50 min'},
                {titre:'Jour 4 — Cardio + abdos', sub:'5 exercices · ~45 min'},
                {titre:'Jour 5 — HIIT', sub:'5 exercices · ~40 min'},
                {titre:'Jour 6 — Gainage + mobilité', sub:'5 exercices · ~35 min'},
            ]
        },
    ],
};

// Objectif d'abord, niveau ensuite : le Full body debutant (range dans "forme")
// sert aussi la prise de muscle. Reproduit la ligne push du v1.
const _fb = PROGRAMMES.forme && PROGRAMMES.forme.find(p => p.id === 'deb-full-3j');
if (_fb && PROGRAMMES.masse && !PROGRAMMES.masse.some(p => p.id === 'deb-full-3j')) {
  PROGRAMMES.masse.push(_fb);
}

// Categories affichees (ecran 1), avec emoji + libelles du v1.
export const CATEGORIES = [
  { k: 'masse', emoji: '\u{1F4AA}', name: 'Prendre du muscle', sub: 'Construire du muscle visible, semaine après semaine' },
  { k: 'seche', emoji: '\u{1F525}', name: 'Perdre du poids', sub: 'Brûler du gras sans sacrifier ton muscle' },
  { k: 'forme', emoji: '\u{26A1}', name: 'Me remettre en forme', sub: 'Reprendre le sport en douceur, sans te blesser' },
].filter(c => PROGRAMMES[c.k] && PROGRAMMES[c.k].length);

export function programmeParId(id) {
  for (const cat of Object.keys(PROGRAMMES)) {
    const p = PROGRAMMES[cat].find(x => x.id === id);
    if (p) return p;
  }
  return null;
}
