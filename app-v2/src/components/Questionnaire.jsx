import { useState, useRef, useEffect } from 'preact/hooks';
import { programmeParId } from '../data/programmes.js';
import { retourEntrainer, allerVers } from './Entrainer.jsx';
import '../legacy/quiz2.css';

// ============================================================
// « CREER MON PROGRAMME » — questionnaire v2 (valide par Raci 26/07).
// 7 questions, aucun emoji, cartes a rond de selection.
// La recommandation de programme garde la logique v1 (objectif +
// niveau + frequence -> un des 14 programmes) ; les reponses
// supplementaires composent le paragraphe de conseil du coach.
// ============================================================

const ETAPES = [
  'objectif', 'niveau',
  'taille', 'poids', 'age',
  'lieu', 'materiel',
  'frequence', 'duree',
];

// Etapes a reglette (taille / poids / age) : bornes et unite
const REGLETTES = {
  taille: { min: 120, max: 220, pas: 1, unite: 'cm', defaut: 175,
            t: 'Quelle est ta taille ?', s: 'Sert à estimer tes besoins caloriques.' },
  poids:  { min: 35, max: 200, pas: 0.1, px: 90, unite: 'kg', defaut: 75,
            t: 'Quel est ton poids ?', s: 'Ton point de départ, rien de plus.' },
  age:    { min: 14, max: 90, pas: 1, px: 40, unite: 'ans', defaut: 30,
            t: 'Quel âge as-tu ?', s: 'La récupération change avec l\u2019âge : les conseils s\u2019adaptent.' },
};

// Equipements pre-coches selon le lieu choisi
const EQUIP_PAR_LIEU = {
  'grande-salle': ['barre', 'halteres', 'machine', 'poulie', 'banc', 'traction'],
  'petite-salle': ['halteres', 'machine', 'banc'],
  'maison':       ['halteres', 'elastiques'],
  'exterieur':    ['traction'],
};

const MULTI = { materiel: true };                    // cases a cocher

const QUESTIONS = {
  objectif: {
    t: 'Ton objectif ?',
    s: 'Ce que tu veux atteindre en priorité dans les prochains mois.',
    o: [
      { v: 'masse', l: 'Prendre du muscle', n: 'Gagner en volume et en force' },
      { v: 'seche', l: 'Perdre du poids', n: 'Réduire la masse grasse' },
      { v: 'forme', l: 'Maintien', n: 'Rester en forme et entretenir' },
    ],
  },
  lieu: {
    t: 'Où t\u2019entraînes-tu ?',
    s: 'On présélectionnera le matériel correspondant à l\u2019étape suivante.',
    o: [
      { v: 'grande-salle', l: 'Grande salle de sport', n: 'Racks, barres, haltères, machines' },
      { v: 'petite-salle', l: 'Petite salle', n: 'Quelques machines et haltères' },
      { v: 'maison', l: 'À la maison', n: 'Ce que tu as chez toi' },
      { v: 'exterieur', l: 'Dehors', n: 'Parc, aire de street workout' },
    ],
  },
  materiel: {
    t: 'Ton matériel',
    s: 'Présélectionné selon ton lieu. Décoche ce que tu n\u2019as pas.',
    o: [
      { v: 'barre', l: 'Barre et disques' },
      { v: 'halteres', l: 'Haltères' },
      { v: 'machine', l: 'Machines guidées' },
      { v: 'poulie', l: 'Poulies / câbles' },
      { v: 'banc', l: 'Banc' },
      { v: 'traction', l: 'Barre de traction' },
      { v: 'elastiques', l: 'Élastiques' },
      { v: 'kettlebell', l: 'Kettlebells' },
    ],
  },
  niveau: {
    t: 'Ton niveau ?',
    s: 'Sois honnête : un programme trop dur est un programme abandonné.',
    o: [
      { v: 'debutant', l: 'Je débute', n: 'Jamais ou presque' },
      { v: 'intermediaire', l: 'Je m\u2019entraîne de temps en temps', n: 'Sans vraie régularité' },
      { v: 'confirme', l: 'Je m\u2019entraîne régulièrement', n: 'Depuis plus d\u2019un an' },
    ],
  },
  frequence: {
    t: 'Combien de jours par semaine ?',
    s: 'Le nombre de séances que tu peux vraiment tenir.',
    o: [
      { v: '2', l: '2 jours' }, { v: '3', l: '3 jours' }, { v: '4', l: '4 jours' },
      { v: '5', l: '5 jours' }, { v: '6', l: '6 jours' }, { v: '7', l: '7 jours' },
    ],
  },
  duree: {
    t: 'Combien de temps par séance ?',
    s: 'Hors cardio : ce temps ne compte que la musculation.',
    o: [
      { v: '30-45', l: '30 à 45 minutes' },
      { v: '45-60', l: '45 à 60 minutes' },
      { v: '60-75', l: '60 à 75 minutes' },
      { v: '75-90', l: '75 à 90 minutes' },
    ],
  },
};

/** Recommandation : logique v1 (test.html) inchangee. 7 jours -> 6. */
function recommander({ objectif, niveau, frequence }) {
  const jours = Math.min(6, parseInt(frequence, 10) || 3);
  let conseil = '';
  let progId;

  if (objectif === 'masse') {
    const debMasse = "Pour débuter la prise de masse, un corps complet 3 jours donne souvent les meilleurs résultats : plus de récupération, une meilleure technique. On te conseille de commencer là — mais c'est toi qui choisis, voici le programme que tu as demandé.";
    if (niveau === 'debutant' && jours === 3) {
      progId = 'deb-full-3j';
      conseil = "Pour débuter, un corps complet 3 jours est la meilleure base : tu construiras du muscle en apprenant la technique. Mange en léger surplus calorique pour la prise de masse.";
    } else if (jours <= 2) {
      progId = 'masse-2j';
      conseil = (niveau === 'debutant')
        ? "2 jours par semaine, c'est un rythme parfait pour débuter sans se blesser. Mieux vaut 2 séances tenues que 5 abandonnées — la régularité prime."
        : "2 jours par semaine, c'est un rythme tenable sur le long terme. Avec un programme bien construit, tu peux quand même progresser — la régularité prime.";
    } else if (jours >= 5) {
      progId = 'masse-5j';
      if (niveau === 'debutant') conseil = debMasse;
    } else if (jours === 4) {
      progId = 'masse-4j';
      if (niveau === 'debutant') conseil = debMasse;
    } else {
      progId = 'masse-3j';
    }
  } else if (objectif === 'seche') {
    if (jours <= 2) {
      progId = 'seche-2j';
      conseil = "2 jours, c'est un bon début. En perte de poids, ce que tu manges compte autant que l'entraînement : soigne ton alimentation et reste actif au quotidien (marche, escaliers).";
    } else if (jours === 3) { progId = 'seche-full-3j'; }
    else if (jours === 4) { progId = 'seche-circuit-4j'; }
    else if (jours === 5) { progId = 'seche-5j'; }
    else {
      progId = 'seche-6j';
      conseil = (niveau === 'debutant')
        ? "6 jours c'est ambitieux ! Possible, mais en perte de poids attention à garder ton muscle : mange assez de protéines, dors bien, et écoute ton corps. Si c'est trop, réduis sans culpabiliser."
        : "6 jours par semaine, c'est intense. Assure-toi de bien récupérer et de manger suffisamment de protéines pour ne pas perdre de muscle pendant ta sèche.";
    }
  } else {
    const debSalle = "Pour débuter, 3 séances corps complet par semaine suffisent largement à progresser vite, avec assez de repos. On te conseille de commencer là — mais tu choisis, voici ton programme.";
    if (niveau === 'debutant' && jours <= 2) { progId = 'deb-2j'; }
    else if (niveau === 'debutant' && jours === 3) { progId = 'deb-full-3j'; }
    else if (jours >= 6) { progId = 'salle-ppl-6j'; if (niveau === 'debutant') conseil = debSalle; }
    else if (jours >= 4) { progId = 'salle-half-4j'; if (niveau === 'debutant') conseil = debSalle; }
    else { progId = 'salle-ppl-3j'; }
  }

  if (jours <= 2 && !conseil) {
    conseil = "2 jours par semaine, c'est un rythme tenable sur le long terme. La régularité bat l'intensité.";
  }

  let desc;
  if (objectif === 'masse') desc = 'Construis du muscle avec un programme structuré et une progression régulière sur les charges.';
  else if (objectif === 'seche') desc = 'Brûle des calories avec des séances dynamiques qui combinent musculation et cardio.';
  else desc = 'Reprends en douceur avec des séances complètes et progressives pour tout le corps.';

  return { progId, conseil, desc, jours };
}

/**
 * Conseils composes a partir des reponses supplementaires : temps de
 * repos cales sur la duree voulue, recuperation selon l'age, materiel
 * disponible, priorite, et le cas 7 jours. C'est ce qui rend le
 * resultat reellement personnel.
 */
function conseilsPersonnels(r) {
  const out = [];

  if (r.duree === '30-45') {
    out.push("Pour tenir 30 à 45 minutes, garde 45 secondes de repos sur les exercices légers et enchaîne deux exercices d\u2019affilée quand tu peux. Le chrono de l\u2019app t\u2019aide à ne pas déborder.");
  } else if (r.duree === '45-60') {
    out.push("Sur 45 à 60 minutes, vise 1 min 15 de repos sur l\u2019isolation et 2 minutes sur les exercices classiques. Lance le chrono à chaque fin de série.");
  } else if (r.duree === '60-75' || r.duree === '75-90') {
    out.push("Tu as le temps de bien récupérer : 3 minutes sur les mouvements lourds (squat, développé, soulevé de terre), 2 minutes sur les classiques, 1 min 15 sur l\u2019isolation.");
  }

  const age = Number(r.age) || 0;
  if (age >= 45) {
    out.push("Passé 45 ans, l\u2019échauffement n\u2019est pas optionnel : 8 à 10 minutes avant de charger, et garde un jour de repos entre deux séances lourdes. Tes épaules et tes genoux te remercieront.");
  } else if (age >= 35) {
    out.push("Entre 35 et 44 ans, la récupération reste bonne mais l\u2019échauffement devient important : cinq minutes avant de charger, et surveille ton sommeil.");
  } else if (age > 0 && age < 25) {
    out.push("À ton âge la récupération est excellente : tu peux tenir une fréquence élevée. Le vrai risque, c\u2019est la technique bâclée pour charger plus vite — ne brûle pas les étapes.");
  }

  const m = r.materiel || [];
  if (m.length === 0) {
    out.push("Au poids du corps, la progression passe par la difficulté du mouvement et le tempo plutôt que par la charge : ralentis la descente, resserre les appuis, augmente les répétitions.");
  } else if (!m.includes('machine') && !m.includes('poulie')) {
    out.push("Sans machines, remplace chaque exercice guidé du programme par sa variante libre : mêmes muscles, plus de gainage.");
  }

  if (r.frequence === '7') {
    out.push("Sept jours d\u2019affilée, c\u2019est trop pour de la musculation pure. On te donne le programme le plus dense, et on te conseille de compléter par une ou deux journées légères : marche rapide, vélo, mobilité. Le muscle pousse pendant le repos.");
  }

  return out;
}

export function Questionnaire() {
  const [reponses, setReponses] = useState({ materiel: [], taille: 175, poids: 75, age: 30 });
  const [i, setI] = useState(0);
  const total = ETAPES.length;
  const surResultat = i >= total;
  const etape = ETAPES[i];
  const pct = surResultat ? 100 : ((i + 1) / total) * 100;

  const valeur = reponses[etape];
  const repondu = REGLETTES[etape] ? true
    : (MULTI[etape] ? (valeur || []).length > 0 : !!valeur);

  const choisir = (v) => {
    if (etape === 'lieu') {
      // Le lieu presele le materiel : l'utilisateur n'a plus qu'a decocher.
      setReponses(r => ({ ...r, lieu: v, materiel: [...(EQUIP_PAR_LIEU[v] || [])] }));
      return;
    }
    if (!MULTI[etape]) { setReponses(r => ({ ...r, [etape]: v })); return; }
    setReponses(r => {
      const liste = r[etape] || [];
      const excl = [];
      let suite;
      if (liste.includes(v)) suite = liste.filter(x => x !== v);
      else if (excl.includes(v)) suite = [v];
      else suite = [...liste.filter(x => !excl.includes(x)), v];
      return { ...r, [etape]: suite };
    });
  };
  const estChoisi = (v) => (MULTI[etape] ? (valeur || []).includes(v) : valeur === v);

  const [calcul, setCalcul] = useState(0);   // 0 = non, 1..100 = %
  const suivant = () => {
    if (i === total - 1) {
      // Cinematique avant le resultat : progression reguliere,
      // textes decrivant ce que le code fait reellement.
      // 4 tours d'anneau (demande Raci) : noir, rouge, jaune, dore —
      // le B tricolore puis l'or. ~0,9 s par tour.
      setCalcul(1);
      const debut = Date.now();
      const it = setInterval(() => {
        const p = Math.min(300, Math.round((Date.now() - debut) / 24));
        setCalcul(p);
        if (p >= 300) { clearInterval(it); setTimeout(() => { setCalcul(0); setI(x => x + 1); }, 420); }
      }, 40);
      return;
    }
    setI(x => x + 1);
  };
  const retour = () => { if (i === 0) retourEntrainer(); else setI(x => x - 1); };
  const refaire = () => { setReponses({ materiel: [] }); setI(0); };

  // ---------- Cinematique ----------
  if (calcul > 0) {
    // 3 tours (Raci, version definitive) : l'ARC change de couleur a
    // chaque tour — il se remplit en NOIR, puis en ROUGE par-dessus le
    // noir, puis en JAUNE par-dessus le rouge, et le resultat suit.
    const COULEURS = ['#1F1F1F', 'var(--alerte)', 'var(--or)'];
    const tour = Math.min(2, Math.floor((calcul - 1) / 100));
    const dansTour = Math.min(100, calcul - tour * 100);
    const arc = COULEURS[tour];
    const piste = tour === 0 ? '#EFEBE2' : COULEURS[tour - 1];
    const TEXTES = [
      'Analyse de tes réponses…',
      'Choix du programme adapté…',
      'Calage de tes temps de repos…',
    ];
    const R = 62, C = 2 * Math.PI * R;
    return (
      <div class="qz qz--calc">
        <div class="qz-calc">
          <div class="qz-calc-anneau">
            <svg viewBox="0 0 150 150">
              <circle cx="75" cy="75" r={R} fill="none"
                stroke={piste} stroke-width="9" />
              <circle cx="75" cy="75" r={R} fill="none" stroke={arc} stroke-width="9"
                stroke-linecap="round" transform="rotate(-90 75 75)"
                stroke-dasharray={`${(dansTour / 100 * C).toFixed(1)} ${C.toFixed(1)}`} />
            </svg>
            <div class="qz-calc-pct">{Math.round(calcul / 3)}<span>%</span></div>
          </div>
          <div class="qz-calc-txt" key={tour}
            style={{ color: ['#1F1F1F', 'var(--alerte)', '#C98A00'][tour] }}>
            {TEXTES[tour]}
          </div>
        </div>
      </div>
    );
  }

  // ---------- Resultat ----------
  if (surResultat) {
    const { progId, conseil, desc } = recommander(reponses);
    const prog = programmeParId(progId);
    const perso = conseilsPersonnels(reponses);
    const objTxt = reponses.objectif === 'masse' ? 'prendre du muscle'
      : (reponses.objectif === 'seche' ? 'perdre du poids' : 'maintenir ta forme');
    const dureeTxt = 'en séances de ' + String(reponses.duree || '45-60').replace('-', ' à ') + ' minutes';

    return (
      <div class="qz">
        <div class="qz-haut">
          <button class="qz-retour" onClick={retour} aria-label="Retour">
            <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <span class="qz-pas">Terminé</span>
        </div>
        <div class="qz-barre"><i style={{ width: '100%' }} /></div>

        <div class="qz-corps">
          <div class="qz-badge">Ton programme</div>
          <h1 class="qz-titre">{prog ? prog.name : '—'}</h1>
          <p class="qz-sous">
            Tu veux {objTxt}, {reponses.frequence} jours par semaine, {dureeTxt}.
          </p>

          <div class="qz-carte">
            <p class="qz-desc">{desc}</p>
            <div class="qz-stats">
              <span><b>{prog ? prog.duree : '—'}</b><small>durée</small></span>
              <span><b>{prog ? prog.niveau : '—'}</b><small>niveau</small></span>
              <span><b>{prog ? prog.seances.length : 0}</b><small>séances</small></span>
            </div>
          </div>

          {(conseil || perso.length > 0) && (
            <div class="qz-coach">
              <div class="qz-coach-tit">Les conseils de ton coach</div>
              {conseil && <p>{conseil}</p>}
              {perso.map((c, k) => <p key={k}>{c}</p>)}
            </div>
          )}

          {prog && (
            <div class="qz-seances">
              <div class="qz-seances-tit">Tes séances</div>
              {prog.seances.map((s, k) => (
                <div class="qz-seance" key={k}><span>{k + 1}</span>{s.titre}</div>
              ))}
            </div>
          )}
        </div>

        <div class="qz-pied">
          <button class="qz-btn" onClick={() => allerVers('programmes', { prog: progId })}>
            Voir ce programme
          </button>
          <button class="qz-lien" onClick={refaire}>Refaire le test</button>
        </div>
      </div>
    );
  }

  // ---------- Questions ----------
  const rg = REGLETTES[etape];
  const q = rg ? { t: rg.t, s: rg.s, o: [] } : QUESTIONS[etape];
  // La duree ideale depend de l'objectif (table de Raci) :
  // masse -> 60-75 ; seche et maintien -> 45-60.
  const dureeIdeale = reponses.objectif === 'masse' ? '60-75' : '45-60';
  return (
    <div class="qz">
      <div class="qz-haut">
        <button class="qz-retour" onClick={retour} aria-label="Retour">
          <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <span class="qz-pas">{i + 1} / {total}</span>
      </div>
      <div class="qz-barre"><i style={{ width: pct + '%' }} /></div>

      <div class="qz-corps">
        <h1 class="qz-titre">{q.t}</h1>
        <p class="qz-sous">{q.s}</p>

        {rg && (
          <Reglette
            key={etape}
            min={rg.min} max={rg.max} pas={rg.pas} unite={rg.unite} px={rg.px}
            valeur={reponses[etape] ?? rg.defaut}
            onChange={(v) => setReponses(r => ({ ...r, [etape]: v }))}
          />
        )}

        {!rg && <div class="qz-options">
          {q.o.map(o => (
            <button
              key={o.v}
              class={'qz-opt' + (estChoisi(o.v) ? ' choisi' : '')}
              onClick={() => choisir(o.v)}
            >
              <span class="qz-opt-tx">
                <span class="qz-opt-lb">{o.l}
                  {etape === 'duree' && o.v === dureeIdeale && <i class="qz-ideal">Idéal pour ton objectif</i>}
                </span>
                {o.n && <span class="qz-opt-note">{o.n}</span>}
              </span>
              <span class="qz-rond">
                <svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
              </span>
            </button>
          ))}
        </div>}
      </div>

      <div class="qz-pied">
        <button class="qz-btn" disabled={!repondu} onClick={suivant}>
          {i === total - 1 ? 'Voir mon programme' : 'Continuer'}
        </button>
      </div>
    </div>
  );
}
