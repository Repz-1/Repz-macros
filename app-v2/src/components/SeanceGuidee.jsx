import { useState, useEffect, useRef } from 'preact/hooks';
import { enregistrerSeance, supprimerSeance, seanceMemeJour } from '../store/seances.js';
import { t } from '../i18n/index.js';
import { EXERCISES, IMG_BASE } from '../data/exercices.js';
import { SESSION_EXOS } from '../data/sessionExos.js';
import { retourEntrainer } from './Entrainer.jsx';
import '../styles/seance-guidee.css';

// ==========================================================
// SEANCE GUIDEE — un exercice a la fois, une serie a la fois.
//
// Raci, 5/09 : « Demarrer la seance fera demarrer la seance en
// partant du principe que l'utilisateur est au sport et qu'il veut
// commencer. Et pour chaque serie tu feras en sorte qu'il puisse
// faire suivant suivant suivant jusqu'a l'exercice suivant. »
//
// Remplace la liste a cocher : on ne coche plus apres coup ce qu'on
// croit avoir fait, on avance au fur et a mesure. Un seul bouton,
// « Suivant », valide la serie, lance le repos, puis enchaine — et
// passe a l'exercice suivant quand toutes les series sont posees.
//
// props: seanceId ('deb-full-3j-1'), titre, retour (fn optionnelle)
// ==========================================================

const NOMS_MUSCLES = {
  pecs: 'Pecs', dos: 'Dos', epaules: 'Épaules', biceps: 'Biceps',
  triceps: 'Triceps', jambes: 'Jambes', abdos: 'Abdos',
  etirements: 'Étirements', cardio: 'Cardio',
};

/** Resout un seanceId -> liste d'exercices, dans l'ordre du programme. */
function resoudreExercices(seanceId) {
  // Les references sont des NOMS depuis le 10/08 : « dos:Tractions ».
  // Elles etaient des positions et se sont decalees le jour ou la base
  // a ete retriee. Un nom ne se decale pas.
  const bruts = SESSION_EXOS[seanceId] || [];
  return bruts.map((ref) => {
    const sep = String(ref).indexOf(':');
    const mKey = String(ref).slice(0, sep);
    const nom = String(ref).slice(sep + 1);
    const ex = (EXERCISES[mKey] || []).find(e => e.nom === nom);
    return ex ? { mKey, ex } : null;
  }).filter(Boolean);
}

/** « 4 séries × 8-10 reps » -> 4. Trois series par defaut. */
function nbSeries(meta) {
  const m = String(meta || '').match(/(\d+)\s*s[ée]rie/i);
  return m ? Math.max(1, Math.min(10, +m[1])) : 3;
}

/**
 * Duree de repos, en secondes. Conseil de coach de Raci : trois
 * minutes sur les mouvements lourds — squat, developpe, souleve de
 * terre, rowing barre — ou l'on chargera plus au repos suivant ;
 * 1 min 15 suffit sur l'isolation.
 */
const LOURDS = /squat|d[ée]velopp[ée]|soulev[ée]|rowing|traction|dip|presse|fente/i;
function reposDe(nom) {
  return LOURDS.test(nom || '') ? 180 : 75;
}

// ---------- historique des charges (partage avec l'ancien ecran) ----------
function lireSetLog() {
  try { return JSON.parse(localStorage.getItem('repz_setLog') || '{}'); } catch { return {}; }
}
function ecrireSetLog(log) {
  try { localStorage.setItem('repz_setLog', JSON.stringify(log)); } catch {}
}
/** La derniere serie notee sur ce mouvement : { w, r } ou null. */
function derniereSerie(nom) {
  const hist = lireSetLog()[nom];
  if (!hist || !hist.length) return null;
  const sets = (hist[hist.length - 1].sets || []).filter(s => s.w !== '' || s.r !== '');
  return sets.length ? sets[sets.length - 1] : null;
}

// ---------- reprise d'une seance interrompue ----------
const CLE_COURS = 'belfit_seance_en_cours';
function lireEnCours(seanceId) {
  try {
    const e = JSON.parse(localStorage.getItem(CLE_COURS) || 'null');
    return e && e.seanceId === seanceId ? e : null;
  } catch { return null; }
}
function ecrireEnCours(e) {
  try { localStorage.setItem(CLE_COURS, JSON.stringify(e)); } catch {}
}
function oublierEnCours() {
  try { localStorage.removeItem(CLE_COURS); } catch {}
}

function mmss(s) {
  const m = Math.floor(Math.max(0, s) / 60);
  return m + ':' + String(Math.max(0, s) % 60).padStart(2, '0');
}

export function SeanceGuidee({ seanceId, titre, retour }) {
  const refs = resoudreExercices(seanceId);
  const revenir = retour || retourEntrainer;

  // Reprise : si la meme seance etait en cours, on repart d'ou l'on
  // etait. C'est le point que Raci reclamait — jusqu'ici, quitter
  // l'ecran perdait tout.
  const repris = lireEnCours(seanceId);

  const [iExo, setIExo] = useState(repris ? repris.iExo : 0);
  const [iSerie, setISerie] = useState(repris ? repris.iSerie : 0);
  const [journal, setJournal] = useState(repris ? repris.journal : {});
  const [secondes, setSecondes] = useState(repris ? repris.secondes : 0);
  const [termine, setTermine] = useState(false);

  const courant = refs[iExo] || null;
  const seriesAttendues = courant ? nbSeries(courant.ex.meta) : 0;

  // Champs de la serie en cours. Pre-remplis avec la derniere serie
  // notee sur CE mouvement : on n'ajuste que ce qui a change.
  const [kg, setKg] = useState('');
  const [reps, setReps] = useState('');
  const [repos, setRepos] = useState(0);        // secondes restantes, 0 = pas de repos

  // A chaque changement d'exercice ou de serie, on repropose la
  // derniere valeur connue : celle de la serie precedente du jour si
  // elle existe, sinon celle de la derniere seance.
  useEffect(() => {
    if (!courant) return;
    const faites = journal[iExo] || [];
    const precedente = faites.length ? faites[faites.length - 1] : derniereSerie(courant.ex.nom);
    setKg(precedente && precedente.w != null ? String(precedente.w) : '');
    setReps(precedente && precedente.r != null ? String(precedente.r) : '');
  }, [iExo, iSerie]);

  // Chrono de seance : il court tant qu'on n'a pas enregistre.
  useEffect(() => {
    if (termine) return;
    const it = setInterval(() => setSecondes(s => s + 1), 1000);
    return () => clearInterval(it);
  }, [termine]);

  // Compte a rebours du repos.
  useEffect(() => {
    if (repos <= 0) return;
    const it = setInterval(() => setRepos(r => (r <= 1 ? 0 : r - 1)), 1000);
    return () => clearInterval(it);
  }, [repos > 0]);

  // Sauvegarde continue : l'app peut etre fermee au milieu d'une
  // serie sans rien perdre.
  useEffect(() => {
    if (termine) return;
    ecrireEnCours({ seanceId, iExo, iSerie, journal, secondes });
  }, [iExo, iSerie, journal, secondes, termine]);

  const totalSeries = refs.reduce((n, r) => n + nbSeries(r.ex.meta), 0);
  const faitesTotal = Object.values(journal).reduce((n, l) => n + l.length, 0);
  const avance = totalSeries ? Math.round((faitesTotal / totalSeries) * 100) : 0;

  /** Valide la serie affichee, puis enchaine. */
  const suivant = () => {
    if (!courant) return;
    const ligne = (journal[iExo] || []).concat([{ w: kg, r: reps }]);
    const maj = { ...journal, [iExo]: ligne };
    setJournal(maj);

    if (ligne.length >= seriesAttendues) {
      // Exercice termine : au suivant, sans repos — on change de
      // poste, le deplacement fait le repos.
      setRepos(0);
      if (iExo + 1 < refs.length) { setIExo(iExo + 1); setISerie(0); }
      else setTermine(true);
      return;
    }
    setISerie(ligne.length);
    setRepos(reposDe(courant.ex.nom));
  };

  const passerExercice = () => {
    setRepos(0);
    if (iExo + 1 < refs.length) { setIExo(iExo + 1); setISerie(0); }
    else setTermine(true);
  };

  /** Ecrit les charges dans l'historique, pour la prochaine fois. */
  const memoriserCharges = () => {
    const log = lireSetLog();
    refs.forEach(({ ex }, i) => {
      const sets = journal[i];
      if (!sets || !sets.length) return;
      log[ex.nom] = (log[ex.nom] || []).concat([{ date: Date.now(), sets }]).slice(-20);
    });
    ecrireSetLog(log);
  };

  /**
   * Enregistrement — le seul, en fin de parcours. Il ecrase la seance
   * du meme jour portant le meme nom (Raci, 5/09 : « ca ecrase la
   * precedente et c'est tout »).
   */
  const enregistrer = () => {
    const exos = refs
      .map(({ mKey, ex }, i) => ({ mKey, nom: ex.nom, fait: !!(journal[i] || []).length, series: journal[i] || [] }))
      .filter(e => e.fait);
    if (!exos.length) { oublierEnCours(); revenir(); return; }
    memoriserCharges();
    const iso = new Date().toISOString().slice(0, 10);
    const deja = seanceMemeJour(iso, titre || t('session'));
    if (deja) supprimerSeance(deja.id);
    enregistrerSeance({
      titre: titre || t('session'),
      duree: secondes,
      muscles: [...new Set(exos.map(e => e.mKey).filter(Boolean))],
      exos,
    });
    oublierEnCours();
    revenir();
  };

  // ---------- Ecran de fin ----------
  if (termine) {
    const nbExos = Object.keys(journal).filter(i => (journal[i] || []).length).length;
    const tonnage = Object.values(journal).flat()
      .reduce((n, s) => n + (parseFloat(s.w) || 0) * (parseFloat(s.r) || 0), 0);
    return (
      <div class="sg">
        <div class="sg-fin-t">Séance terminée</div>
        <div class="sg-fin-s">{titre}</div>
        <div class="sg-recap">
          <div><span>Exercices</span><b>{nbExos} / {refs.length}</b></div>
          <div><span>Séries effectuées</span><b>{faitesTotal} / {totalSeries}</b></div>
          {tonnage > 0 && <div><span>Tonnage total</span><b>{Math.round(tonnage).toLocaleString('fr-BE')} kg</b></div>}
          <div><span>Durée</span><b>{mmss(secondes)}</b></div>
        </div>
        <button class="sg-go" onClick={enregistrer}>Enregistrer la séance</button>
        <div class="sg-sec">
          <button onClick={() => setTermine(false)}>Reprendre</button>
        </div>
      </div>
    );
  }

  if (!courant) {
    return (
      <div class="sg">
        <div class="sg-fin-t">Aucun exercice</div>
        <div class="sg-fin-s">Cette séance n'a pas d'exercices enregistrés.</div>
        <button class="sg-go" onClick={revenir}>Retour</button>
      </div>
    );
  }

  const faites = journal[iExo] || [];
  const pastilles = Array.from({ length: seriesAttendues }, (_, n) => n);

  return (
    <div class="sg">
      <div class="sg-hd">
        <span class="sg-hd-t">Exercice {iExo + 1} sur {refs.length}</span>
        <span class="sg-hd-c">{mmss(secondes)}</span>
      </div>
      <div class="sg-prog"><span style={{ width: avance + '%' }} /></div>

      {/* Raci, 5/09 : « le chrono apparait sur la MEME page et je peux
          l'arreter a n'importe quel moment, en plus de pouvoir le
          prolonger ou le raccourcir ». Le repos occupait tout l'ecran
          et cachait l'exercice : on ne voyait plus ce qu'on allait
          faire, ni ce qu'on venait de saisir. Il devient un bandeau
          au-dessus du bouton — la serie suivante est deja affichee et
          reste saisissable pendant qu'il tourne. */}
      {/* Maquette C, retenue par Raci le 5/09 : l'image devient le
          fond de l'ecran, nom et champs poses dessus sur un degrade
          sombre. Le voile monte a 88 % en bas — les champs se
          touchent avec des mains moites, ils ne peuvent pas flotter
          sur une photo claire. */}
      <div class="sg-scene"
        style={{ backgroundImage: `url('${IMG_BASE}${courant.ex.imgId}/0.jpg')` }}>
        <div class="sg-voile" />
        <div class="sg-haut">
          <span>{NOMS_MUSCLES[courant.mKey] || ''}</span>
          <span>{courant.ex.meta}</span>
        </div>
        <div class="sg-bas">
          <div class="sg-serie-t">SÉRIE {iSerie + 1} SUR {seriesAttendues}</div>
          <div class="sg-exo-n">{courant.ex.nom}</div>
          <div class="sg-champs">
            <label class="sg-ch">
              <input type="number" inputMode="decimal" value={kg}
                onInput={(e) => setKg(e.currentTarget.value)} placeholder="—" />
              <span>CHARGE (KG)</span>
            </label>
            <label class="sg-ch">
              <input type="number" inputMode="numeric" value={reps}
                onInput={(e) => setReps(e.currentTarget.value)} placeholder="—" />
              <span>RÉPÉTITIONS</span>
            </label>
          </div>
        </div>
      </div>

      <div class="sg-pts">
        {pastilles.map(n => (
          <span key={n} class={'sg-pt' + (n < faites.length ? ' ok' : (n === faites.length ? ' now' : ''))}>
            {n + 1}
          </span>
        ))}
      </div>

      {repos > 0 && (
        <div class="sg-repos">
          <span class="sg-repos-l">REPOS</span>
          <span class="sg-repos-c">{mmss(repos)}</span>
          <button class="sg-repos-b" onClick={() => setRepos(r => Math.max(1, r - 30))}>−30</button>
          <button class="sg-repos-b" onClick={() => setRepos(r => r + 30)}>+30</button>
          <button class="sg-repos-x" onClick={() => setRepos(0)}>Arrêter</button>
        </div>
      )}

      <button class="sg-go" onClick={suivant}>
        {faites.length + 1 >= seriesAttendues && iExo + 1 >= refs.length
          ? 'Terminer ›' : 'Suivant ›'}
      </button>
      <div class="sg-sec">
        <button onClick={passerExercice}>Passer l'exercice</button>
        <button onClick={() => setTermine(true)}>Terminer la séance</button>
      </div>
    </div>
  );
}
