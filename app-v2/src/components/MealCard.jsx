import { useState, useEffect, useRef } from 'preact/hooks';
import { createPortal } from 'preact/compat';
import { DB, NOMS_ALIMENTS, macrosOf } from '../data/aliments.js';
import { customFoods, Scanner } from './Scanner.jsx';
import { enregistrerPlat } from '../store/perso.js';
import { signal } from '@preact/signals';

// Repas dont le champ de recherche est actif. Sert au mode « focus » :
// le reste de la page s'assombrit pour ne garder que l'aliment saisi.
export const repasEnSaisie = signal(null);

// Ouverture de la bibliotheque de plats. Elle a quitte les actions
// rapides : on n'y va que pour renommer ou supprimer un plat, ce qui
// est rare. Le lien vit donc au bas de la liste de recherche, la ou
// les plats apparaissent deja.
export const ouvrirMesPlats = signal(false);
import { estPremium } from './PremiumPage.jsx';
import { ongletActif } from './BottomNav.jsx';
import { t } from '../i18n/index.js';
import { favoris, estFavori, basculerFavori, plats, macrosPortion } from '../store/perso.js';
import { MEAL_SVG, TYPE_SVG, MEAL_NEUTRAL_SVG } from '../data/illustrations.js';
import {
  totauxRepas, setPortion, ajouterIngredient, ajouterPlat,
  supprimerIngredient, supprimerRepas, basculerRepas, renommerRepas,
  fourchetteRepas,
} from '../store/journal.js';

/** Illustration d'un repas : la sienne s'il est fixe, sinon celle de son type. */
function illustration(r) {
  if (r.cle && MEAL_SVG[r.cle]) return MEAL_SVG[r.cle];
  return TYPE_SVG[r.type] || MEAL_NEUTRAL_SVG;
}


/** Combien de portions de ce plat ? Un seul chiffre a regler. */
function ChoixPortions({ plat, fermer, valider }) {
  const [n, setN] = useState(1);
  const part = macrosPortion(plat);

  return createPortal(
    <div class="cp-overlay" onClick={e => { if (e.target === e.currentTarget) fermer(); }}>
      <div class="cp-boite">
        <h3>{plat.nom}</h3>
        <p class="cp-sous">{t('cp_combien')}</p>

        <div class="cp-compteur">
          <button onClick={() => setN(Math.max(0.5, Math.round((n - 0.5) * 2) / 2))}>−</button>
          <span>{n % 1 === 0 ? n : n.toFixed(1).replace('.', ',')}</span>
          <button onClick={() => setN(n + 0.5)}>+</button>
        </div>

        <div class="cp-total">
          {Math.round(part.kcal * n)} kcal · {Math.round(part.prot * n)} g prot
        </div>

        <button class="cp-valider" onClick={() => valider(n)}>{t('cp_ajouter')}</button>
      </div>
    </div>,
    document.body
  );
}

function LigneIngredient({ repasId, ing }) {
  const d = DB[ing.name] || customFoods.value[ing.name] || {};
  const m = macrosOf(ing);
  const [saisie, setSaisie] = useState(String(ing.portion));

  // La valeur peut changer ailleurs (vocal, scan) : on resynchronise.
  useEffect(() => { setSaisie(String(ing.portion)); }, [ing.portion]);

  return (
    <div class="mc-ing">
      <div class="mc-ing-info">
        <div class="mc-ing-nom">{ing.name}</div>
        <div class="mc-ing-base">
          {d.unit
            ? `1 ${d.unitLabel || 'pièce'} = ${Math.round((d.kcal || 0) * d.unit / 100)} kcal`
            : `100g = ${d.kcal ?? '?'} kcal`}
        </div>
      </div>

      <div class="mc-ing-champ">
        <input
          type="number" inputMode="decimal" min="0"
          value={saisie}
          onFocus={e => e.currentTarget.select()}
          onInput={e => {
            const v = e.currentTarget.value;
            setSaisie(v);                       // champ vide autorise pendant la frappe
            if (v !== '') setPortion(repasId, ing.id, v);
          }}
          onBlur={() => {
            if (saisie === '') { setSaisie('0'); setPortion(repasId, ing.id, 0); }
          }}
        />
      </div>
      <span class="mc-ing-unite">g</span>

      <div class="mc-ing-macros">
        <div class="mc-ing-kcal">{m.kcal.toFixed(0)} kcal</div>
        <div class="mc-ing-sub">
          {m.prot.toFixed(0)}P · {m.carbs.toFixed(0)}C · {m.lip.toFixed(0)}L
        </div>
      </div>

      <button class="mc-ing-del" onClick={() => supprimerIngredient(repasId, ing.id)} aria-label="Retirer">✕</button>
    </div>
  );
}

function Recherche({ repasId }) {
  const champRef = useRef(null);
  const zoneRef = useRef(null);
  const [q, setQ] = useState('');
  const [scan, setScan] = useState(false);
  const [platChoisi, setPlatChoisi] = useState(null);
  // La liste ne s'affiche que si le champ est actif : sans cela, vider
  // la saisie apres un choix rouvrait aussitot la liste des favoris.
  const [actif, setActif] = useState(false);
  // Mise en avant du repas en cours de saisie (voile sur le reste).
  useEffect(() => {
    if (actif) repasEnSaisie.value = repasId;
    else if (repasEnSaisie.value === repasId) repasEnSaisie.value = null;
    return () => { if (repasEnSaisie.value === repasId) repasEnSaisie.value = null; };
  }, [actif, repasId]);

  const noms = [...Object.keys(customFoods.value), ...NOMS_ALIMENTS];
  const terme = q.trim().toLowerCase();

  // Les plats enregistres passent avant les aliments : ils sont plus
  // specifiques et c'est souvent eux qu'on cherche.
  const platsTrouves = terme.length >= 2
    ? plats.value.filter(p => p.nom.toLowerCase().includes(terme)).slice(0, 4)
    : [];

  // Sans saisie, on propose les favoris : c'est ce qu'on encode tous les jours.
  const resultats = terme.length < 2
    ? favoris.value.filter(n => DB[n] || customFoods.value[n]).slice(0, 6)
    : [
        ...favoris.value.filter(n => n.toLowerCase().includes(terme)),
        ...noms.filter(n => n.toLowerCase().includes(terme) && !estFavori(n)),
      ].slice(0, 8);

  const choisir = (nom) => {
    const d = DB[nom] || customFoods.value[nom] || {};
    // Aliment "a la piece" (burger, oeuf...) : portion par defaut = 1 piece
    ajouterIngredient(repasId, nom, d.unit || 100);
    setQ('');
    setActif(false);          // la liste se referme, comme attendu
    if (champRef.current) champRef.current.blur();
  };

  // Champ actif : on fait remonter la zone de saisie en haut de
  // l'ecran. Sans cela, le clavier recouvre la liste de resultats et
  // l'utilisateur tape a l'aveugle.
  useEffect(() => {
    if (!actif) return;
    const id = setTimeout(() => {
      const el = zoneRef.current;
      if (el && el.scrollIntoView) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 140);   // on laisse le clavier finir son ouverture
    return () => clearTimeout(id);
  }, [actif]);

  // Un appui en dehors de la zone referme la liste.
  useEffect(() => {
    if (!actif) return;
    const dehors = (e) => {
      if (zoneRef.current && !zoneRef.current.contains(e.target)) setActif(false);
    };
    document.addEventListener('pointerdown', dehors, true);
    return () => document.removeEventListener('pointerdown', dehors, true);
  }, [actif]);

  return (
    <div class="mc-ajout-zone" ref={zoneRef}>
      <div class="mc-ajout">
        <input
          ref={champRef}
          placeholder={t('mc_add_ph')}
          value={q}
          onInput={e => { setQ(e.currentTarget.value); setActif(true); }}
          onFocus={() => setActif(true)}
        />
        <button
          class="mc-scan"
          onClick={() => { if (estPremium.value) setScan(true); else ongletActif.value = 'premium'; }}
          aria-label="Scanner un code-barres"
        >
          <svg viewBox="0 0 24 24" class="ic" aria-hidden="true">
            <path d="M3 5v14M6.5 5v14M10 5v14M13.5 5v14M17 5v14M20.5 5v14" />
          </svg>
          {!estPremium.value && <i class="mc-scan-pro">✦</i>}
        </button>
      </div>

      {actif && (platsTrouves.length > 0 || resultats.length > 0) && (
        <div class="mc-resultats">
          {terme.length < 2 && resultats.length > 0 && (
            <div class="mc-res-titre">{t('fav_titre')}</div>
          )}

          {platsTrouves.map(p => {
            const part = macrosPortion(p);
            return (
              <button class="mc-res-plat" key={'p' + p.id} onClick={() => setPlatChoisi(p)}>
                <span class="mc-res-nom">🍲 {p.nom}</span>
                <span class="kc">{Math.round(part.kcal)} kcal / {t('mp_portion_n')}</span>
              </button>
            );
          })}

          {resultats.map(nom => (
            <div class="mc-res-ligne" key={nom}>
              <button class="mc-res-choix" onClick={() => choisir(nom)}>
                <span>{nom}</span>
                <span class="kc">{(DB[nom] || customFoods.value[nom]).kcal} kcal/100g</span>
              </button>
              <button
                class={'mc-res-fav' + (estFavori(nom) ? ' on' : '')}
                onClick={e => { e.stopPropagation(); basculerFavori(nom); }}
                aria-label={t('fav_basculer')}
              >{estFavori(nom) ? '★' : '☆'}</button>
            </div>
          ))}

          {/* Acces discret a la bibliotheque, uniquement si elle existe */}
          {plats.value.length > 0 && (
            <button
              class="mc-res-gerer"
              onClick={() => { setActif(false); ouvrirMesPlats.value = true; }}
            >{t('mp_gerer')}</button>
          )}
        </div>
      )}

      {platChoisi && (
        <ChoixPortions
          plat={platChoisi}
          fermer={() => setPlatChoisi(null)}
          valider={(n) => { ajouterPlat(repasId, platChoisi, n); setPlatChoisi(null); setQ(''); setActif(false); }}
        />
      )}

      {scan && <Scanner repasId={repasId} fermer={() => setScan(false)} />}
    </div>
  );
}

export function MealCard({ r }) {
  const tot = totauxRepas(r);
  const vide = r.ings.length === 0;
  const [edite, setEdite] = useState(false);
  const [enrego, setEnrego] = useState(false);   // saisie du nom en cours
  const [nomPlat, setNomPlat] = useState('');
  const [garde, setGarde] = useState(false);     // confirmation breve

  // Enregistre la composition courante du repas comme plat reutilisable.
  // Les ingredients sont copies tels quels : le plat compte 1 portion,
  // donc le rappeler redonne exactement la meme assiette.
  const enregistrerCommePlat = () => {
    const nom = nomPlat.trim();
    if (!nom) return;
    enregistrerPlat({
      id: Date.now(),
      nom,
      portions: 1,
      ings: r.ings.map(i => ({ name: i.name, portion: i.portion })),
    });
    setEnrego(false); setNomPlat('');
    setGarde(true); setTimeout(() => setGarde(false), 2200);
  };

  // Trois zones : vignette, contenu, actions.
  // Le crayon et le chevron sont regroupes dans la zone d'actions,
  // centres sur la meme ligne : places separement, ils se retrouvaient
  // l'un en haut, l'autre au milieu.
  return (
    <div class={'mc' + (r.ouvert ? ' mc--ouvert' : '') + (repasEnSaisie.value === r.id ? ' mc--focus' : '')}>
      <div class="mc-tete" onClick={() => !edite && basculerRepas(r.id)}>

        <div class="mc-vignette" dangerouslySetInnerHTML={{ __html: illustration(r) }} />

        <div class="mc-info">
          {edite ? (
            <input
              class="mc-titre-champ"
              value={r.nom}
              onClick={e => e.stopPropagation()}
              onInput={e => renommerRepas(r.id, e.currentTarget.value)}
              onBlur={() => setEdite(false)}
              onKeyDown={e => e.key === 'Enter' && setEdite(false)}
              autoFocus
            />
          ) : (
            <h3 class="mc-titre">{r.nom}</h3>
          )}
          <p class="mc-sous">{
            !vide ? `${tot.kcal.toFixed(0)} kcal`
              : (() => {
                  const f = fourchetteRepas(r.cle);
                  return f ? `${t('mc_reco')} ${f.min} – ${f.max} kcal` : t('mc_empty');
                })()
          }</p>
        </div>

        <div class="mc-actions">
          <button
            class="mc-crayon"
            onClick={e => { e.stopPropagation(); setEdite(true); }}
            aria-label="Renommer"
          >
            <svg viewBox="0 0 24 24"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" /></svg>
          </button>
          {!r.fixe && (
            <button
              class="mc-suppr"
              onClick={e => { e.stopPropagation(); supprimerRepas(r.id); }}
              aria-label="Supprimer ce repas"
            >✕</button>
          )}
          <span class="mc-chevron" aria-hidden="true">▾</span>
        </div>
      </div>

      {r.ouvert && (
        <div class="mc-corps">
          {/* Carte vide : le champ d'ajout vient directement sous l'en-tete,
              aucune ligne fictive n'est affichee. */}
          {r.ings.map(ing => (
            <LigneIngredient key={ing.id} repasId={r.id} ing={ing} />
          ))}
          <Recherche repasId={r.id} />
        </div>
      )}

      {/* Enregistrer la composition comme plat reutilisable */}
      {r.ouvert && !vide && (
        <div class="mc-plat">
          {garde ? (
            <div class="mc-plat-ok">{'\u2713'} {t('mc_plat_ok')}</div>
          ) : enrego ? (
            <div class="mc-plat-saisie">
              <input
                class="mc-plat-champ"
                placeholder={t('mc_plat_nom')}
                value={nomPlat}
                onInput={e => setNomPlat(e.currentTarget.value)}
                onKeyDown={e => e.key === 'Enter' && enregistrerCommePlat()}
                autoFocus
              />
              <button class="mc-plat-ok-btn" disabled={!nomPlat.trim()} onClick={enregistrerCommePlat}>
                {t('save')}
              </button>
              <button class="mc-plat-annul" onClick={() => { setEnrego(false); setNomPlat(''); }}>✕</button>
            </div>
          ) : (
            <button class="mc-plat-btn" onClick={() => { setNomPlat(r.nom || ''); setEnrego(true); }}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" /><path d="M17 21v-8H7v8M7 3v5h8" /></svg>
              {t('mc_plat_btn')}
            </button>
          )}
        </div>
      )}

      {/* Bandeau recapitulatif : suit l'arrondi bas de la carte */}
      {r.ouvert && !vide && (
        <div class="mc-bandeau">
          {tot.kcal.toFixed(0)} kcal | {tot.prot.toFixed(1)}P | {tot.carbs.toFixed(1)}C | {tot.lip.toFixed(1)}L
        </div>
      )}
    </div>
  );
}
