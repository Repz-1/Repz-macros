import { render } from 'preact';
import { useState } from 'preact/hooks';
import './styles.css';
import { utilisateur, authPrete, deconnexion, invite, quitterInvite } from './services/firebase.js';
import { LoginScreen } from './components/LoginScreen.jsx';
import { repas, nouvelleJournee, donneesPretes } from './store/journal.js';
import { DayDashboard } from './components/DayDashboard.jsx';
import { WaterTracker } from './components/WaterTracker.jsx';
import { MealCard } from './components/MealCard.jsx';
import { AddMealModal } from './components/AddMealModal.jsx';
import { TdeeCalculator } from './components/TdeeCalculator.jsx';
import { MuscleCalendar } from './components/MuscleCalendar.jsx';
import { RestTimer } from './components/RestTimer.jsx';
import { SeanceTracker } from './components/SeanceTracker.jsx';
import { Programmes } from './components/Programmes.jsx';
import { Stats } from './components/Stats.jsx';
import { BottomNav, ongletActif } from './components/BottomNav.jsx';
import { t, langue, setLangue, LANGUES } from './i18n/index.js';
import { PremiumPage } from './components/PremiumPage.jsx';
import { IdeesRepas } from './components/IdeesRepas.jsx';
import { Courses } from './components/Courses.jsx';
import { ActionsRapides } from './components/ActionsRapides.jsx';

function OngletJournal() {
  const [modale, setModale] = useState(false);
  const [calc, setCalc] = useState(false);
  return (
    <>
      <DayDashboard />
      <ActionsRapides ouvrirCalc={() => setCalc(true)} />
      <WaterTracker />

      {/* Le coeur de l'usage quotidien : les repas */}
      {repas.value.map(r => <MealCard key={r.id} r={r} />)}

      <IdeesRepas />

      <button class="fab" onClick={() => setModale(true)}>+</button>
      <AddMealModal montre={modale} fermer={() => setModale(false)} />
      <TdeeCalculator montre={calc} fermer={() => setCalc(false)} />
    </>
  );
}

function OngletEntrainer() {
  return (
    <>
      <MuscleCalendar />
      <RestTimer />
      <SeanceTracker />
      <Programmes />
    </>
  );
}

function App() {
  const [profil, setProfil] = useState(false);
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
      <div class="conteneur">
        <header class="entete">
          <img src="/belfit-logo-b.png" alt="BelFit" class="entete-logo" />
          <div class="lang-choix">
            {LANGUES.map(l => (
              <button key={l.k} class={langue.value === l.k ? 'actif' : ''} onClick={() => setLangue(l.k)}>{l.label}</button>
            ))}
          </div>
          <button class="entete-profil" onClick={() => setProfil(!profil)} title={utilisateur.value ? utilisateur.value.email : t('mode_invite')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6"/></svg>
          </button>
        </header>

        {profil && (
          <div class="profil-volet">
            <span>{utilisateur.value ? utilisateur.value.email : t('mode_invite')}</span>
            <button onClick={() => utilisateur.value ? deconnexion() : quitterInvite()}>
              {utilisateur.value ? t('deconnexion') : t('quitter')}
            </button>
          </div>
        )}

        {invite.value && !utilisateur.value && (
          <div class="bandeau-invite">
            <span>{t('invite_bandeau')}</span>
            <button onClick={quitterInvite}>{t('creer_compte')}</button>
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
