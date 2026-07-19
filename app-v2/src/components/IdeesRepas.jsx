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

/** Quantites ajustees a ce qu'il reste dans la journee, comme sur
    la reference : « 205g poulet · 275g patate douce · 205g brocoli ». */
function portionAdaptee(idee, resteKcal) {
  const base = macrosIdee(idee);
  const cible = Math.max(250, Math.min(700, resteKcal > 0 ? resteKcal * 0.28 : 400));
  const ratio = base.kcal > 0 ? Math.max(0.75, Math.min(1.4, cible / base.kcal)) : 1;

  const parts = [];
  let kcal = 0, prot = 0;
  idee.ings.forEach(i => {
    const d = DB[i.n];
    if (!d) return;
    let q, grammes, libelle;
    if (d.unit) {
      q = Math.max(1, Math.round(i.q * ratio));
      grammes = q * d.unit;
      libelle = q + ' ' + i.l + (q > 1 ? 's' : '');
    } else {
      q = Math.max(5, Math.round(i.q * ratio / 5) * 5);
      grammes = q;
      libelle = q + 'g ' + i.l;
    }
    const f = grammes / 100;
    kcal += d.kcal * f;
    prot += d.prot * f;
    parts.push(libelle);
  });

  return { texte: parts.join(' · '), kcal: Math.round(kcal), prot: Math.round(prot) };
}

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
        <div class="eat-panneau" onClick={() => { ongletActif.value = 'premium'; }}>
          <p class="eat-intro">Des idées de repas calibrées sur tes macros restantes. <b>Passe en Premium</b> pour les débloquer.</p>
        </div>
      )}

      {ouvert && estPremium.value && (
    <div class="eat-panneau">
      <p class="eat-intro"
         dangerouslySetInnerHTML={{ __html: t('eat_left').replace('{n}', Math.max(0, reste)) }} />

      <div class="eat-cats">
        {CATEGORIES_IDEES.map(c => (
          <button key={c.k} class={'eat-cat' + (cat === c.k ? ' active' : '')}
                  onClick={() => setCat(cat === c.k ? null : c.k)}>
            {c.label}
          </button>
        ))}
      </div>

      {cat && (
        <div class="eat-ideas">
          {EAT_IDEAS[cat].map((idee, i) => {
            const p = portionAdaptee(idee, reste);
            return (
              <div class="eat-idea" key={i} onClick={() => ajouter(idee)}>
                <div class="eat-idea-name">{idee.nom}</div>
                <div class="eat-idea-ex">{p.texte}</div>
                <div class="eat-idea-kcal">
                  ≈ {p.kcal} kcal · <span class="eat-prot ok">{p.prot} g prot</span>
                </div>
                <span class="eat-open">{ajoute === idee.nom ? '✓ Ajouté' : 'Voir la recette →'}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
      )}
    </div>
  );
}
