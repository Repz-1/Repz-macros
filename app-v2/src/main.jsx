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
      <button
        class="nouvelle-journee"
        onClick={() => { if (confirm(t('nouvelle_journee') + ' ?')) nouvelleJournee(); }}
      >⟳ {t('nouvelle_journee')}</button>

      <button class="fab" onClick={() => setModale(true)}>+ {t('ajouter')}</button>
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
        {invite.value && !utilisateur.value && (
          <div class="bandeau-invite">
            <span>{t('invite_bandeau')}</span>
            <button onClick={quitterInvite}>{t('creer_compte')}</button>
          </div>
        )}
        <div class="entete-user">
          <span class="qui">{utilisateur.value ? utilisateur.value.email : t('mode_invite')}</span>
          <div class="entete-actions">
            <div class="lang-choix">
              {LANGUES.map(l => (
                <button key={l.k} class={langue.value === l.k ? 'actif' : ''} onClick={() => setLangue(l.k)}>{l.label}</button>
              ))}
            </div>
            <button onClick={() => utilisateur.value ? deconnexion() : quitterInvite()}>{utilisateur.value ? t('deconnexion') : t('quitter')}</button>
          </div>
        </div>
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
