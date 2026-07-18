import { useState } from 'preact/hooks';
import { weightLog, histoJours, tendancePoids, seancesParMois, ajouterPesee } from '../store/stats.js';
import { objectifs } from '../store/journal.js';

function MiniGraphe({ points, couleur, unite, format }) {
  if (!points.length) return <div class="stat-vide">Pas encore de données</div>;
  const vals = points.map(p => p.v);
  const min = Math.min(...vals), max = Math.max(...vals);
  const ecart = max - min || 1;
  return (
    <div class="stat-graphe">
      {points.slice(-14).map((p, i) => {
        const h = 12 + ((p.v - min) / ecart) * 76;
        return (
          <div class="stat-col" key={i} title={`${p.label} · ${format ? format(p.v) : p.v}${unite}`}>
            <span class="stat-val">{format ? format(p.v) : p.v}</span>
            <div class="stat-barre" style={{ height: `${h}%`, background: couleur }} />
            <span class="stat-lab">{p.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export function Stats() {
  const [kg, setKg] = useState('');
  const poids = weightLog.value.map(p => ({ label: p.iso.slice(8) + '/' + p.iso.slice(5, 7), v: p.kg }));
  const jours = Object.entries(histoJours.value).sort(([a], [b]) => a.localeCompare(b))
    .map(([iso, d]) => ({ label: iso.slice(8), v: d.kcal }));
  const tend = tendancePoids.value;
  const mois = seancesParMois.value;
  const moisCourant = new Date().toISOString().slice(0, 7);

  const peser = (e) => { e.preventDefault(); if (kg) { ajouterPesee(kg); setKg(''); } };

  return (
    <div class="carte">
      <h3 style={{ margin: '0 0 14px', fontSize: '19px', fontWeight: 800 }}>Statistiques</h3>

      <div class="stat-cartes">
        <div class="stat-mini">
          <div class="sm-v">{weightLog.value.length ? weightLog.value[weightLog.value.length - 1].kg + ' kg' : '—'}</div>
          <div class="sm-l">Poids actuel</div>
        </div>
        <div class="stat-mini">
          <div class="sm-v" style={{ color: tend === null ? '#181818' : tend <= 0 ? '#10B981' : '#F07818' }}>
            {tend === null ? '—' : (tend > 0 ? '+' : '') + tend + ' kg'}
          </div>
          <div class="sm-l">Évolution</div>
        </div>
        <div class="stat-mini">
          <div class="sm-v">{mois[moisCourant] || 0}</div>
          <div class="sm-l">Séances ce mois</div>
        </div>
      </div>

      <div class="stat-bloc">
        <div class="stat-titre">Évolution du poids</div>
        <MiniGraphe points={poids} couleur="linear-gradient(180deg,#181818,#4a4a4a)" unite=" kg" />
        <form onSubmit={peser} class="stat-pesee">
          <input type="number" step="0.1" placeholder="Mon poids du jour (kg)" value={kg} onInput={e => setKg(e.currentTarget.value)} />
          <button type="submit">Enregistrer</button>
        </form>
      </div>

      <div class="stat-bloc">
        <div class="stat-titre">Calories des journées enregistrées</div>
        <MiniGraphe points={jours} couleur="linear-gradient(180deg,#DFA004,#F7B500)" unite=" kcal" format={v => Math.round(v / 100) / 10 + 'k'} />
        <div class="stat-note">Objectif : {objectifs.value.kcal} kcal/jour</div>
      </div>
    </div>
  );
}
