import { useState } from 'preact/hooks';
import { GROUPES, muscleLog, basculerMuscle } from '../store/entrainement.js';

const iso = (d) => d.toISOString().slice(0, 10);
const MOIS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

function Pastille({ jour, dans, estAujourdhui, onTap }) {
  const couleurs = dans.map(k => (GROUPES.find(g => g.k === k) || {}).c).filter(Boolean);
  let fond = 'transparent';
  if (couleurs.length === 1) fond = couleurs[0];
  else if (couleurs.length > 1) {
    const part = 100 / couleurs.length;
    fond = `conic-gradient(${couleurs.map((c, i) => `${c} ${i * part}% ${(i + 1) * part}%`).join(',')})`;
  }
  return (
    <button
      class={`cal-jour ${estAujourdhui ? 'auj' : ''} ${couleurs.length ? 'plein' : ''}`}
      style={couleurs.length ? { background: fond } : {}}
      onClick={onTap}
    >{jour}</button>
  );
}

export function MuscleCalendar() {
  const [vue, setVue] = useState(() => { const d = new Date(); return { a: d.getFullYear(), m: d.getMonth() }; });
  const [jourOuvert, setJourOuvert] = useState(null);
  const log = muscleLog.value;
  const aujourdhui = iso(new Date());

  const premier = new Date(vue.a, vue.m, 1);
  const nbJours = new Date(vue.a, vue.m + 1, 0).getDate();
  const decalage = (premier.getDay() + 6) % 7; // lundi = 0

  const seancesDuMois = Object.keys(log).filter(d =>
    d.startsWith(`${vue.a}-${String(vue.m + 1).padStart(2, '0')}`) &&
    (log[d] || []).some(k => k !== 'repos')
  ).length;

  return (
    <div class="carte">
      <div class="cal-stats">🏋️ {seancesDuMois} séance{seancesDuMois > 1 ? 's' : ''} en {MOIS[vue.m].toLowerCase()}</div>
      <div class="cal-tete">
        <button onClick={() => setVue(v => v.m === 0 ? { a: v.a - 1, m: 11 } : { a: v.a, m: v.m - 1 })}>‹</button>
        <span>{MOIS[vue.m]} {vue.a}</span>
        <button onClick={() => setVue(v => v.m === 11 ? { a: v.a + 1, m: 0 } : { a: v.a, m: v.m + 1 })}>›</button>
      </div>
      <div class="cal-grille">
        {['L','M','M','J','V','S','D'].map((j, i) => <div key={i} class="cal-ent">{j}</div>)}
        {Array.from({ length: decalage }).map((_, i) => <div key={'v'+i} />)}
        {Array.from({ length: nbJours }).map((_, i) => {
          const d = `${vue.a}-${String(vue.m + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
          return <Pastille key={d} jour={i + 1} dans={log[d] || []} estAujourdhui={d === aujourdhui} onTap={() => setJourOuvert(d)} />;
        })}
      </div>
      {/* Legende COMPLETE en permanence — les 8 groupes + repos, toujours */}
      <div class="cal-legende">
        {GROUPES.map(g => <span key={g.k}><i style={{ background: g.c }} />{g.label}</span>)}
        <span><i class="auj-ic" />Aujourd'hui</span>
      </div>

      {jourOuvert && (
        <>
          <div class="voile montre" onClick={() => setJourOuvert(null)} />
          <div class="modale montre">
            <h3>Muscles travaillés · {jourOuvert.slice(8)}/{jourOuvert.slice(5, 7)}</h3>
            <div class="cal-choix">
              {GROUPES.map(g => {
                const actif = (log[jourOuvert] || []).includes(g.k);
                return (
                  <button
                    key={g.k}
                    class={actif ? 'actif' : ''}
                    style={actif ? { background: g.c, borderColor: g.c, color: '#fff' } : {}}
                    onClick={() => basculerMuscle(jourOuvert, g.k)}
                  >{g.label}</button>
                );
              })}
            </div>
            <button class="calc-appliquer" onClick={() => setJourOuvert(null)}>Valider</button>
          </div>
        </>
      )}
    </div>
  );
}
