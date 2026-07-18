import { objectifs, totauxJour, kcalRestantes } from '../store/journal.js';
import { ObjectifsForm } from './ObjectifsForm.jsx';
import { t } from '../i18n/index.js';

// Le tableau de bord ne recoit rien : il LIT les signaux.
// Toute modification n'importe ou dans l'app le met a jour seul.
export function DayDashboard() {
  const tot = totauxJour.value;
  const o = objectifs.value;
  const pct = Math.min(100, (tot.kcal / o.kcal) * 100);

  const macro = (nom, val, max) => (
    <div class="tb-macro">
      <div class="nom">{nom}</div>
      <div class="val"><b>{val.toFixed(0)}g</b> / {max}g</div>
      <div class="tb-mini"><div style={{ width: `${Math.min(100, (val / max) * 100)}%` }} /></div>
    </div>
  );

  // Jauge circulaire : 270 degres, part en bas a gauche (repere BelFit)
  const R = 78, C = 2 * Math.PI * R, arc = 0.75; // 3/4 de cercle
  const rempli = C * arc * (pct / 100);

  return (
    <div class="tableau-bord">
      <div class="tb-jauge">
        <svg viewBox="0 0 200 200">
          <circle cx="100" cy="100" r={R} class="tb-piste"
            stroke-dasharray={`${C * arc} ${C}`} transform="rotate(135 100 100)" />
          <circle cx="100" cy="100" r={R} class="tb-remplie"
            stroke-dasharray={`${rempli} ${C}`} transform="rotate(135 100 100)" />
        </svg>
        <div class="tb-centre">
          <div class="tb-nombre">{kcalRestantes.value.toFixed(0)}</div>
          <div class="tb-label">{t('kcal_restantes')}</div>
        </div>
        <div class="tb-cotes">
          <div><span>{tot.kcal.toFixed(0)}</span><i>consommées</i></div>
          <div><span>{o.kcal}</span><i>objectif</i></div>
        </div>
      </div>
      <div class="tb-macros">
        {macro(t('proteines'), tot.prot, o.prot)}
        {macro(t('glucides'), tot.carbs, o.carbs)}
        {macro(t('lipides'), tot.lip, o.lip)}
      </div>
      <ObjectifsForm />
    </div>
  );
}
