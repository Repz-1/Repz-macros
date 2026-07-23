import { signal } from '@preact/signals';
import { useState } from 'preact/hooks';
import { calculerBesoins } from '../data/tdee.js';

// ============================================================
// PARCOURS D'ACCUEIL — le questionnaire vient AVANT le compte.
// La personne repond a 8 questions (2 minutes), voit son vrai
// programme calcule (formules nommees, aucun chiffre invente),
// puis cree son compte pour le garder. L'inscription n'est plus
// un peage a l'entree : c'est le geste qui sauvegarde.
//
// Tout reste LOCAL jusqu'a l'inscription — aucune donnee ne part
// avant qu'un compte existe. Et on ne demande rien qu'on
// n'utilise pas : chaque question sert le calcul ou le coach.
// ============================================================

const CLE_FAIT = 'belfit_v2_bienvenue_fait';
const CLE_PROGRAMME = 'belfit_v2_programme_attente';
const CLE_REPONSES = 'belfit_v2_bienvenue_reponses';

export const bienvenueFaite = signal(localStorage.getItem(CLE_FAIT) === '1');

/** Marque le parcours comme fait — utilise a la deconnexion : quelqu'un
 *  qui se deconnecte a forcement un compte, il doit retrouver l'ecran
 *  de connexion, pas le questionnaire des nouveaux venus. */
export function marquerBienvenueFaite() {
  try { localStorage.setItem(CLE_FAIT, '1'); } catch (e) {}
  bienvenueFaite.value = true;
}

/** Programme calcule pendant l'accueil, a appliquer apres l'inscription. */
export function programmeEnAttente() {
  try { return JSON.parse(localStorage.getItem(CLE_PROGRAMME)); } catch (e) { return null; }
}
export function purgerProgrammeEnAttente() {
  try { localStorage.removeItem(CLE_PROGRAMME); localStorage.removeItem(CLE_REPONSES); } catch (e) {}
}
export function prenomEnAttente() {
  try { return (JSON.parse(localStorage.getItem(CLE_REPONSES)) || {}).prenom || ''; } catch (e) { return ''; }
}

// ---- Les trois chapitres et leurs accents (palette BELFIT stricte) ----
const CHAPITRES = {
  toi:      { nom: 'Toi',           accent: '#F7B500' },
  quotidien:{ nom: 'Ton quotidien', accent: '#191919' },
  assiette: { nom: 'Ton assiette',  accent: '#8F6200' },
};

// Ordre des ecrans. Chaque question porte sa justification : on dit
// pourquoi on demande, honnetement, comme un coach le ferait.
const ECRANS = ['prenom', 'objectif', 'profil', 'mesures', 'activite', 'sport', 'repas', 'faible', 'resultat'];
const CHAPITRE_DE = {
  prenom: 'toi', objectif: 'toi', profil: 'toi', mesures: 'toi',
  activite: 'quotidien', sport: 'quotidien',
  repas: 'assiette', faible: 'assiette',
};

const OBJECTIFS_Q = [
  { v: -400, e: '\u{1F525}', l: 'Perdre du gras',   s: 'Déficit maîtrisé, sans crever de faim' },
  { v: 300,  e: '\u{1F4AA}', l: 'Prise propre',     s: 'Du muscle, un minimum de gras' },
  { v: 500,  e: '\u{1F680}', l: 'Prise de masse',   s: 'Priorité au volume et à la force' },
  { v: 0,    e: '\u{2696}\u{FE0F}', l: 'Rester en forme', s: 'Maintien, équilibre, énergie' },
];

const ACTIVITES_Q = [
  { v: 1.2,  e: '\u{1FA91}', l: 'Assis la plupart du temps', s: 'Bureau, voiture, écrans' },
  { v: 1.3,  e: '\u{1F6B6}', l: 'Un peu de marche',          s: 'Quelques déplacements par jour' },
  { v: 1.45, e: '\u{1F9CD}', l: 'Souvent debout',            s: 'Vente, horeca, soins' },
  { v: 1.6,  e: '\u{1F477}', l: 'Travail physique',          s: 'Chantier, manutention, agriculture' },
];

const SPORT_Q = [
  { v: 0, l: 'Pas encore' }, { v: 2, l: '1 – 2' }, { v: 3, l: '3' },
  { v: 4, l: '4' }, { v: 5, l: '5' }, { v: 6, l: '6+' },
];

const REPAS_Q = [
  { v: 3, l: '3 repas' }, { v: 4, l: '4 repas' },
  { v: 5, l: '5 repas' }, { v: 6, l: '6 repas' },
];

const FAIBLES_Q = [
  { v: 'grignotage', e: '\u{1F36A}', l: 'Le grignotage' },
  { v: 'sucre',      e: '\u{1F36D}', l: 'Le sucre' },
  { v: 'portions',   e: '\u{1F37D}\u{FE0F}', l: 'Les portions' },
  { v: 'regularite', e: '\u{1F4C6}', l: 'La régularité' },
  { v: 'aucun',      e: '\u{1F44C}', l: 'Rien de spécial' },
];

export function Bienvenue({ versConnexion, versInscription }) {
  const [etape, setEtape] = useState(0);
  const [r, setR] = useState(() => {
    try { return JSON.parse(localStorage.getItem(CLE_REPONSES)) || {}; } catch (e) { return {}; }
  });

  const ecran = ECRANS[etape];
  const chap = CHAPITRE_DE[ecran];
  const info = chap ? CHAPITRES[chap] : null;

  const poser = (cle, valeur, avancer = true) => {
    const suiv = { ...r, [cle]: valeur };
    setR(suiv);
    try { localStorage.setItem(CLE_REPONSES, JSON.stringify(suiv)); } catch (e) {}
    if (avancer) setEtape(n => Math.min(n + 1, ECRANS.length - 1));
  };

  const precedent = () => setEtape(n => Math.max(0, n - 1));

  // ---- Calcul du programme : les VRAIES formules, rien d'invente ----
  const programme = ecran === 'resultat' ? calculerBesoins({
    sexe: r.sexe === 'h' ? 'h' : 'f',
    age: parseInt(r.age) || 30,
    poids: parseFloat(r.poids) || 75,
    taille: parseFloat(r.taille) || 175,
    masseGrasse: NaN,
    activiteBase: r.activite || 1.3,
    joursEntrainement: r.sport || 0,
    intensiteEntrainement: 0.05,
    ajustement: r.objectif ?? 0,
  }) : null;

  // Ordre voulu : programme -> compte -> offre Premium. On sauvegarde,
  // on pose le drapeau de l'offre (montree une seule fois, apres la
  // creation du compte), et on file a l'inscription.
  const terminer = () => {
    try {
      localStorage.setItem(CLE_PROGRAMME, JSON.stringify({
        kcal: programme.kcal, prot: programme.prot,
        carbs: programme.carbs, lip: programme.lip,
        nbRepas: r.nbRepas || 4, faible: r.faible || 'aucun',
      }));
      localStorage.setItem(CLE_FAIT, '1');
      localStorage.setItem('belfit_v2_offre_premium', '1');
    } catch (e) {}
    bienvenueFaite.value = true;
    versInscription();
  };

  // Barre : trois segments, un par chapitre, remplis selon la position.
  const partChapitre = (c) => {
    const dedans = ECRANS.filter(x => CHAPITRE_DE[x] === c);
    const faits = dedans.filter(x => ECRANS.indexOf(x) < etape).length;
    return faits / dedans.length;
  };

  return (
    <div class="bv-ecran">
      {ecran !== 'resultat' && (
        <div class="bv-tete">
          <span class="bv-badge" style={{ background: info.accent, color: info.accent === '#F7B500' ? '#191919' : '#fff' }}>
            {info.nom}
          </span>
          <div class="bv-barres">
            {Object.keys(CHAPITRES).map(c => (
              <div class="bv-barre" key={c}>
                <div class="bv-barre-plein" style={{ width: (partChapitre(c) * 100) + '%', background: CHAPITRES[c].accent }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---------- Chapitre 1 : Toi ---------- */}
      {ecran === 'prenom' && (
        <div class="bv-corps">
          <img src="/belfit-logo-b.png" alt="BELFIT" class="bv-logo" />
          <h1 class="bv-titre">Construisons ton programme</h1>
          <p class="bv-just">8 questions, 2 minutes. À la fin : tes calories et tes macros, calculées pour de vrai.</p>
          <input
            class="bv-champ" placeholder="Ton prénom" value={r.prenom || ''}
            onInput={e => poser('prenom', e.currentTarget.value, false)}
            autocomplete="given-name" maxLength={30} autoFocus
          />
          <button class="bv-suivant" disabled={!(r.prenom || '').trim()} onClick={() => setEtape(1)}>
            Commencer
          </button>
          <button class="bv-lien" onClick={versConnexion}>Déjà un compte ? Se connecter</button>
        </div>
      )}

      {ecran === 'objectif' && (
        <div class="bv-corps">
          <h1 class="bv-titre">Ravi de te rencontrer, {(r.prenom || '').trim()}. Ton objectif ?</h1>
          <p class="bv-just">Tout le programme découle de cette réponse : le nombre de calories, la répartition des macros, le ton du coach.</p>
          {OBJECTIFS_Q.map(o => (
            <button key={o.v} class={'bv-carte' + (r.objectif === o.v ? ' bv-carte--choisie' : '')} onClick={() => poser('objectif', o.v)}>
              <span class="bv-emo">{o.e}</span>
              <span class="bv-carte-txt"><b>{o.l}</b><i>{o.s}</i></span>
            </button>
          ))}
        </div>
      )}

      {ecran === 'profil' && (
        <div class="bv-corps">
          <h1 class="bv-titre">Tu es...</h1>
          <p class="bv-just">La formule de calcul des besoins n'est pas la même pour un homme et pour une femme, et l'âge la fait varier.</p>
          <div class="bv-rangee">
            <button class={'bv-pilule' + (r.sexe === 'h' ? ' bv-pilule--choisie' : '')} onClick={() => poser('sexe', 'h', false)}>Un homme</button>
            <button class={'bv-pilule' + (r.sexe === 'f' ? ' bv-pilule--choisie' : '')} onClick={() => poser('sexe', 'f', false)}>Une femme</button>
          </div>
          <label class="bv-label">Ton âge</label>
          <input class="bv-champ" type="number" inputMode="numeric" min="14" max="99" placeholder="30" value={r.age || ''} onInput={e => poser('age', e.currentTarget.value, false)} />
          <button class="bv-suivant" disabled={!r.sexe || !(parseInt(r.age) >= 14 && parseInt(r.age) <= 99)} onClick={() => setEtape(etape + 1)}>Suivant</button>
        </div>
      )}

      {ecran === 'mesures' && (
        <div class="bv-corps">
          <h1 class="bv-titre">Tes mesures</h1>
          <p class="bv-just">C'est la base du calcul de ta dépense énergétique. Personne d'autre que toi ne les verra.</p>
          <label class="bv-label">Taille (cm)</label>
          <input class="bv-champ" type="number" inputMode="decimal" min="120" max="230" placeholder="178" value={r.taille || ''} onInput={e => poser('taille', e.currentTarget.value, false)} />
          <label class="bv-label">Poids (kg)</label>
          <input class="bv-champ" type="number" inputMode="decimal" min="35" max="250" placeholder="80" value={r.poids || ''} onInput={e => poser('poids', e.currentTarget.value, false)} />
          <button
            class="bv-suivant"
            disabled={!(parseFloat(r.taille) >= 120 && parseFloat(r.taille) <= 230) || !(parseFloat(r.poids) >= 35 && parseFloat(r.poids) <= 250)}
            onClick={() => setEtape(etape + 1)}
          >Suivant</button>
        </div>
      )}

      {/* ---------- Chapitre 2 : Ton quotidien ---------- */}
      {ecran === 'activite' && (
        <div class="bv-corps">
          <h1 class="bv-titre">Tes journées, hors sport ?</h1>
          <p class="bv-just">Ton métier pèse autant que tes entraînements dans la dépense totale — souvent plus.</p>
          {ACTIVITES_Q.map(a => (
            <button key={a.v} class={'bv-carte' + (r.activite === a.v ? ' bv-carte--choisie' : '')} onClick={() => poser('activite', a.v)}>
              <span class="bv-emo">{a.e}</span>
              <span class="bv-carte-txt"><b>{a.l}</b><i>{a.s}</i></span>
            </button>
          ))}
        </div>
      )}

      {ecran === 'sport' && (
        <div class="bv-corps">
          <h1 class="bv-titre">Entraînements par semaine ?</h1>
          <p class="bv-just">Compte ce que tu fais vraiment aujourd'hui, pas ce que tu vises — le programme s'ajustera avec toi.</p>
          <div class="bv-grille">
            {SPORT_Q.map(s => (
              <button key={s.v} class={'bv-tuile' + (r.sport === s.v ? ' bv-tuile--choisie' : '')} onClick={() => poser('sport', s.v)}>{s.l}</button>
            ))}
          </div>
        </div>
      )}

      {/* ---------- Chapitre 3 : Ton assiette ---------- */}
      {ecran === 'repas' && (
        <div class="bv-corps">
          <h1 class="bv-titre">Combien de repas par jour ?</h1>
          <p class="bv-just">Ton journal sera préparé avec ce rythme, et les calories réparties entre ces repas.</p>
          <div class="bv-grille">
            {REPAS_Q.map(n => (
              <button key={n.v} class={'bv-tuile' + (r.nbRepas === n.v ? ' bv-tuile--choisie' : '')} onClick={() => poser('nbRepas', n.v)}>{n.l}</button>
            ))}
          </div>
        </div>
      )}

      {ecran === 'faible' && (
        <div class="bv-corps">
          <h1 class="bv-titre">Ton point faible ?</h1>
          <p class="bv-just">Pas de jugement — c'est ce que le coach surveillera avec toi en priorité.</p>
          {FAIBLES_Q.map(f => (
            <button key={f.v} class={'bv-carte' + (r.faible === f.v ? ' bv-carte--choisie' : '')} onClick={() => poser('faible', f.v)}>
              <span class="bv-emo">{f.e}</span>
              <span class="bv-carte-txt"><b>{f.l}</b></span>
            </button>
          ))}
        </div>
      )}

      {/* ---------- Resultat : le vrai calcul, montre AVANT le compte ---------- */}
      {ecran === 'resultat' && programme && (
        <div class="bv-corps bv-corps--resultat">
          <h1 class="bv-titre">Ton programme, {(r.prenom || '').trim()}</h1>
          <p class="bv-just">
            Calculé avec la formule Mifflin-St Jeor, la référence en nutrition —
            pas un chiffre sorti d'un chapeau.
          </p>

          <div class="bv-resultat">
            <div class="bv-res-kcal">{programme.kcal}<span> kcal / jour</span></div>
            <div class="bv-res-detail">
              Métabolisme de base {programme.bmr} kcal · dépense totale {programme.tdee} kcal
              {r.objectif > 0 && ` · +${r.objectif} pour construire`}
              {r.objectif < 0 && ` · ${r.objectif} pour sécher sans casse`}
            </div>
            <div class="bv-res-macros">
              <div class="bv-res-m"><b>{programme.prot}</b><span>g prot.</span></div>
              <div class="bv-res-m"><b>{programme.carbs}</b><span>g gluc.</span></div>
              <div class="bv-res-m"><b>{programme.lip}</b><span>g lip.</span></div>
            </div>
          </div>

          <button class="bv-suivant" onClick={terminer}>Sauvegarder mon programme</button>
          <p class="bv-note">Crée ton compte en 30 secondes : ton programme et ton journal te suivront sur tous tes appareils.</p>
        </div>
      )}

      {etape > 0 && ecran !== 'resultat' && (
        <button class="bv-retour" onClick={precedent} aria-label="Retour">←</button>
      )}
    </div>
  );
}
