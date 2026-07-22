import { render } from 'preact';
import { useState, useRef, useEffect } from 'preact/hooks';
import './styles.css';
import './styles/design-system.css';
import './styles/journal-socle.css';
import { utilisateur, authPrete, deconnexion, invite, quitterInvite } from './services/firebase.js';
import { LoginScreen } from './components/LoginScreen.jsx';
import { repas, nouvelleJournee, donneesPretes } from './store/journal.js';
import { DayDashboard } from './components/DayDashboard.jsx';
import { WaterTracker } from './components/WaterTracker.jsx';
import { MealCard, repasEnSaisie, ouvrirMesPlats } from './components/MealCard.jsx';
import { AddMealModal } from './components/AddMealModal.jsx';
import { TdeeCalculator } from './components/TdeeCalculator.jsx';
import { RestTimer } from './components/RestTimer.jsx';
import { SeanceTracker } from './components/SeanceTracker.jsx';
import { Programmes } from './components/Programmes.jsx';
import { Questionnaire } from './components/Questionnaire.jsx';
import { SelectionExercices } from './components/SelectionExercices.jsx';
import { Entrainer, vueEntrainer, retourEntrainer, allerVers } from './components/Entrainer.jsx';
import { SeanceDetail } from './components/SeanceDetail.jsx';
import { Stats } from './components/Stats.jsx';
import { BottomNav, ongletActif, allerOnglet, scrollSortant, defileur } from './components/BottomNav.jsx';
import { t, langue, setLangue, LANGUES } from './i18n/index.js';
import { signal } from '@preact/signals';
import { Entete, voletProfil } from './components/Entete.jsx';

import { PremiumPage, estPremium } from './components/PremiumPage.jsx';
import { IdeesRepas } from './components/IdeesRepas.jsx';
import { Courses } from './components/Courses.jsx';
import { ActionsRapides } from './components/ActionsRapides.jsx';
import { VocalModal } from './components/VocalModal.jsx';
import { MesPlats } from './components/MesPlats.jsx';

function OngletJournal() {
  const [modale, setModale] = useState(false);
  const [calc, setCalc] = useState(false);
  const [vocal, setVocal] = useState(false);
  // Colonne unique, ordre de lecture descendant :
  // logo -> calories -> actions rapides -> idees recettes -> repas.
  // Seuls la navigation, le bouton d'ajout et l'hydratation sont fixes.
  return (
    <div class="pg-journal">
      <div class="colonne">
        <Entete />
        <DayDashboard />
        <ActionsRapides ouvrirCalc={() => setCalc(true)} ouvrirVocal={() => setVocal(true)} />
        <IdeesRepas />
        {repas.value.map(r => <MealCard key={r.id} r={r} />)}
        {/* Mode focus : voile sombre pendant la saisie d'un aliment. */}
        {repasEnSaisie.value !== null && <div class="voile-saisie" />}
      </div>

      <div class="fab-rangee">
        <WaterTracker />
        <button class="fab" onClick={() => setModale(true)} aria-label={t('add')}>
          <span class="fab-plus">＋</span>
        </button>
      </div>

      {modale && <AddMealModal montre={true} fermer={() => setModale(false)} />}
      {calc && <TdeeCalculator montre={true} fermer={() => setCalc(false)} />}
      {vocal && <VocalModal fermer={() => setVocal(false)} />}
      {ouvrirMesPlats.value && <MesPlats fermer={() => { ouvrirMesPlats.value = false; }} />}
    </div>
  );
}

function OngletEntrainer() {
  const vue = vueEntrainer.value;
  // Meme navigation qu'en v1 : une vue a la fois, fleche retour en haut.
  if (vue.nom === 'accueil') {
    return (<><Entrainer /><RestTimer /></>);
  }
  if (vue.nom === 'selection') {
    return (<><SelectionExercices /><RestTimer /></>);
  }
  if (vue.nom === 'programmes') {
    return (<><Programmes /><RestTimer /></>);
  }
  if (vue.nom === 'questionnaire') {
    return <Questionnaire />;
  }
  if (vue.nom === 'seanceDetail') {
    const p = vue.params || {};
    return (<><SeanceDetail seanceId={p.seanceId} titre={p.titre} retour={() => allerVers('programmes')} /><RestTimer /></>);
  }
  return (
    <div class="pg-entrainer">
      <button class="v2-retour" onClick={retourEntrainer} aria-label="Retour">←</button>
      {vue.nom === 'seance' && <SeanceTracker />}
      <RestTimer />
    </div>
  );
}

function App() {
  if (!authPrete.value) {
    return <div style={{textAlign:'center',padding:'80px 20px',color:'#b5b0a4',fontWeight:600}}>…</div>;
  }
  if (!utilisateur.value && !invite.value) {
    return <LoginScreen />;
  }
  if (!donneesPretes.value) {
    return <div style={{textAlign:'center',padding:'80px 20px',color:'#b5b0a4',fontWeight:600}}>{t('chargement')}</div>;
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
      const enProfondeur = vue.nom !== 'accueil' || ongletCourant !== 'journal';

      // Rien a remonter : on ne repose pas de sentinelle, le
      // telephone peut quitter l'application normalement.
      if (!enProfondeur) return;

      try { history.pushState({ belfit: 1 }, ''); } catch (e) {}

      if (doublePression) {
        // Retour direct a l'accueil, quel que soit l'endroit.
        vueEntrainer.value = { nom: 'accueil', params: null };
        allerOnglet('journal');
        return;
      }

      // Un seul cran en arriere.
      if (vue.nom === 'seanceDetail') allerVers('programmes');
      else if (vue.nom !== 'accueil') retourEntrainer();
      else allerOnglet('journal');
    };

    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // ---- Balayage : le rail suit le doigt (v1) ----
  const geste = useRef(null);
  const debutTouche = (e) => {
    if (e.touches.length !== 1) return;
    if (e.target.closest && e.target.closest(
      '.modale, .voile, .cp-overlay, .fr-plein, .ml-overlay, .water-modal, .modal-overlay, ' +
      '.premium-overlay, .v2-timer-container, .v2-timer-overlay, .bn, ' +
      '.prog-onglets, .idees-cats, input, select, textarea'
    )) return;
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

  const voletUtilisateur = voletProfil.value ? (
    <div class="profil-volet">
      <span>{utilisateur.value ? utilisateur.value.email : t('mode_invite')}</span>
      <span class="profil-statut">
        {estPremium.value ? '\u2726 PRO' : t('compte_gratuit')}
      </span>
      <div class="lang-choix">
        {LANGUES.map(l => (
          <button key={l.k} class={langue.value === l.k ? 'actif' : ''} onClick={() => setLangue(l.k)}>{l.label}</button>
        ))}
      </div>
      <button onClick={() => utilisateur.value ? deconnexion() : quitterInvite()}>
        {utilisateur.value ? t('deconnexion') : t('quitter')}
      </button>
    </div>
  ) : null;

  const PAGES = { journal: OngletJournal, entrainer: OngletEntrainer, stats: Stats, premium: PremiumPage };

  return (
    <>
      <div class="rail4" ref={railRef}>
        {ordre.map(k => {
          const Page = PAGES[k];
          return (
            <div class="rail-pan" key={k}>
              <div class="pan-scroll" ref={(n) => { defileurs.current[k] = n; if (k === onglet) defileur.el = n; }}>
                <div class="conteneur conteneur--nu">
                  {k === 'journal' && voletUtilisateur}
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
      <BottomNav />
    </>
  );
}

render(<App />, document.getElementById('app'));

// Retrait du splash une fois l'interface peinte (min 400ms pour eviter le clignotement)
(function retirerSplash(){
  const s = document.getElementById('splash');
  if (!s) return;
  const partir = () => {
    s.classList.add('parti');
    setTimeout(() => s.remove(), 300);
    const tc = document.querySelector('meta[name="theme-color"]');
    if (tc) tc.setAttribute('content', '#F8F8F8');
  };
  setTimeout(partir, 400);
})();
