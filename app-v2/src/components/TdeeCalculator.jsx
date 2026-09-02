import { useState, useRef } from 'preact/hooks';
import { calculerBesoins, NIVEAUX_ACTIVITE, OBJECTIFS } from '../data/tdee.js';
import { setObjectifs, calculBaseFait, poidsCalcul, objectifs, profilBesoins } from '../store/journal.js';
import { estPremium } from './PremiumPage.jsx';
import { ongletActif } from './BottomNav.jsx';
import { createPortal } from 'preact/compat';
import { sexe } from '../store/perso.js';

// Calculateur de besoins. Le resultat se recalcule a chaque frappe (pas de bouton
// "Calculer" : reactif). "Appliquer" pousse le resultat dans les objectifs du jour.
/**
 * Part d'une macro dans les calories du jour, arrondie a l'entier.
 * Les trois parts peuvent totaliser 99 ou 101 : chacune est juste,
 * c'est l'arrondi qui ne tombe pas rond. Mieux vaut trois chiffres
 * exacts qu'un total force a 100.
 */
function partDe(kcalMacro, kcalTotal) {
  if (!kcalTotal) return '';
  return Math.round((kcalMacro / kcalTotal) * 100) + ' %';
}

export function TdeeCalculator({ montre, fermer, retour }) {
  // Le formulaire rouvre sur ce qui a ete saisi la derniere fois. Les
  // valeurs en dur ne servent plus que de point de depart au tout
  // premier passage.
  const [f, setF] = useState(() => ({
    sexe: sexe.value || 'h', age: 25, poids: 75, taille: 175, masseGrasse: '',
    activiteBase: 1.3, joursEntrainement: 4, intensiteEntrainement: 0.03, ajustement: 300,
    ...(profilBesoins.value || {}),
  }));
  const [applique, setApplique] = useState(false);
  // 'calc' : formule Mifflin-St Jeor. 'manuel' : saisie directe des
  // 4 valeurs — reserve Premium, toujours (ajustement fin continu).
  const [mode, setMode] = useState('calc');
  // Options avancees repliees par defaut : masse grasse et jours
  // d'entrainement ne concernent qu'une minorite.
  const [avance, setAvance] = useState(false);
  const [man, setMan] = useState(() => ({ ...objectifs.value }));

  // Les PROPORTIONS de depart, figees a l'ouverture. C'est la
  // correction du 21/08 : le rapport etait relu dans l'etat courant a
  // chaque frappe, donc il se detruisait lui-meme. En tapant « 4000 »,
  // le premier « 4 » ramenait les macros a 0-1-0 ; le « 0 » suivant
  // les mettait a l'echelle de CES valeurs-la, et ainsi de suite. On
  // arrivait a 4000 kcal avec 0 g de proteines et 1000 g de glucides.
  // Fige, le rapport survit a la saisie chiffre par chiffre.
  const partRef = useRef(null);
  if (partRef.current === null) {
    const o = objectifs.value;
    const base = (+o.prot || 0) * 4 + (+o.carbs || 0) * 4 + (+o.lip || 0) * 9;
    partRef.current = base > 0
      ? { prot: (+o.prot || 0) / base, carbs: (+o.carbs || 0) / base, lip: (+o.lip || 0) / base }
      : null;
  }

  const majMan = (cle, val) => setMan(o => {
    const v = val === '' ? '' : Math.max(0, parseFloat(val) || 0);
    // Une macro saisie a la main fait foi : elle redefinit le rapport,
    // sinon la frappe suivante sur les calories l'ecraserait.
    if (cle !== 'kcal') {
      const suite = { ...o, [cle]: v };
      const base = (+suite.prot || 0) * 4 + (+suite.carbs || 0) * 4 + (+suite.lip || 0) * 9;
      if (base > 0) {
        partRef.current = {
          prot: (+suite.prot || 0) / base,
          carbs: (+suite.carbs || 0) / base,
          lip: (+suite.lip || 0) / base,
        };
      }
      return suite;
    }
    // Changer les calories repartit les macros dans les MEMES
    // proportions qu'au depart. Elles sont celles de l'utilisateur,
    // jamais une formule : on ne fait que les mettre a l'echelle.
    if (v === '' || v <= 0 || !partRef.current) return { ...o, kcal: v };
    const r = partRef.current;
    return {
      kcal: v,
      prot: Math.round(r.prot * v),
      carbs: Math.round(r.carbs * v),
      lip: Math.round(r.lip * v),
    };
  });
  const kcalMacros = Math.round((+man.prot || 0) * 4 + (+man.carbs || 0) * 4 + (+man.lip || 0) * 9);
  const kcalVise = +man.kcal || 0;
  const ecart = kcalMacros - kcalVise;
  // 50 kcal : le seuil qui existait deja pour la mention d'ecart. En
  // dessous, c'est l'arrondi des grammes, pas une erreur de saisie.
  const ecartVisible = kcalVise > 0 && Math.abs(ecart) > 50;

  // Les macros suivent les calories. Elles gardent LEURS proportions
  // (celles affichees a l'instant, pas un ratio type) : on ne fait que
  // les mettre a l'echelle. Sans ce geste, la ligne d'ecart constatait
  // un probleme sans rien offrir pour le regler (Raci, 23/08).
  const repartir = () => setMan(o => {
    const base = (+o.prot || 0) * 4 + (+o.carbs || 0) * 4 + (+o.lip || 0) * 9;
    const cible = +o.kcal || 0;
    if (base <= 0 || cible <= 0) return o;
    const f = cible / base;
    const suite = {
      kcal: cible,
      prot: Math.round((+o.prot || 0) * f),
      carbs: Math.round((+o.carbs || 0) * f),
      lip: Math.round((+o.lip || 0) * f),
    };
    const nb = suite.prot * 4 + suite.carbs * 4 + suite.lip * 9;
    if (nb > 0) {
      partRef.current = { prot: suite.prot / nb, carbs: suite.carbs / nb, lip: suite.lip / nb };
    }
    return suite;
  });

  // Le sens inverse : les calories se calent sur les macros. C'est le
  // chemin qui creait l'ecart au depart — une macro corrigee a la main
  // laissait les calories sur leur ancienne valeur.
  const calerCalories = () => setMan(o => ({ ...o, kcal: kcalMacros }));

  const choisirMode = (m) => {
    if (m === 'manuel' && !estPremium.value) {
      fermer();
      ongletActif.value = 'premium';
      return;
    }
    setMode(m);
  };

  // Le sexe remonte au profil : il sert au calcul, mais aussi a la
  // silhouette de Stats. Le choisir ici suffit, sans avoir a le redire
  // ailleurs — il n'etait ecrit nulle part jusqu'au 17/08.
  const maj = (cle, val) => {
    if (cle === 'sexe') sexe.value = val;
    setF(o => ({ ...o, [cle]: val }));
  };
  const num = (cle, val) => maj(cle, val === '' ? '' : parseFloat(val));

  const r = calculerBesoins({
    ...f,
    age: +f.age || 25, poids: +f.poids || 75, taille: +f.taille || 175,
    masseGrasse: f.masseGrasse === '' ? NaN : +f.masseGrasse,
    joursEntrainement: Math.max(0, +f.joursEntrainement || 0),
  });

  // Bornes de simple bon sens, larges a dessein : il ne s'agit pas de
  // juger un corps, seulement d'attraper une frappe qui a derape.
  const partProt = r.kcal ? (r.prot * 4) / r.kcal : 0;
  const alerte =
    (+f.poids < 30 || +f.poids > 250) ? 'Poids inhabituel : vérifie la valeur saisie.'
      : (+f.taille < 120 || +f.taille > 230) ? 'Taille inhabituelle : vérifie la valeur saisie.'
        : (+f.age < 14 || +f.age > 100) ? 'Âge inhabituel : vérifie la valeur saisie.'
          // Seuil a 30 % : le cas reel de Raci (147 kg au lieu de 97)
          // tombait a 34 % et passait sous un seuil de 35. A 97 kg il
          // est a 28 %, donc silence. Un avertissement, jamais un
          // refus : une seche legitime peut monter haut.
          : partProt > 0.30 ? `Les protéines font ${Math.round(partProt * 100)} % de tes calories, c'est beaucoup. Vérifie ton poids.`
            : null;

  // Un objectif calorique sans aucune macro n'est pas un objectif :
  // les barres du Journal n'ont plus rien a mesurer.
  const macrosVides = mode === 'manuel' && kcalVise > 0 && kcalMacros === 0;

  const appliquer = () => {
    if (macrosVides) return;
    if (mode === 'manuel') {
      setObjectifs({ kcal: +man.kcal || 0, prot: +man.prot || 0, carbs: +man.carbs || 0, lip: +man.lip || 0 });
      // Pas de calculBaseFait ni de poidsCalcul : la saisie manuelle
      // n'est ni le calcul offert, ni une base pour le rappel de recalcul.
    } else {
      setObjectifs({ kcal: r.kcal, prot: r.prot, carbs: r.carbs, lip: r.lip });
      calculBaseFait.value = true;   // le calcul offert est consomme
      poidsCalcul.value = +f.poids || null;
      profilBesoins.value = { ...f };   // pour rouvrir sur ces valeurs
    }
    setApplique(true);
    setTimeout(() => { setApplique(false); fermer(); }, 1100);
  };

  return createPortal(
    <>
      <div class={`voile ${montre ? 'montre' : ''}`} onClick={fermer} />
      <div class={`modale modale-calc ${montre ? 'montre' : ''}`}>
        {/* La feuille occupe quasi tout l'ecran : le voile n'est plus une
            sortie atteignable, il faut une sortie explicite.
            Ouvert depuis une page, on annonce OU l'on retourne : une
            croix ne dit pas d'ou l'on vient, et le calculateur peut
            s'ouvrir depuis le Journal comme depuis Mon programme. */}
        {retour ? (
          <button class="calc-retour" onClick={fermer}>← {retour}</button>
        ) : (
          <button class="calc-fermer" onClick={fermer} aria-label="Fermer">✕</button>
        )}
        <h3>Mes besoins</h3>

        <div class="calc-modes" role="group">
          <button class={mode === 'calc' ? 'active' : ''} onClick={() => choisirMode('calc')}>Calculé</button>
          <button class={mode === 'manuel' ? 'active' : ''} onClick={() => choisirMode('manuel')}>
            Manuel{!estPremium.value && <span class="calc-pro">PRO</span>}
          </button>
        </div>

        {mode === 'manuel' ? (
          <div class="calc-grille">
            <label class="pleine">Calories (kcal)
              <input type="number" value={man.kcal} onInput={e => majMan('kcal', e.currentTarget.value)} />
            </label>
            <label>Protéines (g)
              <input type="number" value={man.prot} onInput={e => majMan('prot', e.currentTarget.value)} />
            </label>
            <label>Glucides (g)
              <input type="number" value={man.carbs} onInput={e => majMan('carbs', e.currentTarget.value)} />
            </label>
            <label>Lipides (g)
              <input type="number" value={man.lip} onInput={e => majMan('lip', e.currentTarget.value)} />
            </label>
            <div class="calc-note pleine">
              P×4 + G×4 + L×9 = <b>{kcalMacros} kcal</b>
              {/* L'ecart porte son chiffre et son sens : « ecart avec tes
                  calories » disait qu'il y avait un probleme sans dire
                  lequel, ni de combien, ni comment en sortir. */}
              {ecartVisible && (ecart < 0
                ? <> — il manque <b>{-ecart} kcal</b> pour atteindre {kcalVise}.</>
                : <> — <b>{ecart} kcal</b> de trop par rapport à {kcalVise}.</>)}
              {ecartVisible && (
                <div class="calc-accorder">
                  <button type="button" onClick={repartir}>Répartir les {kcalVise} kcal</button>
                  <button type="button" onClick={calerCalories}>Calories → {kcalMacros}</button>
                </div>
              )}
            </div>
          </div>
        ) : (
        <div class="calc-grille">
          <label>Sexe
            <select value={f.sexe} onChange={e => maj('sexe', e.currentTarget.value)}>
              <option value="h">Homme</option>
              <option value="f">Femme</option>
            </select>
          </label>
          <label>Âge
            <input type="number" value={f.age} onInput={e => num('age', e.currentTarget.value)} />
          </label>
          <label>Poids (kg)
            <input type="number" value={f.poids} onInput={e => num('poids', e.currentTarget.value)} />
          </label>
          <label>Taille (cm)
            <input type="number" value={f.taille} onInput={e => num('taille', e.currentTarget.value)} />
          </label>
          {/* Deux champs sur six ne servent qu'a une minorite : la
              plupart des gens ignorent leur masse grasse, et le niveau
              d'activite porte deja l'essentiel de l'estimation. Ils
              restent la, replies, avec leur valeur active (Raci,
              26/08). Les replier ne les neutralise pas : le calcul
              continue de les lire. */}
          {avance && (
            <>
              <label>% Masse grasse <span class="opt">(optionnel)</span>
                <input type="number" value={f.masseGrasse} placeholder="—" onInput={e => num('masseGrasse', e.currentTarget.value)} />
              </label>
              <label>Jours d'entraînement / sem.
                <input type="number" value={f.joursEntrainement} onInput={e => num('joursEntrainement', e.currentTarget.value)} />
              </label>
            </>
          )}
          <label class="pleine">Activité quotidienne
            <select value={f.activiteBase} onChange={e => num('activiteBase', e.currentTarget.value)}>
              {NIVEAUX_ACTIVITE.map(n => <option value={n.val}>{n.label}</option>)}
            </select>
          </label>
          <label class="pleine">Objectif
            <select value={f.ajustement} onChange={e => num('ajustement', e.currentTarget.value)}>
              {OBJECTIFS.map(o => <option value={o.val}>{o.label}</option>)}
            </select>
          </label>

          <button class="calc-avance pleine" onClick={() => setAvance(!avance)}>
            {avance ? 'Masquer les options avancées' : 'Afficher les options avancées'}
          </button>
        </div>
        )}

        {/* Une saisie aberrante produit une repartition aberrante sans
            que rien ne le signale : 147 kg au lieu de 97 donnaient
            324 g de proteines, soit 37 % des calories, et personne ne
            voyait le doigt qui avait glisse (Raci, 02/09). */}
        {mode === 'calc' && alerte && <p class="calc-alerte">{alerte}</p>}

        {mode === 'calc' && (
        <div class="calc-res">
          <div class="calc-res-ligne"><span>Métabolisme de base</span><span>{r.bmr} kcal</span></div>
          <div class="calc-res-ligne"><span>Dépense totale (TDEE)</span><span>{r.tdee} kcal</span></div>
          <div class="calc-res-ligne cible">
            <span>Objectif</span>
            <strong>{r.kcal} <em>kcal</em></strong>
          </div>
        </div>
        )}

        {mode === 'calc' && (
        <div class="calc-macros">
          {/* Le pourcentage dit ce que les grammes ne disent pas : la
              part de l'assiette. Calcule sur les calories reelles de
              chaque macro (4 / 4 / 9), pas sur un ratio theorique. */}
          <div class="cm"><div class="cm-v">{r.prot}g</div><div class="cm-l">Protéines <em>{partDe(r.prot * 4, r.kcal)}</em></div></div>
          <div class="cm"><div class="cm-v">{r.carbs}g</div><div class="cm-l">Glucides <em>{partDe(r.carbs * 4, r.kcal)}</em></div></div>
          <div class="cm"><div class="cm-v">{r.lip}g</div><div class="cm-l">Lipides <em>{partDe(r.lip * 9, r.kcal)}</em></div></div>
        </div>
        )}

        {/* Vider les trois champs et appliquer ecrivait 0 g partout :
            le Journal affichait « 218g / 0g » et plus aucune barre, sans
            que rien n'ait prevenu (Raci, 02/09). Un objectif calorique
            sans macros n'est pas un objectif. */}
        {mode === 'manuel' && macrosVides && (
          <p class="calc-alerte">Renseigne au moins une macro : un objectif sans protéines, glucides ni lipides ne veut rien dire.</p>
        )}

        <div class="calc-barre">
          <button class="calc-appliquer" onClick={appliquer} disabled={macrosVides}>
            {applique ? '✓ Appliqué !' : 'Appliquer comme objectif'}
          </button>
        </div>
      </div>
    </>
  , document.body);
}
