import { signal, computed } from '@preact/signals';
import { useState } from 'preact/hooks';
import { t } from '../i18n/index.js';
import { weightLog, histoJours } from '../store/stats.js';
import { objectifs } from '../store/journal.js';
import { muscleLog } from '../store/entrainement.js';
import { setLog } from './SeanceTracker.jsx';
import { Entete } from './Entete.jsx';
import '../styles/stats-avancees.css';

// ============================================================
// STATISTIQUES AVANCEES — l'avantage Premium annonce par BelFit+.
//
// La page Stats ordinaire est figee sur 7 jours ; c'est ce verrou
// qui saute ici. Tout est calcule a partir de ce que l'application
// enregistre DEJA (weightLog, histoJours, setLog, muscleLog) : rien
// de nouveau a collecter, donc les chiffres existent des le premier
// jour d'abonnement.
//
// Presentation « verdict d'abord » : la synthese graphite repond a
// « est-ce que ça marche ? », les cartes justifient ensuite. Elle
// prolonge la carte de progression globale de la page Stats.
// ============================================================

export const statsAvOuvertes = signal(false);

const PERIODES = [
  { k: 7, lb: '7 j' }, { k: 30, lb: '30 j' },
  { k: 90, lb: '90 j' }, { k: 0, lb: 'Tout' },
];

const iso = (d) => d.toISOString().slice(0, 10);

/** Bornes de la periode. 0 = depuis le premier jour connu. */
function depuis(jours) {
  if (!jours) return '0000-01-01';
  const d = new Date();
  d.setDate(d.getDate() - jours + 1);
  return iso(d);
}

/** Moyenne mobile : le poids oscille d'un kilo d'un jour a l'autre,
 *  seule la moyenne lissee laisse voir une tendance. */
function lissage(pts, fenetre = 7) {
  return pts.map((p, i) => {
    const deb = Math.max(0, i - fenetre + 1);
    const tranche = pts.slice(deb, i + 1);
    const m = tranche.reduce((s, x) => s + x.kg, 0) / tranche.length;
    return { iso: p.iso, kg: m };
  });
}

/** Pente en kg par semaine, par moindres carres sur les points
 *  lisses. Une simple difference entre le premier et le dernier
 *  point serait a la merci d'une seule pesee aberrante. */
function penteHebdo(pts) {
  if (pts.length < 3) return null;
  const t0 = new Date(pts[0].iso).getTime();
  const xs = pts.map(p => (new Date(p.iso).getTime() - t0) / 86400000);
  const ys = pts.map(p => p.kg);
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) { num += (xs[i] - mx) * (ys[i] - my); den += (xs[i] - mx) ** 2; }
  if (!den) return null;
  return (num / den) * 7;
}

function Courbe({ brut, lisse }) {
  if (brut.length < 2) return null;
  const tous = brut.map(p => p.kg).concat(lisse.map(p => p.kg));
  const min = Math.min(...tous), max = Math.max(...tous);
  const amp = (max - min) || 1;
  const X = (i, n) => (i / (n - 1)) * 300;
  const Y = (v) => 100 - ((v - min) / amp) * 88 - 6;
  const pts = (a) => a.map((p, i) => `${X(i, a.length).toFixed(1)},${Y(p.kg).toFixed(1)}`).join(' ');
  return (
    <div class="sa-courbe">
      <svg viewBox="0 0 300 100" preserveAspectRatio="none" aria-hidden="true">
        <polyline points={pts(brut)} fill="none" stroke="#C9C3B8"
                  stroke-width="1.4" stroke-dasharray="4 4" />
        <polyline points={pts(lisse)} fill="none" stroke="#1E232D"
                  stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </div>
  );
}

export function StatsAvancees({ fermer }) {
  const [periode, setPeriode] = useState(30);
  const borne = depuis(periode);

  // --- Poids ---
  const pesees = weightLog.value
    .filter(p => p.iso >= borne)
    // Le store v2 ecrit { iso, kg } ; les pesees importees de la v1
    // portent { iso, weight }. Ne lire que p.weight donnait kg
    // undefined sur toute donnee v2 : la courbe, la pente hebdo et
    // l'ecart de poids tombaient a NaN, et le SVG refusait de tracer.
    // Stats.jsx tolerait deja les deux formes, pas celui-ci.
    .map(p => ({ iso: p.iso, kg: parseFloat(p.kg ?? p.weight) || 0 }))
    .sort((a, b) => a.iso.localeCompare(b.iso));
  const lisse = lissage(pesees);
  const pente = penteHebdo(lisse);
  const ecartPoids = pesees.length >= 2
    ? pesees[pesees.length - 1].kg - pesees[0].kg : null;

  // --- Journees ---
  const jours = Object.entries(histoJours.value)
    .filter(([d]) => d >= borne)
    .sort((a, b) => a[0].localeCompare(b[0]));
  const nbJours = jours.length;
  const moy = (cle) => nbJours
    ? Math.round(jours.reduce((s, [, v]) => s + (v[cle] || 0), 0) / nbJours) : 0;
  const moyKcal = moy('kcal');
  const obj = objectifs.value;
  const ecartKcal = obj && obj.kcal ? moyKcal - obj.kcal : null;

  // Semaines : moyenne par semaine civile, plus lisible qu'un point
  // par jour sur 90 jours.
  const semaines = [];
  jours.forEach(([d, v]) => {
    const dt = new Date(d);
    const lundi = new Date(dt);
    lundi.setDate(dt.getDate() - ((dt.getDay() + 6) % 7));
    const cle = iso(lundi);
    let s = semaines.find(x => x.cle === cle);
    if (!s) { s = { cle, total: 0, n: 0 }; semaines.push(s); }
    s.total += v.kcal || 0; s.n++;
  });
  const sems = semaines.slice(-6).map(s => ({ cle: s.cle, kcal: Math.round(s.total / s.n) }));
  const maxSem = Math.max(1, ...sems.map(s => s.kcal));

  // --- Regularite ---
  const total = periode || Math.max(nbJours, 1);
  let serie = 0, meilleure = 0;
  const setJours = new Set(jours.map(j => j[0]));
  for (let i = 0; i < (periode || 365); i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    if (setJours.has(iso(d))) { serie++; meilleure = Math.max(meilleure, serie); }
    else serie = 0;
  }

  // --- Force : meilleure charge par exercice sur la periode ---
  const parExo = {};
  Object.entries(setLog.value || {}).forEach(([cle, series]) => {
    (Array.isArray(series) ? series : []).forEach(s => {
      const d = (s && s.iso) || '';
      if (d && d < borne) return;
      const kg = parseFloat(s && s.kg) || 0;
      if (!kg) return;
      const nom = (s && s.exo) || cle;
      if (!parExo[nom] || kg > parExo[nom].kg) parExo[nom] = { kg, iso: d };
    });
  });
  const force = Object.entries(parExo)
    .sort((a, b) => b[1].kg - a[1].kg).slice(0, 5);

  // --- Muscles ---
  const muscles = {};
  Object.entries(muscleLog.value || {}).forEach(([d, vals]) => {
    if (d < borne) return;
    (Array.isArray(vals) ? vals : []).forEach(m => {
      if (m === 'repos') return;
      muscles[m] = (muscles[m] || 0) + 1;
    });
  });
  const topMuscle = Object.entries(muscles).sort((a, b) => b[1] - a[1])[0];
  const seances = Object.keys(muscleLog.value || {})
    .filter(d => d >= borne && (muscleLog.value[d] || []).some(v => v !== 'repos')).length;

  const assez = nbJours > 0 || pesees.length > 0;

  return (
    <div class="pg-statsav">
      <Entete retour />
      <div class="sa-corps">
        <button class="sa-retour" onClick={fermer}>← BelFit+</button>
        <h1 class="sa-titre">Statistiques avancées</h1>
        <p class="sa-sous">Ta progression sur la durée, pas seulement cette semaine.</p>

        <div class="sa-periodes">
          {PERIODES.map(p => (
            <button key={p.k} class={periode === p.k ? 'on' : ''}
                    onClick={() => setPeriode(p.k)}>{p.lb}</button>
          ))}
        </div>

        {!assez && (
          <div class="sa-vide">
            Pas encore assez de données sur cette période. Renseigne tes repas
            et tes pesées : les tendances apparaissent au bout de quelques jours.
          </div>
        )}

        {assez && (
          <>
            {/* Le verdict : un chiffre et une phrase. */}
            <section class="sa-synthese">
              <p class="sa-lb">
                {periode ? `Sur ${periode} jours` : 'Depuis le début'}
              </p>
              <p class="sa-gros">
                {ecartPoids === null ? '—'
                  : (ecartPoids > 0 ? '+' : '') + ecartPoids.toFixed(1) + ' kg'}
              </p>
              <p class="sa-phrase">
                {pente === null
                  ? 'Ajoute quelques pesées pour voir ta tendance.'
                  : Math.abs(pente) < 0.05
                    ? 'Ton poids est stable.'
                    : `Tu ${pente < 0 ? 'descends' : 'montes'} de ${Math.abs(pente * 1000).toFixed(0)} g par semaine, régulièrement.`}
              </p>
              <div class="sa-grille">
                <div><b>{moyKcal || '—'}</b><span>kcal / jour en moyenne</span></div>
                <div><b>{nbJours}{periode ? ` / ${total}` : ''}</b><span>jours renseignés</span></div>
                <div><b>{seances}</b><span>séances</span></div>
                <div><b>{meilleure}</b><span>jours d'affilée</span></div>
              </div>
            </section>

            {pesees.length >= 2 && (
              <section class="sa-carte">
                <h3>
                  <i aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 4v16M7 20h10M6 8h12l-3 6H9z" /><circle cx="12" cy="4" r="1.4" /></svg></i>
                  Poids
                </h3>
                <p class="sa-cs">Chaque pesée, et la moyenne lissée sur 7 jours</p>
                <Courbe brut={pesees} lisse={lisse} />
                <div class="sa-legende">
                  <span>{pesees[0].iso.slice(8)}/{pesees[0].iso.slice(5, 7)}</span>
                  <span>aujourd'hui</span>
                </div>
              </section>
            )}

            {sems.length > 0 && (
              <section class="sa-carte">
                <h3>
                  <i aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3s4.5 4 4.5 8a4.5 4.5 0 01-9 0c0-1.4.6-2.6 1.3-3.6.3 1.1 1 1.9 1.9 1.9 1 0 1.6-.9 1.3-2.2A6 6 0 0012 3z" /></svg></i>
                  Calories
                </h3>
                <p class="sa-cs">
                  Moyenne par semaine{obj && obj.kcal ? `, face à ${obj.kcal} kcal` : ''}
                </p>
                <div class="sa-barres">
                  {sems.map(s => (
                    <i key={s.cle} style={{ height: Math.max(8, (s.kcal / maxSem) * 100) + '%' }}>
                      <em>{s.kcal}</em>
                    </i>
                  ))}
                </div>
                {ecartKcal !== null && (
                  <p class="sa-note">
                    Écart moyen : <b>{ecartKcal > 0 ? '+' : ''}{ecartKcal} kcal</b> par jour.
                  </p>
                )}
                <div class="sa-lignes">
                  {[['Protéines', 'prot', obj && obj.prot],
                    ['Glucides', 'carbs', obj && obj.carbs],
                    ['Lipides', 'lip', obj && obj.lip]].map(([nom, cle, cible]) => {
                    const v = moy(cle);
                    const pc = cible ? Math.min(140, (v / cible) * 100) : 0;
                    return (
                      <div class="sa-ligne" key={cle}>
                        <span class="sa-n">{nom}</span>
                        <span class="sa-jauge"><i style={{ width: pc + '%' }} /></span>
                        <span class="sa-v">{v} g</span>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {force.length > 0 && (
              <section class="sa-carte">
                <h3>
                  <i aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M6.5 6.5v11M17.5 6.5v11M3 9.5v5M21 9.5v5M6.5 12h11" /></svg></i>
                  Force
                </h3>
                <p class="sa-cs">Ta charge la plus lourde par exercice</p>
                {force.map(([nom, v]) => (
                  <div class="sa-rec" key={nom}>
                    <span class="sa-e">{nom}</span>
                    <span class="sa-p">{v.kg} kg</span>
                  </div>
                ))}
              </section>
            )}

            {topMuscle && (
              <section class="sa-carte">
                <h3>
                  <i aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3.5" y="4.5" width="17" height="16" rx="2.5" /><path d="M3.5 9h17M8 2.5v4M16 2.5v4" /><path d="M8.5 13.5l2 2 4-4" /></svg></i>
                  Régularité
                </h3>
                <p class="sa-cs">Ce que tu as le plus travaillé</p>
                <div class="sa-ligne"><span class="sa-n">Muscle le plus sollicité</span>
                  <span class="sa-v">{topMuscle[0]}</span></div>
                <div class="sa-ligne"><span class="sa-n">Séances sur la période</span>
                  <span class="sa-v">{seances}</span></div>
                <div class="sa-ligne"><span class="sa-n">Plus longue série</span>
                  <span class="sa-v">{meilleure} j</span></div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
