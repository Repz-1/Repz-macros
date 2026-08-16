#!/usr/bin/env node
// ============================================================
// AUDIT BELFIT — verrous permanents.
//
// Regle de travail : chaque bug trouve devient une regle ICI avant
// d'etre considere comme corrige. L'audit lit les fichiers, il ne
// lance pas de navigateur : il attrape les regressions d'ecriture
// (couleur hors palette, declaration ecrasee, doublon) avant qu'on
// ait besoin d'une capture d'ecran pour s'en apercevoir.
//
// Usage : node tools/audit.mjs        (depuis la racine du depot)
// Sortie : 0 si tout passe, 1 s'il reste un ecart.
// ============================================================
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const lire = (p) => (existsSync(resolve(RACINE, p)) ? readFileSync(resolve(RACINE, p), 'utf8') : null);

const ecarts = [];
const ok = [];
const signaux = [];   // a regarder, ne fait pas echouer l'audit
const faute = (regle, detail) => ecarts.push({ regle, detail });
const passe = (regle) => ok.push(regle);
const signale = (regle, detail) => signaux.push({ regle, detail });

// Les commentaires citent souvent la couleur qu'ils viennent de
// retirer : les lire ferait echouer R1 sur du texte explicatif.
const sansCommentaires = (css) => css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));

// ------------------------------------------------------------
// PALETTE BELFIT — source de verite du logo, plus les neutres et
// les accents valides par Raci. Toute autre teinte dans une feuille
// de style de page est un ecart jusqu'a preuve du contraire.
// ------------------------------------------------------------
const PALETTE = new Set([
  // logo
  '#151515', '#F8F2E8', '#FAC408', '#F86A0C', '#D71016',
  // onglets (styles.css)
  '#181818', '#191919', '#DFA004', '#DE2F14', '#3D7E5C', '#B07400',
  // texte / matiere
  '#16130F', '#6B655D', '#8A8279', '#A9A29A', '#FAF8F4', '#F4F3F0',
  '#F8CF01', '#B34700', '#F5A800', '#E4610B', '#1D1D1D', '#2E2A20',
  '#E3DED4', '#9A938A', '#4A4A4A', '#FFFFFF', '#FFF', '#000',
]);

// Teintes tolerees hors palette, avec leur justification ecrite.
// Ne rien ajouter ici sans une raison qui tienne en une ligne.
const DEROGATIONS = new Map([
  ['#EF4444', 'palette des groupes musculaires (pecs) — Stats.jsx'],
  ['#F97316', 'palette des groupes musculaires (dos) — Stats.jsx'],
  ['#F7B500', 'palette des groupes musculaires (epaules) — Stats.jsx'],
  ['#10B981', 'palette des groupes musculaires (biceps) — Stats.jsx'],
  ['#06B6D4', 'palette des groupes musculaires (triceps) — Stats.jsx'],
  ['#3B82F6', 'palette des groupes musculaires (jambes) — Stats.jsx'],
  ['#8B5CF6', 'palette des groupes musculaires (abdos) — Stats.jsx'],
  ['#EC4899', 'palette des groupes musculaires (cardio) — Stats.jsx'],
  ['#D6D3CB', 'palette des groupes musculaires (repos) — Stats.jsx'],
  ['#F5F3FF', 'fond de pastille de rang, derive du violet abdos'],
  ['#DDD6FE', 'bordure de pastille de rang, derive du violet abdos'],
  ['#6D28D9', 'texte de pastille de rang, derive du violet abdos'],
  ['#E9DCC0', 'barre creuse — journee non enregistree'],
  ['#D8C79E', 'barre creuse — journee non enregistree'],
  ['#FEF2F2', 'note d\'alerte'], ['#FECACA', 'note d\'alerte'],
  ['#B91C1C', 'note d\'alerte'], ['#DC2626', 'note d\'alerte'],
  ['#FFF9E8', 'note de repartition'], ['#F3D98A', 'note de repartition'],
  ['#FFF6EC', 'etat presse'], ['#FBEFC7', 'etat presse'],
  ['#FFF4CC', 'onglet de repartition actif'],
  ['#3A414D', 'courbe de poids — gris ardoise'], ['#1E232D', 'courbe de poids — gris ardoise'],
  ['#7E8794', 'rampe de score — ardoise bas de rampe'],
  ['#3F9E6B', 'rampe de score — vert haut de rampe (decision Raci en attente)'],
  ['#F5F3EE', 'fond de bouton de navigation dans la modale muscles'],
  ['#F1F2F5', 'piste de barre de repartition'],
  ['#E6E8EC', 'bordure d\'onglet de repartition'],
  ['#F4F5F7', 'fond d\'icone d\'etat vide'],
  ['#4B5563', 'libelle de repartition'], ['#475569', 'libelle de modale'],
  ['#CBD5E1', 'bordure de champ de modale'], ['#E2E8F0', 'bouton annuler de modale'],
  ['#F1F5F9', 'bouton effacer de modale'], ['#1A1A1A', 'bouton enregistrer de modale'],
  ['#E9EDF2', 'filet de barre de navigation'], ['#6F6A61', 'libelle de barre de navigation'],
  ['#8A8580', 'texte secondaire de modale'], ['#888', 'chevron de select'],
  ['#312E81', 'barres de charge — indigo profond, choix Raci 10/08 : distingue la charge soulevee des calories'],
  ['#4F46E5', 'barres de charge — indigo profond, choix Raci 10/08'],
  ['#736C63', 'libelle secondaire — 4.88:1 sur creme, remplace #8A8279 mesure a 3.57:1'],
  ['#FFFDF5', "degrade de la carte d'invitation Premium"],
  ['#F3E2A8', 'bordure du bouton « modifier les muscles »'],
  ['#059669', 'REGLE MORTE .chart-bar.weight — voir R7'],
  ['#34D399', 'REGLE MORTE .chart-bar.weight — voir R7'],
]);

// ------------------------------------------------------------
// R1 — Aucune couleur hors palette dans stats.scoped.css.
// Trouve le 9/08 : le bleu #2563EB/#60A5FA des barres « Progression
// par exercice » n'appartenait a aucune palette BELFIT.
// ------------------------------------------------------------
const CSS_STATS = 'app-v2/src/legacy/stats.scoped.css';
{
  const s = lire(CSS_STATS);
  if (!s) faute('R1 palette Stats', `${CSS_STATS} introuvable`);
  else {
    const vues = new Map();
    for (const m of sansCommentaires(s).matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
      const h = m[0].toUpperCase();
      if (PALETTE.has(h) || DEROGATIONS.has(h)) continue;
      const ligne = s.slice(0, m.index).split('\n').length;
      if (!vues.has(h)) vues.set(h, ligne);
    }
    if (vues.size) {
      for (const [h, l] of vues) faute('R1 palette Stats', `${h} ligne ${l} — hors palette et sans derogation`);
    } else passe('R1 palette Stats');
  }
}

// ------------------------------------------------------------
// R2 — Declaration ecrasee plus bas dans la meme feuille.
// Trouve le 9/08 : `.ce-btn{border:1px solid ...}` (ligne 133) etait
// annule par `.ce-btn{border:none}` (ligne 282). Le commit v296
// annoncait un bouton borde ; a l'ecran il rendait `0px none`.
// La derniere declaration gagne : on verifie ce que voit l'ecran.
// ------------------------------------------------------------
const derniereValeur = (css, selecteur, propriete) => {
  let val = null, ligne = null;
  const re = new RegExp(`${selecteur.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*(?:,[^{]*)?\\{([^}]*)\\}`, 'g');
  for (const m of css.matchAll(re)) {
    const p = new RegExp(`(?:^|;)\\s*${propriete}\\s*:\\s*([^;]+)`, 'i');
    const d = m[1].match(p);
    if (d) { val = d[1].trim(); ligne = css.slice(0, m.index).split('\n').length; }
  }
  return { val, ligne };
};
{
  const s = lire(CSS_STATS);
  if (s) {
    const b = derniereValeur(s, '.pg-stats .ce-btn', 'border');
    if (!b.val || /^none\b|^0(px)?\s+none/.test(b.val)) {
      faute('R2 bordure .ce-btn', `derniere valeur = ${b.val || 'absente'} (ligne ${b.ligne}) — le bouton rend sans contour`);
    } else passe('R2 bordure .ce-btn');

    // R3 — Les barres de charge ne doivent PAS partager la couleur des
    // barres de calories. Trouve le 10/08 : passees en orange « pour
    // unifier », les deux graphiques devenaient indistinguables l'un
    // au-dessus de l'autre. Attendu : l'indigo #312E81 -> #4F46E5.
    const c = derniereValeur(s, '.pg-stats .chart-bar.charge', 'background');
    const k = derniereValeur(s, '.pg-stats .chart-bar.kcalbar', 'background');
    const net = (v) => (v || '').toLowerCase().replace(/\s|!important/g, '');
    if (!c.val || !/#312E81/i.test(c.val)) {
      faute('R3 barres de charge', `derniere valeur = ${c.val || 'absente'} (ligne ${c.ligne}) — attendu le degrade #312E81 -> #4F46E5`);
    } else if (k.val && net(c.val) === net(k.val)) {
      faute('R3 barres de charge', 'charges et calories partagent le meme degrade — les deux graphiques deviennent indistinguables');
    } else passe('R3 barres de charge');
  }
}

// ------------------------------------------------------------
// R4 — Boites de chiffre : un seul traitement.
// Trouve le 9/08 : .exo-pr-box (jaune) et .stat-box (creme) jouaient
// le meme role — un chiffre et son libelle — avec deux matieres.
// ------------------------------------------------------------
{
  const s = lire(CSS_STATS);
  if (s) {
    const a = derniereValeur(s, '.pg-stats .exo-pr-box', 'background');
    const b = derniereValeur(s, '.pg-stats .stat-box', 'background');
    const net = (v) => (v || '').toLowerCase().replace(/\s/g, '');
    if (net(a.val) !== net(b.val)) {
      faute('R4 boites de chiffre', `.exo-pr-box = ${a.val} / .stat-box = ${b.val} — meme role, deux matieres`);
    } else passe('R4 boites de chiffre');
  }
}

// ------------------------------------------------------------
// R5 — Un seul chemin pour ouvrir la pesee.
// Trouve le 9/08 : en etat vide, la carte poids affichait DEUX
// boutons ouvrant la meme modale, l'un sous l'autre.
// (Regle informative tant que Raci n'a pas tranche : elle compte
// les appels a setModalePoids dans la carte poids.)
// ------------------------------------------------------------
{
  const s = lire('app-v2/src/components/Stats.jsx');
  if (s) {
    const n = (s.match(/setModalePoids\(true\)/g) || []).length;
    if (n > 1) faute('R5 pesee — chemin unique', `${n} boutons ouvrent la modale de pesee (attendu 1) — doublon en etat vide`);
    else passe('R5 pesee — chemin unique');
  }
}

// ------------------------------------------------------------
// R6 — VERSION_APP et caches de service worker en phase.
// Convention MESUREE sur les 8 derniers commits (9/08) :
//   app-v2/src/version.js : VERSION_APP = N
//   sw.js (racine)        : belfit-vN
//   app-v2/public/sw.js   : belfit-v2-(N - 232)
// Les deux compteurs avancent ensemble, decales d'une constante.
// ------------------------------------------------------------
const DECALAGE_SW_V2 = 232;
{
  const v = lire('app-v2/src/version.js');
  const swR = lire('sw.js');
  const swV2 = lire('app-v2/public/sw.js');
  const nv = v && v.match(/VERSION_APP\s*=\s*(\d+)/);
  const nr = swR && swR.match(/belfit-v(\d+)['"]/);
  const n2 = swV2 && swV2.match(/belfit-v2-(\d+)['"]/);
  if (!nv || !nr || !n2) faute('R6 version/cache', 'VERSION_APP ou un cache SW illisible');
  else {
    const V = +nv[1];
    const soucis = [];
    if (+nr[1] !== V) soucis.push(`sw.js racine = belfit-v${nr[1]}, attendu belfit-v${V}`);
    if (+n2[1] !== V - DECALAGE_SW_V2) soucis.push(`app-v2 sw.js = belfit-v2-${n2[1]}, attendu belfit-v2-${V - DECALAGE_SW_V2}`);
    if (soucis.length) faute('R6 version/cache', soucis.join(' ; '));
    else passe(`R6 version/cache (v${V})`);
  }
}

// ------------------------------------------------------------
// R9 — Un aliment ne peut pas etre encode deux fois dans un repas.
// Trouve le 10/08 : Avoine encodee a 100 g, un appui sur le meme
// aliment dans la liste de resultats ajoutait une SECONDE ligne de
// 100 g. Le repas affichait alors 760 kcal pour 380 reellement
// manges — la journee comptait faux, ce n'etait pas qu'une liste
// qui s'allonge. La liste de resultats recouvre « DANS CE REPAS » :
// impossible de voir que l'aliment est deja la avant d'appuyer.
// ------------------------------------------------------------
{
  const jsx = lire('app-v2/src/components/MealCard.jsx');
  if (!jsx) faute('R9 doublon d\'aliment', 'MealCard.jsx introuvable');
  else {
    const soucis = [];
    // choisir() doit consulter les ingredients deja presents avant
    // d'appeler ajouterIngredient, et rendre la main si l'aliment
    // y figure deja.
    const m = jsx.match(/const choisir = \(nom\) => \{[\s\S]*?\n  \};/);
    if (!m) soucis.push('choisir() introuvable — la regle ne sait plus quoi verifier');
    else {
      const corps = m[0];
      const iGarde = corps.search(/dejaLa[\s\S]*?return;/);
      const iAjout = corps.indexOf('ajouterIngredient');
      if (iGarde === -1) soucis.push('choisir() n\'a pas de garde sur les aliments deja presents');
      else if (iAjout !== -1 && iAjout < iGarde) soucis.push('choisir() ajoute avant de verifier');
    }
    // Volontairement PAS de marque visible dans la liste : « appuyer
    // puis ajuster » est la regle pour tous les aliments, la signaler
    // sur un seul n'apprend rien (retiree le 10/08 a la demande de
    // Raci). La regle ne verifie donc que le comportement.
    if (soucis.length) faute('R9 doublon d\'aliment', soucis.join(' ; '));
    else passe('R9 doublon d\'aliment');
  }
}

// ------------------------------------------------------------
// R11 — La liste d'aliments courants se remplit toute seule.
// Decision de Raci le 10/08 : l'etoile a cocher est retiree. Elle
// etait collee au nom qu'on tape pour choisir l'aliment, se
// declenchait sans qu'on le veuille — c'est ainsi que l'avoine de
// Raci est devenue favorite sans decision — et rien ne disait ce
// qu'elle faisait. Le comptage des encodages la remplace : l'app
// sait deja ce qu'on mange tous les jours.
// ------------------------------------------------------------
{
  const jsx = lire('app-v2/src/components/MealCard.jsx');
  const store = lire('app-v2/src/store/perso.js');
  const css = lire('app-v2/src/styles/journal-socle.css');
  if (jsx && store && css) {
    const soucis = [];
    // L'etoile est revenue le 10/08 a la demande de Raci — les deux
    // listes coexistent. Ce qui est interdit, c'est son SILENCE :
    // une bascule doit s'annoncer et se defaire d'un geste.
    if (/basculerFavori/.test(jsx)) {
      if (!/mc-avis-fav/.test(jsx)) soucis.push('la bascule de favori n\'affiche aucun retour');
      if (!/maf-annuler/.test(jsx)) soucis.push('la bascule de favori ne peut pas etre annulee');
      if (!/border-left/.test((css.match(/\.mc-res-fav \{[^}]*\}|\.mc-resultats \.mc-res-fav \{[^}]*\}/) || [''])[0])) {
        soucis.push('l\'etoile n\'est plus separee de la zone de choix — c\'est ainsi qu\'on la touchait par megarde');
      }
    }
    // Les deux listes doivent rester distinctes et titrees, sinon on
    // ne sait plus laquelle on regarde ni ce que l'etoile fabrique.
    if (!/fav_titre/.test(jsx) || !/mc_courants/.test(jsx)) {
      soucis.push('les listes favoris / courants ne sont plus titrees separement');
    }
    // Le comptage doit etre appele la ou l'aliment entre vraiment
    // dans un repas, sinon la liste ne se remplit jamais.
    if (!/noterUsage\(nom\)/.test(jsx)) soucis.push('choisir() ne compte pas l\'encodage — la liste des courants resterait vide');
    if (!/export function alimentsCourants/.test(store)) soucis.push('alimentsCourants() absent du store');
    // La reprise des anciennes etoiles ne doit pas sauter : sans
    // elle, des semaines d'habitudes disparaissent d'un coup.
    if (!/export function estFavori/.test(store)) soucis.push('estFavori() absent du store');
    if (soucis.length) faute('R11 aliments courants', soucis.join(' ; '));
    else passe('R11 aliments courants');
  }
}

// ------------------------------------------------------------
// R15 — Acces invite : l'audit reste ROUGE tant qu'il est actif.
// Raci le 10/08 a demande de contourner momentanement l'ecran de
// connexion. Cette regle n'empeche rien : elle refuse simplement de
// laisser l'audit passer au vert pendant ce temps. Un contournement
// d'authentification en ligne ne doit pas pouvoir se faire oublier
// entre deux sessions, ni partir en production par inadvertance.
// Elle passera au vert d'elle-meme quand ACCES_LIBRE reviendra a
// false — le « nouvel ordre ».
// ------------------------------------------------------------
{
  const drapeau = lire('app-v2/src/acces-invite.js');
  const login = lire('app-v2/src/components/LoginScreen.jsx');
  if (drapeau && /ACCES_INVITE\s*=\s*true/.test(drapeau)) {
    faute('R15 acces invite ACTIF',
      'n\'importe qui entre sans compte sur belfit.be — remettre ACCES_INVITE a false pour refermer');
  } else if (drapeau) {
    // Referme : l'entree ne doit pas subsister hors du drapeau, et
    // l'ecran de connexion doit rester le seul chemin.
    const restes = [];
    if (login && /entrerEnInvite/.test(login) && !/ACCES_INVITE/.test(login)) {
      restes.push('LoginScreen appelle encore entrerEnInvite() hors du drapeau');
    }
    if (restes.length) faute('R15 acces invite', restes.join(' ; '));
    else passe('R15 acces invite (referme)');
  }
}

// ------------------------------------------------------------
// R14 — Mecanique du sens de la reglette (composant reserve).
// Raci le 10/08 : grand vers le haut, petit vers le bas — le sens
// d'une toise. La conversion position <-> valeur passe par un seul
// couple de fonctions (posDe / valDe) pour qu'il n'existe qu'un
// endroit ou le sens puisse se contredire : un calcul en dur qui
// reapparaitrait ailleurs ferait diverger l'affichage du reperage.
// ------------------------------------------------------------
{
  // La reglette a DEMENAGE le 12/08 dans son propre fichier : elle a
  // quitte le questionnaire d'entrainement, ramene a quatre
  // questions, et attend le questionnaire de programme alimentaire.
  // La regle a sonne a ce moment-la — signal juste, elle cherchait au
  // mauvais endroit. Elle lit desormais le composant lui-meme.
  const jsx = lire('app-v2/src/components/Reglette.jsx');
  if (jsx) {
    const soucis = [];
    // Le sens ne vit plus dans une table de questions mais dans la
    // prop `inverse`, que l'ecran appelant passera. Ce qu'on verrouille
    // ici, c'est que la MECANIQUE du sens inverse existe toujours.
    if (!/inverse \? max - v : v - min/.test(jsx)) soucis.push('la conversion « grand vers le haut » a disparu');
    if (!/const posDe =/.test(jsx) || !/const valDe =/.test(jsx)) soucis.push('les convertisseurs posDe/valDe ont disparu');
    // Aucun calcul de position en dur ne doit subsister a cote d'eux.
    const dur = jsx.match(/\((?:valeur|v|k) - min\) \* PX/g);
    if (dur) soucis.push(`${dur.length} calcul(s) de position en dur — ils ignorent le sens inverse`);
    if (soucis.length) faute('R14 sens de la reglette', soucis.join(' ; '));
    else passe('R14 sens de la reglette');
  }
}

// ------------------------------------------------------------
// R25 — Le questionnaire tient en quatre questions.
// Wording et choix dictes par Raci le 12/08. Il y en avait neuf :
// taille, poids, age, lieu et duree ont ete retires apres
// verification qu'aucune ne participait au choix du programme ni aux
// besoins caloriques — elles n'alimentaient que des paragraphes de
// conseil. Le lieu ne servait qu'a precocher le materiel, que la
// question 4 demande maintenant directement.
// ------------------------------------------------------------
{
  const quiz = lire('app-v2/src/components/Questionnaire.jsx');
  if (quiz) {
    const soucis = [];
    const m = quiz.match(/const ETAPES = \[([^\]]*)\]/);
    if (!m) soucis.push('ETAPES introuvable');
    else {
      const etapes = m[1].split(',').map(x => x.trim().replace(/'/g, '')).filter(Boolean);
      if (etapes.length !== 4) soucis.push(`${etapes.length} etapes au lieu de 4 : ${etapes.join(', ')}`);
      for (const attendue of ['objectif', 'niveau', 'frequence', 'materiel']) {
        if (!etapes.includes(attendue)) soucis.push(`etape « ${attendue} » absente`);
      }
    }
    // « Force / Performance » n'a pas de programmes a lui : sans ce
    // renvoi, l'objectif ne recommanderait RIEN et l'ecran final
    // resterait vide sans qu'aucune erreur ne se produise.
    if (!/if \(objectif === 'force'\) objectif = 'masse'/.test(quiz)) {
      soucis.push("l'objectif « force » ne renvoie plus vers un programme existant");
    }
    // Le materiel est passe d'un tableau a un choix unique : le reste
    // du code lit toujours une liste, via cette table.
    if (!/MATERIEL_PAR_CHOIX/.test(quiz)) soucis.push('la table materiel -> equipements a disparu');
    // Le questionnaire ne doit plus porter la moindre trace des cinq
    // questions retirees : une question morte dans QUESTIONS ne se
    // voit pas, mais elle finit par etre reactivee ou recopiee.
    for (const morte of ['REGLETTES', 'EQUIP_PAR_LIEU', 'dureeIdeale']) {
      if (new RegExp(`\\b${morte}\\b`).test(quiz)) soucis.push(`${morte} subsiste dans le questionnaire`);
    }
    // La reglette est CONSERVEE, dans son propre fichier : Raci la
    // destine au questionnaire de programme alimentaire pour coach.
    const rg = lire('app-v2/src/components/Reglette.jsx');
    if (!rg || !/export function Reglette/.test(rg)) {
      soucis.push('le composant Reglette a disparu — il est reserve au futur questionnaire nutrition');
    }
    if (soucis.length) faute('R25 questionnaire en 4 questions', soucis.join(' ; '));
    else passe('R25 questionnaire en 4 questions');
  }
}

// ------------------------------------------------------------
// R24 — Deux entrees pour poser une seance au calendrier.
// Raci le 10/08 : « l'application ne cree pas un programme sur
// plusieurs jours ». Verification faite, le programme en couvrait
// bien plusieurs — le defaut etait le CHEMIN : le questionnaire
// s'arretait sur une fiche a lire, et l'adoption vivait deux ecrans
// plus loin derriere « Choisir ce programme ». Deux entrees
// desormais : le questionnaire mene aux jours, et une date du
// calendrier permet d'y poser une seance.
// ------------------------------------------------------------
{
  const quiz = lire('app-v2/src/components/Questionnaire.jsx');
  const entr = lire('app-v2/src/components/Entrainer.jsx');
  const store = lire('app-v2/src/store/programme.js');
  if (quiz && entr && store) {
    const soucis = [];
    if (!/allerVers\('planifier', \{ prog: progId \}\)/.test(quiz)) {
      soucis.push('le questionnaire ne mene plus au choix des jours');
    }
    if (!/planifierSeance\(iso, sa\)/.test(entr)) soucis.push('on ne peut plus poser une seance depuis une date');
    // Une date posee a la main doit primer sur la regle du programme.
    if (!/const pose = planifs\.value\[iso\]/.test(store)) {
      soucis.push('une seance posee a la main ne prime plus sur le programme');
    }
    if (soucis.length) faute('R24 poser une seance', soucis.join(' ; '));
    else passe('R24 poser une seance');
  }
}

// ------------------------------------------------------------
// R23 — Onglet d'ouverture par l'adresse.
// Raci le 10/08 : un lien qui ouvre directement S'entrainer, sans
// passer par le Journal puis un appui. ?onglet=entrainer.
// Une valeur inconnue doit etre IGNOREE : sans la liste blanche,
// ?onglet=nimportequoi laisserait l'application sur un onglet
// inexistant, rail hors ecran et barre sans selection.
// ------------------------------------------------------------
{
  const nav = lire('app-v2/src/components/BottomNav.jsx');
  if (nav) {
    const soucis = [];
    if (!/get\('onglet'\)/.test(nav)) soucis.push('le parametre ?onglet n\'est plus lu');
    if (!/\['journal', 'entrainer', 'stats', 'premium'\]\.includes/.test(nav)) {
      soucis.push('la liste blanche des onglets a disparu — une valeur inconnue passerait');
    }
    if (soucis.length) faute('R23 onglet par l\'adresse', soucis.join(' ; '));
    else passe('R23 onglet par l\'adresse');
  }
}

// ------------------------------------------------------------
// R22 — La fenetre d'un jour depend du type de jour.
// Raci le 10/08 : « on est le 12, et quand je clique jusqu'au 16
// c'est la page du 12 qui s'ouvre ». Mesure alors : seul le titre
// changeait, le corps etait identique d'un jour a l'autre de la meme
// semaine — silhouette hebdomadaire et liste des muscles. Trois cas
// desormais : passe (ce qui a ete fait), aujourd'hui (la seance
// prevue, avec de quoi la demarrer), a venir (ce qui est prevu).
// ------------------------------------------------------------
{
  const jsx = lire('app-v2/src/components/Entrainer.jsx');
  if (jsx) {
    const soucis = [];
    if (!/const type = iso < isoAuj/.test(jsx)) soucis.push('la fenetre ne distingue plus passe, aujourd\'hui et a venir');
    if (!/seancesDuJour\(iso\)/.test(jsx)) soucis.push('un jour passe n\'affiche plus ce qui a ete fait');
    if (!/ml-prevu-b/.test(jsx)) soucis.push('aucun moyen de demarrer la seance prevue depuis un jour');
    // Le marquage manuel doit rester : c'est lui qui colore le
    // calendrier quand on s'entraine hors de l'application.
    if (!/basculerMuscle\(iso, g\.k\)/.test(jsx)) soucis.push('le marquage manuel des muscles a disparu');
    if (soucis.length) faute('R22 fenetre d\'un jour', soucis.join(' ; '));
    else passe('R22 fenetre d\'un jour');
  }
}

// ------------------------------------------------------------
// R21 — Les seances de programme designent leurs exercices par NOM.
// Raci le 10/08 : « dans dos il y a du triceps, jambes, tout est
// mixe ». Cause : sessionExos.js pointait par POSITION dans les
// tableaux de exercices.js. A l'ecriture, dos[0..3] valaient
// Tractions, Rowing barre, Tirage vertical, Rowing haltere ; la base
// a ensuite ete remplacee par 369 exercices tries alphabetiquement et
// les memes positions ont donne « Extension Triceps Incline »,
// « Flexion Buste Avant »… Les 86 seances servaient des exercices
// arbitraires sans qu'aucune erreur ne se produise.
// Un nom ne se decale pas quand la liste est retriee.
// ------------------------------------------------------------
{
  const data = lire('app-v2/src/data/sessionExos.js');
  const detail = lire('app-v2/src/components/SeanceDetail.jsx');
  if (data && detail) {
    const soucis = [];
    // Une reference « groupe:3 » est une position : le format qui a
    // pourri. Toute reference doit porter un nom.
    const positions = [...data.matchAll(/"[a-z]+:(\d+)"/g)];
    if (positions.length) soucis.push(`${positions.length} reference(s) encore par position`);
    if (!/parseInt\(rang, 10\)/.test(detail) === false) soucis.push('SeanceDetail resout encore par position');
    if (soucis.length) faute('R21 exercices par nom', soucis.join(' ; '));
    else passe('R21 exercices par nom');
  }
}

// ------------------------------------------------------------
// R20 — Silhouette double et jour de repos.
// Raci le 10/08 : « fais un bonhomme plus complet, on voit a peine le
// dos, inclus les trapezes » et « pour le jour de repos trouve autre
// chose au lieu du gris ». Le dos se reduisait a deux echardes sur
// une vue de face ; le gris du repos se confondait avec un jour vide.
// ------------------------------------------------------------
{
  const stats = lire('app-v2/src/components/Stats.jsx');
  const entr = lire('app-v2/src/store/entrainement.js');
  const css = lire('app-v2/src/styles/entrainer-carte.css');
  if (stats && entr && css) {
    const soucis = [];
    if (!/bodymap--double/.test(stats)) soucis.push('la silhouette est revenue a une seule vue');
    // Raci le 12/08 : « les formes sont tres geometriques
    // (rectangles), on pourrait le rendre plus anatomique ». Les
    // muscles sont traces au path, pas au rectangle.
    const bloc = (stats.match(/export function BodyMap[\s\S]*?\n\}\n/) || [''])[0];
    const rects = (bloc.match(/<rect class="bp" style/g) || []).length;
    if (rects) soucis.push(`${rects} muscle(s) redessine(s) au rectangle — la silhouette redevient geometrique`);
    // La geometrie a quitte Stats.jsx : les trapezes se verifient
    // maintenant dans les chemins generes, pas dans un appel col().
    const sil = lire('app-v2/src/data/silhouette.js') || '';
    if (!/g: 'trapezes'/.test(sil)) soucis.push('les trapezes ne sont plus dessines');
    if (!/k: 'trapezes'/.test(entr)) soucis.push('le groupe trapezes a disparu de GROUPES');
    // Le repos se lit par une COCHE VERTE, pas par un aplat pale.
    // Raci le 10/08 sur trois nuances proposees : « c'est de la
    // daube, c'est tous les memes ». Un signe, pas une teinte.
    if (!/wlog-coche/.test(stats === null ? '' : lire('app-v2/src/components/Entrainer.jsx') || '')) {
      soucis.push('la coche du jour de repos a disparu');
    }
    if (!/wlog-cell\.repos \{[^}]*#E8F3ED/.test(css)) soucis.push('le fond vert clair du repos a disparu');
    // #26654B sur #E8F3ED : 6.07:1, mesure. Un vert plus clair
    // repasserait sous le minimum lisible.
    if (/wlog-coche[^}]*color: #2F7D5C/.test(css)) soucis.push('le vert de la coche est repasse a 4.39:1');
    if (soucis.length) faute('R20 silhouette et repos', soucis.join(' ; '));
    else passe('R20 silhouette et repos');
  }
}

// ------------------------------------------------------------
// R19 — Fin de seance : les deux branches convergent.
// Organigramme de Raci du 10/08. Deux liaisons etaient coupees :
//  1. Une seance enregistree ne colorait pas le calendrier. Seul
//     muscleLog l'alimente, et rien n'y ecrivait a la fin.
//  2. La branche « programme » n'avait AUCUNE fin de seance :
//     SeanceDetail ne contenait ni bouton Terminer ni enregistrement.
//     On terminait sa seance du jour et il n'en restait rien.
// Ces deux pannes sont silencieuses : aucune erreur, juste un
// calendrier qui reste blanc.
// ------------------------------------------------------------
{
  const seances = lire('app-v2/src/store/seances.js');
  const detail = lire('app-v2/src/components/SeanceDetail.jsx');
  if (seances && detail) {
    const soucis = [];
    if (!/noterMuscles\(seance\.iso, seance\.muscles\)/.test(seances)) {
      soucis.push('enregistrerSeance ne colore plus le calendrier');
    }
    if (!/enregistrerSeance\(/.test(detail)) {
      soucis.push('la seance de programme ne s\'enregistre pas — branche sans fin');
    }
    if (soucis.length) faute('R19 fin de seance', soucis.join(' ; '));
    else passe('R19 fin de seance');
  }
}

// ------------------------------------------------------------
// R18 — Le quota gratuit mord a la planification.
// Raci le 10/08 : « un utilisateur gratuit peut programmer maximum 4
// seances a la fois ; s'il clique sur la 5e, un message s'affiche ».
// Le verrou doit apparaitre A L'APPUI, pas en permanence : une limite
// affichee d'avance est un reproche. Et l'ecran doit exister — sans
// lui, adopterProgramme() n'est appelable que par le code.
// ------------------------------------------------------------
{
  const pl = lire('app-v2/src/components/PlanifierProgramme.jsx');
  const prg = lire('app-v2/src/components/Programmes.jsx');
  const main = lire('app-v2/src/main.jsx');
  if (pl && prg && main) {
    const soucis = [];
    if (!/quotaAtteint\(choisis\.length, premium\)/.test(pl)) soucis.push('le quota n\'est plus consulte au moment du choix');
    // Raci le 10/08 : « je veux moi pouvoir dire quel jour, quel
    // muscle, dans quel ordre ». L'affectation doit rester EXPLICITE
    // — { jourSemaine: indexSeance } — et non redevenir une liste ou
    // la position impose la seance.
    if (!/const \[aff, setAff\]/.test(pl)) soucis.push('l\'ordre des seances est redevenu impose par la position');
    if (!/adopterProgramme\(progId, aff\)/.test(pl)) soucis.push('l\'affectation choisie n\'est plus celle qu\'on enregistre');
    const store = lire('app-v2/src/store/programme.js');
    if (store && !/export function normaliserJours/.test(store)) {
      soucis.push('la reprise des anciens programmes (jours en tableau) a disparu');
    }
    if (!/setBloque\(true\); return;/.test(pl)) soucis.push('le 5e jour n\'affiche pas de message');
    if (!/adopterProgramme\(progId, /.test(pl)) soucis.push('la validation n\'adopte plus le programme');
    if (!/vue\.nom === 'planifier'/.test(main)) soucis.push("la vue 'planifier' n'est pas branchee");
    if (!/allerVers\('planifier'/.test(prg)) soucis.push('aucune entree vers la planification depuis la fiche programme');
    // Cul-de-sac trouve le 10/08 en eprouvant le verrou : sur un
    // programme 6 jours, un compte gratuit ne cochait que 4 jours et
    // le bouton d'enregistrement, qui exigeait le compte complet, ne
    // s'allumait jamais. Le plafond doit tenir compte du quota.
    // `pl` est deja lu plus haut dans ce bloc : le redeclarer creait
    // une zone morte temporelle et faisait planter l'audit entier.
    // On enregistre des qu'UN jour est coche. Exiger le compte complet
    // bloquait deux fois : un compte gratuit sur un programme 6 jours
    // (10/08), puis Raci lui-meme, en Premium sur un 5 jours, qui ne
    // voulait s'entrainer que quatre jours cette semaine-la.
    if (pl && !/const complet = choisis\.length >= 1/.test(pl)) {
      soucis.push('l\'enregistrement exige a nouveau un nombre de jours impose');
    }
    if (soucis.length) faute('R18 quota de planification', soucis.join(' ; '));
    else passe('R18 quota de planification');
  }
}

// ------------------------------------------------------------
// R17 — Demarrer une seance : le routage suit le schema de Raci.
//   programme actif ? -> ecran de choix ; sinon -> seance libre.
// Un ecran de choix affiche SANS programme n'aurait qu'une option :
// une porte a ouvrir pour rien. Et le calendrier ne doit pas
// affirmer qu'une seance a eu lieu quand elle est seulement prevue —
// le planifie se lit en creux, le fait en plein.
// ------------------------------------------------------------
{
  const entr = lire('app-v2/src/components/Entrainer.jsx');
  const store = lire('app-v2/src/store/programme.js');
  const main = lire('app-v2/src/main.jsx');
  if (entr && store && main) {
    const soucis = [];
    if (!/programmeActif\.value \? 'demarrer' : 'selection'/.test(entr)) {
      soucis.push('le bouton ne route plus selon la presence d\'un programme actif');
    }
    if (!/vue\.nom === 'demarrer'/.test(main)) soucis.push("la vue 'demarrer' n'est pas branchee dans le routeur");
    // Le reel prime sur le prevu : on ne planifie que sur un jour vide.
    if (!/if \(!muscles\.length && !repos\)/.test(entr)) {
      soucis.push('une seance prevue peut recouvrir une seance reellement notee');
    }
    // Quota gratuit : 4 seances hebdomadaires, au-dela Premium.
    if (!/SEANCES_LIBRES = 4/.test(store)) soucis.push('le quota gratuit de 4 seances a change sans decision');
    if (soucis.length) faute('R17 demarrer une seance', soucis.join(' ; '));
    else passe('R17 demarrer une seance');
  }
}

// ------------------------------------------------------------
// R16 — La page S'entrainer garde ses deux destinations.
// Refonte du 10/08 : les cartes « Seance libre » et « Creer mon
// programme » sont retirees. Elles etaient les SEULS chemins vers
// `selection` (choix d'exercices) et `questionnaire` (programme sur
// mesure). Retirer une carte sans reprendre sa destination rendrait
// une fonctionnalite entiere inatteignable sans qu'aucune erreur ne
// se produise — le pire genre de panne, silencieuse.
// ------------------------------------------------------------
{
  // La verification porte sur l'ONGLET, pas sur un seul fichier : le
  // 10/08, `selection` est passee derriere l'ecran de choix, elle
  // n'apparaissait donc plus dans Entrainer.jsx. La regle a sonne — a
  // juste titre, la forme avait change — mais la destination restait
  // atteignable. On lit donc les deux fichiers du parcours.
  const jsx = [lire('app-v2/src/components/Entrainer.jsx'),
               lire('app-v2/src/components/DemarrerSeance.jsx')].filter(Boolean).join('\n');
  if (jsx) {
    const soucis = [];
    for (const dest of ['selection', 'questionnaire']) {
      if (!new RegExp(`'${dest}'`).test(jsx)) {
        soucis.push(`la destination '${dest}' n'est plus atteignable depuis S'entrainer`);
      }
    }
    // Le calendrier ne doit pas retrouver d'etat replie : il EST la
    // page maintenant, le masquer derriere un bouton n'a plus de sens.
    if (/wlog-list' \+ \(ouvert/.test(jsx)) soucis.push('le journal est redevenu repliable');
    if (soucis.length) faute('R16 page S\'entrainer', soucis.join(' ; '));
    else passe('R16 page S\'entrainer');
  }
}

// ------------------------------------------------------------
// R13 — Tout composant employe dans du JSX doit exister.
// Trouve le 10/08 : le commit b9b6a68 du 27/07, qui refaisait l'ecran
// de resultat du questionnaire, a supprime la fonction Reglette en
// laissant la balise <Reglette> a sa place. L'etape 3 levait alors
// « Reglette is not defined », le rendu plantait, l'ecran restait
// fige sur l'etape 2 et l'appui sur Continuer semblait sans effet.
// Le questionnaire « Creer mon programme » etait bloque depuis deux
// semaines. `node tools/verif-js.js` ne l'a pas vu : il verifie la
// syntaxe, pas les references.
// ------------------------------------------------------------
{
  const { readdirSync } = await import('node:fs');
  const dossiers = ['app-v2/src/components', 'app-v2/src/pages'];
  const manquants = [];
  for (const dossier of dossiers) {
    let fichiers = [];
    try { fichiers = readdirSync(resolve(RACINE, dossier)).filter(f => f.endsWith('.jsx')); }
    catch (e) { continue; }
    for (const f of fichiers) {
      const src = lire(`${dossier}/${f}`);
      if (!src) continue;
      const propre = src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
      // Balises commencant par une majuscule = composants.
      const employes = new Set();
      for (const m of propre.matchAll(/<([A-Z][A-Za-z0-9_]*)[\s/>]/g)) employes.add(m[1]);
      for (const nom of employes) {
        const defini = new RegExp(
          `(function|const|class)\\s+${nom}\\b|\\b${nom}\\b[^\\n]*from\\s+['"]|\\{[^}]*\\b${nom}\\b[^}]*\\}\\s*from`
        ).test(propre);
        if (!defini) manquants.push(`${f} : <${nom}> employe mais ni defini ni importe`);
      }
    }
  }
  if (manquants.length) faute('R13 composant fantome', manquants.join(' ; '));
  else passe('R13 composant fantome');
}

// ------------------------------------------------------------
// R12 — Retour de la barre de navigation.
// Raci le 10/08 : « qu'elle reapparaisse rapidement quand j'arrete de
// defiler, surtout quand je suis en bas ». L'attente etait de 700ms
// plus 340ms d'animation. Deux exigences tenues ici : le delai reste
// court, et arrive en bas la barre ne se cache pas du tout —
// l'escamotage sert a degager du contenu sous la barre, or en bas il
// n'y a plus rien a degager.
// ------------------------------------------------------------
{
  const jsx = lire('app-v2/src/components/BottomNav.jsx');
  const css = lire('app-v2/src/styles/journal-socle.css');
  if (jsx && css) {
    const soucis = [];
    const d = jsx.match(/setCachee\(false\),\s*(\d+)\)/);
    if (!d) soucis.push('delai de retour introuvable');
    else if (+d[1] > 300) soucis.push(`delai de retour de ${d[1]}ms — au-dela de 300ms l'attente se remarque`);
    if (!/restant <= 4/.test(jsx)) soucis.push('la barre se cache encore en bas de page');
    const tr = css.match(/\.bn \{ transition: transform \.(\d+)s/);
    if (!tr) soucis.push('transition de retour introuvable');
    else if (+tr[1] > 30) soucis.push(`animation de retour de .${tr[1]}s — elle s'ajoute au delai`);
    if (soucis.length) faute('R12 retour de la barre', soucis.join(' ; '));
    else passe('R12 retour de la barre');
  }
}

// ------------------------------------------------------------
// R10 — Une ligne de resultat ne lit jamais des valeurs absentes.
// Trouve le 10/08 en instrumentant la console : un favori dont
// l'aliment n'existe plus dans la base — produit renomme, aliment
// scanne puis supprime — passait dans la liste avec saisie, et la
// page plantait sur `.kcal` d'un objet absent. Ecran blanc, pas un
// defaut visuel. La branche sans saisie filtrait deja, l'autre non.
// ------------------------------------------------------------
{
  const jsx = lire('app-v2/src/components/MealCard.jsx');
  if (jsx) {
    const soucis = [];
    // Aucune lecture directe sur le resultat du OU : il peut etre
    // undefined et le point d'acces plante la page entiere.
    if (/\(DB\[nom\]\s*\|\|\s*customFoods\.value\[nom\]\)\s*\./.test(jsx)) {
      soucis.push('lecture directe sur (DB[nom] || customFoods[nom]) — plante si l\'aliment n\'existe plus');
    }
    // Et la liste doit etre filtree sur les DEUX branches.
    if (!/aDesValeurs/.test(jsx)) soucis.push('la liste de resultats n\'ecarte pas les aliments sans valeurs');
    if (soucis.length) faute('R10 resultat sans valeurs', soucis.join(' ; '));
    else passe('R10 resultat sans valeurs');
  }
}

// ------------------------------------------------------------
// R8 — Contraste minimal des libelles de stats.scoped.css.
// Trouve le 10/08 : les petits libelles (« Record x 8 », « Moyenne
// sur 6 jours ») etaient en #8A8279 a 10.5px, soit 3.57:1 sur le
// creme #FAF8F4 — sous le minimum lisible de 4.5:1.
// ------------------------------------------------------------
{
  const css = lire(CSS_STATS);
  if (css) {
    const lum = (h) => {
      const c = [1, 3, 5].map((i) => parseInt(h.substr(i, 2), 16) / 255)
        .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
      return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    };
    const contraste = (a, b) => {
      const [l1, l2] = [lum(a), lum(b)];
      return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    };
    // La regle ne juge QUE les gris de libelle sur fond clair.
    // Un accent (orange, or, rouge, violet) est un choix delibere et
    // se pose souvent sur une pastille noire : le mesurer contre le
    // creme n'aurait aucun sens. Un gris a les trois canaux proches.
    const gris = (h) => {
      const v = [1, 3, 5].map((i) => parseInt(h.substr(i, 2), 16));
      return Math.max(...v) - Math.min(...v) <= 30;
    };
    const FONDS = ['#FFFFFF', '#FAF8F4'];   // la carte blanche, la boite creme
    const propre = sansCommentaires(css);
    const faibles = [];
    // On lit bloc par bloc : un bloc qui pose son propre fond gere
    // son contraste tout seul (bouton desactive, pastille sombre).
    for (const b of propre.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
      const corps = b[2];
      if (/background/.test(corps)) continue;
      const m = corps.match(/(?:^|;)\s*(?:color|fill)\s*:\s*(#[0-9a-fA-F]{6})/i);
      if (!m) continue;
      const c = m[1].toUpperCase();
      if (lum(c) < 0.12 || !gris(c)) continue;
      const pire = Math.min(...FONDS.map((f) => contraste(c, f)));
      if (pire < 4.5) {
        const ligne = propre.slice(0, b.index).split('\n').length;
        faibles.push(`${c} ligne ${ligne} — ${pire.toFixed(2)}:1 (${b[1].trim().split('\n').pop().trim()})`);
      }
    }
    if (faibles.length) faute('R8 contraste des libelles', faibles.join(' ; '));
    else passe('R8 contraste des libelles');
  }
}

// ------------------------------------------------------------
// R7 — Regles CSS mortes dans stats.scoped.css.
// Trouve le 9/08 : `.chart-bar.weight` porte un degrade vert en
// !important alors qu'aucune classe `weight` n'est plus posee par
// Stats.jsx — la courbe a remplace les barres. Signale seulement :
// un retrait attend la validation de Raci.
// ------------------------------------------------------------
{
  const css = lire(CSS_STATS);
  const jsx = lire('app-v2/src/components/Stats.jsx');
  if (css && jsx) {
    // On compare aux classes REELLEMENT posees dans un attribut class,
    // pas au mot present quelque part dans le fichier : `weight` existe
    // dans `e.weight` (lecture de pesee) et masquait le code mort.
    const posees = new Set();
    for (const m of jsx.matchAll(/class=(?:"([^"]*)"|\{'([^']*)'|\{`([^`]*)`)/g)) {
      (m[1] || m[2] || m[3] || '').split(/[\s+'`]+/).forEach((c) => c && posees.add(c));
    }
    for (const m of jsx.matchAll(/'\s*([a-z0-9-]+)\s*'/g)) posees.add(m[1]);
    const suspectes = ['chart-bar.weight'];
    const mortes = suspectes.filter((c) => css.includes(c) && !posees.has(c.split('.').pop()));
    if (mortes.length) signale('R7 regles CSS mortes', `${mortes.join(', ')} — style defini, classe jamais posee par Stats.jsx`);
    else passe('R7 regles CSS mortes');
  }
}

// ------------------------------------------------------------
// R26 — La silhouette reste un decalque, pas un dessin a la main.
// Trouve le 15/08 : six versions tracees au juge ont toutes rendu des
// formes geometriques (« Lego », « effet os »). La silhouette est
// desormais vectorisee depuis la planche de Raci par tools/tracer.py.
// Trois pieges a tenir :
//   - reecrire de la geometrie dans Stats.jsx annulerait le decalque ;
//   - le fichier genere peut exploser (440 Ko au premier jet, avant
//     decimation des points) et alourdir le bundle ;
//   - un clipPath ou tout autre id casserait les DEUX silhouettes
//     affichees en meme temps sur S'entrainer (carte + modale).
// ------------------------------------------------------------
{
  const stats = lire('app-v2/src/components/Stats.jsx');
  const sil = lire('app-v2/src/data/silhouette.js');
  if (stats && sil) {
    const soucis = [];
    const bloc = (stats.match(/export function BodyMap[\s\S]*?\n\}\n/) || [''])[0];
    const traces = (bloc.match(/d="M[\d\s.-]/g) || []).length;
    if (traces) soucis.push(`${traces} trace(s) ecrit(s) a la main dans BodyMap — la geometrie doit venir de data/silhouette.js`);
    if (!lire('tools/tracer.py')) soucis.push('tools/tracer.py absent : la silhouette ne serait plus regenerable');
    const ko = Math.round(sil.length / 1024);
    if (ko > 120) soucis.push(`data/silhouette.js pese ${ko} Ko — decimer les points dans tracer.py`);
    if (/clipPath|url\(#/.test(bloc)) soucis.push('un clipPath est revenu : les deux silhouettes de S\'entrainer partageraient le meme id');
    const face = (sil.match(/g: '/g) || []).length;
    if (face < 40) soucis.push(`${face} chemins seulement — le decalque a perdu des pieces`);
    if (soucis.length) faute('R26 silhouette decalquee', soucis.join(' ; '));
    else passe('R26 silhouette decalquee');
  }
}

// ------------------------------------------------------------
// R27 — Les vues adressables par ?vue= restent ouvrables a vide.
// Ajoute le 15/08 avec le parametre. Le piege : y inscrire une vue qui
// attend des parametres (planifier veut un `prog`, seanceDetail un
// `seanceId`). Ouverte par l'adresse, elle n'en aurait aucun et
// s'afficherait a blanc — un ecran vide, sans erreur, donc invisible
// en test. La liste doit donc rester fermee et sans ces deux vues.
// ------------------------------------------------------------
{
  const ent = lire('app-v2/src/components/Entrainer.jsx');
  if (ent) {
    const soucis = [];
    const m = ent.match(/const VUES_ADRESSABLES = \[([^\]]*)\]/);
    if (!m) soucis.push('VUES_ADRESSABLES introuvable — le parametre ?vue= a disparu');
    else {
      for (const risque of ['planifier', 'seanceDetail']) {
        if (m[1].includes(risque)) soucis.push(`${risque} est adressable alors qu'elle exige des parametres — elle s'ouvrirait a blanc`);
      }
      // Le routeur des vues est dans main.jsx : c'est lui qui dit
      // quelles vues existent vraiment, pas les appels a allerVers.
      const routeur = lire('app-v2/src/main.jsx') || '';
      for (const v of m[1].match(/'([a-zA-Z]+)'/g) || []) {
        const nom = v.slice(1, -1);
        if (!routeur.includes(`vue.nom === '${nom}'`)) soucis.push(`la vue ${nom} est adressable mais le routeur ne la connait pas`);
      }
    }
    if (soucis.length) faute('R27 vues adressables', soucis.join(' ; '));
    else passe('R27 vues adressables');
  }
}

// ------------------------------------------------------------
// R28 — Le chrono reste atteignable sur « Choisir mes exercices ».
// Trouve le 15/08 sur capture : le bouton flottant recouvrait la
// derniere carte de la liste ET la barre « Ma seance ». La consigne de
// Raci etait explicite — le reduire, pas le supprimer. Le piege serait
// qu'une passe de nettoyage le fasse disparaitre de cet ecran, ou que
// le compte des choix retourne vivre dans la seule barre du bas, qui
// est masquee a zero.
// ------------------------------------------------------------
{
  const css = lire('app-v2/src/legacy/selection-exercices.scoped.css');
  const jsx = lire('app-v2/src/components/SelectionExercices.jsx');
  if (css && jsx) {
    const soucis = [];
    if (/\.v2-chrono-fab\s*\{[^}]*display\s*:\s*none/.test(css)) soucis.push('le chrono est masque sur cet ecran — Raci a demande de le garder');
    if (!/body:has\(\.pg-selection\) \.v2-chrono-fab/.test(css)) soucis.push('le chrono n\'est plus mis en retrait : il recouvre la derniere carte et la barre Ma seance');
    if (!/hint-compte/.test(jsx)) soucis.push('le compte des choix a quitte la liste — a zero il ne serait plus affiche nulle part');
    if (soucis.length) faute('R28 chrono et compte sur la selection', soucis.join(' ; '));
    else passe('R28 chrono et compte sur la selection');
  }
}

// ------------------------------------------------------------
// Rapport
// ------------------------------------------------------------
for (const r of ok) console.log(`  ok    ${r}`);
for (const g of signaux) console.log(`  note  ${g.regle} : ${g.detail}`);
for (const e of ecarts) console.log(`  ECART ${e.regle} : ${e.detail}`);
console.log(ecarts.length
  ? `\n${ecarts.length} ecart(s) — audit en echec.`
  : `\n${ok.length} regles, aucun ecart.`);
process.exit(ecarts.length ? 1 : 0);
