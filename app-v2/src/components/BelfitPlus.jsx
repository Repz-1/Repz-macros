import { useState, useEffect } from 'preact/hooks';
import { signal } from '@preact/signals';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { getApps } from 'firebase/app';
import { utilisateur } from '../services/firebase.js';
import { setObjectifs, objectifs } from '../store/journal.js';
import { ongletActif } from './BottomNav.jsx';
import { ideesOuvertes } from './IdeesRepas.jsx';
import { Entete } from './Entete.jsx';
import '../styles/belfit-plus.css';

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

export function chargerProgramme() {
  const u = utilisateur.value;
  if (!u || !getApps().length) { programmeCharge.value = true; return; }
  getDoc(doc(getFirestore(getApps()[0]), 'users', u.uid))
    .then(s => {
      const d = s.exists() ? s.data() : null;
      programme.value = (d && d.programme) || null;
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

const Fleche = () => (
  <span class="bp-fleche" aria-hidden="true">
    <svg viewBox="0 0 24 24"><path d="M5 12h13M13 6l6 6-6 6" /></svg>
  </span>
);

export function BelfitPlus() {
  const [ouvertProg, setOuvertProg] = useState(false);
  const [applique, setApplique] = useState(false);

  useEffect(() => { if (!programmeCharge.value) chargerProgramme(); }, []);

  const pr = programme.value;
  const pret = programmeCharge.value;

  // Le programme est-il deja celui du journal ? Si oui, le bouton
  // d'application n'a plus lieu d'etre : proposer d'appliquer ce qui
  // est deja applique ferait douter de ce qui est en vigueur.
  const o = objectifs.value;
  const dejaApplique = pr && o.kcal === pr.kcal && o.prot === pr.prot
    && o.carbs === pr.carbs && o.lip === pr.lip;

  const appliquer = () => {
    if (!pr) return;
    setObjectifs({ kcal: pr.kcal, prot: pr.prot, carbs: pr.carbs, lip: pr.lip });
    setApplique(true);
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
      <Entete />

      <section class="bp-tete">
        <p class="bp-bonjour">BELFIT+</p>
        <h1 class="bp-titre">Ton espace.</h1>
      </section>

      {/* 1. Le programme du coach. Premiere carte parce que c'est le
          premier benefice vendu, et le seul qui n'existe pas ailleurs
          dans l'app. */}
      <button
        class={'bp-carte bp-carte--large' + (pr && !dejaApplique ? ' bp-carte--neuf' : '')}
        onClick={() => pr && setOuvertProg(v => !v)}
      >
        <span class="bp-visuel bp-visuel--programme" aria-hidden="true" />
        <span class="bp-corps">
          <span class="bp-ic" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M5.5 20.5V8.4a2 2 0 012-2h9a2 2 0 012 2v12.1" /><path d="M9 6.4V4.6a3 3 0 016 0v1.8" /><path d="M9.5 12.6h5M9.5 16.2h3" /></svg>
          </span>
          <span class="bp-nom">Mon programme nutrition</span>
          {sousProg && <span class="bp-sous">{sousProg}</span>}
        </span>
        {pr && <Fleche />}
      </button>

      {ouvertProg && pr && (
        <div class="bp-detail">
          <div class="bp-macros">
            <div><b>{pr.kcal}</b><em>kcal</em></div>
            <div><b>{pr.prot} g</b><em>protéines</em></div>
            <div><b>{pr.carbs} g</b><em>glucides</em></div>
            <div><b>{pr.lip} g</b><em>lipides</em></div>
          </div>
          {pr.note && <p class="bp-note">{pr.note}</p>}
          {dejaApplique ? (
            <p class="bp-etat">Ces objectifs sont ceux de ton journal.</p>
          ) : (
            <button class="bp-appliquer" onClick={appliquer}>
              {applique ? 'Objectifs appliqués' : 'Appliquer à mon journal'}
            </button>
          )}
        </div>
      )}

      <div class="bp-grille">
        {/* 2. Statistiques */}
        <button class="bp-carte" onClick={() => { ongletActif.value = 'stats'; }}>
          <span class="bp-visuel bp-visuel--stats" aria-hidden="true" />
          <span class="bp-corps">
            <span class="bp-ic" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M4 20V10M10 20V4M16 20v-8M22 20H2" /></svg>
            </span>
            <span class="bp-nom">Mes statistiques</span>
            <span class="bp-sous">Sans limite de durée.</span>
          </span>
          <Fleche />
        </button>

        {/* 3. Recettes */}
        <button class="bp-carte" onClick={() => { ongletActif.value = 'journal'; ideesOuvertes.value = true; }}>
          <span class="bp-visuel bp-visuel--recettes" aria-hidden="true" />
          <span class="bp-corps">
            <span class="bp-ic" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M6 3v8a3 3 0 006 0V3M9 11v10M18 3c-1.6 1.2-2.4 3-2.4 5.4 0 1.7.8 2.6 2.4 2.6V3z" /></svg>
            </span>
            <span class="bp-nom">Idées de repas</span>
            <span class="bp-sous">Adaptées à tes macros restantes.</span>
          </span>
          <Fleche />
        </button>

        {/* 4. Courses */}
        <button class="bp-carte" onClick={() => { ongletActif.value = 'courses'; }}>
          <span class="bp-visuel bp-visuel--courses" aria-hidden="true" />
          <span class="bp-corps">
            <span class="bp-ic" aria-hidden="true">
              <svg viewBox="0 0 24 24"><circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" /><path d="M2.5 3.5h2.6l2.3 11.2h11.1l1.9-8.2H6" /></svg>
            </span>
            <span class="bp-nom">Liste de courses</span>
            <span class="bp-sous">Construite depuis tes repas.</span>
          </span>
          <Fleche />
        </button>
      </div>

      <p class="bp-pied">
        Membre BelFit+ · <a href="../parametres.html?de=v2">Gérer mon abonnement</a>
      </p>
    </div>
  );
}
