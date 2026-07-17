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

function App() {
  const [modale, setModale] = useState(false);
  const [calc, setCalc] = useState(false);

  // Attendre la reponse de Firebase avant d'afficher quoi que ce soit
  // (evite le flash "ecran de connexion" pour un utilisateur deja connecte)
  if (!authPrete.value) {
    return <div style={{textAlign:'center',padding:'80px 20px',color:'#b5b0a4',fontWeight:600}}>…</div>;
  }
  if (!utilisateur.value) {
    return <LoginScreen />;
  }
  if (!donneesPretes.value) {
    return <div style={{textAlign:'center',padding:'80px 20px',color:'#b5b0a4',fontWeight:600}}>Chargement de ton journal…</div>;
  }

  return (
    <div class="conteneur">
      <div class="entete-user">
        <span class="qui">{utilisateur.value.email}</span>
        <button onClick={() => deconnexion()}>Déconnexion</button>
      </div>
      <DayDashboard />
      <button class="calc-lien" onClick={() => setCalc(true)}>🧮 Calculer mes besoins</button>
      <WaterTracker />
      <button
        class="nouvelle-journee"
        onClick={() => { if (confirm('Commencer une nouvelle journée ?')) nouvelleJournee(); }}
      >⟳ Commencer une nouvelle journée</button>

      {repas.value.map(r => <MealCard key={r.id} r={r} />)}

      <button class="fab" onClick={() => setModale(true)}>+ Ajouter</button>
      <AddMealModal montre={modale} fermer={() => setModale(false)} />
      <TdeeCalculator montre={calc} fermer={() => setCalc(false)} />
    </div>
  );
}

render(<App />, document.getElementById('app'));
