import { useState } from 'preact/hooks';
import { seances, seancesPretes, supprimerSeance } from '../store/seances.js';
import { GROUPES } from '../store/entrainement.js';
import { t } from '../i18n/index.js';
import '../styles/seances.css';

// ==========================================================
// SEANCES ENREGISTREES
// Deux vues : la liste (sous le calendrier du journal, et en plein
// ecran) et le detail d'une seance.
// ==========================================================

const COULEUR = Object.fromEntries(GROUPES.filter(g => g.k !== 'repos').map(g => [g.k, g.c]));
const nomMuscle = (k) => t('mus_' + k);

const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

/** « Aujourd'hui », « Hier », sinon « mar 5 août ». */
function libelleJour(isoJour) {
  const auj = new Date(); auj.setHours(0, 0, 0, 0);
  if (isoJour === iso(auj)) return t('today');
  const hier = new Date(auj); hier.setDate(auj.getDate() - 1);
  if (isoJour === iso(hier)) return t('yesterday');
  const p = isoJour.split('-').map(Number);
  const d = new Date(p[0], p[1] - 1, p[2]);
  return `${t('days_short').split('|')[d.getDay()]} ${d.getDate()} ${t('months_min').split('|')[d.getMonth()]}`;
}

/** Une duree se lit en minutes. En dessous, autant le dire franchement. */
function duree(sec) {
  if (!sec || sec < 60) return '< 1';
  return String(Math.round(sec / 60));
}

function heure(ts) {
  const d = new Date(ts);
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

// ---------- une ligne de la liste ----------
function Ligne({ s, ouvrir }) {
  const muscles = (s.muscles || []).filter(m => COULEUR[m]).slice(0, 3);
  const bouts = [`${s.exos.length} ${t(s.exos.length > 1 ? 'exercices' : 'exercice')}`];
  if (s.tonnage > 0) bouts.push(`${s.tonnage.toLocaleString('fr-BE')} kg`);

  return (
    <div class="sea-ligne" onClick={(e) => { e.stopPropagation(); ouvrir(s); }}>
      <div class="sea-pastilles">
        {muscles.length
          ? muscles.map(m => <i key={m} style={{ background: COULEUR[m] }} />)
          : <i class="vide" />}
      </div>
      <div class="sea-corps">
        <div class="sea-jour">
          {libelleJour(s.iso)} · {s.titre}
          {s.records && s.records.length > 0 && <span class="sea-record">{t('record')}</span>}
        </div>
        <div class="sea-detail">{bouts.join(' · ')}</div>
      </div>
      <div class="sea-chiffre">{duree(s.duree)}<small>min</small></div>
    </div>
  );
}

/**
 * Bloc insere sous le calendrier du journal. Trois seances : la carte
 * porte deja les pastilles, le calendrier et sa legende — y deverser
 * la liste entiere la rendrait illisible.
 */
export function BlocSeances({ ouvrir, voirTout }) {
  const liste = seances.value;
  // Un bloc vide occupait 119 px pour annoncer qu'il n'y avait rien.
  // Le bouton « Seance libre » est juste au-dessus : proposer en plus
  // « enregistre ta premiere seance » reposerait la meme action. Tant
  // qu'il n'y a rien a lister, le bloc ne s'affiche pas.
  if (liste.length === 0) return null;
  return (
    <div class="sea-bloc">
      <div class="sea-titre">
        <h4>{t('sea_title')}</h4>
        {liste.length > 0 && <span>{liste.length} {t('in_total')}</span>}
      </div>
      {liste.slice(0, 3).map(s => <Ligne key={s.id} s={s} ouvrir={ouvrir} />)}
      {liste.length > 3 && (
        <button class="sea-tout" onClick={(e) => { e.stopPropagation(); voirTout(); }}>
          {t('sea_see_all')} ({liste.length}) →
        </button>
      )}
    </div>
  );
}

// ---------- liste plein ecran ----------
export function ToutesSeances({ ouvrir }) {
  const liste = seances.value;
  const pret = seancesPretes.value;
  return (
    <div class="pg-seances">
      <div class="sea-tete">
        <h2>{t('sea_title')}</h2>
        <p>{liste.length} {t(liste.length > 1 ? 'sessions' : 'session')}</p>
      </div>
      {liste.length === 0
        ? (pret ? <p class="sea-vide">{t('sea_empty')}</p> : null)
        : liste.map(s => <Ligne key={s.id} s={s} ouvrir={ouvrir} />)}
    </div>
  );
}

// ---------- detail d'une seance ----------
export function DetailSeance({ seance, apresSuppression }) {
  const [confirme, setConfirme] = useState(false);
  if (!seance) return null;
  const s = seance;

  return (
    <div class="pg-seances">
      <div class="sea-tete">
        <h2>{s.titre}</h2>
        <p>{libelleJour(s.iso)} · {heure(s.ts)}</p>
      </div>

      <div class="det-chiffres">
        <div class="det-case"><b>{duree(s.duree)}</b><span>min</span></div>
        <div class="det-case"><b>{s.nbSeries}</b><span>{t('sets')}</span></div>
        <div class="det-case"><b>{s.tonnage.toLocaleString('fr-BE')}</b><span>kg</span></div>
      </div>

      {s.exos.map((e, i) => (
        <div class="det-exo" key={i}>
          <div class="det-exo-tete">
            <span class="det-exo-nom">{e.nom}</span>
            {e.mKey && COULEUR[e.mKey] && (
              <span class="det-exo-mus">
                <i class="dot" style={{ background: COULEUR[e.mKey] }} />{nomMuscle(e.mKey)}
              </span>
            )}
          </div>
          {e.sets && e.sets.length
            ? <div class="det-series">
                {e.sets.map((x, j) => (
                  <span key={j} class={'det-serie' + (s.records.includes(e.nom) ? ' pr' : '')}>
                    {x.w === '' ? '—' : x.w} × {x.r === '' ? '—' : x.r}
                    {(x.dw || x.dr) ? ` → dégr. ${x.dw || '—'} × ${x.dr || '—'}` : ''}
                  </span>
                ))}
              </div>
            /* Un exercice coche sans charge doit rester visible :
               sinon un gainage disparait de sa propre seance. */
            : <div class="det-exo-vide">{t('sea_no_load')}</div>}
        </div>
      ))}

      <div class="det-supprimer">
        {confirme ? (
          <>
            <span>{t('sea_delete_ask')}</span>
            <button class="det-oui" onClick={() => { supprimerSeance(s.id); apresSuppression(); }}>{t('delete')}</button>
            <button class="det-non" onClick={() => setConfirme(false)}>{t('cancel')}</button>
          </>
        ) : (
          <button class="det-suppr" onClick={() => setConfirme(true)}>{t('sea_delete')}</button>
        )}
      </div>
    </div>
  );
}
