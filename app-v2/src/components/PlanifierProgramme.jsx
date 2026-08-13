import { useState } from 'preact/hooks';
import { retourEntrainer, allerVers } from './Entrainer.jsx';
import { estPremium } from './PremiumPage.jsx';
import { ongletActif } from './BottomNav.jsx';
import {
  progParId, adopterProgramme, programmeActif,
  SEANCES_LIBRES, quotaAtteint,
} from '../store/programme.js';
import { t } from '../i18n/index.js';

// ==========================================================
// PLANIFIER UN PROGRAMME — choix des jours.
//
// Raci le 10/08 : « le programme cree dans Creer mon programme
// apparait dans le calendrier, donc prevoir date lors de la
// creation », et « un utilisateur gratuit peut programmer maximum 4
// seances a la fois ; s'il en veut une 5e, il doit payer. S'il n'est
// pas premium et qu'il clique sur la 5e seance, un message
// s'affiche ».
//
// C'est l'ecran qui manquait : adopterProgramme() existait et etait
// teste, mais aucune interface ne l'appelait. Sans lui, un programme
// actif ne pouvait etre pose que par le code.
//
// La seance n du programme tombe sur le n-ieme jour coche, dans
// l'ordre de la semaine. On affiche donc le nom de chaque seance en
// face du jour qui la portera : sans cela, on coche des cases sans
// savoir ce qu'on planifie.
// ==========================================================

// Lundi en tete : c'est le debut de semaine du calendrier et du bloc
// « Ta semaine ». Les valeurs restent celles de Date.getDay().
const JOURS = [
  { v: 1, k: 'lun' }, { v: 2, k: 'mar' }, { v: 3, k: 'mer' },
  { v: 4, k: 'jeu' }, { v: 5, k: 'ven' }, { v: 6, k: 'sam' }, { v: 0, k: 'dim' },
];

export function PlanifierProgramme({ progId }) {
  const prog = progParId(progId);
  const premium = estPremium.value;
  const actif = programmeActif.value;

  // Si ce programme est deja actif, on repart de ses jours plutot que
  // d'une feuille blanche : « adapter mon programme » doit montrer ce
  // qui est en place, pas le faire ressaisir.
  const [choisis, setChoisis] = useState(
    actif && actif.id === progId && actif.jours ? [...actif.jours] : []
  );
  const [bloque, setBloque] = useState(false);

  if (!prog) {
    return (
      <div class="pg-planifier">
        <button class="v2-retour" onClick={retourEntrainer} aria-label={t('back')}>←</button>
        <p class="pl-vide">{t('pl_introuvable')}</p>
      </div>
    );
  }

  const total = prog.seances.length;
  const ordonnes = JOURS.filter(j => choisis.includes(j.v)).map(j => j.v);

  const basculer = (v) => {
    if (choisis.includes(v)) {
      setBloque(false);
      setChoisis(choisis.filter(x => x !== v));
      return;
    }
    // Le quota gratuit mord ICI, au moment du 5e jour coche.
    if (quotaAtteint(choisis.length, premium)) { setBloque(true); return; }
    if (choisis.length >= total) return;      // pas plus de jours que de seances
    setBloque(false);
    setChoisis([...choisis, v]);
  };

  // Un compte gratuit sur un programme 6 jours ne peut cocher que 4
  // jours : exiger le compte complet le laissait devant un bouton
  // eteint qui ne s'allumerait jamais. Cul-de-sac trouve le 10/08 en
  // eprouvant le verrou. On accepte donc un plan partiel, en le
  // disant : les seances au-dela ne sont pas planifiees, elles
  // restent accessibles a la main depuis la fiche du programme.
  const plafond = premium ? total : Math.min(total, SEANCES_LIBRES);
  const complet = choisis.length >= plafond;
  const partiel = complet && choisis.length < total;

  const valider = () => {
    if (!complet) return;
    adopterProgramme(progId, choisis);
    retourEntrainer();
  };

  return (
    <div class="pg-planifier">
      <button class="v2-retour" onClick={retourEntrainer} aria-label={t('back')}>←</button>
      <h1 class="pl-titre">{t('pl_titre')}</h1>
      <p class="pl-sous">{prog.name} · {total} {t(total > 1 ? 'sessions' : 'session')}</p>

      <div class="pl-jours">
        {JOURS.map(j => {
          const on = choisis.includes(j.v);
          const rang = ordonnes.indexOf(j.v);
          return (
            <button key={j.v} class={'pl-jour' + (on ? ' on' : '')}
              aria-pressed={on ? 'true' : 'false'} onClick={() => basculer(j.v)}>
              <span class="pl-jour-nom">{t('day_' + j.k)}</span>
              {on && rang > -1 && prog.seances[rang] && (
                <span class="pl-jour-seance">{prog.seances[rang].titre}</span>
              )}
            </button>
          );
        })}
      </div>

      {bloque && (
        <div class="pl-verrou">
          <b>{t('pl_verrou_titre', { n: SEANCES_LIBRES })}</b>
          <p>{t('pl_verrou_txt', { n: SEANCES_LIBRES })}</p>
          <button class="pl-verrou-b" onClick={() => { ongletActif.value = 'premium'; }}>
            {t('pl_verrou_cta')}
          </button>
        </div>
      )}

      <p class="pl-compte">
        {choisis.length} / {plafond} {t('pl_jours_choisis')}
        {partiel && (
          <span class="pl-partiel">{t('pl_partiel', { n: total - choisis.length })}</span>
        )}
      </p>

      <button class="pl-valider" disabled={!complet} onClick={valider}>
        {t('pl_valider')}
      </button>

      {actif && actif.id === progId && (
        <button class="pl-autre" onClick={() => allerVers('programmes')}>
          {t('pl_autre')}
        </button>
      )}
    </div>
  );
}
