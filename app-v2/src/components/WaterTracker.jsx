import { eau, ajouterEau } from '../store/journal.js';

export function WaterTracker() {
  return (
    <div class="eau">
      <span class="goutte">💧</span>
      <span class="val">{eau.value.toFixed(2).replace(/\.?0+$/, '')} L</span>
      <button onClick={() => ajouterEau(-0.25)}>−</button>
      <button onClick={() => ajouterEau(0.25)}>+ 0,25 L</button>
    </div>
  );
}
