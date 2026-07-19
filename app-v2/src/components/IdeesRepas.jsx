import { useState } from 'preact/hooks';
import { signal } from '@preact/signals';
import { EAT_IDEAS, CATEGORIES_IDEES } from '../data/idees.js';
import { DB } from '../data/aliments.js';
import { repas, ajouterIngredient, objectifs, totauxJour } from '../store/journal.js';
import { estPremium } from './PremiumPage.jsx';
import { ongletActif } from './BottomNav.jsx';
import { t } from '../i18n/index.js';

// Macros d'une idee = somme reelle de ses aliments (base DB)
function macrosIdee(idee) {
  return idee.ings.reduce((acc, i) => {
    const d = DB[i.n];
    if (!d) return acc;
    const g = d.unit ? i.q * d.unit : i.q; // aliment a l'unite -> q = nb de pieces
    const f = g / 100;
    return {
      kcal: acc.kcal + d.kcal * f, prot: acc.prot + d.prot * f,
      carbs: acc.carbs + d.carbs * f, lip: acc.lip + d.lip * f, g,
    };
  }, { kcal: 0, prot: 0, carbs: 0, lip: 0 });
}

// Etat partage : la pilule est dans la rangee flottante, le panneau
// reste dans le flux de la page.
export const ideesOuvertes = signal(false);

export function IdeesRepas({ pilulSeule, panneauSeul }) {
  const ouvert = ideesOuvertes.value;
  const setOuvert = (v) => { ideesOuvertes.value = v; };
  const [cat, setCat] = useState(null);
  const [ajoute, setAjoute] = useState(null);

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

  // Rangee flottante : la pilule seule.
  if (pilulSeule) {
    return (
      <button class="eat-toggle" onClick={() => setOuvert(!ouvert)}>
        <svg viewBox="0 0 24 24" class="ic" aria-hidden="true">
          <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.2 1 2h6c0-.8.3-1.3 1-2A6 6 0 0 0 12 3z" />
        </svg>
        <span>{t('eat_title')}</span>
        <span class="eat-fleche">{ouvert ? '\u25B4' : '\u25BE'}</span>
      </button>
    );
  }

  return (
    <div class="eat-zone-wrap">
      <div class="eat-zone" style={panneauSeul ? { display: 'none' } : null}>
        <button class="eat-toggle" onClick={() => setOuvert(!ouvert)}>
          <svg viewBox="0 0 24 24" class="ic" aria-hidden="true">
            <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.2 1 2h6c0-.8.3-1.3 1-2A6 6 0 0 0 12 3z" />
          </svg>
          <span>{t('eat_title')}</span>
          <span class="eat-fleche">{ouvert ? '\u25B4' : '\u25BE'}</span>
        </button>
      </div>

      {ouvert && !estPremium.value && (
        <div class="carte eat-panneau" onClick={() => { ongletActif.value = 'premium'; }}>
          <p class="idees-intro">Des idées de repas calibrées sur tes macros restantes.</p>
        </div>
      )}

      {ouvert && estPremium.value && (
    <div class="carte eat-panneau">
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
      )}
    </div>
  );
}
