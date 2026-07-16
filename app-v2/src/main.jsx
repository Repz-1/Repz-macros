import { render } from 'preact';
import { useState } from 'preact/hooks';
import './styles.css';
import { repas, nouvelleJournee } from './store/journal.js';
import { DayDashboard } from './components/DayDashboard.jsx';
import { MealCard } from './components/MealCard.jsx';
import { AddMealModal } from './components/AddMealModal.jsx';

function App() {
  const [modale, setModale] = useState(false);

  return (
    <div class="conteneur">
      <DayDashboard />
      <button
        class="nouvelle-journee"
        onClick={() => { if (confirm('Commencer une nouvelle journée ?')) nouvelleJournee(); }}
      >⟳ Commencer une nouvelle journée</button>

      {repas.value.map(r => <MealCard key={r.id} r={r} />)}

      <button class="fab" onClick={() => setModale(true)}>+ Ajouter</button>
      <AddMealModal montre={modale} fermer={() => setModale(false)} />
    </div>
  );
}

render(<App />, document.getElementById('app'));
