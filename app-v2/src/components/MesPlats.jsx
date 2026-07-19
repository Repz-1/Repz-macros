import { useState } from 'preact/hooks';
import { createPortal } from 'preact/compat';
import { DB, NOMS_ALIMENTS } from '../data/aliments.js';
import { customFoods } from './Scanner.jsx';
import { plats, enregistrerPlat, supprimerPlat, totauxPlat, macrosPortion } from '../store/perso.js';
import { t } from '../i18n/index.js';

// ============================================================
// MES PLATS
// On pese une seule fois, a la cuisson, puis on consomme en
// portions. Un plat mange en une fois = 1 portion : aucun calcul
// a faire dans ce cas, qui reste le plus courant.
// ============================================================

const vide = () => ({ id: null, nom: '', ings: [], portions: 1 });

/** Recherche d'aliment, identique a celle du journal. */
function ChampAliment({ ajouter }) {
  const [q, setQ] = useState('');
  const noms = [...Object.keys(customFoods.value), ...NOMS_ALIMENTS];
  const resultats = q.length < 2 ? []
    : noms.filter(n => n.toLowerCase().includes(q.toLowerCase())).slice(0, 8);

  return (
    <div class="mp-recherche">
      <input
        placeholder={t('mc_add_ph')}
        value={q}
        onInput={e => setQ(e.currentTarget.value)}
      />
      {resultats.length > 0 && (
        <div class="mp-resultats">
          {resultats.map(nom => {
            const d = DB[nom] || customFoods.value[nom];
            return (
              <button key={nom} onClick={() => { ajouter(nom, d.unit || 100); setQ(''); }}>
                <span>{nom}</span>
                <span class="kc">{d.kcal} kcal/100g</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Formulaire de creation ou de modification d'un plat. */
function EditeurPlat({ initial, fermer }) {
  const [plat, setPlat] = useState(initial);

  const maj = (champ, val) => setPlat(p => ({ ...p, [champ]: val }));

  const ajouterIng = (name, portion) =>
    setPlat(p => ({ ...p, ings: [...p.ings, { id: Date.now(), name, portion }] }));

  const majPortion = (id, portion) =>
    setPlat(p => ({ ...p, ings: p.ings.map(i => (i.id === id ? { ...i, portion } : i)) }));

  const retirerIng = (id) =>
    setPlat(p => ({ ...p, ings: p.ings.filter(i => i.id !== id) }));

  const total = totauxPlat(plat);
  const part = macrosPortion(plat);
  const complet = plat.nom.trim() && plat.ings.length > 0;

  return createPortal(
    <div class="mp-plein">
      <div class="mp-defile">
        <div class="mp-entete">
          <button class="mp-x" onClick={fermer} aria-label="Fermer">✕</button>
          <h2>{initial.id ? t('mp_modifier') : t('mp_nouveau')}</h2>
        </div>

        <div class="mp-corps">
          <label class="mp-champ">
            <span>{t('mp_nom')}</span>
            <input
              value={plat.nom}
              placeholder={t('mp_nom_ph')}
              onInput={e => maj('nom', e.currentTarget.value)}
            />
          </label>

          <div class="mp-sec">{t('mp_ingredients')}</div>
          <p class="mp-aide">{t('mp_aide_poids')}</p>

          {plat.ings.map(i => (
            <div class="mp-ing" key={i.id}>
              <span class="mp-ing-nom">{i.name}</span>
              <input
                type="number" inputMode="decimal" min="0"
                value={i.portion}
                onFocus={e => e.currentTarget.select()}
                onInput={e => majPortion(i.id, parseFloat(e.currentTarget.value) || 0)}
              />
              <span class="mp-ing-unite">g</span>
              <button class="mp-ing-x" onClick={() => retirerIng(i.id)} aria-label="Retirer">✕</button>
            </div>
          ))}

          <ChampAliment ajouter={ajouterIng} />

          <div class="mp-sec">{t('mp_portions')}</div>
          <p class="mp-aide">{t('mp_aide_portions')}</p>
          <div class="mp-compteur">
            <button onClick={() => maj('portions', Math.max(1, (plat.portions || 1) - 1))}>−</button>
            <span>{plat.portions || 1}</span>
            <button onClick={() => maj('portions', (plat.portions || 1) + 1)}>+</button>
          </div>

          {plat.ings.length > 0 && (
            <div class="mp-bilan">
              <div class="mp-bilan-ligne">
                <span>{t('mp_plat_entier')}</span>
                <b>{Math.round(total.kcal)} kcal · {Math.round(total.prot)} g prot</b>
              </div>
              <div class="mp-bilan-ligne mp-bilan-ligne--fort">
                <span>{t('mp_une_portion')}</span>
                <b>{Math.round(part.kcal)} kcal · {Math.round(part.prot)} g prot</b>
              </div>
            </div>
          )}

          <button
            class="mp-valider"
            disabled={!complet}
            onClick={() => { enregistrerPlat(plat); fermer(); }}
          >{t('mp_enregistrer')}</button>

          {initial.id && (
            <button
              class="mp-supprimer"
              onClick={() => { supprimerPlat(initial.id); fermer(); }}
            >{t('mp_supprimer')}</button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

/** Liste des plats enregistres. */
export function MesPlats({ fermer }) {
  const [editeur, setEditeur] = useState(null);

  return createPortal(
    <div class="mp-plein">
      <div class="mp-defile">
        <div class="mp-entete">
          <button class="mp-x" onClick={fermer} aria-label="Fermer">✕</button>
          <h2>{t('mp_titre')}</h2>
        </div>

        <div class="mp-corps">
          {plats.value.length === 0 && (
            <p class="mp-rien">{t('mp_rien')}</p>
          )}

          {plats.value.map(p => {
            const part = macrosPortion(p);
            return (
              <button class="mp-carte" key={p.id} onClick={() => setEditeur(p)}>
                <div class="mp-carte-nom">{p.nom}</div>
                <div class="mp-carte-detail">
                  {p.portions || 1} {t(p.portions > 1 ? 'mp_portions_n' : 'mp_portion_n')}
                  {' · '}{Math.round(part.kcal)} kcal {t('mp_par_portion')}
                </div>
              </button>
            );
          })}

          <button class="mp-nouveau" onClick={() => setEditeur(vide())}>
            + {t('mp_nouveau')}
          </button>
        </div>
      </div>

      {editeur && <EditeurPlat initial={editeur} fermer={() => setEditeur(null)} />}
    </div>,
    document.body
  );
}
