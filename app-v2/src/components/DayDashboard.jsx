import { objectifs, totauxJour, kcalRestantes } from '../store/journal.js';
import { ObjectifsForm } from './ObjectifsForm.jsx';
import { nouvelleJournee } from '../store/journal.js';
import { t, langue } from '../i18n/index.js';

const MOIS_COURT = {
  fr: ['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'],
  en: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
  nl: ['jan.','feb.','mrt.','apr.','mei','jun.','jul.','aug.','sep.','okt.','nov.','dec.'],
};

export function DayDashboard() {
  const tot = totauxJour.value;
  const o = objectifs.value;
  const pct = Math.min(100, (tot.kcal / o.kcal) * 100);
  const d = new Date();
  const mois = (MOIS_COURT[langue.value] || MOIS_COURT.fr)[d.getMonth()];

  // Jauge 3/4 de cercle
  const R = 78, C = 2 * Math.PI * R, arc = 0.75;
  const rempli = C * arc * (pct / 100);

  // Code couleur des macros : depasse = rouge, proche = or, sinon noir
  const macro = (nom, val, max) => {
    const p = max ? (val / max) * 100 : 0;
    const couleur = p > 105 ? '#DE2F14' : p >= 95 ? '#181818' : '#F7B500';
    return (
      <div class="tb-macro">
        <div class="nom">{nom}</div>
        <div class="val"><b style={{ color: p > 105 ? '#DE2F14' : '#B98A00' }}>{val.toFixed(0)}g</b> / {max}g</div>
        <div class="tb-mini"><div style={{ width: `${Math.min(100, p)}%`, background: couleur }} /></div>
      </div>
    );
  };

  return (
    <div class="tableau-bord">
      <div class="tb-date">{t('aujourdhui')}, {d.getDate()} {mois}</div>

      <div class="tb-rangee">
        <div class="tb-cote">
          <i>{t('consommees')}</i>
          <span>{tot.kcal.toFixed(0)}</span>
        </div>

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
        </div>

        <div class="tb-cote">
          <i>{t('objectif')}</i>
          <span>{o.kcal}</span>
        </div>
      </div>

      <div class="tb-sep" />

      <div class="tb-macros">
        {macro(t('proteines'), tot.prot, o.prot)}
        {macro(t('glucides'), tot.carbs, o.carbs)}
        {macro(t('lipides'), tot.lip, o.lip)}
      </div>

      <button
        class="nouvelle-journee"
        onClick={() => { if (confirm(t('nouvelle_journee') + ' ?')) nouvelleJournee(); }}
      >⟳ {t('nouvelle_journee')}</button>

      <ObjectifsForm />
    </div>
  );
}
