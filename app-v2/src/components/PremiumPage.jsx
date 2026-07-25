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
// avoir verifie Firestore. Meme origine, donc meme valeur — on demarre
// dessus pour ne pas afficher un utilisateur payant comme gratuit le
// temps de la lecture reseau (ou s'il n'est connecte que cote v1).
const CLE_PREM_V1 = 'repz_premium';
try {
  if (!apercuPremium && localStorage.getItem(CLE_PREM_V1) === '1') estPremium.value = true;
} catch (e) {}

effect(() => {
  if (apercuPremium) return;          // l'apercu garde la main
  const u = utilisateur.value;
  // Sans compte v2 : on garde ce que dit le cache v1, sans le contredire.
  if (!u) return;
  const db = getFirestore(getApps()[0]);
  getDoc(doc(db, 'users', u.uid))
    .then(s => {
      const prem = s.exists() && s.data().premium === true;
      estPremium.value = prem;
      // On tient le cache v1 a jour, exactement comme le fait app.html.
      try {
        if (prem) localStorage.setItem(CLE_PREM_V1, '1');
        else localStorage.removeItem(CLE_PREM_V1);
      } catch (e) {}
    })
    .catch(() => {});   // hors ligne : le cache fait foi
});

import { useState } from 'preact/hooks';
import '../legacy/premium.scoped.css';

// Formules — liens LemonSqueezy repris tels quels du v1 (plans.html)
const FORMULES = {
  mensuel:     { lien: 'https://belfit.lemonsqueezy.com/checkout/buy/390c6785-f085-4452-b43a-6206fbc3c106' },
  trimestriel: { lien: 'https://belfit.lemonsqueezy.com/checkout/buy/62c379de-5b7e-4a8d-868f-87595f4d7733' },
  annuel:      { lien: 'https://belfit.lemonsqueezy.com/checkout/buy/b66fe18e-6b2a-4953-ab29-d5b4ab99e04a' },
};

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
        <Ligne nom="Journal calories & macros" gratuit={true} />
        <Ligne nom="Programme alimentaire sur mesure" />
        <Ligne nom="Programmes d'entraînement prêts" />
        <Ligne nom="Scan code-barres (ajout auto)" />
        <Ligne nom="Ajout vocal intelligent (IA)" />
        <Ligne nom="Liste de courses automatique" />
        <Ligne nom="Historique poids & stats" gratuit="7 jours" />
      </div>

      {dejaPremium ? (
        <div class="deja-prem">
          <div class="dp-title">Membre Premium</div>
          <div class="dp-sub">Tout est débloqué — merci de faire grandir BELFIT</div>
        </div>
      ) : (
        <>
          <div class="bandeau">−50 % sur la formule 12 mois</div>

          <div class="formules">
            <div class={'fo' + (formule === 'mensuel' ? ' sel' : '')} onClick={() => setFormule('mensuel')}>
              <div class="fo-dur">1<small>mois</small></div>
              <div class="fo-prix">7,99 €</div>
              <div class="fo-mois">7,99 € / mois</div>
              <div class="fo-note">Facturé mensuel</div>
            </div>
            <div class={'fo' + (formule === 'annuel' ? ' sel' : '')} onClick={() => setFormule('annuel')}>
              <span class="fo-badge">LE PLUS POPULAIRE</span>
              <div class="fo-dur">12<small>mois</small></div>
              <div class="fo-prix">47,88 €</div>
              <div class="fo-mois">3,99 € / mois</div>
              <div class="fo-note">Facturé annuel</div>
            </div>
            <div class={'fo' + (formule === 'trimestriel' ? ' sel' : '')} onClick={() => setFormule('trimestriel')}>
              <div class="fo-dur">3<small>mois</small></div>
              <div class="fo-prix">19,99 €</div>
              <div class="fo-mois">6,66 € / mois</div>
              <div class="fo-note">Facturé par trimestre</div>
            </div>
          </div>

          <button class="continuer" onClick={payer}>CONTINUER</button>

          <p class="legal">
            Paiement sécurisé (LemonSqueezy). Abonnement auto-renouvelé. Résiliable à tout moment.
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
