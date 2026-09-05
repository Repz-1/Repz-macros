import { useState, useEffect, useRef } from 'preact/hooks';
import { createPortal } from 'preact/compat';
import { enregistrerSeance, supprimerSeance, seanceMemeJour } from '../store/seances.js';
import { t } from '../i18n/index.js';
import { EXERCISES, IMG_BASE } from '../data/exercices.js';
import { SESSION_EXOS } from '../data/sessionExos.js';
import { retourEntrainer, allerVers } from './Entrainer.jsx';
import '../legacy/seance.scoped.css';
// La fiche agrandie reutilise les regles .exo-fiche, ecrites pour
// l'ecran de selection mais non prefixees : elles s'appliquent ici.
import '../legacy/selection-exercices.scoped.css';

// ==========================================================
// ECRAN "Ma seance" — transpose du v1 (seance.body.html, ecran 2).
// Banniere + progression + Commencer + liste d'exercices avec
// checkbox de completion et depliage des series (kg x reps).
// props: seanceId ('deb-full-3j-1'), titre, retour (fn optionnelle)
// ==========================================================

const NOMS_MUSCLES = {
  pecs: 'Pecs', dos: 'Dos', epaules: 'Épaules', biceps: 'Biceps',
  triceps: 'Triceps', jambes: 'Jambes', abdos: 'Abdos',
  etirements: 'Étirements', cardio: 'Cardio',
};

// Resout un seanceId -> liste d'exercices (ordre impose du programme)
function resoudreExercices(seanceId) {
  // Les references sont des NOMS depuis le 10/08 : « dos:Tractions ».
  // Elles etaient des positions, « dos:3 », et se sont decalees le
  // jour ou la base d'exercices a ete retriee — les seances servaient
  // alors des exercices arbitraires. Un nom ne se decale pas.
  const bruts = SESSION_EXOS[seanceId] || [];
  return bruts.map((ref) => {
    const sep = String(ref).indexOf(':');
    const mKey = String(ref).slice(0, sep);
    const nom = String(ref).slice(sep + 1);
    const groupe = EXERCISES[mKey] || [];
    const ex = groupe.find(e => e.nom === nom);
    return ex ? { mKey, ex } : null;
  }).filter(Boolean);
}

function lireSetLog() {
  try { return JSON.parse(localStorage.getItem('repz_setLog') || '{}'); } catch { return {}; }
}
function ecrireSetLog(log) {
  try { localStorage.setItem('repz_setLog', JSON.stringify(log)); } catch {}
}
function dernierePerf(nom) {
  const hist = lireSetLog()[nom];
  if (!hist || !hist.length) return null;
  const sets = hist[hist.length - 1].sets.filter(s => s.w !== '' || s.r !== '');
  if (!sets.length) return null;
  const w = sets[0].w;
  const sameW = sets.every(s => s.w === w);
  if (sameW && w !== '') return `${w} kg × ${sets.map(s => s.r || '?').join(' · ')}`;
  return sets.map(s => `${s.w || '?'}kg×${s.r || '?'}`).join(' · ');
}

export function SeanceDetail({ seanceId, titre, retour }) {
  const refs = resoudreExercices(seanceId);
  const total = refs.length;

  const [demarree, setDemarree] = useState(false);
  const [faits, setFaits] = useState(() => new Set());       // index coches
  const [ouverts, setOuverts] = useState(() => new Set());   // panneaux series ouverts
  const [secondes, setSecondes] = useState(0);
  // series[i] = [{w:'',r:''}, ...]
  const [series, setSeries] = useState({});

  const revenir = retour || retourEntrainer;
  const [fini, setFini] = useState(null);
  const [apercu, setApercu] = useState(null);   // index de l'exercice montre en grand
  const [conflit, setConflit] = useState(null); // seance deja notee ce jour-la, en attente d'arbitrage
  // « progId-index » : on retire l'index pour retrouver le programme,
  // et donc l'ecran ou l'on pose ses jours.
  const progId = String(seanceId || '').replace(/-\d+$/, '') || null;

  /**
   * Termine la seance : elle rejoint « Mes seances », et ses muscles
   * colorent le calendrier et le mannequin via enregistrerSeance ->
   * noterMuscles. C'est la convergence des deux branches de
   * l'organigramme vers « Fin de seance ».
   */
  const enregistrer = (aRemplacer) => {
    const exos = refs
      .map(({ mKey, ex }, i) => ({ mKey, nom: ex.nom, fait: faits.has(i), series: series[i] || [] }))
      .filter(e => e.fait);
    // Rien de coche : on enregistre quand meme la seance ouverte,
    // sinon un entrainement fait sans cocher disparaitrait.
    const retenus = exos.length ? exos : refs.map(({ mKey, ex }) => ({ mKey, nom: ex.nom, fait: true, series: [] }));
    if (aRemplacer) supprimerSeance(aRemplacer.id);
    enregistrerSeance({
      titre: titre || t('session'),
      duree: secondes,
      muscles: [...new Set(retenus.map(e => e.mKey).filter(Boolean))],
      exos: retenus,
    });
    setConflit(null);
    setFini({ exos: retenus.length, min: Math.max(1, Math.round(secondes / 60)) });
  };

  /**
   * Raci, 5/09 : « s'il y a risque de doublon, un message d'alerte ».
   * Le remplacement automatique decidait a sa place. On demande : la
   * meme seance est deja notee aujourd'hui, veut-il corriger celle-la
   * ou en garder deux ? Les deux reponses sont legitimes — on peut
   * refaire un entrainement dans la journee.
   */
  const terminer = () => {
    if (fini) return;
    const iso = new Date().toISOString().slice(0, 10);
    const deja = seanceMemeJour(iso, titre || t('session'));
    if (deja) { setConflit(deja); return; }
    enregistrer(null);
  };

  // Chrono de seance
  useEffect(() => {
    if (!demarree) return;
    const it = setInterval(() => setSecondes(s => s + 1), 1000);
    return () => clearInterval(it);
  }, [demarree]);

  const mmss = `${Math.floor(secondes / 60)}:${String(secondes % 60).padStart(2, '0')}`;
  const done = faits.size;
  const pct = total ? Math.round((done / total) * 100) : 0;

  // Raci, 5/09 : « pouvoir cocher les exercices sans avoir demarre le
  // chrono ». La liste etait verrouillee jusqu'a « Commencer » : on ne
  // pouvait pas preparer sa seance, seulement la subir dans l'ordre.
  // Cocher avant de demarrer ne lance rien — « Commencer » ne sert
  // plus qu'a lancer le chrono.
  const basculerFait = (i) => {
    setFaits(prev => {
      const s = new Set(prev);
      s.has(i) ? s.delete(i) : s.add(i);
      return s;
    });
  };

  const basculerSeries = (i) => {
    setOuverts(prev => {
      const s = new Set(prev);
      s.has(i) ? s.delete(i) : s.add(i);
      return s;
    });
    setSeries(prev => {
      if (prev[i] && prev[i].length) return prev;
      return { ...prev, [i]: [{ w: '', r: '' }, { w: '', r: '' }, { w: '', r: '' }] };
    });
  };

  const majSerie = (i, k, champ, val) => {
    setSeries(prev => {
      const lignes = (prev[i] || []).map((l, idx) => idx === k ? { ...l, [champ]: val } : l);
      return { ...prev, [i]: lignes };
    });
  };
  const ajouterSerie = (i) => {
    setSeries(prev => ({ ...prev, [i]: [...(prev[i] || []), { w: '', r: '' }] }));
  };

  return (
    <div class="pg-seance">
      {/* Barre orange du v1 retiree le 26/08 (voir Programmes.jsx) :
          la fleche de l'en-tete de seance ramene deja en arriere, et
          Premium est un onglet de la barre du bas. */}
      <div class="sess-hero">
        <button class="sh-back" onClick={revenir} aria-label="Retour">←</button>
        <h1 class="sh-title">{titre || 'Ma séance'}</h1>
        <div class="sh-meta show">{total} exercices · 45-60 min</div>
      </div>

      <div class="session-progress">
        <div class="sp-line">
          <span><b>{done}</b><span class="sp-dim">/{total} exercices</span></span>
          <span class="sp-timer">{mmss}</span>
        </div>
        <div class="bar"><div class="fill" style={{ width: pct + '%' }} /></div>
      </div>

      {!demarree && (
        <button class="start-session-btn" onClick={() => setDemarree(true)}>Commencer</button>
      )}

      {/* Fin de seance. Elle n'existait PAS : la branche « programme »
          de l'organigramme de Raci s'arretait ici, sans rien
          enregistrer. On terminait une seance de programme et il n'en
          restait aucune trace — ni dans la liste des seances, ni au
          calendrier, ni sur le mannequin. Seule la seance libre
          enregistrait. */}
      {demarree && !fini && (
        <button class="sd-terminer" onClick={terminer}>
          {done === total && total > 0 ? t('sd_terminer') : t('sd_terminer_partiel', { n: done, t: total })}
        </button>
      )}

      {/* Raci, 5/09 : « pas pratique de devoir faire retour au journal
          pour faire la suite ». Une seule sortie, et elle s'appelait
          « Retour au journal » meme quand elle ramenait a la page du
          programme. Deux sorties nommees pour ce qu'elles font, et un
          acces direct a la planification des jours restants. */}
      {/* Arbitrage du doublon (Raci, 5/09 : deux choix, pas trois).
          Les deux boutons nomment la seance qu'ils GARDENT, jamais
          celle qu'ils effacent — « remplacer l'ancienne » et « garder
          les deux » demandaient de deviner ce qui restait. L'heure
          identifie l'enregistrement existant : sans elle, « une seance
          existe deja » ne dit pas laquelle. Garder l'ancienne
          n'enregistre rien et rend la main. */}
      {conflit && (
        <div class="sd-conflit">
          <div class="sd-conflit-t">Cette séance est déjà enregistrée aujourd'hui</div>
          <div class="sd-conflit-l">
            « {conflit.titre} » est déjà notée à {heureDe(conflit.ts)}.
            Une seule des deux sera gardée.
          </div>
          <button class="sd-conflit-oui" onClick={() => enregistrer(conflit)}>
            Remplacer par celle-ci
          </button>
          <button class="sd-conflit-non" onClick={() => { setConflit(null); revenir(); }}>
            Garder celle de {heureDe(conflit.ts)}
          </button>
        </div>
      )}

      {fini && (
        <div class="sd-fini">
          <div class="sd-fini-t">{t('sd_bravo')}</div>
          <div class="sd-fini-l">
            {t('sd_fini_resume', { n: fini.exos, min: fini.min })}
          </div>
          {progId && (
            <button class="sd-fini-b" onClick={() => allerVers('planifier', { prog: progId })}>
              {t('sd_planifier')}
            </button>
          )}
          <button class={'sd-fini-b' + (progId ? ' sd-fini-b--second' : '')} onClick={revenir}>
            {retour ? t('sd_retour_prog') : t('sd_retour_journal')}
          </button>
        </div>
      )}

      <div id="sessionList">
        {refs.map(({ mKey, ex }, i) => {
          const last = dernierePerf(ex.nom);
          const estFait = faits.has(i);
          const panOuvert = ouverts.has(i);
          const meta = (ex.meta || '').replace(/\s*×\s*/g, ' × ');
          return (
            <div class={'done-item' + (estFait ? ' done' : '')} key={i} onClick={() => basculerFait(i)} style="flex-wrap:wrap">
              {/* Raci, 5/09 : « les images ne s'agrandissent plus, elles
                  se selectionnent directement ». Depuis que la liste
                  n'est plus verrouillee, toucher la vignette cochait
                  l'exercice. Elle ouvre desormais la fiche, comme sur
                  l'ecran de selection : on voit le mouvement avant de
                  decider. Le clic ne remonte pas a la ligne. */}
              <div class="done-photo" role="button" tabIndex={0}
                aria-label={'Voir ' + ex.nom}
                onClick={(e) => { e.stopPropagation(); setApercu(i); }}>
                <img src={`${IMG_BASE}${ex.imgId}/0.jpg`} alt={ex.nom} loading="lazy"
                  onError={(e) => e.currentTarget.parentElement.classList.add('no-img')} />
              </div>
              <div class="done-info">
                <div class="done-name">{ex.nom}</div>
                <div class="done-meta">{meta}</div>
                <div class="ex-chips">
                  {NOMS_MUSCLES[mKey] && <span class="ex-chip">{NOMS_MUSCLES[mKey]}</span>}
                  {last && <span class="ex-chip gold">Dernier {last}</span>}
                </div>
                <button class="sets-btn" onClick={(e) => { e.stopPropagation(); basculerSeries(i); }}>Séries</button>
              </div>
              <div class="done-check">✓</div>
              {panOuvert && (
                <div class="sets-panel open" onClick={(e) => e.stopPropagation()}>
                  {last && <div class="sets-last">Dernière fois : <b>{last}</b></div>}
                  <div>
                    {(series[i] || []).map((l, k) => (
                      <div class="set-row" key={k}>
                        <span class="set-num">{k + 1}</span>
                        <input type="number" inputMode="numeric" placeholder="kg" value={l.w}
                          onInput={(e) => majSerie(i, k, 'w', e.currentTarget.value)} />
                        <span class="set-x">×</span>
                        <input type="number" inputMode="numeric" placeholder="reps" value={l.r}
                          onInput={(e) => majSerie(i, k, 'r', e.currentTarget.value)} />
                      </div>
                    ))}
                  </div>
                  <button class="set-add" onClick={() => ajouterSerie(i)}>＋ Ajouter une série</button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {apercu !== null && refs[apercu] && (
        <ApercuExercice mKey={refs[apercu].mKey} ex={refs[apercu].ex}
          fermer={() => setApercu(null)} />
      )}
    </div>
  );
}

// ============================================================
// APERCU D'UN EXERCICE
// Les deux vues de la base — depart et fin — parce qu'une pose
// seule ne dit pas le mouvement. Lecture seule : depuis la seance
// l'exercice est deja choisi, il n'y a rien a ajouter ni a retirer.
// ============================================================
/** « 16:02 » — l'heure d'enregistrement d'une seance. */
function heureDe(ts) {
  const d = new Date(ts);
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

function ApercuExercice({ mKey, ex, fermer }) {
  if (!ex) return null;
  const vues = ex.imgId ? [0, 1] : [];
  const meta = (ex.meta || '').replace(/\s*×\s*/g, ' × ');
  return createPortal(
    <div class="exo-fiche" onClick={(e) => { if (e.target === e.currentTarget) fermer(); }}>
      <div class="exo-fiche-carte exo-fiche--bande">
        <div class="exo-fiche-bande" style={{ background: '#151515' }}>
          <div class="exo-fiche-muscle">{NOMS_MUSCLES[mKey] || ''}</div>
          <h2>{ex.nom}</h2>
          <button class="exo-fiche-fermer" onClick={fermer} aria-label="Fermer">×</button>
        </div>

        <div class="exo-fiche-vues">
          {vues.map(n => (
            <div key={n} class="exo-fiche-vue"
              style={{ backgroundImage: `url('${IMG_BASE}${ex.imgId}/${n}.jpg')` }} />
          ))}
        </div>

        {meta && (
          <div class="exo-fiche-meta"><span>{meta}</span></div>
        )}
      </div>
    </div>,
    document.body
  );
}
