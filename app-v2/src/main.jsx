import { render } from 'preact';
import { useState, useRef, useEffect } from 'preact/hooks';
import { animerGoutte, arreterGoutte } from './services/goutte.js';
import './styles.css';
import './styles/design-system.css';
import './styles/journal-socle.css';
// En dernier : l'en-tete commune passe devant les variantes de page.
import './styles/entete-commune.css';
import { utilisateur, authPrete, deconnexion } from './services/firebase.js';
import { LoginScreen } from './components/LoginScreen.jsx';
import { ACCES_INVITE, ONGLET_VITRINE } from './acces-invite.js';
import { VERSION_APP } from './version.js';
import { BandeauConfirmation } from './components/BandeauConfirmation.jsx';
import { repas, objectifs, donneesPretes, calculBaseFait } from './store/journal.js';
import { DayDashboard, ouvrirCalcDemande } from './components/DayDashboard.jsx';
import { WaterTracker } from './components/WaterTracker.jsx';
import { MealCard, ouvrirMesPlats } from './components/MealCard.jsx';
import { AddMealModal } from './components/AddMealModal.jsx';
import { TdeeCalculator } from './components/TdeeCalculator.jsx';
import { RestTimer } from './components/RestTimer.jsx';
import { SeanceTracker } from './components/SeanceTracker.jsx';
import { Programmes } from './components/Programmes.jsx';
import { Questionnaire } from './components/Questionnaire.jsx';
import { DemarrerSeance } from './components/DemarrerSeance.jsx';
import { PlanifierProgramme } from './components/PlanifierProgramme.jsx';
import { SelectionExercices } from './components/SelectionExercices.jsx';
import { Entrainer, vueEntrainer, retourEntrainer, allerVers } from './components/Entrainer.jsx';
import { Reglages, vueReglages } from './components/Reglages.jsx';
import { StatsAvancees, statsAvOuvertes } from './components/StatsAvancees.jsx';
import { depilerRetour, retourEnAttente } from './services/retour.js';
import { SeanceDetail } from './components/SeanceDetail.jsx';
import { MaSeance } from './components/MaSeance.jsx';
import { Stats } from './components/Stats.jsx';
import { BottomNav, ongletActif, allerOnglet, scrollSortant, defileur } from './components/BottomNav.jsx';
import { t, langue, setLangue, LANGUES } from './i18n/index.js';
import { signal } from '@preact/signals';
import { Entete, voletProfil } from './components/Entete.jsx';

import { PremiumPage, estPremium } from './components/PremiumPage.jsx';
import { Besoins, besoinsRequis } from './components/Besoins.jsx';
import { origineCalc } from './components/BelfitPlus.jsx';
import { IdeesRepas } from './components/IdeesRepas.jsx';
import { Courses } from './components/Courses.jsx';
import { WeightNote } from './components/WeightNote.jsx';
import { MealPage } from './components/MealPage.jsx';
import { repasOuvertId } from './components/MealCard.jsx';
import { MesPlats } from './components/MesPlats.jsx';

export function OngletJournal() {
  const [modale, setModale] = useState(false);
  const [calc, setCalc] = useState(false);
  // Le rappel de recalcul (carte Calories) demande l'ouverture par signal :
  // le composant ne possede pas l'etat de la modale, main.jsx si.
  if (ouvrirCalcDemande.value) {
    ouvrirCalcDemande.value = false;
    // Le calcul de base est offert une fois, consomme a l'inscription.
    // Ensuite le recalcul est Premium : il vient avec un programme sur
    // mesure, ce n'est plus la formule qu'on vend.
    if (estPremium.value || !calculBaseFait.value) setCalc(true);
    else ongletActif.value = 'premium';
  }
  // La goutte d'eau se deforme au fil du defilement : sa mecanique tourne
  // en boucle d'animation tant que le Journal est monte. Elle se coupe
  // toute seule si le bouton disparait du document.
  useEffect(() => { animerGoutte(); return arreterGoutte; }, []);

  // Colonne unique, ordre de lecture descendant :
  // logo -> calories -> actions rapides -> idees recettes -> repas.
  // Seuls la navigation, le bouton d'ajout et l'hydratation sont fixes.
  return (
    <div class="pg-journal">
      <div class="colonne">
        <Entete />
        <DayDashboard />
        {/* La pilule vit dans la carte Calories ; ici, uniquement le
            panneau qui se deplie, juste sous elle. */}
        <IdeesRepas panneauSeul />
        {/* Fente reservee a la goutte d'eau a quai. Elle vit ENTRE la
            carte Calories et la carte de pesee (Raci, 9/08) : quand la
            carte s'allonge avec le message « journee non cloturee », la
            goutte reste dans cet espace au lieu de mordre sur le coin de
            la carte. Quand la carte de pesee disparait, la fente reste le
            premier creux sous le cadran — la place initiale. Sa position
            est lue en direct par goutte.js, ne pas la retirer. */}
        <div class="fente-goutte" aria-hidden="true" />
        <WeightNote />
        {/* Le premier repas encore vide est mis en avant : a l'ouverture
            d'une journee c'est le petit-dejeuner, puis la mise en avant
            descend d'elle-meme des qu'un repas recoit son premier
            aliment. Quand tout est rempli, plus rien n'est souligne —
            la journee n'a plus d'etape suivante a montrer.
            Note : c'est bien le PREMIER vide, pas le suivant du dernier
            rempli. Sauter le dejeuner et remplir le diner laisse donc la
            marque sur le dejeuner, ce qui est le rappel utile. */}
        {(() => {
          const aSuivre = repas.value.find(r => r.ings.length === 0);
          return repas.value.map(r => (
            <MealCard key={r.id} r={r}
              aSuivre={aSuivre && r.id === aSuivre.id}
              fait={r.ings.length > 0} />
          ));
        })()}
        {/* L'ajout d'un repas vit desormais dans le flux, sous le
            dernier repas — plus de bouton flottant jaune (Raci). */}
        <div class="ajout-repas-rang">
          <button class="ajout-repas" onClick={() => setModale(true)}>
            <svg viewBox="0 0 24 24"><path d="M12 5.5v13M5.5 12h13" /></svg>
            {t('add_meal_btn')}
          </button>
        </div>

        {/* La ligne « Liste de courses » vivait ici. Retiree le 8/08 (Raci) :
            elle allongeait le Journal pour une entree deja presente dans
            BelFit+, et elle ouvrait aux comptes gratuits une fonction que
            le tableau comparatif de l'abonnement annonce comme Premium.
            L'unique acces est desormais la carte de BelFit+. */}
      </div>

      <div class="fab-rangee">
        <WaterTracker />
      </div>

      {modale && <AddMealModal montre={true} fermer={() => setModale(false)} />}
      {/* Ouvert depuis Mon programme, le calculateur y ramene : sa
          fleche annonce la destination, et la fermeture rebascule sur
          l'onglet BelFit+ ou la page est restee ouverte. Sans ca, on
          atterrissait sur le Journal, trois ecrans plus loin que d'ou
          l'on venait. */}
      {calc && (
        <TdeeCalculator
          montre={true}
          retour={origineCalc.value === 'programme' ? 'Mon programme' : undefined}
          fermer={() => {
            setCalc(false);
            if (origineCalc.value === 'programme') {
              origineCalc.value = null;
              allerOnglet('plus');
            }
          }}
        />
      )}
      {ouvrirMesPlats.value && <MesPlats fermer={() => { ouvrirMesPlats.value = false; }} />}
    </div>
  );
}

export function OngletEntrainer() {
  const vue = vueEntrainer.value;
  // Meme navigation qu'en v1 : une vue a la fois, fleche retour en haut.
  if (vue.nom === 'accueil') {
    return (<><Entrainer /><RestTimer /></>);
  }
  if (vue.nom === 'planifier') {
    return (<><PlanifierProgramme progId={vue.params && vue.params.prog} /><RestTimer /></>);
  }
  if (vue.nom === 'demarrer') {
    return (<><DemarrerSeance /><RestTimer /></>);
  }
  if (vue.nom === 'selection') {
    return (<><SelectionExercices /><RestTimer /></>);
  }
  if (vue.nom === 'maseance') {
    return (<><MaSeance /><RestTimer /></>);
  }
  if (vue.nom === 'programmes') {
    return (<><Programmes /><RestTimer /></>);
  }
  if (vue.nom === 'questionnaire') {
    return <Questionnaire />;
  }
  if (vue.nom === 'seanceDetail') {
    const p = vue.params || {};
    // Le retour depend d'ou l'on vient. Depuis la bibliotheque, on y
    // retourne. Depuis « Démarrer une séance », on revient au journal :
    // renvoyer vers « Tous les programmes » apres avoir termine sa
    // seance du jour n'a aucun sens — vu le 10/08 en eprouvant la
    // boucle complete.
    const versJournal = p.depuis === 'journal';
    // Retour d'UNE page, pas de deux. `allerVers('programmes')` sans
    // parametre rouvrait la bibliotheque a plat : on remontait deux
    // crans d'un coup, au lieu de revenir a la liste des seances du
    // programme (Raci, 26/08). L'identifiant de seance vaut
    // « progId-index » : on en retire l'index pour retrouver le
    // programme et rouvrir SA page.
    const progDeLaSeance = String(p.seanceId || '').replace(/-\d+$/, '');
    return (<><SeanceDetail seanceId={p.seanceId} titre={p.titre}
      retour={versJournal ? retourEntrainer
        : () => allerVers('programmes', progDeLaSeance ? { prog: progDeLaSeance } : {})} /><RestTimer /></>);
  }
  return (
    <div class="pg-entrainer">
      <button class="v2-retour" onClick={retourEntrainer} aria-label="Retour">←</button>
      {vue.nom === 'seance' && <SeanceTracker />}
      <RestTimer />
      <BandeauConfirmation />
    </div>
  );
}

/**
 * Banniere d'accès invite. Montee A LA RACINE, a cote de <App/>, et
 * non dedans : App comporte cinq retours anticipes — chargement,
 * connexion, donnees, Besoins, rail — et une banniere posee dans le
 * corps n'aurait ete vue que par le dernier. C'est le piege note le
 * 5/08 : un element qui doit s'afficher PARTOUT doit etre teste
 * depuis chaque branche, ou monte au-dessus d'elles. Elle est aussi
 * hors du rail de navigation, dont le `will-change: transform`
 * detourne le `position: fixed` de tous ses descendants.
 */
function AvisAccesInvite() {
  // La banniere occupe le haut de l'ecran en position fixe : sans
  // marge, elle recouvre l'en-tete de l'application. Vu sur la
  // capture de Raci du 10/08, le logo passait derriere. On decale
  // donc la page de la hauteur exacte de la banniere, mesuree apres
  // rendu — elle tient sur une ou deux lignes selon la largeur.
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    const poser = () => {
      const h = el ? Math.ceil(el.getBoundingClientRect().height) : 0;
      document.documentElement.style.setProperty('--haut-avis', h + 'px');
      document.documentElement.classList.toggle('avec-avis', h > 0);
    };
    poser();
    if (!el) return undefined;
    const ro = new ResizeObserver(poser);
    ro.observe(el);
    return () => {
      ro.disconnect();
      document.documentElement.classList.remove('avec-avis');
      document.documentElement.style.removeProperty('--haut-avis');
    };
  });

  if (!ACCES_INVITE) return null;
  const u = utilisateur.value;
  const invite = u && u.uid === '__invite__';
  return (
    <div class="acces-libre-avis" ref={ref}>
      {/* Le numero de version est AFFICHE ici. Le 10/08, Raci a
          decrit une banniere qui n'existait plus depuis deux
          versions : impossible de savoir, a distance, s'il lisait du
          code ancien ou un vrai defaut. Le numero repond a la
          question « quelle version lis-tu ? » sans avoir a la poser. */}
      <b>v{VERSION_APP}</b>{' · '}
      {invite
        ? 'Mode invité — données locales'
        : u
          /* Connecte avec son vrai compte : lui indiquer ou trouver
             le lien d'entree invite n'a aucun sens, il est deja
             entre. Ce qui reste vrai et utile, c'est que la porte est
             ouverte au public. Defaut vu sur la capture du 10/08. */
          ? 'Accès invité ouvert au public — à refermer après tes essais'
          : 'Accès invité ouvert — le lien « Entrer sans compte » est sous le formulaire'}
    </div>
  );
}

export function App() {
  if (!authPrete.value) {
    return <div style={{textAlign:'center',padding:'80px 20px',color:'#b5b0a4',fontWeight:600}}>…</div>;
  }
  if (!utilisateur.value) {
    return <LoginScreen />;
  }

  if (!donneesPretes.value) {
    return <div style={{textAlign:'center',padding:'80px 20px',color:'#b5b0a4',fontWeight:600}}>{t('chargement')}</div>;
  }

  // Etape 2 de l'inscription. Elle vaut aussi pour les comptes deja
  // crees qui n'ont jamais pose leurs objectifs : sans ca, on reparait
  // le probleme pour les nouveaux en le laissant aux anciens. Un compte
  // Google y passe comme les autres — c'est le chemin le plus emprunte,
  // l'exempter recreerait exactement le trou qu'on bouche.
  if (besoinsRequis()) {
    return <Besoins />;
  }

  const onglet = ongletActif.value;
  const ordre = ['journal', 'entrainer', 'stats', 'premium'];
  const idx = Math.max(0, ordre.indexOf(onglet === 'courses' ? 'journal' : onglet));

  // ============================================================
  // RAIL A 4 PANNEAUX — architecture de la v1 (ses 4 iframes).
  // Les quatre onglets sont montes EN PERMANENCE, chacun avec son
  // propre defilement interne. Changer d'onglet = translater le
  // rail. Aucun montage/demontage -> aucun flash, et chaque onglet
  // garde sa position de scroll, exactement comme la v1.
  // ============================================================
  const railRef = useRef(null);
  const defileurs = useRef({});
  defileur.el = defileurs.current[onglet] || null;

  const poserRail = (avecTransition) => {
    const rail = railRef.current;
    if (!rail) return;
    rail.style.transition = avecTransition
      ? 'transform .32s cubic-bezier(.2,.9,.25,1.07)'   /* courbe et duree v1 */
      : 'none';
    rail.style.transform = 'translateX(' + (idx * -25) + '%)';
  };
  useEffect(() => { poserRail(true); }, [idx]);
  useEffect(() => { poserRail(false); }, []);   /* position initiale sans animation */

  // ============================================================
  // BOUTON RETOUR DU TELEPHONE
  // La v1 empilait des etats d'historique (pushState) pour que le
  // retour Android navigue dans l'app au lieu d'en sortir. Meme
  // principe ici, avec une sentinelle reposee a chaque retour :
  //   • 1 pression  -> un cran en arriere (vue interne, puis onglet)
  //   • 2 pressions rapprochees -> retour direct a l'accueil Journal
  //   • deja a l'accueil -> on laisse le telephone quitter l'app
  // ============================================================
  const dernierRetour = useRef(0);
  useEffect(() => {
    try { history.pushState({ belfit: 1 }, ''); } catch (e) {}

    const onPop = () => {
      const t = Date.now();
      const doublePression = t - dernierRetour.current < 600;
      dernierRetour.current = t;

      const vue = vueEntrainer.value;
      const ongletCourant = ongletActif.value;
      const pageRepas = repasOuvertId.value !== null;
      const enProfondeur = retourEnAttente() || pageRepas
        || vue.nom !== 'accueil' || ongletCourant !== ONGLET_VITRINE;

      // Rien a remonter : on ne repose pas de sentinelle, le
      // telephone peut quitter l'application normalement.
      if (!enProfondeur) return;

      try { history.pushState({ belfit: 1 }, ''); } catch (e) {}

      if (doublePression) {
        // Retour direct a l'accueil, quel que soit l'endroit.
        while (depilerRetour()) { /* ferme tous les ecrans empiles */ }
        repasOuvertId.value = null;
        vueEntrainer.value = { nom: 'accueil', params: null };
        allerOnglet(ONGLET_VITRINE);
        return;
      }

      // Un seul cran en arriere : d'abord le dernier ecran superpose
      // (Reglages, Statistiques avancees, detail de seance...), puis
      // les etats que main.jsx gere lui-meme.
      if (depilerRetour()) { /* ferme */ }
      else if (pageRepas) repasOuvertId.value = null;
      // Le detail d'une seance s'ouvre depuis TROIS endroits : la
      // bibliotheque de programmes, « Demarrer une seance », et la
      // fiche d'un jour du calendrier. Les deux derniers posent
      // depuis:'journal'. Le bouton retour VISIBLE le respectait
      // deja ; celui-ci ne le regardait pas et renvoyait toujours vers
      // « Tous les programmes ». D'ou la page qui revenait sans qu'on
      // l'ait demandee (Raci, 17/08). Les deux retours suivent
      // desormais la meme regle.
      else if (vue.nom === 'seanceDetail') {
        if (vue.params && vue.params.depuis === 'journal') retourEntrainer();
        else allerVers('programmes');
      }
      else if (vue.nom !== 'accueil') retourEntrainer();
      // Le retour ramene sur l'onglet d'OUVERTURE, pas sur un journal
      // ecrit en dur : en mode vitrine il renvoyait sur une page que
      // l'utilisateur n'avait jamais ouverte.
      else allerOnglet(ONGLET_VITRINE);
    };

    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // ---- Balayage : le rail suit le doigt (v1) ----
  const geste = useRef(null);
  // Zones ou le balayage de page ne doit pas prendre la main.
  //
  // La liste de selecteurs seule ne suffisait pas : il fallait penser a
  // l'alimenter a chaque nouvel ecran, et on l'oubliait — les filtres de
  // « Choisir mes exercices » changeaient d'onglet quand on faisait
  // defiler les pastilles. Deux garde-fous s'y ajoutent donc, qui n'ont
  // rien a declarer :
  //
  //   1. tout element portant data-sans-swipe, pour se signaler soi-meme
  //      sans venir modifier ce fichier ;
  //   2. tout ancetre qui defile HORIZONTALEMENT. Une rangee de chips,
  //      un carrousel, un tableau large : le doigt y fait deja defiler
  //      quelque chose, la page n'a pas a bouger en meme temps. C'est ce
  //      qui rattrape les cas qu'on n'a pas prevus.
  const defileHorizontal = (el) => {
    for (let n = el; n && n !== document.body; n = n.parentElement) {
      if (n.scrollWidth > n.clientWidth + 4) {
        const ox = getComputedStyle(n).overflowX;
        if (ox === 'auto' || ox === 'scroll') return true;
      }
    }
    return false;
  };
  const debutTouche = (e) => {
    if (e.touches.length !== 1) return;
    const cible = e.target;
    if (!cible.closest) return;
    if (cible.closest(
      '.modale, .voile, .cp-overlay, .fr-plein, .ml-overlay, .water-modal, .modal-overlay, ' +
      '.premium-overlay, .v2-timer-container, .v2-timer-overlay, .bn, ' +
      '.prog-onglets, .idees-cats, input, select, textarea, .couche-repas, ' +
      '[data-sans-swipe]'
    )) return;
    if (defileHorizontal(cible)) return;
    geste.current = {
      x: e.touches[0].clientX, y: e.touches[0].clientY,
      verrou: null, dx: 0, vx: 0,
      dernierX: e.touches[0].clientX, dernierT: Date.now(),
    };
  };
  const bougeTouche = (e) => {
    const g = geste.current;
    if (!g || e.touches.length !== 1) return;
    const x = e.touches[0].clientX;
    const dx = x - g.x, dy = e.touches[0].clientY - g.y;
    // Decision differree et exigeante : un defilement vertical rapide
    // comporte souvent quelques pixels d'horizontal sur les premiers
    // evenements — la v2 verrouillait alors 'h' et le rail tressautait.
    // On attend 14 px de deplacement et on exige une vraie dominante
    // horizontale (ratio 1.5, comme le ressenti v1) pour prendre la main ;
    // tout le reste est un defilement vertical.
    if (g.verrou === null && (Math.abs(dx) > 14 || Math.abs(dy) > 14)) {
      // Double exigence : dominante horizontale ET tres peu de vertical.
      // Le pouce qui remonte la page en biais a toujours 12 px et plus
      // de vertical au moment de la decision -> defilement, jamais swipe.
      g.verrou = (Math.abs(dx) > Math.abs(dy) * 1.5 && Math.abs(dy) < 12) ? 'h' : 'v';
      if (g.verrou === 'h') {
        // Le rail suivra le doigt A PARTIR d'ici : sans cette origine,
        // il sauterait d'un coup du deplacement deja accumule.
        g.dxOrigine = dx;
        // Si une transition est en cours, on repart de la position
        // REELLEMENT affichee du rail : sans cela, couper la
        // transition le ferait claquer d'un coup a sa position
        // theorique (le saut visible quand on enchaine les swipes).
        const rail = railRef.current;
        if (rail) {
          const m = new DOMMatrixReadOnly(getComputedStyle(rail).transform);
          g.baseX = m.m41;                       // translation X reelle, en px
          rail.style.transition = 'none';
          rail.style.transform = 'translateX(' + g.baseX + 'px)';
        }
      }
    }
    if (g.verrou !== 'h') return;
    const maintenant = Date.now();
    if (maintenant - g.dernierT > 30) {
      g.vx = (x - g.dernierX) / (maintenant - g.dernierT);
      g.dernierX = x; g.dernierT = maintenant;
    }
    // Resistance aux extremites, comme la v1 (dx / 3).
    const L = window.innerWidth;
    const minX = (ordre.length - 1) * -L, maxX = 0;
    let cible = g.baseX + (dx - (g.dxOrigine || 0));
    if (cible > maxX) cible = maxX + (cible - maxX) / 3;
    if (cible < minX) cible = minX + (cible - minX) / 3;
    g.dx = dx;
    g.posX = cible;
    const rail = railRef.current;
    if (rail) rail.style.transform = 'translateX(' + cible + 'px)';
  };
  const finTouche = () => {
    const g = geste.current;
    geste.current = null;
    if (!g || g.verrou !== 'h') return;
    const L = window.innerWidth;
    const flick = Math.abs(g.vx) > 0.35;
    // Panneau le plus proche de la position reelle du rail, puis le
    // flick departage (la direction du relacher decide, comme la v1).
    const posX = (typeof g.posX === 'number') ? g.posX : -ordre.indexOf(ongletActif.value) * L;
    let cible = Math.round(-posX / L);
    if (flick) cible = Math.floor(-posX / L) + (g.vx < 0 ? 1 : 0);
    cible = Math.max(0, Math.min(ordre.length - 1, cible));
    if (ordre[cible] !== ongletActif.value) {
      ongletActif.value = ordre[cible];                     /* l'effet [idx] anime le rail */
    } else {
      poserRail(true);                                      /* retour elastique en place */
    }
  };
  const refHandlers = useRef();
  refHandlers.current = { debutTouche, bougeTouche, finTouche };
  useEffect(() => {
    const ts = (e) => refHandlers.current.debutTouche(e);
    const tm = (e) => refHandlers.current.bougeTouche(e);
    const te = () => refHandlers.current.finTouche();
    window.addEventListener('touchstart', ts, { passive: true });
    window.addEventListener('touchmove', tm, { passive: true });
    window.addEventListener('touchend', te, { passive: true });
    window.addEventListener('touchcancel', te, { passive: true });
    return () => {
      window.removeEventListener('touchstart', ts);
      window.removeEventListener('touchmove', tm);
      window.removeEventListener('touchend', te);
      window.removeEventListener('touchcancel', te);
    };
  }, []);

  // Le volet etait une barre posee EN TETE DU CONTENU QUI DEFILE :
  // ouvert depuis le bas d'une page, il s'affichait tout en haut,
  // hors de l'ecran. Et ses cinq elements en ligne debordaient a
  // droite sur 390 px — « Deconnexion » etait coupe. C'est desormais
  // un menu ancre sous le bouton qui l'ouvre, en colonne, avec un
  // voile qui le referme au premier appui a cote.
  const voletUtilisateur = voletProfil.value ? (
    <>
      <div class="profil-voile" onClick={() => { voletProfil.value = false; }} />
      <div class="profil-volet">
        <span class="profil-qui">{utilisateur.value ? (utilisateur.value.displayName || utilisateur.value.email) : ''}</span>
        <span class="profil-statut">
          {estPremium.value ? '\u2726 PRO' : t('compte_gratuit')}
        </span>
        <div class="lang-choix">
          {LANGUES.map(l => (
            <button key={l.k} class={langue.value === l.k ? 'actif' : ''} onClick={() => setLangue(l.k)}>{l.label}</button>
          ))}
        </div>
        {/* « Calculer mes besoins » est consomme par l'onglet Journal.
            Ouvert depuis la page Reglages, la demande partait bien...
            mais l'onglet n'etait pas rendu, puisque les reglages
            remplacent toute la page : rien ne se passait, et le calcul
            apparaissait deja ouvert en revenant en arriere. On ferme
            donc les reglages et on revient au Journal avant de le
            demander. */}
        <button class="profil-calc" onClick={() => {
          voletProfil.value = false;
          if (vueReglages.value) { vueReglages.value = null; ongletActif.value = 'journal'; }
          ouvrirCalcDemande.value = true;
        }}>{t('qa_calc')}</button>
        {/* La deconnexion laisse la page Reglages montee le temps que
            Firebase reponde. On la ferme d'abord : sinon l'ecran de
            connexion apparait apres coup, et un retour arriere
            ramenerait des reglages qui n'ont plus de compte. */}
        <button class="profil-sortie" onClick={() => {
          voletProfil.value = false;
          vueReglages.value = null;
          deconnexion();
        }}>{t('deconnexion')}</button>
      </div>
    </>
  ) : null;

  const PAGES = { journal: OngletJournal, entrainer: OngletEntrainer, stats: Stats, premium: PremiumPage };

  // Les reglages couvrent l'application entiere : ils s'ouvrent
  // depuis l'en-tete, present sur les quatre onglets, et se ferment
  // en revenant exactement d'ou l'on vient.
  // Le volet du bouton profil doit exister ICI AUSSI : l'en-tete des
  // reglages porte la meme icone bonhomme que les onglets, mais cette
  // branche s'arretait a <Reglages /> sans jamais rendre le volet.
  // L'appui basculait le signal... vers rien. C'etait le « je clique
  // sur mon compte et rien ne s'ouvre » de Raci, insaisissable dans
  // les tests parce qu'ils partaient toujours d'un onglet.
  if (vueReglages.value) {
    // key obligatoire : sans elle, Preact recycle le <div class="rail4">
    // du rendu precedent en <div class="ecran-reglages"> — le style
    // inline du balayage (translateX(-25/-50/-75%)) survit au
    // changement de classe et decale tout l'ecran de 97/195/292 px
    // vers la gauche selon l'onglet d'origine. La fleche retour se
    // retrouvait hors ecran : « le retour ne marche pas » (Raci, 8/08).
    // Meme famille que les position:fixed du rail, versant inverse :
    // cette fois c'est le rail qui contamine l'ecran plein.
    return (
      <div class="ecran-reglages" key="ecran-reglages">
        <Reglages />
        {voletUtilisateur}
      </div>
    );
  }
  if (statsAvOuvertes.value) {
    return <StatsAvancees fermer={() => { statsAvOuvertes.value = false; }} />;
  }

  return (
    <>
      {/* Le rail est DETRUIT quand un ecran plein (Reglages,
          Statistiques avancees) prend la main, puis RECREE a la
          fermeture. Sa position n'etait posee que par des effets qui
          ne re-tournent pas au changement de branche : le rail neuf
          restait a translateX(0) — panneau Journal — alors que
          l'onglet actif etait toujours BelFit+. C'etait le « la
          fleche revient dans le journal alimentaire » de Raci (8/08).
          Le ref-callback pose la position des que le noeud existe. */}
      <div class="rail4" key="rail4" ref={(n) => {
        railRef.current = n;
        if (n && !n.style.transform) {
          n.style.transition = 'none';
          n.style.transform = 'translateX(' + (idx * -25) + '%)';
        }
      }}>
        {ordre.map(k => {
          const Page = PAGES[k];
          return (
            <div class="rail-pan" key={k}>
              <div class="pan-scroll" ref={(n) => { defileurs.current[k] = n; if (k === onglet) defileur.el = n; }}>
                <div class="conteneur conteneur--nu">
                  {/* Le volet du bouton profil etait rendu dans le seul
                      panneau Journal du rail. Sur S'entrainer, Stats ou
                      BelFit+, l'appui basculait bien le signal, mais le
                      volet s'ouvrait dans un panneau voisin, hors de
                      l'ecran : le bouton paraissait mort sur trois
                      onglets sur quatre. Il suit desormais l'onglet
                      actif — meme place, meme style, partout. */}
                  {k === onglet && voletUtilisateur}
                  <Page />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {onglet === 'courses' && (
        <div class="app-scroll couche-courses">
          <div class="conteneur conteneur--nu"><Courses /></div>
        </div>
      )}
      <MealPage />
      <BottomNav />
    </>
  );
}

// Le montage n'a lieu que si la page porte le conteneur de l'application.
// L'apercu importe ce fichier pour rendre UNE page a la fois : sans ce
// garde-fou, l'import demarrerait l'application entiere par effet de bord.
const racine = document.getElementById('app');
if (racine) render(<><AvisAccesInvite /><App /></>, racine);

// Retrait du splash une fois l'interface peinte. 1300ms d'affichage
// plein + 300ms de fondu (Raci, 8/08 : 400ms ne laissait pas le temps
// de voir le logo). Le delai ne bloque rien — l'app est deja rendue
// derriere, le splash n'est qu'un voile.
(function retirerSplash(){
  const s = document.getElementById('splash');
  if (!s) return;
  const partir = () => {
    s.classList.add('parti');
    setTimeout(() => s.remove(), 300);
    const tc = document.querySelector('meta[name="theme-color"]');
    if (tc) tc.setAttribute('content', '#F4F3F0');
  };
  setTimeout(partir, 1300);
})();
