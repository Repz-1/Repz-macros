import { useState } from 'preact/hooks';
import { EAT_IDEAS, CATEGORIES_IDEES } from '../data/idees.js';
import { DB } from '../data/aliments.js';
import { repas, ajouterIngredient, objectifs, totauxJour } from '../store/journal.js';
import { estPremium } from './PremiumPage.jsx';
import { ongletActif } from './BottomNav.jsx';
import { t } from '../i18n/index.js';

// Macros d'une idee = somme reelle de ses aliments (base DB)
function macrosIdee(idee) {
  return idee.ings.reduce((t, i) => {
    const d = DB[i.n];
    if (!d) return t;
    const g = d.unit ? i.q * d.unit : i.q; // aliment a l'unite -> q = nb de pieces
    const f = g / 100;
    return {
      kcal: t.kcal + d.kcal * f, prot: t.prot + d.prot * f,
      carbs: t.carbs + d.carbs * f, lip: t.lip + d.lip * f, g,
    };
  }, { kcal: 0, prot: 0, carbs: 0, lip: 0 });
}

export function IdeesRepas() {
  const [cat, setCat] = useState(null);
  const [ajoute, setAjoute] = useState(null);

  if (!estPremium.value) {
    return (
      <div class="carte idees-verrou" onClick={() => { ongletActif.value = 'premium'; }}>
        <div class="idees-tete"><span>💡 {t('idees_repas')}</span><i class="pro-inline">✦ PRO</i></div>
        <p>Des idées de repas calibrées sur tes macros restantes.</p>
      </div>
    );
  }

  const reste = Math.round(objectifs.value.kcal - totauxJour.value.kcal);
  const cible = repas.value[repas.value.length - 1];

  const ajouter = (idee) => {
    if (!cible) return;
    idee.ings.forEach(i => {
      const d = DB[i.n];
      if (d) ajouterIngredient(cible.id, i.n, d.unit ? i.q * d.unit : i.q);
    });
    setAjoute(idee.nom);
    setTimeout(() => setAjoute(null), 1500);
  };

  return (
    <div class="carte">
      <div class="idees-tete"><span>💡 {t('idees_repas')}</span></div>
      <p class="idees-intro">
        {reste > 50 ? `Il te reste ${reste} kcal aujourd'hui.`
          : reste < -50 ? `Tu as dépassé de ${Math.abs(reste)} kcal.`
          : 'Tu es pile sur ton objectif.'}
      </p>

      <div class="idees-cats">
        {CATEGORIES_IDEES.map(c => (
          <button key={c.k} class={cat === c.k ? 'actif' : ''} onClick={() => setCat(cat === c.k ? null : c.k)}>
            {c.ic} {c.label}
          </button>
        ))}
      </div>

      {cat && EAT_IDEAS[cat].map((idee, i) => {
        const m = macrosIdee(idee);
        return (
          <div class="idee" key={i}>
            <div class="idee-info">
              <div class="idee-nom">{idee.nom}</div>
              <div class="idee-mac">{m.kcal.toFixed(0)} kcal · {m.prot.toFixed(0)}P · {m.carbs.toFixed(0)}C · {m.lip.toFixed(0)}L</div>
            </div>
            <button onClick={() => ajouter(idee)}>{ajoute === idee.nom ? '✓' : '+'}</button>
          </div>
        );
      })}
    </div>
  );
}
