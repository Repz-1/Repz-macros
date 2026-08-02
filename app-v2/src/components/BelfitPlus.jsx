import { useState, useEffect } from 'preact/hooks';
import { signal } from '@preact/signals';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { getApps } from 'firebase/app';
import { utilisateur } from '../services/firebase.js';
import { setObjectifs, objectifs, repas } from '../store/journal.js';
import { macrosOf, DB } from '../data/aliments.js';
import { ongletActif, allerOnglet } from './BottomNav.jsx';
import { ouvrirCalcDemande } from './DayDashboard.jsx';
import { statsAvOuvertes } from './StatsAvancees.jsx';
import { ideesOuvertes } from './IdeesRepas.jsx';
import { Entete } from './Entete.jsx';
import '../styles/belfit-plus.css';

const URL_AJUSTEMENT =
  'https://europe-west1-repz-baf60.cloudfunctions.net/demanderAjustement';

// ============================================================
// BELFIT+ — l'espace des membres.
//
// Ce n'est pas la page Premium avec un bandeau « merci ». Une page
// de vente lue par quelqu'un qui a deja paye ne lui apprend rien :
// elle lui redit ce qu'il obtiendrait, au futur, avec une colonne
// GRATUIT qui ne le concerne plus.
//
// Ici, les quatre cartes reprennent exactement les quatre benefices
// vendus sur la page Premium — ce qui a ete promis est livre au
// meme endroit, dans le meme ordre. Chacune porte une donnee reelle
// plutot qu'une description : on n'explique plus ce que la fonction
// fera, on montre ou elle en est.
// ============================================================

// Programme depose par le coach dans users/{uid}.programme.
// Forme attendue :
//   { kcal, prot, carbs, lip, note, livreLe (ISO), version }
export const programme = signal(null);
export const programmeCharge = signal(false);
/** Ajustements restants ce mois-ci, et quota de la formule. */
export const ajustements = signal({restants: null, quota: null});

export function chargerProgramme() {
  // Apercu local : le meme drapeau que l'apercu Premium sert a poser
  // un programme de demonstration sans passer par Firestore.
  try {
    const faux = localStorage.getItem('belfit_v2_apercu_programme');
    if (faux) {
      programme.value = JSON.parse(faux);
      const q = localStorage.getItem('belfit_v2_apercu_ajust');
      ajustements.value = q ? JSON.parse(q) : {restants: 2, quota: 2};
      programmeCharge.value = true;
      return;
    }
  } catch (e) { /* stockage indisponible : on suit le chemin normal */ }

  const u = utilisateur.value;
  if (!u || !getApps().length) { programmeCharge.value = true; return; }
  getDoc(doc(getFirestore(getApps()[0]), 'users', u.uid))
    .then(s => {
      const d = s.exists() ? s.data() : null;
      programme.value = (d && d.programme) || null;
      // Le quota suit la formule ; le compteur se remet a zero au
      // changement de mois civil, cote serveur comme ici.
      const QUOTA = {mensuel: 2, trimestriel: 3, annuel: 4};
      const quota = QUOTA[d && d.formule] || 2;
      const mois = new Date().getUTCFullYear() + '-' +
        String(new Date().getUTCMonth() + 1).padStart(2, '0');
      const suivi = (d && d.ajustements) || {};
      const pris = suivi.mois === mois ? (suivi.utilises || 0) : 0;
      ajustements.value = {restants: Math.max(0, quota - pris), quota};
    })
    .catch(() => { programme.value = null; })
    .finally(() => { programmeCharge.value = true; });
}

/** « il y a 3 jours », a partir d'une date ISO. */
function depuis(iso) {
  if (!iso) return null;
  const j = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (isNaN(j)) return null;
  if (j <= 0) return "aujourd'hui";
  if (j === 1) return 'hier';
  if (j < 31) return `il y a ${j} jours`;
  const m = Math.floor(j / 30);
  return m === 1 ? 'il y a un mois' : `il y a ${m} mois`;
}

/** Prenom pour l'accueil : le compte, sinon la cle locale. */
function prenomCourt() {
  const u = utilisateur.value;
  const n = (u && u.displayName) || '';
  if (n) return n.split(' ')[0];
  try {
    return localStorage.getItem('repz_firstName')
      || (JSON.parse(localStorage.getItem('repz_profile') || '{}').prenom) || '';
  } catch (e) { return ''; }
}

const CLE_CHARGE = 'belfit_prog_charge';

/** Ce programme-ci a-t-il deja ete charge dans le journal ?
 *  On repere la version par sa date de livraison : un nouveau
 *  programme repart d'une ardoise propre, sans avertissement. */
function dejaCharge(pr) {
  try { return localStorage.getItem(CLE_CHARGE) === String(pr.livreLe); }
  catch (e) { return false; }
}
function marquerCharge(pr) {
  try { localStorage.setItem(CLE_CHARGE, String(pr.livreLe)); } catch (e) {}
}

/** Calories d'un repas du programme, calculees avec la base commune. */
function kcalRepas(r) {
  return (r.ings || []).reduce((t, i) => t + macrosOf(i).kcal, 0);
}

/** Unite affichee : piece pour les aliments comptes (oeufs, doses),
 *  gramme sinon. macrosOf ne renvoie pas cette information, elle vit
 *  sur l'entree de la base. */
function unite(nom) {
  const d = DB[nom];
  return d && d.unit ? (d.unitLabel || 'p') : 'g';
}

const Fleche = () => (
  <span class="bp-fleche" aria-hidden="true">
    <svg viewBox="0 0 24 24"><path d="M5 12h13M13 6l6 6-6 6" /></svg>
  </span>
);

export function BelfitPlus() {
  const [ouvertProg, setOuvertProg] = useState(false);
  const [charge, setCharge] = useState(false);
  const [demande, setDemande] = useState(null);   // null | 'ouvert' | 'envoi' | 'ok' | 'erreur'
  const [motDemande, setMotDemande] = useState('');

  useEffect(() => { if (!programmeCharge.value) chargerProgramme(); }, []);

  const pr = programme.value;
  const pret = programmeCharge.value;

  // Le programme est-il deja celui du journal ? Si oui, le bouton
  // d'application n'a plus lieu d'etre : proposer d'appliquer ce qui
  // est deja applique ferait douter de ce qui est en vigueur.
  const o = objectifs.value;
  const dejaApplique = pr && o.kcal === pr.kcal && o.prot === pr.prot
    && o.carbs === pr.carbs && o.lip === pr.lip;
  // Ecart : le programme a ete charge un jour, puis les objectifs ont
  // bouge. Tant qu'il n'a jamais ete charge, il n'y a pas d'ecart —
  // seulement un plan qui attend.
  // La trace du chargement est persistee : sans cela l'avertissement
  // disparaitrait au premier rechargement de la page, c'est-a-dire
  // exactement quand il devient utile.
  const ecart = pr && !dejaApplique && (charge || dejaCharge(pr));

  const aRepas = !!(pr && pr.repas && pr.repas.length);
  const aj = ajustements.value;

  /** Charge le programme dans le journal du jour : objectifs ET repas.
   *  Les repas existants sont remplaces — un programme est un tout,
   *  le melanger avec une saisie partielle ne donnerait ni l'un ni
   *  l'autre. L'avertissement le dit avant le clic. */
  const charger = () => {
    if (!pr) return;
    setObjectifs({ kcal: pr.kcal, prot: pr.prot, carbs: pr.carbs, lip: pr.lip });
    if (aRepas) {
      let n = 0;
      repas.value = pr.repas.map((r) => ({
        id: ++n,
        nom: r.nom,
        type: 'repas',
        cle: null,
        fixe: false,
        ouvert: false,
        ings: r.ings.map((i, k) => ({ id: n * 1000 + k, name: i.name, portion: i.portion })),
      }));
    }
    marquerCharge(pr);
    setCharge(true);
  };

  /** Demande d'ajustement. Le quota est verifie par le serveur ; ce
   *  qu'on affiche ici n'est qu'un rappel. */
  const envoyerDemande = async () => {
    setDemande('envoi');
    try {
      const u = utilisateur.value;
      const jeton = await u.getIdToken();
      const r = await fetch(URL_AJUSTEMENT, {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + jeton},
        body: JSON.stringify({message: motDemande.slice(0, 1000)}),
      });
      const d = await r.json();
      if (d && d.ok) {
        ajustements.value = {restants: d.restants, quota: d.quota};
        setDemande('ok');
        setMotDemande('');
      } else {
        setDemande(d && d.motif === 'quota' ? 'quota' : 'erreur');
      }
    } catch (e) {
      setDemande('erreur');
    }
  };

  // Sous-titre de la carte programme : trois etats distincts, jamais
  // de formule vague. Tant que Firestore n'a pas repondu on n'affiche
  // rien plutot qu'un texte qui changerait sous les yeux.
  let sousProg = '';
  if (pret) {
    if (!pr) sousProg = 'Ton coach prépare ton plan — livré sous 24 à 48 h.';
    else if (dejaApplique) sousProg = `Actif · ${pr.kcal} kcal par jour`;
    else sousProg = `Reçu ${depuis(pr.livreLe) || 'récemment'} · prêt à appliquer`;
  }

  return (
    <div class="pg-plus">
      <Entete retour />

      {/* Carte d'accueil, d'apres la maquette. Sans photo : elle est
          barree sur l'image de reference. La carte occupe donc toute
          la largeur et respire par ses marges. */}
      <section class="bp-hero">
        {/* Le programme vit ici depuis que sa carte a fusionne avec le
            bouton : son visuel l'accompagne, a droite. */}
        <span class="bp-hero-visuel" aria-hidden="true" />
        <p class="bp-hero-bonjour">BONJOUR</p>
        <p class="bp-hero-nom">{prenomCourt()}</p>
        <h1 class="bp-hero-titre">Bienvenue dans<br />ton espace.</h1>
        <span class="bp-hero-trait" aria-hidden="true" />
        <p class="bp-hero-sous">Tout ce dont tu as besoin pour progresser, réuni au même endroit.</p>
        <button class="bp-hero-cta" onClick={() => setOuvertProg(v => !v)}>
          Mon programme <span aria-hidden="true">→</span>
        </button>
      </section>

      {/* 1. Le programme du coach. Premiere carte parce que c'est le
          premier benefice vendu, et le seul qui n'existe pas ailleurs
          dans l'app. */}
      <div class="bp-grille">

        {/* 2. Statistiques */}
        <button class="bp-carte" onClick={() => { statsAvOuvertes.value = true; }}>
          <span class="bp-visuel bp-visuel--stats" aria-hidden="true" />
          <span class="bp-corps">
            <span class="bp-ic" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M4 20V10M10 20V4M16 20v-8M22 20H2" /></svg>
            </span>
            <span class="bp-nom">Mes statistiques avancées</span>
            <span class="bp-sous">Analyse détaillée de ta progression.</span>
          </span>
          <Fleche />
        </button>

        {/* 3. Recettes */}
        <button class="bp-carte" onClick={() => { allerOnglet('journal'); ideesOuvertes.value = true; }}>
          <span class="bp-visuel bp-visuel--recettes" aria-hidden="true" />
          <span class="bp-corps">
            <span class="bp-ic" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M6 3v8a3 3 0 006 0V3M9 11v10M18 3c-1.6 1.2-2.4 3-2.4 5.4 0 1.7.8 2.6 2.4 2.6V3z" /></svg>
            </span>
            <span class="bp-nom">Recettes intelligentes</span>
            <span class="bp-sous">Des idées adaptées à ton objectif.</span>
          </span>
          <Fleche />
        </button>

        {/* 4. Courses */}
        <button class="bp-carte" onClick={() => allerOnglet('courses')}>
          <span class="bp-visuel bp-visuel--courses" aria-hidden="true" />
          <span class="bp-corps">
            <span class="bp-ic" aria-hidden="true">
              <svg viewBox="0 0 24 24"><circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" /><path d="M2.5 3.5h2.6l2.3 11.2h11.1l1.9-8.2H6" /></svg>
            </span>
            <span class="bp-nom">Liste de courses intelligente</span>
            <span class="bp-sous">Générée automatiquement selon tes repas.</span>
          </span>
          <Fleche />
        </button>
      </div>

      {ouvertProg && pr && (
        <div class="bp-detail">
          <div class="bp-macros">
            <div><b>{pr.kcal}</b><em>kcal</em></div>
            <div><b>{pr.prot} g</b><em>protéines</em></div>
            <div><b>{pr.carbs} g</b><em>glucides</em></div>
            <div><b>{pr.lip} g</b><em>lipides</em></div>
          </div>

          {/* Le plan lui-meme, repas par repas. Consultable en
              permanence : c'est le document que le client a achete. */}
          {(pr.repas || []).map((r, i) => (
            <div class="bp-repas" key={i}>
              <div class="bp-repas-tete">
                <span>{r.nom}</span>
                <em>{Math.round(kcalRepas(r))} kcal</em>
              </div>
              {r.ings.map((ing, j) => (
                <div class="bp-ing" key={j}>
                  <span>{ing.name}</span>
                  <em>{ing.portion} {unite(ing.name)}</em>
                </div>
              ))}
            </div>
          ))}

          {pr.note && <p class="bp-note">{pr.note}</p>}

          {/* Ecart avec le programme. Le client PEUT modifier ses
              objectifs — c'est son application. Mais il doit savoir
              qu'il quitte alors le plan pour lequel le coach a
              travaille. On informe, on ne bloque pas, et on ne
              recorrige rien dans son dos. */}
          {ecart && (
            <p class="bp-ecart">
              Tes objectifs actuels ({o.kcal} kcal) ne sont plus ceux de ton
              programme ({pr.kcal} kcal). Tu es sorti de l'objectif pour lequel
              ce plan a été construit — recharge-le, ou demande un ajustement à
              ton coach.
            </p>
          )}

          {/* Le programme n'est pas modifiable ici : un ajustement se
              demande au coach, qui en renvoie un. Le seul geste offert
              est de le charger dans le journal. */}
          {aRepas && (
            <button class="bp-appliquer" onClick={charger}>
              {charge ? 'Programme chargé dans ton journal' : 'Charger dans mon journal'}
            </button>
          )}
          {aRepas && (
            <p class="bp-avis">
              Tes repas du jour seront remplacés par ceux du programme.
            </p>
          )}

          {/* Modifier ses objectifs. Le bouton vivait dans le bandeau
              du profil, insere au-dessus de l'en-tete du Journal : il
              poussait la page vers le bas au lieu de s'ouvrir, et
              personne ne le trouvait. Sa place est ici, a cote de la
              demande d'ajustement — c'est le moment ou l'on constate
              que ses chiffres ne collent plus. */}
          <div class="bp-ajust">
            <button
              class="bp-ajust-btn bp-ajust-btn--besoins"
              onClick={() => { allerOnglet('journal'); ouvrirCalcDemande.value = true; }}
            >
              Modifier mes objectifs
              <em>poids, taille, activité, objectif</em>
            </button>
          </div>

          {/* Demander un ajustement. Le nombre restant est annonce sur
              le bouton : un quota qu'on ne decouvre qu'en le depassant
              est un quota cache. */}
          <div class="bp-ajust">
            {demande === 'ok' ? (
              <p class="bp-ajust-ok">
                Demande envoyée. Ton coach te répond sous 24 à 48 h.
                {aj.restants !== null && ` Il te reste ${aj.restants} ${aj.restants > 1 ? 'ajustements' : 'ajustement'} ce mois-ci.`}
              </p>
            ) : demande === 'quota' ? (
              <p class="bp-ajust-ko">
                Tu as utilisé tes {aj.quota} ajustements du mois. Le compteur
                repart le 1er. Écris à ton coach si c'est urgent.
              </p>
            ) : demande === 'ouvert' || demande === 'envoi' || demande === 'erreur' ? (
              <>
                <textarea
                  class="bp-ajust-champ"
                  maxLength={1000}
                  placeholder="Ce qui ne va pas, ce que tu voudrais changer…"
                  value={motDemande}
                  onInput={(e) => setMotDemande(e.target.value)}
                />
                {demande === 'erreur' && (
                  <p class="bp-ajust-ko">L'envoi a échoué. Réessaie.</p>
                )}
                <button
                  class="bp-ajust-envoi"
                  disabled={demande === 'envoi'}
                  onClick={envoyerDemande}
                >
                  {demande === 'envoi' ? 'Envoi…' : 'Envoyer ma demande'}
                </button>
              </>
            ) : (
              <button
                class="bp-ajust-btn"
                disabled={aj.restants === 0}
                onClick={() => setDemande('ouvert')}
              >
                Demander un ajustement
                {aj.restants !== null && (
                  <em>{aj.restants === 0
                    ? 'aucun restant ce mois-ci'
                    : `il t'en reste ${aj.restants} sur ${aj.quota} ce mois-ci`}</em>
                )}
              </button>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
