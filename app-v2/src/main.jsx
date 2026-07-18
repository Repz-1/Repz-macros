import { render } from 'preact';
import { useState } from 'preact/hooks';
import './styles.css';
import { utilisateur, authPrete, deconnexion } from './services/firebase.js';
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
import { VocalBouton } from './components/VocalModal.jsx';
import { VocalModal } from './components/VocalModal.jsx';

function OngletJournal() {
  const [modale, setModale] = useState(false);
  const [calc, setCalc] = useState(false);
  const [vocal, setVocal] = useState(false);
  return (
    <>
      <DayDashboard />
      <button class="qa-vocal" onClick={() => setVocal(true)}>🎤 Ajout vocal <i class="pro-mini-inline">✦</i></button>
      <button class="calc-lien" onClick={() => setCalc(true)}>🧮 {t('calc_besoins')}</button>
      <WaterTracker />
      <VocalBouton />
      <IdeesRepas />
      <button
        class="nouvelle-journee"
        onClick={() => { if (confirm('Commencer une nouvelle journée ?')) nouvelleJournee(); }}
      >⟳ {t('nouvelle_journee')}</button>

      {repas.value.map(r => <MealCard key={r.id} r={r} />)}

      <button class="fab" onClick={() => setModale(true)}>+ {t('ajouter')}</button>
      <AddMealModal montre={modale} fermer={() => setModale(false)} />
      <TdeeCalculator montre={calc} fermer={() => setCalc(false)} />
      {vocal && <VocalModal fermer={() => setVocal(false)} />}
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
  if (!utilisateur.value) {
    return <LoginScreen />;
  }
  if (!donneesPretes.value) {
    return <div style={{textAlign:'center',padding:'80px 20px',color:'#b5b0a4',fontWeight:600}}>{t('chargement')}</div>;
  }

  const onglet = ongletActif.value;
  return (
    <>
      <div class="conteneur">
        <div class="entete-user">
          <span class="qui">{utilisateur.value.email}</span>
          <div class="entete-actions">
            <div class="lang-choix">
              {LANGUES.map(l => (
                <button key={l.k} class={langue.value === l.k ? 'actif' : ''} onClick={() => setLangue(l.k)}>{l.label}</button>
              ))}
            </div>
            <button onClick={() => deconnexion()}>{t('deconnexion')}</button>
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
