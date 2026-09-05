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

// QUATRE questions. Wording et choix dictes par Raci le 12/08.
//
// Il y en avait neuf : taille, poids, age, lieu et duree ont ete
// retires. Verification faite avant de les retirer, ces cinq
// reponses n'alimentaient QUE les paragraphes de conseil — aucune ne
// participait au choix du programme (objectif + niveau + frequence)
// ni aux besoins caloriques, qui sont poses ailleurs, dans Besoins.
// Le lieu ne servait qu'a precocher le materiel : la question 4 le
// demande maintenant directement.
// Duree du tour d'anneau, en ms. Raci le veut entre 2000 et 3000
// (5/09) : au-dela l'attente se voit, en deca les trois messages ne
// se lisent pas.
const DUREE_TOUR = 2600;

const ETAPES = ['objectif', 'niveau', 'frequence', 'materiel'];

// Etapes a reglette (taille / poids / age) : bornes et unite


// Plus aucune question a choix multiple : le materiel est passe a un
// choix unique le 12/08, et c'etait la seule.
const MULTI = {};

const QUESTIONS = {
  objectif: {
    t: 'Quel est ton objectif principal ?',
    s: 'Ce que tu veux atteindre en priorité dans les prochains mois.',
    o: [
      { v: 'masse', l: 'Prise de muscle' },
      { v: 'seche', l: 'Perte de gras' },
      // « Force / Performance » est un objectif nouveau : la
      // bibliotheque ne contient aucun programme de force. Il ouvre
      // donc les programmes de prise de muscle, batis sur les memes
      // mouvements lourds. C'est un pis-aller assume, pas une
      // equivalence — a lever le jour ou des programmes de force
      // existeront.
      { v: 'force', l: 'Force / Performance' },
      { v: 'forme', l: 'Forme générale / Santé' },
    ],
  },
  // Un seul choix, la ou c'etait huit cases a cocher. Chaque option
  // porte l'equipement qu'elle implique : le filtrage des exercices
  // d'isolation et les conseils continuent de lire une LISTE, ils
  // n'ont pas eu a changer.
  materiel: {
    t: 'Avec quel matériel t\u2019entraînes-tu ?',
    s: 'Ce dont tu disposes vraiment, la plupart du temps.',
    o: [
      { v: 'salle', l: 'Salle de sport complète', n: 'Barres, haltères, machines, poulies' },
      { v: 'maison', l: 'Haltères + banc (maison)' },
      { v: 'poids-corps', l: 'Poids du corps uniquement' },
      { v: 'limite', l: 'Équipement limité', n: 'Élastiques, kettlebell…' },
    ],
  },
  niveau: {
    t: 'Quel est ton niveau actuel ?',
    s: 'Sois honnête : un programme trop dur est un programme abandonné.',
    o: [
      { v: 'debutant', l: 'Débutant', n: 'Moins d\u2019un an d\u2019expérience' },
      { v: 'intermediaire', l: 'Intermédiaire', n: '1 à 3 ans' },
      { v: 'confirme', l: 'Avancé', n: 'Plus de 3 ans' },
    ],
  },
  frequence: {
    t: 'Combien de jours par semaine peux-tu t\u2019entraîner ?',
    s: 'Le nombre de séances que tu peux vraiment tenir.',
    o: [
      { v: '2', l: '2 jours' }, { v: '3', l: '3 jours' }, { v: '4', l: '4 jours' },
      { v: '5', l: '5 jours' }, { v: '6', l: '6 jours' },
    ],
  },
};

/** Recommandation : logique v1 (test.html) inchangee. 7 jours -> 6. */
// Chaque option de materiel porte l'equipement qu'elle implique. Le
// reste du code lit une LISTE de materiels : cette table evite d'avoir
// a le changer, et garde le filtrage des exercices d'isolation.
export const MATERIEL_PAR_CHOIX = {
  'salle':       ['barre', 'halteres', 'machine', 'poulie', 'banc', 'traction'],
  'maison':      ['halteres', 'banc'],
  'poids-corps': [],
  'limite':      ['elastiques', 'kettlebell'],
};
/** La liste d'equipements, quel que soit le format de la reponse. */
export function materielsDe(rep) {
  if (Array.isArray(rep)) return rep;                 // ancienne forme
  return MATERIEL_PAR_CHOIX[rep] || [];
}

function recommander({ objectif, niveau, frequence }) {
  const jours = Math.min(6, parseInt(frequence, 10) || 3);
  let conseil = '';
  let progId;

  // « Force / Performance » n'a pas de programmes a lui : la
  // bibliotheque n'en contient aucun. Il emprunte ceux de prise de
  // muscle, batis sur les memes mouvements lourds. Assume et ecrit ici
  // plutot que dissimule dans une egalite silencieuse.
  if (objectif === 'force') objectif = 'masse';

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

  // Les conseils qui dependaient de la duree et de l'age ont ete
  // retires avec leurs questions, le 12/08. Plutot que de laisser des
  // branches mortes qui ne se declencheraient plus jamais, le conseil
  // sur les temps de repos se cale sur le NIVEAU, qu'on demande
  // toujours. Aucune donnee inventee : seulement une reponse qu'on a.
  if (r.niveau === 'debutant') {
    out.push("Sur les temps de repos, vise 1 min 30 entre les séries : assez pour récupérer, assez court pour rester dans la séance. Le chrono de l\u2019app se lance à chaque fin de série.");
  } else if (r.niveau === 'confirme') {
    out.push("Sur les mouvements lourds — squat, développé, soulevé de terre — prends 3 minutes de repos, tu chargeras plus. 1 min 15 suffit sur l\u2019isolation.");
  } else {
    out.push("Vise 2 minutes de repos sur les exercices classiques et 1 min 15 sur l\u2019isolation. Lance le chrono à chaque fin de série plutôt que de compter dans ta tête.");
  }

  const m = materielsDe(r.materiel);
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
  // Plus de valeurs de reglette : ces trois questions ont quitte le
  // questionnaire le 12/08. Elles restent posees dans « Tes besoins »,
  // ou elles servent reellement au calcul calorique.
  const [reponses, setReponses] = useState({});
  const [i, setI] = useState(0);
  const total = ETAPES.length;
  const surResultat = i >= total;
  const etape = ETAPES[i];
  const pct = surResultat ? 100 : ((i + 1) / total) * 100;

  const valeur = reponses[etape];
  const repondu = MULTI[etape] ? (valeur || []).length > 0 : !!valeur;

  const choisir = (v) => {
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
      // Raci, 5/09 : « reduis le temps, fais juste un tour ». Trois
      // tours a 0,9 s faisaient 7,2 s d'attente pour un calcul
      // instantane. Un seul tour de 2,6 s : assez pour que les trois
      // messages se lisent, assez court pour ne pas peser.
      setCalcul(1);
      const debut = Date.now();
      const it = setInterval(() => {
        const p = Math.min(100, Math.round((Date.now() - debut) / DUREE_TOUR * 100));
        setCalcul(p);
        if (p >= 100) { clearInterval(it); setTimeout(() => { setCalcul(0); setI(x => x + 1); }, 320); }
      }, 40);
      return;
    }
    setI(x => x + 1);
  };
  const retour = () => { if (i === 0) retourEntrainer(); else setI(x => x - 1); };
  const refaire = () => { setReponses({ materiel: [] }); setI(0); };

  // ---------- Cinematique ----------
  if (calcul > 0) {
    // Un seul tour, arc en degrade tricolore BelFit — jaune, orange,
    // rouge, les trois couleurs du logo dans l'ordre du B (Raci,
    // 5/09). Les tours qui changeaient de couleur l'un apres l'autre
    // demandaient trois tours pour montrer la palette ; le degrade la
    // montre en un seul.
    const TEXTES = [
      'Analyse de tes réponses…',
      'Choix du programme adapté…',
      'Calage de tes temps de repos…',
    ];
    const etape = Math.min(2, Math.floor(calcul / 34));
    const R = 62, C = 2 * Math.PI * R;
    return (
      <div class="qz qz--calc">
        <div class="qz-calc">
          <div class="qz-calc-anneau">
            <svg viewBox="0 0 150 150">
              <defs>
                <linearGradient id="qzArc" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stop-color="#FAC408" />
                  <stop offset="50%" stop-color="#F86A0C" />
                  <stop offset="100%" stop-color="#D71016" />
                </linearGradient>
              </defs>
              <circle cx="75" cy="75" r={R} fill="none"
                stroke="#EFEBE2" stroke-width="9" />
              <circle cx="75" cy="75" r={R} fill="none" stroke="url(#qzArc)" stroke-width="9"
                stroke-linecap="round" transform="rotate(-90 75 75)"
                stroke-dasharray={`${(calcul / 100 * C).toFixed(1)} ${C.toFixed(1)}`} />
            </svg>
            <div class="qz-calc-pct">{calcul}<span>%</span></div>
          </div>
          {/* Le texte reste noir : le jaune et l'orange du degrade sont
              des remplissages, jamais de l'ecriture — 1,7:1 sur le
              creme. */}
          <div class="qz-calc-txt" key={etape} style={{ color: '#1F1F1F' }}>
            {TEXTES[etape]}
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
      : reponses.objectif === 'seche' ? 'perdre du poids'
      : reponses.objectif === 'force' ? 'gagner en force'
      : 'maintenir ta forme';
    // La duree n'est plus demandee (questionnaire ramene a quatre
    // questions le 12/08). La phrase reprend le MATERIEL a la place :
    // repeter « 2 jours par semaine, a raison de 2 seances par
    // semaine » disait deux fois la meme chose.
    const MAT_TXT = {
      'salle': ' en salle', 'maison': ' avec haltères et banc',
      'poids-corps': ' au poids du corps', 'limite': ' avec un équipement limité',
    };
    const materielTxt = MAT_TXT[reponses.materiel] || '';

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
            Tu veux {objTxt}, {reponses.frequence} jours par semaine{materielTxt}.
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

        {/* Le questionnaire mene DIRECTEMENT au choix des jours.
            Raci le 10/08 : « l'application ne cree pas un programme
            sur plusieurs jours ». Le programme en couvrait bien
            plusieurs — verifie, lundi/mercredi/vendredi semaine apres
            semaine — mais le chemin pour l'adopter passait par la
            fiche puis « Choisir ce programme », deux ecrans plus
            loin. Personne ne les trouvait. Repondre a neuf questions
            doit deboucher sur un programme pose au calendrier, pas
            sur une fiche a lire. */}
        <div class="qz-pied">
          <button class="qz-btn" onClick={() => allerVers('planifier', { prog: progId })}>
            Choisir mes jours
          </button>
          <button class="qz-lien" onClick={() => allerVers('programmes', { prog: progId })}>
            Voir le détail du programme
          </button>
          <button class="qz-lien" onClick={refaire}>Refaire le test</button>
        </div>
      </div>
    );
  }

  // ---------- Questions ----------
  const q = QUESTIONS[etape];
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

        <div class="qz-options">
          {q.o.map(o => (
            <button
              key={o.v}
              class={'qz-opt' + (estChoisi(o.v) ? ' choisi' : '')}
              onClick={() => choisir(o.v)}
            >
              <span class="qz-opt-tx">
                <span class="qz-opt-lb">{o.l}</span>
                {o.n && <span class="qz-opt-note">{o.n}</span>}
              </span>
              <span class="qz-rond">
                <svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
              </span>
            </button>
          ))}
        </div>
      </div>

      <div class="qz-pied">
        <button class="qz-btn" disabled={!repondu} onClick={suivant}>
          {i === total - 1 ? 'Voir mon programme' : 'Continuer'}
        </button>
      </div>
    </div>
  );
}
