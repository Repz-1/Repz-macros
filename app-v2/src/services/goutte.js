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
// 70px : le creux entre « Pense a te peser » et le premier repas en fait
// 78. Une colonne de 96 debordait sur la carte de repas pendant le geste
// (Raci, 9/08).
const AMAS_H     = 70;
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
  // La fente est sa place normale. Quand la carte Calories porte le
  // message « journee non cloturee » elle s'allonge et pousse la fente
  // hors de l'ecran ; la pastille doit alors trouver un creux ailleurs.
  // On ne surveille pas une carte en particulier mais TOUT ce qui occupe
  // la colonne : la premiere version ne regardait que la carte sombre et
  // la pastille se posait sur « Pense a te peser » (Raci, 9/08).
  const placeAuRepos = () => {
    const r = sc.getBoundingClientRect();
    // Plancher cale sur la barre de navigation reelle, pas sur le quai
    // bas : celui-ci laissait 148px inutilises sous la barre et faisait
    // refuser des creux parfaitement libres (Raci, 9/08).
    const bn = document.querySelector('.bn');
    const plancher = bn
      ? (bn.getBoundingClientRect().top - r.top) - PASTILLE_H - 10
      : sc.clientHeight - QUAI_BAS_M;
    const G = 12, D = G + PASTILLE_L;          // emprise horizontale a quai

    // Tout ce qui est visible, occupe la bande de la pastille, et n'est
    // ni la fente ni la goutte elle-meme.
    const obstacles = [...sc.querySelectorAll('.pg-journal .colonne > *')]
      .filter(e => !e.classList.contains('fente-goutte'))
      .map(e => e.getBoundingClientRect())
      .filter(b => b.height > 2 && b.right > G && b.left < D)
      .map(b => ({ h: b.top - r.top, b: b.bottom - r.top }))
      .sort((a, z) => a.h - z.h);

    const libre = (y) => !obstacles.some(o => y < o.b - 1 && y + PASTILLE_H > o.h + 1);

    // 1. sa fente — le creux sous « Pense a te peser ». C'est SA place,
    //    message « journee non cloturee » ou pas (Raci, 9/08). On la
    //    ramene dans l'ecran plutot que de la rejeter : avant, un
    //    depassement de 3px suffisait a l'envoyer se poser ailleurs.
    const yf = Math.min(Math.max(fenteY(), 8), plancher);
    if (libre(yf)) return yf;
    // 2. sinon le premier creux entre deux blocs, en partant du haut
    for (let i = 0; i < obstacles.length; i++) {
      const y = obstacles[i].b + 8;
      if (y >= 8 && y <= plancher && libre(y)) return y;
    }
    // 3. sinon le quai bas, s'il est degage
    if (libre(plancher)) return plancher;
    // 4. vraiment aucune place : elle reste dispersee
    return null;
  };
  const quaiHaut = () => { const y = placeAuRepos(); return y === null ? sc.clientHeight - QUAI_BAS_M : y; };
  // Sonde de diagnostic (inerte en production, lue par les tests).
  window.__goutte = () => {
    const r = sc.getBoundingClientRect();
    return { choix: placeAuRepos(), fente: Math.round(fenteY()),
      obstacles: [...sc.querySelectorAll('.pg-journal .colonne > *')]
        .filter(e => !e.classList.contains('fente-goutte'))
        .map(e => { const b = e.getBoundingClientRect();
          return { cl: (e.className||e.tagName).toString().split(' ')[0],
                   h: Math.round(b.top-r.top), b: Math.round(b.bottom-r.top),
                   g: Math.round(b.left), d: Math.round(b.right) }; })
        .filter(o => o.b - o.h > 2) };
  };
  const quaiBas = () => sc.clientHeight - QUAI_BAS_M;
  const croisiere = () => {
    if (ancrage === null) ancrage = quaiHaut();
    return ancrage - REMONTEE;
  };

  let cibleY = 0, cibleD = 0, monte = true;
  let precDefil = null, vitDefil = 0;

  // La goutte reste dans SON CREUX et defile avec la page. Elle ne se cale
  // plus sur une hauteur d'ecran fixe : c'est ce qui la faisait deriver
  // par rapport au contenu et monter jusqu'au cadran (Raci, 9/08, quatre
  // corrections successives sur ce point). La dispersion ne depend plus de
  // la distance parcourue mais de la VITESSE de defilement : ca bouge, elle
  // se disperse ; ca s'arrete, elle se reforme la ou elle est.
  function calculer() {
    const y = sc.scrollTop;
    if (precDefil === null) precDefil = y;
    const bond = Math.abs(y - precDefil);
    monte = (y - precDefil) >= 0;
    precDefil = y;
    // moyenne glissante : une vitesse brute clignoterait a chaque image
    vitDefil += (bond - vitDefil) * 0.35;

    const place = placeAuRepos();
    cibleY = place === null ? quaiHaut() : place;
    // 6px de defilement par image suffisent a la disperser entierement.
    cibleD = place === null ? 1 : borne(vitDefil / 6, 0, 1);
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
    // Recalcul a chaque image, pas seulement au defilement : la mise en
    // page bouge sans qu'on defile — le message « journee non cloturee »
    // apparait, une carte se replie, les polices finissent de charger.
    // Une decision prise une seule fois au montage se retrouvait fausse
    // et la pastille restait posee sur « Pense a te peser » (Raci, 9/08).
    calculer();
    if (Y === null) { Y = cibleY; D = cibleD; }

    const avant = Y;
    // Suivi serre de la position : la goutte est accrochee a un creux qui
    // defile, tout retard la fait mordre sur la carte de repas suivante.
    // L'inertie reste sur la FORME (D), c'est elle qui donne le liquide.
    Y   += (cibleY - Y) * 0.45;
    D   += (cibleD - D) * 0.11;
    vit += (Math.abs(Y - avant) - vit) * 0.22;

    const d = borne(D, 0, 1);
    const h = melange(PASTILLE_H, AMAS_H, d);

    bouton.style.width  = melange(PASTILLE_L, AMAS_L, d).toFixed(1) + 'px';
    bouton.style.height = h.toFixed(1) + 'px';
    bouton.style.left   = melange(12, 0, Math.min(1, d * 1.7)).toFixed(1) + 'px';

    // Centre sur la pastille : la goutte suivant desormais son creux, elle
    // n'a plus de raison de s'etirer d'un seul cote — elle se disperse
    // symetriquement et reste dans les 78px du creux.
    const decal = -(h - PASTILLE_H) / 2;
    const v = Math.min(1, vit / 9);
    bouton.style.transform =
      `translateY(${(Y + decal).toFixed(1)}px) scale(${(1 - v * 0.12).toFixed(3)},${(1 + v * 0.22).toFixed(3)})`;

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
