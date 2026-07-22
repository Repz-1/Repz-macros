import { useState } from 'preact/hooks';
import { t } from '../i18n/index.js';
import { programmeParId } from '../data/programmes.js';
import { retourEntrainer, allerVers } from './Entrainer.jsx';
import '../legacy/quiz.scoped.css';

// ============================================================
// « CREER MON PROGRAMME » — portage de test.html (v1).
// Memes questions, meme barre de progression, MEME logique de
// recommandation (y compris les conseils de coach mot pour mot).
// ============================================================

const ETAPES = ['sexe', 'objectif', 'niveau', 'frequence'];

const CHOIX = {
  sexe: [
    { v: 'homme', e: '\u{1F9D1}', l: 'Un homme' },
    { v: 'femme', e: '\u{1F469}', l: 'Une femme' },
  ],
  objectif: [
    { v: 'masse', e: '\u{1F4AA}', l: 'Prendre du muscle' },
    { v: 'seche', e: '\u{1F525}', l: 'Perdre du poids' },
    { v: 'forme', e: '\u{26A1}', l: 'Me remettre en forme' },
  ],
  niveau: [
    { v: 'debutant', e: '\u{1F331}', l: 'Débutant' },
    { v: 'intermediaire', e: '\u{1F4C8}', l: 'Intermédiaire' },
    { v: 'confirme', e: '\u{1F3C6}', l: 'Confirmé' },
  ],
  frequence: [
    { v: '2', e: '2\uFE0F\u20E3', l: '2 jours' },
    { v: '3', e: '3\uFE0F\u20E3', l: '3 jours' },
    { v: '4', e: '4\uFE0F\u20E3', l: '4 jours' },
    { v: '5', e: '5\uFE0F\u20E3', l: '5 jours' },
    { v: '6', e: '6\uFE0F\u20E3', l: '6 jours' },
  ],
};

const TITRES = {
  sexe:      { t: 'Tu es...', s: "Pour adapter les démonstrations d'exercices." },
  objectif:  { t: 'Ton objectif ?', s: 'Ce que tu veux atteindre en priorité.' },
  niveau:    { t: 'Ton niveau ?', s: 'Sois honnête, on adapte en conséquence.' },
  frequence: { t: 'Combien de jours par semaine ?', s: 'Le nombre de séances que tu peux faire.' },
};

/** Recommandation : copie exacte de computeResult() (v1, test.html). */
function recommander({ objectif, niveau, frequence }) {
  const jours = parseInt(frequence, 10);
  let conseil = '';
  let progId;

  if (objectif === 'masse') {
    const debConseilMasse = "Pour débuter la prise de masse, un corps complet 3 jours donne souvent les meilleurs résultats : plus de récupération, une meilleure technique. On te conseille de commencer là — mais c'est toi qui choisis, voici le programme que tu as demandé.";
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
      if (niveau === 'debutant') conseil = debConseilMasse;
    } else if (jours === 4) {
      progId = 'masse-4j';
      if (niveau === 'debutant') conseil = debConseilMasse;
    } else {
      progId = 'masse-3j';
    }
  } else if (objectif === 'seche') {
    if (jours <= 2) {
      progId = 'seche-2j';
      conseil = "2 jours, c'est un bon début. En perte de poids, ce que tu manges compte autant que l'entraînement : soigne ton alimentation et reste actif au quotidien (marche, escaliers).";
    } else if (jours === 3) {
      progId = 'seche-full-3j';
    } else if (jours === 4) {
      progId = 'seche-circuit-4j';
    } else if (jours === 5) {
      progId = 'seche-5j';
    } else {
      progId = 'seche-6j';
      conseil = (niveau === 'debutant')
        ? "6 jours c'est ambitieux ! Possible, mais en perte de poids attention à garder ton muscle : mange assez de protéines, dors bien, et écoute ton corps. Si c'est trop, réduis sans culpabiliser."
        : "6 jours par semaine, c'est intense. Assure-toi de bien récupérer et de manger suffisamment de protéines pour ne pas perdre de muscle pendant ta sèche.";
    }
  } else {
    const debConseilSalle = "Pour débuter, 3 séances corps complet par semaine suffisent largement à progresser vite, avec assez de repos. On te conseille de commencer là — mais tu choisis, voici ton programme.";
    if (niveau === 'debutant' && jours <= 2) {
      progId = 'deb-2j';
    } else if (niveau === 'debutant' && jours === 3) {
      progId = 'deb-full-3j';
    } else if (jours >= 6) {
      progId = 'salle-ppl-6j';
      if (niveau === 'debutant') conseil = debConseilSalle;
    } else if (jours >= 4) {
      progId = 'salle-half-4j';
      if (niveau === 'debutant') conseil = debConseilSalle;
    } else {
      progId = 'salle-ppl-3j';
    }
  }

  // Message positif pour 2 jours (si pas deja un conseil)
  if (jours <= 2 && !conseil) {
    conseil = "2 jours par semaine, c'est un rythme tenable sur le long terme. La régularité bat l'intensité.";
  }

  let desc;
  if (objectif === 'masse') desc = 'Construis du muscle avec un programme structuré et une progression régulière sur les charges.';
  else if (objectif === 'seche') desc = 'Brûle des calories avec des séances dynamiques qui combinent musculation et cardio.';
  else desc = 'Reprends en douceur avec des séances complètes et progressives pour tout le corps.';

  return { progId, conseil, desc, jours };
}

export function Questionnaire() {
  const [reponses, setReponses] = useState({});
  const [i, setI] = useState(0);          // index d'etape ; ETAPES.length = resultat
  const total = ETAPES.length;
  const surResultat = i >= total;

  const etape = ETAPES[i];
  const pct = surResultat ? 100 : ((i + 1) / total) * 100;

  const choisir = (v) => setReponses(r => ({ ...r, [etape]: v }));
  const suivant = () => setI(x => x + 1);
  const retour = () => { if (i === 0) retourEntrainer(); else setI(x => x - 1); };
  const refaire = () => { setReponses({}); setI(0); };

  // ---------- Ecran resultat ----------
  if (surResultat) {
    const { progId, conseil, desc, jours } = recommander(reponses);
    const prog = programmeParId(progId);
    const objTxt = reponses.objectif === 'masse' ? 'prendre du muscle'
      : (reponses.objectif === 'seche' ? 'perdre du poids' : 'te remettre en forme');

    return (
      <div class="pg-quiz">
        <div class="q-top">
          <button class="back-btn" onClick={retour} aria-label="Retour">‹</button>
          <div class="progress-wrap">
            <div class="progress-bar"><div class="progress-fill" style={{ width: '100%' }} /></div>
            <div class="progress-txt">Terminé !</div>
          </div>
        </div>

        <div class="q-content">
          <div class="result">
            <div class="result-badge">Ton programme idéal</div>
            <h2>{prog ? prog.name : '—'}</h2>
            <div class="result-recap">
              Tu veux {objTxt}, {jours} jours par semaine, en salle.
            </div>

            <div class="result-prog">
              <div class="desc">{desc}</div>
              <div class="stats">
                <span><b>{prog ? prog.duree : '—'}</b><small>durée</small></span>
                <span><b>{prog ? prog.niveau : '—'}</b><small>niveau</small></span>
                <span><b>{prog ? prog.seances.length : 0} séances</b><small>par semaine</small></span>
              </div>
              {conseil && (
                <div style="display:block;margin-top:18px;">
                  <div class="coach-advice">{'\u{1F4A1}'} <span>{conseil}</span></div>
                </div>
              )}
              {prog && (
                <div class="seances" style="margin-top:18px;text-align:left;">
                  {prog.seances.map((s, k) => (
                    <div key={k} style="font-size:14px;font-weight:600;color:#6b7280;padding:7px 0;border-bottom:1px solid #f0ede4;">
                      {s.titre}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div class="result-btns">
              <button class="btn-primary" onClick={() => allerVers('programmes', { prog: progId })}>
                Voir ce programme
              </button>
              <button class="btn-secondary" onClick={refaire}>Refaire le test</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------- Ecrans de questions ----------
  const info = TITRES[etape];
  return (
    <div class="pg-quiz">
      <div class="q-top">
        <button class="back-btn" onClick={retour} aria-label="Retour">‹</button>
        <div class="progress-wrap">
          <div class="progress-bar"><div class="progress-fill" style={{ width: pct + '%' }} /></div>
          <div class="progress-txt">Question {i + 1} / {total}</div>
        </div>
      </div>

      <div class="q-content">
        <div class="q-step active">
          <div class="q-title">{info.t}</div>
          <div class="q-sub">{info.s}</div>
          <div class="options">
            {CHOIX[etape].map(o => (
              <div
                key={o.v}
                class={'option' + (reponses[etape] === o.v ? ' selected' : '')}
                onClick={() => choisir(o.v)}
              >
                <span class="option-emoji">{o.e}</span>
                <span class="option-label">{o.l}</span>
                <span class="option-check">✓</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div class="q-footer">
        <button class="next-btn" disabled={!reponses[etape]} onClick={suivant}>
          {i === total - 1 ? 'Voir mon résultat' : 'Suivant'}
        </button>
      </div>
    </div>
  );
}
