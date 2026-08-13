import { retourEntrainer, allerVers } from './Entrainer.jsx';
import { programmeActif, seancePrevue, progParId } from '../store/programme.js';
import { SESSION_EXOS } from '../data/sessionExos.js';
import { EXERCISES } from '../data/exercices.js';
import { t } from '../i18n/index.js';

// ==========================================================
// DEMARRER UNE SEANCE — ecran de choix.
//
// Schema de Raci du 10/08 :
//   « Démarrer une séance »
//     ├─ programme actif ? -> ce choix : continuer, ou seance libre
//     └─ sinon            -> directement la seance libre
//
// Cet ecran n'est donc JAMAIS montre sans programme actif : le
// routage court-circuite. Un ecran de choix a une seule option est
// une porte qu'on fait ouvrir pour rien.
// ==========================================================

const iso = (d) => d.getFullYear() + '-'
  + String(d.getMonth() + 1).padStart(2, '0') + '-'
  + String(d.getDate()).padStart(2, '0');

/**
 * Les premiers noms d'exercices d'une seance, pour donner a voir.
 * Les references de SESSION_EXOS ont la forme « dos:1 » — groupe et
 * rang dans EXERCISES. Meme resolution que SeanceDetail : sans elle,
 * l'apercu affichait les references brutes, « dos:1 », « dos:0 ».
 */
function apercuExos(seanceId, max = 4) {
  const bruts = SESSION_EXOS[seanceId] || [];
  const noms = bruts.map(ref => {
    const [groupe, rang] = String(ref).split(':');
    const e = EXERCISES[groupe] && EXERCISES[groupe][parseInt(rang, 10)];
    return e && e.nom;
  }).filter(Boolean);
  return { montres: noms.slice(0, max), reste: Math.max(0, noms.length - max), total: noms.length };
}

export function DemarrerSeance() {
  const actif = programmeActif.value;
  const aujourdhui = new Date();
  const prevue = seancePrevue(iso(aujourdhui));
  const prog = actif ? progParId(actif.id) : null;

  // Jour de repos prevu : on ne cache pas le programme pour autant,
  // on propose sa PROCHAINE seance. Sans cela, un mardi de repos
  // renvoyait l'utilisateur en seance libre alors qu'il suit un
  // programme — exactement ce que le schema veut eviter.
  let cible = prevue, quandTxt = null;
  if (!cible && actif && prog) {
    for (let n = 1; n <= 7 && !cible; n++) {
      const d = new Date(aujourdhui);
      d.setDate(d.getDate() + n);
      const p = seancePrevue(iso(d));
      if (p) {
        cible = p;
        quandTxt = t('days_long').split('|')[d.getDay()] + ' ' + d.getDate();
      }
    }
  }

  const exos = cible ? apercuExos(cible.seanceId) : null;

  return (
    <div class="pg-demarrer">
      <button class="v2-retour" onClick={retourEntrainer} aria-label={t('back')}>←</button>
      <h1 class="dm-titre">{t('tr_start_session')}</h1>
      <p class="dm-sous">
        {t('days_long').split('|')[aujourdhui.getDay()]} {aujourdhui.getDate()}{' '}
        {t('months_long').split('|')[aujourdhui.getMonth()]}
      </p>

      {cible && (
        <div class="dm-opt dm-opt--reco">
          <span class="dm-tag">
            {quandTxt
              ? `${t('tr_prog_next')} · ${quandTxt}`
              : `${t('tr_prog_yours')} · ${t('session')} ${cible.index + 1} / ${prog.seances.length}`}
          </span>
          <h2>{cible.titre}</h2>
          <p>{prog.name} · {cible.sub}</p>
          {exos && exos.montres.length > 0 && (
            <div class="dm-exos">
              {exos.montres.map(n => <span key={n} class="dm-exo">{n}</span>)}
              {exos.reste > 0 && <span class="dm-exo">+{exos.reste}</span>}
            </div>
          )}
          <button class="dm-b dm-b--or"
            onClick={() => allerVers('seanceDetail', { seanceId: cible.seanceId, titre: cible.titre, depuis: 'journal' })}>
            {t('tr_prog_continue')}
          </button>
        </div>
      )}

      <div class="dm-opt">
        <h2>{t('tr_free_title')}</h2>
        <p>{t('tr_free_sub')}</p>
        <button class="dm-b dm-b--sobre" onClick={() => allerVers('selection')}>
          {t('tr_free_cta')}
        </button>
      </div>

      <button class="dm-changer" onClick={() => allerVers('questionnaire')}>
        {t('tr_prog_change')}
      </button>
    </div>
  );
}
