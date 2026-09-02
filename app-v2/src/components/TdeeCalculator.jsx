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
 * Repartitions proposees au moment de repartir les calories.
 *
 * Trois usages, trois equilibres. Les lipides descendent quand on
 * cherche la performance et le volume d'entrainement, ils remontent
 * en perte ou l'apport calorique est bas et ou ils portent les
 * hormones. Ce sont des points de depart, tous modifiables a la main
 * juste au-dessus.
 */
const REPARTITIONS = [
  { cle: 'perte',    nom: 'Perte de poids',  prot: 0.35, carbs: 0.35, lip: 0.30 },
  { cle: 'maintien', nom: 'Maintien',        prot: 0.28, carbs: 0.45, lip: 0.27 },
  { cle: 'prise',    nom: 'Prise de masse',  prot: 0.25, carbs: 0.55, lip: 0.20 },
];

/** Largeur d'un champ de pastille, en caracteres, pour qu'il se moule
 *  sur son chiffre au lieu d'occuper une case fixe. */
function larg(v) {
  return Math.max(1, String(v == null ? '' : v).length) + 0.6 + 'ch';
}

/** Grammes correspondant a une repartition, pour un total de calories. */
function grammesDe(kcal, r) {
  return {
    prot: Math.round((kcal * r.prot) / 4),
    carbs: Math.round((kcal * r.carbs) / 4),
    lip: Math.round((kcal * r.lip) / 9),
  };
}

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
  // Macros toutes a zero : « Repartir » est la seule sortie, il ne
  // doit pas dependre du seuil d'ecart.
  const [choixRep, setChoixRep] = useState(false);

  /** Applique une repartition choisie, et cale le rapport dessus. */
  const repartirSelon = (r) => setMan(o => {
    const cible = +o.kcal || 0;
    if (cible <= 0) return o;
    const g = grammesDe(cible, r);
    const nb = g.prot * 4 + g.carbs * 4 + g.lip * 9;
    partRef.current = { prot: g.prot / nb, carbs: g.carbs / nb, lip: g.lip / nb };
    return { kcal: cible, ...g };
  });

  const macroManquante = kcalVise > 0 &&
    [man.prot, man.carbs, man.lip].some(v => (+v || 0) === 0);

  // Les macros suivent les calories. Elles gardent LEURS proportions
  // (celles affichees a l'instant, pas un ratio type) : on ne fait que
  // les mettre a l'echelle. Sans ce geste, la ligne d'ecart constatait
  // un probleme sans rien offrir pour le regler (Raci, 23/08).
  // Trois macros a zero : il n'y a plus de rapport a mettre a
  // l'echelle. Ni la frappe des calories ni « Repartir » ne pouvaient
  // en sortir — l'ecran devenait un cul-de-sac (Raci, 02/09). Cette
  // repartition de secours n'est pas un conseil nutritionnel, juste
  // un point de depart modifiable : 25 % de lipides comme le
  // calculateur, 2 g/kg de proteines ramenes a une part de 25 %, le
  // reste en glucides.
  const REPARTITION_SECOURS = { prot: 0.25, carbs: 0.50, lip: 0.25 };

  const repartir = () => setMan(o => {
    const base = (+o.prot || 0) * 4 + (+o.carbs || 0) * 4 + (+o.lip || 0) * 9;
    const cible = +o.kcal || 0;
    if (cible <= 0) return o;
    // Une macro a zero rend le rapport degenere : mise a l'echelle, la
    // seule qui reste porte toutes les calories (3500 kcal -> 389 g de
    // lipides et rien d'autre). On repart alors du socle.
    const degenere = base <= 0 || [o.prot, o.carbs, o.lip].some(v => (+v || 0) === 0);
    if (degenere) {
      const suite = {
        kcal: cible,
        prot: Math.round((cible * REPARTITION_SECOURS.prot) / 4),
        carbs: Math.round((cible * REPARTITION_SECOURS.carbs) / 4),
        lip: Math.round((cible * REPARTITION_SECOURS.lip) / 9),
      };
      const nb = suite.prot * 4 + suite.carbs * 4 + suite.lip * 9;
      partRef.current = { prot: suite.prot / nb, carbs: suite.carbs / nb, lip: suite.lip / nb };
      return suite;
    }
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
              {(ecartVisible || macroManquante) && (
                <div class="calc-accorder">
                  <button type="button" class="ac-fort" onClick={() => setChoixRep(v => !v)}>
                    Répartir les {kcalVise} kcal
                  </button>
                  {kcalMacros > 0 && <button type="button" onClick={calerCalories}>Calories → {kcalMacros}</button>}
                </div>
              )}

              {/* Repartir sans savoir pour quoi n'a pas de sens : la
                  part de lipides et de glucides depend de l'objectif.
                  On le redemande au moment ou l'on repartit (Raci,
                  02/09), avec le resultat en grammes sous chaque
                  choix — on voit ce qu'on prend. */}
              {choixRep && kcalVise > 0 && (
                <div class="calc-rep">
                  {REPARTITIONS.map(r => {
                    const g = grammesDe(kcalVise, r);
                    return (
                      <button type="button" key={r.cle} class="rep-opt"
                        onClick={() => { repartirSelon(r); setChoixRep(false); }}>
                        <span class="rep-n">{r.nom}</span>
                        <span class="rep-g">{g.prot} P · {g.carbs} G · {g.lip} L</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
        <>
          {/* Le resultat en tete, les entrees en pastilles (maquette A,
              Raci le 02/09). L'ecran ne se lit plus comme un
              formulaire : le chiffre qu'on vient chercher est en haut,
              il bouge a chaque modification, et les valeurs se touchent
              directement au lieu de remplir des cases etiquetees. */}
          <div class="bs-hero">
            <div class="bs-k">{r.kcal} <em>kcal / jour</em></div>
            <div class="bs-s">
              Base {r.bmr} · Dépense {r.tdee} · {(OBJECTIFS.find(o => +o.val === +f.ajustement) || {}).label}
            </div>
            <div class="bs-mm">
              <div class="bs-m"><b>{r.prot}g</b><span>Prot · {partDe(r.prot * 4, r.kcal)}</span></div>
              <div class="bs-m"><b>{r.carbs}g</b><span>Gluc · {partDe(r.carbs * 4, r.kcal)}</span></div>
              <div class="bs-m"><b>{r.lip}g</b><span>Lip · {partDe(r.lip * 9, r.kcal)}</span></div>
            </div>
          </div>

          {alerte && <p class="calc-alerte">{alerte}</p>}

          <div class="bs-pastilles">
            <label class="bs-p bs-p--menu">
              <select value={f.sexe} onChange={e => maj('sexe', e.currentTarget.value)}>
                <option value="h">Homme</option>
                <option value="f">Femme</option>
              </select>
            </label>
            <label class="bs-p">
              <input type="number" value={f.age} style={{ width: larg(f.age) }}
                onInput={e => num('age', e.currentTarget.value)} />
              <i>ans</i>
            </label>
            <label class="bs-p">
              <input type="number" value={f.poids} style={{ width: larg(f.poids) }}
                onInput={e => num('poids', e.currentTarget.value)} />
              <i>kg</i>
            </label>
            <label class="bs-p">
              <input type="number" value={f.taille} style={{ width: larg(f.taille) }}
                onInput={e => num('taille', e.currentTarget.value)} />
              <i>cm</i>
            </label>

            {avance && (
              <>
                <label class="bs-p">
                  <input type="number" value={f.masseGrasse} placeholder="—" style={{ width: larg(f.masseGrasse || '00') }}
                    onInput={e => num('masseGrasse', e.currentTarget.value)} />
                  <i>% gras</i>
                </label>
                <label class="bs-p">
                  <input type="number" value={f.joursEntrainement} style={{ width: larg(f.joursEntrainement) }}
                    onInput={e => num('joursEntrainement', e.currentTarget.value)} />
                  <i>séances / sem.</i>
                </label>
              </>
            )}

            <label class="bs-p bs-p--large bs-p--menu">
              <select value={f.activiteBase} onChange={e => num('activiteBase', e.currentTarget.value)}>
                {NIVEAUX_ACTIVITE.map(n => <option value={n.val}>{n.label}</option>)}
              </select>
            </label>
            <label class="bs-p bs-p--large bs-p--menu">
              <select value={f.ajustement} onChange={e => num('ajustement', e.currentTarget.value)}>
                {OBJECTIFS.map(o => <option value={o.val}>{o.label}</option>)}
              </select>
            </label>
          </div>

          <button class="calc-avance" onClick={() => setAvance(!avance)}>
            {avance ? 'Masquer les options avancées' : 'Afficher les options avancées'}
          </button>
        </>
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
