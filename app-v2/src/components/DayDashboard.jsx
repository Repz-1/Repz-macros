import { objectifs, totauxJour, kcalRestantes, nouvelleJournee } from '../store/journal.js';
import { ObjectifsForm } from './ObjectifsForm.jsx';
import { t, langue } from '../i18n/index.js';

const MOIS = {
  fr: ['JANV.','FÉVR.','MARS','AVR.','MAI','JUIN','JUIL.','AOÛT','SEPT.','OCT.','NOV.','DÉC.'],
  en: ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'],
  nl: ['JAN.','FEB.','MRT.','APR.','MEI','JUN.','JUL.','AUG.','SEP.','OKT.','NOV.','DEC.'],
};

export function DayDashboard() {
  const tot = totauxJour.value;
  const o = objectifs.value;
  const d = new Date();
  const mois = (MOIS[langue.value] || MOIS.fr)[d.getMonth()];

  // Anneau : rayon 82, arc de 371 (identique a l'app actuelle)
  const ARC = 371, TOTAL = 515.2;
  const pct = Math.min(1, o.kcal ? tot.kcal / o.kcal : 0);
  const rempli = ARC * pct;
  const depasse = tot.kcal > o.kcal;

  const macro = (nom, val, max) => {
    const p = max ? (val / max) * 100 : 0;
    const couleur = p > 105 ? '#DE2F14' : p >= 95 ? '#1f1f1f' : '#F7B500';
    return (
      <div class="mcard">
        <div class="m-name">{nom}</div>
        <div class="m-val"><span>{val.toFixed(0)}g</span> <span class="m-tg">/ {max}g</span></div>
        <div class="mbar"><span style={{ width: `${Math.min(100, p)}%`, background: couleur }} /></div>
      </div>
    );
  };

  return (
    <div class="nutri-card">
      <div class="nutri-datebar">
        <span class="ndb-cal">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>
        </span>
        <span class="ndb-date">{t('aujourdhui')}, {d.getDate()} {mois}</span>
      </div>

      <div class="ring-wrap">
        <div class="ring-side">
          <div class="rs-lab">{t('consommees')}</div>
          <div class="rs-val">{tot.kcal.toFixed(0)}</div>
        </div>

        <div class="ring-center">
          <svg width="184" height="184" viewBox="0 0 190 190">
            <circle cx="95" cy="95" r="82" fill="none" stroke="#dcecdf" stroke-width="13"
              stroke-linecap="round" stroke-dasharray="371 144.2" transform="rotate(140 95 95)" />
            <circle cx="95" cy="95" r="82" fill="none" stroke={depasse ? '#DE2F14' : '#10B981'} stroke-width="13"
              stroke-linecap="round" stroke-dasharray={`${rempli} ${TOTAL}`} transform="rotate(140 95 95)"
              style="transition:stroke-dasharray .4s ease, stroke .3s;" />
          </svg>
          <div class="ring-txt">
            <div class={`dt-remaining-big ${depasse ? 'over' : ''}`}>
              <span class="rt-num">{kcalRestantes.value.toFixed(0)}</span>
            </div>
            <div class="rt-sub">{t('kcal_restantes')}</div>
          </div>
        </div>

        <div class="ring-side">
          <div class="rs-lab">{t('objectif')}</div>
          <div class="rs-val">{o.kcal}</div>
        </div>
      </div>

      <div class="nutri-macros">
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
