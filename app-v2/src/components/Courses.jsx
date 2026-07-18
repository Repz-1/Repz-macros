import { useState } from 'preact/hooks';
import { signal, effect } from '@preact/signals';
import { rayonDe, RAYONS } from '../data/rayons.js';
import { DB } from '../data/aliments.js';
import { repas } from '../store/journal.js';
import { identite } from '../services/firebase.js';
import { chargerDonnees, sauvegarder } from '../services/sync.js';
import { estPremium } from './PremiumPage.jsx';
import { ongletActif } from './BottomNav.jsx';
import { t } from '../i18n/index.js';

// Liste de courses : etat coche + items manuels, synchronises cloud
export const courses = signal({ jours: 5, pers: 1, coches: {}, manuels: [] });
let uidCo = null, pretCo = false;

effect(() => {
  const u = identite.value;
  if (!u) { uidCo = null; pretCo = false; return; }
  if (u === uidCo) return;
  uidCo = u; pretCo = false;
  chargerDonnees(u).then(d => {
    if (uidCo !== u) return;
    courses.value = (d && d.courses) || { jours: 5, pers: 1, coches: {}, manuels: [] };
    pretCo = true;
  });
});

effect(() => {
  const c = courses.value;
  const u = identite.value;
  if (!u || !pretCo) return;
  sauvegarder(u, { courses: c });
});

// Base "1 jour" : agrege les aliments du journal du jour
function baseJour() {
  const tot = {};
  repas.value.forEach(r => (r.ings || []).forEach(i => {
    tot[i.name] = (tot[i.name] || 0) + (parseFloat(i.portion) || 0);
  }));
  return Object.keys(tot).map(nom => {
    const d = DB[nom] || {};
    return {
      nom,
      qtyJour: tot[nom],
      unite: d.unit ? (d.unitLabel || 'u') : 'g',
      parUnite: d.unit || null,
      rayon: rayonDe(nom),
    };
  });
}

export function Courses() {
  const [ajout, setAjout] = useState('');
  const c = courses.value;

  if (!estPremium.value) {
    return (
      <div class="carte idees-verrou" onClick={() => { ongletActif.value = 'premium'; }}>
        <div class="idees-tete"><span>🛒 {t('liste_courses')}</span><i class="pro-inline">✦ PRO</i></div>
        <p>Ta liste générée automatiquement depuis ton journal, classée par rayon.</p>
      </div>
    );
  }

  const items = baseJour();
  const maj = (patch) => { courses.value = { ...c, ...patch }; };
  const cocher = (nom) => maj({ coches: { ...c.coches, [nom]: !c.coches[nom] } });
  const ajouterManuel = (e) => {
    e.preventDefault();
    const n = ajout.trim();
    if (!n) return;
    maj({ manuels: [...c.manuels, n] });
    setAjout('');
  };

  const tous = [
    ...items.map(i => ({ ...i, qty: i.qtyJour * c.jours * c.pers })),
    ...c.manuels.map(n => ({ nom: n, qty: null, rayon: rayonDe(n), manuel: true })),
  ];
  const parRayon = RAYONS.map(r => ({ ...r, liste: tous.filter(i => i.rayon === r.k) })).filter(r => r.liste.length);
  const restants = tous.filter(i => !c.coches[i.nom]).length;

  return (
    <div>
      <div class="carte">
        <div class="idees-tete"><span>🛒 {t('liste_courses')}</span></div>
        <p class="idees-intro">
          {tous.length ? `${restants} article${restants > 1 ? 's' : ''} à acheter` : t('liste_vide')}
        </p>
        <div class="crs-reglages">
          <label>{t('jours')}
            <input type="number" min="1" value={c.jours} onInput={e => maj({ jours: Math.max(1, +e.currentTarget.value || 1) })} />
          </label>
          <label>{t('personnes')}
            <input type="number" min="1" value={c.pers} onInput={e => maj({ pers: Math.max(1, +e.currentTarget.value || 1) })} />
          </label>
        </div>
        <form onSubmit={ajouterManuel} class="seance-add-exo">
          <input placeholder={t("ajouter_article")} value={ajout} onInput={e => setAjout(e.currentTarget.value)} />
          <button type="submit">+</button>
        </form>
      </div>

      {parRayon.map(r => (
        <div class="carte" key={r.k}>
          <div class="crs-rayon">{r.emo} {r.nom}</div>
          {r.liste.map(i => {
            const coche = !!c.coches[i.nom];
            const q = i.qty == null ? '' :
              i.parUnite ? `${Math.round(i.qty / i.parUnite * 10) / 10} ${i.unite}` :
              i.qty >= 1000 ? `${(i.qty / 1000).toFixed(1)} kg` : `${Math.round(i.qty)} g`;
            return (
              <label class={`crs-item ${coche ? 'ok' : ''}`} key={i.nom}>
                <input type="checkbox" checked={coche} onChange={() => cocher(i.nom)} />
                <span class="crs-nom">{i.nom}</span>
                <span class="crs-q">{q}</span>
              </label>
            );
          })}
        </div>
      ))}
    </div>
  );
}
