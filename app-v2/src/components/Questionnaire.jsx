import { useState } from 'preact/hooks';
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

const ETAPES = ['age', 'objectif', 'materiel', 'niveau', 'frequence', 'duree', 'priorite'];

const MULTI = { materiel: true };                    // cases a cocher
const EXCLUSIF = { materiel: ['salle', 'aucun'] };   // cocher -> seul

const QUESTIONS = {
  age: {
    t: 'Quel âge as-tu ?',
    s: 'La récupération change avec l\u2019âge : les conseils s\u2019adaptent.',
    o: [
      { v: '-25', l: 'Moins de 25 ans' },
      { v: '25-34', l: '25 à 34 ans' },
      { v: '35-44', l: '35 à 44 ans' },
      { v: '45+', l: '45 ans et plus' },
    ],
  },
  objectif: {
    t: 'Ton objectif ?',
    s: 'Ce que tu veux atteindre en priorité dans les prochains mois.',
    o: [
      { v: 'masse', l: 'Prendre du muscle', n: 'Gagner en volume et en force' },
      { v: 'seche', l: 'Perdre du poids', n: 'Réduire la masse grasse' },
      { v: 'forme', l: 'Me remettre en forme', n: 'Reprendre en douceur' },
    ],
  },
  materiel: {
    t: 'Quel matériel as-tu ?',
    s: 'Plusieurs réponses possibles. Ton programme n\u2019utilisera que ça.',
    o: [
      { v: 'salle', l: 'Salle de sport complète', n: 'Machines, barres, haltères' },
      { v: 'halteres', l: 'Haltères', n: 'À la maison' },
      { v: 'elastiques', l: 'Élastiques' },
      { v: 'banc', l: 'Banc de musculation' },
      { v: 'aucun', l: 'Rien du tout', n: 'Poids du corps uniquement' },
    ],
  },
  niveau: {
    t: 'Ton niveau ?',
    s: 'Sois honnête : un programme trop dur est un programme abandonné.',
    o: [
      { v: 'debutant', l: 'Débutant', n: 'Moins d\u2019un an de pratique' },
      { v: 'intermediaire', l: 'Intermédiaire', n: 'Un à trois ans' },
      { v: 'confirme', l: 'Confirmé', n: 'Plus de trois ans' },
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
    s: 'On calera tes temps de repos pour que tu tiennes cette durée.',
    o: [
      { v: 'court', l: 'Environ 30 minutes' },
      { v: 'moyen', l: '45 à 60 minutes' },
      { v: 'long', l: 'Plus d\u2019une heure' },
    ],
  },
  priorite: {
    t: 'Une partie à privilégier ?',
    s: 'On mettra un peu plus de volume sur cette zone.',
    o: [
      { v: 'haut', l: 'Le haut du corps', n: 'Pectoraux, dos, épaules, bras' },
      { v: 'bas', l: 'Le bas du corps', n: 'Jambes, fessiers' },
      { v: 'equilibre', l: 'Tout de façon équilibrée' },
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

  if (r.duree === 'court') {
    out.push("Pour tenir tes 30 minutes, garde 45 à 60 secondes de repos entre les séries et enchaîne deux exercices d\u2019affilée quand tu peux. Le chrono de l\u2019app t\u2019aide à ne pas déborder.");
  } else if (r.duree === 'moyen') {
    out.push("Sur 45 à 60 minutes, vise environ 90 secondes de repos entre les séries, un peu plus sur les mouvements lourds. Lance le chrono à chaque fin de série.");
  } else if (r.duree === 'long') {
    out.push("Tu as le temps de bien récupérer : 2 à 3 minutes sur les gros mouvements (squat, développé, soulevé de terre), 60 à 90 secondes sur le reste.");
  }

  if (r.age === '45+') {
    out.push("Passé 45 ans, l\u2019échauffement n\u2019est pas optionnel : 8 à 10 minutes avant de charger, et garde un jour de repos entre deux séances lourdes. Tes épaules et tes genoux te remercieront.");
  } else if (r.age === '35-44') {
    out.push("Entre 35 et 44 ans, la récupération reste bonne mais l\u2019échauffement devient important : cinq minutes avant de charger, et surveille ton sommeil.");
  } else if (r.age === '-25') {
    out.push("À ton âge la récupération est excellente : tu peux tenir une fréquence élevée. Le vrai risque, c\u2019est la technique bâclée pour charger plus vite — ne brûle pas les étapes.");
  }

  const m = r.materiel || [];
  if (m.includes('aucun')) {
    out.push("Au poids du corps, la progression passe par la difficulté du mouvement et le tempo plutôt que par la charge : ralentis la descente, resserre les appuis, augmente les répétitions.");
  } else if (!m.includes('salle')) {
    const dispo = [];
    if (m.includes('halteres')) dispo.push('des haltères');
    if (m.includes('elastiques')) dispo.push('des élastiques');
    if (m.includes('banc')) dispo.push('un banc');
    if (dispo.length) {
      out.push(`Avec ${dispo.join(' et ')}, tu couvres l\u2019essentiel. Quand un exercice du programme demande une machine, remplace-le par la variante libre équivalente.`);
    }
  }

  if (r.priorite === 'haut') {
    out.push("Tu privilégies le haut du corps : ajoute une série sur les exercices de pectoraux, dos et épaules, sans supprimer les jambes — elles soutiennent toute ta progression.");
  } else if (r.priorite === 'bas') {
    out.push("Tu privilégies le bas du corps : ajoute une série sur les squats, fentes et soulevés. Garde au moins un tirage et une poussée pour le haut du corps.");
  }

  if (r.frequence === '7') {
    out.push("Sept jours d\u2019affilée, c\u2019est trop pour de la musculation pure. On te donne le programme le plus dense, et on te conseille de compléter par une ou deux journées légères : marche rapide, vélo, mobilité. Le muscle pousse pendant le repos.");
  }

  return out;
}

export function Questionnaire() {
  const [reponses, setReponses] = useState({ materiel: [] });
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
      const excl = EXCLUSIF[etape] || [];
      let suite;
      if (liste.includes(v)) suite = liste.filter(x => x !== v);
      else if (excl.includes(v)) suite = [v];
      else suite = [...liste.filter(x => !excl.includes(x)), v];
      return { ...r, [etape]: suite };
    });
  };
  const estChoisi = (v) => (MULTI[etape] ? (valeur || []).includes(v) : valeur === v);

  const suivant = () => setI(x => x + 1);
  const retour = () => { if (i === 0) retourEntrainer(); else setI(x => x - 1); };
  const refaire = () => { setReponses({ materiel: [] }); setI(0); };

  // ---------- Resultat ----------
  if (surResultat) {
    const { progId, conseil, desc } = recommander(reponses);
    const prog = programmeParId(progId);
    const perso = conseilsPersonnels(reponses);
    const objTxt = reponses.objectif === 'masse' ? 'prendre du muscle'
      : (reponses.objectif === 'seche' ? 'perdre du poids' : 'te remettre en forme');
    const dureeTxt = reponses.duree === 'court' ? 'en séances courtes'
      : reponses.duree === 'long' ? 'en séances longues' : 'en séances d\u2019environ une heure';

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
