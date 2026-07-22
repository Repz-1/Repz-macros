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
import { BottomNav, ongletActif, allerOnglet, scrollSortant } from './components/BottomNav.jsx';
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
        // L'ancien DOM est encore monte a cet instant : c'est le seul
        // moment ou la hauteur du document est encore la bonne. On la
        // fige tout de suite, sinon le navigateur voit un document vide,
        // reaffiche sa barre d'outils et tout saute verticalement.
        document.body.style.minHeight = document.documentElement.scrollHeight + 'px';
        setGlisse({
          sortant: precedent.current,
          sens: b > a ? 'droite' : 'gauche',
          // Repli sur le defilement courant : les boutons qui changent
          // d'onglet sans passer par allerOnglet restent corrects.
          scroll: scrollSortant.value || window.scrollY || 0,
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
      document.body.style.minHeight = '';
      window.scrollTo(0, 0);
      setGlisse(null);
      setPose(true);              // la page arrivee se pose sans rejouer sa cascade
      scrollSortant.value = 0;
    }, 540);
    return () => { clearTimeout(id); document.body.style.minHeight = ''; };
  }, [glisse]);
  // La classe 'sans-entree' ne dure que le temps du premier rendu pose.
  const [pose, setPose] = useState(false);
  useEffect(() => {
    if (!pose) return;
    const id = setTimeout(() => setPose(false), 400);
    return () => clearTimeout(id);
  }, [pose]);

  // Balayage horizontal pour changer d'onglet (comme la v1).
  const geste = useRef(null);
  const debutTouche = (e) => {
    if (e.touches.length !== 1) return;
    geste.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now(), verrou: null };
  };
  const bougeTouche = (e) => {
    const g = geste.current;
    if (!g || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - g.x, dy = e.touches[0].clientY - g.y;
    // On decide une seule fois si le geste est horizontal ou vertical.
    if (g.verrou === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      g.verrou = Math.abs(dx) > Math.abs(dy) * 1.15 ? 'h' : 'v';
    }
    g.dx = dx;
  };
  const finTouche = () => {
    const g = geste.current;
    geste.current = null;
    if (!g || g.verrou !== 'h' || !g.dx) return;
    const duree = Math.max(1, Date.now() - g.t);
    const vitesse = Math.abs(g.dx) / duree;          // px/ms
    const seuil = window.innerWidth * 0.12;
    if (Math.abs(g.dx) < seuil && vitesse < 0.35) return;
    const i = ordre.indexOf(onglet);
    const cible = i + (g.dx < 0 ? 1 : -1);
    if (cible < 0 || cible >= ordre.length) return;
    allerOnglet(ordre[cible]);
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

  const gestes = {
    onTouchStart: debutTouche,
    onTouchMove: bougeTouche,
    onTouchEnd: finTouche,
    onTouchCancel: () => { geste.current = null; },
  };

  return (
    <>
      {glisse ? (
        // Pendant le glissement : les deux pages cohabitent et
        // se croisent horizontalement sur toute la largeur.
        <div class={'deck deck--' + glisse.sens} {...gestes}>
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
        <div class={'conteneur conteneur--nu' + (pose ? ' sans-entree' : '')} {...gestes}>
          {rendreOnglet(onglet)}
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
