import { signal, effect } from '@preact/signals';
import { utilisateur } from '../services/firebase.js';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { getApps } from 'firebase/app';
import { t } from '../i18n/index.js';
import { ongletActif } from './BottomNav.jsx';

// Statut Premium lu depuis Firestore (ecrit par le webhook LemonSqueezy)
export const estPremium = signal(false);

// Permet de simuler l'etat Premium pour inspecter l'interface dans un
// navigateur de test. Sans cela, seule la version gratuite est visible
// et tout le contenu Premium se code a l'aveugle.
// N'a aucun effet en production : le drapeau n'est jamais pose par l'app,
// et le serveur reste seul juge des acces reels.
let apercuPremium = false;
try {
  apercuPremium = localStorage.getItem('belfit_v2_apercu_premium') === '1';
  if (apercuPremium) estPremium.value = true;
} catch (e) { /* stockage indisponible */ }

// Cache partage avec la v1 (app.html) : elle ecrit repz_premium apres
// avoir verifie Firestore. MAIS ce drapeau est pose PAR APPAREIL, pas
// par compte : si un membre Premium se deconnecte et qu'un autre compte
// se connecte sur le meme telephone, le drapeau seul ferait passer le
// nouveau venu pour Premium. On ne fait donc confiance au cache que si
// l'uid memorise a cote correspond au compte reellement connecte.
const CLE_PREM_V1 = 'repz_premium';
const CLE_PREM_UID = 'belfit_v2_prem_uid';

effect(() => {
  if (apercuPremium) return;          // l'apercu garde la main
  const u = utilisateur.value;
  if (!u) { estPremium.value = false; return; }   // deconnecte : jamais Premium

  // Demarrage rapide : le cache ne vaut que pour le MEME compte.
  try {
    estPremium.value = localStorage.getItem(CLE_PREM_V1) === '1' &&
      localStorage.getItem(CLE_PREM_UID) === u.uid;
  } catch (e) { estPremium.value = false; }

  // Puis Firestore tranche (source de verite, ecrite par le webhook).
  const db = getFirestore(getApps()[0]);
  getDoc(doc(db, 'users', u.uid))
    .then(s => {
      const prem = s.exists() && s.data().premium === true;
      estPremium.value = prem;
      // Cache tenu a jour, avec l'uid proprietaire du drapeau.
      try {
        if (prem) {
          localStorage.setItem(CLE_PREM_V1, '1');
          localStorage.setItem(CLE_PREM_UID, u.uid);
        } else {
          localStorage.removeItem(CLE_PREM_V1);
          localStorage.removeItem(CLE_PREM_UID);
        }
      } catch (e) {}
    })
    .catch(() => {});   // hors ligne : le demarrage rapide fait foi
});

import { useState } from 'preact/hooks';
import '../legacy/premium.scoped.css';

// Formules — liens LemonSqueezy repris tels quels du v1 (plans.html)
const FORMULES = {
  mensuel: {
    lien: 'https://belfit.lemonsqueezy.com/checkout/buy/390c6785-f085-4452-b43a-6206fbc3c106',
    duree: '1 mois', parMois: '7,99', total: '7,99 € facturés', eco: null,
    renouv: '7,99 € aujourd\u2019hui, renouvelé chaque mois. Résiliable à tout moment.',
  },
  trimestriel: {
    lien: 'https://belfit.lemonsqueezy.com/checkout/buy/62c379de-5b7e-4a8d-868f-87595f4d7733',
    duree: '3 mois', parMois: '6,66', total: '19,99 € facturés', eco: '\u221217 %',
    renouv: '19,99 € aujourd\u2019hui, renouvelé chaque trimestre. Résiliable à tout moment.',
  },
  annuel: {
    lien: 'https://belfit.lemonsqueezy.com/checkout/buy/b66fe18e-6b2a-4953-ab29-d5b4ab99e04a',
    duree: '12 mois', parMois: '3,99', total: '47,88 € facturés', eco: '\u221250 %',
    renouv: '47,88 € aujourd\u2019hui, renouvelé chaque année. Résiliable à tout moment.',
  },
};
// Les economies affichees sont calculees sur le tarif mensuel reel
// (7,99 €/mois) : 6,66 = -17 %, 3,99 = -50 %. Rien d'invente.

export function PremiumPage() {
  const u = utilisateur.value;
  const [formule, setFormule] = useState('annuel');   // formule mise en avant
  const [payOuvert, setPayOuvert] = useState(false);
  const [consent, setConsent] = useState(false);
  const [consentErr, setConsentErr] = useState(false);

  const construireUrl = (lien) => {
    let url = lien + '?checkout[billing_address][country]=BE';
    if (u) {
      url += '&checkout[custom][uid]=' + encodeURIComponent(u.uid);
      if (u.email) url += '&checkout[email]=' + encodeURIComponent(u.email);
    }
    return url;
  };

  const payer = () => setPayOuvert(true);
  const allerAuPaiement = () => {
    if (!consent) { setConsentErr(true); return; }
    window.location.href = construireUrl(FORMULES[formule].lien);
  };

  const dejaPremium = estPremium.value;

  let prenom = '';
  try { prenom = localStorage.getItem('repz_firstName') || ''; } catch (e) {}

  const Check = () => (
    <span class="ck"><svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" /></svg></span>
  );
  const Ligne = ({ nom, gratuit }) => (
    <div class="cmp-ligne">
      <span class="c-nom">{nom}</span>
      <span class="c-cell">{gratuit === true ? <Check /> : (gratuit || '—')}</span>
      <span class="c-cell on c-prem"><Check /></span>
    </div>
  );

  return (
    <div class="pg-premium">
      <div class="topbar-app">
        <a class="topbar-home" onClick={() => { ongletActif.value = 'journal'; }} aria-label="Retour"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6" /></svg></a>
        <img src="../belfit-logo-header.png" class="tb-logo" alt="BelFit" />
        <span style="width:38px"></span>
      </div>

      <h1 class="prem-titre">
        {prenom ? prenom + ', ton' : 'Ton'} plan sur mesure t'attend avec <em>Premium</em>
      </h1>

      <div class="cmp">
        <div class="cmp-tete"><span></span><span class="h-gratuit">GRATUIT</span><span class="h-prem">PREMIUM</span></div>
        <Ligne nom="Journal & macros" gratuit={true} />
        <Ligne nom="Programme sur mesure" />
        <Ligne nom="Programmes d'entraînement" />
        <Ligne nom="Scan code-barres" />
        <Ligne nom="Ajout vocal (IA)" />
        <Ligne nom="Courses automatiques" />
        <Ligne nom="Stats illimitées" gratuit="7 jours" />
      </div>

      {dejaPremium ? (
        <div class="deja-prem">
          <div class="dp-title">Membre Premium</div>
          <div class="dp-sub">Tout est débloqué — merci de faire grandir BELFIT</div>
        </div>
      ) : (
        <>
          <div class="formules">
            {['mensuel', 'annuel', 'trimestriel'].map((k) => {
              const f = FORMULES[k];
              return (
                <div key={k} class={'fo' + (formule === k ? ' sel' : '')} onClick={() => setFormule(k)}>
                  {k === 'annuel' && <span class="fo-badge">RECOMMANDÉ</span>}
                  <div class="fo-dur">{f.duree}</div>
                  <div class="fo-mois">{f.parMois} €<small> /mois</small></div>
                  <div class="fo-total">{f.total}</div>
                  {f.eco && <div class="fo-eco">{f.eco}</div>}
                </div>
              );
            })}
          </div>

          <button class="continuer" onClick={payer}>
            S'ABONNER — {FORMULES[formule].parMois} € / MOIS
            <small>{FORMULES[formule].duree === '1 mois' ? 'Sans engagement' : FORMULES[formule].total.replace(' facturés', '') + ' en un paiement'}</small>
          </button>

          <p class="renouv">{FORMULES[formule].renouv}</p>

          <p class="legal">
            Paiement sécurisé (LemonSqueezy).
            <span class="l-liens"><a href="https://www.belfit.be/confidentialite.html" target="_blank" rel="noopener">Confidentialité & Conditions</a></span>
          </p>
        </>
      )}

      {payOuvert && (
        <div class="pay-overlay show" onClick={(e) => { if (e.target.classList.contains('pay-overlay')) setPayOuvert(false); }}>
          <div class="pay-modal">
            <button class="pay-close" onClick={() => setPayOuvert(false)} aria-label="Fermer">✕</button>
            <div class="pay-title">Finaliser ton abonnement</div>
            <div class="pay-sub">Tu vas être redirigé vers le paiement sécurisé.</div>
            <label class={'pay-consent' + (consentErr ? ' err' : '')}>
              <input type="checkbox" checked={consent} onChange={(e) => { setConsent(e.target.checked); if (e.target.checked) setConsentErr(false); }} />
              <span>J'accepte les <a href="https://www.belfit.be/confidentialite.html" target="_blank" rel="noopener">conditions d'utilisation</a> et je confirme avoir lu l'<a href="https://www.belfit.be/confidentialite.html#sante" target="_blank" rel="noopener">avertissement santé</a> (BELFIT n'est pas un service médical).</span>
            </label>
            <button class="pay-btn" disabled={!consent} onClick={allerAuPaiement}>Continuer vers le paiement</button>
          </div>
        </div>
      )}
    </div>
  );
}
