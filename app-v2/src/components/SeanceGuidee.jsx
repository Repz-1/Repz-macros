import { useState, useEffect, useRef } from 'preact/hooks';
import { createPortal } from 'preact/compat';
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

/**
 * Les exercices de rechange quand on n'a pas le materiel.
 *
 * Raci, 5/09 : « un bouton dans le cas ou l'utilisateur ne possede
 * pas la possibilite de faire tel exercice — proposer un equivalent
 * machine si c'etait une machine au depart, et vice-versa halteres
 * si c'etait un exercice pour halteres ». On bascule donc de famille :
 * une machine renvoie vers du libre (halteres, barre, poids du
 * corps), un mouvement libre renvoie vers la machine.
 *
 * Le classement se fait par mots communs avec le nom d'origine :
 * « Chest Press (Machine) » remonte « Developpe Couche (Haltere) »
 * avant « Curl Biceps », parce qu'on cherche le meme geste, pas
 * seulement le meme muscle.
 */
const LIBRE = new Set(['halteres', 'barre', 'rien', 'traction']);

/**
 * Le GESTE, deduit du nom. Les mots communs ne suffisent pas :
 * « Presse a Cuisses (Machine) » et « Squat (Barre) » ne partagent
 * aucun mot alors que c'est le meme mouvement, tandis que
 * « Presse a Cuisses » et « Presse Epaules » en partagent un sans
 * rien avoir en commun. On range donc les mouvements par famille.
 */
const GESTES = [
  ['pousse-jambes', /presse a cuisses|hack squat|squat|fente|split squat|box squat/],
  ['ischios', /leg curl|ischio|souleve de terre jambes tendues|glute ham/],
  ['quadriceps', /extension jambes/],
  ['mollets', /mollet/],
  ['hanche', /souleve de terre|hip thrust|bassin|good morning|adduction|abduction/],
  ['pousse-horizontal', /chest press|developpe couche|pompe|dips/],
  ['pousse-vertical', /presse epaules|developpe militaire|developpe epaules|overhead/],
  ['ouverture', /ecarte|pec deck|oiseau|ecart inverse|elevation laterale/],
  ['tirage-vertical', /tirage poitrine|traction|tirage nuque|pull ?over/],
  ['tirage-horizontal', /rowing|tirage assis|tirage horizontal/],
  ['biceps', /curl/],
  ['triceps', /extension triceps|kickback|barre au front/],
  ['abdos', /crunch|planche|rotation|releve|flexion laterale|pallof/],
];
/**
 * Certains gestes n'ont pas d'equivalent dans l'autre famille :
 * l'extension de jambes n'existe qu'a la machine. On se rabat alors
 * sur le geste voisin qui travaille le meme muscle.
 */
const REPLI = { quadriceps: 'pousse-jambes', ischios: 'hanche', ouverture: 'pousse-horizontal' };

function gesteDe(nom) {
  const n = String(nom).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const g = GESTES.find(([, re]) => re.test(n));
  return g ? g[0] : null;
}
function motsDe(nom) {
  return new Set(String(nom).toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(m => m.length > 2));
}
function equivalents(mKey, ex) {
  const versLibre = ex.mat === 'machine';
  const mots = motsDe(ex.nom);
  const geste = gesteDe(ex.nom);
  return (EXERCISES[mKey] || [])
    .filter(x => x.nom !== ex.nom && (versLibre ? LIBRE.has(x.mat) : x.mat === 'machine'))
    .map(x => {
      const c = motsDe(x.nom);
      let communs = 0;
      mots.forEach(m => { if (c.has(m)) communs++; });
      // Le geste passe avant les mots : c'est lui qui fait
      // l'equivalence, le nom n'est qu'un indice.
      const g = gesteDe(x.nom);
      const memeGeste = geste && g === geste ? 10
        : (geste && REPLI[geste] && g === REPLI[geste] ? 6 : 0);
      return { ex: x, score: memeGeste + communs };
    })
    .sort((a, b) => b.score - a.score)
    .filter((o, i, l) => o.score > 0 || l[0].score === 0)
    .slice(0, 4)
    .map(o => o.ex);
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

  // Remplacements choisis pendant la seance, par position. Raci,
  // 5/09 : la salle n'a pas toujours la machine du programme.
  const [remplaces, setRemplaces] = useState({});
  const [choixMateriel, setChoixMateriel] = useState(false);

  const courant = remplaces[iExo] || refs[iExo] || null;
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
    const posees = journal[iExo] || [];
    // On revient sur une serie deja faite : on affiche SES valeurs,
    // pas une proposition (Raci, 5/09).
    if (iSerie < posees.length) {
      const s = posees[iSerie];
      setKg(s && s.w != null ? String(s.w) : '');
      setReps(s && s.r != null ? String(s.r) : '');
      return;
    }
    const precedente = posees.length ? posees[posees.length - 1] : derniereSerie(courant.ex.nom);
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
      // Raci, 5/09 : « il faut egalement prevoir un temps de repos
      // entre les differents exercices ». Je supposais que le
      // deplacement d'un poste a l'autre suffisait ; il ne suffit pas,
      // et c'est justement la que la fatigue s'accumule. Le repos
      // inter-exercices est celui du mouvement QUI VIENT — trois
      // minutes avant un squat, 1 min 15 avant une isolation.
      if (iExo + 1 < refs.length) {
        setIExo(iExo + 1);
        setISerie(0);
        setRepos(reposDe(refs[iExo + 1].ex.nom));
      } else {
        setRepos(0);
        setTermine(true);
      }
      return;
    }
    setISerie(ligne.length);
    setRepos(reposDe(courant.ex.nom));
  };

  /**
   * Raci, 5/09 : « je veux pouvoir revenir sur une serie quelconque
   * pour modifier charge et/ou reps, mais elle ne doit plus pouvoir se
   * relancer si elle a deja ete faite ». Corriger n'avance donc rien :
   * ni serie suivante, ni repos, ni exercice. On reecrit la ligne et
   * on revient la ou l'on en etait.
   */
  const corriger = () => {
    const posees = (journal[iExo] || []).slice();
    if (iSerie >= posees.length) return;
    posees[iSerie] = { w: kg, r: reps };
    setJournal({ ...journal, [iExo]: posees });
    setISerie(posees.length);
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
    oublierEnCours();
    if (!exos.length) return;
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
  };

  /**
   * Raci, 5/09 : « termine c'est termine, on part du principe qu'elle
   * a ete faite ». Plus de bouton pour confirmer ni pour revenir en
   * arriere : atteindre l'ecran de fin ENREGISTRE. On felicite, puis
   * un compte a rebours de 20 s ramene a S'entrainer — et le bouton
   * du compte a rebours est ce retour, touchable a tout moment.
   */
  const [rebours, setRebours] = useState(7);   // 20 s etait une attente, pas une pause (Raci, 5/09)
  const dejaEcrit = useRef(false);
  useEffect(() => {
    if (!termine) return;
    if (!dejaEcrit.current) { dejaEcrit.current = true; enregistrer(); }
    const it = setInterval(() => setRebours(r => {
      if (r <= 1) { clearInterval(it); revenir(); return 0; }
      return r - 1;
    }), 1000);
    return () => clearInterval(it);
  }, [termine]);

  // ---------- Ecran de fin ----------
  if (termine) {
    const nbExos = Object.keys(journal).filter(i => (journal[i] || []).length).length;
    const tonnage = Object.values(journal).flat()
      .reduce((n, s) => n + (parseFloat(s.w) || 0) * (parseFloat(s.r) || 0), 0);
    return createPortal(
      <div class="sg-scene-fin">
        <div class="sg-fin">
          <div class="sg-fin-t">Bravo</div>
          <div class="sg-fin-s">{titre}</div>
          <div class="sg-recap">
            <div><span>Exercices</span><b>{nbExos} / {refs.length}</b></div>
            <div><span>Séries effectuées</span><b>{faitesTotal} / {totalSeries}</b></div>
            {tonnage > 0 && <div><span>Tonnage total</span><b>{Math.round(tonnage).toLocaleString('fr-BE')} kg</b></div>}
            <div><span>Durée</span><b>{mmss(secondes)}</b></div>
          </div>
          {/* Le compte a rebours EST le bouton : on n'attend que si on
              veut relire ses chiffres. Un seul mot — « Revenir a
              S'entrainer » nommait un ecran, alors que le geste est
              simplement de fermer ce qui est fini (Raci, 5/09). */}
          <button class="sg-go sg-fin-b" onClick={revenir}>
            Terminer <span class="sg-rebours">{rebours}</span>
          </button>
        </div>
      </div>,
      document.body
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
  // On regarde une serie deja posee : le bouton corrige, il n'avance pas.
  const enCorrection = iSerie < faites.length;

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
      {/* Raci, 5/09 : le nom et les champs reviennent SUR la photo,
          mais celle-ci doit rester entiere — « je voudrais que les
          mains soient visibles ». Le cadre passe de 250 a 350 px et
          l'image se cale plus haut : le bloc de texte n'occupe plus
          que le tiers bas, la ou il n'y a que le sol. Une copie
          floutee bouche les cotes quand la photo n'a pas le format du
          cadre, plutot que de la rogner. */}
      <div class="sg-scene">
        <div class="sg-fond"
          style={{ backgroundImage: `url('${IMG_BASE}${courant.ex.imgId}/0.jpg')` }} />
        <div class="sg-photo"
          style={{ backgroundImage: `url('${IMG_BASE}${courant.ex.imgId}/0.jpg')` }} />
        <div class="sg-voile" />
        <div class="sg-haut">
          <span>{NOMS_MUSCLES[courant.mKey] || ''}</span>
          <span>{courant.ex.meta}</span>
        </div>
        {/* Raci, 5/09 : « un bouton dans le cas ou l'utilisateur ne
            possede pas la possibilite de faire tel exercice, car il
            n'a pas le materiel ». Pose sur l'image, la ou l'on
            constate que la machine est prise ou absente. */}
        <button class="sg-swap" onClick={() => setChoixMateriel(true)}>
          {courant.ex.mat === 'machine' ? 'Pas cette machine ?' : 'Pas ce matériel ?'}
        </button>
        <div class="sg-bas">
          <div class="sg-serie-t">
            {enCorrection ? 'CORRECTION · ' : ''}SÉRIE {iSerie + 1} SUR {seriesAttendues}
          </div>
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

      {/* Les series deja posees se touchent : c'est le chemin du
          retour en arriere. Celle qui attend ne se touche pas, elle
          est deja a l'ecran. */}
      <div class="sg-pts">
        {pastilles.map(n => (
          n < faites.length ? (
            <button key={n} class={'sg-pt ok' + (n === iSerie ? ' vue' : '')}
              aria-label={'Corriger la série ' + (n + 1)}
              onClick={() => setISerie(n)}>{n + 1}</button>
          ) : (
            <span key={n} class={'sg-pt' + (n === iSerie ? ' now' : '')}>{n + 1}</span>
          )
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

      <button class={'sg-go' + (enCorrection ? ' sg-go--corr' : '')}
        onClick={enCorrection ? corriger : suivant}>
        {enCorrection ? 'Reprendre ma série ›'
          : (faites.length + 1 >= seriesAttendues && iExo + 1 >= refs.length
            ? 'Terminer ›' : 'Suivant ›')}
      </button>
      <div class="sg-sec">
        <button onClick={passerExercice}>Passer l'exercice</button>
        <button onClick={() => setTermine(true)}>Terminer la séance</button>
      </div>

      {choixMateriel && (
        <div class="sg-swap-voile" onClick={(e) => { if (e.target === e.currentTarget) setChoixMateriel(false); }}>
          <div class="sg-swap-carte">
            <div class="sg-swap-t">
              {courant.ex.mat === 'machine' ? 'Sans machine' : 'Sur machine'}
            </div>
            <div class="sg-swap-l">
              Même muscle, même geste — choisis ce que tu as sous la main.
            </div>
            {equivalents(courant.mKey, courant.ex).map(alt => (
              <button key={alt.nom} class="sg-swap-o"
                onClick={() => {
                  setRemplaces({ ...remplaces, [iExo]: { mKey: courant.mKey, ex: alt } });
                  setChoixMateriel(false);
                }}>
                <span class="sg-swap-n">{alt.nom}</span>
                <span class="sg-swap-fl" aria-hidden="true">&rsaquo;</span>
              </button>
            ))}
            <button class="sg-swap-x" onClick={() => setChoixMateriel(false)}>Annuler</button>
          </div>
        </div>
      )}
    </div>
  );
}
