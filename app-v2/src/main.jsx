import { render } from 'preact';
import { useState } from 'preact/hooks';
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
import { Entrainer, vueEntrainer, retourEntrainer } from './components/Entrainer.jsx';
import { Stats } from './components/Stats.jsx';
import { BottomNav, ongletActif } from './components/BottomNav.jsx';
import { t, langue, setLangue, LANGUES } from './i18n/index.js';
import { signal } from '@preact/signals';

// Volet profil, ouvert depuis l'en-tete de chaque onglet
export const voletProfil = signal(false);
const ouvrirProfil = () => { voletProfil.value = !voletProfil.value; };
import { PremiumPage } from './components/PremiumPage.jsx';
import { IdeesRepas } from './components/IdeesRepas.jsx';
import { Courses } from './components/Courses.jsx';
import { ActionsRapides } from './components/ActionsRapides.jsx';
import { VocalModal } from './components/VocalModal.jsx';

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
        <Logo />
        <DayDashboard />
        <ActionsRapides ouvrirCalc={() => setCalc(true)} ouvrirVocal={() => setVocal(true)} />
        <IdeesRepas />
        {repas.value.map(r => <MealCard key={r.id} r={r} />)}
      </div>

      <div class="fab-rangee">
        <WaterTracker />
        <button class="fab" onClick={() => setModale(true)} aria-label="Ajouter un repas">
          <span class="fab-plus">＋</span>
          <span class="fab-label">{t('add')}</span>
        </button>
      </div>

      {modale && <AddMealModal montre={true} fermer={() => setModale(false)} />}
      {calc && <TdeeCalculator montre={true} fermer={() => setCalc(false)} />}
      {vocal && <VocalModal fermer={() => setVocal(false)} />}
    </div>
  );
}

/** En-tete : logo centre, profil et reglages a droite. */
function Logo() {
  return (
    <header class="j-entete">
      <img class="j-logo" src="../belfit-logo-header.png" alt="BELFIT" />
      <div class="j-entete-actions">
        <button class="j-btn-icone" onClick={ouvrirProfil} aria-label="Profil">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.6" /><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" /></svg>
        </button>
        <a class="j-btn-icone" href="../parametres.html" aria-label="Réglages">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2" /><path d="M19.4 15a1.7 1.7 0 00.34 1.87l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.7 1.7 0 00-1.87-.34 1.7 1.7 0 00-1.03 1.56V21a2 2 0 11-4 0v-.09a1.7 1.7 0 00-1.11-1.56 1.7 1.7 0 00-1.87.34l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.7 1.7 0 00.34-1.87 1.7 1.7 0 00-1.56-1.03H3a2 2 0 110-4h.09a1.7 1.7 0 001.56-1.11 1.7 1.7 0 00-.34-1.87l-.06-.06a2 2 0 112.83-2.83l.06.06a1.7 1.7 0 001.87.34h.01A1.7 1.7 0 0010 4.09V4a2 2 0 114 0v.09a1.7 1.7 0 001.03 1.56h.01a1.7 1.7 0 001.87-.34l.06-.06a2 2 0 112.83 2.83l-.06.06a1.7 1.7 0 00-.34 1.87v.01a1.7 1.7 0 001.56 1.03H21a2 2 0 110 4h-.09a1.7 1.7 0 00-1.51 1.02z" /></svg>
        </a>
      </div>
    </header>
  );
}

function OngletEntrainer() {
  const vue = vueEntrainer.value;
  // Meme navigation qu'en v1 : une vue a la fois, fleche retour en haut.
  if (vue.nom === 'accueil') {
    return (<><Entrainer /><RestTimer /></>);
  }
  return (
    <div class="pg-entrainer">
      <button class="v2-retour" onClick={retourEntrainer} aria-label="Retour">←</button>
      {vue.nom === 'seance' && <SeanceTracker />}
      {vue.nom === 'programmes' && <Programmes />}
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
  return (
    <>
      <div class="conteneur conteneur--nu">
        {voletProfil.value && (
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
        )}
        {onglet === 'journal' && <OngletJournal />}
        {onglet === 'entrainer' && <OngletEntrainer />}
        {onglet === 'stats' && <Stats />}
        {onglet === 'courses' && <Courses />}
        {onglet === 'premium' && <PremiumPage />}
      </div>
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
