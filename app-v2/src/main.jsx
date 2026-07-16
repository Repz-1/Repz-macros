import { render } from 'preact';
import { MealCard } from './components/MealCard.jsx';

function App() {
  return (
    <div>
      <h1 style={{textAlign:'center', fontWeight:800, marginTop:'32px'}}>
        BELFIT <span style={{color:'#F7B500'}}>v2</span>
      </h1>
      <p style={{textAlign:'center', color:'#8a8a8a', margin:'4px 0 0'}}>
        Chantier migration — demo reactivite
      </p>
      <MealCard />
    </div>
  );
}

render(<App />, document.getElementById('app'));
