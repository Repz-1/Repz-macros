import { render } from 'preact';
import { useState } from 'preact/hooks';
import './styles.css';
import { repas, nouvelleJournee } from './store/journal.js';
import { DayDashboard } from './components/DayDashboard.jsx';
import { WaterTracker } from './components/WaterTracker.jsx';
import { MealCard } from './components/MealCard.jsx';
import { AddMealModal } from './components/AddMealModal.jsx';
import { TdeeCalculator } from './components/TdeeCalculator.jsx';

function App() {
  const [modale, setModale] = useState(false);
  const [calc, setCalc] = useState(false);

  return (
    <div class="conteneur">
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
