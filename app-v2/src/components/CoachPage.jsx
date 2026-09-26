// Onglet Coach (26/09, maquette validee par Raci).
// L'app est entierement gratuite ; ce qui se vend, c'est le plan ecrit
// par le coach : 80 EUR le premier, 60 EUR la mise a jour. Paiement
// unique, sans abonnement ni prelevement.
import { useState, useEffect } from 'preact/hooks';
import { createPortal } from 'preact/compat';
import { utilisateur } from '../services/firebase.js';
import { getApps } from 'firebase/app';
import { BelfitPlus, chargerProgramme, programme, programmeCharge, progOuvert, dossierCoach } from './BelfitPlus.jsx';
import { QuestionnaireCoach, effacerBrouillon } from './QuestionnaireCoach.jsx';
import { Entete } from './Entete.jsx';
import '../styles/coach-page.css';

// Liens LemonSqueezy des deux produits a paiement unique.
// A REMPLIR par Raci une fois les produits crees. Vides : le bouton
// ouvre un e-mail au coach, rien n'est casse.
export const LIENS_COACH = { plan: '', maj: '' };
const MAIL = 'contact@belfit.be';
// Interrupteur (26/09, demande de Raci) : questionnaire en relecture,
// masque en ligne tant qu'il n'est pas valide. true = commandes ouvertes.
export const COMMANDES_OUVERTES = false;

function joursDepuis(iso) {
  if (!iso) return null;
  const j = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return isNaN(j) ? null : Math.max(0, j);
}

function urlPaiement(lien) {
  const u = utilisateur.value;
  let url = lien + '?checkout[billing_address][country]=BE';
  if (u) {
    url += '&checkout[custom][uid]=' + encodeURIComponent(u.uid);
    if (u.email) url += '&checkout[email]=' + encodeURIComponent(u.email);
  }
  return url;
}

// Les reponses partent dans la fiche du client (users/{uid}), la ou
// le coach depose deja les plans. Une copie reste sur l'appareil.
function envoyerQuestionnaire(type, reponses, alerte) {
  const q = { type, reponses, alerteSante: !!alerte, envoyeLe: new Date().toISOString() };
  try { localStorage.setItem('belfit_qc_dernier', JSON.stringify(q)); } catch (e) { /* rien */ }
  dossierCoach.value = { ...dossierCoach.value, questionnaire: q };
  const u = utilisateur.value;
  if (!u || !getApps().length) return Promise.resolve();
  return import('firebase/firestore').then(({ getFirestore, doc, setDoc }) =>
    setDoc(doc(getFirestore(getApps()[0]), 'users', u.uid), { questionnaireCoach: q }, { merge: true }))
    .catch(e => console.warn('questionnaire non envoye', e));
}

export function CoachPage() {
  const [achat, setAchat] = useState(null);      // 'plan' | 'maj' | null
  const [consent, setConsent] = useState(false);
  const [remplir, setRemplir] = useState(null);  // questionnaire ouvert : 'plan' | 'maj'
  useEffect(() => { if (!programmeCharge.value) chargerProgramme(); }, []);

  if (progOuvert.value) return <BelfitPlus />;
  if (remplir) {
    return (
      <QuestionnaireCoach type={remplir} prix={remplir === 'maj' ? 60 : 80}
        onFermer={() => setRemplir(null)}
        onTermine={(reponses, alerte) => {
          const t = remplir;
          envoyerQuestionnaire(t, reponses, alerte);
          setRemplir(null); setConsent(false); setAchat(t);
        }} />
    );
  }

  const pr = programme.value;
  const j = pr ? joursDepuis(pr.livreLe) : null;
  const rappel = j !== null && j >= 30;
  // Paye, plan pas encore livre : on le dit, sinon le client croit que
  // le paiement a echoue.
  const cmd = dossierCoach.value.commande;
  const enAttente = !!(cmd && cmd.payeLe && (!pr || !pr.livreLe || new Date(pr.livreLe) < new Date(cmd.payeLe)));
  if (enAttente) { effacerBrouillon('plan'); effacerBrouillon('maj'); }

  const payer = () => {
    const lien = LIENS_COACH[achat];
    if (!lien) {
      const sujet = achat === 'maj' ? 'Mise a jour de mon plan' : 'Mon premier plan';
      window.location.href = `mailto:${MAIL}?subject=${encodeURIComponent(sujet)}`;
    } else {
      window.location.href = urlPaiement(lien);
    }
  };

  return (
    <div class="pg-coach">
      <Entete />
      <h1 class="cp-titre">Ton coach</h1>
      <p class="cp-sous">L'app est gratuite. Le plan sur mesure, c'est moi.</p>

      <div class="cp-carte cp-profil">
        <span class="cp-avatar" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></svg>
        </span>
        <div>
          <p class="cp-nom">Coach BelFit</p>
          <p class="cp-txt">Nutrition et préparation physique</p>
        </div>
      </div>

      {pr && (
        <>
          <p class="cp-sec">MON PLAN</p>
          <div class="cp-carte">
            <div class="cp-ligne"><span class="cp-nom">Mon plan coach</span><span class="cp-txt">{pr.kcal} kcal</span></div>
            <p class="cp-txt">{j === null ? 'Reçu récemment' : j === 0 ? "Reçu aujourd'hui" : `Reçu il y a ${j} jour${j > 1 ? 's' : ''}`}</p>
            {rappel && !enAttente && <span class="cp-tag">Ton plan a {j} jours : pense à le mettre à jour</span>}
            <button class="cp-bt cp-bt--or" onClick={() => { progOuvert.value = true; }}>Voir mon plan</button>
          </div>
        </>
      )}

      {!pr && (
        <>
          <p class="cp-sec">COMMENT ÇA MARCHE</p>
          <div class="cp-carte">
            <div class="cp-etape"><span class="cp-n">1</span><span class="cp-txt">Tu réponds au questionnaire (5 minutes).</span></div>
            <div class="cp-etape"><span class="cp-n">2</span><span class="cp-txt">Je t'écris ton plan, livré dans l'app sous 48 h.</span></div>
            <div class="cp-etape"><span class="cp-n">3</span><span class="cp-txt">Quand tu veux, je l'ajuste selon tes progrès.</span></div>
          </div>
        </>
      )}

      {enAttente && (
        <div class="cp-carte cp-attente">
          <p class="cp-nom">Plan en préparation</p>
          <p class="cp-txt">Paiement reçu. Ton coach prépare ton plan, livré dans l'app sous 48 h.</p>
        </div>
      )}

      {!enAttente && <p class="cp-sec">TARIFS</p>}
      {!enAttente && !pr && (
        <div class="cp-carte cp-carte--or">
          <div class="cp-ligne"><span class="cp-nom">Premier plan</span><span class="cp-prix">80 €</span></div>
          <p class="cp-txt">Bilan complet, plan alimentaire écrit pour toi, livré sous 48 h.</p>
          {COMMANDES_OUVERTES
            ? <button class="cp-bt cp-bt--or" onClick={() => setRemplir('plan')}>Demander mon plan</button>
            : <button class="cp-bt cp-bt--gris" disabled>Bientôt disponible</button>}
        </div>
      )}
      {!enAttente && pr && (
        <div class={'cp-carte' + (rappel ? ' cp-carte--or' : '')}>
          <div class="cp-ligne"><span class="cp-nom">Mise à jour</span><span class="cp-prix">60 €</span></div>
          <p class="cp-txt">Ton plan ajusté à ton poids, tes résultats et ton objectif. Conseillé chaque mois.</p>
          {COMMANDES_OUVERTES
            ? <button class={'cp-bt ' + (rappel ? 'cp-bt--or' : 'cp-bt--gris')} onClick={() => setRemplir('maj')}>Mettre à jour mon plan</button>
            : <button class="cp-bt cp-bt--gris" disabled>Bientôt disponible</button>}
        </div>
      )}

      <p class="cp-pied">Paiement unique. Sans abonnement, sans prélèvement.</p>

      {/* Portail : l'onglet vit dans un rail translate, un position:fixed
          y serait decale hors de l'ecran. */}
      {achat && createPortal(
        <div class="pg-coach cp-portail"><div class="cp-voile" onClick={(e) => { if (e.target === e.currentTarget) setAchat(null); }}>
          <div class="cp-modale" role="dialog" aria-modal="true">
            <p class="cp-nom">{achat === 'maj' ? 'Mise à jour · 60 €' : 'Premier plan · 80 €'}</p>
            <p class="cp-txt">Paiement unique et sécurisé. Aucun prélèvement ensuite.</p>
            <label class="cp-consent">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              <span>J'accepte les <a href="https://www.belfit.be/confidentialite.html" target="_blank" rel="noopener">conditions d'utilisation</a> et je confirme avoir lu l'<a href="https://www.belfit.be/confidentialite.html#sante" target="_blank" rel="noopener">avertissement santé</a> (BELFIT n'est pas un service médical).</span>
            </label>
            <button class="cp-bt cp-bt--or" disabled={!consent} onClick={payer}>Continuer vers le paiement</button>
            <button class="cp-bt cp-bt--gris" onClick={() => setAchat(null)}>Annuler</button>
          </div>
        </div></div>,
        document.body
      )}
    </div>
  );
}
