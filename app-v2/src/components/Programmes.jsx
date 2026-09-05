import { useState } from 'preact/hooks';
import { PROGRAMMES, CATEGORIES } from '../data/programmes.js';
import { vueEntrainer } from './Entrainer.jsx';

import { retourEntrainer, allerVers } from './Entrainer.jsx';

import { programmeActif } from '../store/programme.js';
import { t } from '../i18n/index.js';
import '../legacy/programmes.scoped.css';

// La barre orange du v1 (maison + Premium) a ete RETIREE le 26/08.
// Raci : « elle revient trop souvent et elle fait partie de la V1 ».
// Elle faisait un second en-tete au-dessus de celui de l'app, et son
// bouton maison sortait de la navigation par onglets. Ses deux
// destinations existent ailleurs : la fleche retour de chaque ecran,
// et l'onglet BelFit+ de la barre du bas. Rien n'est compense ici.

// ==========================================================
// PAGE "Tous les programmes" — transposee du v1 (programmes.html).
// 3 ecrans : Categories -> Programmes -> Seances.
// Meme markup, meme CSS ; navigation en hooks.
// ==========================================================

const ORDRE_NIVEAUX = ['Débutant', 'Intermédiaire', 'Confirmé', 'Avancé'];

export function Programmes() {
  // Programme cible (arrive du questionnaire) : on ouvre directement
  // sa fiche, comme le lien programmes.html?cat=..&prog=.. de la v1.
  const vise = (vueEntrainer.value.params || {}).prog || null;

  // ecran : 'progs' | 'seances'
  //
  // L'ECRAN DES TROIS OBJECTIFS A ETE SUPPRIME (Raci, 26/08 : « cet
  // ecran doit disparaitre, il faisait partie de la V1, enleve-le a
  // jamais »). « Prendre du muscle / Perdre du poids / Me remettre en
  // forme » etait un peage de plus : trois cartes a lire pour arriver
  // a une liste de QUATORZE programmes qu'on peut afficher d'un coup.
  // Meme raison que le questionnaire retire le meme jour.
  //
  // Les 14 programmes sont donc a plat, filtres par NIVEAU. Les
  // categories restent dans les donnees : elles servent encore au
  // classement de la liste et a la recommandation.
  // ecran : 'intro' | 'progs' | 'seances'
  //
  // 'intro' n'est PAS l'ancien ecran des trois objectifs (supprime le
  // 26/08, R56). C'est un aiguillage a deux voies demande par Raci le
  // meme jour : repondre aux quatre questions, ou aller droit aux
  // programmes classes par niveau. Le questionnaire redevient une
  // OFFRE, il n'est plus un passage oblige.
  const [ecran, setEcran] = useState(vise ? 'seances' : 'progs');
  const [progId, setProgId] = useState(vise);

  // Tous les programmes, dans l'ordre des categories, SANS DOUBLON :
  // le Full body debutant est range dans « forme » et repousse dans
  // « masse » (data/programmes.js, ligne push du v1). A plat, il
  // apparaissait donc deux fois dans la meme liste.
  const TOUS = [];
  for (const c of CATEGORIES) {
    for (const p of (PROGRAMMES[c.k] || [])) {
      if (!TOUS.some(x => x.id === p.id)) TOUS.push(p);
    }
  }
  const niveauxPresents = ORDRE_NIVEAUX.filter(n => TOUS.some(p => p.niveau === n));
  const [niveau, setNiveau] = useState(() => {
    const nivs = ORDRE_NIVEAUX.filter(n => CATEGORIES.flatMap(c => PROGRAMMES[c.k] || []).some(p => p.niveau === n));
    return nivs[0] || 'Tous';
  });

  const progsCat = TOUS;
  const prog = progId ? TOUS.find(p => p.id === progId) : null;
  const ouvrirProg = (id) => { setProgId(id); setEcran('seances'); };

  const stat = (icone, valeur) => (
    <span>{icone}<b>{valeur}</b></span>
  );

  const carteProg = (p) => {
    const showNiv = niveauxPresents.length === 1;
    return (
      <div class="prog-card" key={p.id} onClick={() => ouvrirProg(p.id)}>
        {p.tag && <span class="prog-badge reco">⭐ {p.tag}</span>}
        <span class="prog-badge">{p.badge}</span>
        {p.lieu && <span class="prog-badge lieu">🏋️ {p.lieu}</span>}
        <div class="prog-name">{p.name}</div>
        <div class="prog-desc">{p.desc}</div>
        <div class="prog-stats">
          {stat(<svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="16" rx="2" /><path d="M4 9h16M8 3v4M16 3v4" /></svg>, p.duree)}
          {showNiv && stat(<svg viewBox="0 0 24 24"><path d="M5 20v-6M12 20V8M19 20V4" /></svg>, p.niveau)}
          {stat(<svg viewBox="0 0 24 24"><path d="M6.5 6.5v11M17.5 6.5v11M3 9.5v5M21 9.5v5M6.5 12h11" /></svg>, `${p.seances.length} séances`)}
        </div>
      </div>
    );
  };

  // L'aiguillage « Par ou veux-tu commencer ? » est supprime le 5/09
  // (Raci) : « l'utilisateur n'est pas cense acceder a ca ». Il
  // s'intercalait entre le bouton et la bibliotheque, et sa fleche
  // retour faisait redescendre un empilement que personne n'avait
  // monte. Les deux voies qu'il offrait existent ailleurs : le
  // questionnaire par « Trouver mon programme », la planification a la
  // main en touchant un jour du calendrier.

  // ---- Ecran 1 : les 14 programmes, a plat ----
  if (ecran === 'progs') {
    return (
      <div class="pg-programmes">
        <div class="top">
          <button class="back-btn" onClick={retourEntrainer}>←&nbsp; {t('ml_retour')}</button>
          <h1>{t('pr_titre')}</h1>
        </div>
        <p class="intro-txt">{t('pr_sous')}</p>
        {niveauxPresents.length > 1 && (
          <div class="niv-filter">
            {niveauxPresents.map(n => (
              <button key={n} class={'niv-pill' + (n === niveau ? ' active' : '')} onClick={() => setNiveau(n)}>{n}</button>
            ))}
          </div>
        )}
        <div class="prog-list">
          {progsCat.filter(p => p.niveau === niveau).map(carteProg)}
        </div>
      </div>
    );
  }

  // ---- Ecran 3 : Seances du programme ----
  return (
    <div class="pg-programmes">
      <div class="top">
        {/* Le retour rend la main a l'ecran d'ou l'on vient. Ouverte
            avec un programme vise (depuis la carte du jour ou la
            planification), cette fiche n'a pas d'empilement derriere
            elle : redescendre vers la liste par niveau puis vers
            l'aiguillage faisait traverser deux ecrans jamais vus
            (Raci, 5/09). */}
        <button class="back-btn" onClick={() => (vise ? retourEntrainer() : setEcran('progs'))}>←&nbsp; {t('ml_retour')}</button>
        <h1>{prog ? prog.name : 'Séances'}</h1>
      </div>
      {prog && <p class="intro-txt">{prog.duree} · niveau {prog.niveau}. Choisis une séance pour voir les exercices.</p>}
      {/* Adopter le programme : c'est l'entree de la planification,
          qui n'existait pas. Sans elle, adopterProgramme() n'etait
          appelable que par le code et aucun programme ne pouvait
          devenir actif depuis l'interface. */}
      {prog && (
        <button class="prog-adopter" onClick={() => allerVers('planifier', { prog: prog.id })}>
          {programmeActif.value && programmeActif.value.id === prog.id
            ? t('pl_modifier_jours')
            : t('pl_adopter')}
        </button>
      )}

      <div class="seance-list">
        {prog && prog.seances.map((s, i) => (
          <div class="seance-card" key={i} onClick={() => allerVers('seanceDetail', { seanceId: prog.id + '-' + i, titre: s.titre })}>
            <div class="seance-num">J{i + 1}</div>
            <div class="seance-info">
              <div class="seance-title">{s.titre}</div>
              <div class="seance-sub">{s.sub}</div>
            </div>
            <div class="seance-arrow">→</div>
          </div>
        ))}
      </div>
    </div>
  );
}
