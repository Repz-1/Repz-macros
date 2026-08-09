// ============================================================
// LA GOUTTE D'EAU DU JOURNAL
//
// Elle vit a quai dans sa fente sous la carte Calories. Des que
// l'on fait defiler, elle se disperse en gouttelettes le long du
// bord gauche, y reste, puis se recompose et vient se poser sur
// son quai du bas.
//
// Pourquoi tout est calcule image par image, et rien en CSS :
// une transition CSS joue sur son propre rythme et decroche du
// doigt. En pilotant la deformation depuis la position de
// defilement, la masse se resserre pixel par pixel sous la main,
// et si l'on s'arrete a mi-chemin elle reste a mi-chemin.
// (Raci, 8/08 — apres plusieurs versions en transitions CSS qui
// donnaient toutes une impression de saut.)
//
// Piege connu : .rail4 porte will-change:transform, donc tout
// position:fixed a l'interieur se decale. La rangee est deja
// rebasculee en absolute par journal-socle.css ; on ne touche
// qu'a transform / width / height / left.
// ============================================================

const PASTILLE_L = 81;   // largeur de la pastille « 0,0 L »
const PASTILLE_H = 46;
const AMAS_L     = 12;   // colonne de gouttelettes
const AMAS_H     = 96;
const QUAI_BAS_M = 196;  // hauteur du quai bas, depuis le bas de l'ecran
const REMONTEE   = 24;   // ce que la goutte gagne au-dessus de sa fente

// Place, taille, decalage et rang d'apparition de chaque perle.
// Rien de synchrone : l'eau ne se divise pas en cadence.
const PROFIL = [
  { t: 0.02, d: 11, x: -1, r: 0.00 },
  { t: 0.17, d: 14, x: -2, r: 0.07 },
  { t: 0.34, d:  9, x:  1, r: 0.19 },
  { t: 0.50, d: 15, x: -2, r: 0.13 },
  { t: 0.66, d:  8, x:  1, r: 0.29 },
  { t: 0.82, d: 12, x: -1, r: 0.23 },
  { t: 0.95, d:  7, x:  0, r: 0.36 },
];

const melange = (a, z, t) => a + (z - a) * t;
const borne   = (v, a, z) => Math.min(z, Math.max(a, v));
const adoucir = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

let boucle = null;

export function animerGoutte() {
  arreterGoutte();

  const sc     = document.querySelector('.pan-scroll');
  const bouton = document.querySelector('.pg-journal .water-fab');
  const fente  = document.querySelector('.pg-journal .fente-goutte');
  if (!sc || !bouton || !fente) return;

  const corps   = bouton.querySelector('.wf-corps');
  const contenu = bouton.querySelector('.wf-contenu');
  const perles  = [...bouton.querySelectorAll('.wf-perles i')];
  if (!corps || !contenu || perles.length !== PROFIL.length) return;

  const rangee = bouton.parentElement;

  // Point d'arrivee releve UNE SEULE FOIS. Toute cible recalculee en
  // continu (pourcentage d'ecran, position d'une carte) remonte avec le
  // defilement et entraine l'amas jusqu'en haut de l'ecran.
  let ancrage = null;
  // Position brute de la fente, telle qu'elle est a l'ecran.
  const fenteY = () => {
    const f = fente.getBoundingClientRect();
    const r = sc.getBoundingClientRect();
    return (f.top - r.top) + (f.height - PASTILLE_H) / 2;
  };
  // Ou poser la pastille au repos.
  // La fente est sa place normale. Mais quand la carte Calories porte le
  // message « journee non cloturee », elle s'allonge et pousse la fente
  // hors de l'ecran : ramener la pastille de force la posait en plein
  // milieu de la carte (Raci, 9/08). On la glisse alors juste sous la
  // carte, premier endroit libre en descendant. Elle ne reste dispersee
  // qu'en dernier recours — sinon on ne pourrait plus lire son total.
  const placeAuRepos = () => {
    const plancher = sc.clientHeight - QUAI_BAS_M;
    let y = Math.min(Math.max(fenteY(), 8), plancher);
    const c = document.querySelector('.pg-journal .carte--relief');
    if (c) {
      const basCarte = c.getBoundingClientRect().bottom - sc.getBoundingClientRect().top;
      if (basCarte > y) y = Math.min(basCarte + 10, plancher);
      if (basCarte > y) return null;   // vraiment aucune place
    }
    return y;
  };
  const quaiHaut = () => { const y = placeAuRepos(); return y === null ? sc.clientHeight - QUAI_BAS_M : y; };
  const quaiBas = () => sc.clientHeight - QUAI_BAS_M;
  const croisiere = () => {
    if (ancrage === null) ancrage = quaiHaut();
    return ancrage - REMONTEE;
  };

  let cibleY = 0, cibleD = 0, monte = true;

  function calculer() {
    const course = Math.max(1, sc.scrollHeight - sc.clientHeight);
    const y = sc.scrollTop;
    // Distance en PIXELS, pas en pourcentage : sur une liste courte, un
    // pourcentage se declenchait au moindre frolement.
    const voyage = Math.min(140, course * 0.33);
    const retour = course - voyage;
    if (y <= voyage) {
      const t = borne(y / voyage, 0, 1);
      cibleY = melange(quaiHaut(), croisiere(), adoucir(t));
      // Pas de place a quai : elle reste dispersee plutot que de se poser
      // sur la carte.
      cibleD = (placeAuRepos() !== null) ? borne(t / 0.34, 0, 1) : 1;
      monte = true;
    } else if (y >= retour) {
      const t = borne((y - retour) / voyage, 0, 1);
      cibleY = melange(croisiere(), quaiBas(), adoucir(t));
      cibleD = borne((1 - t) / 0.34, 0, 1);
      monte = false;
    } else {
      cibleY = croisiere(); cibleD = 1; monte = true;
    }
  }

  // La forme rattrape sa cible avec un retard souple : c'est cette
  // inertie qui donne la sensation de liquide plutot que de mecanisme.
  let Y = null, D = 0, vit = 0, precY = null, dernierSemis = 0, vivantes = 0;

  function semer(pos, d) {
    if (precY === null) { precY = pos; return; }
    const bond = Math.abs(pos - precY);
    const t = performance.now();
    if (bond > 1.4 && t - dernierSemis > 34 && vivantes < 12) {
      dernierSemis = t;
      const g = document.createElement('i');
      g.className = 'wf-trainee';
      const taille = 3 + Math.random() * 5;
      const recul  = 4 + Math.random() * 14;
      const y = pos + (monte ? recul : -recul);
      const x = melange(22, 3, d) + (Math.random() * 10 - 5);
      g.style.cssText =
        `width:${taille.toFixed(1)}px;height:${taille.toFixed(1)}px;` +
        `left:${x.toFixed(1)}px;top:${y.toFixed(1)}px;` +
        `--vie:${(430 + Math.random() * 260).toFixed(0)}ms`;
      rangee.appendChild(g); vivantes++;
      g.addEventListener('animationend', () => { g.remove(); vivantes--; }, { once: true });
    }
    precY = pos;
  }

  function peindre() {
    if (!document.body.contains(bouton)) { boucle = null; return; }
    if (Y === null) { calculer(); Y = cibleY; D = cibleD; }

    const avant = Y;
    Y   += (cibleY - Y) * 0.16;
    D   += (cibleD - D) * 0.11;
    vit += (Math.abs(Y - avant) - vit) * 0.22;

    const d = borne(D, 0, 1);
    const h = melange(PASTILLE_H, AMAS_H, d);

    bouton.style.width  = melange(PASTILLE_L, AMAS_L, d).toFixed(1) + 'px';
    bouton.style.height = h.toFixed(1) + 'px';
    bouton.style.left   = melange(12, 0, Math.min(1, d * 1.7)).toFixed(1) + 'px';

    // Ancre par le HAUT dans les deux sens : ainsi l'amas se disperse vers
    // le bas et ne peut jamais remonter jusqu'au cadran Calories.
    const v = Math.min(1, vit / 9);
    bouton.style.transform =
      `translateY(${Y.toFixed(1)}px) scale(${(1 - v * 0.12).toFixed(3)},${(1 + v * 0.22).toFixed(3)})`;

    corps.style.opacity      = (1 - d * 0.99).toFixed(3);
    corps.style.borderRadius = melange(23, 7, d).toFixed(1) + 'px';
    contenu.style.opacity    = borne(1 - d * 2.8, 0, 1).toFixed(3);

    const tps = performance.now() / 1000;
    perles.forEach((p, i) => {
      const f = PROFIL[i];
      const e = borne((d - f.r) / (1 - f.r), 0, 1);
      const taille = f.d * (0.30 + 0.70 * e);
      p.style.width   = taille.toFixed(1) + 'px';
      p.style.height  = (taille * 1.16).toFixed(1) + 'px';
      p.style.left    = (f.x + (1 - e) * 4).toFixed(1) + 'px';
      p.style.top     = (f.t * (h - taille)).toFixed(1) + 'px';
      p.style.opacity = (e * e).toFixed(3);
      const onde = Math.sin(tps * (0.7 + i * 0.13) + i) * 1.7 * e;
      p.style.transform = `translateY(${onde.toFixed(2)}px)`;
    });

    semer(Y, d);
    boucle = requestAnimationFrame(peindre);
  }

  sc.addEventListener('scroll', calculer, { passive: true });
  window.addEventListener('resize', calculer);
  calculer();
  boucle = requestAnimationFrame(peindre);
}

export function arreterGoutte() {
  if (boucle) { cancelAnimationFrame(boucle); boucle = null; }
}
