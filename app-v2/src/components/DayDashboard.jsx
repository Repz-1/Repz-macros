import { objectifs, totauxJour, kcalRestantes } from '../store/journal.js';

// Le tableau de bord ne recoit rien : il LIT les signaux.
// Toute modification n'importe ou dans l'app le met a jour seul.
export function DayDashboard() {
  const t = totauxJour.value;
  const o = objectifs.value;
  const pct = Math.min(100, (t.kcal / o.kcal) * 100);

  const macro = (nom, val, max) => (
    <div class="tb-macro">
      <div class="nom">{nom}</div>
      <div class="val"><b>{val.toFixed(0)}g</b> / {max}g</div>
      <div class="tb-mini"><div style={{ width: `${Math.min(100, (val / max) * 100)}%` }} /></div>
    </div>
  );

  return (
    <div class="tableau-bord">
      <div class="tb-kcal">
        <span class="gros">{kcalRestantes.value.toFixed(0)}</span>
        <span class="label">kcal restantes</span>
      </div>
      <div class="tb-barre"><div style={{ width: `${pct}%` }} /></div>
      <div class="tb-macros">
        {macro('Protéines', t.prot, o.prot)}
        {macro('Glucides', t.carbs, o.carbs)}
        {macro('Lipides', t.lip, o.lip)}
      </div>
    </div>
  );
}
