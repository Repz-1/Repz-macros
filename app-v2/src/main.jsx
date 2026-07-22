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
import { MealCard } from './components/MealCard.jsx';
import { AddMealModal } from './components/AddMealModal.jsx';
import { TdeeCalculator } from './components/TdeeCalculator.jsx';
import { RestTimer } from './components/RestTimer.jsx';
import { SeanceTracker } from './components/SeanceTracker.jsx';
import { Programmes } from './components/Programmes.jsx';
import { SelectionExercices } from './components/SelectionExercices.jsx';
import { Entrainer, vueEntrainer, retourEntrainer, allerVers } from './components/Entrainer.jsx';
import { SeanceDetail } from './components/SeanceDetail.jsx';
import { Stats } from './components/Stats.jsx';
import { BottomNav, ongletActif, allerOnglet, scrollSortant, defileur } from './components/BottomNav.jsx';
import { t, langue, setLangue, LANGUES } from './i18n/index.js';
import { signal } from '@preact/signals';
import { Entete, voletProfil } from './components/Entete.jsx';

import { PremiumPage } from './components/PremiumPage.jsx';
import { IdeesRepas } from './components/IdeesRepas.jsx';
import { Courses } from './components/Courses.jsx';
import { ActionsRapides } from './components/ActionsRapides.jsx';
import { VocalModal } from './components/VocalModal.jsx';
import { MesPlats } from './components/MesPlats.jsx';

function OngletJournal() {
  const [modale, setModale] = useState(false);
  const [calc, setCalc] = useState(false);
  const [vocal, setVocal] = useState(false);
  const [mesPlats, setMesPlats] = useState(false);
  // Colonne unique, ordre de lecture descendant :
  // logo -> calories -> actions rapides -> idees recettes -> repas.
  // Seuls la navigation, le bouton d'ajout et l'hydratation sont fixes.
  return (
    <div class="pg-journal">
      <div class="colonne">
        <Entete />
        <DayDashboard />
        <ActionsRapides ouvrirCalc={() => setCalc(true)} ouvrirVocal={() => setVocal(true)} ouvrirPlats={() => setMesPlats(true)} />
        <IdeesRepas />
        {repas.value.map(r => <MealCard key={r.id} r={r} />)}
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
      {mesPlats && <MesPlats fermer={() => setMesPlats(false)} />}
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

  // ---- Deck : l'ancienne page SORT pendant que la nouvelle ENTRE ----
  // Les deux sont montees ensemble pendant la duree du glissement,
  // comme le deck de la v1 (et le ressenti d'Instagram).
  const precedent = useRef(onglet);
  const [glisse, setGlisse] = useState(null);   // { sortant, sens }
  if (precedent.current !== onglet) {
    const a = ordre.indexOf(precedent.current), b = ordre.indexOf(onglet);
    if (a !== -1 && b !== -1) {
      // On memorise l'onglet qui s'en va et le sens du deplacement.
      if (glisse === null) {
        setGlisse({
          sortant: precedent.current,
          sens: b > a ? 'droite' : 'gauche',
          // Repli sur le defilement courant : les boutons qui changent
          // d'onglet sans passer par allerOnglet restent corrects.
          scroll: scrollSortant.value || (defileur.el ? defileur.el.scrollTop : 0),
        });
      }
    }
    precedent.current = onglet;
  }
  useEffect(() => {
    if (!glisse) return;
    // La hauteur a ete figee au moment de la bascule (voir plus haut).
    // Ici on attend la fin du glissement, puis on libere la hauteur
    // et on remet la page d'arrivee en haut.
    const id = setTimeout(() => {
      if (defileur.el) defileur.el.scrollTop = 0;   // defilement interne : la barre du navigateur ne bouge pas
      setGlisse(null);
      setPose(true);              // la page arrivee se pose sans rejouer sa cascade
      scrollSortant.value = 0;
    }, 540);
    return () => clearTimeout(id);
  }, [glisse]);
  // La classe 'sans-entree' ne dure que le temps du premier rendu pose.
  const [pose, setPose] = useState(false);
  useEffect(() => {
    if (!pose) return;
    const id = setTimeout(() => setPose(false), 400);
    return () => clearTimeout(id);
  }, [pose]);

  // ---- Balayage : la page SUIT LE DOIGT en temps reel (comme la v1) ----
  // Pendant le mouvement on translate le rail directement dans le DOM
  // (aucun re-rendu par frame). Au relacher : seuil ou flick decident,
  // puis le rail termine sa course en transition CSS.
  const geste = useRef(null);
  const [tirage, setTirage] = useState(null);   // { courant, voisin, cote, scroll }
  const railRef = useRef(null);
  // Miroirs pour les ecouteurs globaux (poses une seule fois sur window).
  const tirageRef = useRef(null);
  if (tirage === null && glisse === null) tirageRef.current = null;
  else if (tirage !== null) tirageRef.current = tirage;
  const glisseRef = useRef(null); glisseRef.current = glisse;

  const railX = (dx) => {
    if (railRef.current) railRef.current.style.transform = 'translateX(' + dx + 'px)';
  };

  const debutTouche = (e) => {
    if (e.touches.length !== 1 || glisseRef.current || tirageRef.current) return;
    // Pas de changement d'onglet depuis les modales, la nav ou les
    // zones qui defilent horizontalement elles-memes.
    if (e.target.closest && e.target.closest(
      '.modale, .voile, .cp-overlay, .fr-plein, .ml-overlay, .water-modal, .modal-overlay, ' +
      '.premium-overlay, .v2-timer-container, .v2-timer-overlay, .bn, ' +
      '.prog-onglets, .idees-cats, input, select, textarea'
    )) return;
    geste.current = {
      x: e.touches[0].clientX, y: e.touches[0].clientY,
      t: Date.now(), verrou: null, dx: 0, dernierX: e.touches[0].clientX, dernierT: Date.now(),
    };
  };

  const bougeTouche = (e) => {
    const g = geste.current;
    if (!g || e.touches.length !== 1) return;
    const x = e.touches[0].clientX;
    const dx = x - g.x, dy = e.touches[0].clientY - g.y;
    if (g.verrou === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      g.verrou = Math.abs(dx) > Math.abs(dy) * 1.15 ? 'h' : 'v';
      if (g.verrou === 'h') {
        // Le doigt part : on monte le deck avec le voisin du bon cote.
        const i = ordre.indexOf(ongletActif.value);
        const cote = dx < 0 ? 'suivant' : 'precedent';
        const vId = cote === 'suivant' ? i + 1 : i - 1;
        const tir = {
          courant: ongletActif.value,
          voisin: (vId >= 0 && vId < ordre.length) ? ordre[vId] : null,
          cote,
          scroll: defileur.el ? defileur.el.scrollTop : 0,
        };
        // La ref est remplie tout de suite : un flick tres rapide peut
        // relacher avant que l'etat ne soit commite par Preact.
        tirageRef.current = tir;
        setTirage(tir);
      }
    }
    if (g.verrou !== 'h') return;
    // Vélocite instantanee (fenetre glissante) pour le flick.
    const maintenant = Date.now();
    if (maintenant - g.dernierT > 30) { g.vx = (x - g.dernierX) / (maintenant - g.dernierT); g.dernierX = x; g.dernierT = maintenant; }
    // Resistance aux extremites, comme la v1 (dx / 3).
    const i = ordre.indexOf(ongletActif.value);
    let borne = dx;
    if ((i === 0 && dx > 0) || (i === ordre.length - 1 && dx < 0)) borne = dx / 3;
    g.dx = borne;
    railX(borne);
  };

  const finTouche = () => {
    const g = geste.current;
    geste.current = null;
    if (!g || g.verrou !== 'h' || !tirageRef.current) return;
    const L = window.innerWidth;
    const vx = g.vx || 0;
    const flick = Math.abs(vx) > 0.35;
    const seuil = L * 0.12;
    // Direction de la fin de geste (comme la v1 : le relacher decide).
    let va = null;
    if (flick) va = vx < 0 ? 'suivant' : 'precedent';
    else if (Math.abs(g.dx) > seuil) va = g.dx < 0 ? 'suivant' : 'precedent';

    const rail = railRef.current;
    const finir = (cibleX, valide) => {
      if (!rail) { setTirage(null); return; }
      rail.style.transition = 'transform .3s cubic-bezier(.25,.8,.3,1)';
      rail.style.transform = 'translateX(' + cibleX + 'px)';
      let fini = false;
      const fin = () => {
        if (fini) return; fini = true;
        rail.removeEventListener('transitionend', fin);
        if (valide) {
          if (defileur.el) defileur.el.scrollTop = 0;
          // Bascule sans re-declencher l'animation de clic.
          precedent.current = valide;
          ongletActif.value = valide;
          setPose(true);
        }
        setTirage(null);
        scrollSortant.value = 0;
      };
      rail.addEventListener('transitionend', fin);
      // Filet de securite si transitionend ne part pas.
      setTimeout(fin, 380);
    };

    const tir = tirageRef.current;
    if (va && va === tir.cote && tir.voisin) {
      finir(va === 'suivant' ? -L : L, tir.voisin);
    } else {
      finir(0, null);   // retour en place
    }
  };

  const voletUtilisateur = voletProfil.value ? (
    <div class="profil-volet">
      <span>{utilisateur.value ? utilisateur.value.email : t('mode_invite')}</span>
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

  const rendreOnglet = (k) => (
    <>
      {voletUtilisateur}
      {k === 'journal' && <OngletJournal />}
      {k === 'entrainer' && <OngletEntrainer />}
      {k === 'stats' && <Stats />}
      {k === 'courses' && <Courses />}
      {k === 'premium' && <PremiumPage />}
    </>
  );

  const annuleTouche = () => {
    // Geste interrompu : le rail revient en place proprement.
    if (geste.current && geste.current.verrou === 'h' && tirageRef.current) { finTouche(); return; }
    geste.current = null;
  };
  const refHandlers = useRef();
  refHandlers.current = { debutTouche, bougeTouche, finTouche, annuleTouche };
  useEffect(() => {
    const ts = (e) => refHandlers.current.debutTouche(e);
    const tm = (e) => refHandlers.current.bougeTouche(e);
    const te = (e) => refHandlers.current.finTouche(e);
    const tc = (e) => refHandlers.current.annuleTouche(e);
    window.addEventListener('touchstart', ts, { passive: true });
    window.addEventListener('touchmove', tm, { passive: true });
    window.addEventListener('touchend', te, { passive: true });
    window.addEventListener('touchcancel', tc, { passive: true });
    return () => {
      window.removeEventListener('touchstart', ts);
      window.removeEventListener('touchmove', tm);
      window.removeEventListener('touchend', te);
      window.removeEventListener('touchcancel', tc);
    };
  }, []);

  return (
    <>
      {tirage ? (
        // Tirage au doigt : un rail de deux pages, translate en direct.
        <div class="deck">
          <div class="deck-rail" ref={railRef}>
            <div class="deck-pan" style={{ left: 0 }}>
              <div
                class="conteneur conteneur--nu"
                style={{ transform: 'translateY(' + (-tirage.scroll) + 'px)' }}
              >{rendreOnglet(tirage.courant)}</div>
            </div>
            {tirage.voisin && (
              <div class="deck-pan" style={{ left: tirage.cote === 'suivant' ? '100%' : '-100%' }}>
                <div class="conteneur conteneur--nu">{rendreOnglet(tirage.voisin)}</div>
              </div>
            )}
          </div>
        </div>
      ) : glisse ? (
        // Pendant le glissement : les deux pages cohabitent et
        // se croisent horizontalement sur toute la largeur.
        <div class={'deck deck--' + glisse.sens}>
          <div class="deck-pan deck-pan--sortant" key={'s' + glisse.sortant}>
            <div
              class="conteneur conteneur--nu"
              style={{ transform: 'translateY(' + (-glisse.scroll) + 'px)' }}
            >{rendreOnglet(glisse.sortant)}</div>
          </div>
          <div class="deck-pan deck-pan--entrant" key={'e' + onglet}>
            <div class="conteneur conteneur--nu">{rendreOnglet(onglet)}</div>
          </div>
        </div>
      ) : (
        <div class="app-scroll" ref={(n) => { defileur.el = n; }}>
          <div class={'conteneur conteneur--nu' + (pose ? ' sans-entree' : '')}>
            {rendreOnglet(onglet)}
          </div>
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
